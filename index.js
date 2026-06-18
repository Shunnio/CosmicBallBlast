import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Timer } from 'three/addons/misc/Timer.js';

import { PhysicsWorld } from './src/core/Physics.js';
import { GameManager } from './src/core/GameManager.js';
import { VRManager } from './src/core/VRManager.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

// TẠO DOLLY ĐỂ DI CHUYỂN TRONG VR (Gom camera vào Dolly)
const dolly = new THREE.Group();
dolly.position.set(0, 1.6, 3.5); // Đứng lùi ra xa một chút
scene.add(dolly);
dolly.add(camera);

// HỆ THỐNG ÂM THANH
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
audioListener.setMasterVolume(0.5);

const bgmAudio = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('./src/sounds/bgm.mp3', (buffer) => {
    bgmAudio.setBuffer(buffer);
    bgmAudio.setLoop(true);
    bgmAudio.setVolume(0.15); 
    window.addEventListener('click', () => {
        if (!bgmAudio.isPlaying) bgmAudio.play();
    }, { once: true });
}, undefined, () => console.warn("Thiếu file ./src/sounds/bgm.mp3"));

// Khởi tạo 2 thanh trượt âm lượng trên Web (nếu có)
const bgmSlider = document.getElementById('bgm-slider');
if (bgmSlider) {
    bgmSlider.addEventListener('input', (e) => bgmAudio.setVolume(parseFloat(e.target.value)));
}

const sfxSlider = document.getElementById('sfx-slider');
if (sfxSlider) {
    sfxSlider.addEventListener('input', (e) => audioListener.setMasterVolume(parseFloat(e.target.value)));
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const vrBtnContainer = document.getElementById('vr-btn-container');
const vrButton = VRButton.createButton(renderer);
if (vrBtnContainer) vrBtnContainer.appendChild(vrButton);
else document.body.appendChild(vrButton);

const textureLoader = new THREE.TextureLoader();
const bgGeo = new THREE.SphereGeometry(50, 64, 64);
const bgMat = new THREE.MeshBasicMaterial({ 
    map: textureLoader.load('./textures/07_milkyway.jpg'), 
    side: THREE.BackSide 
});
scene.add(new THREE.Mesh(bgGeo, bgMat));

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 5, 2);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.45, -1.5);
controls.enableDamping = true;
controls.update();

const physics = new PhysicsWorld();
const gameManager = new GameManager(scene, physics, audioListener);
// Truyền biến `dolly` vào tham số cuối của VRManager
const vrManager = new VRManager(renderer, scene, physics, gameManager, camera, controls, dolly);

const timer = new Timer();
renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);

    if (gameManager.isPlaying && !gameManager.isPaused) physics.update(dt);
    gameManager.update(dt);

    gameManager.stars.forEach(star => {
        const body = star.userData.physicsBody;
        if (body && body.type !== 4 && !star.userData.isSnapped) {
            star.position.copy(body.position);
            star.quaternion.copy(body.quaternion);
        }
    });

    if (vrManager && vrManager.update) vrManager.update();
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, renderer, gameManager, dolly };