/**
 * Drawing Engine Commands
 * Command pattern implementations for undo/redo functionality
 */

/**
 * Add Pole Command
 */
class AddPoleCommand {
    constructor(drawingEngine, pole) {
        this.drawingEngine = drawingEngine;
        this.pole = pole;
    }

    execute() {
        this.drawingEngine.elements.poles.push(this.pole);
    }

    undo() {
        this.drawingEngine.elements.poles = this.drawingEngine.elements.poles.filter(p => p.id !== this.pole.id);
    }
}

/**
 * Add Line Command
 */
class AddLineCommand {
    constructor(drawingEngine, line) {
        this.drawingEngine = drawingEngine;
        this.line = line;
    }

    execute() {
        this.drawingEngine.elements.lines.push(this.line);
    }

    undo() {
        this.drawingEngine.elements.lines = this.drawingEngine.elements.lines.filter(l => l.id !== this.line.id);
    }
}

/**
 * Delete Element Command
 */
class DeleteElementCommand {
    constructor(drawingEngine, element) {
        this.drawingEngine = drawingEngine;
        this.element = element;
        this.isPole = element.type && element.type.includes('tiang');
    }

    execute() {
        if (this.isPole) {
            this.drawingEngine.elements.poles = this.drawingEngine.elements.poles.filter(p => p.id !== this.element.id);
        } else {
            this.drawingEngine.elements.lines = this.drawingEngine.elements.lines.filter(l => l.id !== this.element.id);
        }
    }

    undo() {
        if (this.isPole) {
            this.drawingEngine.elements.poles.push(this.element);
        } else {
            this.drawingEngine.elements.lines.push(this.element);
        }
    }
}

/**
 * Update Property Command
 */
class UpdatePropertyCommand {
    constructor(drawingEngine, element, property, newValue, oldValue) {
        this.drawingEngine = drawingEngine;
        this.element = element;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

    execute() {
        this.element[this.property] = this.newValue;
    }

    undo() {
        this.element[this.property] = this.oldValue;
    }
}

/**
 * Batch Change Type Command
 */
class BatchChangeTypeCommand {
    constructor(drawingEngine, elements, newType) {
        this.drawingEngine = drawingEngine;
        this.changes = [];
        
        // Store old values for undo
        elements.forEach(element => {
            this.changes.push({
                element: element,
                oldType: element.type,
                newType: newType
            });
        });
    }

    execute() {
        this.changes.forEach(change => {
            change.element.type = change.newType;
        });
    }

    undo() {
        this.changes.forEach(change => {
            change.element.type = change.oldType;
        });
    }
}

/**
 * Batch Change Name Command
 */
class BatchChangeNameCommand {
    constructor(drawingEngine, elements, newName, useNumberedNames) {
        this.drawingEngine = drawingEngine;
        this.changes = [];
        
        // Store old values for undo
        let counter = 1;
        elements.forEach(element => {
            const finalName = useNumberedNames && elements.length > 1 ? `${newName} ${counter}` : newName;
            this.changes.push({
                element: element,
                oldName: element.name,
                newName: finalName
            });
            counter++;
        });
    }

    execute() {
        this.changes.forEach(change => {
            change.element.name = change.newName;
        });
    }

    undo() {
        this.changes.forEach(change => {
            change.element.name = change.oldName;
        });
    }
}

/**
 * Command for adding dimension
 */
class AddDimensionCommand {
    constructor(drawingEngine, dimension) {
        this.drawingEngine = drawingEngine;
        this.dimension = dimension;
    }

    execute() {
        if (!this.drawingEngine.elements.dimensions.find(d => d.id === this.dimension.id)) {
            this.drawingEngine.elements.dimensions.push(this.dimension);
        }
        this.drawingEngine.render();
    }

    undo() {
        const index = this.drawingEngine.elements.dimensions.findIndex(d => d.id === this.dimension.id);
        if (index !== -1) {
            this.drawingEngine.elements.dimensions.splice(index, 1);
        }
        this.drawingEngine.render();
    }
}