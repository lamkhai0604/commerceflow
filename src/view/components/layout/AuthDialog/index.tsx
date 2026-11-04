import AuthNotice from './AuthNotice';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from 'controllers/app/hooks';
import { authActions } from 'controllers/feature/auth/authSlice';
import { AuthField } from 'controllers/feature/auth/authModels';
import { codePoints, normalizeEmail, validateAuth } from 'controllers/feature/auth/authValidation';
import { FormEvent, useEffect, useRef, useState } from 'react';

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
    if (!busy) { submitting.current = false; setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  useEffect(() => {
    setPassword(''); setConfirmPassword(''); setVisible(false); setConfirmVisible(false);
  }, [auth.errorVersion]);
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
    const values = { email, password, fullName };
    const invalid = validateAuth(values, registration, confirmPassword);
    setErrors(invalid);
    setValidationAttempt(value => value + 1);
    if (Object.keys(invalid).length) return;
    submitting.current = true;
    const payload = { email: normalizeEmail(email), password };
    dispatch(registration ? authActions.register({ ...payload, fullName }) : authActions.login(payload));
  };
  const passwordField = (confirmation = false) => (
    <TextField id={confirmation ? 'auth-confirm-password' : 'auth-password'}
      label={confirmation ? 'Confirm password' : 'Password'} type={(confirmation ? confirmVisible : visible) ? 'text' : 'password'}
      value={confirmation ? confirmPassword : password} disabled={busy} required fullWidth
      autoFocus={!registration && !!auth.loginEmail && !confirmation}
      autoComplete={registration ? 'new-password' : 'current-password'}
      onChange={event => {
        if (confirmation) setConfirmPassword(event.target.value); else setPassword(event.target.value);
        edited(confirmation ? 'confirmPassword' : 'password');
      }}
      error={!!fields[confirmation ? 'confirmPassword' : 'password']}
      helperText={fields[confirmation ? 'confirmPassword' : 'password'] ||
        (registration && !confirmation ? `${codePoints(password)} Unicode code points; required: 12–128.` : undefined)}
      InputProps={{ endAdornment: <InputAdornment position="end">
        <IconButton type="button" disabled={busy} aria-label={`${(confirmation ? confirmVisible : visible) ? 'Hide' : 'Show'} ${confirmation ? 'confirm password' : 'password'}`}
          aria-pressed={confirmation ? confirmVisible : visible}
          onClick={() => confirmation ? setConfirmVisible(value => !value) : setVisible(value => !value)} size="small">
          <Typography variant="caption">{(confirmation ? confirmVisible : visible) ? 'Hide' : 'Show'}</Typography>
        </IconButton></InputAdornment> }} />
  );
  return <Dialog open onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm"
    aria-labelledby="authentication-title">
    <DialogTitle id="authentication-title">{registration ? 'Create your CommerceFlow account' : 'Log in to CommerceFlow'}</DialogTitle>
    <AuthNotice />
    <form ref={form} aria-label={registration ? 'Registration' : 'Login'} noValidate onSubmit={submit} aria-busy={busy}>
      <DialogContent>
        <Stack spacing={2}>

          {auth.error && <Alert severity="error" role="alert">{auth.error.message}</Alert>}
          {registration && <TextField id="auth-full-name" label="Full name" autoComplete="name" required autoFocus
            value={fullName} disabled={busy} onChange={event => { setFullName(event.target.value); edited('fullName'); }}
            error={!!fields.fullName} helperText={fields.fullName || `${codePoints(fullName)}/50 Unicode code points`} />}
          <TextField id="auth-email" label="Email address" autoComplete="email" type="email" required
            autoFocus={!registration && !auth.loginEmail} value={email} disabled={busy}
            onChange={event => { setEmail(event.target.value); edited('email'); }} error={!!fields.email} helperText={fields.email} />
          {passwordField()}
          {registration && passwordField(true)}
          {!auth.csrfReady && !busy && <Alert severity="warning" role="status">
            Security verification is needed before submitting. You can refresh it below.
          </Alert>}
          {slow && <Typography role="status">Still working...</Typography>}
          {auth.error?.code === 'EMAIL_CONFLICT' && auth.error.status === 409 &&
            <Button type="button" onClick={() => dispatch(authActions.prefillLogin(normalizeEmail(email)))}>Log in instead</Button>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
        <Button type="button" disabled={busy} onClick={onClose}>Close</Button>
        <Button type="button" disabled={busy} onClick={() => dispatch(authActions.openDialog(registration ? 'login' : 'register'))}>
          {registration ? 'Already have an account? Log in' : 'Create an account'}
        </Button>
        {!auth.csrfReady && <Button type="button" disabled={busy} onClick={() => dispatch(authActions.refreshCsrf())}>
          Refresh security verification
        </Button>}
        <Button type="submit" variant="contained" disabled={busy} sx={{ minHeight: 44 }}
          startIcon={busy ? <CircularProgress size={18} color="inherit" aria-hidden="true" /> : undefined}>
          {busy ? (auth.pending === 'refresh' ? 'Refreshing...' : registration ? 'Creating account...' : 'Logging in...') : (registration ? 'Create account' : 'Log in')}
        </Button>
      </DialogActions>
    </form>
  </Dialog>;
}
