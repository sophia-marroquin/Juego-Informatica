/* Procedural Canvas Texture Generator for Horror Assets */

class TextureGenerator {
    static finalize(canvas, repeatX = 1, repeatY = 1) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = 4;
        return texture;
    }

    static addNoise(ctx, w, h, amount, alpha = 0.15) {
        for (let i = 0; i < amount; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 2 + 1;
            const v = Math.floor(Math.random() * 60);
            ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        }
    }

    static addCracks(ctx, w, h, count, color = 'rgba(0,0,0,0.75)') {
        ctx.strokeStyle = color;
        for (let c = 0; c < count; c++) {
            ctx.lineWidth = Math.random() * 2 + 1;
            let cx = Math.random() * w;
            let cy = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            for (let seg = 0; seg < 6; seg++) {
                cx += (Math.random() - 0.5) * 46;
                cy += (Math.random() - 0.5) * 46;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
    }

    static createWallTexture(theme = 'brick', variant = 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const palettes = {
            brick: ['#2b252b', '#312a30'],
            plaster: ['#2d2c33', '#343139'],
            tile: ['#202b2e', '#253133'],
            stone: ['#1f1e24', '#26242b'],
            metal: ['#23272c', '#282d34']
        };
        const base = palettes[theme] ? palettes[theme][variant % 2] : '#242428';

        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 512, 512);

        if (theme === 'brick') {
            ctx.strokeStyle = 'rgba(8, 7, 10, 0.95)';
            ctx.lineWidth = 5;
            const bh = 34, bw = 68;
            for (let y = 0; y < 512; y += bh) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y);
                ctx.stroke();
                const off = (Math.floor(y / bh) % 2) * (bw / 2);
                for (let x = off; x < 512; x += bw) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + bh);
                    ctx.stroke();
                }
            }
            // Mortar highlight
            ctx.strokeStyle = 'rgba(120, 110, 105, 0.08)';
            ctx.lineWidth = 1;
            for (let y = 2; y < 512; y += bh) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y);
                ctx.stroke();
            }
        } else if (theme === 'plaster') {
            // Peeling paint: small irregular patches instead of huge blobs
            for (let i = 0; i < 30; i++) {
                const px = Math.random() * 512;
                const py = Math.random() * 512;
                const pw = 7 + Math.random() * 26;
                const ph = 5 + Math.random() * 18;
                ctx.fillStyle = `rgba(${20 + Math.random() * 14}, ${19 + Math.random() * 12}, ${21 + Math.random() * 12}, ${0.18 + Math.random() * 0.25})`;
                ctx.beginPath();
                ctx.ellipse(px, py, pw, ph, Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(120, 112, 96, 0.05)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            // Large faded damp areas
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = 'rgba(14, 16, 14, 0.14)';
                ctx.beginPath();
                ctx.ellipse(Math.random() * 512, Math.random() * 512, 60 + Math.random() * 90, 40 + Math.random() * 70, Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            TextureGenerator.addCracks(ctx, 512, 512, 7);
        } else if (theme === 'tile') {
            const tileSize = 64;
            ctx.strokeStyle = 'rgba(10, 14, 15, 0.9)';
            ctx.lineWidth = 4;
            for (let x = 0; x <= 512; x += tileSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y <= 512; y += tileSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
            // Grime streaks
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = 'rgba(40, 55, 48, 0.18)';
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 20 + Math.random() * 90);
            }
        } else if (theme === 'stone') {
            ctx.strokeStyle = 'rgba(6, 5, 8, 0.95)';
            ctx.lineWidth = 6;
            for (let y = 0; y < 512; y += 64) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
                const off = (Math.floor(y / 64) % 2) * 64;
                for (let x = off; x < 512 + 64; x += 128) {
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 64); ctx.stroke();
                }
            }
            TextureGenerator.addCracks(ctx, 512, 512, 8, 'rgba(0,0,0,0.85)');
        } else if (theme === 'metal') {
            ctx.strokeStyle = 'rgba(10, 12, 15, 0.95)';
            ctx.lineWidth = 4;
            for (let y = 0; y < 512; y += 128) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
            for (let x = 0; x < 512; x += 256) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            // Rivets
            for (let x = 20; x < 512; x += 42) {
                for (let y = 20; y < 512; y += 42) {
                    ctx.fillStyle = 'rgba(90, 95, 100, 0.35)';
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Rust
            for (let i = 0; i < 28; i++) {
                ctx.fillStyle = `rgba(${70 + Math.random() * 30}, ${40 + Math.random() * 18}, 20, ${0.03 + Math.random() * 0.09})`;
                ctx.beginPath();
                ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 9 + 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // General damp stains and drips
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 380;
            ctx.fillStyle = 'rgba(10, 12, 8, 0.22)';
            ctx.beginPath();
            ctx.ellipse(x, y, 10 + Math.random() * 40, 4 + Math.random() * 18, 0, 0, Math.PI * 2);
            ctx.fill();
            if (Math.random() < 0.5) {
                ctx.fillRect(x - 1, y, 2 + Math.random() * 3, 20 + Math.random() * 80);
            }
        }

        // Occasional blood smear
        if (Math.random() < 0.55) {
            const bx = 70 + Math.random() * 370;
            const by = 90 + Math.random() * 330;
            ctx.fillStyle = 'rgba(96, 8, 8, 0.55)';
            ctx.beginPath();
            ctx.arc(bx, by, 12 + Math.random() * 22, 0, Math.PI * 2);
            ctx.fill();
            for (let d = 0; d < 7; d++) {
                ctx.fillStyle = 'rgba(90, 6, 6, 0.45)';
                ctx.fillRect(bx + (Math.random() * 24 - 12), by, 1 + Math.random() * 3, 15 + Math.random() * 60);
            }
        }

        TextureGenerator.addNoise(ctx, 512, 512, 7000, 0.1);
        return TextureGenerator.finalize(canvas);
    }

    static createFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#0a0a0e';
        ctx.lineWidth = 6;
        const tile = 64;
        for (let x = 0; x <= 512; x += tile) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
        }
        for (let y = 0; y <= 512; y += tile) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
        }

        const img = ctx.getImageData(0, 0, 512, 512);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const n = (Math.random() - 0.5) * 24;
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);

        TextureGenerator.addCracks(ctx, 512, 512, 7, 'rgba(0,0,0,0.8)');

        // Dark puddles
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = 'rgba(5, 8, 10, 0.5)';
            ctx.beginPath();
            ctx.ellipse(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        return TextureGenerator.finalize(canvas);
    }

    static createRoomFloorTexture(theme = 'concrete') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        if (theme === 'wood') {
            ctx.fillStyle = '#241b14';
            ctx.fillRect(0, 0, 512, 512);
            for (let y = 0; y < 512; y += 42) {
                const tone = Math.random();
                ctx.fillStyle = `rgba(${34 + tone * 14}, ${24 + tone * 9}, ${17 + tone * 7}, 0.9)`;
                ctx.fillRect(0, y, 512, 38);
                ctx.strokeStyle = 'rgba(10, 6, 4, 0.9)';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
                for (let i = 0; i < 6; i++) {
                    ctx.strokeStyle = 'rgba(15, 10, 7, 0.22)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * 512, y + 4);
                    ctx.bezierCurveTo(Math.random() * 512, y + 14, Math.random() * 512, y + 24, Math.random() * 512, y + 34);
                    ctx.stroke();
                }
            }
        } else if (theme === 'tile') {
            ctx.fillStyle = '#20272a';
            ctx.fillRect(0, 0, 512, 512);
            const s = 64;
            for (let y = 0; y < 512; y += s) {
                for (let x = 0; x < 512; x += s) {
                    const light = (x / s + y / s) % 2 === 0;
                    ctx.fillStyle = light ? '#232b2d' : '#1a2124';
                    ctx.fillRect(x, y, s, s);
                }
            }
            ctx.strokeStyle = 'rgba(8, 10, 12, 0.9)';
            ctx.lineWidth = 3;
            for (let x = 0; x <= 512; x += s) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y <= 512; y += s) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
        } else if (theme === 'stone') {
            ctx.fillStyle = '#17161b';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = 'rgba(6, 5, 8, 0.95)';
            ctx.lineWidth = 5;
            for (let y = 0; y < 512; y += 86) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
                const off = (Math.floor(y / 86) % 2) * 60;
                for (let x = off; x < 512 + 60; x += 120) {
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 86); ctx.stroke();
                }
            }
            TextureGenerator.addCracks(ctx, 512, 512, 8);
        } else if (theme === 'metal') {
            ctx.fillStyle = '#1a1d21';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = 'rgba(8, 10, 12, 0.9)';
            ctx.lineWidth = 4;
            for (let x = 0; x < 512; x += 128) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y < 512; y += 128) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
            // Hazard stripes
            for (let x = -64; x < 512; x += 96) {
                ctx.fillStyle = 'rgba(150, 120, 20, 0.18)';
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 30, 0);
                ctx.lineTo(x - 30, 512);
                ctx.lineTo(x - 60, 512);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#15151a';
            ctx.fillRect(0, 0, 512, 512);
        }

        TextureGenerator.addNoise(ctx, 512, 512, 7000, 0.12);
        return TextureGenerator.finalize(canvas);
    }

    static createCarpetTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#2e1114';
        ctx.fillRect(0, 0, 256, 1024);

        // Dark outer border
        ctx.strokeStyle = '#180a0c';
        ctx.lineWidth = 22;
        ctx.strokeRect(11, 11, 234, 1002);

        // Gold trim lines running the length of the runner
        ctx.strokeStyle = 'rgba(158, 112, 62, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 196, 964);

        // Simple central medallion
        ctx.strokeStyle = 'rgba(158, 112, 62, 0.28)';
        ctx.lineWidth = 3;
        for (const cy of [256, 512, 768]) {
            ctx.beginPath();
            ctx.moveTo(128, cy - 70);
            ctx.lineTo(188, cy);
            ctx.lineTo(128, cy + 70);
            ctx.lineTo(68, cy);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(128, cy, 34, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Wear and grime
        for (let i = 0; i < 1400; i++) {
            ctx.fillStyle = `rgba(12, 6, 7, ${Math.random() * 0.14})`;
            ctx.fillRect(Math.random() * 256, Math.random() * 1024, 1 + Math.random() * 5, 1 + Math.random() * 9);
        }

        return TextureGenerator.finalize(canvas);
    }

    static createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#232227';
        ctx.fillRect(0, 0, 512, 512);

        // Mottled mineral patches
        for (let i = 0; i < 340; i++) {
            const v = 32 + Math.random() * 26;
            ctx.fillStyle = `rgba(${v}, ${v - 2}, ${v + 4}, ${0.04 + Math.random() * 0.12})`;
            ctx.beginPath();
            ctx.ellipse(
                Math.random() * 512,
                Math.random() * 512,
                6 + Math.random() * 44,
                4 + Math.random() * 26,
                Math.random() * 3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Damp stains
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(12, 13, 16, 0.18)';
            ctx.beginPath();
            ctx.ellipse(Math.random() * 512, Math.random() * 512, 40 + Math.random() * 70, 25 + Math.random() * 50, Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        TextureGenerator.addCracks(ctx, 512, 512, 6);
        TextureGenerator.addNoise(ctx, 512, 512, 5000, 0.12);
        return TextureGenerator.finalize(canvas);
    }

    static createCeilingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0c0b10';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#080709';
        ctx.fillRect(0, 0, 256, 18);
        ctx.fillRect(0, 118, 256, 18);
        ctx.fillRect(0, 238, 256, 18);

        TextureGenerator.addNoise(ctx, 256, 256, 3500, 0.18);
        return TextureGenerator.finalize(canvas);
    }

    static createDoorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#171b21';
        ctx.fillRect(0, 0, 256, 512);

        // Brushed metal streaks
        for (let i = 0; i < 140; i++) {
            ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${66 + Math.random() * 40}, ${74 + Math.random() * 40}, 0.08)`;
            ctx.lineWidth = 1;
            const sx = Math.random() * 256;
            ctx.beginPath();
            ctx.moveTo(sx, Math.random() * 512);
            ctx.lineTo(sx + (Math.random() - 0.5) * 4, Math.random() * 512);
            ctx.stroke();
        }

        ctx.strokeStyle = '#0c0d10';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 242, 498);

        ctx.strokeStyle = '#101318';
        ctx.lineWidth = 5;
        ctx.strokeRect(26, 32, 204, 196);
        ctx.strokeRect(26, 258, 204, 222);

        // Reinforced bands
        ctx.fillStyle = '#1d2228';
        ctx.fillRect(0, 150, 256, 18);
        ctx.fillRect(0, 400, 256, 18);
        ctx.fillStyle = 'rgba(80, 88, 96, 0.5)';
        for (let x = 16; x < 256; x += 24) {
            ctx.beginPath();
            ctx.arc(x, 159, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, 409, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Central seam
        ctx.strokeStyle = '#08090b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(128, 20);
        ctx.lineTo(128, 492);
        ctx.stroke();

        // Rust patches
        for (let i = 0; i < 32; i++) {
            ctx.fillStyle = `rgba(${70 + Math.random() * 26}, ${40 + Math.random() * 16}, 22, ${0.03 + Math.random() * 0.08})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 512, Math.random() * 9 + 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bloody handprint
        ctx.fillStyle = 'rgba(120, 8, 8, 0.6)';
        ctx.beginPath();
        ctx.ellipse(168, 210, 14, 20, 0.2, 0, Math.PI * 2);
        ctx.fill();
        for (let f = 0; f < 5; f++) {
            ctx.fillRect(156 + f * 6, 180 + (f % 2) * 3, 4, 18);
        }

        // Faded stencil near the bottom (the illuminated sign does the real work)
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#c9bd8a';
        ctx.font = 'bold 30px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SALIDA', 128, 470);
        ctx.restore();

        return TextureGenerator.finalize(canvas);
    }

    static createRugTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#301318';
        ctx.fillRect(0, 0, 256, 256);

        // Worn border
        ctx.strokeStyle = '#170a0c';
        ctx.lineWidth = 14;
        ctx.strokeRect(12, 12, 232, 232);
        ctx.strokeStyle = 'rgba(150, 96, 52, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(28, 28, 200, 200);

        // Repeated diamond motif
        ctx.strokeStyle = 'rgba(170, 120, 70, 0.18)';
        ctx.lineWidth = 3;
        for (let y = 52; y < 230; y += 52) {
            for (let x = 52; x < 230; x += 52) {
                ctx.beginPath();
                ctx.moveTo(x, y - 18);
                ctx.lineTo(x + 18, y);
                ctx.lineTo(x, y + 18);
                ctx.lineTo(x - 18, y);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Grime and wear
        for (let i = 0; i < 700; i++) {
            ctx.fillStyle = `rgba(15, 8, 8, ${Math.random() * 0.16})`;
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 6, 1 + Math.random() * 6);
        }

        return TextureGenerator.finalize(canvas);
    }

    static createHazardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#3a3410';
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = '#0f0e0a';
        for (let x = -256; x < 512; x += 92) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 46, 0);
            ctx.lineTo(x - 46, 256);
            ctx.lineTo(x - 92, 256);
            ctx.closePath();
            ctx.fill();
        }

        // Worn edges and grime
        for (let i = 0; i < 260; i++) {
            ctx.fillStyle = `rgba(30, 26, 12, ${Math.random() * 0.25})`;
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 8, 2 + Math.random() * 8);
        }

        return TextureGenerator.finalize(canvas);
    }

    static createExitSignTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 192;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#04140b';
        ctx.fillRect(0, 0, 512, 192);

        ctx.strokeStyle = '#2bff8f';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 492, 172);

        ctx.font = 'bold 86px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5dffab';
        ctx.shadowColor = '#2bff8f';
        ctx.shadowBlur = 24;
        ctx.fillText('SALIDA', 256, 100);

        return TextureGenerator.finalize(canvas);
    }

    static createRelicTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, 256, 256);

        ctx.strokeStyle = '#33e0ff';
        ctx.shadowColor = '#33e0ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 6;

        ctx.beginPath(); ctx.arc(128, 128, 80, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(128, 30); ctx.lineTo(210, 180); ctx.lineTo(46, 180);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 128, 35, 0, Math.PI * 2); ctx.stroke();

        return TextureGenerator.finalize(canvas);
    }

    static createBatteryTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#111';
        for (let x = -128; x < 256; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x + 16, 0);
            ctx.lineTo(x - 16, 128); ctx.lineTo(x - 32, 128);
            ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(10, 40, 108, 48);
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#c0392b';
        ctx.textAlign = 'center';
        ctx.fillText('POWER', 64, 70);

        return TextureGenerator.finalize(canvas);
    }

    static createGraffitiTexture(phrase, color = '#8b1212') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 512, 256);
        ctx.save();
        ctx.translate(256, 128);
        ctx.rotate((Math.random() - 0.5) * 0.14);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 72px Impact, "Arial Black", sans-serif';

        // Dark outline for readability against grime
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 9;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.strokeText(phrase, 0, 0, 460);

        // Fade / weathered look
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = color;
        ctx.fillText(phrase, 0, 0, 460);

        // Paint drips
        ctx.globalAlpha = 0.55;
        const metricsWidth = Math.min(460, ctx.measureText(phrase).width);
        for (let i = 0; i < 10; i++) {
            const dx = (Math.random() - 0.5) * metricsWidth;
            const len = 10 + Math.random() * 48;
            ctx.fillRect(dx, 30, 2 + Math.random() * 3, len);
        }

        // A few scratches that break up the paint
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        for (let i = 0; i < 3; i++) {
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            const sy = (Math.random() - 0.5) * 90;
            ctx.moveTo(-260, sy);
            ctx.lineTo(260, sy + (Math.random() - 0.5) * 18);
            ctx.stroke();
        }

        ctx.restore();
        return TextureGenerator.finalize(canvas);
    }

    static createNoteTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Aged paper
        const grad = ctx.createLinearGradient(0, 0, 192, 256);
        grad.addColorStop(0, '#cfc4a0');
        grad.addColorStop(1, '#a89c78');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 192, 256);

        // Stains
        for (let i = 0; i < 16; i++) {
            ctx.fillStyle = `rgba(110, 80, 40, ${0.04 + Math.random() * 0.1})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 192, Math.random() * 256, Math.random() * 22 + 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Torn edge
        ctx.fillStyle = 'rgba(20, 15, 10, 0.35)';
        for (let y = 0; y < 256; y += 12) {
            ctx.fillRect(0, y, 4 + Math.random() * 7, 8);
            ctx.fillRect(192 - (4 + Math.random() * 7), y + 6, 9, 8);
        }

        // Faux handwriting
        ctx.strokeStyle = 'rgba(35, 25, 18, 0.75)';
        ctx.lineWidth = 1.5;
        for (let line = 0; line < 12; line++) {
            const y = 34 + line * 16;
            ctx.beginPath();
            ctx.moveTo(20, y);
            for (let x = 20; x < 172; x += 12) {
                ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
            }
            ctx.stroke();
        }

        // Red fingerprint
        ctx.strokeStyle = 'rgba(110, 10, 10, 0.5)';
        ctx.lineWidth = 2;
        for (let r = 3; r < 12; r += 3) {
            ctx.beginPath();
            ctx.ellipse(150, 210, r, r * 0.8, 0.4, 0, Math.PI * 2);
            ctx.stroke();
        }

        return TextureGenerator.finalize(canvas);
    }

    static createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#3a2a1c';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) {
            ctx.strokeStyle = `rgba(${20 + Math.random() * 30}, ${14 + Math.random() * 20}, 8, 0.35)`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(0, Math.random() * 256);
            ctx.bezierCurveTo(70, Math.random() * 256, 180, Math.random() * 256, 256, Math.random() * 256);
            ctx.stroke();
        }
        TextureGenerator.addNoise(ctx, 256, 256, 2000, 0.14);
        return TextureGenerator.finalize(canvas);
    }

    static createBlueprintTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#12202a';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(120, 200, 220, 0.55)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= 256; x += 16) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
        }
        for (let y = 0; y <= 256; y += 16) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200, 235, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(28, 34, 200, 188);
        ctx.strokeRect(60, 70, 70, 60);
        ctx.beginPath();
        ctx.moveTo(28, 130); ctx.lineTo(228, 130);
        ctx.stroke();
        ctx.fillStyle = 'rgba(90, 220, 120, 0.9)';
        ctx.fillRect(206, 120, 16, 16);

        return TextureGenerator.finalize(canvas);
    }
}
