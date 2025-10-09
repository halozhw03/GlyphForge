# 2D Mechanical Arm Simulator

This project transforms a desktop FDM 3D printer into a low-cost 2D mechanical arm simulator. It provides an intuitive drawing interface where users can create paths and visualize how they would be executed by a 3D printer's motion system.

## Features

### Drawing Tools (Left Panel)
- **Freehand Drawing** - Click and drag to draw smooth curves
- **Polyline Tool** - Click to add points, create multi-segment paths
- **Bezier Curves** - Create smooth parametric curves with control points
- **Edit Tool** - Select and modify existing paths
- **Delete Tool** - Remove unwanted paths

### Path Processing
- **Automatic Smoothing** - Real-time path optimization and noise reduction
- **Path Simplification** - Douglas-Peucker algorithm for point reduction
- **Jitter Removal** - Eliminates small unwanted movements
- **Resampling** - Ensures uniform point spacing

### Printer Simulation (Right Panel)
- **Real-time Motion Simulation** - Visualizes printhead movement
- **Configurable Work Area** - Adjustable print bed dimensions
- **Speed Control** - Variable movement speed simulation
- **Progress Tracking** - Shows completion percentage and estimated time
- **Visual Feedback** - Grid overlay and coordinate system

### 🆕 Real Printer Connection (NEW!)
- **Ender 3 Pro & Ender 5 Support** - Direct USB connection to physical printers
- **WebSerial Integration** - Browser-based serial communication
- **Dual Print Modes** - Switch between simulation and real printing
- **Automatic G-code Generation** - Convert paths to printer commands
- **Real-time Status Monitoring** - Connection and print status display
- **Safety Features** - Boundary checking, emergency stop, confirmation dialogs

📖 **See [PRINTER_CONNECTION_GUIDE.md](PRINTER_CONNECTION_GUIDE.md) for detailed instructions**

## Usage

### Troubleshooting

### Robot Mode Click Issues

If clicking on placed objects in Robot Mode has no response, please check:

1. **Browser Console**: Open browser developer tools (F12) and check the console for error messages
2. **Tool Status**: Make sure the correct tool is selected (Place Object, Set Target, or Delete Object)
3. **Fallback System**: The system uses a fallback canvas rendering system. Debug messages will show "Using fallback system: true"

### Debug Information

The system now includes debug logging. When clicking on the canvas, you should see messages like:
- "Canvas click at: {x, y} tool: delete-object"
- "Processing click with tool: delete-object"
- "Calling deleteObjectAtFallback" (if using fallback system)
- "deleteObjectAtFallback called with point: {x, y}"

If you don't see these messages, the click event is not being handled properly.

## Getting Started
1. Open `index.html` in a modern web browser (Chrome/Firefox recommended)
2. Use the drawing tools in the left panel to create paths
3. Adjust smoothing and other parameters as needed
4. Click "Simulate" to see the motion simulation in the right panel

### Keyboard Shortcuts
- `1` - Freehand drawing tool
- `2` - Polyline tool  
- `3` - Bezier curve tool
- `E` - Edit tool
- `D` - Delete tool
- `Space` - Start/pause simulation
- `Ctrl+R` - Clear all paths
- `Escape` - Cancel current operation
- `Enter` - Finish current operation (for polyline/bezier tools)

### Drawing Tips
- For smooth curves, use the freehand tool with higher smoothing values
- For precise geometric shapes, use the polyline tool
- For organic curves, try the Bezier tool with carefully placed control points
- Use the edit tool to fine-tune path control points
- Adjust the smoothing slider to balance between accuracy and smoothness

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Drawing Engine**: Paper.js for vector graphics
- **Simulation**: p5.js for real-time animation
- **Path Processing**: Custom algorithms for optimization

### Key Components
- `DrawingCanvas.js` - Handles all drawing operations and tools
- `PathProcessor.js` - Path optimization and mathematical operations  
- `PrinterSimulator.js` - Motion simulation and visualization
- `app.js` - Main application controller and UI management

### Browser Support
- Chrome 89+
- Firefox 87+
- Safari 14+
- Edge 89+

## Development

### File Structure
```
drawing-interface/
├── index.html          # Main application page
├── css/
│   └── style.css      # Application styles
├── js/
│   ├── app.js         # Main application controller
│   ├── DrawingCanvas.js   # Paper.js drawing implementation
│   ├── PathProcessor.js   # Path optimization algorithms
│   └── PrinterSimulator.js # p5.js motion simulation
└── README.md          # This file
```

### Customization
- Modify `workArea` dimensions in `PrinterSimulator.js` for different printer sizes
- Adjust path processing parameters in `PathProcessor.js` for different smoothing behaviors
- Customize colors and styling in `style.css`

## Future Enhancements

- [ ] Export paths to G-code format
- [ ] Import SVG files for path conversion
- [x] ~~Real printer connection via WebSerial~~ ✅ **COMPLETED!**
- [ ] 3D visualization with Z-axis control
- [ ] Advanced path optimization algorithms
- [ ] Collaborative drawing features
- [ ] Mobile touch interface optimization

## License

This project is part of the p5.fab ecosystem and follows the same MIT license terms.

## Credits

Built on top of the excellent p5.fab library by the Machine Agency at the University of Washington. Special thanks to the Paper.js and p5.js communities for their fantastic libraries.
