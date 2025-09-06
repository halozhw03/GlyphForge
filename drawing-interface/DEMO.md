# 2D Mechanical Arm Simulator - Demo Guide

## 🚀 Quick Start

1. **Start the Server**
   ```bash
   ./start-server.sh
   ```
   Or manually: `python3 -m http.server 8080`

2. **Open in Browser**
   Navigate to `http://localhost:8080`

3. **Start Drawing**
   Use the tools on the left to create paths, then click "Simulate" to see the motion!

## 🎯 Demo Scenarios

### Scenario 1: Simple Geometric Shape
1. Select the **Polyline Tool** (📐 icon)
2. Click to create a square:
   - Click at (50, 50)
   - Click at (150, 50)  
   - Click at (150, 150)
   - Click at (50, 150)
   - Press `Enter` to complete
3. Click **"Simulate"** to see the printhead trace the square

### Scenario 2: Smooth Artistic Curve  
1. Select the **Freehand Tool** (✏️ icon)
2. Draw a smooth S-curve by clicking and dragging
3. Adjust the **Smoothing slider** to see real-time path optimization
4. Click **"Simulate"** to watch the smooth motion

### Scenario 3: Precise Bezier Curve
1. Select the **Bezier Tool** (🎨 icon)
2. Click 4 points to define:
   - Start point
   - End point  
   - First control point
   - Second control point
3. The system creates a smooth parametric curve
4. Simulate to see the elegant motion

### Scenario 4: Path Editing
1. Draw any path using any tool
2. Switch to **Edit Tool** (✏️ icon)
3. Click on the path to select it
4. Drag the control points to modify the shape
5. Use **Delete Tool** to remove unwanted paths

## 🎮 Interactive Features

### Drawing Controls
- **Tool Selection**: Click icons or use number keys (1-3)
- **Path Smoothing**: Adjust slider for real-time optimization
- **Multi-path Support**: Draw multiple separate paths
- **Visual Feedback**: See path count and total length

### Simulation Controls  
- **Speed Control**: Adjust printhead movement speed (10-100 mm/s)
- **Work Area**: Configure virtual printer bed size
- **Real-time Progress**: Watch completion percentage
- **Time Estimation**: See estimated completion time

### Keyboard Shortcuts
```
Drawing Tools:
1 - Freehand drawing
2 - Polyline tool
3 - Bezier curves
E - Edit mode
D - Delete mode

Actions:
Space - Start/pause simulation  
Ctrl+R - Clear all paths
Escape - Cancel current operation
Enter - Finish polyline/bezier
```

## 🔧 Technical Demonstrations

### Path Processing Pipeline
1. **Raw Input**: Mouse/touch coordinates
2. **Jitter Removal**: Eliminate small unwanted movements  
3. **Simplification**: Douglas-Peucker algorithm reduces points
4. **Smoothing**: Moving average for organic curves
5. **Resampling**: Uniform point spacing for consistent motion

### Motion Simulation
- **Coordinate Transformation**: Drawing space → Printer space
- **Speed Calculation**: Real-time velocity simulation
- **Boundary Checking**: Respect work area limits
- **Visual Feedback**: Grid, axes, and progress indicators

## 🎨 Creative Examples

### Example 1: Logo Tracing
- Import or trace your company logo
- Use combination of polylines and bezier curves
- Optimize path order for efficient "printing"

### Example 2: Artistic Patterns  
- Create mandala-like patterns with repeated curves
- Use smoothing to create organic, flowing lines
- Experiment with different tool combinations

### Example 3: Technical Drawings
- Draw precise geometric shapes with polylines
- Use grid snapping for accurate dimensions  
- Simulate to verify motion efficiency

## 🔍 Troubleshooting

### Common Issues
- **Paths not appearing**: Check if tool is selected properly
- **Simulation not starting**: Ensure at least one path is drawn
- **Jerky motion**: Increase smoothing or reduce speed
- **Browser compatibility**: Use Chrome/Firefox for best results

### Performance Tips
- Keep path complexity reasonable (< 1000 points per path)
- Use appropriate smoothing levels
- Clear unused paths regularly
- Close other browser tabs for better performance

## 📊 Use Cases

### Educational
- **Robotics Education**: Understand motion planning concepts
- **Programming Concepts**: Visual feedback for algorithmic thinking
- **Mathematics**: Bezier curves, interpolation, optimization

### Prototyping
- **Motion Planning**: Test robot paths before physical implementation
- **Art Projects**: Plan pen plotter or laser cutter operations
- **Manufacturing**: Visualize CNC-like operations

### Creative Applications
- **Digital Art**: Create unique algorithmic artwork
- **Animation Planning**: Storyboard complex motions
- **Interactive Installations**: Real-time drawing experiences

---

**🎉 Have fun exploring the intersection of creative coding and mechanical motion!**

For technical details, see `README.md`
For source code, check the `/js` directory
