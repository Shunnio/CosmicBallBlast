import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class VRManager {
    constructor(renderer, scene, physics, gameManager, camera, controls, dolly) {
        this.renderer = renderer;
        this.scene = scene;
        this.physicsWorld = physics;
        this.gameManager = gameManager;
        this.camera = camera;
        this.controls = controls;
        this.dolly = dolly; 
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mouseHeldBall = null;
        
        this.mouseDist = 1.5; 

        this.audioLoader = new THREE.AudioLoader();
        
        this.snapSound = new THREE.PositionalAudio(this.gameManager.audioListener);
        this.audioLoader.load('./src/sounds/snap.mp3', (buffer) => {
            this.snapSound.setBuffer(buffer);
            this.snapSound.setRefDistance(1);
            this.snapSound.setVolume(1.0);
        }, undefined, () => {});

        this.errorSound = new THREE.PositionalAudio(this.gameManager.audioListener);
        this.audioLoader.load('./src/sounds/error.mp3', (buffer) => {
            this.errorSound.setBuffer(buffer);
            this.errorSound.setRefDistance(1);
            this.errorSound.setVolume(0.8);
        }, undefined, () => {});

        this.setupPC();
        this.setupVR();
    }

    getValidInteractable(hitObject) {
        let obj = hitObject;
        while (obj) {
            if (obj.userData.physicsBody || obj.userData.isPlanet) {
                return obj;
            }
            obj = obj.parent;
        }
        return null;
    }

    setupPC() {
        // Phím tắt P hoặc Escape để Pause game khi đang test trên PC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.gameManager.togglePause();
            }
        });

        window.addEventListener('mousedown', () => {
            // NẾU ĐANG PAUSE TRÊN PC -> KHÁCH CLICK CHUỘT SẼ OUT GAME
            if (this.gameManager.isPaused) {
                this.gameManager.exitToMenu();
                return;
            }

            if (!this.gameManager.isPlaying) return;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const targets = [
                ...this.gameManager.stars.filter(s => !s.userData.isSnapped),
                ...this.gameManager.backgroundPlanets
            ];
            
            const hits = this.raycaster.intersectObjects(targets, true);
            if (hits.length > 0) {
                const obj = this.getValidInteractable(hits[0].object);
                if (obj) {
                    if (obj.userData.isPlanet) {
                        if (window.showToast) window.showToast(`🛰️ QUAN SÁT: ${obj.userData.name}`);
                        return;
                    }

                    if (obj.userData.physicsBody) {
                        this.mouseHeldBall = obj;
                        this.mouseHeldBall.userData.physicsBody.type = CANNON.Body.KINEMATIC;
                        this.gameManager.currentHeldBall = this.mouseHeldBall;
                        if (this.controls) this.controls.enabled = false;
                    }
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.mouseHeldBall) {
                const body = this.mouseHeldBall.userData.physicsBody;
                if (body) {
                    body.position.copy(this.mouseHeldBall.position);
                    body.type = CANNON.Body.DYNAMIC;
                    body.wakeUp();

                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const throwForce = 22.0; 
                    const dir = this.raycaster.ray.direction.clone().normalize();
                    body.velocity.set(dir.x * throwForce, dir.y * throwForce, dir.z * throwForce); 
                }
                
                this.mouseHeldBall = null;
                this.gameManager.currentHeldBall = null;
                if (this.controls) this.controls.enabled = true;
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    setupVR() {
        const grab = (e) => {
            const controller = e.target;

            // XỬ LÝ SỰ KIỆN 1: NẾU ĐANG PAUSE -> BẤM NÚT TRIGGER ĐỂ THOÁT GAME RA MENU CHỌN MÀN
            if (this.gameManager.isPaused) {
                this.gameManager.exitToMenu();
                return;
            }

            // XỬ LÝ SỰ KIỆN 2: NẾU GAME CHƯA CHƠI (Ở MENU) -> BẤM TRIGGER ĐỂ CHỌN LEVEL TRONG VR
            if (!this.gameManager.isPlaying) {
                if (controller.userData.handedness === 'left') {
                    this.gameManager.initGame('normal');
                } else if (controller.userData.handedness === 'right') {
                    this.gameManager.initGame('hard');
                }
                return;
            }

            const targets = [
                ...this.gameManager.stars.filter(s => !s.userData.isSnapped),
                ...this.gameManager.backgroundPlanets
            ];
            
            const intersect = this.getIntersects(controller, targets);
            if (intersect.length > 0) {
                const obj = this.getValidInteractable(intersect[0].object);
                if (obj) {
                    if (obj.userData.isPlanet) {
                        if (window.showToast) window.showToast(`🛰️ QUAN SÁT: ${obj.userData.name}`);
                        return;
                    }

                    if (obj.userData.physicsBody && !obj.userData.isSnapped) {
                        controller.userData.selected = obj;
                        obj.userData.physicsBody.type = CANNON.Body.KINEMATIC;
                        controller.attach(obj);
                        
                        obj.position.set(0, 0, 0); 
                        
                        this.gameManager.currentHeldBall = obj;
                        if (controller.userData.laser) {
                            controller.userData.laser.material.color.setHex(0xff3333);
                        }
                    }
                }
            }
        };

        const release = (e) => {
            const controller = e.target;
            const star = controller.userData.selected;
            if (star) {
                this.scene.attach(star);
                const body = star.userData.physicsBody;
                if (body) {
                    body.position.copy(star.position);
                    body.type = CANNON.Body.DYNAMIC;
                    body.wakeUp();

                    const mat = new THREE.Matrix4().identity().extractRotation(controller.matrixWorld);
                    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(mat).normalize();
                    const throwForce = 22.0;
                    body.velocity.set(dir.x * throwForce, dir.y * throwForce, dir.z * throwForce);
                }
                
                controller.userData.selected = null;
                this.gameManager.currentHeldBall = null;
                
                if (controller.userData.laser) {
                    controller.userData.laser.material.color.setHex(0x00d4ff);
                }
            }
        };

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -15) 
        ]);

        [0, 1].forEach(i => {
            const c = this.renderer.xr.getController(i);
            
            // LẮNG NGHE ĐỂ GÁN BÊN TAY (LEFT/RIGHT) CHO CONTROLLER KHI KẾT NỐI
            c.addEventListener('connected', (event) => {
                c.userData.handedness = event.data.handedness;
            });

            c.addEventListener('selectstart', grab);
            c.addEventListener('selectend', release);
            
            c.addEventListener('squeezestart', () => {
                this.gameManager.togglePause();
            });
            
            const material = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.6 });
            const laserLine = new THREE.Line(geometry, material);
            c.userData.laser = laserLine;
            c.add(laserLine); 
            
            if (this.dolly) this.dolly.add(c);
            else this.scene.add(c);
        });
    }

    getIntersects(c, targetArray) {
        const mat = new THREE.Matrix4().identity().extractRotation(c.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(mat);
        return this.raycaster.intersectObjects(targetArray, true);
    }

    update() {
        const session = this.renderer.xr.getSession();
        if (session && this.gameManager.isPlaying && !this.gameManager.isPaused) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.gamepad.axes.length >= 4) {
                    if (source.handedness === 'left') {
                        const xAxis = source.gamepad.axes[2]; 
                        const zAxis = source.gamepad.axes[3]; 
                        const speed = 0.05;

                        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                        forward.y = 0; forward.normalize();
                        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
                        right.y = 0; right.normalize();

                        if (Math.abs(zAxis) > 0.1 && this.dolly) this.dolly.position.addScaledVector(forward, -zAxis * speed);
                        if (Math.abs(xAxis) > 0.1 && this.dolly) this.dolly.position.addScaledVector(right, xAxis * speed);
                    }
                    
                    if (source.handedness === 'right') {
                        const zAxis = source.gamepad.axes[3]; 
                        if (!this.volDelay) {
                            if (zAxis < -0.5) { 
                                let v = this.gameManager.audioListener.getMasterVolume();
                                let newV = Math.min(1.0, v + 0.1);
                                this.gameManager.audioListener.setMasterVolume(newV);
                                this.gameManager.update3DUI(`ÂM LƯỢNG: ${Math.round(newV * 100)}%`);
                                this.volDelay = true; setTimeout(() => this.volDelay = false, 300);
                            } else if (zAxis > 0.5) { 
                                let v = this.gameManager.audioListener.getMasterVolume();
                                let newV = Math.max(0.0, v - 0.1);
                                this.gameManager.audioListener.setMasterVolume(newV);
                                this.gameManager.update3DUI(`ÂM LƯỢNG: ${Math.round(newV * 100)}%`);
                                this.volDelay = true; setTimeout(() => this.volDelay = false, 300);
                            }
                        }
                    }
                }
            }
        }

        if (this.mouseHeldBall) {
            if (!this.gameManager.stars.includes(this.mouseHeldBall)) {
                this.mouseHeldBall = null;
                this.gameManager.currentHeldBall = null;
                if (this.controls) this.controls.enabled = true;
                return;
            }

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const p = new THREE.Vector3();
            this.raycaster.ray.at(this.mouseDist, p);
            
            this.mouseHeldBall.position.lerp(p, 0.25);
            if (this.mouseHeldBall.userData.physicsBody) {
                this.mouseHeldBall.userData.physicsBody.position.copy(this.mouseHeldBall.position);
            }
        }

        this.gameManager.stars.forEach(star => {
            if (star.userData.isSnapped) return;

            const body = star.userData.physicsBody;
            if (!body) return;

            if (star.position.length() > 35 || star.position.y < -6) {
                const startX = (Math.random() - 0.5) * 4;
                const startY = 1.0 + Math.random() * 1.5;
                const startZ = 0.5 + Math.random() * 1.5;
                star.position.set(startX, startY, startZ);
                body.position.copy(star.position);
                body.velocity.set(0,0,0);
                body.angularVelocity.set(0,0,0);
                return;
            }

            if (body.type !== CANNON.Body.DYNAMIC) return;
            if (this.mouseHeldBall === star) return;

            let targetZone = null;
            let bestDist = 999;
            let isCorrectColor = false;

            this.gameManager.snapZones.forEach(zone => {
                if (zone.userData.isFilled) return;
                const wPos = new THREE.Vector3();
                zone.getWorldPosition(wPos);
                const dist = star.position.distanceTo(wPos);

                if (zone.userData.hex === star.userData.hex) {
                    if (dist < 1.2 && dist < bestDist) { 
                        targetZone = zone;
                        bestDist = dist;
                        isCorrectColor = true;
                    }
                } else if (!isCorrectColor) {
                    if (dist < 0.4 && dist < bestDist) { 
                        targetZone = zone;
                        bestDist = dist;
                    }
                }
            });

            if (targetZone) {
                if (isCorrectColor) {
                    this.gameManager.addScore(star.userData);
                    this.gameManager.wheelGroup.attach(star);
                    star.position.copy(targetZone.position);
                    targetZone.material.color.setHex(star.userData.hex);
                    star.userData.snappedTo = targetZone; 
                    
                    if (this.snapSound.buffer) {
                        if (this.snapSound.isPlaying) this.snapSound.stop();
                        targetZone.add(this.snapSound);
                        this.snapSound.play();
                    }

                    body.type = CANNON.Body.STATIC;
                    star.userData.isSnapped = true;
                    targetZone.userData.isFilled = true;
                    
                    this.gameManager.checkWin();
                } else {
                    if (!star.userData.lastMiss || Date.now() - star.userData.lastMiss > 1000) {
                        this.gameManager.handleMiss();
                        const wPos = new THREE.Vector3();
                        targetZone.getWorldPosition(wPos);
                        const dir = new THREE.Vector3().subVectors(star.position, wPos).normalize();
                        
                        body.velocity.set(dir.x * 5, dir.y * 5, dir.z * 5); 
                        
                        if (this.errorSound.buffer) {
                            if (this.errorSound.isPlaying) this.errorSound.stop();
                            targetZone.add(this.errorSound);
                            this.errorSound.play();
                        }
                        star.userData.lastMiss = Date.now();
                    }
                }
            }
        });
    }
}