/**
 * ============================================================================
 * JOGO ELEITORAL - Módulo de Utilidades
 * ============================================================================
 * Funções auxiliares reutilizáveis para o motor do jogo:
 *   - Matemática (clamp, lerp, randomRange)
 *   - Carregamento de imagens (loadImage, loadAllImages)
 *   - Funções de easing para animações
 *   - Desenho de formas auxiliares (retângulo arredondado)
 *   - Formatação de tempo
 * ============================================================================
 */

"use strict";

const Utils = (() => {

    // ========================================================================
    // Funções Matemáticas
    // ========================================================================

    /**
     * Restringe um valor entre um mínimo e um máximo.
     * @param {number} val - Valor a ser restringido
     * @param {number} min - Limite inferior
     * @param {number} max - Limite superior
     * @returns {number} Valor restringido dentro do intervalo [min, max]
     */
    function clamp(val, min, max) {
        if (val < min) return min;
        if (val > max) return max;
        return val;
    }

    /**
     * Interpolação linear entre dois valores.
     * @param {number} a - Valor inicial
     * @param {number} b - Valor final
     * @param {number} t - Fator de interpolação (0 = a, 1 = b)
     * @returns {number} Valor interpolado
     */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Gera um número aleatório dentro de um intervalo (inclusivo).
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {number} Número aleatório entre min e max
     */
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ========================================================================
    // Carregamento de Imagens
    // ========================================================================

    /**
     * Carrega uma única imagem de forma assíncrona.
     * @param {string} src - Caminho/URL da imagem
     * @returns {Promise<HTMLImageElement>} Promise que resolve com o elemento Image carregado
     */
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve(img);
            };

            img.onerror = () => {
                reject(new Error(`Falha ao carregar imagem: ${src}`));
            };

            img.src = src;
        });
    }

    /**
     * Carrega múltiplas imagens em paralelo a partir de um mapa de nomes/caminhos.
     * @param {Object.<string, string>} imageMap - Objeto no formato { nome: caminhoImagem }
     * @returns {Promise<Object.<string, HTMLImageElement>>} Promise que resolve com { nome: Image }
     *
     * @example
     *   const imagens = await Utils.loadAllImages({
     *       jogador: 'assets/player.png',
     *       fundo:   'assets/background.png'
     *   });
     *   // imagens.jogador -> HTMLImageElement
     */
    function loadAllImages(imageMap) {
        const nomes = Object.keys(imageMap);
        const promessas = nomes.map(nome => loadImage(imageMap[nome]));

        return Promise.all(promessas).then(imagens => {
            const resultado = {};
            nomes.forEach((nome, indice) => {
                resultado[nome] = imagens[indice];
            });
            return resultado;
        });
    }

    // ========================================================================
    // Funções de Easing (Suavização de Animações)
    // ========================================================================

    /**
     * Easing quadrático de saída — desacelera no final.
     * Ideal para movimentos que chegam suavemente ao destino.
     * @param {number} t - Progresso da animação (0 a 1)
     * @returns {number} Valor suavizado
     */
    function easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * Easing quadrático de entrada — acelera no início.
     * Ideal para objetos que começam devagar e ganham velocidade.
     * @param {number} t - Progresso da animação (0 a 1)
     * @returns {number} Valor suavizado
     */
    function easeInQuad(t) {
        return t * t;
    }

    /**
     * Easing "back" de saída — ultrapassa levemente o destino e retorna.
     * Cria um efeito elástico/bouncy muito usado em UIs e efeitos de impacto.
     * @param {number} t - Progresso da animação (0 a 1)
     * @returns {number} Valor suavizado (pode ultrapassar 1.0 brevemente)
     */
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // ========================================================================
    // Funções de Desenho
    // ========================================================================

    /**
     * Desenha o caminho (path) de um retângulo com cantos arredondados no contexto.
     * Não preenche nem traça — apenas define o path para uso com fill() ou stroke().
     * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
     * @param {number} x - Posição X do canto superior esquerdo
     * @param {number} y - Posição Y do canto superior esquerdo
     * @param {number} w - Largura do retângulo
     * @param {number} h - Altura do retângulo
     * @param {number} r - Raio dos cantos arredondados
     */
    function drawRoundedRect(ctx, x, y, w, h, r) {
        // Garante que o raio não exceda metade da menor dimensão
        const raio = Math.min(r, w / 2, h / 2);

        ctx.beginPath();
        ctx.moveTo(x + raio, y);
        ctx.lineTo(x + w - raio, y);
        ctx.arcTo(x + w, y, x + w, y + raio, raio);
        ctx.lineTo(x + w, y + h - raio);
        ctx.arcTo(x + w, y + h, x + w - raio, y + h, raio);
        ctx.lineTo(x + raio, y + h);
        ctx.arcTo(x, y + h, x, y + h - raio, raio);
        ctx.lineTo(x, y + raio);
        ctx.arcTo(x, y, x + raio, y, raio);
        ctx.closePath();
    }

    // ========================================================================
    // Formatação
    // ========================================================================

    /**
     * Formata um valor em segundos para o formato MM:SS.
     * @param {number} seconds - Tempo em segundos
     * @returns {string} Tempo formatado como "MM:SS"
     *
     * @example
     *   Utils.formatTime(95);  // "01:35"
     *   Utils.formatTime(7);   // "00:07"
     */
    function formatTime(seconds) {
        const totalSegundos = Math.max(0, Math.floor(seconds));
        const minutos = Math.floor(totalSegundos / 60);
        const segs = totalSegundos % 60;

        const minutosStr = String(minutos).padStart(2, "0");
        const segsStr = String(segs).padStart(2, "0");

        return `${minutosStr}:${segsStr}`;
    }

    // ========================================================================
    // API Pública
    // ========================================================================

    return Object.freeze({
        clamp,
        lerp,
        randomRange,
        loadImage,
        loadAllImages,
        easeOutQuad,
        easeInQuad,
        easeOutBack,
        drawRoundedRect,
        formatTime
    });

})();

// Polyfill para CanvasRenderingContext2D.roundRect (WebViews antigos)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.arcTo(x + w, y, x + w, y + r, r);
        this.lineTo(x + w, y + h - r);
        this.arcTo(x + w, y + h, x + w - r, y + h, r);
        this.lineTo(x + r, y + h);
        this.arcTo(x, y + h, x, y + h - r, r);
        this.lineTo(x, y + r);
        this.arcTo(x, y, x + r, y, r);
        this.closePath();
        return this;
    };
}
