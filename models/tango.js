const mongoose = require('mongoose');

const constraintPairSchema = new mongoose.Schema({
    cells: [{
        row: Number,
        col: Number
    }],
    direction: {
        type: String,
        enum: ['horizontal', 'vertical']
    }
});

const tangoSchema = new mongoose.Schema({
    puzzleNumber: {
        type: Number,
        required: true
    },
    grid: [[String]], // 6x6 grid with 'sun', 'moon', or null values
    constraints: {
        equals: [constraintPairSchema],    // for = signs
        opposite: [constraintPairSchema],   // for ≠ signs
    },
    solution: [[String]], // 6x6 grid with complete solution
    solutionHash: {
        type: String,
        required: true,
        index: true  // Add index for faster lookups
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Tango = mongoose.model('tango_games', tangoSchema);

module.exports = Tango;
