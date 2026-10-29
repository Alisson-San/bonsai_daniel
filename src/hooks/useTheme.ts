import { useEffect, useState } from 'react';
import { resolveTheme, type Theme } from '../lib/theme';
const key = 'bourscheid-theme';
// The first render matches the prerendered page (dark, automatic), so React can hydrate it; the saved choice is read
// right after. The page's colours are already right before that: the inline script in index.html sets data-theme.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [preference, setPreference] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (preference === undefined) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(key); } catch { /* storage blocked: follow the system */ }
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      setPreference(saved);
      return;
    }
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const value = resolveTheme(preference, media.matches); setTheme(value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#0A140E' : '#F7F5F0'); };
    apply(); media.addEventListener('change', apply);
    const sync = (event: StorageEvent) => { if (event.key === key) setPreference(event.newValue); };
    window.addEventListener('storage', sync);
    return () => { media.removeEventListener('change', apply); window.removeEventListener('storage', sync); };
  }, [preference]);
  const choose = (value: Theme | null) => { setPreference(value); try { if (value) localStorage.setItem(key,value); else localStorage.removeItem(key); } catch {} };
  return { theme, toggle: () => choose(theme === 'dark' ? 'light' : 'dark'), reset: () => choose(null), automatic: preference !== 'dark' && preference !== 'light' };
}
