import { useGrubClub } from '../state/GrubClubContext';

export function ToastContainer() {
  const { toasts } = useGrubClub();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.icon}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
