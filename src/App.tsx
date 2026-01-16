import { useCallback, useEffect, useState } from 'react'
import SearchBar from './components/search-bar/SearchBar'
import SearchResults from './components/search-results/SearchResults'
import PdfModal from './components/pdf-modal/PdfModal'
import { pdfFiles } from './data/pdfFiles'
import type { IndexedPdf, SearchResult } from './types/pdf'
import { loadPdfIndex } from './utils/pdfLoader'
import { searchInPdfs } from './utils/search'
import { usePdfModal } from './hooks/usePdfModal'
import { useTelegramWebApp } from './hooks/useTelegramWebApp'
import PdfSelector from './components/pdf-selector/PdfSelector'
import './App.css'

const App: React.FC = () => {
  const { isReady: isTelegramReady } = useTelegramWebApp()
  const [query, setQuery] = useState('')
  const [pdfIndex, setPdfIndex] = useState<IndexedPdf[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [isIndexLoading, setIsIndexLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [selectedPdfId, setSelectedPdfId] = useState(pdfFiles[0]?.id ?? '')
  const {
    isOpen: isPdfModalOpen,
    pdfPath: modalPdfPath,
    title: modalTitle,
    pages: modalPages,
    initialPageIndex: modalInitialPageIndex,
    openModal,
    closeModal,
  } = usePdfModal()

  useEffect(() => {
    let isMounted = true

    const loadIndex = async () => {
      try {
        setIsIndexLoading(true)
        const index = await loadPdfIndex()
        if (isMounted) {
          setPdfIndex(index)
        }
      } catch (error) {
        console.error('Ошибка загрузки PDF', error)
        if (isMounted) {
          setErrorMessage('Не удалось загрузить PDF. Попробуйте перезагрузить страницу.')
        }
      } finally {
        if (isMounted) {
          setIsIndexLoading(false)
        }
      }
    }

    loadIndex()

    return () => {
      isMounted = false
    }
  }, [])

  const activePdf = pdfIndex.find((pdf) => pdf.id === selectedPdfId)

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setLastQuery('')
    setErrorMessage(null)
  }, [])

  const handleSelectPdf = useCallback((id: string) => {
    setSelectedPdfId(id)
    setResults([])
    setHasSearched(false)
    setLastQuery('')
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length === 0) {
      setHasSearched(false)
      setResults([])
      setLastQuery('')
      return
    }

    if (isIndexLoading || !activePdf) {
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setLastQuery(trimmedQuery)
    setErrorMessage(null)

    try {
      const searchResults = searchInPdfs([activePdf], trimmedQuery)
      setResults(searchResults)
    } catch (error) {
      console.error('Ошибка поиска по PDF', error)
      setErrorMessage('Не удалось выполнить поиск. Попробуйте позже.')
    } finally {
      setIsSearching(false)
    }
  }, [activePdf, isIndexLoading, query])

  const handleOpenMatch = useCallback(
    ({ title, path, matches, pageNumber }: {
      title: string
      path: string
      matches: SearchResult['matches']
      pageNumber: number
    }) => {
      const foundPages = Array.from(new Set(matches.map(match => match.pageNumber))).sort((a, b) => a - b)
      openModal({
        pdfPath: path,
        title,
        matches,
        foundPages,
        targetPage: pageNumber,
      })
    },
    [openModal],
  )

  // Показываем loader пока Telegram WebApp инициализируется
  if (!isTelegramReady) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          color: '#64748b'
        }}>
          <p>Загрузка приложения...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Поиск по PDF</h1>
        <p className="app__subtitle">
          В библиотеке {pdfFiles.length} файл(ов). Введите запрос, чтобы найти нужный фрагмент.
        </p>
      </header>

      <PdfSelector
        files={pdfFiles}
        selectedId={selectedPdfId}
        isDisabled={isIndexLoading || isSearching}
        onSelect={handleSelectPdf}
      />

      <SearchBar
        value={query}
        isDisabled={isIndexLoading || isSearching || !activePdf}
        isLoading={isIndexLoading || isSearching}
        onValueChange={handleQueryChange}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {errorMessage ? (
        <div className="app__error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <SearchResults
        results={results}
        lastQuery={lastQuery}
        isIndexLoading={isIndexLoading}
        isSearching={isSearching}
        hasSearched={hasSearched}
        onOpenMatch={handleOpenMatch}
      />

      <PdfModal
        isOpen={isPdfModalOpen}
        pdfPath={modalPdfPath}
        title={modalTitle}
        initialPage={modalPages[modalInitialPageIndex] || 1}
        onClose={closeModal}
      />
    </div>
  )
}

export default App
