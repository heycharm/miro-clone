// apps/client/src/components/Toolbar.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useBoardStore } from "@/store/board.store";
import type { ToolType } from "@/types";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Type,
  StickyNote,
  Pencil,
  Minus,
  Plus,
} from "lucide-react";

const TOOLS: {
  type: ToolType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  hint: string;
}[] = [
  {
    type: "select",
    label: "Select",
    icon: <MousePointer2 className="w-4 h-4" />,
    shortcut: "V",
    hint: "Click to select and move elements",
  },
  {
    type: "pan",
    label: "Pan",
    icon: <Hand className="w-4 h-4" />,
    shortcut: "H",
    hint: "Click and drag to pan the canvas",
  },
];

const SHAPE_TOOLS: typeof TOOLS = [
  {
    type: "pen",
    label: "Pen",
    icon: <Pencil className="w-4 h-4" />,
    shortcut: "P",
    hint: "Draw freehand lines",
  },
  {
    type: "rect",
    label: "Rectangle",
    icon: <Square className="w-4 h-4" />,
    shortcut: "R",
    hint: "Draw a rectangle",
  },
  {
    type: "circle",
    label: "Circle",
    icon: <Circle className="w-4 h-4" />,
    shortcut: "C",
    hint: "Draw a circle",
  },
  {
    type: "text",
    label: "Text",
    icon: <Type className="w-4 h-4" />,
    shortcut: "T",
    hint: "Click anywhere to add text",
  },
  {
    type: "sticky",
    label: "Sticky Note",
    icon: <StickyNote className="w-4 h-4" />,
    shortcut: "S",
    hint: "Add a sticky note",
  },
];

export const Toolbar = () => {
  const { activeTool, setActiveTool, viewport, setViewport } = useBoardStore();

  // keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    const map: Record<string, ToolType> = {
      v: "select",
      h: "pan",
      p: "pen",
      r: "rect",
      c: "circle",
      t: "text",
      s: "sticky",
    };
    if (map[e.key.toLowerCase()]) setActiveTool(map[e.key.toLowerCase()]);
  };

  // register shortcuts
  useState: () => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  };

  const zoomIn = () =>
    setViewport({ scale: Math.min(viewport.scale * 1.2, 5) });
  const zoomOut = () =>
    setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) });
  const zoomReset = () => setViewport({ scale: 1, x: 0, y: 0 });

  return (
    <TooltipProvider delay={400}>
      {/* Main toolbar — left side */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
        <div className="bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-xl p-1.5 shadow-xl flex flex-col gap-0.5">
          {TOOLS.map((tool) => (
            <Tooltip key={tool.type}>
              <TooltipTrigger >
                <button
                  onClick={() => setActiveTool(tool.type)}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center transition-all
                    ${
                      activeTool === tool.type
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/60"
                    }
                  `}
                >
                  {tool.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-700 border-slate-600 text-white"
              >
                <p className="font-medium">{tool.label}</p>
                <p className="text-slate-400 text-xs">{tool.hint}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Press {tool.shortcut}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="w-full h-px bg-slate-700/50 my-0.5" />

          {SHAPE_TOOLS.map((tool) => (
            <Tooltip key={tool.type}>
              <TooltipTrigger>
                <button
                  onClick={() => setActiveTool(tool.type)}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center transition-all
                    ${
                      activeTool === tool.type
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/60"
                    }
                  `}
                >
                  {tool.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-700 border-slate-600 text-white"
              >
                <p className="font-medium">{tool.label}</p>
                <p className="text-slate-400 text-xs">{tool.hint}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Press {tool.shortcut}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Zoom controls — bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-xl px-2 py-1.5 shadow-xl flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger >
              <button
                onClick={zoomOut}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-700 border-slate-600 text-white text-xs">
              Zoom out
            </TooltipContent>
          </Tooltip>

          <button
            onClick={zoomReset}
            className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-all min-w-[52px] text-center font-mono"
          >
            {Math.round(viewport.scale * 100)}%
          </button>

          <Tooltip>
            <TooltipTrigger >
              <button
                onClick={zoomIn}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-700 border-slate-600 text-white text-xs">
              Zoom in
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
