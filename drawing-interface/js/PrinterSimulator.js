/**
 * PrinterSimulator - 3D打印机运动模拟器
 */
class PrinterSimulator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isSimulating = false;
        this.isPaused = false;
        this.currentPathIndex = 0;
        this.currentPointIndex = 0;
        
        // 打印机参数
        this.workArea = { width: 220, height: 220 }; // mm
        this.printSpeed = 30; // mm/s
        this.scale = 1.5; // 像素/mm的缩放比例
        
        // 路径数据
        this.paths = [];
        this.currentPosition = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        
        // 动画相关
        this.animationId = null;
        this.lastTime = 0;
        this.progress = 0;
        
        // 初始化p5.js
        this.initP5();
        
        // 绑定控制事件
        this.bindControls();
    }

    /**
     * 初始化p5.js实例
     */
    initP5() {
        const sketch = (p) => {
            p.setup = () => {
                const canvas = p.createCanvas(
                    this.container.clientWidth,
                    this.container.clientHeight
                );
                canvas.parent(this.container);
                
                // 设置画布样式
                p.background(250);
                p.strokeWeight(1);
                
                // 计算缩放比例以适应画布
                this.calculateScale();
            };

            p.draw = () => {
                this.draw(p);
            };

            p.windowResized = () => {
                p.resizeCanvas(this.container.clientWidth, this.container.clientHeight);
                this.calculateScale();
            };
        };

        this.p5Instance = new p5(sketch);
    }

    /**
     * 计算缩放比例
     */
    calculateScale() {
        const canvas = this.p5Instance;
        const margin = 40;
        const availableWidth = canvas.width - 2 * margin;
        const availableHeight = canvas.height - 2 * margin;
        
        this.scale = Math.min(
            availableWidth / this.workArea.width,
            availableHeight / this.workArea.height
        );
        
        // 计算工作区域在画布中的偏移
        this.offsetX = (canvas.width - this.workArea.width * this.scale) / 2;
        this.offsetY = (canvas.height - this.workArea.height * this.scale) / 2;
    }

    /**
     * 绘制函数
     */
    draw(p) {
        p.background(250);
        
        // 绘制工作区域边界
        this.drawWorkArea(p);
        
        // 绘制路径
        this.drawPaths(p);
        
        // 绘制打印头位置
        this.drawPrintHead(p);
        
        // 绘制已完成的路径
        this.drawCompletedPaths(p);
        
        // 如果正在模拟，更新动画
        if (this.isSimulating && !this.isPaused) {
            this.updateSimulation();
        }
    }

    /**
     * 绘制工作区域
     */
    drawWorkArea(p) {
        p.push();
        
        // 工作区域背景
        p.fill(255);
        p.stroke(200);
        p.strokeWeight(2);
        p.rect(
            this.offsetX,
            this.offsetY,
            this.workArea.width * this.scale,
            this.workArea.height * this.scale
        );
        
        // 绘制网格
        p.stroke(230);
        p.strokeWeight(0.5);
        
        const gridSize = 10; // 10mm网格
        for (let x = 0; x <= this.workArea.width; x += gridSize) {
            const screenX = this.offsetX + x * this.scale;
            p.line(screenX, this.offsetY, screenX, this.offsetY + this.workArea.height * this.scale);
        }
        
        for (let y = 0; y <= this.workArea.height; y += gridSize) {
            const screenY = this.offsetY + y * this.scale;
            p.line(this.offsetX, screenY, this.offsetX + this.workArea.width * this.scale, screenY);
        }
        
        // 坐标轴标签
        p.fill(100);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(10);
        
        // X轴标签
        for (let x = 0; x <= this.workArea.width; x += 50) {
            const screenX = this.offsetX + x * this.scale;
            p.text(x + 'mm', screenX, this.offsetY + this.workArea.height * this.scale + 15);
        }
        
        // Y轴标签
        for (let y = 0; y <= this.workArea.height; y += 50) {
            const screenY = this.offsetY + y * this.scale;
            p.text(y + 'mm', this.offsetX - 20, screenY);
        }
        
        p.pop();
    }

    /**
     * 绘制路径
     */
    drawPaths(p) {
        if (this.paths.length === 0) return;
        
        p.push();
        p.stroke(200);
        p.strokeWeight(1);
        p.noFill();
        
        this.paths.forEach((pathData, pathIndex) => {
            if (pathIndex > this.currentPathIndex || 
                (pathIndex === this.currentPathIndex && !this.isSimulating)) {
                
                // 未执行的路径用虚线显示
                p.drawingContext.setLineDash([5, 5]);
                p.stroke(180);
            } else {
                // 已执行的路径用实线显示
                p.drawingContext.setLineDash([]);
                p.stroke(100);
            }
            
            p.beginShape();
            pathData.points.forEach((point, index) => {
                const screenPos = this.worldToScreen(point);
                if (index === 0) {
                    p.vertex(screenPos.x, screenPos.y);
                } else {
                    p.vertex(screenPos.x, screenPos.y);
                }
            });
            p.endShape();
        });
        
        p.drawingContext.setLineDash([]);
        p.pop();
    }

    /**
     * 绘制已完成的路径
     */
    drawCompletedPaths(p) {
        if (!this.isSimulating || this.paths.length === 0) return;
        
        p.push();
        p.stroke(67, 126, 234); // 蓝色
        p.strokeWeight(2);
        p.noFill();
        
        // 绘制已完成的路径
        for (let pathIndex = 0; pathIndex < this.currentPathIndex; pathIndex++) {
            const pathData = this.paths[pathIndex];
            
            p.beginShape();
            pathData.points.forEach((point) => {
                const screenPos = this.worldToScreen(point);
                p.vertex(screenPos.x, screenPos.y);
            });
            p.endShape();
        }
        
        // 绘制当前路径的已完成部分
        if (this.currentPathIndex < this.paths.length) {
            const currentPath = this.paths[this.currentPathIndex];
            
            p.beginShape();
            for (let i = 0; i <= this.currentPointIndex; i++) {
                if (i < currentPath.points.length) {
                    const point = currentPath.points[i];
                    const screenPos = this.worldToScreen(point);
                    p.vertex(screenPos.x, screenPos.y);
                }
            }
            p.endShape();
        }
        
        p.pop();
    }

    /**
     * 绘制打印头
     */
    drawPrintHead(p) {
        const screenPos = this.worldToScreen(this.currentPosition);
        
        p.push();
        
        // 打印头主体
        p.fill(220, 50, 50);
        p.noStroke();
        p.circle(screenPos.x, screenPos.y, 12);
        
        // 打印头中心点
        p.fill(255);
        p.circle(screenPos.x, screenPos.y, 4);
        
        // 如果正在模拟，显示运动轨迹
        if (this.isSimulating && this.currentPointIndex > 0) {
            const currentPath = this.paths[this.currentPathIndex];
            if (currentPath && this.currentPointIndex < currentPath.points.length) {
                const targetPos = this.worldToScreen(currentPath.points[this.currentPointIndex]);
                
                // 绘制目标点
                p.stroke(220, 50, 50);
                p.strokeWeight(1);
                p.noFill();
                p.circle(targetPos.x, targetPos.y, 8);
                
                // 绘制运动方向线
                p.line(screenPos.x, screenPos.y, targetPos.x, targetPos.y);
            }
        }
        
        p.pop();
    }

    /**
     * 世界坐标转屏幕坐标
     */
    worldToScreen(worldPos) {
        return {
            x: this.offsetX + worldPos.x * this.scale / 10, // 假设输入是像素，转换为mm
            y: this.offsetY + worldPos.y * this.scale / 10
        };
    }

    /**
     * 屏幕坐标转世界坐标
     */
    screenToWorld(screenPos) {
        return {
            x: (screenPos.x - this.offsetX) * 10 / this.scale,
            y: (screenPos.y - this.offsetY) * 10 / this.scale
        };
    }

    /**
     * 设置路径数据
     */
    setPaths(paths) {
        this.paths = paths.map(pathData => ({
            points: pathData.points.map(p => ({ x: p.x, y: p.y })),
            length: pathData.length,
            id: pathData.id
        }));
        
        this.resetSimulation();
        this.updateEstimatedTime();
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
        
        // 移动到起始位置
        if (this.currentPathIndex < this.paths.length) {
            const firstPath = this.paths[this.currentPathIndex];
            if (firstPath.points.length > 0) {
                this.currentPosition = { ...firstPath.points[0] };
                this.currentPointIndex = 0;
            }
        }
    }

    /**
     * 暂停模拟
     */
    pauseSimulation() {
        this.isPaused = !this.isPaused;
        this.updateStatus(this.isPaused ? 'Paused' : 'Simulating...');
    }

    /**
     * 停止模拟
     */
    stopSimulation() {
        this.isSimulating = false;
        this.isPaused = false;
        this.resetSimulation();
        this.updateStatus('Stopped');
    }

    /**
     * 重置模拟
     */
    resetSimulation() {
        this.currentPathIndex = 0;
        this.currentPointIndex = 0;
        this.currentPosition = { x: 0, y: 0 };
        this.progress = 0;
        this.updateProgress();
    }

    /**
     * 更新模拟状态
     */
    updateSimulation() {
        if (this.currentPathIndex >= this.paths.length) {
            this.completeSimulation();
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // 转换为秒
        this.lastTime = currentTime;
        
        const currentPath = this.paths[this.currentPathIndex];
        if (this.currentPointIndex >= currentPath.points.length) {
            // 当前路径完成，移动到下一条路径
            this.currentPathIndex++;
            this.currentPointIndex = 0;
            return;
        }
        
        const targetPoint = currentPath.points[this.currentPointIndex];
        const dx = targetPoint.x - this.currentPosition.x;
        const dy = targetPoint.y - this.currentPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            // 到达目标点，移动到下一个点
            this.currentPosition = { ...targetPoint };
            this.currentPointIndex++;
            this.updateProgress();
        } else {
            // 向目标点移动
            const moveDistance = this.printSpeed * deltaTime * 10; // 转换为像素
            const moveRatio = Math.min(moveDistance / distance, 1);
            
            this.currentPosition.x += dx * moveRatio;
            this.currentPosition.y += dy * moveRatio;
        }
    }

    /**
     * 完成模拟
     */
    completeSimulation() {
        this.isSimulating = false;
        this.isPaused = false;
        this.progress = 100;
        this.updateStatus('Completed');
        this.updateProgress();
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
        let totalLength = 0;
        this.paths.forEach(pathData => {
            totalLength += pathData.length;
        });
        
        const estimatedSeconds = (totalLength / 10) / this.printSpeed; // 转换为mm然后计算时间
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
        }
        
        if (workWidthInput) {
            workWidthInput.addEventListener('change', (e) => {
                this.workArea.width = parseInt(e.target.value);
                this.calculateScale();
            });
        }
        
        if (workHeightInput) {
            workHeightInput.addEventListener('change', (e) => {
                this.workArea.height = parseInt(e.target.value);
                this.calculateScale();
            });
        }
    }

    /**
     * 销毁实例
     */
    destroy() {
        if (this.p5Instance) {
            this.p5Instance.remove();
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
