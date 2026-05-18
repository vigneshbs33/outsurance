'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface DottedGuideProps {
  className?: string;
  direction?: 'down' | 'right';
}

export function DottedGuide({ className, direction = 'down' }: DottedGuideProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className={cn('flex justify-center items-center pointer-events-none select-none', className)}>
      <svg
        width={direction === 'down' ? '24' : '60'}
        height={direction === 'down' ? '60' : '24'}
        viewBox={direction === 'down' ? '0 0 24 60' : '0 0 60 24'}
        fill="none"
        className="dotted-arrow-fade"
      >
        {direction === 'down' ? (
          <>
            <path
              d="M12 0V56"
              stroke="#e5e5e5"
              strokeWidth="2"
              className="dotted-arrow"
            />
            <path
              d="M6 50L12 56L18 50"
              stroke="#e5e5e5"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </>
        ) : (
          <>
            <path
              d="M0 12H56"
              stroke="#e5e5e5"
              strokeWidth="2"
              className="dotted-arrow"
            />
            <path
              d="M50 6L56 12L50 18"
              stroke="#e5e5e5"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </>
        )}
      </svg>
    </div>
  );
}
