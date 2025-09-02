import jwt, { SignOptions, Secret } from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  role?: string;
  iat?: number;
  exp?: number;
}

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL,
  JWT_REFRESH_TTL,
  JWT_RESET_PASSWORD_SECRET,
  JWT_RESET_PASSWORD_TTL,
} = process.env;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("JWT secrets are not configured in environment variables");
}

const accessSecret: Secret = JWT_ACCESS_SECRET;
const refreshSecret: Secret = JWT_REFRESH_SECRET;
const resetPasswordSecret: Secret = JWT_RESET_PASSWORD_SECRET || "dwerwerdsfsdfsdf@sdfsdfsdf";


function parseExpiresIn(ttl: string | undefined, fallback: string): SignOptions["expiresIn"] {
  if (!ttl) return fallback as SignOptions["expiresIn"];
  return ttl as SignOptions["expiresIn"];
}


// Sign Access Token
export function signAccessToken(payload: Record<string, unknown>) {
  const options: SignOptions = { expiresIn: parseExpiresIn(JWT_ACCESS_TTL, "6h") };
  return jwt.sign(payload, accessSecret, options);
}


// Sign Refresh Token
export function signRefreshToken(payload: Record<string, unknown>) {
  const options: SignOptions = { expiresIn: parseExpiresIn(JWT_REFRESH_TTL, "7d") };
  return jwt.sign(payload, refreshSecret, options);
}


// Verify Access Token
export function verifyAccessToken<T extends object = JwtPayload>(token: string): T {
  return jwt.verify(token, accessSecret) as T;
}


// Verify Refresh Token
export function verifyRefreshToken<T extends object = JwtPayload>(token: string): T {
  return jwt.verify(token, refreshSecret) as T;
}


// Sign Password Reset Token
export function signPasswordResetToken(payload: Record<string, unknown>) {
  const options: SignOptions = { expiresIn: parseExpiresIn(JWT_RESET_PASSWORD_TTL, "15m") };
  return jwt.sign(payload, resetPasswordSecret, options);
}

// Verify Password Reset Token
export function verifyPasswordResetToken<T extends object = JwtPayload>(token: string): T {
  return jwt.verify(token, resetPasswordSecret) as T;
}