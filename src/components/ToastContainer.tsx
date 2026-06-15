import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGrubClub } from '../state/GrubClubContext';

export function ToastContainer() {
  const { toasts } = useGrubClub();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span>{typeof t.icon === 'string' ? t.icon : <FontAwesomeIcon icon={t.icon} />}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
