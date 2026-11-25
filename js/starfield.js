/* =========================================================
   starfield.js — Animated starfield background
   Extracted & modularised from Background_Layer.html

   Auto-initialises when the DOM is ready.
   Requires: <canvas id="starfield"> in the document.
   ========================================================= */

'use strict';

const Starfield = (() => {

    let canvas, ctx, width, height;
    let stars         = [];
    let shootingStars = [];

    const STAR_COUNT = 320;

    // ── Star class ────────────────────────────────────────

    class Star {
        constructor() {
            this.reset();
            // Distribute vertically on first spawn
            this.y = Math.random() * height;
        }

        reset() {
            this.x          = Math.random() * width;
            this.y          = Math.random() * height;
            this.size       = Math.random() * 2;
            this.blinkSpeed = 0.01 + Math.random() * 0.03;
            this.opacity    = Math.random();
            this.direction  = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.opacity += this.blinkSpeed * this.direction;
            if (this.opacity >= 1 || this.opacity <= 0.1) this.direction *= -1;
            // Slow upward drift
            this.y -= 0.08;
            if (this.y < 0) this.y = height;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 230, 240, ${this.opacity})`;
            ctx.fill();
        }
    }

    // ── Shooting Star class ───────────────────────────────

    class ShootingStar {
        constructor() { this.reset(); }

        reset() {
            this.x      = Math.random() * width * 1.5;
            this.y      = 0;
            this.length = 80 + Math.random() * 120;
            this.speed  = 5  + Math.random() * 4;
            this.active = false;
            this.timer  = 60 + Math.random() * 300;
        }

        update() {
            if (this.active) {
                this.x -= this.speed;
                this.y += this.speed;
                if (this.x < -this.length || this.y > height + this.length) {
                    this.active = false;
                    this.reset();
                }
            } else {
                this.timer--;
                if (this.timer <= 0) {
                    this.active = true;
                    this.x = width * 0.5 + Math.random() * width * 0.8;
                    this.y = -50;
                }
            }
        }

        draw() {
            if (!this.active) return;
            const grad = ctx.createLinearGradient(
                this.x,              this.y,
                this.x + this.length, this.y - this.length
            );
            grad.addColorStop(0, 'rgba(255, 210, 230, 0.9)');
            grad.addColorStop(1, 'rgba(255, 210, 230, 0)');

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.length, this.y - this.length);
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 2.5;
            ctx.stroke();
        }
    }

    // ── Core ──────────────────────────────────────────────

    function resize() {
        width = canvas.width  = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => { s.update(); s.draw(); });
        shootingStars.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('starfield');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());
        shootingStars.push(new ShootingStar(), new ShootingStar(), new ShootingStar());

        animate();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => Starfield.init());
