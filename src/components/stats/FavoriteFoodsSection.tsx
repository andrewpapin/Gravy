import { BarChart } from '../charts/BarChart';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';

export function FavoriteFoodsSection() {
  const { favoriteFoods } = useStatsSnapshot();

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Favorite Foods</h3>
      {favoriteFoods.length > 0 ? (
        <BarChart
          rows={favoriteFoods.map((f) => ({
            key: f.id,
            label: f.label,
            value: f.count,
            icon: f.icon,
            valueLabel: `${f.count}x`,
          }))}
        />
      ) : (
        <p className="stats-section-empty">Log some food to see your favorites!</p>
      )}
    </section>
  );
}
