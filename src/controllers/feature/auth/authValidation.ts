import { AuthField, LoginPayload, RegisterPayload } from './authModels';

export const codePoints = (value: string) => Array.from(value).length;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function validateAuth(values: LoginPayload & Partial<RegisterPayload>, registration = false,
  confirmPassword?: string): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};
  const email = normalizeEmail(values.email);
  if (!email) errors.email = 'Email address is required.';
  else if (codePoints(email) > 254) errors.email = 'Email cannot exceed 254 Unicode code points.';
  else if (!/^[^\s@]+@[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!registration) {
    if (!values.password) errors.password = 'Password is required.';
    return errors;
  }
  if (!values.fullName?.trim()) errors.fullName = 'Full name is required.';
  else if (codePoints(values.fullName) > 50) errors.fullName = 'Full name cannot exceed 50 Unicode code points.';
  if (!values.password.trim()) errors.password = 'Password is required.';
  else if (codePoints(values.password) < 12 || codePoints(values.password) > 128)
    errors.password = 'Password must contain 12–128 Unicode code points.';
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
