const symbolMap = {
    0: '0',  // Will show as ☀️ through CSS
    1: '1',  // Will show as 🌙 through CSS
    null: ''
};

class BinaryPuzzleGame {
    constructor() {
        this.currentGame = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('checkBtn').addEventListener('click', () => this.checkSolution());
        document.getElementById('showSolutionBtn').addEventListener('click', () => this.showSolution());
    }

    async newGame() {
        const difficulty = document.getElementById('difficulty').value;
        try {
            const response = await fetch(`/api/game/new/${difficulty}`);
            this.currentGame = await response.json();
            
            this.updateGridSize();
            this.renderGrid();
            this.updatePuzzleInfo();
            
            const solutionWrapper = document.getElementById('solutionWrapper');
            if (solutionWrapper.style.display === 'block') {
                this.renderSolutionGrid();
            }
            
            this.hideMessage();
        } catch (error) {
            this.showMessage('Failed to start new game', 'error');
        }
    }
    
    updateGridSize() {
        if (!this.currentGame || !this.currentGame.grid) return;
        const size = this.currentGame.grid.length;
        document.documentElement.style.setProperty('--grid-size', size);
    }

    applyConstraints() {
        if (!this.currentGame || !this.currentGame.constraints) return;
        
        // Clear any existing constraints
        document.querySelectorAll('.constraint-horizontal, .constraint-vertical').forEach(el => {
            el.classList.remove('constraint-horizontal', 'constraint-vertical');
            el.removeAttribute('data-constraint');
        });
        
        // Apply equals constraints
        this.currentGame.constraints.equals.forEach(constraint => {
            const cell1 = constraint.cells[0];
            const cell2 = constraint.cells[1];
            
            // Determine if it's horizontal or vertical
            const isHorizontal = cell1.row === cell2.row;
            
            // Get the first cell (the one that will display the constraint)
            let firstCell;
            if (isHorizontal) {
                // For horizontal constraints, use the leftmost cell
                firstCell = cell1.col < cell2.col ? cell1 : cell2;
            } else {
                // For vertical constraints, use the topmost cell
                firstCell = cell1.row < cell2.row ? cell1 : cell2;
            }
            
            const cellElement = document.querySelector(
                `.cell[data-row="${firstCell.row}"][data-col="${firstCell.col}"]`
            );
            
            if (cellElement) {
                cellElement.classList.add(isHorizontal ? 'constraint-horizontal' : 'constraint-vertical');
                cellElement.setAttribute('data-constraint', '=');
            }
        });

        // Apply opposite constraints
        this.currentGame.constraints.opposite.forEach(constraint => {
            const cell1 = constraint.cells[0];
            const cell2 = constraint.cells[1];
            
            // Determine if it's horizontal or vertical
            const isHorizontal = cell1.row === cell2.row;
            
            // Get the first cell (the one that will display the constraint)
            let firstCell;
            if (isHorizontal) {
                // For horizontal constraints, use the leftmost cell
                firstCell = cell1.col < cell2.col ? cell1 : cell2;
            } else {
                // For vertical constraints, use the topmost cell
                firstCell = cell1.row < cell2.row ? cell1 : cell2;
            }
            
            const cellElement = document.querySelector(
                `.cell[data-row="${firstCell.row}"][data-col="${firstCell.col}"]`
            );
            
            if (cellElement) {
                cellElement.classList.add(isHorizontal ? 'constraint-horizontal' : 'constraint-vertical');
                cellElement.setAttribute('data-constraint', '≠');
            }
        });
    }

    renderGrid() {
        const gridElement = document.getElementById('grid');
        gridElement.innerHTML = '';

        this.currentGame.grid.forEach((row, i) => {
            row.forEach((cell, j) => {
                const cellElement = createCell(this.currentGame.grid[i][j], i, j);
                gridElement.appendChild(cellElement);
            });
        });

        this.applyConstraints();
    }

    renderSolutionGrid() {
        const solutionGrid = document.getElementById('solutionGrid');
        solutionGrid.innerHTML = '';
        
        this.currentGame.solution.forEach((row, i) => {
            row.forEach((cell, j) => {
                const cellElement = createCell(this.currentGame.solution[i][j], i, j);
                solutionGrid.appendChild(cellElement);
            });
        });
        
        // Apply constraints to solution grid too
        this.applyConstraints();
    }

    checkSolution() {
        if (!this.currentGame) return;

        // Get current grid values
        const currentGrid = [];
        const gridSize = this.currentGame.grid.length;
        
        for (let i = 0; i < gridSize; i++) {
            currentGrid[i] = [];
            for (let j = 0; j < gridSize; j++) {
                const cell = document.querySelector(`.cell[data-row="${i}"][data-col="${j}"]`);
                const value = cell.getAttribute('data-value');
                currentGrid[i][j] = value ? parseInt(value) : null;
            }
        }

        const isComplete = currentGrid.every(row => 
            row.every(cell => cell !== null)
        );

        if (!isComplete) {
            this.showMessage('Please fill all cells before checking', 'error');
            return;
        }

        // Compare with solution
        let isCorrect = true;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (currentGrid[i][j] !== this.currentGame.solution[i][j]) {
                    isCorrect = false;
                    break;
                }
            }
            if (!isCorrect) break;
        }
        
        this.showMessage(
            isCorrect ? 'Congratulations! Puzzle solved correctly!' : 'Solution is not correct. Keep trying!',
            isCorrect ? 'success' : 'error'
        );
    }

    showSolution() {
        if (!this.currentGame || !this.currentGame.solution) return;
        
        document.getElementById('solutionWrapper').style.display = 'block';
        this.renderSolutionGrid();
        
        const solutionBtn = document.getElementById('showSolutionBtn');
        solutionBtn.textContent = 'Hide Solution';
        solutionBtn.removeEventListener('click', () => this.showSolution());
        solutionBtn.addEventListener('click', () => this.hideSolution());
    }

    hideSolution() {
        document.getElementById('solutionWrapper').style.display = 'none';
        
        const solutionBtn = document.getElementById('showSolutionBtn');
        solutionBtn.textContent = 'Show Solution';
        solutionBtn.removeEventListener('click', () => this.hideSolution());
        solutionBtn.addEventListener('click', () => this.showSolution());
    }

    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
    }

    hideMessage() {
        const messageEl = document.getElementById('message');
        messageEl.style.display = 'none';
    }

    updatePuzzleInfo() {
        const puzzleNumberEl = document.getElementById('puzzleNumber');
        const uniqueStatusEl = document.getElementById('uniqueStatus');

        if (this.currentGame.puzzleNumber) {
            puzzleNumberEl.textContent = `Puzzle #${this.currentGame.puzzleNumber}`;
        }

        if (typeof this.currentGame.isUnique !== 'undefined') {
            uniqueStatusEl.textContent = this.currentGame.isUnique ? 
                '✨ Unique Puzzle' : '🔄 Non-Unique Puzzle';
            uniqueStatusEl.className = this.currentGame.isUnique ? 
                'unique-status unique' : 'unique-status non-unique';
        }
    }
}

function createCell(value, row, col) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (value !== null) {
        cell.classList.add('filled');
        cell.setAttribute('data-value', value);
    }
    cell.dataset.row = row;
    cell.dataset.col = col;
    
    if (value === null) {
        cell.addEventListener('click', () => {
            const currentValue = cell.getAttribute('data-value');
            let newValue;
            if (!currentValue) {
                newValue = '0';
            } else if (currentValue === '0') {
                newValue = '1';
            } else {
                newValue = '';
                cell.removeAttribute('data-value');
            }
            if (newValue) {
                cell.setAttribute('data-value', newValue);
            }
        });
    }
    
    return cell;
}

// Initialize game when page loads
window.onload = () => {
    const game = new BinaryPuzzleGame();
    game.newGame();
}; 