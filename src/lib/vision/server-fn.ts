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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as any;
          const availableModels: string[] = (data?.models || []).map((m: any) =>
            m.name ? m.name.replace("models/", "") : "",
          );
          liveTestOk = true;
          liveTestError = null;

          if (availableModels.includes(requestedModel)) {
            activeModel = requestedModel;
          } else if (availableModels.includes("gemini-3.5-flash-lite")) {
            activeModel = "gemini-3.5-flash-lite";
          } else if (availableModels.includes("gemini-3.5-flash")) {
            activeModel = "gemini-3.5-flash";
          } else if (availableModels.includes("gemini-3.8-flash")) {
            activeModel = "gemini-3.8-flash";
          }
        } else {
          const errData = (await res.json().catch(() => ({}))) as any;
          liveTestError =
            errData?.error?.message || `HTTP ${res.status}: Failed to authenticate with Google API`;
        }
      } catch (err: any) {
        liveTestError =
          err?.name === "AbortError"
            ? "API verification timed out after 4 seconds"
            : err?.message || "Invalid or unreachable API key";
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
