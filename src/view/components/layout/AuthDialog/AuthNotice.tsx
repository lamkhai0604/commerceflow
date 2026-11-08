import { Alert, Snackbar, useMediaQuery, useTheme } from '@mui/material';
import { useAppDispatch, useAppSelector } from 'controllers/app/hooks';
import { authActions } from 'controllers/feature/auth/authSlice';

export default function AuthNotice() {
  const dispatch = useAppDispatch();
  const { notice, noticeSeverity } = useAppSelector(state => state.auth);
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  if (!notice) return null;
  // Session-expiry warnings remain available until deliberate dismissal/recovery.
  if (noticeSeverity === 'warning') return <Alert severity="warning" role="alert"
    onClose={() => dispatch(authActions.dismissNotice())}>{notice}</Alert>;
  return <Snackbar key={notice} open autoHideDuration={4000}
    anchorOrigin={{ vertical: 'bottom', horizontal: mobile ? 'center' : 'right' }}
    onClose={(_event, reason) => { if (reason !== 'clickaway') dispatch(authActions.dismissNotice()); }}>
    <Alert severity={noticeSeverity || 'success'} variant="filled"
      role="status"
      onClose={() => dispatch(authActions.dismissNotice())}>{notice}</Alert>
  </Snackbar>;
}
