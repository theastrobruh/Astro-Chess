/* =========================================================
   skins.js — Piece Skin System for Astro Chess

   Responsibilities:
     • Define all available skins (Classic + custom PNG skins).
     • Persist the user's active skin choice in localStorage.
     • Provide helpers: getPieceImageSrc(), getActiveSkin().
     • Expose SkinManager to other modules.

   How to add a new skin:
     1. Create folder: assets/pieces/<id>/white/ + black/
     2. Place 24 PNGs following PIECES_GUIDE.md conventions.
     3. Add an entry to the SKINS array below.

   Dependencies: constants.js (PIECE_NAMES)
   ========================================================= */

'use strict';

const SkinManager = (() => {

    // ── Skin Registry ─────────────────────────────────────
    // Add new skins by appending to this array.
    // type: 'icon' → uses FontAwesome (no PNGs needed)
    // type: 'png'  → looks for images at `path/white/*.png` and `path/black/*.png`

    const SKINS = [
        {
            id:          'classic',
            name:        'Classic',
            description: 'Original FontAwesome icons',
            type:        'icon',
            path:        null,
            preview:     null,    // icon skins don't need a preview image path
        },
        {
            id:          'astro',
            name:        'Astro',
            description: 'Custom illustrated pieces',
            type:        'png',
            path:        'assets/pieces/astro',
            preview:     'knight', // piece name used for the skin card preview
        },
        // ── Future skins go here ──────────────────────────
        // {
        //     id:          'my-skin',
        //     name:        'My Skin',
        //     description: 'Short description',
        //     type:        'png',
        //     path:        'assets/pieces/my-skin',
        //     preview:     'king',
        // },
    ];

    const STORAGE_KEY = 'astro_chess_skin';

    // ── State ─────────────────────────────────────────────
    let _activeSkinId = localStorage.getItem(STORAGE_KEY) || 'classic';

    // Validate stored id still exists
    if (!SKINS.find(s => s.id === _activeSkinId)) _activeSkinId = 'classic';

    // ── Public API ────────────────────────────────────────

    /** Return the full skin definition for the active skin. */
    function getActiveSkin() {
        return SKINS.find(s => s.id === _activeSkinId) || SKINS[0];
    }

    /** Return all registered skins. */
    function getAllSkins() {
        return SKINS;
    }

    /**
     * Switch to a skin by id.
     * @param {string} id
     * @returns {boolean} true if changed
     */
    function setActiveSkin(id) {
        const skin = SKINS.find(s => s.id === id);
        if (!skin || skin.id === _activeSkinId) return false;
        _activeSkinId = skin.id;
        localStorage.setItem(STORAGE_KEY, _activeSkinId);
        if (typeof Analytics !== 'undefined') Analytics.track('select_skin', { skin: _activeSkinId });
        return true;
    }

    /**
     * Return true if the active skin uses PNG images.
     */
    function isImageSkin() {
        return getActiveSkin().type === 'png';
    }

    /**
     * Build the image src for a piece.
     *
     * @param {string}  piece   — piece char: 'K','Q','R','B','N','P' (white)
     *                                        'k','q','r','b','n','p' (black)
     * @param {boolean} flipped — true = board is flipped (show back face)
     * @returns {string|null} image src string, or null if not a png skin
     */
    function getPieceImageSrc(piece, flipped) {
        const skin = getActiveSkin();
        if (skin.type !== 'png') return null;

        const isWhite    = piece === piece.toUpperCase();
        const colorDir   = isWhite ? 'white' : 'black';
        const pieceName  = PIECE_NAMES[piece.toUpperCase()];
        // White pieces at bottom face up (show back); black pieces at top face down (show front)
        // When the board flips, both swap.
        let face;
        if (isWhite) {
            face = flipped ? 'front' : 'back';
        } else {
            face = flipped ? 'back' : 'front';
        }

        return `${skin.path}/${colorDir}/${pieceName}_${face}.png`;
    }

    /**
     * Build preview image src for the skin card.
     * Shows the white king_front.png as representative piece.
     *
     * @param {string} skinId
     * @returns {string|null}
     */
    function getPreviewSrc(skinId) {
        const skin = SKINS.find(s => s.id === skinId);
        if (!skin || skin.type !== 'png') return null;
        return `${skin.path}/white/${skin.preview}_front.png`;
    }

    return {
        getActiveSkin,
        getAllSkins,
        setActiveSkin,
        isImageSkin,
        getPieceImageSrc,
        getPreviewSrc,
    };

})();
