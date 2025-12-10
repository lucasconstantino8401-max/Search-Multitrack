import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import type { User } from '../types';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE
// 1. Crie um projeto no console.firebase.google.com
// 2. Vá em Authentication > Sign-in method > Habilite o Google
// 3. Vá em Project Settings > Geral > Web Apps > Copie a config SDK
// 4. Substitua os valores abaixo:
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
let auth: any;
let googleProvider: any;
let isConfigured = false;

// Inicialização Segura
try {
    // Verificamos se a config foi alterada do placeholder padrão
    if (firebaseConfig.apiKey !== "API_KEY_AQUI") {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        isConfigured = true;
        console.log("Firebase configurado com sucesso.");
    } else {
        console.log("Firebase executando em modo Demonstração (Sem chaves configuradas).");
    }
} catch (error) {
    console.warn("Erro ao inicializar Firebase:", error);
}

/**
 * Realiza o login com Google.
 * Se o Firebase não estiver configurado, realiza um login simulado (Mock).
 */
export const signInWithGoogle = async (): Promise<User> => {
    // MODO DEMONSTRAÇÃO / FALLBACK
    if (!isConfigured) {
        console.warn("Firebase não configurado. Usando Mock de Login.");
        return new Promise((resolve) => {
             setTimeout(() => {
                 // Retorna um usuário Admin Fake para testes
                 // DICA: Adicione 'admin@searchmultitracks.com' no ADMIN_EMAILS em MainApp.tsx
                 const mockUser: User = {
                     uid: 'mock-admin-' + Date.now(),
                     email: 'admin@searchmultitracks.com', 
                     displayName: 'Admin (Modo Teste)',
                     photoURL: ''
                 };
                 resolve(mockUser);
             }, 1200);
        });
    }

    // LOGIN REAL COM FIREBASE
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        
        return {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Usuário',
            photoURL: fbUser.photoURL || ''
        };
    } catch (error) {
        console.error("Erro no Auth Google:", error);
        throw error;
    }
};

/**
 * Realiza o logout.
 */
export const logoutFirebase = async () => {
    if (isConfigured && auth) {
        await firebaseSignOut(auth);
    }
};