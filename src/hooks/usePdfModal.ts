import { useCallback, useState } from 'react'
import type { SearchResultPage } from '../types/pdf'

export interface OpenModalArgs {
  pdfPath: string
  title: string
  matches: SearchResultPage[]
  foundPages: number[]
  targetPage: number
}

export const usePdfModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [pdfPath, setPdfPath] = useState('')
  const [title, setTitle] = useState('')
  const [pages, setPages] = useState<number[]>([])
  const [initialPageIndex, setInitialPageIndex] = useState(0)

  const openModal = useCallback((args: OpenModalArgs) => {
    const initialIndex = args.foundPages.indexOf(args.targetPage)
    if (initialIndex === -1) {
      console.warn('Target page not found in foundPages')
    }

    setPdfPath(args.pdfPath)
    setTitle(args.title)
    setPages(args.foundPages)
    setInitialPageIndex(Math.max(0, initialIndex))
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setPdfPath('')
    setTitle('')
    setPages([])
    setInitialPageIndex(0)
  }, [])

  return {
    isOpen,
    pdfPath,
    title,
    pages,
    initialPageIndex,
    openModal,
    closeModal,
  }
}
