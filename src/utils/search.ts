import type { IndexedPdf, SearchResult, SearchResultPage } from "../types/pdf";
import { normalizeText } from "./pdfLoader";

const MAX_MATCHES_PER_PAGE = 3;
const CONTEXT_RADIUS = 80;

const QUERY_TOKEN_REGEX = /[a-zа-яё0-9]+/giu;
const CASE_BOUNDARY_REGEX = /([a-zа-яё])([A-ZА-ЯЁ])/gu;

interface TokenOccurrence {
  tokenIndex: number;
  position: number;
  end: number;
}

const tokenize = (value: string): string[] => {
  const matches = value.matchAll(QUERY_TOKEN_REGEX);
  const seen = new Set<string>();

  for (const match of matches) {
    const raw = match[0];
    const normalized = normalizeText(raw);
    if (normalized.length > 0) {
      seen.add(normalized);
    }

    const splitParts = raw
      .replace(CASE_BOUNDARY_REGEX, "$1 $2")
      .split(/[\s_]+/u)
      .map((part) => normalizeText(part))
      .filter((part) => part.length > 1);

    for (const part of splitParts) {
      seen.add(part);
    }
  }

  return Array.from(seen);
};

const findAllOccurrences = (text: string, token: string) => {
  const positions: number[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const index = text.indexOf(token, startIndex);
    if (index === -1) {
      break;
    }
    positions.push(index);
    startIndex = index + token.length;
  }

  return positions;
};

const buildTokenWindows = (
  text: string,
  tokens: string[]
): { start: number; end: number }[] => {
  if (tokens.length === 0) {
    return [];
  }

  const positionsByToken = tokens.map((token) =>
    findAllOccurrences(text, token)
  );
  if (positionsByToken.some((positions) => positions.length === 0)) {
    return [];
  }

  const occurrences: TokenOccurrence[] = [];

  positionsByToken.forEach((positions, tokenIndex) => {
    const token = tokens[tokenIndex];
    positions.forEach((position) => {
      occurrences.push({
        tokenIndex,
        position,
        end: position + token.length,
      });
    });
  });

  occurrences.sort((a, b) => a.position - b.position);

  const counts = new Array(tokens.length).fill(0);
  let coveredTokens = 0;
  let left = 0;
  const windows: { start: number; end: number }[] = [];
  const seen = new Set<string>();

  for (let right = 0; right < occurrences.length; right += 1) {
    const { tokenIndex } = occurrences[right];
    if (counts[tokenIndex] === 0) {
      coveredTokens += 1;
    }
    counts[tokenIndex] += 1;

    while (coveredTokens === tokens.length && left <= right) {
      const windowOccurrences = occurrences.slice(left, right + 1);
      const start = windowOccurrences[0].position;
      const end = windowOccurrences.reduce(
        (acc, occurrence) => Math.max(acc, occurrence.end),
        start
      );

      const key = `${start}-${end}`;
      if (!seen.has(key)) {
        seen.add(key);
        windows.push({ start, end });
      }

      const leftTokenIndex = occurrences[left].tokenIndex;
      counts[leftTokenIndex] -= 1;
      if (counts[leftTokenIndex] === 0) {
        coveredTokens -= 1;
      }
      left += 1;
    }
  }

  windows.sort((a, b) => {
    const lengthDiff = a.end - a.start - (b.end - b.start);
    if (lengthDiff !== 0) {
      return lengthDiff;
    }
    return a.start - b.start;
  });
  return windows;
};

const createSnippet = (
  pageText: string,
  matchStart: number,
  matchEnd: number
): { snippet: string; matchIndex: number; highlightLength: number } => {
  const snippetStart = Math.max(0, matchStart - CONTEXT_RADIUS);
  const snippetEnd = Math.min(pageText.length, matchEnd + CONTEXT_RADIUS);
  const prefix = snippetStart > 0 ? "..." : "";
  const suffix = snippetEnd < pageText.length ? "..." : "";
  const snippetBody = pageText.slice(snippetStart, snippetEnd);
  const snippet = `${prefix}${snippetBody}${suffix}`;
  const matchIndex = (prefix ? 3 : 0) + (matchStart - snippetStart);
  const highlightLength = Math.max(matchEnd - matchStart, 1);

  return {
    snippet,
    matchIndex,
    highlightLength: Math.min(highlightLength, snippet.length - matchIndex),
  };
};

const buildPageMatches = (
  page: IndexedPdf["pages"][number],
  tokens: string[]
): SearchResultPage[] => {
  const windows = buildTokenWindows(page.normalizedText, tokens);
  const seenSnippets = new Set<string>();
  const matches: SearchResultPage[] = [];

  for (const window of windows) {
    const snippetData = createSnippet(page.text, window.start, window.end);
    if (seenSnippets.has(snippetData.snippet)) {
      continue;
    }

    seenSnippets.add(snippetData.snippet);
    matches.push({
      pageNumber: page.pageNumber,
      snippet: snippetData.snippet,
      matchIndex: snippetData.matchIndex,
      highlightLength: snippetData.highlightLength,
    });

    if (matches.length >= MAX_MATCHES_PER_PAGE) {
      break;
    }
  }

  return matches;
};

export const searchInPdfs = (
  pdfs: IndexedPdf[],
  query: string
): SearchResult[] => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedQuery = normalizeText(trimmedQuery);
  const tokens = tokenize(normalizedQuery);

  if (tokens.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const pdf of pdfs) {
    if (
      !tokens.every((token) => pdf.aggregatedNormalizedText.includes(token))
    ) {
      continue;
    }

    const matches: SearchResultPage[] = [];

    for (const page of pdf.pages) {
      if (!tokens.every((token) => page.normalizedText.includes(token))) {
        continue;
      }

      const pageMatches = buildPageMatches(page, tokens);
      matches.push(...pageMatches);
    }

    if (matches.length > 0) {
      results.push({
        pdfId: pdf.id,
        title: pdf.title,
        path: pdf.path,
        matches,
      });
    }
  }

  return results;
};
