export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: Array<'CUSTOMER' | 'ADMIN'>;
}
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload extends LoginPayload { fullName: string }
export type AuthField = 'email' | 'password' | 'fullName' | 'confirmPassword';
export interface AuthFailure {
  status?: number;
  code?: string;
  message: string;
  fields?: Partial<Record<AuthField, string>>;
}
