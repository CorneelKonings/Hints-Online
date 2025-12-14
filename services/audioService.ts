import { AUDIO_ASSETS } from "../constants";

class AudioService {
    private bgmAudio: HTMLAudioElement | null = null;
    private isMuted: boolean = false;

    private playSound(url: string, volume: number = 0.5) {
        if (this.isMuted) return;
        // Fire and forget sound effect
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(e => console.warn("Audio play blocked", e));
    }

    // --- Background Music ---
    
    playBGM(url: string, volume: number = 0.3) {
        // Stop current if playing
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }

        this.bgmAudio = new Audio(url);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = this.isMuted ? 0 : volume;
        
        // We need a user interaction first usually, but we call this after Host click
        this.bgmAudio.play().catch(e => {
            console.warn("Autoplay BGM blocked until interaction", e);
        });
    }

    setMute(muted: boolean) {
        this.isMuted = muted;
        if (this.bgmAudio) {
            this.bgmAudio.muted = muted;
        }
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }
    }

    // --- SFX Only ---
    playClick() { this.playSound(AUDIO_ASSETS.SFX.CLICK, 0.3); }
    playSpinTick() { this.playSound(AUDIO_ASSETS.SFX.SPIN_TICK, 0.2); }
    playStartRound() { this.playSound(AUDIO_ASSETS.SFX.START_ROUND, 0.6); }
    playCorrect() { this.playSound(AUDIO_ASSETS.SFX.CORRECT, 0.6); }
    playWin() { this.playSound(AUDIO_ASSETS.SFX.WIN_ROUND, 0.6); }
    playTimeUp() { this.playSound(AUDIO_ASSETS.SFX.TIME_UP, 0.5); }
    playTimeTick() { this.playSound(AUDIO_ASSETS.SFX.SPIN_TICK, 0.2); }
}

export const audio = new AudioService();