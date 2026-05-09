// This service worker proxies Gemini API calls so content scripts never hold the API key.
interface LlmRequestMessage {
  type: 'llm_request';
  payload: {
    prompt: string;
    maxTokens?: number;
  };
}

interface LlmSuccessResponse {
  text: string;
}

interface LlmErrorResponse {
  error: string;
}

interface GeminiTextPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiTextPart[];
  };
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

const GEMINI_MODEL = 'gemini-2.5-flash';

function summarizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function getApiKey(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get('gemini_api_key', (items) => {
      const value = items.gemini_api_key;
      resolve(typeof value === 'string' && value.length > 0 ? value : undefined);
    });
  });
}

async function handleLlmRequest(message: LlmRequestMessage): Promise<LlmSuccessResponse | LlmErrorResponse> {
  console.log('[DarkScope][LLM] Incoming request', {
    maxTokens: message.payload.maxTokens ?? 300,
    promptPreview: summarizePrompt(message.payload.prompt)
  });

  const apiKey = await getApiKey();

  if (apiKey === undefined) {
    console.error('[DarkScope][LLM] Gemini API key missing in chrome.storage.local');
    return { error: 'no_api_key' };
  }

  try {
    console.log('[DarkScope][LLM] Sending Gemini request', {
      model: GEMINI_MODEL,
      hasApiKey: apiKey.length > 0
    });

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
                text: message.payload.prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: message.payload.maxTokens ?? 300,
          temperature: 0.2
        }
      })
    });

    const data = (await response.json()) as GeminiGenerateContentResponse;

    console.log('[DarkScope][LLM] Gemini HTTP response', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      hasCandidates: Array.isArray(data.candidates),
      candidateCount: data.candidates?.length ?? 0,
      apiError: data.error?.message ?? null
    });

    if (!response.ok) {
      console.error('[DarkScope][LLM] Gemini request failed', {
        status: response.status,
        statusText: response.statusText,
        error: data.error?.message ?? `gemini_http_${response.status}`
      });
      return { error: data.error?.message ?? `gemini_http_${response.status}` };
    }

    const text = data.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .find((part) => typeof part.text === 'string')
      ?.text;

    if (typeof text !== 'string' || text.length === 0) {
      console.error('[DarkScope][LLM] Gemini response contained no text', {
        candidateCount: data.candidates?.length ?? 0
      });
      return { error: 'empty_response' };
    }

    console.log('[DarkScope][LLM] Gemini request succeeded', {
      textPreview: summarizePrompt(text)
    });

    return { text };
  } catch (error) {
    console.error('[DarkScope][LLM] Gemini request threw', error);
    return {
      error: error instanceof Error ? error.message : 'unknown_error'
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null || !('type' in message) || message.type !== 'llm_request') {
    return false;
  }

  console.log('[DarkScope][LLM] Message received by background worker');

  void (async () => {
    const response = await handleLlmRequest(message as LlmRequestMessage);
    console.log('[DarkScope][LLM] Sending response back to content script', {
      ok: 'text' in response,
      error: 'error' in response ? response.error : null
    });
    sendResponse(response);
  })();

  return true;
});
