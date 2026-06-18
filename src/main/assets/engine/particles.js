/**
 * ============================================================
 *  Jogo Eleitoral – Particle Effects System
 *  Renders lightweight canvas-only particles (no images).
 *  Designed for 1920×1080 virtual resolution on mobile.
 * ============================================================
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  ParticleSystem                                                     */
/* ------------------------------------------------------------------ */

class ParticleSystem {

    constructor () {
        /** @type {Array<Object>} Pool of active particles */
        this.particles = [];
    }

    /* =============================================================
     *  Core API
     * ============================================================= */

    /**
     * Spawn `count` particles at (x, y) with the given type and config.
     *
     * @param {number}  x      – world X
     * @param {number}  y      – world Y
     * @param {string}  type   – 'spark' | 'hit' | 'dust' | 'energy' | 'smoke'
     * @param {number}  count  – how many particles to create
     * @param {Object}  config – per-particle overrides (see _defaults)
     */
    emit (x, y, type, count, config = {}) {
        for (let i = 0; i < count; i++) {
            const angle    = config.angle    ?? (Math.random() * Math.PI * 2);
            const speed    = config.speed    ?? (100 + Math.random() * 300);
            const life     = config.life     ?? (0.3 + Math.random() * 0.5);
            const size     = config.size     ?? (3 + Math.random() * 6);
            const gravity  = config.gravity  ?? 600;
            const color    = config.color    ?? this._typeColor(type);

            this.particles.push({
                x,
                y,
                vx:       Math.cos(angle) * speed,
                vy:       Math.sin(angle) * speed,
                life,
                maxLife:  life,
                size,
                color,
                alpha:    config.alpha    ?? 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10,
                gravity,
                type
            });
        }
    }

    /**
     * Advance every particle by `dt` seconds.
     * Dead particles (life ≤ 0) are removed.
     *
     * @param {number} dt – delta-time in seconds
     */
    update (dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Physics
            p.vy += p.gravity * dt;
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;

            // Lifetime
            p.life -= dt;
            const t = Math.max(p.life / p.maxLife, 0);   // 1 → 0

            // Fade & shrink
            p.alpha = t;
            p.size  = p.size * (0.97 + 0.03 * t);        // gentle shrink
            p.rotation += p.rotSpeed * dt;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render every active particle onto the given canvas context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw (ctx) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.alpha <= 0 || p.size <= 0.2) continue;

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            switch (p.type) {
                case 'spark':
                case 'hit':
                    this._drawSpark(ctx, p);
                    break;
                case 'energy':
                    this._drawEnergy(ctx, p);
                    break;
                case 'smoke':
                    this._drawSmoke(ctx, p);
                    break;
                case 'dust':
                default:
                    this._drawDust(ctx, p);
                    break;
            }

            ctx.restore();
        }
    }

    /* =============================================================
     *  Preset Emitters
     * ============================================================= */

    /**
     * Yellow/orange sparks explosion – normal hit impact.
     */
    emitHit (x, y) {
        const colors = ['#FFD700', '#FFA500', '#FF8C00', '#FFEC8B', '#FFFFFF'];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 500;
            this.emit(x, y, 'hit', 1, {
                angle,
                speed,
                life:    0.25 + Math.random() * 0.35,
                size:    3 + Math.random() * 7,
                color:   colors[Math.floor(Math.random() * colors.length)],
                gravity: 400 + Math.random() * 300
            });
        }
    }

    /**
     * Blue/cyan shield sparks – block effect.
     */
    emitBlock (x, y) {
        const colors = ['#00BFFF', '#1E90FF', '#87CEFA', '#ADD8E6', '#FFFFFF'];
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 150 + Math.random() * 250;
            this.emit(x, y, 'spark', 1, {
                angle,
                speed,
                life:    0.2 + Math.random() * 0.3,
                size:    4 + Math.random() * 5,
                color:   colors[Math.floor(Math.random() * colors.length)],
                gravity: 200
            });
        }
    }

    /**
     * Large red/gold energy burst – special attack.
     */
    emitSpecial (x, y) {
        const colors = ['#FF0000', '#FF4500', '#FFD700', '#FFA500', '#FFFFFF'];
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 250 + Math.random() * 600;
            this.emit(x, y, 'energy', 1, {
                angle,
                speed,
                life:    0.4 + Math.random() * 0.5,
                size:    6 + Math.random() * 12,
                color:   colors[Math.floor(Math.random() * colors.length)],
                gravity: 300 + Math.random() * 200
            });
        }
    }

    /**
     * Small brown dust puff – landing / footstep.
     */
    emitDust (x, y) {
        const colors = ['#A0826E', '#8B7355', '#C4A882', '#D2B48C'];
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const speed = 40 + Math.random() * 80;
            this.emit(x, y, 'dust', 1, {
                angle,
                speed,
                life:    0.3 + Math.random() * 0.25,
                size:    5 + Math.random() * 6,
                color:   colors[Math.floor(Math.random() * colors.length)],
                gravity: 100
            });
        }
    }

    /**
     * Massive KO explosion – white/gold fireworks.
     */
    emitKO (x, y) {
        const colors = ['#FFFFFF', '#FFFACD', '#FFD700', '#FFF8DC', '#FFEC8B'];
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 300 + Math.random() * 700;
            this.emit(x, y, 'energy', 1, {
                angle,
                speed,
                life:    0.5 + Math.random() * 0.8,
                size:    5 + Math.random() * 15,
                color:   colors[Math.floor(Math.random() * colors.length)],
                gravity: 500 + Math.random() * 400
            });
        }
    }

    /* =============================================================
     *  Internal Renderers
     * ============================================================= */

    /** Bright elongated spark (stretched in velocity direction). */
    _drawSpark (ctx, p) {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 1.5, -p.size * 0.4, p.size * 3, p.size * 0.8);
    }

    /** Round glowing energy orb with soft edge. */
    _drawEnergy (ctx, p) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Soft translucent smoke puff. */
    _drawSmoke (ctx, p) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Small round dust speck. */
    _drawDust (ctx, p) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Fallback colour per particle type. */
    _typeColor (type) {
        switch (type) {
            case 'spark':  return '#FFD700';
            case 'hit':    return '#FFA500';
            case 'dust':   return '#A0826E';
            case 'energy': return '#FF4500';
            case 'smoke':  return '#888888';
            default:       return '#FFFFFF';
        }
    }
}
