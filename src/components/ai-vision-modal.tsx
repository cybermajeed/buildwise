import { X, ShieldCheck, CheckCircle2, Cpu } from "lucide-react";

interface AIVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AIVisionModal({ isOpen, onClose }: AIVisionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#86909c] hover:text-black dark:hover:text-white p-1 transition-colors rounded-full hover:bg-[#f2f4f5]"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 text-black dark:text-white mb-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecffe0] text-black border border-[#00f0a0]">
            <Cpu size={16} />
          </div>
          <h3 className="font-bold text-lg font-display">In-Browser Blueprint OCR</h3>
        </div>

        <p className="text-xs text-[#86909c] mb-5 font-light leading-relaxed">
          Blueprint dimension extraction runs completely client-side in your browser via
          Tesseract.js WebAssembly. Drawings and plans remain local to your device.
        </p>

        <div className="space-y-3 rounded-2xl bg-[#f2f4f5] dark:bg-zinc-900 p-4 border border-[#e5e7eb] dark:border-zinc-800 text-xs">
          <div className="flex items-start gap-2 text-black dark:text-white">
            <ShieldCheck size={16} className="text-[#00a86b] dark:text-[#00f0a0] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block font-display">Local Processing</span>
              <span className="text-[11px] text-[#86909c]">
                No external API keys or remote server endpoints are utilized.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-black dark:text-white">
            <CheckCircle2
              size={16}
              className="text-[#00a86b] dark:text-[#00f0a0] shrink-0 mt-0.5"
            />
            <div>
              <span className="font-semibold block font-display">Architectural Parser</span>
              <span className="text-[11px] text-[#86909c]">
                Automatically normalizes imperial feet-inches (e.g. 14&apos;-6&quot; ×
                12&apos;-0&quot;) and metric dimensions.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill-black !py-2 !px-5 !text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
