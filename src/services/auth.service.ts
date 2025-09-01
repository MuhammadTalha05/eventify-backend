import prisma from "../config/db.config";
import { hashPassword, comparePassword } from "../utils/hash.util";
import * as otpService from "./otp.service";
import { isEmail, isStrongPassword ,isPhoneNumber } from "../utils/validation.util";
import { signAccessToken, signRefreshToken , verifyRefreshToken, verifyPasswordResetToken, signPasswordResetToken } from "../utils/jwt.util";
import { sendEmail } from "../utils/email.util";
import { generateRandomPassword } from "../utils/generateRandomPassword.util";


type UserRole = "SUPER_ADMIN" | "ORGANIZER" | "PARTICIPANT";


// Signup Request Auth Service
export async function signup(fullName: string, email: string, phone: string, password: string, role?: string) {
  // Validation Handling
  if (!isEmail(email)) throw new Error("Invalid email");
  if (!isPhoneNumber(phone)) throw new Error("Phone number must be in format +92XXXXXXXXXX or 03XXXXXXXXX");
  if (!isStrongPassword(password)) throw new Error("Password must be at least 8 chars and contain letters and numbers");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("Email already registered");

  const hashedPassword = await hashPassword(password);

  // ✅ Assign role (default PARTICIPANT)
  let userAssignedRole: UserRole = "PARTICIPANT";
  if (role && ["SUPER_ADMIN", "ORGANIZER", "PARTICIPANT"].includes(role)) {
    userAssignedRole = role as UserRole;
  }

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash: hashedPassword,
      role: userAssignedRole,
    },
  });

  return { 
    success: true,
    message: "Signup successful. You can now log in.", 
    userId: newUser.id,
    role: newUser.role
  };
}


// Login with password Auth Service
export async function signinWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const valid = await comparePassword(password, user.passwordHash ?? "");
  if (!valid) throw new Error("Invalid password");

  await otpService.createAndSendOtp(user.id, "LOGIN");

  return {success: true, message: "OTP sent to your email. Please verify to complete login." };
}



// LOGIN STEP 2: verify OTP 
export async function verifyLoginOtp(email: string, otpCode: string) {
  if (!isEmail(email)) throw new Error("Invalid email format");
  if (!otpCode) throw new Error("OTP is required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  await otpService.verifyOtp(user.id, otpCode, "LOGIN");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.upsert({
    where: { userId: user.id },
    update: { token: refreshToken, expiresAt, revoked: false },
    create: { userId: user.id, token: refreshToken, expiresAt },
  });

  return {
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    accessToken, 
    refreshToken,  
  };
}

// Request Reset Password Auth Service
export async function requestPasswordReset(email: string) {
  if (!email) throw new Error("Email is required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  // Create a JWT token for password reset
  const token = signPasswordResetToken({ sub: user.id });

  // Link with token in URL
  const resetLink = `${process.env.CLIENT_URL}/auth/reset?token=${token}`;

  // Send email
  await sendEmail(
    user.email,
    "Password Reset Request",
    `Click this link to reset your password: ${resetLink}`,
    `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
  );

  return {success: true, message: "Password reset link sent to email" };
}


// Reset Password Auth Service
export async function resetPassword(token: string, newPassword: string) {
  if (!isStrongPassword(newPassword))
    throw new Error("Password must be at least 8 characters long and contain letters and numbers");

  // Verify token
  const payload = verifyPasswordResetToken<{ sub: string }>(token);
  const userId = payload.sub;

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password in DB
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  return {success: true, message: "Password reset successful" };
}



// Refresh access token Auth Service
export async function refreshAccessToken(oldRefreshToken: string) {
  if (!oldRefreshToken.trim()) throw new Error("Invalid refresh token");

  // Find token in DB
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });
  if (!tokenRecord) throw new Error("Invalid refresh token");

  // Check if token expired or revoked
  if (tokenRecord.expiresAt < new Date() || tokenRecord.revoked) {
    throw new Error("Refresh token expired or revoked");
  }

  // Verify token (signature + expiry)
  verifyRefreshToken(oldRefreshToken);

  // Generate new tokens
  const newAccessToken = signAccessToken({ sub: tokenRecord.user.id, role: tokenRecord.user.role });
  const newRefreshToken = signRefreshToken({ sub: tokenRecord.user.id, role: tokenRecord.user.role });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Replace old refresh token with new one
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: {
      token: newRefreshToken,
      expiresAt,
      revoked: false,
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}



// LogOut Auth Service
export async function logout(userId: string) {
  // Find user first to get full name
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Delete the user's refresh token(s)
  await prisma.refreshToken.deleteMany({ where: { userId } });

  return { fullName: user.fullName };
}

// Create Account for User Service (Super Admin only)
export async function createAccountForUser(
  fullName: string,
  email: string,
  phone: string,
  role: string,
  requestingUser: { sub: string; role?: string }
) {
  // --- Authorization Check ---
  if (requestingUser.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can create accounts for others");
  }

  // --- Validation ---
  if (!isEmail(email)) {
    throw new Error("Invalid email format");
  }

  if (!isPhoneNumber(phone)) {
    throw new Error("Phone number must be in format +92XXXXXXXXXX or 03XXXXXXXXX");
  }

  const validRoles = ["SUPER_ADMIN", "ORGANIZER", "PARTICIPANT"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  if (fullName.length < 2 || fullName.length > 150) {
    throw new Error("Full name must be between 2 and 150 characters");
  }

  // --- Check for existing user ---
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // --- Generate random password ---
  const generatedPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(generatedPassword);

  // --- Create user ---
  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash: hashedPassword,
      role: role as UserRole,
    },
  });

  // --- Send email with credentials ---
  try {
    const subject = "Your New Account Credentials";
    const text = `Hello ${fullName},\n\nYour account has been created by an admin.\n\nEmail: ${email}\nPassword: ${generatedPassword}\nRole: ${role}\n\nPlease change your password after first login.\n\nBest regards,\nThe Eventify Team`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Eventify!</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your account has been created by an administrator.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${generatedPassword}</p>
          <p><strong>Role:</strong> ${role}</p>
        </div>
        <p style="color: #ff0000; font-weight: bold;">⚠️ Please change your password after first login for security.</p>
        <p>Best regards,<br>The Eventify Team</p>
      </div>
    `;

    await sendEmail(email, subject, text, html);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
  }

  return {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    fullName: newUser.fullName,
    message: "Account created successfully. Credentials sent to user's email."
  };
}
