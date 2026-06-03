/** Shared layout tokens — inner padding inside cards; page title lives in TopBar only. */

export const settingsPadX = "px-3 sm:px-4 md:px-6";
export const settingsContentPad = "px-3 pt-3 pb-4 sm:px-4 sm:pt-4 md:px-6 md:pb-6";

/** Full-width page shell. */
export const pageWrap = "w-full min-w-0";
/** Settings / form pages — inset card with border. */
export const pageCard =
    "w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm";
/** List pages (Customers, Messages) — fill main pane edge-to-edge like MAS ref. */
export const listPageFill = "flex flex-1 flex-col min-h-0 w-full h-full";
export const listPageCard =
    "flex flex-1 flex-col min-h-0 w-full bg-white dark:bg-gray-900";
export const pagePadX = settingsPadX;
export const pageContentPad = settingsContentPad;
export const pageToolbarRow =
    `${pagePadX} py-3 flex flex-wrap items-center justify-end gap-2 sm:gap-3 ` +
    "border-b border-gray-200/80 dark:border-gray-800";

export const settingsFormWrap = "space-y-4 sm:space-y-5 pb-28 sm:pb-6";

/** Compact on mobile (2-col footer); normal size from sm up. */
export const settingsActionBtn =
    "min-w-0 w-full sm:w-auto justify-center px-2 py-2 sm:px-5 sm:py-2.5 " +
    "text-[11px] leading-tight sm:text-sm font-medium rounded-lg transition-colors " +
    "disabled:opacity-50 flex items-center gap-1 sm:gap-2 shrink-0 " +
    "[&_svg]:w-3.5 [&_svg]:h-3.5 sm:[&_svg]:w-4 sm:[&_svg]:h-4";

export const settingsPrimaryBtn =
    `${settingsActionBtn} bg-orange-600 hover:bg-orange-700 text-white`;

export const settingsOutlineBtn =
    `${settingsActionBtn} border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 bg-white dark:bg-gray-900`;
