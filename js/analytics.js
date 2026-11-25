/* =========================================================
   analytics.js — Umami Analytics integration for Astro Chess
   Provides privacy-friendly metrics & event tracking.
   ========================================================= */

'use strict';

const Analytics = (() => {
    /**
     * Track a custom event in Umami with optional structured data.
     * Safe to call even if Umami script is not loaded or blocked by adblockers.
     * 
     * @param {string} eventName - Name of the event (e.g. 'game_start', 'game_end')
     * @param {Object} [eventData] - Optional metadata payload (e.g. { mode: 'cpu', difficulty: 'medium' })
     */
    function track(eventName, eventData = {}) {
        try {
            if (typeof window !== 'undefined' && window.umami && typeof window.umami.track === 'function') {
                window.umami.track(eventName, eventData);
            }
        } catch (e) {
            // Silently ignore tracking errors to never interrupt gameplay
            console.debug('[Analytics] Failed to track event:', eventName, e);
        }
    }

    return {
        track
    };
})();
