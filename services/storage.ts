import type { Track, User, AppSettings } from '../types';
import { db, firebase } from './firebase'; 

const STORAGE_KEY_SETTINGS = 'search_multitracks_settings';
const STORAGE_KEY_USER = 'search_multitracks_user';
const FIRESTORE_CONFIG_COLLECTION = 'app_config';
const FIRESTORE_CONFIG_DOC = 'main';

// --- SETTINGS SERVICE (HYBRID: FIRESTORE + LOCAL) ---

// Salva as configurações na Nuvem (Firestore) para que todos vejam
export const saveSettingsRemote = async (settings: AppSettings): Promise<void> => {
    if (!db) {
        // Fallback local se Firebase não estiver ativo
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        return;
    }

    try {
        await db.collection(FIRESTORE_CONFIG_COLLECTION).doc(FIRESTORE_CONFIG_DOC).set(settings, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar configurações no Firestore:", error);
        throw new Error("Não foi possível salvar na nuvem. Verifique sua conexão ou permissões.");
    }
};

// Escuta as configurações da Nuvem em Tempo Real
export const listenToGlobalSettings = (callback: (settings: AppSettings) => void) => {
    if (!db) {
        // Fallback: retorna o local storage imediatamente
        const local = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (local) callback(JSON.parse(local));
        return () => {};
    }

    // Escuta mudanças no documento 'app_config/main'
    const unsubscribe = db.collection(FIRESTORE_CONFIG_COLLECTION).doc(FIRESTORE_CONFIG_DOC)
        .onSnapshot((doc: any) => {
            if (doc.exists) {
                const data = doc.data() as AppSettings;
                // Atualiza também o local para cache rápido na próxima vez
                localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data));
                callback(data);
            } else {
                // Se não existe documento, tenta usar o local
                const local = localStorage.getItem(STORAGE_KEY_SETTINGS);
                if (local) callback(JSON.parse(local));
            }
        }, (error: any) => {
            console.error("Erro ao ouvir configurações:", error);
        });

    return unsubscribe;
};

// Mantemos o getSettings síncrono apenas para estados iniciais de UI, se necessário
export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (!stored) {
    return { googleSheetsApiUrl: '' };
  }
  return JSON.parse(stored);
};

export const saveSettings = (settings: AppSettings): void => {
    // Wrapper legado para manter compatibilidade, mas preferimos saveSettingsRemote
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};

// --- DATA PARSERS ---

// Helper para normalizar chaves de objetos JSON ou CSV (remove espaços e deixa minúsculo)
const normalizeKeys = (obj: any): any => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        newObj[key.trim().toLowerCase()] = obj[key];
    });
    return newObj;
};

const mapObjectToTrack = (rawObj: any, index: number): Track | null => {
    const obj = normalizeKeys(rawObj);
    
    // --- MAPEAMENTO DE COLUNAS (Prioridade para os nomes solicitados) ---
    
    // 1. Título da Música (Coluna: "Musica")
    const title = obj.musica || obj.nome || obj.title || obj.titulo || obj.name || obj.track || '';
    
    if (!title) return null; // Se não tiver nome, ignora a linha

    // 2. ID único (Gera automático se não tiver)
    const id = obj.id ? String(obj.id) : `track-${index}-${Date.now()}`;
    
    // 3. Artista / Banda (Coluna: "Banda")
    const artist = obj.banda || obj.artista || obj.artist || obj.cantor || obj.grupo || 'Desconhecido';
    
    // 4. Imagem da Capa (Coluna: "Capa")
    const imageUrl = obj.capa || obj.imagem || obj.foto || obj.imageurl || obj.image || obj.cover || '';
    
    // 5. Link de Download (Coluna: "Link")
    const downloadUrl = obj.link || obj.url || obj.download || obj.downloadurl || obj.arquivo || '';
    
    // 6. Gênero (Opcional)
    const genre = obj.genero || obj.estilo || obj.genre || obj.categoria || 'Worship';
    
    // 7. Data (Opcional)
    const createdAt = obj.data || obj.createdat || obj.date || new Date().toISOString();
    
    // 8. Contagem (Opcional)
    const searchCount = Number(obj.views || obj.searchcount || 0);

    return {
        id,
        title,
        artist,
        imageUrl,
        downloadUrl,
        genre,
        searchCount,
        createdAt
    };
};

const parseJSON = (json: any): Track[] => {
    let items: any[] = [];
    
    // Tenta encontrar o array de dados dentro do JSON
    if (Array.isArray(json)) {
        items = json;
    } else if (json && typeof json === 'object') {
        // Suporte para estruturas { data: [...] }, { items: [...] }, { tracks: [...] }
        items = json.data || json.items || json.tracks || json.results || [];
    }

    if (!Array.isArray(items)) return [];

    const tracks: Track[] = [];
    items.forEach((item, index) => {
        const track = mapObjectToTrack(item, index);
        if (track) tracks.push(track);
    });
    return tracks;
};

const parseCSV = (csvText: string): Track[] => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Normaliza o cabeçalho para minúsculo para facilitar o match
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  const tracks: Track[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Regex complexo para separar CSV respeitando aspas
    const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    const obj: any = {};
    headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : '';
        // Remove aspas extras se existirem
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        val = val.replace(/""/g, '"'); 
        obj[header] = val;
    });

    const track = mapObjectToTrack(obj, i);
    if (track) tracks.push(track);
  }
  return tracks;
};

const fetchData = async (url: string): Promise<Track[]> => {
    if (!url) return [];

    let fetchUrl = url;
    let isGoogleSheet = false;
    
    // Verifica se é uma URL do Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
        isGoogleSheet = true;
        // Se não tiver /export, tenta converter
        if (!url.includes('/export')) {
            const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (idMatch && idMatch[1]) {
                const spreadsheetId = idMatch[1];
                const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
                const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
                fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
            }
        }
    }

    // Cache busting para garantir dados frescos
    const separator = fetchUrl.includes('?') ? '&' : '?';
    const timestampedUrl = `${fetchUrl}${separator}t=${Date.now()}`;

    try {
        const response = await fetch(timestampedUrl, {
            headers: {
                'Accept': 'application/json, text/csv, text/plain'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na API (${response.status})`);
        }

        const contentType = response.headers.get('content-type');
        
        // 1. Tenta processar como JSON
        if (!isGoogleSheet && (contentType?.includes('application/json') || url.endsWith('.json'))) {
             try {
                 const jsonData = await response.json();
                 return parseJSON(jsonData);
             } catch (e) {
                 console.warn("Falha ao parsear JSON, tentando texto...", e);
             }
        }

        // 2. Fallback: Pega como texto (CSV)
        const textData = await response.text();

        try {
            const jsonFromText = JSON.parse(textData);
            return parseJSON(jsonFromText);
        } catch (e) {
            return parseCSV(textData);
        }

    } catch (error) {
        console.warn("Fetch direto falhou, tentando proxy...", error);
        // Fallback Proxy
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}&disableCache=${Date.now()}`;
            const response = await fetch(proxyUrl);
            const textData = await response.text();
            
            try {
                return parseJSON(JSON.parse(textData));
            } catch {
                return parseCSV(textData);
            }
        } catch (e) {
            console.error("Erro fatal na conexão API:", e);
            return [];
        }
    }
};

// --- CORE SERVICE (LISTENER PRINCIPAL) ---

export const listenToTracks = (callback: (tracks: Track[]) => void) => {
  let activeUrl = '';
  let intervalId: any = null;
  let isActive = true;

  const loadData = async () => {
      if (!isActive || !activeUrl) return;
      const tracks = await fetchData(activeUrl);
      if (isActive) callback(tracks);
  };

  // 1. Primeiro, ouvimos a configuração GLOBAL do Firestore
  const unsubscribeSettings = listenToGlobalSettings((settings) => {
      if (settings.googleSheetsApiUrl && settings.googleSheetsApiUrl !== activeUrl) {
          activeUrl = settings.googleSheetsApiUrl;
          console.log("Nova URL de dados recebida:", activeUrl);
          
          // Carrega imediatamente ao receber nova URL
          loadData();

          // Reinicia intervalo de polling (60s)
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(loadData, 60000);
      } else if (!settings.googleSheetsApiUrl) {
          callback([]); // Limpa se não tiver URL
      }
  });

  return () => {
      isActive = false;
      unsubscribeSettings(); // Para de ouvir o Firestore
      if (intervalId) clearInterval(intervalId); // Para o polling
  };
};

// --- AUTH SERVICE ---

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

// --- STUBS ---

export const saveTrackRemote = async (track: Partial<Track>): Promise<void> => {
  console.warn("Modo API: Edição deve ser feita na fonte de dados.");
};

export const deleteTrackRemote = async (id: string): Promise<void> => {
    console.warn("Modo API: Exclusão deve ser feita na fonte de dados.");
};

export const incrementSearchCountRemote = async (id: string): Promise<void> => {
   // Analytics stub
   if (db && id) {
       try {
           const ref = db.collection('analytics').doc(id);
           await ref.set({ 
               searchCount: firebase.firestore.FieldValue.increment(1),
               lastAccessed: new Date().toISOString()
           }, { merge: true });
       } catch (e) {
           console.warn("Analytics error", e);
       }
   }
};

export const syncFromGoogleSheets = async (url: string): Promise<number> => {
    const tracks = await fetchData(url);
    return tracks.length;
};