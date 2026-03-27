import React from 'react';

const MonsteraLeafSVG = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    style={style}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* A detailed Monstera leaf path */}
    <path d="M49.9,98.1C47.2,85.3 46.1,72.6 47.9,60.8C35.9,74.5 21.2,81.3 7.5,78C18.4,67.6 28.1,62.8 40.5,56.9C28.3,64.2 14.8,63.1 3.5,53.2C16.8,43.2 27.2,43.2 40.5,39.1C28.2,39.8 17.1,30.3 12.3,18.8C25.4,18.8 35.6,22.1 44.5,23.3C38.6,12.5 40.7,3.5 50.3,1.5C59.9,3.5 62,12.5 56.1,23.3C65,22.1 75.2,18.8 88.3,18.8C83.5,30.3 72.4,39.8 60.1,39.1C73.4,43.2 83.8,43.2 97.1,53.2C85.8,63.1 72.3,64.2 60.1,56.9C72.5,62.8 82.2,67.6 93.1,78C79.4,81.3 64.7,74.5 52.7,60.8C54.5,72.6 53.4,85.3 50.7,98.1Z" />
    <path d="M50 98 L50 2" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
  </svg>
);

const SketchLeafBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden bg-white dark:bg-slate-950">
      
      {/* Light subtle glow */}
      <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-green-500/5 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-float"></div>

      {/* Medium Backdrop Monstera Leaves */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03]">
        <MonsteraLeafSVG className="absolute -left-10 top-[10%] w-[350px] h-[350px] text-green-700 rotate-[30deg] animate-leaf-sway" />
        <MonsteraLeafSVG className="absolute right-[-5%] bottom-[5%] w-[400px] h-[400px] text-green-800 -rotate-[20deg] animate-leaf-sway-reverse" />
      </div>

      {/* Floating Tropical Leaves overlay (Subtle) */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        {[...Array(5)].map((_, i) => (
          <MonsteraLeafSVG
            key={i}
            className={`absolute w-12 h-12 text-green-600/40 drop-shadow-sm animate-fly-leaf-${(i % 3) + 1}`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${20 + Math.random() * 20}s`,
              filter: `blur(${Math.random() * 3}px)`
            }}
          />
        ))}
      </div>
      
    </div>
  );
};

export default SketchLeafBackground;
