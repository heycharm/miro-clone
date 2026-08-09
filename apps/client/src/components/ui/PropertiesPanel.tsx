// apps/client/src/components/PropertiesPanel.tsx
import { useBoardStore } from "@/store/board.store";
import { Trash2 } from "lucide-react";

const COLORS = [
  "#4A90E2",
  "#E24A4A",
  "#50C878",
  "#FFE66D",
  "#FF6B6B",
  "#A855F7",
  "#F97316",
  "#06B6D4",
  "#ffffff",
  "#94a3b8",
  "#475569",
  "#1e293b",
];

const STICKY_COLORS = [
  "#FFE66D",
  "#FFB347",
  "#87CEEB",
  "#98FB98",
  "#DDA0DD",
  "#F0E68C",
  "#FFB6C1",
  "#B0E0E6",
];

interface Props {
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: any) => void;
}

export const PropertiesPanel = ({ onDelete, onUpdate }: Props) => {
  const { selectedIds, elements } = useBoardStore();

  if (selectedIds.length === 0) return null;

  const el = elements[selectedIds[0]];
  if (!el) return null;

  const props = el.properties as any;

  const update = (newProps: Record<string, unknown>) => {
    const changes = { properties: { ...el.properties, ...newProps } };
    onUpdate(el.id, changes);
  };

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20 w-52">
      <div className="bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-xl p-3 shadow-xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 capitalize font-medium">
            {el.type}
          </span>
          <button
            onClick={() => onDelete(el.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-px bg-slate-700/50" />

        {/* Fill color — rect, circle, pen */}
        {(el.type === "rect" || el.type === "circle" || el.type === "pen") && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Color</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => update({ fill: color, stroke: color })}
                  title={color}
                  className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      props.fill === color || props.stroke === color
                        ? "#4A90E2"
                        : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sticky background color */}
        {el.type === "sticky" && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Note color</p>
            <div className="grid grid-cols-4 gap-1.5">
              {STICKY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => update({ backgroundColor: color })}
                  className="w-9 h-7 rounded-md border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      props.backgroundColor === color
                        ? "#4A90E2"
                        : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Text color */}
        {el.type === "text" && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Text color</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => update({ color })}
                  className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      props.color === color ? "#4A90E2" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Font size — text only */}
        {el.type === "text" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Font size</p>
              <span className="text-xs text-white font-mono">
                {props.fontSize || 16}px
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={72}
              step={2}
              value={props.fontSize || 16}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5"
            />
            {/* Quick size buttons */}
            <div className="flex gap-1">
              {[12, 16, 24, 36, 48].map((size) => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`flex-1 py-1 text-xs rounded-md transition-all ${
                    props.fontSize === size
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opacity — rect and circle */}
        {(el.type === "rect" || el.type === "circle") && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Opacity</p>
              <span className="text-xs text-white font-mono">
                {Math.round((props.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={props.opacity ?? 1}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5"
            />
          </div>
        )}

        {/* Stroke width — pen */}
        {el.type === "pen" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Stroke width</p>
              <span className="text-xs text-white font-mono">
                {props.strokeWidth || 3}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={props.strokeWidth || 3}
              onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5"
            />
          </div>
        )}

        <div className="h-px bg-slate-700/50" />

        {/* Position and size info */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "X", value: Math.round(el.x) },
            { label: "Y", value: Math.round(el.y) },
            { label: "W", value: Math.round(el.width) },
            { label: "H", value: Math.round(el.height) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-700/40 rounded-lg px-2 py-1.5">
              <p className="text-slate-500 text-xs">{label}</p>
              <p className="text-slate-200 font-mono text-xs">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
