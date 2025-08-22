import prisma from "../config/db.config";
import { generateOtp } from "../utils/generateOtp.util";
import { sendOtpEmail } from "../utils/email.util";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);

// Create OTP And Send On Email
export async function createAndSendOtp(
  userId: string,
  purpose: "LOGIN"
) {
  // 1. Invalidate all old OTPs for this user & purpose
  await prisma.otpRequest.updateMany({
    where: {
      userId,
      purpose,
      used: false,
      expiresAt: { gt: new Date() }, // still valid
    },
    data: {
      expiresAt: new Date(), // expire immediately
    },
  });

  // 2. Generate new OTP
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const otpRecord = await prisma.otpRequest.create({
    data: {
      userId,
      otpCode: otp,
      purpose,
      expiresAt,
      used: false,
    },
  });

  // 3. Send OTP email
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found for sending OTP");

  await sendOtpEmail(
    user.email,
    otp,
    purpose.toLocaleLowerCase(),
    OTP_TTL_MINUTES
  );

  return otpRecord;
}


// Verify OTP
export async function verifyOtp(
  userId: string,
  otpCode: string,
  purpose: "LOGIN"
) {
  const otpRecord = await prisma.otpRequest.findFirst({
    where: {
      userId: userId,
      otpCode: otpCode,
      purpose,
      used: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" as const },
  });

  if (!otpRecord) throw new Error("Invalid or expired OTP");

  await prisma.otpRequest.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  return otpRecord;
}
