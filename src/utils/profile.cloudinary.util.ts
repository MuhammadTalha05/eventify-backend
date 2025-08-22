// utils/cloudinary.ts
import cloudinary from "../config/cloudinary.config";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const storage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
        folder: "user_avatars",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 500, height: 500, crop: "limit" }],
    }),
});

export const upload = multer({ storage });
