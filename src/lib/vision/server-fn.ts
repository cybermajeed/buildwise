import { createServerFn } from "@tanstack/react-start";
import { executeFloorPlanPipeline } from "./pipeline";
import type { UnifiedExtractionResponse } from "./types";

export interface AnalyzeFloorPlanInput {
  base64DataUrl: string;
  fileName?: string;
  mimeType?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Secure Server Function for Floor Plan Analysis.
 * Runs on the server side:
 * - Reads GEMINI_API_KEY / GOOGLE_API_KEY from server environment variables or client-configured input.
 * - Executes Gemini VLM + Spatial OCR validation pipeline.
 */
export const checkVisionConfigServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown): { apiKey?: string; model?: string } => {
    return (input && typeof input === "object" ? input : {}) as { apiKey?: string; model?: string };
  })
  .handler(async ({ data }) => {
    const key =
      data?.apiKey ||
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
      (typeof process !== "undefined" && process.env?.GOOGLE_API_KEY);
    const hasKey = Boolean(key);
    const requestedModel =
      data?.model ||
      (typeof process !== "undefined" && process.env?.GEMINI_MODEL) ||
      "gemini-3.5-flash";

    let liveTestOk = false;
    let liveTestError: string | null = null;
    let activeModel = requestedModel;

    if (hasKey && key) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: key });

        // Try primary model; if experiencing 503 high demand or 404 deprecation, test fast fallbacks
        const candidateModels = [
          requestedModel,
          ...["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"].filter(
            (m) => m !== requestedModel,
          ),
        ];

        for (const candidate of candidateModels) {
          try {
            await ai.models.generateContent({
              model: candidate,
              contents: "ping",
              config: { maxOutputTokens: 1 },
            });
            liveTestOk = true;
            activeModel = candidate;
            liveTestError = null;
            break;
          } catch (modelErr: any) {
            liveTestError = modelErr?.message || "Invalid or unreachable API key";
            const isDemandOrDeprecated =
              modelErr?.status === 404 ||
              modelErr?.status === 503 ||
              modelErr?.status === 429 ||
              String(modelErr?.message).includes("503") ||
              String(modelErr?.message).includes("404") ||
              String(modelErr?.message).includes("high demand") ||
              String(modelErr?.message).includes("no longer available") ||
              String(modelErr?.message).includes("fetch failed");

            if (!isDemandOrDeprecated) {
              // Authentication error or bad key: do not try further models
              break;
            }
          }
        }
      } catch (err: any) {
        liveTestError = err?.message || "Invalid or unreachable API key";
      }
    }

    return {
      vlmConfigured: hasKey,
      liveVerified: liveTestOk,
      provider: "google-gemini",
      model: activeModel,
      message: liveTestOk
        ? activeModel === requestedModel
          ? `Gemini Multimodal VLM connected and verified (${activeModel})!`
          : `Gemini Multimodal VLM connected! (${requestedModel} was busy, verified working on ${activeModel})`
        : hasKey
          ? `Gemini key configured, but ping returned: ${liveTestError}`
          : "Gemini API key not configured. Operating via Spatial OCR fallback.",
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
      apiKey: payload.apiKey || undefined,
      model: payload.model || undefined,
    };
  })
  .handler(async ({ data }): Promise<UnifiedExtractionResponse> => {
    const effectiveKey =
      data.apiKey ||
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
      (typeof process !== "undefined" && process.env?.GOOGLE_API_KEY) ||
      undefined;

    return await executeFloorPlanPipeline(data.base64DataUrl, {
      fileName: data.fileName,
      mimeType: data.mimeType,
      apiKey: effectiveKey,
      model: data.model,
      enableVLM: Boolean(effectiveKey),
    });
  });
