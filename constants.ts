import { ThemeId, Difficulty } from "./types";

export const CARD_DURATION_SEC = 20;
export const TOTAL_CARDS_PER_TURN = 3;
export const CHANNEL_NAME = 'hints_online_v1';
export const MAX_ROUNDS = 5;

// --- AUDIO ASSETS (Royalty Free from Pixabay/Mixkit CDNs) ---
export const AUDIO_ASSETS = {
  // Only SFX kept as requested
  SFX: {
    SPIN_TICK: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_75681c2062.mp3?filename=click-button-140881.mp3",
    START_ROUND: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=notification-sound-7062.mp3",
    CORRECT: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3",
    WIN_ROUND: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=success-fanfare-trumpets-6185.mp3",
    TIME_UP: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative-beeps-6008.mp3",
    CLICK: "https://cdn.pixabay.com/download/audio/2023/04/27/audio_f551717255.mp3?filename=ui-click-43196.mp3"
  }
};

// --- CONFIGURATIONS ---

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  icon: string;
  bgGradient: string; // Tailwind gradient class
  backgroundImage?: string; // Optional custom background image URL
  primaryColor: string; // Hex for wheel/buttons
  secondaryColor: string; // Hex for wheel/accents
  textColor: string;
  wheelColors: string[];
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  standard: {
    id: 'standard',
    label: 'Standaard',
    icon: '🎲',
    bgGradient: 'from-slate-900 to-indigo-950',
    primaryColor: '#6366f1', // Indigo 500
    secondaryColor: '#a855f7', // Purple 500
    textColor: 'text-white',
    wheelColors: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b']
  },
  christmas: {
    id: 'christmas',
    label: 'Kerst',
    icon: '🎄',
    bgGradient: 'from-[#0f3028] via-[#1a4036] to-[#0f3028]', // Dark Green matching the image
    backgroundImage: 'https://image2url.com/images/1765394417063-ae561b25-f2d0-4d5b-a864-8e4e69aa63b6.png', // Placeholder illustration
    primaryColor: '#D42426', // Classic Santa Red
    secondaryColor: '#F0B85E', // Gold/Yellow from lights
    textColor: 'text-white',
    wheelColors: ['#D42426', '#1a4036', '#F0B85E', '#ffffff', '#2A9D8F', '#E63946']
  },
  summer: {
    id: 'summer',
    label: 'Zomer',
    icon: '☀️',
    bgGradient: 'from-orange-400 via-rose-400 to-yellow-300',
    primaryColor: '#f97316', // Orange
    secondaryColor: '#0ea5e9', // Sky blue
    textColor: 'text-white',
    wheelColors: ['#f97316', '#eab308', '#0ea5e9', '#ec4899', '#84cc16', '#f43f5e']
  },
  winter: {
    id: 'winter',
    label: 'Winter',
    icon: '❄️',
    bgGradient: 'from-slate-900 via-cyan-900 to-slate-800',
    primaryColor: '#06b6d4', // Cyan
    secondaryColor: '#f8fafc', // Slate 50
    textColor: 'text-cyan-50',
    wheelColors: ['#06b6d4', '#3b82f6', '#94a3b8', '#e2e8f0', '#64748b', '#0e7490']
  },
  autumn: {
    id: 'autumn',
    label: 'Herfst',
    icon: '🍂',
    bgGradient: 'from-orange-900 via-amber-800 to-stone-900',
    primaryColor: '#d97706', // Amber
    secondaryColor: '#78350f', // Brown
    textColor: 'text-orange-50',
    wheelColors: ['#d97706', '#92400e', '#b45309', '#65a30d', '#dc2626', '#78350f']
  }
};

export const DIFFICULTIES: Record<Difficulty, { label: string; description: string }> = {
  easy: { label: 'Makkelijk', description: 'Simpele woorden, kinderen.' },
  medium: { label: 'Gemiddeld', description: 'Standaard hints spel.' },
  hard: { label: 'Moeilijk', description: 'Abstracte concepten en moeilijke woorden.' }
};