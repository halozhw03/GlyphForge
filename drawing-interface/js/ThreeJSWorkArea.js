/**
 * ThreeJSWorkArea - 3D工作区域展示界面
 */
class ThreeJSWorkArea {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isSimulating = false;
        this.isPaused = false;
        this.currentPathIndex = 0;
        this.currentPointIndex = 0;
        
        // 回调函数
        this.onSimulationComplete = null;
        
        // 工作区域参数 (mm)
        this.workArea = { width: 220, height: 220, depth: 250 };
        this.printSpeed = 30; // mm/s
        
        // Three.js 对象
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 3D对象
        this.workAreaMesh = null;
        this.gridHelper = null;
        this.printHead = null;
        this.pathLines = [];
        this.completedPaths = [];
        
        // 路径数据
        this.paths = [];
        this.originalPaths = []; // 保存原始路径数据，用于重新缩放
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.targetPosition = { x: 0, y: 0, z: 0 };
        
        // 动画相关
        this.animationId = null;
        this.lastTime = 0;
        this.progress = 0;
        
        // 初始化3D场景
        this.initThreeJS();
        
        // 绑定控制事件
        this.bindControls();
        
        // 启动渲染循环
        this.animate();
        
        // 确保初始画布大小正确
        setTimeout(() => this.updateCanvasSize(), 100);
    }

    /**
     * 初始化Three.js场景
     */
    initThreeJS() {
        console.log('Initializing Three.js scene...');
        console.log('THREE object available:', typeof THREE !== 'undefined');
        console.log('Container dimensions:', this.container.clientWidth, 'x', this.container.clientHeight);
        
        // 检查容器尺寸
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            console.error('Container has zero dimensions!');
            setTimeout(() => this.initThreeJS(), 100); // 重试
            return;
        }
        
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        // 创建相机 - 固定位置
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(300, 250, 300);
        this.camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // 计算合适的渲染尺寸，保持宽高比
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        // 使用容器的实际尺寸，但确保canvas元素不被CSS拉伸
        this.renderer.setSize(containerWidth, containerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 设置像素比例，防止在高DPI屏幕上模糊
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 设置canvas的CSS样式，确保它不会被拉伸
        const canvas = this.renderer.domElement;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        console.log('Canvas size set to:', containerWidth, 'x', containerHeight);
        console.log('Canvas aspect ratio:', containerWidth / containerHeight);
        
        this.container.appendChild(canvas);
        
        // 创建轨道控制器（使用我们的简化版本）
        try {
            this.controls = new SimpleOrbitControls(this.camera, this.renderer.domElement);
            this.controls.minDistance = 200;
            this.controls.maxDistance = 800;
            this.controls.minPolarAngle = Math.PI / 6; // 30度
            this.controls.maxPolarAngle = Math.PI / 2; // 90度
            console.log('SimpleOrbitControls initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SimpleOrbitControls:', error);
            this.controls = null;
        }
        
        // 添加光照
        this.setupLighting();
        
        // 创建工作区域
        this.createWorkArea();
        
        // 创建打印头
        this.createPrintHead();
        
        // 处理窗口大小调整
        this.handleResize();
    }

    /**
     * 设置光照
     */
    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // 主方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        this.scene.add(directionalLight);
        
        // 补充光源
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-100, 50, -100);
        this.scene.add(fillLight);
    }

    /**
     * 创建3D工作区域
     */
    createWorkArea() {
        // 工作平台
        const platformGeometry = new THREE.BoxGeometry(
            this.workArea.width, 
            5, 
            this.workArea.height
        );
        const platformMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xe0e0e0,
            transparent: true,
            opacity: 0.8
        });
        this.workAreaMesh = new THREE.Mesh(platformGeometry, platformMaterial);
        this.workAreaMesh.position.y = -2.5;
        this.workAreaMesh.receiveShadow = true;
        this.scene.add(this.workAreaMesh);
        
        // 工作区域边框
        const borderGeometry = new THREE.EdgesGeometry(platformGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });
        const borderLines = new THREE.LineSegments(borderGeometry, borderMaterial);
        borderLines.position.copy(this.workAreaMesh.position);
        this.scene.add(borderLines);
        
        // 网格
        this.createGrid();
        
        // 坐标轴
        this.createAxes();
    }

    /**
     * 创建网格
     */
    createGrid() {
        const gridSize = this.workArea.width;
        const divisions = this.workArea.width / 10; // 10mm间距
        
        this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0xcccccc, 0xe0e0e0);
        this.gridHelper.position.y = 0;
        this.scene.add(this.gridHelper);
        
        // Z方向的网格
        const gridHelperZ = new THREE.GridHelper(gridSize, divisions, 0xcccccc, 0xe0e0e0);
        gridHelperZ.rotation.x = Math.PI / 2;
        gridHelperZ.position.z = 0;
        this.scene.add(gridHelperZ);
    }

    /**
     * 创建坐标轴
     */
    createAxes() {
        const axesHelper = new THREE.AxesHelper(150);
        axesHelper.position.set(-this.workArea.width/2 + 20, 0, -this.workArea.height/2 + 20);
        this.scene.add(axesHelper);
        
        // 添加坐标轴标签
        this.createAxisLabels();
    }

    /**
     * 创建坐标轴标签
     */
    createAxisLabels() {
        const loader = new THREE.FontLoader();
        // 由于字体加载是异步的，这里先用简单的几何体表示坐标轴
        
        // X轴标记 (红色)
        const xMarkerGeometry = new THREE.ConeGeometry(3, 10, 8);
        const xMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const xMarker = new THREE.Mesh(xMarkerGeometry, xMarkerMaterial);
        xMarker.position.set(-this.workArea.width/2 + 50, 5, -this.workArea.height/2 + 20);
        xMarker.rotation.z = -Math.PI / 2;
        this.scene.add(xMarker);
        
        // Y轴标记 (绿色)
        const yMarkerGeometry = new THREE.ConeGeometry(3, 10, 8);
        const yMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const yMarker = new THREE.Mesh(yMarkerGeometry, yMarkerMaterial);
        yMarker.position.set(-this.workArea.width/2 + 20, 35, -this.workArea.height/2 + 20);
        this.scene.add(yMarker);
        
        // Z轴标记 (蓝色)
        const zMarkerGeometry = new THREE.ConeGeometry(3, 10, 8);
        const zMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const zMarker = new THREE.Mesh(zMarkerGeometry, zMarkerMaterial);
        zMarker.position.set(-this.workArea.width/2 + 20, 5, -this.workArea.height/2 + 50);
        zMarker.rotation.x = Math.PI / 2;
        this.scene.add(zMarker);
    }

    /**
     * 创建打印头
     */
    createPrintHead() {
        const printHeadGroup = new THREE.Group();
        
        // 打印头主体
        const headGeometry = new THREE.CylinderGeometry(8, 8, 20, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xdc143c });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.castShadow = true;
        printHeadGroup.add(head);
        
        // 打印头喷嘴
        const nozzleGeometry = new THREE.CylinderGeometry(2, 4, 8, 8);
        const nozzleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
        const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzle.position.y = -14;
        nozzle.castShadow = true;
        printHeadGroup.add(nozzle);
        
        // 指示灯
        const lightGeometry = new THREE.SphereGeometry(2, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            emissive: 0x004400
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(0, 8, 8);
        printHeadGroup.add(light);
        
        this.printHead = printHeadGroup;
        this.printHead.position.set(0, 30, 0);
        this.scene.add(this.printHead);
    }

    /**
     * 设置路径数据
     */
    setPaths(paths) {
        // 清除现有路径
        this.clearPaths();
        
        // 保存原始路径数据
        this.originalPaths = paths.map(pathData => ({
            points: [...pathData.points], // 深拷贝点数组
            length: pathData.length,
            id: pathData.id
        }));
        
        // 获取左侧画布的实际尺寸
        const drawingCanvas = document.getElementById('drawingCanvas');
        const canvasWidth = drawingCanvas ? drawingCanvas.clientWidth : 400;
        const canvasHeight = drawingCanvas ? drawingCanvas.clientHeight : 400;
        
        // 计算统一的缩放比例，保持形状比例不变
        // 使用较小的缩放比例确保内容完全适配工作区域
        const scaleX = this.workArea.width / canvasWidth;
        const scaleY = this.workArea.height / canvasHeight;
        const uniformScale = Math.min(scaleX, scaleY); // 使用统一缩放比例
        
        console.log(`Canvas size: ${canvasWidth}x${canvasHeight}, Work area: ${this.workArea.width}x${this.workArea.height}`);
        console.log(`Scale factors: X=${scaleX}, Y=${scaleY}, Uniform=${uniformScale}`);
        
        this.paths = this.originalPaths.map(pathData => ({
            points: pathData.points.map(p => ({ 
                x: (p.x * uniformScale) - this.workArea.width/2,  // 使用统一缩放并居中
                y: 0,
                z: (p.y * uniformScale) - this.workArea.height/2  // 使用统一缩放并居中
            })),
            length: pathData.length,
            id: pathData.id
        }));
        
        // 创建路径线条
        this.createPathLines();
        
        this.resetSimulation();
        this.updateEstimatedTime();
    }

    /**
     * 创建路径线条
     */
    createPathLines() {
        this.paths.forEach((pathData, index) => {
            if (pathData.points.length < 2) return;
            
            const points = pathData.points.map(p => new THREE.Vector3(p.x, p.y + 1, p.z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // 未执行的路径用虚线材质
            const material = new THREE.LineDashedMaterial({
                color: 0xcccccc,
                linewidth: 2,
                scale: 1,
                dashSize: 3,
                gapSize: 1,
            });
            
            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            line.userData = { pathIndex: index, isCompleted: false };
            
            this.pathLines.push(line);
            this.scene.add(line);
        });
    }

    /**
     * 清除路径
     */
    clearPaths() {
        // 移除路径线条
        this.pathLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.pathLines = [];
        
        // 移除已完成的路径
        this.completedPaths.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.completedPaths = [];
    }

    /**
     * 开始模拟
     */
    startSimulation() {
        if (this.paths.length === 0) {
            this.updateStatus('No paths to simulate');
            return;
        }
        
        this.isSimulating = true;
        this.isPaused = false;
        this.lastTime = Date.now();
        
        this.updateStatus('Simulating...');
        
        // 移动打印头到起始位置
        if (this.currentPathIndex < this.paths.length) {
            const firstPath = this.paths[this.currentPathIndex];
            if (firstPath.points.length > 0) {
                const startPoint = firstPath.points[0];
                this.currentPosition = { ...startPoint };
                this.currentPointIndex = 0;
                this.updatePrintHeadPosition();
            }
        }
    }

    /**
     * 暂停模拟
     */
    pauseSimulation() {
        this.isPaused = !this.isPaused;
        this.updateStatus(this.isPaused ? 'Paused' : 'Simulating...');
        
        // 更新打印头指示灯颜色
        try {
            const light = this.printHead.children[2]; // 指示灯
            if (light && light.material) {
                if (this.isPaused) {
                    light.material.color.setHex(0xffaa00);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x442200);
                    }
                } else {
                    light.material.color.setHex(0x00ff00);
                    if (light.material.emissive) {
                        light.material.emissive.setHex(0x004400);
                    }
                }
            }
        } catch (error) {
            console.warn('ThreeJSWorkArea: Failed to update indicator light in pauseSimulation:', error);
        }
    }

    /**
     * 停止模拟
     */
    stopSimulation() {
        this.isSimulating = false;
        this.isPaused = false;
        this.resetSimulation();
        this.updateStatus('Stopped');
        
        // 重置指示灯
        try {
            const light = this.printHead.children[2];
            if (light && light.material) {
                light.material.color.setHex(0x00ff00);
                if (light.material.emissive) {
                    light.material.emissive.setHex(0x004400);
                }
            }
        } catch (error) {
            console.warn('ThreeJSWorkArea: Failed to update indicator light in stopSimulation:', error);
        }
    }

    /**
     * 重置模拟
     */
    resetSimulation() {
        this.currentPathIndex = 0;
        this.currentPointIndex = 0;
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.progress = 0;
        
        // 重置打印头位置
        this.printHead.position.set(0, 30, 0);
        
        // 重置路径显示
        this.pathLines.forEach(line => {
            line.material.color.setHex(0xcccccc);
            line.userData.isCompleted = false;
        });
        
        this.updateProgress();
    }

    /**
     * 更新打印头位置
     */
    updatePrintHeadPosition() {
        this.printHead.position.set(
            this.currentPosition.x,
            this.currentPosition.y + 30,
            this.currentPosition.z
        );
        
        // 添加轻微的旋转动画效果
        if (this.isSimulating && !this.isPaused) {
            this.printHead.rotation.y += 0.01;
        }
    }

    /**
     * 更新模拟状态
     */
    updateSimulation() {
        if (this.currentPathIndex >= this.paths.length) {
            console.log('ThreeJSWorkArea: All paths completed, calling completeSimulation');
            this.completeSimulation();
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        const currentPath = this.paths[this.currentPathIndex];
        if (this.currentPointIndex >= currentPath.points.length) {
            // 当前路径完成，标记为已完成
            this.markPathCompleted(this.currentPathIndex);
            this.currentPathIndex++;
            this.currentPointIndex = 0;
            
            // 检查是否所有路径都已完成
            if (this.currentPathIndex >= this.paths.length) {
                console.log('ThreeJSWorkArea: All paths completed after finishing current path, calling completeSimulation');
                this.completeSimulation();
            }
            return;
        }
        
        const targetPoint = currentPath.points[this.currentPointIndex];
        const dx = targetPoint.x - this.currentPosition.x;
        const dy = targetPoint.y - this.currentPosition.y;
        const dz = targetPoint.z - this.currentPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 1) {
            // 到达目标点
            this.currentPosition = { ...targetPoint };
            this.currentPointIndex++;
            this.updateProgress();
        } else {
            // 向目标点移动
            const moveDistance = this.printSpeed * deltaTime;
            const moveRatio = Math.min(moveDistance / distance, 1);
            
            this.currentPosition.x += dx * moveRatio;
            this.currentPosition.y += dy * moveRatio;
            this.currentPosition.z += dz * moveRatio;
        }
        
        this.updatePrintHeadPosition();
    }

    /**
     * 标记路径为已完成
     */
    markPathCompleted(pathIndex) {
        if (pathIndex < this.pathLines.length) {
            const line = this.pathLines[pathIndex];
            line.material.color.setHex(0x4169e1); // 蓝色
            line.userData.isCompleted = true;
        }
    }

    /**
     * 完成模拟
     */
    completeSimulation() {
        console.log('ThreeJSWorkArea: completeSimulation called');
        this.isSimulating = false;
        this.isPaused = false;
        this.progress = 100;
        this.updateStatus('Completed');
        this.updateProgress();
        
        // 更新指示灯为完成状态
        try {
            const light = this.printHead.children[2];
            if (light && light.material) {
                light.material.color.setHex(0x0000ff);
                // 只有当材质支持emissive属性时才设置
                if (light.material.emissive) {
                    light.material.emissive.setHex(0x000044);
                }
            }
        } catch (error) {
            console.warn('ThreeJSWorkArea: Failed to update indicator light:', error);
        }
        
        // 通知主应用模拟完成
        console.log('ThreeJSWorkArea: onSimulationComplete callback exists?', !!this.onSimulationComplete);
        if (this.onSimulationComplete) {
            console.log('ThreeJSWorkArea: calling onSimulationComplete callback');
            this.onSimulationComplete();
        } else {
            console.log('ThreeJSWorkArea: no onSimulationComplete callback set!');
        }
    }

    /**
     * 更新进度
     */
    updateProgress() {
        let totalPoints = 0;
        let completedPoints = 0;
        
        this.paths.forEach((pathData, pathIndex) => {
            totalPoints += pathData.points.length;
            
            if (pathIndex < this.currentPathIndex) {
                completedPoints += pathData.points.length;
            } else if (pathIndex === this.currentPathIndex) {
                completedPoints += this.currentPointIndex;
            }
        });
        
        this.progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;
        
        const progressElement = document.getElementById('simProgress');
        if (progressElement) {
            progressElement.textContent = `${Math.round(this.progress)}%`;
        }
    }

    /**
     * 更新状态显示
     */
    updateStatus(status) {
        const statusElement = document.getElementById('simStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-${status.toLowerCase().replace(/[^a-z]/g, '')}`;
        }
    }

    /**
     * 更新预计时间
     */
    updateEstimatedTime() {
        let totalLengthPixels = 0;
        this.paths.forEach(pathData => {
            totalLengthPixels += pathData.length;
        });
        
        // 获取画布尺寸来计算实际的毫米长度
        const drawingCanvas = document.getElementById('drawingCanvas');
        const canvasWidth = drawingCanvas ? drawingCanvas.clientWidth : 400;
        const canvasHeight = drawingCanvas ? drawingCanvas.clientHeight : 400;
        
        // 计算统一缩放比例（像素到毫米），与setPaths中的逻辑保持一致
        const scaleX = this.workArea.width / canvasWidth;
        const scaleY = this.workArea.height / canvasHeight;
        const uniformScale = Math.min(scaleX, scaleY);
        const totalLengthMM = totalLengthPixels * uniformScale;
        
        const estimatedSeconds = totalLengthMM / this.printSpeed;
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = Math.floor(estimatedSeconds % 60);
        
        const estTimeElement = document.getElementById('estTime');
        if (estTimeElement) {
            estTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * 绑定控制事件
     */
    bindControls() {
        const speedSlider = document.getElementById('printSpeed');
        const speedValue = document.getElementById('speedValue');
        const workWidthInput = document.getElementById('workWidth');
        const workHeightInput = document.getElementById('workHeight');
        
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                this.printSpeed = parseInt(e.target.value);
                speedValue.textContent = this.printSpeed;
                this.updateEstimatedTime();
            });
            
            // 防止滑块事件被3D控制器干扰
            speedSlider.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            speedSlider.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            });
        }
        
        if (workWidthInput) {
            workWidthInput.addEventListener('change', (e) => {
                this.workArea.width = parseInt(e.target.value);
                this.recreateWorkArea();
                // 重新设置路径以应用新的缩放比例
                if (this.originalPaths.length > 0) {
                    this.setPaths(this.originalPaths);
                }
            });
        }
        
        if (workHeightInput) {
            workHeightInput.addEventListener('change', (e) => {
                this.workArea.height = parseInt(e.target.value);
                this.recreateWorkArea();
                // 重新设置路径以应用新的缩放比例
                if (this.originalPaths.length > 0) {
                    this.setPaths(this.originalPaths);
                }
            });
        }
    }

    /**
     * 重新创建工作区域
     */
    recreateWorkArea() {
        // 移除现有的工作区域对象
        if (this.workAreaMesh) {
            this.scene.remove(this.workAreaMesh);
            this.workAreaMesh.geometry.dispose();
            this.workAreaMesh.material.dispose();
        }
        
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            this.gridHelper.material.dispose();
        }
        
        // 重新创建工作区域
        this.createWorkArea();
    }

    /**
     * 处理窗口大小调整
     */
    handleResize() {
        window.addEventListener('resize', () => {
            this.updateCanvasSize();
        });
    }

    /**
     * 更新画布大小
     */
    updateCanvasSize() {
        if (!this.renderer || !this.camera || !this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        console.log('Updating canvas size:', width, 'x', height);
        console.log('New aspect ratio:', width / height);
        
        // 更新相机宽高比
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // 更新渲染器大小
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 确保canvas的CSS样式与渲染尺寸匹配
        const canvas = this.renderer.domElement;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // 强制重新渲染
        this.render();
    }

    /**
     * 渲染单帧
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * 动画循环
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // 更新控制器（如果可用）
        if (this.controls) {
            this.controls.update();
        }
        
        // 如果正在模拟，更新模拟状态
        if (this.isSimulating && !this.isPaused) {
            this.updateSimulation();
        }
        
        // 渲染场景
        this.render();
    }

    /**
     * 销毁实例
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // 清理Three.js资源
        this.clearPaths();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls && this.controls.dispose) {
            this.controls.dispose();
        }
        
        // 移除DOM元素
        if (this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
