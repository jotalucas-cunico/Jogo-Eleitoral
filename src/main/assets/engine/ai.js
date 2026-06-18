/**
 * ============================================================================
 *  JOGO ELEITORAL - Controlador de IA
 * ============================================================================
 *  Controla o oponente de IA simulando entradas de botão virtual.
 *  Três níveis de dificuldade: 'easy', 'normal', 'hard'.
 *  Produz um objeto compatível com InputState para o Fighter consumir.
 * ============================================================================
 */

class AIController {
    /**
     * @param {'easy'|'normal'|'hard'} difficulty - Nível de dificuldade
     */
    constructor(difficulty = 'normal') {
        /** Nível de dificuldade atual */
        this.difficulty = difficulty;

        // --- Parâmetros por dificuldade ---
        /** Intervalo (segundos) entre decisões da IA */
        this.reactionTime = 0.5;
        /** Probabilidade de atacar quando em alcance (0-1) */
        this.aggressiveness = 0.5;
        /** Probabilidade de bloquear ataques recebidos (0-1) */
        this.blockChance = 0.3;
        /** Probabilidade de usar golpe especial quando disponível (0-1) */
        this.specialChance = 0.15;

        this._applyDifficulty(difficulty);

        // --- Estado interno ---
        /** Timer acumulado até a próxima decisão */
        this.decisionTimer = 0;

        /**
         * Conjunto de botões "pressionados" neste frame.
         * Usa IDs que correspondem aos botões virtuais do jogo:
         *   'left', 'right', 'up' (pulo),
         *   'lp' (soco fraco), 'mp' (soco médio), 'hp' (soco forte),
         *   'lk' (chute fraco), 'mk' (chute médio), 'hk' (chute forte),
         *   'block', 'special'
         * @type {Set<string>}
         */
        this._pressed = new Set();

        /**
         * Botões que acabaram de ser pressionados neste ciclo de decisão
         * (equivalente a "justPressed").
         * @type {Set<string>}
         */
        this._justPressed = new Set();

        /** Direção horizontal desejada: -1 (esquerda), 0, +1 (direita) */
        this._direction = 0;

        /** Flag interna: IA está bloqueando ativamente */
        this._blocking = false;

        /** Referência para a ação escolhida aguardando execução */
        this._pendingAction = null;

        /** Duração restante da ação pendente (segundos) */
        this._actionDuration = 0;
    }

    /* ------------------------------------------------------------------
     *  Configuração de dificuldade
     * ------------------------------------------------------------------ */

    /**
     * Aplica os valores de dificuldade pré-definidos.
     * @param {'easy'|'normal'|'hard'} diff
     */
    _applyDifficulty(diff) {
        switch (diff) {
            case 'easy':
                this.reactionTime   = 1.0;
                this.aggressiveness = 0.3;
                this.blockChance    = 0.1;
                this.specialChance  = 0.05;
                break;
            case 'hard':
                this.reactionTime   = 0.2;
                this.aggressiveness = 0.7;
                this.blockChance    = 0.5;
                this.specialChance  = 0.25;
                break;
            case 'normal':
            default:
                this.reactionTime   = 0.5;
                this.aggressiveness = 0.5;
                this.blockChance    = 0.3;
                this.specialChance  = 0.15;
                break;
        }
    }

    /* ------------------------------------------------------------------
     *  Loop principal
     * ------------------------------------------------------------------ */

    /**
     * Atualiza a IA e decide as ações.
     *
     * @param {number} dt       - Delta time em segundos
     * @param {object} fighter  - O lutador controlado pela IA
     *   Espera: { x, y, hp, isOnGround, isAttacking, state, specialCooldown }
     * @param {object} opponent - O lutador adversário
     *   Espera: { x, y, hp, isAttacking, state }
     * @param {object} [_input] - Parâmetro reservado (não usado pela IA)
     * @returns {AIInputState} Objeto InputState-like para o Fighter consumir
     */
    update(dt, fighter, opponent, _input) {
        // Limpa entradas do frame anterior
        this._justPressed.clear();
        this._pressed.clear();
        this._direction = 0;

        // Se há ação pendente em execução, continua até acabar
        if (this._actionDuration > 0) {
            this._actionDuration -= dt;
            this._executePendingAction(fighter, opponent);
            return this._buildInputState();
        }

        // Acumula timer de reação
        this.decisionTimer += dt;

        if (this.decisionTimer >= this.reactionTime) {
            this.decisionTimer = 0;
            this._makeDecision(fighter, opponent);
        }

        // Executa ação pendente (recém-decidida ou continuada)
        this._executePendingAction(fighter, opponent);

        return this._buildInputState();
    }

    /* ------------------------------------------------------------------
     *  Tomada de decisão
     * ------------------------------------------------------------------ */

    /**
     * Analisa o estado da luta e escolhe a próxima ação.
     * @param {object} fighter
     * @param {object} opponent
     */
    _makeDecision(fighter, opponent) {
        const dx = opponent.x - fighter.x;
        const distance = Math.abs(dx);

        // --- Defesa reativa: bloquear se o oponente está atacando ---
        if (opponent.isAttacking && Math.random() < this.blockChance) {
            this._pendingAction = 'block';
            this._actionDuration = 0.3 + Math.random() * 0.2;

            // No modo difícil, tentar esquiva ao invés de bloqueio simples
            if (this.difficulty === 'hard' && Math.random() < 0.35) {
                this._pendingAction = 'dodge';
                this._actionDuration = 0.15;
            }
            return;
        }

        // --- Distância longa (> 350px): aproximar ---
        if (distance > 350) {
            this._pendingAction = 'approach';
            this._actionDuration = this.reactionTime * 0.8;

            // Chance de pular enquanto se aproxima
            if (Math.random() < 0.12) {
                this._pendingAction = 'jumpApproach';
                this._actionDuration = 0.4;
            }
            return;
        }

        // --- Distância média (200–350px): mistura de ações ---
        if (distance > 200) {
            const roll = Math.random();

            if (roll < this.aggressiveness * 0.5) {
                // Ataque médio/forte (maior alcance)
                this._pendingAction = Math.random() < 0.5 ? 'mp' : 'mk';
                this._actionDuration = 0.15;
            } else if (roll < this.aggressiveness) {
                // Aproximar para atacar
                this._pendingAction = 'approach';
                this._actionDuration = this.reactionTime * 0.5;
            } else {
                // Esperar / recuar levemente
                this._pendingAction = Math.random() < 0.3 ? 'retreat' : 'idle';
                this._actionDuration = 0.2;
            }

            // Chance de golpe especial
            if (Math.random() < this.specialChance && this._canUseSpecial(fighter)) {
                this._pendingAction = 'special';
                this._actionDuration = 0.2;
            }
            return;
        }

        // --- Distância curta (< 200px): combate corpo-a-corpo ---
        const roll = Math.random();

        if (roll < this.aggressiveness) {
            // Escolher ataque variado
            this._pendingAction = this._pickCloseAttack();
            this._actionDuration = 0.1 + Math.random() * 0.08;
        } else if (roll < this.aggressiveness + 0.15) {
            // Recuar para reposicionar
            this._pendingAction = 'retreat';
            this._actionDuration = 0.2;
        } else {
            // Bloquear preventivamente
            this._pendingAction = 'block';
            this._actionDuration = 0.2 + Math.random() * 0.15;
        }

        // Chance de golpe especial em curta distância (maior chance)
        if (Math.random() < this.specialChance * 1.5 && this._canUseSpecial(fighter)) {
            this._pendingAction = 'special';
            this._actionDuration = 0.2;
        }

        // Chance de pular e atacar no ar
        if (Math.random() < 0.08) {
            this._pendingAction = 'jumpAttack';
            this._actionDuration = 0.5;
        }
    }

    /**
     * Escolhe aleatoriamente um ataque corpo-a-corpo variado.
     * @returns {string}
     */
    _pickCloseAttack() {
        const attacks = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
        // Ataques leves são mais comuns (combos)
        const weights = [0.25, 0.2, 0.1, 0.2, 0.15, 0.1];
        let r = Math.random();
        for (let i = 0; i < attacks.length; i++) {
            r -= weights[i];
            if (r <= 0) return attacks[i];
        }
        return 'lp';
    }

    /**
     * Verifica se o golpe especial está disponível.
     * @param {object} fighter
     * @returns {boolean}
     */
    _canUseSpecial(fighter) {
        // Verifica se o cooldown do especial já passou
        return (fighter.specialCooldown === undefined || fighter.specialCooldown <= 0);
    }

    /* ------------------------------------------------------------------
     *  Execução de ações
     * ------------------------------------------------------------------ */

    /**
     * Traduz a ação pendente em entradas de botão virtual.
     * @param {object} fighter
     * @param {object} opponent
     */
    _executePendingAction(fighter, opponent) {
        if (!this._pendingAction) return;

        // Direção para o oponente
        const toOpponent = opponent.x > fighter.x ? 1 : -1;

        switch (this._pendingAction) {
            // --- Movimentação ---
            case 'approach':
                this._direction = toOpponent;
                this._pressed.add(toOpponent > 0 ? 'right' : 'left');
                break;

            case 'retreat':
                this._direction = -toOpponent;
                this._pressed.add(toOpponent > 0 ? 'left' : 'right');
                break;

            case 'idle':
                // Ficar parado
                break;

            // --- Pulo ---
            case 'jumpApproach':
                this._direction = toOpponent;
                this._pressed.add(toOpponent > 0 ? 'right' : 'left');
                this._pressed.add('up');
                this._justPressed.add('up');
                break;

            case 'jumpAttack':
                this._direction = toOpponent;
                this._pressed.add(toOpponent > 0 ? 'right' : 'left');
                this._pressed.add('up');
                this._justPressed.add('up');
                // Ataque aéreo — pressiona soco médio no ar
                this._pressed.add('mp');
                this._justPressed.add('mp');
                break;

            // --- Ataques ---
            case 'lp':
                this._pressed.add('lp');
                this._justPressed.add('lp');
                break;

            case 'mp':
                this._pressed.add('mp');
                this._justPressed.add('mp');
                break;

            case 'hp':
                this._pressed.add('hp');
                this._justPressed.add('hp');
                break;

            case 'lk':
                this._pressed.add('lk');
                this._justPressed.add('lk');
                break;

            case 'mk':
                this._pressed.add('mk');
                this._justPressed.add('mk');
                break;

            case 'hk':
                this._pressed.add('hk');
                this._justPressed.add('hk');
                break;

            // --- Especial ---
            case 'special':
                this._pressed.add('special');
                this._justPressed.add('special');
                // Simula o comando direcional do especial (← → + HP)
                this._pressed.add('hp');
                this._justPressed.add('hp');
                break;

            // --- Defesa ---
            case 'block':
                this._pressed.add('block');
                break;

            case 'dodge':
                this._pressed.add('block');
                this._justPressed.add('block');
                // Esquiva: block + direção oposta ao oponente
                this._pressed.add(toOpponent > 0 ? 'left' : 'right');
                break;
        }
    }

    /* ------------------------------------------------------------------
     *  Interface InputState (para o Fighter consumir)
     * ------------------------------------------------------------------ */

    /**
     * Constrói um objeto InputState-like com os métodos esperados pelo Fighter.
     * @returns {AIInputState}
     */
    _buildInputState() {
        // Copia os conjuntos para o snapshot
        const pressed     = new Set(this._pressed);
        const justPressed = new Set(this._justPressed);
        const direction   = this._direction;

        return new AIInputState(pressed, justPressed, direction);
    }
}


/**
 * ==========================================================================
 *  AIInputState — Objeto de entrada compatível com o sistema de InputState
 * ==========================================================================
 *  O Fighter chama isPressed(id), justPressed(id) e getDirection()
 *  sem saber se a entrada vem de um jogador humano ou da IA.
 */
class AIInputState {
    /**
     * @param {Set<string>} pressed     - Botões pressionados continuamente
     * @param {Set<string>} justPressed - Botões recém-pressionados neste frame
     * @param {number} direction        - Direção horizontal: -1, 0 ou +1
     */
    constructor(pressed, justPressed, direction) {
        this._pressed     = pressed;
        this._justPressed = justPressed;
        this._direction   = direction;
    }

    /**
     * Retorna true se o botão está sendo mantido pressionado.
     * @param {string} id
     * @returns {boolean}
     */
    isPressed(id) {
        return this._pressed.has(id);
    }

    /**
     * Retorna true se o botão foi pressionado neste frame (transição).
     * @param {string} id
     * @returns {boolean}
     */
    justPressed(id) {
        return this._justPressed.has(id);
    }

    /**
     * Retorna a direção horizontal desejada.
     * @returns {number} -1 (esquerda), 0 (neutro), +1 (direita)
     */
    getDirection() {
        return this._direction;
    }
}
