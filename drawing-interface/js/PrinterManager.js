/**
 * PrinterManager - 打印机连接和控制管理器
 * 基于p5.fab库实现与3D打印机的串口通信
 */
class PrinterManager {
    constructor() {
        this.fab = null;
        this.isConnected = false;
        this.isPrinting = false;
        this.currentConfig = null;
        this.printerType = 'ender3-pro';
        
        // 回调函数
        this.onConnectionChange = null;
        this.onPrintStatusChange = null;
        this.onError = null;
        
        console.log('PrinterManager initialized');
    }

    /**
     * 初始化p5.fab实例
     */
    async initializeFab() {
        try {
            // 创建一个隐藏的p5实例用于p5.fab
            if (!window._p5FabInstance) {
                window._p5FabInstance = new p5(function(sketch) {
                    sketch.setup = function() {
                        sketch.noCanvas();
                    };
                });
            }
            
            // 使用p5实例的方法创建fab
            if (typeof window._p5FabInstance.createFab === 'function') {
                this.fab = window._p5FabInstance.createFab();
                console.log('p5.fab instance created:', this.fab);
                return true;
            } else {
                console.error('createFab function not available');
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize p5.fab:', error);
            if (this.onError) {
                this.onError('Failed to initialize printer library: ' + error.message);
            }
            return false;
        }
    }

    /**
     * 加载打印机配置
     */
    async loadPrinterConfig(printerType) {
        try {
            const response = await fetch(`printers/${printerType}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load printer config: ${response.statusText}`);
            }
            const config = await response.json();
            this.currentConfig = config;
            this.printerType = printerType;
            
            console.log('Printer config loaded:', config);
            
            // 如果fab已经初始化，更新配置
            if (this.fab && this.fab.configure) {
                this.fab.configure(config);
            }
            
            return config;
        } catch (error) {
            console.error('Failed to load printer config:', error);
            if (this.onError) {
                this.onError('Failed to load printer config: ' + error.message);
            }
            throw error;
        }
    }

    /**
     * 连接打印机
     */
    async connectPrinter() {
        try {
            console.log('Attempting to connect printer...');
            
            // 初始化fab（如果还未初始化）
            if (!this.fab) {
                const initialized = await this.initializeFab();
                if (!initialized) {
                    throw new Error('Failed to initialize p5.fab');
                }
            }
            
            // 加载当前打印机配置（如果还未加载）
            if (!this.currentConfig) {
                await this.loadPrinterConfig(this.printerType);
            }
            
            // 请求串口连接
            if (this.fab && this.fab.serial) {
                // 设置串口事件监听
                this.fab.serial.on('open', () => {
                    console.log('Serial port opened');
                    this.isConnected = true;
                    if (this.onConnectionChange) {
                        this.onConnectionChange(true);
                    }
                });
                
                this.fab.serial.on('close', () => {
                    console.log('Serial port closed');
                    this.isConnected = false;
                    if (this.onConnectionChange) {
                        this.onConnectionChange(false);
                    }
                });
                
                this.fab.serial.on('error', (error) => {
                    console.error('Serial error:', error);
                    if (this.onError) {
                        this.onError('Serial error: ' + error);
                    }
                });
                
                // 请求用户选择串口
                await this.fab.serial.requestPort();
                console.log('Printer connection requested');
            } else {
                throw new Error('Serial interface not available');
            }
            
        } catch (error) {
            console.error('Failed to connect printer:', error);
            if (this.onError) {
                this.onError('Failed to connect printer: ' + error.message);
            }
            throw error;
        }
    }

    /**
     * 断开打印机连接
     */
    async disconnectPrinter() {
        try {
            if (this.fab && this.fab.serial && this.isConnected) {
                await this.fab.serial.close();
                this.isConnected = false;
                console.log('Printer disconnected');
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
            }
        } catch (error) {
            console.error('Failed to disconnect printer:', error);
            if (this.onError) {
                this.onError('Failed to disconnect: ' + error.message);
            }
        }
    }

    /**
     * 将Paper.js路径转换为G-code（Drawing Mode）
     */
    pathsToGcode(paths, workArea) {
        if (!paths || paths.length === 0) {
            console.warn('No paths to convert to G-code');
            return '';
        }
        
        const gcodeLines = [];
        const config = this.currentConfig || {
            maxX: 220,
            maxY: 220,
            maxZ: 250
        };
        
        // 起始G-code
        gcodeLines.push('; Generated by GlyphForge Drawing Interface');
        gcodeLines.push('; Printer: ' + (config.name || 'Unknown'));
        gcodeLines.push('');
        
        // 初始化命令
        gcodeLines.push('G21 ; Set units to millimeters');
        gcodeLines.push('G90 ; Use absolute positioning');
        gcodeLines.push('M82 ; Set extruder to absolute mode');
        gcodeLines.push('');
        
        // 归零
        gcodeLines.push('G28 ; Home all axes');
        gcodeLines.push('G92 E0 ; Reset extruder position');
        gcodeLines.push('');
        
        // 加热（可选，用户可以根据需要调整）
        gcodeLines.push('; M109 S200 ; Heat nozzle to 200C and wait');
        gcodeLines.push('; M190 S60 ; Heat bed to 60C and wait');
        gcodeLines.push('');
        
        // 设置绘图高度（Z轴固定高度）
        const drawHeight = 2; // 2mm高度进行"绘图"
        gcodeLines.push(`G0 Z${drawHeight} F3000 ; Move to drawing height`);
        gcodeLines.push('');
        
        // 转换每条路径
        const workWidth = workArea.width || config.maxX;
        const workHeight = workArea.height || config.maxY;
        
        paths.forEach((pathData, pathIndex) => {
            gcodeLines.push(`; Path ${pathIndex + 1}`);
            
            if (!pathData.points || pathData.points.length === 0) {
                return;
            }
            
            // 移动到路径起点（不挤出）
            const firstPoint = pathData.points[0];
            const startX = this.canvasToPrinterX(firstPoint.x, workWidth, config.maxX);
            const startY = this.canvasToPrinterY(firstPoint.y, workHeight, config.maxY);
            
            gcodeLines.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} F3000 ; Move to start`);
            
            // 沿路径移动
            for (let i = 1; i < pathData.points.length; i++) {
                const point = pathData.points[i];
                const x = this.canvasToPrinterX(point.x, workWidth, config.maxX);
                const y = this.canvasToPrinterY(point.y, workHeight, config.maxY);
                
                // 检查边界
                if (x < 0 || x > config.maxX || y < 0 || y > config.maxY) {
                    console.warn(`Point out of bounds: (${x}, ${y})`);
                    continue;
                }
                
                gcodeLines.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} F1500 ; Draw`);
            }
            
            // 抬起笔（可选）
            gcodeLines.push(`G0 Z${drawHeight + 2} F3000 ; Lift pen`);
            gcodeLines.push('');
        });
        
        // 结束G-code
        gcodeLines.push('; End of drawing');
        gcodeLines.push('G0 Z50 F3000 ; Raise Z');
        gcodeLines.push('G28 X Y ; Home X and Y');
        gcodeLines.push('M84 ; Disable motors');
        gcodeLines.push('');
        
        return gcodeLines.join('\n');
    }

    /**
     * 将机器人物体操作转换为G-code（Robot Mode）
     */
    robotOperationsToGcode(objects, workArea) {
        if (!objects || objects.length === 0) {
            console.warn('No robot operations to convert to G-code');
            return '';
        }
        
        const gcodeLines = [];
        const config = this.currentConfig || {
            maxX: 220,
            maxY: 220,
            maxZ: 250
        };
        
        // 起始G-code
        gcodeLines.push('; Generated by GlyphForge Robot Interface');
        gcodeLines.push('; Printer: ' + (config.name || 'Unknown'));
        gcodeLines.push('');
        
        // 初始化
        gcodeLines.push('G21 ; Set units to millimeters');
        gcodeLines.push('G90 ; Use absolute positioning');
        gcodeLines.push('G28 ; Home all axes');
        gcodeLines.push('');
        
        // 安全高度
        const safeHeight = 50;
        const pickHeight = 5;
        const placeHeight = 5;
        
        // 处理每个有目标位置的物体
        const objectsWithTargets = objects.filter(obj => obj.targetPosition);
        
        objectsWithTargets.forEach((obj, index) => {
            gcodeLines.push(`; Object ${index + 1}: ${obj.type || 'unknown'}`);
            
            // 转换坐标
            const startX = this.canvasToPrinterX(obj.position.x, workArea.width, config.maxX);
            const startY = this.canvasToPrinterY(obj.position.y, workArea.height, config.maxY);
            const endX = this.canvasToPrinterX(obj.targetPosition.x, workArea.width, config.maxX);
            const endY = this.canvasToPrinterY(obj.targetPosition.y, workArea.height, config.maxY);
            
            // 移动到起始位置上方
            gcodeLines.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${safeHeight} F3000`);
            gcodeLines.push(`; Move to pick position`);
            
            // 下降到抓取高度
            gcodeLines.push(`G0 Z${pickHeight} F1000`);
            gcodeLines.push('G4 P500 ; Pause 500ms');
            
            // 抓取（这里用注释表示，实际需要机械手控制）
            gcodeLines.push('; [GRIP] Close gripper to pick object');
            gcodeLines.push('G4 P500 ; Pause 500ms');
            
            // 提升到安全高度
            gcodeLines.push(`G0 Z${safeHeight} F1000`);
            
            // 移动到目标位置上方
            gcodeLines.push(`G0 X${endX.toFixed(3)} Y${endY.toFixed(3)} Z${safeHeight} F3000`);
            gcodeLines.push(`; Move to place position`);
            
            // 下降到放置高度
            gcodeLines.push(`G0 Z${placeHeight} F1000`);
            gcodeLines.push('G4 P500 ; Pause 500ms');
            
            // 释放（这里用注释表示）
            gcodeLines.push('; [RELEASE] Open gripper to place object');
            gcodeLines.push('G4 P500 ; Pause 500ms');
            
            // 返回安全高度
            gcodeLines.push(`G0 Z${safeHeight} F1000`);
            gcodeLines.push('');
        });
        
        // 结束
        gcodeLines.push('; End of robot operations');
        gcodeLines.push('G28 X Y ; Home X and Y');
        gcodeLines.push('M84 ; Disable motors');
        gcodeLines.push('');
        
        return gcodeLines.join('\n');
    }

    /**
     * 坐标转换：画布X -> 打印机X
     */
    canvasToPrinterX(canvasX, canvasWidth, printerMaxX) {
        // 画布坐标通常是从左上角(0,0)开始
        // 打印机坐标通常是从左下角(0,0)开始
        // 简单的比例转换
        return (canvasX / canvasWidth) * printerMaxX;
    }

    /**
     * 坐标转换：画布Y -> 打印机Y
     */
    canvasToPrinterY(canvasY, canvasHeight, printerMaxY) {
        // Y轴需要反转（画布Y向下增长，打印机Y向上增长）
        return printerMaxY - (canvasY / canvasHeight) * printerMaxY;
    }

    /**
     * 开始打印（Drawing Mode）
     */
    async startDrawingPrint(paths, workArea) {
        if (!this.isConnected) {
            throw new Error('Printer not connected');
        }
        
        if (!paths || paths.length === 0) {
            throw new Error('No paths to print');
        }
        
        try {
            console.log('Starting drawing print...');
            
            // 生成G-code
            const gcode = this.pathsToGcode(paths, workArea);
            console.log('Generated G-code:', gcode);
            
            // 发送G-code到打印机
            if (this.fab) {
                // 将G-code分解为命令并添加到fab
                const commands = gcode.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && !trimmed.startsWith(';');
                });
                
                // 清空之前的命令
                this.fab.commands = [];
                
                // 添加新命令
                commands.forEach(cmd => {
                    this.fab.add(cmd);
                });
                
                // 开始打印
                this.isPrinting = true;
                if (this.onPrintStatusChange) {
                    this.onPrintStatusChange(true);
                }
                
                this.fab.print();
                console.log('Print started');
            }
            
        } catch (error) {
            console.error('Failed to start print:', error);
            if (this.onError) {
                this.onError('Print failed: ' + error.message);
            }
            throw error;
        }
    }

    /**
     * 开始打印（Robot Mode）
     */
    async startRobotPrint(objects, workArea) {
        if (!this.isConnected) {
            throw new Error('Printer not connected');
        }
        
        if (!objects || objects.length === 0) {
            throw new Error('No objects to operate');
        }
        
        try {
            console.log('Starting robot print...');
            
            // 生成G-code
            const gcode = this.robotOperationsToGcode(objects, workArea);
            console.log('Generated G-code:', gcode);
            
            // 发送G-code到打印机
            if (this.fab) {
                const commands = gcode.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && !trimmed.startsWith(';');
                });
                
                this.fab.commands = [];
                commands.forEach(cmd => {
                    this.fab.add(cmd);
                });
                
                this.isPrinting = true;
                if (this.onPrintStatusChange) {
                    this.onPrintStatusChange(true);
                }
                
                this.fab.print();
                console.log('Robot print started');
            }
            
        } catch (error) {
            console.error('Failed to start robot print:', error);
            if (this.onError) {
                this.onError('Robot print failed: ' + error.message);
            }
            throw error;
        }
    }

    /**
     * 停止打印
     */
    stopPrint() {
        try {
            if (this.fab && this.fab.stopPrint) {
                this.fab.stopPrint();
                this.isPrinting = false;
                
                if (this.onPrintStatusChange) {
                    this.onPrintStatusChange(false);
                }
                
                console.log('Print stopped');
            }
        } catch (error) {
            console.error('Failed to stop print:', error);
            if (this.onError) {
                this.onError('Failed to stop print: ' + error.message);
            }
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            printing: this.isPrinting,
            printerType: this.printerType,
            config: this.currentConfig
        };
    }

    /**
     * 预览G-code（不发送到打印机）
     */
    previewGcode(paths, workArea, mode = 'drawing') {
        let gcode;
        if (mode === 'drawing') {
            gcode = this.pathsToGcode(paths, workArea);
        } else {
            gcode = this.robotOperationsToGcode(paths, workArea);
        }
        
        console.log('=== G-code Preview ===');
        console.log(gcode);
        console.log('=== End Preview ===');
        
        return gcode;
    }
}

