// This service worker proxies Gemini API calls so content scripts never hold the API key.
import { GEMINI_API_KEY } from '../config/secrets';

interface LlmRequestMessage {
  type: 'llm_request';
  payload: {
    prompt: string;
    maxTokens?: number;
    responseMimeType?: 'application/json';
    responseSchema?: Record<string, unknown>;
    thinkingBudget?: number;
  };
}

interface LlmSuccessResponse {
  text: string;
  finishReason?: string;
  promptTokenCount?: number;
  outputTokenCount?: number;
  thoughtsTokenCount?: number;
}

interface LlmErrorResponse {
  error: string;
}

interface LinkCheckRequestMessage {
  type: 'link_check_request';
  payload: {
    url: string;
  };
}

interface LinkCheckStatusResponse {
  status: number;
  finalUrl: string;
  redirected: boolean;
}

interface LinkCheckTimeoutResponse {
  status: 'timeout';
}

interface LinkCheckErrorResponse {
  error: string;
  code: 'invalid_url' | 'network_error' | 'runtime_error' | 'empty_response';
}

type LinkCheckResponse = LinkCheckStatusResponse | LinkCheckTimeoutResponse | LinkCheckErrorResponse;

interface GeminiTextPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiTextPart[];
  };
  finishReason?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const LINK_CHECK_TIMEOUT_MS = 3000;

function shouldRequestJsonResponse(prompt: string): boolean {
  const normalized = prompt.toLowerCase();

  return (
    normalized.includes('respond only with a valid json object') ||
    normalized.includes('return json only') ||
    normalized.includes('return valid json only') ||
    normalized.includes('exact shape:')
  );
}

function getApiKey(): Promise<string | undefined> {
  const value = GEMINI_API_KEY.trim();
  return Promise.resolve(value.length > 0 ? value : undefined);
}

function isRuntimeMessage(message: unknown): message is LlmRequestMessage | LinkCheckRequestMessage {
  return typeof message === 'object' && message !== null && 'type' in message;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown_error';
}

async function fetchUrlWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<LinkCheckResponse> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        resolve('timeout');
      }, LINK_CHECK_TIMEOUT_MS);
    });

    const fetchPromise = fetch(url, {
      method,
      credentials: 'include',
      redirect: 'follow',
      signal: controller.signal
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (result === 'timeout') {
      return { status: 'timeout' };
    }

    return {
      status: result.status,
      finalUrl: result.url,
      redirected: result.redirected
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'timeout' };
    }

    return { error: getErrorMessage(error), code: 'network_error' };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function probeOpaqueReachability(url: string): Promise<boolean> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        resolve('timeout');
      }, LINK_CHECK_TIMEOUT_MS);
    });

    const fetchPromise = fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return result !== 'timeout';
  } catch {
    return false;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function shouldRetryWithGet(response: LinkCheckResponse): boolean {
  if ('error' in response) {
    return true;
  }

  if (response.status === 'timeout') {
    return false;
  }

  // HEAD support is inconsistent. Confirm suspicious responses with GET before classifying.
  return response.status < 200 || response.status > 399;
}

async function handleLinkCheckRequest(message: LinkCheckRequestMessage): Promise<LinkCheckResponse> {
  const targetUrl = message.payload?.url;

  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    return { error: 'invalid_url', code: 'invalid_url' };
  }

  try {
    new URL(targetUrl);
  } catch {
    return { error: 'invalid_url', code: 'invalid_url' };
  }

  const headResponse = await fetchUrlWithTimeout(targetUrl, 'HEAD');

  if ('status' in headResponse && headResponse.status === 'timeout') {
    return headResponse;
  }

  if ('status' in headResponse && typeof headResponse.status === 'number' && (headResponse.status === 401 || headResponse.status === 403)) {
    return headResponse;
  }

  if (shouldRetryWithGet(headResponse)) {
    const getResponse = await fetchUrlWithTimeout(targetUrl, 'GET');

    if ('error' in getResponse && getResponse.code === 'network_error') {
      const reachable = await probeOpaqueReachability(targetUrl);

      if (reachable) {
        return {
          status: 204,
          finalUrl: targetUrl,
          redirected: false
        };
      }
    }

    if ('status' in getResponse && typeof getResponse.status === 'number' && getResponse.status >= 400) {
      const reachable = await probeOpaqueReachability(targetUrl);

      if (reachable) {
        return {
          status: 204,
          finalUrl: getResponse.finalUrl,
          redirected: getResponse.redirected
        };
      }
    }

    return getResponse;
  }

  return headResponse;
}

async function handleLlmRequest(message: LlmRequestMessage): Promise<LlmSuccessResponse | LlmErrorResponse> {
  const apiKey = await getApiKey();

  if (apiKey === undefined) {
    return { error: 'no_api_key' };
  }

  try {
    const prompt = message.payload.prompt;
    const generationConfig: {
      maxOutputTokens: number;
      temperature: number;
      responseMimeType?: 'application/json';
      responseSchema?: Record<string, unknown>;
      thinkingConfig?: {
        thinkingBudget: number;
      };
    } = {
      maxOutputTokens: message.payload.maxTokens ?? 300,
      temperature: 0.2
    };

    if (message.payload.responseMimeType !== undefined) {
      generationConfig.responseMimeType = message.payload.responseMimeType;
    } else if (shouldRequestJsonResponse(prompt)) {
      generationConfig.responseMimeType = 'application/json';
    }

    if (message.payload.responseSchema !== undefined) {
      generationConfig.responseSchema = message.payload.responseSchema;
    }

    if (typeof message.payload.thinkingBudget === 'number') {
      generationConfig.thinkingConfig = {
        thinkingBudget: message.payload.thinkingBudget
      };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig
      })
    });

    const data = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      return { error: data.error?.message ?? `gemini_http_${response.status}` };
    }

    const primaryCandidate = data.candidates?.[0];
    const finishReason = typeof primaryCandidate?.finishReason === 'string' ? primaryCandidate.finishReason : undefined;
    const text = (primaryCandidate?.content?.parts ?? [])
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (typeof text !== 'string' || text.length === 0) {
      return { error: 'empty_response' };
    }

    return {
      text,
      finishReason,
      promptTokenCount: data.usageMetadata?.promptTokenCount,
      outputTokenCount: data.usageMetadata?.candidatesTokenCount,
      thoughtsTokenCount: data.usageMetadata?.thoughtsTokenCount
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'unknown_error'
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) {
    return false;
  }

  if (message.type === 'llm_request') {
    void (async () => {
      try {
        const response = await handleLlmRequest(message);
        sendResponse(response);
      } catch (error) {
        sendResponse({ error: getErrorMessage(error) });
      }
    })();

    return true;
  }

  if (message.type === 'link_check_request') {
    void (async () => {
      try {
        sendResponse(await handleLinkCheckRequest(message));
      } catch (error) {
        sendResponse({ error: getErrorMessage(error) });
      }
    })();

    return true;
  }

  return false;
});
