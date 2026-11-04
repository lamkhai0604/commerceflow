import AuthNotice from '../../AuthDialog/AuthNotice';
import { Alert, Button, CircularProgress, Menu, MenuItem, Skeleton, Stack } from '@mui/material';
import { useState } from 'react';
import { AiFillSetting } from 'react-icons/ai';
import { useAppDispatch, useAppSelector } from 'controllers/app/hooks';
import { authActions } from 'controllers/feature/auth/authSlice';
import RegisterModal from 'view/components/layout/RegisterModal';
import LoginModal from 'view/components/layout/LoginModal';
import './style.css';

const Dropdown = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => dispatch(authActions.closeDialog());
  const open = (dialog: 'login' | 'register') => { setAnchor(null); dispatch(authActions.openDialog(dialog)); };
  return <>
    {auth.dialog === 'register' && <RegisterModal onClose={close} />}
    {auth.dialog === 'login' && <LoginModal onClose={close} />}
    <Stack spacing={1}>
      {!auth.dialog && <AuthNotice />}
      {!auth.dialog && auth.error && <Alert severity="error" role="alert"
        onClose={() => dispatch(authActions.dismissFeedback())}>{auth.error.message}</Alert>}
      {auth.initializing ? <Skeleton width={100} aria-label="Checking your session" /> : <>
        <Button type="button" aria-haspopup="menu" aria-controls={anchor ? 'account-menu' : undefined}
          aria-expanded={!!anchor} aria-label="Account menu" aria-busy={!!auth.pending}
          onClick={event => setAnchor(event.currentTarget)} sx={{ minHeight: 44 }}
          startIcon={auth.pending === 'logout' ? <CircularProgress size={18} aria-hidden="true" /> : <AiFillSetting aria-hidden="true" />}>
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
export default Dropdown;
