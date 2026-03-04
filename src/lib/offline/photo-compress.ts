"use client";

const MAX_DIMENSION = 2560;
const JPEG_QUALITY = 0.88;

// ============================================
// Semaphore — single-lane GPU gate
// ============================================

class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.available = max;
  }

  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available -= 1;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.available -= 1;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.available += 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

// Only one createImageBitmap at a time to prevent GPU memory exhaustion
const bitmapSemaphore = new Semaphore(1);

async function withBitmapLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = await bitmapSemaphore.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

/** Serialized createImageBitmap — waits for GPU availability */
async function safeCreateImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return withBitmapLock(() => createImageBitmap(blob));
}

// ============================================
// Public API
// ============================================

/**
 * Compress an image file to a JPEG blob that fits within MAX_DIMENSION
 * while preserving aspect ratio.  Videos pass through unchanged.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  // Skip non-image files (videos, PDFs)
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await safeCreateImageBitmap(file);
  try {
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

    return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  } finally {
    bitmap.close();
  }
}
