const { generatePuzzle } = require('../common/servicies');
const crypto = require('crypto');
const Tango = require('../../models/tango');

// Helper function to format puzzle response
const formatPuzzleResponse = (puzzleData, isNew) => ({
    grid: puzzleData.grid,
    solution: puzzleData.solution,
    constraints: puzzleData.constraints,
    difficulty: puzzleData.difficulty,
    size: puzzleData.size,
    puzzleNumber: puzzleData.puzzleNumber,
    isUnique: isNew
});

const initializeGame = async (difficulty = 'easy', size = 8, maxAttempts = 8) => {
    // Try to create new unique puzzle
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gameData = generatePuzzle(size, difficulty, attempt);
        
        if (!await Tango.exists({ canonicalForm: gameData.canonicalForm })) {
            const puzzleNumber = (await Tango.countDocuments()) + 1;
            await new Tango({
                ...gameData,
                puzzleNumber,
                solutionHash: crypto.createHash('sha256')
                    .update(`${gameData.solution.flat().join('')}|${attempt}`)
                    .digest('hex')
            }).save();
            return { ...gameData, puzzleNumber, isUnique: true };
        }
    }

    // Fallback: Get random existing puzzle of same size
    const existing = await Tango.aggregate([
        { $match: { size } },
        { $sample: { size: 1 } }
    ]);
    
    if (existing.length > 0) {
        const { grid, solution, constraints, difficulty, puzzleNumber } = existing[0];
        return { grid, solution, constraints, difficulty, size, puzzleNumber, isUnique: false };
    }

    throw new Error("No puzzles available for this size");
};

// Function to create a hash from the solution grid
const createSolutionHash = (solution) => {
    // Combine solution and variant information
    const solutionString = Array.isArray(solution) 
        ? solution.map(row => row.join('')).join('')
        : solution;
    const hashContent = `${solutionString}`;
    
    return crypto.createHash('sha256').update(hashContent).digest('hex');
}

module.exports = {
    initializeGame
} 