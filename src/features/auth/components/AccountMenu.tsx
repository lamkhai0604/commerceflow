import AuthNotice from './AuthNotice';
import { Alert, Button, CircularProgress, Menu, MenuItem, Skeleton, Stack } from '@mui/material';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import AuthDialog from './AuthDialog';

function UserIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" strokeLinecap="round" /></svg>;
}

const AccountMenu = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => dispatch(authActions.closeDialog());
  const open = (dialog: 'login' | 'register') => { setAnchor(null); dispatch(authActions.openDialog(dialog)); };
  return <>
    {auth.dialog && <AuthDialog key={auth.dialog} registration={auth.dialog === 'register'} onClose={close} />}
    <Stack spacing={1}>
      {!auth.dialog && <AuthNotice />}
      {!auth.dialog && auth.error && <Alert severity="error" role="alert"
        onClose={() => dispatch(authActions.dismissFeedback())}>{auth.error.message}</Alert>}
      {auth.initializing ? <Skeleton width={100} aria-label="Checking your session" /> : <>
        <Button type="button" aria-haspopup="menu" aria-controls={anchor ? 'account-menu' : undefined}
          aria-expanded={!!anchor} aria-label="Account menu" aria-busy={!!auth.pending}
          onClick={event => setAnchor(event.currentTarget)} sx={{ minHeight: 44 }}
          startIcon={auth.pending === 'logout' ? <CircularProgress size={18} aria-hidden="true" /> : <UserIcon />}>
          {auth.pending === 'logout' ? 'Logging out...' : auth.currentUser?.fullName || 'Account'}
        </Button>
        <Menu id="account-menu" anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          {auth.isLoggedIn ? <MenuItem disabled={!!auth.pending}
            onClick={() => { setAnchor(null); dispatch(authActions.logout()); }}>Log out</MenuItem> : [
            <MenuItem key="register" disabled={!!auth.pending} onClick={() => open('register')}>Register</MenuItem>,
            <MenuItem key="login" disabled={!!auth.pending} onClick={() => open('login')}>Login</MenuItem>,
          ]}
        </Menu>
      </>}
    </Stack>
  </>;
};
export default AccountMenu;
