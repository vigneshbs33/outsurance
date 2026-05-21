'use client';

import React from 'react';
import { AuthProvider } from './AuthProvider';
import { LanguageProvider } from './LanguageProvider';
import { GTranslateWidget } from './GTranslateWidget';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
        <GTranslateWidget />
      </LanguageProvider>
    </AuthProvider>
  );
}
