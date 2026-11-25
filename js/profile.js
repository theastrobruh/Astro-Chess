/* =========================================================
   profile.js  Player profile, Elo system & game history

   Persists all data to localStorage['astrochess_profile'].

   Elo formula: Standard FIDE formula, K=32.
     Expected = 1 / (1 + 10^((oppElo - playerElo) / 400))
     Δelo      = round(K * (score - expected))

   CPU Elo ratings:
     Easy   → dynamic (scales with player)
     Medium → dynamic (scales with player)
   ========================================================= */

'use strict';

const ProfileSystem = (() => {

    const STORAGE_KEY   = 'astrochess_profile';
    const DEFAULT_ELO   = 200;
    const K_FACTOR      = 32;
    const MAX_HISTORY   = 50;

    // ── CPU Elo reference ratings ─────────────────────────
    // These are used as BASE ratings; actual NPC ELO scales with player ELO.
    const CPU_ELO = {
        easy:   900,
        medium: 1450,
    };

    // ── Avatar paths ──────────────────────────────────────
    const PLAYER_AVATAR_COUNT = 6;
    const AVATAR_BASE_PATH    = 'assets/avatars/players/';
    const NPC_AVATAR_PATH     = 'assets/avatars/npc/';

    // ── Internal helpers ──────────────────────────────────

    function _defaultProfile(username) {
        return {
            username:     username || 'Player',
            elo:          DEFAULT_ELO,
            wins:         0,
            losses:       0,
            draws:        0,
            history:      [],
            avatarId:     null,
            googleUser:   null,   // { name, email, photoURL, uid }   // null = use letter-initial fallback. Can be a number or string like "npc:Artemis"
            favoritePiece:'pawn', // Default favorite piece
            boardTheme:   'classic', // classic, neon, ocean, ruby
            boardOpacity: 0.65,      // 0.2 to 1.0
            createdAt:    new Date().toISOString(),
        };
    }

    /**
     * Expected score using the Elo formula.
     */
    function _expected(playerElo, opponentElo) {
        return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    }

    // ── Public API ────────────────────────────────────────

    /** Returns the stored profile object, or null if none exists. */
    function getProfile() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /** Persist a profile object to localStorage. */
    function saveProfile(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { /* localStorage full or unavailable */ }
    }

    /**
     * Create a new profile and save it.
     * @param {string} username
     * @returns {object} The newly created profile.
     */
    function createProfile(username) {
        const profile = _defaultProfile(username.trim());
        saveProfile(profile);
        return profile;
    }

    /**
     * Update the profile's Elo after a CPU game.
     * Also increments win/loss/draw counters.
     *
     * @param {'win'|'loss'|'draw'} result  From the human player's perspective.
     * @param {'easy'|'medium'}     difficulty
     * @returns {number}  Elo change (signed integer). 0 if no profile.
     */
    function updateElo(result, difficulty) {
        const profile = getProfile();
        if (!profile) return 0;

        const opponentElo = CPU_ELO[difficulty] || CPU_ELO.easy;
        const score       = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
        const expected    = _expected(profile.elo, opponentElo);
        const eloChange   = Math.round(K_FACTOR * (score - expected));

        profile.elo = Math.max(100, profile.elo + eloChange);

        if (result === 'win')        profile.wins++;
        else if (result === 'loss')  profile.losses++;
        else                          profile.draws++;

        saveProfile(profile);
        return eloChange;
    }

    /**
     * Append a game record to the history (newest first, capped at MAX_HISTORY).
     *
     * @param {{
     *   date:          string,   // ISO timestamp
     *   mode:          string,   // 'local' | 'cpu-easy' | 'cpu-medium'
     *   result:        string,   // 'win' | 'loss' | 'draw' (player's perspective)
     *   eloChange:     number,
     *   playerScore:   number,
     *   oppScore:      number,
     *   moves:         number,
     *   duration:      number,   // seconds
     *   // v.011 additions:
     *   checksGiven:   number,   // how many checks the player delivered
     *   piecesLost:    number,   // pieces the player lost
     *   captureCount:  number,   // total pieces captured by player
     *   capturedQueen: boolean,  // player captured opponent queen
     *   promotions:    number,   // pawn promotions by player
     *   didCastle:     boolean,  // player castled at least once
     *   matePiece:     string|null, // piece that delivered checkmate (uppercase)
     *   mostUsedPiece: string|null, // most moved piece type (uppercase)
     * }} record
     */
    function addGameToHistory(record) {
        const profile = getProfile();
        if (!profile) return;

        profile.history.unshift(record);
        if (profile.history.length > MAX_HISTORY) profile.history.pop();
        saveProfile(profile);
    }

    /** Returns the game history array (newest first). */
    function getHistory() {
        const profile = getProfile();
        return profile ? (profile.history || []) : [];
    }

    /**
     * Update only the username.
     * @param {string} username
     */
    function setUsername(username) {
        const profile = getProfile();
        if (!profile) return;
        profile.username = username.trim() || 'Player';
        saveProfile(profile);
    }

    /**
     * Update the player's chosen avatar.
     * @param {number|string|null} id  Avatar index 114, string like "npc:...", or null for letter-initial fallback.
     */
    function setAvatar(id) {
        const profile = getProfile();
        if (!profile) return;
        profile.avatarId = id;
        saveProfile(profile);
    }

    /**
     * Returns the src path for a player avatar by ID.
     * @param {number|string|null} id
     * @returns {string|null}  Path string, or null if id is null.
     */
    function getPlayerAvatarSrc(id) {
        if (!id) return null;
        if (typeof id === 'string' && id.startsWith('npc:')) {
            // id format: "npc:NombrePersonaje"
            // The actual avatarSrc is stored on the unlocked NPC object.
            // For legacy fallback, try constructing a path (may 404 gracefully).
            return `${NPC_AVATAR_PATH}${id.substring(4)}.png`;
        }
        if (typeof id === 'string' && id.startsWith('npc-src:')) {
            // New format: "npc-src:assets/avatars/npc/[Archetype] Name.png"
            return id.substring(8);
        }
        return `${AVATAR_BASE_PATH}avatar_${id}.png`;
    }

    /**
     * Returns the src path for a CPU/NPC avatar by difficulty.
     * (Deprecated: NPCs now have specific avatars)
     * @param {'easy'|'medium'|string} difficulty
     * @returns {string}
     */
    function getCpuAvatarSrc(difficulty) {
        const map = {
            easy:   `${NPC_AVATAR_PATH}cpu_easy.png`,
            medium: `${NPC_AVATAR_PATH}cpu_medium.png`,
        };
        return map[difficulty] || `${NPC_AVATAR_PATH}cpu_default.png`;
    }

    /** Returns how many player avatars are available (for building the picker UI). */
    function getPlayerAvatarCount() { return PLAYER_AVATAR_COUNT; }

    /**
     * Get board customization settings.
     * @returns {{theme: string, opacity: number}}
     */
    function getBoardSettings() {
        const profile = getProfile();
        return profile ? { theme: profile.boardTheme || 'classic', opacity: profile.boardOpacity ?? 0.65 } : { theme: 'classic', opacity: 0.65 };
    }

    /**
     * Save board customization settings.
     * @param {string} theme 
     * @param {number} opacity 
     */
    function setBoardSettings(theme, opacity) {
        const profile = getProfile();
        if (!profile) return;
        profile.boardTheme = theme;
        profile.boardOpacity = opacity;
        saveProfile(profile);
    }

    /**
     * Set the player's favorite piece.
     * @param {string} pieceName
     */
    function setFavoritePiece(pieceName) {
        const profile = getProfile();
        if (!profile) return;
        profile.favoritePiece = pieceName;
        saveProfile(profile);
    }

    /**
     * Generate a random NPC profile with coherent name, avatar, archetype, and country.
     * NPC ELO scales dynamically with the player's current ELO for progressive balancing.
     * @param {'easy'|'medium'} difficulty
     * @param {number} [playerElo] Current player ELO for scaling. Falls back to CPU_ELO base.
     * @returns {object} NPC Profile
     */
    function generateNPC(difficulty, playerElo) {
        // ── NPC Roster ─────────────────────────────────────
        // Each entry: { name, archetype, country, flag }
        // File naming convention: "[Archetype] Name.png" in assets/avatars/npc/
        const NPC_ROSTER = [
            // Astro~Verse OC
            { name: 'Artemis',       archetype: 'Astro~Verse OC', country: 'Greece',      flag: '🇬🇷' },
            { name: 'Azura',         archetype: 'Astro~Verse OC', country: 'Brazil',      flag: '🇧🇷' },
            // Chess Academy
            { name: 'Beth',          archetype: 'Chess Academy',  country: 'USA',         flag: '🇺🇸' },
            { name: 'Brandon',       archetype: 'Chess Academy',  country: 'Canada',      flag: '🇨🇦' },
            { name: 'Christina',     archetype: 'Chess Academy',  country: 'Italy',       flag: '🇮🇹' },
            { name: 'Edward',        archetype: 'Chess Academy',  country: 'Venezuela',   flag: '🇻🇪' },
            { name: 'Himiko',        archetype: 'Chess Academy',  country: 'Japan',       flag: '🇯🇵' },
            { name: 'Momoshiro',     archetype: 'Chess Academy',  country: 'Japan',       flag: '🇯🇵' },
            { name: 'Sophie',        archetype: 'Chess Academy',  country: 'Germany',     flag: '🇩🇪' },
            { name: 'Wolfgang',      archetype: 'Chess Academy',  country: 'Austria',     flag: '🇦🇹' },
            // Night Knights
            { name: 'Haruka',        archetype: 'Night Knight',   country: 'Unknown',     flag: '❓' },
            { name: 'Kuroneko',      archetype: 'Night Knight',   country: 'Unknown',     flag: '❓' },
            { name: 'Lindsay',       archetype: 'Night Knight',   country: 'Unknown',     flag: '❓' },
            { name: 'Manuel',        archetype: 'Night Knight',   country: 'Unknown',     flag: '❓' },
            { name: 'Zero',          archetype: 'Night Knight',   country: 'Unknown',     flag: '❓' },
            // Random
            { name: 'Don Caballero', archetype: 'Random',         country: 'Spain',       flag: '🇪🇸' },
            { name: 'Dra. Calypso',  archetype: 'Random',         country: 'Colombia',    flag: '🇨🇴' },
            { name: 'Elizabeth',     archetype: 'Random',         country: 'UK',          flag: '🇬🇧' },
            { name: 'Loco Hugo',     archetype: 'Random',         country: 'Argentina',   flag: '🇦🇷' },
            { name: 'Lucia',         archetype: 'Random',         country: 'Mexico',      flag: '🇲🇽' },
            { name: 'Mr. Hank',      archetype: 'Random',         country: 'USA',         flag: '🇺🇸' },
            { name: 'Rajash',        archetype: 'Random',         country: 'India',       flag: '🇮🇳' },
            { name: 'Sr. Torres',    archetype: 'Random',         country: 'Mexico',      flag: '🇲🇽' },
            { name: 'Sra. Ximena',   archetype: 'Random',         country: 'Venezuela',   flag: '🇻🇪' },
        ];

        const EASY_ROSTER   = NPC_ROSTER; // All can appear as easy
        const MEDIUM_ROSTER = NPC_ROSTER.filter(n =>
            ['Chess Academy', 'Night Knight', 'Astro~Verse OC'].includes(n.archetype)
        );

        const pool = difficulty === 'medium' ? MEDIUM_ROSTER : EASY_ROSTER;
        const entry = pool[Math.floor(Math.random() * pool.length)];

        const PIECES = ["pawn", "knight", "bishop", "rook", "queen", "king"];
        const CATCHPHRASES = [
            "¡Viene de la tienda! 🛒", "Recién salido del mercado 🧺", "Viene a demostrar algo 💪",
            "Busca retadores ♟️", "Tiene la tarde libre ⏰", "Nadie le gana en el barrio 🏘️",
            "Se escapó del trabajo 🏃", "Tiene racha ganadora 🔥", "Solo vino a mirar 👀"
        ];

        // ── Dynamic ELO Scaling ─────────────────────────────
        // NPC ELO is anchored to the player's current ELO for a sense of progression.
        // Easy NPCs hover just above/below player ELO (within ±150).
        // Medium NPCs are always 100300 above the player.
        const pElo = playerElo || DEFAULT_ELO;
        let eloBase, eloSpread;
        if (difficulty === 'medium') {
            eloBase   = pElo + 150;
            eloSpread = 150;
        } else {
            eloBase   = pElo - 50;
            eloSpread = 100;
        }
        const elo = Math.max(100, eloBase + Math.floor(Math.random() * eloSpread));

        const totalGames = Math.floor(Math.random() * 500) + 10;
        const winRate = difficulty === 'medium' ? 0.6 : 0.4;
        const wins = Math.floor(totalGames * (winRate + (Math.random() * 0.1)));
        const losses = totalGames - wins - Math.floor(totalGames * 0.05);
        const draws = totalGames - wins - losses;
        const favoritePiece = PIECES[Math.floor(Math.random() * PIECES.length)];
        const catchphrase = CATCHPHRASES[Math.floor(Math.random() * CATCHPHRASES.length)];

        // File path uses the [Archetype] prefix format
        const avatarSrc = `${NPC_AVATAR_PATH}[${entry.archetype}] ${entry.name}.png`;
        const idStr = entry.name.replace(/\s+/g, '_').replace(/\./g, '');

        return {
            id:         `NPC-${idStr}`,
            username:   entry.name,
            archetype:  entry.archetype,
            country:    entry.country,
            flag:       entry.flag,
            elo,
            wins,
            losses,
            draws,
            avatarSrc,
            favoritePiece,
            catchphrase,
            difficulty
        };
    }

    return {
        getProfile,
        saveProfile,
        createProfile,
        updateElo,
        addGameToHistory,
        getHistory,
        setUsername,
        setAvatar,
        setFavoritePiece,
        getPlayerAvatarSrc,
        getCpuAvatarSrc,
        getPlayerAvatarCount,
        getBoardSettings,
        setBoardSettings,
        generateNPC,
        CPU_ELO,
        DEFAULT_ELO,
    };

})();

