const { generatePuzzle } = require('../common/servicies');
const crypto = require('crypto');
const Tango = require('../../models/tango');

const initializeGame = async (difficulty = 'easy', size = 6, maxAttempts = 8) => {
    // Track attempts to generate a unique puzzle
    let attempts = 0;
    let duplicatePuzzle = null;
    
    while (attempts < maxAttempts) {
        const variant = attempts; // 0-7 variants only
        const gameData = generatePuzzle(size, difficulty, variant);
        
        // Check uniqueness using ONLY canonicalForm
        const existingPuzzle = await Tango.findOne({ 
            canonicalForm: gameData.canonicalForm 
        });
        
        // If puzzle is unique, proceed with saving it
        if (!existingPuzzle) {
            // Get the next puzzle number
            const lastPuzzle = await Tango.findOne().sort({ puzzleNumber: -1 });
            const puzzleNumber = lastPuzzle ? lastPuzzle.puzzleNumber + 1 : 1;
            
            // Create and save the new puzzle in the database
            const newPuzzle = new Tango({
                ...gameData,
                puzzleNumber,
                difficulty,
                solutionHash: createSolutionHash(gameData.solution, variant)
            });
            
            await newPuzzle.save();

            gameData.isUnique = true;
            gameData.puzzleNumber = puzzleNumber;
             
            return gameData;
        } else {
            // Store the duplicate puzzle in case we need it later
            duplicatePuzzle = existingPuzzle;
        }
        
        attempts++;
    }
    
    // If we couldn't generate a unique puzzle after maxAttempts
    console.log(`Failed to generate unique puzzle after ${maxAttempts} attempts. Returning existing puzzle.`);
    
    // If we found a duplicate during our attempts, use that
    if (duplicatePuzzle) {
        return {
            grid: duplicatePuzzle.grid,
            solution: duplicatePuzzle.solution,
            constraints: duplicatePuzzle.constraints,
            difficulty: duplicatePuzzle.difficulty,
            size: duplicatePuzzle.size || size,
            puzzleNumber: duplicatePuzzle.puzzleNumber, // Use the existing puzzle number
            isUnique: false
        };
    }
    
    // Otherwise, find an existing puzzle with the same size and difficulty
    const existingPuzzle = await Tango.findOne({ 
        difficulty, 
        size 
    }).sort({ puzzleNumber: -1 });
    
    // If no matching puzzle exists, try any puzzle with the same size
    const fallbackPuzzle = existingPuzzle || await Tango.findOne({ size }).sort({ puzzleNumber: -1 });
    
    // If still no puzzle, return any puzzle
    const finalPuzzle = fallbackPuzzle || await Tango.findOne().sort({ puzzleNumber: -1 });
    
    if (!finalPuzzle) {
        throw new Error("No puzzles available in the database");
    }
    
    // Convert the database puzzle to the expected format
    const returnData = {
        grid: finalPuzzle.grid,
        solution: finalPuzzle.solution,
        constraints: finalPuzzle.constraints,
        difficulty: finalPuzzle.difficulty,
        size: finalPuzzle.size || size,
        puzzleNumber: finalPuzzle.puzzleNumber,
        isUnique: false
    };
    
    return returnData;
}

// Function to create a hash from the solution grid
const createSolutionHash = (solution, variant) => {
    // Combine solution and variant information
    const solutionString = Array.isArray(solution) 
        ? solution.map(row => row.join('')).join('')
        : solution;
    const hashContent = `${solutionString}|${variant}`;
    
    return crypto.createHash('sha256').update(hashContent).digest('hex');
}

module.exports = {
    initializeGame
} 