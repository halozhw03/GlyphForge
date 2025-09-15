/**
 * RobotGripper - 机器人抓取模拟器
 * 扩展ThreeJSWorkArea以支持抓取机器人功能
 */
class RobotGripper {
    constructor(threeJSWorkArea) {
        this.threeJSWorkArea = threeJSWorkArea;
        this.scene = threeJSWorkArea.scene;
        this.isRobotMode = false;
        this.gripperArm = null;
        this.gripper = null;
        this.objects = [];
        this.currentTask = null;
        this.isSimulating = false;
        this.isPaused = false;
        this.animationSpeed = 2.0; // 机器人移动速度倍数
        
        // 抓取状态
        this.gripperState = {
            position: { x: 0, y: 100, z: 0 }, // 初始位置
            isGripping: false,
            grippedObject: null,
            targetPosition: null
        };
        
        this.createGripper();
    }
    
    /**
     * 创建机械抓手
     */
    createGripper() {
        // 创建机械臂组
        this.gripperArm = new THREE.Group();
        
        // 机械臂底座
        const baseGeometry = new THREE.CylinderGeometry(15, 20, 10, 16);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x2c5282 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 5;
        base.castShadow = true;
        this.gripperArm.add(base);
        
        // 机械臂主体
        const armGeometry = new THREE.CylinderGeometry(8, 8, 60, 12);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x4a90e2 });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.y = 40;
        arm.castShadow = true;
        this.gripperArm.add(arm);
        
        // 创建吸盘抓手
        this.createSuctionGripper();
        
        // 设置初始位置
        this.gripperArm.position.set(0, 0, 0);
        this.scene.add(this.gripperArm);

        // 默认隐藏机械抓手（drawing模式）
        this.gripperArm.visible = false;

        console.log('Robot gripper created and hidden by default');
    }
    
    /**
     * 创建吸盘抓手
     */
    createSuctionGripper() {
        this.gripper = new THREE.Group();
        
        // 吸盘主体
        const suctionGeometry = new THREE.CylinderGeometry(12, 8, 15, 16);
        const suctionMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const suction = new THREE.Mesh(suctionGeometry, suctionMaterial);
        suction.castShadow = true;
        this.gripper.add(suction);
        
        // 吸盘底部
        const padGeometry = new THREE.CylinderGeometry(10, 10, 3, 16);
        const padMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pad = new THREE.Mesh(padGeometry, padMaterial);
        pad.position.y = -9;
        pad.castShadow = true;
        this.gripper.add(pad);
        
        // 指示灯
        const lightGeometry = new THREE.SphereGeometry(2, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            emissive: 0x002200
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(0, 5, 10);
        this.gripper.add(light);
        
        // 连接到机械臂
        this.gripper.position.y = 70;
        this.gripperArm.add(this.gripper);
    }
    
    /**
     * 切换到机器人模式
     */
    enableRobotMode() {
        this.isRobotMode = true;
        
        // 隐藏原来的打印头
        if (this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = false;
        }
        
        // 显示机械抓手
        this.gripperArm.visible = true;
        
        // 更新指示灯
        this.updateGripperLight('ready');
        
        console.log('Robot mode enabled');
    }
    
    /**
     * 切换回绘画模式
     */
    disableRobotMode() {
        this.isRobotMode = false;
        
        // 显示原来的打印头
        if (this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
        }
        
        // 隐藏机械抓手
        this.gripperArm.visible = false;
        
        console.log('Robot mode disabled');
    }
    
    /**
     * 设置物品数据
     */
    setObjects(objects) {
        // 清除现有物品
        this.clearObjects();
        
        // 转换并创建3D物品
        this.objects = objects.map(obj => this.create3DObject(obj));
        
        console.log('Objects set for robot simulation:', this.objects.length);
    }
    
    /**
     * 创建3D物品
     */
    create3DObject(objectData) {
        let geometry, material;
        const size = 20;
        
        switch (objectData.type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(size/2, 16, 16);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(size/2, size/2, size, 16);
                break;
            case 'box':
                geometry = new THREE.BoxGeometry(size * 1.5, size * 0.7, size);
                break;
            default:
                geometry = new THREE.BoxGeometry(size, size, size);
        }
        
        material = new THREE.MeshLambertMaterial({ 
            color: 0x3182ce,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 获取实际的3D工作区域尺寸
        const workArea = this.threeJSWorkArea.workArea;
        
        // 获取画布尺寸（动态获取实际尺寸）
        let canvasWidth = 400;  // 默认宽度
        let canvasHeight = 300; // 默认高度
        
        // 尝试从WorkspaceCanvas获取实际尺寸
        const workspaceCanvas = document.getElementById('workspaceCanvas');
        if (workspaceCanvas) {
            canvasWidth = workspaceCanvas.clientWidth || 400;
            canvasHeight = workspaceCanvas.clientHeight || 300;
        }
        
        // 转换坐标系（从画布坐标到3D坐标）
        // 将画布坐标映射到3D工作区域
        const scaleX = workArea.width / canvasWidth;
        const scaleZ = workArea.height / canvasHeight;
        
        mesh.position.set(
            (objectData.position.x - canvasWidth/2) * scaleX,
            size/2, // 放在地面上
            (objectData.position.y - canvasHeight/2) * scaleZ
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        
        const object3D = {
            id: objectData.id,
            type: objectData.type,
            mesh: mesh,
            originalPosition: { ...mesh.position },
            targetPosition: objectData.targetPosition ? {
                x: (objectData.targetPosition.x - canvasWidth/2) * scaleX,
                y: size/2,
                z: (objectData.targetPosition.y - canvasHeight/2) * scaleZ
            } : null,
            isGripped: false
        };
        
        return object3D;
    }
    
    /**
     * 开始机器人模拟
     */
    async startRobotSimulation() {
        if (this.objects.length === 0) {
            console.log('No objects to simulate');
            return;
        }
        
        this.isSimulating = true;
        this.updateGripperLight('working');
        
        // 为每个有目标位置的物品执行抓取任务
        for (const obj of this.objects) {
            if (obj.targetPosition) {
                // 检查是否暂停
                while (this.isPaused && this.isSimulating) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // 如果模拟被停止，退出
                if (!this.isSimulating) {
                    return;
                }
                
                await this.executePickAndPlace(obj);
            }
        }
        
        this.isSimulating = false;
        this.updateGripperLight('completed');
        
        // 通知模拟完成
        if (this.threeJSWorkArea.onSimulationComplete) {
            this.threeJSWorkArea.onSimulationComplete();
        }
        
        console.log('Robot simulation completed');
    }
    
    /**
     * 执行抓取和放置任务
     */
    async executePickAndPlace(objectData) {
        console.log('Executing pick and place for object:', objectData.id);
        
        // 1. 移动到物品上方
        await this.moveGripperTo({
            x: objectData.originalPosition.x,
            y: objectData.originalPosition.y + 50,
            z: objectData.originalPosition.z
        });
        
        // 2. 下降到物品位置
        await this.moveGripperTo({
            x: objectData.originalPosition.x,
            y: objectData.originalPosition.y + 15,
            z: objectData.originalPosition.z
        });
        
        // 3. 抓取物品
        await this.gripObject(objectData);
        
        // 4. 升起
        await this.moveGripperTo({
            x: objectData.originalPosition.x,
            y: objectData.originalPosition.y + 50,
            z: objectData.originalPosition.z
        });
        
        // 5. 移动到目标位置上方
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: objectData.targetPosition.y + 50,
            z: objectData.targetPosition.z
        });
        
        // 6. 下降到目标位置
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: objectData.targetPosition.y + 15,
            z: objectData.targetPosition.z
        });
        
        // 7. 释放物品
        await this.releaseObject(objectData);
        
        // 8. 升起
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: objectData.targetPosition.y + 50,
            z: objectData.targetPosition.z
        });
    }
    
    /**
     * 移动机械手到指定位置
     */
    moveGripperTo(targetPosition) {
        return new Promise((resolve) => {
            const startPosition = { ...this.gripperState.position };
            const duration = 1000 / this.animationSpeed; // 动画持续时间
            const startTime = Date.now();
            
            const animate = () => {
                // 检查是否暂停
                if (this.isPaused) {
                    requestAnimationFrame(animate);
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 使用缓动函数
                const easeProgress = this.easeInOutCubic(progress);
                
                // 插值计算当前位置
                this.gripperState.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
                this.gripperState.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
                this.gripperState.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easeProgress;
                
                // 更新机械手位置
                this.gripperArm.position.set(
                    this.gripperState.position.x,
                    this.gripperState.position.y,
                    this.gripperState.position.z
                );
                
                // 如果正在抓取物品，让物品跟随机械手移动
                if (this.gripperState.isGripping && this.gripperState.grippedObject) {
                    const grippedObject = this.gripperState.grippedObject;
                    grippedObject.mesh.position.set(
                        this.gripperState.position.x,
                        this.gripperState.position.y - 15, // 减少间距，更紧密贴合
                        this.gripperState.position.z
                    );
                }
                
                // 添加轻微的旋转动画（只在非暂停状态）
                if (!this.isPaused) {
                    this.gripper.rotation.y += 0.02;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    /**
     * 抓取物品
     */
    gripObject(objectData) {
        return new Promise((resolve) => {
            // 更新状态
            this.gripperState.isGripping = true;
            this.gripperState.grippedObject = objectData;
            objectData.isGripped = true;
            
            // 将物品附着到机械手的正确位置
            objectData.mesh.position.set(
                this.gripperState.position.x,
                this.gripperState.position.y - 15, // 减少间距，更紧密贴合
                this.gripperState.position.z
            );
            
            // 改变物品颜色表示被抓取
            objectData.mesh.material.color.setHex(0x9f7aea);
            objectData.mesh.material.opacity = 1.0;
            
            // 更新指示灯
            this.updateGripperLight('gripping');
            
            // 模拟抓取时间（支持暂停）
            const waitForGrip = () => {
                if (this.isPaused) {
                    setTimeout(waitForGrip, 50);
                    return;
                }
                console.log('Object gripped:', objectData.id);
                resolve();
            };
            setTimeout(waitForGrip, 300);
        });
    }
    
    /**
     * 释放物品
     */
    releaseObject(objectData) {
        return new Promise((resolve) => {
            // 将物品放置到目标位置
            objectData.mesh.position.set(
                objectData.targetPosition.x,
                objectData.targetPosition.y,
                objectData.targetPosition.z
            );
            
            // 更新状态
            this.gripperState.isGripping = false;
            this.gripperState.grippedObject = null;
            objectData.isGripped = false;
            
            // 改变物品颜色表示已放置
            objectData.mesh.material.color.setHex(0x38a169);
            objectData.mesh.material.opacity = 0.8;
            
            // 更新指示灯
            this.updateGripperLight('working');
            
            // 模拟释放时间（支持暂停）
            const waitForRelease = () => {
                if (this.isPaused) {
                    setTimeout(waitForRelease, 50);
                    return;
                }
                console.log('Object released:', objectData.id);
                resolve();
            };
            setTimeout(waitForRelease, 300);
        });
    }
    
    /**
     * 更新机械手指示灯
     */
    updateGripperLight(state) {
        const light = this.gripper.children.find(child => child.geometry instanceof THREE.SphereGeometry);
        if (!light) return;
        
        switch (state) {
            case 'ready':
                light.material.color.setHex(0x00ff00);
                light.material.emissive.setHex(0x002200);
                break;
            case 'working':
                light.material.color.setHex(0x3182ce);
                light.material.emissive.setHex(0x001122);
                break;
            case 'gripping':
                light.material.color.setHex(0xffa500);
                light.material.emissive.setHex(0x221100);
                break;
            case 'paused':
                light.material.color.setHex(0xffff00);
                light.material.emissive.setHex(0x222200);
                break;
            case 'completed':
                light.material.color.setHex(0x0000ff);
                light.material.emissive.setHex(0x000022);
                break;
            case 'error':
                light.material.color.setHex(0xff0000);
                light.material.emissive.setHex(0x220000);
                break;
        }
    }
    
    /**
     * 缓动函数
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * 暂停机器人模拟
     */
    pauseSimulation() {
        this.isPaused = true;
        this.updateGripperLight('paused');
        console.log('Robot simulation paused');
    }

    /**
     * 恢复机器人模拟
     */
    resumeSimulation() {
        this.isPaused = false;
        this.updateGripperLight('working');
        console.log('Robot simulation resumed');
    }

    /**
     * 停止机器人模拟
     */
    stopRobotSimulation() {
        this.isSimulating = false;
        this.isPaused = false;
        this.updateGripperLight('ready');
        
        // 如果正在抓取物品，先释放
        if (this.gripperState.isGripping && this.gripperState.grippedObject) {
            const grippedObject = this.gripperState.grippedObject;
            grippedObject.mesh.position.copy(grippedObject.originalPosition);
            grippedObject.mesh.material.color.setHex(0x3182ce);
            grippedObject.isGripped = false;
        }
        
        // 重置机械手位置
        this.gripperArm.position.set(0, 0, 0);
        this.gripperState.position = { x: 0, y: 100, z: 0 };
        this.gripperState.isGripping = false;
        this.gripperState.grippedObject = null;
        
        console.log('Robot simulation stopped');
    }
    
    /**
     * 清除所有物品
     */
    clearObjects() {
        this.objects.forEach(obj => {
            if (obj.mesh) {
                this.scene.remove(obj.mesh);
                obj.mesh.geometry.dispose();
                obj.mesh.material.dispose();
            }
        });
        this.objects = [];
        
        // 重置状态
        this.stopRobotSimulation();
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        this.clearObjects();
        
        if (this.gripperArm) {
            this.scene.remove(this.gripperArm);
            // 清理几何体和材质
            this.gripperArm.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}
