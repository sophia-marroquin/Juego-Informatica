/* Map, Rooms, Props, Clues and Labyrinth Generator */

class LabyrinthMap {
    constructor(scene) {
        this.scene = scene;
        this.wallSize = 4;
        this.wallHeight = 5;
        this.cols = 27;
        this.rows = 25;

        this.grid = [];
        this.cellTheme = [];
        this.colliders = [];
        this.wallMeshes = [];
        this.walkableCells = [];
        this.relicObjects = [];
        this.batteryObjects = [];
        this.notes = [];
        this.flickerLights = [];
        this.sealLights = [];

        this.rooms = [
            { id: 'vestibule', name: 'VESTÍBULO', x: 1, y: 1, w: 6, h: 6, floor: 'concrete', wall: 'brick' },
            { id: 'service', name: 'ALA DE SERVICIO', x: 10, y: 1, w: 6, h: 5, floor: 'metal', wall: 'metal' },
            { id: 'archive', name: 'ARCHIVO', x: 19, y: 1, w: 6, h: 6, floor: 'wood', wall: 'plaster' },
            { id: 'chapel', name: 'CAPILLA', x: 1, y: 10, w: 7, h: 7, floor: 'stone', wall: 'tile' },
            { id: 'boiler', name: 'SALA DE CALDERAS', x: 11, y: 10, w: 7, h: 6, floor: 'metal', wall: 'metal' },
            { id: 'infirmary', name: 'ENFERMERÍA', x: 19, y: 10, w: 6, h: 7, floor: 'tile', wall: 'tile' },
            { id: 'crypt', name: 'CRIPTA', x: 3, y: 20, w: 7, h: 3, floor: 'stone', wall: 'stone' },
            { id: 'exit', name: 'SALIDA', x: 13, y: 19, w: 10, h: 4, floor: 'metal', wall: 'metal' }
        ];

        this.corridors = [
            { x: 7, y: 3, w: 3, h: 2 },
            { x: 16, y: 3, w: 3, h: 2 },
            { x: 21, y: 7, w: 2, h: 3 },
            { x: 21, y: 17, w: 2, h: 2 },
            { x: 10, y: 20, w: 3, h: 2 },
            { x: 5, y: 17, w: 2, h: 3 },
            { x: 3, y: 7, w: 2, h: 3 },
            { x: 12, y: 6, w: 2, h: 4 },
            { x: 8, y: 12, w: 3, h: 2 },
            { x: 15, y: 16, w: 2, h: 3 }
        ];

        this.playerStartPosition = new THREE.Vector3(12, 1.6, 12);
        this.exitDoorPosition = new THREE.Vector3(89, 1.6, 80);
        this.exitCell = { c: 22, r: 20 };
        this.monsterSpawn = new THREE.Vector3(56, 0, 48);

        this.exitDoorMesh = null;
        this.mapPickup = null;
        this.blueprintTexture = null;
    }

    /* ------------------------------------------------------------------ */
    /*  Grid generation                                                    */
    /* ------------------------------------------------------------------ */
    generateGrid() {
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
        this.cellTheme = Array.from({ length: this.rows }, () => Array(this.cols).fill('plaster'));

        for (const room of this.rooms) {
            for (let r = room.y; r < room.y + room.h; r++) {
                for (let c = room.x; c < room.x + room.w; c++) {
                    this.grid[r][c] = 0;
                    this.cellTheme[r][c] = room.wall;
                }
            }
        }

        for (const cor of this.corridors) {
            for (let r = cor.y; r < cor.y + cor.h; r++) {
                for (let c = cor.x; c < cor.x + cor.w; c++) {
                    this.grid[r][c] = 0;
                    this.cellTheme[r][c] = 'plaster';
                }
            }
        }

        this.walkableCells = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 0) {
                    this.walkableCells.push(new THREE.Vector3(c * this.wallSize, 0, r * this.wallSize));
                }
            }
        }
    }

    getRoomAt(c, r) {
        for (const room of this.rooms) {
            if (c >= room.x && c < room.x + room.w && r >= room.y && r < room.y + room.h) return room;
        }
        return null;
    }

    worldToCell(pos) {
        return { c: Math.round(pos.x / this.wallSize), r: Math.round(pos.z / this.wallSize) };
    }

    isWalkableCell(c, r) {
        return r >= 0 && c >= 0 && r < this.rows && c < this.cols && this.grid[r][c] === 0;
    }

    getRandomWalkableCell() {
        if (!this.walkableCells.length) return new THREE.Vector3(0, 0, 0);
        return this.walkableCells[Math.floor(Math.random() * this.walkableCells.length)].clone();
    }

    /* ------------------------------------------------------------------ */
    /*  World construction                                                 */
    /* ------------------------------------------------------------------ */
    buildMap() {
        this.generateGrid();
        this.buildMaterials();
        this.buildFloorsAndCeilings();
        this.buildWalls();
        this.buildGraffiti();
        this.buildLights();
        this.buildProps();
        this.buildRelics();
        this.buildBatteries();
        this.buildNotes();
        this.buildMapPickup();
        this.buildExitDoor();
        this.scatterDetails();

        // The shadow only respects walls: furniture is not part of its path graph,
        // so letting it phase through props avoids it getting stuck on them.
        this.monsterColliders = this.colliders.filter(box => box.max.y - box.min.y >= 4.8);
    }

    buildMaterials() {
        this.materials = {};

        const wallThemes = ['brick', 'plaster', 'tile', 'stone', 'metal'];
        for (const theme of wallThemes) {
            this.materials[theme] = [0, 1].map(variant => new THREE.MeshStandardMaterial({
                map: TextureGenerator.createWallTexture(theme, variant),
                roughness: theme === 'metal' ? 0.62 : 0.92,
                metalness: theme === 'metal' ? 0.4 : 0.06,
                side: THREE.DoubleSide
            }));
        }

        this.materials.concreteFloor = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createFloorTexture(),
            roughness: 0.85,
            metalness: 0.12
        });

        this.materials.ceiling = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createCeilingTexture(),
            roughness: 0.95,
            metalness: 0.05
        });

        this.roomFloorMaterials = {};
        for (const floorTheme of ['concrete', 'metal', 'wood', 'tile', 'stone']) {
            this.roomFloorMaterials[floorTheme] = new THREE.MeshStandardMaterial({
                map: TextureGenerator.createRoomFloorTexture(floorTheme),
                roughness: 0.8,
                metalness: floorTheme === 'metal' ? 0.35 : 0.08,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
        }

        this.woodMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createWoodTexture(),
            roughness: 0.85,
            metalness: 0.05
        });
        this.darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.9 });
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.55, metalness: 0.65 });
        this.rustMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.85, metalness: 0.3 });
        this.stoneMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createStoneTexture(),
            roughness: 0.95,
            metalness: 0.02
        });
        this.fabricMat = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 1 });
        this.boneMat = new THREE.MeshStandardMaterial({ color: 0xb8ae94, roughness: 0.8 });
        this.glassGreen = new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.3, metalness: 0.4, emissive: 0x0b2a18, emissiveIntensity: 0.6 });
        this.paperMat = new THREE.MeshStandardMaterial({ color: 0xb9ae8c, roughness: 0.95 });
        this.rugMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createRugTexture(),
            roughness: 1
        });
        this.carpetMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createCarpetTexture(),
            roughness: 1
        });
        this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false });
        this.candleMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0xffaa44, emissiveIntensity: 0.6, roughness: 0.7 });
        this.hazardMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createHazardTexture(),
            roughness: 0.88,
            metalness: 0.1
        });
        this.bookMats = [0x3a1d1d, 0x23301f, 0x1f2433, 0x3a2f1a, 0x2b1f2b].map(color =>
            new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
        );
    }

    buildFloorsAndCeilings() {
        const worldW = this.cols * this.wallSize;
        const worldH = this.rows * this.wallSize;
        const cx = worldW / 2 - this.wallSize / 2;
        const cz = worldH / 2 - this.wallSize / 2;

        const floorGeo = new THREE.PlaneGeometry(worldW, worldH);
        this.materials.concreteFloor.map.repeat.set(this.cols, this.rows);
        const floor = new THREE.Mesh(floorGeo, this.materials.concreteFloor);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, 0, cz);
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.materials.ceiling.map.repeat.set(this.cols, this.rows);
        const ceiling = new THREE.Mesh(floorGeo, this.materials.ceiling);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, this.wallHeight, cz);
        this.scene.add(ceiling);

        // Themed floor patches per room
        for (const room of this.rooms) {
            const mat = this.roomFloorMaterials[room.floor];
            const tex = mat.map;
            tex.repeat.set(room.w / 2, room.h / 2);
            const geo = new THREE.PlaneGeometry(room.w * this.wallSize, room.h * this.wallSize);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            const centerX = (room.x + (room.w - 1) / 2) * this.wallSize;
            const centerZ = (room.y + (room.h - 1) / 2) * this.wallSize;
            mesh.position.set(centerX, 0.02, centerZ);
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        }
    }

    buildWalls() {
        const wallGeo = new THREE.BoxGeometry(this.wallSize, this.wallHeight, this.wallSize);
        const neighborOffsets = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== 1) continue;

                let adjacentTheme = null;
                for (const [dr, dc] of neighborOffsets) {
                    const nr = r + dr, nc = c + dc;
                    if (nr < 0 || nc < 0 || nr >= this.rows || nc >= this.cols) continue;
                    if (this.grid[nr][nc] === 0) {
                        adjacentTheme = this.cellTheme[nr][nc];
                        break;
                    }
                }
                if (!adjacentTheme) continue; // Interior filler walls are not needed

                const variants = this.materials[adjacentTheme] || this.materials.plaster;
                const material = variants[Math.floor(Math.random() * variants.length)];
                const mesh = new THREE.Mesh(wallGeo, material);
                mesh.position.set(c * this.wallSize, this.wallHeight / 2, r * this.wallSize);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.wallMeshes.push(mesh);

                this.colliders.push(new THREE.Box3(
                    new THREE.Vector3(c * this.wallSize - 2, 0, r * this.wallSize - 2),
                    new THREE.Vector3(c * this.wallSize + 2, this.wallHeight, r * this.wallSize + 2)
                ));
            }
        }
    }

    buildGraffiti() {
        // Atmospheric only: all objective clues live in Elena's notes.
        const phrases = [
            'NO MIRES ATRÁS', 'ELLA OYE TUS PASOS', 'LA LUZ LA ATRAE', 'NO CORRAS',
            '¿DÓNDE ESTÁS?', 'SAL DE AQUÍ', 'SILENCIO', 'REZA', 'YA ES TARDE',
            'ELLA NO DUERME', 'HUYE', 'TE ESTAMOS ESPERANDO', 'NO ABRAS LA PUERTA',
            'LAS PAREDES RESPIRAN', 'NO ESTÁS SOLO', 'ALGUIEN CAMINA',
            'NO ERES EL PRIMERO', 'EL SILENCIO TIENE HAMBRE', 'NO CUENTES LAS VELAS'
        ];
        // Shuffle so every phrase appears at most once
        for (let i = phrases.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [phrases[i], phrases[j]] = [phrases[j], phrases[i]];
        }

        const textureCache = {};
        const colors = ['#b81f1f', '#a81616', '#8f1010', '#d6cfbe'];
        const directions = [
            { dr: -1, dc: 0, rot: 0, off: (x, z) => [x, z - 2 + 0.07] },
            { dr: 1, dc: 0, rot: Math.PI, off: (x, z) => [x, z + 2 - 0.07] },
            { dr: 0, dc: 1, rot: -Math.PI / 2, off: (x, z) => [x + 2 - 0.07, z] },
            { dr: 0, dc: -1, rot: Math.PI / 2, off: (x, z) => [x - 2 + 0.07, z] }
        ];

        let placed = 0;
        const maxDecals = 20;

        for (let r = 1; r < this.rows - 1 && placed < maxDecals; r++) {
            for (let c = 1; c < this.cols - 1 && placed < maxDecals; c++) {
                if (this.grid[r][c] !== 0) continue;
                if (Math.random() > 0.14) continue;

                const candidates = directions.filter(d => this.grid[r + d.dr][c + d.dc] === 1);
                if (!candidates.length) continue;

                const dir = candidates[Math.floor(Math.random() * candidates.length)];
                const phrase = phrases[placed % phrases.length];
                const color = colors[Math.floor(Math.random() * colors.length)];

                if (!textureCache[phrase + color]) {
                    textureCache[phrase + color] = TextureGenerator.createGraffitiTexture(phrase, color);
                }

                const mat = new THREE.MeshStandardMaterial({
                    map: textureCache[phrase + color],
                    transparent: true,
                    depthWrite: false,
                    roughness: 1,
                    metalness: 0,
                    opacity: 0.92
                });
                const geo = new THREE.PlaneGeometry(3.0, 1.5);
                const decal = new THREE.Mesh(geo, mat);
                const [px, pz] = dir.off(c * this.wallSize, r * this.wallSize);
                decal.position.set(px, 2.2, pz);
                decal.rotation.y = dir.rot;
                this.scene.add(decal);
                placed++;
            }
        }
    }

    buildLights() {
        const lamps = [
            { x: 12, z: 8, color: 0xffb066, intensity: 6.5, distance: 14, flicker: true },
            { x: 32, z: 14, color: 0xffb066, intensity: 5.5, distance: 12, flicker: true },
            { x: 50, z: 10, color: 0xbcd0dd, intensity: 6.0, distance: 13, flicker: true },
            { x: 86, z: 10, color: 0xbcd0dd, intensity: 6.5, distance: 14, flicker: true },
            { x: 16, z: 52, color: 0xffa04d, intensity: 8.0, distance: 17, flicker: false },
            { x: 56, z: 50, color: 0xff3300, intensity: 9.0, distance: 16, flicker: true },
            { x: 86, z: 52, color: 0x8dffc9, intensity: 7.0, distance: 15, flicker: true },
            { x: 24, z: 84, color: 0xff9b4d, intensity: 6.0, distance: 14, flicker: false },
            { x: 72, z: 80, color: 0x8fb4ff, intensity: 7.0, distance: 14, flicker: true },
            { x: 16, z: 34, color: 0xffb066, intensity: 5.0, distance: 11, flicker: true },
            { x: 52, z: 32, color: 0xffb066, intensity: 5.0, distance: 11, flicker: true }
        ];

        for (const lamp of lamps) {
            const light = new THREE.PointLight(lamp.color, lamp.intensity, lamp.distance, 1.6);
            light.position.set(lamp.x, 4.2, lamp.z);
            this.scene.add(light);

            // Simple hanging fixture
            const shadeGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.32, 8);
            const shade = new THREE.Mesh(shadeGeo, this.metalMat);
            shade.position.set(lamp.x, 4.4, lamp.z);
            this.scene.add(shade);

            const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const bulbMat = new THREE.MeshStandardMaterial({
                color: lamp.color,
                emissive: lamp.color,
                emissiveIntensity: 1.4
            });
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(lamp.x, 4.2, lamp.z);
            this.scene.add(bulb);

            const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
            const cable = new THREE.Mesh(cableGeo, this.metalMat);
            cable.position.set(lamp.x, 4.75, lamp.z);
            this.scene.add(cable);

            this.flickerLights.push({
                light,
                baseIntensity: lamp.intensity,
                seed: Math.random() * 100,
                flicker: lamp.flicker,
                bulb
            });
        }
    }

    /* ----------------------------- Props ------------------------------ */
    addBox(x, y, z, w, h, d, material, collide = false, rotY = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y + h / 2, z);
        mesh.rotation.y = rotY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        if (collide) this.addCollider(mesh);
        return mesh;
    }

    addCylinder(x, y, z, radius, height, material, collide = false, rotZ = 0) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
        mesh.position.set(x, y + height / 2, z);
        mesh.rotation.z = rotZ;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        if (collide) this.addCollider(mesh);
        return mesh;
    }

    addCollider(mesh) {
        mesh.updateWorldMatrix(true, true);
        this.colliders.push(new THREE.Box3().setFromObject(mesh));
    }

    addChair(x, z, rotY = 0) {
        const group = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.85), this.woodMat);
        seat.position.y = 0.48;
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.1), this.darkWoodMat);
        back.position.set(0, 0.83, -0.38);
        group.add(back);
        for (const [lx, lz] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.08), this.darkWoodMat);
            leg.position.set(lx, 0.24, lz);
            group.add(leg);
        }
        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.scene.add(group);
        this.addCollider(group);
        return group;
    }

    addBookshelf(x, z, rotY = 0) {
        const group = new THREE.Group();
        const W = 4.4;
        const H = 3.1;
        const D = 0.9;

        const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), this.woodMat);
        back.position.set(0, H / 2, -D / 2 + 0.06);
        group.add(back);

        for (const sx of [-W / 2 + 0.06, W / 2 - 0.06]) {
            const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), this.darkWoodMat);
            side.position.set(sx, H / 2, 0);
            group.add(side);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), this.darkWoodMat);
        top.position.set(0, H - 0.05, 0);
        group.add(top);

        const rows = 3;
        const rowGap = (H - 0.25) / rows;
        for (let i = 0; i <= rows; i++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, D), this.darkWoodMat);
            shelf.position.set(0, 0.1 + i * rowGap, 0);
            group.add(shelf);
        }

        for (let row = 0; row < rows; row++) {
            const shelfY = 0.13 + row * rowGap;
            let bx = -W / 2 + 0.2;
            while (bx < W / 2 - 0.3) {
                const bw = 0.08 + Math.random() * 0.09;
                const bh = 0.32 + Math.random() * 0.3;
                const book = new THREE.Mesh(
                    new THREE.BoxGeometry(bw, bh, 0.4),
                    this.bookMats[Math.floor(Math.random() * this.bookMats.length)]
                );
                book.position.set(bx + bw / 2, shelfY + bh / 2, 0.05);
                if (Math.random() < 0.12) book.rotation.z = 0.22;
                group.add(book);
                bx += bw + 0.025 + Math.random() * 0.03;
            }
        }

        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.scene.add(group);
        this.addCollider(group);
        return group;
    }

    buildProps() {
        /* ------------------------- VESTÍBULO ------------------------- */
        // Reception desk
        this.addBox(9, 0, 10, 4.2, 1.1, 1.5, this.woodMat, true, 0.08);
        this.addBox(9.2, 1.1, 10, 3.6, 0.08, 1.2, this.darkWoodMat);
        // Counter front and overhanging top
        this.addBox(9, 0.48, 10.79, 4.0, 0.95, 0.1, this.darkWoodMat, false, 0.08);
        this.addBox(9, 1.14, 10, 4.45, 0.07, 1.75, this.darkWoodMat, false, 0.08);

        // Desk lamp with a warm pool of light
        this.addCylinder(9.8, 1.17, 9.55, 0.14, 0.05, this.metalMat);
        this.addCylinder(9.8, 1.22, 9.55, 0.035, 0.5, this.metalMat);
        const lampShade = new THREE.Mesh(
            new THREE.ConeGeometry(0.23, 0.28, 18, 1, true),
            new THREE.MeshStandardMaterial({
                color: 0x2a2a30,
                roughness: 0.7,
                metalness: 0.3,
                side: THREE.DoubleSide,
                emissive: 0xffcc88,
                emissiveIntensity: 0.25
            })
        );
        lampShade.position.set(9.8, 1.8, 9.55);
        lampShade.rotation.z = Math.PI;
        this.scene.add(lampShade);
        const deskLight = new THREE.PointLight(0xffcc88, 1.4, 4.5, 1.6);
        deskLight.position.set(9.8, 1.55, 9.55);
        this.scene.add(deskLight);

        // Papers and a ledger on the counter
        this.addBox(8.4, 1.17, 9.8, 0.44, 0.02, 0.3, this.paperMat, false, 0.2);
        this.addBox(8.42, 1.19, 9.82, 0.4, 0.02, 0.28, this.paperMat, false, -0.1);
        this.addBox(8.2, 1.18, 10.45, 0.5, 0.05, 0.36, this.darkWoodMat, false, 0.35);

        // Wall clock above the bench
        const clockFace = new THREE.Mesh(
            new THREE.CircleGeometry(0.33, 24),
            new THREE.MeshStandardMaterial({ color: 0xcfc5aa, roughness: 0.9 })
        );
        clockFace.position.set(15, 3.0, 2.1);
        this.scene.add(clockFace);
        const clockRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 24), this.darkWoodMat);
        clockRing.position.set(15, 3.0, 2.12);
        this.scene.add(clockRing);
        const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.015), this.darkWoodMat);
        hourHand.position.set(15, 3.06, 2.13);
        hourHand.rotation.z = -0.5;
        this.scene.add(hourHand);
        const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.015), this.darkWoodMat);
        minuteHand.position.set(15.05, 3.0, 2.135);
        minuteHand.rotation.z = 1.1;
        this.scene.add(minuteHand);
        // Chairs
        this.addChair(14, 8, 0.4);
        this.addChair(15.1, 8.3, -0.2);
        // Crates beside the door
        this.addBox(20, 0, 20, 1.3, 1.3, 1.3, this.woodMat, true, 0.3);
        this.addBox(20.3, 1.3, 20.2, 0.9, 0.9, 0.9, this.woodMat, false, -0.4);
        // Notice board
        const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), this.woodMat);
        board.position.set(2.08, 2, 8);
        board.rotation.y = Math.PI / 2;
        this.scene.add(board);

        // Faded carpet leading out of the lobby
        const foyerRug = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6), this.rugMat);
        foyerRug.rotation.x = -Math.PI / 2;
        foyerRug.position.set(12, 0.035, 12);
        this.scene.add(foyerRug);

        // Bench against the north wall
        this.addBox(19, 0.42, 2.55, 3.0, 0.14, 0.75, this.woodMat, true);
        this.addBox(19, 0.92, 2.2, 3.0, 0.7, 0.1, this.darkWoodMat);
        this.addBox(17.65, 0.21, 2.55, 0.14, 0.84, 0.62, this.darkWoodMat);
        this.addBox(20.35, 0.21, 2.55, 0.14, 0.84, 0.62, this.darkWoodMat);

        // Coat rack by the corridor
        this.addCylinder(23.4, 0, 4.6, 0.06, 2.0, this.metalMat);
        this.addCylinder(23.4, 1.96, 4.6, 0.34, 0.07, this.metalMat);

        // Dead potted plant
        this.addCylinder(24.1, 0, 6.4, 0.28, 0.5, this.rustMat, true);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1c2a1c, roughness: 1 });
        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.7, 6), leafMat);
            leaf.position.set(24.1 + (Math.random() - 0.5) * 0.35, 0.8, 6.4 + (Math.random() - 0.5) * 0.35);
            leaf.rotation.z = (Math.random() - 0.5) * 0.7;
            leaf.rotation.x = (Math.random() - 0.5) * 0.5;
            this.scene.add(leaf);
        }

        /* ---------------------- ALA DE SERVICIO ---------------------- */
        this.addBox(46, 0, 6, 4.2, 2.6, 1.1, this.metalMat, true);
        this.addBox(51, 0, 6, 4.2, 2.6, 1.1, this.metalMat, true);
        this.addBox(61, 0, 16, 1.4, 1.4, 1.4, this.woodMat, true, 0.2);
        this.addCylinder(44, 0, 16, 0.55, 1.1, this.rustMat, true);
        this.addCylinder(45.2, 0, 17.2, 0.55, 1.1, this.rustMat, true);
        // Ceiling pipe
        this.addCylinder(52, 4.3, 18, 0.16, 16, this.rustMat, false, Math.PI / 2);

        /* --------------------------- ARCHIVO -------------------------- */
        this.addBookshelf(79, 2.7, 0);
        this.addBookshelf(88, 2.7, 0);
        this.addBookshelf(97.2, 12, -Math.PI / 2);
        this.addBox(86, 0, 12, 3.4, 1, 1.4, this.woodMat, true, 0.05);
        this.addBox(86, 1.05, 12, 3.4, 0.08, 1.4, this.darkWoodMat);

        // Reading nook in the middle of the archive
        const archiveRug = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.8), this.rugMat);
        archiveRug.rotation.x = -Math.PI / 2;
        archiveRug.position.set(86, 0.035, 16.3);
        this.scene.add(archiveRug);

        this.addBox(86, 0.8, 16.3, 3.0, 0.1, 1.5, this.darkWoodMat, true);
        for (const lx of [84.7, 87.3]) {
            for (const lz of [15.65, 16.95]) {
                this.addBox(lx, 0, lz, 0.12, 0.8, 0.12, this.darkWoodMat);
            }
        }
        // Stack of books and a candle on the table
        this.addBox(85.1, 0.87, 16.0, 0.42, 0.06, 0.3, this.bookMats[0]);
        this.addBox(85.12, 0.93, 16.02, 0.38, 0.05, 0.28, this.bookMats[2]);
        this.addCylinder(87.15, 0.85, 16.5, 0.07, 0.28, this.candleMat);
        this.addCylinder(87.15, 1.13, 16.5, 0.045, 0.1, this.candleMat);

        this.addChair(84.05, 16.3, Math.PI / 2);
        this.addChair(87.95, 16.3, -Math.PI / 2);

        // Scattered papers
        for (let i = 0; i < 12; i++) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), this.paperMat);
            p.rotation.x = -Math.PI / 2;
            p.rotation.z = Math.random() * Math.PI;
            p.position.set(78 + Math.random() * 14, 0.03, 6 + Math.random() * 16);
            this.scene.add(p);
        }

        /* --------------------------- CAPILLA -------------------------- */
        // Carpet aisle up to the altar
        const chapelAisle = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 20), this.carpetMat);
        chapelAisle.rotation.x = -Math.PI / 2;
        chapelAisle.position.set(16, 0.04, 54);
        this.scene.add(chapelAisle);

        this.addBox(16, 0, 42.5, 4.6, 1.1, 1.5, this.stoneMat, true);
        this.addBox(16, 1.1, 42.5, 4.9, 0.16, 1.7, this.stoneMat);
        this.addBox(16, 1.27, 42.5, 4.7, 0.04, 1.6, this.paperMat);
        // Elena's stack of candle crates, hiding the relic between the altar and the wall.
        this.addBox(16, 0, 39.2, 3.0, 1.4, 0.8, this.woodMat, true, 0.12);
        this.addBox(15.7, 1.4, 39.2, 1.2, 0.6, 0.7, this.woodMat, false, -0.2);

        // Pews with end panels, rails, kneelers and hymnals
        for (const [px, pz] of [[10, 50], [22, 50], [10, 56], [22, 56]]) {
            this.addBox(px, 0, pz, 6, 0.55, 1.2, this.darkWoodMat, true);
            this.addBox(px, 0.55, pz + 0.5, 6, 0.8, 0.16, this.darkWoodMat);
            this.addBox(px, 1.35, pz + 0.5, 6.1, 0.08, 0.22, this.darkWoodMat);
            this.addBox(px - 2.92, 0, pz, 0.16, 0.95, 1.32, this.darkWoodMat);
            this.addBox(px + 2.92, 0, pz, 0.16, 0.95, 1.32, this.darkWoodMat);
            this.addBox(px, 0.12, pz - 0.8, 5.6, 0.12, 0.35, this.darkWoodMat);
            this.addBox(px - 1.6, 0.6, pz + 0.1, 0.3, 0.07, 0.22, this.bookMats[1]);
        }
        // Candles on the altar
        for (let i = 0; i < 6; i++) {
            const cx = 14.2 + i * 0.7;
            const ch = 0.45 + Math.random() * 0.25;
            this.addCylinder(cx, 1.29, 42.2, 0.07, ch, this.candleMat);
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), this.flameMat);
            flame.position.set(cx, 1.29 + ch + 0.06, 42.2);
            this.scene.add(flame);
        }
        const altarGlow = new THREE.PointLight(0xffa860, 1.5, 5, 1.7);
        altarGlow.position.set(16, 2.2, 42.5);
        this.scene.add(altarGlow);
        // Cross on the wall
        this.addBox(16, 2.6, 38.16, 0.24, 2.2, 0.18, this.darkWoodMat);
        this.addBox(16, 3.7, 38.16, 1.4, 0.24, 0.18, this.darkWoodMat);

        /* ----------------------- SALA DE CALDERAS --------------------- */
        this.addCylinder(48, 0, 46, 1.45, 4, this.rustMat, true);
        this.addCylinder(58, 0, 46, 1.25, 3.6, this.rustMat, true);
        this.addCylinder(48, 4, 46, 0.9, 0.4, this.metalMat);
        this.addCylinder(58, 3.6, 46, 0.8, 0.35, this.metalMat);

        // Details on the boilers: bands, domes and rivets
        const boilerSpecs = [[48, 46, 1.45, 4], [58, 46, 1.25, 3.6]];
        for (const [bx, bz, br, bh] of boilerSpecs) {
            for (const by of [bh * 0.35, bh * 0.68]) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(br * 0.99, 0.06, 6, 22), this.metalMat);
                band.rotation.x = Math.PI / 2;
                band.position.set(bx, by, bz);
                this.scene.add(band);
            }
            const dome = new THREE.Mesh(
                new THREE.SphereGeometry(br * 0.98, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
                this.rustMat
            );
            dome.position.set(bx, bh, bz);
            dome.castShadow = true;
            this.scene.add(dome);
        }
        // Pipes
        this.addCylinder(53, 3.4, 40.6, 0.22, 14, this.metalMat, false, Math.PI / 2);
        this.addCylinder(53, 2.6, 40.6, 0.16, 14, this.rustMat, false, Math.PI / 2);
        this.addCylinder(44, 2, 56, 0.24, 9, this.metalMat, false, Math.PI / 2);
        // Valve wheel
        const valve = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 16), this.metalMat);
        valve.position.set(51, 1.6, 44);
        valve.rotation.y = Math.PI / 2;
        this.scene.add(valve);
        // Coal pile
        this.addBox(65, 0, 44, 3, 0.5, 2.4, this.darkWoodMat, false, 0.2);
        // Elena's stack of coal crates, between the large boiler and the back wall.
        // It covers the gap where she hid the second relic.
        this.addBox(47.4, 0, 41.0, 2.0, 1.6, 1.0, this.woodMat, true, 0.35);
        this.addBox(47.0, 1.6, 41.0, 1.1, 0.8, 0.9, this.woodMat, false, -0.2);
        this.addBox(49.6, 0, 42.0, 2.2, 1.5, 1.0, this.woodMat, true, -0.3);
        this.addBox(49.4, 1.5, 42.0, 1.2, 0.7, 0.8, this.woodMat, false, 0.2);

        /* -------------------------- ENFERMERÍA ------------------------ */
        const bedPositions = [[79.5, 46], [79.5, 54], [79.5, 62]];
        for (const [bx, bz] of bedPositions) {
            this.addBox(bx, 0, bz, 2.3, 0.55, 3.5, this.metalMat, true);
            this.addBox(bx, 0.55, bz, 2.1, 0.25, 3.2, this.fabricMat);
            this.addBox(bx, 0.8, bz - 1.2, 1.6, 0.18, 0.6, this.paperMat);
        }
        this.addCylinder(84, 0, 47, 0.05, 2.4, this.metalMat);
        this.addBox(84, 2.4, 47, 0.5, 0.1, 0.5, this.metalMat);
        // Medicine cabinet
        this.addBox(94, 0, 64, 1.1, 2.6, 3.4, this.metalMat, true);
        // Doors, handles and a faded medical cross on its west face.
        this.addBox(93.43, 0.15, 63.4, 0.06, 2.3, 1.4, this.metalMat, false);
        this.addBox(93.43, 0.15, 65.0, 0.06, 2.3, 1.4, this.metalMat, false);
        this.addBox(93.37, 1.35, 63.95, 0.08, 0.08, 0.28, this.rustMat, false);
        this.addBox(93.37, 1.35, 64.45, 0.08, 0.08, 0.28, this.rustMat, false);
        this.addBox(93.39, 1.95, 64.2, 0.05, 0.34, 0.08, this.paperMat, false);
        this.addBox(93.39, 1.95, 64.2, 0.05, 0.08, 0.34, this.paperMat, false);

        /* ---------------------------- CRIPTA -------------------------- */
        const tombs = [18, 24, 30];
        for (const tx of tombs) {
            this.addBox(tx, 0, 82, 3.4, 0.22, 1.9, this.stoneMat);
            this.addBox(tx, 0.22, 82, 3.0, 0.75, 1.55, this.stoneMat, true);
            this.addBox(tx, 0.97, 82, 3.35, 0.18, 1.85, this.stoneMat);
            // Carved emblem on the front of the tomb
            this.addBox(tx, 0.42, 82.79, 0.09, 0.38, 0.04, this.darkWoodMat);
            this.addBox(tx, 0.58, 82.79, 0.3, 0.09, 0.04, this.darkWoodMat);
        }
        // Skulls
        for (let i = 0; i < 5; i++) {
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.boneMat);
            skull.position.set(14 + Math.random() * 20, 0.16, 86 + Math.random() * 2.5);
            skull.scale.y = 0.9;
            this.scene.add(skull);
        }
        // Sanctified candles
        this.addCylinder(15, 0, 86, 0.08, 0.55, this.candleMat);
        this.addCylinder(33, 0, 86, 0.08, 0.45, this.candleMat);
        for (const [fx, fy] of [[15, 1.66], [33, 1.56]]) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 6), this.flameMat);
            flame.position.set(fx, fy, 86);
            this.scene.add(flame);
        }

        // Candles resting on the side tombs
        for (const cx of [18.6, 29.4]) {
            this.addCylinder(cx, 1.15, 82.4, 0.05, 0.32, this.candleMat);
            this.addCylinder(cx, 1.15, 81.7, 0.05, 0.24, this.candleMat);
            const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), this.flameMat);
            f1.position.set(cx, 1.52, 82.4);
            this.scene.add(f1);
            const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), this.flameMat);
            f2.position.set(cx, 1.44, 81.7);
            this.scene.add(f2);
        }

        /* ---------------------------- SALIDA -------------------------- */
        this.addCylinder(58, 0, 86, 0.6, 1.1, this.rustMat, true);
        this.addCylinder(59.3, 0, 86.4, 0.6, 1.1, this.rustMat, true);
        this.addBox(84, 0, 86, 2, 1.6, 1.6, this.woodMat, true, 0.3);
        // Hazard stripes in front of the door
        this.hazardMat.map.repeat.set(1, 1.7);
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4), this.hazardMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(87.3, 0.03, 80);
        this.scene.add(stripe);

        /* --------------------- Corridor details ---------------------- */
        this.addCylinder(32, 4.4, 3, 0.14, 10, this.rustMat, false, Math.PI / 2);
        this.addCylinder(35, 4.2, 12, 0.14, 10, this.rustMat, false, Math.PI / 2);
        this.addCylinder(16, 4.3, 30, 0.13, 10, this.rustMat, false, Math.PI / 2);
        this.addCylinder(20, 4.2, 40, 0.13, 10, this.rustMat, false, Math.PI / 2);
        this.addBox(42, 0, 3, 1, 1, 1, this.woodMat, true, 0.5);
        this.addBox(76, 0, 76, 1.2, 1.2, 1.2, this.woodMat, true, -0.3);

        // Puddles
        const puddleMat = new THREE.MeshStandardMaterial({
            color: 0x0a1014,
            roughness: 0.22,
            metalness: 0.7,
            transparent: true,
            opacity: 0.5
        });
        const puddleSpots = [[14, 18], [34, 10], [52, 16], [84, 22], [18, 58], [56, 58], [87, 61], [26, 86], [70, 84]];
        for (const [px, pz] of puddleSpots) {
            const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.55 + Math.random() * 0.65, 18), puddleMat);
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.set(px, 0.04, pz);
            puddle.scale.set(1, 0.6 + Math.random() * 0.35, 1);
            this.scene.add(puddle);
        }
    }

    /* ----------------------------- Pickups ---------------------------- */
    spawnRelic(x, z, baseY = 0, withPedestal = true) {
        const group = new THREE.Group();

        if (withPedestal) {
            const pedMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 });
            const pedMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 1.2, 8), pedMat);
            pedMesh.position.y = 0.6;
            pedMesh.castShadow = true;
            group.add(pedMesh);
        }

        const relicTexture = TextureGenerator.createRelicTexture();
        const relicMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.26, 1),
            new THREE.MeshStandardMaterial({
                map: relicTexture,
                emissive: 0x00aaff,
                emissiveIntensity: 0.55,
                roughness: 0.25,
                metalness: 0.2
            })
        );
        const floatHeight = baseY + (withPedestal ? 1.5 : 0.75);
        relicMesh.position.y = floatHeight;
        relicMesh.name = 'relicMesh';
        group.add(relicMesh);

        // A much smaller glow: hidden relics should be found by following Elena's notes,
        // not by spotting a lighthouse from the other end of the room.
        const light = new THREE.PointLight(0x00ccff, 1.15, 3.4, 1.8);
        light.position.y = floatHeight;
        group.add(light);

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.relicObjects.push({
            group,
            mesh: relicMesh,
            position: new THREE.Vector3(x, floatHeight, z),
            floatHeight,
            collected: false
        });
    }

    buildRelics() {
        // Intentionally hidden: behind furniture, in the dark gaps described by Elena's pages.
        this.spawnRelic(17.2, 40.8, 0.05, false); // Capilla - detrás del altar, tras las cajas de cirios
        this.spawnRelic(47.4, 43.0, 0.05, false); // Calderas - entre la caldera y las cajas de carbón
        this.spawnRelic(86, 10.4, 0.05, false);   // Archivo - detrás del escritorio del plano
        this.spawnRelic(96.1, 64, 0.05, false);   // Enfermería - detrás del armario de medicinas
        this.spawnRelic(27.9, 82, 0.05, false);   // Cripta - al pie del tercer sarcófago, lado oculto
    }

    spawnBattery(x, z) {
        const group = new THREE.Group();
        const batGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12);
        const batMat = new THREE.MeshStandardMaterial({
            map: TextureGenerator.createBatteryTexture(),
            roughness: 0.45,
            metalness: 0.2
        });
        const batMesh = new THREE.Mesh(batGeo, batMat);
        batMesh.position.y = 0.25;
        batMesh.rotation.z = Math.PI / 2;
        batMesh.castShadow = true;
        group.add(batMesh);

        const light = new THREE.PointLight(0xf39c12, 1.9, 4.0, 1.7);
        light.position.y = 0.3;
        group.add(light);

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.batteryObjects.push({
            group,
            position: new THREE.Vector3(x, 0.3, z),
            collected: false
        });
    }

    buildBatteries() {
        const spots = [[8, 8], [32, 12], [80, 20], [12, 60], [52, 48], [92, 60], [28, 80], [72, 84]];
        for (const [x, z] of spots) this.spawnBattery(x, z);
    }

    buildNotes() {
        // Seven pages of the diary of Elena, the night nurse who was here before you.
        // Every objective clue is written on these pages; the graffiti gives no directions.
        const noteDefs = [
            {
                cell: { c: 5, r: 6 }, side: 'S', title: 'Página 1 — La enfermera',
                text: 'Si encontraste esto, escucha. Me llamo Elena; era la enfermera del turno de noche. Cuando el asilo cerró, escondí cinco reliquias para que la cosa no pudiera usarlas. Dejé el plano sobre el escritorio del Archivo. He clavado más páginas por todo el edificio. No te fíes de las paredes: algunas voces solo están dentro de tu cabeza. — E.',
                relicIndex: -1
            },
            {
                cell: { c: 3, r: 8 }, side: 'W', title: 'Página 2 — Cera',
                text: 'La reliquia de la Capilla no está sobre el altar, aunque las velas quieran señalar el sitio. La escondí detrás, en el hueco entre el altar y el muro del fondo, tapada con una pila de cajas de cirios. Rodea el altar y mira entre las cajas y la piedra. Si la última vela se apaga, no respires. — E.',
                relicIndex: 0
            },
            {
                cell: { c: 12, r: 8 }, side: 'W', title: 'Página 3 — Vapor',
                text: 'La segunda está en las calderas. La metí en el hueco que queda entre la caldera grande y unas cajas de carbón, contra la pared del fondo. Hay que rodear; desde la puerta no se ve. No te quedes mucho: la caldera respira y ella escucha la respiración ajena. — E.',
                relicIndex: 1
            },
            {
                cell: { c: 22, r: 7 }, side: 'E', title: 'Página 4 — Polvo',
                text: 'En el Archivo está el plano y también la tercera. No la dejé en los estantes: está detrás del escritorio del plano, en el suelo, oculta por el mueble. Coge el plano primero; luego mira al otro lado antes de salir. — E.',
                relicIndex: 2
            },
            {
                cell: { c: 22, r: 17 }, side: 'E', title: 'Página 5 — Ficha 05',
                text: 'La cuarta la guardé en la Enfermería. No está sobre la cama cinco. La escondí detrás del armario de medicinas, en el hueco contra la pared. Si oyes una respiración que no es la tuya, no mires atrás. — E.',
                relicIndex: 3
            },
            {
                cell: { c: 6, r: 19 }, side: 'E', title: 'Página 6 — Tercer nicho',
                text: 'La quinta está en la Cripta. Es el tercer sarcófago, el que no tiene nombre. No está encima: la dejé en el suelo, a sus pies, del lado que no se ve desde la entrada. Lleva una vela; no se la des a nadie. — E.',
                relicIndex: 4
            },
            {
                cell: { c: 14, r: 22 }, side: 'S', title: 'Página 7 — Silbidos',
                text: 'Si has llegado hasta aquí, ya tienes las cinco. La puerta de la SALIDA está al este; los sellos se apagarán cuando las tengas. Y si oyes un silbido, no lo sigas: es ella. Cuanto más cerca suene, más cerca está. Apaga la linterna y corre. — Elena.',
                relicIndex: -1
            }
        ];

        const sideData = {
            N: { dr: -1, dc: 0, rot: 0, ox: 0, oz: -2 + 0.09 },
            S: { dr: 1, dc: 0, rot: Math.PI, ox: 0, oz: 2 - 0.09 },
            E: { dr: 0, dc: 1, rot: -Math.PI / 2, ox: 2 - 0.09, oz: 0 },
            W: { dr: 0, dc: -1, rot: Math.PI / 2, ox: -2 + 0.09, oz: 0 }
        };

        noteDefs.forEach((def, index) => {
            const side = sideData[def.side];
            const x = def.cell.c * this.wallSize + side.ox;
            const z = def.cell.r * this.wallSize + side.oz;

            const material = new THREE.MeshStandardMaterial({
                map: TextureGenerator.createNoteTexture(),
                roughness: 0.95,
                metalness: 0,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.05), material);
            mesh.position.set(x, 1.7, z);
            mesh.rotation.y = side.rot;
            this.scene.add(mesh);

            // Small nail
            const nail = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), this.metalMat);
            nail.position.set(x, 2.2, z);
            this.scene.add(nail);

            this.notes.push({
                id: index,
                mesh,
                material,
                position: new THREE.Vector3(x, 1.7, z),
                title: def.title,
                text: def.text,
                relicIndex: def.relicIndex,
                read: false
            });
        });
    }

    buildMapPickup() {
        const group = new THREE.Group();
        const blueprintTex = TextureGenerator.createBlueprintTexture();

        const rollMat = new THREE.MeshStandardMaterial({
            map: blueprintTex,
            roughness: 0.7,
            metalness: 0.05,
            emissive: 0x223344,
            emissiveIntensity: 0.25
        });

        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 10), rollMat);
        roll.rotation.z = Math.PI / 2;
        roll.rotation.y = 0.4;
        roll.position.y = 0.22;
        roll.castShadow = true;
        group.add(roll);

        const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 5, 12), this.rustMat);
        ribbon.rotation.y = Math.PI / 2;
        ribbon.position.set(0.25, 0.22, 0);
        group.add(ribbon);

        group.position.set(86, 1.13, 12);
        this.scene.add(group);

        const glow = new THREE.PointLight(0x88ccff, 1.8, 3.5, 1.7);
        glow.position.set(86, 1.6, 12);
        this.scene.add(glow);

        this.mapPickup = {
            group,
            position: new THREE.Vector3(86, 1.3, 12),
            collected: false
        };
    }

    buildExitDoor() {
        const doorTex = TextureGenerator.createDoorTexture();
        const doorMat = new THREE.MeshStandardMaterial({
            map: doorTex,
            roughness: 0.55,
            metalness: 0.6,
            side: THREE.DoubleSide
        });

        const doorGeo = new THREE.BoxGeometry(0.22, 3.9, 3.2);
        this.exitDoorMesh = new THREE.Mesh(doorGeo, doorMat);
        this.exitDoorMesh.position.set(89.7, 1.95, 80);
        this.exitDoorMesh.castShadow = true;
        this.scene.add(this.exitDoorMesh);

        // Steel frame
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.6, metalness: 0.55 });
        // Side posts and header
        this.addBox(89.5, 0, 77.9, 0.6, 4.5, 0.45, frameMat, false);
        this.addBox(89.5, 0, 82.1, 0.6, 4.5, 0.45, frameMat, false);
        this.addBox(89.5, 4.1, 80, 0.6, 0.45, 4.6, frameMat, false);

        // Hazard threshold
        const threshold = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), this.hazardMat);
        threshold.rotation.x = -Math.PI / 2;
        threshold.rotation.z = Math.PI / 2;
        threshold.position.set(89.3, 0.05, 80);
        this.scene.add(threshold);

        // Relic seals above the door
        this.sealLights = [];
        for (let i = 0; i < 5; i++) {
            const sealMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 10, 10),
                new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, emissiveIntensity: 1 })
            );
            sealMesh.position.set(89.48, 3.02, 78.95 + i * 0.525);
            this.scene.add(sealMesh);
            this.sealLights.push(sealMesh);
        }

        // Cold light over the exit
        const exitLight = new THREE.PointLight(0x88ffbb, 2.4, 10, 1.7);
        exitLight.position.set(88.4, 4.2, 80);
        this.scene.add(exitLight);

        // Proper illuminated SALIDA sign above the door
        const signTex = TextureGenerator.createExitSignTexture();
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(1.7, 0.62),
            new THREE.MeshBasicMaterial({
                map: signTex,
                toneMapped: false,
                side: THREE.DoubleSide
            })
        );
        sign.position.set(89.56, 3.72, 80);
        sign.rotation.y = -Math.PI / 2;
        this.scene.add(sign);
    }

    scatterDetails() {
        // Small rubble, debris and broken tiles
        const debrisMat = new THREE.MeshStandardMaterial({ color: 0x232227, roughness: 0.95 });
        for (let i = 0; i < 70; i++) {
            const cell = this.getRandomWalkableCell();
            const size = 0.1 + Math.random() * 0.28;
            const debris = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.5, size), debrisMat);
            debris.position.set(cell.x + (Math.random() - 0.5) * 3, size * 0.25, cell.z + (Math.random() - 0.5) * 3);
            debris.rotation.y = Math.random() * Math.PI;
            this.scene.add(debris);
        }
    }

    /* -------------------------- Simulation ---------------------------- */
    updateLights(time) {
        this.flickerLights.forEach(item => {
            if (!item.flicker) return;
            const flicker = Math.sin(time * 9 + item.seed) * 0.28 + Math.cos(time * 23 + item.seed) * 0.18;
            const value = Math.max(0.05, item.baseIntensity + flicker);
            item.light.intensity = value;
            if (item.bulb) item.bulb.material.emissiveIntensity = 0.4 + value * 0.8;
        });

        this.relicObjects.forEach(relic => {
            if (!relic.collected && relic.mesh) {
                relic.mesh.rotation.y += 0.018;
                relic.mesh.position.y = relic.floatHeight + Math.sin(time * 2.4 + relic.position.x) * 0.09;
            }
        });

        if (this.mapPickup && !this.mapPickup.collected) {
            this.mapPickup.group.rotation.y = Math.sin(time * 0.8) * 0.25;
        }
    }

    updateDoorSeals(collectedCount) {
        if (!this.sealLights) return;
        for (let i = 0; i < this.sealLights.length; i++) {
            const lit = i < collectedCount;
            this.sealLights[i].material.color.setHex(lit ? 0x66ffcc : 0x222222);
            this.sealLights[i].material.emissive.setHex(lit ? 0x00ff99 : 0x000000);
            this.sealLights[i].material.emissiveIntensity = lit ? 1.4 : 0;
        }
    }

    /* ------------------------- Pathfinding ---------------------------- */
    getPath(startWorld, endWorld) {
        const start = this.worldToCell(startWorld);
        const goal = this.worldToCell(endWorld);
        if (!this.isWalkableCell(start.c, start.r) || !this.isWalkableCell(goal.c, goal.r)) return [];

        const key = (c, r) => r * this.cols + c;
        const queue = [start];
        const visited = new Set([key(start.c, start.r)]);
        const parent = new Map();

        while (queue.length) {
            const current = queue.shift();
            if (current.c === goal.c && current.r === goal.r) {
                const path = [];
                let cell = current;
                while (!(cell.c === start.c && cell.r === start.r)) {
                    path.unshift(new THREE.Vector3(cell.c * this.wallSize, 0, cell.r * this.wallSize));
                    cell = parent.get(key(cell.c, cell.r));
                }
                return path;
            }

            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nc = current.c + dc;
                const nr = current.r + dr;
                if (!this.isWalkableCell(nc, nr)) continue;
                const k = key(nc, nr);
                if (visited.has(k)) continue;
                visited.add(k);
                parent.set(k, current);
                queue.push({ c: nc, r: nr });
            }
        }
        return [];
    }
}
