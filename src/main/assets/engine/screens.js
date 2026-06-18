/**
 * ============================================================================
 *  JOGO ELEITORAL - Gerenciador de Telas
 * ============================================================================
 *  Controla as telas do jogo: Título, Seleção de Personagem (stub),
 *  Luta, Resultado e Lista de Golpes.
 *  Resolução virtual: 1920×1080.
 * ============================================================================
 */

/* ==========================================================================
 *  Enumeração de telas
 * ========================================================================== */

const Screens = Object.freeze({
    TITLE:            'title',
    CHARACTER_SELECT: 'character_select',
    FIGHT:            'fight',
    RESULT:           'result',
    MOVES_LIST:       'moves_list',
});

/* ==========================================================================
 *  ScreenManager — Orquestrador de telas
 * ========================================================================== */

class ScreenManager {
    constructor() {
        /** Tela ativa atual */
        this.currentScreen = Screens.TITLE;

        /** Referências para cada tela */
        this.screens = {
            [Screens.TITLE]:       new TitleScreen(this),
            [Screens.RESULT]:      new ResultScreen(this),
            [Screens.MOVES_LIST]:  new MovesListScreen(this),
        };

        // --- Transição (fade) ---
        /** Progresso do fade (0 = transparente, 1 = totalmente preto) */
        this.fadeAlpha = 0;
        /** Direção do fade: +1 = escurecendo, -1 = clareando, 0 = sem fade */
        this.fadeDirection = 0;
        /** Velocidade do fade (alpha/s) */
        this.fadeSpeed = 2.5;
        /** Tela de destino durante transição */
        this._pendingScreen = null;
        /** Dados passados na transição */
        this._pendingData = null;

        /** Callback chamado quando a tela FIGHT deve iniciar */
        this.onStartFight = null;
    }

    /* ------------------------------------------------------------------
     *  Transição entre telas
     * ------------------------------------------------------------------ */

    /**
     * Inicia uma transição suave para outra tela.
     * @param {string} screenName - Uma das constantes de Screens
     * @param {object} [data]     - Dados opcionais para a tela de destino
     */
    goTo(screenName, data = null) {
        if (this.fadeDirection !== 0) return; // Já em transição

        this._pendingScreen = screenName;
        this._pendingData   = data;
        this.fadeDirection   = 1; // Começa a escurecer
    }

    /* ------------------------------------------------------------------
     *  Atualização e renderização
     * ------------------------------------------------------------------ */

    /**
     * Atualiza a tela ativa e o sistema de transição.
     * @param {number} dt - Delta time em segundos
     */
    update(dt) {
        // Atualiza fade
        if (this.fadeDirection !== 0) {
            this.fadeAlpha += this.fadeDirection * this.fadeSpeed * dt;

            // Fade-out completo → trocar tela
            if (this.fadeAlpha >= 1) {
                this.fadeAlpha = 1;
                this._switchScreen();
                this.fadeDirection = -1; // Começa a clarear
            }

            // Fade-in completo → fim da transição
            if (this.fadeAlpha <= 0) {
                this.fadeAlpha = 0;
                this.fadeDirection = 0;
            }
        }

        // Atualiza a tela ativa (se não for FIGHT, que tem loop próprio)
        const screen = this.screens[this.currentScreen];
        if (screen && screen.update) {
            screen.update(dt);
        }
    }

    /**
     * Desenha a tela ativa e overlay de transição.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Desenha a tela ativa
        const screen = this.screens[this.currentScreen];
        if (screen && screen.draw) {
            screen.draw(ctx);
        }

        // Overlay de transição (fade preto)
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
            ctx.fillRect(0, 0, 1920, 1080);
        }
    }

    /**
     * Propaga evento de toque para a tela ativa.
     * @param {number} x - Coordenada X no espaço virtual (0–1920)
     * @param {number} y - Coordenada Y no espaço virtual (0–1080)
     */
    handleTouch(x, y) {
        if (this.fadeDirection !== 0) return; // Bloqueia durante transição

        const screen = this.screens[this.currentScreen];
        if (screen && screen.handleTouch) {
            screen.handleTouch(x, y);
        }
    }

    /**
     * Efetua a troca de tela interna.
     * @private
     */
    _switchScreen() {
        this.currentScreen = this._pendingScreen;

        // Inicializa a nova tela se necessário
        const screen = this.screens[this.currentScreen];
        if (screen && screen.enter) {
            screen.enter(this._pendingData);
        }

        // Se for FIGHT, notifica o callback externo
        if (this.currentScreen === Screens.FIGHT && this.onStartFight) {
            this.onStartFight(this._pendingData);
        }

        this._pendingScreen = null;
        this._pendingData   = null;
    }
}


/* ==========================================================================
 *  TitleScreen — Tela de Título
 * ========================================================================== */

class TitleScreen {
    /**
     * @param {ScreenManager} manager
     * @param {HTMLImageElement} [backgroundImage]
     */
    constructor(manager, backgroundImage = null) {
        this.manager = manager;
        this.backgroundImage = backgroundImage;

        /** Timer interno para animações */
        this.time = 0;

        /** Fase do gradiente animado */
        this.gradientPhase = 0;
    }

    /** Chamado ao entrar na tela. */
    enter(data) {
        this.time = 0;
    }

    /** Chamado ao sair da tela. */
    exit() {}

    /**
     * Atualiza animações da tela.
     * @param {number} dt Delta time em segundos
     */
    update(dt) {
        this.time += dt;
        this.gradientPhase += dt * 0.3;
    }

    /**
     * Renderiza a tela de título.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // --- Fundo ---
        this._drawBackground(ctx);

        // --- Título principal ---
        this._drawTitle(ctx);

        // --- Subtítulo ---
        ctx.font = 'bold 42px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#CCCCCC';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText('LUTA POLÍTICA', 960, 440);
        ctx.fillText('LUTA POLÍTICA', 960, 440);

        // --- "TOQUE PARA INICIAR" piscando ---
        const blink = Math.sin(this.time * 3) > 0;
        if (blink) {
            ctx.font = 'bold 36px "Arial Black", Impact, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText('TOQUE PARA INICIAR', 960, 650);
            ctx.fillText('TOQUE PARA INICIAR', 960, 650);
        }

        // --- Botão "LISTA DE GOLPES" ---
        this._drawButton(ctx, 960, 780, 'LISTA DE GOLPES', 300, 55);

        // --- Créditos / versão ---
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('v1.0 — Jogo Eleitoral', 960, 1050);
    }

    /**
     * Processa toque na tela de título.
     * @param {number} x
     * @param {number} y
     */
    handleTouch(x, y) {
        // Verifica se tocou no botão "LISTA DE GOLPES"
        if (this._hitButton(x, y, 960, 780, 300, 55)) {
            this.manager.goTo(Screens.MOVES_LIST);
            return;
        }

        // Qualquer outro toque → iniciar luta
        this.manager.goTo(Screens.FIGHT);
    }

    /* --- Métodos internos de desenho --- */

    /**
     * Desenha o fundo.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawBackground(ctx) {
        if (this.backgroundImage) {
            // Desenha a imagem preenchendo a tela (1920x1080)
            ctx.drawImage(this.backgroundImage, 0, 0, 1920, 1080);
        } else {
            // Gradiente radial dinâmico
            const cx = 960 + Math.sin(this.gradientPhase) * 100;
            const cy = 540 + Math.cos(this.gradientPhase * 0.7) * 80;

            const grad = ctx.createRadialGradient(cx, cy, 100, cx, cy, 1200);
            grad.addColorStop(0, '#1a1a3e');
            grad.addColorStop(0.5, '#0d0d2b');
            grad.addColorStop(1, '#000000');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Linhas decorativas horizontais
            ctx.strokeStyle = 'rgba(255,215,0,0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 1080; i += 40) {
                const offset = Math.sin(this.time + i * 0.01) * 20;
                ctx.beginPath();
                ctx.moveTo(0, i + offset);
                ctx.lineTo(1920, i - offset);
                ctx.stroke();
            }
        }
    }

    /**
     * Desenha o título estilizado com glow e sombra.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawTitle(ctx) {
        const title = 'JOGO ELEITORAL';
        const cx = 960;
        const cy = 340;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 40;

        // Texto principal grande
        ctx.font = 'bold 120px "Arial Black", Impact, sans-serif';

        // Contorno
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.strokeText(title, cx, cy);

        // Gradiente de preenchimento (dourado)
        const textGrad = ctx.createLinearGradient(cx - 500, cy - 50, cx + 500, cy + 50);
        textGrad.addColorStop(0, '#FFD700');
        textGrad.addColorStop(0.3, '#FFEE88');
        textGrad.addColorStop(0.5, '#FFFFFF');
        textGrad.addColorStop(0.7, '#FFEE88');
        textGrad.addColorStop(1, '#FFD700');

        ctx.fillStyle = textGrad;
        ctx.fillText(title, cx, cy);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    /**
     * Desenha um botão retangular estilizado.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx - Centro X
     * @param {number} cy - Centro Y
     * @param {string} text
     * @param {number} w - Largura
     * @param {number} h - Altura
     */
    _drawButton(ctx, cx, cy, text, w, h) {
        const x = cx - w / 2;
        const y = cy - h / 2;

        // Fundo do botão
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#444466');
        grad.addColorStop(1, '#222244');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();

        // Borda
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texto
        ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(text, cx, cy);
    }

    /**
     * Testa se um ponto (x,y) está dentro de um botão.
     * @param {number} px - Ponto X
     * @param {number} py - Ponto Y
     * @param {number} cx - Centro X do botão
     * @param {number} cy - Centro Y do botão
     * @param {number} w  - Largura
     * @param {number} h  - Altura
     * @returns {boolean}
     */
    _hitButton(px, py, cx, cy, w, h) {
        return px >= cx - w / 2 && px <= cx + w / 2 &&
               py >= cy - h / 2 && py <= cy + h / 2;
    }
}


/* ==========================================================================
 *  ResultScreen — Tela de Resultado
 * ========================================================================== */

class ResultScreen {
    /**
     * @param {ScreenManager} manager
     */
    constructor(manager) {
        this.manager = manager;

        /** Nome do vencedor */
        this.winnerName = '';
        /** Estatísticas da partida */
        this.stats = {
            damageDealt: 0,
            combos: 0,
            roundTime: 0,
        };
        /** Timer para animações de entrada */
        this.time = 0;
    }

    /**
     * Chamado ao entrar na tela de resultado.
     * @param {object} data - { winner, stats }
     */
    enter(data) {
        this.time = 0;
        if (data) {
            this.winnerName = data.winner || 'JOGADOR';
            this.stats = data.stats || { damageDealt: 0, combos: 0, roundTime: 0 };
        }
    }

    /** @param {number} dt */
    update(dt) {
        this.time += dt;
    }

    /**
     * Renderiza a tela de resultado.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // --- Fundo escuro com gradiente ---
        const grad = ctx.createRadialGradient(960, 400, 50, 960, 540, 900);
        grad.addColorStop(0, '#1a0a2e');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);

        // --- Efeito de raios atrás do "retrato" ---
        this._drawRays(ctx, 960, 350);

        // --- Retrato do vencedor (placeholder geométrico) ---
        this._drawWinnerPortrait(ctx, 960, 350);

        // --- Texto "VITÓRIA" ---
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 30;

        ctx.font = 'bold 90px "Arial Black", Impact, sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeText('VITÓRIA', 960, 580);

        const tGrad = ctx.createLinearGradient(660, 580, 1260, 580);
        tGrad.addColorStop(0, '#FFD700');
        tGrad.addColorStop(0.5, '#FFFFCC');
        tGrad.addColorStop(1, '#FFD700');
        ctx.fillStyle = tGrad;
        ctx.fillText('VITÓRIA', 960, 580);

        ctx.shadowBlur = 0;
        ctx.restore();

        // --- Nome do vencedor ---
        ctx.font = 'bold 54px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.winnerName, 960, 660);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.winnerName, 960, 660);

        // --- Estatísticas ---
        this._drawStats(ctx);

        // --- Botões ---
        this._drawButton(ctx, 700, 920, 'JOGAR NOVAMENTE', 340, 60);
        this._drawButton(ctx, 1220, 920, 'MENU PRINCIPAL', 340, 60);
    }

    /**
     * Processa toque na tela de resultado.
     * @param {number} x
     * @param {number} y
     */
    handleTouch(x, y) {
        // "JOGAR NOVAMENTE"
        if (this._hitButton(x, y, 700, 920, 340, 60)) {
            this.manager.goTo(Screens.FIGHT);
            return;
        }

        // "MENU PRINCIPAL"
        if (this._hitButton(x, y, 1220, 920, 340, 60)) {
            this.manager.goTo(Screens.TITLE);
            return;
        }
    }

    /* --- Métodos internos --- */

    /**
     * Desenha raios luminosos saindo de um ponto.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx
     * @param {number} cy
     */
    _drawRays(ctx, cx, cy) {
        const numRays = 16;
        const maxLen  = 400;

        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#FFD700';

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2 + this.time * 0.2;
            const spread = Math.PI / numRays * 0.4;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(angle - spread) * maxLen,
                cy + Math.sin(angle - spread) * maxLen
            );
            ctx.lineTo(
                cx + Math.cos(angle + spread) * maxLen,
                cy + Math.sin(angle + spread) * maxLen
            );
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Desenha um retrato placeholder grande do vencedor.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx
     * @param {number} cy
     */
    _drawWinnerPortrait(ctx, cx, cy) {
        const size = 200;

        // Moldura circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Fundo do retrato
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#333355';
        ctx.fill();

        // Inicial do nome como placeholder
        ctx.font = 'bold 100px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(this.winnerName.charAt(0), cx, cy);

        ctx.restore();
    }

    /**
     * Desenha as estatísticas da partida.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawStats(ctx) {
        const startY = 740;
        const lineH  = 38;

        ctx.font = 'bold 26px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const stats = [
            { label: 'DANO CAUSADO', value: this.stats.damageDealt.toString() },
            { label: 'COMBOS', value: this.stats.combos.toString() },
            { label: 'TEMPO DE ROUND', value: this.stats.roundTime.toFixed(1) + 's' },
        ];

        stats.forEach((s, i) => {
            const y = startY + i * lineH;

            ctx.fillStyle = '#888888';
            ctx.textAlign = 'right';
            ctx.fillText(s.label + ':', 920, y);

            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(s.value, 950, y);
        });
    }

    /** Desenha um botão (mesmo estilo do TitleScreen). */
    _drawButton(ctx, cx, cy, text, w, h) {
        const x = cx - w / 2;
        const y = cy - h / 2;

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#444466');
        grad.addColorStop(1, '#222244');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 26px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(text, cx, cy);
    }

    /** Testa hit em botão. */
    _hitButton(px, py, cx, cy, w, h) {
        return px >= cx - w / 2 && px <= cx + w / 2 &&
               py >= cy - h / 2 && py <= cy + h / 2;
    }
}


/* ==========================================================================
 *  MovesListScreen — Lista de Golpes
 * ========================================================================== */

class MovesListScreen {
    /**
     * @param {ScreenManager} manager
     */
    constructor(manager) {
        this.manager = manager;

        /** Offset de scroll vertical (para tela com muitos itens) */
        this.scrollY = 0;
        /** Velocidade de scroll */
        this.scrollVelocity = 0;
        /** Timer de animação */
        this.time = 0;
        /** Posição Y do último toque (para arrastar) */
        this._lastTouchY = null;

        /** Tabela de golpes */
        this.moves = [
            { name: 'Soco Fraco',    input: 'LP',             damage: 2,  cooldown: '—' },
            { name: 'Soco Médio',    input: 'MP',             damage: 6,  cooldown: '—' },
            { name: 'Soco Forte',    input: 'HP',             damage: 9,  cooldown: '1.5s' },
            { name: 'Chute Fraco',   input: 'LK',             damage: 3,  cooldown: '—' },
            { name: 'Chute Médio',   input: 'MK',             damage: 5,  cooldown: '—' },
            { name: 'Chute Forte',   input: 'HK',             damage: 9,  cooldown: '1.5s' },
            { name: 'Especial',      input: '← → + HP',       damage: 14, cooldown: '4.0s' },
            { name: 'Defesa',        input: 'BLOCK',           damage: 0,  cooldown: '—' },
            { name: 'Esquiva',       input: 'BLOCK + ←',       damage: 0,  cooldown: '—',   note: 'Invencível 0.5s' },
            { name: 'Ataque Aéreo',  input: 'Qualquer no ar',  damage: 5,  cooldown: '—' },
        ];
    }

    /** Chamado ao entrar na tela. */
    enter() {
        this.scrollY = 0;
        this.scrollVelocity = 0;
        this.time = 0;
    }

    /** @param {number} dt */
    update(dt) {
        this.time += dt;

        // Inércia do scroll
        this.scrollY += this.scrollVelocity * dt;
        this.scrollVelocity *= 0.92; // Fricção

        // Limites do scroll
        const maxScroll = Math.max(0, this.moves.length * 80 - 600);
        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScroll));
    }

    /**
     * Renderiza a lista de golpes.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // --- Fundo ---
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 1920, 1080);

        // --- Título da tela ---
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;

        ctx.font = 'bold 64px "Arial Black", Impact, sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeText('LISTA DE GOLPES', 960, 70);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('LISTA DE GOLPES', 960, 70);

        ctx.shadowBlur = 0;
        ctx.restore();

        // --- Cabeçalho da tabela ---
        const tableX = 260;
        const tableW = 1400;
        const headerY = 150;
        const rowHeight = 70;

        this._drawTableHeader(ctx, tableX, headerY, tableW);

        // --- Linhas da tabela ---
        ctx.save();

        // Área clippável para scroll
        ctx.beginPath();
        ctx.rect(tableX - 10, headerY + 50, tableW + 20, 750);
        ctx.clip();

        for (let i = 0; i < this.moves.length; i++) {
            const y = headerY + 60 + i * rowHeight - this.scrollY;

            // Não renderizar fora da área visível
            if (y < headerY + 30 || y > 950) continue;

            this._drawMoveRow(ctx, tableX, y, tableW, rowHeight - 10, this.moves[i], i);
        }

        ctx.restore();

        // --- Botão VOLTAR ---
        this._drawButton(ctx, 960, 1010, 'VOLTAR', 250, 55);

        // --- Indicador de scroll ---
        if (this.moves.length * rowHeight > 750) {
            this._drawScrollIndicator(ctx, tableX + tableW + 20, headerY + 60, 750);
        }
    }

    /**
     * Processa toque na tela de golpes.
     * @param {number} x
     * @param {number} y
     */
    handleTouch(x, y) {
        // Botão VOLTAR
        if (this._hitButton(x, y, 960, 1010, 250, 55)) {
            this.manager.goTo(Screens.TITLE);
            return;
        }

        // Scroll simples via toque (movimenta scroll para baixo)
        if (y > 150 && y < 950) {
            this.scrollY += 80;
        }
    }

    /* --- Métodos internos --- */

    /**
     * Desenha o cabeçalho da tabela.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     */
    _drawTableHeader(ctx, x, y, w) {
        // Fundo do cabeçalho
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.fillRect(x, y, w, 45);

        // Linha inferior
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 45);
        ctx.lineTo(x + w, y + 45);
        ctx.stroke();

        // Textos do cabeçalho
        ctx.font = 'bold 22px "Arial Black", Impact, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';

        const cy = y + 22;

        ctx.textAlign = 'left';
        ctx.fillText('GOLPE', x + 20, cy);

        ctx.textAlign = 'center';
        ctx.fillText('COMANDO', x + 550, cy);
        ctx.fillText('DANO', x + 850, cy);
        ctx.fillText('COOLDOWN', x + 1050, cy);
        ctx.fillText('NOTA', x + 1280, cy);
    }

    /**
     * Desenha uma linha da tabela de golpes.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {object} move
     * @param {number} index
     */
    _drawMoveRow(ctx, x, y, w, h, move, index) {
        // Fundo alternado
        ctx.fillStyle = index % 2 === 0
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(255,255,255,0.07)';
        ctx.fillRect(x, y, w, h);

        // Borda inferior sutil
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();

        const cy = y + h / 2;

        // Nome do golpe
        ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(move.name, x + 20, cy);

        // Comando (input)
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00CCFF';
        ctx.fillText(move.input, x + 550, cy);

        // Dano
        ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
        ctx.fillStyle = move.damage > 0 ? '#FF6644' : '#666666';
        ctx.fillText(move.damage.toString(), x + 850, cy);

        // Cooldown
        ctx.font = '22px Arial, sans-serif';
        ctx.fillStyle = move.cooldown !== '—' ? '#FFCC00' : '#444444';
        ctx.fillText(move.cooldown, x + 1050, cy);

        // Nota especial
        if (move.note) {
            ctx.font = 'italic 18px Arial, sans-serif';
            ctx.fillStyle = '#88FF88';
            ctx.fillText(move.note, x + 1280, cy);
        }
    }

    /**
     * Desenha indicador visual de scroll.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} h
     */
    _drawScrollIndicator(ctx, x, y, h) {
        const maxScroll = Math.max(1, this.moves.length * 70 - 600);
        const ratio = this.scrollY / maxScroll;
        const thumbH = Math.max(40, h * (600 / (this.moves.length * 70)));
        const thumbY = y + ratio * (h - thumbH);

        // Trilho
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 6, h);

        // Thumb
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillRect(x, thumbY, 6, thumbH);
    }

    /** Desenha um botão. */
    _drawButton(ctx, cx, cy, text, w, h) {
        const x = cx - w / 2;
        const y = cy - h / 2;

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#444466');
        grad.addColorStop(1, '#222244');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 26px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(text, cx, cy);
    }

    /** Testa hit em botão. */
    _hitButton(px, py, cx, cy, w, h) {
        return px >= cx - w / 2 && px <= cx + w / 2 &&
               py >= cy - h / 2 && py <= cy + h / 2;
    }
}
