import * as React from 'react';
import {
  motion,
  useInView,
} from 'framer-motion';
import { cn } from '@/lib/utils';

interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: string;
  staggerDelay?: number;
  getItemKey?: (item: T, index: number) => React.Key;
}

const GridItem = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full w-full relative">
      {children}
    </div>
  );
};

const MasonryGrid = <T,>({
  items,
  renderItem,
  className,
  gap = '1rem',
  staggerDelay = 0.05,
  getItemKey,
}: MasonryGridProps<T>) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn('w-full', className)}
      style={{ columnGap: gap }}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      role="list"
    >
      {items.map((item, index) => (
        <motion.div
          key={getItemKey ? getItemKey(item, index) : index}
          className="mb-4 break-inside-avoid"
          variants={itemVariants}
          role="listitem"
        >
          <GridItem>{renderItem(item, index)}</GridItem>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MasonryGrid;