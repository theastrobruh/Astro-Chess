/* =========================================================
   auth.js — Firebase Authentication & Google Sign-In
   ========================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

let auth = null;
let provider = null;
let currentUser = null;

// Initialize Firebase if configuration is provided
if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
    try {
        const app = initializeApp(window.FIREBASE_CONFIG);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();

        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                console.log('[Auth] User logged in:', user.displayName);
                if (typeof ProfileSystem !== 'undefined') {
                    ProfileSystem.syncGoogleUser({
                        name: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        uid: user.uid
                    });
                }
                if (typeof UI !== 'undefined' && UI.updateProfileCard) {
                    UI.updateProfileCard();
                }
                if (typeof Analytics !== 'undefined') {
                    Analytics.track('login_success', { provider: 'google' });
                }
            } else {
                console.log('[Auth] User logged out / guest');
            }
            _updateAuthUI(user);
        });
    } catch (e) {
        console.warn('[Auth] Firebase initialization error:', e);
    }
}

function _updateAuthUI(user) {
    const googleBtn = document.getElementById('btn-google-login');
    const googleLogoutBtn = document.getElementById('btn-google-logout');
    const userBadge = document.getElementById('google-user-badge');

    if (user) {
        if (googleBtn) googleBtn.classList.add('hidden');
        if (googleLogoutBtn) googleLogoutBtn.classList.remove('hidden');
        if (userBadge) {
            userBadge.classList.remove('hidden');
            userBadge.innerHTML = `
                <img src="${user.photoURL || ''}" class="google-user-avatar" alt="Google Avatar" onerror="this.style.display='none'">
                <div class="google-user-info">
                    <span class="google-user-name">${user.displayName || 'Google Player'}</span>
                    <span class="google-user-email">${user.email || ''}</span>
                </div>
            `;
        }
    } else {
        if (googleBtn) googleBtn.classList.remove('hidden');
        if (googleLogoutBtn) googleLogoutBtn.classList.add('hidden');
        if (userBadge) {
            userBadge.classList.add('hidden');
            userBadge.innerHTML = '';
        }
    }
}

export async function loginWithGoogle() {
    if (!auth || !provider) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast('Configura tus credenciales de Firebase en js/firebase-config.js', 'warning');
        } else {
            alert('Configura tus credenciales de Firebase en js/firebase-config.js');
        }
        return null;
    }

    try {
        const result = await signInWithPopup(auth, provider);
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
        }
        return result.user;
    } catch (error) {
        console.error('[Auth] Error during Google Sign-in:', error);
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(`Error al iniciar sesión: ${error.message}`, 'danger');
        }
        return null;
    }
}

export async function logoutUser() {
    if (!auth) return;
    try {
        await signOut(auth);
        if (typeof ProfileSystem !== 'undefined') {
            ProfileSystem.clearGoogleUser();
        }
        if (typeof UI !== 'undefined') {
            if (UI.updateProfileCard) UI.updateProfileCard();
            if (UI.showToast) UI.showToast('Sesión cerrada con éxito', 'info');
        }
        if (typeof Analytics !== 'undefined') {
            Analytics.track('logout');
        }
    } catch (error) {
        console.error('[Auth] Error signing out:', error);
    }
}

// Expose on window for easy access
window.AuthSystem = {
    loginWithGoogle,
    logoutUser,
    getUser: () => currentUser,
    isConfigured: () => !!(auth && provider)
};
