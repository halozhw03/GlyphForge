/**
 * WorkspaceCanvas - 机器人模式下的工作空间画布
 * 用于处理物品的放置和目标位置的设定
 */
class WorkspaceCanvas {
    constructor(canvasId) {
        this.canvasElement = document.getElementById(canvasId);
        this.currentTool = 'place-object';
        this.selectedObjectType = 'cube';
        this.objects = [];
        this.isSettingTarget = false;
        this.currentObjectForTarget = null;
        
        // 初始化状态标志
        this.isPaperInitialized = false;
        this.useFallback = true; // 默认使用备用系统，直到Paper.js成功初始化
        this.paperScope = null;
        
        // Bed 长宽比（默认值，会在收到事件后更新）
        this.bedAspectRatio = null;

        if (!this.canvasElement) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        // 监听 bed 长宽比事件，动态调整容器比例
        window.addEventListener('bedAspectRatioCalculated', (e) => {
            this.bedAspectRatio = e.detail.aspectRatio;
            console.log('WorkspaceCanvas: Bed aspect ratio received:', this.bedAspectRatio);
            
            // 设置容器的 aspect-ratio
            const container = this.canvasElement.parentElement;
            if (container && this.bedAspectRatio) {
                container.style.aspectRatio = `${this.bedAspectRatio}`;
                console.log('Container aspect ratio set to:', this.bedAspectRatio);
            }
            
            // 重新调整canvas大小
            setTimeout(() => {
                if (this.isPaperInitialized) {
                    this.resize();
                } else {
                    this.setupCanvasSize();
                    this.drawBasicGrid();
                }
            }, 100);
        });

        // 初始化工具显示
        this.updateToolDisplay();

        this.initPaperJS();
    }
    
    /**
     * 初始化Paper.js
     */
    initPaperJS() {
        // 延迟初始化，确保canvas元素已正确渲染
        setTimeout(() => {
            try {
                console.log('Initializing Paper.js for WorkspaceCanvas...');
                console.log('Canvas element:', this.canvasElement);
                console.log('Canvas dimensions:', this.canvasElement.clientWidth, 'x', this.canvasElement.clientHeight);
                
                // 为工作空间画布创建独立的Paper.js范围
                this.paperScope = new paper.PaperScope();
                this.paperScope.setup(this.canvasElement);
                
                // 激活这个范围
                this.paperScope.activate();
                
                // 获取画布尺寸，确保有默认值和正确比例
                const containerWidth = this.canvasElement.clientWidth || 400;
                const containerHeight = this.canvasElement.clientHeight || 300;
                
                // 使用 bed 的长宽比（如果已获取），否则使用默认值
                const aspectRatio = this.bedAspectRatio || (4/3);
                let width, height;
                
                if (containerWidth / containerHeight > aspectRatio) {
                    // 容器太宽，以高度为准
                    height = containerHeight;
                    width = height * aspectRatio;
                } else {
                    // 容器太高，以宽度为准
                    width = containerWidth;
                    height = width / aspectRatio;
                }
                
                // 处理高DPR屏幕：内部像素=CSS*DPR，并缩放视图
                const dpr = window.devicePixelRatio || 1;
                this.dpr = dpr;
                this.canvasElement.style.width = width + 'px';
                this.canvasElement.style.height = height + 'px';
                this.canvasElement.width = Math.round(width * dpr);
                this.canvasElement.height = Math.round(height * dpr);
                
                // 记录CSS尺寸，统一坐标基准
                this.canvasWidth = width;
                this.canvasHeight = height;
                
                // 设置视图大小为CSS逻辑尺寸
                this.paperScope.view.viewSize = new this.paperScope.Size(width, height);
                // 通过设置view的缩放，确保鼠标坐标与CSS坐标一致
                this.paperScope.view.scale(1);
                
                // 为2D绘图上下文应用DPR缩放，保证绘制与点击坐标一致
                const ctx = this.canvasElement.getContext('2d');
                if (ctx && ctx.setTransform) {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
                
                // 绘制工作区域边界
                this.drawWorkAreaBoundary();
                
                console.log('WorkspaceCanvas Paper.js initialized successfully with size:', width, 'x', height);
                
                // 初始化完成后绑定事件
                this.bindEvents();
                this.isPaperInitialized = true;
                this.useFallback = false; // 使用统一事件系统，但Paper.js可用于绘制

                // 确保画布有正确的初始显示
                this.ensureCanvasDisplay();
                
            } catch (error) {
                console.error('Failed to initialize WorkspaceCanvas Paper.js:', error);
                // 使用统一的事件处理系统
                this.initUnifiedEventSystem();
            }
        }, 200); // 增加延迟时间
    }
    
    /**
     * 初始化统一事件系统
     */
    initUnifiedEventSystem() {
        console.log('Initializing unified event system for WorkspaceCanvas');
        this.isPaperInitialized = false;
        this.useFallback = true;
        console.log('Using fallback system:', this.useFallback);

        // 设置画布尺寸
        this.setupCanvasSize();

        // 绘制基础网格
        this.drawBasicGrid();

        // 绑定统一事件处理
        this.bindUnifiedEvents();

        // 确保画布有正确的初始显示
        this.ensureCanvasDisplay();
    }
    
    /**
     * 设置画布尺寸 - 简化版本，直接使用容器尺寸（与 DrawingCanvas 一致）
     */
    setupCanvasSize() {
        // 直接使用容器的客户端尺寸（CSS会处理aspect ratio）
        const width = this.canvasElement.clientWidth || 400;
        const height = this.canvasElement.clientHeight || 300;

        // 处理高DPR屏幕
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;

        // 设置canvas内部像素大小（物理像素）
        this.canvasElement.width = Math.round(width * dpr);
        this.canvasElement.height = Math.round(height * dpr);

        // 缩放上下文，使后续绘制仍然使用CSS单位
        const ctx = this.canvasElement.getContext('2d');
        if (ctx && ctx.setTransform) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // 保存CSS尺寸（用于逻辑计算）
        this.canvasWidth = width;
        this.canvasHeight = height;

        console.log('WorkspaceCanvas size set to:', width, 'x', height, 'DPR:', dpr);
    }
    
    /**
     * 绘制基础网格 - 与DrawingCanvas完全一致
     */
    drawBasicGrid() {
        const ctx = this.canvasElement.getContext('2d');
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        // 清除画布
        ctx.clearRect(0, 0, width, height);

        // 不再绘制边界线，与DrawingCanvas保持一致

        // 绘制网格 - 与DrawingCanvas保持一致的样式
        ctx.strokeStyle = '#f1f5f9';  // 使用与DrawingCanvas相同的网格颜色
        ctx.lineWidth = 0.5;         // 使用与DrawingCanvas相同的线宽
        ctx.setLineDash([]);

        const gridSize = 20;       // 使用与DrawingCanvas相同的网格间距

        // 垂直线 - 覆盖整个画布
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 水平线 - 覆盖整个画布
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    /**
     * 绑定统一事件处理
     */
    bindUnifiedEvents() {
        // 移除旧的事件监听器
        this.canvasElement.removeEventListener('click', this.handleCanvasClick);
        this.canvasElement.removeEventListener('mousemove', this.handleCanvasMouseMove);
        
        // 绑定新的事件处理器
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        
        this.canvasElement.addEventListener('click', this.handleCanvasClick);
        this.canvasElement.addEventListener('mousemove', this.handleCanvasMouseMove);
        
        // 窗口调整事件
        window.addEventListener('resize', () => {
            setTimeout(() => this.resize(), 100);
        });
        
        console.log('Unified events bound successfully');
        console.log('Canvas element:', this.canvasElement);
        console.log('Canvas element dimensions:', this.canvasElement.clientWidth, 'x', this.canvasElement.clientHeight);
    }
    
    /**
     * 统一的画布点击处理器
     */
    handleCanvasClick(e) {
        const point = this.getAccurateMousePosition(e);
        console.log('Canvas click at:', point, 'tool:', this.currentTool);

        // 检查是否在工作区域内
        if (!this.isPointInWorkAreaUnified(point)) {
            console.log('Click outside work area, ignoring');
            return;
        }

        console.log('Processing click with tool:', this.currentTool);

        switch (this.currentTool) {
            case 'place-object':
                console.log('Calling placeObjectUnified');
                this.placeObjectUnified(point);
                break;
            case 'set-target':
                console.log('Calling setTargetPositionUnified');
                this.setTargetPositionUnified(point);
                break;
            case 'delete-object':
                console.log('Calling deleteObjectAtUnified');
                this.deleteObjectAtUnified(point);
                break;
            default:
                console.log('Unknown tool:', this.currentTool);
        }
    }
    
    /**
     * 统一的鼠标移动处理器
     */
    handleCanvasMouseMove(e) {
        const point = this.getAccurateMousePosition(e);
        this.updateCursorUnified(point);
    }
    
    /**
     * 获取精确的鼠标位置
     */
    getAccurateMousePosition(e) {
        const rect = this.canvasElement.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        return { x, y };
    }
    
    /**
     * 统一的工作区域检查 - 与DrawingCanvas一致（整个画布都可用）
     */
    isPointInWorkAreaUnified(point) {
        const width = this.canvasWidth || this.canvasElement.width;
        const height = this.canvasHeight || this.canvasElement.height;
        
        return point.x >= 0 && 
               point.x <= width && 
               point.y >= 0 && 
               point.y <= height;
    }
    
    /**
     * 统一的放置物品方法
     */
    placeObjectUnified(point) {
        console.log('Placing object (unified) at:', point, 'type:', this.selectedObjectType);
        
        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false,
            state: 'placed'
        };
        
        this.objects.push(objectData);
        this.updateObjectInfo();
        
        // 绘制物品到画布
        this.drawObjectToCanvas(objectData);
        
        // 自动切换到目标设置模式
        this.currentObjectForTarget = objectData;
        this.autoSwitchToTargetMode();
        
        console.log('Object placed successfully (unified):', objectData);
        this.dispatchEvent('objectPlaced', objectData);
    }
    
    /**
     * 统一的目标设置方法
     */
    setTargetPositionUnified(point) {
        if (!this.currentObjectForTarget) {
            const nearestObject = this.findNearestObjectUnified(point);
            if (!nearestObject) {
                this.showMessage('No object found. Please place an object first.');
                return;
            }
            this.currentObjectForTarget = nearestObject;
        }
        
        // 设置目标位置
        this.currentObjectForTarget.targetPosition = { x: point.x, y: point.y };
        this.currentObjectForTarget.state = 'targeted';
        
        // 重新绘制画布
        this.redrawCanvas();
        
        this.updateObjectInfo();
        console.log('Target position set (unified) for:', this.currentObjectForTarget.id);
        
        // 自动切换回放置模式
        this.autoSwitchToPlaceMode();
        
        // 重置状态
        this.currentObjectForTarget = null;
        
        this.dispatchEvent('targetSet', this.currentObjectForTarget);
    }
    
    /**
     * 统一的删除物品方法
     */
    deleteObjectAtUnified(point) {
        console.log('deleteObjectAtUnified called with point:', point);
        const nearestObject = this.findNearestObjectUnified(point);
        if (nearestObject) {
            console.log('Found nearest object for deletion:', nearestObject);
            this.deleteObjectUnified(nearestObject.id);
        } else {
            console.log('No object found near click point for deletion');
        }
    }
    
    /**
     * 绘制物品到画布
     */
    drawObjectToCanvas(objectData) {
        const ctx = this.canvasElement.getContext('2d');
        const point = objectData.position;
        
        // 根据状态设置颜色
        let fillColor, strokeColor;
        switch (objectData.state) {
            case 'placed':
                fillColor = '#3182ce';
                strokeColor = '#2c5282';
                break;
            case 'targeted':
                fillColor = '#38a169';
                strokeColor = '#2f855a';
                break;
            case 'completed':
                fillColor = '#9f7aea';
                strokeColor = '#805ad5';
                break;
            default:
                fillColor = '#3182ce';
                strokeColor = '#2c5282';
        }
        
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        // 根据类型绘制不同形状
        switch (objectData.type) {
            case 'cube':
                ctx.fillRect(point.x - 15, point.y - 15, 30, 30);
                ctx.strokeRect(point.x - 15, point.y - 15, 30, 30);
                break;
            case 'sphere':
                ctx.beginPath();
                ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'cylinder':
                ctx.beginPath();
                ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'box':
                ctx.fillRect(point.x - 20, point.y - 10, 40, 20);
                ctx.strokeRect(point.x - 20, point.y - 10, 40, 20);
                break;
        }
        
        // 绘制标签
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(objectData.type.toUpperCase(), point.x, point.y - 25);
        
        // 如果有目标位置，绘制目标和连接线
        if (objectData.targetPosition) {
            this.drawTargetAndConnection(objectData);
        }
    }
    
    /**
     * 绘制目标标记和连接线
     */
    drawTargetAndConnection(objectData) {
        const ctx = this.canvasElement.getContext('2d');
        const target = objectData.targetPosition;
        
        // 绘制连接线
        ctx.strokeStyle = '#9f7aea';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(objectData.position.x, objectData.position.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制目标标记
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 绘制十字标记
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(target.x - 6, target.y);
        ctx.lineTo(target.x + 6, target.y);
        ctx.moveTo(target.x, target.y - 6);
        ctx.lineTo(target.x, target.y + 6);
        ctx.stroke();
    }
    
    /**
     * 重新绘制整个画布
     */
    redrawCanvas() {
        // 重绘基础网格
        this.drawBasicGrid();
        
        // 重绘所有物品
        this.objects.forEach(obj => {
            this.drawObjectToCanvas(obj);
        });
    }
    
    /**
     * 寻找最近的物品（统一版本）
     */
    findNearestObjectUnified(point) {
        let nearest = null;
        let minDistance = Infinity;

        console.log('Finding nearest object to point:', point);
        console.log('Available objects:', this.objects.length);

        if (this.objects.length === 0) {
            console.log('No objects available for selection');
            return null;
        }

        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) +
                Math.pow(obj.position.y - point.y, 2)
            );

            console.log('Object at:', obj.position, 'Distance:', distance);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });

        console.log('Min distance found:', minDistance, 'Threshold: 30');
        const result = minDistance < 30 ? nearest : null;
        console.log('Returning nearest object:', result);

        return result;
    }
    
    /**
     * 删除物品（统一版本）
     */
    deleteObjectUnified(objectId) {
        console.log('deleteObjectUnified called for objectId:', objectId);
        const index = this.objects.findIndex(obj => obj.id === objectId);
        console.log('Object index found:', index);
        
        if (index !== -1) {
            const deletedObject = this.objects[index];
            console.log('Deleting object:', deletedObject);
            
            this.objects.splice(index, 1);
            this.redrawCanvas();
            this.updateObjectInfo();
            console.log('Object deleted (unified):', objectId);
            this.dispatchEvent('objectDeleted', { id: objectId });
        } else {
            console.log('Object not found in objects array:', objectId);
        }
    }
    
    /**
     * 更新光标样式（统一版本）
     */
    updateCursorUnified(point) {
        if (!this.isPointInWorkAreaUnified(point)) {
            this.canvasElement.style.cursor = 'not-allowed';
            return;
        }
        
        switch (this.currentTool) {
            case 'place-object':
                this.canvasElement.style.cursor = 'copy';
                break;
            case 'set-target':
                this.canvasElement.style.cursor = 'crosshair';
                break;
            case 'delete-object':
                this.canvasElement.style.cursor = 'pointer';
                break;
            default:
                this.canvasElement.style.cursor = 'default';
        }
    }
    
    /**
     * 绑定基础事件（备用方案）
     */
    bindBasicEvents() {
        this.canvasElement.addEventListener('click', (e) => {
            const rect = this.canvasElement.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            console.log('Fallback click at:', point, 'tool:', this.currentTool);
            
            // 简单的边界检查
            const margin = 20;
            if (point.x > margin && point.x < rect.width - margin && 
                point.y > margin && point.y < rect.height - margin) {
                
                switch (this.currentTool) {
                    case 'place-object':
                        this.placeObjectFallback(point);
                        break;
                    case 'set-target':
                        this.setTargetPositionFallback(point);
                        break;
                    case 'delete-object':
                        this.deleteObjectAtFallback(point);
                        break;
                }
            }
        });
    }
    
    /**
     * 备用放置物品方法
     */
    placeObjectFallback(point) {
        console.log('Placing object (fallback) at:', point);
        console.log('Selected object type:', this.selectedObjectType);
        console.log('Current objects count before placement:', this.objects.length);

        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false
        };

        this.objects.push(objectData);
        this.updateObjectInfo();

        console.log('Object placed (fallback):', objectData);
        console.log('Current objects count after placement:', this.objects.length);
        this.dispatchEvent('objectPlaced', objectData);

        // 重新绘制整个canvas以确保显示正确
        this.redrawCanvasFallback();
    }
    
    /**
     * 备用绘制物品方法
     */
    drawObjectFallback(objectData) {
        const ctx = this.canvasElement.getContext('2d');

        // 根据状态设置颜色
        let fillColor, strokeColor;
        if (objectData.targetPosition) {
            fillColor = '#38a169'; // 已设置目标 - 绿色
            strokeColor = '#2f855a';
        } else {
            fillColor = '#3182ce'; // 默认 - 蓝色
            strokeColor = '#2c5282';
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

        // 根据类型绘制不同形状
        switch (objectData.type) {
            case 'cube':
                ctx.fillRect(objectData.position.x - 15, objectData.position.y - 15, 30, 30);
                ctx.strokeRect(objectData.position.x - 15, objectData.position.y - 15, 30, 30);
                break;
            case 'sphere':
                ctx.beginPath();
                ctx.arc(objectData.position.x, objectData.position.y, 15, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'cylinder':
                ctx.beginPath();
                ctx.arc(objectData.position.x, objectData.position.y, 12, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'box':
                ctx.fillRect(objectData.position.x - 20, objectData.position.y - 10, 40, 20);
                ctx.strokeRect(objectData.position.x - 20, objectData.position.y - 10, 40, 20);
                break;
            default:
                ctx.fillRect(objectData.position.x - 15, objectData.position.y - 15, 30, 30);
                ctx.strokeRect(objectData.position.x - 15, objectData.position.y - 15, 30, 30);
        }

        // 绘制标签
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(objectData.type.toUpperCase(), objectData.position.x, objectData.position.y - 20);

        // 如果有目标位置，绘制目标标记和连接线
        if (objectData.targetPosition) {
            // 绘制连接线
            ctx.strokeStyle = '#9f7aea';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(objectData.position.x, objectData.position.y);
            ctx.lineTo(objectData.targetPosition.x, objectData.targetPosition.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // 绘制目标标记
            ctx.strokeStyle = '#e53e3e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(objectData.targetPosition.x, objectData.targetPosition.y, 8, 0, 2 * Math.PI);
            ctx.stroke();

            // 绘制十字标记
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(objectData.targetPosition.x - 6, objectData.targetPosition.y);
            ctx.lineTo(objectData.targetPosition.x + 6, objectData.targetPosition.y);
            ctx.moveTo(objectData.targetPosition.x, objectData.targetPosition.y - 6);
            ctx.lineTo(objectData.targetPosition.x, objectData.targetPosition.y + 6);
            ctx.stroke();
        }
    }

    /**
     * 备用重新绘制canvas方法
     */
    redrawCanvasFallback() {
        // 重绘基础网格
        this.drawBasicGrid();

        // 重绘所有物品
        this.objects.forEach(obj => {
            this.drawObjectFallback(obj);
        });
    }
    
    /**
     * 备用设置目标位置方法
     */
    setTargetPositionFallback(point) {
        // 找到最近的物品
        let nearest = null;
        let minDistance = Infinity;

        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) +
                Math.pow(obj.position.y - point.y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });

        if (minDistance < 50 && nearest) {
            // 为找到的物品设置目标位置
            nearest.targetPosition = { x: point.x, y: point.y };

            console.log('Target set (fallback) for:', nearest.id);
            this.updateObjectInfo();
            this.dispatchEvent('targetSet', nearest);

            // 重新绘制整个canvas以显示目标标记和连接线
            this.redrawCanvasFallback();
        } else {
            console.log('No object found near point (fallback):', point);
        }
    }
    
    /**
     * 备用删除物品方法
     */
    deleteObjectAtFallback(point) {
        console.log('deleteObjectAtFallback called with point:', point);
        console.log('Current objects count:', this.objects.length);
        console.log('Current objects:', this.objects);

        if (this.objects.length === 0) {
            console.log('No objects to delete');
            return;
        }

        // 找到最近的物品
        let nearest = null;
        let minDistance = Infinity;

        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) +
                Math.pow(obj.position.y - point.y, 2)
            );

            console.log('Object at:', obj.position, 'Distance:', distance);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });

        console.log('Min distance found:', minDistance, 'Threshold: 30');

        // 减小阈值距离，使删除更精确
        if (minDistance < 30 && nearest) {
            console.log('Deleting object:', nearest.id);
            // 从数组中移除物品
            const index = this.objects.findIndex(obj => obj.id === nearest.id);
            if (index !== -1) {
                this.objects.splice(index, 1);
                this.updateObjectInfo();

                // 重新绘制canvas（备用系统）
                this.redrawCanvasFallback();

                console.log('Object deleted (fallback):', nearest.id);
                this.dispatchEvent('objectDeleted', { id: nearest.id });
            } else {
                console.log('Object not found in array for deletion');
            }
        } else {
            console.log('No object found near point (fallback):', point, 'Nearest distance:', minDistance);
        }
    }
    
    /**
     * 绘制工作区域 - 与DrawingCanvas保持一致（无边界线）
     */
    drawWorkAreaBoundary() {
        const bounds = this.paperScope.view.bounds;
        
        // 不再绘制边界线，与DrawingCanvas保持一致
        // 直接绘制全画布网格
        this.drawGrid();
        
        // 设置工作区域为整个画布（用于点击检测）
        this.workAreaBounds = {
            bounds: bounds
        };
    }
    
    /**
     * 绘制网格 - 与DrawingCanvas完全一致
     */
    drawGrid(workArea) {
        const gridSize = 20;          // 与DrawingCanvas相同的网格间距
        const gridColor = '#f1f5f9';  // 与DrawingCanvas相同的网格颜色
        const bounds = this.paperScope.view.bounds;
        
        // 创建网格组
        const gridGroup = new this.paperScope.Group();
        gridGroup.name = 'grid';
        
        // 垂直线 - 覆盖整个画布
        for (let x = 0; x <= bounds.width; x += gridSize) {
            const line = new this.paperScope.Path.Line(
                new this.paperScope.Point(x, 0),
                new this.paperScope.Point(x, bounds.height)
            );
            line.strokeColor = gridColor;
            line.strokeWidth = 0.5;  // 与DrawingCanvas相同的线宽
            gridGroup.addChild(line);
        }

        // 水平线 - 覆盖整个画布
        for (let y = 0; y <= bounds.height; y += gridSize) {
            const line = new this.paperScope.Path.Line(
                new this.paperScope.Point(0, y),
                new this.paperScope.Point(bounds.width, y)
            );
            line.strokeColor = gridColor;
            line.strokeWidth = 0.5;  // 与DrawingCanvas相同的线宽
            gridGroup.addChild(line);
        }
        
        // 将网格发送到最底层
        gridGroup.sendToBack();
    }
    
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 为了避免与DrawingCanvas的Paper.js scope冲突，
        // WorkspaceCanvas统一使用自定义事件系统
        console.log('WorkspaceCanvas: Using unified event system to avoid Paper.js conflicts');
        this.bindUnifiedEvents();
    }
    
    /**
     * 处理鼠标按下事件 - Paper.js版本
     */
    handleMouseDown(event) {
        const point = event.point;
        console.log('Mouse down at point (Paper.js):', point, 'current tool:', this.currentTool);
        
        // 检查是否在工作区域内
        const inWorkArea = this.isPointInWorkArea(point);
        console.log('Point in work area:', inWorkArea);
        
        if (!inWorkArea) {
            console.log('Click outside work area, ignoring');
            return;
        }
        
        console.log('Processing click with tool:', this.currentTool);
        
        switch (this.currentTool) {
            case 'place-object':
                this.placeObject(point);
                break;
            case 'set-target':
                this.setTargetPosition(point);
                break;
            case 'delete-object':
                this.deleteObjectAt(point);
                break;
            default:
                console.log('Unknown tool:', this.currentTool);
        }
    }
    
    /**
     * 处理鼠标移动事件 - Paper.js版本
     */
    handleMouseMove(event) {
        // 更新光标样式
        this.updateCursor(event.point);
    }
    
    /**
     * 检查点是否在工作区域内 - 与DrawingCanvas一致（整个画布都可用）
     */
    isPointInWorkArea(point) {
        if (!this.workAreaBounds) {
            console.log('Work area bounds not initialized');
            return false;
        }
        const result = this.workAreaBounds.bounds.contains(point);
        console.log('Point:', point, 'Work area bounds:', this.workAreaBounds.bounds, 'Contains:', result);
        return result;
    }
    
    /**
     * 放置物品
     */
    placeObject(point) {
        console.log('Placing object at point:', point, 'type:', this.selectedObjectType);
        
        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false,
            state: 'placed' // 新状态：placed, targeted, completed
        };
        
        const visualObject = this.createVisualObject(objectData);
        objectData.visual = visualObject;
        
        this.objects.push(objectData);
        this.updateObjectInfo();
        
        console.log('Object placed successfully:', objectData);
        
        // 自动切换到目标设置模式
        this.currentObjectForTarget = objectData;
        this.autoSwitchToTargetMode();
        
        // 触发事件
        this.dispatchEvent('objectPlaced', objectData);
    }
    
    /**
     * 自动切换到目标设置模式
     */
    autoSwitchToTargetMode() {
        // 切换工具到目标设置
        this.currentTool = 'set-target';
        
        // 通知主应用更新工具按钮状态
        this.dispatchEvent('toolChanged', { tool: 'set-target' });
        
        // 更新光标提示
        this.showMessage('Click to set target position for the placed object');
        
        console.log('Auto-switched to target setting mode');
    }
    
    /**
     * 创建可视化物品
     */
    createVisualObject(objectData) {
        const point = new this.paperScope.Point(objectData.position.x, objectData.position.y);
        let shape;
        
        switch (objectData.type) {
            case 'cube':
                shape = new this.paperScope.Path.Rectangle(point.subtract(15), new this.paperScope.Size(30, 30));
                break;
            case 'sphere':
                shape = new this.paperScope.Path.Circle(point, 15);
                break;
            case 'cylinder':
                shape = new this.paperScope.Path.Circle(point, 12);
                break;
            case 'box':
                shape = new this.paperScope.Path.Rectangle(point.subtract([20, 10]), new this.paperScope.Size(40, 20));
                break;
            default:
                shape = new this.paperScope.Path.Rectangle(point.subtract(15), new this.paperScope.Size(30, 30));
        }
        
        // 设置样式
        shape.fillColor = '#3182ce';
        shape.strokeColor = '#2c5282';
        shape.strokeWidth = 2;
        
        // 添加标签
        const label = new this.paperScope.PointText(point.add([0, -25]));
        label.content = objectData.type.toUpperCase();
        label.fontSize = 10;
        label.fillColor = '#4a5568';
        label.justification = 'center';
        
        // 创建组
        const group = new this.paperScope.Group([shape, label]);
        group.data = { objectId: objectData.id, type: 'object' };
        
        return group;
    }
    
    /**
     * 更新物品视觉状态
     */
    updateObjectVisualState(objectData) {
        if (!objectData.visual) return;
        
        const shape = objectData.visual.children[0]; // 获取形状元素
        const label = objectData.visual.children[1]; // 获取标签元素
        
        switch (objectData.state) {
            case 'placed':
                // 刚放置的状态 - 蓝色
                shape.fillColor = '#3182ce';
                shape.strokeColor = '#2c5282';
                shape.strokeWidth = 2;
                if (label) label.fillColor = '#4a5568';
                break;
                
            case 'targeted':
                // 已设置目标的状态 - 绿色
                shape.fillColor = '#38a169';
                shape.strokeColor = '#2f855a';
                shape.strokeWidth = 3;
                if (label) label.fillColor = '#2d3748';
                
                // 添加轻微的阴影效果
                shape.shadowColor = 'rgba(56, 161, 105, 0.3)';
                shape.shadowBlur = 5;
                shape.shadowOffset = new this.paperScope.Point(2, 2);
                break;
                
            case 'completed':
                // 已完成的状态 - 紫色
                shape.fillColor = '#9f7aea';
                shape.strokeColor = '#805ad5';
                shape.strokeWidth = 2;
                if (label) label.fillColor = '#553c9a';
                break;
        }
        
        // 重绘视图
        this.paperScope.view.draw();
    }
    
    /**
     * 设置目标位置
     */
    setTargetPosition(point) {
        // 如果没有选中的物品，选择最近的物品
        if (!this.currentObjectForTarget) {
            const nearestObject = this.findNearestObject(point);
            if (!nearestObject) {
                this.showMessage('No object found. Please place an object first.');
                return;
            }
            this.currentObjectForTarget = nearestObject;
        }
        
        // 设置目标位置
        this.currentObjectForTarget.targetPosition = { x: point.x, y: point.y };
        this.currentObjectForTarget.state = 'targeted';
        
        // 更新物品视觉状态
        this.updateObjectVisualState(this.currentObjectForTarget);
        
        // 创建目标位置标记
        this.createTargetMarker(point, this.currentObjectForTarget);
        
        // 绘制连接线
        this.drawConnectionLine(this.currentObjectForTarget);
        
        this.updateObjectInfo();
        console.log('Target position set for object:', this.currentObjectForTarget.id);
        
        // 自动切换回放置模式
        this.autoSwitchToPlaceMode();
        
        // 重置状态
        this.currentObjectForTarget = null;
        
        // 触发事件
        this.dispatchEvent('targetSet', this.currentObjectForTarget);
    }
    
    /**
     * 自动切换回放置模式
     */
    autoSwitchToPlaceMode() {
        // 切换工具回到放置物品
        this.currentTool = 'place-object';
        
        // 通知主应用更新工具按钮状态
        this.dispatchEvent('toolChanged', { tool: 'place-object' });
        
        // 更新光标提示
        this.showMessage('Target set! Click to place another object or start simulation');
        
        console.log('Auto-switched back to placement mode');
    }
    
    /**
     * 创建目标位置标记
     */
    createTargetMarker(point, objectData) {
        // 移除旧的目标标记
        if (objectData.targetMarker) {
            objectData.targetMarker.remove();
        }
        
        // 创建目标标记
        const target = new this.paperScope.Path.Circle(point, 8);
        target.strokeColor = '#e53e3e';
        target.strokeWidth = 3;
        target.fillColor = null;
        
        // 添加十字标记
        const cross1 = new this.paperScope.Path.Line(
            point.add([-6, 0]),
            point.add([6, 0])
        );
        const cross2 = new this.paperScope.Path.Line(
            point.add([0, -6]),
            point.add([0, 6])
        );
        cross1.strokeColor = cross2.strokeColor = '#e53e3e';
        cross1.strokeWidth = cross2.strokeWidth = 2;
        
        const targetGroup = new this.paperScope.Group([target, cross1, cross2]);
        targetGroup.data = { objectId: objectData.id, type: 'target' };
        
        objectData.targetMarker = targetGroup;
    }
    
    /**
     * 绘制连接线
     */
    drawConnectionLine(objectData) {
        if (objectData.connectionLine) {
            objectData.connectionLine.remove();
        }
        
        if (objectData.targetPosition) {
            const startPoint = new this.paperScope.Point(objectData.position.x, objectData.position.y);
            const endPoint = new this.paperScope.Point(objectData.targetPosition.x, objectData.targetPosition.y);
            
            const line = new this.paperScope.Path.Line(startPoint, endPoint);
            line.strokeColor = '#9f7aea';
            line.strokeWidth = 2;
            line.dashArray = [3, 3];
            
            objectData.connectionLine = line;
        }
    }
    
    /**
     * 删除指定位置的物品
     */
    deleteObjectAt(point) {
        console.log('deleteObjectAt (Paper.js) called with point:', point);
        
        const hitResult = this.paperScope.project.hitTest(point, {
            fill: true,
            stroke: true,
            segments: true,
            tolerance: 15 // 增加容忍度，使点击更容易命中
        });
        
        console.log('Hit test result:', hitResult);
        
        if (hitResult && hitResult.item.data && hitResult.item.data.objectId) {
            const objectId = hitResult.item.data.objectId;
            console.log('Found object to delete:', objectId);
            this.deleteObject(objectId);
        } else {
            console.log('No object found at point for deletion');
            // 备用方案：使用距离检测
            const nearestObject = this.findNearestObject(point);
            if (nearestObject) {
                console.log('Using fallback distance detection, deleting:', nearestObject.id);
                this.deleteObject(nearestObject.id);
            }
        }
    }
    
    /**
     * 删除物品
     */
    deleteObject(objectId) {
        const index = this.objects.findIndex(obj => obj.id === objectId);
        if (index !== -1) {
            const objectData = this.objects[index];
            
            // 移除可视化元素
            if (objectData.visual) objectData.visual.remove();
            if (objectData.targetMarker) objectData.targetMarker.remove();
            if (objectData.connectionLine) objectData.connectionLine.remove();
            
            // 从数组中移除
            this.objects.splice(index, 1);
            
            this.updateObjectInfo();
            console.log('Object deleted:', objectId);
            
            // 触发事件
            this.dispatchEvent('objectDeleted', { id: objectId });
        }
    }
    
    /**
     * 找到最近的物品
     */
    findNearestObject(point) {
        let nearest = null;
        let minDistance = Infinity;
        
        console.log('Finding nearest object (Paper.js) to point:', point);
        console.log('Available objects:', this.objects.length);
        
        if (this.objects.length === 0) {
            console.log('No objects available for selection (Paper.js)');
            return null;
        }
        
        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) + 
                Math.pow(obj.position.y - point.y, 2)
            );
            
            console.log('Object at:', obj.position, 'Distance:', distance);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });
        
        console.log('Min distance found (Paper.js):', minDistance, 'Threshold: 30');
        const result = minDistance < 30 ? nearest : null;
        console.log('Returning nearest object (Paper.js):', result);
        
        return result;
    }
    
    /**
     * 更新光标样式
     */
    updateCursor(point) {
        if (!this.isPointInWorkArea(point)) {
            this.canvasElement.style.cursor = 'not-allowed';
            return;
        }
        
        switch (this.currentTool) {
            case 'place-object':
                this.canvasElement.style.cursor = 'copy';
                break;
            case 'set-target':
                this.canvasElement.style.cursor = 'crosshair';
                break;
            case 'delete-object':
                this.canvasElement.style.cursor = 'pointer';
                break;
            default:
                this.canvasElement.style.cursor = 'default';
        }
    }
    
    /**
     * 设置工具
     */
    setTool(toolName) {
        console.log('WorkspaceCanvas.setTool called with:', toolName);
        console.log('Previous tool was:', this.currentTool);
        this.currentTool = toolName;
        console.log('WorkspaceCanvas tool changed to:', toolName);
        console.log('Current tool is now:', this.currentTool);

        // 更新工具显示
        this.updateToolDisplay();
    }
    
    /**
     * 设置选中的物品类型
     */
    setSelectedObjectType(objectType) {
        console.log('WorkspaceCanvas.setSelectedObjectType called with:', objectType);
        console.log('Previous selectedObjectType was:', this.selectedObjectType);
        this.selectedObjectType = objectType;
        console.log('New selectedObjectType is:', this.selectedObjectType);
    }
    
    /**
     * 获取所有物品数据
     */
    getAllObjects() {
        return this.objects.map(obj => ({
            id: obj.id,
            type: obj.type,
            position: obj.position,
            targetPosition: obj.targetPosition
        }));
    }
    
    /**
     * 清除所有物品
     */
    clearAll() {
        console.log('WorkspaceCanvas.clearAll called');
        console.log('Current state - isPaperInitialized:', this.isPaperInitialized, 'useFallback:', this.useFallback, 'paperScope:', !!this.paperScope);

        // 清除对象数组（无论什么模式都要做）
        this.objects = [];
        this.currentObjectForTarget = null;

        // 总是确保画布有正确的显示
        this.ensureCanvasDisplay();

        // 更新信息显示
        this.updateObjectInfo();

        console.log('All objects cleared');
        this.dispatchEvent('allObjectsCleared');
    }

    /**
     * 确保画布正确显示
     */
    ensureCanvasDisplay() {
        try {
            // 首先始终清空一次 2D 画布，避免之前用统一事件系统（直接在2D上下文绘制）留下的残影
            this.clearCanvas2D();

            // 优先尝试Paper.js方法
            if (this.paperScope && this.isPaperInitialized && !this.useFallback) {
                console.log('Ensuring Paper.js canvas display');

                // 清除所有Paper.js对象
                this.objects.forEach(obj => {
                    try {
                        if (obj.visual) obj.visual.remove();
                        if (obj.targetMarker) obj.targetMarker.remove();
                        if (obj.connectionLine) obj.connectionLine.remove();
                    } catch (e) {
                        console.warn('Error removing Paper.js object:', e);
                    }
                });

                // 完全清除并重绘Paper.js画布
                this.paperScope.project.clear();
                this.drawWorkAreaBoundary();

                // 确保Paper.js视图被更新
                this.paperScope.view.draw();

                console.log('Paper.js canvas display ensured');
            } else {
                console.log('Ensuring fallback canvas display');
                // 使用备用系统：清除画布并重绘网格
                this.drawBasicGrid();
            }
        } catch (error) {
            console.error('Error ensuring canvas display, falling back to basic grid:', error);
            // 如果出现任何错误，强制使用备用方法
            this.useFallback = true;
            try {
                this.drawBasicGrid();
            } catch (fallbackError) {
                console.error('Even fallback failed:', fallbackError);
            }
        }
    }

    /**
     * 清空 2D 画布像素（与DPR兼容）
     */
    clearCanvas2D() {
        const ctx = this.canvasElement && this.canvasElement.getContext ? this.canvasElement.getContext('2d') : null;
        if (!ctx) return;

        // 使用逻辑尺寸清空；由于在初始化时已设置过 setTransform(dpr,...)，
        // 这里使用逻辑尺寸即可正确覆盖到物理像素。
        const width = this.canvasWidth || this.canvasElement.clientWidth || (this.canvasElement.width / (this.dpr || window.devicePixelRatio || 1));
        const height = this.canvasHeight || this.canvasElement.clientHeight || (this.canvasElement.height / (this.dpr || window.devicePixelRatio || 1));
        try {
            ctx.clearRect(0, 0, width, height);
        } catch (e) {
            // 兜底：直接按物理像素清空
            ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
    }
    
    /**
     * 更新物品信息显示
     */
    updateObjectInfo() {
        const objectCountElement = document.getElementById('objectCount');
        const robotStatusElement = document.getElementById('robotStatus');

        if (objectCountElement) {
            objectCountElement.textContent = this.objects.length;
        }

        if (robotStatusElement) {
            const readyObjects = this.objects.filter(obj => obj.targetPosition).length;
            const status = this.objects.length === 0 ? 'No objects' :
                          readyObjects === 0 ? 'Objects placed' :
                          readyObjects === this.objects.length ? 'Ready to simulate' :
                          'Setting targets';
            robotStatusElement.textContent = status;
        }

        // 更新工具显示
        this.updateToolDisplay();
    }

    /**
     * 更新工具显示
     */
    updateToolDisplay() {
        const toolDisplayElement = document.getElementById('currentToolDisplay');
        if (toolDisplayElement) {
            toolDisplayElement.textContent = this.currentTool || 'none';
        }
    }
    
    /**
     * 调整画布大小
     */
    resize() {
        if (this.paperScope && this.paperScope.view) {
            // 简化版本：直接使用容器的客户端尺寸（与 DrawingCanvas 一致）
            const width = this.canvasElement.clientWidth;
            const height = this.canvasElement.clientHeight;
            
            // 同步CSS逻辑尺寸，供命中测试与坐标换算使用
            this.canvasWidth = width;
            this.canvasHeight = height;
            
            // 更新Paper.js视图尺寸（使用CSS逻辑尺寸）
            this.paperScope.view.viewSize = new this.paperScope.Size(width, height);
            
            // 重新绘制边界和所有物品
            this.paperScope.project.clear();
            this.drawWorkAreaBoundary();
            
            this.objects.forEach(obj => {
                if (obj.visual) obj.visual.remove();
                if (obj.targetMarker) obj.targetMarker.remove();
                if (obj.connectionLine) obj.connectionLine.remove();
                
                obj.visual = this.createVisualObject(obj);
                if (obj.targetPosition) {
                    this.createTargetMarker(new this.paperScope.Point(obj.targetPosition.x, obj.targetPosition.y), obj);
                    this.drawConnectionLine(obj);
                }
            });

            this.paperScope.view.draw();
        }
    }
    
    /**
     * 生成物品ID
     */
    generateObjectId() {
        return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 显示消息
     */
    showMessage(message) {
        console.log('WorkspaceCanvas message:', message);
        // 这里可以添加UI提示逻辑
    }
    
    /**
     * 分发事件
     */
    dispatchEvent(eventType, data) {
        const event = new CustomEvent('workspaceCanvas:' + eventType, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        if (this.paperScope) {
            this.paperScope.project.clear();
        }
    }
}
