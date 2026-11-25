/* =========================================================
   experience.js — ★ Cosmic Royal experience layer (v.021)

   A presentation-only companion to game.js. It adds the touches
   that make the app feel like a finished product:

     • Cosmic dust particle field above the starfield
     • Smooth removal of the first-paint boot skeleton
     • "In turn" chip + material-advantage readout on the panels
     • Piece landing / capture-burst feedback on the board
     • Keyboard control (F flip, P pause, Esc, arrows + Enter)
     • Focus management for every modal dialog
     • Board colour announcement for screen readers

   It never mutates game state directly: it reacts to what the
   game already did and drives the existing public buttons.

   Dependencies (loaded before this file):
     constants.js … ui.js, game.js
   ========================================================= */

'use strict';

const Experience = (() => {

    // ── Small helpers ─────────────────────────────────────

    const $  = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    function prefersReducedMotion() {
        return window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /** Screen-reader-only live region used for board/turn announcements. */
    let _liveRegion = null;
    function announce(text) {
        if (!_liveRegion) {
            _liveRegion = document.createElement('div');
            _liveRegion.className = 'sr-only';
            _liveRegion.setAttribute('role', 'status');
            _liveRegion.setAttribute('aria-live', 'polite');
            _liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(_liveRegion);
        }
        // Re-announce identical strings by clearing first
        _liveRegion.textContent = '';
        window.setTimeout(() => { _liveRegion.textContent = text; }, 30);
    }

    // ═══════════════════════════════════════════════════════
    // 1. AMBIENT DUST — a slow parallax particle field
    // ═══════════════════════════════════════════════════════

    const Dust = (() => {
        let canvas, ctx, w, h, dpr;
        let motes = [];
        let raf = null;
        let paused = false;

        function resize() {
            if (!canvas) return;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width  = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width  = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        }

        function seed() {
            const count = prefersReducedMotion()
                ? 26
                : Math.round(Math.min(90, Math.max(38, (w * h) / 26000)));
            motes = [];
            for (let i = 0; i < count; i++) {
                motes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 0.6 + Math.random() * 1.9,
                    vx: (Math.random() - 0.5) * 0.16,
                    vy: -0.05 - Math.random() * 0.22,
                    a: 0.10 + Math.random() * 0.32,
                    hue: Math.random() < 0.18 ? 'gold' : 'violet',
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.004 + Math.random() * 0.010,
                });
            }
        }

        function frame() {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            for (const m of motes) {
                if (!paused) {
                    m.x += m.vx;
                    m.y += m.vy;
                    m.phase += m.speed;
                    if (m.y < -8) { m.y = h + 8; m.x = Math.random() * w; }
                    if (m.x < -8) m.x = w + 8;
                    if (m.x > w + 8) m.x = -8;
                }
                const twinkle = 0.62 + 0.38 * Math.sin(m.phase);
                const alpha = m.a * twinkle;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fillStyle = m.hue === 'gold'
                    ? `rgba(253, 230, 138, ${alpha})`
                    : `rgba(196, 181, 253, ${alpha})`;
                ctx.fill();

                // Occasional soft halo on the larger motes
                if (m.r > 1.7) {
                    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 7);
                    g.addColorStop(0, `rgba(165, 180, 252, ${alpha * 0.30})`);
                    g.addColorStop(1, 'rgba(165, 180, 252, 0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.r * 7, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            raf = requestAnimationFrame(frame);
        }

        function start() {
            canvas = document.getElementById('cosmic-dust');
            if (!canvas) return;
            ctx = canvas.getContext('2d');
            resize();
            window.addEventListener('resize', resize, { passive: true });
            document.addEventListener('visibilitychange', () => {
                paused = document.hidden;
                if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
            });
            if (!prefersReducedMotion()) {
                raf = requestAnimationFrame(frame);
            } else {
                frame();                       // one static pass
                cancelAnimationFrame(raf);
                raf = null;
            }
        }

        return { start };
    })();

    // ═══════════════════════════════════════════════════════
    // 2. BOOT SKELETON
    // ═══════════════════════════════════════════════════════

    function dismissSkeleton() {
        const el = document.getElementById('boot-skeleton');
        if (!el) return;
        el.classList.add('done');
        window.setTimeout(() => el.remove(), 450);
    }

    // ═══════════════════════════════════════════════════════
    // 3. PANEL ENRICHMENT — turn chip + material advantage
    // ═══════════════════════════════════════════════════════

    const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    function _panelFor(color) {
        return document.getElementById(color === 'w' ? 'panel-white' : 'panel-black');
    }

    /**
     * Show or hide the "in turn" chip and refresh the material readout.
     * @param {'w'|'b'|'none'} currentPlayer
     * @param {{w:string[], b:string[]}} captured  captured[color] = pieces THAT colour took
     */
    function onTurnChange(currentPlayer, captured) {
        ['w', 'b'].forEach(color => {
            const panel = _panelFor(color);
            const nameRow = panel && panel.querySelector('.panel-name-row');
            if (!nameRow) return;

            let chip = nameRow.querySelector('.turn-chip');
            const active = currentPlayer === color;

            if (active) {
                if (!chip) {
                    chip = document.createElement('span');
                    chip.className = 'turn-chip';
                    chip.innerHTML = '<i class="fa-solid fa-circle" aria-hidden="true"></i>En turno';
                    nameRow.appendChild(chip);
                }
            } else if (chip) {
                chip.remove();
            }

            panel.classList.toggle('active-turn', active);
        });

        if (captured) updateMaterial(captured);
    }

    /** Append a +N chip to whichever side is ahead in material. */
    function updateMaterial(captured) {
        const value = list => (list || []).reduce((sum, p) => sum + (PIECE_VALUE[p.toLowerCase()] || 0), 0);
        const whiteTook = value(captured.w);
        const blackTook = value(captured.b);
        const diff = whiteTook - blackTook;

        [['w', diff], ['b', -diff]].forEach(([color, lead]) => {
            const panel = _panelFor(color);
            const row = panel && panel.querySelector('.panel-captured-row');
            if (!row) return;
            let pill = row.querySelector('.material-adv');
            if (lead > 0) {
                if (!pill) {
                    pill = document.createElement('span');
                    pill.className = 'material-adv';
                    row.appendChild(pill);
                }
                pill.textContent = '+' + lead;
            } else if (pill) {
                pill.remove();
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // 4. BOARD FEEDBACK — landings and capture bursts
    // ═══════════════════════════════════════════════════════

    function _squareCentre(r, c) {
        const board = document.getElementById('board-area');
        const sq = document.getElementById(`sq-${r}-${c}`);
        if (!board || !sq) return null;
        const b = board.getBoundingClientRect();
        const s = sq.getBoundingClientRect();
        return { x: s.left - b.left + s.width / 2, y: s.top - b.top + s.height / 2, size: s.width };
    }

    /** Spring the piece that just arrived.
     *
     *  Driven by the Web Animations API rather than a CSS class. Toggling a
     *  class used to make the browser fall back to any still-declared
     *  animation (the entrance drop-in) and the piece appeared to blink.
     *  Animating the element directly cannot trigger that fallback. */
    function pieceLanded(r, c) {
        if (prefersReducedMotion()) return;
        const area = document.getElementById('pieces-layer');
        if (!area) return;
        const pieces = Array.from(area.querySelectorAll('.piece'));
        const target = pieces.find(p =>
            String(p.dataset.r) === String(r) && String(p.dataset.c) === String(c));
        if (!target) return;

        // Cancel any landing animation still running on this element so a
        // rapid move sequence cannot stack two of them.
        target.getAnimations().forEach(a => {
            if (a.animationName === 'pieceLand') a.cancel();
        });

        target.animate(
            [
                { transform: 'scale(1.13) translateY(-3%)', offset: 0 },
                { transform: 'scale(0.96) translateY(1%)',  offset: 0.55 },
                { transform: 'scale(1) translateY(0)',      offset: 1 },
            ],
            { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'none' }
        );
    }

    /** Expanding reticle + cosmic spark particles where a piece was taken. */
    function captureBurst(r, c) {
        if (prefersReducedMotion()) return;
        const area = document.getElementById('board-area');
        const pos = _squareCentre(r, c);
        if (!area || !pos) return;

        const ring = document.createElement('span');
        ring.className = 'capture-burst';
        const size = pos.size;
        ring.style.width  = size + 'px';
        ring.style.height = size + 'px';
        ring.style.left   = (pos.x - size / 2) + 'px';
        ring.style.top    = (pos.y - size / 2) + 'px';
        area.appendChild(ring);
        window.setTimeout(() => ring.remove(), 520);

        // Cosmic spark particles radiating outward
        const count = 10;
        const colors = ['#7dd3fc', '#fde047', '#ffffff', '#c084fc'];
        for (let i = 0; i < count; i++) {
            const spark = document.createElement('span');
            const pSize = 3 + Math.random() * 3.5;
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const dist  = size * (0.45 + Math.random() * 0.45);
            const dx    = Math.cos(angle) * dist;
            const dy    = Math.sin(angle) * dist;
            const color = colors[i % colors.length];

            spark.style.cssText =
                `position:absolute;pointer-events:none;z-index:12;border-radius:50%;` +
                `width:${pSize}px;height:${pSize}px;` +
                `left:${pos.x - pSize / 2}px;top:${pos.y - pSize / 2}px;` +
                `background:${color};box-shadow:0 0 6px ${color};`;
            area.appendChild(spark);

            const anim = spark.animate(
                [
                    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                    { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 }
                ],
                { duration: 420 + Math.random() * 140, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            );
            anim.onfinish = () => spark.remove();
        }
    }

    /** Subtle star-dust trail along a piece's slide path. */
    function moveTrail(from, to) {
        if (prefersReducedMotion() || !from || !to) return;
        const area = document.getElementById('board-area');
        const p1 = _squareCentre(from.r, from.c);
        const p2 = _squareCentre(to.r, to.c);
        if (!area || !p1 || !p2) return;

        const steps = 4;
        for (let i = 1; i <= steps; i++) {
            const t = i / (steps + 1);
            const x = p1.x + (p2.x - p1.x) * t + (Math.random() - 0.5) * 6;
            const y = p1.y + (p2.y - p1.y) * t + (Math.random() - 0.5) * 6;
            const dot = document.createElement('span');
            const dSize = 3 + Math.random() * 2;

            dot.style.cssText =
                `position:absolute;pointer-events:none;z-index:3;border-radius:50%;` +
                `width:${dSize}px;height:${dSize}px;` +
                `left:${x - dSize / 2}px;top:${y - dSize / 2}px;` +
                `background:rgba(165,243,252,0.85);box-shadow:0 0 6px rgba(125,211,252,0.7);`;
            area.appendChild(dot);

            const anim = dot.animate(
                [
                    { transform: 'scale(1)', opacity: 0.75 },
                    { transform: 'scale(0.2)', opacity: 0 }
                ],
                { duration: 280 + i * 35, delay: i * 22, easing: 'ease-out', fill: 'forwards' }
            );
            anim.onfinish = () => dot.remove();
        }
    }

    /** Light haptic tick on supporting devices. */
    function haptic(ms) {
        if (prefersReducedMotion()) return;
        if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* ignore */ } }
    }

    // ═══════════════════════════════════════════════════════
    // 5. STATUS MESSAGE — colour the pill by game state
    // ═══════════════════════════════════════════════════════

    function paintStatus() {
        const el = document.getElementById('status-message');
        if (!el) return;
        const text = (el.textContent || '').toLowerCase();
        const isMate  = /checkmate|jaque mate|rendici|time's up|fin de/.test(text);
        const isCheck = !isMate && /check|jaque/.test(text);
        el.classList.toggle('is-check', isCheck);
        el.classList.toggle('is-mate', isMate);
    }

    function watchStatus() {
        const el = document.getElementById('status-message');
        if (!el || !window.MutationObserver) return;
        new MutationObserver(paintStatus).observe(el, {
            childList: true, characterData: true, subtree: true,
        });
        paintStatus();
    }

    // ═══════════════════════════════════════════════════════
    // 6. KEYBOARD CONTROL
    // ═══════════════════════════════════════════════════════

    let _cursor = { r: 7, c: 4 };   // keyboard cursor, starts on e1

    const isModalOpen = () => !!$('[role="dialog"]:not(.hidden), #achievements-modal');

    function _gameVisible() {
        const s = document.getElementById('game-screen');
        return s && !s.classList.contains('hidden');
    }

    function _focusSquare(r, c) {
        const sq = document.getElementById(`sq-${r}-${c}`);
        if (!sq) return;
        sq.setAttribute('tabindex', '0');
        sq.focus({ preventScroll: true });
        announce(sq.getAttribute('aria-label') || '');
    }

    function _moveCursor(dr, dc) {
        if (!_gameVisible()) return;
        const flipped = document.getElementById('board-wrapper')?.dataset.flipped === '1';
        const stepR = flipped ? -dr : dr;
        const stepC = flipped ? -dc : dc;
        _cursor.r = Math.max(0, Math.min(7, _cursor.r + stepR));
        _cursor.c = Math.max(0, Math.min(7, _cursor.c + stepC));
        _focusSquare(_cursor.r, _cursor.c);
    }

    function _closeTopModal() {
        if (!$('#gameover-modal')?.classList.contains('hidden')) {
            if (typeof UI !== 'undefined' && UI.hideGameOverModal) UI.hideGameOverModal();
            return true;
        }
        if (!$('#cpu-modal')?.classList.contains('hidden')) {
            document.getElementById('cpu-modal').classList.add('hidden');
            return true;
        }
        if (!$('#profile-modal')?.classList.contains('hidden')) {
            if (typeof UI !== 'undefined' && UI.hideProfileModal) UI.hideProfileModal();
            return true;
        }
        if (!$('#exit-confirm-modal')?.classList.contains('hidden')) {
            if (typeof UI !== 'undefined' && UI.hideExitConfirmModal) UI.hideExitConfirmModal();
            return true;
        }
        if (!$('#trading-card-modal')?.classList.contains('hidden')) {
            document.getElementById('trading-card-modal').classList.add('hidden');
            return true;
        }
        const ach = document.getElementById('achievements-modal');
        if (ach) { ach.remove(); return true; }
        if (!$('#pause-overlay')?.classList.contains('hidden')) {
            togglePause(false);
            return true;
        }
        // Dropdowns / in-game options
        let closed = false;
        $$('.ctrl-dropdown').forEach(d => {
            if (!d.classList.contains('hidden')) { d.classList.add('hidden'); closed = true;
                d.closest('.ctrl-trigger')?.classList.remove('open'); }
        });
        const menu = document.getElementById('game-options-menu');
        if (menu && !menu.classList.contains('hidden')) { menu.classList.add('hidden'); closed = true; }
        return closed;
    }

    function onKeyDown(e) {
        // Let people type in text fields untouched
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
            if (e.key === 'Escape') e.target.blur();
            return;
        }
        // Alt/Ctrl/Meta combos are the browser's business
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        switch (e.key) {
            case 'Escape':
                if (reviewing()) { exitReview(); e.preventDefault(); break; }
                if (_closeTopModal()) e.preventDefault();
                break;

            case 'ArrowLeft':
                if (reviewing()) { stepReview(-1); e.preventDefault(); break; }
                _moveCursor(0, -1); e.preventDefault(); break;

            case 'ArrowRight':
                if (reviewing()) { stepReview(1); e.preventDefault(); break; }
                _moveCursor(0, 1); e.preventDefault(); break;

            case 'Home':
                if (reviewing()) { reviewTo(0); e.preventDefault(); }
                break;

            case 'End':
                if (reviewing()) {
                    const total = (typeof reviewHistory !== 'undefined') ? reviewHistory.length : 0;
                    reviewTo(total - 1);
                    e.preventDefault();
                }
                break;

            case 'f': case 'F':
                if (_gameVisible() && !e.repeat) {
                    document.getElementById('btn-flip')?.click();
                    e.preventDefault();
                }
                break;

            case 'p': case 'P':
                if (_gameVisible() && !e.repeat) {
                    togglePause();
                    e.preventDefault();
                }
                break;

            case 'ArrowUp':    if (!reviewing()) { _moveCursor(-1, 0); e.preventDefault(); } break;
            case 'ArrowDown':  if (!reviewing()) { _moveCursor(1, 0);  e.preventDefault(); } break;

            case 'Enter': case ' ':
                {
                    const active = document.activeElement;
                    if (active && active.classList && active.classList.contains('square') && !reviewing()) {
                        active.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        e.preventDefault();
                    }
                }
                break;

            case 'Tab':
                _trapTab(e);
                break;

            default: break;
        }
    }

    // ═══════════════════════════════════════════════════════
    // 7. MODAL FOCUS MANAGEMENT
    // ═══════════════════════════════════════════════════════

    const MODAL_IDS = [
        'promotion-modal', 'gameover-modal', 'cpu-modal', 'profile-modal',
        'exit-confirm-modal', 'trading-card-modal', 'pause-overlay',
    ];

    let _lastFocus = null;

    function _activeDialog() {
        for (const id of MODAL_IDS) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) return el;
        }
        return document.getElementById('achievements-modal') || null;
    }

    function _focusFirst(container) {
        const target = container.querySelector(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (target) target.focus({ preventScroll: true });
    }

    function _trapTab(e) {
        const dialog = _activeDialog();
        if (!dialog) return;
        const focusables = Array.from(dialog.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (!focusables.length) return;

        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }

    function watchModals() {
        MODAL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el || !window.MutationObserver) return;
            new MutationObserver(() => {
                if (!el.classList.contains('hidden')) {
                    if (!_lastFocus) _lastFocus = document.activeElement;
                    window.setTimeout(() => _focusFirst(el), 60);
                } else if (_lastFocus && _lastFocus.focus) {
                    _lastFocus.focus({ preventScroll: true });
                    _lastFocus = null;
                }
            }).observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        // The achievements modal is built and torn down on demand
        if (window.MutationObserver) {
            new MutationObserver(muts => {
                muts.forEach(m => m.addedNodes.forEach(n => {
                    if (n.nodeType === 1 && n.id === 'achievements-modal') {
                        if (!_lastFocus) _lastFocus = document.activeElement;
                        window.setTimeout(() => _focusFirst(n), 60);
                    }
                }));
            }).observe(document.body, { childList: true });
        }
    }

    // ═══════════════════════════════════════════════════════
    // 8. PAUSE
    // ═══════════════════════════════════════════════════════

    let _paused = false;

    /**
     * Pause or resume the clocks. Uses the Timer's start/stop pair so no
     * game logic needs to change — resume re-arms with the remaining time.
     */
    function togglePause(force) {
        const want = typeof force === 'boolean' ? force : !_paused;
        const overlay = document.getElementById('pause-overlay');
        const btn = document.getElementById('btn-pause');
        if (!overlay || !btn) return;

        if (want === _paused) return;
        _paused = want;
        overlay.classList.toggle('hidden', !want);

        const icon = btn.querySelector('i');
        const label = btn.querySelector('.btn-game-label');
        if (icon)  icon.className = want ? 'fa-solid fa-play' : 'fa-solid fa-pause';
        if (label) label.textContent = want ? 'Resume' : 'Pause';
        btn.setAttribute('aria-pressed', want ? 'true' : 'false');

        if (typeof Timer !== 'undefined') {
            if (want && Timer.pause) Timer.pause();
            else if (!want && Timer.resume) Timer.resume();
        }
        if (want) document.getElementById('btn-resume')?.focus({ preventScroll: true });
        announce(want ? 'Partida en pausa' : 'Partida reanudada');
    }

    // ═══════════════════════════════════════════════════════
    // 9. CONTROL TRIGGERS AS REAL BUTTONS
    // ═══════════════════════════════════════════════════════

    function wireControlTriggers() {
        $$('.ctrl-trigger').forEach(trigger => {
            const drop = trigger.querySelector('.ctrl-dropdown');
            const sync = () => {
                const open = drop && !drop.classList.contains('hidden');
                trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (open) {
                    const first = drop.querySelector('button');
                    if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 40);
                }
            };
            trigger.addEventListener('click', () => window.setTimeout(sync, 0));
            trigger.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════
    // 10. ACCESSIBLE NAMES FOR ICON-ONLY CONTROLS
    // ═══════════════════════════════════════════════════════

    // Icon-only buttons are invisible to screen readers. Rather than
    // hand-labelling every one (including the panels built at runtime), give
    // each a name derived from its Font Awesome glyph.
    const ICON_LABELS = {
        'fa-arrow-left': 'Volver',
        'fa-arrow-right-from-bracket': 'Salir',
        'fa-backward-step': 'Pista anterior',
        'fa-forward-step': 'Pista siguiente',
        'fa-volume-high': 'Silenciar',
        'fa-volume-xmark': 'Activar sonido',
        'fa-music': 'Ajustes de audio',
        'fa-gear': 'Opciones',
        'fa-rotate': 'Girar tablero',
        'fa-palette': 'Cambiar estilo de piezas',
        'fa-chess-board': 'Cambiar tablero',
        'fa-flag': 'Rendirse',
        'fa-arrow-rotate-right': 'Reiniciar partida',
        'fa-xmark': 'Cerrar',
        'fa-play': 'Reanudar',
        'fa-pause': 'Pausar',
        'fa-clock-rotate-left': 'Historial',
        'fa-trash': 'Borrar',
        'fa-rotate-left': 'Restablecer',
        'fa-user-group': 'Partida local',
        'fa-robot': 'Jugar contra la CPU',
        'fa-globe': 'Multijugador en línea',
        'fa-trophy': 'Logros',
        'fa-chess-pawn': 'Peón',
        'fa-chess-knight': 'Caballo',
        'fa-chess-bishop': 'Alfil',
        'fa-chess-rook': 'Torre',
        'fa-chess-queen': 'Reina',
        'fa-chess-king': 'Rey',
    };

    function labelIconOnlyButtons(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('button:not([aria-label])').forEach(btn => {
            if (btn.textContent.trim()) return;               // already named
            const icon = btn.querySelector('i[class*="fa-"]');
            if (!icon) return;
            const key = Array.from(icon.classList).find(c => ICON_LABELS[c]);
            if (key) btn.setAttribute('aria-label', ICON_LABELS[key]);
        });
    }

    function watchIconLabels() {
        labelIconOnlyButtons(document);
        if (!window.MutationObserver) return;
        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.tagName === 'BUTTON') labelIconOnlyButtons({ querySelectorAll: () => [n] });
                labelIconOnlyButtons(n);
            }));
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ═══════════════════════════════════════════════════════
    // 10. MOVE-TIMELINE REVIEW — click a chip to replay the position
    // ═══════════════════════════════════════════════════════

    let _reviewIndex = -1;      // -1 = following live play
    let _reviewBar = null;
    let _liveState = null;      // the live position, stashed while reviewing

    const reviewing = () => _reviewIndex >= 0;

    /** The live game state, read straight from the board renderer's view. */
    function _captureLiveState() {
        const squares = document.querySelectorAll('#pieces-layer .piece');
        return {
            pieces: Array.from(squares).map(p => ({
                r: p.dataset.r, c: p.dataset.c,
                cls: p.className,
                src: p.tagName === 'IMG' ? p.src : null,
                piece: p.dataset.piece || null,
            })),
        };
    }

    /**
     * Repaint the board from a snapshot held in game.js`reviewHistory`.
     * The board is rebuilt as inert elements: review is a reading mode, it
     * never mutates the real game.
     */
    function _paintSnapshot(snap) {
        const host = document.getElementById('pieces-layer');
        if (!host || !snap) return;
        host.innerHTML = '';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const code = snap.board[r][c];
                if (!code) continue;
                const isWhite = code === code.toUpperCase();
                const el = document.createElement('i');
                el.className = `fa-solid ${PIECE_MAP[code]} piece ${isWhite ? 'white' : 'black'} piece-review`;
                el.dataset.r = r;
                el.dataset.c = c;
                el.style.top  = `${r * 12.5}%`;
                el.style.left = `${c * 12.5}%`;
                el.setAttribute('aria-hidden', 'true');
                host.appendChild(el);
            }
        }

        // Clear interaction highlights — they belong to live play
        document.querySelectorAll('#chessboard .square')
            .forEach(sq => sq.classList.remove('selected', 'valid-move', 'valid-capture', 'in-check'));
    }

    /** Restore the live board exactly as it was before review started. */
    function _restoreLive() {
        if (!_liveState) return;
        const host = document.getElementById('pieces-layer');
        if (!host) return;
        host.innerHTML = '';
        _liveState.pieces.forEach(p => {
            let el;
            if (p.src) {
                el = document.createElement('img');
                el.src = p.src;
                el.alt = p.piece || '';
                el.className = p.cls;
                el.dataset.piece = p.piece || '';
            } else {
                el = document.createElement('i');
                el.className = p.cls;
            }
            el.dataset.r = p.r;
            el.dataset.c = p.c;
            el.style.top  = `${p.r * 12.5}%`;
            el.style.left = `${p.c * 12.5}%`;
            host.appendChild(el);
        });
        _liveState = null;
    }

    function _highlightReviewChip() {
        const tl = document.getElementById('move-timeline');
        if (!tl) return;
        tl.querySelectorAll('.tl-entry').forEach(chip => {
            const ply = Number(chip.dataset.ply);
            const active = ply === _reviewIndex + 1;
            chip.classList.toggle('tl-active', active);
            if (active) {
                chip.setAttribute('aria-current', 'true');
                // Keep the active chip in view without yanking the page
                if (chip.offsetTop < tl.scrollTop ||
                    chip.offsetTop + chip.offsetHeight > tl.scrollTop + tl.clientHeight) {
                    tl.scrollTop = chip.offsetTop - tl.clientHeight / 2;
                }
            } else {
                chip.removeAttribute('aria-current');
            }
        });
    }

    function _updateReviewBar() {
        if (!_reviewBar) return;
        const total = (typeof reviewHistory !== 'undefined') ? reviewHistory.length : 0;
        const inReview = reviewing();
        _reviewBar.classList.toggle('tl-review-bar-active', inReview);
        _reviewBar.querySelector('.tl-review-count').textContent =
            inReview ? `${_reviewIndex + 1} / ${total}` : `${total}`;
        _reviewBar.querySelector('.tl-review-exit').hidden = !inReview;

        const back = document.getElementById('btn-review-back');
        const prev = document.getElementById('btn-review-prev');
        const next = document.getElementById('btn-review-next');
        const last = document.getElementById('btn-review-last');
        const atStart = !inReview || _reviewIndex === 0;
        const atEnd   = inReview && _reviewIndex >= total - 1;
        if (back) back.disabled = atStart;
        if (prev) prev.disabled = atStart;
        if (next) next.disabled = atEnd;
        if (last) last.disabled = atEnd;
    }

    /** Show the position after ply `index` (0-based). Enters review mode. */
    function reviewTo(index) {
        const total = (typeof reviewHistory !== 'undefined') ? reviewHistory.length : 0;
        if (!total) return;

        index = Math.max(0, Math.min(total - 1, index));

        if (!reviewing()) {
            _liveState = _captureLiveState();
            // Freeze the clock: review is not thinking time
            if (typeof Timer !== 'undefined' && Timer.pause) Timer.pause();
        }
        _reviewIndex = index;
        document.body.classList.add('astro-reviewing');
        _paintSnapshot(reviewHistory[index]);
        _highlightReviewChip();
        _updateReviewBar();

        const snap = reviewHistory[index];
        announce(`Revisando jugada ${index + 1} de ${total}${snap.notation ? ': ' + snap.notation : ''}`);
    }

    /** Leave review and put the live position back. */
    function exitReview() {
        if (!reviewing()) return;
        _reviewIndex = -1;
        document.body.classList.remove('astro-reviewing');
        _restoreLive();
        _highlightReviewChip();
        _updateReviewBar();
        // Hand the clocks back if the player had not paused on purpose
        if (typeof Timer !== 'undefined' && Timer.resume && !_paused) Timer.resume();
        announce('Volviendo a la partida');
    }

    function stepReview(delta) {
        const total = (typeof reviewHistory !== 'undefined') ? reviewHistory.length : 0;
        if (!total) return;
        reviewTo(reviewing() ? _reviewIndex + delta : total - 1);
    }

    /**
     * Show the timeline controls inside the header row on desktop (where the
     * timeline is a wide strip) and as a row above the chips on mobile.
     */
    function _placeReviewBar() {
        if (!_reviewBar) return;
        const wrapper = document.getElementById('timeline-wrapper');
        const header = wrapper && wrapper.querySelector('.tl-header');
        const tl = document.getElementById('move-timeline');
        if (!wrapper || !header || !tl) return;

        if (window.matchMedia('(min-width: 900px)').matches) {
            if (_reviewBar.parentElement !== header) header.appendChild(_reviewBar);
        } else if (_reviewBar.nextElementSibling !== tl) {
            wrapper.insertBefore(_reviewBar, tl);
        }
    }

    /** Build the transport bar that drives the review. */
    function buildReviewBar() {
        const wrapper = document.getElementById('timeline-wrapper');
        if (!wrapper || _reviewBar) return;

        _reviewBar = document.createElement('div');
        _reviewBar.className = 'tl-review-bar';
        _reviewBar.setAttribute('role', 'group');
        _reviewBar.setAttribute('aria-label', 'Reproducción de jugadas');
        _reviewBar.innerHTML = `
            <span class="tl-review-count" aria-live="polite">0</span>
            <button type="button" id="btn-review-back" class="tl-review-btn" aria-label="Ir al inicio" title="Ir al inicio (Inicio)">
                <i class="fa-solid fa-backward-fast" aria-hidden="true"></i>
            </button>
            <button type="button" id="btn-review-prev" class="tl-review-btn" aria-label="Jugada anterior" title="Anterior (←)">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <button type="button" id="btn-review-next" class="tl-review-btn" aria-label="Jugada siguiente" title="Siguiente (→)">
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
            <button type="button" id="btn-review-last" class="tl-review-btn" aria-label="Ir al final" title="Ir al final (Fin)">
                <i class="fa-solid fa-forward-fast" aria-hidden="true"></i>
            </button>
            <button type="button" class="tl-review-exit" hidden aria-label="Salir de la revisión" title="Volver a la partida">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i> Volver
            </button>`;

        _placeReviewBar();
        window.addEventListener('resize', _placeReviewBar, { passive: true });

        _reviewBar.querySelector('#btn-review-back').addEventListener('click', () => reviewTo(0));
        _reviewBar.querySelector('#btn-review-prev').addEventListener('click', () => stepReview(-1));
        _reviewBar.querySelector('#btn-review-next').addEventListener('click', () => stepReview(1));
        _reviewBar.querySelector('#btn-review-last').addEventListener('click', () => {
            const total = (typeof reviewHistory !== 'undefined') ? reviewHistory.length : 0;
            reviewTo(total - 1);
        });
        _reviewBar.querySelector('.tl-review-exit').addEventListener('click', exitReview);

        _updateReviewBar();
    }

    /** Delegate chip clicks — the timeline is rebuilt often, so bind once. */
    function wireReviewClicks() {
        const tl = document.getElementById('move-timeline');
        if (!tl) return;
        tl.addEventListener('click', (e) => {
            const chip = e.target.closest('.tl-entry');
            if (!chip || !chip.dataset.ply) return;
            reviewTo(Number(chip.dataset.ply) - 1);
        });
        tl.addEventListener('keydown', (e) => {
            const chip = e.target.closest('.tl-entry');
            if (!chip || !chip.dataset.ply) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                reviewTo(Number(chip.dataset.ply) - 1);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // 11. RESUME LAST GAME — the Home screen card
    // ═══════════════════════════════════════════════════════

    let _resumeHost = null;

    function refreshResumeCard() {
        const home = document.getElementById('home-screen');
        if (!home) return;

        const info = (typeof describeSavedGame === 'function') ? describeSavedGame() : null;

        if (!info) {
            if (_resumeHost) { _resumeHost.remove(); _resumeHost = null; }
            return;
        }

        if (!_resumeHost) {
            _resumeHost = document.createElement('div');
            _resumeHost.id = 'resume-card';
            _resumeHost.className = 'resume-card';

            // Slots in under the greeting, above the profile widget
            const group = home.querySelector('.home-profile-group');
            if (group) group.insertBefore(_resumeHost, group.firstChild);
            else home.insertBefore(_resumeHost, home.querySelector('.home-center-group'));
        }

        _resumeHost.innerHTML = `
            <div class="resume-card-info">
                <span class="resume-card-eyebrow"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Partida en curso</span>
                <span class="resume-card-title">vs. ${escapeHtml(info.opponent)}</span>
                <span class="resume-card-meta">Turno de ${info.turn} · ${info.moves} ${info.moves === 1 ? 'jugada' : 'jugadas'} · ${info.when}</span>
            </div>
            <div class="resume-card-actions">
                <button type="button" class="btn-resume-game" id="btn-resume-game">
                    <i class="fa-solid fa-play" aria-hidden="true"></i> Reanudar
                </button>
                <button type="button" class="btn-discard-game" id="btn-discard-game" aria-label="Descartar la partida guardada" title="Descartar">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
            </div>`;

        _resumeHost.querySelector('#btn-resume-game').addEventListener('click', () => {
            if (typeof resumeSavedGame !== 'function') return;
            const ok = resumeSavedGame();
            if (ok) {
                UI.switchScreen('game-screen');
                UI.updatePlayerNames(gameMode, cpuDifficulty, currentCpuProfile);
                BoardRenderer.renderPieces(board, isFlipped);
                BoardRenderer.updateHighlights(null, [], currentPlayer, board);
                UI.highlightActiveTurn(currentPlayer);
                _buildTimelineFromHistory();
            } else {
                UI.showToast('No se pudo reanudar la partida', 'warning');
                refreshResumeCard();
            }
        });

        _resumeHost.querySelector('#btn-discard-game').addEventListener('click', () => {
            if (typeof clearSavedGame === 'function') clearSavedGame();
            refreshResumeCard();
            UI.showToast('Partida descartada', 'info');
        });
    }

    /** Rebuild the Move Timeline chips from the restored review history. */
    function _buildTimelineFromHistory() {
        const tl = document.getElementById('move-timeline');
        if (!tl || typeof reviewHistory === 'undefined') return;
        tl.innerHTML = '';
        reviewHistory.forEach((snap, i) => {
            if (typeof Announcer === 'undefined' || !Announcer.appendHistorical) return;
            Announcer.appendHistorical({
                ply: i + 1,
                notation: snap.notation,
                mover: i % 2 === 0 ? 'w' : 'b',
                moveNum: Math.floor(i / 2),
            });
        });
        _reviewIndex = -1;
        _updateReviewBar();
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ═══════════════════════════════════════════════════════
    // 12. BOOT
    // ═══════════════════════════════════════════════════════

    /** Keep the Home card in step with screen changes. */
    function watchScreens() {
        if (typeof UI === 'undefined' || typeof UI.switchScreen !== 'function') return;
        if (UI.switchScreen.__astroWrapped) return;
        const original = UI.switchScreen;
        const wrapped = function (screenId) {
            const result = original.apply(this, arguments);
            if (screenId === 'home-screen') window.setTimeout(refreshResumeCard, 30);
            return result;
        };
        wrapped.__astroWrapped = true;
        UI.switchScreen = wrapped;
    }

    function boot() {
        Dust.start();
        watchStatus();
        watchModals();
        wireControlTriggers();
        watchIconLabels();
        buildReviewBar();
        wireReviewClicks();
        watchScreens();
        refreshResumeCard();

        document.addEventListener('keydown', onKeyDown);

        const btnResume = document.getElementById('btn-resume');
        if (btnResume) btnResume.addEventListener('click', () => togglePause(false));
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) btnPause.addEventListener('click', () => togglePause());

        // The loader takes over shortly; drop the skeleton as soon as it exists.
        window.setTimeout(() => {
            if (document.getElementById('loading-screen')) dismissSkeleton();
        }, 300);
        // Failsafe: never leave the skeleton behind
        window.setTimeout(dismissSkeleton, 4000);

        // Board colour announcement for assistive tech
        const board = document.getElementById('chessboard');
        if (board) {
            board.setAttribute('aria-describedby', 'status-message');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // ── Public surface ────────────────────────────────────
    return {
        announce,
        onTurnChange,
        updateMaterial,
        pieceLanded,
        captureBurst,
        moveTrail,
        haptic,
        togglePause,
        isPaused: () => _paused,
        focusSquare: _focusSquare,
        labelIconOnlyButtons,
        // review
        reviewTo,
        stepReview,
        exitReview,
        isReviewing: reviewing,
        refreshResumeCard,
    };

})();

/* ── Hooks the game modules call into ─────────────────────
   Kept as window functions so game.js / ui.js stay decoupled
   from the experience layer and keep working if it is absent. */
window.__astroTurnChange = function (currentPlayer, captured) {
    if (typeof Experience !== 'undefined') Experience.onTurnChange(currentPlayer, captured);
};
window.__astroMoveFX = function (from, to, captured) {
    if (typeof Experience === 'undefined') return;
    Experience.moveTrail(from, to);
    if (captured) {
        Experience.captureBurst(to.r, to.c);
        Experience.haptic(14);
    } else {
        Experience.haptic(6);
    }
    Experience.pieceLanded(to.r, to.c);
};
window.__astroMaterial = function (captured) {
    if (typeof Experience !== 'undefined') Experience.updateMaterial(captured);
};
window.__astroResetPause = function () {
    if (typeof Experience !== 'undefined' && Experience && Experience.isPaused && Experience.isPaused()) {
        Experience.togglePause(false);
    }
};
window.__astroSkeletonDone = function () {
    const el = document.getElementById('boot-skeleton');
    if (!el) return;
    el.classList.add('done');
    window.setTimeout(() => el.remove(), 450);
};

/* ── Review + resume hooks used by game.js ───────────────── */

/** True while the Move Timeline is replaying a past position. */
window.__astroIsReviewing = function () {
    return typeof Experience !== 'undefined' && Experience.isReviewing
        ? Experience.isReviewing() : false;
};

/** A new game started: drop the review cursor and rebuild the transport bar. */
window.__astroReviewReset = function () {
    if (typeof Experience === 'undefined') return;
    if (Experience.isReviewing()) Experience.exitReview();
    Experience.refreshResumeCard();
};

/** A ply was recorded: keep the transport bar's counter honest. */
window.__astroReviewGrew = function () {
    if (typeof Experience !== 'undefined') Experience.refreshResumeCard();
};
window.__astroStatusPainted = function () { /* reserved */ };
