/* =========================================================
   music.js — Background Music System  (v.014)

   Responsibilities:
     * Plays background music for two contexts: 'lobby' and 'game'.
     * Shuffles tracks randomly (Knuth-Fisher-Yates).
     * Persists volume settings to localStorage.
     * Exposes controls: play, pause, next, stop, setContext, mute.

   How to add music:
     * Lobby tracks --> assets/music/lobby/*.mp3  (or .ogg)
     * Game tracks  --> assets/music/game/*.mp3   (or .ogg)
     * Register the filename in LOBBY_TRACKS / GAME_TRACKS below.

   Dependencies: None (standalone module).
   ========================================================= */

'use strict';

const MusicSystem = (() => {

    // ======================================================
    // TRACK LISTS
    // Add file paths here once you place the audio files.
    // Supported formats: mp3, ogg, wav (browser-dependent)
    // ======================================================

    const LOBBY_TRACKS = [
        'assets/music/lobby/Dance of Swords ~.mp3',
        'assets/music/lobby/Gates Open ~.mp3',
        'assets/music/lobby/Sounds in the Whisper ~.mp3',
    ];

    const GAME_TRACKS = [
        'assets/music/game/Absolute Pulse ~.mp3',
        'assets/music/game/Dance of Swords ~.mp3',
        'assets/music/game/The Novigrad Tavern ~.mp3',
        'assets/music/game/Thunder of Thor ~.mp3',
        'assets/music/game/Зов предков ~.mp3',
    ];

    // ---- Storage -----------------------------------------
    const STORAGE_KEY = 'astrochess_audio';

    function _loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return { musicVolume: 0.5, sfxVolume: 0.8, muted: false };
    }

    function _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                musicVolume: _musicVol,
                sfxVolume:   _sfxVol,
                muted:       _muted,
            }));
        } catch {}
    }

    // ---- State -------------------------------------------
    const _settings     = _loadSettings();
    let _musicVol       = _settings.musicVolume ?? 0.5;
    let _sfxVol         = _settings.sfxVolume   ?? 0.8;
    let _muted          = _settings.muted        ?? false;

    let _context        = 'lobby';
    let _shuffledTracks = [];
    let _trackIndex     = 0;
    let _audio          = null;
    let _playing        = false;

    // ---- Shuffle (Knuth-Fisher-Yates) --------------------
    function _shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function _getTrackList() {
        return _context === 'game' ? GAME_TRACKS : LOBBY_TRACKS;
    }

    function _buildQueue() {
        const list = _getTrackList();
        _shuffledTracks = list.length > 0 ? _shuffle(list) : [];
        _trackIndex = 0;
    }

    let _fadeInterval   = null;
    let _interactionOk  = false;

    // Kicks off music upon first user click (browsers require this)
    function _kickstart() {
        if (_interactionOk) return;
        _interactionOk = true;
        if (!_playing && hasTracksForContext()) {
            play(true); // Play with fade
        }
        document.removeEventListener('click', _kickstart);
        document.removeEventListener('keydown', _kickstart);
    }
    document.addEventListener('click', _kickstart);
    document.addEventListener('keydown', _kickstart);

    // ---- Playback ----------------------------------------

    function play(useFade = true) {
        const list = _getTrackList();
        if (list.length === 0) return;

        if (_shuffledTracks.length === 0) _buildQueue();

        const src = _shuffledTracks[_trackIndex];
        if (!src) return;

        if (_audio && _audio.src.endsWith(src) && !_audio.ended) {
            _audio.play().catch(() => { _playing = false; });
            _playing = true;
            _applyVolume(useFade);
            return;
        }

        _stopAudio();

        _audio = new Audio(src);
        _audio.loop = false;
        
        // Start at 0 volume if fading in
        if (useFade && !_muted) {
            _audio.volume = 0;
        }

        _audio.addEventListener('ended', _onTrackEnded, { once: true });
        _audio.addEventListener('error', _onTrackError, { once: true });

        _audio.play().then(() => {
            _playing = true;
            _applyVolume(useFade);
        }).catch(() => { 
            _playing = false; 
        });
    }

    function _onTrackEnded() {
        _trackIndex++;
        if (_trackIndex >= _shuffledTracks.length) _buildQueue();
        play(true);
    }

    function _onTrackError() {
        _trackIndex++;
        if (_trackIndex >= _shuffledTracks.length) _buildQueue();
        play(false);
    }

    function pause() {
        if (_audio) _audio.pause();
        _playing = false;
    }

    function resume() {
        if (_audio && _audio.paused && _getTrackList().length > 0) {
            _audio.play().catch(() => {});
            _playing = true;
            _applyVolume(true);
        } else if (!_audio) {
            play(true);
        }
    }

    function next() {
        _trackIndex++;
        if (_trackIndex >= _shuffledTracks.length) _buildQueue();
        _stopAudio();
        play(true);
    }

    function stop() {
        _stopAudio();
        _playing = false;
    }

    function _stopAudio() {
        if (_fadeInterval) {
            clearInterval(_fadeInterval);
            _fadeInterval = null;
        }
        if (_audio) {
            _audio.pause();
            _audio.removeEventListener('ended', _onTrackEnded);
            _audio.removeEventListener('error', _onTrackError);
            _audio.src = '';
            _audio = null;
        }
    }

    // ---- Context switching --------------------------------

    function setContext(ctx) {
        if (ctx === _context) return;
        _context = ctx;
        _buildQueue();
        _stopAudio();
        if (_getTrackList().length > 0) play(true);
    }

    // ---- Volume & Mute -----------------------------------

    function _applyVolume(useFade = false) {
        if (!_audio) return;
        if (_fadeInterval) {
            clearInterval(_fadeInterval);
            _fadeInterval = null;
        }

        const targetVol = _muted ? 0 : Math.max(0, Math.min(1, _musicVol));

        if (!useFade || _muted) {
            _audio.volume = targetVol;
            return;
        }

        // Fade in over 2 seconds (20 steps of 100ms)
        const steps = 20;
        const stepTime = 100;
        const currentVol = _audio.volume;
        const volDiff = targetVol - currentVol;
        
        if (Math.abs(volDiff) < 0.01) {
            _audio.volume = targetVol;
            return;
        }

        const stepVol = volDiff / steps;
        let currentStep = 0;

        _fadeInterval = setInterval(() => {
            currentStep++;
            let newVol = currentVol + (stepVol * currentStep);
            
            // Boundary checks
            if (newVol > 1) newVol = 1;
            if (newVol < 0) newVol = 0;
            
            _audio.volume = newVol;

            if (currentStep >= steps) {
                _audio.volume = targetVol;
                clearInterval(_fadeInterval);
                _fadeInterval = null;
            }
        }, stepTime);
    }

    function setMusicVolume(v) {
        _musicVol = Math.max(0, Math.min(1, v));
        _applyVolume(false); // immediate
        _saveSettings();
    }

    function setSfxVolume(v) {
        _sfxVol = Math.max(0, Math.min(1, v));
        _saveSettings();
    }

    function toggleMute() {
        _muted = !_muted;
        _applyVolume(false); // immediate
        _saveSettings();
        return _muted;
    }

    function getMusicVolume()  { return _musicVol; }
    function getSfxVolume()    { return _sfxVol;   }
    function isMuted()         { return _muted;    }
    function isPlaying()       { return _playing;  }

    function getCurrentTrackName() {
        if (!_shuffledTracks.length || !_shuffledTracks[_trackIndex]) return null;
        const src  = _shuffledTracks[_trackIndex];
        const base = src.split('/').pop();
        return base.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    }

    function hasTracksForContext(ctx) {
        const list = ((ctx || _context) === 'game') ? GAME_TRACKS : LOBBY_TRACKS;
        return list.length > 0;
    }

    function getContext() { return _context; }

    // ---- Public API --------------------------------------
    return {
        play,
        pause,
        resume,
        next,
        stop,
        setContext,
        setMusicVolume,
        setSfxVolume,
        toggleMute,
        getMusicVolume,
        getSfxVolume,
        isMuted,
        isPlaying,
        getCurrentTrackName,
        hasTracksForContext,
        getContext,
    };

})();
