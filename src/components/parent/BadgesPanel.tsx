import { useState } from 'react';
import { BADGE_MASTER } from '../../data/badges';
import { getEnabledBadgeCount } from '../../state/badges';
import { useGrubClub } from '../../state/GrubClubContext';

export function BadgesPanel() {
  const { state, updateBadgeConfig } = useGrubClub();
  const [activeGroup, setActiveGroup] = useState('All');

  const enabledCount = getEnabledBadgeCount(state);
  const groups = ['All', ...new Set(BADGE_MASTER.map((b) => b.group))];
  const filtered = activeGroup === 'All' ? BADGE_MASTER : BADGE_MASTER.filter((b) => b.group === activeGroup);

  return (
    <div>
      <div className="section-label">
        Badge Library — <span>{`${enabledCount} / ${BADGE_MASTER.length}`}</span> enabled
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
        Toggle badges on or off, rename them, or give them a new emoji. The trigger rules never change.
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
          const emoji = cfg.emoji ?? b.emoji;
          const name = cfg.name ?? b.name;
          const earned = state.earnedBadges.includes(b.id);
          return (
            <div className={`pbadge-row ${enabled ? '' : 'disabled-row'}`} key={b.id}>
              <div
                className={earned ? 'pbadge-earned-dot' : 'pbadge-earned-dot unearned'}
                title={earned ? 'Earned!' : 'Not yet earned'}
              />
              <input
                className="pbadge-emoji-input"
                type="text"
                maxLength={2}
                defaultValue={emoji}
                key={`${b.id}-emoji-${emoji}`}
                onChange={(e) => updateBadgeConfig(b.id, 'emoji', e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  className="pbadge-name-input"
                  type="text"
                  defaultValue={name}
                  key={`${b.id}-name-${name}`}
                  onChange={(e) => updateBadgeConfig(b.id, 'name', e.target.value)}
                />
                <div className="pbadge-desc">{b.desc}</div>
              </div>
              <label className="pbadge-toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => updateBadgeConfig(b.id, 'enabled', e.target.checked)}
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
