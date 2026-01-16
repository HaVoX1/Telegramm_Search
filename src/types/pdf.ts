export interface PdfPageContent {
  pageNumber: number
  text: string
  normalizedText: string
}

export interface IndexedPdf {
  id: string
  title: string
  path: string
  pages: PdfPageContent[]
  aggregatedText?: string
  aggregatedNormalizedText: string
}

export interface SearchResultPage {
  pageNumber: number
  snippet: string
  matchIndex: number
  highlightLength: number
}

export interface SearchResult {
  pdfId: string
  title: string
  path: string
  matches: SearchResultPage[]
}
