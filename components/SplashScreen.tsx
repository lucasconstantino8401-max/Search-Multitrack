import React, { useEffect } from 'react';
import type { SplashScreenProps } from '../types';

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 animate-fade-out">
      <div className="relative flex flex-col items-center">
        {/* Modern Monochrome Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full opacity-[0.03] blur-[100px] animate-pulse"></div>
        
        {/* Unique Logo SVG - Monochrome */}
        <div className="relative z-10 mb-8 transform hover:scale-105 transition duration-700">
            <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] animate-fade-in-up">
                {/* Search Orbit Ring */}
                <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90C63.2 90 74.8 83.6 82.5 73.5" stroke="white" strokeWidth="6" strokeLinecap="round" className="opacity-100" />
                
                {/* Search Magnifier Handle - Darker Grey */}
                <path d="M78 78L90 90" stroke="#52525b" strokeWidth="8" strokeLinecap="round" />
                
                {/* Multitrack Bars */}
                <rect x="32" y="35" width="8" height="30" rx="4" fill="#a1a1aa" className="animate-[pulse_2s_ease-in-out_infinite]" />
                <rect x="46" y="25" width="8" height="50" rx="4" fill="white" className="animate-[pulse_2s_ease-in-out_0.5s_infinite]" />
                <rect x="60" y="40" width="8" height="20" rx="4" fill="#a1a1aa" className="animate-[pulse_2s_ease-in-out_1s_infinite]" />
            </svg>
        </div>

        {/* Branding Text */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-3xl font-black text-zinc-500 tracking-[0.2em] uppercase drop-shadow-lg">
              Search
            </h1>
            <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase mt-1 drop-shadow-lg">
              Multitracks
            </h1>
        </div>
        
        <div className="h-1 w-16 bg-zinc-800 mt-8 rounded-full"></div>
      </div>
    </div>
  );
};

export default SplashScreen;