const { generatePuzzle } = require('../common/servicies');
const crypto = require('crypto');
const Tango = require('../../models/tango');

const initializeGame = async (difficulty = 'easy') => {
    // Generate new game data
    const gameData = generatePuzzle(difficulty);
    
    
    
    // Create hash of the solution
    const solutionHash = createSolutionHash(gameData.solution);
    
    // Check if puzzle with this solution hash already exists
    const existingPuzzle = await Tango.findOne({ solutionHash });
    
    // If puzzle already exists, recursively try again
    if (existingPuzzle) {
        console.log('Duplicate puzzle found, generating new one...');
        return initializeGame(difficulty);
    }
    
   
    
    // Get the next puzzle number
    const lastPuzzle = await Tango.findOne().sort({ puzzleNumber: -1 });
    const puzzleNumber = lastPuzzle ? lastPuzzle.puzzleNumber + 1 : 1;
    
    // Create and save the new puzzle in the database
    const newPuzzle = new Tango({
        ...gameData,
        puzzleNumber,
        difficulty,
        solutionHash
    });
    
    await newPuzzle.save();
     
    return gameData;
}

// Function to create a hash from the solution grid
const createSolutionHash = (solution) => {
    // Convert the 2D solution array to a string
    const solutionString = solution.map(row => row.join('')).join('');
    
    // Create a SHA-256 hash of the solution string
    return crypto.createHash('sha256').update(solutionString).digest('hex');
}

module.exports = {
    initializeGame
} 