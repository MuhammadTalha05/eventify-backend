import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();
 
// SignUp and Verify Signup
router.post("/signup", ctrl.signupController);
// router.post("/signup/verify", ctrl.signupVerify);

// Login 
router.post("/signin", ctrl.signinController);
router.post("/login/verify", ctrl.verifyLoginController);

// Reset Password and Verify Password
router.post("/password/reset", ctrl.resetPasswordController);
router.post("/password/verify", ctrl.verifyResetController);


// Refeshing Access Token With Refresh Token
router.post("/token/refresh", ctrl.refreshAccessTokenController);


// Log Out With Access Token
router.post("/logout", requireAuth, ctrl.logoutController);

export default router;
