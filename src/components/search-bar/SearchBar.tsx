import { type ChangeEvent, type FormEvent, memo, useCallback } from 'react'
import './search-bar.css'

interface SearchBarProps {
  value: string
  isDisabled?: boolean
  isLoading?: boolean
  onValueChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  isDisabled = false,
  isLoading = false,
  onValueChange,
  onSubmit,
  onClear,
}) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(event.target.value)
    },
    [onValueChange],
  )

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      onSubmit()
    },
    [onSubmit],
  )

  const handleClear = useCallback(() => {
    onClear()
  }, [onClear])

  const hasValue = value.trim().length > 0
  const isSubmitDisabled = isDisabled || !hasValue

  return (
    <form className="searchBar" onSubmit={handleSubmit} role="search" aria-label="Поиск по PDF">
      <label className="searchBar__label" htmlFor="pdf-search-input">
        Поисковый запрос
      </label>
      <div className="searchBar__controls">
        <input
          id="pdf-search-input"
          className="searchBar__input"
          type="search"
          placeholder="Например, алгоритмы или параграф 5"
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          autoComplete="off"
        />
        {hasValue && (
          <button
            type="button"
            className="searchBar__clear"
            onClick={handleClear}
            aria-label="Очистить запрос"
          >
            Очистить
          </button>
        )}
        <button type="submit" className="searchBar__submit" disabled={isSubmitDisabled}>
          {isLoading ? 'Загрузка…' : 'Найти'}
        </button>
      </div>
    </form>
  )
}

export default memo(SearchBar)
