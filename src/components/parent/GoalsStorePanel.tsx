import { useState } from 'react';
import { SegmentedTabs } from './SegmentedTabs';
import { GoalsPanel } from './GoalsPanel';
import { StorePanel } from './StorePanel';

type Segment = 'goals' | 'store';

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'goals', label: 'Goals' },
  { value: 'store', label: 'Store' },
];

export function GoalsStorePanel() {
  const [segment, setSegment] = useState<Segment>('goals');

  return (
    <div>
      <SegmentedTabs options={SEGMENTS} value={segment} onChange={setSegment} />
      <div role="tabpanel">
        {segment === 'goals' ? <GoalsPanel /> : <StorePanel />}
      </div>
    </div>
  );
}
