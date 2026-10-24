/* Stalker Monster AI (pathfinding) & 3D Model */

class ShadowMonster {
    constructor(scene, colliders, map) {
        this.scene = scene;
        this.colliders = colliders;
        this.map = map;

        this.mesh = null;
        this.leftEye = null;
        this.rightEye = null;
        this.headMesh = null;
        this.armLeft = null;
        this.armRight = null;

        this.position = map ? map.monsterSpawn.clone() : new THREE.Vector3(56, 0, 48);
        this.speed = 2.7;
        this.chaseSpeed = 5.4;

        this.state = 'PATROL'; // PATROL | INVESTIGATE | CHASE
        this.patrolTarget = new THREE.Vector3();
        this.investigateTarget = null;
        this.path = [];
        this.pathTimer = 0;
        this.animTime = 0;

        this.createMonsterMesh();
    }

    createMonsterMesh() {
        const monsterGroup = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x040407,
            roughness: 0.96,
            metalness: 0.05
        });
        const boneMat = new THREE.MeshStandardMaterial({
            color: 0x2a2622,
            roughness: 0.9
        });

        // Hunched torso
        const torsoGeo = new THREE.CylinderGeometry(0.36, 0.24, 2.8, 8);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.set(0, 2.4, 0.12);
        torso.rotation.x = 0.2;
        torso.castShadow = true;
        monsterGroup.add(torso);

        // Shoulder blades
        const shoulderGeo = new THREE.SphereGeometry(0.3, 8, 6);
        for (const sx of [-0.42, 0.42]) {
            const shoulder = new THREE.Mesh(shoulderGeo, bodyMat);
            shoulder.position.set(sx, 3.15, 0.18);
            shoulder.scale.set(1, 1.3, 0.8);
            monsterGroup.add(shoulder);
        }

        // Ribcage suggestion
        for (let i = 0; i < 3; i++) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 4, 10), boneMat);
            rib.position.set(0, 2.0 + i * 0.34, 0.25);
            rib.rotation.x = Math.PI / 2;
            monsterGroup.add(rib);
        }

        // Head
        const headGeo = new THREE.SphereGeometry(0.33, 12, 12);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 3.95, 0.28);
        this.headMesh.scale.set(0.85, 1.15, 0.9);
        this.headMesh.castShadow = true;
        monsterGroup.add(this.headMesh);

        // Jaw
        const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), boneMat);
        jaw.position.set(0, 3.72, 0.6);
        jaw.rotation.x = Math.PI / 2;
        monsterGroup.add(jaw);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.13, 4.02, 0.53);
        monsterGroup.add(this.leftEye);
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.13, 4.02, 0.53);
        monsterGroup.add(this.rightEye);

        this.eyeLight = new THREE.PointLight(0xff0000, 1.4, 6, 2);
        this.eyeLight.position.set(0, 3.95, 0.55);
        monsterGroup.add(this.eyeLight);

        // Long arms
        const armGeo = new THREE.CylinderGeometry(0.085, 0.05, 2.7, 6);
        this.armLeft = new THREE.Mesh(armGeo, bodyMat);
        this.armLeft.position.set(-0.55, 2.4, 0.22);
        this.armLeft.rotation.z = 0.18;
        monsterGroup.add(this.armLeft);

        this.armRight = new THREE.Mesh(armGeo, bodyMat);
        this.armRight.position.set(0.55, 2.4, 0.22);
        this.armRight.rotation.z = -0.18;
        monsterGroup.add(this.armRight);

        // Claws
        const clawGeo = new THREE.ConeGeometry(0.05, 0.4, 5);
        for (let i = 0; i < 3; i++) {
            const clawL = new THREE.Mesh(clawGeo, boneMat);
            clawL.position.set(-0.62, 1.02, 0.24 + i * 0.1);
            clawL.rotation.x = Math.PI;
            monsterGroup.add(clawL);
            const clawR = new THREE.Mesh(clawGeo, boneMat);
            clawR.position.set(0.62, 1.02, 0.24 + i * 0.1);
            clawR.rotation.x = Math.PI;
            monsterGroup.add(clawR);
        }

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.13, 0.08, 2.2, 6);
        const legLeft = new THREE.Mesh(legGeo, bodyMat);
        legLeft.position.set(-0.25, 1.1, 0);
        monsterGroup.add(legLeft);
        const legRight = new THREE.Mesh(legGeo, bodyMat);
        legRight.position.set(0.25, 1.1, 0);
        monsterGroup.add(legRight);

        this.mesh = monsterGroup;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        this.getNewPatrolTarget();
    }

    getNewPatrolTarget() {
        if (this.map && this.map.getRandomWalkableCell) {
            this.patrolTarget.copy(this.map.getRandomWalkableCell());
            this.patrolTarget.y = 0;
        } else {
            this.patrolTarget.set(56, 0, 48);
        }
        this.path = [];
        this.pathTimer = 0;
    }

    recomputePath(target) {
        if (!this.map || !target) return;
        this.path = this.map.getPath(this.mesh.position, target) || [];
    }

    update(delta, playerPos, isPlayerSprinting, isFlashlightOn) {
        if (!this.mesh) return 0;

        this.animTime += delta;
        const distToPlayer = this.mesh.position.distanceTo(playerPos);

        // ---------------- Detection ----------------
        let detectionThreshold = 13;
        if (isPlayerSprinting) detectionThreshold += 11;
        if (isFlashlightOn) detectionThreshold += 7;

        const hasSight = this.checkLineOfSight(playerPos);

        if (distToPlayer < detectionThreshold && (hasSight || distToPlayer < 6 || isPlayerSprinting)) {
            if (this.state !== 'CHASE') {
                this.state = 'CHASE';
                this.pathTimer = 0;
                if (window.horrorAudio) window.horrorAudio.playMonsterGrowl();
            }
        } else if (this.state === 'CHASE' && distToPlayer > 30) {
            this.state = 'INVESTIGATE';
            this.investigateTarget = playerPos.clone();
            this.path = [];
            this.pathTimer = 0;
        }

        // ---------------- Target selection ----------------
        let target = null;
        let currentSpeed = this.speed;

        if (this.state === 'CHASE') {
            target = playerPos;
            currentSpeed = this.chaseSpeed;
        } else if (this.state === 'INVESTIGATE') {
            target = this.investigateTarget;
            currentSpeed = this.speed * 1.15;
            if (!target || this.mesh.position.distanceTo(target) < 2.2) {
                this.state = 'PATROL';
                this.getNewPatrolTarget();
                target = this.patrolTarget;
            }
        } else {
            target = this.patrolTarget;
            if (!target || this.mesh.position.distanceTo(target) < 2.2) {
                this.getNewPatrolTarget();
                target = this.patrolTarget;
            }
        }

        // ---------------- Path following ----------------
        this.pathTimer -= delta;
        if (this.path.length === 0 || this.pathTimer <= 0) {
            const repathInterval = this.state === 'CHASE' ? 0.45 : 1.6;
            if (this.pathTimer <= 0 || this.path.length === 0) {
                this.recomputePath(target);
                this.pathTimer = repathInterval;
            }
        }

        let waypoint = this.path.length ? this.path[0] : null;

        if (waypoint) {
            const flatDist = Math.hypot(waypoint.x - this.mesh.position.x, waypoint.z - this.mesh.position.z);
            if (flatDist < 0.9) {
                this.path.shift();
                waypoint = this.path.length ? this.path[0] : null;
            }
        }

        const moveTarget = waypoint || target;
        if (moveTarget) {
            const dir = new THREE.Vector3(
                moveTarget.x - this.mesh.position.x,
                0,
                moveTarget.z - this.mesh.position.z
            );

            if (dir.lengthSq() > 0.0001) {
                dir.normalize();
                this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

                const stepDistance = currentSpeed * delta;
                const nextPos = this.mesh.position.clone().add(dir.clone().multiplyScalar(stepDistance));

                if (!this.checkWallCollision(nextPos)) {
                    this.mesh.position.copy(nextPos);
                } else {
                    // Slide along walls and force a fresh path
                    const up = new THREE.Vector3(0, 1, 0);
                    let slid = false;
                    for (const angle of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
                        const alt = dir.clone().applyAxisAngle(up, angle);
                        const altPos = this.mesh.position.clone().add(alt.multiplyScalar(stepDistance));
                        if (!this.checkWallCollision(altPos)) {
                            this.mesh.position.copy(altPos);
                            slid = true;
                            break;
                        }
                    }
                    if (!slid) this.pathTimer = 0;
                }
            }
        }

        // ---------------- Animation ----------------
        this.headMesh.rotation.z = Math.sin(this.animTime * 11) * 0.14;
        this.headMesh.rotation.y = Math.cos(this.animTime * 7) * 0.2;

        if (this.state === 'CHASE') {
            this.armLeft.rotation.x = Math.sin(this.animTime * 14) * 0.85;
            this.armRight.rotation.x = -Math.sin(this.animTime * 14) * 0.85;
            this.eyeLight.intensity = 2.4 + Math.sin(this.animTime * 18) * 1.0;
        } else {
            this.armLeft.rotation.x = Math.sin(this.animTime * 3.5) * 0.22;
            this.armRight.rotation.x = -Math.sin(this.animTime * 3.5) * 0.22;
            this.eyeLight.intensity = 1.2;
        }

        if (window.horrorAudio) window.horrorAudio.updateMonsterProximity(distToPlayer);

        return distToPlayer;
    }

    checkLineOfSight(playerPos) {
        if (!this.map || !this.map.wallMeshes.length) return true;

        const raycaster = new THREE.Raycaster();
        const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 3.2, 0));
        const target = playerPos.clone().add(new THREE.Vector3(0, 0.2, 0));
        const dir = new THREE.Vector3().subVectors(target, origin).normalize();
        const distance = origin.distanceTo(target);

        raycaster.set(origin, dir);
        raycaster.far = distance;

        const hits = raycaster.intersectObjects(this.map.wallMeshes, false);
        return hits.length === 0;
    }

    checkWallCollision(pos) {
        const radius = 0.65;
        const monsterBox = new THREE.Box3(
            new THREE.Vector3(pos.x - radius, 0.2, pos.z - radius),
            new THREE.Vector3(pos.x + radius, 4.2, pos.z + radius)
        );
        for (let i = 0; i < this.colliders.length; i++) {
            if (monsterBox.intersectsBox(this.colliders[i])) return true;
        }
        return false;
    }
}
