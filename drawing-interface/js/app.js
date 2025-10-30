/**
 * Main application - 3D robotic arm simulator
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
        
        // Wait for DOM to load before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the application
     */
    initialize() {
        try {
            Debug.log('Initializing 3D Mechanical Arm Simulator...');
            
            // Check for required DOM elements
            const canvasElement = document.getElementById('drawingCanvas');
            const clearButton = document.getElementById('clearAll');
            const simulateButton = document.getElementById('simulate');
            
            Debug.log('Canvas element:', canvasElement);
            Debug.log('Clear button:', clearButton);
            Debug.log('Simulate button:', simulateButton);
            
            if (!canvasElement) {
                throw new Error('Drawing canvas element not found');
            }
            
            // Initialize drawing canvas
            this.drawingCanvas = new DrawingCanvas('drawingCanvas');
            Debug.log('DrawingCanvas initialized:', this.drawingCanvas);
            
            // Initialize workspace canvas (robot mode)
            this.workspaceCanvas = new WorkspaceCanvas('workspaceCanvas');
            Debug.log('WorkspaceCanvas initialized:', this.workspaceCanvas);
            
            // Initialize 3D work area
            this.threeJSWorkArea = new ThreeJSWorkArea('threejsCanvas');
            
            // Robot gripper
            if (this.threeJSWorkArea && this.workspaceCanvas) {
                this.robotGripper = new RobotGripper(this.threeJSWorkArea, this.workspaceCanvas);
                Debug.log('RobotGripper initialized');
            }
            
            // Initialize image tracer
            this.imageTracer = new ImageTracer();
            
            // Initialize printer manager
            this.printerManager = new PrinterManager();
            this.setupPrinterCallbacks();
            Debug.log('PrinterManager initialized:', this.printerManager);
            
            // Set simulation completion callback
            this.threeJSWorkArea.onSimulationComplete = () => {
                Debug.log('App: Simulation completed, updating button state');
                this.onSimulationComplete();
            };
            
            // Bind UI events
            this.bindUIEvents();
            
            // Bind printer control events
            this.bindPrinterControls();
            
            // Bind workspace events
            this.bindWorkspaceEvents();
            
            // Set default state
            this.setupDefaultState();
            
            // Listen for model load completion to ensure print head visibility
            window.addEventListener('printerModelLoaded', () => {
                Debug.log('App: Printer model loaded, ensuring print head visibility');
                if (this.threeJSWorkArea.printHead) {
                    this.threeJSWorkArea.printHead.visible = true;
                    Debug.log('App: Print head visibility ensured:', this.threeJSWorkArea.printHead.visible);
                }
            });
            
            this.isInitialized = true;
            Debug.log('Initialization completed successfully!');
            
        } catch (error) {
            Debug.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Bind UI events
     */
    bindUIEvents() {
        // Tool button events
        this.bindToolButtons();
        
        // Header control button events
        this.bindHeaderControls();
        
        // Mode toggle events
        this.bindModeToggle();
        
        // Object library events
        this.bindObjectLibrary();
        
        // Image upload events
        this.bindImageUpload();
        
        // Window resize events
        this.bindWindowEvents();
        
        // Keyboard shortcuts
        this.bindKeyboardShortcuts();

        // Right panel collapse interactions
        this.bindSimSectionToggles();
    }

    /**
     * Bind tool button events
     */
    bindToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectTool(tool, e.currentTarget);
            });
        });
        
        // Bind shape selection button events
        this.bindShapeButtons();
    }

    /**
     * Bind shape selection button events
     */
    bindShapeButtons() {
        const shapeTool = document.getElementById('shapeTool');
        const shapeSelector = document.getElementById('shapeSelector');
        const shapeButtons = document.querySelectorAll('.shape-btn[data-shape]');
        
        // Shape tool button click event
        if (shapeTool) {
            shapeTool.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleShapeSelector();
            });
        }
        
        // Shape selection button events
        shapeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const shapeType = e.currentTarget.dataset.shape;
                this.selectShape(shapeType, e.currentTarget);
            });
        });
        
        // Hide shape selector when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (shapeSelector && !shapeSelector.contains(e.target) && e.target !== shapeTool) {
                shapeSelector.classList.add('hidden');
            }
        });
    }

    /**
     * Bind object shape selection button events
     */
    bindObjectShapeButtons() {
        const selectObjectTool = document.getElementById('selectObjectTool');
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        const objectShapeButtons = document.querySelectorAll('.object-shape-btn[data-object]');
        
        // Object selection tool button click event
        if (selectObjectTool) {
            selectObjectTool.addEventListener('click', (e) => {
                e.stopPropagation();
                // Ensure current tool is place-object
                this.selectRobotTool('place-object');
                this.toggleObjectShapeSelector();
            });
        }
        
        // Object shape selection button events
        objectShapeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const objectType = e.currentTarget.dataset.object;
                this.selectObjectShape(objectType, e.currentTarget);
                // Automatically switch back to place tool after selecting shape
                this.selectRobotTool('place-object');
            });
        });
        
        // Hide object shape selector when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (objectShapeSelector && !objectShapeSelector.contains(e.target) && e.target !== selectObjectTool) {
                objectShapeSelector.classList.add('hidden');
            }
        });
    }

    /**
     * Bind image upload events
     */
    bindImageUpload() {
        const imageInput = document.getElementById('imageInput');
        
        if (imageInput) {
            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    await this.handleImageUpload(file);
                    // Clear input to allow selecting the same file again
                    e.target.value = '';
                }
            });
        }
    }

    /**
     * Bind header control button events
     */
    bindHeaderControls() {
        // Clear all button
        const clearButton = document.getElementById('clearAll');
        Debug.log('Binding clear button:', clearButton);
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                Debug.log('Clear All button clicked');
                this.clearAll();
            });
        } else {
            Debug.error('Clear All button not found!');
        }
        
        // Simulate button
        const simulateButton = document.getElementById('simulate');
        Debug.log('Binding simulate button:', simulateButton);
        if (simulateButton) {
            simulateButton.addEventListener('click', () => {
                Debug.log('Simulate button clicked');
                this.toggleSimulation();
            });
        } else {
            Debug.error('Simulate button not found!');
        }
    }

    /**
     * Bind mode toggle events
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
     * Bind object library events
     */
    bindObjectLibrary() {
        // Bind robot mode tool buttons
        const robotToolButtons = document.querySelectorAll('#robotModePanel .tool-btn[data-tool]');
        robotToolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectRobotTool(tool, e.currentTarget);
            });
        });
        
        // Bind object selection button events
        this.bindObjectShapeButtons();
    }

    /**
     * Bind workspace events
     */
    bindWorkspaceEvents() {
        // Listen for workspace canvas events
        document.addEventListener('workspaceCanvas:objectPlaced', (e) => {
            Debug.log('Object placed:', e.detail);
        });

        document.addEventListener('workspaceCanvas:targetSet', (e) => {
            Debug.log('Target set:', e.detail);
        });

        document.addEventListener('workspaceCanvas:objectDeleted', (e) => {
            Debug.log('Object deleted:', e.detail);
        });

        // Listen for tool change events
        document.addEventListener('workspaceCanvas:toolChanged', (e) => {
            Debug.log('Tool changed:', e.detail);
            this.updateRobotToolButtons(e.detail.tool);
        });
    }

    /**
     * Update robot tool button states
     */
    updateRobotToolButtons(toolName) {
        // Update tool button states
        document.querySelectorAll('#robotModePanel .tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolButton = document.querySelector(`#robotModePanel [data-tool="${toolName}"]`);
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // Update current tool state
        this.currentTool = toolName;
        
        Debug.log('Robot tool buttons updated for:', toolName);
    }


    /**
     * Bind window events
     */
    bindWindowEvents() {
        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.drawingCanvas) {
                    this.drawingCanvas.resize();
                }
            }, 250);
        });
        
        // Prevent accidental page close
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore keys pressed in input fields
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
     * Handle image upload
     */
    async handleImageUpload(file) {
        try {
            this.showNotification('Processing image...', 'info', 2000);
            
            // Process image using image tracer
            const result = await this.imageTracer.processImage(file);
            
            if (result.paths && result.paths.length > 0) {
                // Add traced paths using DrawingCanvas method
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
            Debug.error('Image processing error:', error);
            this.showNotification(
                'Failed to process image. Please try a different image.', 
                'error', 
                4000
            );
        }
    }
    
    /**
     * Select tool
     */
    selectTool(toolName, buttonElement = null) {
        if (!this.drawingCanvas) return;
        
        // Update tool button states
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
        
        // Set drawing canvas tool
        this.drawingCanvas.setTool(toolName);
        
        // Update current tool state
        this.currentTool = toolName;
        
        // If image trace tool, trigger file selection
        if (toolName === 'image-trace') {
            const imageInput = document.getElementById('imageInput');
            if (imageInput) {
                imageInput.click();
            }
        }
        
        // Show tool tip
        this.showToolTip(toolName);
    }

    /**
     * Toggle shape selector visibility
     */
    toggleShapeSelector() {
        const shapeSelector = document.getElementById('shapeSelector');
        if (shapeSelector) {
            shapeSelector.classList.toggle('hidden');
        }
    }

    /**
     * Select shape
     */
    selectShape(shapeType, buttonElement = null) {
        if (!this.drawingCanvas) return;
        
        // Set current shape for drawing canvas
        this.drawingCanvas.setCurrentShape(shapeType);
        
        // Ensure shape tool is selected
        this.selectTool('shape');
        
        // Update shape button states
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
        
        // Hide shape selector
        const shapeSelector = document.getElementById('shapeSelector');
        if (shapeSelector) {
            shapeSelector.classList.add('hidden');
        }
        
        // Show shape tip
        this.showShapeTip(shapeType);
    }

    /**
     * Toggle mode
     */
    toggleMode() {
        if (this.currentMode === 'drawing') {
            this.switchToRobotMode();
        } else {
            this.switchToDrawingMode();
        }
    }

    /**
     * Switch to robot mode
     */
    switchToRobotMode() {
        this.currentMode = 'robot';
        
        // Update title
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.textContent = 'GlyphForge';
        }
        
        // Update mode toggle button
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Drawing Mode';
            // Keep white background consistent with "Robot Mode", no additional fill color styles
        }
        
        // Hide drawing panel, show robot panel
        const drawingPanel = document.getElementById('drawingModePanel');
        const robotPanel = document.getElementById('robotModePanel');
        
        if (drawingPanel) drawingPanel.classList.add('hidden');
        if (robotPanel) robotPanel.classList.remove('hidden');
        
        // Enable robot gripper
        this.robotGripper.enableRobotMode();

        // Force redraw workspace canvas
        if (this.workspaceCanvas) {
            setTimeout(() => {
                this.workspaceCanvas.resize();
            }, 50); // Brief delay to ensure container is displayed
        }
        
        // Ensure print head is visible
        if (this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
            Debug.log('Robot mode: Print head set visible');
        }
        
        // Set default robot tool
        // Default workspace tool to place-object, but don't highlight any buttons
        if (this.workspaceCanvas) {
            this.workspaceCanvas.setTool('place-object');
        }
        // Ensure tool buttons have no active style when entering robot mode
        document.querySelectorAll('#robotModePanel .tool-btn').forEach(btn => btn.classList.remove('active'));
        
        Debug.log('Switched to robot mode');
    }

    /**
     * Switch to drawing mode
     */
    switchToDrawingMode() {
        this.currentMode = 'drawing';
        
        // Update title
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.textContent = 'GlyphForge';
        }
        
        // Update mode toggle button
        const modeToggleButton = document.getElementById('modeToggle');
        if (modeToggleButton) {
            modeToggleButton.innerHTML = '<i class="fas fa-robot"></i> Robot Mode';
            modeToggleButton.classList.remove('robot-mode');
        }
        
        // Show drawing panel, hide robot panel
        const drawingPanel = document.getElementById('drawingModePanel');
        const robotPanel = document.getElementById('robotModePanel');
        
        if (drawingPanel) drawingPanel.classList.remove('hidden');
        if (robotPanel) robotPanel.classList.add('hidden');
        
        // Disable robot gripper
        this.robotGripper.disableRobotMode();
        
        // Force redraw drawing canvas
        if (this.drawingCanvas) {
            setTimeout(() => {
                this.drawingCanvas.resize();
            }, 50); // Brief delay to ensure container is displayed
        }

        // Ensure print head is visible (Drawing Mode also uses print head)
        if (this.threeJSWorkArea && this.threeJSWorkArea.printHead) {
            this.threeJSWorkArea.printHead.visible = true;
            Debug.log('Drawing mode: Print head set visible');
        }
        
        Debug.log('Switched to drawing mode');
    }

    /**
     * Select robot tool
     */
    selectRobotTool(toolName, buttonElement = null) {
        if (!this.workspaceCanvas) return;
        
        // Update tool button states
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
        
        // Set workspace canvas tool
        this.workspaceCanvas.setTool(toolName);
        
        // Update current tool state
        this.currentTool = toolName;
        
        // Show tool tip
        this.showRobotToolTip(toolName);
    }


    /**
     * Show robot tool tip
     */
    showRobotToolTip(toolName) {
        // Tooltip removed to reduce popups
    }

    /**
     * Show tool tip
     */
    showToolTip(toolName) {
        // Tooltip removed to reduce popups
    }

    /**
     * Show shape tip
     */
    showShapeTip(shapeType) {
        // Tooltip removed to reduce popups
    }

    /**
     * Toggle object shape selector visibility
     */
    toggleObjectShapeSelector() {
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        if (objectShapeSelector) {
            objectShapeSelector.classList.toggle('hidden');
        }
    }

    /**
     * Select object shape
     */
    selectObjectShape(objectType, buttonElement = null) {
        Debug.log('selectObjectShape called with:', objectType);
        Debug.log('workspaceCanvas available:', !!this.workspaceCanvas);
        
        if (!this.workspaceCanvas) return;
        
        // Set selected object type for workspace canvas
        this.workspaceCanvas.setSelectedObjectType(objectType);
        Debug.log('Object type set to WorkspaceCanvas:', objectType);
        
        // Update object shape button states
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
        
        // Hide object shape selector
        const objectShapeSelector = document.getElementById('objectShapeSelector');
        if (objectShapeSelector) {
            objectShapeSelector.classList.add('hidden');
        }
        
        // Show object tip
        this.showObjectTip(objectType);
        
        Debug.log('Selected object shape completed:', objectType);
    }

    /**
     * Show object tip
     */
    showObjectTip(objectType) {
        // Tooltip removed to reduce popups
    }

    /**
     * Clear all content
     */
    clearAll() {
        Debug.log('clearAll called, isInitialized:', this.isInitialized);
        Debug.log('currentMode:', this.currentMode);
        
        if (!this.isInitialized) {
            Debug.log('Not initialized, returning');
            return;
        }
        
        // Confirmation dialog
        const message = this.currentMode === 'robot' ? 
            'Are you sure you want to clear all objects? This action cannot be undone.' :
            'Are you sure you want to clear all paths? This action cannot be undone.';
            
        if (this.hasUnsavedChanges()) {
            if (!confirm(message)) {
                Debug.log('User cancelled clear operation');
                return;
            }
        }
        
        if (this.currentMode === 'robot') {
            // Clear robot mode content
            if (this.workspaceCanvas) {
                Debug.log('Clearing workspace canvas');
                this.workspaceCanvas.clearAll();
            }
            
            if (this.robotGripper) {
                Debug.log('Clearing robot gripper objects');
                this.robotGripper.clearObjects();
            }
        } else {
            // Clear drawing mode content
            if (this.drawingCanvas) {
                Debug.log('Clearing drawing canvas');
                this.drawingCanvas.clearAll();
            }
            
            // Stop and reset simulation
            if (this.threeJSWorkArea) {
                Debug.log('Resetting 3D work area');
                this.threeJSWorkArea.stopSimulation();
                this.threeJSWorkArea.setPaths([]);
            }
        }
        
        // Reset simulate button
        this.updateSimulateButton('simulate');
        
        Debug.log('Clear All completed');
    }

    /**
     * Toggle simulation state
     */
    toggleSimulation() {
        if (!this.isInitialized) return;
        
        // Check current button state
        const simulateButton = document.getElementById('simulate');
        const buttonText = simulateButton ? simulateButton.textContent.trim() : '';
        
        // If completed state, restart simulation
        if (buttonText === 'Completed') {
            this.startSimulation();
            return;
        }
        
        if (this.currentMode === 'robot') {
            // Robot mode pause logic
            if (this.robotGripper && this.robotGripper.isSimulating) {
                if (this.robotGripper.isPaused) {
                    // Resume simulation
                    this.robotGripper.resumeSimulation();
                    this.updateSimulateButton('pause');
                } else {
                    // Pause simulation
                    this.robotGripper.pauseSimulation();
                    this.updateSimulateButton('resume');
                }
            } else {
                // Start simulation
                this.startSimulation();
            }
        } else {
            // Drawing mode pause logic
            if (this.threeJSWorkArea && this.threeJSWorkArea.isSimulating) {
                if (this.threeJSWorkArea.isPaused) {
                    // Resume simulation
                    this.threeJSWorkArea.pauseSimulation();
                    this.updateSimulateButton('pause');
                } else {
                    // Pause simulation
                    this.threeJSWorkArea.pauseSimulation();
                    this.updateSimulateButton('resume');
                }
            } else {
                // Start simulation
                this.startSimulation();
            }
        }
    }

    /**
     * Start simulation
     */
    startSimulation() {
        Debug.log('startSimulation called, mode:', this.currentMode);
        
        if (this.currentMode === 'robot') {
            return this.startRobotSimulation();
        } else {
            return this.startDrawingSimulation();
        }
    }

    /**
     * Start drawing simulation
     */
    startDrawingSimulation() {
        Debug.log('Starting drawing simulation');
        
        if (!this.drawingCanvas || !this.threeJSWorkArea) {
            Debug.error('Required components not available');
            return;
        }
        
        // Get all paths
        const paths = this.drawingCanvas.getAllPaths();
        Debug.log('Paths retrieved:', paths);
        
        if (paths.length === 0) {
            this.showNotification('No paths to simulate. Please draw something first.', 'warning', 3000);
            return;
        }
        
        // Validate path data structure
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (!path.points || !Array.isArray(path.points)) {
                Debug.error(`Invalid path data at index ${i}:`, path);
                this.showNotification('Invalid path data detected. Please try drawing again.', 'error', 3000);
                return;
            }
        }
        
        try {
            // Set path data to 3D work area
            this.threeJSWorkArea.setPaths(paths);
            
            // Start simulation
            this.threeJSWorkArea.startSimulation();
            
            // Update button state
            this.updateSimulateButton('pause');
        } catch (error) {
            Debug.error('Error starting drawing simulation:', error);
            this.showNotification('Failed to start simulation: ' + error.message, 'error', 4000);
        }
    }

    /**
     * Start robot simulation
     */
    startRobotSimulation() {
        Debug.log('Starting robot simulation');
        
        if (!this.workspaceCanvas || !this.robotGripper) {
            Debug.error('Required robot components not available');
            return;
        }
        
        // Get all objects
        const objects = this.workspaceCanvas.getAllObjects();
        Debug.log('Objects retrieved:', objects);
        
        if (objects.length === 0) {
            this.showNotification('No objects to simulate. Please place objects first.', 'warning', 3000);
            return;
        }
        
        // Check if there are target positions
        const objectsWithTargets = objects.filter(obj => obj.targetPosition);
        if (objectsWithTargets.length === 0) {
            this.showNotification('No target positions set. Please set target positions for objects.', 'warning', 3000);
            return;
        }
        
        try {
            // Set object data to robot gripper
            this.robotGripper.setObjects(objects);
            
            // Start robot simulation
            this.robotGripper.startRobotSimulation();
            
            // Update button state
            this.updateSimulateButton('pause');
        } catch (error) {
            Debug.error('Error starting robot simulation:', error);
            this.showNotification('Failed to start robot simulation: ' + error.message, 'error', 4000);
        }
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        if (this.threeJSWorkArea) {
            this.threeJSWorkArea.stopSimulation();
            this.updateSimulateButton('simulate');
        }
    }

    /**
     * Simulation completion callback
     */
    onSimulationComplete() {
        Debug.log('App: Setting button to completed state');
        this.updateSimulateButton('completed');
    }

    /**
     * Update simulate button state
     */
    updateSimulateButton(state) {
        const simulateButton = document.getElementById('simulate');
        if (!simulateButton) {
            Debug.log('App: simulate button not found!');
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
        
        // Update button content
        simulateButton.innerHTML = `<i class="fas ${config.icon}"></i> ${config.text}`;
        
        // Update button style
        simulateButton.className = `btn ${config.class}`;
        
        // Force redraw
        simulateButton.style.display = 'none';
        simulateButton.offsetHeight; // Trigger reflow
        simulateButton.style.display = '';
        
        Debug.log(`App: Button updated to "${config.text}" with class "${config.class}"`);
    }

    /**
     * Set default state
     */
    setupDefaultState() {
        // Default tool remains freehand, but don't highlight any buttons
        if (this.drawingCanvas) {
            this.drawingCanvas.setTool('freehand');
        }
        
        // Set default shape and activate first shape button
        this.drawingCanvas.setCurrentShape('circle');
        const firstShapeButton = document.querySelector('.shape-btn[data-shape="circle"]');
        if (firstShapeButton) {
            firstShapeButton.classList.add('active');
        }
        
        // Set fixed smoothing preset value (35%)
        this.drawingCanvas.setSmoothingFactor(35);
        
        // Set default object type (robot mode)
        this.selectObjectShape('cube');
        const firstObjectButton = document.querySelector('.object-shape-btn[data-object="cube"]');
        if (firstObjectButton) {
            firstObjectButton.classList.add('active');
        }
        
        // Initialize printer status display
        const printerStatus = document.querySelector('.printer-status');
        if (printerStatus) {
            printerStatus.classList.remove('active'); // Hide printer status by default
        }
        
        // Ensure simulation controls are visible by default
        const simCanvas = document.querySelector('.sim-canvas-container');
        const simInfo = document.querySelector('.sim-info');
        if (simCanvas) simCanvas.classList.remove('hidden');
        if (simInfo) simInfo.classList.remove('hidden');
        
        // Set initial state of Real Print button (default to simulate mode)
        this.updateRealPrintToggleButton();
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        if (this.currentMode === 'robot') {
            return this.workspaceCanvas && this.workspaceCanvas.objects.length > 0;
        } else {
            return this.drawingCanvas && this.drawingCanvas.paths.length > 0;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Initialize notification manager (if not already initialized)
        if (!this.notifications) {
            this.notifications = [];
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add style class
        notification.className = `notification notification-${type}`;

        // Add to page
        document.body.appendChild(notification);

        // Add notification to manager
        this.notifications.push(notification);

        // Calculate notification position and trigger animation
        this.updateNotificationPositions();
        this.animateNotificationIn(notification);

        // Auto remove
        const removeNotification = () => {
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
                // Smoothly move other notifications first, then remove current notification
                this.animateNotificationRemoval(notification, index);
            } else {
                // If notification not in array, remove directly
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
     * Update all notification positions to stack them vertically
     */
    updateNotificationPositions() {
        const notificationHeight = 70; // Notification height (including spacing), increased spacing makes stacking more obvious
        const startTop = 20; // Top position of first notification

        this.notifications.forEach((notification, index) => {
            const topPosition = startTop + (index * notificationHeight);
            const currentTop = parseFloat(notification.style.top) || topPosition;

            // If position difference is large, use animation transition
            if (Math.abs(currentTop - topPosition) > 1) {
                notification.style.transition = 'top 0.3s ease-out';
                notification.style.top = `${topPosition}px`;
            } else {
                notification.style.top = `${topPosition}px`;
            }
        });
    }

    /**
     * Trigger animation to slide notification into position
     */
    animateNotificationIn(notification) {
        // Set initial state (transparent and slightly upward)
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';

        // Trigger animation
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
    }

    /**
     * Animate notification removal, smoothly fade out from top to bottom
     */
    animateNotificationRemoval(notification, originalIndex) {
        const notificationHeight = 70;
        const startTop = 20;

        // Move other notifications to correct positions first
        this.notifications.forEach((otherNotification, index) => {
            if (index >= originalIndex) { // Only move notifications below the disappearing one
                const targetTop = startTop + (index * notificationHeight);
                const currentTop = parseFloat(otherNotification.style.top) || startTop;

                if (Math.abs(currentTop - targetTop) > 1) { // Only need animation if position difference is large
                    otherNotification.style.transition = 'top 0.3s ease-out';
                    otherNotification.style.top = `${targetTop}px`;
                }
            }
        });

        // Simultaneously make current notification disappear
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
     * Get notification icon
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
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error', 5000);
    }

    /**
     * Set printer manager callback functions
     */
    setupPrinterCallbacks() {
        if (!this.printerManager) return;
        
        // Connection state change callback
        this.printerManager.onConnectionChange = (connected) => {
            this.updateConnectionStatus(connected);
        };
        
        // Print status change callback
        this.printerManager.onPrintStatusChange = (printing) => {
            this.updatePrintStatus(printing);
        };
        
        // Error callback
        this.printerManager.onError = (error) => {
            this.showNotification(error, 'error', 4000);
        };
    }

    /**
     * Bind printer control events
     */
    bindPrinterControls() {
        // Real Print mode toggle button
        const realPrintToggle = document.getElementById('realPrintToggle');
        if (realPrintToggle) {
            realPrintToggle.addEventListener('click', () => {
                // Toggle between simulate and real
                const newMode = this.printMode === 'simulate' ? 'real' : 'simulate';
                this.printMode = newMode;
                this.onPrintModeChange(newMode);
                this.updateRealPrintToggleButton();
            });
        }
        
        // Connect button
        const connectBtn = document.getElementById('connectPrinter');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectPrinter();
            });
        }
        
        // Disconnect button
        const disconnectBtn = document.getElementById('disconnectPrinter');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectPrinter();
            });
        }
        
        // Start print button
        const startPrintBtn = document.getElementById('startRealPrint');
        if (startPrintBtn) {
            startPrintBtn.addEventListener('click', () => {
                this.startRealPrint();
            });
        }
        
        // Stop print button
        const stopPrintBtn = document.getElementById('stopRealPrint');
        if (stopPrintBtn) {
            stopPrintBtn.addEventListener('click', () => {
                this.stopRealPrint();
            });
        }
        
        Debug.log('Printer controls bound');
    }

    /**
     * Update Real Print toggle button state
     */
    updateRealPrintToggleButton() {
        const realPrintToggle = document.getElementById('realPrintToggle');
        if (!realPrintToggle) return;
        
        if (this.printMode === 'real') {
            // Real Print mode active
            realPrintToggle.classList.add('active');
            realPrintToggle.title = 'Switch to Simulate';
        } else {
            // Simulate mode
            realPrintToggle.classList.remove('active');
            realPrintToggle.title = 'Real Print';
        }
    }

    /**
     * Bind right panel collapse button interactions
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
                    // Click same button again -> collapse
                    this.toggleSimSection(key, false, buttons, sectionMap);
                } else {
                    // Open this group and collapse others
                    Object.keys(sectionMap).forEach(k => {
                        this.toggleSimSection(k, k === key, buttons, sectionMap);
                    });
                }
            });
        });
    }

    /**
     * Expand/collapse specific group and update button active state
     */
    toggleSimSection(key, open, buttons, sectionMap) {
        const section = sectionMap[key];
        if (!section) return;
        if (open) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
        // Update button active state
        buttons.forEach(b => {
            if (b.dataset.section === key) {
                if (open) b.classList.add('active'); else b.classList.remove('active');
            } else {
                // Other buttons update based on whether their group is open
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
     * Print mode change handler
     */
    async onPrintModeChange(mode) {
        Debug.log('Print mode changed to:', mode);
        this.printMode = mode;
        
        const printerControls = document.querySelectorAll('.printer-controls');
        const printerStatus = document.querySelector('.printer-status');
        const simCanvas = document.querySelector('.sim-canvas-container');
        const simInfo = document.querySelector('.sim-info');
        const simOnlyControls = document.querySelectorAll('.sim-only-control');
        const stepper = document.getElementById('realPrintStepper');
        
        // Get Print Speed and Work Area buttons
        const printSpeedBtn = document.getElementById('simSectionSpeed');
        const workAreaBtn = document.getElementById('simSectionWorkArea');
        
        if (mode === 'real') {
            // Show printer controls
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
                Debug.error('Failed to load Ender 3 config:', error);
            }

            // Hide 3D simulation related elements
            if (simCanvas) {
                simCanvas.classList.add('hidden');
            }
            if (simInfo) {
                simInfo.classList.add('hidden');
            }
            simOnlyControls.forEach(control => {
                control.classList.add('hidden');
            });

            // Collapse speed group and work area group in real print mode
            const sectionMap = {
                'print-speed': document.getElementById('section-print-speed'),
                'work-area': document.getElementById('section-work-area')
            };
            if (sectionMap['print-speed']) sectionMap['print-speed'].classList.add('hidden');
            if (sectionMap['work-area']) sectionMap['work-area'].classList.add('hidden');
            
            // Disable Print Speed and Work Area buttons
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

            // Stepper state: Mode completed, others reset
            if (stepper) {
                this.updateStepper({ modeCompleted: true, modelCompleted: false, connected: false, printing: false });
            }
        } else {
            // Hide printer controls
            printerControls.forEach(control => {
                control.classList.remove('active');
            });
            if (printerStatus) {
                printerStatus.classList.remove('active');
            }
            
            // Show 3D simulation related elements
            if (simCanvas) {
                simCanvas.classList.remove('hidden');
            }
            if (simInfo) {
                simInfo.classList.remove('hidden');
            }
            
            // Restore simulation control display, but keep collapsed sections hidden
            simOnlyControls.forEach(control => {
                // Only remove hidden class from non-sim-section elements
                // sim-section should remain collapsed, controlled by user button clicks
                if (!control.classList.contains('sim-section')) {
                    control.classList.remove('hidden');
                }
            });

            // Ensure all collapsed sim-sections remain hidden
            const sectionMap = {
                'print-speed': document.getElementById('section-print-speed'),
                'work-area': document.getElementById('section-work-area')
            };
            // Keep all sections hidden, let user control via toolbar buttons
            Object.values(sectionMap).forEach(section => {
                if (section) {
                    section.classList.add('hidden');
                }
            });
            // Remove active state from all section buttons
            document.querySelectorAll('.sim-section-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Enable Print Speed and Work Area buttons
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

            // Clear Stepper state
            if (stepper) {
                this.updateStepper({ modeCompleted: false, modelCompleted: false, connected: false, printing: false });
            }
        }
    }

    /**
     * Printer model selection handler
     */
    async onPrinterSelect() {
        return this.printerManager.loadPrinterConfig();
    }

    /**
     * Connect printer
     */
    async connectPrinter() {
        if (!this.printerManager) {
            this.showNotification('Printer manager not initialized', 'error', 3000);
            return;
        }
        
        try {
            this.updateConnectionStatus('connecting');
            await this.printerManager.connectPrinter();
            // Status will be updated via callback
        } catch (error) {
            Debug.error('Connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    /**
     * Disconnect printer
     */
    async disconnectPrinter() {
        if (!this.printerManager) return;
        
        try {
            await this.printerManager.disconnectPrinter();
        } catch (error) {
            Debug.error('Disconnect failed:', error);
        }
    }

    /**
     * Start real print
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
                // Drawing Mode - print paths
                const paths = this.drawingCanvas.getAllPaths();
                
                if (paths.length === 0) {
                    this.showNotification('No paths to print', 'warning', 3000);
                    return;
                }
                
                // Preview G-code (optional)
                const gcode = this.printerManager.previewGcode(paths, workArea, 'drawing');
                
                // Confirm print
                if (confirm(`Ready to print ${paths.length} path(s).\n\nPlease confirm:\n1. Printer is homed correctly\n2. Print bed is clean\n3. No obstacles\n\nStart printing?`)) {
                    await this.printerManager.startDrawingPrint(paths, workArea);
                }
                
            } else {
                // Robot Mode - execute robot operations
                const objects = this.workspaceCanvas.getAllObjects();
                
                const objectsWithTargets = objects.filter(obj => obj.targetPosition);
                if (objectsWithTargets.length === 0) {
                    this.showNotification('No objects with target positions', 'warning', 3000);
                    return;
                }
                
                // Preview G-code (optional)
                const gcode = this.printerManager.previewGcode(objects, workArea, 'robot');
                
                // Confirm print
                if (confirm(`Ready to execute ${objectsWithTargets.length} object operation(s).\n\nPlease confirm:\n1. Printer is homed correctly\n2. Work area is clear\n3. No obstacles\n\nStart operation?`)) {
                    await this.printerManager.startRobotPrint(objects, workArea);
                }
            }
            
        } catch (error) {
            Debug.error('Failed to start print:', error);
            this.showNotification('Print failed: ' + error.message, 'error', 4000);
        }
    }

    /**
     * Stop real print
     */
    stopRealPrint() {
        if (!this.printerManager) return;
        
        if (confirm('Stop printing?')) {
            this.printerManager.stopPrint();
        }
    }

    /**
     * Update connection status display
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
            // Stepper: connection step activated
            this.updateStepper({ connected: 'connecting' });
        } else if (status === true) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'status-connected';
            if (connectBtn) connectBtn.disabled = true;
            if (disconnectBtn) disconnectBtn.disabled = false;
            if (startPrintBtn) startPrintBtn.disabled = false;
            // Stepper: connection completed
            this.updateStepper({ connected: true });
        } else {
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'status-disconnected';
            if (connectBtn) connectBtn.disabled = false;
            if (disconnectBtn) disconnectBtn.disabled = true;
            if (startPrintBtn) startPrintBtn.disabled = true;
            if (stopPrintBtn) stopPrintBtn.disabled = true;
            // Stepper: connection and print status reset
            this.updateStepper({ connected: false, printing: false });
        }
    }

    /**
     * Update print status display
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
            // Stepper: print step activated
            this.updateStepper({ printing: true });
        } else {
            statusElement.textContent = 'Ready';
            statusElement.className = '';
            if (startPrintBtn) startPrintBtn.disabled = false;
            if (stopPrintBtn) stopPrintBtn.disabled = true;
            // Stepper: print step reset to inactive
            this.updateStepper({ printing: false });
        }
    }

    /**
     * Update Real Print stepper
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

        // In simulate mode, stepper may not exist
        if (!stepMode || !stepModel || !stepConnect || !stepPrint) return;

        // Read and merge state (preserve previous completed state to avoid accidental clearing)
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
            // If not completed, only activate first step
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
     * Destroy application
     */
    destroy() {
        if (this.drawingCanvas) {
            // Paper.js will clean up automatically
        }
        
        if (this.threeJSWorkArea) {
            this.threeJSWorkArea.destroy();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        document.removeEventListener('keydown', this.handleKeydown);
    }
}

// Create global application instance
const app = new MechanicalArmSimulator();

// Export to global scope (for debugging)
window.MechanicalArmSimulator = MechanicalArmSimulator;
window.app = app;

// Export debug functions
window.debugRobotGripper = function() {
    if (window.app && window.app.robotGripper) {
        window.app.robotGripper.debugSceneObjects();
    } else {
        Debug.error('RobotGripper not found. Make sure app is initialized.');
        Debug.log('App:', window.app);
        Debug.log('RobotGripper:', window.app?.robotGripper);
    }
};

window.debugScene = function() {
    if (window.app && window.app.threeJSWorkArea) {
        const scene = window.app.threeJSWorkArea.scene;
        Debug.log('=== Scene Children ===');
        scene.children.forEach((child, i) => {
            Debug.log(`${i}:`, child.type, child.name, 'visible:', child.visible);
        });
        Debug.log('Print Head:', window.app.threeJSWorkArea.printHead);
        Debug.log('Print Bed:', window.app.threeJSWorkArea.printBed);
    }
};

Debug.log('Debug functions available:');
Debug.log('  debugRobotGripper() - Debug robot gripper and scene');
Debug.log('  debugScene() - Quick scene overview');
