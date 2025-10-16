/**
 * RoughUI - 使用Rough.js为UI元素添加手绘风格
 */
class RoughUI {
    constructor() {
        this.rc = null;
        this.svgElements = new Map();
        this.initialized = false;
        
        // 配置
        this.config = {
            roughness: 1.2,
            bowing: 1,
            strokeWidth: 2,
            fillStyle: 'solid',
            fillWeight: 0.5,
            hachureAngle: -41,
            hachureGap: 4
        };
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * 初始化RoughUI
     */
    initialize() {
        console.log('Initializing RoughUI...');
        
        // 等待一小段时间确保其他组件已初始化
        setTimeout(() => {
            this.decorateUI();
            this.setupEventListeners();
            this.initialized = true;
            console.log('RoughUI initialized successfully!');
        }, 100);
    }

    /**
     * 装饰所有UI元素
     */
    decorateUI() {
        // 装饰头部
        this.decorateElement(document.querySelector('.header'), {
            type: 'rectangle',
            fillColor: 'rgba(255, 255, 255, 0.95)',
            strokeColor: '#8FA1B3'
        });

        // 装饰左右面板
        this.decorateElement(document.querySelector('.left-panel'), {
            type: 'rectangle',
            fillColor: 'rgba(255, 255, 255, 0.95)',
            strokeColor: '#8FA1B3'
        });

        this.decorateElement(document.querySelector('.right-panel'), {
            type: 'rectangle',
            fillColor: 'rgba(255, 255, 255, 0.95)',
            strokeColor: '#8FA1B3'
        });

        // 装饰面板标题
        document.querySelectorAll('.panel-header').forEach(header => {
            this.decorateElement(header, {
                type: 'rectangle',
                fillColor: 'rgba(143, 161, 179, 0.08)',
                strokeColor: '#8FA1B3'
            });
        });

        // 装饰按钮
        this.decorateButtons();

        // 装饰工具按钮
        this.decorateToolButtons();

        // 装饰形状按钮
        this.decorateShapeButtons();

        // 装饰对象按钮
        this.decorateObjectButtons();

        // 装饰选择器容器
        this.decorateSelectors();

        // 装饰信息区域
        document.querySelectorAll('.path-info, .sim-info').forEach(info => {
            this.decorateElement(info, {
                type: 'rectangle',
                fillColor: 'rgba(248, 250, 252, 0.8)',
                strokeColor: '#B5C4D0'
            });
        });

        // 装饰控制区域
        document.querySelectorAll('.sim-controls').forEach(control => {
            this.decorateElement(control, {
                type: 'rectangle',
                fillColor: 'transparent',
                strokeColor: '#D4DBDF'
            });
        });

        // 装饰步骤指示器
        this.decorateStepper();

        // 装饰输入框
        this.decorateInputs();

        // 装饰打印机状态
        const printerStatus = document.querySelector('.printer-status');
        if (printerStatus) {
            this.decorateElement(printerStatus, {
                type: 'rectangle',
                fillColor: 'rgba(255, 255, 255, 0.95)',
                strokeColor: '#B5C4D0'
            });
        }

        // 装饰打印机选择器
        this.decoratePrinterSelect();
    }

    /**
     * 装饰单个元素
     */
    decorateElement(element, options = {}) {
        if (!element) return;

        const {
            type = 'rectangle',
            fillColor = 'transparent',
            strokeColor = '#333',
            radius = 12
        } = options;

        // 创建SVG容器
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
        svg.style.overflow = 'visible';

        // 确保元素有相对定位
        const currentPosition = window.getComputedStyle(element).position;
        if (currentPosition === 'static') {
            element.style.position = 'relative';
        }

        // 将SVG插入到元素的开头
        element.insertBefore(svg, element.firstChild);

        // 使用Rough.js绘制
        const rc = rough.svg(svg);
        const rect = element.getBoundingClientRect();

        try {
            let shape;
            if (type === 'rectangle') {
                shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                    ...this.config,
                    stroke: strokeColor,
                    fill: fillColor,
                    fillStyle: fillColor === 'transparent' ? 'solid' : 'hachure',
                    roughness: 1.5,
                    strokeWidth: 2
                });
            }

            if (shape) {
                svg.appendChild(shape);
                this.svgElements.set(element, svg);
            }
        } catch (error) {
            console.warn('Failed to decorate element:', error);
        }
    }

    /**
     * 装饰按钮
     */
    decorateButtons() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            this.decorateButton(button);
        });

        // 为header按钮添加点击效果监听
        this.addHeaderButtonEffects();
    }

    /**
     * 为header按钮添加点击效果
     */
    addHeaderButtonEffects() {
        const clearAllBtn = document.getElementById('clearAll');
        const simulateBtn = document.getElementById('simulate');

        [clearAllBtn, simulateBtn].forEach(btn => {
            if (!btn) return;

            const updateButtonStyle = (isActive) => {
                const svg = this.svgElements.get(btn);
                if (!svg) return;

                svg.innerHTML = '';
                const rc = rough.svg(svg);
                const rect = btn.getBoundingClientRect();

                let strokeColor, fillColor, fillStyle;
                
                if (isActive) {
                    // 点击时：深色背景填充
                    if (btn.id === 'clearAll') {
                        strokeColor = '#C9A19F';
                        fillColor = '#C9A19F';
                    } else if (btn.id === 'simulate') {
                        strokeColor = '#8FA1B3';
                        fillColor = '#8FA1B3';
                    }
                    fillStyle = 'solid';
                } else {
                    // 默认状态
                    if (btn.id === 'clearAll') {
                        strokeColor = '#C9A19F';
                        fillColor = 'rgba(201, 161, 159, 0.15)';
                    } else if (btn.id === 'simulate') {
                        strokeColor = '#8FA1B3';
                        fillColor = 'rgba(143, 161, 179, 0.15)';
                    }
                    fillStyle = 'hachure';
                }

                try {
                    const shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                        roughness: 1.2,
                        bowing: 1,
                        stroke: strokeColor,
                        strokeWidth: 2,
                        fill: fillColor,
                        fillStyle: fillStyle,
                        fillWeight: isActive ? 1 : 0.5,
                        hachureGap: 4
                    });
                    svg.appendChild(shape);
                } catch (error) {
                    console.warn('Failed to update button decoration:', error);
                }
            };

            // 鼠标按下时
            btn.addEventListener('mousedown', () => {
                updateButtonStyle(true);
            });

            // 鼠标释放时
            btn.addEventListener('mouseup', () => {
                updateButtonStyle(false);
            });

            // 鼠标离开时（防止拖出后释放）
            btn.addEventListener('mouseleave', () => {
                updateButtonStyle(false);
            });
        });
    }

    /**
     * 装饰单个按钮
     */
    decorateButton(button) {
        if (!button) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-button-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        button.style.position = 'relative';
        button.insertBefore(svg, button.firstChild);

        const updateButtonDecoration = () => {
            svg.innerHTML = '';
            const rc = rough.svg(svg);
            const rect = button.getBoundingClientRect();

            const isDisabled = button.disabled || button.hasAttribute('disabled');
            
            let strokeColor = '#8FA1B3';
            let fillColor = 'rgba(143, 161, 179, 0.1)';

            if (isDisabled) {
                strokeColor = '#D4DBDF';
                fillColor = 'rgba(212, 219, 223, 0.1)';
            } else if (button.classList.contains('btn-primary')) {
                strokeColor = '#8FA1B3';
                fillColor = 'rgba(143, 161, 179, 0.15)';
            } else if (button.classList.contains('btn-danger')) {
                strokeColor = '#C9A19F';
                fillColor = 'rgba(201, 161, 159, 0.15)';
            } else if (button.classList.contains('btn-success')) {
                strokeColor = '#A3B9A6';
                fillColor = 'rgba(163, 185, 166, 0.15)';
            } else if (button.classList.contains('btn-secondary')) {
                strokeColor = '#A8ADB3';
                fillColor = 'rgba(168, 173, 179, 0.15)';
            } else if (button.classList.contains('btn-warning')) {
                strokeColor = '#C9B19F';
                fillColor = 'rgba(201, 177, 159, 0.15)';
            }

            try {
                const shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                    roughness: 1.2,
                    bowing: 1,
                    stroke: strokeColor,
                    strokeWidth: 2,
                    fill: fillColor,
                    fillStyle: 'hachure',
                    fillWeight: 0.5,
                    hachureGap: 4
                });
                svg.appendChild(shape);
            } catch (error) {
                console.warn('Failed to decorate button:', error);
            }
        };

        updateButtonDecoration();
        this.svgElements.set(button, svg);

        // 监听按钮状态变化
        const observer = new MutationObserver(updateButtonDecoration);
        observer.observe(button, { attributes: true, attributeFilter: ['class', 'disabled'] });
    }

    /**
     * 装饰工具按钮
     */
    decorateToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            this.decorateToolButton(button);
        });
    }

    /**
     * 装饰单个工具按钮
     */
    decorateToolButton(button) {
        if (!button) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-tool-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        button.style.position = 'relative';
        button.insertBefore(svg, button.firstChild);

        const updateToolDecoration = () => {
            svg.innerHTML = '';
            const rc = rough.svg(svg);
            const rect = button.getBoundingClientRect();

            const isActive = button.classList.contains('active');
            const strokeColor = isActive ? '#8FA1B3' : '#D4DBDF';
            const fillColor = isActive ? 'rgba(143, 161, 179, 0.15)' : 'rgba(255, 255, 255, 0.5)';

            try {
                const shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                    roughness: 1.3,
                    bowing: 1.2,
                    stroke: strokeColor,
                    strokeWidth: 2,
                    fill: fillColor,
                    fillStyle: 'hachure',
                    fillWeight: 0.5,
                    hachureGap: 3
                });
                svg.appendChild(shape);
            } catch (error) {
                console.warn('Failed to decorate tool button:', error);
            }
        };

        updateToolDecoration();
        this.svgElements.set(button, svg);

        // 监听按钮状态变化
        const observer = new MutationObserver(updateToolDecoration);
        observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    }

    /**
     * 装饰形状按钮
     */
    decorateShapeButtons() {
        const shapeButtons = document.querySelectorAll('.shape-btn');
        shapeButtons.forEach(button => {
            this.decorateSmallButton(button);
        });
    }

    /**
     * 装饰对象按钮
     */
    decorateObjectButtons() {
        const objectButtons = document.querySelectorAll('.object-shape-btn');
        objectButtons.forEach(button => {
            this.decorateSmallButton(button);
        });
    }

    /**
     * 装饰小按钮（shape-btn, object-shape-btn）
     */
    decorateSmallButton(button) {
        if (!button) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-small-button-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        button.style.position = 'relative';
        button.insertBefore(svg, button.firstChild);

        const updateDecoration = () => {
            svg.innerHTML = '';
            const rc = rough.svg(svg);
            const rect = button.getBoundingClientRect();

            const isActive = button.classList.contains('active');
            const strokeColor = isActive ? '#8FA1B3' : '#D4DBDF';
            const fillColor = isActive ? 'rgba(143, 161, 179, 0.15)' : 'rgba(255, 255, 255, 0.5)';

            try {
                const shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                    roughness: 1.5,
                    bowing: 1.2,
                    stroke: strokeColor,
                    strokeWidth: 1.5,
                    fill: fillColor,
                    fillStyle: 'hachure',
                    fillWeight: 0.5,
                    hachureGap: 3
                });
                svg.appendChild(shape);
            } catch (error) {
                console.warn('Failed to decorate small button:', error);
            }
        };

        updateDecoration();
        this.svgElements.set(button, svg);

        // 监听按钮状态变化
        const observer = new MutationObserver(updateDecoration);
        observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    }

    /**
     * 装饰选择器容器
     */
    decorateSelectors() {
        const selectors = document.querySelectorAll('.shape-selector, .object-shape-selector');
        selectors.forEach(selector => {
            this.decorateElement(selector, {
                type: 'rectangle',
                fillColor: 'rgba(255, 255, 255, 0.98)',
                strokeColor: '#8FA1B3'
            });
        });
    }

    /**
     * 装饰步骤指示器
     */
    decorateStepper() {
        const stepCircles = document.querySelectorAll('.step-circle');
        stepCircles.forEach(circle => {
            this.decorateStepCircle(circle);
        });

        // 装饰连接线
        const connectors = document.querySelectorAll('.step-connector');
        connectors.forEach(connector => {
            this.decorateConnector(connector);
        });
    }

    /**
     * 装饰步骤圆圈
     */
    decorateStepCircle(circle) {
        if (!circle) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-circle-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        circle.style.position = 'relative';
        circle.insertBefore(svg, circle.firstChild);

        const updateCircleDecoration = () => {
            svg.innerHTML = '';
            const rc = rough.svg(svg);
            const rect = circle.getBoundingClientRect();
            const step = circle.parentElement;

            let strokeColor = '#D4DBDF';
            let fillColor = 'rgba(212, 219, 223, 0.5)';

            if (step.classList.contains('active')) {
                strokeColor = '#8FA1B3';
                fillColor = 'rgba(143, 161, 179, 0.15)';
            } else if (step.classList.contains('completed')) {
                strokeColor = '#A3B9A6';
                fillColor = 'rgba(163, 185, 166, 0.15)';
            }

            try {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const radius = Math.min(rect.width, rect.height) / 2 - 3;

                const shape = rc.circle(centerX, centerY, radius * 2, {
                    roughness: 1.5,
                    bowing: 1,
                    stroke: strokeColor,
                    strokeWidth: 2,
                    fill: fillColor,
                    fillStyle: 'hachure',
                    fillWeight: 0.5,
                    hachureGap: 3
                });
                svg.appendChild(shape);
            } catch (error) {
                console.warn('Failed to decorate step circle:', error);
            }
        };

        updateCircleDecoration();
        this.svgElements.set(circle, svg);

        // 监听状态变化
        const observer = new MutationObserver(updateCircleDecoration);
        observer.observe(circle.parentElement, { attributes: true, attributeFilter: ['class'] });
    }

    /**
     * 装饰连接线
     */
    decorateConnector(connector) {
        if (!connector) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-line-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';

        connector.style.position = 'relative';
        connector.appendChild(svg);

        const updateConnectorDecoration = () => {
            svg.innerHTML = '';
            const rc = rough.svg(svg);
            const rect = connector.getBoundingClientRect();

            const isCompleted = connector.classList.contains('completed');
            const strokeColor = isCompleted ? '#A3B9A6' : '#D4DBDF';

            try {
                const shape = rc.line(0, rect.height / 2, rect.width, rect.height / 2, {
                    roughness: 1.2,
                    bowing: 0.5,
                    stroke: strokeColor,
                    strokeWidth: 2
                });
                svg.appendChild(shape);
            } catch (error) {
                console.warn('Failed to decorate connector:', error);
            }
        };

        updateConnectorDecoration();
        this.svgElements.set(connector, svg);

        // 监听状态变化
        const observer = new MutationObserver(updateConnectorDecoration);
        observer.observe(connector, { attributes: true, attributeFilter: ['class'] });
    }

    /**
     * 装饰打印机选择器
     */
    decoratePrinterSelect() {
        const printerSelect = document.querySelector('.printer-select');
        if (!printerSelect) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-printer-select-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';

        printerSelect.style.position = 'relative';
        printerSelect.insertBefore(svg, printerSelect.firstChild);

        const rc = rough.svg(svg);
        const rect = printerSelect.getBoundingClientRect();

        try {
            const shape = rc.rectangle(2, 2, rect.width - 4, rect.height - 4, {
                roughness: 1.3,
                bowing: 1,
                stroke: '#D4DBDF',
                strokeWidth: 2,
                fill: 'rgba(248, 250, 252, 0.3)',
                fillStyle: 'hachure',
                fillWeight: 0.3,
                hachureGap: 4
            });
            svg.appendChild(shape);
            this.svgElements.set(printerSelect, svg);
        } catch (error) {
            console.warn('Failed to decorate printer select:', error);
        }
    }

    /**
     * 装饰输入框
     */
    decorateInputs() {
        const inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
        inputs.forEach(input => {
            if (input.type === 'range') {
                // 滑块不装饰，保持原样
                return;
            }
            this.decorateInput(input);
        });
    }

    /**
     * 装饰单个输入框
     */
    decorateInput(input) {
        if (!input) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('rough-input-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';

        // 创建包装器
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.insertBefore(svg, input);

        const rc = rough.svg(svg);
        const rect = input.getBoundingClientRect();

        try {
            const shape = rc.rectangle(1, 1, rect.width - 2, rect.height - 2, {
                roughness: 1.2,
                bowing: 0.8,
                stroke: '#D4DBDF',
                strokeWidth: 1.5,
                fill: 'rgba(248, 250, 252, 0.5)',
                fillStyle: 'solid'
            });
            svg.appendChild(shape);
            this.svgElements.set(input, svg);
        } catch (error) {
            console.warn('Failed to decorate input:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 窗口大小变化时重新绘制
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.refresh();
            }, 250);
        });

        // 监听模式切换
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => {
                setTimeout(() => this.refresh(), 100);
            });
        }

        // 监听Real Print控件的显示
        const printerControls = document.querySelectorAll('.printer-controls');
        printerControls.forEach(control => {
            const observer = new MutationObserver(() => {
                if (control.classList.contains('active')) {
                    setTimeout(() => {
                        this.decoratePrinterSelect();
                    }, 50);
                }
            });
            observer.observe(control, { attributes: true, attributeFilter: ['class'] });
        });

        // 监听shape选择器的显示/隐藏
        const shapeSelector = document.getElementById('shapeSelector');
        if (shapeSelector) {
            const observer = new MutationObserver(() => {
                if (!shapeSelector.classList.contains('hidden')) {
                    setTimeout(() => {
                        this.decorateShapeButtons();
                        this.decorateSelectors();
                    }, 50);
                }
            });
            observer.observe(shapeSelector, { attributes: true, attributeFilter: ['class'] });
        }

        // 监听object选择器的显示/隐藏
        const objectSelector = document.getElementById('objectShapeSelector');
        if (objectSelector) {
            const observer = new MutationObserver(() => {
                if (!objectSelector.classList.contains('hidden')) {
                    setTimeout(() => {
                        this.decorateObjectButtons();
                        this.decorateSelectors();
                    }, 50);
                }
            });
            observer.observe(objectSelector, { attributes: true, attributeFilter: ['class'] });
        }
    }

    /**
     * 刷新所有装饰
     */
    refresh() {
        console.log('Refreshing RoughUI decorations...');
        
        // 清除所有现有的SVG
        this.svgElements.forEach((svg, element) => {
            if (svg && svg.parentNode) {
                svg.remove();
            }
        });
        this.svgElements.clear();

        // 重新装饰
        this.decorateUI();
    }

    /**
     * 更新特定元素的装饰
     */
    updateElement(element) {
        if (!element) return;

        const svg = this.svgElements.get(element);
        if (svg && svg.parentNode) {
            svg.remove();
        }
        this.svgElements.delete(element);

        // 根据元素类型重新装饰
        if (element.classList.contains('btn')) {
            this.decorateButton(element);
        } else if (element.classList.contains('tool-btn')) {
            this.decorateToolButton(element);
        } else if (element.classList.contains('step-circle')) {
            this.decorateStepCircle(element);
        }
    }
}

// 创建全局实例
window.roughUI = new RoughUI();

