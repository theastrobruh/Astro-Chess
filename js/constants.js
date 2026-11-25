/* =========================================================
   constants.js — Shared constants for the entire game
   ========================================================= */

'use strict';

/** FontAwesome class for each piece character */
const PIECE_MAP = {
    'K': 'fa-chess-king',   'Q': 'fa-chess-queen',  'R': 'fa-chess-rook',
    'B': 'fa-chess-bishop', 'N': 'fa-chess-knight', 'P': 'fa-chess-pawn',
    'k': 'fa-chess-king',   'q': 'fa-chess-queen',  'r': 'fa-chess-rook',
    'b': 'fa-chess-bishop', 'n': 'fa-chess-knight', 'p': 'fa-chess-pawn',
};

/** Maps uppercase piece char → PNG filename stem (used by SkinManager) */
const PIECE_NAMES = {
    'K': 'king',   'Q': 'queen',  'R': 'rook',
    'B': 'bishop', 'N': 'knight', 'P': 'pawn',
};

/** Starting board layout (row 0 = rank 8, row 7 = rank 1) */
const INITIAL_BOARD = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
];

/** Available time controls in minutes */
const TIME_OPTIONS = [5, 10, 15, 30];

/** Default time per player (minutes) */
const DEFAULT_TIME_MINUTES = 10;
