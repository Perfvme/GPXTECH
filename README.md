# Electrical CAD Drawing Web Application

A specialized web-based CAD application for creating electrical technical drawings, with support for converting GPX waypoints into electrical network diagrams.

## Features

### 1. CAD Technical Drawing Functions
- **Edit**: Select and modify existing elements
- **Add**: Create new poles and lines
- **Delete**: Remove unwanted elements
- **Pan & Zoom**: Navigate through your drawing
- **Grid System**: Snap-to-grid functionality for precise placement

### 2. GPX to Electrical Drawing Conversion
- Import GPX files containing waypoints, tracks, and routes
- Automatically convert waypoints to electrical poles ("tiang")
- Convert tracks/routes to electrical lines (SUTM/SUTR)
- Intelligent type detection based on naming conventions
- Coordinate projection from GPS to canvas coordinates

### 3. Symbol Library
The application includes authentic electrical symbols matching Indonesian standards:

#### Pole Types (Tiang)
- **Tiang Baja Eksisting**: Filled black circle
- **Tiang Baja Rencana**: Empty circle with black border
- **Tiang Beton Eksisting**: Filled black circle with white center dot
- **Tiang Beton Rencana**: Empty circle with black center dot
- **Gardu Portal Rencana**: Square with lightning bolt symbol

#### Line Types
- **SUTM Rencana**: Red dashed line (Medium voltage planned)
- **SUTM Eksisting**: Red solid line (Medium voltage existing)
- **SUTR Rencana**: Blue dashed line (Low voltage planned)
- **SUTR Eksisting**: Blue solid line (Low voltage existing)

#### Accessories
- **Grounding**: Ground symbol attached to poles
- **Guy Wire**: Diagonal support lines

### 4. Interactive Editing
- Click to select elements
- Properties panel for editing element attributes
- Real-time visual feedback
- Keyboard shortcuts for efficient workflow

## Getting Started

### Installation
1. Download all files to a local directory
2. Open `index.html` in a modern web browser
3. No additional installation required - runs entirely in the browser

### Basic Usage

#### Creating a New Drawing
1. Click "New Project" to start fresh
2. Select a tool from the toolbar:
   - **Select**: Choose and modify elements
   - **Pan**: Navigate the canvas
   - **Line**: Draw electrical lines
   - **Pole**: Place electrical poles

#### Drawing Poles
1. Select a pole type from the symbol library
2. Click the "Pole" tool or press 'P'
3. Click on the canvas to place poles
4. Use checkboxes to add grounding or guy wires

#### Drawing Lines
1. Select a line type (SUTM/SUTR, Existing/Planned)
2. Click the "Line" tool or press 'L'
3. Click to start the line, move mouse, click to finish

#### Loading GPX Files
1. Click "Load GPX" button
2. Select a .gpx file from your computer
3. The application will:
   - Parse waypoints as poles
   - Convert tracks/routes to lines
   - Auto-detect types based on names
   - Project coordinates to fit the canvas

### Keyboard Shortcuts
- **V**: Select tool
- **H**: Pan tool
- **L**: Line tool
- **P**: Pole tool
- **Delete/Backspace**: Delete selected element
- **Escape**: Deselect all
- **Ctrl+S**: Save project
- **Ctrl+N**: New project
- **Ctrl+O**: Open GPX file

### Canvas Controls
- **Mouse Wheel**: Zoom in/out
- **Zoom In/Out buttons**: Precise zoom control
- **Reset View**: Return to default zoom and position

## File Formats

### GPX Import
Supported GPX elements:
- **Waypoints** (`<wpt>`): Converted to poles
- **Tracks** (`<trk>`): Converted to line segments
- **Routes** (`<rte>`): Converted to line segments

### Project Export
Projects are saved as JSON files containing:
- Drawing elements (poles and lines)
- View settings (zoom, pan)
- Project metadata

## Technical Specifications

### Browser Requirements
- Modern web browser with HTML5 Canvas support
- JavaScript enabled
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)

### File Structure
```
GPXTECH/
├── index.html          # Main application interface
├── styles.css          # Application styling
├── app.js             # Main application controller
├── drawing-engine.js   # Canvas rendering and drawing logic
├── gpx-parser.js      # GPX file parsing and conversion
└── README.md          # This documentation
```

### Dependencies
- Font Awesome 6.0.0 (CDN)
- No other external dependencies

## Advanced Features

### Automatic Type Detection
The application intelligently determines element types based on naming:

**For Poles:**
- Names containing "gardu" or "portal" → Gardu Portal
- Names containing "beton" + "rencana" → Tiang Beton Rencana
- Names containing "beton" → Tiang Beton Existing
- Names containing "baja" + "rencana" → Tiang Baja Rencana
- Default → Tiang Baja Existing

**For Lines:**
- Names containing "sutm" + "rencana" → SUTM Rencana
- Names containing "sutm" → SUTM Existing
- Names containing "sutr" + "rencana" → SUTR Rencana
- Names containing "sutr" → SUTR Existing
- Names containing "medium", "20kv", "tengah" → SUTM Existing
- Names containing "low", "rendah", "380v" → SUTR Existing

### Coordinate System
- GPS coordinates are automatically projected to canvas coordinates
- Maintains aspect ratio and centers the drawing
- Supports zoom and pan operations

### Properties Panel
When an element is selected, the properties panel shows:
- Element name (editable)
- Type selector
- Position information
- Type-specific options (grounding, guy wire for poles)
- Delete button

## Troubleshooting

### Common Issues

**GPX file won't load:**
- Ensure the file has a .gpx extension
- Check that the file contains valid XML
- Verify waypoints, tracks, or routes are present

**Canvas appears blank:**
- Try clicking "Reset View"
- Check browser console for errors
- Ensure JavaScript is enabled

**Symbols don't appear correctly:**
- Refresh the page
- Check that Font Awesome is loading (internet connection required)
- Try a different browser

### Performance Tips
- For large GPX files (>1000 points), consider splitting into smaller files
- Use the zoom controls for detailed work
- Save projects regularly

## Contributing

This application is designed to be easily extensible:

1. **Adding new symbols**: Modify the `drawingEngine.js` file
2. **New file formats**: Extend the parser modules
3. **UI improvements**: Update `styles.css` and `index.html`
4. **Additional tools**: Add to the toolbar and implement in the drawing engine

## License

This project is open source and available for educational and commercial use.

## Support

For technical support or feature requests, please refer to the project documentation or contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: Modern web browsers with HTML5 Canvas support#   G P X T E C H 
 
 