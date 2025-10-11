# 物体叠放功能测试指南

## 功能概述
本次更新为robot mode添加了物体叠放功能。机械臂现在能够检测目标位置是否已有物体，并自动将新物体叠放在现有物体之上。

## 实现的功能

### 1. 物体尺寸记录
- 每个3D物体现在都记录了其准确的尺寸信息（宽度、高度、深度）
- 不同类型的物体有不同的尺寸：
  - Cube: 20x20x20mm
  - Sphere: 20x20x20mm (包围盒)
  - Cylinder: 20x20x20mm
  - Box: 30x14x20mm

### 2. 叠放高度检测
- 新增 `calculateStackHeight()` 方法
- 检测目标位置15mm范围内是否有物体
- 计算已有物体堆栈的最大高度
- 自动将新物体放置在堆栈顶部

### 3. 动画优化
- 机械臂移动到叠放位置时会自动调整高度
- 抓取和放置动画会根据堆栈高度动态调整
- 确保机械臂不会碰撞到已有的堆栈

## 测试步骤

### 准备工作
1. 启动本地服务器：
   ```bash
   cd "/Users/halozhw/Desktop/作品集/Project 4/p5.fab/drawing-interface"
   ./start-server.sh
   ```

2. 在浏览器中打开：http://localhost:8080/index.html

### 测试场景1：基本叠放
1. 点击"Robot Mode"按钮切换到机器人模式
2. 在左侧工作区域点击放置第一个物体（例如：Cube）
3. 点击设置该物体的目标位置（在工作区域右侧）
4. 再次点击放置第二个物体（位置可以不同）
5. 点击设置第二个物体的目标位置 - **重要：选择与第一个物体相同的目标位置**
6. 点击"Simulate"按钮开始模拟
7. 观察：
   - 机械臂先移动第一个物体到目标位置
   - 然后抓取第二个物体
   - 第二个物体应该被放置在第一个物体的上方，形成堆栈

### 测试场景2：多层叠放
1. 重复上述步骤，放置3-4个物体
2. 将所有物体的目标位置设置为同一个位置
3. 开始模拟
4. 观察：
   - 物体应该按顺序依次叠放
   - 每个物体都应该稳定地放在前一个物体上方
   - 堆栈高度应该逐渐增加

### 测试场景3：不同类型物体叠放
1. 放置不同类型的物体（Cube, Sphere, Cylinder, Box）
2. 将它们的目标位置设置为同一位置
3. 开始模拟
4. 观察：
   - 不同类型的物体应该能够正确叠放
   - Box物体（高度较小）叠放时高度应该更低

### 测试场景4：多个堆栈
1. 创建多个物体
2. 将部分物体目标位置设置为位置A
3. 将其余物体目标位置设置为位置B
4. 开始模拟
5. 观察：
   - 应该形成两个独立的堆栈
   - 每个堆栈都应该正确叠放
   - 机械臂应该在两个位置之间正确移动

## 关键代码修改

### RobotGripper.js

#### 1. 物体尺寸记录
```javascript
// 在 create3DObject 方法中
let objectSize = { width: size, height: size, depth: size };
// ... 根据物体类型设置不同的尺寸
```

#### 2. 叠放高度计算
```javascript
calculateStackHeight(targetX, targetZ, currentObjectId) {
    let maxHeight = 0;
    const threshold = 15; // 检测范围
    
    for (const obj of this.objects) {
        if (obj.id === currentObjectId) continue;
        const dx = Math.abs(obj.mesh.position.x - targetX);
        const dz = Math.abs(obj.mesh.position.z - targetZ);
        
        if (dx < threshold && dz < threshold) {
            const topHeight = obj.mesh.position.y + (obj.size.height / 2);
            maxHeight = Math.max(maxHeight, topHeight);
        }
    }
    return maxHeight;
}
```

#### 3. executePickAndPlace更新
```javascript
// 在放置前计算叠放高度
const stackHeight = this.calculateStackHeight(
    objectData.targetPosition.x,
    objectData.targetPosition.z,
    objectData.id
);

// 计算最终高度
const finalY = stackHeight > 0 ? 
    stackHeight + objectData.size.height / 2 : 
    objectData.size.height / 2;

// 更新目标位置
objectData.targetPosition.y = finalY;
```

## 预期结果

### 成功指标
- ✅ 物体能够正确叠放在其他物体之上
- ✅ 叠放高度计算准确，物体不会重叠或悬空
- ✅ 机械臂动画流畅，路径合理
- ✅ 多个物体可以形成稳定的堆栈
- ✅ 不同类型的物体可以混合叠放
- ✅ 可以创建多个独立的堆栈

### 观察要点
1. **视觉效果**
   - 物体之间没有间隙也没有重叠
   - 堆栈看起来稳定自然
   
2. **动画流畅度**
   - 机械臂移动路径合理
   - 升降高度适当
   
3. **控制台输出**
   - 检查浏览器控制台
   - 应该看到 "Found object at target position" 消息
   - "Stack height" 和 "Final Y position" 的值应该递增

## 调试信息

如果遇到问题，请检查浏览器控制台的以下输出：
- `Found object at target position:` - 显示检测到的物体
- `Stack height:` - 当前堆栈高度
- `Final Y position:` - 物体最终放置高度
- `Object released at position:` - 物体释放位置
- `Stack level:` - 堆栈层级信息

## 已知限制

1. 堆栈检测使用15mm的阈值，如果物体距离超过此值，将不会被识别为同一堆栈
2. 叠放顺序按照物体设置目标位置的顺序，而不是物体创建顺序
3. 非常高的堆栈可能超出3D场景的可视范围

## 后续改进建议

1. 添加物体物理稳定性检查
2. 支持精确的碰撞检测
3. 添加堆栈高度限制
4. 支持从堆栈中移除物体
5. 添加堆栈可视化辅助线

