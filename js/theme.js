/* =================================================================
   CECE: theme.js
   The light / dark ("The Midnight Issue") switch.

   This file is loaded at the TOP of every page, inside <head> and
   WITHOUT "defer", so Step 1 runs before the page is drawn.
   (Otherwise dark-mode fans would see a white flash on every page.)
   ================================================================= */

// The name we save the choice under.
// localStorage = a tiny storage box inside the browser that keeps
// text even after the tab is closed, so the site remembers you.
const THEME_STORAGE_KEY = 'cece-theme';


/* ---------- Step 1: pick the theme straight away ---------- */

function getSavedTheme() {
  // try/catch: some browsers block localStorage (e.g. strict privacy
  // settings) and would throw an error. If so, we just carry on without it.
  try {
    return localStorage.getItem(THEME_STORAGE_KEY); // 'light', 'dark' or null (nothing saved)
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Couldn't save: the switch still works, it just won't be remembered.
  }
}

function getStartingTheme() {
  const saved = getSavedTheme();
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  // First visit: copy the device's own setting (phone/laptop dark mode).
  const deviceIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return deviceIsDark ? 'dark' : 'light';   // "condition ? if-true : if-false"
}

function applyTheme(theme) {
  // Put data-theme="dark" (or "light") on the <html> tag.
  // style.css has a [data-theme="dark"] block that swaps every colour.
  document.documentElement.dataset.theme = theme;

  // Tell every switch on the page whether it's on or off.
  // (aria-checked is what screen readers announce, and the CSS uses it
  //  to slide the knob.)
  document.querySelectorAll('.theme-switch').forEach((button) => {
    button.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
  });
}

applyTheme(getStartingTheme());


/* ---------- Step 2: make the switch clickable ----------
   The buttons don't exist yet while this runs (the browser hasn't read
   the <body> yet), so we wait for "DOMContentLoaded" = the HTML is ready.
   "() => { ... }" is a short way to write a function. */
document.addEventListener('DOMContentLoaded', () => {
  // Now the switches exist, so show the right on/off state on them.
  applyTheme(document.documentElement.dataset.theme);

  document.querySelectorAll('.theme-switch').forEach((button) => {
    button.addEventListener('click', () => {
      const isDarkNow = document.documentElement.dataset.theme === 'dark';
      const newTheme = isDarkNow ? 'light' : 'dark';
      applyTheme(newTheme);
      saveTheme(newTheme);
    });
  });
});
