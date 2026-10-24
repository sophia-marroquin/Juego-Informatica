/* Web Audio API Sound Engine for Horror Game */

class HorrorAudioEngine {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;
        
        // Ambient Drone Nodes
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientGain = null;
        this.ambientFilter = null;
        
        // Heartbeat timer
        this.lastHeartbeatTime = 0;
        this.heartbeatInterval = 1.2; // seconds
        
        // Audio Settings
        this.masterVolume = 0.8;

        // Entity whistles: distance-attenuated and stereo-positioned
        this.whistleBus = null;
        this.whistleNextAt = 0;
        this.whistleWasFar = true;
        this.whistlePan = 0;
    }

    init() {
        if (this.isInitialized) return;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isInitialized = true;
        this.startAmbient();

        // Dedicated bus so whistle phrases can be shaped without touching the ambience.
        try {
            this.whistleBus = this.ctx.createGain();
            this.whistleBus.gain.setValueAtTime(0.9, this.ctx.currentTime);
            this.whistleBus.connect(this.ctx.destination);
            this.whistleNextAt = this.ctx.currentTime + 2.5;
        } catch (e) {
            this.whistleBus = null;
        }
    }

    startAmbient() {
        if (!this.isInitialized) return;

        try {
            // Low drone 1
            this.ambientOsc1 = this.ctx.createOscillator();
            this.ambientOsc2 = this.ctx.createOscillator();
            
            this.ambientOsc1.type = 'sawtooth';
            this.ambientOsc2.type = 'sine';
            
            this.ambientOsc1.frequency.setValueAtTime(45, this.ctx.currentTime); // Low F#
            this.ambientOsc2.frequency.setValueAtTime(45.5, this.ctx.currentTime); // Slight detune
            
            // Filter
            this.ambientFilter = this.ctx.createBiquadFilter();
            this.ambientFilter.type = 'lowpass';
            this.ambientFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
            
            // Gain
            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            
            this.ambientOsc1.connect(this.ambientFilter);
            this.ambientOsc2.connect(this.ambientFilter);
            this.ambientFilter.connect(this.ambientGain);
            this.ambientGain.connect(this.ctx.destination);
            
            this.ambientOsc1.start();
            this.ambientOsc2.start();

            // Subtle LFO modulation on filter cutoff for ominous breathing effect
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // Very slow 0.1Hz
            lfoGain.gain.setValueAtTime(60, this.ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(this.ambientFilter.frequency);
            lfo.start();
        } catch(e) {
            console.warn('Ambient audio init error:', e);
        }
    }

    playHeartbeat(intensity = 0.5) {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        
        // Double pulse "lub-dub"
        this.triggerHeartPulse(now, 60, 0.6 * intensity);
        this.triggerHeartPulse(now + 0.15, 50, 0.4 * intensity);
    }

    triggerHeartPulse(time, freq, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.18);

        gain.gain.setValueAtTime(vol * this.masterVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    updateMonsterProximity(distance, maxDistance = 20) {
        if (!this.isInitialized) return;

        if (distance < maxDistance) {
            // Calculate heartbeat tempo based on proximity
            const norm = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
            this.heartbeatInterval = 1.2 - (norm * 0.85); // 1.2s down to 0.35s
            
            const now = this.ctx.currentTime;
            if (now - this.lastHeartbeatTime > this.heartbeatInterval) {
                this.playHeartbeat(0.3 + norm * 0.7);
                this.lastHeartbeatTime = now;
            }

            // Slightly raise ambient filter intensity when monster is close
            if (this.ambientFilter) {
                this.ambientFilter.frequency.setTargetAtTime(180 + norm * 250, now, 0.2);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Entity whistles                                                    */
    /* ------------------------------------------------------------------ */
    resetWhistles() {
        if (!this.isInitialized) return;
        this.whistleNextAt = this.ctx.currentTime + 2.0;
        this.whistleWasFar = true;
        this.whistlePan = 0;
    }

    // Called every frame with the horizontal distance and the stereo pan (-1..1).
    // Farther entity -> quieter, duller and more echoey whistle; closer -> louder and clearer.
    updateWhistles(distance, pan = 0) {
        if (!this.isInitialized || !this.whistleBus) return;

        const now = this.ctx.currentTime;
        this.whistlePan = Math.max(-1, Math.min(1, pan));

        if (distance > 58) {
            this.whistleWasFar = true;
            return;
        }

        // When it enters hearing range, don't make the player wait for a whole far-away cycle.
        if (this.whistleWasFar) {
            this.whistleWasFar = false;
            this.whistleNextAt = now + 1.0;
        }

        if (now < this.whistleNextAt) return;

        const closeness = 1 - Math.min(1, distance / 58); // 0 = far, 1 = on top of you
        const volume = 0.028 + Math.pow(closeness, 2.2) * 0.5;
        const cutoff = 1100 + closeness * 3000;
        const delay = 3.0 + (1 - closeness) * 5.2 + Math.random() * 2.2;

        this.whistleNextAt = now + delay;
        this.playWhistlePhrase(volume, this.whistlePan, cutoff, closeness);
    }

    playWhistlePhrase(volume, pan, cutoff, closeness) {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let panner = null;
        if (ctx.createStereoPanner) {
            panner = ctx.createStereoPanner();
            panner.pan.setValueAtTime(pan, now);
            panner.connect(this.whistleBus);
        }
        const output = panner || this.whistleBus;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, now);
        filter.Q.setValueAtTime(0.8, now);

        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.1);
        envelope.gain.setValueAtTime(Math.max(0.001, volume), now + 1.35);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        filter.connect(envelope);
        envelope.connect(output);

        // Distance echo: more noticeable the farther away the entity is.
        if (closeness < 0.85) {
            const echo = ctx.createDelay(1.0);
            echo.delayTime.setValueAtTime(0.16 + (1 - closeness) * 0.3, now);
            const feedback = ctx.createGain();
            feedback.gain.setValueAtTime(0.16, now);
            const wet = ctx.createGain();
            wet.gain.setValueAtTime(0.28 * (1 - closeness), now);
            envelope.connect(echo);
            echo.connect(feedback);
            feedback.connect(echo);
            echo.connect(wet);
            wet.connect(output);
        }

        // Three descending, slightly sliding notes.
        const motif = [
            { f: 1174.66, t: 0.00, d: 0.42 },
            { f: 987.77, t: 0.46, d: 0.46 },
            { f: 880.00, t: 0.98, d: 0.62 }
        ];

        for (const note of motif) {
            const t = now + note.t;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f * 1.015, t);
            osc.frequency.exponentialRampToValueAtTime(note.f, t + 0.1);

            const noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(0.0001, t);
            noteGain.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);

            // Tiny vibrato makes it feel like a human whistle rather than a synth beep.
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(5.2 + Math.random() * 1.5, t);
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(6, t);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(t);
            lfo.stop(t + note.d + 0.05);

            osc.connect(noteGain);
            noteGain.connect(filter);
            osc.start(t);
            osc.stop(t + note.d + 0.06);
        }

        // A whisper of breath noise under the phrase.
        const breathLength = Math.floor(ctx.sampleRate * 0.55);
        const buffer = ctx.createBuffer(1, breathLength, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < breathLength; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / breathLength, 2);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.setValueAtTime(1900, now);
        band.Q.setValueAtTime(1.2, now);
        const breathGain = ctx.createGain();
        breathGain.gain.setValueAtTime(0.045, now);
        noise.connect(band);
        band.connect(breathGain);
        breathGain.connect(filter);
        noise.start(now);
    }

    playFootstep(isSprinting = false) {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        // Filtered white noise for footstep impact
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isSprinting ? 400 : 250, now);
        filter.Q.setValueAtTime(2, now);

        const gain = this.ctx.createGain();
        const vol = (isSprinting ? 0.35 : 0.18) * this.masterVolume;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start(now);
    }

    playFlashlightClick() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    playNoteSound() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.16 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    playMapSound() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        [392.00, 523.25, 659.25].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.0001, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.18 * this.masterVolume, now + i * 0.09 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.9);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.09);
            osc.stop(now + i * 0.09 + 0.95);
        });
    }

    playMapOpenSound() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.6);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        filter.Q.setValueAtTime(1.2, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    playPickupSound() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        
        // Eerie mystical 2-tone chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.25 * this.masterVolume, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.8);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.85);
        });
    }

    playMonsterGrowl() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);

        gain.gain.setValueAtTime(0.35 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
    }

    playJumpscare() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;

        // 1. Screech synth
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.linearRampToValueAtTime(1400, now + 0.1);
        osc1.frequency.exponentialRampToValueAtTime(200, now + 1.2);

        osc2.frequency.setValueAtTime(850, now);
        osc2.frequency.linearRampToValueAtTime(1450, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(150, now + 1.2);

        gain.gain.setValueAtTime(0.9 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);

        // 2. Heavy White Noise Burst
        const bufferSize = this.ctx.sampleRate * 1.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
    }

    playVictory() {
        if (!this.isInitialized) return;

        const now = this.ctx.currentTime;
        [261.63, 329.63, 392.00, 523.25].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 2.5);
        });
    }
}

window.horrorAudio = new HorrorAudioEngine();
