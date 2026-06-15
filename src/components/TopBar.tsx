import { useGrubClub } from '../state/GrubClubContext';

interface TopBarProps {
  logo?: string;
  title: string;
  highlightLast?: boolean;
}

export function TopBar({ logo, title, highlightLast }: TopBarProps) {
  const { state } = useGrubClub();
  const splitIndex = title.lastIndexOf(' ');
  return (
    <div className="topbar">
      {logo && <span className="topbar-logo">{logo}</span>}
      {highlightLast && splitIndex !== -1 ? (
        <span className="topbar-title">
          {title.slice(0, splitIndex)}{' '}
          <span className="topbar-title-accent">{title.slice(splitIndex + 1)}</span>
        </span>
      ) : (
        <span className="topbar-title">{title}</span>
      )}
      <div className="points-pill">
        ⭐ <span>{state.points}</span>
      </div>
    </div>
  );
}
