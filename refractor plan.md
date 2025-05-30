// refactor_plan.md
# Refactoring Plan: Electrical CAD Application

This plan outlines the steps to refactor `app.js`, `drawing-engine.js`, and `styles.css` into smaller, more manageable modules, each with a target maximum of 500 lines. The goal is to improve code organization and maintainability without altering functionality.

## 0. RULES
- Always check @refractor plan.md , and after each step compeleted check the checkbox

## I. Preparation
- [x] **Create Directories**: Create new directories to organize the refactored files:
    - `js/app/` (for `ElectricalCADApp` related files)
    - `js/drawing-engine/` (for `DrawingEngine` related files)
    - `css/modules/` (for split CSS files)
- [x] **Understand Scope**: Recognize that `window.app` and `window.drawingEngine` are used globally. The refactoring must maintain this, especially for HTML `onchange` handlers calling `drawingEngine.updateElementProperty`.

## II. Refactoring `styles.css` 

The strategy is to move logical blocks of CSS into separate files.

- [x] **Create `css/styles-base.css`**:
    - Move global reset styles, `:root` variables (light/dark themes), and `body` styles.
    - Move global scrollbar styles (`::-webkit-scrollbar`).
- [x] **Create `css/modules/layout.css`**:
    - Move styles for `.app-container`, `.header`, `.header-left`, `.header-right`, `.main-content`.
- [x] **Create `css/modules/buttons.css`**:
    - Move generic button styles (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-info`, `.btn-dark-mode`).
- [x] **Create `css/modules/toolbar.css`**:
    - Move styles for `.toolbar`, `.tool-section`, `.tool-grid`, `.tool-btn-icon`, `.symbol-grid-compact`, `.symbol-btn-icon`, `.symbol-icon-*` (definitions for drawing symbols), `.line-types-compact`, `.line-type-btn-icon`, `.line-sample-*`, `.options-compact`, `.checkbox-label-compact`.
- [x] **Create `css/modules/toolbar-controls.css`**:
    - Move styles for `.selection-controls-compact`, `.compact-select`, `.batch-controls-compact`, `.batch-btn-compact`, `.compact-input`, `.batch-name-options`, `.checkbox-item-compact`, `.undo-redo-controls`.
- [x] **Create `css/modules/canvas-map.css`**:
    - Move styles for `.canvas-container`, `#drawingCanvas`, `.canvas-controls` (for canvas), `.control-btn` (generic for canvas/map), `.map-container`, `#leafletMap`, `.map-controls` (for map), map popups (`.pole-popup`, `.line-popup`, `.no-gps-message`), `.custom-pole-icon`.
- [x] **Create `css/modules/properties-panel.css`**:
    - Move styles for `.properties-panel`, `.empty-state`, `.element-header`, `.element-icon`, `.pole-icon`, `.line-icon`, `.element-info`, `.properties-form`, `.form-row`, `.form-section`, `.section-label`, `.checkbox-group` (if specific to panel), `.checkbox-item` (if specific), related `.checkmark` (if specific), `.location-info`, `.measurement-info`, `.coord-item`, `.measure-item`, `.property-actions`, `.delete-btn`.
    - **Action**: Move the CSS rules from the `additionalStyles` const at the end of `app.js` into this file and remove the JavaScript code that injects these styles from `app.js`.
- [x] **Create `css/modules/legend.css`**:
    - Move styles for `.legend`, `.legend-header`, `.legend-controls`, `.legend-control-btn`, `.legend-content`, `.legend-section`, `.legend-item`, legend-specific `.legend-symbol-*`, legend-specific `.legend-line-*`.
- [x] **Create `css/modules/statusbar.css`**:
    - Move styles for `.status-bar`, `.status-item`.
- [x] **Create `css/modules/notifications.css`**:
    - Move notification styles (from `ElectricalCADApp.prototype.showNotification`'s embedded CSS). Remove the JavaScript code that injects these styles from `app.js`.
- [x] **Create `css/modules/input-overlay.css`**:
    - Move styles for `.line-input-overlay` (for precise line drawing).
- [x] **Create `css/modules/snap.css`**:
    - Move styles for `.snap-settings`, `.snap-header`, `.snap-details`, `.tool-options .checkbox-item` (for snap toggle), `.snap-types-compact`, `.snap-type-compact`, `.snap-icon-*`, `.snap-distance-compact`, `#snapDistanceValue`.
- [x] **Create `css/modules/dimension-controls.css`**:
    - Move styles for `.dimension-controls`, `.dimension-preset-row`, `.preset-buttons`, `.dimension-group`, `.group-header`, `.dimension-compact-row`, `.compact-control`, `.dimension-checkbox-row`, `.checkbox-label` (if primarily for dimensions), related `.checkmark`.
- [x] **Create `css/styles-responsive.css`**:
    - Move all `@media` queries and their responsive styles into this single file.
- [x] **Update `index.html`**:
    - Replace `<link rel="stylesheet" href="styles.css">` with individual links to the new CSS files. Order matters: `styles-base.css` first, then layout, then components, then specific sections, and `styles-responsive.css` last.
    ```html
    <!-- In index.html <head> -->
    <link rel="stylesheet" href="css/styles-base.css">
    <link rel="stylesheet" href="css/modules/layout.css">
    <link rel="stylesheet" href="css/modules/buttons.css">
    <link rel="stylesheet" href="css/modules/toolbar.css">
    <link rel="stylesheet" href="css/modules/toolbar-controls.css">
    <link rel="stylesheet" href="css/modules/snap.css">
    <link rel="stylesheet" href="css/modules/dimension-controls.css">
    <link rel="stylesheet" href="css/modules/canvas-map.css">
    <link rel="stylesheet" href="css/modules/properties-panel.css">
    <link rel="stylesheet" href="css/modules/legend.css">
    <link rel="stylesheet" href="css/modules/statusbar.css">
    <link rel="stylesheet" href="css/modules/notifications.css">
    <link rel="stylesheet" href="css/modules/input-overlay.css">
    <!-- Add any other smaller component CSS files here -->
    <link rel="stylesheet" href="css/styles-responsive.css">
    ```
- [ ] **Test**: Verify all styles are applied correctly.

## III. Refactoring `app.js` 

The `ElectricalCADApp` class methods will be moved to separate files and attached to `ElectricalCADApp.prototype`.

- [x] **Create `js/app/app-main.js`**:
    - Define the `ElectricalCADApp` class.
    - Include the `constructor`, `init()`, and `setupApplication()` (the main structure of it, calls to other setup methods will be made from here).
    - Include `resizeCanvas()`.
    - Ensure `window.app = new ElectricalCADApp();` is correctly handled (likely at the end of this file or a dedicated `app-init.js` loaded last).
- [x] **Create `js/app/app-event-setup.js`**:
    - Move `setupEventListeners()` here as `ElectricalCADApp.prototype.setupEventListeners`. This method will be a coordinator, calling more specific event setup methods.
    - _Note: Individual event listener setups will be further broken down._
- [x] **Create `js/app/app-event-listeners-header.js`**:
    - Define `ElectricalCADApp.prototype.setupHeaderEventListeners = function() { //... }`.
    - Move listeners for: `#newProject`, `#saveProject`, `#loadGpx`, `#toggleMapView`, `#darkModeToggle`, the dynamically created `enableRealCoordsBtn`.
    - Call this method from `setupEventListeners`.
- [x] **Create `js/app/app-event-listeners-tools.js`**:
    - Define `ElectricalCADApp.prototype.setupToolEventListeners = function() { //... }`.
    - Move listeners for: `.tool-btn-icon`, `.symbol-btn-icon`, `.line-type-btn-icon`, `#zoomIn`, `#zoomOut`, `#resetView`, `#addGrounding`, `#addGuywire`, `#showNameLabels`.
    - Call this method from `setupEventListeners`.
- [x] **Create `js/app/app-event-listeners-selection.js`**:
    - Define `ElectricalCADApp.prototype.setupSelectionEventListeners = function() { //... }`.
    - Move listeners for: `#selectAll`, `#clearSelection`, `#selectFiltered`, `#batchChangeType`, `#batchChangeName`.
    - Call this method from `setupEventListeners`.
- [x] **Create `js/app/app-event-listeners-snap.js`**:
    - Define `ElectricalCADApp.prototype.setupSnapEventListeners = function() { //... }`.
    - Move listeners for: `#snapToggle`, `#snapEndpoints`, `#snapIntersections`, `#snapMidpoints`, `#snapGrid`, `#snapPerpendicular`, `#snapParallel`, `#snapCenter`, `#snapDistance`.
    - Call this method from `setupEventListeners`.
- [x] **Create `js/app/app-event-listeners-dimensions.js`**:
    - Define `ElectricalCADApp.prototype.setupDimensionStyleControlListeners = function() { //... }`.
    - Move the content of `setupDimensionStyleControls()` here. Rename the original method or adapt.
    - Define `ElectricalCADApp.prototype.setupDimensionPresetControlListeners = function() { //... }`.
    - Move the content of `setupDimensionPresetControls()` here.
    - Call these methods from `setupApplication` or `setupEventListeners`.
- [x] **Create `js/app/app-event-listeners-misc.js`**:
    - Define `ElectricalCADApp.prototype.setupMiscEventListeners = function() { //... }`.
    - Move listeners for: `#gpxFileInput`, `#undoBtn`, `#redoBtn`.
    - Call this method from `setupEventListeners`.
- [x] **Create `js/app/app-legend.js`**:
    - Move `setupLegendControls()` to `ElectricalCADApp.prototype.setupLegendControls`.
    - Call from `setupApplication`.
- [x] **Create `js/app/app-keyboard.js`**:
    - Move `handleKeyboard()` to `ElectricalCADApp.prototype.handleKeyboard`.
    - Ensure it's called from `setupEventListeners`.
- [x] **Create `js/app/app-tool-management.js`**:
    - Move `selectToolByType()`, `selectTool()`, `selectSymbol()`, `selectLineType()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-dimension-presets.js`** ✅:
    - Move `applyDimensionPreset()`, `updateDimensionStyleUI()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-project-management.js`** ✅:
    - Move `newProject()`, `saveProject()`, `loadProject()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-gpx-handling.js`** ✅:
    - Move `loadGPXFile()`, `handleGPXFile()`, `processGPXContent()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-coordinates.js`** ✅:
    - Move `enableRealCoordinatesForDrawing()` to `ElectricalCADApp.prototype.enableRealCoordinatesForDrawing`.
- [x] **Create `js/app/app-ui-updates.js`** ✅:
    - Move `updateUndoRedoButtons()`, `updateStatusBar()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-notifications.js`** ✅:
    - Move `showNotification()`, `removeNotification()` to `ElectricalCADApp.prototype` methods.
    - **Action**: Remove the CSS injection part from `showNotification()`; this CSS is now in `css/modules/notifications.css`.
- [x] **Create `js/app/app-theme.js`** ✅:
    - Move `toggleDarkMode()`, `initializeTheme()` to `ElectricalCADApp.prototype` methods.
- [x] **Create `js/app/app-export.js`** ✅:
      - Move `exportAsImage()` to `ElectricalCADApp.prototype.exportAsImage`.
- [x] **Update `index.html`** ✅:
      - Add `<script>` tags for the new `js/app/*.js` files. Load `js/app/app-main.js` first, then all other `ElectricalCADApp.prototype` method files, then ensure the `new ElectricalCADApp()` call happens. (Order is important, `app-main.js` which defines the class constructor must come before files that add methods to its prototype).
- [ ] **Test**: Incrementally test functionalities related to each moved set of methods.

## IV. Refactoring `drawing-engine.js`

Similar to `app.js`, `DrawingEngine` methods will be moved to `DrawingEngine.prototype` in separate files.

- [x] **Create `js/drawing-engine/drawing-engine-main.js`**:
    - Define the `DrawingEngine` class.
    - Include the `constructor` and `setupEventListeners()` (main structure, delegating to specific handlers).
    - Keep `setTool()`, `setPoleType()`, `setLineType()`, `setGrounding()`, `setGuywire()`, `toggleNameLabels()`.
    - Keep `zoomIn()`, `zoomOut()`, `resetView()`.
- [x] **Create `js/drawing-engine/drawing-engine-commands.js`**:
    - Move all command classes (`AddPoleCommand`, `AddLineCommand`, `DeleteElementCommand`, `UpdatePropertyCommand`, `BatchChangeTypeCommand`, `BatchChangeNameCommand`, `AddDimensionCommand`) here.
- [x] **Create `js/drawing-engine/drawing-engine-events.js`**:
    - Move `handleMouseDown()`, `handleMouseMove()`, `handleMouseUp()`, `handleWheel()`, `handleResize()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-selection.js`**:
    - Move `handleSelect()`, `startDragSelection()`, `updateDragSelection()`, `finishDragSelection()`, `isLineIntersectingRect()`, `lineIntersectsLine()`, `selectAll()`, `clearSelection()`, `selectByFilter()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-utils.js`**:
    - Move `isPointInPole()`, `isPointOnLine()`, `calculateDistance()`, `calculateCoordinateSystemCenter()`, `canvasToUTM()`, `utmToCanvas()`, `utmToLatLon()`, `enableRealCoordinates()`, `updateElementProperty()`, `clearSelection()`, `selectByFilter()`, `batchChangeType()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-drawing.js`**:
    - Move `addPole()`, `startLine()`, `finishLine()`, `deleteSelected()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-snap.js`**:
    - Move all snap system methods: `toggleSnap()`, `setSnapEnabled()`, `setSnapType()`, `setSnapDistance()`, `findSnapPoint()`, `updateSnapPoint()`, `findEndpointSnaps()`, `findMidpointSnaps()`, `findGridSnaps()`, `findIntersectionSnaps()`, `findPerpendicularSnaps()`, `findParallelSnaps()`, `findCenterSnaps()`, `getLineIntersection()` (if primarily for snap), `getPerpendicularPoint()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-dimensions.js`**:
    - Move angle dimension tool methods: `drawDimension()`, `drawAngleDimension3Point()`, `drawAngleDimension2Line()`, `formatAngleText()`, `drawDimensionText()`, `setLineStyle()` (if specific to dimensions), `drawArrowHead()`, `drawAnglePreview()`, `resetAngleTool()`, `handleAngleToolClick()`, `updateAnglePreview()`, `createAngleDimension()`, `calculateAngle3Points()`, `calculateAngle2Lines()`, `findLinesIntersection()` (if for dimensions), `findPoleAt()`, `findLineAt()`, `showAngleInstructions()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-rendering.js`**:
    - Move `render()`, `drawGrid()`, `drawPole()` (and its sub-draw methods: `drawTiangBajaExisting`, etc.), `drawGrounding()`, `drawGuywire()`, `drawLine()`, `drawDragSelection()`, `drawSnapIndicator()`, `drawSnapTooltip()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-precise-line.js`**:
    - Move `updateLineDrawing()`, `showInputOverlay()`, `updateInputOverlay()`, `setupInputOverlayEvents()` (this might need careful handling if it attaches listeners to dynamically created elements by `showInputOverlay`), `updateLineFromInputs()`, `hideInputOverlay()`, `cancelLine()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-properties-panel.js`**:
    - Move `updatePropertiesPanel()` to `DrawingEngine.prototype.updatePropertiesPanel`.
- [x] **Create `js/drawing-engine/drawing-engine-io.js`**:
    - Move `exportData()`, `importData()`, `clear()`, `loadFromGPX()` to `DrawingEngine.prototype` methods.
- [x] **Create `js/drawing-engine/drawing-engine-history.js`**:
    - Move `executeCommand()`, `undo()`, `redo()`, `canUndo()`, `canRedo()`, `clearHistory()` to `DrawingEngine.prototype` methods.
- [x] **Update `index.html`**:
    - Add `<script>` tags for the new `js/drawing-engine/*.js` files. Load `drawing-engine-commands.js` and `drawing-engine-main.js` first, then other prototype method files.
- [x] **Test**: Incrementally test functionalities after each major split. Pay close attention to `this` context and dependencies between methods.

## V. Updating `index.html` Script Order

Review and finalize the script loading order in `index.html`. A general guideline:
1.  Utility/external libraries (Leaflet is already there).
2.  Command classes (if used by core engine class constructors).
3.  Core class definitions (`drawing-engine-main.js`, `app-main.js`).
4.  Files adding prototype methods to these core classes.
5.  Other helper scripts like `gpx-parser.js`, `map-manager.js`, `snap-toggle.js`.
6.  The script that instantiates the main application object (`window.app = new ElectricalCADApp();`).

Example refined order:
```html
<!-- In index.html <body>, before closing </body> tag -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

<script src="js/drawing-engine/drawing-engine-commands.js"></script>
<script src="js/drawing-engine/drawing-engine-main.js"></script>
<!-- All other js/drawing-engine/*.js files -->
<script src="js/drawing-engine/drawing-engine-event-handlers.js"></script>
<script src="js/drawing-engine/drawing-engine-selection.js"></script>
<script src="js/drawing-engine/drawing-engine-batch.js"></script>
<script src="js/drawing-engine/drawing-engine-elements.js"></script>
<script src="js/drawing-engine/drawing-engine-snap.js"></script>
<script src="js/drawing-engine/drawing-engine-dimensions.js"></script>
<script src="js/drawing-engine/drawing-engine-precise-line.js"></script>
<script src="js/drawing-engine/drawing-engine-coordinates.js"></script>
<script src="js/drawing-engine/drawing-engine-render.js"></script>
<script src="js/drawing-engine/drawing-engine-render-primitives.js"></script>
<script src="js/drawing-engine/drawing-engine-properties-panel.js"></script>
<script src="js/drawing-engine/drawing-engine-io.js"></script>
<script src="js/drawing-engine/drawing-engine-history.js"></script>

<script src="gpx-parser.js"></script>
<script src="map-manager.js"></script>
<script src="snap-toggle.js"></script>

<script src="js/app/app-main.js"></script>
<!-- All other js/app/*.js files -->
<script src="js/app/app-event-setup.js"></script>
<script src="js/app/app-event-listeners-header.js"></script>
<script src="js/app/app-event-listeners-tools.js"></script>
<script src="js/app/app-event-listeners-selection.js"></script>
<script src="js/app/app-event-listeners-snap.js"></script>
<script src="js/app/app-event-listeners-dimensions.js"></script>
<script src="js/app/app-event-listeners-misc.js"></script>
<script src="js/app/app-legend.js"></script>
<script src="js/app/app-keyboard.js"></script>
<script src="js/app/app-tool-management.js"></script>
<script src="js/app/app-dimension-presets.js"></script>
<script src="js/app/app-project-management.js"></script>
<script src="js/app/app-gpx-handling.js"></script>
<script src="js/app/app-coordinates.js"></script>
<script src="js/app/app-ui-updates.js"></script>
<script src="js/app/app-notifications.js"></script>
<script src="js/app/app-theme.js"></script>
<script src="js/app/app-export.js"></script>
<!-- The ElectricalCADApp instantiation (window.app = new ElectricalCADApp();) should be included in app-main.js after the class definition -->