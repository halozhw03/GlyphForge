/**
 * ShapeLibrary - 预设图形库
 * 包含圆形、星形、爱心等预设图形的生成算法
 */
class ShapeLibrary {
    constructor() {
        this.shapes = {
            circle: {
                name: 'Circle',
                icon: 'fa-circle',
                description: 'Perfect circle shape'
            },
            star: {
                name: 'Star',
                icon: 'fa-star',
                description: '5-pointed star shape'
            },
            heart: {
                name: 'Heart',
                icon: 'fa-heart',
                description: 'Heart shape'
            }
        };
    }

    /**
     * 生成圆形路径点
     * @param {number} centerX - 圆心X坐标
     * @param {number} centerY - 圆心Y坐标
     * @param {number} radius - 半径
     * @param {number} segments - 分段数量（默认64）
     * @returns {Array} 路径点数组
     */
    generateCircle(centerX, centerY, radius, segments = 64) {
        const points = [];
        const angleStep = (2 * Math.PI) / segments;
        
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            points.push({ x, y });
        }
        
        return points;
    }

    /**
     * 生成星形路径点
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     * @param {number} outerRadius - 外半径
     * @param {number} innerRadius - 内半径（默认为外半径的0.4倍）
     * @param {number} points - 星形点数（默认5）
     * @returns {Array} 路径点数组
     */
    generateStar(centerX, centerY, outerRadius, innerRadius = null, points = 5) {
        if (innerRadius === null) {
            innerRadius = outerRadius * 0.4;
        }
        
        const pathPoints = [];
        const angleStep = Math.PI / points; // 每个点之间的角度
        
        for (let i = 0; i <= points * 2; i++) {
            const angle = i * angleStep - Math.PI / 2; // 从顶部开始
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            pathPoints.push({ x, y });
        }
        
        // 闭合路径
        if (pathPoints.length > 0) {
            pathPoints.push({ x: pathPoints[0].x, y: pathPoints[0].y });
        }
        
        return pathPoints;
    }

    /**
     * 生成爱心路径点
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     * @param {number} size - 大小缩放因子
     * @param {number} segments - 分段数量（默认100）
     * @returns {Array} 路径点数组
     */
    generateHeart(centerX, centerY, size = 20, segments = 100) {
        const points = [];
        
        // 爱心的参数方程
        // x = 16sin³(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * 2 * Math.PI;
            
            // 爱心参数方程
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            
            // 应用大小缩放和位置偏移
            const scaledX = centerX + (x * size) / 16;
            const scaledY = centerY + (y * size) / 16;
            
            points.push({ x: scaledX, y: scaledY });
        }
        
        return points;
    }

    /**
     * 根据形状类型生成路径点
     * @param {string} shapeType - 形状类型 ('circle', 'star', 'heart')
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     * @param {number} size - 大小参数
     * @param {Object} options - 额外选项
     * @returns {Array} 路径点数组
     */
    generateShape(shapeType, centerX, centerY, size, options = {}) {
        switch (shapeType) {
            case 'circle':
                return this.generateCircle(
                    centerX, 
                    centerY, 
                    size, 
                    options.segments || 64
                );
                
            case 'star':
                return this.generateStar(
                    centerX, 
                    centerY, 
                    size, 
                    options.innerRadius || size * 0.4,
                    options.points || 5
                );
                
            case 'heart':
                return this.generateHeart(
                    centerX, 
                    centerY, 
                    size, 
                    options.segments || 100
                );
                
            default:
                Debug.warn(`Unknown shape type: ${shapeType}`);
                return [];
        }
    }

    /**
     * 获取所有可用的形状
     * @returns {Object} 形状定义对象
     */
    getAvailableShapes() {
        return this.shapes;
    }

    /**
     * 获取形状信息
     * @param {string} shapeType - 形状类型
     * @returns {Object} 形状信息
     */
    getShapeInfo(shapeType) {
        return this.shapes[shapeType] || null;
    }

    /**
     * 计算合适的默认大小
     * @param {string} shapeType - 形状类型
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     * @returns {number} 建议的大小
     */
    getDefaultSize(shapeType, canvasWidth, canvasHeight) {
        const minDimension = Math.min(canvasWidth, canvasHeight);
        const baseSize = minDimension * 0.15; // 画布最小尺寸的15%
        
        switch (shapeType) {
            case 'circle':
                return Math.max(30, Math.min(80, baseSize));
            case 'star':
                return Math.max(40, Math.min(100, baseSize));
            case 'heart':
                // 爱心参数方程：size=16时宽度约32px，高度约26px
                // 为了与圆形/星形大小匹配，需要相应调整size参数
                // 目标：让爱心的宽度与圆形直径相当
                const targetWidth = Math.max(60, Math.min(140, baseSize * 1.6)); // 目标宽度
                return targetWidth / 2; // 因为爱心宽度 ≈ size * 2
            default:
                return baseSize;
        }
    }

    /**
     * 验证形状参数
     * @param {string} shapeType - 形状类型
     * @param {Object} params - 参数对象
     * @returns {boolean} 参数是否有效
     */
    validateParams(shapeType, params) {
        const { centerX, centerY, size } = params;
        
        // 基本参数验证
        if (typeof centerX !== 'number' || typeof centerY !== 'number' || typeof size !== 'number') {
            return false;
        }
        
        if (size <= 0) {
            return false;
        }
        
        // 特定形状的参数验证
        switch (shapeType) {
            case 'star':
                if (params.options && params.options.points && params.options.points < 3) {
                    return false;
                }
                break;
        }
        
        return true;
    }
}

// 导出ShapeLibrary类
window.ShapeLibrary = ShapeLibrary;
