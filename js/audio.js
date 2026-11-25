/* =========================================================
   audio.js — Web Audio synthesizer for game sounds  (v.014)

   v.014 additions:
     • SFX volume is now scaled by MusicSystem.getSfxVolume()
       (0.0 = silent, 1.0 = full volume). Respects the Audio panel.

   v.011 additions:
     • 'defeat'      — descending mournful sequence
     • 'draw'        — neutral ambiguous resolve chord
     • 'achievement' — bright chime + sparkle fanfare
     • 'victory'     — enhanced ascending arpeggio (more epic)

   v.010: each chess piece has a unique sonic signature.
   Pass the piece letter as the 2nd argument to
   AudioSystem.play() to trigger the piece-specific timbre.

   Piece codes (case-insensitive):
     P/p  Pawn   — quick, bright tick
     N/n  Knight — elastic 2-note bounce
     B/b  Bishop — smooth diagonal glide
     R/r  Rook   — deep power rumble
     Q/q  Queen  — majestic layered shimmer
     K/k  King   — solemn low chime
   ========================================================= */

'use strict';

const AudioSystem = (() => {
    let _ctx = null;

    /** Lazily create AudioContext on first use */
    function ctx() {
        if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
        return _ctx;
    }

    /** Resume context if suspended (browsers require user gesture first) */
    function resume() {
        const c = ctx();
        if (c.state === 'suspended') c.resume();
    }

    /** Returns the current SFX gain multiplier (0.0–1.0) from MusicSystem. */
    function _sfxScale() {
        return (typeof MusicSystem !== 'undefined') ? MusicSystem.getSfxVolume() : 1.0;
    }

    // ─────────────────────────────────────────────────────
    // Low-level tone helpers
    // ─────────────────────────────────────────────────────

    /**
     * Simple oscillator tone with exponential frequency sweep and fade-out.
     */
    function _tone(c, startFreq, endFreq, duration, wave = 'sine', vol = 0.32, delay = 0) {
        const scaledVol = vol * _sfxScale();
        if (scaledVol <= 0) return;
        const t   = c.currentTime + delay;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = wave;
        osc.frequency.setValueAtTime(startFreq, t);
        if (endFreq !== startFreq)
            osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + duration);
        gain.gain.setValueAtTime(scaledVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    /**
     * Short percussive noise burst — used to add a "thud" on captures.
     */
    function _noise(c, duration = 0.06, vol = 0.18, delay = 0) {
        const scaledVol = vol * _sfxScale();
        if (scaledVol <= 0) return;
        try {
            const t          = c.currentTime + delay;
            const bufSize    = Math.floor(c.sampleRate * duration);
            const buffer     = c.createBuffer(1, bufSize, c.sampleRate);
            const data       = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
            const src        = c.createBufferSource();
            src.buffer       = buffer;
            const gain       = c.createGain();
            const filter     = c.createBiquadFilter();
            filter.type      = 'bandpass';
            filter.frequency.value = 600;
            filter.Q.value   = 0.8;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(c.destination);
            gain.gain.setValueAtTime(scaledVol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
            src.start(t);
            src.stop(t + duration + 0.01);
        } catch (_) { /* ignore if buffer API unavailable */ }
    }

    // ─────────────────────────────────────────────────────
    // Per-piece move signatures
    // ─────────────────────────────────────────────────────

    const PIECE_MOVE = {
        /** Pawn — crisp, short high tick */
        P(c) {
            _tone(c, 620 + Math.random() * 60, 780, 0.07, 'sine', 0.28);
        },

        /** Knight — elastic two-note bounce (low→high) */
        N(c) {
            _tone(c, 320, 540, 0.09, 'triangle', 0.30);
            _tone(c, 540, 700, 0.08, 'triangle', 0.24, 0.08);
        },

        /** Bishop — long smooth glide, airy */
        B(c) {
            _tone(c, 380, 820, 0.22, 'sine', 0.26);
            // subtle second harmonic
            _tone(c, 760, 1200, 0.18, 'sine', 0.10, 0.02);
        },

        /** Rook — deep, authoritative slide-down */
        R(c) {
            _tone(c, 160, 95, 0.18, 'sawtooth', 0.30);
            _tone(c, 310, 190, 0.14, 'triangle', 0.18, 0.02);
        },

        /** Queen — majestic upward shimmer (two layered tones) */
        Q(c) {
            _tone(c, 440, 880, 0.28, 'sine', 0.32);
            _tone(c, 660, 1320, 0.24, 'triangle', 0.14, 0.03);
            // sparkle finish
            _tone(c, 1200, 1600, 0.10, 'sine', 0.09, 0.20);
        },

        /** King — solemn low bell-like chime */
        K(c) {
            _tone(c, 220, 210, 0.35, 'triangle', 0.34);
            _tone(c, 440, 435, 0.25, 'sine', 0.14, 0.01);
        },
    };

    // ─────────────────────────────────────────────────────
    // Per-piece capture signatures
    // ─────────────────────────────────────────────────────

    const PIECE_CAPTURE = {
        /** Pawn captured — short clash then silence */
        P(c) {
            _tone(c, 700, 200, 0.14, 'square', 0.30);
            _noise(c, 0.05, 0.22);
        },

        /** Knight captured — spring snap then bounce down */
        N(c) {
            _tone(c, 540, 180, 0.12, 'triangle', 0.32);
            _tone(c, 360, 120, 0.09, 'square', 0.18, 0.08);
            _noise(c, 0.06, 0.20);
        },

        /** Bishop captured — glide reversed, falls away */
        B(c) {
            _tone(c, 820, 180, 0.22, 'sine', 0.30);
            _noise(c, 0.07, 0.15, 0.05);
        },

        /** Rook captured — heavy thud + low rumble fade */
        R(c) {
            _tone(c, 180, 60, 0.25, 'sawtooth', 0.36);
            _noise(c, 0.10, 0.28);
            _tone(c, 130, 50, 0.20, 'triangle', 0.16, 0.04);
        },

        /** Queen captured — dramatic descending shimmer */
        Q(c) {
            _tone(c, 880, 110, 0.35, 'sine', 0.36);
            _tone(c, 1320, 220, 0.28, 'triangle', 0.18, 0.02);
            _noise(c, 0.10, 0.22, 0.02);
            // trailing mourning tone
            _tone(c, 300, 180, 0.30, 'sine', 0.12, 0.18);
        },

        /** King captured (should not happen in normal chess, but just in case) */
        K(c) {
            _tone(c, 220, 55, 0.45, 'triangle', 0.38);
            _noise(c, 0.12, 0.20, 0.02);
        },
    };

    // ─────────────────────────────────────────────────────
    // Normalise piece letter → uppercase key
    // ─────────────────────────────────────────────────────
    function _pieceKey(piece) {
        if (!piece) return null;
        const k = piece.toUpperCase();
        return ['P','N','B','R','Q','K'].includes(k) ? k : null;
    }

    // ─────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────

    /**
     * Play a game sound.
     * @param {'move'|'capture'|'castle'|'check'|'victory'|'defeat'|'draw'|'achievement'|'click'} type
     * @param {string} [piece]  Optional piece letter (P N B R Q K, case-insensitive).
     */
    function play(type, piece) {
        const c = ctx();
        if (c.state === 'suspended') return;

        // ── Respect SFX volume from MusicSystem (if loaded) ──────────
        const sfxVol = (typeof MusicSystem !== 'undefined')
            ? MusicSystem.getSfxVolume()
            : 1.0;
        if (sfxVol <= 0) return; // SFX muted — skip

        const key = _pieceKey(piece);

        switch (type) {

            // ── Move — piece signature (or generic fallback) ──────────
            case 'move': {
                if (key && PIECE_MOVE[key]) {
                    PIECE_MOVE[key](c);
                } else {
                    const start = 400 + Math.random() * 80;
                    _tone(c, start, start * 1.5 + Math.random() * 50, 0.08 + Math.random() * 0.02, 'sine', 0.32);
                }
                break;
            }

            // ── Capture — piece-specific crash ────────────────────────
            case 'capture': {
                if (key && PIECE_CAPTURE[key]) {
                    PIECE_CAPTURE[key](c);
                } else {
                    const start = 150 + Math.random() * 50;
                    const wave  = Math.random() > 0.5 ? 'square' : 'triangle';
                    _tone(c, start, start * 0.5, 0.15 + Math.random() * 0.08, wave, 0.38);
                }
                break;
            }

            // ── Castle — rook + king combo ────────────────────────────
            case 'castle': {
                _tone(c, 220, 215, 0.20, 'triangle', 0.28);
                _tone(c, 160, 110, 0.16, 'sawtooth', 0.22, 0.10);
                _tone(c, 440, 480, 0.12, 'sine', 0.14, 0.08);
                break;
            }

            // ── Check — urgent bouncy alert ───────────────────────────
            case 'check': {
                _tone(c, 520, 700, 0.10, 'sine', 0.34);
                _tone(c, 700, 860, 0.09, 'triangle', 0.22, 0.12);
                _tone(c, 860, 1050, 0.08, 'sine', 0.16, 0.22);
                break;
            }

            // ── Victory — enhanced ascending arpeggio (v.011) ─────────
            case 'victory': {
                // Rising arpeggio with more steps and longer sustain
                const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51];
                freqs.forEach((freq, i) => {
                    const t0 = c.currentTime + i * 0.11;
                    const osc = c.createOscillator();
                    const gain = c.createGain();
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t0);
                    gain.gain.setValueAtTime(0.30, t0);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
                    osc.start(t0);
                    osc.stop(t0 + 0.40);
                });
                // Shimmer and power chord finish
                _tone(c, 1046.5, 1400, 0.25, 'triangle', 0.14, 0.55);
                _tone(c, 523.25, 660, 0.30, 'sine', 0.10, 0.55);
                // Final sparkle
                _tone(c, 1800, 2200, 0.12, 'sine', 0.07, 0.80);
                break;
            }

            // ── Defeat — mournful descending (v.011 NEW) ──────────────
            case 'defeat': {
                // Descending minor-ish sequence
                const dFreqs = [523.25, 440, 369.99, 329.63, 261.63];
                dFreqs.forEach((freq, i) => {
                    const t0 = c.currentTime + i * 0.15;
                    const osc = c.createOscillator();
                    const gain = c.createGain();
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
                    osc.frequency.setValueAtTime(freq, t0);
                    gain.gain.setValueAtTime(0.26, t0);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
                    osc.start(t0);
                    osc.stop(t0 + 0.45);
                });
                // Deep final thud
                _tone(c, 100, 50, 0.35, 'sawtooth', 0.22, 0.70);
                _noise(c, 0.12, 0.14, 0.70);
                // Mournful trailing tone
                _tone(c, 220, 200, 0.60, 'sine', 0.08, 0.85);
                break;
            }

            // ── Draw — neutral ambiguous resolve (v.011 NEW) ──────────
            case 'draw': {
                // Parallel tones, neither rising nor falling much
                _tone(c, 440, 450, 0.28, 'sine', 0.26);
                _tone(c, 550, 540, 0.28, 'triangle', 0.18, 0.02);
                _tone(c, 330, 338, 0.22, 'sine', 0.14, 0.04);
                // Slight downward resolution — ambiguous
                _tone(c, 392, 370, 0.35, 'sine', 0.10, 0.25);
                _tone(c, 660, 640, 0.20, 'triangle', 0.08, 0.28);
                break;
            }

            // ── Achievement — bright chime fanfare (v.011 NEW) ────────
            case 'achievement': {
                // Bright rising chime
                const aFreqs = [880, 1108.73, 1318.51, 1760];
                aFreqs.forEach((freq, i) => {
                    const t0 = c.currentTime + i * 0.09;
                    const osc = c.createOscillator();
                    const gain = c.createGain();
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t0);
                    gain.gain.setValueAtTime(0.22, t0);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
                    osc.start(t0);
                    osc.stop(t0 + 0.30);
                });
                // Sparkle shimmer
                _tone(c, 2200, 2600, 0.12, 'sine', 0.07, 0.35);
                _tone(c, 1760, 2000, 0.10, 'triangle', 0.05, 0.38);
                break;
            }

            // ── UI Click — light tap ──────────────────────────────────
            case 'click': {
                const f = 800 + Math.random() * 200;
                _tone(c, f, f * 1.1, 0.05, 'sine', 0.15);
                break;
            }

            default:
                break;
        }
    }

    return { resume, play };
})();
