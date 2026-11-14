/* =================================================================
   CECE: MOVIE NIGHT (cinema.html)
   -----------------------------------------------------------------
   Turns the list in js/movies.js into cards, and makes the mood
   buttons, the Films/Series buttons and the search box work.

   How it works:
   1. Every card is made ONCE when the page opens.
   2. Pressing a button or typing only hides or shows cards (the
      "hidden" attribute), which is fast even with 200+ cards.
   ================================================================= */

(function () {
  'use strict';

  const grid = document.querySelector('#movie-grid');
  if (!grid || typeof MOVIES === 'undefined') {
    return;               // not on the cinema page, or the data didn't load
  }

  // The moods, in the order of Cece's list. "id" matches the moods in movies.js.
  const MOODS = [
    { id: 'all', label: 'All moods' },
    { id: 'anime', label: 'Anime' },
    { id: 'animated', label: 'Animated' },
    { id: 'romcom', label: 'Rom-coms' },
    { id: 'heartbreak', label: 'Heart-wrenching' },
    { id: 'teens', label: 'Teens' },
    { id: 'thriller', label: 'Thrillers, sci-fi & fantasy' },
    { id: 'sitcom', label: 'Sitcoms' },
    { id: 'docs', label: 'Documentaries' },
  ];
  const moodLabel = (id) => MOODS.find((m) => m.id === id)?.label || id;

  // What's switched on right now
  const state = { mood: 'all', type: 'all', query: '' };

  // Films vs series: documentaries count as films, miniseries as series
  const isSeries = (movie) => /series/i.test(movie.type);

  // Makes text easy to compare: lower case, and accents removed,
  // so "timothee" finds "Timothée"
  function simplify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }


  /* ---------- 1. Make the cards ---------- */

  // A small helper: make an element with a class and some text.
  // textContent (not innerHTML) = the text is always shown as plain text.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const cards = MOVIES.map((movie) => {
    const li = el('li', `movie-card movie-card--${movie.moods[0]}`);

    // the coloured top strip: one tag per mood
    const tags = el('p', 'movie-card__tags');
    movie.moods.forEach((id) => tags.appendChild(el('span', 'movie-card__tag', moodLabel(id))));

    const title = el('h3', 'movie-card__title', movie.title);
    const meta = el('p', 'movie-card__meta', `${movie.year} · ${movie.type}`);

    const cast = el('p', 'movie-card__cast');
    if (movie.castNote) {
      // shows without a fixed cast (e.g. an anthology, or a film with no dialogue)
      cast.appendChild(el('span', 'movie-card__cast-label', 'Cast: '));
      cast.appendChild(document.createTextNode(movie.castNote));
    } else if (movie.cast && movie.cast.length) {
      // anime and animation list voice actors, so they say "Voices"
      const animated = movie.moods.includes('anime') || movie.moods.includes('animated');
      const label = movie.castLabel || (animated ? 'Voices' : 'Starring');
      cast.appendChild(el('span', 'movie-card__cast-label', `${label} `));
      cast.appendChild(document.createTextNode(movie.cast.join(', ')));
    } else {
      // no confirmed cast yet: say so honestly
      cast.appendChild(el('span', 'movie-card__cast-label', 'Cast: '));
      cast.appendChild(el('span', 'movie-card__todo', 'TODO'));
    }

    li.append(tags, title, meta, cast);

    // everything the search box looks through, prepared once
    li.dataset.search = simplify([movie.title, movie.year, movie.type, ...(movie.cast || [])].join(' '));
    return { li, movie };
  });

  cards.forEach((card) => grid.appendChild(card.li));


  /* ---------- 2. The mood buttons (with how many titles each has) ---------- */

  const moodBox = document.querySelector('#mood-buttons');
  MOODS.forEach((mood) => {
    const count = mood.id === 'all'
      ? MOVIES.length
      : MOVIES.filter((m) => m.moods.includes(mood.id)).length;
    const button = el('button', `mood-button mood-button--${mood.id}`);
    button.type = 'button';
    button.dataset.mood = mood.id;
    button.setAttribute('aria-pressed', String(mood.id === state.mood));
    button.append(mood.label + ' ', el('span', 'mood-button__count', String(count)));
    moodBox.appendChild(button);
  });


  /* ---------- 3. Show only the cards that match ---------- */

  const countLine = document.querySelector('#movie-count');
  const empty = document.querySelector('#movie-empty');

  function update() {
    const words = simplify(state.query).split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach(({ li, movie }) => {
      const moodOk = state.mood === 'all' || movie.moods.includes(state.mood);
      const typeOk = state.type === 'all' || (state.type === 'series') === isSeries(movie);
      // every word typed must appear somewhere (title, year, type or cast)
      const searchOk = words.every((w) => li.dataset.search.includes(w));
      const match = moodOk && typeOk && searchOk;
      li.hidden = !match;
      if (match) shown++;
    });
    countLine.textContent = `Showing ${shown} of ${MOVIES.length} titles`
      + (state.mood !== 'all' ? ` · ${moodLabel(state.mood)}` : '');
    empty.hidden = shown > 0;
  }

  // One listener for all the buttons in a group: "event delegation"
  function setUpButtons(box, key) {
    box.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      state[key] = button.dataset[key];
      box.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === button));
      });
      update();
    });
  }
  setUpButtons(moodBox, 'mood');
  setUpButtons(document.querySelector('#type-buttons'), 'type');

  document.querySelector('#movie-search').addEventListener('input', (event) => {
    state.query = event.target.value;
    update();
  });

  update();
})();
