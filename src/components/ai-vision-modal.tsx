import { useState, useEffect } from "react";
import {
  Sparkles,
  Key,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredAIConfig,
  saveAIConfig,
  clearAIConfig,
  testVisionConnection,
  type AIConfig,
  type VisionProvider,
} from "@/lib/plan-vision-service";

interface AIVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AIVisionModal({ isOpen, onClose, onSaved }: AIVisionModalProps) {
  const [provider, setProvider] = useState<VisionProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredAIConfig();
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model || (config.provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o"));
        setHasExistingKey(true);
      } else {
        setHasExistingKey(false);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key to test.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testVisionConnection({
        provider,
        apiKey: apiKey.trim(),
        model,
      });
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Please enter an API key.");
      return;
    }

    const config: AIConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: provider === "gemini" ? model || "gemini-1.5-flash" : model || "gpt-4o",
    };

    saveAIConfig(config);
    toast.success("AI Vision configuration saved in local storage!");
    if (onSaved) onSaved();
    onClose();
  };

  const handleClear = () => {
    clearAIConfig();
    setApiKey("");
    setHasExistingKey(false);
    setTestResult(null);
    toast.info("Cleared custom AI Vision key.");
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[36px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#86909c] hover:text-black dark:hover:text-white p-1 transition-colors rounded-full hover:bg-[#f2f4f5]"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 text-black dark:text-white mb-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecffe0] text-black border border-[#00f0a0]">
            <Sparkles size={16} />
          </div>
          <h3 className="font-bold text-lg font-display">AI Vision Plan Extraction Setup</h3>
        </div>
        <p className="text-xs text-[#86909c] mt-1 mb-5 font-light leading-relaxed">
          Connect your Google Gemini or OpenAI API key to extract exact room schedules, wall
          callouts, and precise width × length dimensions directly from your uploaded blueprint.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="text-xs font-bold font-display text-black dark:text-white block mb-2">
              1. Select Vision Engine Provider
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider("gemini");
                  setModel("gemini-1.5-flash");
                  setTestResult(null);
                }}
                className={`flex flex-col items-start p-3 rounded-[20px] border text-xs font-semibold transition-all cursor-pointer ${
                  provider === "gemini"
                    ? "border-black dark:border-[#00f0a0] bg-[#ecffe0] dark:bg-zinc-900 text-black dark:text-white shadow-sm"
                    : "border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5] dark:bg-zinc-900 text-[#86909c] hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold font-display text-sm">
                  <Cpu size={14} className="text-[#00f0a0]" /> Google Gemini
                </div>
                <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  ★ 100% Free Tier (Recommended)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("openai");
                  setModel("gpt-4o");
                  setTestResult(null);
                }}
                className={`flex flex-col items-start p-3 rounded-[20px] border text-xs font-semibold transition-all cursor-pointer ${
                  provider === "openai"
                    ? "border-black dark:border-[#00f0a0] bg-[#ecffe0] dark:bg-zinc-900 text-black dark:text-white shadow-sm"
                    : "border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5] dark:bg-zinc-900 text-[#86909c] hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold font-display text-sm">
                  <Sparkles size={14} className="text-[#00f0a0]" /> OpenAI
                </div>
                <span className="text-[10px] font-normal text-[#86909c] mt-1">GPT-4o Vision</span>
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-xs font-bold font-display text-black dark:text-white block mb-1.5">
              2. Select Vision Model
            </label>
            {provider === "gemini" ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-[16px] border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-3.5 py-2 text-xs font-medium outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white"
              >
                <option value="gemini-1.5-flash">
                  gemini-1.5-flash (Fast, High Accuracy, Free Tier)
                </option>
                <option value="gemini-2.0-flash">
                  gemini-2.0-flash (Next-Gen Multimodal OCR, Free Tier)
                </option>
                <option value="gemini-1.5-pro">
                  gemini-1.5-pro (Deepest Reasoning & Complex Blueprints)
                </option>
              </select>
            ) : (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-[16px] border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-3.5 py-2 text-xs font-medium outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white"
              >
                <option value="gpt-4o">gpt-4o (High Resolution Vision & OCR)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (Faster, Lower Cost)</option>
              </select>
            )}
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold font-display text-black dark:text-white flex items-center gap-1">
                <Key size={13} className="text-[#00f0a0]" />{" "}
                {provider === "gemini" ? "Google AI Studio API Key" : "OpenAI API Key"}
              </label>
              {provider === "gemini" ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-600 dark:text-[#00f0a0] hover:underline font-semibold flex items-center gap-1"
                >
                  Get free key in 10s <ExternalLink size={10} />
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-black dark:text-[#00f0a0] hover:underline font-semibold flex items-center gap-1"
                >
                  Get OpenAI key <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={provider === "gemini" ? "AIzaSy..." : "sk-..."}
                className="flex-1 rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-4 py-2.5 text-xs font-mono outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !apiKey.trim()}
                className="btn-pill-white !py-2 !px-3 !text-xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 size={13} className="animate-spin text-[#00f0a0]" />
                ) : (
                  "Test Key"
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#86909c] mt-1.5 flex items-center gap-1 font-medium">
              <ShieldCheck size={12} className="text-[#00f0a0]" />
              Saved strictly in your browser&apos;s localStorage. Never sent to third-party tracking
              servers.
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`rounded-[18px] p-3 text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#e5e7eb] dark:border-zinc-800">
            {hasExistingKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Remove Saved Key
              </button>
            ) : (
              <span className="text-[11px] text-[#86909c] italic">
                API key required for vision OCR
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-pill-white !py-2 !px-4 !text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="btn-pill-black !py-2 !px-5 !text-xs cursor-pointer">
                Save & Activate
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
