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
    size: {
        type: Number,
        required: true
    },
    grid: [[String]], // NxN grid with '0', '1', or null values
    constraints: {
        equals: [constraintPairSchema],    // for = signs
        opposite: [constraintPairSchema],   // for ≠ signs
    },
    solution: [[String]], // NxN grid with complete solution
    solutionHash: {
        type: String,
        required: true,
        index: true  // Add index for faster lookups
    },
    canonicalForm: {
        type: String,
        required: true,
        index: true  // Add index for uniqueness checks
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
