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

/**
 * Pasted from tweakcn — only the .dark values map onto our vars, since the
 * app is dark-mode only. Font/shadow/tracking tokens from that export are
 * intentionally not carried over: this app doesn't drive shadows or letter
 * tracking from CSS vars, and fonts stay fixed to the LiftLog identity
 * (Bebas Neue/Geist/JetBrains Mono) rather than varying per theme.
 */
const LIME: Theme = {
  id: 'lime',
  name: 'Lime',
  colors: {
    background: 'oklch(0.1288 0.0406 264.6952)',
    foreground: 'oklch(0.9842 0.0034 247.8575)',
    card: 'oklch(0.2077 0.0398 265.7549)',
    cardForeground: 'oklch(0.9842 0.0034 247.8575)',
    popover: 'oklch(0.2077 0.0398 265.7549)',
    popoverForeground: 'oklch(0.9842 0.0034 247.8575)',
    primary: 'oklch(0.8871 0.2122 128.5041)',
    primaryForeground: 'oklch(0 0 0)',
    secondary: 'oklch(0.2795 0.0368 260.0310)',
    secondaryForeground: 'oklch(0.9842 0.0034 247.8575)',
    muted: 'oklch(0.2795 0.0368 260.0310)',
    mutedForeground: 'oklch(0.7107 0.0351 256.7878)',
    accent: 'oklch(0.3925 0.0896 152.5353)',
    accentForeground: 'oklch(0.8871 0.2122 128.5041)',
    destructive: 'oklch(0.4437 0.1613 26.8994)',
    border: 'oklch(0.2795 0.0368 260.0310)',
    input: 'oklch(0.2795 0.0368 260.0310)',
    ring: 'oklch(0.8871 0.2122 128.5041)',
    chart1: 'oklch(0.8871 0.2122 128.5041)',
    chart2: 'oklch(0.6231 0.1880 259.8145)',
    chart3: 'oklch(0.7227 0.1920 149.5793)',
    chart4: 'oklch(0.6268 0.2325 303.9004)',
    chart5: 'oklch(0.7686 0.1647 70.0804)',
    sidebar: 'oklch(0.1288 0.0406 264.6952)',
    sidebarForeground: 'oklch(0.9842 0.0034 247.8575)',
    sidebarPrimary: 'oklch(0.8871 0.2122 128.5041)',
    sidebarPrimaryForeground: 'oklch(0 0 0)',
    sidebarAccent: 'oklch(0.2795 0.0368 260.0310)',
    sidebarAccentForeground: 'oklch(0.9842 0.0034 247.8575)',
    sidebarBorder: 'oklch(0.2795 0.0368 260.0310)',
    sidebarRing: 'oklch(0.8871 0.2122 128.5041)',
    radius: '1rem',
  },
}

/**
 * Another tweakcn export — this one didn't customize the sidebar tokens
 * (:root and .dark were identical), and this app has no sidebar component
 * anyway, so those are derived from the nearest matching color rather than
 * pasted, the same way tweakcn falls back when a theme leaves them unset.
 */
const VIOLET: Theme = {
  id: 'violet',
  name: 'Violet',
  colors: {
    background: 'oklch(0.244 0.03 283.913)',
    foreground: 'oklch(0.878 0.043 272.094)',
    card: 'oklch(0.225 0.027 284.034)',
    cardForeground: 'oklch(0.929 0.024 272.369)',
    popover: 'oklch(0.216 0.025 284.103)',
    popoverForeground: 'oklch(0.98 0.007 272.584)',
    primary: 'oklch(0.787 0.119 304.446)',
    primaryForeground: 'oklch(0.277 0.139 295.596)',
    secondary: 'oklch(0.334 0.068 303.657)',
    secondaryForeground: 'oklch(0.864 0.033 305.939)',
    muted: 'oklch(0.293 0.021 285.027)',
    mutedForeground: 'oklch(0.733 0.027 285.71)',
    accent: 'oklch(0.372 0.055 283.423)',
    accentForeground: 'oklch(0.91 0.014 286.109)',
    destructive: 'oklch(0.649 0.226 31.646)',
    border: 'oklch(0.303 0.02 285.14)',
    input: 'oklch(0.331 0.023 285.098)',
    ring: 'oklch(0.787 0.119 304.446)',
    chart1: 'oklch(0.787 0.119 304.446)',
    chart2: 'oklch(0.334 0.068 303.657)',
    chart3: 'oklch(0.372 0.055 283.423)',
    chart4: 'oklch(0.359 0.075 303.591)',
    chart5: 'oklch(0.784 0.123 304.365)',
    sidebar: 'oklch(0.244 0.03 283.913)',
    sidebarForeground: 'oklch(0.929 0.024 272.369)',
    sidebarPrimary: 'oklch(0.787 0.119 304.446)',
    sidebarPrimaryForeground: 'oklch(0.277 0.139 295.596)',
    sidebarAccent: 'oklch(0.372 0.055 283.423)',
    sidebarAccentForeground: 'oklch(0.91 0.014 286.109)',
    sidebarBorder: 'oklch(0.303 0.02 285.14)',
    sidebarRing: 'oklch(0.787 0.119 304.446)',
    radius: '0.5rem',
  },
}

export const THEMES: Theme[] = [LIFTLOG, LIME, VIOLET]
