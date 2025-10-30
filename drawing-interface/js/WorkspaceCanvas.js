/**
 * WorkspaceCanvas - Workspace canvas in robot mode
 * Handles object placement and target position setting
 */
class WorkspaceCanvas {
    constructor(canvasId) {
        this.canvasElement = document.getElementById(canvasId);
        this.currentTool = 'place-object';
        this.selectedObjectType = 'cube';
        this.objects = [];
        this.isSettingTarget = false;
        this.currentObjectForTarget = null;
        
        // Initialize state flags
        this.isPaperInitialized = false;
        this.useFallback = true; // Default to fallback system until Paper.js successfully initializes
        this.paperScope = null;
        
        // Bed aspect ratio (default value, will be updated when event is received)
        this.bedAspectRatio = null;

        if (!this.canvasElement) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        // Listen for bed aspect ratio event to dynamically adjust container ratio
        window.addEventListener('bedAspectRatioCalculated', (e) => {
            this.bedAspectRatio = e.detail.aspectRatio;
            Debug.log('WorkspaceCanvas: Bed aspect ratio received:', this.bedAspectRatio);
            
            // Set container aspect-ratio
            const container = this.canvasElement.parentElement;
            if (container && this.bedAspectRatio) {
                container.style.aspectRatio = `${this.bedAspectRatio}`;
                Debug.log('Container aspect ratio set to:', this.bedAspectRatio);
            }
            
            // Resize canvas
            setTimeout(() => {
                if (this.isPaperInitialized) {
                    this.resize();
                } else {
                    this.setupCanvasSize();
                    this.drawBasicGrid();
                }
            }, 100);
        });

        // Initialize tool display
        this.updateToolDisplay();

        this.initPaperJS();
    }
    
    /**
     * Get base dimensions for objects (default values for 2D display and 3D simulation)
     */
    getBaseDimensions(objectType) {
        const defaults = {
            cube: {
                width: 20,
                height: 20,
                depth: 20,
                displayWidth: 30,
                displayHeight: 30
            },
            sphere: {
                width: 20,
                height: 20,
                depth: 20,
                radius: 10,
                displayRadius: 15,
                displayWidth: 30,
                displayHeight: 30
            },
            cylinder: {
                width: 20,
                height: 20,
                depth: 20,
                radius: 10,
                displayRadius: 12,
                displayHeight: 24
            },
            box: {
                width: 30,
                height: 14,
                depth: 20,
                displayWidth: 40,
                displayHeight: 20
            }
        };
        
        return { ...(defaults[objectType] || defaults.cube) };
    }
    
    /**
     * Generate object dimensions, introduces random scaling for cubes
     */
    generateObjectDimensions(objectType) {
        const dimensions = this.getBaseDimensions(objectType);
        
        if (objectType === 'cube') {
            const scale = this.generateCubeScale();
            dimensions.width *= scale;
            dimensions.height *= scale;
            dimensions.depth *= scale;
            
            if (dimensions.displayWidth) {
                dimensions.displayWidth *= scale;
            }
            if (dimensions.displayHeight) {
                dimensions.displayHeight *= scale;
            }
            if (dimensions.displayRadius) {
                dimensions.displayRadius *= scale;
            }
            
            dimensions.scale = scale;
        } else {
            dimensions.scale = 1;
        }
        
        return dimensions;
    }
    
    /**
     * Generate random scale factor for cube
     */
    generateCubeScale() {
        const minScale = 0.6;
        const maxScale = 1.4;
        return parseFloat((minScale + Math.random() * (maxScale - minScale)).toFixed(2));
    }
    
    /**
     * Initialize Paper.js
     */
    initPaperJS() {
        // Delay initialization to ensure canvas element is properly rendered
        setTimeout(() => {
            try {
                Debug.log('Initializing Paper.js for WorkspaceCanvas...');
                Debug.log('Canvas element:', this.canvasElement);
                Debug.log('Canvas dimensions:', this.canvasElement.clientWidth, 'x', this.canvasElement.clientHeight);
                
                // Create independent Paper.js scope for workspace canvas
                this.paperScope = new paper.PaperScope();
                this.paperScope.setup(this.canvasElement);
                
                // Activate this scope
                this.paperScope.activate();
                
                // Get canvas dimensions, ensure default values and correct ratio
                const containerWidth = this.canvasElement.clientWidth || 400;
                const containerHeight = this.canvasElement.clientHeight || 300;
                
                // Use all available space of container directly
                const width = containerWidth;
                const height = containerHeight;
                
                // Handle high DPR screens: internal pixels = CSS * DPR, and scale view
                const dpr = window.devicePixelRatio || 1;
                this.dpr = dpr;
                this.canvasElement.width = Math.round(width * dpr);
                this.canvasElement.height = Math.round(height * dpr);
                
                // Record CSS dimensions, unified coordinate basis
                this.canvasWidth = width;
                this.canvasHeight = height;
                
                // Set view size to CSS logical dimensions
                this.paperScope.view.viewSize = new this.paperScope.Size(width, height);
                // Ensure mouse coordinates match CSS coordinates by setting view scale
                this.paperScope.view.scale(1);
                
                // Apply DPR scaling to 2D drawing context to ensure drawing and click coordinates match
                const ctx = this.canvasElement.getContext('2d');
                if (ctx && ctx.setTransform) {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
                
                // Draw work area boundary
                this.drawWorkAreaBoundary();
                
                Debug.log('WorkspaceCanvas Paper.js initialized successfully with size:', width, 'x', height);
                
                // Bind events after initialization completes
                this.bindEvents();
                this.isPaperInitialized = true;
                this.useFallback = false; // Use unified event system, but Paper.js can be used for drawing

                // Ensure canvas has correct initial display
                this.ensureCanvasDisplay();
                
            } catch (error) {
                Debug.error('Failed to initialize WorkspaceCanvas Paper.js:', error);
                // Use unified event handling system
                this.initUnifiedEventSystem();
            }
        }, 200); // Increased delay time
    }
    
    /**
     * Initialize unified event system
     */
    initUnifiedEventSystem() {
        Debug.log('Initializing unified event system for WorkspaceCanvas');
        this.isPaperInitialized = false;
        this.useFallback = true;
        Debug.log('Using fallback system:', this.useFallback);

        // Set canvas size
        this.setupCanvasSize();

        // Draw basic grid
        this.drawBasicGrid();

        // Bind unified event handlers
        this.bindUnifiedEvents();

        // Ensure canvas has correct initial display
        this.ensureCanvasDisplay();
    }
    
    /**
     * Set canvas size - simplified version, directly use container size (consistent with DrawingCanvas)
     */
    setupCanvasSize() {
        // Directly use container client dimensions (CSS handles aspect ratio)
        const width = this.canvasElement.clientWidth || 400;
        const height = this.canvasElement.clientHeight || 300;

        // Handle high DPR screens
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;

        // Set canvas internal pixel size (physical pixels)
        this.canvasElement.width = Math.round(width * dpr);
        this.canvasElement.height = Math.round(height * dpr);

        // Scale context so subsequent drawing still uses CSS units
        const ctx = this.canvasElement.getContext('2d');
        if (ctx && ctx.setTransform) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Save CSS dimensions (for logical calculations)
        this.canvasWidth = width;
        this.canvasHeight = height;

        Debug.log('WorkspaceCanvas size set to:', width, 'x', height, 'DPR:', dpr);
    }
    
    /**
     * Draw basic grid - completely consistent with DrawingCanvas
     */
    drawBasicGrid() {
        const ctx = this.canvasElement.getContext('2d');
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // No longer draw boundary lines, consistent with DrawingCanvas

        // Draw grid - consistent style with DrawingCanvas
        ctx.strokeStyle = '#f1f5f9';  // Use same grid color as DrawingCanvas
        ctx.lineWidth = 0.5;         // Use same line width as DrawingCanvas
        ctx.setLineDash([]);

        const gridSize = 20;       // Use same grid spacing as DrawingCanvas

        // Vertical lines - cover entire canvas
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines - cover entire canvas
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    /**
     * Bind unified event handlers
     */
    bindUnifiedEvents() {
        // Remove old event listeners
        this.canvasElement.removeEventListener('click', this.handleCanvasClick);
        this.canvasElement.removeEventListener('mousemove', this.handleCanvasMouseMove);
        
        // Bind new event handlers
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        
        this.canvasElement.addEventListener('click', this.handleCanvasClick);
        this.canvasElement.addEventListener('mousemove', this.handleCanvasMouseMove);
        
        // Window resize event
        window.addEventListener('resize', () => {
            setTimeout(() => this.resize(), 100);
        });
        
        Debug.log('Unified events bound successfully');
        Debug.log('Canvas element:', this.canvasElement);
        Debug.log('Canvas element dimensions:', this.canvasElement.clientWidth, 'x', this.canvasElement.clientHeight);
    }
    
    /**
     * Unified canvas click handler
     */
    handleCanvasClick(e) {
        const point = this.getAccurateMousePosition(e);
        Debug.log('Canvas click at:', point, 'tool:', this.currentTool);

        // Check if point is in work area
        if (!this.isPointInWorkAreaUnified(point)) {
            Debug.log('Click outside work area, ignoring');
            return;
        }

        Debug.log('Processing click with tool:', this.currentTool);

        switch (this.currentTool) {
            case 'place-object':
                Debug.log('Calling placeObjectUnified');
                this.placeObjectUnified(point);
                break;
            case 'set-target':
                Debug.log('Calling setTargetPositionUnified');
                this.setTargetPositionUnified(point);
                break;
            case 'delete-object':
                Debug.log('Calling deleteObjectAtUnified');
                this.deleteObjectAtUnified(point);
                break;
            default:
                Debug.log('Unknown tool:', this.currentTool);
        }
    }
    
    /**
     * Unified mouse move handler
     */
    handleCanvasMouseMove(e) {
        const point = this.getAccurateMousePosition(e);
        this.updateCursorUnified(point);
    }
    
    /**
     * Get accurate mouse position
     */
    getAccurateMousePosition(e) {
        const rect = this.canvasElement.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        return { x, y };
    }
    
    /**
     * Unified work area check - consistent with DrawingCanvas (entire canvas is available)
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
     * Unified place object method
     */
    placeObjectUnified(point) {
        Debug.log('Placing object (unified) at:', point, 'type:', this.selectedObjectType);
        
        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false,
            state: 'placed',
            dimensions: this.generateObjectDimensions(this.selectedObjectType)
        };
        
        this.objects.push(objectData);
        this.updateObjectInfo();
        
        // Draw object to canvas
        this.drawObjectToCanvas(objectData);
        
        // Automatically switch to target setting mode
        this.currentObjectForTarget = objectData;
        this.autoSwitchToTargetMode();
        
        Debug.log('Object placed successfully (unified):', objectData);
        this.dispatchEvent('objectPlaced', objectData);
    }
    
    /**
     * Unified target position setting method
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
        
        // Set target position
        this.currentObjectForTarget.targetPosition = { x: point.x, y: point.y };
        this.currentObjectForTarget.state = 'targeted';
        
        // Redraw canvas
        this.redrawCanvas();
        
        this.updateObjectInfo();
        Debug.log('Target position set (unified) for:', this.currentObjectForTarget.id);
        
        // Automatically switch back to placement mode
        this.autoSwitchToPlaceMode();
        
        // Reset state
        this.currentObjectForTarget = null;
        
        this.dispatchEvent('targetSet', this.currentObjectForTarget);
    }
    
    /**
     * Unified delete object method
     */
    deleteObjectAtUnified(point) {
        Debug.log('deleteObjectAtUnified called with point:', point);
        const nearestObject = this.findNearestObjectUnified(point);
        if (nearestObject) {
            Debug.log('Found nearest object for deletion:', nearestObject);
            this.deleteObjectUnified(nearestObject.id);
        } else {
            Debug.log('No object found near click point for deletion');
        }
    }
    
    /**
     * Draw object to canvas
     */
    drawObjectToCanvas(objectData) {
        const ctx = this.canvasElement.getContext('2d');
        const point = objectData.position;
        const dims = objectData.dimensions || this.getBaseDimensions(objectData.type);
        
        if (!objectData.dimensions) {
            objectData.dimensions = dims;
        }
        
        const displayWidth = dims.displayWidth ?? (dims.displayRadius ? dims.displayRadius * 2 : 30);
        const displayHeight = dims.displayHeight ?? displayWidth;
        const displayRadius = dims.displayRadius ?? displayWidth / 2;
        const labelOffset = (displayHeight ?? (displayRadius * 2)) / 2 + 10;
        
        // Set color based on state
        let fillColor, strokeColor;
        switch (objectData.state) {
            case 'placed':
                fillColor = '#ff1d48';
                strokeColor = '#991b1b';
                break;
            case 'targeted':
                fillColor = '#ff3b30';
                strokeColor = '#9b2c2c';
                break;
            case 'completed':
                fillColor = '#9f7aea';
                strokeColor = '#805ad5';
                break;
            default:
                fillColor = '#ff1d48';
                strokeColor = '#991b1b';
        }
        
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        // Draw different shapes based on type
        switch (objectData.type) {
            case 'cube':
                ctx.fillRect(
                    point.x - displayWidth / 2,
                    point.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                ctx.strokeRect(
                    point.x - displayWidth / 2,
                    point.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                break;
            case 'sphere':
                ctx.beginPath();
                ctx.arc(point.x, point.y, displayRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'cylinder':
                ctx.beginPath();
                ctx.arc(point.x, point.y, displayRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'box':
                ctx.fillRect(
                    point.x - displayWidth / 2,
                    point.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                ctx.strokeRect(
                    point.x - displayWidth / 2,
                    point.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                break;
        }
        
        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(objectData.type.toUpperCase(), point.x, point.y - labelOffset);
        
        // If target position exists, draw target and connection line
        if (objectData.targetPosition) {
            this.drawTargetAndConnection(objectData);
        }
    }
    
    /**
     * Draw target marker and connection line
     */
    drawTargetAndConnection(objectData) {
        const ctx = this.canvasElement.getContext('2d');
        const target = objectData.targetPosition;
        
        // Draw connection line
        ctx.strokeStyle = '#9f7aea';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(objectData.position.x, objectData.position.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw target marker
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw cross marker
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(target.x - 6, target.y);
        ctx.lineTo(target.x + 6, target.y);
        ctx.moveTo(target.x, target.y - 6);
        ctx.lineTo(target.x, target.y + 6);
        ctx.stroke();
    }
    
    /**
     * Redraw entire canvas
     */
    redrawCanvas() {
        // Redraw basic grid
        this.drawBasicGrid();
        
        // Redraw all objects
        this.objects.forEach(obj => {
            this.drawObjectToCanvas(obj);
        });
    }
    
    /**
     * Find nearest object (unified version)
     */
    findNearestObjectUnified(point) {
        let nearest = null;
        let minDistance = Infinity;

        Debug.log('Finding nearest object to point:', point);
        Debug.log('Available objects:', this.objects.length);

        if (this.objects.length === 0) {
            Debug.log('No objects available for selection');
            return null;
        }

        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) +
                Math.pow(obj.position.y - point.y, 2)
            );

            Debug.log('Object at:', obj.position, 'Distance:', distance);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });

        Debug.log('Min distance found:', minDistance, 'Threshold: 30');
        const result = minDistance < 30 ? nearest : null;
        Debug.log('Returning nearest object:', result);

        return result;
    }
    
    /**
     * Delete object (unified version)
     */
    deleteObjectUnified(objectId) {
        Debug.log('deleteObjectUnified called for objectId:', objectId);
        const index = this.objects.findIndex(obj => obj.id === objectId);
        Debug.log('Object index found:', index);
        
        if (index !== -1) {
            const deletedObject = this.objects[index];
            Debug.log('Deleting object:', deletedObject);
            
            this.objects.splice(index, 1);
            this.redrawCanvas();
            this.updateObjectInfo();
            Debug.log('Object deleted (unified):', objectId);
            this.dispatchEvent('objectDeleted', { id: objectId });
        } else {
            Debug.log('Object not found in objects array:', objectId);
        }
    }
    
    /**
     * Update cursor style (unified version)
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
     * Bind basic events (fallback solution)
     */
    bindBasicEvents() {
        this.canvasElement.addEventListener('click', (e) => {
            const rect = this.canvasElement.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            Debug.log('Fallback click at:', point, 'tool:', this.currentTool);
            
            // Simple boundary check
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
     * Fallback place object method
     */
    placeObjectFallback(point) {
        Debug.log('Placing object (fallback) at:', point);
        Debug.log('Selected object type:', this.selectedObjectType);
        Debug.log('Current objects count before placement:', this.objects.length);

        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false,
            dimensions: this.generateObjectDimensions(this.selectedObjectType)
        };

        this.objects.push(objectData);
        this.updateObjectInfo();

        Debug.log('Object placed (fallback):', objectData);
        Debug.log('Current objects count after placement:', this.objects.length);
        this.dispatchEvent('objectPlaced', objectData);

        // Redraw entire canvas to ensure correct display
        this.redrawCanvasFallback();
    }
    
    /**
     * Fallback draw object method
     */
    drawObjectFallback(objectData) {
        const ctx = this.canvasElement.getContext('2d');
        const dims = objectData.dimensions || this.getBaseDimensions(objectData.type);
        
        if (!objectData.dimensions) {
            objectData.dimensions = dims;
        }
        
        const displayWidth = dims.displayWidth ?? (dims.displayRadius ? dims.displayRadius * 2 : 30);
        const displayHeight = dims.displayHeight ?? displayWidth;
        const displayRadius = dims.displayRadius ?? displayWidth / 2;
        const labelOffset = (displayHeight ?? (displayRadius * 2)) / 2 + 10;

        // Set color based on state
        let fillColor, strokeColor;
        if (objectData.targetPosition) {
            fillColor = '#ff3b30'; // Target set - bright red
            strokeColor = '#9b2c2c';
        } else {
            fillColor = '#ff1d48'; // Default - high saturation red
            strokeColor = '#991b1b';
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

        // Draw different shapes based on type
        switch (objectData.type) {
            case 'cube':
                ctx.fillRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                ctx.strokeRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                break;
            case 'sphere':
                ctx.beginPath();
                ctx.arc(objectData.position.x, objectData.position.y, displayRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'cylinder':
                ctx.beginPath();
                ctx.arc(objectData.position.x, objectData.position.y, displayRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            case 'box':
                ctx.fillRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                ctx.strokeRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                break;
            default:
                ctx.fillRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
                ctx.strokeRect(
                    objectData.position.x - displayWidth / 2,
                    objectData.position.y - displayHeight / 2,
                    displayWidth,
                    displayHeight
                );
        }

        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            objectData.type.toUpperCase(),
            objectData.position.x,
            objectData.position.y - labelOffset
        );

        // If target position exists, draw target marker and connection line
        if (objectData.targetPosition) {
            // Draw connection line
            ctx.strokeStyle = '#9f7aea';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(objectData.position.x, objectData.position.y);
            ctx.lineTo(objectData.targetPosition.x, objectData.targetPosition.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw target marker
            ctx.strokeStyle = '#e53e3e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(objectData.targetPosition.x, objectData.targetPosition.y, 8, 0, 2 * Math.PI);
            ctx.stroke();

            // Draw cross marker
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
     * Fallback redraw canvas method
     */
    redrawCanvasFallback() {
        // Redraw basic grid
        this.drawBasicGrid();

        // Redraw all objects
        this.objects.forEach(obj => {
            this.drawObjectFallback(obj);
        });
    }
    
    /**
     * Fallback set target position method
     */
    setTargetPositionFallback(point) {
        // Find nearest object
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
            // Set target position for found object
            nearest.targetPosition = { x: point.x, y: point.y };

            Debug.log('Target set (fallback) for:', nearest.id);
            this.updateObjectInfo();
            this.dispatchEvent('targetSet', nearest);

            // Redraw entire canvas to show target marker and connection line
            this.redrawCanvasFallback();
        } else {
            Debug.log('No object found near point (fallback):', point);
        }
    }
    
    /**
     * Fallback delete object method
     */
    deleteObjectAtFallback(point) {
        Debug.log('deleteObjectAtFallback called with point:', point);
        Debug.log('Current objects count:', this.objects.length);
        Debug.log('Current objects:', this.objects);

        if (this.objects.length === 0) {
            Debug.log('No objects to delete');
            return;
        }

        // Find nearest object
        let nearest = null;
        let minDistance = Infinity;

        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) +
                Math.pow(obj.position.y - point.y, 2)
            );

            Debug.log('Object at:', obj.position, 'Distance:', distance);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });

        Debug.log('Min distance found:', minDistance, 'Threshold: 30');

        // Reduce threshold distance for more precise deletion
        if (minDistance < 30 && nearest) {
            Debug.log('Deleting object:', nearest.id);
            // Remove object from array
            const index = this.objects.findIndex(obj => obj.id === nearest.id);
            if (index !== -1) {
                this.objects.splice(index, 1);
                this.updateObjectInfo();

                // Redraw canvas (fallback system)
                this.redrawCanvasFallback();

                Debug.log('Object deleted (fallback):', nearest.id);
                this.dispatchEvent('objectDeleted', { id: nearest.id });
            } else {
                Debug.log('Object not found in array for deletion');
            }
        } else {
            Debug.log('No object found near point (fallback):', point, 'Nearest distance:', minDistance);
        }
    }
    
    /**
     * Draw work area - consistent with DrawingCanvas (no boundary lines)
     */
    drawWorkAreaBoundary() {
        const bounds = this.paperScope.view.bounds;
        
        // No longer draw boundary lines, consistent with DrawingCanvas
        // Draw full canvas grid directly
        this.drawGrid();
        
        // Set work area to entire canvas (for click detection)
        this.workAreaBounds = {
            bounds: bounds
        };
    }
    
    /**
     * Draw grid - completely consistent with DrawingCanvas
     */
    drawGrid(workArea) {
        const gridSize = 20;          // Same grid spacing as DrawingCanvas
        const gridColor = '#f1f5f9';  // Same grid color as DrawingCanvas
        const bounds = this.paperScope.view.bounds;
        
        // Create grid group
        const gridGroup = new this.paperScope.Group();
        gridGroup.name = 'grid';
        
        // Vertical lines - cover entire canvas
        for (let x = 0; x <= bounds.width; x += gridSize) {
            const line = new this.paperScope.Path.Line(
                new this.paperScope.Point(x, 0),
                new this.paperScope.Point(x, bounds.height)
            );
            line.strokeColor = gridColor;
            line.strokeWidth = 0.5;  // Same line width as DrawingCanvas
            gridGroup.addChild(line);
        }

        // Horizontal lines - cover entire canvas
        for (let y = 0; y <= bounds.height; y += gridSize) {
            const line = new this.paperScope.Path.Line(
                new this.paperScope.Point(0, y),
                new this.paperScope.Point(bounds.width, y)
            );
            line.strokeColor = gridColor;
            line.strokeWidth = 0.5;  // Same line width as DrawingCanvas
            gridGroup.addChild(line);
        }
        
        // Send grid to back
        gridGroup.sendToBack();
    }
    
    
    /**
     * Bind events
     */
    bindEvents() {
        // To avoid conflicts with DrawingCanvas's Paper.js scope,
        // WorkspaceCanvas uses unified custom event system
        Debug.log('WorkspaceCanvas: Using unified event system to avoid Paper.js conflicts');
        this.bindUnifiedEvents();
    }
    
    /**
     * Handle mouse down event - Paper.js version
     */
    handleMouseDown(event) {
        const point = event.point;
        Debug.log('Mouse down at point (Paper.js):', point, 'current tool:', this.currentTool);
        
        // Check if point is in work area
        const inWorkArea = this.isPointInWorkArea(point);
        Debug.log('Point in work area:', inWorkArea);
        
        if (!inWorkArea) {
            Debug.log('Click outside work area, ignoring');
            return;
        }
        
        Debug.log('Processing click with tool:', this.currentTool);
        
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
                Debug.log('Unknown tool:', this.currentTool);
        }
    }
    
    /**
     * Handle mouse move event - Paper.js version
     */
    handleMouseMove(event) {
        // Update cursor style
        this.updateCursor(event.point);
    }
    
    /**
     * Check if point is in work area - consistent with DrawingCanvas (entire canvas is available)
     */
    isPointInWorkArea(point) {
        if (!this.workAreaBounds) {
            Debug.log('Work area bounds not initialized');
            return false;
        }
        const result = this.workAreaBounds.bounds.contains(point);
        Debug.log('Point:', point, 'Work area bounds:', this.workAreaBounds.bounds, 'Contains:', result);
        return result;
    }
    
    /**
     * Place object
     */
    placeObject(point) {
        Debug.log('Placing object at point:', point, 'type:', this.selectedObjectType);
        
        const objectData = {
            id: this.generateObjectId(),
            type: this.selectedObjectType,
            position: { x: point.x, y: point.y },
            targetPosition: null,
            isSelected: false,
            state: 'placed', // New state: placed, targeted, completed
            dimensions: this.generateObjectDimensions(this.selectedObjectType)
        };
        
        const visualObject = this.createVisualObject(objectData);
        objectData.visual = visualObject;
        
        this.objects.push(objectData);
        this.updateObjectInfo();
        
        Debug.log('Object placed successfully:', objectData);
        
        // Automatically switch to target setting mode
        this.currentObjectForTarget = objectData;
        this.autoSwitchToTargetMode();
        
        // Trigger event
        this.dispatchEvent('objectPlaced', objectData);
    }
    
    /**
     * Automatically switch to target setting mode
     */
    autoSwitchToTargetMode() {
        // Switch tool to target setting
        this.currentTool = 'set-target';
        
        // Notify main app to update tool button state
        this.dispatchEvent('toolChanged', { tool: 'set-target' });
        
        // Update cursor hint
        this.showMessage('Click to set target position for the placed object');
        
        Debug.log('Auto-switched to target setting mode');
    }
    
    /**
     * Create visual object
     */
    createVisualObject(objectData) {
        if (!objectData.dimensions) {
            objectData.dimensions = this.getBaseDimensions(objectData.type);
        }
        
        const point = new this.paperScope.Point(objectData.position.x, objectData.position.y);
        const dims = objectData.dimensions || this.getBaseDimensions(objectData.type);
        const displayWidth = dims.displayWidth ?? (dims.displayRadius ? dims.displayRadius * 2 : 30);
        const displayHeight = dims.displayHeight ?? displayWidth;
        const displayRadius = dims.displayRadius ?? displayWidth / 2;
        const labelOffset = (displayHeight ?? (displayRadius * 2)) / 2 + 10;
        
        let shape;
        
        switch (objectData.type) {
            case 'cube':
                shape = new this.paperScope.Path.Rectangle(
                    point.subtract([displayWidth / 2, displayHeight / 2]),
                    new this.paperScope.Size(displayWidth, displayHeight)
                );
                break;
            case 'sphere':
                shape = new this.paperScope.Path.Circle(point, displayRadius);
                break;
            case 'cylinder':
                shape = new this.paperScope.Path.Circle(point, displayRadius);
                break;
            case 'box':
                shape = new this.paperScope.Path.Rectangle(
                    point.subtract([displayWidth / 2, displayHeight / 2]),
                    new this.paperScope.Size(displayWidth, displayHeight)
                );
                break;
            default:
                shape = new this.paperScope.Path.Rectangle(
                    point.subtract([displayWidth / 2, displayHeight / 2]),
                    new this.paperScope.Size(displayWidth, displayHeight)
                );
        }
        
        // 设置样式
        shape.fillColor = '#ff1d48';
        shape.strokeColor = '#991b1b';
        shape.strokeWidth = 2;
        
        // 添加标签
        const label = new this.paperScope.PointText(point.add([0, -labelOffset]));
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
                // 刚放置的状态 - 高饱和红色
                shape.fillColor = '#ff1d48';
                shape.strokeColor = '#991b1b';
                shape.strokeWidth = 2;
                if (label) label.fillColor = '#4a5568';
                shape.shadowColor = null;
                shape.shadowBlur = 0;
                shape.shadowOffset = new this.paperScope.Point(0, 0);
                break;
                
            case 'targeted':
                // 已设置目标的状态 - 亮红色以保持一致
                shape.fillColor = '#ff3b30';
                shape.strokeColor = '#9b2c2c';
                shape.strokeWidth = 3;
                if (label) label.fillColor = '#2d3748';
                
                // 添加轻微的阴影效果
                shape.shadowColor = 'rgba(255, 59, 48, 0.3)';
                shape.shadowBlur = 5;
                shape.shadowOffset = new this.paperScope.Point(2, 2);
                break;
                
            case 'completed':
                // 已完成的状态 - 紫色
                shape.fillColor = '#9f7aea';
                shape.strokeColor = '#805ad5';
                shape.strokeWidth = 2;
                if (label) label.fillColor = '#553c9a';
                shape.shadowColor = null;
                shape.shadowBlur = 0;
                shape.shadowOffset = new this.paperScope.Point(0, 0);
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
        Debug.log('Target position set for object:', this.currentObjectForTarget.id);
        
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
        
        Debug.log('Auto-switched back to placement mode');
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
        Debug.log('deleteObjectAt (Paper.js) called with point:', point);
        
        const hitResult = this.paperScope.project.hitTest(point, {
            fill: true,
            stroke: true,
            segments: true,
            tolerance: 15 // 增加容忍度，使点击更容易命中
        });
        
        Debug.log('Hit test result:', hitResult);
        
        if (hitResult && hitResult.item.data && hitResult.item.data.objectId) {
            const objectId = hitResult.item.data.objectId;
            Debug.log('Found object to delete:', objectId);
            this.deleteObject(objectId);
        } else {
            Debug.log('No object found at point for deletion');
            // 备用方案：使用距离检测
            const nearestObject = this.findNearestObject(point);
            if (nearestObject) {
                Debug.log('Using fallback distance detection, deleting:', nearestObject.id);
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
            Debug.log('Object deleted:', objectId);
            
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
        
        Debug.log('Finding nearest object (Paper.js) to point:', point);
        Debug.log('Available objects:', this.objects.length);
        
        if (this.objects.length === 0) {
            Debug.log('No objects available for selection (Paper.js)');
            return null;
        }
        
        this.objects.forEach(obj => {
            const distance = Math.sqrt(
                Math.pow(obj.position.x - point.x, 2) + 
                Math.pow(obj.position.y - point.y, 2)
            );
            
            Debug.log('Object at:', obj.position, 'Distance:', distance);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = obj;
            }
        });
        
        Debug.log('Min distance found (Paper.js):', minDistance, 'Threshold: 30');
        const result = minDistance < 30 ? nearest : null;
        Debug.log('Returning nearest object (Paper.js):', result);
        
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
        Debug.log('WorkspaceCanvas.setTool called with:', toolName);
        Debug.log('Previous tool was:', this.currentTool);
        this.currentTool = toolName;
        Debug.log('WorkspaceCanvas tool changed to:', toolName);
        Debug.log('Current tool is now:', this.currentTool);

        // 更新工具显示
        this.updateToolDisplay();
    }
    
    /**
     * 设置选中的物品类型
     */
    setSelectedObjectType(objectType) {
        Debug.log('WorkspaceCanvas.setSelectedObjectType called with:', objectType);
        Debug.log('Previous selectedObjectType was:', this.selectedObjectType);
        this.selectedObjectType = objectType;
        Debug.log('New selectedObjectType is:', this.selectedObjectType);
    }
    
    /**
     * 获取所有物品数据
     */
    getAllObjects() {
        return this.objects.map(obj => ({
            id: obj.id,
            type: obj.type,
            position: obj.position,
            targetPosition: obj.targetPosition,
            dimensions: obj.dimensions ? { ...obj.dimensions } : null
        }));
    }
    
    /**
     * 清除所有物品
     */
    clearAll() {
        Debug.log('WorkspaceCanvas.clearAll called');
        Debug.log('Current state - isPaperInitialized:', this.isPaperInitialized, 'useFallback:', this.useFallback, 'paperScope:', !!this.paperScope);

        // 清除对象数组（无论什么模式都要做）
        this.objects = [];
        this.currentObjectForTarget = null;

        // 总是确保画布有正确的显示
        this.ensureCanvasDisplay();

        // 更新信息显示
        this.updateObjectInfo();

        Debug.log('All objects cleared');
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
                Debug.log('Ensuring Paper.js canvas display');

                // 清除所有Paper.js对象
                this.objects.forEach(obj => {
                    try {
                        if (obj.visual) obj.visual.remove();
                        if (obj.targetMarker) obj.targetMarker.remove();
                        if (obj.connectionLine) obj.connectionLine.remove();
                    } catch (e) {
                        Debug.warn('Error removing Paper.js object:', e);
                    }
                });

                // 完全清除并重绘Paper.js画布
                this.paperScope.project.clear();
                this.drawWorkAreaBoundary();

                // 确保Paper.js视图被更新
                this.paperScope.view.draw();

                Debug.log('Paper.js canvas display ensured');
            } else {
                Debug.log('Ensuring fallback canvas display');
                // 使用备用系统：清除画布并重绘网格
                this.drawBasicGrid();
            }
        } catch (error) {
            Debug.error('Error ensuring canvas display, falling back to basic grid:', error);
            // 如果出现任何错误，强制使用备用方法
            this.useFallback = true;
            try {
                this.drawBasicGrid();
            } catch (fallbackError) {
                Debug.error('Even fallback failed:', fallbackError);
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
        Debug.log('WorkspaceCanvas message:', message);
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
