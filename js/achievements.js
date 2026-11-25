/* =========================================================
   achievements.js — Achievement system for Astro~Chess (v.011)

   Categories:
     🤖 CPU        — Beating CPU at various difficulties
     ⚡ Speed       — Winning fast (time / turns)
     ♟  Tactics     — Specific mating patterns / moves
     🏆 Domination  — Overwhelming victories
     📈 Progress    — Cumulative milestones

   Storage: localStorage['astrochess_achievements']
   ========================================================= */

'use strict';

const AchievementSystem = (() => {

    const STORAGE_KEY = 'astrochess_achievements';

    // ─────────────────────────────────────────────────────
    // Achievement Definitions
    // ─────────────────────────────────────────────────────

    const ACHIEVEMENTS = [

        // ── 🤖 vs CPU ──────────────────────────────────────
        {
            id: 'cpu_easy_first',
            category: 'cpu',
            icon: '🤖',
            name: 'Rookie Slayer',
            desc: 'Derrota a la CPU en dificultad Fácil por primera vez.',
            secret: false,
        },
        {
            id: 'cpu_medium_first',
            category: 'cpu',
            icon: '🧠',
            name: 'Mind Breaker',
            desc: 'Derrota a la CPU en dificultad Media. ¡Nada mal, humano!',
            secret: false,
        },
        {
            id: 'cpu_both',
            category: 'cpu',
            icon: '⚙️',
            name: 'Full Override',
            desc: 'Vence a la CPU en ambas dificultades. La máquina dobló.',
            secret: false,
        },
        {
            id: 'cpu_medium_5',
            category: 'cpu',
            icon: '👑',
            name: 'El Dominante',
            desc: 'Vence a la CPU Media 5 veces. Eres su pesadilla.',
            secret: false,
        },

        // ── ⚡ Speed ────────────────────────────────────────
        {
            id: 'speed_under5min',
            category: 'speed',
            icon: '⚡',
            name: 'Relámpago',
            desc: 'Gana una partida en menos de 5 minutos de reloj.',
            secret: false,
        },
        {
            id: 'speed_under10turns',
            category: 'speed',
            icon: '💨',
            name: 'Scholar\'s Ghost',
            desc: 'Gana en 10 turnos o menos. El ajedrez instantáneo.',
            secret: false,
        },
        {
            id: 'speed_under20turns',
            category: 'speed',
            icon: '🏎️',
            name: 'Blitz Maestro',
            desc: 'Gana en 20 turnos o menos.',
            secret: false,
        },
        {
            id: 'speed_flawless_fast',
            category: 'speed',
            icon: '🌟',
            name: 'Perfección Pura',
            desc: 'Gana en < 15 turnos sin perder ninguna pieza.',
            secret: true,
        },

        // ── ♟ Tactics ───────────────────────────────────────
        {
            id: 'tactic_knight_mate',
            category: 'tactics',
            icon: '🐴',
            name: 'El Salto Final',
            desc: 'Da jaque mate con un Caballo. ¡Clásico y elegante!',
            secret: false,
        },
        {
            id: 'tactic_bishop_mate',
            category: 'tactics',
            icon: '⛪',
            name: 'La Diagonal Asesina',
            desc: 'Da jaque mate con un Alfil.',
            secret: false,
        },
        {
            id: 'tactic_rook_mate',
            category: 'tactics',
            icon: '🏰',
            name: 'La Muralla Cae',
            desc: 'Da jaque mate con una Torre.',
            secret: false,
        },
        {
            id: 'tactic_queen_mate',
            category: 'tactics',
            icon: '👸',
            name: 'Reina Implacable',
            desc: 'Da jaque mate con la Reina. El poder absoluto.',
            secret: false,
        },
        {
            id: 'tactic_pawn_mate',
            category: 'tactics',
            icon: '♟',
            name: 'El Humilde Asesino',
            desc: 'Da jaque mate con un Peón. ¡Nadie lo vio venir!',
            secret: true,
        },
        {
            id: 'tactic_promo_wins',
            category: 'tactics',
            icon: '🎭',
            name: 'La Coronación',
            desc: 'Gana una partida en la que promoviste al menos un peón.',
            secret: false,
        },
        {
            id: 'tactic_triple_check',
            category: 'tactics',
            icon: '❗',
            name: 'Terror en Tres Actos',
            desc: 'Da 3 o más jaques en una sola partida.',
            secret: false,
        },
        {
            id: 'tactic_castle_and_win',
            category: 'tactics',
            icon: '🏯',
            name: 'Fortaleza Invencible',
            desc: 'Realiza un enroque y gana la partida.',
            secret: false,
        },

        // ── 🏆 Domination ───────────────────────────────────
        {
            id: 'dom_no_losses',
            category: 'domination',
            icon: '🛡️',
            name: 'Intocable',
            desc: 'Gana una partida sin perder ninguna pieza.',
            secret: false,
        },
        {
            id: 'dom_capture_queen',
            category: 'domination',
            icon: '💀',
            name: 'Regicidio',
            desc: 'Captura la Reina del oponente durante la partida.',
            secret: false,
        },
        {
            id: 'dom_10_captures',
            category: 'domination',
            icon: '🔥',
            name: 'Carnívoro',
            desc: 'Captura 10 o más piezas en una sola partida.',
            secret: false,
        },
        {
            id: 'dom_score_200',
            category: 'domination',
            icon: '💯',
            name: 'El Perfectista',
            desc: 'Acumula 200 puntos o más en una sola partida.',
            secret: false,
        },

        // ── 📈 Progress ─────────────────────────────────────
        {
            id: 'prog_first_win',
            category: 'progress',
            icon: '🌱',
            name: 'Primera Sangre',
            desc: 'Gana tu primera partida. ¡El viaje comienza!',
            secret: false,
        },
        {
            id: 'prog_5_wins',
            category: 'progress',
            icon: '🌿',
            name: 'Cinco de Cinco',
            desc: 'Acumula 5 victorias totales.',
            secret: false,
        },
        {
            id: 'prog_10_wins',
            category: 'progress',
            icon: '🌳',
            name: 'Veterano del Tablero',
            desc: 'Acumula 10 victorias totales.',
            secret: false,
        },
        {
            id: 'prog_25_wins',
            category: 'progress',
            icon: '🏅',
            name: 'Gran Maestro Aspirante',
            desc: 'Acumula 25 victorias totales. El camino es largo.',
            secret: false,
        },
        {
            id: 'prog_elo_1400',
            category: 'progress',
            icon: '⚡',
            name: 'Clase B',
            desc: 'Alcanza un Elo de 1400 o más.',
            secret: false,
        },
        {
            id: 'prog_elo_1600',
            category: 'progress',
            icon: '💎',
            name: 'Clase A',
            desc: 'Alcanza un Elo de 1600 o más. Eres un fénómeno.',
            secret: false,
        },
    ];

    // ─────────────────────────────────────────────────────
    // Storage helpers
    // ─────────────────────────────────────────────────────

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { /* storage full */ }
    }

    // ─────────────────────────────────────────────────────
    // Public getters
    // ─────────────────────────────────────────────────────

    /** Returns all achievement definitions */
    function getAll() { return ACHIEVEMENTS; }

    /** Returns all unlocked achievement IDs → { id: { unlockedAt } } */
    function getUnlocked() { return _load(); }

    /** Check if a specific achievement is unlocked */
    function isUnlocked(id) { return !!_load()[id]; }

    /** Returns count of unlocked achievements */
    function getUnlockedCount() { return Object.keys(_load()).length; }

    // ─────────────────────────────────────────────────────
    // Internal unlock helper
    // ─────────────────────────────────────────────────────

    /**
     * Unlock an achievement by ID.
     * @returns {object|null} The achievement definition if newly unlocked, null if already owned.
     */
    function _unlock(id) {
        const store = _load();
        if (store[id]) return null; // already unlocked
        store[id] = { unlockedAt: new Date().toISOString() };
        _save(store);
        return ACHIEVEMENTS.find(a => a.id === id) || null;
    }

    // ─────────────────────────────────────────────────────
    // Main checker — call after every game end
    // ─────────────────────────────────────────────────────

    /**
     * Evaluate all achievements against the completed game data.
     * Returns array of newly unlocked achievement definitions.
     *
     * @param {{
     *   result:          'win'|'loss'|'draw',
     *   mode:            'local'|'cpu',
     *   difficulty:      'easy'|'medium'|undefined,
     *   moves:           number,
     *   duration:        number,       // seconds
     *   checksGiven:     number,
     *   piecesLost:      number,
     *   captureCount:    number,
     *   capturedQueen:   boolean,
     *   promotions:      number,
     *   didCastle:       boolean,
     *   matePiece:       string|null,  // uppercase piece letter e.g. 'N','B','Q','R','P'
     *   playerScore:     number,
     *   profile:         object|null,  // full profile after update
     *   cpuMediumWins:   number,       // wins vs CPU medium in total history
     * }} data
     */
    function check(data) {
        const newly = [];
        const tryUnlock = (id) => {
            const a = _unlock(id);
            if (a) newly.push(a);
        };

        const isWin  = data.result === 'win';
        const isCpu  = data.mode === 'cpu';
        const isMed  = data.difficulty === 'medium';
        const isEasy = data.difficulty === 'easy';
        const profile = data.profile;

        // ── 🤖 CPU ───────────────────────────────────────────
        if (isWin && isCpu && isEasy)  tryUnlock('cpu_easy_first');
        if (isWin && isCpu && isMed)   tryUnlock('cpu_medium_first');

        // Both difficulties beaten
        if (isUnlocked('cpu_easy_first') && isUnlocked('cpu_medium_first')) {
            tryUnlock('cpu_both');
        }

        // 5 medium wins total
        if (isCpu && isMed && isWin && data.cpuMediumWins >= 5) {
            tryUnlock('cpu_medium_5');
        }

        // ── ⚡ Speed ─────────────────────────────────────────
        if (isWin) {
            if (data.duration < 300)                    tryUnlock('speed_under5min');
            if (data.moves <= 10)                       tryUnlock('speed_under10turns');
            if (data.moves <= 20)                       tryUnlock('speed_under20turns');
            if (data.moves <= 15 && data.piecesLost === 0) tryUnlock('speed_flawless_fast');
        }

        // ── ♟ Tactics ────────────────────────────────────────
        if (isWin && data.matePiece) {
            const mp = data.matePiece.toUpperCase();
            if (mp === 'N') tryUnlock('tactic_knight_mate');
            if (mp === 'B') tryUnlock('tactic_bishop_mate');
            if (mp === 'R') tryUnlock('tactic_rook_mate');
            if (mp === 'Q') tryUnlock('tactic_queen_mate');
            if (mp === 'P') tryUnlock('tactic_pawn_mate');
        }
        if (isWin && data.promotions > 0)    tryUnlock('tactic_promo_wins');
        if (isWin && data.checksGiven >= 3)  tryUnlock('tactic_triple_check');
        if (isWin && data.didCastle)         tryUnlock('tactic_castle_and_win');

        // ── 🏆 Domination ────────────────────────────────────
        if (isWin && data.piecesLost === 0)      tryUnlock('dom_no_losses');
        if (data.capturedQueen)                  tryUnlock('dom_capture_queen');
        if (isWin && data.captureCount >= 10)    tryUnlock('dom_10_captures');
        if (isWin && data.playerScore >= 200)    tryUnlock('dom_score_200');

        // ── 📈 Progress ──────────────────────────────────────
        if (isWin) {
            const totalWins = profile ? profile.wins : 0;
            tryUnlock('prog_first_win');
            if (totalWins >= 5)  tryUnlock('prog_5_wins');
            if (totalWins >= 10) tryUnlock('prog_10_wins');
            if (totalWins >= 25) tryUnlock('prog_25_wins');
        }
        if (profile && profile.elo >= 1400) tryUnlock('prog_elo_1400');
        if (profile && profile.elo >= 1600) tryUnlock('prog_elo_1600');

        return newly;
    }

    // ─────────────────────────────────────────────────────
    // Category helpers for the UI
    // ─────────────────────────────────────────────────────

    const CATEGORIES = {
        cpu:        { label: '🤖 vs CPU',       color: '#a78bfa' },
        speed:      { label: '⚡ Velocidad',     color: '#fbbf24' },
        tactics:    { label: '♟ Tácticas',      color: '#34d399' },
        domination: { label: '🏆 Dominación',   color: '#f87171' },
        progress:   { label: '📈 Progreso',      color: '#38bdf8' },
    };

    function getCategories() { return CATEGORIES; }

    // ─────────────────────────────────────────────────────
    // Exports
    // ─────────────────────────────────────────────────────
    return {
        getAll,
        getUnlocked,
        isUnlocked,
        getUnlockedCount,
        getCategories,
        check,
    };

})();
