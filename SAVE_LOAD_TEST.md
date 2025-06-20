# Save/Load Functionality Test Guide

## Overview
This guide explains how to test the complete save/load functionality of the Electrical CAD application.

## Features Tested
- ✅ Project saving to JSON files
- ✅ Project loading from JSON files  
- ✅ Data validation and error handling
- ✅ Backup creation before loading
- ✅ GPX data preservation
- ✅ Coordinate system preservation
- ✅ Title block data preservation
- ✅ Drawing elements (poles, lines, dimensions)
- ✅ View settings (zoom, pan)

## Testing Methods

### Method 1: Automated Testing
1. Open the main application (`index.html`)
2. Open browser console (F12)
3. Run: `window.app.testSaveLoad()`
4. Check console for test results

### Method 2: Manual Testing (Recommended)
1. Open the main application (`index.html`)
2. Create some content:
   - Add a few poles using the pole tool
   - Draw some lines between poles
   - Add dimensions
   - Configure title block settings
3. Click "Save Project" button
4. Create a new project (File → New Project)
5. Click "Load Project" button and select your saved file
6. Verify all content is restored correctly

### Method 3: Test Page
1. Open `test-save-load.html` in your browser
2. Run automated tests
3. Test manual save/load functionality
4. Check logs for detailed results

## What Gets Saved

### Project Metadata
```json
{
  "name": "Project Name",
  "created": "2024-01-01T00:00:00.000Z",
  "modified": "2024-01-01T00:00:00.000Z", 
  "version": "1.0"
}
```

### Drawing Data
```json
{
  "drawing": {
    "elements": {
      "poles": [...],
      "lines": [...], 
      "dimensions": [...]
    },
    "zoom": 1.0,
    "panX": 0,
    "panY": 0
  }
}
```

### Coordinate System
```json
{
  "metadata": {
    "coordinateSystem": {
      "isRealCoordinates": true,
      "utmZone": 33,
      "centerUtmX": 500000,
      "centerUtmY": 6000000,
      "scale": 1.0
    }
  }
}
```

### GPX Data (if imported)
```json
{
  "gpxData": {
    "waypoints": [...],
    "tracks": [...],
    "routes": [...],
    "bounds": {...}
  }
}
```

## Test Scenarios

### Basic Save/Load
1. Create simple drawing with 2-3 poles and lines
2. Save project
3. Clear/new project 
4. Load saved project
5. Verify elements are restored

### GPX Workflow
1. Import a GPX file
2. Modify the imported elements
3. Save project
4. Load project
5. Verify GPX data is preserved for elevation profiles

### Real Coordinates
1. Enable real coordinates
2. Draw with metric precision
3. Save project
4. Load project
5. Verify coordinate system is preserved

### Title Block
1. Configure custom title block
2. Save project
3. Load project
4. Verify title block settings are preserved

## Error Handling Tests

### Invalid File
1. Try to load a non-JSON file
2. Verify error message appears

### Corrupted Data
1. Create a JSON file with invalid structure
2. Try to load it
3. Verify validation catches the error

### Missing Fields
1. Create a JSON file missing required fields
2. Try to load it
3. Verify validation fails gracefully

## Expected Behavior

### Save Success
- File downloads automatically
- Filename includes project name and date
- Notification shows "Project saved successfully"
- Console logs detailed save information

### Load Success  
- All drawing elements restored
- View settings (zoom/pan) restored
- Coordinate system preserved
- Notification shows "Project loaded successfully"
- Console logs detailed load information

### Error Handling
- Clear error messages for invalid files
- Backup created before loading new project
- Application remains stable after errors

## File Format

### JSON Structure
The saved project file is a JSON file with the following structure:
- Human-readable (formatted with indentation)
- Version information for future compatibility
- Complete drawing state
- Metadata for coordinate systems
- Optional GPX data for elevation profiles

### File Naming
- Format: `ProjectName_YYYY-MM-DD.json`
- Special characters replaced with underscores
- Date helps identify newer versions

## Troubleshooting

### Save Not Working
- Check browser console for errors
- Ensure popup blockers aren't blocking downloads
- Verify browser supports File API

### Load Not Working  
- Check file is valid JSON
- Verify file contains required fields
- Check browser console for validation errors

### Missing Elements
- Verify all element types are included in save
- Check coordinate system is properly restored
- Ensure metadata is preserved

## Browser Compatibility
- ✅ Chrome 60+
- ✅ Firefox 55+  
- ✅ Safari 11+
- ✅ Edge 79+

## Performance Notes
- Large projects (1000+ elements) may take a few seconds to save/load
- GPX data increases file size but improves functionality
- Automatic backup creation prevents data loss 