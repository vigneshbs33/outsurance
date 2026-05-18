'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '../lib/utils';

export type FiddoPose =
  | 'celebrating'
  | 'inspecting'
  | 'shield'
  | 'exploring'
  | 'happy'
  | 'pointing'
  | 'thumbs_up'
  | 'conversing'
  | 'analyzing'
  | 'welcome'
  | 'wise';

interface FiddoCharacterProps {
  pose: FiddoPose;
  size?: number;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

const poseFileMap: Record<FiddoPose, string> = {
  celebrating: 'Celebrating Victory.png',
  inspecting: 'CheckingInspecting Pose.png',
  shield: 'Confident Shield Pose.png',
  exploring: 'ExploringSearching Curious.png',
  happy: 'Happy Excited Entrance.png',
  pointing: 'PointingRecommending Direction.png',
  thumbs_up: 'Reassuring Thumbs Up.png',
  conversing: 'SpeakingConversing Engaged.png',
  analyzing: 'Thoughtful Analysis Pose.png',
  welcome: 'Waving Friendly Welcome.png',
  wise: 'Wise Knowledgeable.png',
};

const poseAnimationMap: Record<FiddoPose, string> = {
  celebrating: 'fiddo-bob',
  inspecting: 'fiddo-point',
  shield: 'fiddo-shield-glow',
  exploring: 'fiddo-blink',
  happy: 'fiddo-bob',
  pointing: 'fiddo-point',
  thumbs_up: 'fiddo-blink',
  conversing: 'fiddo-bob',
  analyzing: 'fiddo-nod',
  welcome: 'fiddo-bob',
  wise: 'fiddo-blink',
};

export function FiddoCharacter({ pose, size = 140, className, animate = true, style }: FiddoCharacterProps) {
  const filename = poseFileMap[pose];
  const defaultAnimation = poseAnimationMap[pose];

  return (
    <div
      style={{ width: size, height: size, ...style }}
      className={cn(
        'relative select-none pointer-events-none transition-all duration-500 ease-in-out',
        animate && defaultAnimation,
        className
      )}
    >
      <Image
        src={`/fiddo_poses/${filename}`}
        alt={`Fiddo ${pose}`}
        fill
        sizes={`${size}px`}
        priority
        className="object-contain"
      />
    </div>
  );
}
