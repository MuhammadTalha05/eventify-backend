import cloudinary from "../config/cloudinary.config";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const featuredImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "featuredImage") {
        return {
          folder: "events/featured",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ width: 800, height: 600, crop: "limit" }],
          resource_type: "image",
        };
    }

    // 🔹 Attachments (images + videos)
    return {
      folder: "events/attachments",
      allowed_formats: ["jpg", "png", "jpeg", "svg", "webp", "mp4", "mov", "avi"],
      resource_type: "auto",
    };
  },
});

// Use ONE multer instance
const upload = multer({
  storage: featuredImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ✅ Accept multiple fields
export const uploadEventMedia = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "attachments", maxCount: 3 },
]);
