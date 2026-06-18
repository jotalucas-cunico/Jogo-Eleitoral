/**
 * JOGO ELEITORAL - Game Engine Principal
 * Motor de jogo de luta 2D para mobile
 * Coordena todos os subsistemas: renderização, input, física, IA, HUD
 */

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const FLOOR_Y = 850;
const ROUND_TIME = 99;
const ROUNDS_TO_WIN = 2;
const MAX_ROUNDS = 3;

const GameState = {
    LOADING: 'loading',
    TITLE: 'title',
    MOVES_LIST: 'moves_list',
    PRE_FIGHT: 'pre_fight',
    FIGHTING: 'fighting',
    ROUND_END: 'round_end',
    MATCH_END: 'match_end'
};

/**
 * Converte o InputManager (método-based) para o formato que o Fighter espera
 * (propriedades booleanas: LEFT, RIGHT, UP, LP, MP, HP, LK, MK, HK, BLOCK)
 */
function buildFighterInput(inputManager) {
    return {
        LEFT:  inputManager.isPressed('LEFT'),
        RIGHT: inputManager.isPressed('RIGHT'),
        UP:    inputManager.justPressed('JUMP'),
        LP:    inputManager.justPressed('LP'),
        MP:    inputManager.justPressed('MP'),
        HP:    inputManager.justPressed('HP'),
        LK:    inputManager.justPressed('LK'),
        MK:    inputManager.justPressed('MK'),
        HK:    inputManager.justPressed('HK'),
        BLOCK: inputManager.isPressed('BLOCK'),
    };
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GameState.LOADING;

        // Subsistemas
        this.input = null;
        this.audio = null;
        this.particles = null;
        this.hud = null;
        this.ai = null;
        this.titleScreen = null;
        this.resultScreen = null;
        this.movesScreen = null;

        // Lutadores
        this.player1 = null;
        this.player2 = null;

        // Estado do jogo
        this.images = {};
        this.roundTimer = ROUND_TIME;
        this.currentRound = 1;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.stateTimer = 0;
        this.difficulty = 'normal';
        this.background = null;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;

        // Combo tracking
        this.p1ComboCount = 0;
        this.p2ComboCount = 0;
        this.p1ComboTimer = 0;
        this.p2ComboTimer = 0;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 10;

        // Transição
        this.fadeAlpha = 1.0;
        this.fadingIn = false;
        this.fadingOut = false;
        this.fadeCallback = null;

        // Touch tracking for screens
        this._lastTouchX = 0;
        this._lastTouchY = 0;
        this._touchActive = false;

        this._setupCanvas();
    }

    _setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.scaleX = this.canvas.width / GAME_WIDTH;
            this.scaleY = this.canvas.height / GAME_HEIGHT;
            this.scale = Math.min(this.scaleX, this.scaleY);
            this.offsetX = (this.canvas.width - GAME_WIDTH * this.scale) / 2;
            this.offsetY = (this.canvas.height - GAME_HEIGHT * this.scale) / 2;
        };
        window.addEventListener('resize', resize);
        resize();

        // Captura toques simples para menus
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const t = e.touches[0];
                this._lastTouchX = (t.clientX - this.offsetX) / this.scale;
                this._lastTouchY = (t.clientY - this.offsetY) / this.scale;
                this._touchActive = true;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            this._touchActive = false;
        });

        // Mouse fallback para desktop
        this.canvas.addEventListener('click', (e) => {
            this._lastTouchX = (e.clientX - this.offsetX) / this.scale;
            this._lastTouchY = (e.clientY - this.offsetY) / this.scale;
            this._touchActive = true;
            setTimeout(() => { this._touchActive = false; }, 100);
        });
    }

    async init() {
        const loadingBar = document.getElementById('loadingBar');
        const loadingText = document.getElementById('loadingText');

        loadingText.textContent = 'Carregando sprites...';
        loadingBar.style.width = '10%';

        try {
            this.images = await Utils.loadAllImages({
                lula_idle: 'assets/lula_idle.png',
                lula_idle2: 'assets/lula_idle2.png',
                lula_attack: 'assets/lula_attack.png',
                lula_ultra: 'assets/lula_ultra.png',
                lula_profile: 'assets/lula_profile.png',
                flavio_idle: 'assets/flavio_idle.png',
                flavio_idle2: 'assets/flavio_idle2.png',
                flavio_attack: 'assets/flavio_attack.png',
                flavio_ultra: 'assets/flavio_ultra.png',
                flavio_profile: 'assets/flavio_profile.png',
                soccer_field: 'assets/soccer_field.png',
                cenario2: 'assets/cenario2.png',
                lago: 'assets/lago.png',
                abertura: 'assets/abertura.png',
                cenario_congresso: 'assets/cenario_congresso.jpg'
            });
        } catch (e) {
            console.warn('Algumas imagens não carregaram:', e);
        }

        loadingBar.style.width = '40%';
        loadingText.textContent = 'Inicializando motor...';

        // Inicializa subsistemas
        this.input = new InputManager(this.canvas, this.scale, this.offsetX, this.offsetY);
        this.audio = new AudioManager();
        this.particles = new ParticleSystem();
        this.hud = new HUD();
        this.ai = new AIController(this.difficulty);

        loadingBar.style.width = '60%';
        loadingText.textContent = 'Criando lutadores...';

        this._createFighters();

        loadingBar.style.width = '80%';
        loadingText.textContent = 'Preparando telas...';

        // Cria telas (passando null como manager - não usamos ScreenManager aqui)
        this.titleScreen = new TitleScreen(null, this.images.abertura);
        this.resultScreen = new ResultScreen(null);
        this.movesScreen = new MovesListScreen(null);

        this.background = this.images.soccer_field || null;

        loadingBar.style.width = '100%';
        loadingText.textContent = 'Pronto!';

        await new Promise(resolve => setTimeout(resolve, 500));
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 800));
        loadingScreen.style.display = 'none';

        this.state = GameState.TITLE;
        this.fadeAlpha = 0;

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _createFighters() {
        this.player1 = new Fighter({
            isPlayerOne: true,
            x: 500,
            y: FLOOR_Y,
            images: {
                idle: this.images.lula_idle,
                idle2: this.images.lula_idle2,
                attack: this.images.lula_attack,
                ultra: this.images.lula_ultra,
                profile: this.images.lula_profile
            },
            name: 'LULA'
        });

        this.player2 = new Fighter({
            isPlayerOne: false,
            x: 1400,
            y: FLOOR_Y,
            images: {
                idle: this.images.flavio_idle,
                idle2: this.images.flavio_idle2,
                attack: this.images.flavio_attack,
                ultra: this.images.flavio_ultra,
                profile: this.images.flavio_profile
            },
            name: 'FLÁVIO'
        });
    }

    _gameLoop(timestamp) {
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.fpsCounter++;
        this.fpsTimer += this.deltaTime;
        if (this.fpsTimer >= 1.0) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }

        this._update(this.deltaTime);
        this._render();

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _update(dt) {
        this._updateFade(dt);

        if (this.shakeIntensity > 0) {
            this.shakeIntensity -= this.shakeDecay * dt;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }

        switch (this.state) {
            case GameState.TITLE:
                this._updateTitle(dt);
                break;
            case GameState.MOVES_LIST:
                this._updateMovesList(dt);
                break;
            case GameState.PRE_FIGHT:
                this._updatePreFight(dt);
                break;
            case GameState.FIGHTING:
                this._updateFight(dt);
                break;
            case GameState.ROUND_END:
                this._updateRoundEnd(dt);
                break;
            case GameState.MATCH_END:
                this._updateMatchEnd(dt);
                break;
        }

        if (this.input) this.input.update();
        this._touchActive = false; // Consume touch
    }

    _updateTitle(dt) {
        if (this.titleScreen) {
            this.titleScreen.update(dt);

            // Verifica toque
            if (this._touchActive) {
                const x = this._lastTouchX;
                const y = this._lastTouchY;

                // Botão "LISTA DE GOLPES" (centro: 960, 780, tamanho: 300x55)
                if (x >= 810 && x <= 1110 && y >= 752 && y <= 808) {
                    this.audio.init();
                    this.audio.playMenuSelect();
                    this.movesScreen.enter();
                    this.state = GameState.MOVES_LIST;
                    return;
                }

                // Qualquer outro toque = iniciar jogo
                this.audio.init();
                this.audio.playMenuSelect();
                this._startNewMatch();
                this._fadeToState(GameState.PRE_FIGHT);
            }
        }
    }

    _updateMovesList(dt) {
        if (this.movesScreen) {
            this.movesScreen.update(dt);

            // Verifica toque no botão "VOLTAR" (centro: 960, 1010, tamanho: 250x55)
            if (this._touchActive) {
                const x = this._lastTouchX;
                const y = this._lastTouchY;

                if (x >= 835 && x <= 1085 && y >= 982 && y <= 1038) {
                    this.audio.playMenuSelect();
                    this.state = GameState.TITLE;
                    this.titleScreen.enter();
                }
            }
        }
    }

    _updatePreFight(dt) {
        this.stateTimer += dt;

        if (this.stateTimer < 1.5) {
            this.hud.showAnnouncement('ROUND ' + this.currentRound, 1.2, '#FFD700');
        } else if (this.stateTimer < 2.5) {
            if (this.stateTimer - dt < 1.5) {
                this.hud.showAnnouncement('LUTA!', 0.8, '#FF4444');
                this.audio.playRoundStart();
            }
        } else {
            this.state = GameState.FIGHTING;
            this.stateTimer = 0;
        }

        this.particles.update(dt);
        this.hud.update(dt, this.player1, this.player2, this.roundTimer, this.currentRound, null);
    }

    _updateFight(dt) {
        // Timer
        this.roundTimer -= dt;
        if (this.roundTimer <= 0) {
            this.roundTimer = 0;
            this._endRound();
            return;
        }

        // Cria input adaptado para P1
        const p1Input = buildFighterInput(this.input);

        // Obtém input da IA para P2
        const aiState = this.ai.update(dt, this.player2, this.player1);
        // Converte AIInputState para o formato do Fighter
        const p2Input = {
            LEFT:    aiState.isPressed('left'),
            RIGHT:   aiState.isPressed('right'),
            UP:      aiState.justPressed('up'),
            LP:      aiState.justPressed('lp'),
            MP:      aiState.justPressed('mp'),
            HP:      aiState.justPressed('hp'),
            LK:      aiState.justPressed('lk'),
            MK:      aiState.justPressed('mk'),
            HK:      aiState.justPressed('hk'),
            BLOCK:   aiState.isPressed('block'),
            SPECIAL: aiState.justPressed('special'),
        };

        // Atualiza lutadores
        this.player1.update(dt, p1Input, this.player2, FLOOR_Y, GAME_WIDTH);
        this.player2.update(dt, p2Input, this.player1, FLOOR_Y, GAME_WIDTH);

        // Verifica colisões de ataque
        this._checkCombat();

        // Atualiza combos
        this._updateCombos(dt);

        // Atualiza partículas
        this.particles.update(dt);

        // Atualiza HUD
        this.hud.update(dt, this.player1, this.player2, this.roundTimer, this.currentRound, null);

        // Verifica KO
        if (this.player1.hp <= 0 || this.player2.hp <= 0) {
            this._endRound();
        }
    }

    _checkCombat() {
        // P1 ataca P2
        if (this._isFighterAttacking(this.player1) && this.player1.canHit !== false) {
            if (this.player1.checkHit(this.player2)) {
                const pushDir = this.player1.facingRight ? 1 : -1;
                const blocked = this.player2.state === FighterState.BLOCKING;

                if (blocked) {
                    this.player2.takeDamage(0, pushDir, this.particles);
                    this.particles.emitBlock(this.player2.x, this.player2.y - 128);
                    this.audio.playBlock();
                    this.p1ComboCount = 0;
                } else {
                    this.player2.takeDamage(this.player1.currentDamage, pushDir, this.particles);
                    this.particles.emitHit(this.player2.x, this.player2.y - 128);
                    this.audio.playHit();
                    this.shakeIntensity = this.player1.currentDamage * 0.5;

                    this.p1ComboCount++;
                    this.p1ComboTimer = 1.5;
                    this.hud.setCombo(1, this.p1ComboCount);

                    if (this.player1.state === FighterState.SPECIAL_ATTACK) {
                        this.particles.emitSpecial(this.player2.x, this.player2.y - 128);
                        this.audio.playSpecial();
                        this.shakeIntensity = 15;
                    }
                }
                this.player1.canHit = false;
            }
        }

        // P2 ataca P1
        if (this._isFighterAttacking(this.player2) && this.player2.canHit !== false) {
            if (this.player2.checkHit(this.player1)) {
                const pushDir = this.player2.facingRight ? 1 : -1;
                const blocked = this.player1.state === FighterState.BLOCKING;

                if (blocked) {
                    this.player1.takeDamage(0, pushDir, this.particles);
                    this.particles.emitBlock(this.player1.x, this.player1.y - 128);
                    this.audio.playBlock();
                    this.p2ComboCount = 0;
                } else {
                    this.player1.takeDamage(this.player2.currentDamage, pushDir, this.particles);
                    this.particles.emitHit(this.player1.x, this.player1.y - 128);
                    this.audio.playHit();
                    this.shakeIntensity = this.player2.currentDamage * 0.5;

                    this.p2ComboCount++;
                    this.p2ComboTimer = 1.5;
                    this.hud.setCombo(2, this.p2ComboCount);

                    if (this.player2.state === FighterState.SPECIAL_ATTACK) {
                        this.particles.emitSpecial(this.player1.x, this.player1.y - 128);
                        this.audio.playSpecial();
                        this.shakeIntensity = 15;
                    }
                }
                this.player2.canHit = false;
            }
        }
    }

    /** Verifica se o lutador está em um estado de ataque ativo */
    _isFighterAttacking(fighter) {
        return fighter.state === FighterState.ATTACK ||
               fighter.state === FighterState.AIR_ATTACK ||
               fighter.state === FighterState.SPECIAL_ATTACK;
    }

    _updateCombos(dt) {
        if (this.p1ComboTimer > 0) {
            this.p1ComboTimer -= dt;
            if (this.p1ComboTimer <= 0) {
                this.p1ComboCount = 0;
                this.hud.setCombo(1, 0);
            }
        }
        if (this.p2ComboTimer > 0) {
            this.p2ComboTimer -= dt;
            if (this.p2ComboTimer <= 0) {
                this.p2ComboCount = 0;
                this.hud.setCombo(2, 0);
            }
        }
    }

    _endRound() {
        this.state = GameState.ROUND_END;
        this.stateTimer = 0;

        let winner = null;
        if (this.player1.hp <= 0 && this.player2.hp > 0) {
            winner = 2;
            this.p2Wins++;
            this.player1.state = FighterState.KO;
        } else if (this.player2.hp <= 0 && this.player1.hp > 0) {
            winner = 1;
            this.p1Wins++;
            this.player2.state = FighterState.KO;
        } else if (this.roundTimer <= 0) {
            if (this.player1.hp > this.player2.hp) {
                winner = 1;
                this.p1Wins++;
                this.player2.state = FighterState.KO;
            } else if (this.player2.hp > this.player1.hp) {
                winner = 2;
                this.p2Wins++;
                this.player1.state = FighterState.KO;
            } else {
                this.player1.state = FighterState.KO;
                this.player2.state = FighterState.KO;
            }
        } else {
            this.player1.state = FighterState.KO;
            this.player2.state = FighterState.KO;
        }

        if (winner) {
            this.audio.playKO();
            this.shakeIntensity = 20;
            const loser = winner === 1 ? this.player2 : this.player1;
            this.particles.emitKO(loser.x, loser.y - 128);
            this.hud.showAnnouncement('K.O.!', 2.0, '#FF0000');
        } else {
            this.hud.showAnnouncement('EMPATE!', 2.0, '#FFFF00');
        }
    }

    _updateRoundEnd(dt) {
        this.stateTimer += dt;
        this.particles.update(dt);
        this.hud.update(dt, this.player1, this.player2, this.roundTimer, this.currentRound, null);

        if (this.stateTimer >= 3.0) {
            if (this.p1Wins >= ROUNDS_TO_WIN || this.p2Wins >= ROUNDS_TO_WIN) {
                this.state = GameState.MATCH_END;
                this.stateTimer = 0;
                const winner = this.p1Wins >= ROUNDS_TO_WIN ? this.player1 : this.player2;
                this.hud.showAnnouncement(winner.name + ' VENCE!', 3.0, '#FFD700');
                winner.state = FighterState.VICTORY;
            } else if (this.currentRound >= MAX_ROUNDS) {
                this.state = GameState.MATCH_END;
                this.stateTimer = 0;
                if (this.p1Wins > this.p2Wins) {
                    this.hud.showAnnouncement(this.player1.name + ' VENCE!', 3.0, '#FFD700');
                    this.player1.state = FighterState.VICTORY;
                } else if (this.p2Wins > this.p1Wins) {
                    this.hud.showAnnouncement(this.player2.name + ' VENCE!', 3.0, '#FFD700');
                    this.player2.state = FighterState.VICTORY;
                } else {
                    this.hud.showAnnouncement('EMPATE!', 3.0, '#FFFF00');
                }
            } else {
                this.currentRound++;
                this._startNewRound();
                this.state = GameState.PRE_FIGHT;
                this.stateTimer = 0;
            }
        }
    }

    _updateMatchEnd(dt) {
        this.stateTimer += dt;
        this.particles.update(dt);
        this.hud.update(dt, this.player1, this.player2, this.roundTimer, this.currentRound, null);

        if (this.stateTimer >= 4.0) {
            if (this._touchActive || this.stateTimer >= 10.0) {
                this._fadeToState(GameState.TITLE);
                if (this.titleScreen) this.titleScreen.enter();
            }
        }
    }

    _startNewMatch() {
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.currentRound = 1;
        this._startNewRound();

        // Sorteia cenário (Apenas o Congresso agora)
        const backgrounds = [this.images.cenario_congresso].filter(b => b);
        if (backgrounds.length > 0) {
            this.background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        }
    }

    _startNewRound() {
        this.roundTimer = ROUND_TIME;
        this.player1.reset(500);
        this.player2.reset(1400);
        this.p1ComboCount = 0;
        this.p2ComboCount = 0;
        this.particles = new ParticleSystem();
    }

    _fadeToState(newState) {
        this.fadingOut = true;
        this.fadeAlpha = 0;
        this.fadeCallback = () => {
            this.state = newState;
            this.stateTimer = 0;
            this.fadingOut = false;
            this.fadingIn = true;
        };
    }

    _updateFade(dt) {
        if (this.fadingOut) {
            this.fadeAlpha += dt * 2;
            if (this.fadeAlpha >= 1.0) {
                this.fadeAlpha = 1.0;
                this.fadingOut = false;
                if (this.fadeCallback) {
                    this.fadeCallback();
                    this.fadeCallback = null;
                }
            }
        } else if (this.fadingIn) {
            this.fadeAlpha -= dt * 2;
            if (this.fadeAlpha <= 0) {
                this.fadeAlpha = 0;
                this.fadingIn = false;
            }
        }
    }

    _render() {
        const ctx = this.ctx;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        // Screen shake
        if (this.shakeIntensity > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
            ctx.translate(sx, sy);
        }

        switch (this.state) {
            case GameState.TITLE:
                this._renderTitle(ctx);
                break;
            case GameState.MOVES_LIST:
                this._renderMovesList(ctx);
                break;
            case GameState.PRE_FIGHT:
            case GameState.FIGHTING:
            case GameState.ROUND_END:
            case GameState.MATCH_END:
                this._renderFight(ctx);
                break;
        }

        ctx.restore();

        // Fade overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    _renderTitle(ctx) {
        if (this.titleScreen) {
            this.titleScreen.draw(ctx);
        }
    }

    _renderMovesList(ctx) {
        if (this.movesScreen) {
            this.movesScreen.draw(ctx);
        }
    }

    _renderFight(ctx) {
        // Background
        this._drawBackground(ctx);

        // Chão
        this._drawFloor(ctx);

        // Lutadores
        const fighters = [this.player1, this.player2];
        fighters.sort((a, b) => a.y - b.y);
        fighters.forEach(f => f.draw(ctx));

        // Partículas
        this.particles.draw(ctx);

        // HUD
        this.hud.draw(ctx, this.player1, this.player2);

        // Controles touch (apenas durante a luta)
        if (this.state === GameState.FIGHTING && this.input) {
            this.input.draw(ctx);
        }
    }

    _drawBackground(ctx) {
        if (this.background) {
            const bgRatio = this.background.width / this.background.height;
            const screenRatio = GAME_WIDTH / GAME_HEIGHT;

            let drawW, drawH, drawX, drawY;
            if (bgRatio > screenRatio) {
                drawH = GAME_HEIGHT;
                drawW = drawH * bgRatio;
                drawX = (GAME_WIDTH - drawW) / 2;
                drawY = 0;
            } else {
                drawW = GAME_WIDTH;
                drawH = drawW / bgRatio;
                drawX = 0;
                drawY = (GAME_HEIGHT - drawH) / 2;
            }

            ctx.drawImage(this.background, drawX, drawY, drawW, drawH);
        } else {
            const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
            grad.addColorStop(0, '#1a1a3e');
            grad.addColorStop(0.5, '#2d1b4e');
            grad.addColorStop(1, '#0d0d2b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    }

    _drawFloor(ctx) {
        const grad = ctx.createLinearGradient(0, FLOOR_Y, 0, GAME_HEIGHT);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.1, 'rgba(0,0,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);
    }
}
