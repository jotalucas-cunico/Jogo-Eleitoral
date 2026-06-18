/**
 * ============================================================================
 *  JOGO ELEITORAL - Sistema de Áudio Procedural
 * ============================================================================
 *  Gera todos os efeitos sonoros usando Web Audio API (osciladores + ruído).
 *  Nenhum arquivo de áudio externo é necessário.
 * ============================================================================
 */

class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;

        /** Nó de ganho mestre — controla volume global */
        this.masterGain = null;

        /** Volume mestre (0.0 – 1.0) */
        this._volume = 0.5;

        /** Indica se o contexto já foi inicializado */
        this.initialized = false;
    }

    /* ------------------------------------------------------------------
     *  Inicialização (chamar no primeiro toque / clique do usuário)
     * ------------------------------------------------------------------ */

    /** Cria o AudioContext e o nó de ganho mestre. */
    init() {
        if (this.initialized) return;

        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();

            // Nó mestre de volume
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this._volume;
            this.masterGain.connect(this.ctx.destination);

            this.initialized = true;
            console.log('[AudioManager] Inicializado com sucesso.');
        } catch (e) {
            console.warn('[AudioManager] Web Audio API indisponível:', e);
        }
    }

    /**
     * Retoma o contexto caso esteja suspenso (política de autoplay).
     * Deve ser chamado em eventos de interação do usuário.
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /* ------------------------------------------------------------------
     *  Volume mestre
     * ------------------------------------------------------------------ */

    /** Define o volume mestre (0.0 – 1.0). */
    set volume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        if (this.masterGain) {
            this.masterGain.gain.value = this._volume;
        }
    }

    /** Retorna o volume mestre atual. */
    get volume() {
        return this._volume;
    }

    /* ------------------------------------------------------------------
     *  Utilitários internos
     * ------------------------------------------------------------------ */

    /** Verifica se o sistema está pronto para tocar. */
    _ready() {
        if (!this.initialized || !this.ctx) return false;
        this.resume();
        return true;
    }

    /**
     * Cria um buffer de ruído branco com a duração informada (segundos).
     * @param {number} duration
     * @returns {AudioBufferSourceNode}
     */
    _createNoise(duration) {
        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    /**
     * Cria um oscilador simples.
     * @param {OscillatorType} type  - 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} freq          - frequência em Hz
     * @returns {OscillatorNode}
     */
    _createOsc(type, freq) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        return osc;
    }

    /* ------------------------------------------------------------------
     *  Efeitos sonoros
     * ------------------------------------------------------------------ */

    /**
     * Som de impacto / soco conectando.
     * Burst de ruído curto + frequência baixa.
     */
    playHit() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        // --- Ruído curto (impacto) ---
        const noise = this._createNoise(0.08);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(noiseGain).connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.08);

        // --- Tom baixo (peso) ---
        const osc = this._createOsc('sine', 80);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(oscGain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Som de bloqueio — estalo metálico agudo e curto.
     */
    playBlock() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        const osc = this._createOsc('square', 1200);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.06);

        // Leve ruído metálico
        const noise = this._createNoise(0.04);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.25, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        // Filtro passa-alta para timbre metálico
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3000;

        noise.connect(hp).connect(nGain).connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.04);
    }

    /**
     * Som de carga de energia especial — frequência subindo.
     */
    playSpecial() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        // Oscilador principal — varredura ascendente
        const osc = this._createOsc('sawtooth', 200);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);

        // Camada de harmônicos
        const osc2 = this._createOsc('sine', 400);
        osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.3);

        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.01, now);
        g2.gain.linearRampToValueAtTime(0.2, now + 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc2.connect(g2).connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.35);
    }

    /**
     * Som de K.O. — boom dramático grave.
     */
    playKO() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        // Impacto grave pesado
        const osc = this._createOsc('sine', 60);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.6);

        // Camada de ruído (explosão)
        const noise = this._createNoise(0.4);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.5, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;

        noise.connect(lp).connect(nGain).connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.4);

        // Sub-harmônico extra
        const sub = this._createOsc('triangle', 40);
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.6, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        sub.connect(sGain).connect(this.masterGain);
        sub.start(now);
        sub.stop(now + 0.8);
    }

    /**
     * Beep curto de seleção de menu.
     */
    playMenuSelect() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        const osc = this._createOsc('sine', 880);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Som de gongo / sino no início do round.
     */
    playRoundStart() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        // "Sino" — triângulo com decaimento longo
        const osc = this._createOsc('triangle', 600);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 1.0);

        // Harmônico superior
        const osc2 = this._createOsc('sine', 1200);
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.25, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc2.connect(g2).connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.7);

        // Sub-tom de ressonância
        const osc3 = this._createOsc('sine', 300);
        const g3 = this.ctx.createGain();
        g3.gain.setValueAtTime(0.2, now);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc3.connect(g3).connect(this.masterGain);
        osc3.start(now);
        osc3.stop(now + 1.2);
    }

    /**
     * Som de pulo — whoosh rápido (ruído filtrado com sweep).
     */
    playJump() {
        if (!this._ready()) return;
        const now = this.ctx.currentTime;

        // Ruído com filtro passa-banda varrendo para cima
        const noise = this._createNoise(0.15);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(500, now);
        bp.frequency.exponentialRampToValueAtTime(4000, now + 0.12);
        bp.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(bp).connect(gain).connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.15);
    }
}
