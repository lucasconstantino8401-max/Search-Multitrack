import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  X, 
  Music, 
  Users, 
  Settings,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Globe,
  ExternalLink,
  Code2,
  HelpCircle
} from 'lucide-react';
import { 
    listenToTracks,
    saveSettingsRemote,
    listenToGlobalSettings,
    syncFromGoogleSheets 
} from '../services/storage';
import type { AdminPanelProps, Track } from '../types';

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'tracks' | 'users'>('settings');
  const [tracks, setTracks] = useState<Track[]>([]);
  
  // Settings State
  const [apiUrl, setApiUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    // Carregar configurações globais (Firestore)
    const unsubscribeSettings = listenToGlobalSettings((settings) => {
        if (settings.googleSheetsApiUrl) {
            setApiUrl(settings.googleSheetsApiUrl);
        }
    });

    // Carregar dados (apenas leitura para preview)
    const unsubscribeTracks = listenToTracks((data) => {
        setTracks(data);
    });
    
    return () => {
        unsubscribeSettings();
        unsubscribeTracks();
    };
  }, [user]);

  const handleSaveAndTest = async () => {
    if (!apiUrl) {
      setStatusMsg({ type: 'error', text: 'Por favor, insira uma URL válida.' });
      return;
    }

    setIsTesting(true);
    setStatusMsg(null);

    try {
      // 1. Testa a conexão primeiro
      const count = await syncFromGoogleSheets(apiUrl);
      
      if (count === 0) {
          setStatusMsg({ type: 'error', text: 'Conectado, mas nenhum dado compatível foi encontrado. Verifique os nomes das colunas.' });
          setIsTesting(false);
          return;
      } 

      // 2. Se deu certo, salva na Nuvem (Firestore)
      await saveSettingsRemote({ googleSheetsApiUrl: apiUrl });
      
      setStatusMsg({ type: 'success', text: `Sucesso! Configuração salva na nuvem. ${count} tracks carregadas.` });
      onUpdate(); 
      
    } catch (error: any) {
      console.error(error);
      let errorText = 'Erro de conexão.';
      if (error.message && error.message.includes('permissões')) {
          errorText = 'Erro de permissão no Banco de Dados.';
      } else {
          errorText = 'Erro ao acessar a planilha. Verifique se ela está pública na Web.';
      }
      
      setStatusMsg({ 
        type: 'error', 
        text: errorText
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
              <LayoutDashboard className="text-white" size={24} />
              Painel de Controle <span className="text-zinc-600 font-normal">| Conexão de Dados</span>
            </h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
            <X size={20} />
          </button>
        </header>

        {/* Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-green-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings size={16} /> Configuração
          </button>
          <button 
            onClick={() => setActiveTab('tracks')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tracks' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Music size={16} /> Visualizar Tracks ({tracks.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users size={16} /> Conta
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-black/50">
        
        {/* --- SETTINGS TAB (MAIN) --- */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             
             {/* Connection Card */}
             <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-green-900/20 text-green-500 border border-green-900/30 rounded-lg">
                   <Globe size={32} />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-white">Google Sheets / API (Global)</h3>
                   <p className="text-zinc-400 text-sm">A URL salva aqui será atualizada automaticamente para todos os usuários do App.</p>
                 </div>
               </div>
               
               <div className="space-y-4">
                 <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                     Link da Planilha ou API
                 </label>
                 <div className="flex gap-3">
                     <input 
                        type="url" 
                        value={apiUrl}
                        onChange={(e) => {
                            setApiUrl(e.target.value);
                            setStatusMsg(null); 
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 text-white focus:border-green-500 outline-none transition-all font-mono text-sm"
                     />
                     <button 
                        onClick={handleSaveAndTest}
                        disabled={isTesting}
                        className="bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition whitespace-nowrap"
                     >
                        {isTesting ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Salvar Globalmente
                     </button>
                 </div>

                 {/* Status Message */}
                 {statusMsg && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 border mt-4 ${
                        statusMsg.type === 'success' ? 'bg-green-900/10 border-green-900/30 text-green-400' : 'bg-red-900/10 border-red-900/30 text-red-400'
                    }`}>
                        {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{statusMsg.text}</span>
                    </div>
                 )}
               </div>
             </div>

             {/* Instructions Card */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Code2 size={16} /> Estrutura da Planilha
                    </h4>
                    <p className="text-zinc-400 text-xs mb-4">
                        A primeira linha da sua planilha deve conter exatamente estes nomes (maiúsculo ou minúsculo):
                    </p>
                    <div className="space-y-2 font-mono text-xs">
                         <div className="flex justify-between p-2 bg-black border border-zinc-800 rounded">
                             <span className="text-green-400">Musica</span>
                             <span className="text-zinc-500">Nome da música</span>
                         </div>
                         <div className="flex justify-between p-2 bg-black border border-zinc-800 rounded">
                             <span className="text-green-400">Banda</span>
                             <span className="text-zinc-500">Artista ou Banda</span>
                         </div>
                         <div className="flex justify-between p-2 bg-black border border-zinc-800 rounded">
                             <span className="text-green-400">Link</span>
                             <span className="text-zinc-500">Link de Download</span>
                         </div>
                         <div className="flex justify-between p-2 bg-black border border-zinc-800 rounded">
                             <span className="text-green-400">Capa</span>
                             <span className="text-zinc-500">URL da Imagem</span>
                         </div>
                    </div>
                </div>

                <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <HelpCircle size={16} /> Importante
                    </h4>
                    <ul className="text-xs text-zinc-400 space-y-3 list-disc list-inside">
                        <li>
                            No Google Sheets, vá em <strong>Arquivo {'>'} Compartilhar {'>'} Publicar na Web</strong>.
                        </li>
                        <li>
                            Certifique-se de que a coluna <strong>Link</strong> contém a URL completa para o arquivo (Drive, Dropbox, etc).
                        </li>
                        <li>
                            A coluna <strong>Capa</strong> deve ser um link direto de imagem (terminando em .jpg ou .png).
                        </li>
                    </ul>
                </div>
             </div>

          </div>
        )}
        
        {/* --- TRACKS LIST TAB (READ ONLY) --- */}
        {activeTab === 'tracks' && (
          <div className="max-w-6xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-white">Dados Recebidos</h3>
                    <p className="text-zinc-500 text-sm">Visualização em tempo real da base de dados.</p>
                 </div>
                 <a 
                    href={apiUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-bold uppercase text-green-500 hover:text-green-400 bg-green-900/20 px-4 py-2 rounded-lg border border-green-900/50 transition"
                 >
                    <ExternalLink size={14} /> Abrir Planilha
                 </a>
             </div>
             
             {tracks.length === 0 ? (
                 <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                     <p className="text-zinc-500">Nenhum dado encontrado. Verifique as colunas da planilha.</p>
                 </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tracks.map((track, idx) => (
                    <div key={idx} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 flex gap-4 items-center group">
                        <img 
                            src={track.imageUrl} 
                            alt={track.title} 
                            className="w-14 h-14 rounded bg-black object-cover" 
                            onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'} 
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{track.title}</h4>
                            <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
                            <div className="flex gap-2 mt-1">
                                {track.downloadUrl ? (
                                    <span className="text-[9px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-900/50">LINK OK</span>
                                ) : (
                                    <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">SEM LINK</span>
                                )}
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
             )}
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
           <div className="bg-zinc-900/50 p-10 rounded-xl border border-zinc-800 text-center max-w-xl mx-auto mt-10">
             <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-zinc-400" />
             </div>
             <h3 className="text-xl font-bold text-white">Conta Conectada</h3>
             <p className="text-zinc-500 text-sm mb-6">Você está logado via Firebase Auth.</p>
             
             <div className="bg-black border border-zinc-800 p-4 rounded-lg text-left w-full space-y-2">
               <p className="text-sm text-zinc-400 flex justify-between">
                   <span>Email:</span> 
                   <span className="text-white">{user.email}</span>
               </p>
               <p className="text-sm text-zinc-400 flex justify-between">
                   <span>UID:</span> 
                   <span className="text-white font-mono text-xs">{user.uid}</span>
               </p>
             </div>
           </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;