import React, { useEffect, useState } from 'react';
import { Player } from '../types';

interface SpinningWheelProps {
  players: Player[];
  targetPlayer: Player | null; // The pre-determined winner
  onFinished: () => void;
  isSpinning: boolean;
  colors: string[]; // Dynamic colors based on theme
}

export const SpinningWheel: React.FC<SpinningWheelProps> = ({ players, targetPlayer, onFinished, isSpinning, colors }) => {
  const [rotation, setRotation] = useState(0);
  
  if (players.length === 0) {
    return (
      <div className="w-80 h-80 rounded-full border-4 border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm animate-pulse">
        <span className="text-white/50 text-xl font-bold">Wachten...</span>
      </div>
    );
  }

  // Ensure consistent order
  const safePlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));

  // Create Conic Gradient String
  const createConicGradient = () => {
    if (safePlayers.length === 0) return 'none';
    if (safePlayers.length === 1) return colors[0];

    const segmentSize = 100 / safePlayers.length;
    let gradient = 'conic-gradient(';
    
    safePlayers.forEach((_, index) => {
      const color = colors[index % colors.length];
      const start = index * segmentSize;
      const end = (index + 1) * segmentSize;
      gradient += `${color} ${start}% ${end}%, `;
    });

    return gradient.slice(0, -2) + ')';
  };

  useEffect(() => {
    if (isSpinning && targetPlayer) {
      // Find index in the sorted list
      const targetIndex = safePlayers.findIndex(p => p.id === targetPlayer.id);
      
      if (targetIndex !== -1) {
        const segmentAngle = 360 / safePlayers.length;
        
        // Calculate the center angle of the winner's segment
        const segmentCenterAngle = (targetIndex * segmentAngle) + (segmentAngle / 2);
        
        // We want this angle to end up at 0 degrees (top)
        // Standard rotation goes clockwise. 
        // To bring X to 0, we rotate -X.
        // Add huge rotation for visual effect.
        const spins = 360 * 10; // 10 full rotations
        const targetRotation = spins - segmentCenterAngle;

        setRotation(targetRotation);
        
        const timeout = setTimeout(() => {
          onFinished();
        }, 8000); 

        return () => clearTimeout(timeout);
      }
    }
  }, [isSpinning, targetPlayer, safePlayers, onFinished]);

  return (
    <div className="relative w-[30rem] h-[30rem]">
      {/* Pointer */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-xl">
         <div className="text-6xl text-white drop-shadow-lg">▼</div>
      </div>

      {/* Wheel Container */}
      <div 
        className="w-full h-full rounded-full overflow-hidden relative transition-transform duration-[8000ms] cubic-bezier(0.1, 0, 0.1, 1) shadow-2xl border-8 border-white"
        style={{ 
            transform: `rotate(${rotation}deg)`,
            background: createConicGradient()
        }}
      >
        {safePlayers.map((player, index) => {
          const count = safePlayers.length;
          const segmentAngle = 360 / count;
          const rotateAngle = (index * segmentAngle) + (segmentAngle / 2);

          return (
            <div
              key={player.id}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{
                // Rotate the container to point to the center of the segment
                transform: `rotate(${rotateAngle}deg)`
              }}
            >
              {/* Text Container - Pushed outwards */}
              <div 
                className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-start pt-8"
                style={{ 
                    height: '50%',
                    transformOrigin: 'bottom center',
                }} 
              >
                 <span className="text-white font-black text-xl drop-shadow-md uppercase tracking-wider truncate max-w-[120px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    {player.name}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Center Hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] z-20 flex items-center justify-center border-4 border-white/50">
        <span className="text-4xl">🎲</span>
      </div>
    </div>
  );
};