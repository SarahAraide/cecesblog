/* =================================================================
   CECE: THE SUDOKU PAGE (sudoku.html)
   -----------------------------------------------------------------
   Makes a brand-new puzzle in the browser and lets you play it.

   How a puzzle is made:
   1. makeSolvedGrid()  fills an empty 9 x 9 grid with a random,
                        complete, correct answer.
   2. makePuzzle()      takes numbers out of it one at a time, but only
                        if the puzzle still has exactly ONE answer
                        (countAnswers() checks that). The fewer numbers
                        left, the harder the puzzle.

   The grid is stored as a list of 81 numbers, read row by row, like
   reading a page. 0 means "empty". Box number i is in
     row    = Math.floor(i / 9)    (0 to 8, top to bottom)
     column = i % 9                (0 to 8, left to right)
   ================================================================= */

(function () {
  'use strict';

  const board = document.querySelector('#sudoku-board');
  if (!board) {
    return;               // not on the sudoku page: do nothing
  }
  const status = document.querySelector('#sudoku-status');
  const SAVE_KEY = 'cece-sudoku';

  // How many numbers each level starts with (at least; "hard" may end up
  // with a few more if taking any more out would allow two answers)
  const CLUES = { easy: 40, medium: 32, hard: 26 };

  let puzzle = [];        // the starting numbers (0 = empty box)
  let answer = [];        // the full solution
  let level = 'easy';
  const cells = [];       // the 81 <input> boxes


  /* ---------- 1. The sudoku rules ---------- */

  // Can number n go in box i? Only if it's not already in the same
  // row, the same column or the same 3 x 3 square.
  function fits(grid, i, n) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const squareRow = row - (row % 3);    // top-left corner of the 3 x 3 square
    const squareCol = col - (col % 3);
    for (let k = 0; k < 9; k++) {
      if (grid[row * 9 + k] === n) return false;          // same row
      if (grid[k * 9 + col] === n) return false;          // same column
      const r = squareRow + Math.floor(k / 3);
      const c = squareCol + (k % 3);
      if (grid[r * 9 + c] === n) return false;            // same square
    }
    return true;
  }

  // Finds the empty box with the FEWEST possible numbers. Trying that box
  // first makes the solver much faster (a box with only one option is
  // basically already solved).
  function emptiestBox(grid) {
    let best = -1;
    let bestOptions = null;
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const options = [];
      for (let n = 1; n <= 9; n++) {
        if (fits(grid, i, n)) options.push(n);
      }
      if (best === -1 || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
        if (options.length <= 1) break;   // can't do better than this
      }
    }
    return { box: best, options: bestOptions };
  }

  // Mixes a list into a random order (the "Fisher-Yates shuffle")
  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }


  /* ---------- 2. Making a puzzle ---------- */

  // "Backtracking": put a number that fits in the emptiest box and carry
  // on. If we get stuck later, come back, rub it out and try the next one.
  function fillGrid(grid) {
    const { box, options } = emptiestBox(grid);
    if (box === -1) return true;            // no empty boxes left: done!
    for (const n of shuffle(options)) {
      grid[box] = n;
      if (fillGrid(grid)) return true;
      grid[box] = 0;                         // dead end: rub it out
    }
    return false;
  }

  function makeSolvedGrid() {
    const grid = new Array(81).fill(0);
    fillGrid(grid);
    return grid;
  }

  // Counts how many answers a puzzle has, but stops counting at `limit`
  // (we only need to know "exactly one" or "more than one").
  function countAnswers(grid, limit) {
    const { box, options } = emptiestBox(grid);
    if (box === -1) return 1;               // full grid = one answer found
    let count = 0;
    for (const n of options) {
      grid[box] = n;
      count += countAnswers(grid, limit - count);
      grid[box] = 0;
      if (count >= limit) break;
    }
    return count;
  }

  function makePuzzle(solved, clues) {
    const grid = solved.slice();            // a copy, so the answer stays whole
    let left = 81;
    // Visit the boxes in a random order and try emptying each one
    for (const i of shuffle([...Array(81).keys()])) {
      if (left <= clues) break;
      const kept = grid[i];
      grid[i] = 0;
      if (countAnswers(grid.slice(), 2) !== 1) {
        grid[i] = kept;                     // two answers now: put it back
      } else {
        left--;
      }
    }
    return grid;
  }


  /* ---------- 3. Drawing the board ---------- */

  function buildBoard() {
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('input');
      cell.className = 'sudoku-cell';
      cell.type = 'text';
      cell.inputMode = 'numeric';           // phones show the number keypad
      cell.maxLength = 1;
      cell.autocomplete = 'off';
      cell.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1}`);
      cell.dataset.index = i;
      board.appendChild(cell);
      cells.push(cell);
    }
  }

  // Puts the puzzle (and any numbers you'd already typed) into the boxes
  function showPuzzle(entries) {
    cells.forEach((cell, i) => {
      const given = puzzle[i] !== 0;
      cell.value = given ? puzzle[i] : (entries ? entries[i] || '' : '');
      cell.readOnly = given;                // starting numbers can't be changed
      cell.classList.toggle('is-given', given);
      cell.classList.remove('is-wrong', 'is-revealed');
      cell.removeAttribute('aria-invalid');
    });
  }

  function newPuzzle() {
    level = document.querySelector('input[name="level"]:checked')?.value || 'easy';
    answer = makeSolvedGrid();
    puzzle = makePuzzle(answer, CLUES[level]);
    showPuzzle();
    say(`New ${level} puzzle. Good luck!`);
    save();
  }


  /* ---------- 4. Playing ---------- */

  function say(message) {
    status.textContent = message;
  }

  // Marks the boxes in the same row, column and square as the box you're
  // in, and every box with the same number, so the grid is easier to read
  function highlight(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const square = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const value = cells[index].value;
    cells.forEach((cell, i) => {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const s = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      cell.classList.toggle('is-related', r === row || c === col || s === square);
      cell.classList.toggle('is-same', value !== '' && cell.value === value);
    });
  }

  function isSolved() {
    return cells.every((cell, i) => Number(cell.value) === answer[i]);
  }

  // Typing in a box: keep only ONE number from 1 to 9
  board.addEventListener('input', (event) => {
    const cell = event.target;
    cell.value = cell.value.replace(/[^1-9]/g, '').slice(-1);
    cell.classList.remove('is-wrong', 'is-revealed');
    cell.removeAttribute('aria-invalid');
    highlight(Number(cell.dataset.index));
    save();
    if (isSolved()) {
      say('Solved! Every row, column and square is perfect. ♡');
    }
  });

  board.addEventListener('focusin', (event) => {
    highlight(Number(event.target.dataset.index));
  });

  // Arrow keys move from box to box; Backspace/Delete empties a box
  board.addEventListener('keydown', (event) => {
    const index = Number(event.target.dataset.index);
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in moves) {
      event.preventDefault();
      const next = index + moves[event.key];
      // stay inside the grid, and don't wrap from one row's end to the next
      const sameRow = Math.floor(next / 9) === Math.floor(index / 9);
      if (next >= 0 && next < 81 && (Math.abs(moves[event.key]) === 9 || sameRow)) {
        cells[next].focus();
      }
    }
  });

  // The four buttons. data-action="..." on each button says which one it is.
  document.querySelector('.sudoku-buttons').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'new') {
      newPuzzle();
    }

    if (button.dataset.action === 'check') {
      let wrong = 0;
      let empty = 0;
      cells.forEach((cell, i) => {
        if (cell.value === '') {
          empty++;
        } else if (Number(cell.value) !== answer[i]) {
          wrong++;
          cell.classList.add('is-wrong');
          cell.setAttribute('aria-invalid', 'true');
        }
      });
      if (wrong > 0) {
        say(`${wrong} ${wrong === 1 ? 'box needs' : 'boxes need'} another look (marked with a line).`);
      } else if (empty > 0) {
        say(`So far, so good! ${empty} ${empty === 1 ? 'box' : 'boxes'} to go.`);
      } else {
        say('Solved! Every row, column and square is perfect. ♡');
      }
    }

    if (button.dataset.action === 'restart') {
      showPuzzle();
      say('Back to the start of this puzzle.');
      save();
    }

    if (button.dataset.action === 'solve') {
      cells.forEach((cell, i) => {
        if (cell.value === '' || Number(cell.value) !== answer[i]) {
          cell.value = answer[i];
          cell.classList.add('is-revealed');
          cell.classList.remove('is-wrong');
          cell.removeAttribute('aria-invalid');
        }
      });
      say('Here\'s the answer. Press "New puzzle" for another one.');
      save();
    }
  });


  /* ---------- 5. Saving your game in this browser ----------
     localStorage = a small notebook the browser keeps for this website.
     try/catch: some browsers (private windows) don't allow it, and then
     the game simply isn't saved. */

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        puzzle, answer, level,
        entries: cells.map((cell) => (cell.readOnly ? '' : cell.value)),
      }));
    } catch (error) { /* not saved: that's okay */ }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && saved.puzzle?.length === 81 && saved.answer?.length === 81) {
        puzzle = saved.puzzle;
        answer = saved.answer;
        level = saved.level || 'easy';
        const radio = document.querySelector(`input[name="level"][value="${level}"]`);
        if (radio) radio.checked = true;
        showPuzzle(saved.entries);
        say('Welcome back: your last puzzle is just as you left it.');
        return true;
      }
    } catch (error) { /* nothing saved, or it couldn't be read */ }
    return false;
  }


  /* ---------- Start ---------- */
  buildBoard();
  if (!load()) {
    newPuzzle();
  }
})();
