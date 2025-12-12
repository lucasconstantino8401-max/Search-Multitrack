
// Data Models
export interface Track {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  downloadUrl: string;
  genre?: string; // New field for Genre/Style
  searchCount: number;
  createdAt?: string; // ISO Date string
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface UserData {
  uid: string;
  email: string;
  lastLogin: Date;
}

export interface AppSettings {
  googleSheetsApiUrl: string;
}

// Global declarations for the environment variables injected by the previous platform
declare global {
  var __app_id: string | undefined;
}

// Component Props
export interface SplashScreenProps {
  onFinish: () => void;
}

export interface LoginScreenProps {
  onLogin: (user: User) => void;
  onCancel?: () => void; // Added to allow going back to guest mode
  cachedUser?: User | null; // Usuário salvo no cache
  onClearCache?: () => void; // Função para limpar o cache e trocar de conta
}

export interface AdminPanelProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void; // Trigger to refresh main app
}

export interface MainAppProps {
  user: User | null; // Allow null for Guest Mode
  onLogout: () => void;
  onLoginRequest: () => void; // Trigger login screen
}

// Runtime export to ensure this file is emitted as a module by the transpiler
export const TYPES_VERSION = '2.2.0';