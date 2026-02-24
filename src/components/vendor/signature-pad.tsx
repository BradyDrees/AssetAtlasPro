"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface SignaturePadProps {
  /** Called with base64 PNG data URL when the user saves */
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  /** Pre-populate with an existing signature */
  initialSignature?: string;
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
}

export function SignaturePad({
  onSave,
  onCancel,
  initialSignature,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const t = useTranslations("vendor.estimates");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Signature line
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    // "X" marker
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px sans-serif";
    ctx.fillText("✕", 20, height - 34);

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [width, height, initialSignature]);

  const getPoint = useCallback(
    (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const point = getPoint(e);
      lastPointRef.current = point;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getPoint]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const point = getPoint(e);
      const last = lastPointRef.current;

      if (last) {
        // Smooth curve using quadratic bezier
        const midX = (last.x + point.x) / 2;
        const midY = (last.y + point.y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.stroke();
      }

      lastPointRef.current = point;
      setHasSignature(true);
    },
    [isDrawing, getPoint]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Redraw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Signature line
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    // "X" marker
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px sans-serif";
    ctx.fillText("✕", 20, height - 34);

    setHasSignature(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className="rounded-xl border-2 border-dashed border-edge-secondary overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ maxWidth: `${width}px`, height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-[10px] text-content-quaternary text-center">
        {t("signature.instruction")}
      </p>

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleClear}
          disabled={!hasSignature}
          className="px-3 py-1.5 text-xs text-content-tertiary hover:text-content-primary disabled:opacity-30 transition-colors"
        >
          {t("signature.clear")}
        </button>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors"
            >
              {t("cancel")}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasSignature}
            className="px-4 py-2 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            {t("signature.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
