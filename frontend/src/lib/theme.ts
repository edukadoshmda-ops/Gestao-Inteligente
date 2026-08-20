/**
 * Centralized theme management for App Gestão Inteligente
 * Supports custom primary/secondary colors and Brazilian political party presets
 */

export interface ThemeConfig {
  name?: string;
  primary: string;
  secondary: string;
  bg?: string;
}

export const PARTY_THEMES: ThemeConfig[] = [
  { name: 'Azul & Amarelo Clássico (PL / PP / Republicanos)', primary: '#003366', secondary: '#FFCC00', bg: '#eff6ff' },
  { name: 'Verde & Amarelo Brasil (Patriota / Oficial)', primary: '#006b3f', secondary: '#ffdf00', bg: '#f0fdf4' },
  { name: 'Vermelho (Trabalhista)', primary: '#dc2626', secondary: '#ffffff', bg: '#fef2f2' },
  { name: 'Laranja & Azul Real (NOVO / Avante)', primary: '#ea580c', secondary: '#0b2545', bg: '#fff7ed' },
  { name: 'Azul Celeste & Dourado (PSDB / União Brasil)', primary: '#0284c7', secondary: '#f59e0b', bg: '#f0f9ff' },
  { name: 'Amarelo & Azul Noturno (PSB / PDT)', primary: '#eab308', secondary: '#0f172a', bg: '#fefce8' },
  { name: 'Roxo & Turquesa (Renovação / Futuro)', primary: '#6b21a8', secondary: '#06b6d4', bg: '#faf5ff' },
  { name: 'Magenta & Índigo (Cidadania / Mulheres)', primary: '#be185d', secondary: '#4338ca', bg: '#fdf2f8' },
  { name: 'Verde Esmeralda & Dourado (Sustentabilidade)', primary: '#047857', secondary: '#facc15', bg: '#f0fdf4' },
  { name: 'Grafite & Ciano Elétrico (Podemos / PSD)', primary: '#1e293b', secondary: '#38bdf8', bg: '#f8fafc' },
];

export const DEFAULT_THEME: ThemeConfig = {
  primary: '#0d1b3e',
  secondary: '#facc15',
  bg: '#eef2f9'
};

export function normalizeHex(color?: string, fallback: string = '#003366'): string {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('#')) return trimmed;
  return `#${trimmed}`;
}

export function applyAppTheme(primary?: string, secondary?: string, bg?: string): void {
  const normPrimary = normalizeHex(primary, DEFAULT_THEME.primary);
  const normSecondary = normalizeHex(secondary, DEFAULT_THEME.secondary);
  const normBg = bg?.trim() || DEFAULT_THEME.bg;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', normPrimary);
    root.style.setProperty('--theme-secondary', normSecondary);
    if (normBg) {
      root.style.setProperty('--theme-bg', normBg);
    }
    // Also set explicit color tokens for Tailwind v4 runtime compatibility
    root.style.setProperty('--color-gov-blue', normPrimary);
    root.style.setProperty('--color-gov-yellow', normSecondary);
    if (normBg) {
      root.style.setProperty('--color-gov-bg', normBg);
    }
  }

  const themeData: ThemeConfig = {
    primary: normPrimary,
    secondary: normSecondary,
    bg: normBg
  };

  try {
    localStorage.setItem('@AppGestao:savedTheme', JSON.stringify(themeData));
  } catch (e) {
    console.warn('Erro ao salvar tema no localStorage:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themeUpdated', { detail: themeData }));
  }
}

export function resetAppTheme(): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-secondary');
    root.style.removeProperty('--theme-bg');
    root.style.removeProperty('--color-gov-blue');
    root.style.removeProperty('--color-gov-yellow');
    root.style.removeProperty('--color-gov-bg');
  }
}

export function getStoredTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem('@AppGestao:savedTheme');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        primary: normalizeHex(parsed.primary, DEFAULT_THEME.primary),
        secondary: normalizeHex(parsed.secondary, DEFAULT_THEME.secondary),
        bg: parsed.bg || DEFAULT_THEME.bg
      };
    }
  } catch (e) {}
  return DEFAULT_THEME;
}
