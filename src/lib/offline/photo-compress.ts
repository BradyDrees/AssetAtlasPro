"use client";

const MAX_DIMENSION = 2560;
const JPEG_QUALITY = 0.88;

/**
 * Compress an image file to a JPEG blob that fits within MAX_DIMENSION
 * while preserving aspect ratio.  Videos pass through unchanged.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  // Skip non-image files (videos, PDFs)
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Already small enough — just re-encode as JPEG for consistency
  let targetW = width;
  let targetH = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    targetW = Math.round(width * ratio);
    targetH = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
}
