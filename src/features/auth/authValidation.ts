import { AuthField, LoginPayload, RegisterPayload } from './authModels';

export const codePoints = (value: string) => Array.from(value).length;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
// Conservative precheck, not a second Hibernate/RFC validator. Split at the LAST @
// so quoted local parts may contain spaces or @. The backend remains authoritative.
export function isEmailCandidate(value: string): boolean {
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1 || Array.from(value).some(character => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)) return false;
  const local = value.slice(0, at), domain = value.slice(at + 1);
  if (/[\s@]/.test(domain) || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || (!local.includes('"') && local.includes('..'))) return false;
  if (!domain.startsWith('[') && domain.split('.').some(label => !label || label.startsWith('-') || label.endsWith('-'))) return false;
  if (/[\s@]/.test(local) && !local.includes('"')) return false;
  return true;
}
export function validateAuth(values: LoginPayload & Partial<RegisterPayload>, registration = false,
  confirmPassword?: string): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};
  const email = normalizeEmail(values.email);
  if (!email) errors.email = 'Email address is required.';
  else if (codePoints(email) > 254) errors.email = 'Email cannot exceed 254 Unicode code points.';
  else if (!isEmailCandidate(email)) errors.email = 'Please enter a valid email address.';
  if (!registration) {
    if (!values.password) errors.password = 'Password is required.';
    return errors;
  }
  if (!values.fullName?.trim()) errors.fullName = 'Full name is required.';
  else if (codePoints(values.fullName) > 50) errors.fullName = 'Full name cannot exceed 50 Unicode code points.';
  if (!values.password.trim()) errors.password = 'Password is required.';
  else if (codePoints(values.password) < 12) errors.password = 'Password must contain at least 12 Unicode code points.';
  else if (codePoints(values.password) > 128) errors.password = 'Password cannot exceed 128 Unicode code points.';
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
