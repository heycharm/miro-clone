// apps/client/src/components/Toolbar.tsx
import { useBoardStore } from "../store/board.store";
import type { ToolType } from "../types";

const TOOLS: { type: ToolType; label: string; icon: string }[] = [
  { type: "select", label: "Select", icon: "↖" },
  { type: "pan", label: "Pan", icon: "✋" },
  { type: "rect", label: "Rectangle", icon: "▭" },
  { type: "circle", label: "Circle", icon: "○" },
  { type: "text", label: "Text", icon: "T" },
  { type: "sticky", label: "Sticky", icon: "📝" },
];

export const Toolbar = () => {
  const { activeTool, setActiveTool } = useBoardStore();

  return (
    /**
     * Fixed toolbar on the left side of the canvas
     * Each tool button sets activeTool in Zustand
     * The canvas reads activeTool to know what to do on click/drag
     */
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-xl shadow-lg border border-gray-100 p-2 flex flex-col gap-1">
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          title={tool.label}
          onClick={() => setActiveTool(tool.type)}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-lg
            transition-colors
            ${
              activeTool === tool.type
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};
