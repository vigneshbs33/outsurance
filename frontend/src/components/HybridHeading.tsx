'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface HybridHeadingProps {
  text: string;
  level?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function HybridHeading({ text, level = 'h1', className }: HybridHeadingProps) {
  const words = text.split(' ');

  const renderWords = () => {
    return words.map((word, idx) => {
      const isOdd = idx % 2 === 0;
      return (
        <span
          key={idx}
          className={cn(
            level === 'h1'
              ? isOdd
                ? 'font-sans font-black tracking-tight text-black'
                : 'font-serif italic font-normal text-[var(--ink-mid)]'
              : level === 'h2'
              ? isOdd
                ? 'font-mono font-bold tracking-widest text-black'
                : 'font-sans font-semibold text-[var(--ink-mid)]'
              : isOdd
              ? 'font-sans font-medium text-black'
              : 'font-serif italic font-normal text-[var(--ink-mid)]',
            'mr-2 inline-block'
          )}
        >
          {word}
        </span>
      );
    });
  };

  if (level === 'h2') {
    return (
      <h2 className={cn('text-xl tracking-tight leading-tight select-none', className)}>
        {renderWords()}
      </h2>
    );
  }

  if (level === 'h3') {
    return (
      <h3 className={cn('text-base tracking-tight leading-snug select-none', className)}>
        {renderWords()}
      </h3>
    );
  }

  return (
    <h1 className={cn('text-3xl tracking-tight leading-none select-none', className)}>
      {renderWords()}
    </h1>
  );
}
