/**
 * ============================================================================
 * JOGO ELEITORAL - Sistema de Entrada por Toque (Touch Input)
 * ============================================================================
 * Gerencia controles virtuais sobrepostos ao canvas para jogo de luta mobile:
 *   - D-Pad (ESQUERDA / DIREITA) no canto inferior esquerdo
 *   - Botão PULO acima do D-Pad
 *   - Botão BLOQUEIO ao lado do D-Pad
 *   - Grade 3x2 de ataques no lado direito:
 *       Linha 1: Soco Leve (LP), Soco Médio (MP), Soco Forte (HP)
 *       Linha 2: Chute Leve (LK), Chute Médio (MK), Chute Forte (HK)
 *
 * Resolução virtual do canvas: 1920x1080 (escalado para caber na tela)
 * ============================================================================
 */

"use strict";

class InputManager {

    /**
     * Cria o gerenciador de entrada e registra os listeners de toque.
     * @param {HTMLCanvasElement} canvas - O elemento canvas do jogo
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;

        /** Resolução virtual do jogo */
        this.VIRTUAL_W = 1920;
        this.VIRTUAL_H = 1080;

        // ------------------------------------------------------------------
        // Definição de todos os botões virtuais
        // ------------------------------------------------------------------
        this.buttons = this._criarBotoes();

        // Mapa rápido por ID para consultas O(1)
        /** @type {Object.<string, Object>} */
        this.buttonMap = {};
        for (const btn of this.buttons) {
            this.buttonMap[btn.id] = btn;
        }

        // ------------------------------------------------------------------
        // Rastreamento de toques ativos (touchId -> buttonId)
        // ------------------------------------------------------------------
        /** @type {Map<number, string>} */
        this.activeToques = new Map();

        // ------------------------------------------------------------------
        // Registrar eventos de toque no canvas
        // ------------------------------------------------------------------
        this._registrarEventos();
    }

    // ========================================================================
    // Criação do Layout dos Botões
    // ========================================================================

    /**
     * Cria e retorna o array de definições de botões com posições ergonômicas.
     * Layout projetado para celular em modo paisagem (1920x1080 virtual).
     * @returns {Array<Object>} Lista de botões
     * @private
     */
    _criarBotoes() {
        // --- Dimensões dos botões ---
        const dpadW = 140;
        const dpadH = 120;
        const jumpW = 140;
        const jumpH = 110;
        const blockW = 140;
        const blockH = 110;
        const atkW = 140;
        const atkH = 110;

        // --- Espaçamento ---
        const dpadGap = 20;       // Espaço entre botões do D-Pad
        const atkGapX = 16;       // Espaço horizontal entre botões de ataque
        const atkGapY = 16;       // Espaço vertical entre botões de ataque

        // --- Posições base ---
        // D-Pad: canto inferior esquerdo
        const dpadBaseX = 80;
        const dpadBaseY = 820;

        // Bloqueio (DEF): Levemente mais centralizado em relação à borda
        const blockX = dpadBaseX + 60;
        const blockY = dpadBaseY - blockH - 40;

        // Pulo (JUMP): Para a lateral (direita) e levemente para cima
        const jumpX = blockX + blockW + 40;
        const jumpY = blockY - 50;

        // Grade de ataque: lado direito da tela
        const atkBaseX = 1340;
        const atkBaseY = 640;

        return [
            // ----- D-Pad (Movimento) -----
            {
                id: "LEFT",
                label: "◀",
                x: dpadBaseX,
                y: dpadBaseY,
                width: dpadW,
                height: dpadH,
                tipo: "movement",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },
            {
                id: "RIGHT",
                label: "▶",
                x: dpadBaseX + dpadW + dpadGap,
                y: dpadBaseY,
                width: dpadW,
                height: dpadH,
                tipo: "movement",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },

            // ----- Pulo -----
            {
                id: "JUMP",
                label: "PULO",
                x: jumpX,
                y: jumpY,
                width: jumpW,
                height: jumpH,
                tipo: "movement",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },

            // ----- Bloqueio -----
            {
                id: "BLOCK",
                label: "DEF",
                x: blockX,
                y: blockY,
                width: blockW,
                height: blockH,
                tipo: "block",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },

            // ----- Socos (Linha 1 da grade de ataque) -----
            {
                id: "LP",
                label: "SL",
                x: atkBaseX,
                y: atkBaseY,
                width: atkW,
                height: atkH,
                tipo: "punch",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },
            {
                id: "MP",
                label: "SM",
                x: atkBaseX + atkW + atkGapX,
                y: atkBaseY,
                width: atkW,
                height: atkH,
                tipo: "punch",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },
            {
                id: "HP",
                label: "SF",
                x: atkBaseX + (atkW + atkGapX) * 2,
                y: atkBaseY,
                width: atkW,
                height: atkH,
                tipo: "punch",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },

            // ----- Chutes (Linha 2 da grade de ataque) -----
            {
                id: "LK",
                label: "CL",
                x: atkBaseX,
                y: atkBaseY + atkH + atkGapY,
                width: atkW,
                height: atkH,
                tipo: "kick",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },
            {
                id: "MK",
                label: "CM",
                x: atkBaseX + atkW + atkGapX,
                y: atkBaseY + atkH + atkGapY,
                width: atkW,
                height: atkH,
                tipo: "kick",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            },
            {
                id: "HK",
                label: "CF",
                x: atkBaseX + (atkW + atkGapX) * 2,
                y: atkBaseY + atkH + atkGapY,
                width: atkW,
                height: atkH,
                tipo: "kick",
                isPressed: false,
                wasJustPressed: false,
                wasJustReleased: false
            }
        ];
    }

    // ========================================================================
    // Registro de Eventos de Toque
    // ========================================================================

    /**
     * Registra os listeners de toque no canvas.
     * Utiliza { passive: false } para permitir preventDefault e evitar scroll.
     * @private
     */
    _registrarEventos() {
        const opcoes = { passive: false };

        this.canvas.addEventListener("touchstart", (e) => this._onTouchStart(e), opcoes);
        this.canvas.addEventListener("touchmove", (e) => this._onTouchMove(e), opcoes);
        this.canvas.addEventListener("touchend", (e) => this._onTouchEnd(e), opcoes);
        this.canvas.addEventListener("touchcancel", (e) => this._onTouchEnd(e), opcoes);
    }

    // ========================================================================
    // Conversão de Coordenadas
    // ========================================================================

    /**
     * Converte coordenadas de toque da tela para coordenadas virtuais do canvas.
     * Leva em conta a escala e posição do canvas na página.
     * @param {Touch} touch - Objeto Touch do evento
     * @returns {{x: number, y: number}} Coordenadas no espaço virtual (1920x1080)
     * @private
     */
    _toqueParaVirtual(touch) {
        const rect = this.canvas.getBoundingClientRect();

        // Posição relativa ao canvas na tela
        const toqueX = touch.clientX - rect.left;
        const toqueY = touch.clientY - rect.top;

        // Escala da tela real para a resolução virtual
        const escalaX = this.VIRTUAL_W / rect.width;
        const escalaY = this.VIRTUAL_H / rect.height;

        return {
            x: toqueX * escalaX,
            y: toqueY * escalaY
        };
    }

    // ========================================================================
    // Detecção de Colisão Ponto-Retângulo
    // ========================================================================

    /**
     * Verifica se um ponto (toque) está dentro de um botão.
     * @param {number} px - Coordenada X do ponto
     * @param {number} py - Coordenada Y do ponto
     * @param {Object} btn - Objeto do botão com x, y, width, height
     * @returns {boolean} Verdadeiro se o ponto está dentro do botão
     * @private
     */
    _pontoDentroBotao(px, py, btn) {
        return (
            px >= btn.x &&
            px <= btn.x + btn.width &&
            py >= btn.y &&
            py <= btn.y + btn.height
        );
    }

    /**
     * Encontra qual botão está sob o ponto de toque fornecido.
     * @param {number} px - Coordenada X virtual
     * @param {number} py - Coordenada Y virtual
     * @returns {Object|null} O botão encontrado ou null
     * @private
     */
    _encontrarBotao(px, py) {
        for (const btn of this.buttons) {
            if (this._pontoDentroBotao(px, py, btn)) {
                return btn;
            }
        }
        return null;
    }

    // ========================================================================
    // Handlers de Eventos de Toque
    // ========================================================================

    /**
     * Processa o início de novos toques.
     * Mapeia cada toque ao botão correspondente e atualiza estados.
     * @param {TouchEvent} e
     * @private
     */
    _onTouchStart(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            const pos = this._toqueParaVirtual(touch);
            const btn = this._encontrarBotao(pos.x, pos.y);

            if (btn) {
                // Registrar a associação toque -> botão
                this.activeToques.set(touch.identifier, btn.id);

                // Atualizar estado do botão
                if (!btn.isPressed) {
                    btn.wasJustPressed = true;
                }
                btn.isPressed = true;
            }
        }
    }

    /**
     * Processa movimentação de toques ativos.
     * Permite deslizar entre botões (arrastar de um para outro).
     * @param {TouchEvent} e
     * @private
     */
    _onTouchMove(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            const pos = this._toqueParaVirtual(touch);
            const novoBotao = this._encontrarBotao(pos.x, pos.y);
            const idAnterior = this.activeToques.get(touch.identifier);

            // Se o dedo saiu do botão anterior, soltar
            if (idAnterior) {
                const btnAnterior = this.buttonMap[idAnterior];
                if (!novoBotao || novoBotao.id !== idAnterior) {
                    // Verificar se nenhum outro toque está mantendo este botão
                    let outroToqueMesmo = false;
                    for (const [tid, bid] of this.activeToques) {
                        if (tid !== touch.identifier && bid === idAnterior) {
                            outroToqueMesmo = true;
                            break;
                        }
                    }
                    if (!outroToqueMesmo) {
                        btnAnterior.isPressed = false;
                        btnAnterior.wasJustReleased = true;
                    }
                }
            }

            // Se o dedo entrou em um novo botão, pressionar
            if (novoBotao) {
                this.activeToques.set(touch.identifier, novoBotao.id);
                if (!novoBotao.isPressed) {
                    novoBotao.wasJustPressed = true;
                }
                novoBotao.isPressed = true;
            } else {
                this.activeToques.delete(touch.identifier);
            }
        }
    }

    /**
     * Processa o fim ou cancelamento de toques.
     * Libera os botões associados aos toques que terminaram.
     * @param {TouchEvent} e
     * @private
     */
    _onTouchEnd(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            const btnId = this.activeToques.get(touch.identifier);

            if (btnId) {
                const btn = this.buttonMap[btnId];

                // Remover este toque do mapa
                this.activeToques.delete(touch.identifier);

                // Verificar se outro toque ativo ainda segura o mesmo botão
                let outroToqueMesmo = false;
                for (const [, bid] of this.activeToques) {
                    if (bid === btnId) {
                        outroToqueMesmo = true;
                        break;
                    }
                }

                // Soltar o botão somente se nenhum outro toque o mantém
                if (!outroToqueMesmo) {
                    btn.isPressed = false;
                    btn.wasJustReleased = true;
                }
            }
        }
    }

    // ========================================================================
    // Atualização por Frame
    // ========================================================================

    /**
     * Deve ser chamado no início de cada frame do jogo.
     * Limpa os flags de "acabou de pressionar" e "acabou de soltar"
     * para garantir que sejam verdadeiros por apenas 1 frame.
     */
    update() {
        for (const btn of this.buttons) {
            btn.wasJustPressed = false;
            btn.wasJustReleased = false;
        }
    }

    // ========================================================================
    // Consultas de Estado
    // ========================================================================

    /**
     * Verifica se um botão está atualmente pressionado.
     * @param {string} buttonId - ID do botão (ex: "LP", "LEFT", "JUMP")
     * @returns {boolean} Verdadeiro se o botão está sendo segurado
     */
    isPressed(buttonId) {
        const btn = this.buttonMap[buttonId];
        return btn ? btn.isPressed : false;
    }

    /**
     * Verifica se um botão acabou de ser pressionado neste frame.
     * Útil para ações que devem ocorrer uma única vez por pressionamento.
     * @param {string} buttonId - ID do botão
     * @returns {boolean} Verdadeiro apenas no frame em que o botão foi pressionado
     */
    justPressed(buttonId) {
        const btn = this.buttonMap[buttonId];
        return btn ? btn.wasJustPressed : false;
    }

    /**
     * Retorna a direção horizontal baseada nos botões LEFT/RIGHT.
     * @returns {number} -1 (esquerda), 0 (neutro), ou 1 (direita)
     */
    getDirection() {
        let dir = 0;
        if (this.isPressed("LEFT")) dir -= 1;
        if (this.isPressed("RIGHT")) dir += 1;
        return dir;
    }

    // ========================================================================
    // Renderização dos Botões Virtuais
    // ========================================================================

    /**
     * Mapa de cores por tipo de botão.
     * @private
     */
    static get CORES() {
        return {
            movement: {
                base: "rgba(50, 180, 80, 0.35)",
                borda: "rgba(80, 220, 110, 0.6)",
                pressed: "rgba(50, 180, 80, 0.65)",
                glow: "rgba(100, 255, 140, 0.5)",
                texto: "rgba(255, 255, 255, 0.9)"
            },
            punch: {
                base: "rgba(200, 50, 50, 0.35)",
                borda: "rgba(255, 80, 80, 0.6)",
                pressed: "rgba(200, 50, 50, 0.65)",
                glow: "rgba(255, 100, 100, 0.5)",
                texto: "rgba(255, 255, 255, 0.9)"
            },
            kick: {
                base: "rgba(50, 80, 200, 0.35)",
                borda: "rgba(80, 120, 255, 0.6)",
                pressed: "rgba(50, 80, 200, 0.65)",
                glow: "rgba(100, 140, 255, 0.5)",
                texto: "rgba(255, 255, 255, 0.9)"
            },
            block: {
                base: "rgba(200, 180, 30, 0.35)",
                borda: "rgba(255, 230, 50, 0.6)",
                pressed: "rgba(200, 180, 30, 0.65)",
                glow: "rgba(255, 240, 100, 0.5)",
                texto: "rgba(255, 255, 255, 0.9)"
            }
        };
    }

    /**
     * Desenha todos os botões virtuais no canvas.
     * Botões pressionados recebem efeito de brilho (glow).
     * @param {CanvasRenderingContext2D} ctx - Contexto 2D do canvas
     */
    draw(ctx) {
        ctx.save();

        for (const btn of this.buttons) {
            const cores = InputManager.CORES[btn.tipo] || InputManager.CORES.movement;

            // --- Efeito de glow quando pressionado ---
            if (btn.isPressed) {
                ctx.save();
                ctx.shadowColor = cores.glow;
                ctx.shadowBlur = 25;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Fundo pressionado (mais opaco)
                ctx.fillStyle = cores.pressed;
                Utils.drawRoundedRect(ctx, btn.x, btn.y, btn.width, btn.height, 14);
                ctx.fill();

                ctx.restore();
            } else {
                // Fundo normal (semi-transparente)
                ctx.fillStyle = cores.base;
                Utils.drawRoundedRect(ctx, btn.x, btn.y, btn.width, btn.height, 14);
                ctx.fill();
            }

            // --- Borda ---
            ctx.strokeStyle = cores.borda;
            ctx.lineWidth = btn.isPressed ? 3 : 2;
            Utils.drawRoundedRect(ctx, btn.x, btn.y, btn.width, btn.height, 14);
            ctx.stroke();

            // --- Label do botão ---
            ctx.fillStyle = cores.texto;
            ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const centroX = btn.x + btn.width / 2;
            const centroY = btn.y + btn.height / 2;
            ctx.fillText(btn.label, centroX, centroY);
        }

        ctx.restore();
    }
}
