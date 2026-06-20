import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import type { Theme } from '../state/types';

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'gold', label: 'Gold' },
];

interface SettingsScreenProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsScreen({ open, onClose }: SettingsScreenProps) {
  const { state, saveSetting } = useGravy();
  const [childName, setChildName] = useState(state.settings.childName);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Settings</span>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close settings" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          <div className="section-label">Appearance</div>
          <div className="settings-row settings-row--col">
            <div>
              <div className="settings-label">
                Theme
                {savedField === 'theme' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">Changes the look of the app for everyone</div>
            </div>
            <div className="theme-swatch-grid">
              {THEME_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={`theme-swatch ${state.settings.theme === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    saveSetting('theme', opt.id);
                    flashSaved('theme');
                  }}
                  aria-pressed={state.settings.theme === opt.id}
                >
                  <span className={`theme-swatch-preview theme-swatch-preview--${opt.id}`} />
                  <span className="theme-swatch-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">Profile</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">
                Child's name
                {savedField === 'childName' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">Shown throughout the app</div>
            </div>
            <input
              type="text"
              maxLength={20}
              placeholder="Zack"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onBlur={(e) => {
                saveSetting('childName', e.target.value);
                flashSaved('childName');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
