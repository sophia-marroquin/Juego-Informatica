/* Main Game Engine for 3D Indie Horror Game */

class HorrorGame {
    constructor() {
        // Core Three.js Objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Game Components
        this.map = null;
        this.monster = null;
        this.flashlight = null;
        this.flashlightTarget = null;
        this.raycaster = new THREE.Raycaster();
        this.dust = null;

        // Game States: MENU | PLAYING | NOTE | MAP | JUMPSCARE | GAMEOVER | VICTORY
        this.state = 'MENU';

        // Gameplay Metrics
        this.stamina = 100;
        this.maxStamina = 100;
        this.battery = 100;
        this.maxBattery = 100;
        this.relicsCollected = 0;
        this.totalRelics = 5;
        this.batteriesUsed = 0;
        this.notesRead = 0;
        this.startTime = 0;

        // Knowledge / map progression
        this.hasMap = false;
        this.revealedRelics = new Set();
        this.activeNote = null;

        // Player state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.isFlashlightOn = true;
        this.velocity = new THREE.Vector3();
        this.bobTime = 0;
        this.footstepTimer = 0;
        this.baseFov = 75;

        // Interaction
        this.currentTarget = null;

        // Fallback look control (used if Pointer Lock is unavailable)
        this.isDragging = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // 1. Scene & fog
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x040308);
        this.scene.fog = new THREE.FogExp2(0x050409, 0.036);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.03;

        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // 4. Ambient light
        this.scene.add(new THREE.AmbientLight(0x3c4050, 0.7));
        this.scene.add(new THREE.HemisphereLight(0x27303c, 0x070707, 0.6));

        // 5. Flashlight
        this.flashlightTarget = new THREE.Object3D();
        this.scene.add(this.flashlightTarget);

        this.flashlight = new THREE.SpotLight(0xfff5e0, 3.8, 32, Math.PI / 4.8, 0.8, 1.2);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 0.5;
        this.flashlight.shadow.camera.far = 36;
        this.flashlight.target = this.flashlightTarget;
        this.scene.add(this.flashlight);

        // 6. Controls
        this.controls = new THREE.PointerLockControls(this.camera, document.body);

        // 7. Labyrinth & world
        this.map = new LabyrinthMap(this.scene);
        this.map.buildMap();
        this.totalRelics = this.map.relicObjects.length;

        // 8. Player start
        this.camera.position.copy(this.map.playerStartPosition);
        this.camera.rotation.set(0, -Math.PI / 2, 0);

        // 9. Monster
        this.monster = new ShadowMonster(this.scene, this.map.monsterColliders, this.map);

        // 10. Floating dust
        this.createDust();

        this.updateHUD();
        this.setupEventListeners();

        window.addEventListener('resize', () => this.onWindowResize());

        this.animate();
    }

    createDust() {
        const count = 450;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = Math.random() * this.map.cols * 4;
            positions[i * 3 + 1] = 0.4 + Math.random() * 4.2;
            positions[i * 3 + 2] = Math.random() * this.map.rows * 4;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x8fa3b8,
            size: 0.055,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.dust = new THREE.Points(geo, mat);
        this.scene.add(this.dust);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('retry-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('map-close-btn').addEventListener('click', () => this.closeMap());
        document.getElementById('note-close-btn').addEventListener('click', () => this.closeNote());

        // Fallback look when Pointer Lock is not available
        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => {
            if (this.state !== 'PLAYING') return;

            if (!this.controls.isLocked) {
                try { this.controls.lock(); } catch (err) { /* Pointer Lock unavailable */ }
                this.isDragging = true;
                this.lastPointerX = e.clientX;
                this.lastPointerY = e.clientY;
            }
        });

        window.addEventListener('pointerup', () => { this.isDragging = false; });

        window.addEventListener('pointermove', (e) => {
            if (this.state !== 'PLAYING' || !this.isDragging || this.controls.isLocked) return;

            const movementX = e.clientX - this.lastPointerX;
            const movementY = e.clientY - this.lastPointerY;
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;

            this.lookEuler.setFromQuaternion(this.camera.quaternion);
            this.lookEuler.y -= movementX * 0.0025;
            this.lookEuler.x -= movementY * 0.0025;
            this.lookEuler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.lookEuler.x));
            this.camera.quaternion.setFromEuler(this.lookEuler);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Game flow                                                          */
    /* ------------------------------------------------------------------ */
    startGame() {
        window.horrorAudio.init();
        window.horrorAudio.resetWhistles();
        document.getElementById('start-screen').classList.remove('active');
        try { this.controls.lock(); } catch (err) { /* Pointer Lock unavailable */ }
        this.state = 'PLAYING';
        this.startTime = performance.now();
        this.warnIfNoPointerLock();
    }

    warnIfNoPointerLock() {
        setTimeout(() => {
            if (this.state === 'PLAYING' && !this.controls.isLocked) {
                this.showToast('Arrastra el ratón para mirar · Pulsa M para el mapa');
            }
        }, 700);
    }

    restartGame() {
        // Metrics
        this.stamina = 100;
        this.battery = 100;
        this.relicsCollected = 0;
        this.batteriesUsed = 0;
        this.notesRead = 0;
        this.isFlashlightOn = true;
        this.hasMap = false;
        this.revealedRelics = new Set();
        this.activeNote = null;
        if (window.horrorAudio) window.horrorAudio.resetWhistles();

        // Input
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.velocity.set(0, 0, 0);
        this.bobTime = 0;
        this.footstepTimer = 0;
        this.camera.fov = this.baseFov;
        this.camera.updateProjectionMatrix();

        // UI
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('victory-screen').classList.remove('active');
        document.getElementById('jumpscare-overlay').classList.remove('active');
        document.getElementById('note-overlay').classList.remove('active');
        document.getElementById('map-overlay').classList.remove('active');
        document.getElementById('crosshair').style.display = '';
        document.getElementById('danger-overlay').style.opacity = 0;
        document.getElementById('map-status').innerText = 'PLANO: NO ENCONTRADO';

        // World state
        this.map.relicObjects.forEach(r => {
            r.collected = false;
            r.group.visible = true;
        });
        this.map.batteryObjects.forEach(b => {
            b.collected = false;
            b.group.visible = true;
        });
        this.map.notes.forEach(n => {
            n.read = false;
            n.material.opacity = 1;
        });
        if (this.map.mapPickup) {
            this.map.mapPickup.collected = false;
            this.map.mapPickup.group.visible = true;
        }
        this.map.updateDoorSeals(0);

        // Player & monster
        this.camera.position.copy(this.map.playerStartPosition);
        this.camera.rotation.set(0, -Math.PI / 2, 0);
        this.flashlight.visible = true;
        this.flashlight.intensity = 3.8;

        this.monster.mesh.position.copy(this.map.monsterSpawn);
        this.monster.mesh.rotation.set(0, 0, 0);
        this.monster.state = 'PATROL';
        this.monster.path = [];
        this.monster.pathTimer = 0;
        this.monster.getNewPatrolTarget();

        this.updateHUD();

        try { this.controls.lock(); } catch (err) { /* Pointer Lock unavailable */ }
        this.state = 'PLAYING';
        this.startTime = performance.now();
        this.warnIfNoPointerLock();
    }

    showToast(message, duration = 3400) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerText = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
    }

    /* ------------------------------------------------------------------ */
    /*  Input                                                              */
    /* ------------------------------------------------------------------ */
    onKeyDown(event) {
        if (this.state === 'NOTE') {
            if (event.code === 'KeyE' || event.code === 'Escape' || event.code === 'Space') {
                this.closeNote();
            }
            return;
        }

        if (this.state === 'MAP') {
            if (event.code === 'KeyM' || event.code === 'Escape' || event.code === 'KeyE') {
                this.closeMap();
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isSprinting = true;
                break;
            case 'KeyF':
                this.toggleFlashlight();
                break;
            case 'KeyE':
                this.interact();
                break;
            case 'KeyM':
                this.openMap();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isSprinting = false;
                break;
        }
    }

    toggleFlashlight() {
        if (this.battery > 0) {
            this.isFlashlightOn = !this.isFlashlightOn;
            this.flashlight.visible = this.isFlashlightOn;
            window.horrorAudio.playFlashlightClick();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Movement & collision                                               */
    /* ------------------------------------------------------------------ */
    collidesAt(x, z, radius = 0.58) {
        const playerBox = new THREE.Box3(
            new THREE.Vector3(x - radius, 0.25, z - radius),
            new THREE.Vector3(x + radius, 3.0, z + radius)
        );

        for (let i = 0; i < this.map.colliders.length; i++) {
            if (playerBox.intersectsBox(this.map.colliders[i])) return true;
        }
        return false;
    }

    updatePlayerMovement(delta) {
        if (this.state !== 'PLAYING') return;

        const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;

        // Stamina
        if (this.isSprinting && isMoving && this.stamina > 0) {
            this.stamina = Math.max(0, this.stamina - delta * 26);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + delta * 16);
        }

        const canSprint = this.isSprinting && this.stamina > 4 && isMoving;
        const speed = canSprint ? 8.2 : 4.6;

        // Camera-relative movement direction
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const wish = new THREE.Vector3();
        if (this.moveForward) wish.add(forward);
        if (this.moveBackward) wish.sub(forward);
        if (this.moveRight) wish.add(right);
        if (this.moveLeft) wish.sub(right);
        if (wish.lengthSq() > 0) wish.normalize();

        // Smooth acceleration / friction
        const accel = wish.lengthSq() > 0 ? 14 : 10;
        const blend = Math.min(1, accel * delta);
        this.velocity.x += (wish.x * speed - this.velocity.x) * blend;
        this.velocity.z += (wish.z * speed - this.velocity.z) * blend;
        if (Math.abs(this.velocity.x) < 0.02) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.02) this.velocity.z = 0;

        // Sub-stepped collision so fast movement never tunnels through walls
        const dx = this.velocity.x * delta;
        const dz = this.velocity.z * delta;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
        const stepX = dx / steps;
        const stepZ = dz / steps;

        for (let i = 0; i < steps; i++) {
            if (stepX !== 0) {
                if (!this.collidesAt(this.camera.position.x + stepX, this.camera.position.z)) {
                    this.camera.position.x += stepX;
                } else {
                    this.velocity.x = 0;
                }
            }
            if (stepZ !== 0) {
                if (!this.collidesAt(this.camera.position.x, this.camera.position.z + stepZ)) {
                    this.camera.position.z += stepZ;
                } else {
                    this.velocity.z = 0;
                }
            }
        }

        // Head bob
        const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (planarSpeed > 0.5) {
            this.bobTime += delta * (canSprint ? 14 : 9.5);
        } else {
            this.bobTime += delta * 2;
        }
        const bobAmount = planarSpeed > 0.5 ? (canSprint ? 0.06 : 0.038) : 0.008;
        this.camera.position.y = 1.6 + Math.sin(this.bobTime) * bobAmount;

        // Sprint FOV kick
        const targetFov = canSprint ? this.baseFov + 7 : this.baseFov;
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
            this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 7);
            this.camera.updateProjectionMatrix();
        }

        // Flashlight follows camera
        this.flashlight.position.copy(this.camera.position);
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir);
        this.flashlightTarget.position.copy(this.camera.position).add(lookDir.multiplyScalar(12));

        // Footsteps
        if (isMoving && planarSpeed > 0.8) {
            this.footstepTimer += delta;
            const interval = canSprint ? 0.31 : 0.52;
            if (this.footstepTimer > interval) {
                window.horrorAudio.playFootstep(canSprint);
                this.footstepTimer = 0;
            }
        }
    }

    updateFlashlightBattery(delta) {
        if (this.isFlashlightOn && this.battery > 0) {
            this.battery = Math.max(0, this.battery - delta * 1.1); // ~90 seconds

            if (this.battery < 20 && Math.random() < 0.12) {
                this.flashlight.intensity = 1.2 + Math.random() * 2.4;
            } else if (this.battery === 0) {
                this.isFlashlightOn = false;
                this.flashlight.visible = false;
                window.horrorAudio.playFlashlightClick();
                this.showToast('La linterna se ha apagado... encuentra una batería.');
            } else {
                this.flashlight.intensity = 3.8;
            }
        }
        this.updateHUD();
    }

    /* ------------------------------------------------------------------ */
    /*  Interaction                                                        */
    /* ------------------------------------------------------------------ */
    checkRaycastInteractions() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const playerPos = this.camera.position;
        let foundTarget = null;

        // Relics
        for (const relic of this.map.relicObjects) {
            if (!relic.collected && playerPos.distanceTo(relic.position) < 3.8) {
                if (this.raycaster.intersectObject(relic.mesh, true).length > 0) {
                    foundTarget = { type: 'relic', data: relic, text: '[E] RECOGER RELIQUIA ANCESTRAL' };
                    break;
                }
            }
        }

        // Notes
        if (!foundTarget) {
            for (const note of this.map.notes) {
                if (playerPos.distanceTo(note.position) < 3.1) {
                    if (this.raycaster.intersectObject(note.mesh, true).length > 0) {
                        foundTarget = { type: 'note', data: note, text: '[E] LEER NOTA' };
                        break;
                    }
                }
            }
        }

        // Blueprint / map
        if (!foundTarget && this.map.mapPickup && !this.map.mapPickup.collected) {
            if (playerPos.distanceTo(this.map.mapPickup.position) < 3.2) {
                if (this.raycaster.intersectObject(this.map.mapPickup.group, true).length > 0) {
                    foundTarget = { type: 'map', text: '[E] RECOGER PLANO DEL ASILO' };
                }
            }
        }

        // Batteries
        if (!foundTarget) {
            for (const bat of this.map.batteryObjects) {
                if (!bat.collected && playerPos.distanceTo(bat.position) < 3.2) {
                    if (this.raycaster.intersectObject(bat.group, true).length > 0) {
                        foundTarget = { type: 'battery', data: bat, text: '[E] RECOGER BATERÍA' };
                        break;
                    }
                }
            }
        }

        // Exit door
        if (!foundTarget && this.map.exitDoorMesh) {
            if (playerPos.distanceTo(this.map.exitDoorPosition) < 6.0) {
                if (this.raycaster.intersectObject(this.map.exitDoorMesh, true).length > 0) {
                    if (this.relicsCollected >= this.totalRelics) {
                        foundTarget = { type: 'door', text: '[E] ABRIR LA PUERTA SELLADA' };
                    } else {
                        foundTarget = {
                            type: 'door_locked',
                            text: `SELLADA · FALTAN ${this.totalRelics - this.relicsCollected} RELIQUIAS`
                        };
                    }
                }
            }
        }

        this.currentTarget = foundTarget;

        const promptEl = document.getElementById('interaction-prompt');
        const crosshair = document.getElementById('crosshair');

        if (foundTarget) {
            promptEl.innerText = foundTarget.text;
            promptEl.classList.add('visible');
            crosshair.classList.add('active');
        } else {
            promptEl.classList.remove('visible');
            promptEl.innerText = '';
            crosshair.classList.remove('active');
        }
    }

    interact() {
        if (!this.currentTarget) return;

        const target = this.currentTarget;

        if (target.type === 'relic') {
            const relic = target.data;
            relic.collected = true;
            relic.group.visible = false;
            this.relicsCollected++;
            this.map.updateDoorSeals(this.relicsCollected);
            window.horrorAudio.playPickupSound();
            this.updateHUD();

            if (this.relicsCollected === this.totalRelics) {
                this.showToast('Las cinco reliquias brillan. La puerta sellada de la SALIDA ya puede abrirse.', 5200);
            } else {
                this.showToast(`Reliquia recuperada (${this.relicsCollected}/${this.totalRelics}).`);
            }
        } else if (target.type === 'note') {
            this.openNote(target.data);
        } else if (target.type === 'map') {
            this.collectMap();
        } else if (target.type === 'battery') {
            const bat = target.data;
            bat.collected = true;
            bat.group.visible = false;
            this.battery = Math.min(this.maxBattery, this.battery + 45);
            this.batteriesUsed++;
            this.isFlashlightOn = true;
            this.flashlight.visible = true;
            this.flashlight.intensity = 3.8;
            window.horrorAudio.playPickupSound();
            this.updateHUD();
            this.showToast('Batería recargada.');
        } else if (target.type === 'door') {
            this.triggerVictory();
        }
    }

    openNote(note) {
        this.state = 'NOTE';
        this.activeNote = note;
        this.velocity.set(0, 0, 0);

        document.getElementById('note-title').innerText = note.title;
        document.getElementById('note-text').innerText = note.text;
        document.getElementById('note-overlay').classList.add('active');

        if (!note.read) {
            note.read = true;
            this.notesRead++;
            note.material.opacity = 0.55;
        }

        if (note.relicIndex >= 0) {
            this.revealedRelics.add(note.relicIndex);
        }

        window.horrorAudio.playNoteSound();
    }

    closeNote() {
        document.getElementById('note-overlay').classList.remove('active');
        this.activeNote = null;
        this.state = 'PLAYING';
        try { this.controls.lock(); } catch (err) { /* Pointer Lock unavailable */ }
    }

    collectMap() {
        this.hasMap = true;
        this.map.mapPickup.collected = true;
        this.map.mapPickup.group.visible = false;
        document.getElementById('map-status').innerText = 'PLANO: PULSA [M]';
        window.horrorAudio.playMapSound();
        this.showToast('Plano del Asilo obtenido. Pulsa [M] para consultar la ruta a la SALIDA.', 5000);
    }

    openMap() {
        if (!this.hasMap) {
            this.showToast('Todavía no tienes el plano del asilo. Busca en el Archivo.');
            return;
        }
        this.state = 'MAP';
        this.velocity.set(0, 0, 0);
        document.getElementById('map-overlay').classList.add('active');
        this.drawMap();
        window.horrorAudio.playMapOpenSound();
    }

    closeMap() {
        document.getElementById('map-overlay').classList.remove('active');
        this.state = 'PLAYING';
        try { this.controls.lock(); } catch (err) { /* Pointer Lock unavailable */ }
    }

    drawMap() {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#080d12';
        ctx.fillRect(0, 0, W, H);

        // Paper texture / vignette
        ctx.fillStyle = 'rgba(20, 40, 45, 0.35)';
        ctx.fillRect(0, 0, W, H);

        const pad = 20;
        const s = Math.min((W - pad * 2) / this.map.cols, (H - pad * 2) / this.map.rows);
        const ox = (W - this.map.cols * s) / 2;
        const oy = (H - this.map.rows * s) / 2;

        // Cells
        for (let r = 0; r < this.map.rows; r++) {
            for (let c = 0; c < this.map.cols; c++) {
                const x = ox + c * s;
                const y = oy + r * s;
                if (this.map.grid[r][c] === 1) {
                    ctx.fillStyle = '#2b333b';
                    ctx.fillRect(x, y, s, s);
                } else {
                    ctx.fillStyle = '#111a20';
                    ctx.fillRect(x, y, s, s);
                }
            }
        }

        // Room outlines & names
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const room of this.map.rooms) {
            const x = ox + room.x * s;
            const y = oy + room.y * s;
            const w = room.w * s;
            const h = room.h * s;

            ctx.fillStyle = 'rgba(70, 180, 190, 0.05)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(120, 200, 210, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

            ctx.fillStyle = 'rgba(190, 225, 230, 0.75)';
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.fillText(room.name, x + w / 2, y + h / 2);
        }

        // Exit marker
        const exitRoom = this.map.rooms.find(r => r.id === 'exit');
        if (exitRoom) {
            const ex = ox + (this.map.exitCell.c + 1) * s - 3;
            const ey = oy + this.map.exitCell.r * s;
            ctx.fillStyle = '#33ff99';
            ctx.fillRect(ex, ey, 4, s);
            ctx.font = 'bold 11px "Courier New", monospace';
            ctx.fillStyle = '#8affc2';
            ctx.textAlign = 'right';
            ctx.fillText('SALIDA', ex - 4, ey + s / 2);
            ctx.textAlign = 'center';
        }

        // Revealed relics (thanks to the notes)
        this.map.relicObjects.forEach((relic, index) => {
            if (!this.revealedRelics.has(index) || relic.collected) return;
            const cx = ox + (relic.position.x / this.map.wallSize + 0.5) * s;
            const cy = oy + (relic.position.z / this.map.wallSize + 0.5) * s;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#4de1ff';
            ctx.shadowColor = '#4de1ff';
            ctx.shadowBlur = 8;
            ctx.fillRect(-3.5, -3.5, 7, 7);
            ctx.restore();
        });

        // Read notes
        this.map.notes.forEach(note => {
            if (!note.read) return;
            const cx = ox + (note.position.x / this.map.wallSize + 0.5) * s;
            const cy = oy + (note.position.z / this.map.wallSize + 0.5) * s;
            ctx.fillStyle = 'rgba(230, 210, 140, 0.8)';
            ctx.beginPath();
            ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Player marker
        const px = ox + (this.camera.position.x / this.map.wallSize + 0.5) * s;
        const py = oy + (this.camera.position.z / this.map.wallSize + 0.5) * s;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const angle = Math.atan2(dir.z, dir.x);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff2222';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, 5.5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, -5.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Compass
        ctx.fillStyle = 'rgba(200, 220, 225, 0.6)';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillText('N', W - 26, 22);
        ctx.beginPath();
        ctx.moveTo(W - 26, 30);
        ctx.lineTo(W - 29, 40);
        ctx.lineTo(W - 23, 40);
        ctx.closePath();
        ctx.fill();

        // Grid border
        ctx.strokeStyle = 'rgba(120, 200, 210, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, this.map.cols * s, this.map.rows * s);
    }

    /* ------------------------------------------------------------------ */
    /*  End conditions                                                     */
    /* ------------------------------------------------------------------ */
    triggerJumpscare() {
        this.state = 'JUMPSCARE';
        this.controls.unlock();

        document.getElementById('interaction-prompt').classList.remove('visible');
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('danger-overlay').style.opacity = 0;

        window.horrorAudio.playJumpscare();

        const headPos = this.monster.mesh.position.clone().add(new THREE.Vector3(0, 3.9, 0));
        this.camera.lookAt(headPos);

        document.getElementById('jumpscare-overlay').classList.add('active');

        setTimeout(() => {
            document.getElementById('jumpscare-overlay').classList.remove('active');
            document.getElementById('game-over-screen').classList.add('active');
            this.state = 'GAMEOVER';
        }, 1800);
    }

    triggerVictory() {
        this.state = 'VICTORY';
        this.controls.unlock();

        document.getElementById('interaction-prompt').classList.remove('visible');
        document.getElementById('crosshair').style.display = 'none';

        window.horrorAudio.playVictory();

        const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
        document.getElementById('stat-time').innerText = `${elapsed}s`;
        document.getElementById('stat-relics').innerText = `${this.relicsCollected} / ${this.totalRelics}`;
        document.getElementById('stat-batteries').innerText = this.batteriesUsed;
        document.getElementById('stat-notes').innerText = `${this.notesRead} / ${this.map.notes.length}`;
        document.getElementById('stat-map').innerText = this.hasMap ? 'Sí' : 'No';

        document.getElementById('victory-screen').classList.add('active');
    }

    updateHUD() {
        const staminaPct = Math.max(0, (this.stamina / this.maxStamina) * 100);
        document.getElementById('stamina-bar').style.width = `${staminaPct}%`;

        const batteryPct = Math.max(0, (this.battery / this.maxBattery) * 100);
        const batteryBar = document.getElementById('battery-bar');
        batteryBar.style.width = `${batteryPct}%`;
        batteryBar.style.background = batteryPct < 20
            ? 'linear-gradient(90deg, #c0392b, #e74c3c)'
            : 'linear-gradient(90deg, #d35400, #f39c12)';

        document.getElementById('relic-counter').innerText = `${this.relicsCollected} / ${this.totalRelics}`;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /* ------------------------------------------------------------------ */
    /*  Main loop                                                          */
    /* ------------------------------------------------------------------ */
    updateWhistleAudio() {
        if (!window.horrorAudio || !this.monster) return;

        const forward = this._whistleForward || (this._whistleForward = new THREE.Vector3());
        this.camera.getWorldDirection(forward);

        const dx = this.monster.mesh.position.x - this.camera.position.x;
        const dz = this.monster.mesh.position.z - this.camera.position.z;
        const distance = Math.hypot(dx, dz);

        // Project the monster onto the camera's right vector to place it in the stereo field.
        const horizontal = Math.hypot(forward.x, forward.z) || 1;
        const rightX = -forward.z / horizontal;
        const rightZ = forward.x / horizontal;
        const pan = distance > 0.01 ? (dx * rightX + dz * rightZ) / distance : 0;

        window.horrorAudio.updateWhistles(distance, Math.max(-1, Math.min(1, pan)));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.getElapsedTime();

        if (this.dust) this.dust.rotation.y += delta * 0.004;

        if (this.state === 'PLAYING') {
            this.updatePlayerMovement(delta);
            this.updateFlashlightBattery(delta);
            this.checkRaycastInteractions();
            this.map.updateLights(time);

            const distToMonster = this.monster.update(
                delta,
                this.camera.position,
                this.isSprinting && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight),
                this.isFlashlightOn
            );

            this.updateWhistleAudio();

            const dangerOverlay = document.getElementById('danger-overlay');
            if (distToMonster < 13) {
                dangerOverlay.style.opacity = (1 - distToMonster / 13).toFixed(2);
            } else {
                dangerOverlay.style.opacity = 0;
            }

            if (distToMonster < 1.7) {
                this.triggerJumpscare();
            }
        } else if (this.state === 'JUMPSCARE') {
            this.camera.position.x += (Math.random() - 0.5) * 0.09;
            this.camera.position.y += (Math.random() - 0.5) * 0.09;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new HorrorGame();
});
