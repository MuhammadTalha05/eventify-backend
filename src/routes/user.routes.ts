// import { Router } from "express";
// import * as ctrl from "../controllers/user.controller";
// import { requireAuth, requireRole } from "../middlewares/auth.middleware";
// import { upload } from "../utils/profile.cloudinary.util";

// const router = Router();

// // Get Current User
// router.get("/profile/me", requireAuth, ctrl.getCurrentUserController);

// // Get own profile
// router.get("/profile/:id", requireAuth, ctrl.getProfileController);

// // Update own profile
// router.put("/profile/:id", requireAuth, upload.single("avatarUrl"), ctrl.updateProfileController);

// // Update Password
// router.put("/profile/:id/password", requireAuth, ctrl.updatePasswordController);

// // ORGANIZER only: Get all users
// router.get("/all", requireAuth, requireRole("SUPER_ADMIN"), ctrl.getAllUsersController);

// // Chnage User Role
// router.patch("/profile/role", requireAuth, requireRole("SUPER_ADMIN"), ctrl.changeUserRoleController);

// // Deleet User 
// router.delete("/delete/:id", requireAuth, requireRole("SUPER_ADMIN"), ctrl.deleteUserController)


// export default router;



import { Router } from "express";
import * as ctrl from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../utils/profile.cloudinary.util";

const router = Router();

/**
 * @swagger
 * /users/profile/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: usr_123 }
 *                     fullName: { type: string, example: John Doe }
 *                     email: { type: string, example: john@example.com }
 *                     phone: { type: string, example: +923001234567 }
 *                     avatarUrl: { type: string, example: https://res.cloudinary.com/... }
 *                     role: { type: string, example: PARTICIPANT }
 *       401: { description: Unauthorized }
 */
router.get("/profile/me", requireAuth, ctrl.getCurrentUserController);

/**
 * @swagger
 * /users/profile/{id}:
 *   get:
 *     summary: Get user profile (self or by ID if ORGANIZER)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */
router.get("/profile/:id", requireAuth, ctrl.getProfileController);

/**
 * @swagger
 * /users/profile/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string, example: John Updated }
 *               phone: { type: string, example: +923001234567 }
 *               avatarUrl:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       400: { description: Validation error }
 */
router.put("/profile/:id", requireAuth, upload.single("avatarUrl"), ctrl.updateProfileController);

/**
 * @swagger
 * /users/profile/{id}/password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, example: OldPass123 }
 *               newPassword: { type: string, example: NewPass456 }
 *     responses:
 *       200: { description: Password updated successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       400: { description: Validation error }
 */
router.put("/profile/:id/password", requireAuth, ctrl.updatePasswordController);

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Get all users (SUPER_ADMIN only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         example: 1
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         example: john
 *     responses:
 *       200:
 *         description: List of all users
 *       403: { description: Forbidden }
 *       401: { description: Unauthorized }
 */
router.get("/all", requireAuth, requireRole("SUPER_ADMIN"), ctrl.getAllUsersController);

/**
 * @swagger
 * /users/profile/role:
 *   patch:
 *     summary: Change user role (SUPER_ADMIN only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, role]
 *             properties:
 *               id: { type: string, example: usr_123 }
 *               role:
 *                 type: string
 *                 enum: [ORGANIZER, PARTICIPANT]
 *                 example: ORGANIZER
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       400: { description: Validation error }
 */
router.patch("/profile/role", requireAuth, requireRole("SUPER_ADMIN"), ctrl.changeUserRoleController);

/**
 * @swagger
 * /users/delete/{id}:
 *   delete:
 *     summary: Delete a user (SUPER_ADMIN only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       400: { description: Bad request }
 */
router.delete("/delete/:id", requireAuth, requireRole("SUPER_ADMIN"), ctrl.deleteUserController);

export default router;
