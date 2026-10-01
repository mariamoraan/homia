export const THEME_STORAGE_KEY = 'homia-theme'

export const THEMES = ['indigo', 'coral'] as const
export type ThemeId = (typeof THEMES)[number]

export const THEME_META: Record<
  ThemeId,
  { label: string; header: string; accent: string; surface: string; ink: string }
> = {
  indigo: {
    label: 'Índigo',
    header: '#141414',
    accent: '#6366F1',
    surface: '#1e1e1e',
    ink: '#e5e5e5',
  },
  coral: {
    label: 'Coral',
    header: '#1c1c1e',
    accent: '#FF3B5D',
    surface: '#2c2c2e',
    ink: '#ebebf4',
  },
}

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === 'indigo' || value === 'coral'
}

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return 'indigo'
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  const meta = THEME_META[theme]
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', meta.header)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage failures.
  }
}
