const S = require('fluent-json-schema')

// Simple game response schema
const gameResponseSchema = S.object()
  .prop('grid', S.array().items(S.array()))
  .prop('solution', S.array().items(S.array()))
  .prop('constraints', S.object()
    .prop('equals', S.array())
    .prop('opposite', S.array())
  )
  .prop('difficulty', S.string())
  .prop('isUnique', S.boolean())
  .prop('puzzleNumber', S.number())

// Basic route schemas
const newGameSchema = {
    tags: ['game'],
    summary: 'Get a new game',
    response: {
        200: gameResponseSchema
    }
}

const newGameWithDifficultySchema = {
    tags: ['game'],
    summary: 'Get a new game with a specific difficulty',
    params: S.object()
        .prop('difficulty', S.string()),
    response: {
        200: gameResponseSchema
    }
}

module.exports = {
  newGameSchema,
  newGameWithDifficultySchema
}
