/* =========================================================
   ui.js  UI utilities: toasts, screen switching, modals,
           profile card, history screen, score popups

   Dependencies (must load before this file):
     constants.js   PIECE_MAP
     profile.js     ProfileSystem
   ========================================================= */

'use strict';

const UI = (() => {

    // ── DOM references ────────────────────────────────────
    const toastContainerEl  = document.getElementById('toast-container');
    const promoModalEl      = document.getElementById('promotion-modal');
    const promoOptionsEl    = document.getElementById('promotion-options');
    const gameoverModalEl   = document.getElementById('gameover-modal');
    const gameoverIconEl    = document.getElementById('gameover-icon');
    const gameoverTitleEl   = document.getElementById('gameover-title');
    const gameoverSubEl     = document.getElementById('gameover-subtitle');
    const gameoverScoreEl   = document.getElementById('gameover-score');
    const gameoverEloEl     = document.getElementById('gameover-elo-change');
    const cpuModalEl        = document.getElementById('cpu-modal');
    const profileModalEl    = document.getElementById('profile-modal');
    const profileWidgetEl   = document.getElementById('profile-widget');
    const historyListEl     = document.getElementById('history-list');
    const historyScreenEl   = document.getElementById('history-screen');
    const exitConfirmModalEl = document.getElementById('exit-confirm-modal');

    // ── Toast ─────────────────────────────────────────────

    const TOAST_CFG = {
        info:    { icon: 'fa-circle-info',          color: '#6366f1' },
        success: { icon: 'fa-trophy',               color: '#22c55e' },
        warning: { icon: 'fa-triangle-exclamation', color: '#f97316' },
        error:   { icon: 'fa-circle-xmark',         color: '#ef4444' },
        score:   { icon: 'fa-star',                 color: '#fbbf24' },
    };

    function showToast(message, type = 'info') {
        const cfg   = TOAST_CFG[type] || TOAST_CFG.info;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = cfg.color;
        toast.innerHTML =
            `<i class="fa-solid ${cfg.icon}" style="color:${cfg.color}"></i>` +
            `<span>${message}</span>`;
        toastContainerEl.appendChild(toast);
        setTimeout(() => toast.parentElement && toast.remove(), 3000);
    }

    // ── Screen switching ──────────────────────────────────

    function switchScreen(screenId) {
        if (typeof Analytics !== 'undefined') {
            Analytics.track('screen_view', { screen: screenId });
        }
        document.querySelectorAll('.screen')
            .forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId)?.classList.remove('hidden');
    }

    // ── Promotion modal ───────────────────────────────────

    function showPromotionModal(color, callback) {
        promoOptionsEl.innerHTML = '';
        const pieces = color === 'w' ? ['Q','R','B','N'] : ['q','r','b','n'];
        const labels = ['Queen', 'Rook', 'Bishop', 'Knight'];

        pieces.forEach((p, i) => {
            const opt = document.createElement('div');
            opt.className = 'promo-option';

            if (SkinManager.isImageSkin()) {
                // PNG skin: show piece image
                const imgSrc = SkinManager.getPieceImageSrc(p, false);
                opt.innerHTML =
                    `<img src="${imgSrc}" alt="${labels[i]}" class="promo-piece-img">` +
                    `<span>${labels[i]}</span>`;
            } else {
                // Classic icon skin
                opt.innerHTML =
                    `<i class="fa-solid ${PIECE_MAP[p]} ${color === 'w' ? 'white' : 'black'}"></i>` +
                    `<span>${labels[i]}</span>`;
            }

            opt.addEventListener('click', () => {
                promoModalEl.classList.add('hidden');
                callback(p);
            });
            promoOptionsEl.appendChild(opt);
        });

        promoModalEl.classList.remove('hidden');
    }

    // ── Game-over modal ───────────────────────────────────

    // Piece name map for display
    const PIECE_DISPLAY = { P: 'Peón', N: 'Caballo', B: 'Alfil', R: 'Torre', Q: 'Reina', K: 'Rey' };

    let _goAnimTimers = [];

    function _animateCounter(el, start, end, duration, suffix = '') {
        if (!el) return;
        const startTime = performance.now();
        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * ease);
            el.textContent = `${current}${suffix}`;
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = `${end}${suffix}`;
            }
        }
        requestAnimationFrame(tick);
    }

    function _animateTimeCounter(el, startSec, endSec, duration) {
        if (!el) return;
        const startTime = performance.now();
        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentSec = Math.floor(startSec + (endSec - startSec) * ease);
            const m = Math.floor(currentSec / 60);
            const s = currentSec % 60;
            el.textContent = `${m}:${String(s).padStart(2, '0')}`;
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                const fm = Math.floor(endSec / 60);
                const fs = endSec % 60;
                el.textContent = `${fm}:${String(fs).padStart(2, '0')}`;
            }
        }
        requestAnimationFrame(tick);
    }

    function showGameOverModal(result) {
        _goAnimTimers.forEach(t => clearTimeout(t));
        _goAnimTimers = [];

        const icons = {
            checkmate: result.gameResult === 'win' ? '♚' : '♟',
            stalemate: '🤝',
            timeout:   '⏱️',
        };
        gameoverIconEl.textContent = icons[result.status] || '♟';

        // ── Outcome classes on the content card ───────────────────
        const card = gameoverModalEl.querySelector('.gameover-content');
        card.classList.remove('gameover-win', 'gameover-win-medium', 'gameover-loss', 'gameover-draw', 'skip-anim');
        card.onclick = null;

        if (result.gameResult === 'win') {
            card.classList.add(result.difficulty === 'medium' ? 'gameover-win-medium' : 'gameover-win');
        } else if (result.gameResult === 'loss') {
            card.classList.add('gameover-loss');
        } else {
            card.classList.add('gameover-draw');
        }

        // ── Title & subtitle ──────────────────────────────────────
        switch (result.status) {
            case 'checkmate': {
                if (result.winner === 'w') {
                    gameoverTitleEl.textContent = '¡Victoria!';
                    gameoverSubEl.textContent   = '¡Jaque Mate! Eres imparable.';
                } else {
                    gameoverTitleEl.textContent = 'Derrota';
                    gameoverSubEl.textContent   = 'Jaque mate. A veces así es el ajedrez.';
                }
                break;
            }
            case 'stalemate':
                gameoverTitleEl.textContent = '¡Tablas!';
                gameoverSubEl.textContent   = 'Ahogado  la partida termina en empate.';
                break;
            case 'timeout': {
                const tw = result.winner === 'w' ? 'Blancas' : 'Negras';
                gameoverTitleEl.textContent = '¡Tiempo!';
                gameoverSubEl.textContent   = `${tw} gana por tiempo.`;
                break;
            }
            default:
                gameoverTitleEl.textContent = 'Fin de la Partida';
                gameoverSubEl.textContent   = '';
        }

        // ── Stats grid (v.011 + smartphone sequential animation) ──
        _renderStatsGrid(result);

        // ── Score block (legacy, now inside stats grid) ───────────
        if (gameoverScoreEl) gameoverScoreEl.classList.add('hidden');

        // ── Elo change ────────────────────────────────────────────
        if (result.eloChange !== undefined && gameoverEloEl) {
            const sign   = result.eloChange > 0 ? '+' : '';
            const newElo = result.newElo || '';
            gameoverEloEl.textContent  = `${sign}${result.eloChange} Elo → ${newElo}`;
            gameoverEloEl.className    = 'gameover-elo-change ' +
                (result.eloChange > 0 ? 'positive' : result.eloChange < 0 ? 'negative' : 'neutral');
            gameoverEloEl.classList.remove('hidden');
        } else if (gameoverEloEl) {
            gameoverEloEl.classList.add('hidden');
        }

        // ── Newly unlocked achievements (v.011) ───────────────────
        _renderNewAchievements(result.newlyUnlocked || []);

        // ── Confetti for CPU Medium win (v.011) ───────────────────
        _clearConfetti();
        if (result.gameResult === 'win' && result.difficulty === 'medium') {
            _launchConfetti();
        }

        gameoverModalEl.classList.remove('hidden');
    }

    /**
     * Render the stats grid inside the game-over modal with smartphone-game sequential reveal.
     */
    function _renderStatsGrid(result) {
        // Remove any existing stats grid
        const existing = gameoverModalEl.querySelector('.gameover-stats-grid');
        if (existing) existing.remove();

        const mins    = Math.floor((result.duration || 0) / 60);
        const secs    = (result.duration || 0) % 60;
        const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

        const pieceLabel = result.mostUsedPiece
            ? `${result.mostUsedPiece} ${PIECE_DISPLAY[result.mostUsedPiece] || result.mostUsedPiece}`
            : '';

        const statsData = [
            { icon: '🔄', label: 'Turnos',         type: 'num',  finalVal: result.moves || 0,        suffix: '',     display: result.moves || 0 },
            { icon: '⏱',  label: 'Tiempo',         type: 'time', finalVal: result.duration || 0,     suffix: '',     display: timeStr },
            { icon: '♟',  label: 'Pieza Favorita', type: 'text', finalVal: pieceLabel,               suffix: '',     display: pieceLabel },
            { icon: '💥',  label: 'Capturas',       type: 'num',  finalVal: result.captureCount || 0, suffix: '',     display: result.captureCount || 0 },
            { icon: '❗',  label: 'Jaques Dados',   type: 'num',  finalVal: result.checksGiven || 0,  suffix: '',     display: result.checksGiven || 0 },
            { icon: '⭐',  label: 'Puntos',         type: 'num',  finalVal: result.scoreW || 0,       suffix: ' pts', display: `${result.scoreW || 0} pts` },
        ];

        const grid = document.createElement('div');
        grid.className = 'gameover-stats-grid';

        statsData.forEach((stat, idx) => {
            const cell = document.createElement('div');
            cell.className = 'gameover-stat-cell';
            const delaySec = (0.34 + idx * 0.08).toFixed(2);
            cell.style.animationDelay = `${delaySec}s`;

            const initialText = stat.type === 'num' ? `0${stat.suffix}` : (stat.type === 'time' ? '0:00' : '');
            cell.innerHTML =
                `<span class="gsc-icon">${stat.icon}</span>` +
                `<span class="gsc-value">${_esc(initialText)}</span>` +
                `<span class="gsc-label">${_esc(stat.label)}</span>`;
            grid.appendChild(cell);

            // Staggered count-up trigger
            const delayMs = Math.round((0.34 + idx * 0.08) * 1000);
            const valEl = cell.querySelector('.gsc-value');

            const t = setTimeout(() => {
                if (typeof AudioSystem !== 'undefined') AudioSystem.play('click');
                if (stat.type === 'num') {
                    _animateCounter(valEl, 0, stat.finalVal, 280, stat.suffix);
                } else if (stat.type === 'time') {
                    _animateTimeCounter(valEl, 0, stat.finalVal, 300);
                } else {
                    valEl.textContent = stat.finalVal;
                }
            }, delayMs);
            _goAnimTimers.push(t);
        });

        // Insert after subtitle, before score block
        const insertBefore = gameoverScoreEl || gameoverEloEl || gameoverModalEl.querySelector('.gameover-buttons');
        if (insertBefore && insertBefore.parentElement) {
            insertBefore.parentElement.insertBefore(grid, insertBefore);
        } else {
            gameoverModalEl.querySelector('.gameover-content')?.appendChild(grid);
        }

        // Tap/click card anywhere to fast-forward all animations
        const card = gameoverModalEl.querySelector('.gameover-content');
        if (card) {
            card.onclick = () => {
                if (!card.classList.contains('skip-anim')) {
                    card.classList.add('skip-anim');
                    _goAnimTimers.forEach(tm => clearTimeout(tm));
                    _goAnimTimers = [];
                    const valEls = grid.querySelectorAll('.gsc-value');
                    statsData.forEach((st, i) => {
                        if (valEls[i]) valEls[i].textContent = String(st.display);
                    });
                }
            };
        }
    }

    /**
     * Render newly unlocked achievements badges inside game-over modal.
     */
    function _renderNewAchievements(achievements) {
        const existing = gameoverModalEl.querySelector('.gameover-achievements');
        if (existing) existing.remove();
        if (!achievements || achievements.length === 0) return;

        const wrap = document.createElement('div');
        wrap.className = 'gameover-achievements';

        const title = document.createElement('p');
        title.className = 'gameover-ach-title';
        title.textContent = '🏆 Logros Desbloqueados';
        wrap.appendChild(title);

        achievements.forEach(ach => {
            const badge = document.createElement('div');
            badge.className = 'gameover-ach-badge';
            badge.innerHTML =
                `<span class="ach-badge-icon">${ach.icon}</span>` +
                `<span class="ach-badge-name">${_esc(ach.name)}</span>`;
            wrap.appendChild(badge);
        });

        const buttonsEl = gameoverModalEl.querySelector('.gameover-buttons');
        if (buttonsEl) {
            buttonsEl.parentElement.insertBefore(wrap, buttonsEl);
        } else {
            gameoverModalEl.querySelector('.gameover-content')?.appendChild(wrap);
        }
    }

    // ── Confetti (CSS-based, no libs) ─────────────────────────
    let _confettiCleanup = null;

    function _launchConfetti() {
        const container = document.createElement('div');
        container.id = 'confetti-container';
        container.style.cssText = [
            'position:fixed', 'inset:0', 'pointer-events:none',
            'z-index:9999', 'overflow:hidden'
        ].join(';');
        document.body.appendChild(container);

        const COLORS = ['#fbbf24','#a78bfa','#34d399','#f87171','#38bdf8','#f0abfc','#fb923c'];
        const SHAPES = ['●', '■', '▲', '★', '◆'];
        const count  = 80;

        for (let i = 0; i < count; i++) {
            const piece = document.createElement('span');
            piece.className  = 'confetti-piece';
            piece.textContent = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            piece.style.cssText = [
                `color:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
                `left:${Math.random() * 100}vw`,
                `animation-delay:${Math.random() * 3}s`,
                `animation-duration:${2.5 + Math.random() * 2.5}s`,
                `font-size:${10 + Math.random() * 14}px`,
                `transform:rotate(${Math.random() * 360}deg)`,
            ].join(';');
            container.appendChild(piece);
        }

        // Auto-clean after animation
        const timer = setTimeout(_clearConfetti, 7000);
        _confettiCleanup = () => {
            clearTimeout(timer);
            container.remove();
            _confettiCleanup = null;
        };
    }

    function _clearConfetti() {
        if (_confettiCleanup) _confettiCleanup();
        document.getElementById('confetti-container')?.remove();
    }

    function hideGameOverModal() {
        _goAnimTimers.forEach(t => clearTimeout(t));
        _goAnimTimers = [];
        const card = gameoverModalEl.querySelector('.gameover-content');
        if (card) {
            card.classList.remove('skip-anim');
            card.onclick = null;
        }
        gameoverModalEl.classList.add('hidden');
        _clearConfetti();
        // Remove stat grids / achievement wraps for clean re-use
        gameoverModalEl.querySelector('.gameover-stats-grid')?.remove();
        gameoverModalEl.querySelector('.gameover-achievements')?.remove();
    }

    // ── Exit Confirmation Modal ────────────────────────────

    /**
     * Show the integrated exit-confirmation modal.
     * @param {function} onConfirm  Callback executed when user confirms exit.
     * @param {object} config Optional config to override texts.
     */
    function showExitConfirmModal(onConfirm, config = {}) {
        if (!exitConfirmModalEl) return;
        
        // Setup custom texts if provided
        const titleEl = exitConfirmModalEl.querySelector('.exit-confirm-title');
        const subEl = exitConfirmModalEl.querySelector('.exit-confirm-sub');
        const btnConfirmTextEl = exitConfirmModalEl.querySelector('#btn-exit-confirm');
        
        // Save original texts to restore later if needed, or just overwrite.
        if (titleEl) titleEl.textContent = config.title || 'Salir de la partida';
        if (subEl) subEl.textContent = config.subtitle || '¿Estás seguro? Perderás tu progreso en esta partida.';
        if (btnConfirmTextEl) {
            btnConfirmTextEl.innerHTML = config.icon ? `<i class="${config.icon}"></i> ${config.confirmText}` : `<i class="fa-solid fa-arrow-right-from-bracket"></i> ${config.confirmText || 'Salir'}`;
        }

        exitConfirmModalEl.classList.remove('hidden');

        const confirmBtn = document.getElementById('btn-exit-confirm');
        const cancelBtn  = document.getElementById('btn-exit-cancel');

        // One-shot handlers: remove after use to avoid stacking
        const _confirm = () => {
            exitConfirmModalEl.classList.add('hidden');
            _cleanup();
            if (onConfirm) onConfirm();
        };
        const _cancel = () => {
            exitConfirmModalEl.classList.add('hidden');
            _cleanup();
        };
        const _onBackdrop = (e) => {
            if (e.target === exitConfirmModalEl) _cancel();
        };
        function _cleanup() {
            confirmBtn && confirmBtn.removeEventListener('click', _confirm);
            cancelBtn  && cancelBtn.removeEventListener('click', _cancel);
            exitConfirmModalEl.removeEventListener('click', _onBackdrop);
        }

        if (confirmBtn) confirmBtn.addEventListener('click', _confirm);
        if (cancelBtn)  cancelBtn.addEventListener('click', _cancel);
        exitConfirmModalEl.addEventListener('click', _onBackdrop);
    }

    function hideExitConfirmModal() {
        if (exitConfirmModalEl) exitConfirmModalEl.classList.add('hidden');
    }

    // ── Profile Modal ─────────────────────────────────────

    function showProfileModal(onSave) {
        const input   = document.getElementById('profile-name-input');
        const profile = ProfileSystem.getProfile();
        if (input) input.value = profile ? profile.username : '';

        if (profileModalEl) profileModalEl.classList.remove('hidden');

        // ── Avatar picker ────────────────────────────────
        // Inject avatar grid if not already there
        let avatarSection = profileModalEl.querySelector('.avatar-picker-section');
        if (!avatarSection) {
            avatarSection = document.createElement('div');
            avatarSection.className = 'avatar-picker-section';

            const label = document.createElement('p');
            label.className = 'avatar-picker-label';
            label.innerHTML = '<i class="fa-solid fa-user-astronaut"></i> Elige tu avatar';
            avatarSection.appendChild(label);

            const grid = document.createElement('div');
            grid.className = 'avatar-picker-grid';
            grid.id = 'avatar-picker-grid';
            avatarSection.appendChild(grid);

            // Insert before the first button (btn-save-profile)
            const saveBtn = document.getElementById('btn-save-profile');
            const modalContent = profileModalEl.querySelector('.profile-modal-content');
            if (modalContent && saveBtn) {
                modalContent.insertBefore(avatarSection, saveBtn);
            }
        }

        // Render avatar options
        _renderAvatarPicker(avatarSection.querySelector('.avatar-picker-grid'), profile);

        // wire save button (once)
        const saveBtn = document.getElementById('btn-save-profile');
        if (saveBtn) {
            const handler = () => {
                const name = input ? input.value.trim() : '';
                if (profile) {
                    ProfileSystem.setUsername(name || 'Player');
                } else {
                    ProfileSystem.createProfile(name || 'Player');
                }
                
                // Get selected avatar and save it
                const selectedCell = profileModalEl.querySelector('.avatar-picker-cell.selected');
                if (selectedCell) {
                    let aId = selectedCell.dataset.avatarId;
                    if (!isNaN(parseInt(aId))) aId = parseInt(aId, 10);
                    ProfileSystem.setAvatar(aId);
                }

                if (profileModalEl) profileModalEl.classList.add('hidden');
                updateProfileCard();
                if (onSave) onSave();
            };
            saveBtn.onclick = handler;
        }

        // ── Cancel button ────────────────────────────────
        const cancelBtn = document.getElementById('btn-cancel-profile');
        if (cancelBtn) {
            cancelBtn.onclick = () => hideProfileModal();
        }

        // ── Reset Progress wiring ─────────────────────────
        const resetBtn    = document.getElementById('btn-reset-progress');
        const confirmArea = document.getElementById('reset-confirm-area');
        const confirmBtn  = document.getElementById('btn-reset-confirm');
        const cancelReset = document.getElementById('btn-reset-cancel');

        if (resetBtn && confirmArea) {
            resetBtn.onclick = () => {
                confirmArea.classList.remove('hidden');
                resetBtn.style.display = 'none';
            };
        }
        if (cancelReset && confirmArea && resetBtn) {
            cancelReset.onclick = () => {
                confirmArea.classList.add('hidden');
                resetBtn.style.display = '';
            };
        }
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                // Wipe all game data
                localStorage.removeItem('astrochess_profile');
                localStorage.removeItem('astrochess_plaza');
                localStorage.removeItem('astrochess_achievements');
                // Reload to a clean state
                location.reload();
            };
        }
    }

    /**
     * Render the avatar picker grid inside the profile modal.
     * @param {HTMLElement} gridEl
     * @param {object|null} profile
     */
    function _renderAvatarPicker(gridEl, profile) {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        
        // Add scrollability so large amounts of avatars fit
        gridEl.style.maxHeight = '220px';
        gridEl.style.overflowY = 'auto';
        
        const count     = ProfileSystem.getPlayerAvatarCount();
        const currentId = profile ? profile.avatarId : null;

        // 1. Render Basic Player Avatars
        for (let i = 1; i <= count; i++) {
            const cell = _createAvatarCell(i, currentId, gridEl);
            gridEl.appendChild(cell);
        }
        
        // 2. Render Unlocked NPC Avatars
        if (typeof PlazaSystem !== 'undefined') {
            const unlocked = PlazaSystem.getUnlockedOpponents();
            if (unlocked.length > 0) {
                // Add a small divider or label
                const divider = document.createElement('div');
                divider.className = 'avatar-picker-divider';
                divider.style.width = '100%';
                divider.style.marginTop = '10px';
                divider.style.paddingTop = '10px';
                divider.style.borderTop = '1px solid rgba(255,255,255,0.1)';
                divider.style.color = '#888';
                divider.style.fontSize = '0.8rem';
                divider.style.gridColumn = '1 / -1';
                divider.innerHTML = '<i class="fa-solid fa-unlock"></i> Desbloqueados';
                gridEl.appendChild(divider);
                
                unlocked.forEach(npc => {
                    const npcAvatarId = `npc-src:${npc.avatarSrc}`;
                    const cell = _createAvatarCell(npcAvatarId, currentId, gridEl, npc.username);
                    gridEl.appendChild(cell);
                });
            }
        }
    }

    function _createAvatarCell(avatarId, currentId, gridEl, title = '') {
        const src = ProfileSystem.getPlayerAvatarSrc(avatarId);
        const cell = document.createElement('div');
        cell.className = 'avatar-picker-cell' + (currentId === avatarId ? ' selected' : '');
        cell.dataset.avatarId = avatarId;
        cell.title = title || `Avatar ${avatarId}`;

        const img = document.createElement('img');
        img.src = src;
        img.alt = cell.title;
        img.className = 'avatar-picker-img';
        img.onerror = () => {
            img.replaceWith(_makeAvatarFallback(typeof avatarId === 'number' ? avatarId : 1));
        };

        cell.appendChild(img);
        cell.addEventListener('click', () => {
            gridEl.querySelectorAll('.avatar-picker-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            if (ProfileSystem.getProfile()) {
                ProfileSystem.setAvatar(avatarId);
            }
        });
        
        return cell;
    }

    function _makeAvatarFallback(index) {
        const span = document.createElement('span');
        span.className = 'avatar-fallback-icon';
        // Cycle through chess piece icons as fallbacks
        const icons = ['fa-chess-knight', 'fa-chess-queen', 'fa-chess-bishop', 'fa-chess-rook', 'fa-chess-pawn', 'fa-chess-king'];
        span.innerHTML = `<i class="fa-solid ${icons[(index - 1) % icons.length]}"></i>`;
        return span;
    }

    function hideProfileModal() {
        if (profileModalEl) profileModalEl.classList.add('hidden');
    }

    // ── Profile Card ──────────────────────────────────────

    function updateProfileCard() {
        if (!profileWidgetEl) return;
        const profile = ProfileSystem.getProfile();

        if (!profile) {
            profileWidgetEl.innerHTML = `
                <div class="profile-card">
                    <div class="profile-avatar no-profile">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="profile-details">
                        <span class="profile-username no-profile">No profile set up yet</span>
                    </div>
                    <button class="btn-profile-action" id="btn-edit-profile" title="Create Profile">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>`;
            document.getElementById('btn-edit-profile')?.addEventListener('click', () => showProfileModal());
        } else {
            const avatarSrc = ProfileSystem.getPlayerAvatarSrc(profile.avatarId);
            const initial   = profile.username.charAt(0).toUpperCase();
            
            profileWidgetEl.innerHTML = `
                <div class="profile-card">
                    <div class="profile-avatar" style="background-image: url('${avatarSrc}');">
                        ${!avatarSrc ? initial : ''}
                    </div>
                    <div class="profile-details">
                        <span class="profile-username">${_esc(profile.username)}</span>
                        <div class="profile-stats-row">
                            <span class="profile-elo-badge">⚡ ${profile.elo}</span>
                            <span class="profile-wld">${profile.wins}W · ${profile.losses}L · ${profile.draws}D</span>
                        </div>
                    </div>
                    <button class="btn-profile-action" id="btn-view-tc" title="Ver Carta Coleccionable">
                        <i class="fa-solid fa-address-card"></i>
                    </button>
                </div>`;
                
            document.getElementById('btn-view-tc')?.addEventListener('click', () => {
                showTradingCard(ProfileSystem.getProfile(), false);
            });
            
            // Re-wire avatar click as well to open TC
            profileWidgetEl.querySelector('.profile-avatar')?.addEventListener('click', () => {
                showTradingCard(ProfileSystem.getProfile(), false);
            });
        }
        
        updateGreeting();
    }

    function updateGreeting() {
        const greetingEl = document.getElementById('dynamic-greeting');
        if (!greetingEl) return;

        const profile = ProfileSystem.getProfile();
        const playerName = profile ? profile.username : 'Usuario';
        
        const hour = new Date().getHours();
        let greeting = 'Buenas noches';
        if (hour >= 5 && hour < 12) greeting = 'Buenos días';
        else if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
        
        greetingEl.textContent = `${greeting} ${playerName}, bienvenido.`;
        greetingEl.style.opacity = 1;
    }

    // ── CPU Modal ─────────────────────────────────────────

    let _selectedDifficulty = 'easy';

    function showCpuModal(onStart) {
        if (!cpuModalEl) return;

        _selectedDifficulty = 'easy';
        _refreshDifficultyBtns();
        cpuModalEl.classList.remove('hidden');

        document.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.onclick = () => {
                _selectedDifficulty = btn.dataset.diff;
                _refreshDifficultyBtns();
            };
        });

        const startBtn = document.getElementById('btn-start-cpu');
        if (startBtn) startBtn.onclick = () => {
            cpuModalEl.classList.add('hidden');
            if (onStart) onStart(_selectedDifficulty);
        };

        const cancelBtn = document.getElementById('btn-cancel-cpu');
        if (cancelBtn) cancelBtn.onclick = () => cpuModalEl.classList.add('hidden');
    }

    function _refreshDifficultyBtns() {
        document.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === _selectedDifficulty);
        });
    }

    // ── History Screen ────────────────────────────────────

    function showHistoryScreen() {
        const history = ProfileSystem.getHistory();
        const profile = ProfileSystem.getProfile();

        // Update summary stats
        if (profile) {
            const winEl  = document.getElementById('hist-wins');
            const lossEl = document.getElementById('hist-losses');
            const drawEl = document.getElementById('hist-draws');
            const eloEl  = document.getElementById('hist-elo');
            if (winEl)  winEl.textContent  = profile.wins;
            if (lossEl) lossEl.textContent = profile.losses;
            if (drawEl) drawEl.textContent = profile.draws;
            if (eloEl)  eloEl.textContent  = `⚡ ${profile.elo}`;
        }

        if (!historyListEl) return;

        if (!history.length) {
            historyListEl.innerHTML = `<p class="history-empty">No games played yet.<br>Start a match and build your legacy!</p>`;
        } else {
            historyListEl.innerHTML = history.map(r => _renderHistoryItem(r)).join('');
        }

        switchScreen('history-screen');
    }

    function _renderHistoryItem(r) {
        const resultClass = r.result === 'win' ? 'win' : r.result === 'loss' ? 'loss' : 'draw';
        const resultLabel = r.result === 'win' ? 'W' : r.result === 'loss' ? 'L' : 'D';

        const isCpu      = r.mode && r.mode.startsWith('cpu');
        const modeClass  = isCpu ? 'cpu' : 'local';
        const modeLabel  = isCpu ? `CPU · ${r.mode.split('-')[1] || ''}` : 'Local';

        const date       = r.date ? new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
        const dur        = r.duration ? `${Math.round(r.duration / 60)}m` : '';

        const eloSign    = r.eloChange > 0 ? '+' : '';
        const eloClass   = r.eloChange > 0 ? 'positive' : r.eloChange < 0 ? 'negative' : 'neutral';
        const eloText    = r.eloChange !== 0
            ? `${eloSign}${r.eloChange}`
            : isCpu ? '±0' : '';

        return `
            <div class="history-item">
                <div class="history-result-icon ${resultClass}">${resultLabel}</div>
                <div class="history-info">
                    <div class="history-mode-date">
                        <span class="history-mode-badge ${modeClass}">${_esc(modeLabel)}</span>
                        <span class="history-date">${date} · ${dur} · ${r.moves || 0} moves</span>
                    </div>
                    <div class="history-score-line">
                        Score: ${r.playerScore || 0} pts  ${r.oppScore || 0} pts
                    </div>
                </div>
                <div class="history-elo-right">
                    <div class="history-elo-change ${eloClass}">${eloText}</div>
                    <div class="history-elo-total">Elo</div>
                </div>
            </div>`;
    }

    // ── Player panel names & avatars ─────────────────────────

    /**
     * Update the player name labels and avatars in the game panel.
     * Now populates the two-column layout:
     *   Left  → .panel-avatar-large  (avatar image or fallback)
     *   Right → .panel-name-row (name) / .panel-score-row (score + captured)
     *
     * @param {'local'|'cpu'} mode
     * @param {'easy'|'medium'} difficulty  (only for cpu mode)
     * @param {object|string} cpuData
     */
    function updatePlayerNames(mode, difficulty, cpuData = null) {
        const profile   = ProfileSystem.getProfile();
        const humanName = profile ? _esc(profile.username) : 'White';

        // ── Helper: populate one panel ─────────────────────────────────────
        function _fillPanel(side, avatarSrc, fallbackHTML, displayName, isCpu) {
            const avatarEl = document.getElementById(`panel-avatar-${side}`);
            const nameEl   = document.getElementById(`player-name-${side}`);

            // ─ Avatar column ─
            if (avatarEl) {
                // Clear previous content but keep the colour-dot span
                const dot = avatarEl.querySelector('.panel-color-dot');
                avatarEl.innerHTML = '';
                if (dot) avatarEl.appendChild(dot);

                if (avatarSrc) {
                    const img = document.createElement('img');
                    img.src       = avatarSrc;
                    img.alt       = displayName;
                    img.className = 'panel-avatar-img';
                    img.onerror   = () => {
                        img.remove();
                        const fb = document.createElement('span');
                        fb.className   = 'avatar-fallback-letter';
                        fb.innerHTML   = fallbackHTML;
                        if (dot) avatarEl.insertBefore(fb, dot);
                        else     avatarEl.appendChild(fb);
                    };
                    if (dot) avatarEl.insertBefore(img, dot);
                    else     avatarEl.appendChild(img);
                } else {
                    // No image  show letter / icon fallback
                    const fb = document.createElement('span');
                    fb.className   = 'avatar-fallback-letter';
                    fb.innerHTML   = fallbackHTML;
                    if (dot) avatarEl.insertBefore(fb, dot);
                    else     avatarEl.appendChild(fb);
                }

                // CPU avatar gets a purple tint border
                if (isCpu) {
                    avatarEl.style.background = 'linear-gradient(145deg, rgba(167,92,246,0.30), rgba(236,72,153,0.15))';
                    avatarEl.style.borderColor = 'rgba(167,92,246,0.50)';
                } else {
                    avatarEl.style.background = '';
                    avatarEl.style.borderColor = '';
                }
            }

            // ─ Name label ─
            if (nameEl) nameEl.textContent = displayName;
        }

        // ── White / Human panel ─────────────────────────────────────
        const humanAvatarSrc = profile ? ProfileSystem.getPlayerAvatarSrc(profile.avatarId) : null;
        const humanInitial   = humanName.charAt(0).toUpperCase();
        _fillPanel('white', humanAvatarSrc, humanInitial, humanName, false);

        // ── Black / CPU panel ─────────────────────────────────────
        if (mode === 'cpu') {
            const diffLabel  = difficulty === 'medium' ? 'Med' : 'Easy';
            const cpuSrc     = typeof cpuData === 'object' && cpuData ? cpuData.avatarSrc : ProfileSystem.getCpuAvatarSrc(difficulty);
            const cpuName    = typeof cpuData === 'object' && cpuData ? cpuData.username : cpuData || 'CPU';
            
            _fillPanel('black', cpuSrc,
                `<i class="fa-solid fa-robot"></i>`,
                `${_esc(cpuName)} (${diffLabel})`,
                true);
        } else {
            // Local match  Black player
            _fillPanel('black', null, 'B', 'Black', false);
        }
    }

    /**
     * Toggle the active-turn glow on the correct avatar.
     * Called by game.js after each move.
     * @param {'w'|'b'} currentPlayer  The player whose turn it NOW is.
     */
    function highlightActiveTurn(currentPlayer) {
        const whiteAvatar = document.getElementById('panel-avatar-white');
        const blackAvatar = document.getElementById('panel-avatar-black');
        const whitePanel  = document.getElementById('panel-white');
        const blackPanel  = document.getElementById('panel-black');
        if (whiteAvatar) whiteAvatar.classList.toggle('active-turn', currentPlayer === 'w');
        if (blackAvatar) blackAvatar.classList.toggle('active-turn', currentPlayer === 'b');
        if (whitePanel)  whitePanel.classList.toggle('active-turn', currentPlayer === 'w');
        if (blackPanel)  blackPanel.classList.toggle('active-turn', currentPlayer === 'b');

        // v.021: the experience layer adds the "En turno" chip and the
        // material readout on top of the same turn signal.
        if (typeof window.__astroTurnChange === 'function') {
            window.__astroTurnChange(currentPlayer, null);
        }
    }

    // ── Score display ─────────────────────────────────────

    function updateScoreUI(scoreW, scoreB) {
        const sw = document.getElementById('score-white');
        const sb = document.getElementById('score-black');
        if (sw) sw.textContent = `${scoreW} pts`;
        if (sb) sb.textContent = `${scoreB} pts`;
    }

    /**
     * v.021  refresh the material-advantage pills.
     * @param {{w:string[], b:string[]}} captured
     */
    function updateMaterialUI(captured) {
        if (typeof window.__astroMaterial === 'function') window.__astroMaterial(captured);
    }

    function pulseScore(color) {
        const el = document.getElementById(`score-${color === 'w' ? 'white' : 'black'}`);
        if (!el) return;
        el.classList.remove('score-pulse');
        void el.offsetWidth; // reflow
        el.classList.add('score-pulse');
    }

    // ── Trading Card ───────────────────────────────────────
    
    function showTradingCard(data, isNPC) {
        if (!data) return;
        const tcModal = document.getElementById('trading-card-modal');
        if (!tcModal) return;

        // Fill elements
        document.getElementById('tc-type').textContent = isNPC ? 'NPC / CPU' : 'Player';
        document.getElementById('tc-elo-val').textContent = data.elo;
        document.getElementById('tc-name').textContent = data.username;
        document.getElementById('tc-wins').textContent = data.wins || 0;
        document.getElementById('tc-draws').textContent = data.draws || 0;
        document.getElementById('tc-losses').textContent = data.losses || 0;

        const avatarSrc = isNPC ? data.avatarSrc : ProfileSystem.getPlayerAvatarSrc(data.avatarId);
        const avatarImg = document.getElementById('tc-avatar');
        const imgWrapper = document.querySelector('.tc-image-wrapper');
        
        if (avatarSrc) {
            avatarImg.src = avatarSrc;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none'; // Fallback to placeholder if needed
        }

        // Make avatar editable for player
        if (!isNPC) {
            avatarImg.classList.add('editable');
            imgWrapper.classList.add('editable');
            imgWrapper.onclick = () => {
                tcModal.classList.add('hidden');
                showProfileModal();
            };
        } else {
            avatarImg.classList.remove('editable');
            imgWrapper.classList.remove('editable');
            imgWrapper.onclick = null;
        }

        // Generate a random ID for the card if it's the player, else use NPC's ID
        let cardId = isNPC ? data.id : `ID: ${Math.floor(Math.random() * 90000) + 10000}`;
        if (!isNPC && ProfileSystem.getProfile()) {
             // Derive a stable ID from username length and creation date
             const d = new Date(ProfileSystem.getProfile().createdAt || Date.now());
             cardId = `ID: ${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${data.username.length}`;
        }
        document.getElementById('tc-id').textContent = cardId;

        // Favorite Piece
        const favIcon = document.getElementById('tc-fav-icon');
        const favDropdown = document.getElementById('tc-fav-dropdown');
        const favSelector = document.getElementById('tc-fav-selector');
        
        let currentPiece = data.favoritePiece || 'pawn';
        favIcon.className = `fa-solid fa-chess-${currentPiece}`;

        // Disable fav piece selection for NPC
        if (isNPC) {
            favSelector.style.pointerEvents = 'none';
        } else {
            favSelector.style.pointerEvents = 'auto';
            // Click to toggle dropdown
            favSelector.onclick = (e) => {
                e.stopPropagation();
                favDropdown.classList.toggle('hidden');
            };
            
            // Dropdown items
            const options = favDropdown.querySelectorAll('i');
            options.forEach(opt => {
                opt.onclick = (e) => {
                    e.stopPropagation();
                    const chosen = opt.dataset.piece;
                    favIcon.className = `fa-solid fa-chess-${chosen}`;
                    ProfileSystem.setFavoritePiece(chosen);
                    favDropdown.classList.add('hidden');
                };
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!favSelector.contains(e.target)) {
                    favDropdown.classList.add('hidden');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }

        tcModal.classList.remove('hidden');
    }

    // Close Trading Card when tapping backdrop
    document.querySelector('#trading-card-modal .modal-backdrop')?.addEventListener('click', () => {
        document.getElementById('trading-card-modal').classList.add('hidden');
    });

    // ── Utils ─────────────────────────────────────────────

    function _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Skin Selector ─────────────────────────────────────

    /**
     * Render a skin selector grid into a given container element.
     * Calls onChange(skinId) when the user picks a different skin.
     *
     * @param {HTMLElement} containerEl  the element to populate
     * @param {function}    onChange     called with the new skinId
     */
    function renderSkinSelector(containerEl, onChange) {
        if (!containerEl) return;
        const skins      = SkinManager.getAllSkins();
        const activeSkin = SkinManager.getActiveSkin();

        containerEl.innerHTML = '';
        skins.forEach(skin => {
            const card = document.createElement('div');
            card.className = `skin-card${skin.id === activeSkin.id ? ' active' : ''}`;
            card.dataset.skinId = skin.id;
            card.title = skin.description;

            // Preview area
            const previewEl = document.createElement('div');
            previewEl.className = 'skin-card-preview';

            if (skin.type === 'png') {
                const src = SkinManager.getPreviewSrc(skin.id);
                const img = document.createElement('img');
                img.src = src;
                img.alt = skin.name;
                img.className = 'skin-preview-img';
                img.onerror = () => {
                    // Fallback to chess icon if image not yet available
                    img.replaceWith(_makeFallbackIcon());
                };
                previewEl.appendChild(img);
            } else {
                previewEl.appendChild(_makeFallbackIcon());
            }

            const nameEl = document.createElement('span');
            nameEl.className = 'skin-card-name';
            nameEl.textContent = skin.name;

            card.appendChild(previewEl);
            card.appendChild(nameEl);

            // Active indicator
            if (skin.id === activeSkin.id) {
                const check = document.createElement('span');
                check.className = 'skin-card-check';
                check.innerHTML = '<i class="fa-solid fa-check"></i>';
                card.appendChild(check);
            }

            card.addEventListener('click', () => {
                const changed = SkinManager.setActiveSkin(skin.id);
                if (changed && onChange) onChange(skin.id);
                // Re-render all selectors on the page so both stay in sync
                document.querySelectorAll('.skin-selector').forEach(sel => {
                    renderSkinSelector(sel, onChange);
                });
            });

            containerEl.appendChild(card);
        });
    }

    function _makeFallbackIcon() {
        const i = document.createElement('i');
        i.className = 'fa-solid fa-chess-knight skin-fallback-icon';
        return i;
    }

    // ── Board Settings Selector ───────────────────────────
    function renderBoardSettings() {
        const themeMenu = document.getElementById('board-theme-menu');
        const opacitySlider = document.getElementById('board-opacity-menu');
        const opacityLabel = document.getElementById('board-opacity-label-menu');
        if (!themeMenu || !opacitySlider || !opacityLabel) return;

        // Themes  Cosmic Royal order: royal first, then the classics.
        const THEME_PICKER = [
            { id: 'royal',   name: 'Royal Indigo' },
            { id: 'emerald', name: 'Emerald Court' },
            { id: 'bronze',  name: 'Bronze Dynasty' },
            { id: 'crimson', name: 'Crimson Realm' },
            { id: 'classic', name: 'Classic Green' },
            { id: 'neon',    name: 'Neon Purple' },
            { id: 'ocean',   name: 'Ocean Blue' },
            { id: 'ruby',    name: 'Ruby Red' },
        ];
        const allThemes = (typeof BoardRenderer.getThemes === 'function')
            ? BoardRenderer.getThemes() : {};
        const themes = THEME_PICKER.map(t => {
            const rgb = (allThemes[t.id] || {}).dark || '40, 40, 40';
            return { ...t, rgb };
        });

        const currentSettings = ProfileSystem.getBoardSettings();

        // Themes
        themeMenu.innerHTML = '';
        themes.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `board-theme-swatch ${t.id === currentSettings.theme ? 'selected' : ''}`;
            btn.type = 'button';
            btn.setAttribute('aria-label', `Board theme: ${t.name}`);
            btn.setAttribute('aria-pressed', t.id === currentSettings.theme ? 'true' : 'false');
            btn.innerHTML = `
                <span class="bts-preview" style="--sw: rgb(${t.rgb});">
                    <i></i><i></i><i></i><i></i>
                </span>
                <span class="bts-name">${t.name}</span>`;

            btn.addEventListener('click', () => {
                ProfileSystem.setBoardSettings(t.id, parseFloat(opacitySlider.value));
                BoardRenderer.applyBoardTheme(t.id, parseFloat(opacitySlider.value));
                if (typeof Analytics !== 'undefined') Analytics.track('select_board_theme', { theme: t.id });
                themeMenu.querySelectorAll('.board-theme-swatch').forEach(el => {
                    el.classList.remove('selected');
                    el.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('selected');
                btn.setAttribute('aria-pressed', 'true');
            });
            themeMenu.appendChild(btn);
        });

        // Opacity
        opacitySlider.value = currentSettings.opacity;
        opacityLabel.textContent = currentSettings.opacity;

        opacitySlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            opacityLabel.textContent = val.toFixed(2);
            BoardRenderer.applyBoardTheme(ProfileSystem.getBoardSettings().theme, val);
        });

        opacitySlider.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            ProfileSystem.setBoardSettings(ProfileSystem.getBoardSettings().theme, val);
        });
    }

    // ── Achievements Modal (v.011) ────────────────────────

    function showAchievementsModal() {
        if (typeof AchievementSystem === 'undefined') return;

        const existingModal = document.getElementById('achievements-modal');
        if (existingModal) existingModal.remove();

        const unlocked   = AchievementSystem.getUnlocked();
        const all        = AchievementSystem.getAll();
        const categories = AchievementSystem.getCategories();
        const unlockedCount = Object.keys(unlocked).length;

        const modal = document.createElement('div');
        modal.id = 'achievements-modal';
        modal.className = 'achievements-modal-shell';

        // Build category sections
        const catSections = Object.entries(categories).map(([catId, cat]) => {
            const catAchs = all.filter(a => a.category === catId);
            const catUnlocked = catAchs.filter(a => unlocked[a.id]).length;

            const items = catAchs.map(a => {
                const isOwned = !!unlocked[a.id];
                const dateStr = isOwned
                    ? new Date(unlocked[a.id].unlockedAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                    : '';
                return `
                    <div class="ach-item ${isOwned ? 'ach-unlocked' : 'ach-locked'} ${a.secret && !isOwned ? 'ach-secret' : ''}">
                        <span class="ach-icon">${isOwned ? a.icon : (a.secret ? '🔒' : a.icon)}</span>
                        <div class="ach-info">
                            <span class="ach-name">${isOwned ? _esc(a.name) : (a.secret ? '???' : _esc(a.name))}</span>
                            <span class="ach-desc">${isOwned ? _esc(a.desc) : (a.secret ? 'Logro secreto.' : _esc(a.desc))}</span>
                            ${isOwned ? `<span class="ach-date">${dateStr}</span>` : ''}
                        </div>
                        ${isOwned ? '<span class="ach-check">✓</span>' : ''}
                    </div>`;
            }).join('');

            return `
                <div class="ach-category">
                    <div class="ach-cat-header" style="color:${cat.color}">
                        ${_esc(cat.label)}
                        <span class="ach-cat-count">${catUnlocked}/${catAchs.length}</span>
                    </div>
                    ${items}
                </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-backdrop" id="ach-modal-backdrop"></div>
            <div class="achievements-modal-content">
                <div class="ach-modal-header">
                    <h2 class="ach-modal-title">🏆 Logros</h2>
                    <span class="ach-total-badge">${unlockedCount} / ${all.length}</span>
                    <button class="ach-close-btn" id="ach-close-btn"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="ach-progress-bar-wrap">
                    <div class="ach-progress-bar" style="width:${Math.round(unlockedCount/all.length*100)}%"></div>
                </div>
                <div class="ach-list-scroll">
                    ${catSections}
                </div>
            </div>`;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        document.getElementById('ach-close-btn')?.addEventListener('click', close);
        document.getElementById('ach-modal-backdrop')?.addEventListener('click', close);
    }

    // ── Global Audio Hooks ────────────────────────────────
    
    document.addEventListener('click', (e) => {
        // Resume audio context on first user interaction
        if (AudioSystem && AudioSystem.resume) AudioSystem.resume();

        // Play click sound if a button or clickable div was clicked
        const target = e.target.closest('button, .ctrl-trigger, .promo-option, .avatar-picker-cell, .skin-card');
        if (target) {
            AudioSystem.play('click');
        }
    });

    // ── Dynamic Tips ──────────────────────────────────────
    const TIPS = [
        "El caballo en el borde... se aburre.",
        "A veces, el mejor ataque es esperar a que el rival estornude.",
        "Protege a tu Reina como si debieras la renta.",
        "Los peones no retroceden, pero seguro se arrepienten.",
        "Un jaque no es mate, pero asusta bastante.",
        "El ajedrez es 99% táctica y 1% 'oh no, mi dama'.",
        "Enrocar temprano es como ponerse el cinturón antes del choque.",
        "El alfil de casillas blancas jamás conocerá al de casillas negras. Trágico.",
        "Sacrificar una pieza es genial, salvo cuando fue sin querer.",
        "Jugar rápido para asustar al rival: la técnica milenaria.",
        "Si no sabes qué mover, mueve un peón del borde y mira fijamente al oponente."
    ];
    let tipIndex = 0;
    setInterval(() => {
        const tipsEl = document.getElementById('dynamic-tips');
        if (tipsEl && !document.getElementById('home-screen').classList.contains('hidden')) {
            tipIndex = (tipIndex + 1) % TIPS.length;
            tipsEl.style.transition = 'opacity 0.35s ease';
            tipsEl.style.opacity = 0;
            setTimeout(() => {
                tipsEl.textContent = TIPS[tipIndex];
                tipsEl.style.opacity = 1;
            }, 350);
        }
    }, 4500);

    // ── Parallax Hero (v.012) ─────────────────────────────

    const CHESS_CURIOSITIES = [
        { quote: 'El ajedrez es el arte del análisis.', attr: ' Mikhail Botvinnik', fact: null },
        { quote: 'El tablero es el mundo, las piezas los fenómenos del universo.', attr: ' Thomas Huxley', fact: null },
        { quote: 'Los ajedrecistas son artistas y matemáticos a la vez.', attr: ' Magnus Carlsen', fact: null },
        { quote: null, attr: null, fact: '♟ El número de partidas posibles supera el número de átomos en el universo observable.' },
        { quote: null, attr: null, fact: '⚡ El Fool\'s Mate es el mate más rápido: jaque mate en solo 2 movimientos.' },
        { quote: null, attr: null, fact: '🤖 AlphaZero aprendió ajedrez desde cero en 4 horas y derrotó al mejor programa del mundo.' },
        { quote: 'Cuando juegas ajedrez, tu mente lucha contra sí misma.', attr: ' Magnus Carlsen', fact: null },
        { quote: null, attr: null, fact: '🎯 El King\'s Gambit, uno de los openings más agresivos, fue popular desde el siglo XVI.' },
    ];

    let _parallaxSlide = 0;
    let _parallaxTimer = null;
    let _parallaxReady = false;

    function _initParallaxHero() {
        const hero = document.getElementById('home-parallax-hero');
        if (!hero) return;
        if (_parallaxReady) {
            _refreshParallaxProgress();
            return;
        }
        _parallaxReady = true;

        _refreshParallaxCuriosity();
        _refreshParallaxProgress();

        // Wire navigation dots
        document.querySelectorAll('.parallax-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                _goToSlide(parseInt(dot.dataset.dot, 10));
                _restartParallaxTimer();
            });
        });

        // Auto-rotation
        _startParallaxTimer();

        // Touch swipe support
        let _touchStartX = 0;
        hero.addEventListener('touchstart', e => {
            _touchStartX = e.touches[0].clientX;
        }, { passive: true });
        hero.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - _touchStartX;
            if (Math.abs(dx) > 40) {
                _goToSlide((_parallaxSlide + (dx < 0 ? 1 : -1) + 4) % 4);
                _restartParallaxTimer();
            }
        }, { passive: true });

        // Mouse parallax  desktop
        hero.addEventListener('mousemove', e => {
            const rect = hero.getBoundingClientRect();
            const cx = (e.clientX - rect.left) / rect.width  - 0.5;
            const cy = (e.clientY - rect.top)  / rect.height - 0.5;
            _applyParallaxOffset(cx, cy);
        });
        hero.addEventListener('mouseleave', () => _applyParallaxOffset(0, 0));

        // Gyroscope parallax  mobile
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', e => {
                if (document.getElementById('home-screen')?.classList.contains('hidden')) return;
                const cx = Math.max(-0.5, Math.min(0.5, (e.gamma || 0) / 30));
                const cy = Math.max(-0.5, Math.min(0.5, (e.beta  || 0) / 30 - 0.5));
                _applyParallaxOffset(cx, cy);
            }, { passive: true });
        }
    }

    function _applyParallaxOffset(cx, cy) {
        const hero = document.getElementById('home-parallax-hero');
        if (!hero) return;
        const bg  = hero.querySelector('.parallax-bg');
        const mid = hero.querySelector('.parallax-mid');
        if (bg)  bg.style.transform  = `translateZ(-12px) scale(1.025) translate(${cx * 12}px, ${cy * 8}px)`;
        if (mid) mid.style.transform = `translateZ(-6px) scale(1.012) translate(${cx * 6}px, ${cy * 4}px)`;
    }

    function _goToSlide(index) {
        const slides = document.querySelectorAll('.parallax-slide');
        const dots   = document.querySelectorAll('.parallax-dot');
        if (!slides.length) return;

        if (index === 1) _refreshParallaxPlazaRoster();
        if (index === 2) _refreshParallaxCuriosity();
        if (index === 3) _refreshParallaxProgress();

        slides.forEach((s, i) => {
            s.classList.remove('active', 'exit');
            if (i === _parallaxSlide && i !== index) s.classList.add('exit');
        });

        _parallaxSlide = index;
        slides[index]?.classList.add('active');
        dots.forEach((d, i) => d.classList.toggle('active', i === index));

        // Clean exit class after transition
        setTimeout(() => {
            document.querySelectorAll('.parallax-slide.exit')
                .forEach(s => s.classList.remove('exit'));
        }, 450);
    }

    function _startParallaxTimer() {
        _parallaxTimer = setInterval(() => {
            const homeHidden = document.getElementById('home-screen')?.classList.contains('hidden');
            if (!homeHidden) _goToSlide((_parallaxSlide + 1) % 4);
        }, 6000);
    }

    function _restartParallaxTimer() {
        clearInterval(_parallaxTimer);
        _startParallaxTimer();
    }

    function _refreshParallaxPlazaRoster() {
        const el = document.getElementById('parallax-plaza-roster');
        if (!el || typeof PlazaSystem === 'undefined') return;
        const roster = PlazaSystem.getPlazaRoster();
        let html = '<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px 25px; justify-items:center; align-items:center; margin-top: 5px; width: 100%; max-width: 300px; margin-left: auto; margin-right: auto;">';
        roster.forEach(npc => {
            const avatar  = npc.avatarSrc;
            const flag    = npc.flag || '';
            const isNK    = npc.archetype === 'Night Knight';
            html += `<div style="display:flex; flex-direction:column; align-items:center; gap:4px;" title="${npc.username}">
                        <div style="position: relative; width:50px; height:50px;">
                            <div style="width:100%; height:100%; border-radius:50%; overflow:hidden; border:2px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                                <img src="${avatar}" style="width:100%; height:100%; object-fit:cover; object-position: top center;" onerror="this.parentElement.style.background='rgba(99,102,241,0.2)'; this.style.display='none';">
                            </div>
                            <div style="position: absolute; bottom: -2px; right: -2px; font-size: 0.65rem; background: rgba(0,0,0,0.7); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">${isNK ? '❓' : flag}</div>
                        </div>
                        <div style="font-size:0.68rem; color: #a0aec0; font-weight:600; letter-spacing:0.5px; font-family:'Orbitron', sans-serif;">
                            <span style="color:#fbbf24;">⚡</span> ${npc.elo}
                        </div>
                     </div>`;
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function _refreshParallaxCuriosity() {
        const el = document.getElementById('parallax-curiosity');
        if (!el) return;
        const entry = CHESS_CURIOSITIES[Math.floor(Math.random() * CHESS_CURIOSITIES.length)];
        if (entry.quote) {
            el.innerHTML =
                '<p class="curiosity-quote">' + entry.quote + '</p>' +
                '<span class="curiosity-attr">' + entry.attr + '</span>';
        } else {
            el.innerHTML = '<p class="curiosity-fact">' + entry.fact + '</p>';
        }
    }

    function _refreshParallaxProgress() {
        const el = document.getElementById('parallax-progress');
        if (!el) return;
        const profile = (typeof ProfileSystem !== 'undefined') ? ProfileSystem.getProfile() : null;

        if (!profile) {
            el.innerHTML =
                '<p class="progress-no-profile">Crea tu perfil para ver tu progreso.<br>' +
                '<span class="link" id="parallax-create-profile">Crear perfil \u2192</span></p>';
            document.getElementById('parallax-create-profile')
                ?.addEventListener('click', () => UI.showProfileModal());
            return;
        }

        const elo    = profile.elo    || 1200;
        const wins   = profile.wins   || 0;
        const losses = profile.losses || 0;
        const draws  = profile.draws  || 0;
        const total  = wins + losses + draws;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        // ELO milestone thresholds
        const MILESTONES = [1200, 1400, 1600, 1800, 2000, 2200, 2500];
        const nextMilestone = MILESTONES.find(m => m > elo) || 2500;
        const prevMilestone = [...MILESTONES].reverse().find(m => m <= elo) || 1200;
        const pct = Math.min(100, Math.round(
            ((elo - prevMilestone) / Math.max(1, nextMilestone - prevMilestone)) * 100
        ));

        el.innerHTML =
            '<div class="progress-stats-row">' +
                '<div class="progress-stat">' +
                    '<span class="progress-stat-val">' + wins + '</span>' +
                    '<span class="progress-stat-lbl">Wins</span>' +
                '</div>' +
                '<div class="progress-stat">' +
                    '<span class="progress-stat-val">' + winRate + '%</span>' +
                    '<span class="progress-stat-lbl">Win rate</span>' +
                '</div>' +
                '<div class="progress-stat">' +
                    '<span class="progress-stat-val">' + total + '</span>' +
                    '<span class="progress-stat-lbl">Partidas</span>' +
                '</div>' +
            '</div>' +
            '<div class="progress-elo-bar-wrap">' +
                '<div class="progress-elo-labels">' +
                    '<span class="progress-elo-current">\u26a1 ' + elo + ' ELO</span>' +
                    '<span class="progress-elo-next">\u2192 ' + nextMilestone + '</span>' +
                '</div>' +
                '<div class="progress-bar-track">' +
                    '<div class="progress-bar-fill" style="width: ' + pct + '%"></div>' +
                '</div>' +
            '</div>';
    }

    // ── CPU Hub (Solo Player) ─────────────────────────────
    
    let _hubTimer = null;

    // Global listener for the hub back button
    document.getElementById('btn-hub-back')?.addEventListener('click', () => {
        switchScreen('home-screen');
        _stopHubTimer();
    });

    function showCpuHub() {
        switchScreen('cpu-hub-screen');
        _startHubTimer();
        
        // Initial tab setup
        _switchHubTab('plaza');
        
        // Wire tabs
        document.querySelectorAll('.hub-tab').forEach(tab => {
            tab.onclick = () => _switchHubTab(tab.dataset.tab);
        });
    }

    function _switchHubTab(tabName) {
        document.querySelectorAll('.hub-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        document.getElementById('hub-content-plaza').classList.toggle('hidden', tabName !== 'plaza');
        document.getElementById('hub-content-freemode').classList.toggle('hidden', tabName !== 'freemode');
        
        if (tabName === 'plaza') {
            _renderPlazaGrid();
        } else {
            _renderFreeModeGrid();
        }
    }

    function _startHubTimer() {
        _stopHubTimer();
        const update = () => {
            const ms = PlazaSystem.getRemainingTime();
            if (ms <= 0) {
                _renderPlazaGrid(); // Refresh when 0
                return;
            }
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((ms % (1000 * 60)) / 1000);
            const text = `Rotación en: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            const el = document.getElementById('hub-countdown');
            if (el) el.textContent = text;
        };
        update();
        _hubTimer = setInterval(update, 1000);
    }

    function _stopHubTimer() {
        if (_hubTimer) clearInterval(_hubTimer);
    }

    function _renderPlazaGrid() {
        const grid = document.getElementById('plaza-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const roster = PlazaSystem.getPlazaRoster();
        roster.forEach(npc => {
            grid.appendChild(_createNpcCard(npc, false));
        });
    }

    function _renderFreeModeGrid() {
        const grid = document.getElementById('freemode-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Valid NPC names (must match current NPC_ROSTER in profile.js)
        const VALID_NPC_NAMES = new Set([
            'Artemis', 'Azura',
            'Beth', 'Brandon', 'Christina', 'Edward', 'Himiko', 'Momoshiro', 'Sophie', 'Wolfgang',
            'Haruka', 'Kuroneko', 'Lindsay', 'Manuel', 'Zero',
            'Don Caballero', 'Dra. Calypso', 'Elizabeth', 'Loco Hugo', 'Lucia',
            'Mr. Hank', 'Rajash', 'Sr. Torres', 'Sra. Ximena'
        ]);

        const allUnlocked = PlazaSystem.getUnlockedOpponents();
        // Filter out stale/ghost NPCs whose name doesn't exist anymore
        const unlocked = allUnlocked.filter(npc =>
            npc && npc.username && VALID_NPC_NAMES.has(npc.username)
        );

        if (unlocked.length === 0) {
            grid.innerHTML = `<div class="empty-freemode">
                <i class="fa-solid fa-lock" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.5;"></i>
                Derrota a tus primeros rivales en La Plaza para desbloquearlos aquí.
            </div>`;
            return;
        }

        unlocked.forEach(npc => {
            grid.appendChild(_createNpcCard(npc, true));
        });
    }

    function _createNpcCard(npc, isFreeMode) {
        const isUnlocked = PlazaSystem.isUnlocked(npc.id);
        const streak = PlazaSystem.getStreak(npc.id);

        const card = document.createElement('div');
        card.className = 'npc-card';

        const diffColor = npc.difficulty === 'medium' ? 'medium' : 'easy';
        const diffLabel = npc.difficulty === 'medium' ? 'Medium' : 'Easy';
        const initial = npc.username.charAt(0).toUpperCase();

        // Archetype badge  short label, Night Knights get minimal style
        const archetype = npc.archetype || '';
        const isNightKnight = archetype === 'Night Knight';
        const archetypeHtml = archetype
            ? `<span class="npc-archetype-badge ${isNightKnight ? 'night-knight' : ''}">${archetype}</span>`
            : '';

        // Country flag + name
        const flag    = npc.flag    || '';
        const country = npc.country || '';
        const countryHtml = (flag && country)
            ? `<span class="npc-country-tag">${flag} ${isNightKnight ? '?' : country}</span>`
            : '';

        // Badge desbloqueado: check circular sutil (solo en La Plaza)
        const unlockedBannerHtml = (!isFreeMode && isUnlocked)
            ? `<div class="npc-unlocked-badge">
                 <i class="fa-solid fa-check"></i>
               </div>`
            : '';

        const streakHtml = streak >= 3
            ? `<span class="npc-streak">🔥 x${streak}</span>`
            : '';

        card.innerHTML = `
            <div class="npc-avatar-box">
                <img src="${npc.avatarSrc}" alt="${_esc(npc.username)}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="npc-avatar-fallback" style="display:none;">${initial}</div>
                ${unlockedBannerHtml}
                ${archetypeHtml}
            </div>
            <div class="npc-card-info">
                <div class="npc-name-row">
                    <h4 class="npc-card-name">${_esc(npc.username)}</h4>
                    ${countryHtml}
                </div>
                <div class="npc-stats-row">
                    <span class="stat-elo">⚡ ${npc.elo}</span>
                    <span class="stat-diff-badge ${diffColor}">${diffLabel}</span>
                    ${streakHtml}
                </div>
                <button class="btn-challenge">Retar</button>
            </div>
        `;

        // Wire challenge button
        const btn = card.querySelector('.btn-challenge');
        btn.onclick = () => {
            if (isFreeMode) {
                showCpuModal((diff) => {
                    _startCpuGame(npc, diff);
                });
            } else {
                _startCpuGame(npc, npc.difficulty);
            }
        };

        return card;
    }

    function _startCpuGame(npcData, difficulty) {
        // Expose the chosen NPC to game.js
        window._selectedCpuNpc = npcData; 
        
        if (typeof initGame === 'function') {
            switchScreen('loading-screen');
            setTimeout(() => {
                initGame('cpu', difficulty);
                switchScreen('game-screen');
                const diffLabel = difficulty === 'medium' ? 'Medium' : 'Easy';
                showToast(`Jugando vs ${npcData.username} · ${diffLabel}`, 'info');
            }, 600);
        }
    }

    // ── Exports ───────────────────────────────────────────
    return {
        showToast,
        switchScreen,
        showPromotionModal,
        showGameOverModal,
        hideGameOverModal,
        showProfileModal,
        hideProfileModal,
        showTradingCard,
        showExitConfirmModal,
        hideExitConfirmModal,
        updateProfileCard,
        showCpuModal,
        showCpuHub,
        showHistoryScreen,
        updatePlayerNames,
        highlightActiveTurn,
        updateScoreUI,
        pulseScore,
        renderSkinSelector,
        renderBoardSettings,
        showAchievementsModal,
        initParallaxHero: _initParallaxHero,
    };

})();

