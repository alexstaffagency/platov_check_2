import { useCallback, useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PdfViewer = ({ pdfUrl }: { pdfUrl: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setContainerDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
    };

    loadPdf();

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
        setPdfDoc(null);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    const renderPage = async () => {
      if (
        !pdfDoc ||
        containerDimensions.width <= 0 ||
        containerDimensions.height <= 0
      ) {
        return;
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        const originalViewport = page.getViewport({ scale: 1 });

        const scaleX = containerDimensions.width / originalViewport.width;
        const scaleY = containerDimensions.height / originalViewport.height;
        const scale = Math.min(scaleX, scaleY);

        const viewport = page.getViewport({ scale });

        // Create a new canvas for this render
        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";

        const context = canvas.getContext("2d");

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        await renderTask.promise;

        // Remove old canvases and append the new one
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          containerRef.current.appendChild(canvas);
        }
      } catch (error) {
        console.error("Error rendering page:", error);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, containerDimensions]);

  const nextPage = () => {
    setCurrentPage((prevNumber) => Math.min(prevNumber + 1, totalPages));
  };

  const previousPage = () => {
    setCurrentPage((prevNumber) => Math.max(prevNumber - 1, 1));
  };

  return (
    <div>
      <Toolbar
        pdfUrl={pdfUrl}
        currentPage={currentPage}
        totalPages={totalPages}
        nextPage={nextPage}
        previousPage={previousPage}
      />
      <div
        ref={containerRef}
        style={{ height: "300px", width: "100%", overflow: "auto" }}
      />
    </div>
  );
};

export default PdfViewer;
