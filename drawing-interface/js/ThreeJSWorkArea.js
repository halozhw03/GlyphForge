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
        this.printHeadNozzleOffset = 0;
        
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
        this.printBed = null;
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
        Debug.log('Initializing Three.js scene...');
        Debug.log('THREE object available:', typeof THREE !== 'undefined');
        Debug.log('Container dimensions:', this.container.clientWidth, 'x', this.container.clientHeight);
        
        // 检查容器尺寸
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            Debug.error('Container has zero dimensions!');
            setTimeout(() => this.initThreeJS(), 100); // 重试
            return;
        }
        
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        // 创建正交相机用于轴侧图视角
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const viewSize = 300; // 视图大小
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect / 2,  // left
            viewSize * aspect / 2,   // right
            viewSize / 2,            // top
            -viewSize / 2,           // bottom
            0.1,                     // near
            2000                     // far
        );
        
        // 设置轴侧图视角（等轴测图）- 从右上前方观察
        this.camera.position.set(300, 250, 300);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 1, 0);
        
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
        
        Debug.log('Canvas size set to:', containerWidth, 'x', containerHeight);
        Debug.log('Canvas aspect ratio:', containerWidth / containerHeight);
        
        this.container.appendChild(canvas);
        
        // 创建轨道控制器（使用我们的简化版本）
        try {
            this.controls = new SimpleOrbitControls(this.camera, this.renderer.domElement);
            this.controls.minDistance = 200;
            this.controls.maxDistance = 800;
            this.controls.minPolarAngle = Math.PI / 6; // 30度
            this.controls.maxPolarAngle = Math.PI / 2; // 90度
            Debug.log('SimpleOrbitControls initialized successfully');
        } catch (error) {
            Debug.error('Failed to initialize SimpleOrbitControls:', error);
            this.controls = null;
        }
        
        // 添加光照
        this.setupLighting();
        
        // 创建工作区域
        this.loadGLTFModel();
        
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
     * 加载GLTF模型
     */
    loadGLTFModel() {
        const loader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://unpkg.com/three@0.128.0/examples/js/libs/draco/gltf/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            'printers/Ender_3.gltf',
            (gltf) => {
                const model = gltf.scene;
                this.scene.add(model);

                // Force an update of the world matrix for the model and its children before calculations
                model.updateMatrixWorld(true);

                // 遍历模型查找特定部件
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }

                    // 根据名称识别打印头和打印床
                    if (child.name === 'Hotbed_Surface') {
                        this.printBed = child;
                    }
                    if (child.name === 'ASM_Printing_Head') { 
                        this.printHead = child;
                    }
                });

                if (this.printBed) {
                    const bedBoundingBox = new THREE.Box3().setFromObject(this.printBed);
                    const bedSize = new THREE.Vector3();
                    bedBoundingBox.getSize(bedSize);
                    if (bedSize.z > 0) { // avoid division by zero
                        const aspectRatio = bedSize.x / bedSize.z;
                        window.dispatchEvent(new CustomEvent('bedAspectRatioCalculated', { detail: { aspectRatio } }));
                    }
                }

                if (!this.printBed) {
                    Debug.error("Could not find print bed in the model. Please check the object names.");
                }
                if (!this.printHead) {
                    Debug.error("Could not find print head in the model. Please check the object names.");
                } else {
                    // Calculate the offset from the object's origin to its lowest point.
                    const boundingBox = new THREE.Box3().setFromObject(this.printHead);
                    const originWorldPosition = new THREE.Vector3();
                    this.printHead.getWorldPosition(originWorldPosition);
                    
                    this.printHeadNozzleOffset = boundingBox.min.y - originWorldPosition.y;
                    
                    // 强制设置打印头及其所有父对象和子对象为可见
                    this.printHead.visible = true;
                    
                    // 设置所有子对象可见
                    this.printHead.traverse((child) => {
                        child.visible = true;
                    });
                    
                    // 设置所有父对象可见
                    let parent = this.printHead.parent;
                    let parentLevel = 0;
                    while (parent) {
                        Debug.log(`Setting parent ${parentLevel} visible: ${parent.type} "${parent.name}"`);
                        parent.visible = true;
                        parent = parent.parent;
                        parentLevel++;
                    }
                    
                    Debug.log('Print head initialized and set visible:', this.printHead.visible);
                    
                    // 验证设置
                    setTimeout(() => {
                        Debug.log('Print head visibility after init:', this.printHead.visible);
                    }, 100);
                }
                
                // 模型加载后重新设置路径
                if (this.originalPaths.length > 0) {
                    this.setPaths(this.originalPaths);
                }
                
                // 触发模型加载完成事件
                window.dispatchEvent(new CustomEvent('printerModelLoaded', { 
                    detail: { 
                        printHead: this.printHead, 
                        printBed: this.printBed 
                    } 
                }));
                
                // 强制保持打印头可见（定期检查）
                this.ensurePrintHeadVisible();
            },
            (xhr) => {
                Debug.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                Debug.error('An error happened while loading the GLTF model', error);
            }
        );
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

        const drawingCanvas = document.getElementById('drawingCanvas');
        const canvasWidth = drawingCanvas ? drawingCanvas.clientWidth : 400;
        const canvasHeight = drawingCanvas ? drawingCanvas.clientHeight : 400;

        if (!this.printBed) {
            Debug.error("Cannot set paths, print bed not found.");
            return;
        }

        const bedBoundingBox = new THREE.Box3().setFromObject(this.printBed);
        const bedSize = new THREE.Vector3();
        bedBoundingBox.getSize(bedSize);

        this.paths = this.originalPaths.map(pathData => {
            const convertedPoints = pathData.points.map(p => {
                const percentX = p.x / canvasWidth;
                const percentY = p.y / canvasHeight;

                const convertedX = bedBoundingBox.min.x + percentX * bedSize.x;
                const convertedZ = bedBoundingBox.min.z + percentY * bedSize.z;
                
                // 确保路径在打印床表面上
                const bedY = bedBoundingBox.max.y;

                return {
                    x: convertedX,
                    y: bedY,
                    z: convertedZ
                };
            });

            return {
                points: convertedPoints,
                length: pathData.length,
                id: pathData.id
            };
        });

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
            
            const bedYOffset = 0.2; // 在床上方0.2mm绘制以避免Z-fighting
            const points = pathData.points.map(p => new THREE.Vector3(p.x, p.y + bedYOffset, p.z));
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
        this.isPaused = true;
        this.updateStatus('Simulation paused');
    }

    /**
     * 停止模拟
     */
    stopSimulation() {
        this.isSimulating = false;
        this.isPaused = false;
        this.updateStatus('Simulation stopped');
        this.resetSimulation();
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
        if (this.printHead) {
            // We don't reset the head position to a fixed spot anymore,
            // as its initial position is determined by the loaded model.
            // It will move to the start of the first path when simulation starts.
        }
        
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
        if (!this.printHead) return;

        // Target for the nozzle tip is the bed surface.
        const nozzleTipTargetY = this.currentPosition.y;

        // Calculate the required Y for the print head's origin.
        const originTargetY = nozzleTipTargetY - this.printHeadNozzleOffset;

        const targetWorldPosition = new THREE.Vector3(
            this.currentPosition.x,
            originTargetY,
            this.currentPosition.z
        );
        
        if (this.printHead.parent) {
            const parent = this.printHead.parent;
            const targetLocalPosition = parent.worldToLocal(targetWorldPosition.clone());
            this.printHead.position.copy(targetLocalPosition);
        } else {
            this.printHead.position.copy(targetWorldPosition);
        }
    }

    /**
     * 更新模拟状态
     */
    updateSimulation() {
        if (this.currentPathIndex >= this.paths.length) {
            Debug.log('ThreeJSWorkArea: All paths completed, calling completeSimulation');
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
                Debug.log('ThreeJSWorkArea: All paths completed after finishing current path, calling completeSimulation');
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
        Debug.log('ThreeJSWorkArea: completeSimulation called');
        this.isSimulating = false;
        this.isPaused = false;
        this.progress = 100;
        this.updateStatus('Completed');
        this.updateProgress();
        
        // Change path color to yellow for better visibility
        this.pathLines.forEach(line => {
            if (line.userData.isCompleted) {
                line.material.color.setHex(0xFFFF00); // Yellow
            }
        });
        
        // 通知主应用模拟完成
        Debug.log('ThreeJSWorkArea: onSimulationComplete callback exists?', !!this.onSimulationComplete);
        if (this.onSimulationComplete) {
            Debug.log('ThreeJSWorkArea: calling onSimulationComplete callback');
            this.onSimulationComplete();
        } else {
            Debug.log('ThreeJSWorkArea: no onSimulationComplete callback set!');
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
                const width = parseInt(e.target.value);
                this.workArea.width = width;
                // 重新设置路径以应用新的缩放比例
                if (this.originalPaths.length > 0) {
                    this.setPaths(this.originalPaths);
                }
            });
        }

        if (workHeightInput) {
            workHeightInput.addEventListener('change', (e) => {
                const height = parseInt(e.target.value);
                this.workArea.height = height;
                // 重新设置路径以应用新的缩放比例
                if (this.originalPaths.length > 0) {
                    this.setPaths(this.originalPaths);
                }
            });
        }
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
        
        Debug.log('Updating canvas size:', width, 'x', height);
        Debug.log('New aspect ratio:', width / height);
        
        // 更新正交相机的视口
        const aspect = width / height;
        const viewSize = 300;
        this.camera.left = -viewSize * aspect / 2;
        this.camera.right = viewSize * aspect / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
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
     * 确保打印头始终可见
     */
    ensurePrintHeadVisible() {
        if (this.printHead && this.printHead.visible === false) {
            Debug.log('Print head visibility was false, resetting to true');
            this.printHead.visible = true;
        }
    }
    
    /**
     * 动画循环
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // 确保打印头可见（每帧检查）
        this.ensurePrintHeadVisible();
        
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
