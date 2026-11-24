import React from 'react';
import { SlotCard, SlotCardProps } from './SlotCard';

export type SlotBayProps = Omit<SlotCardProps, 'lane'> & {
  lane?: 0 | 1;
  orientation?: 'top' | 'bottom';
};

export const SlotBay: React.FC<SlotBayProps> = React.memo(props => {
  const lane: 0 | 1 =
    props.lane !== undefined ? props.lane : props.orientation === 'bottom' ? 1 : 0;
  return <SlotCard {...props} lane={lane} />;
});

SlotBay.displayName = 'SlotBay';

export { SlotCard };
export type { SlotCardProps };
