import type { Theme } from './types'

/**
 * The app's default palette (see src/index.css's .dark block, which this
 * mirrors) — an iron/steel graphite background with a single warm amber
 * accent. Additional themes can be appended here in the same shape.
 */
const LIFTLOG: Theme = {
  id: 'liftlog',
  name: 'LiftLog',
  colors: {
    background: 'oklch(0.16 0.004 260)',
    foreground: 'oklch(0.94 0.004 260)',
    card: 'oklch(0.205 0.005 260)',
    cardForeground: 'oklch(0.94 0.004 260)',
    popover: 'oklch(0.205 0.005 260)',
    popoverForeground: 'oklch(0.94 0.004 260)',
    primary: 'oklch(0.76 0.14 70)',
    primaryForeground: 'oklch(0.18 0.03 60)',
    secondary: 'oklch(0.255 0.006 260)',
    secondaryForeground: 'oklch(0.94 0.004 260)',
    muted: 'oklch(0.23 0.005 260)',
    mutedForeground: 'oklch(0.62 0.012 260)',
    accent: 'oklch(0.255 0.006 260)',
    accentForeground: 'oklch(0.94 0.004 260)',
    destructive: 'oklch(0.62 0.16 25)',
    border: 'oklch(1 0 0 / 9%)',
    input: 'oklch(1 0 0 / 13%)',
    ring: 'oklch(0.76 0.14 70 / 55%)',
    chart1: 'oklch(0.76 0.14 70)',
    chart2: 'oklch(0.62 0.012 260)',
    chart3: 'oklch(0.439 0 0)',
    chart4: 'oklch(0.371 0 0)',
    chart5: 'oklch(0.269 0 0)',
    sidebar: 'oklch(0.205 0.005 260)',
    sidebarForeground: 'oklch(0.94 0.004 260)',
    sidebarPrimary: 'oklch(0.76 0.14 70)',
    sidebarPrimaryForeground: 'oklch(0.18 0.03 60)',
    sidebarAccent: 'oklch(0.255 0.006 260)',
    sidebarAccentForeground: 'oklch(0.94 0.004 260)',
    sidebarBorder: 'oklch(1 0 0 / 9%)',
    sidebarRing: 'oklch(0.76 0.14 70 / 55%)',
    radius: '0.375rem',
  },
}

export const THEMES: Theme[] = [LIFTLOG]
