import type { Theme } from './types'

/**
 * The app's default palette (see src/index.css's .dark block, which this
 * mirrors, so there's no flash of the old default before JS applies a theme
 * override) — true-black background with a red accent. Additional themes
 * can be appended here in the same shape.
 */
const LIFTLOG: Theme = {
  id: 'liftlog',
  name: 'LiftLog',
  colors: {
    background: 'oklch(0 0 0)',
    foreground: 'oklch(0.9328 0.0025 228.7857)',
    card: 'oklch(0.2097 0.0080 274.5332)',
    cardForeground: 'oklch(0.8853 0 0)',
    popover: 'oklch(0 0 0)',
    popoverForeground: 'oklch(0.9328 0.0025 228.7857)',
    primary: 'oklch(0.5914 0.2411 29.0849)',
    primaryForeground: 'oklch(1.0000 0 0)',
    secondary: 'oklch(0.9622 0.0035 219.5331)',
    secondaryForeground: 'oklch(0.1884 0.0128 248.5103)',
    muted: 'oklch(0.2090 0 0)',
    mutedForeground: 'oklch(0.5637 0.0078 247.9662)',
    accent: 'oklch(0.1928 0.0331 242.5459)',
    accentForeground: 'oklch(0.6108 0.2377 28.1203)',
    destructive: 'oklch(0.6188 0.2376 25.7658)',
    border: 'oklch(0.2674 0.0047 248.0045)',
    input: 'oklch(0.1149 0 0)',
    ring: 'oklch(0.6117 0.2395 28.2376)',
    chart1: 'oklch(0.6723 0.1606 244.9955)',
    chart2: 'oklch(0.6907 0.1554 160.3454)',
    chart3: 'oklch(0.8214 0.1600 82.5337)',
    chart4: 'oklch(0.7064 0.1822 151.7125)',
    chart5: 'oklch(0.5919 0.2186 10.5826)',
    sidebar: 'oklch(0 0 0)',
    sidebarForeground: 'oklch(0.9328 0.0025 228.7857)',
    sidebarPrimary: 'oklch(0.5914 0.2411 29.0849)',
    sidebarPrimaryForeground: 'oklch(1.0000 0 0)',
    sidebarAccent: 'oklch(0.1772 0.0507 23.8674)',
    sidebarAccentForeground: 'oklch(0.6108 0.2377 28.1203)',
    sidebarBorder: 'oklch(0.2674 0.0047 248.0045)',
    sidebarRing: 'oklch(0.6117 0.2395 28.2376)',
    radius: '0.7rem',
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
  name: 'Lime Green',
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
const CATPPUCCIN_MOCHA: Theme = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
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

/**
 * A genuine light theme (near-white background) — added despite the app
 * otherwise being dark-only, at explicit request. Selecting it renders an
 * actual light screen; there's still no OS-driven or toggled light/dark
 * mode, just this as one option among otherwise-dark themes in the picker.
 * :root and .dark were identical in the export and it didn't customize the
 * sidebar tokens, so those are derived the same way as Lime/Catppuccin.
 */
const NIGHT_OWL_LIGHT: Theme = {
  id: 'night-owl-light',
  name: 'Night Owl Light',
  colors: {
    background: 'oklch(0.985 0 180)',
    foreground: 'oklch(0.38 0.035 286.889)',
    card: 'oklch(0.97 0 180)',
    cardForeground: 'oklch(0.336 0.03 286.957)',
    popover: 'oklch(0.962 0 180)',
    popoverForeground: 'oklch(0.29 0.025 287.051)',
    primary: 'oklch(0.38 0.035 286.889)',
    primaryForeground: 'oklch(0.906 0.011 288.49)',
    secondary: 'oklch(0.799 0.007 288.543)',
    secondaryForeground: 'oklch(0.265 0.006 288.309)',
    muted: 'oklch(0.919 0.007 17.278)',
    mutedForeground: 'oklch(0.404 0.025 18.259)',
    accent: 'oklch(0.869 0 165.964)',
    accentForeground: 'oklch(0.351 0 167.471)',
    destructive: 'oklch(0.325 0.118 32.119)',
    border: 'oklch(0.947 0 180)',
    input: 'oklch(0.923 0 164.055)',
    ring: 'oklch(0.38 0.035 286.889)',
    chart1: 'oklch(0.38 0.035 286.889)',
    chart2: 'oklch(0.799 0.007 288.543)',
    chart3: 'oklch(0.869 0 165.964)',
    chart4: 'oklch(0.824 0.006 288.569)',
    chart5: 'oklch(0.374 0.043 286.42)',
    sidebar: 'oklch(0.985 0 180)',
    sidebarForeground: 'oklch(0.336 0.03 286.957)',
    sidebarPrimary: 'oklch(0.38 0.035 286.889)',
    sidebarPrimaryForeground: 'oklch(0.906 0.011 288.49)',
    sidebarAccent: 'oklch(0.869 0 165.964)',
    sidebarAccentForeground: 'oklch(0.351 0 167.471)',
    sidebarBorder: 'oklch(0.947 0 180)',
    sidebarRing: 'oklch(0.38 0.035 286.889)',
    radius: '0.5rem',
  },
}

export const THEMES: Theme[] = [LIFTLOG, LIME, CATPPUCCIN_MOCHA, NIGHT_OWL_LIGHT]
