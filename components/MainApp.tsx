import React, { useState, useEffect } from 'react';
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
  Filter
} from 'lucide-react';
import { getTracks, incrementSearchCount } from '../services/storage';
import type { MainAppProps, Track } from '../types';
import AdminPanel from './AdminPanel';
import InteractiveBackground from './InteractiveBackground';

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const ADMIN_EMAILS = [
    'admin@searchmultitracks.com', 
];

// Função auxiliar para normalizar texto (remove acentos e deixa minúsculo)
// Ex: "Éden" -> "eden", "Árvore" -> "arvore"
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Componente de Logo SVG Reutilizável (Monocromático)
const AppLogoSVG = ({ className = "w-full h-full" }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90C63.2 90 74.8 83.6 82.5 73.5" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-white opacity-100" />
        <path d="M78 78L90 90" stroke="#71717a" strokeWidth="8" strokeLinecap="round" />
        <rect x="32" y="35" width="8" height="30" rx="4" fill="currentColor" className="text-zinc-400" />
        <rect x="46" y="25" width="8" height="50" rx="4" fill="currentColor" className="text-white" />
        <rect x="60" y="40" width="8" height="20" rx="4" fill="currentColor" className="text-zinc-400" />
    </svg>
);

// Componente de Logo Pequeno para o Header
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

// Componente de Card Reutilizável
interface TrackCardProps {
  track: Track;
  featured?: boolean;
  onClick: (track: Track) => void;
  index?: number;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, featured = false, onClick, index = 0 }) => (
  <div 
      className={`
        relative group overflow-hidden rounded-2xl flex flex-col
        bg-zinc-950/40 backdrop-blur-md border border-white/10
        transition-all duration-500 ease-out
        hover:-translate-y-1.5 hover:border-white/30 hover:bg-zinc-900/60
        hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.05)]
        ${featured ? 'h-full' : ''}
        animate-fade-in-up
      `}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both' 
      }}
  >
      {/* Subtle white glow overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/0 to-white/0 opacity-0 group-hover:opacity-100 group-hover:to-white/5 transition-opacity duration-500 pointer-events-none"></div>

      {/* Imagem / Capa */}
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
          <img 
              src={track.imageUrl} 
              alt={track.title} 
              className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 opacity-80 grayscale group-hover:grayscale-0 group-hover:opacity-100" 
              onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300/09090b/3f3f46?text=No+Image'} 
          />
          
          {/* Subtle Dark Gradient at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40"></div>

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
              <div className="w-14 h-14 bg-white backdrop-blur-md border border-white rounded-full flex items-center justify-center pl-1 shadow-2xl scale-50 group-hover:scale-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-black group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  <Play size={24} fill="currentColor" />
              </div>
          </div>
          
          {/* Badge */}
          {featured && (
            <div className="absolute top-3 left-3 z-10">
                 <span className="bg-white text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                   Top 1
                 </span>
            </div>
          )}
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex flex-col flex-1 relative z-10">
          <div className="flex-1 min-w-0 mb-4">
             <h3 className="text-zinc-200 font-bold text-base leading-tight mb-1 truncate group-hover:text-white transition-colors duration-300" title={track.title}>
               {track.title}
             </h3>
             <p className="text-zinc-600 text-xs flex items-center gap-1 truncate font-medium uppercase tracking-wide group-hover:text-zinc-400 transition-colors">
               {track.artist}
             </p>
          </div>

          {/* Botão de Link / Download */}
          <button 
            onClick={(e) => {
                e.stopPropagation();
                onClick(track);
            }}
            className="w-full bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black py-3 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide border border-zinc-800 hover:border-white hover:shadow-lg hover:shadow-white/10"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
      </div>
  </div>
);

const CATEGORIES = ["Todos", "Worship", "Rock", "Pop", "Instrumental", "Ao Vivo"];

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [searched, setSearched] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todos");

  // Check Permissions
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  const loadData = () => {
    const allTracks = getTracks();
    setTracks(allTracks);
    
    // 1. Calcula Trending
    const sortedByPopularity = [...allTracks]
        .filter(t => t.searchCount > 0)
        .sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0))
        .slice(0, 4);
    setTrendingTracks(sortedByPopularity);

    // 2. Calcula Recentes
    const sortedByDate = [...allTracks]
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA; 
        })
        .slice(0, 32); 
    setRecentTracks(sortedByDate);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const cleanSearchTerm = searchTerm.trim();
    
    // Se a busca estiver vazia, restaura o estado inicial
    if (!cleanSearchTerm) {
        setSearched(false);
        setFilteredTracks([]);
        return;
    }

    const term = normalizeText(cleanSearchTerm);
    
    // Filtra comparando título e artista (normalizados)
    const results = tracks.filter(t => {
        const title = normalizeText(t.title || '');
        const artist = normalizeText(t.artist || '');
        
        return title.includes(term) || artist.includes(term);
    });

    setFilteredTracks(results);
    setSearched(true);
  };
  
  // Atualiza busca ao limpar input manualmente
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      if (value === '') {
          setSearched(false);
          setFilteredTracks([]);
      }
  };

  const handleCategoryClick = (cat: string) => {
      setActiveCategory(cat);
  };

  const handleTrackClick = (track: Track) => {
    if (track.downloadUrl && track.downloadUrl !== '#') {
       window.open(track.downloadUrl, '_blank');
    }
    incrementSearchCount(track.id);
    setTimeout(() => {
        loadData();
    }, 500);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearched(false);
    setFilteredTracks([]);
    setActiveCategory("Todos");
  };

  const handleAdminUpdate = () => {
    loadData();
    if (searched && searchTerm) {
        handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-white selection:text-black relative">
      <InteractiveBackground />
      
      {/* Sticky Header */}
      <nav className="bg-black/70 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-6 py-4 flex justify-between items-center transition-all duration-300">
        <div className="cursor-pointer" onClick={clearSearch}>
           <HeaderLogo />
        </div>
        <div className="flex items-center gap-4">
            {isAdmin && (
                <button onClick={() => setShowAdmin(true)} className="text-zinc-400 hover:text-black transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-white px-4 py-2 rounded-full border border-white/10 hover:border-transparent">
                    <LayoutDashboard size={14} /> <span className="hidden sm:inline">Admin</span>
                </button>
            )}
            
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <button onClick={onLogout} className="text-zinc-500 hover:text-white transition p-2 hover:bg-zinc-900 rounded-full">
                <LogOut size={18} />
            </button>
        </div>
      </nav>

      <main className="pb-24 relative z-10">
        
        {/* HERO SECTION with Search */}
        <div className="relative pt-16 pb-20 px-6 overflow-hidden">
            {/* Background Gradients - Monochrome */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-zinc-900/20 via-black to-black z-0"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto text-center">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-32 h-32 mb-4">
                        <AppLogoSVG />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl md:text-4xl font-black text-zinc-600 tracking-[0.2em] uppercase leading-tight drop-shadow-lg">Search</span>
                        <span className="text-3xl md:text-4xl font-black text-white tracking-[0.2em] uppercase leading-tight drop-shadow-lg">Multitracks</span>
                    </div>
                </div>
                
                <h1 className="text-xl md:text-2xl font-bold text-zinc-300 mb-6 tracking-tight">
                    Encontre sua próxima Multitrack
                </h1>
                <p className="text-zinc-500 mb-10 text-base max-w-xl mx-auto leading-relaxed">
                    A maior biblioteca de áudio profissional para suas produções.
                    Pesquise, baixe e produza.
                </p>

                {/* SEARCH COMPONENT */}
                <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
                    <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-5 group-hover:opacity-10 transition duration-500 scale-95 group-hover:scale-100"></div>
                    <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-xl rounded-full p-2 border border-white/10 focus-within:border-white/30 shadow-2xl transition-all">
                        <Search className="text-zinc-500 ml-4 group-focus-within:text-white transition-colors" size={24} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={handleInputChange}
                            placeholder="Buscar música, artista ou álbum..." 
                            className="w-full bg-transparent border-none text-white px-4 py-3 focus:outline-none text-lg placeholder-zinc-600"
                            disabled={tracks.length === 0}
                        />
                        {searchTerm && (
                            <button type="button" onClick={clearSearch} className="p-2 text-zinc-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        )}
                        <button type="submit" disabled={tracks.length === 0} className="bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-full px-8 py-3 font-bold transition-all text-sm uppercase tracking-wide shadow-lg shadow-white/5">
                            Buscar
                        </button>
                    </div>
                </form>

                {/* Categories Pills */}
                <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-in-up">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                activeCategory === cat 
                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6">
        {tracks.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 max-w-2xl mx-auto backdrop-blur-sm">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 ring-1 ring-zinc-800 shadow-xl">
                   <Database size={28} className="text-zinc-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Biblioteca Vazia</h2>
                <p className="text-zinc-500 max-w-md mb-8 text-sm">
                  {isAdmin 
                    ? "Conecte sua base de dados no painel administrativo para iniciar." 
                    : "O sistema está sendo atualizado. Volte em breve."}
                </p>
                {isAdmin && (
                    <button 
                      onClick={() => setShowAdmin(true)}
                      className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-bold transition shadow-lg flex items-center gap-2 text-sm shadow-white/5"
                    >
                      <LayoutDashboard size={16} />
                      Configurar Base de Dados
                    </button>
                )}
            </div>
        ) : (
            <>
                {!searched ? (
                    /* Home View */
                    <div className="animate-fade-in space-y-16">
                        
                        {/* Trending Section */}
                        {trendingTracks.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="text-white" size={20} />
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Em Alta</h2>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {trendingTracks.map((track, index) => (
                                        <TrackCard key={track.id} track={track} featured={true} onClick={handleTrackClick} index={index} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Recent / Full Library */}
                        {recentTracks.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="text-zinc-500" size={20} />
                                        <h2 className="text-2xl font-bold text-white tracking-tight">
                                            {trendingTracks.length === 0 ? 'Biblioteca Completa' : 'Novidades'}
                                        </h2>
                                    </div>
                                    <button onClick={() => {}} className="text-xs text-white font-bold hover:text-zinc-300 uppercase tracking-wider">Ver tudo</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {recentTracks.map((track, index) => (
                                        <TrackCard key={`recent-${track.id}`} track={track} onClick={handleTrackClick} index={index} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    /* Search Results */
                    <div className="animate-fade-in">
                        {filteredTracks.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between mb-8 pb-4">
                                    <h2 className="text-2xl font-bold text-white">
                                        {searchTerm ? `Resultados para "${searchTerm}"` : 'Resultados'}
                                        <span className="text-zinc-500 text-lg font-normal ml-3">({filteredTracks.length})</span>
                                    </h2>
                                    <button onClick={clearSearch} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-bold bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 transition-colors">
                                        <Filter size={12} /> Limpar Filtros
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {filteredTracks.map((track, index) => (
                                        <TrackCard key={`search-${track.id}`} track={track} onClick={handleTrackClick} index={index} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Not Found State */
                            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-up">
                                <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                                    <Search size={40} className="text-zinc-600" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    Nenhum resultado encontrado
                                </h2>
                                <p className="text-zinc-500 mb-8 text-sm max-w-xs mx-auto">
                                    Tente buscar por outro termo ou verifique a ortografia.
                                </p>
                                <button 
                                    onClick={clearSearch}
                                    className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl"
                                >
                                    <ArrowLeft size={16} /> Voltar para o início
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </>
        )}
        </div>
      </main>

      {/* Admin Modal */}
      {showAdmin && isAdmin && <AdminPanel user={user} onClose={() => setShowAdmin(false)} onUpdate={handleAdminUpdate} />}
    </div>
  );
};

export default MainApp;