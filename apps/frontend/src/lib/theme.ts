// Theme utilities and classes for the application

export const themeClasses = {
  // Primary brand colors
  bgPrimaryGradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
  bgPrimaryGradientHover: 'hover:from-orange-600 hover:to-orange-700',
  bgPrimaryLight: 'bg-orange-50',
  borderPrimaryMedium: 'border-orange-200',
  borderPrimary: 'border-primary',
  textPrimary: 'text-orange-600',
  iconPrimary: 'text-orange-600',
  sidebarActive: 'bg-orange-100 dark:bg-orange-900/30',
  cardPrimary: 'bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800',
  iconPrimaryDark: 'text-blue-600',
  textPrimaryDark: 'text-gray-600',
  textPrimaryLight: 'text-gray-300',
  textPrimaryDarker: 'text-gray-700',
  bgPrimary: 'bg-orange-100 text-orange-800',
  bgPrimaryHover: 'hover:bg-orange-200',
  bgPrimaryLightHover: 'hover:bg-orange-100',
  badgePrimary: 'bg-orange-100 text-orange-800',
  badgePrimaryDark: 'dark:bg-orange-900 dark:text-orange-200',
  borderPrimaryLight: 'border-orange-200',
  sidebarGradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
  sidebarHover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
  sidebarIcon: 'text-orange-600 dark:text-orange-400',
  sidebarTextGradient: 'bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent',
  btnPrimary: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700',

  // Status colors
  status: {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },

  // Lead status colors
  leadStatus: {
    'new lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'assigned': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'qualified': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'contacted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'converted': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'lost': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },

  // Message role colors
  messageRole: {
    user: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    assistant: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    agent: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800',
  },

  // Priority colors
  priority: {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    urgent: 'bg-red-500 text-white dark:bg-red-600',
  },
};