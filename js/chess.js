/* =========================================================
   chess.js — Pure chess logic (zero DOM dependencies)

   Key design decisions:
   ─────────────────────
   • getAttackSquares()  → raw squares a piece THREATENS (no castling,
                           no legality filters). Used by isSquareUnderAttack()
                           to avoid infinite king↔king recursion.

   • getValidMoves()     → pseudo-legal moves INCLUDING castling / en-passant.
                           Receives explicit castlingRights & enPassantTarget so
                           it works correctly inside simulations without relying
                           on global state or reference comparisons.
                           Pass castlingRights = null to skip castling (simulations).

   • wouldMoveResultInCheck() → builds a temporary board, simulates the full
                           move (including en-passant pawn removal AND rook move
                           for castling), then checks king safety.

   • getAllLegalMoves()   → filters pseudo-legal moves through wouldMoveResultInCheck.

   • getGameStatus()     → returns checkmate / stalemate / check / playing.
   ========================================================= */

'use strict';

// ── Helpers ──────────────────────────────────────────────

/**
 * Returns true if `piece` belongs to `color` ('w' or 'b').
 * Empty string → always false.
 */
function isPieceOfColor(piece, color) {
    if (!piece) return false;
    return color === 'w'
        ? piece === piece.toUpperCase()
        : piece === piece.toLowerCase();
}

/** Find the king of `color` on `board`. Returns {r, c} or null. */
function findKing(color, board) {
    const king = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (board[r][c] === king) return { r, c };
    return null;
}

// ── Attack squares (no castling — avoids recursion) ──────

/**
 * Returns all squares the piece at (r, c) ATTACKS on `board`.
 * Pawns: diagonal attack squares only (not forward movement).
 * Kings:  surrounding squares (NO castling).
 * Others: normal slide/jump squares (blocked by pieces).
 *
 * Deliberately does NOT filter same-colour pieces because attack coverage
 * is what matters for isSquareUnderAttack (e.g. a rook "covers" a square
 * even if a friendly piece sits there).
 */
function getAttackSquares(r, c, board) {
    const piece = board[r][c];
    if (!piece) return [];
    const type  = piece.toLowerCase();
    const color = isPieceOfColor(piece, 'w') ? 'w' : 'b';
    const out   = [];

    const slide = (dr, dc) => {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            out.push({ r: nr, c: nc });
            if (board[nr][nc] !== '') break; // blocked
            nr += dr; nc += dc;
        }
    };

    switch (type) {
        case 'p': {
            const dir = color === 'w' ? -1 : 1;
            if (c > 0) out.push({ r: r + dir, c: c - 1 });
            if (c < 7) out.push({ r: r + dir, c: c + 1 });
            break;
        }
        case 'r': slide(1,0); slide(-1,0); slide(0,1); slide(0,-1); break;
        case 'b': slide(1,1); slide(-1,-1); slide(1,-1); slide(-1,1); break;
        case 'q':
            slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
            slide(1,1); slide(-1,-1); slide(1,-1); slide(-1,1);
            break;
        case 'n':
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
                .forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) out.push({ r: nr, c: nc });
                });
            break;
        case 'k':
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
                .forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) out.push({ r: nr, c: nc });
                });
            break;
    }
    return out;
}

// ── Attack check ─────────────────────────────────────────

/**
 * Returns true if any piece of `attackerColor` can attack (targetR, targetC).
 * Uses getAttackSquares — never calls getValidMoves — so no recursion risk.
 */
function isSquareUnderAttack(targetR, targetC, attackerColor, board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && isPieceOfColor(piece, attackerColor)) {
                const attacks = getAttackSquares(r, c, board);
                if (attacks.some(sq => sq.r === targetR && sq.c === targetC)) return true;
            }
        }
    }
    return false;
}

// ── Pseudo-legal moves (including castling & en-passant) ─

/**
 * Returns pseudo-legal destination squares for the piece at (r, c).
 *
 * @param {number}  r
 * @param {number}  c
 * @param {Array}   board              Current board state.
 * @param {object|null} castlingRights Pass null to skip castling (used in simulations).
 * @param {object|null} enPassantTarget {r, c} of the ep-target square, or null.
 */
function getValidMoves(r, c, board, castlingRights, enPassantTarget) {
    const piece = board[r][c];
    if (!piece) return [];
    const type  = piece.toLowerCase();
    const color = isPieceOfColor(piece, 'w') ? 'w' : 'b';
    const moves = [];

    const slide = (dr, dc) => {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const t = board[nr][nc];
            if (t === '') {
                moves.push({ r: nr, c: nc });
            } else {
                if (!isPieceOfColor(t, color)) moves.push({ r: nr, c: nc });
                break;
            }
            nr += dr; nc += dc;
        }
    };

    switch (type) {
        case 'p': {
            const dir      = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            // Forward one
            if (r + dir >= 0 && r + dir < 8 && board[r + dir][c] === '') {
                moves.push({ r: r + dir, c });
                // Forward two from starting row
                if (r === startRow && board[r + 2 * dir][c] === '')
                    moves.push({ r: r + 2 * dir, c });
            }
            // Diagonal captures + en-passant
            [-1, 1].forEach(dc => {
                const nc = c + dc, nr = r + dir;
                if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return;
                if (board[nr][nc] !== '' && !isPieceOfColor(board[nr][nc], color))
                    moves.push({ r: nr, c: nc });
                if (enPassantTarget && enPassantTarget.r === nr && enPassantTarget.c === nc)
                    moves.push({ r: nr, c: nc });
            });
            break;
        }
        case 'r': slide(1,0); slide(-1,0); slide(0,1); slide(0,-1); break;
        case 'b': slide(1,1); slide(-1,-1); slide(1,-1); slide(-1,1); break;
        case 'q':
            slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
            slide(1,1); slide(-1,-1); slide(1,-1); slide(-1,1);
            break;
        case 'n':
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
                .forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8
                        && (board[nr][nc] === '' || !isPieceOfColor(board[nr][nc], color)))
                        moves.push({ r: nr, c: nc });
                });
            break;
        case 'k': {
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
                .forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8
                        && (board[nr][nc] === '' || !isPieceOfColor(board[nr][nc], color)))
                        moves.push({ r: nr, c: nc });
                });

            // Castling — only when castlingRights is explicitly provided
            if (castlingRights) {
                const rights   = color === 'w' ? castlingRights.w : castlingRights.b;
                const oppColor = color === 'w' ? 'b' : 'w';

                // King must not currently be in check
                if (!isSquareUnderAttack(r, c, oppColor, board)) {
                    // Kingside (O-O): squares f & g must be empty and safe
                    if (rights.k
                        && board[r][c + 1] === '' && board[r][c + 2] === ''
                        && !isSquareUnderAttack(r, c + 1, oppColor, board)
                        && !isSquareUnderAttack(r, c + 2, oppColor, board)) {
                        moves.push({ r, c: c + 2 });
                    }
                    // Queenside (O-O-O): squares b, c, d must be empty; c & d safe for king
                    if (rights.q
                        && board[r][c - 1] === '' && board[r][c - 2] === '' && board[r][c - 3] === ''
                        && !isSquareUnderAttack(r, c - 1, oppColor, board)
                        && !isSquareUnderAttack(r, c - 2, oppColor, board)) {
                        moves.push({ r, c: c - 2 });
                    }
                }
            }
            break;
        }
    }
    return moves;
}

// ── Legality filter ──────────────────────────────────────

/**
 * Simulates a move on a temporary board and checks if the moving player's
 * king would be in check afterwards.
 *
 * Handles:
 *  • En-passant  – removes captured pawn from the temp board.
 *  • Castling    – also moves the rook so blocking the king is simulated.
 */
function wouldMoveResultInCheck(from, to, playerColor, board, enPassantTarget) {
    // Deep-copy only the rows we need (shallow row copy is enough for a flat array)
    const tmp = board.map(row => row.slice());
    const moving = tmp[from.r][from.c];

    // En-passant: remove the captured pawn on the side
    if (moving.toLowerCase() === 'p' && to.c !== from.c && tmp[to.r][to.c] === '') {
        tmp[from.r][to.c] = '';
    }

    // Castling: also move the rook in the simulation so it blocks correctly
    if (moving.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2) {
        const kingside = to.c > from.c;
        const rfc = kingside ? 7 : 0;
        const rtc = kingside ? 5 : 3;
        tmp[to.r][rtc] = tmp[to.r][rfc];
        tmp[to.r][rfc] = '';
    }

    tmp[to.r][to.c]   = moving;
    tmp[from.r][from.c] = '';

    const kingPos = findKing(playerColor, tmp);
    if (!kingPos) return true; // king missing → treat as illegal
    const opp = playerColor === 'w' ? 'b' : 'w';
    return isSquareUnderAttack(kingPos.r, kingPos.c, opp, tmp);
}

// ── Full legal move generation ───────────────────────────

/**
 * Returns all fully legal moves for `color` on the given board.
 * Each entry: { from: {r, c}, to: {r, c} }
 */
function getAllLegalMoves(color, board, castlingRights, enPassantTarget) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c] || !isPieceOfColor(board[r][c], color)) continue;
            const pseudo = getValidMoves(r, c, board, castlingRights, enPassantTarget);
            pseudo.forEach(to => {
                if (!wouldMoveResultInCheck({ r, c }, to, color, board, enPassantTarget))
                    legal.push({ from: { r, c }, to });
            });
        }
    }
    return legal;
}

// ── Game-status evaluation ───────────────────────────────

/**
 * Evaluates the position for `currentPlayer` AFTER an opponent move.
 *
 * @returns {{ status: 'playing'|'check'|'checkmate'|'stalemate', winner: 'w'|'b'|null }}
 */
function getGameStatus(currentPlayer, board, castlingRights, enPassantTarget) {
    const opp      = currentPlayer === 'w' ? 'b' : 'w';
    const kingPos  = findKing(currentPlayer, board);
    const inCheck  = kingPos ? isSquareUnderAttack(kingPos.r, kingPos.c, opp, board) : false;
    const hasLegal = getAllLegalMoves(currentPlayer, board, castlingRights, enPassantTarget).length > 0;

    if  (inCheck  && !hasLegal) return { status: 'checkmate', winner: opp };
    if  (!inCheck && !hasLegal) return { status: 'stalemate', winner: null };
    if  (inCheck)               return { status: 'check',     winner: null };
    return                             { status: 'playing',   winner: null };
}
