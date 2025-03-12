// Tango Puzzle Generator with Constraint Propagation and Dynamic Grid Size

// Constants
let GRID_SIZE = 6; // Default, will be set dynamically
const SYMBOLS = [0, 1]; // Binary symbols

// Helper: Create an empty grid
const generateEmptyGrid = (size) =>
  Array.from({ length: size }, () => Array(size).fill(null));

// Helper: Clone grid (deep copy)
const cloneGrid = (grid) => grid.map(row => [...row]);

// Helper: Count occurrences of a symbol in an array
const countSymbolsInArray = (array, symbol) =>
  array.filter(cell => cell === symbol).length;

/**
 * Generates a canonical representation of the solution to identify truly unique puzzles.
 * This function normalizes the grid by checking all possible transformations:
 * - Symbol swapping (0→1, 1→0)
 * - Rotations (90°, 180°, 270°)
 * - Reflections (horizontal, vertical)
 * Then returns the lexicographically smallest representation.
 */
function getCanonicalForm(grid) {
    const size = grid.length;
    let canonicalForms = [];
    
    // Original grid and symbol-swapped grid
    const original = grid.map(row => [...row]);
    const swapped = grid.map(row => row.map(cell => cell === 0 ? 1 : 0));
    
    [original, swapped].forEach(g => {
        // Add basic form
        canonicalForms.push(serializeGrid(g));
        
        // Add 90° rotation
        let rotated90 = rotateGrid(g);
        canonicalForms.push(serializeGrid(rotated90));
        
        // Add 180° rotation
        let rotated180 = rotateGrid(rotated90);
        canonicalForms.push(serializeGrid(rotated180));
        
        // Add 270° rotation
        let rotated270 = rotateGrid(rotated180);
        canonicalForms.push(serializeGrid(rotated270));
        
        // Add horizontal reflection
        let horizReflection = reflectHorizontally(g);
        canonicalForms.push(serializeGrid(horizReflection));
        
        // Add vertical reflection
        let vertReflection = reflectVertically(g);
        canonicalForms.push(serializeGrid(vertReflection));
        
        // Add diagonal reflections
        canonicalForms.push(serializeGrid(rotateGrid(horizReflection)));
        canonicalForms.push(serializeGrid(rotateGrid(vertReflection)));
    });
    
    // Return the lexicographically smallest form
    return canonicalForms.sort()[0];
}

/**
 * Serializes a grid to a string representation for comparison
 */
function serializeGrid(grid) {
    return grid.map(row => row.join('')).join('');
}

/**
 * Rotates a grid 90 degrees clockwise
 */
function rotateGrid(grid) {
    const size = grid.length;
    const rotated = generateEmptyGrid(size);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            rotated[j][size - 1 - i] = grid[i][j];
        }
    }
    
    return rotated;
}

/**
 * Reflects a grid horizontally
 */
function reflectHorizontally(grid) {
    return grid.map(row => [...row].reverse());
}

/**
 * Reflects a grid vertically
 */
function reflectVertically(grid) {
    return [...grid].reverse();
}

/**
 * Propagate constraints across the grid.
 * For each row and column, if a symbol has reached its maximal allowed
 * occurrences (maxPerLine), remove it from the domain of empty cells.
 * Also apply basic horizontal and vertical adjacency rules.
 */
function propagateConstraints(grid, domains, size, maxPerLine) {
  let changed = false;

  // Propagate row balance constraints
  for (let i = 0; i < size; i++) {
    const rowSymbols = grid[i].filter(cell => cell !== null);
    for (const symbol of SYMBOLS) {
      if (countSymbolsInArray(rowSymbols, symbol) >= maxPerLine) {
        for (let j = 0; j < size; j++) {
          if (grid[i][j] === null && domains[i][j].includes(symbol)) {
            domains[i][j] = domains[i][j].filter(s => s !== symbol);
            changed = true;
          }
        }
      }
    }
  }

  // Propagate column balance constraints
  for (let j = 0; j < size; j++) {
    const colSymbols = grid.map(row => row[j]).filter(cell => cell !== null);
    for (const symbol of SYMBOLS) {
      if (countSymbolsInArray(colSymbols, symbol) >= maxPerLine) {
        for (let i = 0; i < size; i++) {
          if (grid[i][j] === null && domains[i][j].includes(symbol)) {
            domains[i][j] = domains[i][j].filter(s => s !== symbol);
            changed = true;
          }
        }
      }
    }
  }

  // Propagate horizontal adjacency constraints (avoid three in a row)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - 2; j++) {
      if (grid[i][j] !== null && grid[i][j] === grid[i][j + 1] && grid[i][j + 2] === null) {
        const opposite = SYMBOLS.find(s => s !== grid[i][j]);
        if (domains[i][j + 2].length > 1 && domains[i][j + 2].includes(opposite)) {
          domains[i][j + 2] = [opposite];
          changed = true;
        }
      }
    }
  }

  // Propagate vertical adjacency constraints (avoid three in a column)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size - 2; i++) {
      if (grid[i][j] !== null && grid[i][j] === grid[i + 1][j] && grid[i + 2][j] === null) {
        const opposite = SYMBOLS.find(s => s !== grid[i][j]);
        if (domains[i + 2][j].length > 1 && domains[i + 2][j].includes(opposite)) {
          domains[i + 2][j] = [opposite];
          changed = true;
        }
      }
    }
  }

  return { domains, changed };
}

/**
 * Generate a complete solution for a Tango puzzle 
 * Enhanced with more randomization for greater variety
 */
function generateSolution(size, seedOffset = 0) {
    GRID_SIZE = size;
    const grid = generateEmptyGrid(size);
    const maxPerLine = size / 2;

    // Handle 2x2 grids explicitly
    if (size === 2) {
        // There are only 2 valid solutions for 2x2
        const solutions = [
            [[0, 1], [1, 0]],
            [[1, 0], [0, 1]]
        ];
        // Use seedOffset to select solution and rotation
        return solutions[seedOffset % 2];
    }

    // Add variability by introducing time-based randomness plus a seed offset
    let seed = Date.now() + seedOffset;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Initialize domains for each cell (all symbols are possible initially)
    let domains = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => [...SYMBOLS])
    );

    // Check if placing 'symbol' at (row, col) is valid w.r.t. balance and adjacency rules
  const canPlace = (grid, row, col, symbol) => {
        // Row balance check
    const rowCells = grid[row].filter(cell => cell !== null);
    if (countSymbolsInArray(rowCells, symbol) >= maxPerLine) return false;
        // Column balance check
    const colCells = grid.map(r => r[col]).filter(cell => cell !== null);
    if (countSymbolsInArray(colCells, symbol) >= maxPerLine) return false;
        // Horizontal adjacency check
    if (col >= 2 && grid[row][col - 1] === symbol && grid[row][col - 2] === symbol) return false;
        if (col >= 1 && col < size - 1 && grid[row][col - 1] === symbol && grid[row][col + 1] === symbol) return false;
        // Vertical adjacency check
    if (row >= 2 && grid[row - 1][col] === symbol && grid[row - 2][col] === symbol) return false;
        if (row >= 1 && row < size - 1 && grid[row - 1][col] === symbol && grid[row + 1][col] === symbol) return false;
    return true;
  };

    // Find constrained cells with random tie-breaking for more variety
    const findNextCell = () => {
        let minDomainLength = Infinity;
        let candidates = [];

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === null) {
                    const domainLength = domains[i][j].length;
                    if (domainLength < minDomainLength) {
                        minDomainLength = domainLength;
                        candidates = [{ i, j }];
                    } else if (domainLength === minDomainLength) {
                        candidates.push({ i, j });
                    }
                }
            }
        }

        if (candidates.length === 0) return null;
        
        // Pick a random candidate for better variety
        return candidates[Math.floor(random() * candidates.length)];
    };

    // The main recursive solver function with enhanced randomization
    const solve = () => {
        // Propagate constraints to narrow domains
        let propagationResult;
        do {
            propagationResult = propagateConstraints(grid, domains, size, maxPerLine);
            domains = propagationResult.domains;
        } while (propagationResult.changed);

        // Check for invalid state (empty domains)
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === null && domains[i][j].length === 0) return false;
            }
        }

        // Find next cell to fill
        const cell = findNextCell();
        if (!cell) return true; // Grid is complete

        const { i, j } = cell;
        
        // Use custom random for domain values ordering
        const domainValues = [...domains[i][j]]
            .sort(() => random() - 0.5);
            
        for (const symbol of domainValues) {
            if (canPlace(grid, i, j, symbol)) {
                grid[i][j] = symbol;
                const domainsBackup = domains.map(row => row.map(domain => [...domain]));
                domains[i][j] = [symbol];
                if (solve()) return true;
                grid[i][j] = null;
                domains = domainsBackup;
      }
    }
    return false;
  };

  if (!solve()) throw new Error("Failed to generate a valid solution");
    
  return grid;
}

/**
 * Generate constraints from the solution.
 * For 2x2 grids no constraints are provided.
 * For larger grids, constraints are determined from adjacent pairs.
 * The number of constraints scales with grid size (approximately size/4 per type)
 * and is adjusted by the chosen difficulty.
 */
function generateConstraints(solution, difficulty, size) {
  const equalConstraints = [];
  const oppositeConstraints = [];
  
  // Horizontal adjacent pairs
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - 1; j++) {
      if (solution[i][j] !== null && solution[i][j + 1] !== null) {
        const pair = {
          cells: [{ row: i, col: j }, { row: i, col: j + 1 }],
          direction: 'horizontal'
        };
        if (solution[i][j] === solution[i][j + 1]) {
          equalConstraints.push(pair);
        } else {
          oppositeConstraints.push(pair);
        }
      }
    }
  }
  
  // Vertical adjacent pairs
  for (let i = 0; i < size - 1; i++) {
    for (let j = 0; j < size; j++) {
      if (solution[i][j] !== null && solution[i + 1][j] !== null) {
        const pair = {
          cells: [{ row: i, col: j }, { row: i + 1, col: j }],
          direction: 'vertical'
        };
        if (solution[i][j] === solution[i + 1][j]) {
          equalConstraints.push(pair);
        } else {
          oppositeConstraints.push(pair);
        }
      }
    }
  }
  
  // Shuffle to randomize selection
  const shuffledEquals = equalConstraints.sort(() => Math.random() - 0.5);
  const shuffledOpposites = oppositeConstraints.sort(() => Math.random() - 0.5);
  
  const constraints = { equals: [], opposite: [] };
  
  // For 2x2 grids, do not add any constraints
  if (size === 2) return constraints;

  // Calculate number of constraints per type (approximately size/4)
  const numConstraintsPerType = Math.max(1, Math.floor(size / 4));

  let multiplier = 1;
  if (difficulty === 'easy') {
    multiplier = 0.5; // Fewer constraints for easier puzzles
  } else if (difficulty === 'hard') {
    multiplier = 1.5; // More constraints for harder puzzles
  }
  const finalConstraintCount = Math.max(1, Math.round(numConstraintsPerType * multiplier));

  const equalsToAdd = Math.min(finalConstraintCount, shuffledEquals.length);
  const oppositeToAdd = Math.min(finalConstraintCount, shuffledOpposites.length);

  constraints.equals.push(...shuffledEquals.slice(0, equalsToAdd));
  constraints.opposite.push(...shuffledOpposites.slice(0, oppositeToAdd));
  
  return constraints;
}

/**
 * Logical deduction solver that simulates human-like reasoning using constraint propagation.
 * It applies balance, adjacency, and provided equality/inequality constraints iteratively.
 */
function solveLogically(puzzle, size) {
  const grid = cloneGrid(puzzle.grid);
  const maxPerLine = size / 2;
  let domains = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [...SYMBOLS])
  );

  let progress = true;
  while (progress) {
    progress = false;
    // Apply row balance constraints
    for (let i = 0; i < size; i++) {
      const rowCells = grid[i].filter(cell => cell !== null);
        for (const symbol of SYMBOLS) {
        if (countSymbolsInArray(rowCells, symbol) === maxPerLine) {
          for (let j = 0; j < size; j++) {
            if (grid[i][j] === null && domains[i][j].includes(symbol)) {
              domains[i][j] = domains[i][j].filter(s => s !== symbol);
              progress = true;
            }
          }
        }
      }
    }
    // Apply column balance constraints
    for (let j = 0; j < size; j++) {
      const colCells = grid.map(row => row[j]).filter(cell => cell !== null);
        for (const symbol of SYMBOLS) {
        if (countSymbolsInArray(colCells, symbol) === maxPerLine) {
          for (let i = 0; i < size; i++) {
            if (grid[i][j] === null && domains[i][j].includes(symbol)) {
              domains[i][j] = domains[i][j].filter(s => s !== symbol);
              progress = true;
            }
          }
        }
      }
    }
    // Horizontal adjacency constraints
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - 2; j++) {
        if (grid[i][j] !== null && grid[i][j] === grid[i][j + 1] && grid[i][j + 2] === null) {
          const opp = SYMBOLS.find(s => s !== grid[i][j]);
          if (domains[i][j + 2].length > 1 && domains[i][j + 2].includes(opp)) {
            domains[i][j + 2] = [opp];
            progress = true;
          }
        }
      }
    }
    // Vertical adjacency constraints
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size - 2; i++) {
        if (grid[i][j] !== null && grid[i][j] === grid[i + 1][j] && grid[i + 2][j] === null) {
          const opp = SYMBOLS.find(s => s !== grid[i][j]);
          if (domains[i + 2][j].length > 1 && domains[i + 2][j].includes(opp)) {
            domains[i + 2][j] = [opp];
            progress = true;
          }
        }
      }
    }
    // Apply puzzle equality constraints
    for (const cons of puzzle.constraints.equals) {
      const [a, b] = cons.cells;
      if (grid[a.row][a.col] !== null && grid[b.row][b.col] === null) {
        grid[b.row][b.col] = grid[a.row][a.col];
        progress = true;
      } else if (grid[b.row][b.col] !== null && grid[a.row][a.col] === null) {
        grid[a.row][a.col] = grid[b.row][b.col];
        progress = true;
      }
    }
    // Apply puzzle opposite constraints
    for (const cons of puzzle.constraints.opposite) {
      const [a, b] = cons.cells;
      if (grid[a.row][a.col] !== null && grid[b.row][b.col] === null) {
        grid[b.row][b.col] = SYMBOLS.find(s => s !== grid[a.row][a.col]);
        progress = true;
      } else if (grid[b.row][b.col] !== null && grid[a.row][a.col] === null) {
        grid[a.row][a.col] = SYMBOLS.find(s => s !== grid[b.row][b.col]);
        progress = true;
      }
    }
    // If any domain is a singleton, assign its value
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (grid[i][j] === null && domains[i][j].length === 1) {
          grid[i][j] = domains[i][j][0];
          progress = true;
        }
      }
    }
  }

  const complete = grid.flat().every(cell => cell !== null);
  return { solvedGrid: grid, complete };
}

/**
 * Reduce the number of prefilled clues in the puzzle solution while ensuring that
 * the puzzle remains solvable through logical deduction (i.e. without guessing).
 */
function reduceClues(solution, constraints, targetClues, size) {
  let clueGrid = cloneGrid(solution);
  
  // Create an array of all cell positions and shuffle it
  const positions = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      positions.push({ row: i, col: j });
    }
  }
  positions.sort(() => Math.random() - 0.5);
  
  for (const pos of positions) {
    const filledCount = clueGrid.flat().filter(cell => cell !== null).length;
    if (filledCount <= targetClues) break;
    
    const temp = clueGrid[pos.row][pos.col];
    clueGrid[pos.row][pos.col] = null;
    
    // Test puzzle solvability using logical deduction
    const tempPuzzle = { grid: cloneGrid(clueGrid), constraints };
    const result = solveLogically(tempPuzzle, size);
    if (!result.complete) {
      // Revert removal if puzzle is no longer logically solvable
      clueGrid[pos.row][pos.col] = temp;
    }
  }
  
  return clueGrid;
}

/**
 * Generate the final Tango puzzle.
 * 
 * For 2x2 grids, there are only two complete solutions which satisfy the
 * balance constraint. However, by choosing to reveal different single cells,
 * you can produce 8 distinct puzzle variants.
 * 
 * The 'variant' parameter (an integer) is used to pick one of the 8 possibilities.
 * For variant in [0..7]:
 *   - Math.floor(variant/4) selects the solution pattern (0 => Pattern A, 1 => Pattern B)
 *   - variant % 4 selects which one cell is revealed.
 */
function generatePuzzle(size = 6, difficulty = 'medium', variant = 0) {
    // Validate grid size: must be an even integer >= 2
    if (!Number.isInteger(size) || size < 2 || size % 2 !== 0) {
        throw new Error("Grid size must be an even integer of at least 2");
    }
    
    if (size === 2) {
        variant = variant % 8; // Ensure 0-7 variants
        // There are exactly 2 complete solutions for a 2x2 grid given the balance rule:
        const solutions = [
            [[0, 1], [1, 0]],  // Pattern A
            [[1, 0], [0, 1]]   // Pattern B
        ];
        
        const solutionIndex = Math.floor(variant / 4);
        const revealedCellIndex = variant % 4;
        
        // Choose solution based on solutionIndex
        const solution = solutions[solutionIndex];
        
        // Prepare puzzle grid with revealed cell
        const puzzleGrid = generateEmptyGrid(2);
        const cellPositions = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const [r, c] = cellPositions[revealedCellIndex];
        puzzleGrid[r][c] = solution[r][c];
        
        // Create unique identifier that accounts for both solution and revealed cell
        const canonicalForm = `${solution.flat().join('')}|${variant}`;
        
        return {
            grid: puzzleGrid,
            solution,
            constraints: { equals: [], opposite: [] },
            difficulty,
            size,
            canonicalForm
        };
    }
    
    // For size > 2, use the existing generation pipeline.
    const sol = generateSolution(size, variant * 1000);
    const canonicalForm = getCanonicalForm(sol);
    const constraints = generateConstraints(sol, difficulty, size);
    
    // Determine target clues based on difficulty
    let targetCluesPercentage;
    if (difficulty === 'easy') {
        targetCluesPercentage = 0.25;
    } else if (difficulty === 'medium') {
        targetCluesPercentage = 0.15;
    } else if (difficulty === 'hard') {
        targetCluesPercentage = 0.1;
    } else {
        targetCluesPercentage = 0.15;
    }
    const totalCells = size * size;
    const targetClues = Math.max(1, Math.round(totalCells * targetCluesPercentage));
    const grid = reduceClues(sol, constraints, targetClues, size);
    
    return {
        grid,
        solution: sol,
        constraints,
        difficulty,
        size,
        canonicalForm
    };
}

module.exports = {
    generatePuzzle,
    getCanonicalForm  // Export for use in other services if needed
};
