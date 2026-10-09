'use client';

import { useEffect, useState } from 'react';

// Preferenza di sola interfaccia (non è un dato dell'applicazione).
export type UiTheme = 'light' | 'dark' | 'comfort' | 'auto';

export function useUiPrefs() {
  const [theme, setTheme] = useState<UiTheme>('light');
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    setTheme((localStorage.getItem('nd-theme') as UiTheme) || 'light');
    setLargeText(localStorage.getItem('nd-text') === 'large');
  }, []);

  const changeTheme = (t: UiTheme) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem('nd-theme', t);
  };

  const changeLargeText = (on: boolean) => {
    setLargeText(on);
    if (on) document.documentElement.dataset.text = 'large';
    else delete document.documentElement.dataset.text;
    localStorage.setItem('nd-text', on ? 'large' : 'normal');
  };

  return { theme, changeTheme, largeText, changeLargeText };
}
