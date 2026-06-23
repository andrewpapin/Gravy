import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { BADGE_MASTER } from '../../data/badges';
import { getEnabledBadgeCount } from '../../state/badges';
import { useGravy } from '../../state/GravyContext';
import { IconPicker } from '../IconPicker';

export function BadgesPanel() {
  const { state, updateBadgeConfig } = useGravy();
  const [activeGroup, setActiveGroup] = useState('All');
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (key: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedKey(key);
    savedTimerRef.current = window.setTimeout(() => setSavedKey(null), 1400);
  };

  const debouncedUpdate = (badgeId: string, key: 'enabled' | 'name' | 'icon', value: string | boolean) => {
    if (key === 'enabled') {
      updateBadgeConfig(badgeId, key, value);
      return;
    }
    if (key === 'icon') {
      updateBadgeConfig(badgeId, key, value);
      flashSaved(`${badgeId}-icon`);
      return;
    }
    const timerKey = `${badgeId}-${key}`;
    clearTimeout(debounceTimers.current[timerKey]);
    debounceTimers.current[timerKey] = setTimeout(() => {
      updateBadgeConfig(badgeId, key, value);
      flashSaved(timerKey);
    }, 300);
  };

  const enabledCount = getEnabledBadgeCount(state);
  const groups = ['All', ...new Set(BADGE_MASTER.map((b) => b.group))];
  const filtered = activeGroup === 'All' ? BADGE_MASTER : BADGE_MASTER.filter((b) => b.group === activeGroup);

  return (
    <div>
      <div className="section-label">
        Badge Library — <span>{`${enabledCount} / ${BADGE_MASTER.length}`}</span> enabled
      </div>
      <div className="muted-note" style={{ fontSize: '0.72rem', marginBottom: 12, lineHeight: 1.5 }}>
        Toggle badges on or off, rename them, or give them a new icon. The trigger rules never change.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {groups.map((g) => (
          <button
            key={g}
            className={`group-pill ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div>
        {filtered.map((b) => {
          const cfg = state.badgeConfig[b.id] || {};
          const enabled = cfg.enabled !== false;
          const iconKey = cfg.icon ?? b.icon;
          const name = cfg.name ?? b.name;
          const earned = state.earnedBadges.includes(b.id);
          return (
            <div className={`pbadge-row ${enabled ? '' : 'disabled-row'}`} key={b.id}>
              <div
                className={earned ? 'pbadge-earned-dot' : 'pbadge-earned-dot unearned'}
                title={earned ? 'Earned!' : 'Not yet earned'}
              />
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <IconPicker
                  value={iconKey}
                  legacyEmoji={b.emoji}
                  onChange={(key) => debouncedUpdate(b.id, 'icon', key)}
                  ariaLabel={`Choose icon for ${name}`}
                />
                {savedKey === `${b.id}-icon` && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  className="pbadge-name-input"
                  type="text"
                  defaultValue={name}
                  key={`${b.id}-name-${name}`}
                  onChange={(e) => debouncedUpdate(b.id, 'name', e.target.value)}
                />
                {savedKey === `${b.id}-name` && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
                <div className="pbadge-desc">{b.desc}</div>
              </div>
              <label className="pbadge-toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => debouncedUpdate(b.id, 'enabled', e.target.checked)}
                />
                <div className="pbadge-toggle-track" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
