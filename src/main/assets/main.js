/**
 * JOGO ELEITORAL - Ponto de Entrada
 * Inicializa o jogo quando a página carrega
 */

// Força landscape no mobile
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
}

// Previne scroll e zoom no mobile
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

// Inicializa o jogo quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init().catch(err => {
        console.error('Erro ao inicializar o jogo:', err);
    });
});
