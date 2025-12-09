import type { Track, User, AppSettings } from '../types';

const STORAGE_KEY_TRACKS = 'search_multitracks_data';
const STORAGE_KEY_SETTINGS = 'search_multitracks_settings';
const STORAGE_KEY_USER = 'search_multitracks_user';

// Mock Data Inicial VAZIO para respeitar a base de dados do usuário
const INITIAL_TRACKS: Track[] = [];

// --- TRACKS SERVICE ---

export const getTracks = (): Track[] => {
  const stored = localStorage.getItem(STORAGE_KEY_TRACKS);
  if (!stored) {
    // Inicializa vazio se não houver dados
    localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(INITIAL_TRACKS));
    return INITIAL_TRACKS;
  }
  return JSON.parse(stored);
};

export const saveTrack = (track: Partial<Track>): Track => {
  const tracks = getTracks();
  
  if (track.id) {
    // Update
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      const updatedTrack = { ...tracks[index], ...track };
      tracks[index] = updatedTrack as Track;
      localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(tracks));
      return updatedTrack as Track;
    }
  }

  // Create
  const newTrack: Track = {
    id: Date.now().toString(),
    title: track.title || 'Sem título',
    artist: track.artist || 'Artista Desconhecido',
    imageUrl: track.imageUrl || '',
    downloadUrl: track.downloadUrl || '',
    searchCount: 0,
    createdAt: new Date().toISOString(),
    ...track
  } as Track;

  tracks.push(newTrack);
  localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(tracks));
  return newTrack;
};

export const deleteTrack = (id: string): void => {
  const tracks = getTracks();
  const filtered = tracks.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(filtered));
};

export const incrementSearchCount = (id: string): void => {
  const tracks = getTracks();
  const index = tracks.findIndex(t => t.id === id);
  if (index !== -1) {
    tracks[index].searchCount = (tracks[index].searchCount || 0) + 1;
    localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(tracks));
  }
};

// --- SETTINGS SERVICE (GOOGLE SHEETS URL) ---

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
  
  // Clean headers: remove quotes and spaces, convert to lower case for mapping
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma but ignore commas inside quotes (standard CSV handling)
    const currentLine = lines[i];
    const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    const obj: any = {};
    headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : '';
        // Unescape quotes
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

  let fetchUrl = url;

  // 1. Smart Detection: Google Sheets Browser URL
  // Converts: https://docs.google.com/spreadsheets/d/ID/edit... 
  // To: https://docs.google.com/spreadsheets/d/ID/export?format=csv
  if (url.includes('docs.google.com/spreadsheets') && !url.includes('/export')) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        console.log("Auto-converted Google Sheet URL to CSV Export:", fetchUrl);
    }
  }
  
  let textData = '';

  try {
    // Attempt 1: Direct Fetch
    const response = await fetch(fetchUrl);
    if (response.ok) {
        textData = await response.text();
    } else {
        throw new Error("Direct fetch failed");
    }
  } catch (err) {
    console.warn("Direct fetch failed or CORS error, trying proxy...", err);
    // Attempt 2: Proxy Fallback (Bypasses CORS for public links)
    // We append a timestamp to avoid aggressive caching
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}&disableCache=${Date.now()}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
        textData = await response.text();
    } catch (proxyErr) {
        throw new Error("Falha na conexão. Verifique se o link está PÚBLICO (Arquivo > Compartilhar > Qualquer pessoa com o link).");
    }
  }
    
  // Check if result is HTML (common error when proxying to a login page)
  if (textData.trim().toLowerCase().startsWith('<!doctype html>') || textData.includes('<html')) {
     throw new Error("O link retornou uma página de erro/login. Certifique-se que a planilha está pública.");
  }

  let items: any[] = [];

  // 2. Parse Data (JSON vs CSV)
  try {
      // Try parsing as JSON first
      if (textData.trim().startsWith('[') || textData.trim().startsWith('{')) {
        const json = JSON.parse(textData);
        items = Array.isArray(json) ? json : (json.data || json.items || []);
      } else {
        throw new Error("Not JSON");
      }
  } catch (e) {
      // Fallback to CSV
      items = parseCSV(textData);
  }
  
  if (!Array.isArray(items)) {
      throw new Error("Formato de dados não reconhecido. Use JSON ou CSV.");
  }

  const currentTracks = getTracks();
  let updatedCount = 0;
  
  // Helper to normalize strings for comparison
  const normalize = (str: any) => str ? String(str).trim().toLowerCase() : '';

  items.forEach((item: any) => {
      // Map fields flexibly (supports both English and Portuguese headers from CSV/JSON)
      // Mapeamento: Título (Nome, Musica), Artista (Banda, Cantor), Capa, Link
      const title = item.title || item.nome || item.name || item.titulo || item.musica || item['nome da música'] || '';
      const artist = item.artist || item.artista || item.cantor || item.banda || item['nome da banda'] || '';
      
      if (!title) return; // Skip invalid entries

      const imageUrl = item.imageUrl || item.image || item.imagem || item.capa || item.foto || item['link da capa'] || '';
      const downloadUrl = item.downloadUrl || item.download || item.link || item.url || item.arquivo || item['link de download'] || '';
      
      // Find existing track by ID (if provided) or fuzzy match Title+Artist
      let existingIndex = -1;
      
      if (item.id) {
          existingIndex = currentTracks.findIndex(t => t.id === String(item.id));
      }
      
      if (existingIndex === -1) {
          existingIndex = currentTracks.findIndex(t => 
              normalize(t.title) === normalize(title) && 
              normalize(t.artist) === normalize(artist)
          );
      }

      const newTrackData: Track = {
          id: existingIndex !== -1 ? currentTracks[existingIndex].id : (item.id ? String(item.id) : Date.now().toString() + Math.random().toString(36).substr(2, 5)),
          title: title,
          artist: artist || 'Desconhecido',
          imageUrl: imageUrl,
          downloadUrl: downloadUrl,
          searchCount: existingIndex !== -1 ? currentTracks[existingIndex].searchCount : 0,
          createdAt: existingIndex !== -1 ? currentTracks[existingIndex].createdAt : new Date().toISOString()
      };

      if (existingIndex !== -1) {
          currentTracks[existingIndex] = newTrackData;
      } else {
          currentTracks.push(newTrackData);
      }
      updatedCount++;
  });

  localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(currentTracks));
  return updatedCount;
};

// --- AUTH SERVICE ---

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  return stored ? JSON.parse(stored) : null;
};

// Agora aceita um usuário opcional, caso contrário usa mock (retrocompatibilidade)
export const loginUser = (user?: User): User => {
  if (user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }
  
  // Fallback Mock (não deveria ser chamado se usamos o firebase service, mas mantido por segurança)
  const mockUser: User = {
    uid: 'admin-user-123',
    email: 'admin@searchmultitracks.com',
    displayName: 'Administrador',
    photoURL: ''
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser));
  return mockUser;
};

export const logoutUser = (): void => {
  localStorage.removeItem(STORAGE_KEY_USER);
};