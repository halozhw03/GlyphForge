/**
 * 主应用程序 - 3D机械臂模拟器
 */
class MechanicalArmSimulator {
    constructor() {
        this.drawingCanvas = null;
        this.threeJSWorkArea = null;
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
            
            // 初始化绘图画布
            this.drawingCanvas = new DrawingCanvas('drawingCanvas');
            
            // 初始化3D工作区域
            this.threeJSWorkArea = new ThreeJSWorkArea('threejsCanvas');
            
            // 设置模拟完成回调
            this.threeJSWorkArea.onSimulationComplete = () => {
                console.log('App: Simulation completed, updating button state');
                this.onSimulationComplete();
            };
            
            // 绑定UI事件
            this.bindUIEvents();
            
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
     * 绑定头部控制按钮事件
     */
    bindHeaderControls() {
        // 清除所有按钮
        const clearButton = document.getElementById('clearAll');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearAll());
        }
        
        // 模拟按钮
        const simulateButton = document.getElementById('simulate');
        if (simulateButton) {
            simulateButton.addEventListener('click', () => this.toggleSimulation());
        }
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
     * 显示工具提示
     */
    showToolTip(toolName) {
        const tips = {
            freehand: 'Click and drag to draw freehand lines. Control points will appear automatically after drawing.',
            line: 'Click to add points, Enter to finish, Escape to cancel',
            bezier: 'Click 4 points to create a Bezier curve',
            shape: 'Click to select a preset shape, then click on canvas to place it',
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
     * 清除所有内容
     */
    clearAll() {
        if (!this.isInitialized) return;
        
        // 确认对话框
        if (this.hasUnsavedChanges()) {
            if (!confirm('Are you sure you want to clear all paths? This action cannot be undone.')) {
                return;
            }
        }
        
        // 清除绘图画布
        if (this.drawingCanvas) {
            this.drawingCanvas.clearAll();
        }
        
        // 停止并重置模拟
        if (this.threeJSWorkArea) {
            this.threeJSWorkArea.stopSimulation();
            this.threeJSWorkArea.setPaths([]);
        }
        
        // 重置模拟按钮
        this.updateSimulateButton('simulate');
        
        this.showNotification('All paths cleared', 'success', 2000);
    }

    /**
     * 切换模拟状态
     */
    toggleSimulation() {
        if (!this.isInitialized || !this.threeJSWorkArea) return;
        
        // 检查当前按钮状态
        const simulateButton = document.getElementById('simulate');
        const buttonText = simulateButton ? simulateButton.textContent.trim() : '';
        
        // 如果是完成状态，重新开始模拟
        if (buttonText === 'Completed') {
            this.startSimulation();
            return;
        }
        
        if (this.threeJSWorkArea.isSimulating) {
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

    /**
     * 开始模拟
     */
    startSimulation() {
        if (!this.drawingCanvas || !this.threeJSWorkArea) return;
        
        // 获取所有路径
        const paths = this.drawingCanvas.getAllPaths();
        
        if (paths.length === 0) {
            this.showNotification('No paths to simulate. Please draw something first.', 'warning', 3000);
            return;
        }
        
        // 设置路径数据到3D工作区域
        this.threeJSWorkArea.setPaths(paths);
        
        // 开始模拟
        this.threeJSWorkArea.startSimulation();
        
        // 更新按钮状态
        this.updateSimulateButton('pause');
        
        this.showNotification('Simulation started', 'success', 2000);
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
        
        // 显示欢迎信息
        setTimeout(() => {
            this.showNotification('Welcome! Start drawing paths on the left panel. Press 4 to access preset shapes.', 'info', 5000);
        }, 1000);
    }

    /**
     * 检查是否有未保存的更改
     */
    hasUnsavedChanges() {
        return this.drawingCanvas && this.drawingCanvas.paths.length > 0;
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
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
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            wordWrap: 'break-word'
        });
        
        // 设置背景色
        const colors = {
            info: '#3182ce',
            success: '#38a169',
            warning: '#d69e2e',
            error: '#e53e3e'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
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
let app;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new MechanicalArmSimulator();
    });
} else {
    app = new MechanicalArmSimulator();
}

// 导出到全局作用域（用于调试）
window.MechanicalArmSimulator = MechanicalArmSimulator;
window.app = app;
