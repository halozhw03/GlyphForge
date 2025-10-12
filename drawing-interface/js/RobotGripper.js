/**
 * RobotGripper - 机器人抓取模拟器
 * 扩展ThreeJSWorkArea以支持抓取机器人功能
 */
class RobotGripper {
    constructor(threeJSWorkArea, workspaceCanvas) {
        this.threeJSWorkArea = threeJSWorkArea;
        this.workspaceCanvas = workspaceCanvas; // 保存 workspaceCanvas 实例
        this.scene = threeJSWorkArea.scene;
        this.isRobotMode = false;
        this.gripperArm = null;
        this.gripper = null;
        this.objects = [];
        this.rawObjects = [];
        this.currentWorkArea = { ...this.threeJSWorkArea.workArea };
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
        
        // 监听模型加载完成事件
        window.addEventListener('printerModelLoaded', () => {
            console.log('RobotGripper: Printer model loaded event received');
            // 如果当前是 Robot Mode，确保打印头可见并隐藏旧机械臂
            if (this.isRobotMode) {
                this.enableRobotMode();
            }
        });
    }
    
    /**
     * 隐藏场景中所有旧机械臂的 Mesh
     */
    hideOldGripperMeshes() {
        console.log('Hiding old gripper meshes...');
        
        // 旧机械臂的特征颜色
        const gripperColors = [0x2c5282, 0x4a90e2, 0x666666, 0x333333, 0x00ff00];
        let hiddenCount = 0;
        
        this.scene.traverse((obj) => {
            // 查找没有名称且具有特定颜色的 Mesh
            if (obj.isMesh && obj.name === '' && obj.material && obj.material.color) {
                const color = obj.material.color.getHex();
                if (gripperColors.includes(color)) {
                    console.log(`Hiding old gripper mesh with color #${color.toString(16).padStart(6, '0')}`);
                    obj.visible = false;
                    hiddenCount++;
                }
            }
        });
        
        console.log(`Hidden ${hiddenCount} old gripper meshes`);
    }
    
    /**
     * 创建机械抓手（现在使用打印头）
     */
    createGripper() {
        // 不再创建单独的机械臂，使用打印头作为机械臂
        this.printHead = null; // 将在enableRobotMode中设置
        
        // 初始化抓取状态
        this.gripperState.position = { x: 0, y: 100, z: 0 };
        
        console.log('Robot gripper initialized to use print head');
    }
    
    /**
     * 切换到机器人模式
     */
    enableRobotMode() {
        console.log('Enabling robot mode...');
        this.isRobotMode = true;
        
        // 隐藏旧的机械臂（如果存在）
        if (this.gripperArm) {
            console.log('Hiding old gripperArm');
            this.gripperArm.visible = false;
        }
        if (this.gripper) {
            console.log('Hiding old gripper');
            this.gripper.visible = false;
        }
        
        // 隐藏场景中所有旧机械臂的 Mesh
        this.hideOldGripperMeshes();
        
        // 使用打印头作为机械臂
        if (this.threeJSWorkArea.printHead) {
            this.printHead = this.threeJSWorkArea.printHead;
            
            // 确保打印头及其所有父对象都可见
            this.printHead.visible = true;
            console.log('Print head set visible:', this.printHead.visible);
            
            // 遍历父对象确保都可见
            let parent = this.printHead.parent;
            let level = 0;
            while (parent) {
                console.log(`Setting parent ${level} visible:`, parent.type, parent.name);
                parent.visible = true;
                parent = parent.parent;
                level++;
            }
            
            // 遍历子对象确保都可见
            this.printHead.traverse((child) => {
                child.visible = true;
            });
            
            console.log('Print head and all parents/children set visible');
        } else {
            console.error('Print head not found in threeJSWorkArea');
        }
        
        // 更新指示灯
        this.updateGripperLight('ready');
        
        console.log('Robot mode enabled, using print head as gripper');
    }
    
    /**
     * 切换回绘画模式
     */
    disableRobotMode() {
        this.isRobotMode = false;
        
        // 隐藏旧的机械臂（如果存在）
        if (this.gripperArm) {
            this.gripperArm.visible = false;
        }
        if (this.gripper) {
            this.gripper.visible = false;
        }
        
        // 保持打印头可见（Drawing Mode也需要）
        if (this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
            console.log('Print head set visible in drawing mode:', this.threeJSWorkArea.printHead.visible);
        }
        
        console.log('Robot mode disabled');
    }
    
    /**
     * 设置物品数据
     */
    setObjects(objects) {
        this.rawObjects = objects.map(obj => ({
            id: obj.id,
            type: obj.type,
            position: { ...obj.position },
            targetPosition: obj.targetPosition ? { ...obj.targetPosition } : null
        }));
        this.rebuildObjects();
        console.log('Objects set for robot simulation:', this.objects.length);
    }

    setWorkArea(workArea) {
        if (!workArea) return;
        this.currentWorkArea = {
            width: workArea.width ?? this.currentWorkArea.width,
            height: workArea.height ?? this.currentWorkArea.height,
            depth: workArea.depth ?? this.currentWorkArea.depth
        };
        this.rebuildObjects(this.currentWorkArea);
    }

    rebuildObjects(workAreaOverride = null) {
        this.clearObjects(true);

        if (!this.rawObjects || this.rawObjects.length === 0) {
            this.objects = [];
            return;
        }

        const workArea = workAreaOverride || this.currentWorkArea || this.threeJSWorkArea.workArea;
        this.objects = this.rawObjects.map(obj => this.create3DObject(obj, workArea));
    }

    /**
     * 创建3D物品（使用与Drawing Mode相同的坐标系统）
     */
    create3DObject(objectData, workAreaOverride = null) {
        let geometry, material;
        const size = 20;
        
        // 记录物体尺寸用于叠放计算
        let objectSize = { width: size, height: size, depth: size };
        
        switch (objectData.type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(size, size, size);
                objectSize = { width: size, height: size, depth: size };
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(size/2, 16, 16);
                objectSize = { width: size, height: size, depth: size };
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(size/2, size/2, size, 16);
                objectSize = { width: size, height: size, depth: size };
                break;
            case 'box':
                geometry = new THREE.BoxGeometry(size * 1.5, size * 0.7, size);
                objectSize = { width: size * 1.5, height: size * 0.7, depth: size };
                break;
            default:
                geometry = new THREE.BoxGeometry(size, size, size);
                objectSize = { width: size, height: size, depth: size };
        }
        
        material = new THREE.MeshLambertMaterial({ 
            color: 0x3182ce,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 获取 bed 信息（与 Drawing Mode 一致）
        if (!this.threeJSWorkArea.printBed) {
            console.error("Cannot create object, print bed not found.");
            return null;
        }
        
        const bedBoundingBox = new THREE.Box3().setFromObject(this.threeJSWorkArea.printBed);
        const bedSize = new THREE.Vector3();
        bedBoundingBox.getSize(bedSize);
        
        // 使用传入的 workspaceCanvas 实例的属性
        const canvasWidth = this.workspaceCanvas.canvasWidth;
        const canvasHeight = this.workspaceCanvas.canvasHeight;
        
        // 转换坐标系（使用与 Drawing Mode 相同的方式）
        const percentX = objectData.position.x / canvasWidth;
        const percentY = objectData.position.y / canvasHeight;
        
        const convertedX = bedBoundingBox.min.x + percentX * bedSize.x;
        const convertedZ = bedBoundingBox.min.z + percentY * bedSize.z;
        const bedY = bedBoundingBox.max.y;
        
        mesh.position.set(
            convertedX,
            bedY + objectSize.height/2, // 放在 bed 表面上
            convertedZ
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        
        const object3D = {
            id: objectData.id,
            type: objectData.type,
            mesh: mesh,
            size: objectSize,
            originalPosition: { ...mesh.position },
            targetPosition: objectData.targetPosition ? {
                x: bedBoundingBox.min.x + (objectData.targetPosition.x / canvasWidth) * bedSize.x,
                y: bedY + objectSize.height/2, // 初始高度，会在叠放时调整
                z: bedBoundingBox.min.z + (objectData.targetPosition.y / canvasHeight) * bedSize.z
            } : null,
            isGripped: false
        };
        
        return object3D;
    }
    
    /**
     * 创建多个3D物品
     */
    create3DObjects(objects, workArea) {
        return objects.map(obj => this.create3DObject(obj, workArea));
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
     * 检测目标位置是否有物体并计算叠放高度
     */
    calculateStackHeight(targetX, targetZ, currentObjectId) {
        let maxHeight = 0;
        const threshold = 15; // 检测范围阈值（mm）
        
        // 遍历所有已放置的物体
        for (const obj of this.objects) {
            // 跳过当前物体本身
            if (obj.id === currentObjectId) continue;
            
            // 检查物体是否已被放置到目标区域
            if (!obj.mesh || !obj.mesh.position) continue;
            
            const dx = Math.abs(obj.mesh.position.x - targetX);
            const dz = Math.abs(obj.mesh.position.z - targetZ);
            
            // 如果物体在目标位置的范围内
            if (dx < threshold && dz < threshold) {
                // 计算该物体顶部的高度
                const topHeight = obj.mesh.position.y + (obj.size.height / 2);
                maxHeight = Math.max(maxHeight, topHeight);
                console.log(`Found object at target position: ${obj.id}, top height: ${topHeight}`);
            }
        }
        
        return maxHeight;
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
        
        // 获取床面的 Y 坐标
        const bedBoundingBox = new THREE.Box3().setFromObject(this.threeJSWorkArea.printBed);
        const bedY = bedBoundingBox.max.y;
        
        // 检测目标位置是否有物体，计算叠放高度
        const stackHeight = this.calculateStackHeight(
            objectData.targetPosition.x,
            objectData.targetPosition.z,
            objectData.id
        );
        
        // 计算最终放置高度
        // 如果有物体叠放：stackHeight 是下面物体的顶部高度
        // 如果没有物体：从床面开始
        const finalY = stackHeight > 0 ? 
            stackHeight + objectData.size.height / 2 : 
            bedY + objectData.size.height / 2;
        
        console.log(`Bed Y: ${bedY}, Stack height: ${stackHeight}, Final Y position: ${finalY}`);
        
        // 更新目标位置的Y坐标
        objectData.targetPosition.y = finalY;
        
        // 5. 移动到目标位置上方（更高的位置以避开可能的堆叠）
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: Math.max(finalY + 50, 70), // 确保足够高
            z: objectData.targetPosition.z
        });
        
        // 6. 下降到目标位置
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: finalY + 15,
            z: objectData.targetPosition.z
        });
        
        // 7. 释放物品
        await this.releaseObject(objectData);
        
        // 8. 升起
        await this.moveGripperTo({
            x: objectData.targetPosition.x,
            y: Math.max(finalY + 50, 70),
            z: objectData.targetPosition.z
        });
    }
    
    /**
     * 移动打印头到指定位置
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
                
                // 更新打印头位置（使用与 Drawing Mode 相同的方法）
                if (this.printHead) {
                    const bedBoundingBox = new THREE.Box3().setFromObject(this.threeJSWorkArea.printBed);
                    const nozzleTipTargetY = this.gripperState.position.y;
                    const originTargetY = nozzleTipTargetY - this.threeJSWorkArea.printHeadNozzleOffset;
                    
                    const targetWorldPosition = new THREE.Vector3(
                        this.gripperState.position.x,
                        originTargetY,
                        this.gripperState.position.z
                    );
                    
                    if (this.printHead.parent) {
                        const parent = this.printHead.parent;
                        const targetLocalPosition = parent.worldToLocal(targetWorldPosition.clone());
                        this.printHead.position.copy(targetLocalPosition);
                    } else {
                        this.printHead.position.copy(targetWorldPosition);
                    }
                }
                
                // 如果正在抓取物品，让物品跟随打印头移动
                if (this.gripperState.isGripping && this.gripperState.grippedObject) {
                    const grippedObject = this.gripperState.grippedObject;
                    grippedObject.mesh.position.set(
                        this.gripperState.position.x,
                        this.gripperState.position.y - 15, // 减少间距，更紧密贴合
                        this.gripperState.position.z
                    );
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
            // 将物品放置到目标位置（包含叠放高度）
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
            
            console.log(`Object ${objectData.id} released at position:`, objectData.mesh.position);
            console.log(`Stack level: Y = ${objectData.targetPosition.y}, Base = ${objectData.size.height / 2}`);
            
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
     * 更新打印头指示灯
     */
    updateGripperLight(state) {
        if (!this.printHead) return;
        
        // 查找或创建独立的指示灯
        let light = this.printHead.getObjectByName('gripperIndicatorLight');
        
        if (!light) {
            const lightGeo = new THREE.SphereGeometry(2, 12, 12);
            // 使用 MeshStandardMaterial 以支持光照
            const lightMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x000000 });
            light = new THREE.Mesh(lightGeo, lightMat);
            light.name = 'gripperIndicatorLight';
            
            // 将指示灯放置在风扇附近
            light.position.set(20, 10, -15); 
            
            this.printHead.add(light);
            console.log('Created a new, independent indicator light for the gripper.');
        }
        
        try {
            switch (state) {
                case 'ready':
                    light.material.color.setHex(0x00ff00);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x002200);
                    }
                    break;
                case 'working':
                    light.material.color.setHex(0x3182ce);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x001122);
                    }
                    break;
                case 'gripping':
                    light.material.color.setHex(0xffa500);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x221100);
                    }
                    break;
                case 'paused':
                    light.material.color.setHex(0xffff00);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x222200);
                    }
                    break;
                case 'completed':
                    light.material.color.setHex(0x0000ff);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x000022);
                    }
                    break;
                case 'error':
                    light.material.color.setHex(0xff0000);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x220000);
                    }
                    break;
            }
        } catch (error) {
            console.warn('Failed to update gripper light:', error);
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
        
        // 重置打印头位置（如果需要的话）
        // 注意：打印头的初始位置由模型决定，这里不重置
        this.gripperState.position = { x: 0, y: 100, z: 0 };
        this.gripperState.isGripping = false;
        this.gripperState.grippedObject = null;
        
        console.log('Robot simulation stopped');
    }
    
    /**
     * 清除所有物品
     */
    clearObjects(preserveRaw = false) {
        this.objects.forEach(obj => {
            if (obj.mesh) {
                this.scene.remove(obj.mesh);
                obj.mesh.geometry.dispose();
                obj.mesh.material.dispose();
            }
        });
        this.objects = [];

        if (!preserveRaw) {
            this.rawObjects = [];
        }

        this.stopRobotSimulation();
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        this.clearObjects();
        
        // 不再需要清理 gripperArm，因为我们使用打印头
        // 打印头由 ThreeJSWorkArea 管理
    }
    
    /**
     * 调试工具：打印场景中所有对象的信息
     */
    debugSceneObjects() {
        console.log('=== Scene Debug Info ===');
        console.log('Total children:', this.scene.children.length);
        
        this.scene.children.forEach((child, index) => {
            console.log(`\nChild ${index}:`, {
                type: child.type,
                name: child.name,
                visible: child.visible,
                isGroup: child.isGroup,
                isMesh: child.isMesh,
                children: child.children ? child.children.length : 0
            });
            
            // 如果是 Group，显示子对象
            if (child.isGroup && child.children.length > 0) {
                child.children.forEach((subChild, subIndex) => {
                    console.log(`  Sub ${subIndex}:`, {
                        type: subChild.type,
                        name: subChild.name,
                        visible: subChild.visible,
                        geometry: subChild.geometry ? subChild.geometry.type : 'none',
                        material: subChild.material ? 'yes' : 'no'
                    });
                });
            }
        });
        
        console.log('\n=== Print Head Info ===');
        if (this.threeJSWorkArea.printHead) {
            console.log('Print head found:', {
                name: this.threeJSWorkArea.printHead.name,
                visible: this.threeJSWorkArea.printHead.visible,
                parent: this.threeJSWorkArea.printHead.parent ? this.threeJSWorkArea.printHead.parent.name : 'none',
                children: this.threeJSWorkArea.printHead.children.length
            });
            
            // 检查父对象可见性
            let parent = this.threeJSWorkArea.printHead.parent;
            let level = 0;
            while (parent) {
                console.log(`Parent ${level}:`, {
                    type: parent.type,
                    name: parent.name,
                    visible: parent.visible
                });
                parent = parent.parent;
                level++;
            }
        } else {
            console.log('Print head not found!');
        }
        
        console.log('======================');
    }
}

// 导出调试函数到全局（用于浏览器控制台调试）
if (typeof window !== 'undefined') {
    window.debugRobotGripper = function() {
        if (window.app && window.app.robotGripper) {
            window.app.robotGripper.debugSceneObjects();
        } else {
            console.error('RobotGripper not found. Make sure app is initialized.');
        }
    };
    console.log('Debug tool available: call debugRobotGripper() in console');
}
