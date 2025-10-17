/**
 * ImageTracer - 图片轮廓追踪功能
 */
class ImageTracer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.imageData = null;
        this.tracedPaths = [];
        
        // 追踪参数
        this.threshold = 128; // 二值化阈值
        this.minPathLength = 10; // 最小路径长度
        this.simplifyTolerance = 1.5; // 路径简化容差
        
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        // 创建隐藏的canvas用于图像处理
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    /**
     * 处理图片文件
     * @param {File} file - 图片文件
     * @returns {Promise} - 返回追踪结果
     */
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        // 调整图片尺寸
                        const maxSize = 400;
                        const { width, height } = this.calculateSize(img.width, img.height, maxSize);
                        
                        // 设置canvas尺寸
                        this.canvas.width = width;
                        this.canvas.height = height;
                        
                        // 绘制图片到canvas
                        this.ctx.drawImage(img, 0, 0, width, height);
                        
                        // 获取图像数据
                        this.imageData = this.ctx.getImageData(0, 0, width, height);
                        
                        // 执行轮廓追踪
                        const paths = this.traceOutline();
                        
                        resolve({
                            paths: paths,
                            width: width,
                            height: height,
                            originalWidth: img.width,
                            originalHeight: img.height
                        });
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * 计算合适的图片尺寸
     */
    calculateSize(originalWidth, originalHeight, maxSize) {
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }
    
    /**
     * 轮廓追踪主函数
     */
    traceOutline() {
        if (!this.imageData) return [];
        
        // 转换为灰度图
        const grayData = this.convertToGrayscale();
        
        // 边缘检测
        const edgeData = this.detectEdges(grayData);
        
        // 轮廓跟踪
        const contours = this.findContours(edgeData);
        
        // 转换为路径
        const paths = this.contoursToPath(contours);
        
        return paths;
    }
    
    /**
     * 转换为灰度图
     */
    convertToGrayscale() {
        const data = this.imageData.data;
        const width = this.imageData.width;
        const height = this.imageData.height;
        const grayData = new Uint8Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 使用加权平均转换为灰度
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayData[i / 4] = gray;
        }
        
        return grayData;
    }
    
    /**
     * Sobel边缘检测
     */
    detectEdges(grayData) {
        const width = this.imageData.width;
        const height = this.imageData.height;
        const edgeData = new Uint8Array(width * height);
        
        // Sobel算子
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let pixelX = 0;
                let pixelY = 0;
                
                // 应用Sobel算子
                for (let i = 0; i < 9; i++) {
                    const offsetX = (i % 3) - 1;
                    const offsetY = Math.floor(i / 3) - 1;
                    const pixelIndex = (y + offsetY) * width + (x + offsetX);
                    
                    pixelX += grayData[pixelIndex] * sobelX[i];
                    pixelY += grayData[pixelIndex] * sobelY[i];
                }
                
                // 计算梯度幅度
                const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                edgeData[y * width + x] = magnitude > this.threshold ? 255 : 0;
            }
        }
        
        return edgeData;
    }
    
    /**
     * 查找轮廓
     */
    findContours(edgeData) {
        const width = this.imageData.width;
        const height = this.imageData.height;
        const visited = new Array(width * height).fill(false);
        const contours = [];
        
        // 8-连通性方向
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                
                if (edgeData[index] === 255 && !visited[index]) {
                    const contour = this.traceContour(x, y, edgeData, visited, directions, width, height);
                    
                    if (contour.length > this.minPathLength) {
                        contours.push(contour);
                    }
                }
            }
        }
        
        return contours;
    }
    
    /**
     * 追踪单个轮廓
     */
    traceContour(startX, startY, edgeData, visited, directions, width, height) {
        const contour = [];
        const stack = [[startX, startY]];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const index = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height || 
                visited[index] || edgeData[index] !== 255) {
                continue;
            }
            
            visited[index] = true;
            contour.push([x, y]);
            
            // 检查8个邻居
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const nIndex = ny * width + nx;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                    !visited[nIndex] && edgeData[nIndex] === 255) {
                    stack.push([nx, ny]);
                }
            }
        }
        
        return contour;
    }
    
    /**
     * 将轮廓转换为路径
     */
    contoursToPath(contours) {
        const paths = [];
        
        for (const contour of contours) {
            if (contour.length < 3) continue;
            
            // 简化路径
            const simplifiedContour = this.simplifyPath(contour);
            
            if (simplifiedContour.length >= 3) {
                paths.push(simplifiedContour);
            }
        }
        
        return paths;
    }
    
    /**
     * 道格拉斯-普克算法简化路径
     */
    simplifyPath(points) {
        if (points.length <= 2) return points;
        
        return this.douglasPeucker(points, this.simplifyTolerance);
    }
    
    /**
     * 道格拉斯-普克算法实现
     */
    douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;
        
        // 找到距离起点和终点连线最远的点
        let maxDistance = 0;
        let maxIndex = 0;
        const start = points[0];
        const end = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.pointToLineDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        // 如果最大距离大于容差，递归处理
        if (maxDistance > tolerance) {
            const leftPoints = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const rightPoints = this.douglasPeucker(points.slice(maxIndex), tolerance);
            
            // 合并结果，去除重复点
            return leftPoints.slice(0, -1).concat(rightPoints);
        } else {
            // 如果所有点都在容差范围内，只返回起点和终点
            return [start, end];
        }
    }
    
    /**
     * 计算点到直线的距离
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const [x, y] = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;
        
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // 起点和终点重合
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * 设置追踪参数
     */
    setThreshold(threshold) {
        this.threshold = threshold;
    }
    
    setMinPathLength(length) {
        this.minPathLength = length;
    }
    
    setSimplifyTolerance(tolerance) {
        this.simplifyTolerance = tolerance;
    }
}
