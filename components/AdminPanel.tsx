import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  X, 
  Music, 
  Users, 
  Edit2, 
  Plus, 
  Save, 
  Trash2,
  Settings,
  Link as LinkIcon,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
    listenToTracks,
    saveTrackRemote,
    deleteTrackRemote,
    getSettings, 
    saveSettings,
    syncFromGoogleSheets 
} from '../services/storage';
import type { AdminPanelProps, Track } from '../types';

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'users' | 'settings'>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  
  // States para o modal de exclusão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

  // Settings State
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form States
  const [formData, setFormData] = useState({ title: '', artist: '', imageUrl: '', downloadUrl: '' });

  useEffect(() => {
    // Load local settings
    const settings = getSettings();
    setSheetsUrl(settings.googleSheetsApiUrl);

    // Subscribe to tracks
    const unsubscribe = listenToTracks(setTracks);
    return () => unsubscribe();
  }, [user]);

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTrack) {
        await saveTrackRemote({ ...editingTrack, ...formData });
      } else {
        await saveTrackRemote(formData);
      }
      setFormData({ title: '', artist: '', imageUrl: '', downloadUrl: '' });
      setEditingTrack(null);
      // No need to loadData, listener updates UI
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({ googleSheetsApiUrl: sheetsUrl });
    setSyncMsg({ type: 'success', text: 'Configurações salvas localmente.' });
  };

  const handleSync = async () => {
    if (!sheetsUrl) {
      setSyncMsg({ type: 'error', text: 'Por favor, insira uma URL válida primeiro.' });
      return;
    }

    setIsSyncing(true);
    setSyncMsg(null);

    try {
      saveSettings({ googleSheetsApiUrl: sheetsUrl });
      
      const count = await syncFromGoogleSheets(sheetsUrl);
      
      setSyncMsg({ 
        type: 'success', 
        text: `Sincronização concluída! ${count} músicas atualizadas/adicionadas no banco de dados.` 
      });
    } catch (error: any) {
      console.error(error);
      setSyncMsg({ 
        type: 'error', 
        text: error.message || 'Erro ao conectar.' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = (track: Track) => {
    setTrackToDelete(track);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!trackToDelete) return;
    
    try {
        await deleteTrackRemote(trackToDelete.id);
    } catch (err) {
        console.error("Erro ao deletar track:", err);
    } finally {
        setIsModalOpen(false);
        setTrackToDelete(null);
    }
  };

  const handleEdit = (track: Track) => {
    setEditingTrack(track);
    setFormData({
      title: track.title,
      artist: track.artist,
      imageUrl: track.imageUrl,
      downloadUrl: track.downloadUrl
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
              <LayoutDashboard className="text-white" size={24} />
              Search Multitracks <span className="text-zinc-600 font-normal">| Console</span>
            </h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
            <X size={20} />
          </button>
        </header>

        {/* Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6">
          <button 
            onClick={() => setActiveTab('tracks')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tracks' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Music size={16} /> Tracks
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users size={16} /> Usuários
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings size={16} /> Configurações
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/50">
        
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1 bg-zinc-900/50 p-6 rounded-xl h-fit border border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                {editingTrack ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingTrack ? 'Editar Track' : 'Nova Track'}
              </h3>
              <form onSubmit={handleSaveTrack} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Título</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-sm focus:border-white outline-none transition-colors" placeholder="Ex: Oceanos" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Artista</label>
                  <input required value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-sm focus:border-white outline-none transition-colors" placeholder="Ex: Hillsong" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">URL da Capa</label>
                  <input required value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-sm focus:border-white outline-none transition-colors" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Link Download</label>
                  <input required value={formData.downloadUrl} onChange={e => setFormData({...formData, downloadUrl: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-sm focus:border-white outline-none transition-colors" placeholder="https://..." />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-lg flex justify-center items-center gap-2 text-sm transition-colors shadow-lg">
                    <Save size={16} /> {editingTrack ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editingTrack && (
                    <button type="button" onClick={() => {setEditingTrack(null); setFormData({ title: '', artist: '', imageUrl: '', downloadUrl: '' })}} className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-lg font-bold text-white">Biblioteca Cloud ({tracks.length})</h3>
                 <span className="text-xs text-green-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live
                 </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tracks.map(track => (
                  <div key={track.id} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex gap-4 items-center group hover:border-white/30 transition-colors">
                    <img src={track.imageUrl} alt={track.title} className="w-12 h-12 rounded bg-black object-cover grayscale group-hover:grayscale-0 transition-all" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150/000000/FFFFFF?text=Music'} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{track.title}</h4>
                      <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(track)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(track)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="bg-zinc-900/50 p-10 rounded-xl border border-zinc-800 text-center max-w-2xl mx-auto mt-10">
             <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-zinc-400" />
             </div>
             <h3 className="text-xl font-bold text-white">Administrador</h3>
             <div className="mt-6 inline-block bg-black border border-zinc-800 p-6 rounded-lg text-left w-full">
               <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                   <span className="text-xs text-zinc-500 uppercase">Status</span>
                   <span className="text-xs text-green-500 font-bold uppercase flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
               </div>
               <p className="text-sm text-zinc-400">ID: <span className="text-white font-mono ml-2">{user.uid}</span></p>
               <p className="text-sm text-zinc-400">Email: <span className="text-white font-mono ml-2">{user.email}</span></p>
             </div>
           </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto mt-6">
             <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 relative overflow-hidden">
               
               <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-zinc-800 rounded-lg text-white">
                   <LinkIcon size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-white">Conexão de Dados</h3>
                   <p className="text-zinc-500 text-sm">Sincronização via Google Sheets ou API JSON para o Banco de Dados.</p>
                 </div>
               </div>
               
               <div className="space-y-6">
                 <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                     Endpoint URL
                   </label>
                   <div className="relative">
                     <input 
                        type="url" 
                        value={sheetsUrl}
                        onChange={(e) => {
                            setSheetsUrl(e.target.value);
                            setSyncMsg(null); 
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-4 pr-4 text-white focus:border-white outline-none transition-all font-mono text-sm"
                     />
                   </div>
                   <div className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800/50 text-xs text-zinc-500">
                     <p className="mb-2 font-bold text-zinc-400 uppercase">Mapeamento Automático:</p>
                     <div className="grid grid-cols-2 gap-2 font-mono">
                        <span>Title / Nome</span>
                        <span>Artist / Banda</span>
                        <span>ImageUrl / Capa</span>
                        <span>DownloadUrl / Link</span>
                     </div>
                   </div>
                 </div>

                 {/* Feedback Message */}
                 {syncMsg && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 border ${
                        syncMsg.type === 'success' ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-red-900/10 border-red-900/30 text-red-400'
                    }`}>
                        {syncMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{syncMsg.text}</span>
                    </div>
                 )}

                 <div className="pt-6 border-t border-zinc-800 flex gap-3">
                    <button 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex-1 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition"
                    >
                        {isSyncing ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <DownloadCloud size={18} />
                        )}
                        {isSyncing ? 'Enviando para Nuvem...' : 'Sincronizar Base de Dados'}
                    </button>
                    
                    <button 
                        onClick={handleSaveSettings} 
                        className="px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition"
                    >
                      <Save size={18} />
                    </button>
                 </div>
               </div>
             </div>
          </div>
        )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {isModalOpen && trackToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 w-full max-w-sm shadow-2xl animate-fade-in-up">
                  <h3 className="text-lg font-bold text-white mb-2">Excluir Item?</h3>
                  <p className="text-zinc-400 text-sm mb-6">
                      A track <span className="text-white font-medium">"{trackToDelete.title}"</span> será removida permanentemente do banco de dados.
                  </p>
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => {setIsModalOpen(false); setTrackToDelete(null);}}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmDelete}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-bold transition flex items-center gap-2"
                      >
                          <Trash2 size={14} /> Excluir Definitivamente
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;