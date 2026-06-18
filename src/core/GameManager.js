import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COSMIC_LEVELS } from '../data/LevelData.js';

export class GameManager {
    constructor(scene, physicsWorld, audioListener) {
        this.scene = scene;
        this.physicsWorld = physicsWorld.world || physicsWorld; 
        this.audioListener = audioListener;

        this.starMaterial = new CANNON.Material("starMaterial");
        const starContactMat = new CANNON.ContactMaterial(this.starMaterial, this.starMaterial, {
            friction: 0.0,      
            restitution: 0.6    
        });
        this.physicsWorld.addContactMaterial(starContactMat);
        
        this.stars = [];
        this.snapZones = [];
        this.particles = [];
        this.shootingStars = [];
        this.easterEggs = [];
        this.backgroundPlanets = [];
        
        this.currentLevelIdx = 0;
        this.gameMode = 'normal';
        this.timeLeft = 0;
        this.score = 0;
        this.totalTimeUsed = 0;
        this.isPlaying = false;
        this.isPaused = false; // Thêm trạng thái Pause
        this.timerInterval = null;
        this.starInterval = null;
        
        this.consecutiveCorrect = 0; 
        this.orbitTimer = 0;
        this.orbitSpeed = 0.005; 
        this.blindTimer = 0;
        this.isBlind = false;
        this.bombSpawnTimer = 0;

        this.currentHeldBall = null;
        this.basicColorRespawnTimer = 0; 

        this.BOMB_SPAWN_INTERVAL = 8.0; 
        this.ORBIT_CHANGE_INTERVAL = 5.0; 

        this.mixRecipes = [
            { c1: 0xff0000, c2: 0xffff00, result: 0xff8800, name: "CAM" },
            { c1: 0x0000ff, c2: 0xffff00, result: 0x00ff00, name: "XANH LÁ" },
            { c1: 0xff0000, c2: 0x0000ff, result: 0x800080, name: "TÍM" }
        ];

        this.wheelGroup = new THREE.Group();
        this.wheelGroup.position.set(0, 1.45, -1.5);
        this.scene.add(this.wheelGroup);

        this.textureLoader = new THREE.TextureLoader();
        this.audioLoader = new THREE.AudioLoader();
        
        this.explosionSound = new THREE.Audio(this.audioListener);
        this.levelUpSound = new THREE.Audio(this.audioListener);
        this.victorySound = new THREE.Audio(this.audioListener);
        this.gameOverSound = new THREE.Audio(this.audioListener);
        this.tingSound = new THREE.Audio(this.audioListener);
        this.errorSound = new THREE.Audio(this.audioListener); 
        this.countdownSound = new THREE.Audio(this.audioListener); 

        this.audioLoader.load('./src/sounds/explosion.mp3', b => this.explosionSound.setBuffer(b), undefined, () => {});
        this.audioLoader.load('./src/sounds/levelup.mp3', b => { this.levelUpSound.setBuffer(b); this.levelUpSound.setVolume(0.4); }, undefined, () => {});
        this.audioLoader.load('./src/sounds/victory.mp3', b => this.victorySound.setBuffer(b), undefined, () => {});
        this.audioLoader.load('./src/sounds/gameover.mp3', b => this.gameOverSound.setBuffer(b), undefined, () => {});
        this.audioLoader.load('./src/sounds/ting.mp3', b => { this.tingSound.setBuffer(b); this.tingSound.setVolume(0.8); }, undefined, () => {});
        this.audioLoader.load('./src/sounds/error.mp3', b => { this.errorSound.setBuffer(b); this.errorSound.setVolume(0.6); }, undefined, () => {});
        this.audioLoader.load('./src/sounds/countdown.mp3', b => { this.countdownSound.setBuffer(b); this.countdownSound.setVolume(1.0); }, undefined, () => {}); 

        this.textureLoader.load('../../textures/07_milkyway.jpg', (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = tex;
        });

        this.setup3DUI();
        window.gameInstance = this;
    }

    setup3DUI() {
        this.uiCanvas = document.createElement('canvas');
        this.uiCanvas.width = 1024;
        this.uiCanvas.height = 512;
        this.uiCtx = this.uiCanvas.getContext('2d');
        this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
        const uiPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(3.0, 1.5),
            new THREE.MeshBasicMaterial({ map: this.uiTexture, transparent: true, side: THREE.DoubleSide })
        );
        uiPanel.position.set(0, 3.5, -4.5); 
        this.uiPanel = uiPanel; 
        this.scene.add(uiPanel);
    }

    update3DUI(statusMsg = "") {
        this.uiCtx.clearRect(0, 0, 1024, 512);
        this.uiCtx.fillStyle = 'rgba(0, 20, 50, 0.7)';
        this.uiCtx.fillRect(0, 0, 1024, 512);
        this.uiCtx.strokeStyle = '#00d4ff';
        this.uiCtx.lineWidth = 15;
        this.uiCtx.strokeRect(0, 0, 1024, 512);

        const currentLevelZones = this.snapZones.filter(z => z.userData.level === this.currentLevelIdx);
        const totalRequired = currentLevelZones.length;
        const currentFilled = currentLevelZones.filter(z => z.userData.isFilled).length;

        this.uiCtx.fillStyle = '#00ffcc';
        this.uiCtx.font = 'bold 70px Arial, sans-serif';
        this.uiCtx.fillText(`LEVEL: ${this.currentLevelIdx + 1} (${currentFilled}/${totalRequired})`, 60, 100);
        
        let timeColor = '#ffffff';
        if (this.gameMode !== 'normal' && this.timeLeft <= 10 && this.timeLeft > 0) {
            timeColor = (Math.floor(Date.now() / 500) % 2 === 0) ? '#ff3333' : '#ffff00'; 
        }
        
        this.uiCtx.fillStyle = timeColor;
        this.uiCtx.font = 'bold 90px Arial, sans-serif';
        const timeText = (this.gameMode === 'normal') ? "∞" : `${this.timeLeft}s`;
        this.uiCtx.fillText(`TIME: ${timeText}`, 60, 220);
        
        this.uiCtx.fillStyle = '#ffd700';
        this.uiCtx.font = 'bold 80px Arial, sans-serif';
        this.uiCtx.fillText(`SCORE: ${this.score}`, 60, 330);

        if (this.consecutiveCorrect > 1) {
            this.uiCtx.fillStyle = '#ff00ff';
            this.uiCtx.font = 'bold 50px Arial, sans-serif';
            this.uiCtx.fillText(`🔥 COMBO x${this.consecutiveCorrect}`, 60, 410);
        }

        if (statusMsg) {
            this.uiCtx.fillStyle = statusMsg.includes("SAI") || statusMsg.includes("HỤT") ? '#ff3333' : '#ff9900';
            this.uiCtx.font = 'bold 45px Arial, sans-serif';
            this.uiCtx.fillText(statusMsg, 60, 480);
        }
        this.uiTexture.needsUpdate = true;
    }

    // THÊM: Tính năng Tạm dừng
    togglePause() {
        if (!this.isPlaying) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.update3DUI("ĐÃ TẠM DỪNG GAME");
            const camera = this.audioListener.parent;
            if(camera) {
                this.uiPanel.position.copy(camera.position);
                const forward = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
                this.uiPanel.position.add(forward);
                this.uiPanel.lookAt(camera.position);
            }
        } else {
            this.update3DUI();
            this.uiPanel.position.set(0, 3.5, -4.5); 
        }
    }

    initGame(mode) {
        this.gameMode = mode;
        this.score = 0;
        this.totalTimeUsed = 0;
        this.currentLevelIdx = 0;
        this.consecutiveCorrect = 0; 
        this.isPlaying = true;
        this.isPaused = false;
        this.snapZones = [];
        this.bombSpawnTimer = 0;
        this.basicColorRespawnTimer = 0;
        this.uiPanel.position.set(0, 3.5, -4.5); 

        if (this.countdownSound && this.countdownSound.isPlaying) this.countdownSound.stop();

        while(this.wheelGroup.children.length) this.wheelGroup.remove(this.wheelGroup.children[0]);
        this.stars.forEach(s => { this.scene.remove(s); if(s.userData.physicsBody) this.physicsWorld.removeBody(s.userData.physicsBody); });
        this.stars = [];
        this.easterEggs.forEach(egg => { this.scene.remove(egg.mesh); this.physicsWorld.removeBody(egg.body); });
        this.easterEggs = [];
        
        this.spawnBackgroundPlanets();
        this.spawnAllStars(); 
        this.spawnInteractiveCrystals();
        
        if (this.starInterval) clearInterval(this.starInterval);
        this.starInterval = setInterval(() => this.spawnShootingStar(), 5000);
        
        this.loadLevel(0);
        this.startCountdown();
    }

    startCountdown() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = (this.gameMode === 'normal') ? 999 : (55 - (this.currentLevelIdx * 3));
        
        this.timerInterval = setInterval(() => {
            if (!this.isPlaying || this.isPaused) return; // Không đếm lùi khi pause
            this.totalTimeUsed++; 
            if (this.gameMode !== 'normal') {
                this.timeLeft--;
                if (this.timeLeft <= 0) this.gameOver();
            }
            this.update3DUI();
        }, 1000);
    }

    getSafeCrystalPosition(existingPositions) {
        const MIN_DIST = 1.0; 
        let pos;
        let isValid = false;
        let attempts = 0;

        while (!isValid && attempts < 50) {
            attempts++;
            const x = (Math.random() - 0.5) * 4.0; 
            const y = 1.2 + Math.random() * 0.8;   
            const z = -1.5 + Math.random() * 2.5;  
            
            pos = new THREE.Vector3(x, y, z);
            isValid = true;

            for (let i = 0; i < existingPositions.length; i++) {
                if (pos.distanceTo(existingPositions[i]) < MIN_DIST) {
                    isValid = false; 
                    break;
                }
            }
        }
        return pos;
    }

    spawnBackgroundPlanets() {
        this.backgroundPlanets.forEach(p => this.scene.remove(p));
        this.backgroundPlanets = [];

        const TEX_BASE = '../../textures/';
        const planetConfigs = [
            { tex: TEX_BASE + '00_earthmap8k.jpg', name: 'TRÁI ĐẤT', angle: 0, y: 5, hasRing: false, baseR: 35, hasClouds: true },
            { tex: TEX_BASE + 'outer_core.jpg', name: 'SAO THỔ', angle: Math.PI / 2, y: 0, hasRing: true, baseR: 37, hasClouds: false },
            { tex: TEX_BASE + 'lower_mantle.jpg', name: 'HÀNH TINH PANDORA', angle: 5 * Math.PI / 4, y: -4, hasRing: false, baseR: 31, hasClouds: false },
            { tex: TEX_BASE + 'upper_mantle.jpg', name: 'HÀNH TINH KRYPTON', angle: Math.PI / 4, y: 15, hasRing: false, baseR: 33, hasClouds: false }
        ];

        planetConfigs.forEach(cfg => {
            const r = cfg.baseR + (Math.random() * 8 - 4); 
            const size = 1.0 + Math.random() * 0.2; 
            
            const pos = new THREE.Vector3(Math.cos(cfg.angle) * r, cfg.y, -10 + Math.sin(cfg.angle) * r);
            const geo = new THREE.SphereGeometry(size, 32, 32);
            
            const mat = new THREE.MeshLambertMaterial({ map: this.textureLoader.load(cfg.tex), emissive: 0x111111 });
            const planet = new THREE.Mesh(geo, mat);
            planet.position.copy(pos);

            planet.rotation.x = Math.random() * 0.5;
            planet.rotation.y = Math.random() * Math.PI;
            planet.userData = { isPlanet: true, name: cfg.name };

            if (cfg.hasClouds) {
                const cloudGeo = new THREE.SphereGeometry(size * 1.03, 32, 32);
                const cloudMat = new THREE.MeshBasicMaterial({ map: this.textureLoader.load(TEX_BASE + '04_earthcloudmap.jpg'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
                const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
                planet.add(cloudMesh);
                planet.userData.cloudMesh = cloudMesh; 
            }

            if (cfg.hasRing) {
                planet.rotation.x = 0.3; planet.rotation.z = 0.2;
                
                const ring1 = new THREE.Mesh(new THREE.RingGeometry(size * 1.15, size * 1.35, 64), new THREE.MeshBasicMaterial({ color: 0xaa9988, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
                ring1.rotation.x = Math.PI / 2; planet.add(ring1);

                const ring2 = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 1.85, 64), new THREE.MeshBasicMaterial({ color: 0xd1c2a3, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
                ring2.rotation.x = Math.PI / 2; planet.add(ring2);

                const ring3 = new THREE.Mesh(new THREE.RingGeometry(size * 1.9, size * 2.2, 64), new THREE.MeshBasicMaterial({ color: 0xb5a58c, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
                ring3.rotation.x = Math.PI / 2; planet.add(ring3);
            }

            this.scene.add(planet);
            this.backgroundPlanets.push(planet);
        });
    }

    spawnInteractiveCrystals() {
        const size = 0.12; 
        const types = [
            new THREE.BoxGeometry(size * 1.2, size * 1.2, size * 1.2), 
            new THREE.OctahedronGeometry(size),          
            new THREE.TetrahedronGeometry(size)          
        ];
        const existingPositions = [];

        for(let i = 0; i < 5; i++) {
            const pos = this.getSafeCrystalPosition(existingPositions);
            existingPositions.push(pos);
            const geo = types[Math.floor(Math.random() * types.length)];
            
            const randomColor = Math.random() * 0xffffff;
            const isSecret = i < 2; 
            const emissiveIntensity = isSecret ? 1.5 : 0.8;
            
            const mat = new THREE.MeshStandardMaterial({ color: randomColor, wireframe: true, emissive: randomColor, emissiveIntensity });
            const crystal = new THREE.Mesh(geo, mat);
            crystal.position.copy(pos);

            const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Sphere(size) });
            body.position.copy(pos);

            const driftVel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1, 
                (Math.random() - 0.5) * 0.1, 
                0.05 + Math.random() * 0.1 
            );

            crystal.userData = { 
                isEasterEgg: true, 
                active: true, 
                isBreakable: isSecret, 
                type: isSecret ? 'secret' : 'normal', 
                points: isSecret ? 400 : 100, 
                radius: size, 
                driftVel: driftVel 
            };
            
            this.scene.add(crystal);
            this.physicsWorld.addBody(body);
            this.easterEggs.push({ mesh: crystal, body: body });
        }
    }

    spawnShootingStar() {
        if (!this.isPlaying || this.isPaused) return;
        const geo = new THREE.CylinderGeometry(0.01, 0.05, 3, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const star = new THREE.Mesh(geo, mat);
        
        const startX = (Math.random() - 0.5) * 60; 
        const startY = 10 + Math.random() * 20;    
        const startZ = (Math.random() - 0.5) * 60;
        
        star.position.set(startX, startY, startZ);
        
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            -(15 + Math.random() * 20), 
            (Math.random() - 0.5) * 40
        );
        
        star.userData = { velocity: vel, life: 4.0 };
        star.lookAt(star.position.clone().sub(vel)); 
        
        this.scene.add(star);
        this.shootingStars.push(star);
    }

    spawnAllStars() {
        COSMIC_LEVELS.forEach((lvl, lvlIdx) => {
            lvl.colors.forEach(c => {
                this.createStar(c.hex, false, [], c.name, lvlIdx);
            });
        });
        
        const allColors = [];
        COSMIC_LEVELS.forEach(lvl => lvl.colors.forEach(c => allColors.push(c)));
        this.createStar(allColors[0].hex, true, allColors, "BI BIẾN ĐỔI", 0);
        this.createStar(allColors[1].hex, true, allColors, "BI BIẾN ĐỔI", 0);
    }

    createStar(hex, isCycle, colors = [], colorName = "", level = 0) {
        const starRadius = 0.135;
        const star = new THREE.Mesh(
            new THREE.SphereGeometry(starRadius, 32, 32),
            new THREE.MeshBasicMaterial({ color: hex })
        );
        
        const startX = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5); 
        const startY = 0.8 + Math.random() * 1.5;
        const startZ = 0.5 + Math.random() * 1.5; 
        
        star.position.set(startX, startY, startZ);
        star.visible = true;

        const body = new CANNON.Body({
            mass: 0.1, 
            type: CANNON.Body.KINEMATIC, 
            shape: new CANNON.Sphere(starRadius),
            material: this.starMaterial, 
            linearDamping: 0.8
        });
        body.position.copy(star.position);

        star.userData = { hex, colorName, level, physicsBody: body, isStar: true, isSnapped: false, isCycle, cycleTimer: 0, allColors: colors, currentColorIdx: 0, isBomb: false, snappedTo: null, isStopped: false };
        
        if (isCycle) {
            const aura = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 }));
            aura.name = "aura";
            star.add(aura);
        }

        this.scene.add(star);
        this.physicsWorld.addBody(body);
        this.stars.push(star);
        return star;
    }

    spawnBomb() {
        const levelColors = COSMIC_LEVELS[this.currentLevelIdx].colors;
        const randomColorObj = levelColors[Math.floor(Math.random() * levelColors.length)];
        const bomb = this.createStar(randomColorObj.hex, false, [], `BOM (${randomColorObj.name})`, this.currentLevelIdx);
        
        bomb.position.set(0, 1.4, -0.5); 
        bomb.userData.physicsBody.position.copy(bomb.position);
        bomb.userData.isBomb = true;
        bomb.userData.bombTimer = 4.0; 

        const warningGeo = new THREE.RingGeometry(0.22, 0.27, 32);
        const warningMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const warningRing = new THREE.Mesh(warningGeo, warningMat);
        bomb.add(warningRing);
        bomb.userData.warningRing = warningRing;
    }

    loadLevel(idx) {
        this.bombSpawnTimer = 0;
        this.currentLevelIdx = idx;
        
        const BASE_RADIUS = 1.5;
        const RADIUS_STEP = 0.5; 

        this.snapZones.forEach(z => {
            const levelDiff = idx - z.userData.level;
            const newRadius = BASE_RADIUS - (levelDiff * RADIUS_STEP); 
            const angle = Math.atan2(z.position.y, z.position.x);
            z.position.set(Math.cos(angle) * newRadius, Math.sin(angle) * newRadius, 0);
            
            const s = Math.max(0.3, 1.0 - (levelDiff * 0.2));
            z.scale.setScalar(s);

            this.stars.forEach(star => {
                if (star.userData.isSnapped && star.userData.snappedTo === z) {
                    star.position.copy(z.position);
                    star.scale.setScalar(s);
                }
            });
        });

        const angleOffsets = [0, Math.PI / 3, Math.PI / 6];
        const currentOffset = angleOffsets[idx] || 0;

        COSMIC_LEVELS[idx].colors.forEach((color, i) => {
            const angle = ((i / COSMIC_LEVELS[idx].colors.length) * Math.PI * 2) + currentOffset;
            
            const meteorite = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.18, 1),
                new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: false }) 
            );
            meteorite.position.set(Math.cos(angle) * BASE_RADIUS, Math.sin(angle) * BASE_RADIUS, 0);
            
            const glow = new THREE.Mesh(
                new THREE.TorusGeometry(0.27, 0.035, 16, 32), 
                new THREE.MeshBasicMaterial({ color: color.hex, transparent: true, opacity: 0.6 })
            );
            meteorite.add(glow);
            meteorite.userData = { hex: color.hex, isFilled: false, glowMesh: glow, level: idx };
            this.wheelGroup.add(meteorite);
            this.snapZones.push(meteorite);
        });

        this.update3DUI();
    }

    checkBallFusions() {
        const fusionDist = 0.45; 
        const currentLevelColorsFull = COSMIC_LEVELS[this.currentLevelIdx].colors;

        for (let i = 0; i < this.stars.length; i++) {
            for (let j = i + 1; j < this.stars.length; j++) {
                const s1 = this.stars[i];
                const s2 = this.stars[j];

                if (s1.userData.isSnapped || s2.userData.isSnapped || 
                    !s1.visible || !s2.visible || s1.userData.isBomb || s2.userData.isBomb ||
                    s1.userData.isCycle || s2.userData.isCycle || s1.userData.isDead || s2.userData.isDead) continue;

                const v1 = s1.userData.physicsBody.velocity.length();
                const v2 = s2.userData.physicsBody.velocity.length();
                const isAction = (v1 > 0.5 || v2 > 0.5 || this.currentHeldBall === s1 || this.currentHeldBall === s2);

                const dist = s1.position.distanceTo(s2.position);
                
                if (dist < fusionDist && isAction) {
                    const hex1 = s1.userData.hex;
                    const hex2 = s2.userData.hex;
                    
                    const recipe = this.mixRecipes.find(r => 
                        (r.c1 === hex1 && r.c2 === hex2) || (r.c1 === hex2 && r.c2 === hex1)
                    );

                    if (recipe) {
                        if (this.currentHeldBall === s1 || this.currentHeldBall === s2) {
                            this.currentHeldBall = null;
                        }

                        const exactColorObj = currentLevelColorsFull.find(c => c.name.toUpperCase() === recipe.name.toUpperCase());
                        const finalHex = exactColorObj ? exactColorObj.hex : recipe.result;

                        const midPoint = new THREE.Vector3().addVectors(s1.position, s2.position).multiplyScalar(0.5);

                        this.explode(s1.position, hex1);
                        this.explode(s2.position, hex2);
                        
                        if (this.explosionSound.buffer) this.explosionSound.play();
                        
                        if (this.tingSound && this.tingSound.buffer) {
                            if (this.tingSound.isPlaying) this.tingSound.stop();
                            this.tingSound.play();
                        }

                        s1.visible = false; s2.visible = false;
                        s1.userData.isDead = true; 
                        s2.userData.isDead = true;

                        this.scene.remove(s1); this.scene.remove(s2);
                        this.physicsWorld.removeBody(s1.userData.physicsBody);
                        this.physicsWorld.removeBody(s2.userData.physicsBody);

                        const newBall = this.createStar(finalHex, false, [], recipe.name, this.currentLevelIdx);
                        newBall.position.copy(midPoint);
                        newBall.userData.physicsBody.type = CANNON.Body.DYNAMIC;
                        newBall.userData.physicsBody.position.copy(midPoint);
                        newBall.userData.physicsBody.velocity.set(0, 2, 0); 
                        
                        if (window.showToast) window.showToast(`✨ ĐÃ PHA THÀNH MÀU ${recipe.name}!`);
                        return; 
                    }
                }
            }
        }
    }

    addScore(starData) {
        let basePoints = starData.isBomb ? 250 : (starData.isCycle ? 400 : 100);
        
        this.consecutiveCorrect++;
        let comboBonus = 0;
        
        if (this.consecutiveCorrect >= 2) {
            comboBonus = 120 + (this.consecutiveCorrect - 2) * 10;
        }

        let totalPoints = basePoints + comboBonus;
        this.score += totalPoints;
        
        let msg = `+${basePoints}`;
        if (comboBonus > 0) {
            msg += ` (+${comboBonus} COMBO)`;
        }
        
        this.update3DUI(msg);
    }

    handleMiss(reason = "SAI MÀU!") {
        this.consecutiveCorrect = 0;

        if (this.errorSound && this.errorSound.buffer) {
            if (this.errorSound.isPlaying) this.errorSound.stop();
            this.errorSound.play();
        }

        if (this.gameMode !== 'normal') {
            this.timeLeft -= 1;
            this.update3DUI(`${reason} (-1s)`);
        } else {
            this.update3DUI(reason);
        }
    }

    checkWin() {
        this.update3DUI();

        if (this.snapZones.every(z => z.userData.isFilled)) {
            this.isPlaying = false;
            
            if (this.countdownSound && this.countdownSound.isPlaying) this.countdownSound.stop();
            
            if (this.explosionSound.buffer) { this.explosionSound.play(); }
            
            this.snapZones.forEach(z => {
                if (z.userData.level === this.currentLevelIdx) {
                    const pos = new THREE.Vector3(); z.getWorldPosition(pos);
                    this.explode(pos, z.userData.hex);
                }
            });

            // Nếu trên web có transition HTML, ta vẫn giữ
            const transitionScreen = document.getElementById('level-transition');
            if (transitionScreen) transitionScreen.classList.remove('hidden');

            setTimeout(() => {
                if (this.currentLevelIdx < COSMIC_LEVELS.length - 1) {
                    if (this.levelUpSound.buffer) this.levelUpSound.play();
                    this.loadLevel(this.currentLevelIdx + 1);
                    this.isPlaying = true;
                    this.startCountdown();
                    if (transitionScreen) transitionScreen.classList.add('hidden');
                } else { 
                    if (transitionScreen) transitionScreen.classList.add('hidden');
                    this.victory(); 
                }
            }, 2000);
        }
    }

    detonateBomb(bombStar) {
        if (this.explosionSound.buffer) this.explosionSound.play();
        this.explode(bombStar.position, 0xffffff);
        this.stars.forEach(s => {
            if (!s.userData.isSnapped && s !== bombStar && s.visible) {
                const dist = s.position.distanceTo(bombStar.position);
                if (dist < 2.2) { 
                    const pushDir = new THREE.Vector3().subVectors(s.position, bombStar.position).normalize();
                    s.userData.physicsBody.wakeUp();
                    s.userData.physicsBody.type = CANNON.Body.DYNAMIC;
                    const force = 3.0;
                    s.userData.physicsBody.velocity.vadd(new CANNON.Vec3(pushDir.x*force, pushDir.y*force, pushDir.z*force), s.userData.physicsBody.velocity);
                }
            }
        });
        this.scene.remove(bombStar);
        this.physicsWorld.removeBody(bombStar.userData.physicsBody);
        this.stars = this.stars.filter(s => s !== bombStar);
        this.update3DUI("BOMB ĐÃ NỔ!");
    }

    update(dt) {
        if (this.isPaused) return; // Dừng logic tính toán khi Pause

        if (this.audioListener && this.audioListener.parent && this.uiPanel) {
            const camera = this.audioListener.parent;
            const dist = camera.position.distanceTo(this.uiPanel.position);
            const scaleFactor = Math.max(1.0, dist / 6.3);
            this.uiPanel.scale.setScalar(scaleFactor);
        }

        const hudColor = document.getElementById('ball-color-name');

        if (this.currentHeldBall && this.isPlaying) {
            this.currentHeldBall.userData.isStopped = false; 

            const ballPos = this.currentHeldBall.position;
            const hexStr = "#" + this.currentHeldBall.userData.hex.toString(16).padStart(6, '0');
            
            let nameDisplay = this.currentHeldBall.userData.colorName || "BI";
            if (this.currentHeldBall.userData.isCycle) {
                nameDisplay = this.currentHeldBall.userData.allColors[this.currentHeldBall.userData.currentColorIdx].name;
            }

            if (hudColor) {
                hudColor.innerText = nameDisplay.toUpperCase();
                hudColor.style.color = hexStr;
                hudColor.style.textShadow = `0 0 15px ${hexStr}`;
            }

            this.snapZones.forEach(z => {
                if (z.userData.isFilled) return;
                const dist = ballPos.distanceTo(z.getWorldPosition(new THREE.Vector3()));
                const active = (this.currentHeldBall.userData.hex === z.userData.hex && dist < 1.4);
                z.userData.glowMesh.scale.setScalar(active ? 1.5 : 1.0);
                z.userData.glowMesh.material.opacity = active ? 1.0 : 0.6;
            });
        } else {
            if (hudColor) { 
                hudColor.innerText = `KHÔNG CẦM BI`; 
                hudColor.style.color = `#fff`; 
                hudColor.style.textShadow = 'none';
            }
            this.snapZones.forEach(z => { if(z.userData.glowMesh) { z.userData.glowMesh.scale.setScalar(1.0); z.userData.glowMesh.material.opacity = 0.6; } });
        }

        if (!this.isPlaying) return; 

        if (this.gameMode !== 'normal' && this.timeLeft <= 10 && this.timeLeft > 0) {
            if (!this.lastBlinkTime || Date.now() - this.lastBlinkTime >= 500) {
                this.lastBlinkTime = Date.now();
                this.update3DUI();
            }
            if (this.countdownSound && this.countdownSound.buffer && !this.countdownSound.isPlaying) {
                this.countdownSound.play();
            }
        } else if (this.countdownSound && this.countdownSound.isPlaying && this.timeLeft > 10) {
            this.countdownSound.stop(); 
        }

        if (this.currentLevelIdx === 1) {
            this.basicColorRespawnTimer += dt;
            if (this.basicColorRespawnTimer >= 2.0) {
                this.basicColorRespawnTimer = 0;
                const basicHexes = [
                    { hex: 0xff0000, name: "ĐỎ" },
                    { hex: 0xffff00, name: "VÀNG" },
                    { hex: 0x0000ff, name: "XANH DƯƠNG" }
                ];
                
                basicHexes.forEach(bc => {
                    const freeCount = this.stars.filter(s => 
                        s.userData.hex === bc.hex && 
                        !s.userData.isSnapped && 
                        !s.userData.isDead && 
                        !s.userData.isBomb && 
                        !s.userData.isCycle
                    ).length;

                    if (freeCount < 1) {
                        this.createStar(bc.hex, false, [], bc.name, -1);
                    }
                });
            }
        }

        this.checkBallFusions();

        this.backgroundPlanets.forEach(p => {
            p.rotation.y += dt * 0.025; 
            if (p.userData.cloudMesh) {
                p.userData.cloudMesh.rotation.y += dt * 0.01; 
            }
            
            const orbitSpeed = dt * 0.0075; 
            const dx = p.position.x;
            const dz = p.position.z + 10.0;
            p.position.x = dx * Math.cos(orbitSpeed) - dz * Math.sin(orbitSpeed);
            p.position.z = dx * Math.sin(orbitSpeed) + dz * Math.cos(orbitSpeed) - 10.0;
        });

        if (this.gameMode === 'hard') {
            this.orbitTimer += dt;
            if (this.orbitTimer >= this.ORBIT_CHANGE_INTERVAL) { this.orbitTimer = 0; this.orbitSpeed = (Math.random() - 0.5) * 0.04; }
            this.wheelGroup.rotation.z += this.orbitSpeed;
            this.blindTimer += dt;
            if (this.blindTimer >= 3.0) { this.blindTimer = 0; this.isBlind = !this.isBlind; this.snapZones.forEach(z => { if (z.userData.glowMesh) z.userData.glowMesh.visible = !this.isBlind; }); }
            this.bombSpawnTimer += dt;
            if (this.bombSpawnTimer >= this.BOMB_SPAWN_INTERVAL) { this.bombSpawnTimer = 0; this.spawnBomb(); }
        } else { 
            this.wheelGroup.rotation.z += 0.005;
        }

        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            let s = this.shootingStars[i];
            s.position.addScaledVector(s.userData.velocity, dt);
            s.userData.life -= dt;
            if (s.userData.life <= 0) {
                this.scene.remove(s);
                this.shootingStars.splice(i, 1);
            }
        }

        this.easterEggs.forEach(egg => {
            if (egg.mesh.userData.active) {
                egg.mesh.rotation.y += dt * 0.5; 
                egg.mesh.rotation.x += dt * 0.25; 
                
                if (egg.mesh.position.z < 1.5) {
                    egg.mesh.position.addScaledVector(egg.mesh.userData.driftVel, dt);
                } else {
                    egg.mesh.position.z = 1.5;
                    egg.mesh.userData.driftVel.set(0,0,0);
                }

                if (Math.abs(egg.mesh.position.x) > 2.0) egg.mesh.userData.driftVel.x *= -1;
                if (egg.mesh.position.y > 2.0 || egg.mesh.position.y < 1.2) egg.mesh.userData.driftVel.y *= -1;

                egg.body.position.copy(egg.mesh.position);
            }
        });

        this.stars.forEach(s => {
            if (s.userData.isSnapped) {
                const aura = s.getObjectByName("aura");
                if (aura) aura.visible = false; 
                return;
            }
            if (!s.visible) return;

            if (s.userData.isCycle) {
                s.userData.cycleTimer += dt;
                if (s.userData.cycleTimer >= 4.0) {
                    s.userData.cycleTimer = 0; s.userData.currentColorIdx = (s.userData.currentColorIdx + 1) % s.userData.allColors.length;
                    const newHex = s.userData.allColors[s.userData.currentColorIdx].hex; 
                    s.material.color.setHex(newHex); 
                    s.userData.hex = newHex;
                }
            }
            if (s.userData.isBomb) {
                s.userData.bombTimer -= dt;
                if (s.userData.warningRing) { s.userData.warningRing.visible = (Math.floor(Date.now() / 150) % 2 === 0); s.userData.warningRing.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2); }
                if (s.userData.bombTimer <= 0) this.detonateBomb(s);
            }

            const b = s.userData.physicsBody;
            if (b && b.type !== 4) {
                s.position.copy(b.position);
                s.quaternion.copy(b.quaternion);

                if (b.type === CANNON.Body.DYNAMIC || this.currentHeldBall === s) {
                    this.easterEggs.forEach(egg => {
                        const hitRadius = egg.mesh.userData.radius + 0.35; 
                        
                        if (egg.mesh.userData.active && s.position.distanceTo(egg.mesh.position) < hitRadius) {
                            
                            if (!egg.mesh.userData.isBreakable && b.type === CANNON.Body.DYNAMIC) {
                                const pushDir = new THREE.Vector3().subVectors(s.position, egg.mesh.position).normalize();
                                b.velocity.set(pushDir.x * 3, pushDir.y * 3, pushDir.z * 3);
                            }
                            
                            else if (egg.mesh.userData.isBreakable) {
                                egg.mesh.userData.active = false;
                                this.scene.remove(egg.mesh);
                                this.physicsWorld.removeBody(egg.body);
                                
                                if (this.tingSound && this.tingSound.buffer) {
                                    if (this.tingSound.isPlaying) this.tingSound.stop();
                                    this.tingSound.play();
                                }
                                
                                const eggColor = egg.mesh.material.color.getHex();
                                this.explode(egg.mesh.position, eggColor);
                                
                                this.score += egg.mesh.userData.points;
                                this.update3DUI();
                                
                                if (window.showToast) {
                                    window.showToast(`🔥 PHÁ TINH THỂ BÍ MẬT! +${egg.mesh.userData.points} ĐIỂM 🔥`);
                                }
                            }
                        }
                    });
                }

                if (b.type === CANNON.Body.DYNAMIC) {
                    const dot = s.position.clone().normalize().dot(b.velocity); 
                    if (s.position.length() > 8.0 && !s.userData.isStopped && dot > 0) {
                        s.userData.isStopped = true;
                        b.velocity.set(0, 0, 0);
                        b.angularVelocity.set(0, 0, 0);
                        b.type = CANNON.Body.KINEMATIC; 
                        this.handleMiss("NÉM HỤT!"); 
                    }
                }
            }
        });
        
        this.stars = this.stars.filter(s => !s.userData.isDead);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.position.addScaledVector(p.userData.vel, dt); p.userData.life -= dt;
            p.scale.setScalar(Math.max(p.userData.life, 0.01));
            if (p.userData.life <= 0) { this.scene.remove(p); this.particles.splice(i, 1); }
        }
    }

    explode(pos, hex) {
        const geo = new THREE.BoxGeometry(0.03, 0.03, 0.03); const mat = new THREE.MeshBasicMaterial({ color: hex });
        for(let i=0; i<20; i++) {
            const p = new THREE.Mesh(geo, mat); p.position.copy(pos);
            p.userData = { vel: new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5), life: 1.0 };
            this.scene.add(p); this.particles.push(p);
        }
    }

    victory() {
        this.isPlaying = false; clearInterval(this.timerInterval);
        if (this.countdownSound && this.countdownSound.isPlaying) this.countdownSound.stop();
        if (this.victorySound.buffer) this.victorySound.play();
        
        // HIỂN THỊ TRÊN THẺ 3D VR
        this.update3DUI(`THẮNG! Điểm: ${this.score} | T.Gian: ${this.totalTimeUsed}s`); 
        const camera = this.audioListener.parent;
        if(camera) {
            this.uiPanel.position.copy(camera.position);
            const forward = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
            this.uiPanel.position.add(forward);
            this.uiPanel.lookAt(camera.position);
        }

        // Tương thích HTML fallback
        const vOverlay = document.getElementById('victory-overlay');
        const vStats = document.getElementById('victory-stats');
        if (vOverlay) vOverlay.classList.remove('hidden');
        if (vStats) vStats.innerText = `Điểm: ${this.score} | Thời gian: ${this.totalTimeUsed}s`;
    }

    gameOver() {
        this.isPlaying = false; clearInterval(this.timerInterval);
        if (this.countdownSound && this.countdownSound.isPlaying) this.countdownSound.stop();
        if (this.gameOverSound.buffer) this.gameOverSound.play();
        
        // HIỂN THỊ TRÊN THẺ 3D VR
        this.update3DUI(`GAME OVER! Điểm: ${this.score}`); 
        const camera = this.audioListener.parent;
        if(camera) {
            this.uiPanel.position.copy(camera.position);
            const forward = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
            this.uiPanel.position.add(forward);
            this.uiPanel.lookAt(camera.position);
        }

        // Tương thích HTML fallback
        const gOverlay = document.getElementById('game-over-overlay');
        const gStats = document.getElementById('final-stats');
        if (gOverlay) gOverlay.classList.remove('hidden');
        if (gStats) gStats.innerText = `Điểm: ${this.score}`;
    }
}