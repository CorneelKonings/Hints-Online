import React, { useState } from 'react';
import { HostView } from './components/HostView';
import { GuestView } from './components/GuestView';
import { Tablet, Smartphone, Sparkles } from 'lucide-react';
import { Snowfall } from './components/Snowfall';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'selection' | 'host' | 'guest'>('selection');

  if (viewMode === 'host') {
    return <HostView />;
  }

  if (viewMode === 'guest') {
    return <GuestView />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black z-0"></div>
      
      <div className="max-w-2xl w-full text-center space-y-12 z-10">
        
        <div className="space-y-4">
           <h1 className="text-7xl md:text-8xl font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
             Hints Online
           </h1>
           <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="font-bold tracking-widest text-sm uppercase">Party Game</span>
           </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 px-4">
          <button 
            onClick={() => setViewMode('host')}
            className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] transition-all hover:-translate-y-2 hover:shadow-2xl overflow-hidden text-left"
          >
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <Tablet size={160} />
             </div>
             <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                   <Tablet className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-white">Start als Host</h2>
                  <p className="text-white/60 font-medium">Voor iPad / TV. Beheert het spel.</p>
                </div>
             </div>
          </button>

          <button 
            onClick={() => setViewMode('guest')}
            className="group relative bg-gradient-to-br from-indigo-600 to-purple-800 border border-white/10 p-8 rounded-[2rem] transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-900/50 overflow-hidden text-left"
          >
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <Smartphone size={160} />
             </div>
             <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                   <Smartphone className="text-white w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-white">Speel Mee</h2>
                  <p className="text-indigo-100 font-medium">Voor Telefoons. Vul code in.</p>
                </div>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;