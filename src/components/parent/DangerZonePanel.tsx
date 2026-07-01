import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faRotate } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { ConfirmDialog } from '../ConfirmDialog';

type ConfirmStep = 'none' | 'resetToday' | 'resetAll1' | 'resetAll2';

export function DangerZonePanel() {
  const { resetToday, resetAll } = useGravy();
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('none');

  return (
    <div>
      <button className="btn btn-primary btn-pink mt-8" onClick={() => setConfirmStep('resetToday')}>
        <FontAwesomeIcon icon={faRotate} /> Reset Today's Progress
      </button>
      <button className="btn btn-primary btn-dark mt-8" style={{ marginTop: 8 }} onClick={() => setConfirmStep('resetAll1')}>
        <FontAwesomeIcon icon={faTriangleExclamation} /> Reset Everything
      </button>

      <ConfirmDialog
        open={confirmStep === 'resetToday'}
        icon={faRotate}
        title="Reset today's progress?"
        message="This will clear today's food and goal checkmarks. Points already earned today will be removed."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          resetToday();
          setConfirmStep('none');
        }}
        onCancel={() => setConfirmStep('none')}
      />
      <ConfirmDialog
        open={confirmStep === 'resetAll1'}
        icon={faTriangleExclamation}
        title="Reset everything?"
        message="This will delete ALL progress — points, badges, history, goals, and rewards. This can't be undone."
        confirmLabel="Continue"
        danger
        onConfirm={() => setConfirmStep('resetAll2')}
        onCancel={() => setConfirmStep('none')}
      />
      <ConfirmDialog
        open={confirmStep === 'resetAll2'}
        icon={faTriangleExclamation}
        title="Are you really sure?"
        message="All points, badges, and history will be gone for good."
        confirmLabel="Yes, reset everything"
        danger
        onConfirm={() => {
          resetAll();
          setConfirmStep('none');
        }}
        onCancel={() => setConfirmStep('none')}
      />
    </div>
  );
}
