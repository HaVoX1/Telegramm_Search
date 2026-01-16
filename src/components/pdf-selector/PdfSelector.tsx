import { memo } from 'react'
import type { PdfFile } from '../../data/pdfFiles'
import './pdf-selector.css'

interface PdfSelectorProps {
  files: PdfFile[]
  selectedId: string
  isDisabled?: boolean
  onSelect: (id: string) => void
}

const PdfSelector: React.FC<PdfSelectorProps> = ({ files, selectedId, isDisabled = false, onSelect }) => {
  if (files.length === 0) {
    return null
  }

  return (
    <div className="pdfSelector" aria-label="Выбор PDF для поиска">
      {files.map((file) => {
        const isActive = file.id === selectedId

        return (
          <button
            key={file.id}
            type="button"
            className={`pdfSelector__button ${isActive ? 'pdfSelector__button--active' : ''}`}
            onClick={() => onSelect(file.id)}
            disabled={isDisabled}
          >
            {file.title}
          </button>
        )
      })}
    </div>
  )
}

export default memo(PdfSelector)
