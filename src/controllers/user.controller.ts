import { Response } from "express";
import * as userService from "../services/user.service";
import { AuthRequest } from "../middlewares/auth.middleware";

// Get profile (self or by id if ORGANIZER)
export async function getProfileController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({success: false, error: "Unauthorized" });

    const {id} = req.params;

    if (!id) {
      const profile = await userService.getUserProfile(req.user.sub);
      return res.json(profile);
    }

    if (id !== req.user.sub && req.user.role !== "ORGANIZER") {
      return res.status(403).json({success: false, error: "Forbidden: You can only view your own profile" });
    }

    const profile = await userService.getUserProfile(id);
    res.json(profile);
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}

// Update user by query param id
export async function updateProfileController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({success: false, error: "Unauthorized" });

    const {id} = req.params;

    if (id !== req.user.sub) {
      return res.status(403).json({success: false, error: "Forbidden: You can only update your own profile" });
    }

    const { fullName, phone } = req.body;

    let avatarUrl: string | undefined;
    if (req.file) {
      const file = req.file as Express.Multer.File;
      avatarUrl = file.path; 
    }

    const updatedUser = await userService.updateUserProfile(req.user.sub, {
      fullName,
      phone,
      avatarUrl,
    });

    res.json(updatedUser);
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}

// ORGANIZER: Get all users (excluding the requesting ORGANIZER)
export async function getAllUsersController(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Only super admin can view all users.",
      });
    }

    const page = Number(req.query.page) || 1;
    const search = (req.query.search as string) || undefined;

    const result = await userService.getAllUsers(req.user.sub, { page, search });

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Something went wrong. Please try again later.",
    });
  }
}

// Chnage User Role
export async function changeUserRoleController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ 
        success: false,
        error: "Access denied. Only super admins can update user roles." 
      });
    }

    const { id, role } = req.body;

    if (!id || !role) {
      return res.status(400).json({success: false, error: "id and role are required" });
    }

    if (!["ORGANIZER", "PARTICIPANT"].includes(role)) {
      return res.status(400).json({success: false, error: "Role must be either ORGANIZER or PARTICIPANT" });
    }

    const updatedUser = await userService.changeUserRole(id, role as "ORGANIZER" | "PARTICIPANT");
    res.json({success: true, message: "Role updated successfully", user: updatedUser });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}

// Update User Password
export async function updatePasswordController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({success: false, error: "Unauthorized" });

    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({success: false, error: "Both old and new passwords are required" });
    }

    if (req.user.sub !== id) {
      return res.status(403).json({success: false, error: "You can only change your own password" });
    }

    await userService.updateUserPassword(id, oldPassword, newPassword);

    return res.json({success: true, message: "Password updated successfully" });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong, please try again",
    });
  }
}