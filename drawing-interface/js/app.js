/**
 * 主应用程序 - 3D机械臂模拟器
 */
class MechanicalArmSimulator {
    constructor() {
        this.drawingCanvas = null;
        this.workspaceCanvas = null;
        this.threeJSWorkArea = null;
        this.robotGripper = null;
        this.imageTracer = null;
        this.currentTool = 'freehand';
        this.currentMode = 'drawing'; // 'drawing' or 'robot'
        this.isInitialized = false;
        
        // 等待DOM加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * 初始化应用程序
     */
    initialize() {
        try {
            console.log('Initializing 3D Mechanical Arm Simulator...');
            
            // 检查必要的DOM元素
            const canvasElement = document.getElementById('drawingCanvas');
            const clearButton = document.getElementById('clearAll');
            const simulateButton = document.getElementById('simulate');
            
            console.log('Canvas element:', canvasElement);
            console.log('Clear button:', clearButton);
            console.log('Simulate button:', simulateButton);
            
            if (!canvasElement) {
                throw new Error('Drawing canvas element not found');
            }
            
            // 初始化绘图画布
            this.drawingCanvas = new DrawingCanvas('drawingCanvas');
            console.log('DrawingCanvas initialized:', this.drawingCanvas);
            
            // 初始化工作空间画布（机器人模式）
            this.workspaceCanvas = new WorkspaceCanvas('workspaceCanvas');
            console.log('WorkspaceCanvas initialized:', this.workspaceCanvas);
            
            // 初始化3D工作区域
            this.threeJSWorkArea = new ThreeJSWorkArea('threejsCanvas');
            
            // 初始化机器人抓手
            this.robotGripper = new RobotGripper(this.threeJSWorkArea);
            console.log('RobotGripper initialized:', this.robotGripper);
            
            // 初始化图片追踪器
            this.imageTracer = new ImageTracer();
            
            // 设置模拟完成回调
            this.threeJSWorkArea.onSimulationComplete = () => {
                console.log('App: Simulation completed, updating button state');
                this.onSimulationComplete();
            };
            
            // 绑定UI事件
            this.bindUIEvents();
            
            // 绑定工作空间事件
            this.bindWorkspaceEvents();
            
            // 设置默认状态
            this.setupDefaultState();
            
            this.isInitialized = true;
            console.log('Initialization completed successfully!');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * 绑定UI事件
     */
    bindUIEvents() {
        // 工具按钮事件
        this.bindToolButtons();
        
        // 头部控制按钮事件
        this.bindHeaderControls();
        
        // 模式切换事件
        this.bindModeToggle();
        
        // 物品库事件
        this.bindObjectLibrary();
        
        // 图片上传事件
        this.bindImageUpload();
        
        // 窗口调整事件
        this.bindWindowEvents();
        
        // 键盘快捷键
        this.bindKeyboardShortcuts();
    }

    /**
     * 绑定工具按钮事件
     */
    bindToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectTool(tool, e.currentTarget);
            });
        });
        
        // 绑定形状选择按钮事件
        this.bindShapeButtons();
    }

    /**
     * 绑定形状选择按钮事件
     */
    bindShapeButtons() {
        const shapeTool = document.getElementById('shapeTool');
        const shapeSelector = document.getElementById('shapeSelector');
        const shapeButtons = document.querySelectorAll('.shape-btn[data-shape]');
        
        // 形状工具按钮点击事件
        if (shapeTool) {
            shapeTool.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleShapeSelector();
            });
        }
        
        // 形状选择按钮事件
        shapeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const shapeType = e.currentTarget.dataset.shape;
                this.selectShape(shapeType, e.currentTarget);
            });
        });
        
        // 点击其他地方隐藏形状选择器
        document.addEventListener('click', (e) => {
            if (shapeSelector && !shapeSelector.contains(e.target) && e.target !== shapeTool) {
                shapeSelector.classList.add('hidden');
            }
        });
    }

    /**
     * 绑定物品形状选择按钮事件
     */
    bindObjectShapeButtons() {
        const selectObjectTool = document.getElementById('selectObjectTool');
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        const objectShapeButtons = document.querySelectorAll('.object-shape-btn[data-object]');
        
        // 物品选择工具按钮点击事件
        if (selectObjectTool) {
            selectObjectTool.addEventListener('click', (e) => {
                e.stopPropagation();
                // 确保当前工具为放置物品
                this.selectRobotTool('place-object');
                this.toggleObjectShapeSelector();
            });
        }
        
        // 物品形状选择按钮事件
        objectShapeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const objectType = e.currentTarget.dataset.object;
                this.selectObjectShape(objectType, e.currentTarget);
                // 选择形状后，自动切回放置工具
                this.selectRobotTool('place-object');
            });
        });
        
        // 点击其他地方隐藏物品形状选择器
        document.addEventListener('click', (e) => {
            if (objectShapeSelector && !objectShapeSelector.contains(e.target) && e.target !== selectObjectTool) {
                objectShapeSelector.classList.add('hidden');
            }
        });
    }

    /**
     * 绑定图片上传事件
     */
    bindImageUpload() {
        const imageInput = document.getElementById('imageInput');
        
        if (imageInput) {
            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    await this.handleImageUpload(file);
                    // 清空input以允许重复选择同一文件
                    e.target.value = '';
                }
            });
        }
    }

    /**
     * 绑定头部控制按钮事件
     */
    bindHeaderControls() {
        // 清除所有按钮
        const clearButton = document.getElementById('clearAll');
        console.log('Binding clear button:', clearButton);
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                console.log('Clear All button clicked');
                this.clearAll();
            });
        } else {
            console.error('Clear All button not found!');
        }
        
        // 模拟按钮
        const simulateButton = document.getElementById('simulate');
        console.log('Binding simulate button:', simulateButton);
        if (simulateButton) {
            simulateButton.addEventListener('click', () => {
                console.log('Simulate button clicked');
                this.toggleSimulation();
            });
        } else {
            console.error('Simulate button not found!');
        }
    }

    /**
     * 绑定模式切换事件
     */
    bindModeToggle() {
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.addEventListener('click', () => {
                this.toggleMode();
            });
        }
    }

    /**
     * 绑定物品库事件
     */
    bindObjectLibrary() {
        // 绑定机器人模式工具按钮
        const robotToolButtons = document.querySelectorAll('#robotModePanel .tool-btn[data-tool]');
        robotToolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectRobotTool(tool, e.currentTarget);
            });
        });
        
        // 绑定物品选择按钮事件
        this.bindObjectShapeButtons();
    }

    /**
     * 绑定工作空间事件
     */
    bindWorkspaceEvents() {
        // 监听工作空间画布事件
        document.addEventListener('workspaceCanvas:objectPlaced', (e) => {
            console.log('Object placed:', e.detail);
        });

        document.addEventListener('workspaceCanvas:targetSet', (e) => {
            console.log('Target set:', e.detail);
        });

        document.addEventListener('workspaceCanvas:objectDeleted', (e) => {
            console.log('Object deleted:', e.detail);
        });

        // 监听工具切换事件
        document.addEventListener('workspaceCanvas:toolChanged', (e) => {
            console.log('Tool changed:', e.detail);
            this.updateRobotToolButtons(e.detail.tool);
        });
    }

    /**
     * 更新机器人工具按钮状态
     */
    updateRobotToolButtons(toolName) {
        // 更新工具按钮状态
        document.querySelectorAll('#robotModePanel .tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolButton = document.querySelector(`#robotModePanel [data-tool="${toolName}"]`);
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // 更新当前工具状态
        this.currentTool = toolName;
        
        console.log('Robot tool buttons updated for:', toolName);
    }


    /**
     * 绑定窗口事件
     */
    bindWindowEvents() {
        // 窗口大小调整
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.drawingCanvas) {
                    this.drawingCanvas.resize();
                }
            }, 250);
        });
        
        // 防止意外关闭页面
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 忽略输入框中的按键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case '1':
                    this.selectTool('freehand');
                    break;
                case '2':
                    this.selectTool('line');
                    break;
                case '3':
                    this.selectTool('bezier');
                    break;
                case '4':
                    this.selectTool('shape');
                    break;
                case '5':
                    this.selectTool('image-trace');
                    break;
                case '6':
                    this.selectTool('dynamic');
                    break;
                case 'c':
                    if (this.currentTool === 'shape') {
                        this.selectShape('circle');
                    }
                    break;
                case 's':
                    if (this.currentTool === 'shape') {
                        this.selectShape('star');
                    }
                    break;
                case 'h':
                    if (this.currentTool === 'shape') {
                        this.selectShape('heart');
                    }
                    break;
                case 'd':
                    this.selectTool('delete');
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleSimulation();
                    break;
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.clearAll();
                    }
                    break;
            }
        });
    }

    /**
     * 处理图片上传
     */
    async handleImageUpload(file) {
        try {
            this.showNotification('Processing image...', 'info', 2000);
            
            // 使用图片追踪器处理图片
            const result = await this.imageTracer.processImage(file);
            
            if (result.paths && result.paths.length > 0) {
                // 将追踪结果转换为Paper.js路径并添加到画布
                this.addTracedPaths(result.paths, result.width, result.height);
                
                this.showNotification(
                    `Image traced successfully! Found ${result.paths.length} paths.`, 
                    'success', 
                    3000
                );
            } else {
                this.showNotification(
                    'No clear outlines found in the image. Try an image with more contrast.', 
                    'warning', 
                    4000
                );
            }
            
        } catch (error) {
            console.error('Image processing error:', error);
            this.showNotification(
                'Failed to process image. Please try a different image.', 
                'error', 
                4000
            );
        }
    }
    
    /**
     * 将追踪的路径添加到画布
     */
    addTracedPaths(tracedPaths, imageWidth, imageHeight) {
        if (!this.drawingCanvas) return;
        
        // 获取画布尺寸
        const canvasBounds = paper.view.bounds;
        const canvasWidth = canvasBounds.width;
        const canvasHeight = canvasBounds.height;
        
        // 计算缩放比例，使图片适应画布中心区域（留一些边距）
        const margin = 50;
        const availableWidth = canvasWidth - 2 * margin;
        const availableHeight = canvasHeight - 2 * margin;
        
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // 计算居中偏移
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;
        
        // 转换每个路径
        for (const tracedPath of tracedPaths) {
            if (tracedPath.length < 2) continue;
            
            // 创建Paper.js路径
            const path = new paper.Path();
            path.strokeColor = this.drawingCanvas.strokeColor || '#2563eb';
            path.strokeWidth = this.drawingCanvas.strokeWidth || 2;
            path.fillColor = null;
            
            // 添加路径点
            for (let i = 0; i < tracedPath.length; i++) {
                const [x, y] = tracedPath[i];
                
                // 应用缩放和偏移
                const scaledX = x * scale + offsetX;
                const scaledY = y * scale + offsetY;
                
                if (i === 0) {
                    path.moveTo(new paper.Point(scaledX, scaledY));
                } else {
                    path.lineTo(new paper.Point(scaledX, scaledY));
                }
            }
            
            // 如果路径是闭合的（起点和终点接近），则闭合路径
            const firstPoint = tracedPath[0];
            const lastPoint = tracedPath[tracedPath.length - 1];
            const distance = Math.sqrt(
                Math.pow(firstPoint[0] - lastPoint[0], 2) + 
                Math.pow(firstPoint[1] - lastPoint[1], 2)
            );
            
            if (distance < 10) {
                path.closePath();
            }
            
            // 平滑路径
            path.smooth();
            
            // 创建路径数据对象并添加到绘图画布
            const points = [];
            for (let segment of path.segments) {
                points.push({ x: segment.point.x, y: segment.point.y });
            }
            
            const pathData = {
                path: path,
                points: points,
                length: this.drawingCanvas.pathProcessor.calculatePathLength(points),
                id: this.drawingCanvas.generatePathId()
            };
            
            this.drawingCanvas.paths.push(pathData);
            path.data = pathData;
        }
        
        // 更新路径信息显示
        this.drawingCanvas.updatePathInfo();
        
        // 重绘画布
        paper.view.draw();
    }

    /**
     * 选择工具
     */
    selectTool(toolName, buttonElement = null) {
        if (!this.drawingCanvas) return;
        
        // 更新工具按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            const toolButton = document.querySelector(`[data-tool="${toolName}"]`);
            if (toolButton) {
                toolButton.classList.add('active');
            }
        }
        
        // 设置绘图画布工具
        this.drawingCanvas.setTool(toolName);
        
        // 更新当前工具状态
        this.currentTool = toolName;
        
        // 如果是图片追踪工具，触发文件选择
        if (toolName === 'image-trace') {
            const imageInput = document.getElementById('imageInput');
            if (imageInput) {
                imageInput.click();
            }
        }
        
        // 显示工具提示
        this.showToolTip(toolName);
    }

    /**
     * 切换形状选择器显示状态
     */
    toggleShapeSelector() {
        const shapeSelector = document.getElementById('shapeSelector');
        if (shapeSelector) {
            shapeSelector.classList.toggle('hidden');
        }
    }

    /**
     * 选择形状
     */
    selectShape(shapeType, buttonElement = null) {
        if (!this.drawingCanvas) return;
        
        // 设置绘图画布的当前形状
        this.drawingCanvas.setCurrentShape(shapeType);
        
        // 确保选择了形状工具
        this.selectTool('shape');
        
        // 更新形状按钮状态
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            const shapeButton = document.querySelector(`[data-shape="${shapeType}"]`);
            if (shapeButton) {
                shapeButton.classList.add('active');
            }
        }
        
        // 隐藏形状选择器
        const shapeSelector = document.getElementById('shapeSelector');
        if (shapeSelector) {
            shapeSelector.classList.add('hidden');
        }
        
        // 显示形状提示
        this.showShapeTip(shapeType);
    }

    /**
     * 切换模式
     */
    toggleMode() {
        if (this.currentMode === 'drawing') {
            this.switchToRobotMode();
        } else {
            this.switchToDrawingMode();
        }
    }

    /**
     * 切换到机器人模式
     */
    switchToRobotMode() {
        this.currentMode = 'robot';
        
        // 更新标题
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.textContent = 'Robot Gripper Simulator';
        }
        
        // 更新模式切换按钮
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Drawing Mode';
            modeToggleButton.classList.add('robot-mode');
        }
        
        // 隐藏绘画面板，显示机器人面板
        const drawingPanel = document.getElementById('drawingModePanel');
        const robotPanel = document.getElementById('robotModePanel');
        
        if (drawingPanel) drawingPanel.classList.add('hidden');
        if (robotPanel) robotPanel.classList.remove('hidden');
        
        // 启用机器人模式
        if (this.robotGripper) {
            this.robotGripper.enableRobotMode();
        }
        
        // 设置默认机器人工具
        this.selectRobotTool('place-object');
        
        this.showNotification('Switched to Robot Mode', 'info', 2000);
        console.log('Switched to robot mode');
    }

    /**
     * 切换到绘画模式
     */
    switchToDrawingMode() {
        this.currentMode = 'drawing';
        
        // 更新标题
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.textContent = '3D Mechanical Arm Simulator';
        }
        
        // 更新模式切换按钮
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.innerHTML = '<i class="fas fa-robot"></i> Robot Mode';
            modeToggleButton.classList.remove('robot-mode');
        }
        
        // 显示绘画面板，隐藏机器人面板
        const drawingPanel = document.getElementById('drawingModePanel');
        const robotPanel = document.getElementById('robotModePanel');
        
        if (drawingPanel) drawingPanel.classList.remove('hidden');
        if (robotPanel) robotPanel.classList.add('hidden');
        
        // 禁用机器人模式
        if (this.robotGripper) {
            this.robotGripper.disableRobotMode();
        }
        
        this.showNotification('Switched to Drawing Mode', 'info', 2000);
        console.log('Switched to drawing mode');
    }

    /**
     * 选择机器人工具
     */
    selectRobotTool(toolName, buttonElement = null) {
        if (!this.workspaceCanvas) return;
        
        // 更新工具按钮状态
        document.querySelectorAll('#robotModePanel .tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            const toolButton = document.querySelector(`#robotModePanel [data-tool="${toolName}"]`);
            if (toolButton) {
                toolButton.classList.add('active');
            }
        }
        
        // 设置工作空间画布工具
        this.workspaceCanvas.setTool(toolName);
        
        // 更新当前工具状态
        this.currentTool = toolName;
        
        // 显示工具提示
        this.showRobotToolTip(toolName);
    }


    /**
     * 显示机器人工具提示
     */
    showRobotToolTip(toolName) {
        const tips = {
            'place-object': 'Click to place selected object on the workspace',
            'set-target': 'Click to set target position for objects',
            'delete-object': 'Click on objects to delete them'
        };
        
        const tip = tips[toolName];
        if (tip) {
            this.showNotification(tip, 'info', 3000);
        }
    }

    /**
     * 显示工具提示
     */
    showToolTip(toolName) {
        const tips = {
            freehand: 'Click and drag to draw freehand lines. Control points will appear automatically after drawing.',
            line: 'Click to add points, Enter to finish, Escape to cancel',
            bezier: 'Click 4 points to create a Bezier curve',
            shape: 'Click to select a preset shape, then click on canvas to place it',
            'image-trace': 'Upload an image to automatically trace its outline and convert it to drawable paths',
            dynamic: 'Dynamic Art Mode: Draw with dramatic size variation! Move VERY SLOWLY for huge dots (up to 20px), move quickly for tiny dots. The slower you move, the bigger and more opaque the dots become.',
            delete: 'Click on paths to delete them'
        };
        
        const tip = tips[toolName];
        if (tip) {
            this.showNotification(tip, 'info', 3000);
        }
    }

    /**
     * 显示形状提示
     */
    showShapeTip(shapeType) {
        const tips = {
            circle: 'Click anywhere on the canvas to place a circle',
            star: 'Click anywhere on the canvas to place a 5-pointed star',
            heart: 'Click anywhere on the canvas to place a heart shape'
        };
        
        const tip = tips[shapeType];
        if (tip) {
            this.showNotification(tip, 'info', 3000);
        }
    }

    /**
     * 切换物品形状选择器显示状态
     */
    toggleObjectShapeSelector() {
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        if (objectShapeSelector) {
            objectShapeSelector.classList.toggle('hidden');
        }
    }

    /**
     * 选择物品形状
     */
    selectObjectShape(objectType, buttonElement = null) {
        console.log('selectObjectShape called with:', objectType);
        console.log('workspaceCanvas available:', !!this.workspaceCanvas);
        
        if (!this.workspaceCanvas) return;
        
        // 设置工作空间画布的选中物品类型
        this.workspaceCanvas.setSelectedObjectType(objectType);
        console.log('Object type set to WorkspaceCanvas:', objectType);
        
        // 更新物品形状按钮状态
        document.querySelectorAll('.object-shape-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            const objectButton = document.querySelector(`[data-object="${objectType}"]`);
            if (objectButton) {
                objectButton.classList.add('active');
            }
        }
        
        // 隐藏物品形状选择器
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        if (objectShapeSelector) {
            objectShapeSelector.classList.add('hidden');
        }
        
        // 显示物品提示
        this.showObjectTip(objectType);
        
        console.log('Selected object shape completed:', objectType);
    }

    /**
     * 显示物品提示
     */
    showObjectTip(objectType) {
        const tips = {
            cube: 'Selected Cube - Click on the workspace to place cube objects',
            sphere: 'Selected Sphere - Click on the workspace to place sphere objects',
            cylinder: 'Selected Cylinder - Click on the workspace to place cylinder objects',
            box: 'Selected Box - Click on the workspace to place box objects'
        };
        
        const tip = tips[objectType];
        if (tip) {
            this.showNotification(tip, 'info', 3000);
        }
    }

    /**
     * 清除所有内容
     */
    clearAll() {
        console.log('clearAll called, isInitialized:', this.isInitialized);
        console.log('currentMode:', this.currentMode);
        
        if (!this.isInitialized) {
            console.log('Not initialized, returning');
            return;
        }
        
        // 确认对话框
        const message = this.currentMode === 'robot' ? 
            'Are you sure you want to clear all objects? This action cannot be undone.' :
            'Are you sure you want to clear all paths? This action cannot be undone.';
            
        if (this.hasUnsavedChanges()) {
            if (!confirm(message)) {
                console.log('User cancelled clear operation');
                return;
            }
        }
        
        if (this.currentMode === 'robot') {
            // 清除机器人模式内容
            if (this.workspaceCanvas) {
                console.log('Clearing workspace canvas');
                this.workspaceCanvas.clearAll();
            }
            
            if (this.robotGripper) {
                console.log('Clearing robot gripper objects');
                this.robotGripper.clearObjects();
            }
            
            this.showNotification('All objects cleared', 'success', 2000);
        } else {
            // 清除绘图模式内容
            if (this.drawingCanvas) {
                console.log('Clearing drawing canvas');
                this.drawingCanvas.clearAll();
            }
            
            // 停止并重置模拟
            if (this.threeJSWorkArea) {
                console.log('Resetting 3D work area');
                this.threeJSWorkArea.stopSimulation();
                this.threeJSWorkArea.setPaths([]);
            }
            
            this.showNotification('All paths cleared', 'success', 2000);
        }
        
        // 重置模拟按钮
        this.updateSimulateButton('simulate');
        
        console.log('Clear All completed');
    }

    /**
     * 切换模拟状态
     */
    toggleSimulation() {
        if (!this.isInitialized) return;
        
        // 检查当前按钮状态
        const simulateButton = document.getElementById('simulate');
        const buttonText = simulateButton ? simulateButton.textContent.trim() : '';
        
        // 如果是完成状态，重新开始模拟
        if (buttonText === 'Completed') {
            this.startSimulation();
            return;
        }
        
        if (this.currentMode === 'robot') {
            // 机器人模式的暂停逻辑
            if (this.robotGripper && this.robotGripper.isSimulating) {
                if (this.robotGripper.isPaused) {
                    // 继续模拟
                    this.robotGripper.resumeSimulation();
                    this.updateSimulateButton('pause');
                } else {
                    // 暂停模拟
                    this.robotGripper.pauseSimulation();
                    this.updateSimulateButton('resume');
                }
            } else {
                // 开始模拟
                this.startSimulation();
            }
        } else {
            // 绘画模式的暂停逻辑
            if (this.threeJSWorkArea && this.threeJSWorkArea.isSimulating) {
                if (this.threeJSWorkArea.isPaused) {
                    // 继续模拟
                    this.threeJSWorkArea.pauseSimulation();
                    this.updateSimulateButton('pause');
                } else {
                    // 暂停模拟
                    this.threeJSWorkArea.pauseSimulation();
                    this.updateSimulateButton('resume');
                }
            } else {
                // 开始模拟
                this.startSimulation();
            }
        }
    }

    /**
     * 开始模拟
     */
    startSimulation() {
        console.log('startSimulation called, mode:', this.currentMode);
        
        if (this.currentMode === 'robot') {
            return this.startRobotSimulation();
        } else {
            return this.startDrawingSimulation();
        }
    }

    /**
     * 开始绘画模拟
     */
    startDrawingSimulation() {
        console.log('Starting drawing simulation');
        
        if (!this.drawingCanvas || !this.threeJSWorkArea) {
            console.error('Required components not available');
            return;
        }
        
        // 获取所有路径
        const paths = this.drawingCanvas.getAllPaths();
        console.log('Paths retrieved:', paths);
        
        if (paths.length === 0) {
            this.showNotification('No paths to simulate. Please draw something first.', 'warning', 3000);
            return;
        }
        
        // 验证路径数据结构
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (!path.points || !Array.isArray(path.points)) {
                console.error(`Invalid path data at index ${i}:`, path);
                this.showNotification('Invalid path data detected. Please try drawing again.', 'error', 3000);
                return;
            }
        }
        
        try {
            // 设置路径数据到3D工作区域
            this.threeJSWorkArea.setPaths(paths);
            
            // 开始模拟
            this.threeJSWorkArea.startSimulation();
            
            // 更新按钮状态
            this.updateSimulateButton('pause');
            
            this.showNotification('Drawing simulation started', 'success', 2000);
        } catch (error) {
            console.error('Error starting drawing simulation:', error);
            this.showNotification('Failed to start simulation: ' + error.message, 'error', 4000);
        }
    }

    /**
     * 开始机器人模拟
     */
    startRobotSimulation() {
        console.log('Starting robot simulation');
        
        if (!this.workspaceCanvas || !this.robotGripper) {
            console.error('Required robot components not available');
            return;
        }
        
        // 获取所有物品
        const objects = this.workspaceCanvas.getAllObjects();
        console.log('Objects retrieved:', objects);
        
        if (objects.length === 0) {
            this.showNotification('No objects to simulate. Please place objects first.', 'warning', 3000);
            return;
        }
        
        // 检查是否有目标位置
        const objectsWithTargets = objects.filter(obj => obj.targetPosition);
        if (objectsWithTargets.length === 0) {
            this.showNotification('No target positions set. Please set target positions for objects.', 'warning', 3000);
            return;
        }
        
        try {
            // 设置物品数据到机器人抓手
            this.robotGripper.setObjects(objects);
            
            // 开始机器人模拟
            this.robotGripper.startRobotSimulation();
            
            // 更新按钮状态
            this.updateSimulateButton('pause');
            
            this.showNotification(`Robot simulation started for ${objectsWithTargets.length} objects`, 'success', 2000);
        } catch (error) {
            console.error('Error starting robot simulation:', error);
            this.showNotification('Failed to start robot simulation: ' + error.message, 'error', 4000);
        }
    }

    /**
     * 停止模拟
     */
    stopSimulation() {
        if (this.threeJSWorkArea) {
            this.threeJSWorkArea.stopSimulation();
            this.updateSimulateButton('simulate');
            this.showNotification('Simulation stopped', 'info', 2000);
        }
    }

    /**
     * 模拟完成回调
     */
    onSimulationComplete() {
        console.log('App: Setting button to completed state');
        this.updateSimulateButton('completed');
        this.showNotification('Simulation completed successfully!', 'success', 3000);
    }

    /**
     * 更新模拟按钮状态
     */
    updateSimulateButton(state) {
        const simulateButton = document.getElementById('simulate');
        if (!simulateButton) {
            console.log('App: simulate button not found!');
            return;
        }
        
        const states = {
            simulate: { text: 'Simulate', icon: 'fa-play', class: 'btn-primary' },
            pause: { text: 'Pause', icon: 'fa-pause', class: 'btn-warning' },
            resume: { text: 'Resume', icon: 'fa-play', class: 'btn-success' },
            stop: { text: 'Stop', icon: 'fa-stop', class: 'btn-danger' },
            completed: { text: 'Completed', icon: 'fa-check', class: 'btn-success' }
        };
        
        const config = states[state] || states.simulate;
        
        // 更新按钮内容
        simulateButton.innerHTML = `<i class="fas ${config.icon}"></i> ${config.text}`;
        
        // 更新按钮样式
        simulateButton.className = `btn ${config.class}`;
        
        // 强制重绘
        simulateButton.style.display = 'none';
        simulateButton.offsetHeight; // 触发重排
        simulateButton.style.display = '';
        
        console.log(`App: Button updated to "${config.text}" with class "${config.class}"`);
    }

    /**
     * 设置默认状态
     */
    setupDefaultState() {
        // 选择默认工具
        this.selectTool('freehand');
        
        // 设置默认形状并激活第一个形状按钮
        this.drawingCanvas.setCurrentShape('circle');
        const firstShapeButton = document.querySelector('.shape-btn[data-shape="circle"]');
        if (firstShapeButton) {
            firstShapeButton.classList.add('active');
        }
        
        // 设置固定的平滑预设值 (35%)
        this.drawingCanvas.setSmoothingFactor(35);
        
        // 设置默认物品类型（机器人模式）
        this.selectObjectShape('cube');
        const firstObjectButton = document.querySelector('.object-shape-btn[data-object="cube"]');
        if (firstObjectButton) {
            firstObjectButton.classList.add('active');
        }
        
        // 显示欢迎信息
        setTimeout(() => {
            this.showNotification('Welcome! Switch to Robot Mode to simulate object picking and placing.', 'info', 5000);
        }, 1000);
    }

    /**
     * 检查是否有未保存的更改
     */
    hasUnsavedChanges() {
        if (this.currentMode === 'robot') {
            return this.workspaceCanvas && this.workspaceCanvas.objects.length > 0;
        } else {
            return this.drawingCanvas && this.drawingCanvas.paths.length > 0;
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            wordWrap: 'break-word',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });
        
        // 设置背景色
        const colors = {
            info: '#3182ce',
            success: '#38a169',
            warning: '#d69e2e',
            error: '#e53e3e'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // 设置初始状态（透明且稍微向上）
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 触发淡入动画
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.showNotification(message, 'error', 5000);
    }

    /**
     * 销毁应用程序
     */
    destroy() {
        if (this.drawingCanvas) {
            // Paper.js会自动清理
        }
        
        if (this.threeJSWorkArea) {
            this.threeJSWorkArea.destroy();
        }
        
        // 移除事件监听器
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        document.removeEventListener('keydown', this.handleKeydown);
    }
}

// 创建全局应用实例
const app = new MechanicalArmSimulator();

// 导出到全局作用域（用于调试）
window.MechanicalArmSimulator = MechanicalArmSimulator;
window.app = app;
