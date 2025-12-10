import type { Track, User, AppSettings } from '../types';
import { db } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const STORAGE_KEY_SETTINGS = 'search_multitracks_settings';
const STORAGE_KEY_USER = 'search_multitracks_user';

// --- TRACKS SERVICE (FIRESTORE) ---

const TRACKS_COLLECTION = 'tracks';

/**
 * Inscreve-se para receber atualizações em tempo real das tracks.
 * @param callback Função chamada quando os dados mudam.
 * @returns Função para cancelar a inscrição.
 */
export const listenToTracks = (callback: (tracks: Track[]) => void) => {
  if (!db) {
    console.error("Database not initialized");
    callback([]);
    return () => {};
  }

  // Compat Syntax: db.collection()
  const unsubscribe = db.collection(TRACKS_COLLECTION).onSnapshot((snapshot: any) => {
    const tracks: Track[] = [];
    snapshot.forEach((doc: any) => {
      tracks.push(doc.data() as Track);
    });
    callback(tracks);
  }, (error: any) => {
    console.error("Error listening to tracks:", error);
  });

  return unsubscribe;
};

/**
 * Salva ou atualiza uma track no Firestore.
 */
export const saveTrackRemote = async (track: Partial<Track>): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  const id = track.id || Date.now().toString();
  // Compat Syntax: db.collection(...).doc(...)
  const trackRef = db.collection(TRACKS_COLLECTION).doc(id);

  // Se for nova, preenche defaults
  // Se for update, mescla
  
  const defaults = {
    id: id,
    title: 'Sem título',
    artist: 'Artista Desconhecido',
    imageUrl: '',
    downloadUrl: '',
    genre: 'Worship',
    searchCount: 0,
    createdAt: new Date().toISOString()
  };

  const dataToSave = { ...defaults, ...track };
  
  // Clean undefined values
  Object.keys(dataToSave).forEach(key => 
    (dataToSave as any)[key] === undefined && delete (dataToSave as any)[key]
  );

  // Compat Syntax: ref.set(data, options)
  await trackRef.set(dataToSave, { merge: true });
};

/**
 * Remove uma track do Firestore.
 */
export const deleteTrackRemote = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  // Compat Syntax: db.collection(...).doc(...).delete()
  await db.collection(TRACKS_COLLECTION).doc(id).delete();
};

/**
 * Incrementa o contador de busca atomicamente no Firestore.
 */
export const incrementSearchCountRemote = async (id: string): Promise<void> => {
  if (!db) return;
  try {
    // Compat Syntax: FieldValue.increment
    await db.collection(TRACKS_COLLECTION).doc(id).update({
      searchCount: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {
    console.error("Error updating count:", e);
  }
};

// --- SETTINGS SERVICE (LOCAL STORAGE - Configuração por dispositivo) ---

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (!stored) {
    return { googleSheetsApiUrl: '' };
  }
  return JSON.parse(stored);
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};

// --- INTEGRATION SERVICE ---

// Helper: Parse CSV Text
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Clean headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Regex complexo para separar CSV respeitando aspas
    const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    const obj: any = {};
    headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : '';
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        val = val.replace(/""/g, '"');
        obj[header] = val;
    });
    result.push(obj);
  }
  return result;
};

export const syncFromGoogleSheets = async (url: string): Promise<number> => {
  if (!url) throw new Error("URL não configurada.");
  if (!db) throw new Error("Banco de dados não conectado.");

  let fetchUrl = url;

  if (url.includes('docs.google.com/spreadsheets') && !url.includes('/export')) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }
  
  let textData = '';
  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
        textData = await response.text();
    } else {
        throw new Error("Direct fetch failed");
    }
  } catch (err) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}&disableCache=${Date.now()}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
        textData = await response.text();
    } catch (proxyErr) {
        throw new Error("Falha na conexão com a planilha.");
    }
  }

  let items: any[] = [];
  try {
      if (textData.trim().startsWith('[') || textData.trim().startsWith('{')) {
        const json = JSON.parse(textData);
        items = Array.isArray(json) ? json : (json.data || json.items || []);
      } else {
        items = parseCSV(textData);
      }
  } catch (e) {
      items = parseCSV(textData);
  }
  
  if (!Array.isArray(items)) throw new Error("Formato de dados inválido.");

  // Obter tracks atuais para verificar duplicatas (snapshot único)
  // Compat Syntax: db.collection().get()
  const snapshot = await db.collection(TRACKS_COLLECTION).get();
  const currentTracks: Track[] = [];
  snapshot.forEach((doc: any) => currentTracks.push(doc.data() as Track));

  let updatedCount = 0;
  const normalize = (str: any) => str ? String(str).trim().toLowerCase() : '';

  // Processar itens
  const promises = items.map(async (item: any) => {
      const title = item.title || item.nome || item.name || item.titulo || item.musica || item['nome da música'] || '';
      const artist = item.artist || item.artista || item.cantor || item.banda || item['nome da banda'] || '';
      
      if (!title) return;

      const imageUrl = item.imageUrl || item.image || item.imagem || item.capa || item.foto || item['link da capa'] || '';
      const downloadUrl = item.downloadUrl || item.download || item.link || item.url || item.arquivo || item['link de download'] || '';
      const genre = item.genre || item.genero || item.estilo || item.style || item.categoria || 'Worship';

      // Verificar existência
      let existingTrack = currentTracks.find(t => 
          (item.id && t.id === String(item.id)) || 
          (normalize(t.title) === normalize(title) && normalize(t.artist) === normalize(artist))
      );

      const trackId = existingTrack ? existingTrack.id : (item.id ? String(item.id) : Date.now().toString() + Math.random().toString(36).substr(2, 5));

      const newTrackData: Partial<Track> = {
          id: trackId,
          title: title,
          artist: artist || 'Desconhecido',
          imageUrl: imageUrl,
          downloadUrl: downloadUrl,
          genre: genre,
          // Mantém contagem existente ou inicia com 0
          searchCount: existingTrack ? existingTrack.searchCount : 0,
          createdAt: existingTrack?.createdAt || new Date().toISOString()
      };

      await saveTrackRemote(newTrackData);
      updatedCount++;
  });

  await Promise.all(promises);
  return updatedCount;
};

// --- AUTH SERVICE (LOCAL SESSION) ---

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  return stored ? JSON.parse(stored) : null;
};

export const loginUser = (user?: User): User => {
  if (user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }
  const mockUser: User = { uid: 'mock', email: 'mock@test.com', displayName: 'Mock', photoURL: '' };
  return mockUser;
};

export const logoutUser = (): void => {
  localStorage.removeItem(STORAGE_KEY_USER);
};

// --- LEGACY EXPORTS (Mantidos para evitar quebras imediatas, mas redirecionados se possível ou retornando vazio) ---
// Estas funções são síncronas e incompatíveis com Firestore. O UI deve usar listenToTracks.
export const getTracks = (): Track[] => {
    return []; // Deprecated: UI should use listenToTracks
};
export const saveTrack = (t: Partial<Track>) => saveTrackRemote(t); // Async wrapper warning
export const deleteTrack = (id: string) => deleteTrackRemote(id); // Async wrapper warning
export const incrementSearchCount = (id: string) => incrementSearchCountRemote(id);