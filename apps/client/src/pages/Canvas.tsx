// apps/client/src/components/Canvas.tsx
import { useRef, useCallback, useEffect, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Group, Line } from "react-konva";
import Konva from "konva";
import { useBoardStore } from "@/store/board.store";
import type { BoardElement, ToolType } from "@/types";
import { v4 as uuid } from "uuid";

interface CanvasProps {
  boardId: string;
  onElementAdd: (el: BoardElement) => void;
  onElementUpdate: (id: string, changes: Partial<BoardElement>) => void;
  onElementDelete: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
}
export const Canvas = ({
  boardId,
  onElementAdd,
  onElementUpdate,
  onElementDelete,
  onCursorMove,
}: CanvasProps) => {
  const selectionRect = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  const selectionRectRef = useRef<Konva.Rect | null>(null);
  const selectionLayerRef = useRef<Konva.Layer | null>(null);
  const isSelecting = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const newElRef = useRef<string | null>(null);
  const penPoints = useRef<number[]>([]);
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const liveLineRef = useRef<Konva.Line | null>(null);
  const liveLayerRef = useRef<Konva.Layer | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>(
    {},
  );
  const penStartPos = useRef({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eraserPoints = useRef<number[]>([]);
  const eraserLineRef = useRef<Konva.Line | null>(null);

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
    deleteElement,
  } = useBoardStore();

  const stageWidth = window.innerWidth;
  const stageHeight = window.innerHeight;

  const getPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    return stage.getRelativePointerPosition() ?? { x: 0, y: 0 };
  }, []);

  // ── Mouse Down ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (editingId) return;

      const clickedOnEmpty = e.target === e.target.getStage();
      const pos = getPos();

      if (activeTool === "pan") {
        isPanning.current = true;
        lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
        return;
      }

      if (activeTool === "select") {
        if (clickedOnEmpty) {
          // start drag selection
          isSelecting.current = true;
          const pos = getPos();
          selectionRect.current = {
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            visible: true,
          };

          if (!selectionRectRef.current) {
            const rect = new Konva.Rect({
              fill: "rgba(74, 144, 226, 0.1)",
              stroke: "#4A90E2",
              strokeWidth: 1,
              dash: [4, 4],
              visible: false,
            });
            selectionLayerRef.current?.add(rect);
            selectionRectRef.current = rect;
          }

          selectionRectRef.current.visible(true);
          selectionRectRef.current.x(pos.x);
          selectionRectRef.current.y(pos.y);
          selectionRectRef.current.width(0);
          selectionRectRef.current.height(0);
          selectionLayerRef.current?.batchDraw();

          setSelectedIds([]);
        }
        return;
      }

      if (activeTool === "text") {
        /**
         * Only create a new text element if clicking on empty canvas
         * If clicking on an existing element, let handleDblClick handle it
         */
        const clickedOnEmpty = e.target === e.target.getStage();
        if (!clickedOnEmpty) return; // ← add this check

        const id = uuid();
        const el: BoardElement = {
          id,
          boardId,
          type: "text",
          x: pos.x,
          y: pos.y,
          width: 200,
          height: 50,
          rotation: 0,
          zIndex: Object.keys(elements).length,
          createdBy: "",
          properties: { content: "", fontSize: 18, color: "#ffffff" },
        };
        addElement(el);
        onElementAdd(el);
        setEditingId(id);
        setEditingText("");
        setTimeout(() => textareaRef.current?.focus(), 10);
        return;
      }

      if (activeTool === "sticky") {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (!clickedOnEmpty) return; // ← add this check

        const id = uuid();
        const el: BoardElement = {
          id,
          boardId,
          type: "sticky",
          x: pos.x - 100,
          y: pos.y - 75,
          width: 200,
          height: 150,
          rotation: 0,
          zIndex: Object.keys(elements).length,
          createdBy: "",
          properties: {
            content: "",
            backgroundColor: "#FFE66D",
            textColor: "#333",
          },
        };
        addElement(el);
        onElementAdd(el);
        setEditingId(id);
        setEditingText("");
        setTimeout(() => textareaRef.current?.focus(), 10);
        return;
      }
      if (activeTool === "eraser") {
        /**
         * Eraser works by detecting which elements overlap
         * with the eraser path and deleting them
         *
         * We draw a temporary red dashed line to show the eraser path
         * then on mouseUp we check every element for intersection
         */
        isDrawing.current = true;
        eraserPoints.current = [pos.x, pos.y];

        const line = new Konva.Line({
          points: [pos.x, pos.y],
          stroke: "rgba(255,100,100,0.6)",
          strokeWidth: 20,
          lineCap: "round",
          lineJoin: "round",
          dash: [1, 0],
          globalCompositeOperation: "source-over",
        });

        liveLayerRef.current?.add(line);
        eraserLineRef.current = line;
        return;
      }

      if (activeTool === "pen") {
        /**
         * Pen uses imperative Konva API — no React state during drawing
         * We create a real Konva.Line object and add it directly to the layer
         * This bypasses React entirely so there are zero re-renders while drawing
         */
        isDrawing.current = true;
        penPoints.current = [pos.x, pos.y];
        penStartPos.current = {
          x: pos.x,
          y: pos.y,
        };

        const line = new Konva.Line({
          points: [pos.x, pos.y],
          stroke: "#4A90E2",
          strokeWidth: 3,
          tension: 0.5,
          lineCap: "round",
          lineJoin: "round",
        });

        liveLayerRef.current?.add(line);
        liveLineRef.current = line;
        return;
      }

      // RECT / CIRCLE
      isDrawing.current = true;
      startPos.current = pos;

      const id = uuid();
      newElRef.current = id;

      const el: BoardElement = {
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
      addElement(el);
    },
    [activeTool, elements, boardId, editingId],
  );

  // ── Mouse Move ──────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos();

      onCursorMove(pos.x, pos.y);

      // PAN
      if (activeTool === "pan" && isPanning.current) {
        const dx = e.evt.clientX - lastPanPos.current.x;
        const dy = e.evt.clientY - lastPanPos.current.y;

        lastPanPos.current = {
          x: e.evt.clientX,
          y: e.evt.clientY,
        };

        // Use functional update so rapid mouse events
        // don't operate on a stale viewport.
        const currentViewport = useBoardStore.getState().viewport;

        setViewport({
          x: currentViewport.x + dx,
          y: currentViewport.y + dy,
        });

        return;
      }

      // DRAG SELECTION
      if (activeTool === "select" && isSelecting.current) {
        const sx = selectionRect.current.x;
        const sy = selectionRect.current.y;

        const x = Math.min(pos.x, sx);
        const y = Math.min(pos.y, sy);
        const width = Math.abs(pos.x - sx);
        const height = Math.abs(pos.y - sy);

        const rect = selectionRectRef.current;

        if (rect) {
          rect.x(x);
          rect.y(y);
          rect.width(width);
          rect.height(height);

          selectionLayerRef.current?.batchDraw();
        }

        return;
      }

      // PEN
      if (activeTool === "pen" && isDrawing.current) {
        penPoints.current.push(pos.x, pos.y);

        liveLineRef.current?.points(penPoints.current);
        liveLayerRef.current?.batchDraw();

        return;
      }

      // ERASER
      if (activeTool === "eraser" && isDrawing.current) {
        eraserPoints.current.push(pos.x, pos.y);

        eraserLineRef.current?.points(eraserPoints.current);
        liveLayerRef.current?.batchDraw();

        const currentElements = useBoardStore.getState().elements;

        // Only check the latest eraser point instead of
        // checking every previous point on every mousemove.
        const ex = pos.x;
        const ey = pos.y;

        Object.values(currentElements).forEach((el) => {
          const width = Math.abs(el.width ?? 0);
          const height = Math.abs(el.height ?? 0);

          const minX = Math.min(el.x, el.x + width);
          const maxX = Math.max(el.x, el.x + width);

          const minY = Math.min(el.y, el.y + height);
          const maxY = Math.max(el.y, el.y + height);

          const erasing = ex >= minX && ex <= maxX && ey >= minY && ey <= maxY;

          if (erasing) {
            deleteElement(el.id);
            onElementDelete(el.id);
          }
        });

        return;
      }

      // RECT / CIRCLE
      if (!isDrawing.current || !newElRef.current) {
        return;
      }

      const width = pos.x - startPos.current.x;
      const height = pos.y - startPos.current.y;

      updateElement(newElRef.current, {
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? pos.x : startPos.current.x,
        y: height < 0 ? pos.y : startPos.current.y,
      });
    },
    [
      activeTool,
      getPos,
      onCursorMove,
      setViewport,
      deleteElement,
      onElementDelete,
      updateElement,
    ],
  );

  // ── Mouse Up ────────────────────────────────────────────────────────────

const handleMouseUp = useCallback(() => {
  isPanning.current = false;

  // ─────────────────────────────────────────────
  // PEN
  // ─────────────────────────────────────────────
  if (activeTool === "pen" && isDrawing.current) {
    isDrawing.current = false;

    const points = penPoints.current;

    // Remove temporary/live line first
    liveLineRef.current?.destroy();
    liveLineRef.current = null;
    liveLayerRef.current?.batchDraw();

    // Ignore tiny strokes
    if (points.length < 6) {
      penPoints.current = [];
      return;
    }

    // Find bounding box
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 !== 0);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Convert absolute points → local points
    const localPoints = points.map((value, index) => {
      return index % 2 === 0 ? value - minX : value - minY;
    });

    const id = uuid();

    const el: BoardElement = {
      id,
      boardId,
      type: "pen",

      x: minX,
      y: minY,

      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),

      rotation: 0,

      zIndex: Object.keys(useBoardStore.getState().elements).length,

      createdBy: "",

      properties: {
        points: localPoints,
        stroke: "#4A90E2",
        strokeWidth: 3,
      },
    };

    addElement(el);
    onElementAdd(el);

    // Clear drawing state
    penPoints.current = [];
  }

  // ─────────────────────────────────────────────
  // ERASER
  // ─────────────────────────────────────────────
  if (activeTool === "eraser" && isDrawing.current) {
    isDrawing.current = false;

    eraserLineRef.current?.destroy();
    eraserLineRef.current = null;

    liveLayerRef.current?.batchDraw();

    eraserPoints.current = [];
    return;
  }

  // ─────────────────────────────────────────────
  // DRAG SELECTION
  // ─────────────────────────────────────────────
  if (activeTool === "select" && isSelecting.current) {
    isSelecting.current = false;

    selectionRectRef.current?.visible(false);
    selectionLayerRef.current?.batchDraw();

    const box = selectionRectRef.current?.getClientRect();

    if (!box) {
      setSelectedIds([]);
      return;
    }

    const currentViewport = useBoardStore.getState().viewport;

    const { x: viewportX, y: viewportY, scale } = currentViewport;

    const selected = Object.values(useBoardStore.getState().elements).filter(
      (el) => {
        const elementWidth = Math.abs(el.width ?? 0);
        const elementHeight = Math.abs(el.height ?? 0);

        const elementX = el.x * scale + viewportX;

        const elementY = el.y * scale + viewportY;

        const elementScreenWidth = elementWidth * scale;

        const elementScreenHeight = elementHeight * scale;

        return (
          elementX < box.x + box.width &&
          elementX + elementScreenWidth > box.x &&
          elementY < box.y + box.height &&
          elementY + elementScreenHeight > box.y
        );
      },
    );

    setSelectedIds(selected.map((el) => el.id));

    return;
  }

  // ─────────────────────────────────────────────
  // RECT / CIRCLE
  // ─────────────────────────────────────────────
  if (!isDrawing.current || !newElRef.current) {
    return;
  }

  isDrawing.current = false;

  const elementId = newElRef.current;

  const el = useBoardStore.getState().elements[elementId];

  if (!el) {
    newElRef.current = null;
    return;
  }

  const elementWidth = Math.abs(el.width ?? 0);
  const elementHeight = Math.abs(el.height ?? 0);

  if (elementWidth < 5 || elementHeight < 5) {
    deleteElement(elementId);
    newElRef.current = null;
    return;
  }

  onElementAdd(el);

  newElRef.current = null;
}, [
  activeTool,
  boardId,
  addElement,
  deleteElement,
  onElementAdd,
  setSelectedIds,
]);

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;

      let target = e.target;

      // If we double-click a child of a sticky Group,
      // walk up until we find the element node.
      let elementId = target.id();

      if (!elementId) {
        const parent = target.findAncestor((node) => !!node.id(), true);

        if (parent) {
          elementId = parent.id();
        }
      }

      if (!elementId) return;

      const el = useBoardStore.getState().elements[elementId];

      if (!el) return;

      if (el.type !== "text" && el.type !== "sticky") return;

      const props = el.properties as any;

      setEditingId(elementId);
      setEditingText(props.content || "");

      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 10);
    },
    [],
  );

  // ── Save text ───────────────────────────────────────────────────────────
  const handleTextareaBlur = useCallback(() => {
    if (!editingId) return;
    const el = useBoardStore.getState().elements[editingId];
    if (!el) {
      setEditingId(null);
      return;
    }

    /**
     * If user didn't type anything — delete the element
     * Don't leave empty placeholder elements on the canvas
     */
    if (!editingText.trim()) {
      deleteElement(editingId);
      onElementDelete(editingId);
      setEditingId(null);
      return;
    }

    const changes = { properties: { ...el.properties, content: editingText } };
    updateElement(editingId, changes);
    onElementUpdate(editingId, changes);
    setEditingId(null);
  }, [editingId, editingText, onElementUpdate]);

  // ── Textarea position ───────────────────────────────────────────────────
  const getTextareaStyle = (): React.CSSProperties | null => {
    if (!editingId || !stageRef.current) return null;
    const el = useBoardStore.getState().elements[editingId];
    if (!el) return null;

    const stage = stageRef.current;
    const scale = stage.scaleX();
    const stageBox = stage.container().getBoundingClientRect();
    const props = el.properties as any;

    return {
      position: "fixed",
      top: stageBox.top + stage.y() + el.y * scale,
      left: stageBox.left + stage.x() + el.x * scale,
      width: el.width * scale,
      minHeight: el.height * scale,
      fontSize: (props.fontSize || 16) * scale,
      fontFamily: "sans-serif",
      lineHeight: "1.5",
      padding: 8 * scale,
      border: "2px solid #4A90E2",
      borderRadius: el.type === "sticky" ? 8 : 4,
      background:
        el.type === "sticky"
          ? props.backgroundColor || "#FFE66D"
          : "rgba(30, 41, 59, 0.95)",
      color:
        el.type === "sticky"
          ? props.textColor || "#333"
          : props.color || "#ffffff",
      resize: "none",
      outline: "none",
      zIndex: 1000,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    };
  };

  // ── Zoom ────────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition()!;
      const scaleBy = 1.05;
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clamped = Math.min(Math.max(newScale, 0.1), 5);

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      setViewport({
        scale: clamped,
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      });
    },
    [setViewport],
  );

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;

      // delete all selected
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedIds.length > 0
      ) {
        selectedIds.forEach((id) => {
          onElementDelete(id);
          deleteElement(id);
        });
        setSelectedIds([]);
      }

      // move selected elements with arrow keys
      if (selectedIds.length > 0) {
        const STEP = e.shiftKey ? 20 : 5;
        let dx = 0,
          dy = 0;

        if (e.key === "ArrowLeft") dx = -STEP;
        if (e.key === "ArrowRight") dx = STEP;
        if (e.key === "ArrowUp") dy = -STEP;
        if (e.key === "ArrowDown") dy = STEP;

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          selectedIds.forEach((id) => {
            const el = useBoardStore.getState().elements[id];
            if (!el) return;
            const changes = { x: el.x + dx, y: el.y + dy };
            updateElement(id, changes);
            onElementUpdate(id, changes);
          });
        }
      }

      if (e.key === "Escape") {
        useBoardStore.getState().setActiveTool("select");
        setSelectedIds([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, onElementDelete, editingId]);

  // ── Render elements ─────────────────────────────────────────────────────
  const renderElement = (el: BoardElement) => {
    const isSelected = selectedIds.includes(el.id);
    const isEditing = editingId === el.id;
    const props = el.properties as any;

    const dragProps = {
      draggable: activeTool === "select" && !isEditing,

      onClick: (e: any) => {
        e.cancelBubble = true;

        if (e.evt.shiftKey) {
          const current = useBoardStore.getState().selectedIds;

          if (current.includes(el.id)) {
            setSelectedIds(current.filter((id) => id !== el.id));
          } else {
            setSelectedIds([...current, el.id]);
          }
        } else {
          const current = useBoardStore.getState().selectedIds;

          if (!current.includes(el.id)) {
            setSelectedIds([el.id]);
          }
        }
      },

      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;

        const currentSelectedIds = useBoardStore.getState().selectedIds;

        // If dragging an unselected element,
        // make it the only selected element.
        if (!currentSelectedIds.includes(el.id)) {
          setSelectedIds([el.id]);

          dragStartPositions.current = {
            [el.id]: {
              x: el.x,
              y: el.y,
            },
          };

          return;
        }

        // Store the ORIGINAL position of every selected element.
        const currentElements = useBoardStore.getState().elements;

        dragStartPositions.current = {};

        currentSelectedIds.forEach((id) => {
          const selectedEl = currentElements[id];

          if (!selectedEl) return;

          dragStartPositions.current[id] = {
            x: selectedEl.x,
            y: selectedEl.y,
          };
        });
      },

      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;

        const currentSelectedIds = useBoardStore.getState().selectedIds;

        const startPosition = dragStartPositions.current[el.id];

        if (!startPosition) return;

        const dx = e.target.x() - startPosition.x;
        const dy = e.target.y() - startPosition.y;

        // Move the other selected Konva nodes visually.
        currentSelectedIds.forEach((id) => {
          if (id === el.id) return;

          const start = dragStartPositions.current[id];

          if (!start) return;

          const node = stageRef.current?.findOne(`#${id}`);

          if (!node) return;

          node.x(start.x + dx);
          node.y(start.y + dy);
        });
      },

      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;

        const currentSelectedIds = useBoardStore.getState().selectedIds;

        const startPosition = dragStartPositions.current[el.id];

        if (!startPosition) return;

        const dx = e.target.x() - startPosition.x;
        const dy = e.target.y() - startPosition.y;

        const currentElements = useBoardStore.getState().elements;

        currentSelectedIds.forEach((id) => {
          const start = dragStartPositions.current[id];

          if (!start) return;

          const selectedEl = currentElements[id];

          if (!selectedEl) return;

          const changes = {
            x: start.x + dx,
            y: start.y + dy,
          };

          updateElement(id, changes);
          onElementUpdate(id, changes);
        });

        dragStartPositions.current = {};
      },
    };

    const sel = {
      stroke: isSelected ? "#4A90E2" : "transparent",
      strokeWidth: isSelected ? 2 : 0,
    };

    switch (el.type) {
      case "rect":
        return (
          <Rect
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            rotation={el.rotation}
            fill={props.fill || "#4A90E2"}
            opacity={props.opacity ?? 1}
            cornerRadius={props.cornerRadius || 4}
            {...sel}
            {...dragProps}
          />
        );

      case "circle":
        return (
          <Group key={el.id} id={el.id} x={el.x} y={el.y} {...dragProps}>
            <Ellipse
              x={el.width / 2}
              y={el.height / 2}
              radiusX={el.width / 2}
              radiusY={el.height / 2}
              fill={props.fill || "#E24A4A"}
              opacity={props.opacity ?? 1}
              {...sel}
              listening={true}
            />
          </Group>
        );

      case "text":
        return (
          <Text
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            opacity={isEditing ? 0 : 1}
            text={props.content || ""}
            fontSize={props.fontSize || 16}
            fill={props.color || "#ffffff"}
            wrap="word"
            {...sel}
            {...dragProps}
          />
        );

      case "sticky":
        return (
          <Group
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            opacity={isEditing ? 0 : 1}
            {...dragProps}
          >
            <Rect
              width={el.width}
              height={el.height}
              fill={props.backgroundColor || "#FFE66D"}
              cornerRadius={8}
              shadowColor="rgba(0,0,0,0.2)"
              shadowBlur={8}
              shadowOffsetY={4}
              listening={true}
              {...sel}
            />

            <Rect
              width={el.width}
              height={28}
              fill="rgba(0,0,0,0.08)"
              cornerRadius={[8, 8, 0, 0]}
              listening={false}
            />

            <Text
              x={8}
              y={36}
              width={el.width - 16}
              height={el.height - 44}
              text={props.content || ""}
              fontSize={14}
              fill={props.textColor || "#333"}
              wrap="word"
              listening={false}
            />
          </Group>
        );
      case "pen":
        return (
          <Group
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            draggable={activeTool === "select" && !isEditing}
            onClick={(e) => {
              e.cancelBubble = true;

              if (e.evt.shiftKey) {
                const current = useBoardStore.getState().selectedIds;

                if (current.includes(el.id)) {
                  setSelectedIds(current.filter((id) => id !== el.id));
                } else {
                  setSelectedIds([...current, el.id]);
                }
              } else {
                setSelectedIds([el.id]);
              }
            }}
          >
            <Line
              points={props.points || []}
              stroke={props.stroke || "#4A90E2"}
              strokeWidth={props.strokeWidth || 3}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              listening={true}
            />
          </Group>
        );
      default:
        return null;
    }
  };

  const textareaStyle = getTextareaStyle();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {Object.keys(elements).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <p className="text-slate-600 text-sm">
              Select a tool and start drawing
            </p>
            <p className="text-slate-700 text-xs mt-1">
              Scroll to zoom · P for pen · R for rect
            </p>
          </div>
        </div>
      )}

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
        onDblClick={handleDblClick}
        style={{
          cursor:
            activeTool === "pan"
              ? "grab"
              : activeTool === "select"
                ? "default"
                : activeTool === "eraser"
                  ? "cell" // ← add this
                  : activeTool === "text" || activeTool === "sticky"
                    ? "text"
                    : "crosshair",
          background: "#0f172a",
        }}
      >
        <Layer ref={selectionLayerRef} />
        {/* Live pen layer — drawn imperatively, zero React re-renders */}
        <Layer ref={liveLayerRef} />

        {/* All saved elements */}
        <Layer>
          {Object.values(elements)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(renderElement)}
        </Layer>

        {/* Other users cursors */}
        <Layer listening={false}>
          {onlineUsers.map((user) =>
            user.cursor ? (
              <Group key={user.userId} x={user.cursor.x} y={user.cursor.y}>
                <Ellipse radiusX={5} radiusY={5} fill={user.color} />
                <Rect
                  x={10}
                  y={-10}
                  width={user.email.length * 6.5 + 8}
                  height={20}
                  fill={user.color}
                  cornerRadius={4}
                />
                <Text
                  x={14}
                  y={-6}
                  text={user.email.split("@")[0]}
                  fontSize={11}
                  fill="white"
                />
              </Group>
            ) : null,
          )}
        </Layer>
      </Stage>

      {editingId && textareaStyle && (
        <textarea
          ref={textareaRef}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleTextareaBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleTextareaBlur();
            e.stopPropagation();
          }}
          placeholder="Type here..."
          style={textareaStyle as React.CSSProperties}
        />
      )}
    </div>
  );
};

const getDefaultProperties = (tool: ToolType): Record<string, unknown> => {
  switch (tool) {
    case "rect":
      return { fill: "#4A90E2", opacity: 1, cornerRadius: 4 };
    case "circle":
      return { fill: "#E24A4A", opacity: 1 };
    case "text":
      return { content: "", fontSize: 18, color: "#ffffff" };
    case "sticky":
      return { content: "", backgroundColor: "#FFE66D", textColor: "#333" };
    case "pen":
      return { points: [], stroke: "#4A90E2", strokeWidth: 3 };
    case "eraser":
      return {};
    default:
      return {};
  }
};
