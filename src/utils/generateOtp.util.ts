export function generateOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  return String(Math.floor(min + Math.random() * (9 * min)));
}
