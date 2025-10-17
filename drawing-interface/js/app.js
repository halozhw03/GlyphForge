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
        this.printerManager = null;
        this.currentTool = 'freehand';
        this.currentMode = 'drawing'; // 'drawing' or 'robot'
        this.printMode = 'simulate'; // 'simulate' or 'real'
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
            
            // 机器人抓取
            if (this.threeJSWorkArea && this.workspaceCanvas) {
                this.robotGripper = new RobotGripper(this.threeJSWorkArea, this.workspaceCanvas);
                console.log('RobotGripper initialized');
            }
            
            // 初始化图片追踪器
            this.imageTracer = new ImageTracer();
            
            // 初始化打印机管理器
            this.printerManager = new PrinterManager();
            this.setupPrinterCallbacks();
            console.log('PrinterManager initialized:', this.printerManager);
            
            // 设置模拟完成回调
            this.threeJSWorkArea.onSimulationComplete = () => {
                console.log('App: Simulation completed, updating button state');
                this.onSimulationComplete();
            };
            
            // 绑定UI事件
            this.bindUIEvents();
            
            // 绑定打印机控制事件
            this.bindPrinterControls();
            
            // 绑定工作空间事件
            this.bindWorkspaceEvents();
            
            // 设置默认状态
            this.setupDefaultState();
            
            // 监听模型加载完成，确保打印头可见
            window.addEventListener('printerModelLoaded', () => {
                console.log('App: Printer model loaded, ensuring print head visibility');
                if (this.threeJSWorkArea.printHead) {
                    this.threeJSWorkArea.printHead.visible = true;
                    console.log('App: Print head visibility ensured:', this.threeJSWorkArea.printHead.visible);
                }
            });
            
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

        // 右侧折叠交互
        this.bindSimSectionToggles();
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
                // 使用DrawingCanvas的方法添加追踪的路径
                if (this.drawingCanvas) {
                    this.drawingCanvas.addTracedPaths(result.paths, result.width, result.height);
                }
                
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
            headerTitle.textContent = 'GlyphForge';
        }
        
        // 更新模式切换按钮
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Drawing Mode';
            // 保持与"Robot Mode"一致的白色背景，不再添加填充色样式
        }
        
        // 隐藏绘画面板，显示机器人面板
        const drawingPanel = document.getElementById('drawingModePanel');
        const robotPanel = document.getElementById('robotModePanel');
        
        if (drawingPanel) drawingPanel.classList.add('hidden');
        if (robotPanel) robotPanel.classList.remove('hidden');
        
        // 启用机器人抓取器
        this.robotGripper.enableRobotMode();

        // 强制重绘工作区画布
        if (this.workspaceCanvas) {
            setTimeout(() => {
                this.workspaceCanvas.resize();
            }, 50); // 短暂延迟确保容器已显示
        }
        
        // 确保打印头可见
        if (this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
            console.log('Robot mode: Print head set visible');
        }
        
        // 设置默认机器人工具
        // 默认将工作区工具设置为 place-object，但不高亮任何按钮
        if (this.workspaceCanvas) {
            this.workspaceCanvas.setTool('place-object');
        }
        // 确保进入机器人模式时，工具按钮无激活样式
        document.querySelectorAll('#robotModePanel .tool-btn').forEach(btn => btn.classList.remove('active'));
        
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
            headerTitle.textContent = 'GlyphForge';
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
        
        // 禁用机器人抓取器
        this.robotGripper.disableRobotMode();
        
        // 强制重绘绘画画布
        if (this.drawingCanvas) {
            setTimeout(() => {
                this.drawingCanvas.resize();
            }, 50); // 短暂延迟确保容器已显示
        }

        // 确保打印头可见（Drawing Mode 也使用打印头）
        if (this.threeJSWorkArea && this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
            console.log('Drawing mode: Print head set visible');
        }
        
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
        // 提示已移除以减少弹窗
    }

    /**
     * 显示工具提示
     */
    showToolTip(toolName) {
        // 提示已移除以减少弹窗
    }

    /**
     * 显示形状提示
     */
    showShapeTip(shapeType) {
        // 提示已移除以减少弹窗
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
        // 提示已移除以减少弹窗
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
        }
    }

    /**
     * 模拟完成回调
     */
    onSimulationComplete() {
        console.log('App: Setting button to completed state');
        this.updateSimulateButton('completed');
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
        // 默认工具保持为 freehand，但不高亮任何按钮
        if (this.drawingCanvas) {
            this.drawingCanvas.setTool('freehand');
        }
        
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
        
        // 初始化打印机状态显示
        const printerStatus = document.querySelector('.printer-status');
        if (printerStatus) {
            printerStatus.classList.remove('active'); // 默认隐藏打印机状态
        }
        
        // 确保模拟控制默认可见
        const simCanvas = document.querySelector('.sim-canvas-container');
        const simInfo = document.querySelector('.sim-info');
        if (simCanvas) simCanvas.classList.remove('hidden');
        if (simInfo) simInfo.classList.remove('hidden');
        
        // 设置Real Print按钮的初始状态（默认为simulate模式）
        this.updateRealPrintToggleButton();
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
        // 初始化通知管理器（如果还没初始化）
        if (!this.notifications) {
            this.notifications = [];
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // 添加样式类
        notification.className = `notification notification-${type}`;

        // 添加到页面
        document.body.appendChild(notification);

        // 将通知添加到管理器
        this.notifications.push(notification);

        // 计算通知位置并触发动画
        this.updateNotificationPositions();
        this.animateNotificationIn(notification);

        // 自动移除
        const removeNotification = () => {
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
                // 先平滑移动其他通知，再移除当前通知
                this.animateNotificationRemoval(notification, index);
            } else {
                // 如果通知不在数组中，直接移除
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        };

        setTimeout(removeNotification, duration);
    }

    /**
     * 更新所有通知的位置，使其垂直堆叠
     */
    updateNotificationPositions() {
        const notificationHeight = 70; // 通知的高度（包括间距），增加间距使堆叠更明显
        const startTop = 20; // 第一个通知的top位置

        this.notifications.forEach((notification, index) => {
            const topPosition = startTop + (index * notificationHeight);
            const currentTop = parseFloat(notification.style.top) || topPosition;

            // 如果位置差距较大，使用动画过渡
            if (Math.abs(currentTop - topPosition) > 1) {
                notification.style.transition = 'top 0.3s ease-out';
                notification.style.top = `${topPosition}px`;
            } else {
                notification.style.top = `${topPosition}px`;
            }
        });
    }

    /**
     * 触发动画让通知滑入位置
     */
    animateNotificationIn(notification) {
        // 设置初始状态（透明且稍微向上）
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';

        // 触发动画
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
    }

    /**
     * 动画移除通知，由上到下平滑消失
     */
    animateNotificationRemoval(notification, originalIndex) {
        const notificationHeight = 70;
        const startTop = 20;

        // 先移动其他通知到正确位置
        this.notifications.forEach((otherNotification, index) => {
            if (index >= originalIndex) { // 只移动在消失通知下方的通知
                const targetTop = startTop + (index * notificationHeight);
                const currentTop = parseFloat(otherNotification.style.top) || startTop;

                if (Math.abs(currentTop - targetTop) > 1) { // 如果位置差距较大，才需要动画
                    otherNotification.style.transition = 'top 0.3s ease-out';
                    otherNotification.style.top = `${targetTop}px`;
                }
            }
        });

        // 同时让当前通知消失
        notification.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
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
     * 设置打印机管理器回调函数
     */
    setupPrinterCallbacks() {
        if (!this.printerManager) return;
        
        // 连接状态变化回调
        this.printerManager.onConnectionChange = (connected) => {
            this.updateConnectionStatus(connected);
        };
        
        // 打印状态变化回调
        this.printerManager.onPrintStatusChange = (printing) => {
            this.updatePrintStatus(printing);
        };
        
        // 错误回调
        this.printerManager.onError = (error) => {
            this.showNotification(error, 'error', 4000);
        };
    }

    /**
     * 绑定打印机控制事件
     */
    bindPrinterControls() {
        // Real Print模式切换按钮
        const realPrintToggle = document.getElementById('realPrintToggle');
        if (realPrintToggle) {
            realPrintToggle.addEventListener('click', () => {
                // 在simulate和real之间切换
                const newMode = this.printMode === 'simulate' ? 'real' : 'simulate';
                this.printMode = newMode;
                this.onPrintModeChange(newMode);
                this.updateRealPrintToggleButton();
            });
        }
        
        // 连接按钮
        const connectBtn = document.getElementById('connectPrinter');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectPrinter();
            });
        }
        
        // 断开连接按钮
        const disconnectBtn = document.getElementById('disconnectPrinter');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectPrinter();
            });
        }
        
        // 开始打印按钮
        const startPrintBtn = document.getElementById('startRealPrint');
        if (startPrintBtn) {
            startPrintBtn.addEventListener('click', () => {
                this.startRealPrint();
            });
        }
        
        // 停止打印按钮
        const stopPrintBtn = document.getElementById('stopRealPrint');
        if (stopPrintBtn) {
            stopPrintBtn.addEventListener('click', () => {
                this.stopRealPrint();
            });
        }
        
        console.log('Printer controls bound');
    }

    /**
     * 更新Real Print切换按钮状态
     */
    updateRealPrintToggleButton() {
        const realPrintToggle = document.getElementById('realPrintToggle');
        if (!realPrintToggle) return;
        
        if (this.printMode === 'real') {
            // Real Print模式激活
            realPrintToggle.classList.add('active');
            realPrintToggle.title = 'Switch to Simulate';
        } else {
            // Simulate模式
            realPrintToggle.classList.remove('active');
            realPrintToggle.title = 'Real Print';
        }
    }

    /**
     * 绑定右侧折叠按钮交互
     */
    bindSimSectionToggles() {
        const buttons = document.querySelectorAll('.sim-section-btn');
        const sectionMap = {
            'print-speed': document.getElementById('section-print-speed'),
            'work-area': document.getElementById('section-work-area')
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.section;
                const targetSection = sectionMap[key];
                const isOpen = targetSection && !targetSection.classList.contains('hidden');
                if (isOpen) {
                    // 再次点击同一按钮 -> 收起
                    this.toggleSimSection(key, false, buttons, sectionMap);
                } else {
                    // 打开该分组并收起其他
                    Object.keys(sectionMap).forEach(k => {
                        this.toggleSimSection(k, k === key, buttons, sectionMap);
                    });
                }
            });
        });
    }

    /**
     * 展开/收起具体分组并更新按钮激活态
     */
    toggleSimSection(key, open, buttons, sectionMap) {
        const section = sectionMap[key];
        if (!section) return;
        if (open) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
        // 更新按钮激活态
        buttons.forEach(b => {
            if (b.dataset.section === key) {
                if (open) b.classList.add('active'); else b.classList.remove('active');
            } else {
                // 其他按钮根据其分组是否打开来更新
                const otherSection = sectionMap[b.dataset.section];
                if (otherSection && !otherSection.classList.contains('hidden')) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            }
        });
    }

    /**
     * 打印模式切换处理
     */
    async onPrintModeChange(mode) {
        console.log('Print mode changed to:', mode);
        this.printMode = mode;
        
        const printerControls = document.querySelectorAll('.printer-controls');
        const printerStatus = document.querySelector('.printer-status');
        const simCanvas = document.querySelector('.sim-canvas-container');
        const simInfo = document.querySelector('.sim-info');
        const simOnlyControls = document.querySelectorAll('.sim-only-control');
        const stepper = document.getElementById('realPrintStepper');
        
        // 获取Print Speed和Work Area按钮
        const printSpeedBtn = document.getElementById('simSectionSpeed');
        const workAreaBtn = document.getElementById('simSectionWorkArea');
        
        if (mode === 'real') {
            // 显示打印机控制
            printerControls.forEach(control => {
                control.classList.add('active');
            });
            if (printerStatus) {
                printerStatus.classList.add('active');
            }

            try {
                await this.printerManager.loadPrinterConfig();
                this.updateStepper({ modeCompleted: true, modelCompleted: true, connected: false, printing: false });
            } catch (error) {
                console.error('Failed to load Ender 3 config:', error);
            }

            // 隐藏3D模拟相关元素
            if (simCanvas) {
                simCanvas.classList.add('hidden');
            }
            if (simInfo) {
                simInfo.classList.add('hidden');
            }
            simOnlyControls.forEach(control => {
                control.classList.add('hidden');
            });

            // 在真实打印模式下收起速度分组和工作区域分组
            const sectionMap = {
                'print-speed': document.getElementById('section-print-speed'),
                'work-area': document.getElementById('section-work-area')
            };
            if (sectionMap['print-speed']) sectionMap['print-speed'].classList.add('hidden');
            if (sectionMap['work-area']) sectionMap['work-area'].classList.add('hidden');
            
            // 禁用Print Speed和Work Area按钮
            if (printSpeedBtn) {
                printSpeedBtn.disabled = true;
                printSpeedBtn.classList.remove('active');
                printSpeedBtn.style.opacity = '0.5';
                printSpeedBtn.style.cursor = 'not-allowed';
            }
            if (workAreaBtn) {
                workAreaBtn.disabled = true;
                workAreaBtn.classList.remove('active');
                workAreaBtn.style.opacity = '0.5';
                workAreaBtn.style.cursor = 'not-allowed';
            }

            // Stepper 状态：Mode 完成，其它重置
            if (stepper) {
                this.updateStepper({ modeCompleted: true, modelCompleted: false, connected: false, printing: false });
            }
        } else {
            // 隐藏打印机控制
            printerControls.forEach(control => {
                control.classList.remove('active');
            });
            if (printerStatus) {
                printerStatus.classList.remove('active');
            }
            
            // 显示3D模拟相关元素
            if (simCanvas) {
                simCanvas.classList.remove('hidden');
            }
            if (simInfo) {
                simInfo.classList.remove('hidden');
            }
            
            // 恢复模拟控制的显示，但保持折叠section的hidden状态
            simOnlyControls.forEach(control => {
                // 只移除非sim-section元素的hidden类
                // sim-section应该保持折叠状态，由用户点击按钮控制
                if (!control.classList.contains('sim-section')) {
                    control.classList.remove('hidden');
                }
            });

            // 确保所有折叠的sim-section保持hidden状态
            const sectionMap = {
                'print-speed': document.getElementById('section-print-speed'),
                'work-area': document.getElementById('section-work-area')
            };
            // 保持所有section为hidden状态，让用户通过工具栏按钮控制
            Object.values(sectionMap).forEach(section => {
                if (section) {
                    section.classList.add('hidden');
                }
            });
            // 移除所有section按钮的active状态
            document.querySelectorAll('.sim-section-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 启用Print Speed和Work Area按钮
            if (printSpeedBtn) {
                printSpeedBtn.disabled = false;
                printSpeedBtn.style.opacity = '';
                printSpeedBtn.style.cursor = '';
            }
            if (workAreaBtn) {
                workAreaBtn.disabled = false;
                workAreaBtn.style.opacity = '';
                workAreaBtn.style.cursor = '';
            }

            // 清空 Stepper 状态
            if (stepper) {
                this.updateStepper({ modeCompleted: false, modelCompleted: false, connected: false, printing: false });
            }
        }
    }

    /**
     * 打印机型号选择处理
     */
    async onPrinterSelect() {
        return this.printerManager.loadPrinterConfig();
    }

    /**
     * 连接打印机
     */
    async connectPrinter() {
        if (!this.printerManager) {
            this.showNotification('Printer manager not initialized', 'error', 3000);
            return;
        }
        
        try {
            this.updateConnectionStatus('connecting');
            await this.printerManager.connectPrinter();
            // 状态将通过回调更新
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 断开打印机连接
     */
    async disconnectPrinter() {
        if (!this.printerManager) return;
        
        try {
            await this.printerManager.disconnectPrinter();
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    }

    /**
     * 开始真实打印
     */
    async startRealPrint() {
        if (!this.printerManager) {
            this.showNotification('Printer manager not initialized', 'error', 3000);
            return;
        }
        
        if (!this.printerManager.isConnected) {
            this.showNotification('Please connect printer first', 'warning', 3000);
            return;
        }
        
        try {
            const workArea = {
                width: parseInt(document.getElementById('workWidth').value) || 220,
                height: parseInt(document.getElementById('workHeight').value) || 220
            };
            
            if (this.currentMode === 'drawing') {
                // Drawing Mode - 打印路径
                const paths = this.drawingCanvas.getAllPaths();
                
                if (paths.length === 0) {
                    this.showNotification('No paths to print', 'warning', 3000);
                    return;
                }
                
                // 预览G-code（可选）
                const gcode = this.printerManager.previewGcode(paths, workArea, 'drawing');
                
                // 确认打印
                if (confirm(`Ready to print ${paths.length} path(s).\n\nPlease confirm:\n1. Printer is homed correctly\n2. Print bed is clean\n3. No obstacles\n\nStart printing?`)) {
                    await this.printerManager.startDrawingPrint(paths, workArea);
                }
                
            } else {
                // Robot Mode - 打印机器人操作
                const objects = this.workspaceCanvas.getAllObjects();
                
                const objectsWithTargets = objects.filter(obj => obj.targetPosition);
                if (objectsWithTargets.length === 0) {
                    this.showNotification('No objects with target positions', 'warning', 3000);
                    return;
                }
                
                // 预览G-code（可选）
                const gcode = this.printerManager.previewGcode(objects, workArea, 'robot');
                
                // 确认打印
                if (confirm(`Ready to execute ${objectsWithTargets.length} object operation(s).\n\nPlease confirm:\n1. Printer is homed correctly\n2. Work area is clear\n3. No obstacles\n\nStart operation?`)) {
                    await this.printerManager.startRobotPrint(objects, workArea);
                }
            }
            
        } catch (error) {
            console.error('Failed to start print:', error);
            this.showNotification('Print failed: ' + error.message, 'error', 4000);
        }
    }

    /**
     * 停止真实打印
     */
    stopRealPrint() {
        if (!this.printerManager) return;
        
        if (confirm('Stop printing?')) {
            this.printerManager.stopPrint();
        }
    }

    /**
     * 更新连接状态显示
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        const connectBtn = document.getElementById('connectPrinter');
        const disconnectBtn = document.getElementById('disconnectPrinter');
        const startPrintBtn = document.getElementById('startRealPrint');
        const stopPrintBtn = document.getElementById('stopRealPrint');
        
        if (!statusElement) return;
        
        if (status === 'connecting') {
            statusElement.textContent = 'Connecting...';
            statusElement.className = 'status-connecting';
            if (connectBtn) connectBtn.disabled = true;
            // Stepper: 连接步骤激活
            this.updateStepper({ connected: 'connecting' });
        } else if (status === true) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'status-connected';
            if (connectBtn) connectBtn.disabled = true;
            if (disconnectBtn) disconnectBtn.disabled = false;
            if (startPrintBtn) startPrintBtn.disabled = false;
            // Stepper: 连接完成
            this.updateStepper({ connected: true });
        } else {
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'status-disconnected';
            if (connectBtn) connectBtn.disabled = false;
            if (disconnectBtn) disconnectBtn.disabled = true;
            if (startPrintBtn) startPrintBtn.disabled = true;
            if (stopPrintBtn) stopPrintBtn.disabled = true;
            // Stepper: 连接与打印状态重置
            this.updateStepper({ connected: false, printing: false });
        }
    }

    /**
     * 更新打印状态显示
     */
    updatePrintStatus(printing) {
        const statusElement = document.getElementById('printStatus');
        const startPrintBtn = document.getElementById('startRealPrint');
        const stopPrintBtn = document.getElementById('stopRealPrint');
        
        if (!statusElement) return;
        
        if (printing) {
            statusElement.textContent = 'Printing';
            statusElement.className = 'status-printing';
            if (startPrintBtn) startPrintBtn.disabled = true;
            if (stopPrintBtn) stopPrintBtn.disabled = false;
            // Stepper: 打印步骤激活
            this.updateStepper({ printing: true });
        } else {
            statusElement.textContent = 'Ready';
            statusElement.className = '';
            if (startPrintBtn) startPrintBtn.disabled = false;
            if (stopPrintBtn) stopPrintBtn.disabled = true;
            // Stepper: 打印步骤重置为未激活
            this.updateStepper({ printing: false });
        }
    }

    /**
     * 更新 Real Print 步骤条
     * state = { modeCompleted?: boolean, modelCompleted?: boolean, connected?: boolean | 'connecting', printing?: boolean }
     */
    updateStepper(state = {}) {
        const stepMode = document.getElementById('step-mode');
        const stepModel = document.getElementById('step-model');
        const stepConnect = document.getElementById('step-connect');
        const stepPrint = document.getElementById('step-print');
        const connector1 = document.getElementById('connector-1');
        const connector2 = document.getElementById('connector-2');
        const connector3 = document.getElementById('connector-3');

        // 在模拟模式下，stepper 可能不存在
        if (!stepMode || !stepModel || !stepConnect || !stepPrint) return;

        // 读取并合并状态（保持之前的完成状态，避免误清除）
        this.stepperState = Object.assign({
            modeCompleted: false,
            modelCompleted: false,
            connected: false,
            printing: false
        }, this.stepperState || {}, state);

        const { modeCompleted, modelCompleted, connected, printing } = this.stepperState;

        // Reset classes first
        [stepMode, stepModel, stepConnect, stepPrint].forEach(el => {
            el.classList.remove('active', 'completed');
        });
        [connector1, connector2, connector3].forEach(c => c && c.classList.remove('completed'));

        // Step 1: Mode
        if (modeCompleted) {
            stepMode.classList.add('completed');
            if (connector1) connector1.classList.add('completed');
        } else {
            // 若未完成，仅激活第一步
            stepMode.classList.add('active');
        }

        // Step 2: Model
        if (modelCompleted) {
            stepModel.classList.add('completed');
            if (connector2) connector2.classList.add('completed');
        } else if (modeCompleted) {
            stepModel.classList.add('active');
        }

        // Step 3: Connect
        if (connected === true) {
            stepConnect.classList.add('completed');
            if (connector3) connector3.classList.add('completed');
        } else if (connected === 'connecting') {
            stepConnect.classList.add('active');
        }

        // Step 4: Print
        if (printing) {
            stepPrint.classList.add('active');
        }
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

// 导出调试函数
window.debugRobotGripper = function() {
    if (window.app && window.app.robotGripper) {
        window.app.robotGripper.debugSceneObjects();
    } else {
        console.error('RobotGripper not found. Make sure app is initialized.');
        console.log('App:', window.app);
        console.log('RobotGripper:', window.app?.robotGripper);
    }
};

window.debugScene = function() {
    if (window.app && window.app.threeJSWorkArea) {
        const scene = window.app.threeJSWorkArea.scene;
        console.log('=== Scene Children ===');
        scene.children.forEach((child, i) => {
            console.log(`${i}:`, child.type, child.name, 'visible:', child.visible);
        });
        console.log('Print Head:', window.app.threeJSWorkArea.printHead);
        console.log('Print Bed:', window.app.threeJSWorkArea.printBed);
    }
};

console.log('Debug functions available:');
console.log('  debugRobotGripper() - Debug robot gripper and scene');
console.log('  debugScene() - Quick scene overview');
