// apps/client/src/components/Canvas.tsx
import { useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import Konva from "konva";
import { useBoardStore } from "../store/board.store";
import type { BoardElement, ToolType } from "../types";
import { v4 as uuid } from "uuid";

// npm install uuid @types/uuid
// run: npm install uuid @types/uuid in apps/client

interface CanvasProps {
  boardId: string;
  onElementAdd: (el: BoardElement) => void;
  onElementUpdate: (id: string, changes: Partial<BoardElement>) => void;
  onElementDelete: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
}

/**
 * Konva.js — 2D canvas library for React
 *
 * Why Konva over plain HTML Canvas API?
 * - React-like component model (Stage → Layer → Shape)
 * - Built-in drag and drop on shapes
 * - Hit detection (know which shape was clicked)
 * - Transformer (resize handles) built in
 * - Much easier event handling
 *
 * Structure:
 * Stage  → the canvas container (like a window)
 *   Layer → groups of shapes (like Photoshop layers)
 *     Rect, Circle, Text etc → actual shapes
 *
 * We use two layers:
 * 1. elements layer — all board elements
 * 2. cursor layer   — other users' cursors (on top, never blocked)
 */

export const Canvas = ({
  boardId,
  onElementAdd,
  onElementUpdate,
  onElementDelete,
  onCursorMove,
}: CanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const newElRef = useRef<string | null>(null);

  const {
    elements,
    activeTool,
    viewport,
    onlineUsers,
    selectedIds,
    setSelectedIds,
    setViewport,
    addElement,
    updateElement,
  } = useBoardStore();

  const stageWidth = window.innerWidth;
  const stageHeight = window.innerHeight;

  /**
   * getPointerPosition — converts screen coordinates to canvas coordinates
   *
   * When the canvas is zoomed or panned, a click at screen position (500, 300)
   * doesn't correspond to canvas position (500, 300) anymore
   * We need to account for the current scale and offset
   * Konva's getRelativePointerPosition does this for us
   */
  const getPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    return stage.getRelativePointerPosition() ?? { x: 0, y: 0 };
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // clicked on empty canvas (not a shape)
      const clickedOnEmpty = e.target === e.target.getStage();

      if (activeTool === "select") {
        if (clickedOnEmpty) setSelectedIds([]);
        return;
      }

      if (activeTool === "pan") return;

      // drawing mode
      isDrawing.current = true;
      const pos = getPos();
      startPos.current = pos;

      // create a placeholder element immediately for visual feedback
      const id = uuid();
      newElRef.current = id;

      const baseElement: BoardElement = {
        id,
        boardId,
        type: activeTool as any,
        x: pos.x,
        y: pos.y,
        width: 1,
        height: 1,
        rotation: 0,
        zIndex: Object.keys(elements).length,
        createdBy: "",
        properties: getDefaultProperties(activeTool),
      };

      addElement(baseElement);
    },
    [activeTool, elements, boardId],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos();

      // emit cursor position to other users
      onCursorMove(pos.x, pos.y);

      if (!isDrawing.current || !newElRef.current) return;

      // update element size as user drags
      const width = pos.x - startPos.current.x;
      const height = pos.y - startPos.current.y;

      updateElement(newElRef.current, {
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? pos.x : startPos.current.x,
        y: height < 0 ? pos.y : startPos.current.y,
      });
    },
    [onCursorMove],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !newElRef.current) return;

    isDrawing.current = false;

    const el = useBoardStore.getState().elements[newElRef.current];
    if (!el) return;

    // minimum size — don't save tiny accidental clicks
    if (el.width < 5 || el.height < 5) {
      useBoardStore.getState().deleteElement(newElRef.current);
      newElRef.current = null;
      return;
    }

    // emit to other users via socket
    onElementAdd(el);
    newElRef.current = null;
  }, [onElementAdd]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition()!;

      /**
       * Zoom toward mouse pointer — this feels natural
       * Without this, zooming always centers on the canvas origin
       *
       * The math:
       * 1. Find where the pointer is in the old coordinate space
       * 2. Apply new scale
       * 3. Adjust position so that point stays under the pointer
       */
      const scaleBy = 1.05;
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };

      setViewport({ scale: clampedScale, x: newPos.x, y: newPos.y });
    },
    [setViewport],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /**
       * Delete selected elements with Backspace or Delete key
       * This is standard behavior users expect from any canvas tool
       */
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedIds.length > 0
      ) {
        selectedIds.forEach((id) => {
          onElementDelete(id);
          useBoardStore.getState().deleteElement(id);
        });
        setSelectedIds([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, onElementDelete]);

  // ── Render elements ───────────────────────────────────────────────────────
  const renderElement = (el: BoardElement) => {
    const isSelected = selectedIds.includes(el.id);
    const props = el.properties as any;

    const commonProps = {
      key: el.id,
      id: el.id,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      draggable: activeTool === "select",
      /**
       * onClick — select this element
       * onDragEnd — update position after drag
       *
       * We update locally immediately (optimistic update)
       * then emit to server. This makes the UI feel instant
       * even if the server is slow.
       */
      onClick: () => setSelectedIds([el.id]),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const changes = { x: e.target.x(), y: e.target.y() };
        updateElement(el.id, changes);
        onElementUpdate(el.id, changes);
      },
      stroke: isSelected ? "#4A90E2" : props.stroke || "transparent",
      strokeWidth: isSelected ? 2 : props.strokeWidth || 0,
    };

    switch (el.type) {
      case "rect":
        return (
          <Rect
            {...commonProps}
            fill={props.fill || "#4A90E2"}
            opacity={props.opacity || 1}
            cornerRadius={props.cornerRadius || 0}
          />
        );

      case "circle":
        return (
          <Circle
            {...commonProps}
            x={el.x + el.width / 2}
            y={el.y + el.height / 2}
            radiusX={el.width / 2}
            radiusY={el.height / 2}
            fill={props.fill || "#E24A4A"}
            opacity={props.opacity || 1}
          />
        );

      case "text":
        return (
          <Text
            {...commonProps}
            text={props.content || "Double click to edit"}
            fontSize={props.fontSize || 16}
            fill={props.color || "#333333"}
            wrap="word"
          />
        );

      case "sticky":
        return (
          <Group
            key={el.id}
            x={el.x}
            y={el.y}
            draggable={activeTool === "select"}
            onClick={() => setSelectedIds([el.id])}
            onDragEnd={(e) => {
              const changes = { x: e.target.x(), y: e.target.y() };
              updateElement(el.id, changes);
              onElementUpdate(el.id, changes);
            }}
          >
            <Rect
              width={el.width}
              height={el.height}
              fill={props.backgroundColor || "#FFE66D"}
              cornerRadius={4}
              stroke={isSelected ? "#4A90E2" : "transparent"}
              strokeWidth={isSelected ? 2 : 0}
            />
            <Text
              x={8}
              y={8}
              width={el.width - 16}
              height={el.height - 16}
              text={props.content || "Sticky note"}
              fontSize={14}
              fill={props.textColor || "#333"}
              wrap="word"
            />
          </Group>
        );

      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      /**
       * cursor style changes based on active tool
       * gives visual feedback about what mode you're in
       */
      style={{
        cursor:
          activeTool === "pan"
            ? "grab"
            : activeTool === "select"
              ? "default"
              : "crosshair",
      }}
    >
      {/* Elements layer */}
      <Layer>
        {Object.values(elements)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(renderElement)}
      </Layer>

      {/* Cursor layer — always on top */}
      <Layer>
        {onlineUsers.map((user) =>
          user.cursor ? (
            <Group key={user.userId} x={user.cursor.x} y={user.cursor.y}>
              {/* cursor dot */}
              <Circle radius={5} fill={user.color} />
              {/* username label */}
              <Rect
                x={8}
                y={-8}
                width={user.email.length * 7}
                height={20}
                fill={user.color}
                cornerRadius={4}
              />
              <Text
                x={12}
                y={-5}
                text={user.email.split("@")[0]}
                fontSize={11}
                fill="white"
              />
            </Group>
          ) : null,
        )}
      </Layer>
    </Stage>
  );
};

// default visual properties per element type
const getDefaultProperties = (tool: ToolType): Record<string, unknown> => {
  switch (tool) {
    case "rect":
      return { fill: "#4A90E2", stroke: "transparent", opacity: 1 };
    case "circle":
      return { fill: "#E24A4A", stroke: "transparent", opacity: 1 };
    case "text":
      return { content: "Text", fontSize: 16, color: "#333333" };
    case "sticky":
      return { content: "Note", backgroundColor: "#FFE66D", textColor: "#333" };
    default:
      return {};
  }
};
