import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import dotenv from "dotenv";
dotenv.config();


// Signup Request Controller
export async function signupController(req: Request, res: Response) {
  try {
    const { fullName, email, phone, password, role  } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({success: false, error: "Full Name, Email, Phone, Password are reuqired" });
    }
    const result = await authService.signup(fullName, email, phone, password,role);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(400).json({success: false, error: err.message });
    } else {
      res.status(400).json({success: false, error: "An unknown error occurred" });
    }
  }
}


// Signin Controller
export async function signinController(req: AuthRequest, res: Response) {
  try {
   const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({success: false, error: "Email and password are required" });
    }
    // authenticate user via service
    const result = await authService.signinWithPassword(email, password);
    res.json(result);

  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(400).json({success: false, error: err.message });
    } else {
      res.status(400).json({success: false, error: "An unknown error occurred" });
    }
  }
}

// Verfiy Login
export async function verifyLoginController(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({success: false, error: "Email and OTP are required" });
    }

    const { user, accessToken, refreshToken } = await authService.verifyLoginOtp(email, otp);

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}


// Request password reset (send email)
export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({success: false, error: "Email is required" });

    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}


// Verify reset token and set new password
export async function verifyResetController(req: Request, res: Response) {
  try {
    const token = req.query.token as string;
    const { newPassword, confirmPassword } = req.body;

    if (!token) return res.status(400).json({success: false, error: "Token is required in URL" });
    if (!newPassword) return res.status(400).json({success: false, error: "New password is required" });
    if (!confirmPassword) return res.status(400).json({success: false, error: "Confirm password is required" });
    if (newPassword !== confirmPassword)
      return res.status(400).json({success: false, error: "Passwords do not match" });

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}


// Refreshing Access Token Controller
export async function refreshAccessTokenController(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({success: false, error: "Refresh token missing" });
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(refreshToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({success:true, message: "Tokens refreshed successfully" });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(401).json({success: false, error: err.message });
    } else {
      return res.status(401).json({success: false, error: "An unknown error occurred" });
    }
  }
}


// Logout Controller
export async function logoutController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { fullName } = await authService.logout(req.user.sub);

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "strict" : "lax",
    });

    res.json({success:true, message: `${fullName} successfully logged out` });
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(400).json({success: false, error: err.message });
    } else {
      res.status(400).json({success: false, error: "An unknown error occurred" });
    }
  }
}


// Create Account for Someone Else Controller (Super Admin only)
export async function createAccountController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { email, role, fullName, phone } = req.body;

    if (!email || !role || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email, role, fullName, and phone are required"
      });
    }

    const result = await authService.createAccountForUser(
      fullName,
      email,
      phone,
      role,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Password sent to user's email.",
      data: result
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
}