/* =========================================================
   timer.js — Per-player countdown clock  (v.021)

   Changes in v.021:
     • The clock derives remaining time from wall-clock deltas
       instead of decrementing a counter, so a throttled or
       backgrounded tab can no longer grant free thinking time.
     • pause() / resume() / isPaused() expose a real hold, which
       the Pause control uses to freeze both clocks.

   Usage:
     Timer.start(minutes, activePlayerFn, pausedFn, onTimeoutCb)
     Timer.pause()  / Timer.resume() / Timer.isPaused()
     Timer.stop()   / Timer.reset(minutes)
   ========================================================= */

'use strict';

const Timer = (() => {

    // ── State ─────────────────────────────────────────────
    let _timeW    = 0;          // seconds remaining, white
    let _timeB    = 0;          // seconds remaining, black
    let _interval = null;
    let _lastTick = 0;          // ms timestamp of the previous tick
    let _held     = false;      // true while explicitly paused by the player
    let _getPlayer = () => 'none';
    let _isPaused  = () => false;
    let _onTimeout = null;

    // ── DOM ───────────────────────────────────────────────
    const timerWhiteEl = document.getElementById('timer-white');
    const timerBlackEl = document.getElementById('timer-black');

    // ── Helpers ───────────────────────────────────────────
    function _fmt(secs) {
        const s = Math.ceil(Math.max(0, secs));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    }

    function _updateDisplay() {
        if (!timerWhiteEl || !timerBlackEl) return;
        timerWhiteEl.textContent = _fmt(_timeW);
        timerBlackEl.textContent = _fmt(_timeB);

        // Turn red & animate under one minute
        const WARN = 60;
        timerWhiteEl.classList.toggle('low', _timeW > 0 && _timeW <= WARN);
        timerBlackEl.classList.toggle('low', _timeB > 0 && _timeB <= WARN);

        // Keep the accessible label in step without spawning a live region
        timerWhiteEl.setAttribute('aria-label', `Tiempo de las blancas: ${_fmt(_timeW)}`);
        timerBlackEl.setAttribute('aria-label', `Tiempo de las negras: ${_fmt(_timeB)}`);
    }

    function _tick() {
        const now = performance.now();
        const elapsed = (now - _lastTick) / 1000;
        _lastTick = now;

        if (_held || _isPaused()) return;

        const player = _getPlayer();
        if (player === 'none') { stop(); return; }

        if (player === 'w') _timeW = Math.max(0, _timeW - elapsed);
        else                _timeB = Math.max(0, _timeB - elapsed);

        _updateDisplay();

        if (_timeW <= 0 || _timeB <= 0) {
            const winner = _timeW <= 0 ? 'b' : 'w';
            stop();
            _onTimeout(winner);
        }
    }

    // ── Public ────────────────────────────────────────────

    /**
     * Start the clock.
     * @param {number}   minutes          Minutes per player.
     * @param {Function} activePlayerFn   Returns 'w', 'b' or 'none'.
     * @param {Function} pausedFn         Returns true while the game itself
     *                                    is paused (promotion modal, game over).
     * @param {Function} onTimeoutCb      Called with the winning colour.
     */
    function start(minutes, activePlayerFn, pausedFn, onTimeoutCb) {
        stop();
        _timeW     = minutes * 60;
        _timeB     = minutes * 60;
        _held      = false;
        _getPlayer = activePlayerFn || (() => 'none');
        _isPaused  = pausedFn       || (() => false);
        _onTimeout = onTimeoutCb    || (() => {});
        _updateDisplay();

        _lastTick = performance.now();
        _interval = setInterval(_tick, 250);
    }

    function stop() {
        if (_interval) { clearInterval(_interval); _interval = null; }
    }

    /** Freeze both clocks without losing the remaining time. */
    function pause() {
        if (_held) return;
        _held = true;
    }

    /** Release a hold and resume counting from now. */
    function resume() {
        if (!_held) return;
        _held = false;
        _lastTick = performance.now();
    }

    function isPaused() { return _held; }

    /**
     * Seed the clocks with specific remaining seconds (used when resuming a
     * saved game). Call after start().
     * @param {{w:number, b:number}} remaining seconds per colour
     */
    function restore(remaining) {
        if (!remaining) return;
        if (typeof remaining.w === 'number') _timeW = Math.max(0, remaining.w);
        if (typeof remaining.b === 'number') _timeB = Math.max(0, remaining.b);
        _lastTick = performance.now();
        _updateDisplay();
    }

    /** Current remaining seconds, for persistence. */
    function snapshot() {
        return { w: _timeW, b: _timeB };
    }

    /** Reset the display without starting the ticker. */
    function reset(minutes) {
        stop();
        _held  = false;
        _timeW = minutes * 60;
        _timeB = minutes * 60;
        _updateDisplay();
    }

    return { start, stop, reset, pause, resume, isPaused, restore, snapshot };

})();
