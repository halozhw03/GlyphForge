/**
 * PathProcessor - 处理路径简化、平滑和采样
 */
class PathProcessor {
    constructor() {
        this.tolerance = 2.0; // Douglas-Peucker算法的容差
        this.smoothingFactor = 0.5; // 平滑系数
    }

    /**
     * 简化路径 - 使用Douglas-Peucker算法
     */
    simplifyPath(points, tolerance = this.tolerance) {
        if (points.length <= 2) return points;
        
        return this.douglasPeucker(points, tolerance);
    }

    /**
     * Douglas-Peucker算法实现
     */
    douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;

        // 找到距离直线最远的点
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

        // 如果最大距离大于容差，递归简化
        if (maxDistance > tolerance) {
            const leftPart = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const rightPart = this.douglasPeucker(points.slice(maxIndex), tolerance);
            
            // 合并结果，去除重复点
            return leftPart.slice(0, -1).concat(rightPart);
        } else {
            // 返回起始和结束点
            return [start, end];
        }
    }

    /**
     * 计算点到直线的距离
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            return Math.sqrt(A * A + B * B);
        }

        const param = dot / lenSq;
        let xx, yy;

        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 平滑路径 - 使用移动平均
     */
    smoothPath(points, factor = this.smoothingFactor) {
        if (points.length <= 2) return points;
        
        // 如果smoothing factor为0，直接返回原始点（完全去掉smoothing）
        if (factor === 0) {
            return points;
        }

        const smoothed = [points[0]]; // 保持第一个点
        
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const current = points[i];
            const next = points[i + 1];
            
            const smoothX = current.x + factor * (prev.x + next.x - 2 * current.x);
            const smoothY = current.y + factor * (prev.y + next.y - 2 * current.y);
            
            smoothed.push({ x: smoothX, y: smoothY });
        }
        
        smoothed.push(points[points.length - 1]); // 保持最后一个点
        return smoothed;
    }

    /**
     * 去除抖动 - 移除距离过近的点
     */
    removeJitter(points, minDistance = 3.0) {
        if (points.length <= 1) return points;

        const filtered = [points[0]];
        
        for (let i = 1; i < points.length; i++) {
            const lastPoint = filtered[filtered.length - 1];
            const currentPoint = points[i];
            
            const distance = Math.sqrt(
                Math.pow(currentPoint.x - lastPoint.x, 2) + 
                Math.pow(currentPoint.y - lastPoint.y, 2)
            );
            
            if (distance >= minDistance) {
                filtered.push(currentPoint);
            }
        }
        
        return filtered;
    }

    /**
     * 计算路径长度
     */
    calculatePathLength(points) {
        if (points.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        
        return length;
    }

    /**
     * 重新采样路径 - 确保点之间的距离均匀
     */
    resamplePath(points, spacing = 5.0) {
        if (points.length < 2) return points;

        const resampled = [points[0]];
        let currentDistance = 0;
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const current = points[i];
            const segmentLength = Math.sqrt(
                Math.pow(current.x - prev.x, 2) + 
                Math.pow(current.y - prev.y, 2)
            );
            
            currentDistance += segmentLength;
            
            // 如果累积距离超过采样间距，添加插值点
            while (currentDistance >= spacing) {
                const ratio = (currentDistance - spacing) / segmentLength;
                const newPoint = {
                    x: current.x - ratio * (current.x - prev.x),
                    y: current.y - ratio * (current.y - prev.y)
                };
                
                resampled.push(newPoint);
                currentDistance -= spacing;
            }
        }
        
        // 确保包含最后一个点
        const lastOriginal = points[points.length - 1];
        const lastResampled = resampled[resampled.length - 1];
        const finalDistance = Math.sqrt(
            Math.pow(lastOriginal.x - lastResampled.x, 2) + 
            Math.pow(lastOriginal.y - lastResampled.y, 2)
        );
        
        if (finalDistance > spacing * 0.5) {
            resampled.push(lastOriginal);
        }
        
        return resampled;
    }

    /**
     * 完整的路径处理流程
     */
    processPath(points, options = {}) {
        const {
            removeJitter = true,
            simplify = true,
            smooth = true,
            resample = true,
            tolerance = this.tolerance,
            smoothingFactor = this.smoothingFactor,
            minDistance = 3.0,
            spacing = 5.0
        } = options;

        let processed = [...points];

        // 1. 去除抖动
        if (removeJitter) {
            processed = this.removeJitter(processed, minDistance);
        }

        // 2. 简化路径
        if (simplify) {
            processed = this.simplifyPath(processed, tolerance);
        }

        // 3. 平滑路径
        if (smooth) {
            processed = this.smoothPath(processed, smoothingFactor);
        }

        // 4. 重新采样
        if (resample) {
            processed = this.resamplePath(processed, spacing);
        }

        return processed;
    }

    /**
     * 将Paper.js路径转换为点数组
     */
    paperPathToPoints(path) {
        const points = [];
        const length = path.length;

        Debug.log('PathProcessor: Converting path to points');
        Debug.log('Path length:', length);
        Debug.log('Path segments:', path.segments?.length);
        
        // 如果路径有segments，也打印出来看看
        if (path.segments) {
            Debug.log('Path segments:', path.segments.map(seg => ({ 
                point: { x: seg.point.x, y: seg.point.y },
                handleIn: seg.handleIn ? { x: seg.handleIn.x, y: seg.handleIn.y } : null,
                handleOut: seg.handleOut ? { x: seg.handleOut.x, y: seg.handleOut.y } : null
            })));
        }

        // 检查是否是贝塞尔曲线（有控制点的路径）
        const hasCurves = path.segments && path.segments.some(seg => 
            (seg.handleIn && (seg.handleIn.x !== 0 || seg.handleIn.y !== 0)) ||
            (seg.handleOut && (seg.handleOut.x !== 0 || seg.handleOut.y !== 0))
        );

        Debug.log('Path has curves:', hasCurves);

        if (hasCurves && length > 0) {
            // 对于贝塞尔曲线，使用更密集的采样
            const numSamples = Math.max(50, Math.min(200, Math.floor(length / 2))); // 50-200个采样点
            Debug.log('Using', numSamples, 'samples for curved path');
            
            for (let i = 0; i <= numSamples; i++) {
                const t = i / numSamples;
                const offset = t * length;
                const point = path.getPointAt(offset);
                if (point) {
                    points.push({ x: point.x, y: point.y });
                }
            }
        } else {
            // 对于直线，使用原来的采样方法
            const step = Math.max(1, length / 100);
            Debug.log('Using step size', step, 'for straight path');
            
            for (let offset = 0; offset <= length; offset += step) {
                const point = path.getPointAt(offset);
                if (point) {
                    points.push({ x: point.x, y: point.y });
                }
            }
        }

        Debug.log('Generated points:', points.length);
        Debug.log('First few points:', points.slice(0, 5));
        Debug.log('Last few points:', points.slice(-5));
        return points;
    }

    /**
     * 创建贝塞尔曲线的控制点
     */
    createBezierControlPoints(points) {
        if (points.length < 2) return [];

        const controlPoints = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            // 计算控制点位置（简化版本）
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            
            const cp1 = {
                x: current.x + dx * 0.25,
                y: current.y + dy * 0.25
            };
            
            const cp2 = {
                x: current.x + dx * 0.75,
                y: current.y + dy * 0.75
            };
            
            controlPoints.push({ cp1, cp2, start: current, end: next });
        }
        
        return controlPoints;
    }
}
