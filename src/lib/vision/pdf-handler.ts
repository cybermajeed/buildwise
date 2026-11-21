/**
 * High-Resolution PDF Architectural Drawing Processor
 * Converts technical blueprint PDF pages to crisp images for OCR & Vision analysis.
 * Preserves drawing annotations without excessive compression.
 */

export interface RenderedPDFPage {
  dataUrl: string;
  pageCount: number;
  currentPage: number;
  width: number;
  height: number;
}

export async function renderPdfPageToDataUrl(
  pdfData: ArrayBuffer | Uint8Array | string,
  pageNumber = 1,
  scale = 2.0, // 2x scale preserves crisp linework and dimension callouts
): Promise<RenderedPDFPage> {
  if (typeof window === "undefined") {
    throw new Error("PDF page rendering operates in client browser environment.");
  }

  const pdfjsLib = await import("pdfjs-dist");

  // Configure worker for in-browser rendering
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  let typedArray: Uint8Array;
  if (typeof pdfData === "string") {
    // Base64 string
    const base64 = pdfData.replace(/^data:[^;]+;base64,/, "");
    const binary = atob(base64);
    typedArray = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      typedArray[i] = binary.charCodeAt(i);
    }
  } else if (pdfData instanceof ArrayBuffer) {
    typedArray = new Uint8Array(pdfData);
  } else {
    typedArray = pdfData;
  }

  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const validPageNum = Math.max(1, Math.min(pageNumber, pageCount));
  const page = await pdf.getPage(validPageNum);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Unable to create HTML5 canvas context for PDF rendering.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render white background
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport,
  };

  await page.render(renderContext as any).promise;

  const dataUrl = canvas.toDataURL("image/png");

  return {
    dataUrl,
    pageCount,
    currentPage: validPageNum,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
  };
}
