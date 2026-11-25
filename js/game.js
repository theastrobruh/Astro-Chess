/* =========================================================
   game.js  Main game controller & event wiring  (v.014)

   Responsibilities:
      Owns all mutable game state.
      Orchestrates BoardRenderer, Timer, UI, AudioSystem,
       chess logic, CPU, ProfileSystem.
      Handles click events → selection → move execution → status.
      Tracks game score (pts) and integrates Elo at game end.

   Dependencies (loaded before this file):
     constants.js, starfield.js, audio.js, chess.js,
     board.js, timer.js, profile.js, cpu.js, ui.js
   ========================================================= */

'use strict';

// ═══════════════════════════════════════════════════════════
// Game State
// ═══════════════════════════════════════════════════════════

let board            = [];
let currentPlayer    = 'w';          // 'w' | 'b'
let selectedSquare   = null;         // {r, c} | null
let validMoves       = [];           // [{r, c}, ...]
let capturedPieces   = { w: [], b: [] };
let castlingRights   = { w: { k: true, q: true }, b: { k: true, q: true } };
let enPassantTarget  = null;         // {r, c} | null
let pendingPromotion = false;
let gameOver         = false;
let isFlipped        = false;
let selectedMinutes  = DEFAULT_TIME_MINUTES;

// ── v.006 additions ───────────────────────────────────────
let gameMode         = 'local';     // 'local' | 'cpu'
let cpuDifficulty    = 'easy';      // 'easy'  | 'medium'
let cpuColor         = 'b';         // CPU always plays black
let currentCpuProfile = null;
let gameScore        = { w: 0, b: 0 };
let moveCount        = 0;
let gameStartTime    = null;

// ── v.011 additions  detailed game tracking ──────────────
let checksGiven    = 0;           // checks delivered by white (human)
let piecesLost     = 0;           // pieces white lost
let captureCount   = 0;           // pieces white captured
let capturedQueen  = false;       // white captured black queen
let promotions     = 0;           // white pawn promotions
let didCastle      = false;       // white has castled
let matePiece      = null;        // piece (uppercase) delivering final checkmate
let pieceMoveCounts = {};         // { 'P': 4, 'N': 2, ... }  white pieces moved

// ── Point values per event ────────────────────────────────
const CAPTURE_PTS  = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const CHECK_PTS    = 10;
const CHECKMATE_PTS = 100;
const CASTLE_PTS   = 5;
const PROMO_PTS    = 30;

// ── DOM refs ──────────────────────────────────────────────
const statusEl          = document.getElementById('status-message');
const capturedByWhiteEl = document.getElementById('captured-by-white');
const capturedByBlackEl = document.getElementById('captured-by-black');

// ═══════════════════════════════════════════════════════════
// Initialisation
// ═══════════════════════════════════════════════════════════

/**
 * Start (or restart) a game.
 * @param {'local'|'cpu'} mode
 * @param {'easy'|'medium'} [difficulty]
 */
function initGame(mode = 'local', difficulty = 'easy', resume = null) {
    // Mode
    gameMode      = mode;
    cpuDifficulty = difficulty;

    if (typeof Analytics !== 'undefined') {
        Analytics.track(resume ? 'game_resumed' : 'game_start', {
            mode,
            difficulty: mode === 'cpu' ? difficulty : null,
            npc: currentCpuProfile ? currentCpuProfile.username : null
        });
    }

    // Reset chess state
    board           = resume ? resume.board.map(row => row.slice())
                             : INITIAL_BOARD.map(row => row.slice());
    currentPlayer   = resume ? resume.currentPlayer : 'w';
    selectedSquare  = null;
    validMoves      = [];
    capturedPieces  = resume ? JSON.parse(JSON.stringify(resume.capturedPieces))
                             : { w: [], b: [] };
    castlingRights  = resume ? JSON.parse(JSON.stringify(resume.castlingRights))
                             : { w: { k: true, q: true }, b: { k: true, q: true } };
    enPassantTarget = resume ? resume.enPassantTarget : null;
    pendingPromotion = false;
    gameOver        = false;
    isFlipped       = resume ? !!resume.isFlipped : false;

    // Score & tracking
    gameScore      = resume ? { ...resume.gameScore } : { w: 0, b: 0 };
    moveCount      = resume ? (resume.moveCount || 0) : 0;
    gameStartTime  = resume ? (resume.startedAt || Date.now()) : Date.now();

    // v.011 tracking reset
    checksGiven     = resume ? (resume.checksGiven  || 0) : 0;
    piecesLost      = resume ? (resume.piecesLost   || 0) : 0;
    captureCount    = resume ? (resume.captureCount || 0) : 0;
    capturedQueen   = resume ? !!resume.capturedQueen : false;
    promotions      = resume ? (resume.promotions   || 0) : 0;
    didCastle       = resume ? !!resume.didCastle   : false;
    matePiece       = resume ? (resume.matePiece    || null) : null;
    pieceMoveCounts = resume ? { ...(resume.pieceMoveCounts || {}) } : {};

    if (mode === 'cpu') {
        // v.014: Check if an exact NPC was passed from Plaza
        if (window._selectedCpuNpc) {
            currentCpuProfile = window._selectedCpuNpc;
            window._selectedCpuNpc = null; // consume it
        } else if (resume && resume.cpuProfile) {
            currentCpuProfile = resume.cpuProfile;
        } else {
            currentCpuProfile = ProfileSystem.generateNPC(difficulty);
        }

        // v.014: init per-game personality for Medium NPC
        if (difficulty === 'medium') {
            CPU.initPersonality(currentCpuProfile);
        } else {
            CPU.initPersonality(null);
        }
    } else {
        currentCpuProfile = null;
        CPU.initPersonality(null);
    }

    // v.021: start a fresh move log + review history for this game, or adopt
    // the stored one so a resumed game can still be reviewed move by move.
    reviewHistory = (resume && Array.isArray(resume.reviewHistory))
        ? JSON.parse(JSON.stringify(resume.reviewHistory))
        : [];
    if (typeof window.__astroReviewReset === 'function') window.__astroReviewReset();

    // DOM
    _updateCapturedUI();
    UI.updateScoreUI(gameScore.w, gameScore.b);
    UI.updatePlayerNames(mode, difficulty, currentCpuProfile);

    BoardRenderer.init(handleSquareClick);
    BoardRenderer.renderPieces(board, isFlipped);
    BoardRenderer.updateHighlights(null, [], currentPlayer, board);
    UI.highlightActiveTurn(currentPlayer);

    // Clock  a resumed game picks the clocks back up where they stopped
    Timer.start(
        selectedMinutes,
        () => currentPlayer,
        () => pendingPromotion || gameOver,
        _handleTimeout
    );
    if (resume && resume.remaining) Timer.restore(resume.remaining);

    _setStatus(currentPlayer === 'w' ? `White's Turn` : `Black's Turn`, 'info');

    // ── Switch to in-game music context ───────────────────
    if (typeof MusicSystem !== 'undefined') {
        MusicSystem.setContext('game');
    }

    // v.015: Reset Kill Announcer & Move Timeline
    if (typeof Announcer !== 'undefined') {
        Announcer.reset();
    }

    // v.021: clear the last-move highlight and any held pause state
    BoardRenderer.setLastMove(null, null);
    if (typeof window.__astroResetPause === 'function') window.__astroResetPause();
}

// ═══════════════════════════════════════════════════════════
// Click Handling
// ═══════════════════════════════════════════════════════════

function handleSquareClick(e) {
    if (gameOver || pendingPromotion) return;
    // v.021: while the Move Timeline is being reviewed the board is a
    // read-only replay  clicks must not paint on top of it.
    if (typeof window.__astroIsReviewing === 'function' && window.__astroIsReviewing()) return;
    // In CPU mode, block clicks on CPU's turn
    if (gameMode === 'cpu' && currentPlayer === cpuColor) return;

    let target = e.target;
    while (target && !target.classList.contains('square'))
        target = target.parentElement;
    if (!target || target.dataset.r === undefined) return;

    const r = parseInt(target.dataset.r, 10);
    const c = parseInt(target.dataset.c, 10);
    const clickedPiece = board[r][c];

    if (selectedSquare) {
        if (validMoves.some(m => m.r === r && m.c === c)) {
            _processMove(selectedSquare, { r, c });
        } else if (clickedPiece && isPieceOfColor(clickedPiece, currentPlayer)) {
            _selectSquare(r, c);
        } else {
            _deselect();
        }
    } else {
        if (clickedPiece && isPieceOfColor(clickedPiece, currentPlayer)) {
            _selectSquare(r, c);
        }
    }
}

function _selectSquare(r, c) {
    selectedSquare = { r, c };
    const pseudo = getValidMoves(r, c, board, castlingRights, enPassantTarget);
    validMoves = pseudo.filter(m =>
        !wouldMoveResultInCheck({ r, c }, m, currentPlayer, board, enPassantTarget)
    );
    BoardRenderer.updateHighlights(selectedSquare, validMoves, currentPlayer, board);
}

function _deselect() {
    selectedSquare = null;
    validMoves     = [];
    BoardRenderer.updateHighlights(null, [], currentPlayer, board);
}

// ═══════════════════════════════════════════════════════════
// Move Processing
// ═══════════════════════════════════════════════════════════

/**
 * Entry point: check for pawn promotion before executing.
 * @param {{r,c}} from
 * @param {{r,c}} to
 * @param {string|null} [autoPromote]  If set, skip the modal (used by CPU)
 */
function _processMove(from, to, autoPromote = null) {
    const moving = board[from.r][from.c];
    if (moving.toLowerCase() === 'p' && (to.r === 0 || to.r === 7)) {
        if (autoPromote) {
            _executeMove(from, to, autoPromote);
            return;
        }
        pendingPromotion = true;
        UI.showPromotionModal(currentPlayer, chosenPiece => {
            pendingPromotion = false;
            _executeMove(from, to, chosenPiece);
        });
        return;
    }
    _executeMove(from, to, moving);
}

function _executeMove(from, to, pieceToPlace) {
    const moving   = board[from.r][from.c];
    const mover    = currentPlayer;          // save before switch
    let   captured = '';
    let   soundType = 'move';
    let   soundPiece = moving;   // piece whose sound to play (updated on capture)
    let   moveBonus = 0;

    // ── En Passant ────────────────────────────────────────
    const isEnPassant =
        moving.toLowerCase() === 'p' &&
        to.c !== from.c &&
        board[to.r][to.c] === '';

    if (isEnPassant) {
        captured = board[from.r][to.c];
        board[from.r][to.c] = '';
        BoardRenderer.removePieceDOM(from.r, to.c);
        soundType = 'capture';
        soundPiece = captured;   // en-passant: the captured pawn's sound
    }

    // ── Castling ──────────────────────────────────────────
    const isCastling =
        moving.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2;

    if (isCastling) {
        const kingside = to.c > from.c;
        const rfc = kingside ? 7 : 0;
        const rtc = kingside ? 5 : 3;
        board[to.r][rtc] = board[to.r][rfc];
        board[to.r][rfc] = '';
        BoardRenderer.movePieceDOM({ r: to.r, c: rfc }, { r: to.r, c: rtc }, null, currentPlayer);
        soundType = 'castle';
        moveBonus += CASTLE_PTS;
        // v.011: track castle for white
        if (mover === 'w') didCastle = true;
    }

    // ── Normal capture ────────────────────────────────────
    if (!isEnPassant && board[to.r][to.c] !== '') {
        captured = board[to.r][to.c];
        BoardRenderer.removePieceDOM(to.r, to.c);
        soundType = 'capture';
        soundPiece = captured;   // play the captured piece's signature
    }

    // ── Track captured pieces ─────────────────────────────
    if (captured) {
        capturedPieces[mover].push(captured);
        _updateCapturedUI();
        moveBonus += CAPTURE_PTS[captured.toLowerCase()] || 0;
        // v.011: stats
        if (mover === 'w') {
            captureCount++;
            if (captured.toLowerCase() === 'q') capturedQueen = true;
        } else {
            piecesLost++; // white lost a piece (black captured it)
        }
    }

    // ── Promotion bonus ───────────────────────────────────
    const isPromotion = moving.toLowerCase() === 'p' && (to.r === 0 || to.r === 7);
    if (isPromotion) {
        moveBonus += PROMO_PTS;
        if (mover === 'w') promotions++;
    }

    // ── v.011: track piece move counts for white ──────────
    if (mover === 'w') {
        const pieceKey = moving.toUpperCase();
        pieceMoveCounts[pieceKey] = (pieceMoveCounts[pieceKey] || 0) + 1;
    }

    // ── Update board state ────────────────────────────────
    board[to.r][to.c]     = pieceToPlace;
    board[from.r][from.c] = '';
    BoardRenderer.movePieceDOM(from, to, pieceToPlace, currentPlayer);

    // v.021: highlight the ply and play the arrival/capture feedback
    BoardRenderer.setLastMove(from, to);
    BoardRenderer.updateSquareLabels(board);
    if (typeof window.__astroMoveFX === 'function') {
        window.__astroMoveFX(from, to, captured);
    }

    // ── En-passant target ─────────────────────────────────
    enPassantTarget =
        (moving.toLowerCase() === 'p' && Math.abs(to.r - from.r) === 2)
            ? { r: (from.r + to.r) / 2, c: to.c }
            : null;

    // ── Castling rights ───────────────────────────────────
    if (moving === 'K') castlingRights.w = { k: false, q: false };
    if (moving === 'k') castlingRights.b = { k: false, q: false };
    if (moving === 'R' && from.r === 7 && from.c === 7) castlingRights.w.k = false;
    if (moving === 'R' && from.r === 7 && from.c === 0) castlingRights.w.q = false;
    if (moving === 'r' && from.r === 0 && from.c === 7) castlingRights.b.k = false;
    if (moving === 'r' && from.r === 0 && from.c === 0) castlingRights.b.q = false;
    if (captured === 'R' && to.r === 7 && to.c === 7)  castlingRights.w.k = false;
    if (captured === 'R' && to.r === 7 && to.c === 0)  castlingRights.w.q = false;
    if (captured === 'r' && to.r === 0 && to.c === 7)  castlingRights.b.k = false;
    if (captured === 'r' && to.r === 0 && to.c === 0)  castlingRights.b.q = false;

    // ── Switch turn ───────────────────────────────────────
    selectedSquare = null;
    validMoves     = [];
    currentPlayer  = currentPlayer === 'w' ? 'b' : 'w';
    moveCount++;

    // ── Evaluate position ─────────────────────────────────
    const status = getGameStatus(currentPlayer, board, castlingRights, enPassantTarget);

    // ── Scoring bonuses for check / mate ──────────────────
    if (status.status === 'check')     moveBonus += CHECK_PTS;
    if (status.status === 'checkmate') moveBonus += CHECKMATE_PTS;

    // v.011: track checks given by white
    if ((status.status === 'check' || status.status === 'checkmate') && mover === 'w') {
        checksGiven++;
    }

    // v.011: record the mating piece (white wins)
    if (status.status === 'checkmate' && status.winner === 'w') {
        matePiece = (pieceToPlace || moving).toUpperCase();
    }

    // Apply accumulated points to the mover
    if (moveBonus > 0) {
        gameScore[mover] += moveBonus;
        UI.updateScoreUI(gameScore.w, gameScore.b);
        UI.pulseScore(mover);
    }

    // ── Sound & highlights ────────────────────────────────
    if (status.status === 'checkmate') { soundType = 'victory'; soundPiece = null; }
    else if (status.status === 'check') { soundType = 'check';  soundPiece = null; }
    AudioSystem.play(soundType, soundPiece);

    BoardRenderer.updateHighlights(null, [], currentPlayer, board);
    UI.highlightActiveTurn(currentPlayer);
    _applyGameStatus(status);
    // v.015: Kill Announcer + Move Timeline notification
    if (typeof Announcer !== 'undefined') {
        const announcerOpts = {
            moving:      moving,
            captured:    captured,
            mover:       mover,
            from:        from,
            to:          to,
            isCastling:  isCastling,
            isEnPassant: isEnPassant,
            isPromotion: isPromotion,
            promotedTo:  pieceToPlace !== moving ? pieceToPlace : null,
            isCheck:     status.status === 'check',
            isCheckmate: status.status === 'checkmate',
            ply:         reviewHistory.length + 1,
        };
        Announcer.onMove(announcerOpts);

        // v.021: store the position so the Move Timeline can be replayed
        _snapshotPosition(announcerOpts.notationOut || '');
        if (typeof window.__astroReviewGrew === 'function') window.__astroReviewGrew();
    } else {
        // Announcer unavailable: still record the position for review
        _snapshotPosition('');
    }

    // v.021: keep the resumable snapshot current
    _scheduleSave();

    // ── Schedule CPU turn if applicable ──────────────────
    if (!gameOver && !pendingPromotion && gameMode === 'cpu' && currentPlayer === cpuColor) {
        _scheduleCpuTurn();
    }
}

// ═══════════════════════════════════════════════════════════
// CPU Turn
// ═══════════════════════════════════════════════════════════

function _scheduleCpuTurn() {
    // Small human-feeling delay (400700ms)
    const delay = 400 + Math.random() * 300;
    setTimeout(_cpuTurn, delay);
}

function _cpuTurn() {
    if (gameOver || pendingPromotion || currentPlayer !== cpuColor) return;

    const move = CPU.getMove(board, castlingRights, enPassantTarget, cpuDifficulty);
    if (!move) return;

    // CPU always auto-promotes to queen
    const piece     = board[move.from.r][move.from.c];
    const autoPromo = (piece && piece.toLowerCase() === 'p' && (move.to.r === 0 || move.to.r === 7))
        ? (cpuColor === 'b' ? 'q' : 'Q')
        : null;

    _processMove(move.from, move.to, autoPromo);
}

// ═══════════════════════════════════════════════════════════
// Status Management
// ═══════════════════════════════════════════════════════════

function _applyGameStatus(status) {
    const playerStr = currentPlayer === 'w' ? 'White' : 'Black';

    switch (status.status) {
        case 'checkmate': {
            gameOver = true;
            Timer.stop();
            const winner = status.winner === 'w' ? 'White' : 'Black';
            _setStatus(`Checkmate! ${winner} wins!`, 'danger');
            // v.011: contextual sounds  defeat if black wins (human loses)
            if (status.winner === 'b') AudioSystem.play('defeat');
            setTimeout(() => _showGameEndModal({ status: 'checkmate', winner: status.winner }), 550);
            break;
        }
        case 'stalemate':
            gameOver = true;
            Timer.stop();
            _setStatus('Stalemate  Draw!', 'muted');
            // v.011: draw sound
            AudioSystem.play('draw');
            setTimeout(() => _showGameEndModal({ status: 'stalemate', winner: null }), 550);
            break;

        case 'check':
            _setStatus(`Check! ${playerStr}'s turn`, 'warning');
            break;

        default:
            _setStatus(`${playerStr}'s Turn`, 'info');
    }
}

function _handleTimeout(winner) {
    gameOver = true;
    const w = winner === 'w' ? 'White' : 'Black';
    _setStatus(`Time's up! ${w} wins!`, 'danger');
    // v.011: contextual sounds on timeout
    if (winner === 'w') AudioSystem.play('victory');
    else                AudioSystem.play('defeat');
    setTimeout(() => _showGameEndModal({ status: 'timeout', winner }), 300);
}

/**
 * Build the full game-end payload, update profile, and show modal.
 */
function _showGameEndModal(result) {
    // v.021: a finished game is no longer resumable
    clearSavedGame();
    if (typeof Analytics !== 'undefined') {
        Analytics.track('game_end', {
            mode: gameMode,
            difficulty: gameMode === 'cpu' ? cpuDifficulty : null,
            result: gameResult,
            moves: moveCount,
            duration
        });
    }

    const profile    = ProfileSystem.getProfile();
    const duration   = gameStartTime ? Math.round((Date.now() - gameStartTime) / 1000) : 0;
    let   eloChange  = undefined;
    let   newElo     = undefined;
    let   gameResult = 'draw';

    // Determine result from white's / human's perspective
    if (result.winner === 'w')       gameResult = 'win';
    else if (result.winner === 'b')  gameResult = 'loss';
    else                              gameResult = 'draw';   // stalemate / timeout draw

    // v.011: find most used piece
    let mostUsedPiece = null;
    let maxMoves = 0;
    for (const [p, cnt] of Object.entries(pieceMoveCounts)) {
        if (cnt > maxMoves) { maxMoves = cnt; mostUsedPiece = p; }
    }

    // Elo & history
    if (profile) {
        if (gameMode === 'cpu') {
            eloChange = ProfileSystem.updateElo(gameResult, cpuDifficulty);
            newElo    = ProfileSystem.getProfile().elo;
        }
        ProfileSystem.addGameToHistory({
            date:        new Date().toISOString(),
            mode:        gameMode === 'cpu' ? `cpu-${cpuDifficulty}` : 'local',
            result:      gameResult,
            eloChange:   eloChange || 0,
            playerScore: gameScore.w,
            oppScore:    gameScore.b,
            moves:       moveCount,
            duration,
            // v.011 extended fields
            checksGiven,
            piecesLost,
            captureCount,
            capturedQueen,
            promotions,
            didCastle,
            matePiece,
            mostUsedPiece,
        });
        UI.updateProfileCard();

        // v.014: Solo Player Progression (Plaza)
        if (gameMode === 'cpu' && typeof PlazaSystem !== 'undefined' && currentCpuProfile) {
            const won = gameResult === 'win';
            PlazaSystem.recordMatchResult(currentCpuProfile.id, won);
            if (won) {
                const wasNew = PlazaSystem.unlockOpponent(currentCpuProfile);
                if (wasNew) {
                    setTimeout(() => {
                        UI.showToast(`¡Desbloqueaste a ${currentCpuProfile.username}!`, 'success');
                    }, 1000);
                }
            }
        }
    }

    // v.011: Check achievements
    let newlyUnlocked = [];
    if (typeof AchievementSystem !== 'undefined') {
        // Count cpu-medium wins from full history for the milestone check
        const history = ProfileSystem.getHistory();
        const cpuMedWins = history.filter(r => r.mode === 'cpu-medium' && r.result === 'win').length;

        newlyUnlocked = AchievementSystem.check({
            result:        gameResult,
            mode:          gameMode,
            difficulty:    cpuDifficulty,
            moves:         moveCount,
            duration,
            checksGiven,
            piecesLost,
            captureCount,
            capturedQueen,
            promotions,
            didCastle,
            matePiece,
            playerScore:   gameScore.w,
            profile:       ProfileSystem.getProfile(),
            cpuMediumWins: cpuMedWins,
        });

        // Play achievement sound + show toast for each newly unlocked
        newlyUnlocked.forEach((ach, i) => {
            setTimeout(() => {
                AudioSystem.play('achievement');
                UI.showToast(`🏆 Logro: ${ach.name}`, 'success');
            }, 1800 + i * 1200);
        });
    }

    // Label for names in modal
    const playerName = profile ? profile.username : 'White';
    const cpuLabel   = gameMode === 'cpu'
        ? `${currentCpuProfile.username} (${cpuDifficulty === 'medium' ? 'Med' : 'Easy'})`
        : 'Black';

    UI.showGameOverModal({
        ...result,
        scoreW:        gameScore.w,
        scoreB:        gameScore.b,
        playerName,
        cpuLabel,
        eloChange,
        newElo,
        // v.011 stats
        moves:         moveCount,
        duration,
        checksGiven,
        piecesLost,
        captureCount,
        mostUsedPiece,
        gameResult,
        newlyUnlocked,
        difficulty:    cpuDifficulty,
    });
}

const STATUS_COLORS = {
    info:    '#38bdf8',
    warning: '#f97316',
    danger:  '#ef4444',
    muted:   '#64748b',
};

function _setStatus(text, style) {
    statusEl.textContent = text;
    statusEl.style.color = STATUS_COLORS[style] || STATUS_COLORS.info;
    statusEl.classList.remove('status-punch');
    void statusEl.offsetWidth;
    statusEl.classList.add('status-punch');
}

// ═══════════════════════════════════════════════════════════
// v.021  Move-log review history & in-progress game persistence
// ═══════════════════════════════════════════════════════════

/**
 * One entry per ply. Storing a deep copy of the position is what makes
 * click-to-review possible without ever re-deriving chess rules  the board
 * is simply replayed from a snapshot.
 */
let reviewHistory = [];   // [{ board, currentPlayer, castlingRights, enPassantTarget,
                          //    capturedPieces, notation, ply }]

function _snapshotPosition(notation) {
    reviewHistory.push({
        ply:              reviewHistory.length + 1,
        notation:         notation || '',
        board:            board.map(row => row.slice()),
        currentPlayer,
        castlingRights:   JSON.parse(JSON.stringify(castlingRights)),
        enPassantTarget:  enPassantTarget ? { ...enPassantTarget } : null,
        capturedPieces:   JSON.parse(JSON.stringify(capturedPieces)),
    });
}

function _resetReviewHistory() {
    reviewHistory = [];
    if (typeof window.__astroReviewReset === 'function') window.__astroReviewReset();
}

// ── Persistence ───────────────────────────────────────────

const SAVE_KEY = 'astrochess_in_progress';
let _saveTimer = null;

/** Persist the current game so the Home screen can offer "Resume". */
function saveGameInProgress() {
    try {
        // A finished game must not be resumable
        if (gameOver) { localStorage.removeItem(SAVE_KEY); return; }

        // Nothing meaningful to resume before the first move
        if (!reviewHistory.length) { localStorage.removeItem(SAVE_KEY); return; }

        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version:        1,
            savedAt:        Date.now(),
            mode:           gameMode,
            difficulty:     cpuDifficulty,
            board,
            currentPlayer,
            castlingRights,
            enPassantTarget,
            capturedPieces,
            gameScore,
            moveCount,
            startedAt:      gameStartTime,
            isFlipped,
            selectedMinutes,
            checksGiven, piecesLost, captureCount, capturedQueen,
            promotions, didCastle, matePiece, pieceMoveCounts,
            cpuProfile:     currentCpuProfile,
            remaining:      (typeof Timer !== 'undefined' && Timer.snapshot) ? Timer.snapshot() : null,
            reviewHistory,
        }));
    } catch { /* storage unavailable or full  resuming is simply unavailable */ }
}

/** Debounced save, so a fast move sequence writes once. */
function _scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveGameInProgress, 400);
}

function clearSavedGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/** @returns {object|null} the stored game, or null when there is none. */
function loadSavedGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== 1) return null;
        // Sanity: a stale or corrupted payload must not break the boot
        if (!Array.isArray(data.board) || data.board.length !== 8) return null;
        if (!data.reviewHistory || !data.reviewHistory.length) return null;
        return data;
    } catch { return null; }
}

/** Human summary used by the Resume card on the Home screen. */
function describeSavedGame() {
    const data = loadSavedGame();
    if (!data) return null;
    const human = (data.currentPlayer === 'w') ? 'Blancas' : 'Negras';
    const opp = data.mode === 'cpu' && data.cpuProfile
        ? data.cpuProfile.username
        : 'Local';
    const plies = data.reviewHistory.length;
    const mins = Math.max(0, Math.round((Date.now() - (data.savedAt || Date.now())) / 60000));
    const when = mins < 1 ? 'hace un momento'
              : mins < 60 ? `hace ${mins} min`
              : `hace ${Math.round(mins / 60)} h`;
    return {
        opponent: opp,
        mode: data.mode,
        difficulty: data.difficulty,
        turn: human,
        plies,
        moves: Math.ceil(plies / 2),
        when,
        elapsed: ((data.gameStartTime || data.startedAt)
            ? (data.startedAt ? Date.now() - data.startedAt : 0) : 0),
    };
}

/** Restore a saved game and jump straight to the board. */
function resumeSavedGame() {
    const data = loadSavedGame();
    if (!data) return false;

    selectedMinutes = data.selectedMinutes || DEFAULT_TIME_MINUTES;
    window._selectedCpuNpc = null;

    // initGame rebuilds the board, clocks, panels and review history from the
    // payload. The experience layer then re-renders the Move Timeline chips.
    initGame(data.mode, data.difficulty, data);
    return true;
}

// ═══════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════

function _updateCapturedUI() {
    // Pieces captured BY white are the black pieces white took  show them as black (with outline)
    capturedByWhiteEl.className = 'captured-pieces by-white';
    capturedByWhiteEl.innerHTML = capturedPieces.w
        .map(p => {
            // capturedPieces.w = pieces white captured (they are black pieces, lowercase)
            const isBlackPiece = p === p.toLowerCase();
            return `<i class="fa-solid ${PIECE_MAP[p]} ${isBlackPiece ? 'cap-b' : 'cap-w'}"></i>`;
        }).join('');

    // Pieces captured BY black are the white pieces black took  show them as white
    capturedByBlackEl.className = 'captured-pieces by-black';
    capturedByBlackEl.innerHTML = capturedPieces.b
        .map(p => {
            const isWhitePiece = p === p.toUpperCase();
            return `<i class="fa-solid ${PIECE_MAP[p]} ${isWhitePiece ? 'cap-w' : 'cap-b'}"></i>`;
        }).join('');

    // v.021: material advantage readout beside the trays
    if (typeof window.__astroMaterial === 'function') {
        window.__astroMaterial(capturedPieces);
    }
}

// ═══════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════

// Time-control buttons  update selection and close dropdown + refresh label
document.querySelectorAll('.btn-time').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't close the dropdown
        document.querySelectorAll('.btn-time').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMinutes = parseInt(btn.dataset.minutes, 10);
        // Update the displayed current value
        const valEl = document.getElementById('ctrl-time-val');
        if (valEl) valEl.textContent = `${selectedMinutes} min`;
        // Auto-close the dropdown after a short delay
        setTimeout(() => {
            const dd = document.getElementById('ctrl-time-dropdown');
            const trigger = document.getElementById('ctrl-time-trigger');
            if (dd) dd.classList.add('hidden');
            if (trigger) trigger.classList.remove('open');
        }, 600);
    });
});

// ── Home screen dropdown toggles (Time + Skin + Board) ──────────────
(() => {
    const timeTrigger    = document.getElementById('ctrl-time-trigger');
    const timeDrop       = document.getElementById('ctrl-time-dropdown');
    const skinTrigger    = document.getElementById('ctrl-skin-trigger');
    const skinDrop       = document.getElementById('ctrl-skin-dropdown');
    const boardTrigger   = document.getElementById('ctrl-board-trigger');
    const boardDrop      = document.getElementById('ctrl-board-dropdown');

    function toggleDropdown(trigger, drop) {
        const isOpen = !drop.classList.contains('hidden');
        // Close all first
        [timeDrop, skinDrop, boardDrop].forEach(d => d && d.classList.add('hidden'));
        [timeTrigger, skinTrigger, boardTrigger].forEach(t => t && t.classList.remove('open'));
        if (!isOpen) {
            drop.classList.remove('hidden');
            trigger.classList.add('open');
        }
    }

    if (timeTrigger && timeDrop) {
        timeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(timeTrigger, timeDrop);
        });
    }

    if (skinTrigger && skinDrop) {
        skinTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(skinTrigger, skinDrop);
        });
    }

    if (boardTrigger && boardDrop) {
        boardTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(boardTrigger, boardDrop);
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        const path = e.composedPath();
        if (timeDrop && !path.includes(timeDrop) && e.target.closest('#ctrl-time-trigger') !== timeTrigger) {
            timeDrop.classList.add('hidden');
            timeTrigger?.classList.remove('open');
        }
        if (skinDrop && !path.includes(skinDrop) && e.target.closest('#ctrl-skin-trigger') !== skinTrigger) {
            skinDrop.classList.add('hidden');
            skinTrigger?.classList.remove('open');
        }
        if (boardDrop && !path.includes(boardDrop) && e.target.closest('#ctrl-board-trigger') !== boardTrigger) {
            boardDrop.classList.add('hidden');
            boardTrigger?.classList.remove('open');
        }
    });
})();

// ── Global Music FAB (Disco Flotante) Wiring ─────────────────────────
(() => {
    const fab   = document.getElementById('global-music-fab');
    const panel = document.getElementById('global-audio-panel');
    if (!fab || !panel) return;

    // Toggle panel on click
    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
        // v.021: keep the button's expanded state truthful for assistive tech
        fab.setAttribute('aria-expanded', panel.classList.contains('hidden') ? 'false' : 'true');
    });

    // Close panel on outside click
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
            panel.classList.add('hidden');
            fab.setAttribute('aria-expanded', 'false');
        }
    });

    // Update FAB state (spinning / muted) based on MusicSystem
    function _syncFabState() {
        if (typeof MusicSystem === 'undefined') return;
        const isPlaying = MusicSystem.isPlaying();
        const isMuted   = MusicSystem.isMuted();
        fab.classList.toggle('playing', isPlaying && !isMuted);
        fab.classList.toggle('muted',   isMuted);
        const icon = fab.querySelector('i');
        if (icon) {
            icon.className = isMuted
                ? 'fa-solid fa-volume-xmark'
                : 'fa-solid fa-music';
        }
    }

    setInterval(_syncFabState, 800);
    _syncFabState();
})();


// Start local match
document.getElementById('btn-mode-local').addEventListener('click', () => {
    AudioSystem.resume();
    UI.switchScreen('loading-screen');
    setTimeout(() => {
        initGame('local');
        UI.switchScreen('game-screen');
        UI.showToast('Match started  Good luck!', 'info');
    }, 600);
});

// Start vs CPU (opens the new Solo Player Hub)
document.getElementById('btn-mode-ai').addEventListener('click', () => {
    AudioSystem.resume();
    if (typeof UI.showCpuHub === 'function') {
        UI.showCpuHub();
    }
});

// Online (still coming soon)
document.querySelector('.btn-soon')?.addEventListener('click', () =>
    UI.showToast('Online mode is coming soon!', 'warning')
);

// History
document.getElementById('btn-history').addEventListener('click', () => {
    UI.showHistoryScreen();
});

// Logros (v.011)
document.getElementById('btn-achievements')?.addEventListener('click', () => {
    UI.showAchievementsModal();
});


// Back from history → home
document.getElementById('btn-back-from-history').addEventListener('click', () => {
    UI.switchScreen('home-screen');
    if (typeof UI.initParallaxHero === 'function') UI.initParallaxHero();
});

// Back to menu from game
document.getElementById('btn-back-menu').addEventListener('click', () => {
    if (!gameOver) {
        UI.showExitConfirmModal(() => {
            Timer.stop();
            if (typeof MusicSystem !== 'undefined') MusicSystem.setContext('lobby');
            UI.switchScreen('home-screen');
            if (typeof UI.initParallaxHero === 'function') UI.initParallaxHero();
        });
        return;
    }
    Timer.stop();
    if (typeof MusicSystem !== 'undefined') MusicSystem.setContext('lobby');
    UI.switchScreen('home-screen');
    if (typeof UI.initParallaxHero === 'function') UI.initParallaxHero();
});

// Flip board
document.getElementById('btn-flip').addEventListener('click', () => {
    isFlipped = !isFlipped;
    BoardRenderer.flipBoard(isFlipped);
    // v.021: let keyboard navigation know the orientation
    const wrapper = document.getElementById('board-wrapper');
    if (wrapper) wrapper.dataset.flipped = isFlipped ? '1' : '0';
    UI.showToast(isFlipped ? 'Board flipped  Black perspective' : 'Board flipped  White perspective', 'info');
});

// Reset game
// Reset game
document.getElementById('btn-reset').addEventListener('click', () => {
    if (gameOver) return;
    UI.showExitConfirmModal(() => {
        initGame(gameMode, cpuDifficulty);
        UI.showToast('Game reset', 'info');
    }, {
        title: 'Reiniciar partida',
        subtitle: '¿Estás seguro? El tablero volverá a su estado inicial.',
        confirmText: 'Reiniciar',
        icon: 'fa-solid fa-arrow-rotate-right'
    });
});

// Resign game
document.getElementById('btn-resign').addEventListener('click', () => {
    if (gameOver) return;
    UI.showExitConfirmModal(() => {
        gameOver = true;
        Timer.stop();
        const winner = (gameMode === 'cpu') ? cpuColor : (currentPlayer === 'w' ? 'b' : 'w');
        const winnerName = winner === 'w' ? 'White' : 'Black';
        _setStatus(`¡Rendición! ${winnerName} gana.`, 'danger');
        
        if (winner === 'b') {
            if (typeof AudioSystem !== 'undefined') AudioSystem.play('defeat');
        } else {
            if (typeof AudioSystem !== 'undefined') AudioSystem.play('victory');
        }
        
        setTimeout(() => _showGameEndModal({ status: 'resign', winner: winner }), 550);
    }, {
        title: 'Rendirse',
        subtitle: '¿Estás seguro que deseas rendirte?',
        confirmText: 'Rendirse',
        icon: 'fa-solid fa-flag'
    });
});
// In-game Trading Card triggers
document.getElementById('panel-white').addEventListener('click', () => {
    const profile = ProfileSystem.getProfile();
    if (profile) {
        UI.showTradingCard(profile, false);
    }
});

document.getElementById('panel-black').addEventListener('click', () => {
    if (gameMode === 'cpu' && currentCpuProfile) {
        UI.showTradingCard(currentCpuProfile, true);
    } else {
        // Local mode fallback
        UI.showToast('Solo en modo CPU o con perfil', 'info');
    }
});

// Skin button in game controls  toggles an inline skin panel
(() => {
    const skinBtn = document.getElementById('btn-skin-game');
    if (!skinBtn) return;

    // Build the panel once
    const panel = document.createElement('div');
    panel.id = 'skin-panel-game';
    panel.className = 'skin-panel-game hidden';

    const label = document.createElement('p');
    label.className = 'menu-section-label';
    label.innerHTML = '<i class="fa-solid fa-palette"></i> Piece Skin';

    const selector = document.createElement('div');
    selector.className = 'skin-selector';
    selector.id = 'skin-selector-game';

    panel.appendChild(label);
    panel.appendChild(selector);

    // Insert after the controls div
    const controls = skinBtn.closest('.controls');
    if (controls) controls.insertAdjacentElement('afterend', panel);

    const onSkinChange = (/*skinId*/) => {
        // Refresh all skin selectors
        UI.renderSkinSelector(
            document.getElementById('skin-selector-menu'),
            onSkinChange
        );
        UI.renderSkinSelector(selector, onSkinChange);
        // Live-refresh the board with the new skin
        if (board && board.length) {
            BoardRenderer.refreshSkin(board, isFlipped);
        }
        UI.showToast(`Skin changed to "${SkinManager.getActiveSkin().name}"`, 'info');
    };

    UI.renderSkinSelector(selector, onSkinChange);

    skinBtn.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        // close board panel if open
        const boardPanel = document.getElementById('board-panel-game');
        if (boardPanel) boardPanel.classList.add('hidden');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== skinBtn && !skinBtn.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
})();

// Board Settings button in game controls
(() => {
    const boardBtn = document.getElementById('btn-board-game');
    if (!boardBtn) return;

    // We reuse the UI.renderBoardSettings logic by creating the required elements with the SAME IDs it expects,
    // but since IDs must be unique, we'll actually update UI.js renderBoardSettings to support dual rendering later if needed.
    // For now, it's easier to just open the home screen dropdown logic positioned above the board button!
    // But since the home screen is hidden, it's safer to clone the structure and wire it manually here.
    
    const panel = document.createElement('div');
    panel.id = 'board-panel-game';
    panel.className = 'skin-panel-game hidden'; // reuse skin panel styling
    panel.innerHTML = `
        <div class="menu-section-label"><i class="fa-solid fa-chess-board"></i> Board Settings</div>
        <div style="margin-bottom: 8px;">
            <label style="font-size: 0.65rem; color: var(--text-soft); font-weight: bold;">Theme:</label>
            <div class="board-theme-selector skin-selector" id="game-board-theme-menu"></div>
        </div>
        <div>
            <label style="font-size: 0.65rem; color: var(--text-soft); font-weight: bold; display: flex; justify-content: space-between;">
                Opacity: <span id="game-board-opacity-label"></span>
            </label>
            <input type="range" id="game-board-opacity-slider" min="0.2" max="1.0" step="0.05" style="width: 100%;">
        </div>
    `;

    const controls = boardBtn.closest('.controls');
    if (controls) controls.insertAdjacentElement('afterend', panel);

    // Build the themes manually since UI.js is hardcoded to home IDs
    const themes = [
        { id: 'classic', name: 'Classic Green', color: '#476a44' },
        { id: 'neon',    name: 'Neon Purple',   color: '#702963' },
        { id: 'ocean',   name: 'Ocean Blue',    color: '#191970' },
        { id: 'ruby',    name: 'Ruby Red',      color: '#8B0000' }
    ];
    
    const themeMenu = document.getElementById('game-board-theme-menu');
    const opacitySlider = document.getElementById('game-board-opacity-slider');
    const opacityLabel = document.getElementById('game-board-opacity-label');

    function renderGameBoardOptions() {
        const currentSettings = ProfileSystem.getBoardSettings();
        
        themeMenu.innerHTML = '';
        themes.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `skin-option ${t.id === currentSettings.theme ? 'selected' : ''}`;
            btn.innerHTML = `<span class="skin-icon" style="color: ${t.color}">■</span><span class="skin-name">${t.name}</span>`;
            
            btn.addEventListener('click', () => {
                ProfileSystem.setBoardSettings(t.id, parseFloat(opacitySlider.value));
                BoardRenderer.applyBoardTheme(t.id, parseFloat(opacitySlider.value));
                renderGameBoardOptions();
                // Also trigger home UI re-render (which reads from Profile)
                if (typeof UI.renderBoardSettings === 'function') UI.renderBoardSettings();
            });
            themeMenu.appendChild(btn);
        });

        opacitySlider.value = currentSettings.opacity;
        opacityLabel.textContent = currentSettings.opacity;
    }

    renderGameBoardOptions();

    opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        opacityLabel.textContent = val.toFixed(2);
        BoardRenderer.applyBoardTheme(ProfileSystem.getBoardSettings().theme, val);
    });

    opacitySlider.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        ProfileSystem.setBoardSettings(ProfileSystem.getBoardSettings().theme, val);
        if (typeof UI.renderBoardSettings === 'function') UI.renderBoardSettings();
    });

    boardBtn.addEventListener('click', () => {
        renderGameBoardOptions(); // refresh in case it was changed elsewhere
        panel.classList.toggle('hidden');
        // close skin panel if open
        const skinPanel = document.getElementById('skin-panel-game');
        if (skinPanel) skinPanel.classList.add('hidden');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== boardBtn && !boardBtn.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
})();

// Game-over modal: Play Again
document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
    UI.hideGameOverModal();
    initGame(gameMode, cpuDifficulty);
});

// Game-over modal: Main Menu
document.getElementById('btn-gameover-menu').addEventListener('click', () => {
    UI.hideGameOverModal();
    Timer.stop();
    if (typeof MusicSystem !== 'undefined') MusicSystem.setContext('lobby');
    UI.switchScreen('home-screen');
});

// Game-over modal: View History
document.getElementById('btn-gameover-history').addEventListener('click', () => {
    UI.hideGameOverModal();
    UI.showHistoryScreen();
});

// ═══════════════════════════════════════════════════════════
// Mobile / Viewport Fixes
// ═══════════════════════════════════════════════════════════

function _setVh() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
_setVh();
window.addEventListener('resize', _setVh);

// touchmove listener removed to fix touch scrolling

// ═══════════════════════════════════════════════════════════
// Boot
// ═══════════════════════════════════════════════════════════

// Show profile card on load
UI.updateProfileCard();

// Initialise home parallax hero (v.012)
if (typeof UI.initParallaxHero === 'function') {
    UI.initParallaxHero();
}

// Initialise menu skin selector and board settings
(() => {
    const menuSel = document.getElementById('skin-selector-menu');
    const onSkinChange = (/*skinId*/) => {
        // Keep menu + game selectors in sync
        UI.renderSkinSelector(
            document.getElementById('skin-selector-menu'),
            onSkinChange
        );
        UI.renderSkinSelector(
            document.getElementById('skin-selector-game'),
            onSkinChange
        );
        // Live-refresh board if a game is running
        if (board && board.length) {
            BoardRenderer.refreshSkin(board, isFlipped);
        }
        UI.showToast(`Skin changed to "${SkinManager.getActiveSkin().name}"`, 'info');
    };
    UI.renderSkinSelector(menuSel, onSkinChange);

    // Initialise board settings logic on home screen
    if (typeof UI.renderBoardSettings === 'function') {
        UI.renderBoardSettings();
    }
})();

// ── Audio Settings Panel Wiring ──────────────────────────────
(() => {
    const musicSlider = document.getElementById('audio-music-slider');
    const sfxSlider   = document.getElementById('audio-sfx-slider');
    const btnMute     = document.getElementById('btn-audio-mute');
    const iconMute    = document.getElementById('icon-audio-mute');
    const btnNext     = document.getElementById('btn-audio-next');
    const btnPrev     = document.getElementById('btn-audio-prev'); // Optional depending on UI logic
    const trackLabel  = document.getElementById('audio-track-name');

    if (!musicSlider || typeof MusicSystem === 'undefined') return;

    // Init UI from system state
    musicSlider.value = MusicSystem.getMusicVolume();
    sfxSlider.value   = MusicSystem.getSfxVolume();
    _updateMuteIcon(MusicSystem.isMuted());

    function _updateMuteIcon(muted) {
        if (iconMute) {
            iconMute.className = muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
    }

    function _updateTrackLabel() {
        if (trackLabel) {
            const name = MusicSystem.getCurrentTrackName();
            trackLabel.textContent = name ? name : (MusicSystem.hasTracksForContext() ? 'Playing...' : 'No tracks in folder');
        }
    }

    // Refresh label periodically since tracks can auto-advance
    setInterval(_updateTrackLabel, 1000);

    musicSlider.addEventListener('input', (e) => {
        MusicSystem.setMusicVolume(parseFloat(e.target.value));
    });

    sfxSlider.addEventListener('input', (e) => {
        MusicSystem.setSfxVolume(parseFloat(e.target.value));
    });

    btnMute.addEventListener('click', () => {
        const isMuted = MusicSystem.toggleMute();
        _updateMuteIcon(isMuted);
    });

    btnNext.addEventListener('click', () => {
        MusicSystem.next();
        _updateTrackLabel();
    });

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            // Next is sufficient for random shuffle
            MusicSystem.next(); 
            _updateTrackLabel();
        });
    }
})();

// In-game Audio Settings Panel (clones the home dropdown logic for the game screen)
(() => {
    const audioBtn = document.getElementById('btn-audio-game');
    if (!audioBtn || typeof MusicSystem === 'undefined') return;

    const panel = document.createElement('div');
    panel.id = 'audio-panel-game';
    panel.className = 'skin-panel-game hidden'; 
    panel.innerHTML = `
        <div class="menu-section-label"><i class="fa-solid fa-music"></i> Audio Settings</div>
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span id="game-audio-track-name" style="font-size: 0.75rem; color: var(--accent-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">---</span>
            <div style="display: flex; gap: 8px;">
                <button id="btn-game-audio-next" class="btn-audio-small"><i class="fa-solid fa-forward-step"></i></button>
            </div>
        </div>
        <div style="margin-bottom: 12px;">
            <label style="font-size: 0.65rem; color: var(--text-soft); font-weight: bold; display: flex; justify-content: space-between;">
                Música <button id="btn-game-audio-mute" style="background: none; border: none; color: inherit; cursor: pointer;"><i class="fa-solid fa-volume-high" id="icon-game-audio-mute"></i></button>
            </label>
            <input type="range" id="game-audio-music-slider" min="0" max="1" step="0.05" style="width: 100%;">
        </div>
        <div>
            <label style="font-size: 0.65rem; color: var(--text-soft); font-weight: bold;">Efectos (SFX)</label>
            <input type="range" id="game-audio-sfx-slider" min="0" max="1" step="0.05" style="width: 100%;">
        </div>
    `;

    const controls = audioBtn.closest('.controls');
    if (controls) controls.insertAdjacentElement('afterend', panel);

    const mSlider = document.getElementById('game-audio-music-slider');
    const sSlider = document.getElementById('game-audio-sfx-slider');
    const muteBtn = document.getElementById('btn-game-audio-mute');
    const muteIcon = document.getElementById('icon-game-audio-mute');
    const nextBtn = document.getElementById('btn-game-audio-next');
    const trackLabel = document.getElementById('game-audio-track-name');

    function syncPanel() {
        mSlider.value = MusicSystem.getMusicVolume();
        sSlider.value = MusicSystem.getSfxVolume();
        muteIcon.className = MusicSystem.isMuted() ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        const name = MusicSystem.getCurrentTrackName();
        trackLabel.textContent = name ? name : '---';
    }

    // Since settings can be changed from the home menu, sync when opened
    audioBtn.addEventListener('click', () => {
        syncPanel();
        panel.classList.toggle('hidden');
        // Close others
        ['skin-panel-game', 'board-panel-game'].forEach(id => {
            const p = document.getElementById(id);
            if (p) p.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== audioBtn && !audioBtn.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });

    mSlider.addEventListener('input', (e) => MusicSystem.setMusicVolume(parseFloat(e.target.value)));
    sSlider.addEventListener('input', (e) => MusicSystem.setSfxVolume(parseFloat(e.target.value)));
    
    muteBtn.addEventListener('click', () => {
        const isMuted = MusicSystem.toggleMute();
        muteIcon.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        
        // sync home panel too
        const homeIcon = document.getElementById('icon-audio-mute');
        if (homeIcon) homeIcon.className = muteIcon.className;
    });

    nextBtn.addEventListener('click', () => {
        MusicSystem.next();
        syncPanel();
    });

    setInterval(() => {
        if (!panel.classList.contains('hidden')) syncPanel();
    }, 1000);
})();


// v.021: make sure the resumable snapshot survives leaving the page
window.addEventListener('pagehide', () => {
    if (typeof saveGameInProgress === 'function') saveGameInProgress();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof saveGameInProgress === 'function') saveGameInProgress();
});

// Config menu toggle
document.getElementById('btn-config-game')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('game-options-menu')?.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
    const menu = document.getElementById('game-options-menu');
    const btn = document.getElementById('btn-config-game');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});
