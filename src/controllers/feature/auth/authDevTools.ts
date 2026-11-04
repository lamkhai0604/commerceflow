import { Action } from '@reduxjs/toolkit';
// Kept independent of store startup so redaction can be tested without side effects.
export function sanitizeAuthAction<A extends Action>(action: A): A {
  return action.type === 'auth/login' || action.type === 'auth/register'
    ? { ...action, payload: '[REDACTED]' } : action;
}
