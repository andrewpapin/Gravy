import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChild } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';

// New-family-only: the household was just created with a placeholder kid name, so ask for the
// real one before the guided tour starts. Mounted on top of the already-live HomeScreen from
// AppShell — joining an existing family skips this entirely, since its kid profiles already
// synced in. Reuses the same saveSetting('childName', ...) call the old in-onboarding 'name'
// phase used to make.
export function FirstKidPrompt({ onDone }: { onDone: () => void }) {
  const { saveSetting } = useGravy();
  const [name, setName] = useState('');
  const nameTrimmed = name.trim();

  const handleNext = () => {
    if (!nameTrimmed) return;
    saveSetting('childName', nameTrimmed);
    onDone();
  };

  return (
    <div className="onb-screen">
      <div className="onb-content">
        <span className="onb-icon-badge"><FontAwesomeIcon icon={faChild} /></span>
        <div className="onb-title">What's your kiddo's name?</div>
        <div className="onb-desc">
          We'll use it to say hi and cheer them on. You can add more kids later from Profiles.
        </div>
        <input
          type="text"
          className="onb-input"
          maxLength={20}
          placeholder="e.g. Zack"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
          autoFocus
        />
        <div className="onb-actions">
          <button className="btn btn-primary" onClick={handleNext} disabled={!nameTrimmed}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
