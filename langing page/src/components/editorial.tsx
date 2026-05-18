'use client';

import React from 'react';
import { cn } from '../lib/utils';

export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <svg className={cn('crosshair-marker', className)} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function HybridHeadline({
  prefix,
  accent,
  suffix,
  className = '',
}: {
  prefix: string;
  accent: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <h1 className={cn('hero-hybrid', className)}>
      <span>{prefix} </span>
      <em>{accent}</em>
      {suffix ? <span>{` ${suffix}`}</span> : null}
    </h1>
  );
}

export function FormField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('field-group', className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function EditorialButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn('btn-primary', className)}>
      <span>{children}</span>
      <span className="btn-primary-line" aria-hidden="true" />
    </button>
  );
}

export function SecondaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn('btn-secondary', className)}>
      {children}
    </button>
  );
}

export function SectionEyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

export function AnnotationBox({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('annotation-box', className)}>
      <div className="annotation-header">{title}</div>
      <div className="annotation-body">{children}</div>
    </div>
  );
}

export function PageOverlay() {
  return <div className="page-overlay" aria-hidden="true" />;
}
