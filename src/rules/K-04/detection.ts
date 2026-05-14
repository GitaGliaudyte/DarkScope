import { normalizeWhitespace } from '../../engine/normalizedElements';
import { createErrorResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import {
  IMPORTANT_KEYWORDS,
  LOW_SIGNAL_CONTAINER_SELECTOR,
  MAX_URLS_TO_CHECK,
  RULE_ID,
  SUPPLEMENTAL_ZONE_SELECTOR
} from './constants';
import { downgradeImpact, getConfidence, getProbability, impactRank } from './scoring';
import { ElementZone, LinkCandidate, LinkCheckRequest, LinkCheckResponse, LinkGroup } from './types';

function truncateText(value: string, maxLength: number): string {
  return normalizeWhitespace(value).slice(0, maxLength);
}

function isExcludedHref(rawHref: string): boolean {
  const normalized = rawHref.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === '#' ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('javascript:')
  );
}

function resolveHttpUrl(rawHref: string, baseUrl: string): URL | null {
  try {
    const resolved = new URL(rawHref, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }

    resolved.hash = '';
    return resolved;
  } catch {
    return null;
  }
}

function matchesImportantKeyword(text: string, path: string): boolean {
  const haystack = `${text.toLowerCase()} ${path.toLowerCase()}`.replace(/[-_/]+/g, ' ');
  return IMPORTANT_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function detectZone(element: HTMLAnchorElement): ElementZone {
  return element.closest(SUPPLEMENTAL_ZONE_SELECTOR) === null ? 'primary' : 'supplemental';
}

function isLowSignalContainer(element: HTMLAnchorElement): boolean {
  return element.closest(LOW_SIGNAL_CONTAINER_SELECTOR) !== null;
}

function isSameDocumentVariant(candidateUrl: URL, pageUrl: URL): boolean {
  return candidateUrl.origin === pageUrl.origin && candidateUrl.pathname === pageUrl.pathname;
}

function buildLinkGroups(context: AnalysisContext): LinkGroup[] {
  const groups = new Map<string, LinkGroup>();
  const pageUrl = new URL(context.snapshot.url);
  const pageOrigin = pageUrl.origin;

  for (const snapshotLink of context.snapshot.links) {
    const liveElement = document.querySelector(snapshotLink.selector);

    if (!(liveElement instanceof HTMLAnchorElement)) {
      continue;
    }

    if (!snapshotLink.visible) {
      continue;
    }

    const rawHref = liveElement.getAttribute('href') ?? snapshotLink.attributes.href ?? '';

    if (isExcludedHref(rawHref)) {
      continue;
    }

    const resolvedUrl = resolveHttpUrl(rawHref, context.snapshot.url);

    if (resolvedUrl === null) {
      continue;
    }

    const text = truncateText(liveElement.textContent ?? snapshotLink.text, 80);
    const path = `${resolvedUrl.pathname}${resolvedUrl.search}`;
    const keywordMatch = matchesImportantKeyword(text, path);
    const sameOrigin = resolvedUrl.origin === pageOrigin;
    const lowSignal = isLowSignalContainer(liveElement);

    if (!sameOrigin && !keywordMatch) {
      continue;
    }

    if (!keywordMatch && (text.length === 0 || lowSignal || isSameDocumentVariant(resolvedUrl, pageUrl))) {
      continue;
    }

    const absoluteUrl = resolvedUrl.href;
    const existingGroup = groups.get(absoluteUrl);
    const candidate: LinkCandidate = {
      selector: snapshotLink.selector,
      element: liveElement,
      url: absoluteUrl,
      text,
      path,
      keywordMatch,
      sameOrigin,
      zone: detectZone(liveElement)
    };

    if (existingGroup === undefined) {
      groups.set(absoluteUrl, {
        url: absoluteUrl,
        sameOrigin,
        keywordMatch,
        anchors: [candidate]
      });
      continue;
    }

    existingGroup.keywordMatch = existingGroup.keywordMatch || keywordMatch;
    existingGroup.anchors.push(candidate);
  }

  return Array.from(groups.values());
}

function selectLinksToCheck(context: AnalysisContext): LinkGroup[] {
  const groups = buildLinkGroups(context);
  const selected: LinkGroup[] = [];
  const selectedUrls = new Set<string>();

  for (const group of groups) {
    if (!group.keywordMatch || selectedUrls.has(group.url)) {
      continue;
    }

    selected.push(group);
    selectedUrls.add(group.url);

    if (selected.length >= MAX_URLS_TO_CHECK) {
      return selected;
    }
  }

  for (const group of groups) {
    if (!group.sameOrigin || selectedUrls.has(group.url)) {
      continue;
    }

    selected.push(group);
    selectedUrls.add(group.url);

    if (selected.length >= MAX_URLS_TO_CHECK) {
      break;
    }
  }

  return selected;
}

function chooseRepresentativeAnchor(group: LinkGroup): LinkCandidate {
  return [...group.anchors].sort((left, right) => {
    if (left.keywordMatch !== right.keywordMatch) {
      return left.keywordMatch ? -1 : 1;
    }

    if (left.zone !== right.zone) {
      return left.zone === 'primary' ? -1 : 1;
    }

    if (left.text.length !== right.text.length) {
      return right.text.length - left.text.length;
    }

    return 0;
  })[0];
}

function requestLinkCheck(url: string): Promise<LinkCheckResponse> {
  return new Promise((resolve) => {
    const message: LinkCheckRequest = {
      type: 'link_check_request',
      payload: { url }
    };

    chrome.runtime.sendMessage(message, (response: LinkCheckResponse | undefined) => {
      if (chrome.runtime.lastError !== undefined) {
        resolve({ error: chrome.runtime.lastError.message ?? 'runtime_error' });
        return;
      }

      if (response === undefined) {
        resolve({ error: 'empty_response' });
        return;
      }

      resolve(response);
    });
  });
}

export async function detectBrokenLinks(context: AnalysisContext): Promise<RuleResult> {
  try {
    const selectedGroups = selectLinksToCheck(context);

    if (selectedGroups.length === 0) {
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

    const checkResults = await Promise.all(
      selectedGroups.map(async (group) => ({
        group,
        response: await requestLinkCheck(group.url)
      }))
    );

    const evidence: RuleResult['evidence'] = [];
    const selectors: string[] = [];
    let brokenGroupCount = 0;
    let strongestImpact: RuleResult['impact'] = 'low';

    for (const { group, response } of checkResults) {
      if ('error' in response || response.status === 'timeout') {
        continue;
      }

      const status = response.status;

      if ((status >= 200 && status < 400) || status === 401 || status === 403) {
        continue;
      }

      let baseImpact: RuleResult['impact'] | null = null;

      if (status >= 400 && status < 500) {
        baseImpact = 'high';
      } else if (status >= 500 && status < 600) {
        baseImpact = 'medium';
      }

      if (baseImpact === null) {
        continue;
      }

      brokenGroupCount += 1;
      const representativeAnchor = chooseRepresentativeAnchor(group);
      const contextualImpact =
        representativeAnchor.zone === 'supplemental' ? downgradeImpact(baseImpact) : baseImpact;

      if (impactRank(contextualImpact) > impactRank(strongestImpact)) {
        strongestImpact = contextualImpact;
      }

      evidence.push({
        selector: representativeAnchor.selector,
        text: representativeAnchor.text.length > 0 ? representativeAnchor.text : representativeAnchor.path,
        reason: `Returns HTTP ${status}`,
        boundingBox: representativeAnchor.element.getBoundingClientRect(),
        zone: representativeAnchor.zone,
        contextualImpact
      } as RuleResult['evidence'][number]);

      for (const anchor of group.anchors) {
        selectors.push(anchor.selector);
      }
    }

    if (brokenGroupCount === 0) {
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

    return createRuleResult({
      ruleId: RULE_ID,
      detected: true,
      probability: getProbability(brokenGroupCount),
      confidence: getConfidence(brokenGroupCount),
      impact: strongestImpact,
      evidence,
      visualTarget: buildVisualTarget(selectors),
      occurrenceCount: brokenGroupCount
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}
