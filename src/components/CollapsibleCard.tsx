import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import type { CollapsibleSection } from '../state/types';
import { pressable } from '../lib/pressable';

interface CollapsibleCardProps {
  section: CollapsibleSection;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  tourId?: string;
}

export function CollapsibleCard({ section, title, badge, children, tourId }: CollapsibleCardProps) {
  const { state, toggleSectionCollapsed } = useGravy();
  const collapsed = !!state.settings.collapsedSections[section];

  return (
    <div className="card" data-tour-id={tourId}>
      <button
        type="button"
        className="card-collapse-toggle flex-between"
        {...pressable(() => toggleSectionCollapsed(section))}
        aria-expanded={!collapsed}
      >
        <div className="goal-card-title">{title}</div>
        <div className="card-collapse-right">
          {badge}
          <FontAwesomeIcon
            icon={faChevronDown}
            aria-hidden="true"
            className={`card-collapse-chevron ${collapsed ? 'collapsed' : ''}`}
          />
        </div>
      </button>
      <div className={`card-collapse-body ${collapsed ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
}
