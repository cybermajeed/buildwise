import { useState, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Sliders, FileImage, UploadCloud } from "lucide-react";
import type { Room, Opening, Wall } from "@/lib/plan-analysis-store";

interface FloorPlanVisualizerProps {
  rooms: Room[];
  walls?: Wall[] | undefined;
  openings?: Opening[] | undefined;
  previewUrl?: string | undefined;
  projectName?: string | undefined;
  onSelectRoom?: ((room: Room) => void) | undefined;
  selectedRoomId?: string | null | undefined;
  onUploadClick?: (() => void) | undefined;
}

export function FloorPlanVisualizer({
  rooms,
  walls = [],
  openings = [],
  previewUrl,
  projectName = "Floor Plan",
  onSelectRoom,
  selectedRoomId,
  onUploadClick,
}: FloorPlanVisualizerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [highContrast, setHighContrast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute total extracted area
  const totalCarpetArea = rooms.reduce((acc, r) => acc + (r.areaSqFt || r.lengthFt * r.widthFt), 0);
  const totalOpeningsCount = openings.reduce((acc, o) => acc + (o.count || 1), 0);

  // Mouse pan handlers for high-res blueprint navigation
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (previewUrl && zoom > 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (isPanning && previewUrl) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="rounded-[32px] sm:rounded-[40px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">
      {/* Visualizer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#00f0a0] text-black border border-black font-bold text-xs">
            <FileImage size={13} />
          </span>
          <span className="font-bold font-display text-black dark:text-white text-sm">
            {previewUrl ? projectName : "Architectural Blueprint Viewer"}
          </span>
          {previewUrl && (
            <span className="text-[11px] text-[#86909c] font-mono">
              ({zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`})
            </span>
          )}
        </div>

        {/* View Controls when image is loaded */}
        {previewUrl ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                highContrast
                  ? "border-black bg-[#00f0a0] text-black"
                  : "border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#86909c] hover:text-black dark:hover:text-white"
              }`}
              title="Enhance drawing lines for faint blueprint scans"
            >
              <Sliders size={12} /> {highContrast ? "Normal Scan" : "High Contrast"}
            </button>

            <div className="flex items-center rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="p-1.5 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <span className="px-2 text-[11px] font-mono text-[#86909c] font-semibold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="p-1.5 hover:text-black dark:hover:text-white transition-colors border-l border-[#e5e7eb] dark:border-zinc-700 ml-1 cursor-pointer"
                title="Reset View"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Drawing Canvas / Clean Dropzone */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative min-h-[380px] max-h-[560px] overflow-auto select-none bg-zinc-950 flex items-center justify-center p-6 ${
          previewUrl && zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {previewUrl ? (
          /* Authentic Uploaded Blueprint Viewer - ZERO fake CAD overlays */
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning ? "none" : "transform 0.12s ease-out",
            }}
            className="flex items-center justify-center origin-center max-w-full"
          >
            <img
              src={previewUrl}
              alt={projectName}
              style={{
                filter: highContrast ? "contrast(190%) brightness(115%) saturate(0%)" : "none",
              }}
              className="max-h-[500px] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-zinc-800"
            />
          </div>
        ) : (
          /* Clean Blank State - No fake synthetic boxes */
          <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 max-w-md my-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/5 border border-white/10 mb-4">
              <UploadCloud size={28} className="text-[#00f0a0]" />
            </div>
            <h3 className="text-lg font-bold font-display text-white">
              No Architectural Plan Uploaded
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-light">
              Upload your architectural floor plan, blueprint, or scan (JPG, PNG, PDF) to extract
              dimensions, rooms, and opening schedules.
            </p>
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                className="mt-6 mb-4 btn-pill-mint cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <UploadCloud size={15} /> Upload Blueprint Drawing
              </button>
            )}
          </div>
        )}
      </div>

      {/* Extracted Specifications Summary Bar (Jobright Pale-Mint Band) */}
      <div className="px-6 py-3.5 border-t border-[#e5e7eb] dark:border-zinc-800 bg-[#ecffe0] dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        {previewUrl && rooms.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4 text-black dark:text-white font-medium">
            <div>
              <span className="text-[#86909c]">Extracted Spaces: </span>
              <span className="font-bold font-display font-mono">{rooms.length} Rooms</span>
            </div>
            <span className="text-black/20 dark:text-white/20">•</span>
            <div>
              <span className="text-[#86909c]">Total Carpet Area: </span>
              <span className="font-bold font-display font-mono text-black dark:text-[#00f0a0]">
                {totalCarpetArea} sq.ft
              </span>
            </div>
            {walls.length > 0 && (
              <>
                <span className="text-black/20 dark:text-white/20">•</span>
                <div>
                  <span className="text-[#86909c]">Wall Schedule: </span>
                  <span className="font-bold font-display font-mono">{walls.length} Walls</span>
                </div>
              </>
            )}
            {openings.length > 0 && (
              <>
                <span className="text-black/20 dark:text-white/20">•</span>
                <div>
                  <span className="text-[#86909c]">Openings: </span>
                  <span className="font-bold font-display font-mono">
                    {totalOpeningsCount} Doors/Windows
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#86909c] italic">
            {previewUrl
              ? "Drawing loaded. Click 'Re-analyze with AI' or review detected spaces to compute quantities."
              : "All estimation and quantity fields remain blank until a blueprint is uploaded."}
          </div>
        )}

        {previewUrl && (
          <span className="text-[11px] text-[#86909c]">
            {zoom > 1
              ? "Drag with mouse to pan blueprint"
              : "Use zoom controls to inspect plan text"}
          </span>
        )}
      </div>
    </div>
  );
}
