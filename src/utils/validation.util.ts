// Validate email format
export function isEmail(val: string | undefined): boolean {
  if (!val) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}


// Validate strong password
// Rules: at least 8 characters, 1 letter, 1 number
export function isStrongPassword(val: string | undefined): boolean {
  if (!val) return false;
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(val);
}


// Validate OTP code (exactly 6 digits)
export function isValidOtpCode(val: string | undefined): boolean {
  if (!val) return false;
  return /^\d{6}$/.test(val);
}


// Validate non-empty string
export function isNonEmptyString(val: string | undefined): boolean {
  if (!val) return false;
  return val.trim().length > 0;
}


// Validate phone number (basic international format)
export function isPhoneNumber(val: string | undefined): boolean {
  if (!val) return false;
  return /^(\+92\d{10}|03\d{9})$/.test(val);
}