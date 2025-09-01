// import { Router } from "express";
// import * as ctrl from "../controllers/auth.controller";
// import { requireAuth, requireRole } from "../middlewares/auth.middleware";

// const router = Router();
 
// // SignUp and Verify Signup
// router.post("/signup", ctrl.signupController);
// // router.post("/signup/verify", ctrl.signupVerify);

// // Login 
// router.post("/signin", ctrl.signinController);
// router.post("/login/verify", ctrl.verifyLoginController);

// // Reset Password and Verify Password
// router.post("/password/reset", ctrl.resetPasswordController);
// router.post("/password/verify", ctrl.verifyResetController);


// // Refeshing Access Token With Refresh Token
// router.get("/token/refresh", ctrl.refreshAccessTokenController);


// // Log Out With Access Token
// router.post("/logout", requireAuth, ctrl.logoutController);

// // Create Aaccount for someone else
// router.post('/admin/create-account', requireAuth, requireRole('SUPER_ADMIN'), ctrl.createAccountController);

// export default router;

import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: User signup
 *     description: Register a new user with full name, email, phone, and password. Role is optional (defaults to PARTICIPANT).
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               fullName: { type: string, example: John Doe }
 *               email: { type: string, example: john@example.com }
 *               phone: { type: string, example: +923001234567 }
 *               password: { type: string, example: Passw0rd123 }
 *               role: { type: string, enum: [SUPER_ADMIN, ORGANIZER, PARTICIPANT], example: PARTICIPANT }
 *     responses:
 *       200:
 *         description: Signup successful
 *       400:
 *         description: Validation error
 */
router.post("/signup", ctrl.signupController);

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Signin with email and password
 *     description: Authenticate user and send OTP to their email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: Passw0rd123 }
 *     responses:
 *       200:
 *         description: OTP sent
 *       400:
 *         description: Invalid credentials
 */
router.post("/signin", ctrl.signinController);

/**
 * @swagger
 * /auth/login/verify:
 *   post:
 *     summary: Verify login with OTP
 *     description: Complete login after OTP verification. Returns JWT tokens in cookies.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login/verify", ctrl.verifyLoginController);

/**
 * @swagger
 * /auth/password/reset:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset email with a token link.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/password/reset", ctrl.resetPasswordController);

/**
 * @swagger
 * /auth/password/verify:
 *   post:
 *     summary: Verify reset token & set new password
 *     description: Provide reset token from email, new password, and confirmation.
 *     tags: [Password]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           example: "resetTokenHere"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword, confirmPassword]
 *             properties:
 *               newPassword: { type: string, example: NewPassw0rd123 }
 *               confirmPassword: { type: string, example: NewPassw0rd123 }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/password/verify", ctrl.verifyResetController);

/**
 * @swagger
 * /auth/token/refresh:
 *   get:
 *     summary: Refresh access token
 *     description: Generates new access & refresh tokens using cookies.
 *     tags: [Token]
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Refresh token missing or invalid
 */
router.get("/token/refresh", ctrl.refreshAccessTokenController);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Clears JWT tokens and logs user out.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out
 */
router.post("/logout", requireAuth, ctrl.logoutController);

/**
 * @swagger
 * /auth/admin/create-account:
 *   post:
 *     summary: Create account for another user (Super Admin only)
 *     description: Super admin can create an account for someone else and credentials are emailed.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role, fullName, phone]
 *             properties:
 *               email: { type: string, example: newuser@example.com }
 *               role: { type: string, enum: [SUPER_ADMIN, ORGANIZER, PARTICIPANT], example: ORGANIZER }
 *               fullName: { type: string, example: Alice Smith }
 *               phone: { type: string, example: +923009876543 }
 *     responses:
 *       201:
 *         description: Account created successfully
 *       403:
 *         description: Forbidden - Only SUPER_ADMIN can perform this
 */
router.post(
  "/admin/create-account",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  ctrl.createAccountController
);

export default router;
