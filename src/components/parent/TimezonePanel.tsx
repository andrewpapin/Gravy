import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { TIMEZONES } from '../../data/timezones';

function zoneOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(
      new Date(),
    );
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

interface ZoneOption {
  tz: string;
  label: string;
}

const GROUPED: [string, ZoneOption[]][] = (() => {
  const groups = new Map<string, ZoneOption[]>();
  for (const tz of TIMEZONES) {
    const region = tz.includes('/') ? tz.split('/')[0] : 'Other';
    const city = tz.split('/').pop()!.replace(/_/g, ' ');
    const offset = zoneOffset(tz);
    const label = offset ? `${city} (${offset})` : city;
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push({ tz, label });
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
})();

export function TimezonePanel() {
  const { state, saveSetting } = useGravy();
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  const currentInList = TIMEZONES.includes(state.settings.timezone);

  return (
    <div>
      <div className="settings-row settings-row--col">
        <div>
          <div className="settings-label">
            Household time zone
            {savedField === 'timezone' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Controls when each day starts/ends for streaks and goals</div>
        </div>
        <select
          value={state.settings.timezone}
          onChange={(e) => {
            saveSetting('timezone', e.target.value);
            flashSaved('timezone');
          }}
        >
          {!currentInList && <option value={state.settings.timezone}>{state.settings.timezone}</option>}
          {GROUPED.map(([region, zones]) => (
            <optgroup key={region} label={region}>
              {zones.map(({ tz, label }) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}
