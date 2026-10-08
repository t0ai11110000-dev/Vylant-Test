import React, { useState } from 'react';
import { motion, PanInfo } from 'motion/react';

interface MobileSwipeContainerProps {
  children: React.ReactNode[]; // Expected: [ServerList, ChannelList, ChatArea]
  initialView?: number;
}

export const MobileSwipeContainer: React.FC<MobileSwipeContainerProps> = ({ children, initialView = 2 }) => {
  const [index, setIndex] = useState(initialView);
  const swipeThreshold = 50;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -swipeThreshold) {
      setIndex((prev) => Math.min(prev + 1, children.length - 1));
    } else if (info.offset.x > swipeThreshold) {
      setIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  return (
    <div className="w-full h-full overflow-hidden relative">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="w-full h-full flex"
        animate={{ x: `-${index * 100}%` }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children.map((child, i) => (
          <div key={i} className="min-w-full h-full">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};
