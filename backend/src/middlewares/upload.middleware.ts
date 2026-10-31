import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

const UPLOAD_DIR = process.env.VERCEL
  ? path.join('/tmp', 'uploads', 'vegetables')
  : path.resolve('uploads', 'vegetables');

// Ensure directory exists safely without crashing serverless runtimes
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn('[UPLOAD] Upload directory creation skipped for serverless:', err?.message || err);
}

// Multer Memory Storage (for sharp processing before disk save)
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image files are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter,
});

/**
 * Process uploaded buffer with Sharp: optimize, resize to max 1200x1200, save to disk as WebP
 */
export async function processAndSaveImage(
  buffer: Buffer,
  prefix: string = 'veg'
): Promise<{ filename: string; relativeUrl: string }> {
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
  const targetPath = path.join(UPLOAD_DIR, filename);

  try {
    await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(targetPath);
  } catch (err: any) {
    console.warn('[UPLOAD] Sharp toFile failed, continuing:', err?.message || err);
  }

  return {
    filename,
    relativeUrl: `/uploads/vegetables/${filename}`,
  };
}
