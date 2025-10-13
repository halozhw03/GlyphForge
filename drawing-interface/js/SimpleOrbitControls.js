/**
 * 简化版OrbitControls - 专门为3D工作区域设计
 */
class SimpleOrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // 控制参数
        this.enabled = true;
        this.target = new THREE.Vector3(0, 0, 0);
        this.minDistance = 200;
        this.maxDistance = 800;
        this.minPolarAngle = Math.PI / 6; // 30度
        this.maxPolarAngle = Math.PI / 2; // 90度
        
        // 旋转和缩放速度
        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.0;
        
        // 内部状态
        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();
        this.scale = 1;
        
        // 鼠标状态
        this.rotateStart = new THREE.Vector2();
        this.rotateEnd = new THREE.Vector2();
        this.rotateDelta = new THREE.Vector2();
        
        this.STATE = { NONE: -1, ROTATE: 0, ZOOM: 1 };
        this.state = this.STATE.NONE;
        
        // 绑定方法到this上下文，确保事件监听器可以正确移除
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化相机位置
        this.update();
    }
    
    bindEvents() {
        this.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.domElement.addEventListener('wheel', (event) => this.onMouseWheel(event));
        this.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    
    onMouseDown(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        if (event.button === 0) { // 左键旋转
            this.rotateStart.set(event.clientX, event.clientY);
            this.state = this.STATE.ROTATE;
            
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        }
    }
    
    onMouseMove(event) {
        if (!this.enabled) return;
        
        if (this.state === this.STATE.ROTATE) {
            // 只在旋转状态下阻止默认行为
            event.preventDefault();
            
            this.rotateEnd.set(event.clientX, event.clientY);
            this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
            
            const element = this.domElement;
            
            // 计算旋转角度
            const deltaTheta = 2 * Math.PI * this.rotateDelta.x / element.clientHeight;
            const deltaPhi = 2 * Math.PI * this.rotateDelta.y / element.clientHeight;
            
            this.sphericalDelta.theta -= deltaTheta;
            this.sphericalDelta.phi -= deltaPhi;
            
            this.rotateStart.copy(this.rotateEnd);
            this.update();
        }
    }
    
    onMouseUp(event) {
        if (!this.enabled) return;
        
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        
        this.state = this.STATE.NONE;
    }
    
    onMouseWheel(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        if (event.deltaY < 0) {
            this.scale /= Math.pow(0.95, this.zoomSpeed);
        } else if (event.deltaY > 0) {
            this.scale *= Math.pow(0.95, this.zoomSpeed);
        }
        
        this.update();
    }
    
    update() {
        const offset = new THREE.Vector3();
        
        // 获取相机到目标的向量
        offset.copy(this.camera.position).sub(this.target);
        
        // 转换为球坐标
        this.spherical.setFromVector3(offset);
        
        // 应用旋转增量
        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;
        
        // 限制角度范围
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
        
        // 处理缩放 - 区分透视相机和正交相机
        if (this.camera.isPerspectiveCamera) {
            // 透视相机：调整距离
            this.spherical.radius *= this.scale;
            this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
        } else if (this.camera.isOrthographicCamera) {
            // 正交相机：调整缩放比例
            this.camera.zoom *= (1 / this.scale);
            this.camera.zoom = Math.max(0.1, Math.min(10, this.camera.zoom)); // 限制缩放范围
            this.camera.updateProjectionMatrix();
        }
        
        // 转换回笛卡尔坐标
        offset.setFromSpherical(this.spherical);
        
        // 更新相机位置
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
        
        // 重置增量
        this.sphericalDelta.set(0, 0, 0);
        this.scale = 1;
        
        return true;
    }
    
    dispose() {
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
        this.domElement.removeEventListener('contextmenu', () => {});
        
        // 确保清理全局事件监听器
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        
        // 重置状态
        this.state = this.STATE.NONE;
    }
}

// 将SimpleOrbitControls添加到全局作用域
window.SimpleOrbitControls = SimpleOrbitControls;
