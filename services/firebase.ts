import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import type { User } from '../types';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC3do0sfTr8za_FtJhuvdDRlSElQRQCqbs",
  authDomain: "search-multitrack.firebaseapp.com",
  projectId: "search-multitrack",
  storageBucket: "search-multitrack.firebasestorage.app",
  messagingSenderId: "972332306776",
  appId: "1:972332306776:web:40b4017e4f9b66c5aa152d",
  measurementId: "G-ZEBZSHTPFB"
};

// --- SINGLETONS ---
let auth: any = undefined;
let db: any = undefined;
let googleProvider: any = undefined;
let isConfigured = false;

// Inicialização segura
try {
    // Verifica se já existe uma instância (importante para HMR/Dev)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Configura Referências
    // O 'firebase' importado aqui já deve ter .auth() e .firestore() anexados pelos imports laterais
    if (firebase.auth) {
        auth = firebase.auth();
    } else {
        console.error("Firebase Auth module not loaded. Check import maps.");
    }
    
    if (firebase.firestore) {
        db = firebase.firestore();
    } else {
        console.error("Firebase Firestore module not loaded. Check import maps.");
    }

    if (auth && firebase.auth && firebase.auth.GoogleAuthProvider) {
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({
            prompt: 'select_account'
        });
    }

    // Exportar para window para fallback
    if (typeof window !== 'undefined') {
        (window as any).firebase = firebase;
    }

    if (auth && db) {
        isConfigured = true;
        console.log("Firebase initialized successfully.");
    }

} catch (error) {
    console.error("Firebase Initialization Error:", error);
    isConfigured = false;
}

export { auth, db, firebase };

/**
 * Realiza o login com Google.
 */
export const signInWithGoogle = async (): Promise<User> => {
    if (!isConfigured || !auth || !googleProvider) {
        console.warn("Firebase not configured. Using Mock.");
        return new Promise((resolve) => {
             setTimeout(() => {
                 const mockUser: User = {
                     uid: 'mock-admin-' + Date.now(),
                     email: 'admin@searchmultitracks.com', 
                     displayName: 'Admin (Mock)',
                     photoURL: ''
                 };
                 resolve(mockUser);
             }, 1000);
        });
    }

    try {
        const result = await auth.signInWithPopup(googleProvider);
        const fbUser = result.user;
        
        return {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Usuário',
            photoURL: fbUser.photoURL || ''
        };
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        
        // Fallback para ambientes restritos (como iframes de preview)
        if (error.code === 'auth/operation-not-supported-in-this-environment' || 
            error.code === 'auth/popup-closed-by-user' ||
            error.code === 'auth/unauthorized-domain') {
            
            console.warn("Ambiente restrito. Ativando Mock.");
            return new Promise((resolve) => {
                 setTimeout(() => {
                     const mockUser: User = {
                         uid: 'mock-admin-' + Date.now(),
                         email: 'admin@searchmultitracks.com', 
                         displayName: 'Admin (Mock)',
                         photoURL: ''
                     };
                     resolve(mockUser);
                 }, 1500);
            });
        }
        throw error;
    }
};

/**
 * Realiza o logout.
 */
export const logoutFirebase = async () => {
    if (isConfigured && auth) {
        try {
            await auth.signOut();
        } catch (e) {
            console.warn("Logout error:", e);
        }
    }
};