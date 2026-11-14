/* =================================================================
   CECE: main.js
   Small bits of behaviour shared by every page:
     1. "Photo coming soon" placeholders
     2. The wandering ladybug (and its pause button)
     3. The "Contents" button on section pages (phones)
     4. Flipping pages with the ← → arrow keys

   Loaded with "defer", so it runs after the whole HTML has been read.
   ================================================================= */


/* =================================================================
   1. PHOTO PLACEHOLDERS
   -----------------------------------------------------------------
   Every photo is already a real <img> pointing at its final file name
   (e.g. images/ladybug.jpg). If that file isn't in images/ yet, the
   browser can't load it, so we mark its frame as "is-missing" and the CSS
   draws a "photo coming soon" placeholder instead.
   Add the real photo later and it simply appears: no code changes.
   ================================================================= */

function markPhotoMissing(img) {
  const frame = img.closest('.photo__frame');   // the box around the image
  if (!frame) {
    return;
  }
  frame.classList.add('is-missing');
  frame.dataset.missing = img.getAttribute('src'); // the CSS prints this file name
}

function setUpPhotoPlaceholders() {
  document.querySelectorAll('.photo__frame img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      // It already finished trying to load... and failed.
      markPhotoMissing(img);
    } else {
      // Still loading. If it fails later, mark it then.
      img.addEventListener('error', () => markPhotoMissing(img));
    }
  });
}


/* =================================================================
   2. THE WANDERING LADYBUG
   -----------------------------------------------------------------
   A tiny ladybug crawls to a random spot, rests, turns, crawls again...
   - It's created here with JavaScript, so it never clutters the HTML.
   - It's skipped completely for people who prefer reduced motion.
   - The round ladybug button pauses it (moving things on a page must
     have an off switch). The choice is remembered between pages.
   ================================================================= */

const LADYBUG_STORAGE_KEY = 'cece-ladybug';
const LADYBUG_SIZE = 30;    // pixels: keep in sync with .wandering-ladybug in style.css
const LADYBUG_SPEED = 45;   // pixels per second: a gentle crawl

// Everything the ladybug needs to remember, kept together in one object.
const ladybug = {
  walker: null,   // outer box: moves around the screen
  body: null,     // inner box: turns to face where it's going
  x: 0,           // current position, in pixels from the top-left corner
  y: 0,
  angle: 0,       // current direction it faces, in degrees
  timer: null,    // the next planned step, so we can cancel it
  paused: false,
};

function readLadybugSetting() {
  try {
    return localStorage.getItem(LADYBUG_STORAGE_KEY);   // 'paused', 'wandering' or null
  } catch (error) {
    return null;
  }
}

function saveLadybugSetting(value) {
  try {
    localStorage.setItem(LADYBUG_STORAGE_KEY, value);
  } catch (error) {
    // Not saved: it still works on this page.
  }
}

// Move the outer box to (x, y). "translate" = shift it by that many pixels.
function placeLadybug(x, y) {
  ladybug.x = x;
  ladybug.y = y;
  ladybug.walker.style.transform = `translate(${x}px, ${y}px)`;
}

function createLadybug() {
  const walker = document.createElement('div');
  walker.className = 'wandering-ladybug';
  walker.setAttribute('aria-hidden', 'true');   // decoration only: screen readers skip it

  const body = document.createElement('div');
  body.className = 'wandering-ladybug__body';

  walker.appendChild(body);
  document.body.appendChild(walker);
  ladybug.walker = walker;
  ladybug.body = body;

  // Start in the bottom-left corner of the window.
  placeLadybug(16, window.innerHeight - LADYBUG_SIZE - 16);

  // "transitionend" fires when a CSS transition (here: the walk) finishes.
  walker.addEventListener('transitionend', (event) => {
    // Only react to the walker's own movement, not the body turning.
    if (event.target !== walker || event.propertyName !== 'transform') {
      return;
    }
    walker.classList.remove('is-walking');
    // Rest for 1 to 3.5 seconds, then walk somewhere new.
    ladybug.timer = setTimeout(takeAWalk, 1000 + Math.random() * 2500);
  });
}

function takeAWalk() {
  if (ladybug.paused) {
    return;
  }

  // 1. Pick a random spot inside the window.
  //    (clientWidth = window width without the scrollbar.)
  const targetX = Math.random() * (document.documentElement.clientWidth - LADYBUG_SIZE);
  const targetY = Math.random() * (window.innerHeight - LADYBUG_SIZE);
  const dx = targetX - ladybug.x;
  const dy = targetY - ladybug.y;
  const distance = Math.hypot(dx, dy);   // Pythagoras: √(dx² + dy²)

  // Too close to bother? Pick again in a moment.
  if (distance < 20) {
    ladybug.timer = setTimeout(takeAWalk, 500);
    return;
  }

  // 2. Turn to face the spot.
  //    Math.atan2 gives the direction as an angle (in radians, so we convert
  //    to degrees). We add 90 because the drawing's head points UP, not right.
  const newAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  //    Turn the short way round: 350° → 10° should be +20°, not -340°.
  let turn = (newAngle - ladybug.angle) % 360;
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  ladybug.angle += turn;
  ladybug.body.style.rotate = `${ladybug.angle}deg`;

  // 3. After the turn (0.5 s), walk there. Longer trips get more time,
  //    so the ladybug always walks at the same speed.
  ladybug.timer = setTimeout(() => {
    ladybug.walker.style.transitionDuration = `${distance / LADYBUG_SPEED}s`;
    ladybug.walker.classList.add('is-walking');
    placeLadybug(targetX, targetY);
  }, 500);
}

function pauseLadybug() {
  ladybug.paused = true;
  clearTimeout(ladybug.timer);

  // It might be halfway through a walk. Ask the browser where it is RIGHT
  // NOW and freeze it there. (The position is stored in a "matrix"; m41 and
  // m42 are its x and y.)
  const whereNow = new DOMMatrix(getComputedStyle(ladybug.walker).transform);
  ladybug.walker.style.transitionDuration = '0s';
  ladybug.walker.classList.remove('is-walking');
  placeLadybug(whereNow.m41, whereNow.m42);
}

function resumeLadybug() {
  ladybug.paused = false;
  takeAWalk();
}

function setUpLadybug() {
  const button = document.querySelector('.ladybug-toggle');

  // No wandering ladybug (and no button for it) when:
  // - the visitor asked their device to "reduce motion", or
  // - the page is a calm one (<body class="page--calm">, Mind Matters),
  //   where a bug crawling over the text would feel out of place.
  const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCalmPage = document.body.classList.contains('page--calm');
  if (prefersLessMotion || isCalmPage) {
    if (button) {
      button.hidden = true;
    }
    return;
  }

  createLadybug();

  if (readLadybugSetting() === 'paused') {
    ladybug.paused = true;                         // sits still where it starts
  } else {
    ladybug.timer = setTimeout(takeAWalk, 1500);   // first walk after 1.5 s
  }

  if (!button) {
    return;
  }

  // aria-pressed="true" = wandering, "false" = paused
  button.setAttribute('aria-pressed', ladybug.paused ? 'false' : 'true');

  button.addEventListener('click', () => {
    if (ladybug.paused) {
      resumeLadybug();
      saveLadybugSetting('wandering');
    } else {
      pauseLadybug();
      saveLadybugSetting('paused');
    }
    button.setAttribute('aria-pressed', ladybug.paused ? 'false' : 'true');
  });
}


/* =================================================================
   3. THE "CONTENTS" BUTTON (section pages, phones only)
   -----------------------------------------------------------------
   On a phone the Contents list would take up half the screen, so it
   folds away behind a button. Without JavaScript the button stays hidden
   and the list is simply always visible, so nobody gets stuck.
   (The CSS in spread.css decides it's "phones only".)
   ================================================================= */

function setUpContentsMenu() {
  const header = document.querySelector('.site-header');
  const button = document.querySelector('.contents-toggle');
  if (!header || !button) {
    return;                        // the cover has no Contents button
  }

  // Tell the CSS that JavaScript is running, so it can fold the list away.
  header.classList.add('has-menu-button');

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    // aria-expanded tells screen readers whether the list is open
    button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    header.classList.toggle('menu-open', !isOpen);
  });

  // Pressing Escape closes an open list and puts focus back on the button.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      button.setAttribute('aria-expanded', 'false');
      header.classList.remove('menu-open');
      button.focus();
    }
  });
}


/* =================================================================
   4. FLIP PAGES WITH THE ARROW KEYS
   -----------------------------------------------------------------
   → goes to the next page, ← to the previous one, like turning the
   pages of a magazine. It uses the links marked rel="next" and
   rel="prev" on the page (the flip bar and the folded corner), so the
   page order lives in the HTML, not here.
   ================================================================= */

function setUpPageFlipKeys() {
  document.addEventListener('keydown', (event) => {
    // Leave the arrows alone while someone is typing in a box (like the
    // movie search), or when a modifier key is held (browser shortcuts).
    // (instanceof Element: only elements have .closest(); this check
    //  stops the code from crashing if the key press comes from elsewhere)
    const typing = event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (typing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    let rel = null;
    if (event.key === 'ArrowRight') rel = 'next';
    if (event.key === 'ArrowLeft') rel = 'prev';
    if (!rel) {
      return;
    }

    const link = document.querySelector(`a[rel="${rel}"]`);
    if (link) {
      window.location.href = link.href;   // turn the page
    }
  });
}


/* =================================================================
   START EVERYTHING
   ================================================================= */
setUpPhotoPlaceholders();
setUpLadybug();
setUpContentsMenu();
setUpPageFlipKeys();
