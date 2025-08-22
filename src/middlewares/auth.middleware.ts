import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";

export interface AuthRequest extends Request {
  user?: { sub: string; role?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({success: false, error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken<{ sub: string; role?: string }>(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({success: false, error: "Invalid or expired token" });
  }
}


// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({success: false, error: "Unauthorized" });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Only [${allowedRoles.join(", ")}] are allowed`,
      });
    }
    next();
  };
}