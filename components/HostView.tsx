
import React, { useState, useEffect, useCallback } from 'react';
import { GamePhase, Player, Guess, NetworkMessage, GameStateSync, ThemeId, Difficulty } from '../types';
import { useHostNetwork } from '../services/network';
import { CARD_DURATION_SEC, TOTAL_CARDS_PER_TURN, MAX_ROUNDS, THEMES, DIFFICULTIES } from '../constants';
import { generateGameWords } from '../services/geminiService';
import { SpinningWheel } from './SpinningWheel';
import { Play, Users, Trophy, SkipForward, Snowflake as SnowflakeIcon, Gift, Star, Medal, Settings, Eye, EyeOff, Smartphone } from 'lucide-react';
import { Snowfall } from './Snowfall';
import { audio } from '../services/audioService';

// Helper for fuzzy comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents (é -> e, ü -> u)
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .trim();
};

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", ...props }) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl ${className}`} {...props}>
    {children}
  </div>
);

export const HostView: React.FC = () => {
  const { broadcast, lastMessage, roomCode, connectionCount } = useHostNetwork();
  
  // Settings State
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('standard');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  
  // Round State
  const [turnCount, setTurnCount] = useState(1);
  const [targetWheelPlayer, setTargetWheelPlayer] = useState<Player | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameWords, setGameWords] = useState<string[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CARD_DURATION_SEC);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundScore, setRoundScore] = useState(0); 

  // Success Overlay State (synced to phones)
  const [winnerNotification, setWinnerNotification] = useState<{guesserName: string, timestamp: number} | undefined>(undefined);

  // Sync State Helper
  const syncState = useCallback(() => {
    const currentWord = gameWords[currentCardIndex];
    
    const state: GameStateSync = {
      phase,
      players,
      themeId: selectedThemeId, // Sync theme to guests
      guesses: phase === GamePhase.ROUND_ACTIVE ? guesses : [], 
      currentRound: currentPlayer ? {
        playerId: currentPlayer.id,
        timeLeft,
        currentCardIndex: currentCardIndex + 1,
        totalCards: TOTAL_CARDS_PER_TURN,
        secretWord: currentWord // Send the word so the active phone can see it
      } : undefined,
      winnerNotification
    };
    broadcast({ type: 'STATE_UPDATE', state });
  }, [phase, players, guesses, currentPlayer, timeLeft, currentCardIndex, broadcast, winnerNotification, selectedThemeId, gameWords]);

  // Actions
  const handleSuccess = useCallback((guesserPlayerId: string, guesserName: string) => {
    audio.playCorrect(); // SFX
    setWinnerNotification({ guesserName, timestamp: Date.now() });
    
    setPlayers(prev => prev.map(p => {
        if (p.id === guesserPlayerId) return { ...p, score: p.score + 1 };
        if (p.id === currentPlayer?.id) return { ...p, score: p.score + 1 };
        return p;
    }));

    setRoundScore(s => s + 1);

    setTimeout(() => {
        setWinnerNotification(undefined);
        if (currentCardIndex < TOTAL_CARDS_PER_TURN - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setGuesses([]);
            setPhase(GamePhase.ROUND_ACTIVE);
            setTimeLeft(CARD_DURATION_SEC);
            audio.playStartRound(); // SFX for next word
        } else {
            audio.playWin(); // Round finished nicely
            setPhase(GamePhase.ROUND_SUMMARY);
        }
    }, 3000);
  }, [currentCardIndex, currentPlayer]);

  const handleFail = useCallback(() => {
    audio.playTimeUp(); // SFX
    if (currentCardIndex < TOTAL_CARDS_PER_TURN - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setGuesses([]);
      setPhase(GamePhase.ROUND_ACTIVE);
      setTimeLeft(CARD_DURATION_SEC);
      audio.playStartRound(); // SFX for next word
    } else {
      setPhase(GamePhase.ROUND_SUMMARY);
    }
  }, [currentCardIndex]);

  // Network Listener & Auto-Check Logic
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'JOIN_LOBBY') {
        audio.playClick(); // SFX
        setPlayers(prev => {
          if (prev.find(p => p.id === lastMessage.player.id)) return prev;
          return [...prev, { ...lastMessage.player, score: 0 }];
        });
      } 
      // Handle Start Round Signal from Phone
      else if (lastMessage.type === 'START_ROUND') {
         if (phase === GamePhase.ROUND_INTRO && lastMessage.playerId === currentPlayer?.id) {
             startRound();
         }
      }
      else if (lastMessage.type === 'SEND_GUESS') {
        if (phase === GamePhase.ROUND_ACTIVE && !winnerNotification) { 
          const newGuess = lastMessage.guess;
          setGuesses(prev => [newGuess, ...prev]);

          const currentWord = gameWords[currentCardIndex];
          if (currentWord) {
             const normalizedGuess = normalizeText(newGuess.text);
             const normalizedTarget = normalizeText(currentWord);
             
             // Check exact match OR fuzzy match inside string (if target is long)
             const isMatch = normalizedGuess === normalizedTarget;
             const isIncluded = (normalizedTarget.length > 3 && normalizedGuess.includes(normalizedTarget));

             if (isMatch || isIncluded) {
                 handleSuccess(newGuess.playerId, newGuess.playerName);
             }
          }
        }
      }
    }
  }, [lastMessage, phase, gameWords, currentCardIndex, handleSuccess, winnerNotification, currentPlayer]);

  // Periodic Sync
  useEffect(() => {
    const interval = setInterval(syncState, 500); 
    return () => clearInterval(interval);
  }, [syncState]);

  // Timer Logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === GamePhase.ROUND_ACTIVE && timeLeft > 0 && !winnerNotification) {
      timer = setInterval(() => {
        setTimeLeft(t => t - 1);
        if (timeLeft <= 5 && timeLeft > 0) audio.playTimeTick(); // Tick SFX last 5 seconds
      }, 1000);
    } else if (timeLeft === 0 && phase === GamePhase.ROUND_ACTIVE && !winnerNotification) {
      handleFail(); 
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft, winnerNotification, handleFail]);

  const spinWheel = () => {
    if (players.length < 1) return alert("Wachten op spelers!");
    audio.playClick();
    
    // Pick random winner from ALL players
    const winner = players[Math.floor(Math.random() * players.length)];
    setTargetWheelPlayer(winner);
    
    setPhase(GamePhase.SPINNING);
    setIsSpinning(true);
    
    // Simulate spinning clicking sound
    let spinInterval = setInterval(() => audio.playSpinTick(), 200);
    setTimeout(() => clearInterval(spinInterval), 8000);
  };

  const handleWheelFinished = async () => {
    setIsSpinning(false);
    if (!targetWheelPlayer) return;
    
    audio.playWin(); // Selected player sound
    setCurrentPlayer(targetWheelPlayer);
    setPhase(GamePhase.ROUND_INTRO);
    
    const words = await generateGameWords(TOTAL_CARDS_PER_TURN, selectedThemeId, selectedDifficulty);
    setGameWords(words);
    setCurrentCardIndex(0);
    setRoundScore(0);
  };

  const startRound = () => {
    audio.playStartRound();
    setTimeLeft(CARD_DURATION_SEC);
    setGuesses([]);
    setPhase(GamePhase.ROUND_ACTIVE);
  };

  const finishTurn = () => {
    audio.playClick();
    setTargetWheelPlayer(null);
    setCurrentPlayer(null);

    if (turnCount >= MAX_ROUNDS) {
        setTurnCount(1);
        setPhase(GamePhase.LOBBY); // Reset to lobby
    } else {
        setTurnCount(prev => prev + 1);
        setPhase(GamePhase.SPINNING);
    }
  };

  const activeTheme = THEMES[selectedThemeId];
  const isWinterTheme = selectedThemeId === 'christmas' || selectedThemeId === 'winter';

  // --- UI COMPONENTS ---

  const renderLobby = () => (
    <div className="flex flex-col h-full w-full relative z-10 p-8 md:p-12">
      <div className="flex justify-between items-start mb-8">
        <div>
           <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-4">
            Hints Online {activeTheme.icon}
          </h1>
          <p className="text-white/70 text-xl font-medium tracking-wide">Join met je telefoon!</p>
        </div>
        
        <GlassCard className="px-8 py-4 flex flex-col items-center animate-float">
          <span className="text-white/60 text-sm font-bold tracking-widest uppercase mb-1">Room Code</span>
          <span className="text-6xl font-black text-white font-mono tracking-widest drop-shadow-lg">{roomCode}</span>
        </GlassCard>
      </div>
      
      <div className="flex gap-8 flex-1 min-h-0">
        <GlassCard className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Spelers ({players.length})</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full">
               <div className={`w-2 h-2 rounded-full ${connectionCount > 0 ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
               <span className="text-xs font-mono opacity-70">{connectionCount > 0 ? 'ONLINE' : 'WACHTEN'}</span>
            </div>
          </div>
          
          {players.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
               <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                 <span className="text-4xl">{activeTheme.icon}</span>
               </div>
               <p className="text-xl">Wachten op spelers... Code: <strong>{roomCode}</strong></p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {players.map(p => (
                <div key={p.id} className="relative group">
                   <div className="relative bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                      <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-transparent rounded-full flex items-center justify-center text-2xl shadow-inner">
                        {['🙂','😄','🤠','😎','🥳','🤡'][p.avatarSeed % 6]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-lg truncate text-white">{p.name}</div>
                        <div className="text-xs opacity-70 font-bold">{p.score} Punten</div>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="w-1/3 flex flex-col gap-6">
           {/* GAME SETTINGS */}
           <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <Settings className="w-5 h-5" /> Instellingen
              </h2>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs uppercase font-bold text-white/50 mb-1 block">Thema</label>
                      <div className="flex flex-wrap gap-2">
                          {(Object.keys(THEMES) as ThemeId[]).map(t => (
                              <button 
                                key={t}
                                onClick={() => { 
                                    audio.playClick(); 
                                    setSelectedThemeId(t);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedThemeId === t ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                              >
                                {THEMES[t].icon} {THEMES[t].label}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="text-xs uppercase font-bold text-white/50 mb-1 block">Moeilijkheid</label>
                      <div className="flex gap-2">
                          {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
                              <button 
                                key={d}
                                onClick={() => { audio.playClick(); setSelectedDifficulty(d); }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedDifficulty === d ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                              >
                                {DIFFICULTIES[d].label}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
           </GlassCard>
           
           <button 
            onClick={spinWheel}
            disabled={players.length < 2}
            className="group relative h-24 w-full overflow-hidden rounded-3xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: activeTheme.primaryColor }}
           >
             <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex items-center justify-center gap-4 relative z-10">
               <Play className="w-10 h-10 fill-white" />
               <span className="text-3xl font-bold text-white">Start Spel</span>
             </div>
           </button>
        </div>
      </div>
    </div>
  );

  const renderWheel = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full relative z-10 p-8">
        <h2 className="text-6xl font-bold mb-4 text-white drop-shadow-xl animate-float">
          Beurt {turnCount} van {MAX_ROUNDS}
        </h2>
        <p className="text-white/60 text-xl mb-8">Wie is er aan de beurt?</p>
        
        <SpinningWheel 
            players={players} 
            targetPlayer={targetWheelPlayer}
            onFinished={handleWheelFinished} 
            isSpinning={isSpinning}
            colors={activeTheme.wheelColors}
        />
        
        {!isSpinning && !targetWheelPlayer && (
             <button 
             onClick={spinWheel}
             className="mt-12 px-12 py-5 text-white rounded-full text-2xl font-bold hover:brightness-110 transition-all shadow-lg animate-pulse"
             style={{ backgroundColor: activeTheme.primaryColor }}
           >
             Draai aan het wiel!
           </button>
        )}
      </div>
    );
  };

  const renderGameplay = () => {
    const isActive = phase === GamePhase.ROUND_ACTIVE;

    return (
      <div className="h-full flex flex-col relative z-10 bg-gradient-to-b from-transparent to-black/20">
        
        {winnerNotification && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-white to-gray-200 p-1 rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.3)] animate-in zoom-in duration-300">
                    <div className="bg-slate-900 rounded-[2.8rem] px-24 py-16 flex flex-col items-center text-center border-4 border-white/50">
                        <Star className="w-32 h-32 text-yellow-400 fill-yellow-400 animate-spin-slow mb-6" />
                        <h2 className="text-4xl text-white/80 font-bold uppercase tracking-widest mb-4">Goed Gedaan!</h2>
                        <div className="text-6xl font-black text-white leading-tight">
                            Geraden door<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-8xl">{winnerNotification.guesserName}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Top Bar */}
        <div className="h-24 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-12">
            <div className="flex items-center gap-6">
                <div className="flex gap-4">
                  {[...players].sort((a,b) => b.score - a.score).slice(0, 3).map((p, i) => (
                     <div key={p.id} className="flex items-center gap-2 bg-black/20 px-4 py-1 rounded-full border border-white/5">
                        <Medal className={`w-4 h-4 ${i===0?'text-yellow-400':i===1?'text-gray-300':'text-orange-400'}`} />
                        <span className="font-bold">{p.name}</span>
                        <span className="bg-white/20 px-2 rounded text-xs">{p.score}</span>
                     </div>
                  ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-white/10 px-4 py-1 rounded-full font-bold text-sm">Beurt {turnCount}/{MAX_ROUNDS}</div>
                <div className="flex items-center gap-2">
                    <span className="text-white/60 uppercase tracking-widest text-sm font-bold">Kaart</span>
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < currentCardIndex ? 'bg-white' : i === currentCardIndex ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
             <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <div className="text-sm text-white/50 font-bold tracking-[0.2em] uppercase mb-2">Aan de beurt</div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                   <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                     {['🙂','😄','🤠','😎','🥳','🤡'][(currentPlayer?.avatarSeed || 0) % 6]}
                   </div>
                   <span className="text-2xl font-bold text-white">{currentPlayer?.name}</span>
                </div>
             </div>

             <div className="perspective-1000 w-full max-w-2xl flex flex-col items-center justify-center">
                <div className={`relative w-full aspect-video bg-white text-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center p-12 transition-all duration-500 transform ${isActive ? 'scale-100 rotate-0' : 'scale-95 rotate-1 hover:rotate-0'}`}>
                    
                    {/* HOST SCREEN DOES NOT SHOW WORD */}
                    <div className="text-slate-400 font-bold uppercase tracking-[0.3em] mb-4">Raad het woord!</div>
                    <div className="text-center">
                        {phase === GamePhase.ROUND_INTRO ? (
                           <div className="flex flex-col items-center gap-4 animate-pulse">
                              <Smartphone className="w-24 h-24 text-slate-300" />
                              <h2 className="text-3xl font-bold text-slate-700">{currentPlayer?.name} drukt op START...</h2>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center">
                              <h1 className="text-8xl font-black text-slate-200 tracking-tighter select-none">???</h1>
                              <p className="text-slate-500 font-bold mt-4">Luister naar {currentPlayer?.name}!</p>
                           </div>
                        )}
                    </div>

                    {isActive && (
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full border-8 border-white shadow-xl flex items-center justify-center z-20 animate-bounce text-white" style={{backgroundColor: activeTheme.primaryColor}}>
                            <span className="font-mono text-4xl font-black">{timeLeft}</span>
                        </div>
                    )}
                 </div>
             </div>
          </div>

          <div className="w-[450px] bg-black/20 backdrop-blur-xl border-l border-white/10 flex flex-col p-6 z-10">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>💬</span> Live Gokken
                </h3>
                <div className="bg-white/10 px-2 py-1 rounded text-xs text-white/50">{guesses.length} gokken</div>
             </div>

             <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 pr-2 custom-scrollbar mask-image-b">
                {guesses.map((g, i) => (
                    <div key={g.id} className={`p-4 rounded-2xl rounded-tl-sm shadow-lg transform transition-all duration-500 animate-in slide-in-from-right fade-in ${i === 0 ? 'bg-white text-slate-900 scale-100' : 'bg-white/80 text-slate-700 scale-95 opacity-80'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs uppercase tracking-wider opacity-60">{g.playerName}</span>
                            <span className="text-[10px] opacity-40">Zojuist</span>
                        </div>
                        <div className="text-2xl font-bold leading-tight">{g.text}</div>
                    </div>
                ))}
                
                {guesses.length === 0 && isActive && (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                        <Gift className="w-16 h-16 mb-4 animate-pulse" />
                        <p className="text-xl">Wachten op antwoorden...</p>
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="flex flex-col items-center justify-center h-full relative z-10 p-8">
        <GlassCard className="p-16 text-center max-w-4xl w-full border-t-8 transform hover:scale-[1.01] transition-transform" style={{borderColor: activeTheme.primaryColor}}>
          <Trophy className="w-32 h-32 mx-auto mb-8 animate-bounce" style={{color: activeTheme.primaryColor}} />
          <h2 className="text-6xl md:text-8xl font-bold mb-4 text-white">Ronde Voorbij!</h2>
          <div className="flex items-center justify-center gap-4 text-2xl text-white/80 mb-12">
              <span>Deze beurt leverde</span>
              <span className="bg-white px-6 py-2 rounded-xl font-black text-4xl shadow-inner" style={{color: activeTheme.primaryColor}}>{roundScore}</span>
              <span>punten op</span>
          </div>
          
          <button 
              onClick={finishTurn}
              className="px-12 py-5 text-white rounded-2xl text-2xl font-bold hover:brightness-110 transition-colors shadow-lg flex items-center gap-3 mx-auto"
              style={{ backgroundColor: activeTheme.secondaryColor }}
          >
              <SkipForward className="fill-white" />
              {turnCount >= MAX_ROUNDS ? "Naar Eindstand" : "Volgende Speler"}
          </button>
        </GlassCard>
    </div>
  );

  return (
    <div className={`h-screen w-screen bg-slate-900 text-white overflow-hidden font-sans relative`}>
       {/* Dynamic Background */}
       <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGradient} z-0 transition-colors duration-1000`}></div>
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 z-0"></div>
       
       {isWinterTheme && <Snowfall />}
       
       {phase === GamePhase.LOBBY && renderLobby()}
       {phase === GamePhase.SPINNING && renderWheel()}
       {(phase === GamePhase.ROUND_INTRO || phase === GamePhase.ROUND_ACTIVE || phase === GamePhase.ROUND_FEEDBACK) && renderGameplay()}
       {phase === GamePhase.ROUND_SUMMARY && renderSummary()}
    </div>
  );
};
