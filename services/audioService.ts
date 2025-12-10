
import { AUDIO_ASSETS } from "../constants";

class AudioService {
    private playSound(url: string, volume: number = 0.5) {
        // Fire and forget sound effect
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(e => console.warn("Audio play blocked", e));
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
