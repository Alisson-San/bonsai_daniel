export type Theme = 'dark' | 'light';
export function resolveTheme(saved: string | null, systemDark: boolean): Theme {
  return saved === 'dark' || saved === 'light' ? saved : systemDark ? 'dark' : 'light';
}
