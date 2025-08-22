import { Router } from "express";
import * as ctrl from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../utils/profile.cloudinary.util";

const router = Router();

// Get own profile
router.get("/profile/:id", requireAuth, ctrl.getProfileController);

// Update own profile
router.put("/profile/:id", requireAuth, upload.single("avatarUrl"), ctrl.updateProfileController);

// Update Password
router.put("/profile/:id/password", requireAuth, ctrl.updatePasswordController);

// ORGANIZER only: Get all users
router.get("/all", requireAuth, requireRole("SUPER_ADMIN"), ctrl.getAllUsersController);

// Chnage User Role
router.patch("/profile/role", requireAuth, requireRole("SUPER_ADMIN"), ctrl.changeUserRoleController);


export default router;
