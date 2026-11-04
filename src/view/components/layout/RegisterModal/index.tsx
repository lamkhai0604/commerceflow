import AuthDialog from '../AuthDialog';
export default function RegisterModal({ onClose }: { onClose: () => void }) {
  return <AuthDialog registration onClose={onClose} />;
}
