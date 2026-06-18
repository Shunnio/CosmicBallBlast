// src/core/Physics.js
import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, 0); // Không trọng lực vũ trụ
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        
        this.setupVirtualWalls();
    }

    setupVirtualWalls() {
        // Tạo vật liệu có độ nảy cao để khi va tường bi sẽ dội lại
        const wallMaterial = new CANNON.Material('wallMaterial');
        const contactMaterial = new CANNON.ContactMaterial(wallMaterial, wallMaterial, {
            restitution: 0.7, // Độ nảy
            friction: 0.1     // Độ ma sát thấp
        });
        this.world.addContactMaterial(contactMaterial);

        // Hàm tạo tường tàng hình
        const createWall = (pos, quat) => {
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
                material: wallMaterial
            });
            body.position.copy(pos);
            body.quaternion.copy(quat);
            this.world.addBody(body);
        };

        // ĐÃ MỞ RỘNG vùng tàng hình lên 20 mét để người chơi tự do di chuyển
        createWall(new CANNON.Vec3(0, 0, -20), new CANNON.Quaternion().setFromEuler(0, 0, 0));       // Tường sau
        createWall(new CANNON.Vec3(0, -10, 0), new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0)); // Sàn
        createWall(new CANNON.Vec3(0, 20, 0), new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0));   // Trần
        createWall(new CANNON.Vec3(-20, 0, 0), new CANNON.Quaternion().setFromEuler(0, Math.PI / 2, 0));  // Tường trái
        createWall(new CANNON.Vec3(20, 0, 0), new CANNON.Quaternion().setFromEuler(0, -Math.PI / 2, 0));  // Tường phải
    }

    update(dt) {
        this.world.step(1 / 60, dt);
    }
}