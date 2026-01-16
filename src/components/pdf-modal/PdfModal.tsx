import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import "./pdf-modal.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfModalProps {
  isOpen: boolean;
  pdfPath: string;
  title: string;
  initialPage: number;
  onClose: () => void;
}

const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  pdfPath,
  title,
  initialPage,
  onClose,
}) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const scale = 1.5;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Загрузка PDF
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;

        if (mounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(initialPage);
          setLoading(false);
        }
      } catch (err) {
        console.error("Ошибка загрузки PDF:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pdfPath, initialPage]); // pdfDoc используется в cleanup

  // Рендеринг текущей страницы
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Вычисляем масштаб под ширину контейнера
      const containerWidth = containerRef.current.clientWidth - 32; // padding
      const viewport = page.getViewport({ scale: 1 });
      const autoScale = containerWidth / viewport.width;
      const finalScale = Math.min(autoScale, scale);
      const scaledViewport = page.getViewport({ scale: finalScale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = scaledViewport.width * dpr;
      canvas.height = scaledViewport.height * dpr;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;

      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas: canvas,
      }).promise;
    } catch (err) {
      console.error("Ошибка рендеринга:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Блокировка скролла body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  }, [numPages]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="pdfModal">
      <div className="pdfModal__backdrop" onClick={onClose} />

      <div className="pdfModal__container">
        {/* Шапка */}
        <header className="pdfModal__header">
          <div className="pdfModal__info">
            <h2 className="pdfModal__title">{title}</h2>
            {numPages > 0 && (
              <span className="pdfModal__pageInfo">
                {currentPage} / {numPages}
              </span>
            )}
          </div>
          <button
            type="button"
            className="pdfModal__closeButton"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        {/* PDF Viewer */}
        <div className="pdfModal__viewer" ref={containerRef}>
          {loading ? (
            <div className="pdfModal__loading">Загрузка...</div>
          ) : (
            <div className="pdfModal__canvas-container">
              <canvas ref={canvasRef} className="pdfModal__canvas" />
            </div>
          )}
        </div>

        {/* Контроллы навигации */}
        {!loading && numPages > 0 && (
          <div className="pdfModal__controls">
            {/* Навигация */}
            <div className="pdfModal__pageControls">
              <button
                type="button"
                className="pdfModal__controlButton pdfModal__controlButton--nav"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                aria-label="Предыдущая страница"
              >
                ←
              </button>
              <button
                type="button"
                className="pdfModal__controlButton pdfModal__controlButton--nav"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                aria-label="Следующая страница"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfModal;
