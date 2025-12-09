import React, { useEffect, useState } from 'react';

const InteractiveBackground: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base Noise/Texture (Optional for grittier look) */}
      <div className="absolute inset-0 bg-black opacity-100"></div>
      
      {/* Moving Spotlight */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.07), transparent 40%)`
        }}
      ></div>

      {/* Grid Pattern overlay - very subtle */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      ></div>
    </div>
  );
};

export default InteractiveBackground;