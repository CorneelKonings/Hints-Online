import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, Player, Guess, NetworkMessage, GameStateSync, ThemeId, Difficulty } from '../types';
import { useHostNetwork } from '../services/network';
import { CARD_DURATION_SEC, TOTAL_CARDS_PER_TURN, MAX_ROUNDS, THEMES, DIFFICULTIES } from '../constants';
import { generateGameWords } from '../services/geminiService';
import { SpinningWheel } from './SpinningWheel';
import { Play, Users, Trophy, SkipForward, Star, Medal, Settings, Smartphone, Maximize, Minimize, Volume2, VolumeX, Gift } from 'lucide-react';
import { Snowfall } from './Snowfall';
import { audio } from '../services/audioService';
import QRCode from 'react-qr-code';

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
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
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('standard');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [turnCount, setTurnCount] = useState(1);
  const [targetWheelPlayer, setTargetWheelPlayer] = useState<Player | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameWords, setGameWords] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CARD_DURATION_SEC);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundScore, setRoundScore] = useState(0); 
  const processedGuessIds = useRef<Set<string>>(new Set());
  const [winnerNotification, setWinnerNotification] = useState<{guesserName: string, timestamp: number} | undefined>(undefined);

  const syncState = useCallback(() => {
    const currentWord = gameWords[currentCardIndex];
    const state: GameStateSync = {
      phase,
      players,
      themeId: selectedThemeId,
      guesses: phase === GamePhase.ROUND_ACTIVE ? guesses : [], 
      currentRound: currentPlayer ? {
        playerId: currentPlayer.id,
        timeLeft,
        currentCardIndex: currentCardIndex + 1,
        totalCards: TOTAL_CARDS_PER_TURN,
        secretWord: currentWord
      } : undefined,
      winnerNotification
    };
    broadcast({ type: 'STATE_UPDATE', state });
  }, [phase, players, guesses, currentPlayer, timeLeft, currentCardIndex, broadcast, winnerNotification, selectedThemeId, gameWords]);

  useEffect(() => {
    const theme = THEMES[selectedThemeId];
    audio.playBGM(theme.musicUrl);
  }, [selectedThemeId]);

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    audio.setMute(newState);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }
  };

  const handleSuccess = useCallback((guesserPlayerId: string, guesserName: string) => {
    if (currentPlayer && guesserPlayerId === currentPlayer.id) return;
    
    audio.playCorrect();
    setWinnerNotification({ guesserName, timestamp: Date.now() });
    
    // STRICT SCORING: Only guesser and describer get a point
    setPlayers(prev => prev.map(p => {
        if (p.id === guesserPlayerId) return { ...p, score: p.score + 1 };
        if (currentPlayer && p.id === currentPlayer.id) return { ...p, score: p.score + 1 };
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
            audio.playStartRound();
        } else {
            audio.playWin();
            setPhase(GamePhase.ROUND_SUMMARY);
        }
    }, 3000);
  }, [currentCardIndex, currentPlayer]);

  const handleFail = useCallback(() => {
    audio.playTimeUp();
    if (currentCardIndex < TOTAL_CARDS_PER_TURN - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setGuesses([]);
      setPhase(GamePhase.ROUND_ACTIVE);
      setTimeLeft(CARD_DURATION_SEC);
      audio.playStartRound();
    } else {
      setPhase(GamePhase.ROUND_SUMMARY);
    }
  }, [currentCardIndex]);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'JOIN_LOBBY') {
        audio.playClick();
        setPlayers(prev => {
          if (prev.find(p => p.id === lastMessage.player.id)) return prev;
          return [...prev, { ...lastMessage.player, score: 0 }];
        });
      } 
      else if (lastMessage.type === 'START_ROUND') {
         if (phase === GamePhase.ROUND_INTRO && lastMessage.playerId === currentPlayer?.id) {
             startRound();
         }
      }
      else if (lastMessage.type === 'SEND_GUESS') {
        const newGuess = lastMessage.guess;
        if (processedGuessIds.current.has(newGuess.id)) return;
        processedGuessIds.current.add(newGuess.id);
        if (processedGuessIds.current.size > 100) processedGuessIds.current.clear();

        if (phase === GamePhase.ROUND_ACTIVE && !winnerNotification) { 
          setGuesses(prev => [newGuess, ...prev]);
          const currentWord = gameWords[currentCardIndex];
          if (currentWord) {
             const normalizedGuess = normalizeText(newGuess.text);
             const normalizedTarget = normalizeText(currentWord);
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

  useEffect(() => {
    const interval = setInterval(syncState, 500); 
    return () => clearInterval(interval);
  }, [syncState]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === GamePhase.ROUND_ACTIVE && timeLeft > 0 && !winnerNotification) {
      timer = setInterval(() => {
        setTimeLeft(t => t - 1);
        if (timeLeft <= 5 && timeLeft > 0) audio.playTimeTick();
      }, 1000);
    } else if (timeLeft === 0 && phase === GamePhase.ROUND_ACTIVE && !winnerNotification) {
      handleFail(); 
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft, winnerNotification, handleFail]);

  const spinWheel = () => {
    if (players.length < 2) return alert("Je hebt minimaal 2 spelers nodig!");
    audio.playClick();
    const winner = players[Math.floor(Math.random() * players.length)];
    setTargetWheelPlayer(winner);
    setPhase(GamePhase.SPINNING);
    setIsSpinning(true);
    let spinInterval = setInterval(() => audio.playSpinTick(), 200);
    setTimeout(() => clearInterval(spinInterval), 8000);
  };

  const handleWheelFinished = async () => {
    setIsSpinning(false);
    if (!targetWheelPlayer) return;
    audio.playWin();
    setCurrentPlayer(targetWheelPlayer);
    setPhase(GamePhase.ROUND_INTRO);
    const words = await generateGameWords(TOTAL_CARDS_PER_TURN, selectedThemeId, selectedDifficulty, usedWords);
    setGameWords(words);
    setUsedWords(prev => [...prev, ...words]);
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
        setPhase(GamePhase.LOBBY);
        setUsedWords([]);
    } else {
        setTurnCount(prev => prev + 1);
        setPhase(GamePhase.SPINNING);
    }
  };

  const activeTheme = THEMES[selectedThemeId];
  const isWinterTheme = selectedThemeId === 'christmas' || selectedThemeId === 'winter';
  const joinUrl = `${window.location.origin}/?code=${roomCode}`;

  const renderLobby = () => (
    <div className="flex flex-col h-full w-full relative z-10 p-8 md:p-12">
      <div className="flex justify-between items-start mb-8">
        <div>
           <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-xl flex items-center gap-4">
            Hints Online {activeTheme.icon}
          </h1>
          <p className="text-white/70 text-xl font-medium">Scan de code om mee te doen!</p>
        </div>
        <div className="flex flex-col items-end gap-6">
            <div className="flex items-center gap-4">
                <button onClick={toggleMute} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    {isMuted ? <VolumeX className="text-white" /> : <Volume2 className="text-white" />}
                </button>
                <button onClick={toggleFullscreen} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    {isFullscreen ? <Minimize className="text-white" /> : <Maximize className="text-white" />}
                </button>
            </div>
            <div className="flex items-end gap-6">
                <div className="bg-white p-3 rounded-2xl shadow-xl transform rotate-[-2deg] flex flex-col items-center">
                    <QRCode value={joinUrl} size={120} />
                    <span className="text-slate-900 text-[10px] font-bold mt-2 uppercase tracking-wide">AUTO-JOIN</span>
                </div>
                <GlassCard className="px-8 py-4 flex flex-col items-center animate-float">
                  <span className="text-white/60 text-sm font-bold uppercase mb-1">Kamer Code</span>
                  <span className="text-6xl font-black text-white font-mono tracking-widest">{roomCode}</span>
                </GlassCard>
            </div>
        </div>
      </div>
      <div className="flex gap-8 flex-1 min-h-0">
        <GlassCard className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 text-white">
              <Users className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Spelers ({players.length})</h2>
            </div>
          </div>
          {players.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
               <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center animate-pulse mb-4">
                 <span className="text-4xl">{activeTheme.icon}</span>
               </div>
               <p className="text-xl">Wachten op spelers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                    {['🙂','😄','🤠','😎','🥳','🤡'][p.avatarSeed % 6]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate text-white">{p.name}</div>
                    <div className="text-xs opacity-70 font-bold">{p.score} Punten</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        <div className="w-1/3 flex flex-col gap-6">
           <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Settings className="w-5 h-5" /> Instellingen</h2>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs uppercase font-bold text-white/50 mb-1 block">Thema</label>
                      <div className="flex flex-wrap gap-2">
                          {(Object.keys(THEMES) as ThemeId[]).map(t => (
                              <button key={t} onClick={() => setSelectedThemeId(t)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedThemeId === t ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                                {THEMES[t].icon} {THEMES[t].label}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="text-xs uppercase font-bold text-white/50 mb-1 block">Moeilijkheid</label>
                      <div className="flex gap-2">
                          {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
                              <button key={d} onClick={() => setSelectedDifficulty(d)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedDifficulty === d ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                                {DIFFICULTIES[d].label}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
           </GlassCard>
           <button onClick={spinWheel} disabled={players.length < 2} className="h-24 w-full rounded-3xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-white font-bold text-3xl flex items-center justify-center gap-4" style={{ backgroundColor: activeTheme.primaryColor }}>
             <Play className="w-10 h-10 fill-white" /> Start Spel
           </button>
        </div>
      </div>
    </div>
  );

  const renderWheel = () => (
    <div className="flex flex-col items-center justify-center h-full relative z-10 p-8">
      <h2 className="text-6xl font-bold mb-4 text-white drop-shadow-xl animate-float">Beurt {turnCount} van {MAX_ROUNDS}</h2>
      <SpinningWheel players={players} targetPlayer={targetWheelPlayer} onFinished={handleWheelFinished} isSpinning={isSpinning} colors={activeTheme.wheelColors} />
      {!isSpinning && !targetWheelPlayer && (
         <button onClick={spinWheel} className="mt-12 px-12 py-5 text-white rounded-full text-2xl font-bold shadow-lg animate-pulse" style={{ backgroundColor: activeTheme.primaryColor }}>
           Draai aan het wiel!
         </button>
      )}
    </div>
  );

  const renderGameplay = () => {
    const isActive = phase === GamePhase.ROUND_ACTIVE;
    return (
      <div className="h-full flex flex-col relative z-10">
        {winnerNotification && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-900 border-4 border-white/20 p-16 rounded-[3rem] text-center animate-in zoom-in">
                    <Star className="w-32 h-32 text-yellow-400 fill-yellow-400 mx-auto mb-6 animate-spin-slow" />
                    <h2 className="text-4xl text-white/80 font-bold uppercase mb-4">Goed Gedaan!</h2>
                    <div className="text-6xl font-black text-white tracking-tight">Geraden door<br/><span className="text-yellow-400">{winnerNotification.guesserName}</span></div>
                </div>
            </div>
        )}
        <div className="h-24 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-12">
            <div className="flex gap-4">
              {[...players].sort((a,b) => b.score - a.score).slice(0, 3).map((p, i) => (
                 <div key={p.id} className="flex items-center gap-2 bg-black/20 px-4 py-1 rounded-full border border-white/5">
                    <Medal className={`w-4 h-4 ${i===0?'text-yellow-400':i===1?'text-gray-300':'text-orange-400'}`} />
                    <span className="font-bold">{p.name} ({p.score})</span>
                 </div>
              ))}
            </div>
            <div className="flex items-center gap-6">
                <div className="text-white/60 font-bold uppercase tracking-widest text-sm">Beurt {turnCount}/{MAX_ROUNDS}</div>
                {isActive && <div className="bg-white text-slate-900 px-6 py-2 rounded-full font-black text-2xl tabular-nums shadow-lg">{timeLeft}s</div>}
            </div>
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
             <div className="text-center mb-12">
                <div className="text-white/50 font-bold uppercase tracking-widest mb-2">Aan de beurt:</div>
                <div className="text-4xl font-black text-white">{currentPlayer?.name}</div>
             </div>
             <div className="w-full max-w-2xl aspect-video bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-12">
                <div className="text-slate-400 font-bold uppercase tracking-[0.3em] mb-4">Raad het woord!</div>
                {phase === GamePhase.ROUND_INTRO ? (
                   <div className="text-center animate-pulse"><Smartphone className="w-24 h-24 text-slate-300 mx-auto mb-4" /><h2 className="text-3xl font-bold text-slate-700">{currentPlayer?.name} drukt op START...</h2></div>
                ) : (
                   <div className="text-center"><h1 className="text-9xl font-black text-slate-200 tracking-tighter">???</h1><p className="text-slate-500 font-bold mt-4">Luister goed naar de hints!</p></div>
                )}
             </div>
          </div>
          <div className="w-[400px] bg-black/20 border-l border-white/10 flex flex-col p-6">
             <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2"><span>💬</span> Live Gokken</h3>
             <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 pr-2 custom-scrollbar">
                {guesses.map((g, i) => (
                    <div key={g.id} className={`p-4 rounded-2xl rounded-tl-sm shadow-lg animate-in slide-in-from-right ${i === 0 ? 'bg-white text-slate-900' : 'bg-white/80 text-slate-700 scale-95 opacity-80'}`}>
                        <div className="text-xs font-bold opacity-60 mb-1">{g.playerName}</div>
                        <div className="text-2xl font-bold">{g.text}</div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="flex flex-col items-center justify-center h-full relative z-10 p-8">
        <GlassCard className="p-16 text-center max-w-2xl w-full border-t-8" style={{borderColor: activeTheme.primaryColor}}>
          <Trophy className="w-32 h-32 mx-auto mb-8 animate-bounce" style={{color: activeTheme.primaryColor}} />
          <h2 className="text-7xl font-bold mb-4 text-white">Ronde Klaar!</h2>
          <div className="flex items-center justify-center gap-4 text-2xl text-white/80 mb-12">
              <span>Score deze beurt:</span>
              <span className="bg-white px-6 py-2 rounded-xl font-black text-4xl shadow-inner" style={{color: activeTheme.primaryColor}}>{roundScore}</span>
          </div>
          <button onClick={finishTurn} className="px-12 py-5 text-white rounded-2xl text-2xl font-bold shadow-lg flex items-center gap-3 mx-auto" style={{ backgroundColor: activeTheme.secondaryColor }}>
              <SkipForward className="fill-white" /> {turnCount >= MAX_ROUNDS ? "Naar Eindstand" : "Volgende Ronde"}
          </button>
        </GlassCard>
    </div>
  );

  return (
    <div className={`h-screen w-screen bg-slate-900 text-white overflow-hidden relative`}>
       <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGradient} z-0`}></div>
       {activeTheme.backgroundImage && <div className="absolute inset-0 bg-cover bg-center z-0 opacity-60" style={{ backgroundImage: `url(${activeTheme.backgroundImage})` }} />}
       {isWinterTheme && <Snowfall />}
       {phase === GamePhase.LOBBY && renderLobby()}
       {phase === GamePhase.SPINNING && renderWheel()}
       {(phase === GamePhase.ROUND_INTRO || phase === GamePhase.ROUND_ACTIVE || phase === GamePhase.ROUND_FEEDBACK) && renderGameplay()}
       {phase === GamePhase.ROUND_SUMMARY && renderSummary()}
    </div>
  );
};