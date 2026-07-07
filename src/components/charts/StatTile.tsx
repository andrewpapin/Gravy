import { AppIcon } from '../AppIcon';

interface StatTileProps {
  icon: string;
  value: string | number;
  label: string;
}

/** Small "icon + big number + label" tile used across the Stats page's personal-bests/
 * games/food sections — reuses the app's .card container and --shadow styling. */
export function StatTile({ icon, value, label }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon-circle">
        <AppIcon iconKey={icon} className="stat-tile-icon" />
      </div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}
