import AuthDialog from '../AuthDialog';
export default function LoginModal({ onClose }: { onClose: () => void }) {
  return <AuthDialog onClose={onClose} />;
}
