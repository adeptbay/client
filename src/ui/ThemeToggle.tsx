'use client';

import { useEffect, useState } from 'react';
import { IconButton } from './primitives';
import { MoonIcon, SunIcon } from './Icons';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'adeptbay-theme';

/**
 * Runs before first paint, inlined in <head>. Without it the page renders
 * light, then flips — which is both ugly and a layout-stability problem.
 * Kept as a string so it can be injected with no hydration cost.
 */
export const themeBootstrapScript = `
(function(){
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Read what the bootstrap script already decided, rather than deciding
  // again — otherwise the button disagrees with the page for one frame.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing with storage blocked — the theme still applies
      // for this page view, it just will not be remembered.
    }
    setTheme(next);
  };

  // Render a placeholder of identical size until the theme is known, so
  // the header never shifts.
  if (theme === null) {
    return <span className="inline-block h-9 w-9" aria-hidden="true" />;
  }

  return (
    <IconButton
      label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
