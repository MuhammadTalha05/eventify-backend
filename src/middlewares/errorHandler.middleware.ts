import { Request, Response, NextFunction } from "express";
import multer from "multer";

interface CloudinaryError {
  http_code?: number;
  message?: string;
}

export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (res.headersSent) return next(err);

  // 🔹 Multer error check
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({success: false, error: "File size must not exceed 10 MB." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({success: false, error: "Unsupported file type or too many files." });
    }
    return res.status(400).json({success: false, error: err.message });
  }

  // 🔹 Handle custom errors thrown in fileFilter
  if (err instanceof Error && err.message === "Unsupported file type") {
    return res.status(400).json({success: false, error: "Unsupported file type. Only images and videos are allowed." });
  }

  // 🔹 Cloudinary error check
  if (isCloudinaryError(err)) {
    return res.status(err.http_code ?? 400).json({success: false, error: err.message ?? "Cloudinary error" });
  }

  // 🔹 Standard JS Error
  if (err instanceof Error) {
    return res.status(400).json({success: false, error: err.message });
  }

  // 🔹 Fallback
  res.status(500).json({success: false, error: "Internal Server Error" });
}

/** Type guard for Cloudinary error */
function isCloudinaryError(err: unknown): err is CloudinaryError {
  return typeof err === "object" && err !== null && "http_code" in err;
}
