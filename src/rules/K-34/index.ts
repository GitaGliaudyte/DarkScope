import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, LlmProxySuccessResponse, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { MIN_REQUIRED_SAMPLES, RULE_ID } from './constants';
import {
  buildLLMPrompt,
  buildRetryPrompt,
  describeAttemptReason,
  K34_COMPACT_RETRY_SCHEMA,
  parseLLMResponse,
  previewText,
  requestLlmWithTimeout,
  RETRY_SAMPLE_LIMIT,
  tryParseCompactRetryResponse,
  tryParseLLMResponse
} from './llm';
import {
  collectTextSamples,
  findMatchingSample,
  isIntentionallyMultilingual
} from './sampling';
import { computeScore, getConfidence, getImpact, getProbability } from './scoring';
import { CollectedTextSample, FlaggedRegion } from './types';

function createNotApplicableResultWithReason(reason: string, recommendation = ''): RuleResult {
  return {
    ruleId: RULE_ID,
    detected: false,
    status: 'not_applicable',
    probability: 0,
    confidence: 'low',
    impact: 'low',
    evidence: [],
    explanation: reason,
    recommendation,
    visualTarget: buildVisualTarget([]),
    occurrenceCount: 0
  };
}

function resolveFlaggedSample(flagged: FlaggedRegion, samples: CollectedTextSample[]): CollectedTextSample | null {
  if (typeof flagged.sampleNumber === 'number') {
    return samples[flagged.sampleNumber - 1] ?? null;
  }

  return findMatchingSample(flagged, samples);
}

export { buildLLMPrompt, collectTextSamples, isIntentionallyMultilingual, parseLLMResponse };

export async function evaluate(_context: AnalysisContext): Promise<RuleResult> {
  try {
    if (!(document.body instanceof HTMLElement) || isIntentionallyMultilingual(document)) {
      return createNotApplicableResultWithReason(
        'Skipped because the page appears to be intentionally multilingual.',
        'Run this rule on a page with a single primary interface language.'
      );
    }

    const collectedSamples = collectTextSamples(document);

    if (collectedSamples.length < MIN_REQUIRED_SAMPLES) {
      return createNotApplicableResultWithReason(
        `Skipped because only ${collectedSamples.length} qualifying text samples were collected.`,
        'Ensure the page has enough visible descriptive, pricing, legal, consent, or form text.'
      );
    }

    let llmResult: LlmProxySuccessResponse | 'timeout';
    const sampleInputs = collectedSamples.map((sample) => ({ region: sample.region, text: sample.text }));

    try {
      llmResult = await requestLlmWithTimeout(buildLLMPrompt(sampleInputs));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'llm_request_failed';

      if (message === 'no_api_key') {
        return createNotApplicableResultWithReason(
          'Skipped because no Gemini API key is configured for LLM-backed rules.',
          'Save a Gemini API key in the extension popup and run the scan again.'
        );
      }

      return createNotApplicableResultWithReason(
        `Skipped because the background LLM request failed: ${message}.`,
        'Check the extension background worker and Gemini API access, then run the scan again.'
      );
    }

    if (llmResult === 'timeout') {
      return createNotApplicableResultWithReason(
        'Skipped because the LLM request did not finish within 10 seconds.',
        'Reduce page complexity or retry after confirming Gemini API responses are working.'
      );
    }

    const parseAttempt = tryParseLLMResponse(llmResult.text, sampleInputs);
    const firstAttemptReason = describeAttemptReason(parseAttempt.reason, llmResult);
    let parsed = parseAttempt.parsed;

    if (parsed === null) {
      let retryResult: LlmProxySuccessResponse | 'timeout';
      const retrySamples = sampleInputs.slice(0, RETRY_SAMPLE_LIMIT);

      try {
        retryResult = await requestLlmWithTimeout(buildRetryPrompt(retrySamples), K34_COMPACT_RETRY_SCHEMA);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'llm_retry_failed';

        return createNotApplicableResultWithReason(
          `Skipped because the LLM retry failed after an invalid initial response (${firstAttemptReason}). Retry error: ${message}.`,
          'Retry the scan after confirming Gemini API access is working.'
        );
      }

      if (retryResult === 'timeout') {
        return createNotApplicableResultWithReason(
          `Skipped because the retry LLM request timed out after an invalid initial response (${firstAttemptReason}).`,
          'Retry the scan after confirming Gemini API responses are completing normally.'
        );
      }

      const retryParseAttempt = tryParseCompactRetryResponse(retryResult.text, retrySamples);
      const retryAttemptReason = describeAttemptReason(retryParseAttempt.reason, retryResult);
      parsed = retryParseAttempt.parsed;

      if (parsed === null) {
        return createNotApplicableResultWithReason(
          `Skipped because the LLM response could not be parsed. First attempt: ${firstAttemptReason}. Retry: ${retryAttemptReason}. Retry preview: ${previewText(retryResult.text)}`,
          'Retry the scan after confirming Gemini API responses are valid JSON.'
        );
      }
    }

    if (parsed.flaggedRegions.length === 0) {
      return createRuleResult({
        ruleId: RULE_ID,
        detected: false,
        probability: 0,
        confidence: parsed.confidence,
        impact: 'low',
        visualTarget: buildVisualTarget([]),
        occurrenceCount: 0
      });
    }

    const scoreSummary = computeScore(parsed.flaggedRegions);
    const hasHighSeverityFlag = parsed.flaggedRegions.some((region) => region.severity === 'high');

    if (parsed.confidence === 'low' && !hasHighSeverityFlag) {
      return createRuleResult({
        ruleId: RULE_ID,
        detected: false,
        probability: 0,
        confidence: 'low',
        impact: 'low',
        visualTarget: buildVisualTarget([]),
        occurrenceCount: 0
      });
    }

    const evidence: RuleResult['evidence'] = parsed.flaggedRegions
      .map((flagged) => {
        const sample = resolveFlaggedSample(flagged, collectedSamples);

        if (sample === null) {
          return null;
        }

        return {
          selector: sample.selector,
          text: sample.text,
          reason: `LLM flagged ${sample.region} text as ${flagged.detectedLanguage} while the dominant page language appears to be ${parsed.dominantLanguage}`,
          boundingBox: sample.boundingBox
        };
      })
      .filter((item): item is RuleResult['evidence'][number] => item !== null);

    const selectors = evidence.map((item) => item.selector);
    const confidence = getConfidence(scoreSummary, parsed.confidence, collectedSamples.length);
    const detected = scoreSummary.rawScore > 0;

    return createRuleResult({
      ruleId: RULE_ID,
      detected,
      probability: detected ? getProbability(scoreSummary) : 0,
      confidence,
      impact: detected ? getImpact(parsed.flaggedRegions) : 'low',
      evidence,
      visualTarget: buildVisualTarget(selectors),
      occurrenceCount: parsed.flaggedRegions.length
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'empty_response' || error.message === 'no_api_key')) {
      return createNotApplicableResultWithReason(
        error.message === 'no_api_key'
          ? 'Skipped because no Gemini API key is configured for LLM-backed rules.'
          : 'Skipped because the LLM returned an empty response.',
        error.message === 'no_api_key'
          ? 'Save a Gemini API key in the extension popup and run the scan again.'
          : 'Check the background LLM response handling and retry.'
      );
    }

    const message = error instanceof Error ? error.message : 'llm_evaluation_failed';
    return createNotApplicableResultWithReason(
      `Skipped because the LLM-backed evaluation failed: ${message}.`,
      'Retry the scan after confirming Gemini API access and response handling are working.'
    );
  }
}

export const rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'checkout', 'registration', 'generic'],
  detect(context: AnalysisContext): Promise<RuleResult> {
    return evaluate(context);
  }
};

export default rule;
