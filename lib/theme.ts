export const THEME_KEY = 'sukkatube:theme'

/**
 * Runs synchronously in <head>, before the first paint, so a saved theme is
 * applied without a flash of the default one.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`
