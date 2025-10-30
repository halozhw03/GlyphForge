/**
 * DrawingCanvas - 使用Paper.js实现的绘图画布
 */
class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        Debug.log('DrawingCanvas constructor - canvas element:', this.canvas);
        
        if (!this.canvas) {
            throw new Error(`Canvas element with ID "${canvasId}" not found`);
        }
        
        this.pathProcessor = new PathProcessor();
        this.shapeLibrary = new ShapeLibrary();
        
        // 初始化Paper.js
        paper.setup(this.canvas);
        Debug.log('Paper.js setup completed');
        
        // 工具状态
        this.currentTool = 'freehand';
        this.currentShape = 'circle'; // 当前选中的形状
        this.isDrawing = false;
        this.paths = [];
        this.selectedPath = null;
        this.controlPoints = [];
        
        // 当前绘制状态
        this.currentPath = null;
        this.currentPoints = [];
        this.tempPoints = []; // 用于多段线工具
        
        // 编辑状态
        this.isDragging = false;
        this.dragTarget = null;
        
        // 样式设置
        this.strokeColor = '#2563eb';
        this.strokeWidth = 2;
        this.controlPointColor = '#dc2626';
        this.controlPointSize = 6;
        
        // 动态绘画模式参数
        this.dynamicPoints = [];
        this.lastPoint = null;
        this.lastTime = 0;
        this.velocityHistory = [];
        
        // 监听 bed 长宽比事件，动态调整容器比例
        window.addEventListener('bedAspectRatioCalculated', (e) => {
            const bedAspectRatio = e.detail.aspectRatio;
            Debug.log('DrawingCanvas: Bed aspect ratio received:', bedAspectRatio);
            
            // 设置容器的 aspect-ratio
            const container = this.canvas.parentElement;
            if (container && bedAspectRatio) {
                container.style.aspectRatio = `${bedAspectRatio}`;
                Debug.log('DrawingCanvas container aspect ratio set to:', bedAspectRatio);
            }
            
            // 重新调整canvas大小
            setTimeout(() => {
                this.resize();
            }, 100);
        });
        
        // 绑定事件
        this.bindEvents();
        
        // 绘制网格
        this.drawGrid();
        
        // 延迟调整画布大小，确保容器已经正确渲染
        setTimeout(() => {
            this.resize();
            Debug.log('Canvas resized. New size:', this.canvas.width, 'x', this.canvas.height);
        }, 100);
    }

    /**
     * 绘制背景网格
     */
    drawGrid() {
        const gridSize = 20;
        const bounds = paper.view.bounds;
        
        const gridGroup = new paper.Group();
        gridGroup.name = 'grid';
        
        // 垂直线
        for (let x = 0; x <= bounds.width; x += gridSize) {
            const line = new paper.Path.Line(
                new paper.Point(x, 0),
                new paper.Point(x, bounds.height)
            );
            line.strokeColor = '#f1f5f9';
            line.strokeWidth = 0.5;
            gridGroup.addChild(line);
        }
        
        // 水平线
        for (let y = 0; y <= bounds.height; y += gridSize) {
            const line = new paper.Path.Line(
                new paper.Point(0, y),
                new paper.Point(bounds.width, y)
            );
            line.strokeColor = '#f1f5f9';
            line.strokeWidth = 0.5;
            gridGroup.addChild(line);
        }
        
        gridGroup.sendToBack();
    }

    /**
     * 绑定鼠标和触摸事件
     */
    bindEvents() {
        const tool = new paper.Tool();
        
        tool.onMouseDown = (event) => this.handleMouseDown(event);
        tool.onMouseDrag = (event) => this.handleMouseDrag(event);
        tool.onMouseUp = (event) => this.handleMouseUp(event);
        tool.onMouseMove = (event) => this.handleMouseMove(event);
        
        // 键盘事件
        tool.onKeyDown = (event) => this.handleKeyDown(event);
    }

    /**
     * 鼠标按下事件
     */
    handleMouseDown(event) {
        Debug.log('Mouse down event:', event.point, 'Current tool:', this.currentTool);
        
        // 首先检查是否点击了控制点（支持拖拽编辑）
        const hitResult = paper.project.hitTest(event.point, {
            segments: true,
            stroke: true,
            tolerance: 10
        });
        
        // 检查是否点击了控制点
        if (hitResult && hitResult.item && hitResult.item.name === 'controlPoint') {
            this.isDragging = true;
            this.dragTarget = hitResult.item;
            return;
        }
        
        // 检查当前工具，如果是删除工具，直接处理删除
        if (this.currentTool === 'delete') {
            this.handleDeleteToolClick(event.point);
            return;
        }
        
        // 检查是否点击了已存在的用户绘制路径（用于选择和显示控制点）
        // 排除网格、控制点、预览元素等
        if (hitResult && hitResult.item && this.isUserDrawnPath(hitResult.item)) {
            this.selectPath(hitResult.item);
            return;
        }
        
        // 如果没有点击到路径或控制点，清除选择并处理绘制工具
        this.clearSelection();
        
        switch (this.currentTool) {
            case 'freehand':
                this.startFreehandDrawing(event.point);
                break;
            case 'line':
                this.handleLineToolClick(event.point);
                break;
            case 'bezier':
                this.handleBezierToolClick(event.point);
                break;
            case 'shape':
                this.handleShapeToolClick(event.point);
                break;
            case 'dynamic':
                this.startDynamicDrawing(event.point);
                break;
        }
    }

    /**
     * 鼠标拖拽事件
     */
    handleMouseDrag(event) {
        if (this.currentTool === 'freehand' && this.isDrawing) {
            this.continueFreehandDrawing(event.point);
        } else if (this.currentTool === 'dynamic' && this.isDrawing) {
            this.continueDynamicDrawing(event.point);
        } else if (this.isDragging && this.dragTarget) {
            this.handleControlPointDrag(event.point);
        }
    }

    /**
     * 鼠标释放事件
     */
    handleMouseUp(event) {
        if (this.currentTool === 'freehand' && this.isDrawing) {
            this.finishFreehandDrawing();
        } else if (this.currentTool === 'dynamic' && this.isDrawing) {
            this.finishDynamicDrawing();
        } else if (this.isDragging) {
            this.finishControlPointDrag();
        }
    }

    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
        if (this.currentTool === 'line' && this.tempPoints.length > 0) {
            this.updateLinePreview(event.point);
        } else if (this.currentTool === 'bezier' && this.tempPoints.length > 0) {
            this.updateBezierPreview(event.point);
        }
    }

    /**
     * 键盘事件
     */
    handleKeyDown(event) {
        if (event.key === 'escape') {
            this.cancelCurrentOperation();
        } else if (event.key === 'enter') {
            this.finishCurrentOperation();
        } else if (event.key === 'delete' || event.key === 'backspace') {
            this.deleteSelectedPath();
        }
    }

    /**
     * 检查点是否在有效绘制区域内
     */
    isPointInValidArea(point) {
        const bounds = paper.view.bounds;
        const margin = 20; // 20像素边界余量

        return point.x >= margin && point.x <= bounds.width - margin &&
               point.y >= margin && point.y <= bounds.height - margin;
    }

    /**
     * 显示边界调整通知
     */
    showBoundaryAdjustmentNotice() {
        // 创建通知元素
        const notice = document.createElement('div');
        notice.className = 'boundary-notice';
        notice.innerHTML = `
            <div class="boundary-notice-content">
                <i class="fas fa-info-circle"></i>
                <span>Path adjusted to safe boundary</span>
            </div>
        `;

        // 添加样式
        Object.assign(notice.style, {
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: '#fbbf24',
            color: '#92400e',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            zIndex: '10001',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f59e0b',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });

        // 添加到页面
        document.body.appendChild(notice);

        // 自动移除
        setTimeout(() => {
            notice.style.opacity = '0';
            notice.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 300);
        }, 2000);
    }

    /**
     * 开始自由手绘
     */
    startFreehandDrawing(point) {
        // 检查起始点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            Debug.warn('Drawing started outside valid area, adjusting to boundary');
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            // 显示边界调整通知
            this.showBoundaryAdjustmentNotice();
        }

        this.isDrawing = true;
        this.currentPoints = [{ x: point.x, y: point.y }];

        this.currentPath = new paper.Path();
        this.currentPath.strokeColor = this.strokeColor;
        this.currentPath.strokeWidth = this.strokeWidth;
        this.currentPath.strokeCap = 'round';
        this.currentPath.strokeJoin = 'round';
        this.currentPath.moveTo(point);
    }

    /**
     * 继续自由手绘
     */
    continueFreehandDrawing(point) {
        if (!this.isDrawing || !this.currentPath) return;

        // 检查点是否在有效区域内，如果不在则调整到边界
        if (!this.isPointInValidArea(point)) {
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            // 显示边界调整通知
            this.showBoundaryAdjustmentNotice();
        }

        this.currentPoints.push({ x: point.x, y: point.y });
        this.currentPath.lineTo(point);
        paper.view.draw();
    }

    /**
     * 完成自由手绘
     */
    finishFreehandDrawing() {
        if (!this.isDrawing || !this.currentPath) return;
        
        this.isDrawing = false;
        
        // 处理路径
        const isSmoothing = this.pathProcessor.smoothingFactor > 0;
        Debug.log('Smoothing factor:', this.pathProcessor.smoothingFactor, 'Is smoothing:', isSmoothing);
        
        const processedPoints = this.pathProcessor.processPath(this.currentPoints, {
            removeJitter: isSmoothing,
            simplify: isSmoothing,
            smooth: isSmoothing,
            tolerance: 3.0,
            smoothingFactor: this.pathProcessor.smoothingFactor
        });
        
        // 重新创建平滑后的路径
        this.currentPath.remove();
        const newPath = this.createPathFromPoints(processedPoints);
        
        // 自动选择新创建的路径并显示控制点
        if (newPath) {
            this.selectPath(newPath);
        }
        
        this.currentPath = null;
        this.currentPoints = [];
        this.updatePathInfo();
    }

    /**
     * 处理多段线工具点击
     */
    handleLineToolClick(point) {
        // 检查点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            // 显示边界调整通知
            this.showBoundaryAdjustmentNotice();
        }

        this.tempPoints.push({ x: point.x, y: point.y });

        if (this.tempPoints.length === 1) {
            // 第一个点，开始绘制
            this.currentPath = new paper.Path();
            this.currentPath.strokeColor = this.strokeColor;
            this.currentPath.strokeWidth = this.strokeWidth;
            this.currentPath.moveTo(point);

            // 创建预览线
            this.previewPath = new paper.Path();
            this.previewPath.strokeColor = this.strokeColor;
            this.previewPath.strokeWidth = 1;
            this.previewPath.dashArray = [5, 5];
            this.previewPath.opacity = 0.7;
        } else {
            // 添加新的线段
            this.currentPath.lineTo(point);
            this.previewPath.segments[0].point = point;
        }

        paper.view.draw();
    }

    /**
     * 更新多段线预览
     */
    updateLinePreview(point) {
        if (this.previewPath && this.tempPoints.length > 0) {
            this.previewPath.removeSegments();
            this.previewPath.moveTo(this.tempPoints[this.tempPoints.length - 1]);
            this.previewPath.lineTo(point);
            paper.view.draw();
        }
    }

    /**
     * 处理贝塞尔曲线工具点击
     */
    handleBezierToolClick(point) {
        // 检查点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            // 显示边界调整通知
            this.showBoundaryAdjustmentNotice();
        }

        this.tempPoints.push({ x: point.x, y: point.y });

        if (this.tempPoints.length === 1) {
            // 起始点 - 创建起始点标记
            this.createBezierPointMarker(point, 'start');

        } else if (this.tempPoints.length === 2) {
            // 终止点 - 创建终止点标记和连接线
            this.createBezierPointMarker(point, 'end');
            this.createBezierPreviewLine();

        } else if (this.tempPoints.length === 3) {
            // 第一个控制点 - 创建控制点标记和控制线
            this.createBezierPointMarker(point, 'control1');
            this.updateBezierControlLines();

        } else if (this.tempPoints.length === 4) {
            // 第二个控制点 - 完成贝塞尔曲线
            this.createBezierPointMarker(point, 'control2');
            this.updateBezierControlLines();
            this.createBezierCurve();
        }

        paper.view.draw();
    }

    /**
     * 创建贝塞尔点标记
     */
    createBezierPointMarker(point, type) {
        if (!this.bezierMarkers) {
            this.bezierMarkers = [];
        }
        
        let color, size;
        switch (type) {
            case 'start':
                color = '#10b981'; // 绿色
                size = 8;
                break;
            case 'end':
                color = '#ef4444'; // 红色
                size = 8;
                break;
            case 'control1':
            case 'control2':
                color = '#f59e0b'; // 橙色
                size = 6;
                break;
        }
        
        const marker = new paper.Path.Circle({
            center: new paper.Point(point.x, point.y),
            radius: size,
            fillColor: color,
            strokeColor: 'white',
            strokeWidth: 2
        });
        
        marker.name = 'bezierMarker';
        marker.data = { type: type };
        this.bezierMarkers.push(marker);
    }

    /**
     * 创建贝塞尔预览线
     */
    createBezierPreviewLine() {
        if (this.tempPoints.length >= 2) {
            const start = this.tempPoints[0];
            const end = this.tempPoints[1];
            
            this.bezierPreviewLine = new paper.Path.Line({
                from: new paper.Point(start.x, start.y),
                to: new paper.Point(end.x, end.y),
                strokeColor: '#94a3b8',
                strokeWidth: 1,
                dashArray: [5, 5]
            });
            
            this.bezierPreviewLine.name = 'bezierPreview';
        }
    }

    /**
     * 更新贝塞尔控制线
     */
    updateBezierControlLines() {
        // 清除现有的控制线
        if (this.bezierControlLines) {
            this.bezierControlLines.forEach(line => line.remove());
        }
        this.bezierControlLines = [];
        
        if (this.tempPoints.length >= 3) {
            const start = this.tempPoints[0];
            const control1 = this.tempPoints[2]; // 第一个控制点
            
            // 起始点到第一个控制点的线
            const line1 = new paper.Path.Line({
                from: new paper.Point(start.x, start.y),
                to: new paper.Point(control1.x, control1.y),
                strokeColor: '#94a3b8',
                strokeWidth: 1,
                dashArray: [3, 3]
            });
            line1.name = 'bezierControlLine';
            this.bezierControlLines.push(line1);
        }
        
        if (this.tempPoints.length >= 4) {
            const end = this.tempPoints[1];
            const control2 = this.tempPoints[3]; // 第二个控制点
            
            // 终止点到第二个控制点的线
            const line2 = new paper.Path.Line({
                from: new paper.Point(end.x, end.y),
                to: new paper.Point(control2.x, control2.y),
                strokeColor: '#94a3b8',
                strokeWidth: 1,
                dashArray: [3, 3]
            });
            line2.name = 'bezierControlLine';
            this.bezierControlLines.push(line2);
        }
    }

    /**
     * 更新贝塞尔预览
     */
    updateBezierPreview(point) {
        if (this.tempPoints.length === 1) {
            // 显示从起始点到鼠标位置的线
            if (!this.bezierMousePreview) {
                this.bezierMousePreview = new paper.Path();
                this.bezierMousePreview.strokeColor = '#94a3b8';
                this.bezierMousePreview.strokeWidth = 1;
                this.bezierMousePreview.dashArray = [5, 5];
                this.bezierMousePreview.name = 'bezierMousePreview';
            }
            
            this.bezierMousePreview.removeSegments();
            this.bezierMousePreview.moveTo(this.tempPoints[0]);
            this.bezierMousePreview.lineTo(point);
            
        } else if (this.tempPoints.length === 2) {
            // 显示控制点预览线
            if (!this.bezierMousePreview) {
                this.bezierMousePreview = new paper.Path();
                this.bezierMousePreview.strokeColor = '#94a3b8';
                this.bezierMousePreview.strokeWidth = 1;
                this.bezierMousePreview.dashArray = [3, 3];
                this.bezierMousePreview.name = 'bezierMousePreview';
            }
            
            this.bezierMousePreview.removeSegments();
            this.bezierMousePreview.moveTo(this.tempPoints[0]);
            this.bezierMousePreview.lineTo(point);
            
        } else if (this.tempPoints.length === 3) {
            // 显示第二个控制点预览线和贝塞尔曲线预览
            if (!this.bezierMousePreview) {
                this.bezierMousePreview = new paper.Path();
                this.bezierMousePreview.strokeColor = '#94a3b8';
                this.bezierMousePreview.strokeWidth = 1;
                this.bezierMousePreview.dashArray = [3, 3];
                this.bezierMousePreview.name = 'bezierMousePreview';
            }
            
            this.bezierMousePreview.removeSegments();
            this.bezierMousePreview.moveTo(this.tempPoints[1]);
            this.bezierMousePreview.lineTo(point);
            
            // 创建实时贝塞尔曲线预览
            if (!this.bezierCurvePreview) {
                this.bezierCurvePreview = new paper.Path();
                this.bezierCurvePreview.strokeColor = this.strokeColor;
                this.bezierCurvePreview.strokeWidth = 1;
                this.bezierCurvePreview.opacity = 0.7;
                this.bezierCurvePreview.name = 'bezierCurvePreview';
            }
            
            const [start, end, cp1] = this.tempPoints;
            const cp2 = point;
            
            this.bezierCurvePreview.removeSegments();
            this.bezierCurvePreview.moveTo(new paper.Point(start.x, start.y));
            this.bezierCurvePreview.cubicCurveTo(
                new paper.Point(cp1.x, cp1.y),
                new paper.Point(cp2.x, cp2.y),
                new paper.Point(end.x, end.y)
            );
        }
        
        paper.view.draw();
    }

    /**
     * 创建贝塞尔曲线
     */
    createBezierCurve() {
        if (this.tempPoints.length !== 4) return;
        
        const [start, end, cp1, cp2] = this.tempPoints;
        
        Debug.log('DrawingCanvas: Creating Bezier curve');
        Debug.log('Start:', start);
        Debug.log('End:', end);
        Debug.log('Control Point 1:', cp1);
        Debug.log('Control Point 2:', cp2);
        
        this.currentPath = new paper.Path();
        this.currentPath.strokeColor = this.strokeColor;
        this.currentPath.strokeWidth = this.strokeWidth;
        
        this.currentPath.moveTo(new paper.Point(start.x, start.y));
        this.currentPath.cubicCurveTo(
            new paper.Point(cp1.x, cp1.y),
            new paper.Point(cp2.x, cp2.y),
            new paper.Point(end.x, end.y)
        );
        
        Debug.log('DrawingCanvas: Bezier path created, length:', this.currentPath.length);
        Debug.log('DrawingCanvas: Bezier path segments:', this.currentPath.segments?.length);
        
        // 添加到路径列表
        const pathPoints = this.pathProcessor.paperPathToPoints(this.currentPath);
        this.addPathToCollection(this.currentPath, pathPoints);
        
        // 自动选择新创建的路径并显示控制点
        this.selectPath(this.currentPath);
        
        // 清理贝塞尔预览元素
        this.clearBezierPreview();
        
        // 清理
        this.tempPoints = [];
        this.currentPath = null;
        
        paper.view.draw();
        this.updatePathInfo();
    }

    /**
     * 处理形状工具点击
     */
    handleShapeToolClick(point) {
        // 检查点击点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            // 显示边界调整通知
            this.showBoundaryAdjustmentNotice();
        }

        // 获取画布尺寸
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;

        // 计算合适的大小
        const defaultSize = this.shapeLibrary.getDefaultSize(this.currentShape, canvasWidth, canvasHeight);

        // 生成形状路径点
        const shapePoints = this.shapeLibrary.generateShape(
            this.currentShape,
            point.x,
            point.y,
            defaultSize
        );

        if (shapePoints && shapePoints.length > 0) {
            // 创建路径
            const shapePath = this.createPathFromPoints(shapePoints);

            if (shapePath) {
                // 自动选择新创建的路径并显示控制点
                this.selectPath(shapePath);

                Debug.log(`Shape created: ${this.currentShape} at (${point.x}, ${point.y}) with size ${defaultSize}`);
            }
        }

        paper.view.draw();
        this.updatePathInfo();
    }

    /**
     * 设置当前形状类型
     */
    setCurrentShape(shapeType) {
        if (this.shapeLibrary.getShapeInfo(shapeType)) {
            this.currentShape = shapeType;
            Debug.log(`Current shape set to: ${shapeType}`);
        } else {
            Debug.warn(`Unknown shape type: ${shapeType}`);
        }
    }

    /**
     * 获取当前形状类型
     */
    getCurrentShape() {
        return this.currentShape;
    }

    /**
     * 清理贝塞尔预览元素
     */
    clearBezierPreview() {
        // 清理点标记
        if (this.bezierMarkers) {
            this.bezierMarkers.forEach(marker => marker.remove());
            this.bezierMarkers = [];
        }
        
        // 清理预览线
        if (this.bezierPreviewLine) {
            this.bezierPreviewLine.remove();
            this.bezierPreviewLine = null;
        }
        
        // 清理控制线
        if (this.bezierControlLines) {
            this.bezierControlLines.forEach(line => line.remove());
            this.bezierControlLines = [];
        }
        
        // 清理鼠标预览
        if (this.bezierMousePreview) {
            this.bezierMousePreview.remove();
            this.bezierMousePreview = null;
        }
        
        // 清理曲线预览
        if (this.bezierCurvePreview) {
            this.bezierCurvePreview.remove();
            this.bezierCurvePreview = null;
        }
    }


    /**
     * 处理控制点拖拽
     */
    handleControlPointDrag(point) {
        if (!this.dragTarget || !this.dragTarget.data) return;
        
        const { segmentIndex, parentPath } = this.dragTarget.data;
        
        // 更新控制点位置
        this.dragTarget.position = point;
        
        // 更新路径的对应segment
        if (parentPath.segments[segmentIndex]) {
            parentPath.segments[segmentIndex].point = point;
        }
        
        paper.view.draw();
    }

    /**
     * 完成控制点拖拽
     */
    finishControlPointDrag() {
        if (!this.dragTarget || !this.dragTarget.data) return;

        const { parentPath } = this.dragTarget.data;

        // 更新路径数据
        if (parentPath.data) {
            // 检查是否是贝塞尔曲线路径（有控制点）
            const hasCurves = parentPath.segments && parentPath.segments.some(seg =>
                (seg.handleIn && (seg.handleIn.x !== 0 || seg.handleIn.y !== 0)) ||
                (seg.handleOut && (seg.handleOut.x !== 0 || seg.handleOut.y !== 0))
            );

            let newPoints;
            if (hasCurves) {
                // 对于贝塞尔曲线，使用路径处理器重新采样
                Debug.log('DrawingCanvas: Re-sampling Bezier curve after edit');
                newPoints = this.pathProcessor.paperPathToPoints(parentPath);
            } else {
                // 对于直线路径，直接使用segment点
                newPoints = [];
                parentPath.segments.forEach(segment => {
                    newPoints.push({ x: segment.point.x, y: segment.point.y });
                });
            }

            // 更新存储的路径数据
            parentPath.data.points = newPoints;
            parentPath.data.length = this.pathProcessor.calculatePathLength(newPoints);

            // 更新路径信息显示
            this.updatePathInfo();
        }

        this.isDragging = false;
        this.dragTarget = null;
    }

    /**
     * 处理删除工具点击
     */
    handleDeleteToolClick(point) {
        Debug.log('Delete tool activated, paths available:', this.paths.length);
        
        // 使用更全面的hitTest选项
        const hitResult = paper.project.hitTest(point, {
            stroke: true,
            fill: true,
            segments: true,
            tolerance: 15
        });
        
        if (hitResult && hitResult.item && this.isUserDrawnPath(hitResult.item)) {
            Debug.log('Deleting path via hitTest');
            this.deletePath(hitResult.item);
            return;
        }
        
        // 如果hitTest失败，尝试遍历所有路径找到最近的
        let closestPath = null;
        let closestDistance = Infinity;
        
        this.paths.forEach(pathData => {
            const path = pathData.path;
            if (!path || !path.segments) return;
            
            // 计算点击位置到路径的大概距离
            path.segments.forEach(segment => {
                const distance = point.getDistance(segment.point);
                if (distance < closestDistance && distance < 25) { // 增加到25像素容差
                    closestDistance = distance;
                    closestPath = path;
                }
            });
        });
        
        if (closestPath) {
            Debug.log('Deleting closest path, distance:', closestDistance);
            this.deletePath(closestPath);
        } else {
            Debug.log('No path found to delete within tolerance');
        }
    }

    /**
     * 从点数组创建路径
     */
    createPathFromPoints(points) {
        if (points.length < 2) return null;
        
        const path = new paper.Path();
        path.strokeColor = this.strokeColor;
        path.strokeWidth = this.strokeWidth;
        path.strokeCap = 'round';
        path.strokeJoin = 'round';
        
        points.forEach((point, index) => {
            if (index === 0) {
                path.moveTo(new paper.Point(point.x, point.y));
            } else {
                path.lineTo(new paper.Point(point.x, point.y));
            }
        });
        
        this.addPathToCollection(path, points);
        return path;
    }

    /**
     * 添加路径到集合
     */
    addPathToCollection(path, points) {
        const pathData = {
            path: path,
            points: points,
            length: this.pathProcessor.calculatePathLength(points),
            id: this.generatePathId()
        };
        
        this.paths.push(pathData);
        path.data = pathData;
    }

    /**
     * 选择路径
     */
    selectPath(path) {
        this.clearSelection();
        this.selectedPath = path;
        
        // 检查是否为动态路径组
        if (path.name === 'dynamicPath') {
            this.selectDynamicPath(path);
            return;
        }
        
        // 检查是否为动态路径组的子元素
        if (path.parent && path.parent.name === 'dynamicPath') {
            this.selectDynamicPath(path.parent);
            return;
        }
        
        // 高亮选中的路径
        path.strokeColor = '#dc2626';
        path.strokeWidth = this.strokeWidth + 1;
        
        // 显示控制点
        this.showControlPoints(path);
        
        paper.view.draw();
    }

    /**
     * 显示控制点
     */
    showControlPoints(path) {
        this.clearControlPoints();
        
        path.segments.forEach((segment, index) => {
            const controlPoint = new paper.Path.Circle({
                center: segment.point,
                radius: this.controlPointSize,
                fillColor: this.controlPointColor,
                strokeColor: 'white',
                strokeWidth: 2
            });
            
            controlPoint.name = 'controlPoint';
            controlPoint.data = { segmentIndex: index, parentPath: path };
            
            // 添加悬停效果
            controlPoint.onMouseEnter = () => {
                controlPoint.radius = this.controlPointSize + 2;
                controlPoint.fillColor = '#ef4444';
                paper.view.draw();
            };
            
            controlPoint.onMouseLeave = () => {
                controlPoint.radius = this.controlPointSize;
                controlPoint.fillColor = this.controlPointColor;
                paper.view.draw();
            };
            
            this.controlPoints.push(controlPoint);
        });
    }

    /**
     * 清除选择
     */
    clearSelection() {
        if (this.selectedPath) {
            this.selectedPath.strokeColor = this.strokeColor;
            this.selectedPath.strokeWidth = this.strokeWidth;
            this.selectedPath = null;
        }
        this.clearControlPoints();
        
        // 清除拖拽状态
        this.isDragging = false;
        this.dragTarget = null;
    }

    /**
     * 清除控制点
     */
    clearControlPoints() {
        this.controlPoints.forEach(point => point.remove());
        this.controlPoints = [];
    }

    /**
     * 删除路径
     */
    deletePath(path) {
        // 从路径集合中移除
        this.paths = this.paths.filter(pathData => pathData.path !== path);
        
        // 如果是选中的路径，清除选择
        if (this.selectedPath === path) {
            this.clearSelection();
        }
        
        // 从画布中移除
        path.remove();
        
        paper.view.draw();
        this.updatePathInfo();
    }

    /**
     * 删除选中的路径
     */
    deleteSelectedPath() {
        if (this.selectedPath) {
            this.deletePath(this.selectedPath);
        }
    }

    /**
     * 取消当前操作
     */
    cancelCurrentOperation() {
        if (this.currentTool === 'line' || this.currentTool === 'bezier') {
            this.tempPoints = [];
            if (this.currentPath) {
                this.currentPath.remove();
                this.currentPath = null;
            }
            if (this.previewPath) {
                this.previewPath.remove();
                this.previewPath = null;
            }
            
            // 清理贝塞尔预览元素
            if (this.currentTool === 'bezier') {
                this.clearBezierPreview();
            }
            
            paper.view.draw();
        }
    }

    /**
     * 完成当前操作
     */
    finishCurrentOperation() {
        if (this.currentTool === 'line' && this.tempPoints.length >= 2) {
            // 完成多段线绘制
            if (this.previewPath) {
                this.previewPath.remove();
                this.previewPath = null;
            }
            
            const pathPoints = this.pathProcessor.paperPathToPoints(this.currentPath);
            this.addPathToCollection(this.currentPath, pathPoints);
            
            // 自动选择新创建的路径并显示控制点
            this.selectPath(this.currentPath);
            
            this.tempPoints = [];
            this.currentPath = null;
            this.updatePathInfo();
        }
    }

    /**
     * 设置当前工具
     */
    setTool(toolName) {
        this.cancelCurrentOperation();
        this.clearSelection();
        this.currentTool = toolName;
        
        // 更新鼠标样式
        switch (toolName) {
            case 'freehand':
            case 'dynamic':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'line':
            case 'bezier':
            case 'shape':
            case 'image-trace':
                this.canvas.style.cursor = 'pointer';
                break;
            case 'delete':
                this.canvas.style.cursor = 'not-allowed';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }

    /**
     * 清除所有路径
     */
    clearAll() {
        this.cancelCurrentOperation();
        this.clearSelection();
        
        this.paths.forEach(pathData => pathData.path.remove());
        this.paths = [];
        
        paper.view.draw();
        this.updatePathInfo();
    }

    /**
     * 获取所有路径数据
     */
    getAllPaths() {
        // 验证和清理路径数据
        const validPaths = this.paths.filter(pathData => {
            if (!pathData.points || !Array.isArray(pathData.points) || pathData.points.length < 2) {
                Debug.warn('Invalid path data detected and filtered out:', pathData);
                return false;
            }

            // 检查路径点是否在画布边界内
            const canvasBounds = paper.view.bounds;
            const margin = 10; // 10像素边界余量

            const validPoints = pathData.points.filter(point => {
                if (typeof point.x !== 'number' || typeof point.y !== 'number') {
                    Debug.warn('Invalid point coordinates:', point);
                    return false;
                }

                // 检查点是否在画布边界内（包含余量）
                if (point.x < -margin || point.x > canvasBounds.width + margin ||
                    point.y < -margin || point.y > canvasBounds.height + margin) {
                    Debug.warn(`Path point (${point.x}, ${point.y}) is outside canvas bounds (${canvasBounds.width}x${canvasBounds.height})`);
                    return false;
                }

                return true;
            });

            // 如果没有有效点，跳过这个路径
            if (validPoints.length < 2) {
                Debug.warn('Path has insufficient valid points after filtering:', pathData.id);
                return false;
            }

            // 更新路径数据
            pathData.points = validPoints;
            pathData.length = this.pathProcessor.calculatePathLength(validPoints);

            return true;
        });

        return validPaths.map(pathData => ({
            points: pathData.points,
            length: pathData.length,
            id: pathData.id
        }));
    }

    /**
     * 更新路径信息显示
     */
    updatePathInfo() {
        const pathCountElement = document.getElementById('pathCount');
        const totalLengthElement = document.getElementById('totalLength');
        
        if (pathCountElement) {
            pathCountElement.textContent = this.paths.length;
        }
        
        if (totalLengthElement) {
            const totalLength = this.paths.reduce((sum, pathData) => sum + pathData.length, 0);
            totalLengthElement.textContent = `${Math.round(totalLength)} px`;
        }
    }

    /**
     * 生成路径ID
     */
    generatePathId() {
        return 'path_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 检查是否为用户绘制的路径
     */
    isUserDrawnPath(item) {
        if (!item) return false;
        
        // 排除系统元素
        const excludedNames = [
            'grid',
            'controlPoint', 
            'bezierMarker',
            'bezierPreview',
            'bezierControlLine',
            'bezierMousePreview',
            'bezierCurvePreview'
        ];
        
        if (excludedNames.includes(item.name)) {
            return false;
        }
        
        // 检查是否属于网格组
        if (item.parent && item.parent.name === 'grid') {
            return false;
        }
        
        // 检查动态路径组
        if (item.name === 'dynamicPath') {
            return item.data && item.data.id;
        }
        
        // 检查动态路径组的子元素
        if (item.parent && item.parent.name === 'dynamicPath') {
            return item.parent.data && item.parent.data.id;
        }
        
        // 检查是否有路径数据（用户绘制的路径都会有data属性）
        return item.data && item.data.id;
    }

    /**
     * 设置平滑系数
     */
    setSmoothingFactor(factor) {
        this.pathProcessor.smoothingFactor = factor / 100;
    }

    /**
     * 重新绘制视图
     */
    redraw() {
        paper.view.draw();
    }

    /**
     * 调整画布大小
     */
    resize() {
        paper.view.viewSize = new paper.Size(this.canvas.clientWidth, this.canvas.clientHeight);
        paper.view.draw();
    }

    /**
     * 开始动态绘画
     */
    startDynamicDrawing(point) {
        // 检查起始点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            Debug.warn('Dynamic drawing started outside valid area, adjusting to boundary');
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            this.showBoundaryAdjustmentNotice();
        }

        this.isDrawing = true;
        this.dynamicPoints = [];
        this.lastPoint = { x: point.x, y: point.y };
        this.lastTime = Date.now();
        this.velocityHistory = [];

        // 创建动态绘画组
        this.dynamicGroup = new paper.Group();
        this.dynamicGroup.name = 'dynamicPath';

        // 添加第一个点（较大的初始点）
        this.addDynamicPoint(point, 6.0, 0.9);
    }

    /**
     * 继续动态绘画
     */
    continueDynamicDrawing(point) {
        if (!this.isDrawing || !this.lastPoint) return;

        // 检查点是否在有效区域内
        if (!this.isPointInValidArea(point)) {
            const bounds = paper.view.bounds;
            const margin = 20;

            point.x = Math.max(margin, Math.min(bounds.width - margin, point.x));
            point.y = Math.max(margin, Math.min(bounds.height - margin, point.y));

            this.showBoundaryAdjustmentNotice();
        }

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        
        // 避免除零错误
        if (deltaTime === 0) return;

        // 计算移动距离和速度
        const distance = Math.sqrt(
            Math.pow(point.x - this.lastPoint.x, 2) + 
            Math.pow(point.y - this.lastPoint.y, 2)
        );
        
        // 如果距离太小，跳过这个点以避免过密的点
        if (distance < 2) return;
        
        const velocity = distance / Math.max(deltaTime, 1); // 像素/毫秒
        
        // 更新速度历史（保留最近10个值用于平滑）
        this.velocityHistory.push(velocity);
        if (this.velocityHistory.length > 10) {
            this.velocityHistory.shift();
        }

        // 计算平均速度
        const avgVelocity = this.velocityHistory.reduce((sum, v) => sum + v, 0) / this.velocityHistory.length;

        // 根据速度计算点的大小和透明度
        // 速度越快，点越小越透明；速度越慢，点越大越不透明
        const maxVelocity = 1.0; // 进一步降低阈值，让慢速移动更容易触发大点
        const normalizedVelocity = Math.min(avgVelocity / maxVelocity, 1.0);
        
        // 使用非线性映射让大小变化更明显
        const velocityFactor = Math.pow(normalizedVelocity, 0.7); // 使用幂函数让慢速时的变化更明显
        
        // 大小：速度快时小(0.8)，速度慢时大(15.0) - 进一步扩大范围
        const size = 15.0 - (velocityFactor * 14.2);
        
        // 透明度：速度快时透明(0.3)，速度慢时不透明(1.0)
        const opacity = 1.0 - (velocityFactor * 0.7);
        
        // 添加调试信息（可选）
        if (Math.random() < 0.01) { // 偶尔打印调试信息
            Debug.log(`Speed: ${avgVelocity.toFixed(2)}, Size: ${size.toFixed(1)}, Opacity: ${opacity.toFixed(2)}`);
        }

        // 添加一些随机变化来增加艺术效果
        const randomFactor = 0.4; // 增加随机变化
        const randomSize = size * (1 + (Math.random() - 0.5) * randomFactor);
        const randomOpacity = opacity * (1 + (Math.random() - 0.5) * randomFactor * 0.3);

        // 确保值在合理范围内
        const finalSize = Math.max(0.8, Math.min(20.0, randomSize)); // 进一步扩大尺寸范围
        const finalOpacity = Math.max(0.2, Math.min(1.0, randomOpacity));

        // 添加点到画布
        this.addDynamicPoint(point, finalSize, finalOpacity);

        // 更新历史数据
        this.lastPoint = { x: point.x, y: point.y };
        this.lastTime = currentTime;

        paper.view.draw();
    }

    /**
     * 添加动态点到画布
     */
    addDynamicPoint(point, size, opacity) {
        // 创建圆形点
        const circle = new paper.Path.Circle({
            center: new paper.Point(point.x, point.y),
            radius: size,
            fillColor: this.strokeColor,
            opacity: opacity
        });

        // 添加到动态组
        if (this.dynamicGroup) {
            this.dynamicGroup.addChild(circle);
        }

        // 记录点数据
        this.dynamicPoints.push({
            x: point.x,
            y: point.y,
            size: size,
            opacity: opacity
        });
    }

    /**
     * 完成动态绘画
     */
    finishDynamicDrawing() {
        if (!this.isDrawing || !this.dynamicGroup) return;
        
        this.isDrawing = false;

        // 如果点数太少，不创建路径
        if (this.dynamicPoints.length < 2) {
            if (this.dynamicGroup) {
                this.dynamicGroup.remove();
            }
            this.resetDynamicDrawing();
            return;
        }

        // 创建路径数据
        const pathPoints = this.dynamicPoints.map(p => ({ x: p.x, y: p.y }));
        const pathData = {
            path: this.dynamicGroup,
            points: pathPoints,
            length: this.pathProcessor.calculatePathLength(pathPoints),
            id: this.generatePathId(),
            isDynamic: true // 标记为动态路径
        };
        
        this.paths.push(pathData);
        this.dynamicGroup.data = pathData;
        
        // 自动选择新创建的路径
        this.selectDynamicPath(this.dynamicGroup);
        
        this.resetDynamicDrawing();
        this.updatePathInfo();
    }

    /**
     * 选择动态路径（显示特殊的控制点）
     */
    selectDynamicPath(group) {
        this.clearSelection();
        this.selectedPath = group;
        
        // 高亮选中的路径组
        group.children.forEach(child => {
            if (child.fillColor) {
                child.strokeColor = '#dc2626';
                child.strokeWidth = 1;
            }
        });
        
        // 为动态路径显示简化的控制点（每隔几个点显示一个）
        const step = Math.max(1, Math.floor(this.dynamicPoints.length / 20)); // 最多显示20个控制点
        for (let i = 0; i < this.dynamicPoints.length; i += step) {
            const point = this.dynamicPoints[i];
            const controlPoint = new paper.Path.Circle({
                center: new paper.Point(point.x, point.y),
                radius: this.controlPointSize,
                fillColor: this.controlPointColor,
                strokeColor: 'white',
                strokeWidth: 2
            });
            
            controlPoint.name = 'controlPoint';
            controlPoint.data = { segmentIndex: i, parentPath: group };
            
            this.controlPoints.push(controlPoint);
        }
        
        paper.view.draw();
    }

    /**
     * 重置动态绘画状态
     */
    resetDynamicDrawing() {
        this.dynamicPoints = [];
        this.dynamicGroup = null;
        this.lastPoint = null;
        this.lastTime = 0;
        this.velocityHistory = [];
    }

    /**
     * 添加追踪的路径到画布
     * @param {Array} tracedPaths - 追踪的路径数组
     * @param {Number} imageWidth - 图片宽度
     * @param {Number} imageHeight - 图片高度
     */
    addTracedPaths(tracedPaths, imageWidth, imageHeight) {
        if (!tracedPaths || tracedPaths.length === 0) return;
        
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
        
        Debug.log('Adding traced paths:', {
            count: tracedPaths.length,
            imageSize: { width: imageWidth, height: imageHeight },
            canvasSize: { width: canvasWidth, height: canvasHeight },
            scale: scale,
            offset: { x: offsetX, y: offsetY }
        });
        
        // 转换每个路径
        for (const tracedPath of tracedPaths) {
            if (tracedPath.length < 2) continue;
            
            // 创建Paper.js路径
            const path = new paper.Path();
            path.strokeColor = this.strokeColor;
            path.strokeWidth = this.strokeWidth;
            path.strokeCap = 'round';
            path.strokeJoin = 'round';
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
            
            // 路径已经由ImageTracer处理，不再需要额外平滑
            // path.smooth();
            
            // 创建路径数据对象并添加到路径集合
            const points = [];
            for (let segment of path.segments) {
                points.push({ x: segment.point.x, y: segment.point.y });
            }
            
            this.addPathToCollection(path, points);
            
            Debug.log('Path added:', {
                segments: path.segments.length,
                points: points.length,
                bounds: path.bounds
            });
        }
        
        // 更新路径信息显示
        this.updatePathInfo();
    }

}
