// Optional display preference, supplied separately by each local installation.
export const displayName = String(import.meta.env.VITE_DISPLAY_NAME ?? '').trim()

export const profileInitial = displayName
  ? Array.from(displayName)[0].toLocaleUpperCase()
  : 'PH'
