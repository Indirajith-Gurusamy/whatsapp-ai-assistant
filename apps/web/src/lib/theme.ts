/**
 * Centralized theme configuration
 * Green theme using #4CAF50 (green-500 in Tailwind)
 */

export const theme = {
  // Primary brand colors - Green theme
  primary: {
    50: "green-50",
    100: "green-100",
    200: "green-200",
    300: "green-300",
    400: "green-400",
    500: "green-500", // Main brand color: #4CAF50
    600: "green-600",
    700: "green-700",
    800: "green-800",
    900: "green-900",
    950: "green-950",
  },
} as const;

// Pre-built class combinations for common use cases
export const themeClasses = {
  // Backgrounds
  bgPrimary: "bg-green-500",
  bgPrimaryHover: "hover:bg-green-600",
  bgPrimaryLight: "bg-green-50",
  bgPrimaryLightHover: "hover:bg-green-100",
  bgPrimaryDark: "bg-green-900",
  bgPrimaryGradient: "bg-gradient-to-r from-green-500 to-green-600",
  bgPrimaryGradientHover: "hover:from-green-600 hover:to-green-700",
  
  // Text
  textPrimary: "text-green-600",
  textPrimaryLight: "text-green-400",
  textPrimaryDark: "text-green-800",
  textPrimaryDarker: "text-green-900",
  
  // Borders
  borderPrimary: "border-green-500",
  borderPrimaryLight: "border-green-100",
  borderPrimaryMedium: "border-green-200",
  
  // Ring/Focus
  ringPrimary: "ring-green-500",
  focusPrimary: "focus:ring-green-500",
  
  // Combinations for buttons
  btnPrimary: "bg-green-600 hover:bg-green-700 text-white",
  btnPrimaryOutline: "border-green-500 text-green-600 hover:bg-green-50",
  
  // Combinations for badges
  badgePrimary: "bg-green-100 text-green-700 hover:bg-green-200",
  badgePrimaryDark: "dark:bg-green-900/30 dark:text-green-400",
  
  // Combinations for cards/containers
  cardPrimary: "bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30",
  
  // Loading spinners
  spinnerPrimary: "border-green-500",
  spinnerPrimaryLight: "border-green-500/20 border-t-green-500",
  
  // Icons
  iconPrimary: "text-green-500",
  iconPrimaryDark: "text-green-600",
  
  // Sidebar specific
  sidebarActive: "bg-green-500/10 text-green-600",
  sidebarHover: "hover:bg-green-500/10",
  sidebarIcon: "text-green-500",
  sidebarGradient: "bg-gradient-to-br from-green-500 to-green-600",
  sidebarTextGradient: "bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent",
  
  // Notifications
  notifUnread: "bg-green-50/50",
  notifBadge: "bg-green-500",
  notifIcon: "bg-green-500/10",
  
  // Avatar/Profile
  avatarBorder: "border-green-500/20",
  avatarBg: "bg-green-500/10",
} as const;

// Helper function to get theme color class
export function getThemeColor(shade: keyof typeof theme.primary): string {
  return theme.primary[shade];
}

// Helper to combine multiple theme classes
export function themeClass(...classes: (keyof typeof themeClasses)[]): string {
  return classes.map(c => themeClasses[c]).join(" ");
}
