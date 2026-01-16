import { memo } from 'react'
import type { SearchResult } from '../../types/pdf'
import './search-results.css'

interface SearchResultsProps {
  results: SearchResult[]
  lastQuery: string
  isIndexLoading: boolean
  isSearching: boolean
  hasSearched: boolean
  onOpenMatch: (payload: {
    pdfId: string
    title: string
    path: string
    matches: SearchResult['matches']
    pageNumber: number
  }) => void
}

const QUERY_TOKEN_REGEX = /[a-zа-яё0-9]+/giu

const splitSnippet = (snippet: string, startIndex: number, highlightLength: number) => {
  const safeStart = Math.max(0, Math.min(startIndex, snippet.length))
  const safeLength = Math.max(0, Math.min(highlightLength, snippet.length - safeStart))
  const matchEnd = safeStart + safeLength

  return {
    before: snippet.slice(0, safeStart),
    match: snippet.slice(safeStart, matchEnd),
    after: snippet.slice(matchEnd),
  }
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  lastQuery,
  isIndexLoading,
  isSearching,
  hasSearched,
  onOpenMatch,
}) => {
  if (isIndexLoading) {
    return <p className="searchResults__message">Идёт загрузка и индексирование PDF…</p>
  }

  if (isSearching) {
    return <p className="searchResults__message">Выполняем поиск…</p>
  }

  if (!hasSearched) {
    return <p className="searchResults__message">Введите поисковый запрос и нажмите «Найти».</p>
  }

  if (results.length === 0) {
    return (
      <p className="searchResults__message">
        Ничего не найдено по запросу «{lastQuery}». Попробуйте изменить формулировку.
      </p>
    )
  }

  const tokens = lastQuery.match(QUERY_TOKEN_REGEX) ?? []
  const fallbackHighlightLength = tokens.length > 0 ? tokens.join(' ').length : lastQuery.length

  return (
    <div className="searchResults">
      {results.map((result) => (
        <article key={result.pdfId} className="searchResults__item">
          <header className="searchResults__itemHeader">
            <div>
              <h2 className="searchResults__title">{result.title}</h2>
              <p className="searchResults__meta">Совпадений: {result.matches.length}</p>
            </div>
            <a
              href={result.path}
              className="searchResults__link"
              target="_blank"
              rel="noreferrer"
            >
              Открыть PDF
            </a>
          </header>
          <ul className="searchResults__matches">
            {result.matches.map((match, index) => {
              const { before, match: matchText, after } = splitSnippet(
                match.snippet,
                match.matchIndex,
                match.highlightLength || fallbackHighlightLength,
              )

              return (
                <li
                  key={`${result.pdfId}-${match.pageNumber}-${index}`}
                  className="searchResults__match"
                >
                  <button
                    type="button"
                    className="searchResults__pageButton"
                    onClick={() =>
                      onOpenMatch({
                        pdfId: result.pdfId,
                        title: result.title,
                        path: result.path,
                        matches: result.matches,
                        pageNumber: match.pageNumber,
                      })
                    }
                  >
                    Страница {match.pageNumber}
                  </button>
                  <p className="searchResults__snippet">
                    {before}
                    <mark className="searchResults__highlight">{matchText}</mark>
                    {after}
                  </p>
                </li>
              )
            })}
          </ul>
        </article>
      ))}
    </div>
  )
}

export default memo(SearchResults)
