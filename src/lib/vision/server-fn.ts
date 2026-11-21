import { createServerFn } from "@tanstack/react-start";
import { executeFloorPlanPipeline } from "./pipeline";
import type { UnifiedExtractionResponse } from "./types";

export interface AnalyzeFloorPlanInput {
  base64DataUrl: string;
  fileName?: string;
  mimeType?: string;
}

/**
 * Secure Server Function for Floor Plan Analysis.
 * Runs on the server side:
 * - Reads GEMINI_API_KEY / GOOGLE_API_KEY from server environment variables.
 * - API keys are NEVER sent to the client browser.
 * - Executes Gemini VLM + Spatial OCR validation pipeline.
 */
export const checkVisionConfigServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const hasKey = Boolean(
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
      (typeof process !== "undefined" && process.env?.GOOGLE_API_KEY)
    );
    const model = (typeof process !== "undefined" && process.env?.GEMINI_MODEL) || "gemini-2.5-flash";

    return {
      vlmConfigured: hasKey,
      provider: "google-gemini",
      model,
      message: hasKey
        ? `Gemini Multimodal VLM active (${model}). Server environment key configured.`
        : "Gemini API key not configured in server environment. Operating via Spatial OCR fallback.",
    };
  });

export const analyzeFloorPlanServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown): AnalyzeFloorPlanInput => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid request payload for floor plan analysis.");
    }
    const payload = input as Partial<AnalyzeFloorPlanInput>;
    if (!payload.base64DataUrl || typeof payload.base64DataUrl !== "string") {
      throw new Error("base64DataUrl is required.");
    }
    return {
      base64DataUrl: payload.base64DataUrl,
      fileName: payload.fileName || "Floor Plan",
      mimeType: payload.mimeType || "image/png",
    };
  })
  .handler(async ({ data }): Promise<UnifiedExtractionResponse> => {
    return await executeFloorPlanPipeline(data.base64DataUrl, {
      fileName: data.fileName,
      mimeType: data.mimeType,
      enableVLM: true,
    });
  });
