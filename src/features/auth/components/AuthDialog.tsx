import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { CloseIcon } from '@/components/icons';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import type { AuthField } from '@/features/auth/authModels';
import { authActions } from '@/features/auth/authSlice';
import { codePoints, normalizeEmail, validateAuth } from '@/features/auth/authValidation';
import AuthNotice from './AuthNotice';

/**
 * Log-in and registration dialog. Behaviour follows the authentication UI/UX specification (UI-01, UI-02, UX-01):
 * duplicate submissions are blocked, passwords are wiped after a server failure, and CSRF recovery is user initiated.
 * The accessible names used here are relied on by the HTTPS E2E suite.
 */
export default function AuthDialog({ registration = false, onClose }: { registration?: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const [email, setEmail] = useState(auth.loginEmail || '');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const busy = !!auth.pending || auth.initializing;

  useEffect(() => {
    if (!busy) { submitting.current = false; return; }
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => { window.clearTimeout(timer); setSlow(false); };
  }, [busy]);
  // Wipe secrets whenever the server reports a new failure (adjusting state during render, not in an effect).
  const [seenErrorVersion, setSeenErrorVersion] = useState(auth.errorVersion);
  if (auth.errorVersion !== seenErrorVersion) {
    setSeenErrorVersion(auth.errorVersion);
    setPassword(''); setConfirmPassword(''); setVisible(false); setConfirmVisible(false);
  }
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [validationAttempt, auth.errorVersion]);

  const fields = { ...auth.error?.fields, ...errors };
  const edited = (field: AuthField) => {
    setErrors(previous => { const next = { ...previous }; delete next[field]; return next; });
    dispatch(authActions.clearFieldError(field));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || submitting.current) return;
    const invalid = validateAuth({ email, password, fullName }, registration, confirmPassword);
    setErrors(invalid);
    setValidationAttempt(value => value + 1);
    if (Object.keys(invalid).length) return;
    submitting.current = true;
    const payload = { email: normalizeEmail(email), password };
    dispatch(registration ? authActions.register({ ...payload, fullName }) : authActions.login(payload));
  };

  const passwordField = (confirmation = false) => {
    const shown = confirmation ? confirmVisible : visible;
    const field: AuthField = confirmation ? 'confirmPassword' : 'password';
    const name = confirmation ? 'confirm password' : 'password';
    return (
      <TextField id={confirmation ? 'auth-confirm-password' : 'auth-password'} label={confirmation ? 'Confirm password' : 'Password'}
        type={shown ? 'text' : 'password'} value={confirmation ? confirmPassword : password} disabled={busy} required
        autoComplete={registration ? 'new-password' : 'current-password'}
        data-autofocus={!registration && !!auth.loginEmail && !confirmation ? true : undefined}
        onChange={event => {
          if (confirmation) setConfirmPassword(event.target.value); else setPassword(event.target.value);
          edited(field);
        }}
        error={fields[field]}
        hint={!fields[field] && registration && !confirmation ? `${codePoints(password)} Unicode code points; required: 12–128.` : undefined}
        end={
          <button type="button" disabled={busy} aria-label={`${shown ? 'Hide' : 'Show'} ${name}`} aria-pressed={shown}
            onClick={() => confirmation ? setConfirmVisible(value => !value) : setVisible(value => !value)}
            className="min-h-10 rounded-lg px-2.5 text-[13px] font-semibold text-stone-700 hover:bg-linen disabled:text-stone-400">
            {shown ? 'Hide' : 'Show'}
          </button>
        } />
    );
  };

  const busyLabel = auth.pending === 'refresh' ? 'Refreshing...' : registration ? 'Creating account...' : 'Logging in...';

  return (
    <Dialog open onClose={onClose} dismissible={!busy} labelledBy="authentication-title" className="max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2 id="authentication-title" className="text-xl font-bold tracking-tight">
          {registration ? 'Create your CommerceFlow account' : 'Log in to CommerceFlow'}
        </h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
          className="-mt-1.5 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-linen disabled:opacity-40">
          <CloseIcon size={18} />
        </button>
      </div>
      <form ref={form} aria-label={registration ? 'Registration' : 'Login'} noValidate onSubmit={submit} aria-busy={busy}
        className="flex min-h-0 flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto px-6 pt-4 pb-2">
          <AuthNotice />
          {auth.error && <Alert tone="error">{auth.error.message}</Alert>}
          {registration && (
            <TextField id="auth-full-name" label="Full name" autoComplete="name" required data-autofocus value={fullName} disabled={busy}
              onChange={event => { setFullName(event.target.value); edited('fullName'); }}
              error={fields.fullName} hint={fields.fullName ? undefined : `${codePoints(fullName)}/50 Unicode code points`} />
          )}
          <TextField id="auth-email" label="Email address" autoComplete="email" type="email" required value={email} disabled={busy}
            data-autofocus={!registration && !auth.loginEmail ? true : undefined}
            onChange={event => { setEmail(event.target.value); edited('email'); }} error={fields.email} />
          {passwordField()}
          {registration && passwordField(true)}
          {!auth.csrfReady && !busy && (
            <Alert tone="warning">Security verification is needed before submitting. You can refresh it below.</Alert>
          )}
          {slow && <p role="status" className="text-sm text-stone-700">Still working...</p>}
          {auth.error?.code === 'EMAIL_CONFLICT' && auth.error.status === 409 && (
            <Button variant="link" className="self-start" onClick={() => dispatch(authActions.prefillLogin(normalizeEmail(email)))}>
              Log in instead
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 px-6 pt-3 pb-6">
          {!auth.csrfReady && (
            <Button variant="secondary" disabled={busy} onClick={() => dispatch(authActions.refreshCsrf())}>Refresh security verification</Button>
          )}
          <Button type="submit" size="lg" fullWidth loading={busy}>{busy ? busyLabel : registration ? 'Create account' : 'Log in'}</Button>
          <p className="text-center text-sm text-stone-700">
            {registration ? 'Already have an account?' : 'New to CommerceFlow?'}{' '}
            <button type="button" disabled={busy} onClick={() => dispatch(authActions.openDialog(registration ? 'login' : 'register'))}
              className="min-h-10 font-semibold text-pine-700 underline underline-offset-4 disabled:text-stone-400">
              {registration ? 'Log in' : 'Create account'}
            </button>
          </p>
        </div>
      </form>
    </Dialog>
  );
}
