# 打印机连接使用指南

本指南介绍如何在GlyphForge项目中使用Ender3 Pro和Ender5打印机连接功能。

## 功能概述

GlyphForge现在支持两种打印模式：

1. **模拟模式** - 在3D可视化环境中预览路径和机器人动作（无需实体打印机）
2. **真实打印模式** - 通过串口连接实体3D打印机，执行真实打印操作

## 支持的打印机型号

- **Ender 3 Pro**
  - 工作区域: 220mm × 220mm × 250mm
  - 波特率: 115200
  - 喷嘴直径: 0.4mm

- **Ender 5**
  - 工作区域: 220mm × 220mm × 300mm
  - 波特率: 115200
  - 喷嘴直径: 0.4mm

## 系统要求

### 浏览器要求
- Chrome 89+ 或 Edge 89+ （需要支持WebSerial API）
- Firefox和Safari目前**不支持** WebSerial API

### 环境要求
- 必须通过 HTTPS 或 localhost 访问（WebSerial API安全要求）
- 推荐使用本地服务器：`./start-server.sh` 或 `python3 -m http.server 8080`

### 硬件要求
- USB连接的3D打印机（Ender 3 Pro 或 Ender 5）
- USB数据线
- 打印机固件支持G-code命令（Marlin固件）

## 使用步骤

### 1. 启动应用

```bash
cd drawing-interface
./start-server.sh
```

然后在Chrome浏览器中访问 `http://localhost:8080`

### 2. 选择打印模式

在右侧面板的"3D Work Area"区域：

1. 找到"打印模式"选项
2. 选择：
   - **模拟模式** - 仅可视化模拟（默认）
   - **真实打印** - 连接实体打印机

### 3. 连接打印机（真实打印模式）

当选择"真实打印"模式后：

1. **选择打印机型号**
   - 在下拉菜单中选择 "Ender 3 Pro" 或 "Ender 5"

2. **连接打印机**
   - 确保打印机已通过USB连接到电脑并开机
   - 点击"连接打印机"按钮
   - 浏览器会弹出串口选择对话框
   - 选择对应的USB串口（通常显示为 "USB Serial" 或 "CH340"）
   - 点击"连接"

3. **确认连接**
   - 连接状态应显示为"已连接"（绿色）
   - 打印状态显示为"就绪"

### 4. Drawing Mode - 路径绘制与打印

#### 绘制路径
1. 切换到 **Drawing Mode**（如果不在该模式）
2. 使用绘图工具绘制路径：
   - 自由绘画工具
   - 折线工具
   - 贝塞尔曲线
   - 预设形状
   - 图片追踪

#### 开始打印
1. 确保打印机已连接且状态为"已连接"
2. 点击"开始打印"按钮
3. 系统会显示G-code预览（在浏览器控制台）
4. 确认打印参数：
   - ✅ 打印机已正确归零
   - ✅ 打印床已清洁
   - ✅ 工作区域无障碍物
5. 点击确认开始打印

#### G-code生成逻辑
Drawing Mode会生成以下G-code：
- 归零命令 (G28)
- 移动到固定Z高度（2mm）
- 沿路径轨迹移动（G0/G1）
- 路径间抬起（避免干扰）
- 完成后归零

### 5. Robot Mode - 物体操作与打印

#### 放置物体和设置目标
1. 切换到 **Robot Mode**
2. 选择物体类型（Cube、Sphere、Cylinder、Box）
3. 点击工作区放置物体
4. 切换到"设置目标"工具
5. 点击已放置的物体，再点击目标位置

#### 开始机器人打印
1. 确保打印机已连接
2. 至少有一个物体设置了目标位置
3. 点击"开始打印"按钮
4. 确认操作参数
5. 系统会生成抓取-移动-放置的G-code序列

#### G-code生成逻辑
Robot Mode会生成以下G-code：
- 归零命令 (G28)
- 移动到物体初始位置上方
- 下降到抓取高度
- [GRIP] 抓取标记
- 提升到安全高度
- 移动到目标位置上方
- 下降到放置高度
- [RELEASE] 释放标记
- 返回安全高度

### 6. 停止打印

任何时候都可以点击"停止打印"按钮紧急停止：
- 清空待执行的G-code队列
- 打印机停止移动
- 状态恢复为"就绪"

### 7. 断开连接

完成打印后：
1. 点击"断开连接"按钮
2. 连接状态变为"未连接"
3. 打印控制按钮被禁用

## 坐标系统说明

### Drawing Mode坐标转换
- **画布坐标**: 左上角 (0, 0)，右下角 (canvasWidth, canvasHeight)
- **打印机坐标**: 左下角 (0, 0)，右上角 (maxX, maxY)
- **转换规则**:
  - X: `printerX = (canvasX / canvasWidth) * printerMaxX`
  - Y: `printerY = printerMaxY - (canvasY / canvasHeight) * printerMaxY` （Y轴翻转）

### Z轴处理
- **Drawing Mode**: 固定Z高度（2mm），模拟笔式绘图
- **Robot Mode**: 动态Z轴（安全高度50mm，操作高度5mm）

## 安全注意事项

⚠️ **在开始真实打印前，务必确认：**

1. **打印机状态**
   - 打印机已正确归零
   - 所有轴可以自由移动
   - 无卡滞或异常噪音

2. **工作区域**
   - 打印床清洁无杂物
   - 工作范围内无障碍物
   - 路径不会超出打印范围

3. **电气安全**
   - USB连接稳定
   - 打印机电源稳定
   - 不要在打印过程中拔插USB

4. **紧急停止**
   - 了解紧急停止按钮位置
   - 可随时点击"停止打印"
   - 必要时直接关闭打印机电源

## 故障排查

### 无法连接打印机

**问题**: 点击"连接打印机"后无反应或找不到串口

**解决方案**:
1. 检查浏览器是否为Chrome/Edge
2. 确认通过localhost或HTTPS访问
3. 检查USB连接是否正常
4. 查看设备管理器中串口是否存在
5. 重启打印机和浏览器
6. 检查串口驱动是否安装（CH340驱动）

### 连接成功但无法打印

**问题**: 连接状态显示"已连接"，但点击"开始打印"无反应

**解决方案**:
1. 检查是否有绘制路径或放置物体
2. Robot Mode需要设置目标位置
3. 查看浏览器控制台是否有错误信息
4. 确认打印机固件支持Marlin G-code

### 打印路径偏移或超出范围

**问题**: 打印路径与预期不符或超出打印范围

**解决方案**:
1. 检查"Work Area"设置是否与打印机匹配
2. 确认选择了正确的打印机型号
3. 打印前先在模拟模式中预览
4. 路径设计时留有边距

### G-code预览在哪里？

**问题**: 想查看生成的G-code

**解决方案**:
1. 打开浏览器开发者工具（F12）
2. 切换到"Console"标签
3. 点击"开始打印"前，G-code会自动输出到控制台
4. 可以复制G-code保存或在其他工具中验证

## 高级功能

### 自定义打印机配置

如需添加其他打印机型号：

1. 在 `drawing-interface/printers/` 创建新的JSON配置：

```json
{
  "name": "my-printer",
  "baudRate": 115200,
  "maxX": 300,
  "maxY": 300,
  "maxZ": 400,
  "nozzleDiameter": 0.4,
  "filamentDiameter": 1.75
}
```

2. 在 `index.html` 中添加选项：

```html
<select id="printerSelect" class="printer-select">
    <option value="ender3-pro">Ender 3 Pro</option>
    <option value="ender5">Ender 5</option>
    <option value="my-printer">My Printer</option>
</select>
```

### G-code定制

修改 `PrinterManager.js` 中的以下方法：

- `pathsToGcode()` - Drawing Mode G-code生成
- `robotOperationsToGcode()` - Robot Mode G-code生成

可以自定义：
- 起始G-code（加热、归零等）
- 移动速度
- Z轴高度
- 结束G-code

## 技术架构

### 核心组件

1. **PrinterManager.js**
   - 封装p5.fab和p5.webserial
   - 管理串口连接
   - G-code生成和发送

2. **p5.fab.js**
   - 3D打印控制库
   - G-code命令封装
   - 打印机状态管理

3. **p5.webserial.js**
   - WebSerial API封装
   - 串口通信

4. **app.js**
   - 主应用逻辑
   - UI事件绑定
   - 模式切换管理

### 数据流

```
用户绘图/放置物体
    ↓
Drawing Canvas / Workspace Canvas
    ↓
Path/Object Data
    ↓
PrinterManager.pathsToGcode() / robotOperationsToGcode()
    ↓
G-code Commands
    ↓
p5.fab.add() + p5.fab.print()
    ↓
p5.webserial (WebSerial API)
    ↓
USB Serial Port
    ↓
3D Printer
```

## 参考资源

- [p5.fab Documentation](https://github.com/machineagency/p5.fab)
- [WebSerial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Marlin G-code Reference](https://marlinfw.org/meta/gcode/)
- [Ender 3 Pro Specifications](https://www.creality.com/products/ender-3-pro-3d-printer)

## 开发与贡献

本功能基于开源项目构建：
- [p5.fab](https://github.com/machineagency/p5.fab) by Machine Agency
- [p5.js](https://p5js.org/)
- [Paper.js](http://paperjs.org/)
- [Three.js](https://threejs.org/)

欢迎提交Issue和Pull Request！

## 许可证

MIT License - 与p5.fab项目保持一致

---

**版本**: 1.0.0  
**最后更新**: 2025-01-09  
**作者**: GlyphForge Team

