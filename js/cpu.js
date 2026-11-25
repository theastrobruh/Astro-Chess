/* =========================================================
   cpu.js — CPU opponent logic  (v.014)

   Easy:   Picks a random legal move.
   Medium: Minimax (1–3 plies, variable per NPC personality)
           with alpha-beta pruning, material evaluation,
           piece-square tables, and per-game personality weights.

   v.014 Personality System
   ─────────────────────────
   Each Medium NPC generates a unique "personality" at game start
   via CPU.initPersonality(npcProfile). This produces:

     aggressionBias  — multiplier on capture value in evaluation
                       (1.0 = neutral, >1 = capture-hungry, <1 = positional)
     centerBias      — multiplier on center-control PST bonus
     searchDepth     — ply depth this NPC uses (1 | 2 | 3)
     errorRate       — probability [0–1] of picking a top-3 move
                       instead of the absolute best (simulates impulsiveness)
     favoritePiece   — 1-char piece type ('n','b','r','q', etc.)
                       Moves with this piece get a small bonus.

   These weights are stable for the entire game session, making
   each NPC feel consistently distinct across multiple moves,
   which sets the foundation for the upcoming matchmaking system.

   Dependencies (must be loaded before this file):
     chess.js — getAllLegalMoves, isPieceOfColor, etc.
   ========================================================= */

'use strict';

const CPU = (() => {

    // ── Material values (centipawns) ──────────────────────
    const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    // ── Piece-square tables (from Black's PoV: row 0 = rank 8) ──
    // White pieces are mirrored vertically (row 7-r).

    const PST = {
        p: [
            [  0,  0,  0,  0,  0,  0,  0,  0],
            [ 50, 50, 50, 50, 50, 50, 50, 50],
            [ 10, 10, 20, 30, 30, 20, 10, 10],
            [  5,  5, 10, 25, 25, 10,  5,  5],
            [  0,  0,  0, 20, 20,  0,  0,  0],
            [  5, -5,-10,  0,  0,-10, -5,  5],
            [  5, 10, 10,-20,-20, 10, 10,  5],
            [  0,  0,  0,  0,  0,  0,  0,  0],
        ],
        n: [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50],
        ],
        b: [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20],
        ],
        r: [
            [  0,  0,  0,  0,  0,  0,  0,  0],
            [  5, 10, 10, 10, 10, 10, 10,  5],
            [ -5,  0,  0,  0,  0,  0,  0, -5],
            [ -5,  0,  0,  0,  0,  0,  0, -5],
            [ -5,  0,  0,  0,  0,  0,  0, -5],
            [ -5,  0,  0,  0,  0,  0,  0, -5],
            [ -5,  0,  0,  0,  0,  0,  0, -5],
            [  0,  0,  0,  5,  5,  0,  0,  0],
        ],
        q: [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [ -5,  0,  5,  5,  5,  5,  0, -5],
            [  0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20],
        ],
        k: [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [ 20, 20,  0,  0,  0,  0, 20, 20],
            [ 20, 30, 10,  0,  0, 10, 30, 20],
        ],
    };

    // ── Center squares (used for center-bias bonus) ────────
    // d4, e4, d5, e5 and the extended centre (c3-f6 ring)
    const CENTER_CORE    = new Set(['3-3','3-4','4-3','4-4']);
    const CENTER_EXTENDED = new Set([
        '2-2','2-3','2-4','2-5','2-6',
        '3-2',                  '3-6',
        '4-2',                  '4-6',
        '5-2','5-3','5-4','5-5','5-6',
    ]);

    // ── Personality state (set once per game) ─────────────
    let _personality = null;

    // ── Personality initialiser ───────────────────────────

    /**
     * Map a favoritePiece name (from NPC profile) to a piece char.
     * NPC profiles use full names: 'pawn','knight','bishop','rook','queen','king'.
     */
    const _PIECE_NAME_TO_CHAR = {
        pawn:   'p',
        knight: 'n',
        bishop: 'b',
        rook:   'r',
        queen:  'q',
        king:   'k',   // unlikely to be a "favourite" but handle it
    };

    /**
     * Pick a random depth according to a weighted distribution.
     * Distribution for Medium: 15% depth-1, 60% depth-2, 25% depth-3.
     * This meaningfully changes the NPC's "look-ahead horizon".
     */
    function _randomDepth() {
        const roll = Math.random();
        if (roll < 0.15) return 1;
        if (roll < 0.75) return 2;
        return 3;
    }

    /**
     * Generate and store a personality object for the current game.
     * Call this once when a CPU game starts.
     *
     * @param {object|null} npcProfile  The profile returned by ProfileSystem.generateNPC().
     *                                  Can be null (falls back to neutral defaults).
     */
    function initPersonality(npcProfile) {
        // Helper: random float in [min, max]
        const rnd = (min, max) => min + Math.random() * (max - min);

        const favName = npcProfile?.favoritePiece || null;
        const favChar = favName ? (_PIECE_NAME_TO_CHAR[favName] || null) : null;

        _personality = {
            // How much extra weight captures get in evaluation (0.8 = positional, 1.3 = aggressive)
            aggressionBias: rnd(0.80, 1.35),

            // Multiplier on the positional PST component (0.7 = cares less about position)
            positionBias:   rnd(0.75, 1.25),

            // Extra weight on center-square placement
            centerBias:     rnd(0.85, 1.20),

            // Ply depth for minimax search this game
            searchDepth:    _randomDepth(),

            // Probability [0..1] of picking randomly from top-3 moves
            // (simulates impulsiveness / calculation mistakes)
            // Range 0.08–0.20 keeps medium still "medium" (not easy)
            errorRate:      rnd(0.08, 0.20),

            // Bonus centipawns added to moves involving the NPC's favourite piece
            favoritePieceChar:  favChar,
            favoritePieceBonus: Math.round(rnd(8, 22)),
        };
    }

    // ── Board evaluation ──────────────────────────────────

    /**
     * Static evaluation from Black's perspective with personality weights.
     * Positive = advantage for Black; Negative = advantage for White.
     *
     * When _personality is null (Easy mode or pre-init), falls back to
     * the original neutral evaluation.
     */
    function _evaluate(board) {
        const p = _personality;
        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const type    = piece.toLowerCase();
                const isWhite = piece === piece.toUpperCase();
                const val     = PIECE_VAL[type] || 0;
                const table   = PST[type];
                let   pos     = table ? (isWhite ? table[7 - r][c] : table[r][c]) : 0;

                if (p) {
                    // Apply positionBias to the PST component
                    pos = Math.round(pos * p.positionBias);

                    // Apply centerBias: extra bonus for occupying central squares
                    const key = `${r}-${c}`;
                    if (CENTER_CORE.has(key)) {
                        pos += Math.round(12 * p.centerBias);
                    } else if (CENTER_EXTENDED.has(key)) {
                        pos += Math.round(5  * p.centerBias);
                    }
                }

                // aggressionBias: scale the material value when capturing
                // (applied in move scoring below, not per-square eval —
                //  here we just use the base val so the eval stays sound)
                score += isWhite ? -(val + pos) : (val + pos);
            }
        }
        return score;
    }

    // ── Move application (pure — no DOM side-effects) ─────

    /**
     * Apply a move to a board copy and return the new state.
     * Handles en-passant, castling, and promotion (always → queen).
     */
    function _applyMove(board, move, castlingRights) {
        const nb   = board.map(r => r.slice());          // deep copy rows
        const { from, to } = move;
        const piece = nb[from.r][from.c];
        const type  = piece.toLowerCase();

        // En-passant capture
        if (type === 'p' && to.c !== from.c && nb[to.r][to.c] === '') {
            nb[from.r][to.c] = '';
        }

        // Castling — move the rook as well
        const newCR = {
            w: { k: castlingRights.w.k, q: castlingRights.w.q },
            b: { k: castlingRights.b.k, q: castlingRights.b.q },
        };
        if (type === 'k' && Math.abs(to.c - from.c) === 2) {
            const ks  = to.c > from.c;
            const rfc = ks ? 7 : 0;
            const rtc = ks ? 5 : 3;
            nb[to.r][rtc] = nb[to.r][rfc];
            nb[to.r][rfc] = '';
        }

        // Promotion → queen (CPU always promotes to queen)
        let placed = piece;
        if (type === 'p' && (to.r === 0 || to.r === 7)) {
            placed = piece === 'p' ? 'q' : 'Q';
        }

        nb[to.r][to.c]     = placed;
        nb[from.r][from.c] = '';

        // En-passant target for next turn
        const newEP = (type === 'p' && Math.abs(to.r - from.r) === 2)
            ? { r: (from.r + to.r) / 2, c: to.c }
            : null;

        // Update castling rights
        if (piece === 'K') newCR.w = { k: false, q: false };
        if (piece === 'k') newCR.b = { k: false, q: false };
        if (piece === 'R' && from.r === 7 && from.c === 7) newCR.w.k = false;
        if (piece === 'R' && from.r === 7 && from.c === 0) newCR.w.q = false;
        if (piece === 'r' && from.r === 0 && from.c === 7) newCR.b.k = false;
        if (piece === 'r' && from.r === 0 && from.c === 0) newCR.b.q = false;

        return { newBoard: nb, newCR, newEP };
    }

    // ── Minimax with Alpha-Beta pruning ───────────────────

    /**
     * Minimax search.
     * @param {Array}   board
     * @param {number}  depth       Remaining depth (0 → static eval)
     * @param {number}  alpha
     * @param {number}  beta
     * @param {boolean} maximizing  true = Black's turn (CPU), false = White's turn
     */
    function _minimax(board, depth, alpha, beta, maximizing, castlingRights, enPassantTarget) {
        if (depth === 0) return _evaluate(board);

        const color = maximizing ? 'b' : 'w';
        const moves = getAllLegalMoves(color, board, castlingRights, enPassantTarget);

        if (moves.length === 0) {
            // Stalemate or checkmate — use static eval (heavily penalised by king value)
            return _evaluate(board);
        }

        if (maximizing) {
            let best = -Infinity;
            for (const move of moves) {
                const { newBoard, newCR, newEP } = _applyMove(board, move, castlingRights);
                const score = _minimax(newBoard, depth - 1, alpha, beta, false, newCR, newEP);
                best  = Math.max(best, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // β-cutoff
            }
            return best;
        } else {
            let best = Infinity;
            for (const move of moves) {
                const { newBoard, newCR, newEP } = _applyMove(board, move, castlingRights);
                const score = _minimax(newBoard, depth - 1, alpha, beta, true, newCR, newEP);
                best = Math.min(best, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // α-cutoff
            }
            return best;
        }
    }

    // ── Personality-aware move scoring helpers ─────────────

    /**
     * Score a move with personality bonuses layered on top of minimax.
     * Returns { move, score } for comparison.
     *
     * @param {object} move   - { from: {r,c}, to: {r,c} }
     * @param {number} base   - base minimax score
     * @param {Array}  board  - current board state (before move)
     */
    function _applyPersonalityBonus(move, base, board) {
        if (!_personality) return base;
        const p = _personality;
        let score = base;

        // Aggression bias: extra reward for captures
        const target = board[move.to.r][move.to.c];
        if (target && target !== '') {
            const capturedVal = PIECE_VAL[target.toLowerCase()] || 0;
            // The extra reward is proportional to how aggressive the NPC is
            score += Math.round(capturedVal * (p.aggressionBias - 1.0) * 0.15);
        }

        // Favourite piece bonus: nudge toward using that piece
        if (p.favoritePieceChar) {
            const moving = board[move.from.r][move.from.c];
            if (moving && moving.toLowerCase() === p.favoritePieceChar) {
                score += p.favoritePieceBonus;
            }
        }

        return score;
    }

    /**
     * Given a sorted array of { move, score } objects (descending),
     * apply the NPC's error rate to potentially pick a non-best move.
     * Returns the chosen move object.
     */
    function _applyErrorRate(candidates) {
        if (!_personality || candidates.length === 0) return candidates[0].move;

        // Roll for "impulsive" move selection
        if (Math.random() < _personality.errorRate && candidates.length >= 2) {
            // Pick randomly from top-N candidates (top 2 if 2 exist, top 3 if 3 exist)
            const poolSize = Math.min(3, candidates.length);
            const idx = Math.floor(Math.random() * poolSize);
            return candidates[idx].move;
        }

        return candidates[0].move;
    }

    // ── Public API ────────────────────────────────────────

    /**
     * Initialise the CPU personality for a new game session.
     * Must be called once before getMove() for Medium difficulty.
     *
     * @param {object|null} npcProfile  NPC profile from ProfileSystem.generateNPC()
     */
    // (exposed as CPU.initPersonality)

    /**
     * Compute the CPU's best move.
     *
     * @param {Array}           board
     * @param {object}          castlingRights
     * @param {object|null}     enPassantTarget
     * @param {'easy'|'medium'} difficulty
     * @returns {{ from: {r,c}, to: {r,c} } | null}
     */
    function getMove(board, castlingRights, enPassantTarget, difficulty) {
        const moves = getAllLegalMoves('b', board, castlingRights, enPassantTarget);
        if (moves.length === 0) return null;

        // ── Easy — random legal move ───────────────────────
        if (difficulty === 'easy') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // ── Medium — personality-driven minimax ────────────
        //
        // Depth is determined once per game by initPersonality().
        // Falls back to 2 if personality was never initialised.
        const depth = _personality ? _personality.searchDepth : 2;

        // Shuffle to avoid determinism among equal-scored moves
        const shuffled = moves.slice().sort(() => Math.random() - 0.5);

        // Evaluate all root moves
        const scored = shuffled.map(move => {
            const { newBoard, newCR, newEP } = _applyMove(board, move, castlingRights);
            const base  = _minimax(newBoard, depth - 1, -Infinity, Infinity, false, newCR, newEP);
            const score = _applyPersonalityBonus(move, base, board);
            return { move, score };
        });

        // Sort descending by score (best for Black first)
        scored.sort((a, b) => b.score - a.score);

        // Apply error rate to possibly pick a top-3 move instead of the best
        return _applyErrorRate(scored);
    }

    return {
        initPersonality,
        getMove,
    };
})();
