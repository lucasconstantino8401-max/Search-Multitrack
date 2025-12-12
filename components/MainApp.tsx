import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  LogOut, 
  Search, 
  X, 
  TrendingUp, 
  Download, 
  ArrowLeft, 
  Sparkles, 
  Database, 
  Play, 
  Filter,
  Calendar, 
  Music,
  Share2,
  LogIn,
  Activity,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { listenToTracks, incrementSearchCountRemote } from '../services/storage';
import type { MainAppProps, Track } from '../types';
import AdminPanel from './AdminPanel';
import InteractiveBackground from './InteractiveBackground';

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const ADMIN_EMAILS = [
    'admin@searchmultitracks.com',
    'lucasconstantino8401@gmail.com'
];

// Função auxiliar para normalizar texto
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Função auxiliar para abrir links de forma segura
const openLinkSafely = (url: string) => {
    // Tenta abrir usando window.open direto, que lida melhor com algumas restrições mobile
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
        win.focus();
    } else {
        // Fallback para o método de anchor click se o popup for bloqueado
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Componente de Logo SVG Reutilizável
const AppLogoSVG = ({ className = "w-full h-full" }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90C63.2 90 74.8 83.6 82.5 73.5" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-white opacity-100" />
        <path d="M78 78L90 90" stroke="#71717a" strokeWidth="8" strokeLinecap="round" />
        <rect x="32" y="35" width="8" height="30" rx="4" fill="currentColor" className="text-zinc-400" />
        <rect x="46" y="25" width="8" height="50" rx="4" fill="currentColor" className="text-white" />
        <rect x="60" y="40" width="8" height="20" rx="4" fill="currentColor" className="text-zinc-400" />
    </svg>
);

const HeaderLogo = () => (
    <div className="flex items-center gap-3">
        <div className="w-10 h-10 relative">
             <AppLogoSVG />
        </div>
        <div className="flex flex-col justify-center">
            <span className="text-xs font-black text-zinc-500 tracking-[0.15em] uppercase leading-none mb-0.5">Search</span>
            <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase leading-none">Multitracks</span>
        </div>
    </div>
);

// --- TRACK DETAIL VIEW (MODAL) ---
interface TrackDetailViewProps {
  track: Track;
  onClose: () => void;
  onDownload: () => void;
}

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, onClose, onDownload }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
      if (track.downloadUrl) {
          navigator.clipboard.writeText(track.downloadUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
       <div 
          className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
          onClick={(e) => e.stopPropagation()}
       >
          <button 
             onClick={onClose}
             className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-zinc-800 text-white rounded-full transition"
          >
             <X size={20} />
          </button>

          {/* Left: Image Blur/Display */}
          <div className="w-full md:w-1/2 h-64 md:h-auto relative overflow-hidden bg-zinc-900 group">
             <img 
               src={track.imageUrl} 
               alt={track.title} 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600'}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 md:hidden"></div>
          </div>

          {/* Right: Info */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-zinc-950/95">
              {/* Genre Badge */}
              <div className="mb-4">
                  <span className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                      {track.genre || 'Multitrack'}
                  </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight tracking-tight">{track.title}</h2>
              <p className="text-xl text-zinc-400 font-medium mb-8">{track.artist}</p>
              
              <div className="flex gap-4 mb-8">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold tracking-wider bg-zinc-900 px-3 py-2 rounded-lg">
                      <Activity size={14} className="text-red-500" />
                      <span>{track.searchCount > 0 ? `+${track.searchCount} Views` : 'Trending'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold tracking-wider bg-zinc-900 px-3 py-2 rounded-lg">
                      <Music size={14} />
                      <span>Multitrack</span>
                  </div>
              </div>

              <div className="flex flex-col gap-3">
                  <button 
                      onClick={onDownload}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                      <Download size={20} className="stroke-[3px]" />
                      <span>BAIXAR AGORA</span>
                  </button>
                  
                  {/* Error 31362 Helper */}
                  <div className="flex items-center gap-2 justify-center mb-1">
                      <span className="text-[10px] text-zinc-500">Erro 31362? Copie o link abaixo e tente no navegador.</span>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={handleCopyLink}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm border border-zinc-800"
                      >
                          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          {copied ? "COPIADO!" : "Copiar Link"}
                      </button>
                      <button className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm border border-zinc-800 opacity-50 cursor-not-allowed">
                          <Share2 size={16} /> Share
                      </button>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};

// --- TRACK CARD ---
interface TrackCardProps {
  track: Track;
  featured?: boolean;
  onClick: (track: Track) => void;
  index?: number;
  rank?: number;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, featured = false, onClick, index = 0, rank }) => (
  <div 
      onClick={() => onClick(track)}
      className={`
        relative group overflow-hidden rounded-2xl flex flex-col cursor-pointer
        bg-zinc-950/40 backdrop-blur-md border border-white/10
        transition-all duration-500 ease-out
        hover:-translate-y-1.5 hover:border-white/30 hover:bg-zinc-900/60
        hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.05)]
        ${featured ? 'h-full' : ''}
        animate-fade-in
      `}
      style={{ animationDelay: `${index * 50}ms` }}
  >
    {/* Image Container */}
    <div className={`relative overflow-hidden ${featured ? 'h-2/3' : 'aspect-square'}`}>
      <img 
        src={track.imageUrl} 
        alt={track.title} 
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
        onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400'}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
      
      {/* Rank Badge (If provided) */}
      {rank && rank <= 3 && (
          <div className="absolute top-0 right-0 p-3 z-20">
              <div className={`
                 w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shadow-lg
                 ${rank === 1 ? 'bg-yellow-500 text-black' : 
                   rank === 2 ? 'bg-zinc-300 text-black' : 
                   'bg-orange-700 text-white'}
              `}>
                  {rank}
              </div>
          </div>
      )}

      {/* Play/Action Overlay Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-[2px]">
          <button 
             className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-300 hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
             onClick={(e) => {
                 e.stopPropagation();
                 if(track.downloadUrl) openLinkSafely(track.downloadUrl);
             }}
          >
              <Play fill="currentColor" className="ml-1" size={24} />
          </button>
      </div>
      
      {/* Top Left Badge */}
      <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white border border-white/10">
              {track.genre || 'Multitrack'}
          </span>
      </div>
    </div>

    {/* Content */}
    <div className="p-4 flex-1 flex flex-col justify-between relative z-10">
      <div>
        <h3 className={`font-bold text-white leading-tight mb-1 truncate ${featured ? 'text-2xl' : 'text-base'}`}>
            {track.title}
        </h3>
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide truncate">
            {track.artist}
        </p>
      </div>
      
      {/* Footer Meta */}
      <div className="mt-4 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
             {rank ? (
                 <>
                   <TrendingUp size={10} className="text-red-500" />
                   <span className="text-red-400 font-bold">EM ALTA</span>
                 </>
             ) : (
                 <>
                    <Database size={10} />
                    <span>ID: {track.id.slice(0, 4)}</span>
                 </>
             )}
          </div>
          <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-white text-white group-hover:text-black transition-colors">
             <ArrowLeft className="rotate-[135deg]" size={10} />
          </div>
      </div>
    </div>
  </div>
);

// --- MAIN APP ---

const MainApp: React.FC<MainAppProps> = ({ user, onLogout, onLoginRequest }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Computed state
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  
  // Trending State (Calculated "Real-time" based on loaded data)
  const trendingTracks = useMemo(() => {
      // Create a copy and sort by searchCount descending
      return [...tracks]
        .sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0))
        .slice(0, 10); // Take top 10
  }, [tracks]);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsubscribe = listenToTracks((data) => {
      setTracks(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = tracks;

    // Filter by search
    if (searchQuery.trim()) {
        const q = normalizeText(searchQuery);
        result = result.filter(track => 
            normalizeText(track.title).includes(q) || 
            normalizeText(track.artist).includes(q)
        );
    }
    
    setFilteredTracks(result);
  }, [searchQuery, tracks]);

  const handleDownload = async () => {
    if (!selectedTrack) return;
    
    // Simula analytics/contador
    incrementSearchCountRemote(selectedTrack.id);
    
    if (selectedTrack.downloadUrl) {
        // Usa a nova função segura de abertura
        openLinkSafely(selectedTrack.downloadUrl);
    } else {
        alert("Link indisponível no momento.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      <InteractiveBackground />
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-12">
              <HeaderLogo />
          </div>

          {/* User / Actions */}
          <div className="flex items-center gap-4">
             {user ? (
                <div className="flex items-center gap-4 pl-4 border-l border-zinc-800">
                    {isAdmin && (
                        <button 
                            onClick={() => setIsAdminOpen(true)}
                            className="p-2 text-zinc-400 hover:text-white transition hover:bg-zinc-800 rounded-lg"
                            title="Admin Panel"
                        >
                            <LayoutDashboard size={20} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-white">{user.displayName}</div>
                            <div className="text-[9px] text-zinc-500 font-mono">PRO MEMBER</div>
                        </div>
                        <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                            className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800"
                            alt="User"
                        />
                    </div>
                    <button 
                        onClick={onLogout}
                        className="p-2 text-zinc-500 hover:text-red-400 transition"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
             ) : (
                <button 
                    onClick={onLoginRequest}
                    className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition"
                >
                    <LogIn size={14} /> Entrar
                </button>
             )}
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-28 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto relative z-10">
        
        {/* Search Hero */}
        <div className="mb-12 flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="w-full md:w-2/3 lg:w-1/2">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                    Encontre sua <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-600">Próxima Multitrack.</span>
                </h1>
                
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por música, artista ou álbum..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-zinc-900 transition-all text-sm md:text-base shadow-xl"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats / Info */}
            <div className="hidden lg:flex gap-8 pb-2">
                <div>
                    <div className="text-3xl font-black text-white">{tracks.length}</div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Music size={10} /> Tracks Disponíveis
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-black text-white flex items-center gap-2">
                         <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                         24h
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={10} /> Monitoramento Real-time
                    </div>
                </div>
            </div>
        </div>

        {/* LOGIC: IF SEARCHING -> SHOW RESULTS. IF EMPTY -> SHOW TRENDING */}
        
        {searchQuery.trim() ? (
            // --- SEARCH RESULTS ---
            <>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Search size={20} className="text-zinc-400" />
                        Resultados da busca
                    </h2>
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                        {filteredTracks.length} Encontrados
                    </span>
                </div>
                
                {filteredTracks.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {filteredTracks.map((track, idx) => (
                            <TrackCard 
                                key={track.id} 
                                track={track} 
                                onClick={(t) => setSelectedTrack(t)}
                                index={idx}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                            <Filter className="text-zinc-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto text-sm">Tente buscar por outro termo.</p>
                        <button 
                            onClick={() => { setSearchQuery(''); }}
                            className="mt-6 text-xs font-bold uppercase tracking-widest text-white border-b border-white pb-1 hover:text-zinc-300 hover:border-zinc-300 transition"
                        >
                            Limpar Busca
                        </button>
                    </div>
                )}
            </>
        ) : (
            // --- TRENDING / RECOMMENDATIONS (EMPTY SEARCH) ---
            <>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <TrendingUp className="text-red-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Em Alta (24h)</h2>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Mais pesquisadas e baixadas</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {trendingTracks.length > 0 ? (
                        trendingTracks.map((track, idx) => (
                            <TrackCard 
                                key={track.id} 
                                track={track} 
                                onClick={(t) => setSelectedTrack(t)}
                                index={idx}
                                rank={idx + 1} // Pass ranking for badge
                            />
                        ))
                    ) : (
                        // Skeleton / Loading State if no tracks
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-64 rounded-2xl bg-zinc-900/50 animate-pulse"></div>
                        ))
                    )}
                </div>
            </>
        )}

      </main>

      {/* Admin Panel Modal */}
      {isAdminOpen && user && (
          <AdminPanel 
            user={user} 
            onClose={() => setIsAdminOpen(false)} 
            onUpdate={() => {}}
          />
      )}

      {/* Track Detail Modal */}
      {selectedTrack && (
          <TrackDetailView 
             track={selectedTrack} 
             onClose={() => setSelectedTrack(null)} 
             onDownload={handleDownload}
          />
      )}

    </div>
  );
};

export default MainApp;