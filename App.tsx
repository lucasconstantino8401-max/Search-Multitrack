import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainApp from './components/MainApp';
import { logoutUser } from './services/storage'; // Importamos logoutUser para limpar resquícios
import { logoutFirebase } from './services/firebase';
import type { User } from './types';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // ALTERAÇÃO: Não verificamos mais o 'getCurrentUser()' no localStorage.
    // Isso garante que ao abrir o app, o usuário SEMPRE caia na tela de Login primeiro.
    
    // Opcional: Se quiser garantir que desconectou mesmo, pode chamar isso:
    // logoutUser(); 
    
    // Apenas finaliza o loading e deixa o user como null.
    setLoading(false);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = async () => {
    await logoutFirebase();
    logoutUser();
    setUser(null);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500"></div>
        </div>
    );
  }

  // Se não houver usuário (o que agora é o padrão ao abrir), mostra Login.
  if (!user) {
      return (
        <LoginScreen 
            onLogin={handleLogin} 
        />
      );
  }

  // Apenas renderiza o app principal se o usuário passar pelo LoginScreen
  return (
    <MainApp 
        user={user} 
        onLogout={handleLogout} 
        onLoginRequest={() => {}} 
    />
  );
}