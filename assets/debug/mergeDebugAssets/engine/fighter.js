/**
 * ============================================================
 *  Jogo Eleitoral – Fighter Class
 *  Full 2D fighting-game character with state machine,
 *  input buffer, attack system, and canvas rendering.
 *  Virtual resolution: 1920×1080 · Floor at Y ≈ 850.
 * ============================================================
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Fighter States                                                     */
/* ------------------------------------------------------------------ */

const FighterState = {
    IDLE:           0,
    WALK:           1,
    JUMP:           2,
    ATTACK:         3,
    AIR_ATTACK:     4,
    SPECIAL_ATTACK: 5,
    HITSTUN:        6,
    BLOCKING:       7,
    DODGE:          8,
    KO:             9,
    INTRO:          10,
    VICTORY:        11
};

/* ------------------------------------------------------------------ */
/*  Fighter Class                                                      */
/* ------------------------------------------------------------------ */

class Fighter {

    /**
     * @param {Object} config
     * @param {boolean} config.isPlayerOne
     * @param {number}  config.x
     * @param {number}  config.y
     * @param {Object}  config.images  – { idle, attack, ultra }
     * @param {string}  config.name
     */
    constructor (config) {
        /* -- Identity ------------------------------------------------ */
        this.isPlayerOne = config.isPlayerOne;
        this.name        = config.name || 'Fighter';
        this.images      = config.images || {};       // { idle, attack, ultra }

        /* -- Position / Physics -------------------------------------- */
        this.x            = config.x || 400;
        this.y            = config.y || 850;
        this.velocity     = { x: 0, y: 0 };
        this.speed        = 400;
        this.jumpVelocity = -900;
        this.gravity      = 2500;
        this.facingRight  = this.isPlayerOne;

        /* -- Health / State ------------------------------------------ */
        this.hp       = 100;
        this.maxHp    = 100;
        this.state    = FighterState.IDLE;

        /* -- Timers -------------------------------------------------- */
        this.attackTimer    = 0;
        this.hitstunTimer   = 0;
        this.dodgeTimer     = 0;
        this.heavyCooldown  = 0;
        this.specialCooldown = 0;

        /* -- Combat -------------------------------------------------- */
        this.currentDamage  = 0;
        this.comboCount     = 0;
        this.isInvincible   = false;
        this.canHit         = false;   // true enquanto o ataque pode acertar
        this.attackThrust   = 0;       // forward push during attack
        this.attackDuration = 0;       // total duration of current attack

        /* -- Input Buffer -------------------------------------------- */
        this.inputBuffer = new Array(30).fill(null);
        this.bufferSize  = 30;

        /* -- Sprite / Visuals ---------------------------------------- */
        this.currentSprite = this.images.idle || null;
        this.spriteScale   = 1.0;
        this.spriteOffsetX = 0;
        this.flashTimer    = 0;
        this.flashColor    = 'white';
        this.shakeX        = 0;
        this.shakeY        = 0;
        this.animTimer     = 0;

        /* -- Round tracking ------------------------------------------ */
        this.wins = 0;
    }

    /* =============================================================
     *  Main Update
     * ============================================================= */

    /**
     * @param {number} dt          – delta-time in seconds
     * @param {Object} input       – current frame input snapshot
     * @param {Fighter} opponent   – the other fighter
     * @param {number} floorY      – Y position of the floor
     * @param {number} screenWidth – virtual width (1920)
     */
    update (dt, input, opponent, floorY, screenWidth) {
        /* 1. Gravity ------------------------------------------------- */
        if (this.y < floorY) {
            this.velocity.y += this.gravity * dt;
        }

        /* 2. Timers -------------------------------------- */
        this.animTimer += dt;
        if (this.heavyCooldown  > 0) this.heavyCooldown  -= dt;
        if (this.specialCooldown > 0) this.specialCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Dampen screen-shake
        this.shakeX *= 0.85;
        this.shakeY *= 0.85;
        if (Math.abs(this.shakeX) < 0.5) this.shakeX = 0;
        if (Math.abs(this.shakeY) < 0.5) this.shakeY = 0;

        /* 3. Input buffer (ambos jogadores) ------------------------- */
        if (input) {
            this._pushInput(input);
        }

        /* 4. Process current state ----------------------------------- */
        if (input) {
            switch (this.state) {
                case FighterState.IDLE:           this._processIdle(input);                break;
                case FighterState.WALK:           this._processWalk(input);                break;
                case FighterState.JUMP:           this._processJump(input, floorY);        break;
                case FighterState.ATTACK:         this._processAttack(dt);                 break;
                case FighterState.AIR_ATTACK:     this._processAirAttack(dt, floorY);      break;
                case FighterState.SPECIAL_ATTACK: this._processSpecialAttack(dt);           break;
                case FighterState.HITSTUN:        this._processHitstun(dt);                break;
                case FighterState.BLOCKING:       this._processBlocking(input);            break;
                case FighterState.DODGE:          this._processDodge(dt);                  break;
                case FighterState.KO:             this._processKO();                       break;
                // INTRO / VICTORY are externally driven
            }
        }

        /* 5. Apply velocity ------------------------------------------ */
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        /* 6. Floor collision ----------------------------------------- */
        if (this.y >= floorY) {
            this.y = floorY;
            this.velocity.y = 0;
        }

        /* 7. Clamp to screen bounds ---------------------------------- */
        const BODY_HALF = 50;
        if (this.x < BODY_HALF)                this.x = BODY_HALF;
        if (this.x > screenWidth - BODY_HALF)  this.x = screenWidth - BODY_HALF;

        /* 8. Auto-face opponent -------------------------------------- */
        if (opponent &&
            this.state !== FighterState.ATTACK &&
            this.state !== FighterState.AIR_ATTACK &&
            this.state !== FighterState.SPECIAL_ATTACK &&
            this.state !== FighterState.HITSTUN &&
            this.state !== FighterState.DODGE &&
            this.state !== FighterState.KO) {
            this.facingRight = opponent.x > this.x;
        }

        /* 9. Update sprite reference --------------------------------- */
        this._updateSprite();
    }

    /* =============================================================
     *  State Processors
     * ============================================================= */

    _processIdle (input) {
        this.velocity.x = 0;

        // Defense first
        if (this._checkDefense(input)) return;

        // Ground attacks
        if (this._checkGroundAttacks(input)) return;

        // Jump
        if (input.UP) {
            this.velocity.y = this.jumpVelocity;
            this.state = FighterState.JUMP;
            return;
        }

        // Walk
        if (input.LEFT || input.RIGHT) {
            this.state = FighterState.WALK;
        }
    }

    _processWalk (input) {
        // Direction
        if (input.LEFT) {
            this.velocity.x = -this.speed;
        } else if (input.RIGHT) {
            this.velocity.x = this.speed;
        } else {
            this.velocity.x = 0;
            this.state = FighterState.IDLE;
            return;
        }

        // Defense
        if (this._checkDefense(input)) return;

        // Attacks while walking
        if (this._checkGroundAttacks(input)) return;

        // Jump from walk
        if (input.UP) {
            this.velocity.y = this.jumpVelocity;
            this.state = FighterState.JUMP;
        }
    }

    _processJump (input, floorY) {
        // Air control (reduced)
        if (input.LEFT)       this.velocity.x = -this.speed * 0.6;
        else if (input.RIGHT) this.velocity.x =  this.speed * 0.6;
        else                  this.velocity.x *= 0.95;  // air friction

        // Air attacks
        if (this._checkAirAttacks(input)) return;

        // Land check
        if (this.y >= floorY) {
            this.y = floorY;
            this.velocity.y = 0;
            this.velocity.x = 0;
            this.state = FighterState.IDLE;
        }
    }

    _processAttack (dt) {
        this.attackTimer -= dt;

        // Apply thrust in facing direction during first half of attack
        if (this.attackTimer > this.attackDuration * 0.5) {
            this.velocity.x = this.attackThrust * (this.facingRight ? 1 : -1);
        } else {
            this.velocity.x *= 0.85;
        }

        if (this.attackTimer <= 0) {
            this.attackTimer  = 0;
            this.currentDamage = 0;
            this.velocity.x   = 0;
            this.state = FighterState.IDLE;
        }
    }

    _processAirAttack (dt, floorY) {
        this.attackTimer -= dt;

        // Land check
        if (this.y >= floorY) {
            this.y = floorY;
            this.velocity.y = 0;
            this.velocity.x = 0;
            this.attackTimer  = 0;
            this.currentDamage = 0;
            this.state = FighterState.IDLE;
            return;
        }

        if (this.attackTimer <= 0) {
            this.attackTimer  = 0;
            this.currentDamage = 0;
            this.state = FighterState.JUMP;
        }
    }

    _processSpecialAttack (dt) {
        this.attackTimer -= dt;

        // Strong forward push during special
        if (this.attackTimer > this.attackDuration * 0.4) {
            this.velocity.x = 350 * (this.facingRight ? 1 : -1);
        } else {
            this.velocity.x *= 0.8;
        }

        if (this.attackTimer <= 0) {
            this.attackTimer  = 0;
            this.currentDamage = 0;
            this.velocity.x   = 0;
            this.state = FighterState.IDLE;
        }
    }

    _processHitstun (dt) {
        this.hitstunTimer -= dt;
        this.velocity.x   *= 0.9;   // friction while stunned

        if (this.hitstunTimer <= 0) {
            this.hitstunTimer = 0;
            this.comboCount   = 0;
            this.state = FighterState.IDLE;
        }
    }

    _processBlocking (input) {
        this.velocity.x = 0;

        // Release block
        if (!input.BLOCK) {
            this.state = FighterState.IDLE;
            return;
        }

        // Dodge: while blocking, press backward direction
        const backDir = this.facingRight ? input.LEFT : input.RIGHT;
        if (backDir) {
            this.state      = FighterState.DODGE;
            this.dodgeTimer = 0.5;
            this.isInvincible = true;
            this.velocity.x = (this.facingRight ? -1 : 1) * 700;  // dash backward
        }
    }

    _processDodge (dt) {
        this.dodgeTimer -= dt;
        this.velocity.x *= 0.92;   // decelerate dodge

        if (this.dodgeTimer <= 0) {
            this.dodgeTimer   = 0;
            this.isInvincible = false;
            this.velocity.x   = 0;
            this.state = FighterState.IDLE;
        }
    }

    _processKO () {
        // Fallen – no input accepted, slight slide to stop
        this.velocity.x *= 0.92;
        this.velocity.y  = 0;
    }

    /* =============================================================
     *  Attack System
     * ============================================================= */

    /**
     * Check all six ground attack buttons + special sequence.
     * Returns true if an attack was started.
     */
    _checkGroundAttacks (input) {
        // --- Special (Back → Forward + HP OR direct SPECIAL flag) ----------
        if (input.HP && this.specialCooldown <= 0 && (this._checkSpecialSequence() || input.SPECIAL)) {
            this._executeAttack(FighterState.SPECIAL_ATTACK, 0.6, 14, 350);
            this.specialCooldown = 4.0;
            return true;
        }

        // --- Heavy Punch -----------------------------------------------
        if (input.HP && this.heavyCooldown <= 0) {
            this._executeAttack(FighterState.ATTACK, 0.4, 9, 220);
            this.heavyCooldown = 1.5;
            return true;
        }

        // --- Heavy Kick ------------------------------------------------
        if (input.HK && this.heavyCooldown <= 0) {
            this._executeAttack(FighterState.ATTACK, 0.5, 9, 200);
            this.heavyCooldown = 1.5;
            return true;
        }

        // --- Medium Punch ----------------------------------------------
        if (input.MP) {
            this._executeAttack(FighterState.ATTACK, 0.25, 6, 150);
            return true;
        }

        // --- Medium Kick -----------------------------------------------
        if (input.MK) {
            this._executeAttack(FighterState.ATTACK, 0.3, 5, 130);
            return true;
        }

        // --- Light Punch -----------------------------------------------
        if (input.LP) {
            this._executeAttack(FighterState.ATTACK, 0.15, 2, 80);
            return true;
        }

        // --- Light Kick ------------------------------------------------
        if (input.LK) {
            this._executeAttack(FighterState.ATTACK, 0.2, 3, 90);
            return true;
        }

        return false;
    }

    /**
     * Any attack button in the air = 5-damage air attack.
     */
    _checkAirAttacks (input) {
        if (input.LP || input.MP || input.HP || input.LK || input.MK || input.HK) {
            this._executeAttack(FighterState.AIR_ATTACK, 0.25, 5, 0);
            return true;
        }
        return false;
    }

    /**
     * Transition into an attack state.
     *
     * @param {number} state    – FighterState value
     * @param {number} duration – seconds
     * @param {number} damage   – HP to deal on hit
     * @param {number} thrust   – forward velocity boost
     */
    _executeAttack (state, duration, damage, thrust) {
        this.state          = state;
        this.attackTimer    = duration;
        this.attackDuration = duration;
        this.currentDamage  = damage;
        this.attackThrust   = thrust;
        this.canHit         = true;    // pode acertar neste ataque
    }

    /**
     * Scan the input buffer for a Back → Forward motion.
     * Returns true if the special sequence is detected.
     */
    _checkSpecialSequence () {
        // We need: at some point "back" was pressed, then later "forward"
        const back    = this.facingRight ? 'LEFT'  : 'RIGHT';
        const forward = this.facingRight ? 'RIGHT' : 'LEFT';

        let foundBack = false;
        for (let i = 0; i < this.bufferSize; i++) {
            const entry = this.inputBuffer[i];
            if (!entry) continue;

            if (!foundBack && entry[back])    { foundBack = true; continue; }
            if (foundBack  && entry[forward]) { return true; }
        }
        return false;
    }

    /* =============================================================
     *  Defense
     * ============================================================= */

    /**
     * Returns true if block state was entered.
     */
    _checkDefense (input) {
        if (input.BLOCK) {
            this.state      = FighterState.BLOCKING;
            this.velocity.x = 0;
            return true;
        }
        return false;
    }

    /* =============================================================
     *  Damage / Hitboxes
     * ============================================================= */

    /**
     * Apply damage to this fighter.
     *
     * @param {number}          amount      – raw damage
     * @param {number}          pushbackDir – +1 or -1
     * @param {ParticleSystem}  particles   – (optional) particle system
     */
    takeDamage (amount, pushbackDir, particles) {
        if (this.isInvincible) return;

        // Blocking absorbs all damage, slight pushback only
        if (this.state === FighterState.BLOCKING) {
            this.velocity.x = pushbackDir * 250;
            if (particles) {
                particles.emitBlock(this.x + pushbackDir * -40, this.y - 120);
            }
            return;
        }

        // Apply damage
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;

        // Hitstun
        this.state        = FighterState.HITSTUN;
        this.hitstunTimer = 0.3 + amount * 0.015;    // heavier hits = longer stun
        this.comboCount++;

        // Pushback
        this.velocity.x = pushbackDir * (200 + amount * 20);
        this.velocity.y = -80;                        // slight pop-up

        // Visual feedback
        this.flashTimer = 0.12;
        this.flashColor = amount >= 10 ? '#FF0000' : '#FFFFFF';
        this.shakeX     = (Math.random() - 0.5) * 14;
        this.shakeY     = (Math.random() - 0.5) * 8;

        // Particles
        if (particles) {
            if (amount >= 12) {
                particles.emitSpecial(this.x + pushbackDir * -30, this.y - 120);
            } else {
                particles.emitHit(this.x + pushbackDir * -30, this.y - 120);
            }
        }

        // KO check
        if (this.hp <= 0) {
            this.state      = FighterState.KO;
            this.velocity.x = pushbackDir * 350;
            this.velocity.y = -200;
            if (particles) {
                particles.emitKO(this.x, this.y - 100);
            }
        }
    }

    /**
     * Returns the active attack hitbox in world coordinates.
     * Only valid when in an attack state.
     *
     * @returns {{ x: number, y: number, w: number, h: number } | null}
     */
    getHitbox () {
        if (this.state !== FighterState.ATTACK &&
            this.state !== FighterState.AIR_ATTACK &&
            this.state !== FighterState.SPECIAL_ATTACK) {
            return null;
        }

        const dir     = this.facingRight ? 1 : -1;
        const offsetX = 30;
        const w       = this.state === FighterState.SPECIAL_ATTACK ? 180 : 140;
        const h       = 80;

        return {
            x: this.x + dir * offsetX - (dir === -1 ? w : 0),
            y: this.y - 180,
            w,
            h
        };
    }

    /**
     * Returns the body hurtbox in world coordinates.
     *
     * @returns {{ x: number, y: number, w: number, h: number }}
     */
    getHurtbox () {
        return {
            x: this.x - 50,
            y: this.y - 240,
            w: 100,
            h: 240
        };
    }

    /**
     * Test if this fighter's hitbox overlaps the opponent's hurtbox (AABB).
     *
     * @param {Fighter} opponent
     * @returns {boolean}
     */
    checkHit (opponent) {
        const hitbox  = this.getHitbox();
        if (!hitbox) return false;

        const hurtbox = opponent.getHurtbox();

        return (
            hitbox.x < hurtbox.x + hurtbox.w &&
            hitbox.x + hitbox.w > hurtbox.x &&
            hitbox.y < hurtbox.y + hurtbox.h &&
            hitbox.y + hitbox.h > hurtbox.y
        );
    }

    /**
     * Reset fighter for a new round.
     *
     * @param {number} x – starting X position
     */
    reset (x) {
        this.x            = x;
        this.y            = 850;
        this.hp           = this.maxHp;
        this.state        = FighterState.IDLE;
        this.velocity     = { x: 0, y: 0 };
        this.attackTimer  = 0;
        this.hitstunTimer = 0;
        this.dodgeTimer   = 0;
        this.heavyCooldown  = 0;
        this.specialCooldown = 0;
        this.currentDamage  = 0;
        this.comboCount     = 0;
        this.isInvincible   = false;
        this.canHit         = false;
        this.facingRight    = this.isPlayerOne;
        this.flashTimer     = 0;
        this.shakeX         = 0;
        this.shakeY         = 0;
        this.inputBuffer    = new Array(this.bufferSize).fill(null);
    }

    /* =============================================================
     *  Drawing
     * ============================================================= */

    /**
     * Render the fighter onto the canvas.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw (ctx) {
        const drawX = this.x + this.shakeX;
        const drawY = this.y + this.shakeY;

        /* -- Shadow -------------------------------------------------- */
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle   = '#000000';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 5, 55, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* -- Sprite -------------------------------------------------- */
        ctx.save();
        ctx.translate(drawX, drawY);

        // Dodge: semi-transparent
        if (this.state === FighterState.DODGE) {
            ctx.globalAlpha = 0.35;
        }

        // KO: dark tint via reduced alpha + overlay
        if (this.state === FighterState.KO) {
            ctx.globalAlpha = 0.6;
        }

        // Flip horizontally if facing left
        const scaleX = this.facingRight ? 1 : -1;
        ctx.scale(scaleX * this.spriteScale, this.spriteScale);

        // Draw sprite image
        if (this.currentSprite && this.currentSprite.complete && this.currentSprite.naturalWidth > 0) {
            const sw = this.currentSprite.naturalWidth;
            const sh = this.currentSprite.naturalHeight;
            // Scale to roughly 400px tall
            const targetH = 400;
            const scale   = targetH / sh;
            const dw      = sw * scale;
            const dh      = sh * scale;
            
            ctx.drawImage(this.currentSprite,
                -dw / 2 + this.spriteOffsetX, -dh,
                dw, dh);
        } else {
            this._drawPlaceholder(ctx);
        }

        ctx.restore();

        /* -- Flash overlay (on hit) ---------------------------------- */
        if (this.flashTimer > 0) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.scale(scaleX, 1);
            ctx.globalAlpha    = this.flashTimer * 6;   // quick fade
            ctx.fillStyle      = this.flashColor;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillRect(-100, -260, 200, 260);
            ctx.restore();

            // Alternative: overlay rect on top for visual punch
            ctx.save();
            ctx.globalAlpha = Math.min(this.flashTimer * 4, 0.5);
            ctx.fillStyle   = this.flashColor;
            ctx.fillRect(drawX - 60, drawY - 250, 120, 250);
            ctx.restore();
        }

        /* -- Attack effect arc --------------------------------------- */
        if (this.state === FighterState.ATTACK ||
            this.state === FighterState.AIR_ATTACK ||
            this.state === FighterState.SPECIAL_ATTACK) {
            this._drawAttackArc(ctx, drawX, drawY);
        }
    }

    /* =============================================================
     *  Internal Helpers
     * ============================================================= */

    /** Push a snapshot into the circular input buffer. */
    _pushInput (input) {
        this.inputBuffer.shift();
        this.inputBuffer.push({ ...input });
    }

    /** Choose the correct sprite image for the current state. */
    _updateSprite () {
        // Simple 2-frame animation for IDLE/WALK (toggle every 0.3s)
        const frameIndex = Math.floor(this.animTimer * 3.33) % 2;
        const idleImg = frameIndex === 0 ? this.images.idle : (this.images.idle2 || this.images.idle);

        switch (this.state) {
            case FighterState.SPECIAL_ATTACK:
                this.currentSprite = this.images.ultra || this.images.attack || idleImg;
                break;
            case FighterState.ATTACK:
            case FighterState.AIR_ATTACK:
                this.currentSprite = this.images.attack || idleImg;
                break;
            case FighterState.WALK:
                // Walk uses a faster animation loop
                const walkFrame = Math.floor(this.animTimer * 6) % 2;
                this.currentSprite = walkFrame === 0 ? this.images.idle : (this.images.idle2 || this.images.idle);
                break;
            default:
                this.currentSprite = idleImg;
                break;
        }
    }

    /**
     * Draw a coloured placeholder silhouette when no sprite is loaded.
     * Drawn in local coords (0,0 = feet).
     */
    _drawPlaceholder (ctx, noHead = false) {
        const bodyColor = this.isPlayerOne ? '#3366CC' : '#CC3333';
        const headR     = 28;

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-35, -220, 70, 160);

        // Head
        if (!noHead) {
            ctx.beginPath();
            ctx.arc(0, -220 - headR, headR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Legs
        ctx.fillRect(-30, -60, 24, 60);
        ctx.fillRect(6,   -60, 24, 60);

        // Arms (slightly extended when attacking)
        const armExtend = (this.state === FighterState.ATTACK ||
                           this.state === FighterState.AIR_ATTACK ||
                           this.state === FighterState.SPECIAL_ATTACK) ? 50 : 15;
        ctx.fillRect(35, -210, armExtend, 18);
        ctx.fillRect(-35 - 15, -200, 15, 18);

        // Blocking shield indicator
        if (this.state === FighterState.BLOCKING) {
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth   = 4;
            ctx.beginPath();
            ctx.arc(0, -130, 65, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * Draw a subtle swoosh arc in the direction the fighter is attacking.
     */
    _drawAttackArc (ctx, drawX, drawY) {
        const progress = 1 - (this.attackTimer / this.attackDuration);  // 0 → 1
        if (progress > 0.7) return;  // only show arc in first 70%

        const dir     = this.facingRight ? 1 : -1;
        const arcX    = drawX + dir * 60;
        const arcY    = drawY - 140;
        const radius  = this.state === FighterState.SPECIAL_ATTACK ? 100 : 70;
        const startA  = this.facingRight ? -Math.PI * 0.6 : Math.PI * 0.6;
        const sweep   = dir * Math.PI * 0.8 * (1 - progress);

        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - progress);
        ctx.strokeStyle = this.state === FighterState.SPECIAL_ATTACK
            ? '#FF4500'
            : '#FFFFFF';
        ctx.lineWidth = this.state === FighterState.SPECIAL_ATTACK ? 8 : 4;
        ctx.lineCap   = 'round';
        ctx.beginPath();
        ctx.arc(arcX, arcY, radius, startA, startA + sweep, !this.facingRight);
        ctx.stroke();
        ctx.restore();
    }
}
