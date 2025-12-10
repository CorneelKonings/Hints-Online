import React, { useState, useEffect } from 'react';
import { GamePhase, Player, GameStateSync } from '../types';
import { useGuestNetwork } from '../services/network';
import { Send, User, RotateCcw, TreePine, Gift, Sparkles, Star, Eye, PlayCircle } from 'lucide-react';
import { Snowfall } from './Snowfall';
import { THEMES } from '../constants';

export const GuestView: React.FC = () => {
  const { connectToRoom, send, lastMessage, isConnected, error } = useGuestNetwork();
  
  const [joined, setJoined] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [name, setName] = useState('');
  const [gameState, setGameState] = useState<GameStateSync | null>(null);
  const [guessInput, setGuessInput] = useState('');
  const [myId] = useState(`player_${Math.random().toString(36).substr(2, 5)}`);

  useEffect(() => {
    if (lastMessage?.type === 'STATE_UPDATE') {
      setGameState(lastMessage.state);
    }
  }, [lastMessage]);

  const joinLobby = () => {
    if (!name.trim() || roomCodeInput.length < 4) return;
    connectToRoom(roomCodeInput, myId);
  };

  useEffect(() => {
    if (isConnected && !joined) {
      const player: Player = {
        id: myId,
        name,
        avatarSeed: Math.floor(Math.random() * 100),
        score: 0
      };
      send({ type: 'JOIN_LOBBY', player });
      setJoined(true);
    }
  }, [isConnected, joined, myId, name, send]);

  const sendGuess = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!guessInput.trim()) return;
    
    send({
      type: 'SEND_GUESS',
      guess: {
        id: Math.random().toString(36),
        playerId: myId,
        playerName: name,
        text: guessInput,
        timestamp: Date.now()
      }
    });
    setGuessInput('');
  };
  
  const sendStartRound = () => {
    send({ type: 'START_ROUND', playerId: myId });
  };

  // Determine active theme
  const themeId = gameState?.themeId || 'standard';
  const activeTheme = THEMES[themeId];
  const isWinterTheme = themeId === 'christmas' || themeId === 'winter';

  // --- Mobile Login Screen ---
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col justify-center p-6 relative overflow-hidden">
        {/* Snow only on login, or could be standard */}
        
        <div className="z-10 w-full max-w-md mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 mb-6">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white drop-shadow-md">Hints Online</h1>
            <p className="text-white/60 font-medium tracking-wide uppercase text-sm">Doe mee met het feest!</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-6">
             {error && (
                <div className="bg-red-500/80 border border-red-400 text-white p-4 rounded-2xl text-center font-bold text-sm">
                  ⚠️ {error}
                </div>
              )}

             <div className="space-y-2">
               <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest ml-1">Kamer Code</label>
               <input 
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-black/20 border-2 border-white/10 focus:border-indigo-400 focus:bg-black/40 transition-all rounded-2xl px-4 py-4 text-3xl font-mono font-bold text-center tracking-[0.5em] text-white placeholder-white/20 outline-none"
                  placeholder="CODE"
                  maxLength={4}
                />
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest ml-1">Jouw Naam</label>
               <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border-2 border-white/10 focus:border-indigo-400 focus:bg-black/40 transition-all rounded-2xl px-4 py-4 text-xl font-bold text-white placeholder-white/20 outline-none"
                  placeholder="Bijv. Speler 1"
                />
             </div>
          </div>

          <button 
            onClick={joinLobby}
            disabled={!name || roomCodeInput.length < 4}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
          >
            Speel mee!
          </button>
        </div>
      </div>
    );
  }

  // --- Main Mobile Game Interface ---
  
  const phase = gameState?.phase || GamePhase.LOBBY;
  const isMyTurn = gameState?.currentRound?.playerId === myId;
  const isRoundActive = phase === GamePhase.ROUND_ACTIVE;
  const winnerNotification = gameState?.winnerNotification;

  return (
    <div className={`h-[100dvh] bg-slate-900 text-white flex flex-col overflow-hidden relative transition-colors duration-500`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGradient} pointer-events-none`}></div>
      
       {/* Background Image Layer */}
       {activeTheme.backgroundImage && (
           <div 
             className="absolute inset-0 bg-cover bg-center z-0 transition-opacity duration-1000 pointer-events-none"
             style={{ backgroundImage: `url(${activeTheme.backgroundImage})`, opacity: 0.5 }}
           />
       )}

      {/* Snowfall only if winter theme */}
      {isWinterTheme && <Snowfall />}

      {/* Winner Overlay (Global Sync) */}
      {winnerNotification && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
             <div className="text-center p-6 w-full max-w-sm">
                <Star className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-spin-slow" />
                <div className="text-2xl font-bold uppercase mb-2">Geraden door</div>
                <div className="text-4xl font-bold text-white break-words">{winnerNotification.guesserName}</div>
             </div>
         </div>
      )}
      
      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/10 shadow-inner`}>
                <User className="w-4 h-4" />
            </div>
            <div>
                <div className="font-bold leading-none truncate max-w-[150px]">{name}</div>
            </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-red-500'}`}></div>
      </header>

      {/* Main Area */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center w-full max-w-lg mx-auto pb-32">
        
        {phase === GamePhase.LOBBY && (
          <div className="space-y-6 opacity-90">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mx-auto border-4 border-white/20 animate-pulse">
                <span className="text-6xl">{activeTheme.icon}</span>
            </div>
            <h2 className="text-3xl font-bold">Wachten op Host...</h2>
            <p className="text-sm font-medium opacity-70">Kijk naar het grote scherm!</p>
          </div>
        )}

        {phase === GamePhase.SPINNING && (
          <div className="space-y-6">
            <RotateCcw className="w-20 h-20 animate-spin text-white mx-auto opacity-80" />
            <h2 className="text-2xl font-bold">Wiel draait...</h2>
          </div>
        )}

        {(phase === GamePhase.ROUND_INTRO || isRoundActive) && (
          isMyTurn ? (
            // --- UI FOR THE DESCRIBER (Holds the phone) ---
            <div className="w-full h-full flex flex-col justify-center animate-in zoom-in duration-300">
               <div className="bg-white text-slate-900 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden min-h-[50vh] flex flex-col items-center justify-center">
                   
                   {/* Card Decoration */}
                   <div className="absolute top-0 left-0 w-full h-4" style={{backgroundColor: activeTheme.primaryColor}}></div>
                   
                   {phase === GamePhase.ROUND_INTRO ? (
                       <>
                           <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-widest mb-8">Jij bent!</h2>
                           <div className="text-center space-y-8">
                               <p className="text-lg font-bold text-slate-800">Klaar om te omschrijven?</p>
                               
                               <button 
                                 onClick={sendStartRound}
                                 className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xl active:scale-95 transition-transform animate-pulse"
                               >
                                   <PlayCircle className="w-16 h-16 text-white ml-2" />
                               </button>

                               <p className="text-sm text-slate-500 px-4 font-bold">Druk op START om de tijd te starten!</p>
                           </div>
                       </>
                   ) : (
                       <>
                           <div className="absolute top-6 right-6 font-mono font-bold text-4xl text-slate-200">
                                {gameState?.currentRound?.timeLeft}
                           </div>
                           <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Jouw Woord</h2>
                           <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-8 break-words max-w-full">
                               {gameState?.currentRound?.secretWord || "..."}
                           </h1>
                           <div className="bg-slate-100 px-4 py-2 rounded-lg text-slate-500 text-sm font-medium">
                               Verboden dit woord te zeggen!
                           </div>
                       </>
                   )}
               </div>
            </div>
          ) : (
            // --- UI FOR THE GUESSERS ---
            <div className="w-full max-w-sm space-y-8">
              {isRoundActive ? (
                 <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[200px]">
                        <div className="text-6xl font-black text-white tabular-nums drop-shadow-lg mb-2">
                            {gameState?.currentRound?.timeLeft || 20}
                        </div>
                        <div className="text-sm font-bold uppercase tracking-widest opacity-60">Seconden</div>
                    </div>
                    
                    <div className="text-center opacity-80 animate-pulse">
                         Raad wat er wordt omschreven!
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6 opacity-60">
                    <Sparkles className="w-16 h-16 mx-auto" />
                    <h2 className="text-2xl font-bold">Maak je klaar...</h2>
                 </div>
              )}
            </div>
          )
        )}
        
        {(phase === GamePhase.ROUND_FEEDBACK || phase === GamePhase.ROUND_SUMMARY) && (
             <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20">
                <div className="text-3xl font-bold text-white mb-2">Ronde Voorbij</div>
                <p className="opacity-70">Even geduld...</p>
             </div>
        )}
      </main>

      {/* Floating Input Bar - Only for guessers during active round */}
      <div className={`absolute bottom-6 left-4 right-4 z-20 transition-all duration-500 ${(!isRoundActive || isMyTurn || winnerNotification) ? 'translate-y-[200%] opacity-0' : 'translate-y-0 opacity-100'}`}>
        <form onSubmit={sendGuess} className="relative shadow-2xl">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Typ je gok..."
            className="w-full bg-white/90 backdrop-blur-xl text-slate-900 rounded-2xl pl-6 pr-16 py-5 text-xl font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg border border-white"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-2 bottom-2 w-12 rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-md text-white"
            style={{ backgroundColor: activeTheme.primaryColor }}
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};