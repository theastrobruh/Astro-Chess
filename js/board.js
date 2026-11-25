/* =========================================================
   board.js — DOM board renderer

   Responsibilities:
     • Create and maintain the 64 square elements.
     • Render, move, and remove piece elements (icon OR png image).
     • Render in-square coordinate labels (lichess-style).
     • Apply highlight classes (selected, valid-move, valid-capture, in-check).
     • Handle board flip (swaps piece face front↔back for PNG skins).

   Dependencies (must load before this file):
     constants.js — PIECE_MAP, PIECE_NAMES
     chess.js     — isPieceOfColor, findKing, isSquareUnderAttack
     skins.js     — SkinManager
   ========================================================= */

'use strict';

const BoardRenderer = (() => {

    // ── DOM references ────────────────────────────────────
    const boardEl    = document.getElementById('chessboard');
    const piecesEl   = document.getElementById('pieces-layer');

    let _pieces    = {};
    let _flipped   = false;
    let _clickCb   = null;  // (event) => void
    let _labelState = null; // last board array, used for aria-labels

    // ── Board Themes ──────────────────────────────────────
    // RGB triplets stored as "r, g, b" so they can be composited with an alpha
    // channel via rgba(var(--sq-light), var(--board-op)).
    // `coordLight` is the label colour used on LIGHT squares (dark ink) and
    // `coordDark` the label colour used on DARK squares (light ink) — always
    // mirrored against the square fill so coordinates stay legible everywhere.
    const THEMES = {
        classic:  { light: '234, 221, 202', dark:  '71, 106,  68', coordLight: '#3d2f16', coordDark: '#f2e6cd' },
        emerald:  { light: '237, 232, 219', dark:  '54, 116,  86', coordLight: '#2f2a1c', coordDark: '#e7f5ec' },
        royal:    { light: '214, 213, 240', dark:  '62,  52, 126', coordLight: '#2c2a4d', coordDark: '#e6e3ff' },
        bronze:   { light: '242, 227, 205', dark:  '124,  82,  56', coordLight: '#3a2a18', coordDark: '#fbeedd' },
        crimson:  { light: '246, 222, 220', dark:  '128,  42,  54', coordLight: '#3d1f20', coordDark: '#ffe6e2' },
        neon:     { light: '216, 180, 226', dark:  '112,  41,  99', coordLight: '#33193a', coordDark: '#f6dcff' },
        ocean:    { light: '173, 216, 230', dark:  '25,  25, 112',  coordLight: '#123047', coordDark: '#dbeafe' },
        ruby:     { light: '255, 204, 203', dark:  '139,   0,   0', coordLight: '#4a1010', coordDark: '#ffe0de' },
    };

    // ── Helpers ───────────────────────────────────────────

    /** Visual row/col after applying flip */
    function visual(r, c) {
        return _flipped
            ? { vr: 7 - r, vc: 7 - c }
            : { vr: r,     vc: c };
    }

    function squareEl(r, c) {
        return document.getElementById(`sq-${r}-${c}`);
    }

    /**
     * Update the displayed image/icon face of a piece element.
     * For PNG skins: swaps src to _front or _back depending on flip & color.
     * For icon skins: no-op (FontAwesome icons have no directional face).
     */
    function _updatePieceFace(el, piece, flipped) {
        if (!SkinManager.isImageSkin()) return;
        const src = SkinManager.getPieceImageSrc(piece, flipped);
        if (src && el.tagName === 'IMG') el.src = src;
    }

    // ── Public API ────────────────────────────────────────

    /**
     * Build the 64 squares and attach click handlers.
     * Also renders coordinate labels at current flip state.
     */
    function init(clickHandler) {
        _clickCb = clickHandler;
        boardEl.innerHTML  = '';
        piecesEl.innerHTML = '';
        _pieces = {};
        boardEl.setAttribute('role', 'grid');
        boardEl.setAttribute('aria-label', 'Chess board, 8 by 8');

        // Apply saved theme
        const settings = ProfileSystem.getBoardSettings();
        applyBoardTheme(settings.theme, settings.opacity);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq  = document.createElement('div');
                sq.id     = `sq-${r}-${c}`;
                sq.dataset.r = r;
                sq.dataset.c = c;
                sq.setAttribute('role', 'gridcell');
                sq.setAttribute('aria-label', _squareLabel(r, c));

                sq.addEventListener('mousedown', _clickCb);
                sq.addEventListener('touchstart', e => {
                    e.preventDefault();
                    _clickCb(e);
                }, { passive: false });

                boardEl.appendChild(sq);
            }
        }

        updateSquareColors(_flipped);
        _renderCoords(_flipped);
    }

    const _FILES = ['a','b','c','d','e','f','g','h'];

    /**
     * Human-readable square name, e.g. "e4". Used for accessible labels and
     * for the keyboard cursor announcement.
     */
    function squareName(r, c) { return `${_FILES[c]}${8 - r}`; }

    function _squareLabel(r, c) {
        const name = squareName(r, c);
        const state = _labelState;
        if (!state) return name;
        const piece = state[r] && state[r][c];
        if (!piece) return `${name}, empty`;
        const names = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
        const colour = piece === piece.toUpperCase() ? 'white' : 'black';
        return `${name}, ${colour} ${names[piece.toLowerCase()]}`;
    }

    /** Refresh the aria-label of every square from the current board state. */
    function updateSquareLabels(board) {
        _labelState = board || _labelState;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = squareEl(r, c);
                if (sq) sq.setAttribute('aria-label', _squareLabel(r, c));
            }
        }
    }

    /**
     * Highlight the two squares involved in the most recent move.
     * Mirrors what premium chess clients do so the player never loses the thread.
     */
    function setLastMove(from, to) {
        boardEl.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
        if (from) { const a = squareEl(from.r, from.c); if (a) a.classList.add('last-move'); }
        if (to)   { const b = squareEl(to.r, to.c);     if (b) b.classList.add('last-move'); }
    }

    /**
     * Update the light/dark class of every square based on flip state.
     */
    function updateSquareColors(flipped) {
        _flipped = flipped;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const { vr, vc } = visual(r, c);
                const sq = squareEl(r, c);
                if (sq) sq.className = `square ${(vr + vc) % 2 === 0 ? 'light' : 'dark'}`;
            }
        }
    }

    /**
     * Regenerate in-square coordinate labels.
     * Rank numbers appear in the left-most visual column (top-left corner of each square).
     * File letters appear in the bottom visual row (bottom-right corner of each square).
     */
    function _renderCoords(flipped) {
        // Remove old labels
        boardEl.querySelectorAll('.sq-coord').forEach(el => el.remove());

        const files = flipped
            ? ['h','g','f','e','d','c','b','a']
            : ['a','b','c','d','e','f','g','h'];
        const ranks = flipped
            ? ['1','2','3','4','5','6','7','8']
            : ['8','7','6','5','4','3','2','1'];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const { vr, vc } = visual(r, c);
                const sq = squareEl(r, c);
                if (!sq) continue;

                // Rank label: left-most visual column
                if (vc === 0) {
                    const span = document.createElement('span');
                    span.className = 'sq-coord coord-rank';
                    span.textContent = ranks[vr];
                    span.style.color = (vr + vc) % 2 === 0 ? `rgb(${_getDarkRGB()})` : `rgb(${_getLightRGB()})`;
                    sq.appendChild(span);
                }
                // File label: bottom visual row
                if (vr === 7) {
                    const span = document.createElement('span');
                    span.className = 'sq-coord coord-file';
                    span.textContent = files[vc];
                    span.style.color = (vr + vc) % 2 === 0 ? `rgb(${_getDarkRGB()})` : `rgb(${_getLightRGB()})`;
                    sq.appendChild(span);
                }
            }
        }
    }

    /**
     * Full render of all pieces from board state.
     * Clears the pieces layer first.
     */
    function renderPieces(board, flipped) {
        piecesEl.innerHTML = '';
        _pieces  = {};
        _flipped = flipped;
        _labelState = board;
        updateSquareLabels(board);

        const stagger = prefersReducedMotion() ? 0 : 0.012;
        let delay = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c]) {
                    const el = _createPieceEl(board[r][c], r, c);
                    if (stagger) {
                        _armEntrance(el, Math.round(delay * 1000));
                        delay += stagger; // ripple across the opening position
                    }
                }
            }
        }
    }

    // ── Entrance animation ────────────────────────────────
    // The stagger travels through a CSS variable so the animation can be torn
    // down cleanly afterwards. Leaving `piece-animate` on the element forever
    // is a bug: any later class change makes the browser fall back to that
    // still-declared animation and the piece replays its entrance (a blink).
    const ENTRANCE_ANIM = 'pieceDropIn';

    function _stripEntrance(el) {
        el.classList.remove('piece-animate');
        el.style.removeProperty('--piece-delay');
    }

    function _armEntrance(el, delayMs) {
        el.style.setProperty('--piece-delay', `${delayMs}ms`);
        el.classList.add('piece-animate');
        el.addEventListener('animationend', function done(e) {
            if (e.animationName !== ENTRANCE_ANIM) return;
            el.removeEventListener('animationend', done);
            _stripEntrance(el);
        });
    }

    /** Respect the user's motion preference for every board animation. */
    function prefersReducedMotion() {
        return !!(window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /** Create a piece DOM element and position it.
     *  Creates <img> for PNG skins or <i> for icon skins.
     */
    function _createPieceEl(piece, r, c) {
        const isWhite = isPieceOfColor(piece, 'w');
        let el;

        if (SkinManager.isImageSkin()) {
            // ── PNG image element ────────────────────────
            el = document.createElement('img');
            const src = SkinManager.getPieceImageSrc(piece, _flipped);
            el.src = src;
            el.alt = PIECE_NAMES[piece.toUpperCase()] || piece;
            el.className = `piece piece-img ${isWhite ? 'white' : 'black'}`;
            // Store piece char so we can update face on flip
            el.dataset.piece = piece;
        } else {
            // ── FontAwesome icon element ─────────────────
            el = document.createElement('i');
            el.className = `fa-solid ${PIECE_MAP[piece]} piece ${isWhite ? 'white' : 'black'}`;
        }

        el.dataset.r = r;
        el.dataset.c = c;

        // Delegate clicks on pieces to the underlying square handler
        el.addEventListener('mousedown', e => {
            e.preventDefault();
            const sq = squareEl(+el.dataset.r, +el.dataset.c);
            if (sq) _clickCb({ target: sq });
        });
        el.addEventListener('touchstart', e => {
            e.preventDefault();
            const sq = squareEl(+el.dataset.r, +el.dataset.c);
            if (sq) _clickCb({ target: sq });
        }, { passive: false });

        piecesEl.appendChild(el);
        _pieces[`${r}-${c}`] = el;
        _setPosition(el, r, c);
        return el;
    }

    /** Update CSS top/left of a piece element based on logical position. */
    function _setPosition(el, r, c) {
        el.dataset.r = r;
        el.dataset.c = c;
        const { vr, vc } = visual(r, c);
        el.style.top  = `${vr * 12.5}%`;
        el.style.left = `${vc * 12.5}%`;
    }

    /**
     * Animate-move a piece in the DOM from `from` to `to`.
     * Optionally swaps the piece icon/image (promotion).
     * Any pre-existing piece at `to` is removed first via removePieceDOM.
     */
    function movePieceDOM(from, to, newPiece, playerColor) {
        const fromKey = `${from.r}-${from.c}`;
        const toKey   = `${to.r}-${to.c}`;
        const el = _pieces[fromKey];
        if (!el) return;

        // If a different element sits at the destination, kill it
        if (_pieces[toKey] && _pieces[toKey] !== el) {
            _pieces[toKey].remove();
            delete _pieces[toKey];
        }

        // Promotion: swap icon/image & colour class
        if (newPiece) {
            const isWhite = playerColor === 'w';
            if (SkinManager.isImageSkin()) {
                // PNG skin: update src and dataset.piece
                const src = SkinManager.getPieceImageSrc(newPiece, _flipped);
                if (src) el.src = src;
                el.dataset.piece = newPiece;
                el.className = `piece piece-img ${isWhite ? 'white' : 'black'}`;
            } else {
                // Icon skin: swap FA class
                if (PIECE_MAP[newPiece] && !el.classList.contains(PIECE_MAP[newPiece])) {
                    el.className = `fa-solid ${PIECE_MAP[newPiece]} piece ${isWhite ? 'white' : 'black'}`;
                }
            }
        }

        _setPosition(el, to.r, to.c);
        _pieces[toKey] = el;
        delete _pieces[fromKey];
    }

    /** Remove a piece element at (r, c) from the DOM. */
    function removePieceDOM(r, c) {
        const key = `${r}-${c}`;
        if (_pieces[key]) {
            _pieces[key].remove();
            delete _pieces[key];
        }
    }

    /**
     * Apply highlight classes to the board:
     *  • selected square
     *  • valid-move / valid-capture dots
     *  • in-check king square
     */
    function updateHighlights(selectedSquare, validMoves, currentPlayer, board) {
        // Clear all highlight classes
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const sq = squareEl(r, c);
                if (sq) sq.classList.remove('selected', 'valid-move', 'valid-capture', 'in-check');
            }

        // King in check
        if (currentPlayer !== 'none') {
            const opp     = currentPlayer === 'w' ? 'b' : 'w';
            const kingPos = findKing(currentPlayer, board);
            if (kingPos && isSquareUnderAttack(kingPos.r, kingPos.c, opp, board)) {
                const sq = squareEl(kingPos.r, kingPos.c);
                if (sq) sq.classList.add('in-check');
            }
        }

        if (!selectedSquare) return;

        // Selected square
        const sel = squareEl(selectedSquare.r, selectedSquare.c);
        if (sel) sel.classList.add('selected');

        // Valid destination squares
        const selPiece = board[selectedSquare.r][selectedSquare.c];
        validMoves.forEach(m => {
            const sq = squareEl(m.r, m.c);
            if (!sq) return;

            // It's a capture if: there's a piece at dest, OR it's a pawn diagonal to empty (en-passant)
            const isCapture = board[m.r][m.c] !== ''
                || (selPiece && selPiece.toLowerCase() === 'p'
                    && m.c !== selectedSquare.c
                    && board[m.r][m.c] === '');
            sq.classList.add(isCapture ? 'valid-capture' : 'valid-move');
        });
    }

    /**
     * Flip the board: recolour squares, re-render coord labels,
     * slide all existing piece elements to their new positions,
     * and swap front/back faces on PNG skins.
     */
    function flipBoard(flipped) {
        _flipped = flipped;
        updateSquareColors(flipped);
        _renderCoords(flipped);
        for (const key in _pieces) {
            const el = _pieces[key];
            _setPosition(el, +el.dataset.r, +el.dataset.c);
            // Update piece face for PNG skins
            if (SkinManager.isImageSkin() && el.dataset.piece) {
                _updatePieceFace(el, el.dataset.piece, flipped);
            }
        }
    }

    /**
     * Re-render all pieces with the new skin (called after skin change).
     * Requires the current board state to be passed in.
     */
    function refreshSkin(board, flipped) {
        renderPieces(board, flipped);
    }

    /**
     * Applies the board theme and opacity to the root element.
     * Also publishes the mirrored coordinate-label colours so `.sq-coord`
     * never has to guess (previously it referenced undefined variables).
     */
    function applyBoardTheme(themeName, opacity) {
        const root = document.documentElement;
        const theme = THEMES[themeName] || THEMES.classic;
        root.style.setProperty('--sq-light', theme.light);
        root.style.setProperty('--sq-dark', theme.dark);
        root.style.setProperty('--coord-on-light', theme.coordLight);
        root.style.setProperty('--coord-on-dark', theme.coordDark);
        if (typeof opacity === 'number') root.style.setProperty('--board-op', opacity);
        _renderCoords(_flipped); // re-render coords for new contrast colors
    }

    /** All themes, for UI pickers that need swatches. */
    function getThemes() { return THEMES; }

    function _getLightRGB() {
        return document.documentElement.style.getPropertyValue('--sq-light') || THEMES.classic.light;
    }

    function _getDarkRGB() {
        return document.documentElement.style.getPropertyValue('--sq-dark') || THEMES.classic.dark;
    }

    return {
        init,
        updateSquareColors,
        renderPieces,
        movePieceDOM,
        removePieceDOM,
        updateHighlights,
        flipBoard,
        refreshSkin,
        applyBoardTheme,
        getThemes,
        squareName,
        updateSquareLabels,
        setLastMove,
    };

})();
