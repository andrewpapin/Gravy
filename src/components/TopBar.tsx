import { useGrubClub } from '../state/GrubClubContext';

interface TopBarProps {
  logo: string;
  title: string;
}

export function TopBar({ logo, title }: TopBarProps) {
  const { state } = useGrubClub();
  return (
    <div className="topbar">
      <span className="topbar-logo">{logo}</span>
      <span className="topbar-title">{title}</span>
      <div className="points-pill">
        ⭐ <span>{state.points}</span>
      </div>
    </div>
  );
}
