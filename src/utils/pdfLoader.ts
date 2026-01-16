import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { pdfFiles } from '../data/pdfFiles'
import type { IndexedPdf, PdfPageContent } from '../types/pdf'
import { readIndexCache, writeIndexCache } from './indexedDbCache'

GlobalWorkerOptions.workerSrc = workerSrc

const isTextItem = (item: TextItem | TextMarkedContent): item is TextItem => 'str' in item

const cache = new Map<string, IndexedPdf>()

const buildSignature = () =>
  JSON.stringify(
    pdfFiles.map((file) => ({
      id: file.id,
      title: file.title,
      path: file.path,
    })),
  )

export const normalizeText = (value: string) => value.toLowerCase()

const extractTextFromPage = async (
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfPageContent> => {
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  const text = content.items
    .map((item) => (isTextItem(item) ? item.str : ''))
    .join(' ')
  const normalizedText = normalizeText(text)

  return {
    pageNumber,
    text,
    normalizedText,
  }
}

const extractTextFromPdf = async (pdfUrl: string): Promise<PdfPageContent[]> => {
  const loadingTask = getDocument(pdfUrl)
  const pdf = await loadingTask.promise
  const texts: PdfPageContent[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pageContent = await extractTextFromPage(pdf, pageNumber)
    texts.push(pageContent)
  }

  loadingTask.destroy()

  return texts
}

export const loadPdfIndex = async (): Promise<IndexedPdf[]> => {
  try {
    const cachedPayload = await readIndexCache()
    if (cachedPayload && cachedPayload.signature === buildSignature()) {
      cachedPayload.pdfs.forEach((pdf) => cache.set(pdf.id, pdf))
      if (cachedPayload.pdfs.length > 0) {
        return cachedPayload.pdfs
      }
    }
  } catch (error) {
    console.warn('Не удалось использовать кэш индекса', error)
  }

  const results: IndexedPdf[] = []

  for (const file of pdfFiles) {
    const cached = cache.get(file.id)
    if (cached) {
      results.push(cached)
      continue
    }

    const pages = await extractTextFromPdf(file.path)
    const aggregatedText = pages.map((page) => page.text).join('\n')
    const aggregatedNormalizedText = pages
      .map((page) => page.normalizedText)
      .join('\n')
    const indexed: IndexedPdf = {
      id: file.id,
      title: file.title,
      path: file.path,
      pages,
      aggregatedText,
      aggregatedNormalizedText,
    }

    cache.set(file.id, indexed)
    results.push(indexed)
  }

  try {
    await writeIndexCache({
      signature: buildSignature(),
      pdfs: results,
    })
  } catch (error) {
    console.warn('Не удалось сохранить индекс', error)
  }

  return results
}
