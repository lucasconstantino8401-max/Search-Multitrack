import React, { useState } from 'react';
import { signInWithGoogle } from '../services/firebase';
import { loginUser as saveUserSession } from '../services/storage';
import type { LoginScreenProps } from '../types';
import InteractiveBackground from './InteractiveBackground';
import { LogIn, UserCircle2, X } from 'lucide-react';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, cachedUser, onClearCache }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
        const user = await signInWithGoogle();
        saveUserSession(user);
        onLogin(user);
    } catch (error: any) {
        console.error("Login Failed:", error);
        
        let message = "Falha ao conectar com Google.";
        if (error.message) {
            message = error.message; 
        } else if (error.code) {
             message = `Erro: ${error.code}`;
        }

        setErrorMsg(message);
        setLoading(false);
    }
  };

  const handleCachedLogin = () => {
      if (cachedUser) {
          onLogin(cachedUser);
      }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      <InteractiveBackground />

      <div className="z-10 bg-zinc-900/40 backdrop-blur-2xl p-10 rounded-3xl border border-white/5 w-full max-w-md shadow-2xl relative overflow-hidden group">
        
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>

        {/* --- HEADER LOGO --- */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 relative">
             <div className="absolute inset-0 bg-white blur-3xl opacity-5 rounded-full"></div>
             <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-2xl">
                <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90C63.2 90 74.8 83.6 82.5 73.5" stroke="white" strokeWidth="6" strokeLinecap="round" className="opacity-100" />
                <path d="M78 78L90 90" stroke="#71717a" strokeWidth="8" strokeLinecap="round" />
                <rect x="32" y="35" width="8" height="30" rx="4" fill="#a1a1aa" />
                <rect x="46" y="25" width="8" height="50" rx="4" fill="white" />
                <rect x="60" y="40" width="8" height="20" rx="4" fill="#a1a1aa" />
            </svg>
          </div>
          
          <div className="flex flex-col items-center justify-center">
              <span className="text-lg font-black text-zinc-500 tracking-[0.2em] uppercase leading-tight">Search</span>
              <span className="text-lg font-black text-white tracking-[0.2em] uppercase leading-tight">Multitracks</span>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT --- */}
        {cachedUser ? (
            // === WELCOME BACK VIEW ===
            <div className="flex flex-col items-center w-full animate-fade-in-up">
                <div className="relative mb-6 group cursor-pointer">
                    <img 
                        src={cachedUser.photoURL || `https://ui-avatars.com/api/?name=${cachedUser.displayName}&background=random`} 
                        alt="User" 
                        className="w-20 h-20 rounded-full border-2 border-white/10 shadow-xl object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-black rounded-full"></div>
                </div>

                <h2 className="text-xl font-bold text-white mb-1">Olá, {cachedUser.displayName.split(' ')[0]}</h2>
                <p className="text-zinc-500 text-xs mb-8">{cachedUser.email}</p>

                <button
                    onClick={handleCachedLogin}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-white/5 mb-3"
                >
                    <LogIn size={20} />
                    <span>ENTRAR</span>
                </button>

                <button
                    onClick={onClearCache}
                    className="text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-wider font-bold py-2 flex items-center gap-2"
                >
                    <UserCircle2 size={14} />
                    Trocar de conta
                </button>
            </div>
        ) : (
            // === GOOGLE LOGIN VIEW ===
            <div className="w-full animate-fade-in">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-white/5 group border border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#000" d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.17s.13-1.51.35-2.17V7.01H2.18C.79 9.77 0 12.89 0 16c0 3.11.79 6.23 2.18 8.99l3.66-2.82z" />
                        <path fill="#000" d="M12 4.86c1.61 0 3.09.56 4.23 1.64l3.18-3.18C17.46 1.52 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.01l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Entrar com Google</span>
                    </>
                  )}
                </button>
                
                {errorMsg && (
                    <div className="mt-6 mx-auto w-full max-w-sm text-center animate-fade-in">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg break-words flex items-center justify-center gap-2">
                           <X size={14} /> {errorMsg}
                        </div>
                    </div>
                )}
            </div>
        )}
        
        <div className="mt-8 flex justify-between items-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold border-t border-white/5 pt-4">
            <span>Secure Server</span>
            <span>V 2.2.0</span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;