"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { VendorEstimatePhoto } from "@/lib/vendor/estimate-types";
import { updatePhotoAnnotation } from "@/app/actions/vendor-estimate-photos";

// ─── Annotation Shape Types ──────────────────────────────────────────────────

type ShapeType = "arrow" | "rectangle" | "text" | "freehand";

interface BaseShape {
  type: ShapeType;
  color: string;
  lineWidth: number;
}

interface ArrowShape extends BaseShape {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RectangleShape extends BaseShape {
  type: "rectangle";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

interface FreehandShape extends BaseShape {
  type: "freehand";
  points: { x: number; y: number }[];
}

type AnnotationShape = ArrowShape | RectangleShape | TextShape | FreehandShape;

interface AnnotationData {
  v: 1;
  canvas: { w: number; h: number };
  shapes: AnnotationShape[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ffffff"];
const LINE_WIDTHS = [2, 4, 6];
const MAX_UNDO = 20;
const ANNOTATION_VERSION = 1;

// ─── Component ───────────────────────────────────────────────────────────────

interface PhotoAnnotationModalProps {
  photo: VendorEstimatePhoto;
  storageBaseUrl: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function PhotoAnnotationModal({
  photo,
  storageBaseUrl,
  onClose,
  onSaved,
}: PhotoAnnotationModalProps) {
  const t = useTranslations("vendor.estimates");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Tool state
  const [tool, setTool] = useState<ShapeType>("arrow");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(LINE_WIDTHS[1]);
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationShape[][]>([]);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Drawing state (refs for pointer events to avoid stale closures)
  const drawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  // Text input state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = `${storageBaseUrl}/storage/v1/object/public/dd-captures/${photo.storage_path}`;

  // ── Load image + existing annotations ──────────────────────────────────────

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      // Load existing annotations
      if (photo.annotation_data) {
        const data = photo.annotation_data as unknown as AnnotationData;
        if (data.v === ANNOTATION_VERSION && Array.isArray(data.shapes)) {
          setShapes(data.shapes);
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl, photo.annotation_data]);

  // ── Resize canvas to fit container ─────────────────────────────────────────

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !containerRef.current || !imageRef.current) return;

    const fitCanvas = () => {
      const container = containerRef.current!;
      const canvas = canvasRef.current!;
      const img = imageRef.current!;

      const maxW = container.clientWidth;
      const maxH = container.clientHeight;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = maxW / maxH;

      let w: number, h: number;
      if (imgRatio > containerRatio) {
        w = maxW;
        h = maxW / imgRatio;
      } else {
        h = maxH;
        w = maxH * imgRatio;
      }

      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvasSizeRef.current = { w, h };
    };

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageLoaded]);

  // ── Render loop ────────────────────────────────────────────────────────────

  const render = useCallback(
    (extraShape?: AnnotationShape) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h } = canvasSizeRef.current;

      // Draw image
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Draw all shapes
      const allShapes = extraShape ? [...shapes, extraShape] : shapes;
      for (const shape of allShapes) {
        drawShape(ctx, shape);
      }
    },
    [shapes]
  );

  // Re-render when shapes change
  useEffect(() => {
    if (imageLoaded) render();
  }, [imageLoaded, render]);

  // ── Draw a single shape ────────────────────────────────────────────────────

  function drawShape(ctx: CanvasRenderingContext2D, shape: AnnotationShape) {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (shape.type) {
      case "arrow": {
        const { x1, y1, x2, y2 } = shape;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 12 + shape.lineWidth * 2;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "rectangle": {
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.w, shape.h);
        ctx.stroke();
        break;
      }
      case "text": {
        const fontSize = shape.fontSize || 16;
        ctx.font = `bold ${fontSize}px sans-serif`;
        // Text background
        const metrics = ctx.measureText(shape.text);
        const padding = 4;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(
          shape.x - padding,
          shape.y - fontSize - padding,
          metrics.width + padding * 2,
          fontSize + padding * 2
        );
        ctx.fillStyle = shape.color;
        ctx.fillText(shape.text, shape.x, shape.y);
        break;
      }
      case "freehand": {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        break;
      }
    }
  }

  // ── Pointer event helpers ──────────────────────────────────────────────────

  const getCanvasPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Pointer events (unified mouse + touch) ────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool === "text") {
        const pt = getCanvasPoint(e);
        setTextInputPos(pt);
        setTextDraft("");
        return;
      }

      drawingRef.current = true;
      const pt = getCanvasPoint(e);
      startPointRef.current = pt;
      currentPointsRef.current = [pt];

      // Capture pointer for drag
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [tool, getCanvasPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current) return;

      const pt = getCanvasPoint(e);
      const start = startPointRef.current;

      if (tool === "freehand") {
        currentPointsRef.current.push(pt);
        const previewShape: FreehandShape = {
          type: "freehand",
          color,
          lineWidth,
          points: [...currentPointsRef.current],
        };
        render(previewShape);
      } else if (tool === "arrow") {
        const previewShape: ArrowShape = {
          type: "arrow",
          color,
          lineWidth,
          x1: start.x,
          y1: start.y,
          x2: pt.x,
          y2: pt.y,
        };
        render(previewShape);
      } else if (tool === "rectangle") {
        const previewShape: RectangleShape = {
          type: "rectangle",
          color,
          lineWidth,
          x: Math.min(start.x, pt.x),
          y: Math.min(start.y, pt.y),
          w: Math.abs(pt.x - start.x),
          h: Math.abs(pt.y - start.y),
        };
        render(previewShape);
      }
    },
    [tool, color, lineWidth, render, getCanvasPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;

      const pt = getCanvasPoint(e);
      const start = startPointRef.current;

      let newShape: AnnotationShape | null = null;

      if (tool === "freehand") {
        currentPointsRef.current.push(pt);
        if (currentPointsRef.current.length >= 2) {
          newShape = {
            type: "freehand",
            color,
            lineWidth,
            points: [...currentPointsRef.current],
          };
        }
      } else if (tool === "arrow") {
        const dist = Math.hypot(pt.x - start.x, pt.y - start.y);
        if (dist > 5) {
          newShape = {
            type: "arrow",
            color,
            lineWidth,
            x1: start.x,
            y1: start.y,
            x2: pt.x,
            y2: pt.y,
          };
        }
      } else if (tool === "rectangle") {
        const w = Math.abs(pt.x - start.x);
        const h = Math.abs(pt.y - start.y);
        if (w > 5 && h > 5) {
          newShape = {
            type: "rectangle",
            color,
            lineWidth,
            x: Math.min(start.x, pt.x),
            y: Math.min(start.y, pt.y),
            w,
            h,
          };
        }
      }

      if (newShape) {
        pushShape(newShape);
      }

      currentPointsRef.current = [];
    },
    [tool, color, lineWidth, getCanvasPoint]
  );

  // ── Shape management with undo ─────────────────────────────────────────────

  const pushShape = useCallback(
    (shape: AnnotationShape) => {
      setShapes((prev) => {
        const next = [...prev, shape];
        setUndoStack((stack) => {
          const newStack = [...stack, prev];
          return newStack.length > MAX_UNDO ? newStack.slice(-MAX_UNDO) : newStack;
        });
        return next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setShapes(prev);
      return stack.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (shapes.length === 0) return;
    setUndoStack((stack) => {
      const newStack = [...stack, shapes];
      return newStack.length > MAX_UNDO ? newStack.slice(-MAX_UNDO) : newStack;
    });
    setShapes([]);
  }, [shapes]);

  // ── Text input commit ──────────────────────────────────────────────────────

  const commitText = useCallback(() => {
    if (!textInputPos || !textDraft.trim()) {
      setTextInputPos(null);
      return;
    }
    const newShape: TextShape = {
      type: "text",
      color,
      lineWidth,
      x: textInputPos.x,
      y: textInputPos.y,
      text: textDraft.trim(),
      fontSize: 16,
    };
    pushShape(newShape);
    setTextInputPos(null);
    setTextDraft("");
  }, [textInputPos, textDraft, color, lineWidth, pushShape]);

  // Focus text input when it appears
  useEffect(() => {
    if (textInputPos && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputPos]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { w, h } = canvasSizeRef.current;
      const annotationData: AnnotationData | null =
        shapes.length > 0
          ? {
              v: 1,
              canvas: { w, h },
              shapes,
            }
          : null;

      const result = await updatePhotoAnnotation(
        photo.id,
        annotationData as unknown as Record<string, unknown> | null
      );
      if (!result.error) {
        onSaved?.();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [shapes, photo.id, onSaved, onClose]);

  // ── Tool definitions ───────────────────────────────────────────────────────

  const tools: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
    {
      type: "arrow",
      label: t("photos.toolArrow"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      ),
    },
    {
      type: "rectangle",
      label: t("photos.toolRect"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      type: "text",
      label: t("photos.toolText"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
    {
      type: "freehand",
      label: t("photos.toolFreehand"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-primary/95 border-b border-edge-primary">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("photos.annotateTitle")}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("photos.saveAnnotation")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-content-tertiary hover:text-content-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-secondary/95 border-b border-edge-secondary overflow-x-auto">
        {/* Tool buttons */}
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setTool(t.type)}
              className={`p-2 rounded-lg transition-colors ${
                tool === t.type
                  ? "bg-brand-600 text-white"
                  : "text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary"
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-edge-secondary" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-edge-secondary" />

        {/* Line width */}
        <div className="flex items-center gap-1">
          {LINE_WIDTHS.map((lw) => (
            <button
              key={lw}
              type="button"
              onClick={() => setLineWidth(lw)}
              className={`p-2 rounded-lg transition-colors ${
                lineWidth === lw
                  ? "bg-surface-tertiary text-content-primary"
                  : "text-content-quaternary hover:text-content-secondary"
              }`}
              title={`${lw}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: lw * 3, height: lw * 3 }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-edge-secondary" />

        {/* Undo + Clear */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="p-2 text-content-tertiary hover:text-content-primary disabled:opacity-30 transition-colors"
          title={t("photos.undo")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={shapes.length === 0}
          className="p-2 text-content-tertiary hover:text-red-400 disabled:opacity-30 transition-colors"
          title={t("photos.clearAll")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
        {!imageLoaded ? (
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            {/* Text input overlay */}
            {textInputPos && (
              <input
                ref={textInputRef}
                type="text"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitText();
                  if (e.key === "Escape") {
                    setTextInputPos(null);
                    setTextDraft("");
                  }
                }}
                onBlur={commitText}
                className="absolute px-1 py-0.5 text-sm bg-black/60 border border-white/30 rounded text-white outline-none min-w-[100px]"
                style={{
                  left: textInputPos.x,
                  top: textInputPos.y - 20,
                }}
                placeholder={t("photos.typeText")}
              />
            )}
          </div>
        )}
      </div>

      {/* Shape count indicator */}
      <div className="px-4 py-2 bg-surface-primary/95 border-t border-edge-primary text-center">
        <span className="text-xs text-content-quaternary">
          {shapes.length} {shapes.length === 1 ? t("photos.annotation") : t("photos.annotations")}
        </span>
      </div>
    </div>
  );
}
