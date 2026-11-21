/**
 * Architectural Floor Plan Image Preprocessor
 * Upscales and enhances contrast of floor plan images to maximize OCR text legibility.
 */

export async function preprocessPlanImage(
  dataUrl: string,
  targetScale = 2.0,
): Promise<string> {
  // If running in browser environment, use HTML5 Canvas for high-fidelity resampling & binarization
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = Math.round(img.width * targetScale);
          const height = Math.round(img.height * targetScale);
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Smooth upscale
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Get pixel data for contrast & text enhancement
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          // Adaptive contrast stretching: convert to high-contrast grayscale
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminance
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Architectural drawings are black text on white or light background.
            // Push light grays to pure white (> 200) and dark grays to dark black (< 140)
            let enhanced = gray;
            if (gray > 185) {
              enhanced = 255;
            } else if (gray < 130) {
              enhanced = 0;
            } else {
              // High-contrast S-curve
              enhanced = ((gray - 130) / 55) * 255;
            }

            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2] = enhanced;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // In Node / non-browser, return original
  return dataUrl;
}
