import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainApp from './components/MainApp';
import { getCurrentUser, logoutUser } from './services/storage';
import { logoutFirebase } from './services/firebase';
import type { User } from './types';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // Usuário ativo da sessão atual
  const [cachedUser, setCachedUser] = useState<User | null>(null); // Usuário salvo no histórico

  useEffect(() => {
    // Verifica se existe um usuário salvo no LocalStorage
    const stored = getCurrentUser();
    if (stored) {
        // NÃO loga automaticamente (setUser), apenas salva no estado de cache
        // para mostrar na tela de login.
        setCachedUser(stored);
    }
    setLoading(false);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = async () => {
    await logoutFirebase();
    // Ao sair de dentro do app, limpamos tudo para garantir segurança
    logoutUser();
    setCachedUser(null);
    setUser(null);
  };

  const handleClearCache = () => {
      // Limpa o cache da tela de login (Trocar Conta)
      logoutUser();
      setCachedUser(null);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500"></div>
        </div>
    );
  }

  // Se não houver usuário ativo, mostra a tela de Login.
  // Passamos o cachedUser para que a tela de login possa mostrar o botão "Entrar como..."
  if (!user) {
      return (
        <LoginScreen 
            onLogin={handleLogin} 
            cachedUser={cachedUser}
            onClearCache={handleClearCache}
        />
      );
  }

  return (
    <MainApp 
        user={user} 
        onLogout={handleLogout} 
        onLoginRequest={() => {}} 
    />
  );
}