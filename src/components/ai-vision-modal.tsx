import { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredAIConfig,
  saveAIConfig,
  testVisionConnection,
} from "@/lib/plan-vision-service";

interface AIVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AIVisionModal({ isOpen, onClose, onSaved }: AIVisionModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAIConfig();
      setApiKey(stored.apiKey || "");
      setModel(stored.model || "gemini-3.5-flash");
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Please enter a Gemini API Key");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      saveAIConfig({
        provider: "gemini-vlm",
        apiKey: trimmed,
        model,
      });

      const res = await testVisionConnection({
        provider: "gemini-vlm",
        apiKey: trimmed,
        model,
      });

      setTestResult(res);
      if (res.success) {
        toast.success("Gemini API connection verified successfully!");
        onSaved?.();
      } else {
        toast.error("API test returned warning: " + res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to connect to Google Gemini API",
      });
      toast.error("Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveWithoutTest = () => {
    const trimmed = apiKey.trim();
    saveAIConfig({
      provider: "gemini-vlm",
      apiKey: trimmed || undefined,
      model,
    });
    toast.success("Vision configuration saved.");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[32px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#86909c] hover:text-black dark:hover:text-white p-1 transition-colors rounded-full hover:bg-[#f2f4f5] dark:hover:bg-zinc-800"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 text-black dark:text-white mb-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecffe0] dark:bg-zinc-900 text-black dark:text-[#00f0a0] border border-[#00f0a0]">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-lg font-display">Google Gemini Multimodal Vision</h3>
            <span className="text-[10px] text-[#00a86b] dark:text-[#00f0a0] font-semibold uppercase tracking-wider font-mono">
              High-Precision Blueprint Reader
            </span>
          </div>
        </div>

        <p className="text-xs text-[#86909c] mb-5 font-light leading-relaxed">
          Google&apos;s multimodal vision model accurately reads architectural room names (Bedrooms,
          Kitchen, Living, Dining, Bathrooms) and binds their exact printed dimensions without OCR errors.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-black dark:text-white font-display flex items-center gap-1.5">
                <Key size={13} className="text-[#00f0a0]" /> Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#00a86b] dark:text-[#00f0a0] hover:underline font-semibold flex items-center gap-1"
              >
                Get Free Key <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-[#86909c] hover:text-black dark:hover:text-white"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-[#86909c] mt-1">
              You can also define <code className="text-foreground">GEMINI_API_KEY</code> in your <code className="text-foreground">.env</code> file.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-black dark:text-white font-display block mb-1.5">
              Vision Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] cursor-pointer"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Fast & Free Tier)</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Blazing Fast Low Latency)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Latest Generation)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          {testResult && (
            <div
              className={`rounded-xl p-3 text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-500/30"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              )}
              <div className="leading-snug">{testResult.message}</div>
            </div>
          )}

          <div className="space-y-2 rounded-2xl bg-[#f2f4f5] dark:bg-zinc-900 p-3.5 border border-[#e5e7eb] dark:border-zinc-800 text-[11px] text-[#86909c]">
            <div className="flex items-center gap-2 text-black dark:text-white font-medium">
              <ShieldCheck size={14} className="text-[#00a86b] dark:text-[#00f0a0] shrink-0" />
              Zero Hallucinations Guarantee
            </div>
            <p className="font-light leading-relaxed">
              If a room has no explicitly printed dimension in the drawing, the system returns null and marks it unmeasured. It never invents or guesses dimensions.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-[#e5e7eb] dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill-white !py-2 !px-4 !text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveWithoutTest}
            className="btn-pill-black !py-2 !px-4 !text-xs cursor-pointer"
          >
            Save Key
          </button>
          <button
            type="button"
            onClick={handleSaveAndTest}
            disabled={isTesting || !apiKey.trim()}
            className="btn-pill-mint !py-2 !px-5 !text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isTesting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Sparkles size={13} /> Test & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
