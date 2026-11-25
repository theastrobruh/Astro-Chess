/* =========================================================
   loader.js — Resource pre-loader & boot screen  (v.021)

   Responsibilities:
     • Shows the branded boot sequence before the game starts.
     • Pre-loads every image the game actually uses (player
       avatars, NPC portraits, PNG piece skins) so they are
       already in the browser cache.
     • Drives the progress bar and status text.

   v.021 fixes:
     • The manifest used to request 8 player avatars and 20 NPC
       portraits that do not exist, producing 28 guaranteed 404s
       while still reporting "¡Listo para jugar!" at 100%. It now
       mirrors the real folders, and missing assets are counted
       separately instead of being silently swallowed.
     • Status text is derived from the group being loaded rather
       than from a percentage that a cache hit could skip past.

   Dependencies:
     Must be the LAST script loaded (after all other modules).
   ========================================================= */

'use strict';

const ResourceLoader = (() => {

    // ======================================================
    // Asset manifest — mirrors assets/ on disk
    // ======================================================

    // Player avatars present in assets/avatars/players/
    const PLAYER_AVATAR_COUNT = 6;

    // NPC portraits — exact filenames, including the "[Archetype] " prefix.
    // Must stay in sync with ProfileSystem's roster.
    const NPC_PORTRAITS = [
        '[Astro~Verse OC] Artemis.png',
        '[Astro~Verse OC] Azura.png',
        '[Chess Academy] Beth.png',
        '[Chess Academy] Brandon.png',
        '[Chess Academy] Christina.png',
        '[Chess Academy] Edward.png',
        '[Chess Academy] Himiko.png',
        '[Chess Academy] Momoshiro.png',
        '[Chess Academy] Sophie.png',
        '[Chess Academy] Wolfgang.png',
        '[Night Knight] Haruka.png',
        '[Night Knight] Kuroneko.png',
        '[Night Knight] Lindsay.png',
        '[Night Knight] Manuel.png',
        '[Night Knight] Zero.png',
        '[Random] Don Caballero.png',
        '[Random] Dra. Calypso.png',
        '[Random] Elizabeth.png',
        '[Random] Loco Hugo.png',
        '[Random] Lucia.png',
        '[Random] Mr. Hank.png',
        '[Random] Rajash.png',
        '[Random] Sr. Torres.png',
        '[Random] Sra. Ximena.png',
    ];

    const PIECE_NAMES_LIST = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    const PIECE_FACES      = ['front', 'back'];
    const PIECE_COLORS     = ['white', 'black'];
    const PNG_SKIN_PATHS   = ['assets/pieces/astro'];

    // ---- Build the full asset list -----------------------
    function _buildAssetList() {
        const assets = [];

        for (let i = 1; i <= PLAYER_AVATAR_COUNT; i++) {
            assets.push({ src: `assets/avatars/players/avatar_${i}.png`, group: 'avatars' });
        }

        NPC_PORTRAITS.forEach(n => {
            assets.push({ src: `assets/avatars/npc/${n}`, group: 'avatars' });
        });

        PNG_SKIN_PATHS.forEach(skinPath => {
            PIECE_COLORS.forEach(color => {
                PIECE_NAMES_LIST.forEach(piece => {
                    PIECE_FACES.forEach(face => {
                        assets.push({ src: `${skinPath}/${color}/${piece}_${face}.png`, group: 'pieces' });
                    });
                });
            });
        });

        return assets;
    }

    // ---- Preload a single image --------------------------
    /** @returns {Promise<boolean>} true when the image decoded. */
    function _preloadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload  = () => resolve(true);
            img.onerror = () => resolve(false);   // never reject, but report
            img.src = src;
        });
    }

    // ---- DOM helpers -------------------------------------
    function _setProgress(pct) {
        const bar = document.getElementById('loader-progress-fill');
        if (bar) bar.style.width = `${Math.round(pct)}%`;
    }

    function _setStatusText(text) {
        const el = document.getElementById('loader-status-text');
        if (el && el.textContent !== text) el.textContent = text;
    }

    const STATUS = {
        avatars: 'Cargando el elenco…',
        pieces:  'Tallando las piezas…',
        finish:  'Preparando el tablero…',
        ready:   '¡Listo para jugar!',
    };

    // ---- Boot sequence -----------------------------------
    async function init() {
        const loaderEl = document.getElementById('loading-screen');
        const homeEl   = document.getElementById('home-screen');

        if (!loaderEl) {
            // Loader screen missing — just show home immediately
            if (homeEl) homeEl.classList.remove('hidden');
            if (typeof window.__astroSkeletonDone === 'function') window.__astroSkeletonDone();
            return;
        }

        loaderEl.classList.remove('hidden');
        if (homeEl) homeEl.classList.add('hidden');

        const assets = _buildAssetList();
        const total  = assets.length;
        let   done   = 0;
        let   failed = 0;

        _setProgress(0);
        _setStatusText(STATUS.avatars);

        // ---- Load in batches so progress stays smooth ----
        const BATCH = 8;
        for (let i = 0; i < total; i += BATCH) {
            const batch = assets.slice(i, i + BATCH);
            const group = batch[0].group;

            // eslint-disable-next-line no-await-in-loop
            const results = await Promise.all(
                batch.map(a => _preloadImage(a.src))
            );

            results.forEach(ok => { if (ok) done++; else failed++; });

            _setProgress((done + failed) / total * 100);
            if      (group === 'avatars') _setStatusText(STATUS.avatars);
            else if (group === 'pieces')  _setStatusText(STATUS.pieces);
            else                          _setStatusText(STATUS.finish);
        }

        _setProgress(100);
        _setStatusText(STATUS.ready);

        if (failed > 0) {
            // Honest reporting: a missing avatar degrades gracefully, but the
            // developer should see it. Never blocks the boot.
            console.warn(`[Astro~Chess] ${failed} of ${total} assets could not be loaded.`);
        }

        // Short pause so 100% is visible
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 420));

        // ---- Fade out loader, fade in home ---------------
        loaderEl.classList.add('loader-fade-out');
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 620));

        loaderEl.classList.add('hidden');
        loaderEl.classList.remove('loader-fade-out');

        if (homeEl) {
            homeEl.classList.remove('hidden');
            homeEl.style.animation = 'fadeIn 0.5s ease-out';
        }

        // ---- Remaining boot tasks ------------------------
        if (typeof UI !== 'undefined' && typeof UI.updateProfileCard === 'function') {
            UI.updateProfileCard();
        }
        if (typeof UI !== 'undefined' && typeof UI.initParallaxHero === 'function') {
            UI.initParallaxHero();
        }
        if (typeof MusicSystem !== 'undefined') {
            MusicSystem.setContext('lobby');
        }

        // v.021: the real boot screen has taken over — drop the skeleton
        if (typeof window.__astroSkeletonDone === 'function') {
            window.__astroSkeletonDone();
        }
    }

    return { init };

})();

// ---- Auto-boot on DOMContentLoaded ----------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ResourceLoader.init());
} else {
    ResourceLoader.init();
}
