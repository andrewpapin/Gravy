import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGravy } from '../state/GravyContext';

export function ToastContainer() {
  const { toasts } = useGravy();
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
