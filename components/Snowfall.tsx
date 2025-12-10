import React, { useMemo } from 'react';

export const Snowfall: React.FC = () => {
  // Use useMemo to generate flakes ONCE. 
  // Previously, they regenerated on every re-render (every second due to timer), causing the "snap".
  const snowflakes = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`, // Stagger start
      opacity: Math.random() * 0.5 + 0.3,
      size: Math.random() * 10 + 5 + 'px',
      duration: Math.random() * 10 + 10 + 's' // Slower fall 10-20s
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute bg-white rounded-full animate-fall"
          style={{
            left: flake.left,
            top: '-20px', // Start slightly above screen
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDuration: flake.duration,
            animationDelay: flake.animationDelay,
          }}
        />
      ))}
    </div>
  );
};