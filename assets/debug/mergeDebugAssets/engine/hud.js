/**
 * ============================================================================
 *  JOGO ELEITORAL - HUD (Heads-Up Display)
 * ============================================================================
 *  Renderiza barras de vida, timer, indicadores de round, combo counter,
 *  barra de especial e anúncios centrais no canvas.
 *  Resolução virtual: 1920×1080.
 * ============================================================================
 */

class HUD {
    constructor() {
        // --- Dimensões das barras de vida ---
        /** Largura de cada barra de vida em pixels virtuais */
        this.barWidth  = 700;
        /** Altura de cada barra de vida */
        this.barHeight = 40;
        /** Margem lateral */
        this.barMarginX = 60;
        /** Margem superior */
        this.barMarginY = 30;

        // --- Estado dos jogadores (atualizado via update) ---
        /** HP exibido do P1 (suavizado via lerp) */
        this.p1DisplayHP = 100;
        /** HP exibido do P2 (suavizado via lerp) */
        this.p2DisplayHP = 100;
        /** HP máximo (padrão) */
        this.maxHP = 100;

        /** Nome do P1 */
        this.p1Name = 'LULA';
        /** Nome do P2 */
        this.p2Name = 'FLÁVIO';

        // --- Timer ---
        /** Tempo restante do round (segundos) */
        this.timer = 99;

        // --- Rounds ---
        /** Round atual (1-based) */
        this.currentRound = 1;
        /** Rounds vencidos por P1 */
        this.p1Rounds = 0;
        /** Rounds vencidos por P2 */
        this.p2Rounds = 0;
        /** Total de rounds para vitória */
        this.roundsToWin = 2;

        // --- Combo ---
        /** Combo atual do P1 */
        this.p1Combo = 0;
        /** Combo atual do P2 */
        this.p2Combo = 0;
        /** Timer de exibição do combo P1 */
        this.p1ComboTimer = 0;
        /** Timer de exibição do combo P2 */
        this.p2ComboTimer = 0;
        /** Duração de exibição do combo (segundos) */
        this.comboDuration = 2.0;

        // --- Barra de Especial ---
        /** Cooldown restante do especial P1 (0 = pronto) */
        this.p1SpecialCD = 0;
        /** Cooldown restante do especial P2 */
        this.p2SpecialCD = 0;
        /** Cooldown máximo do especial */
        this.maxSpecialCD = 4.0;

        // --- Anúncio central ---
        /** Texto do anúncio atual */
        this.announcementText = '';
        /** Cor do anúncio */
        this.announcementColor = '#FFFFFF';
        /** Timer restante do anúncio (segundos) */
        this.announcementTimer = 0;
        /** Duração total do anúncio (para calcular progresso) */
        this.announcementDuration = 0;
        /** Escala animada do anúncio (0 → 1 via easing) */
        this.announcementScale = 0;

        // --- Velocidade de interpolação da barra de vida ---
        this.hpLerpSpeed = 5.0;
    }

    /* ------------------------------------------------------------------
     *  Atualização de estado
     * ------------------------------------------------------------------ */

    /**
     * Atualiza o estado interno do HUD.
     *
     * @param {number} dt          - Delta time em segundos
     * @param {object} p1          - Dados do jogador 1
     *   Espera: { hp, maxHP, name, specialCooldown }
     * @param {object} p2          - Dados do jogador 2
     * @param {number} timer       - Tempo restante do round
     * @param {number} round       - Número do round atual
     * @param {string} [announcement] - Texto de anúncio (opcional, gerenciado via showAnnouncement)
     */
    update(dt, p1, p2, timer, round, announcement) {
        // Atualiza dados dos jogadores
        if (p1) {
            this.maxHP = p1.maxHP || 100;
            this.p1Name = p1.name || 'LULA';
            this.p1SpecialCD = p1.specialCooldown || 0;

            // Lerp suave da barra de vida P1
            const targetHP1 = Math.max(0, p1.hp);
            this.p1DisplayHP += (targetHP1 - this.p1DisplayHP) * this.hpLerpSpeed * dt;
            if (Math.abs(this.p1DisplayHP - targetHP1) < 0.1) {
                this.p1DisplayHP = targetHP1;
            }
        }

        if (p2) {
            this.p2Name = p2.name || 'FLÁVIO';
            this.p2SpecialCD = p2.specialCooldown || 0;

            // Lerp suave da barra de vida P2
            const targetHP2 = Math.max(0, p2.hp);
            this.p2DisplayHP += (targetHP2 - this.p2DisplayHP) * this.hpLerpSpeed * dt;
            if (Math.abs(this.p2DisplayHP - targetHP2) < 0.1) {
                this.p2DisplayHP = targetHP2;
            }
        }

        // Timer e round
        this.timer = timer;
        this.currentRound = round;

        // Atualiza combo timers
        if (this.p1ComboTimer > 0) {
            this.p1ComboTimer -= dt;
            if (this.p1ComboTimer <= 0) this.p1Combo = 0;
        }
        if (this.p2ComboTimer > 0) {
            this.p2ComboTimer -= dt;
            if (this.p2ComboTimer <= 0) this.p2Combo = 0;
        }

        // Atualiza anúncio
        if (this.announcementTimer > 0) {
            this.announcementTimer -= dt;

            // Easing de escala: ease-out back
            const progress = 1 - (this.announcementTimer / this.announcementDuration);
            this.announcementScale = this._easeOutBack(Math.min(progress * 3, 1.0));

            if (this.announcementTimer <= 0) {
                this.announcementText = '';
                this.announcementScale = 0;
            }
        }
    }

    /* ------------------------------------------------------------------
     *  API pública
     * ------------------------------------------------------------------ */

    /**
     * Exibe um anúncio central (ex: "ROUND 1", "FIGHT!", "K.O.!").
     * @param {string} text     - Texto a exibir
     * @param {number} duration - Duração em segundos
     * @param {string} [color]  - Cor do texto (padrão: branco)
     */
    showAnnouncement(text, duration = 2.0, color = '#FFFFFF') {
        this.announcementText     = text;
        this.announcementDuration = duration;
        this.announcementTimer    = duration;
        this.announcementColor    = color;
        this.announcementScale    = 0;
    }

    /**
     * Atualiza o combo de um jogador.
     * @param {number} playerNum - 1 ou 2
     * @param {number} count     - Número de hits no combo
     */
    setCombo(playerNum, count) {
        if (playerNum === 1) {
            this.p1Combo = count;
            this.p1ComboTimer = this.comboDuration;
        } else {
            this.p2Combo = count;
            this.p2ComboTimer = this.comboDuration;
        }
    }

    /**
     * Atualiza as vitórias de round.
     * @param {number} p1Wins
     * @param {number} p2Wins
     */
    setRoundWins(p1Wins, p2Wins) {
        this.p1Rounds = p1Wins;
        this.p2Rounds = p2Wins;
    }

    /* ------------------------------------------------------------------
     *  Renderização
     * ------------------------------------------------------------------ */

    /**
     * Desenha todos os elementos do HUD no canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} [p1] - Dados extras do P1 (opcional)
     * @param {object} [p2] - Dados extras do P2 (opcional)
     */
    draw(ctx, p1, p2) {
        ctx.save();

        this._drawHealthBar(ctx, 1);
        this._drawHealthBar(ctx, 2);
        this._drawPlayerNames(ctx);
        this._drawTimer(ctx);
        this._drawRoundIndicators(ctx);
        this._drawSpecialMeter(ctx, 1);
        this._drawSpecialMeter(ctx, 2);
        this._drawCombo(ctx, 1);
        this._drawCombo(ctx, 2);
        this._drawAnnouncement(ctx);

        ctx.restore();
    }

    /* ------------------------------------------------------------------
     *  Barra de vida
     * ------------------------------------------------------------------ */

    /**
     * Desenha a barra de vida de um jogador.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} playerNum - 1 ou 2
     */
    _drawHealthBar(ctx, playerNum) {
        const isP1 = playerNum === 1;
        const hp   = isP1 ? this.p1DisplayHP : this.p2DisplayHP;
        const ratio = Math.max(0, Math.min(1, hp / this.maxHP));

        // Posição da barra
        const x = isP1
            ? this.barMarginX
            : 1920 - this.barMarginX - this.barWidth;
        const y = this.barMarginY;

        // --- Fundo preto com borda ---
        ctx.fillStyle = '#111111';
        ctx.fillRect(x - 3, y - 3, this.barWidth + 6, this.barHeight + 6);

        // Borda
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, this.barWidth + 6, this.barHeight + 6);

        // --- Gradiente da barra (verde → amarelo → vermelho baseado em HP) ---
        const fillWidth = this.barWidth * ratio;

        if (fillWidth > 0) {
            let barX, barW;

            if (isP1) {
                // P1: preenche da direita para a esquerda (HP diminui da direita)
                barX = x + this.barWidth - fillWidth;
                barW = fillWidth;
            } else {
                // P2: preenche da esquerda para a direita
                barX = x;
                barW = fillWidth;
            }

            // Cor baseada na porcentagem de HP
            const grad = ctx.createLinearGradient(barX, y, barX + barW, y);

            if (ratio > 0.5) {
                // Verde para amarelo
                grad.addColorStop(0, '#22CC22');
                grad.addColorStop(1, '#44EE44');
            } else if (ratio > 0.25) {
                // Amarelo
                grad.addColorStop(0, '#CCAA00');
                grad.addColorStop(1, '#EEDD22');
            } else {
                // Vermelho
                grad.addColorStop(0, '#CC2222');
                grad.addColorStop(1, '#EE4444');
            }

            ctx.fillStyle = grad;
            ctx.fillRect(barX, y, barW, this.barHeight);

            // Brilho superior
            const shineGrad = ctx.createLinearGradient(barX, y, barX, y + this.barHeight);
            shineGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
            shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
            ctx.fillStyle = shineGrad;
            ctx.fillRect(barX, y, barW, this.barHeight);
        }

        // --- Texto de HP dentro da barra ---
        const hpText = Math.ceil(hp) + ' / ' + this.maxHP;
        ctx.font = 'bold 20px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = x + this.barWidth / 2;
        const textY = y + this.barHeight / 2;

        // Sombra / contorno
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(hpText, textX, textY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(hpText, textX, textY);
    }

    /* ------------------------------------------------------------------
     *  Nomes dos jogadores
     * ------------------------------------------------------------------ */

    /**
     * Desenha os nomes dos jogadores acima das barras de vida.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawPlayerNames(ctx) {
        const nameY = this.barMarginY + this.barHeight + 28;

        ctx.font = 'bold 28px "Arial Black", Impact, sans-serif';
        ctx.textBaseline = 'top';

        // P1 — alinhado à esquerda
        ctx.textAlign = 'left';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.p1Name, this.barMarginX, nameY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.p1Name, this.barMarginX, nameY);

        // P2 — alinhado à direita
        ctx.textAlign = 'right';
        ctx.strokeText(this.p2Name, 1920 - this.barMarginX, nameY);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.p2Name, 1920 - this.barMarginX, nameY);
    }

    /* ------------------------------------------------------------------
     *  Timer central
     * ------------------------------------------------------------------ */

    /**
     * Desenha o timer no centro superior da tela.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawTimer(ctx) {
        const timeStr = Math.ceil(Math.max(0, this.timer)).toString().padStart(2, '0');
        const cx = 960;
        const cy = 50;

        // Fundo decorativo
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this._roundRect(ctx, cx - 50, cy - 10, 100, 65, 8);
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        this._roundRect(ctx, cx - 50, cy - 10, 100, 65, 8);
        ctx.stroke();

        // Número
        ctx.font = 'bold 52px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Cor muda quando tempo baixo
        if (this.timer <= 10) {
            ctx.fillStyle = '#FF3333';
        } else {
            ctx.fillStyle = '#FFD700';
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(timeStr, cx, cy + 22);
        ctx.fillText(timeStr, cx, cy + 22);
    }

    /* ------------------------------------------------------------------
     *  Indicadores de round (bolinhas)
     * ------------------------------------------------------------------ */

    /**
     * Desenha os indicadores de rounds vencidos (pequenos círculos).
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawRoundIndicators(ctx) {
        const cx = 960;
        const y  = 120;
        const radius = 10;
        const spacing = 30;

        // P1 rounds (esquerda do centro)
        for (let i = 0; i < this.roundsToWin; i++) {
            const dotX = cx - 60 - i * spacing;

            ctx.beginPath();
            ctx.arc(dotX, y, radius, 0, Math.PI * 2);

            if (i < this.p1Rounds) {
                ctx.fillStyle = '#FFD700'; // Ouro = round vencido
            } else {
                ctx.fillStyle = '#333333'; // Cinza = round pendente
            }
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // P2 rounds (direita do centro)
        for (let i = 0; i < this.roundsToWin; i++) {
            const dotX = cx + 60 + i * spacing;

            ctx.beginPath();
            ctx.arc(dotX, y, radius, 0, Math.PI * 2);

            if (i < this.p2Rounds) {
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#333333';
            }
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Rótulo "ROUND X"
        ctx.font = 'bold 18px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText('ROUND ' + this.currentRound, cx, y);
    }

    /* ------------------------------------------------------------------
     *  Barra de Especial
     * ------------------------------------------------------------------ */

    /**
     * Desenha a barra de cooldown do especial abaixo da barra de vida.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} playerNum
     */
    _drawSpecialMeter(ctx, playerNum) {
        const isP1 = playerNum === 1;
        const cd   = isP1 ? this.p1SpecialCD : this.p2SpecialCD;

        // Razão de preenchimento (1 = pronto, 0 = em cooldown máximo)
        const ready = 1 - Math.min(1, Math.max(0, cd / this.maxSpecialCD));

        const meterWidth  = 200;
        const meterHeight = 10;
        const x = isP1
            ? this.barMarginX
            : 1920 - this.barMarginX - meterWidth;
        const y = this.barMarginY + this.barHeight + 8;

        // Fundo
        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, meterWidth, meterHeight);

        // Preenchimento
        const fillW = meterWidth * ready;
        if (fillW > 0) {
            const grad = ctx.createLinearGradient(x, y, x + fillW, y);
            if (ready >= 1) {
                // Pronto — brilha em azul/ciano
                grad.addColorStop(0, '#00CCFF');
                grad.addColorStop(1, '#00FFFF');
            } else {
                grad.addColorStop(0, '#0066AA');
                grad.addColorStop(1, '#0088CC');
            }
            ctx.fillStyle = grad;

            if (isP1) {
                ctx.fillRect(x, y, fillW, meterHeight);
            } else {
                ctx.fillRect(x + meterWidth - fillW, y, fillW, meterHeight);
            }
        }

        // Borda
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, meterWidth, meterHeight);

        // Rótulo
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = isP1 ? 'left' : 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = ready >= 1 ? '#00FFFF' : '#666666';
        const labelX = isP1 ? x + meterWidth + 8 : x - 8;
        ctx.fillText(ready >= 1 ? 'ESPECIAL PRONTO' : 'ESPECIAL', labelX, y - 1);
    }

    /* ------------------------------------------------------------------
     *  Combo Counter
     * ------------------------------------------------------------------ */

    /**
     * Desenha o contador de combo quando > 1 hit.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} playerNum
     */
    _drawCombo(ctx, playerNum) {
        const isP1  = playerNum === 1;
        const combo = isP1 ? this.p1Combo : this.p2Combo;
        const timer = isP1 ? this.p1ComboTimer : this.p2ComboTimer;

        if (combo <= 1 || timer <= 0) return;

        // Posição: lado do jogador
        const x = isP1 ? 200 : 1720;
        const y = 280;

        // Escala pulsante
        const pulse = 1 + Math.sin(timer * 10) * 0.05;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);

        // Número do combo
        ctx.font = 'bold 72px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeText(combo.toString(), 0, 0);

        // Cor vibrante
        ctx.fillStyle = combo >= 5 ? '#FF4400' : '#FFD700';
        ctx.fillText(combo.toString(), 0, 0);

        // Texto "HITS!"
        ctx.font = 'bold 28px "Arial Black", Impact, sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText('HITS!', 0, 45);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('HITS!', 0, 45);

        ctx.restore();
    }

    /* ------------------------------------------------------------------
     *  Anúncio central
     * ------------------------------------------------------------------ */

    /**
     * Desenha o texto de anúncio central com animação de escala.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawAnnouncement(ctx) {
        if (!this.announcementText || this.announcementTimer <= 0) return;

        const cx = 960;
        const cy = 450;
        const scale = this.announcementScale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Calcular opacidade (fade out nos últimos 0.5s)
        let alpha = 1;
        if (this.announcementTimer < 0.5) {
            alpha = this.announcementTimer / 0.5;
        }
        ctx.globalAlpha = alpha;

        // Sombra / glow
        ctx.shadowColor = this.announcementColor;
        ctx.shadowBlur = 30;

        // Texto principal
        ctx.font = 'bold 100px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Contorno grosso
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.strokeText(this.announcementText, 0, 0);

        // Preenchimento com cor
        ctx.fillStyle = this.announcementColor;
        ctx.fillText(this.announcementText, 0, 0);

        // Resetar sombra
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    /* ------------------------------------------------------------------
     *  Utilitários
     * ------------------------------------------------------------------ */

    /**
     * Ease-out com overshoot (estilo "back").
     * @param {number} t - Progresso 0–1
     * @returns {number}
     */
    _easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /**
     * Desenha um retângulo com cantos arredondados (path apenas, não preenche).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} r - Raio dos cantos
     */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
