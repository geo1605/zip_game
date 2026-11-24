import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import type User from '#models/user'
import type Level from '#models/level'
import GameValidatorService from '#services/game_validator_service'
import GameAssistanceService from '#services/game_assistance_service'
import LevelGeneratorService from '#services/level_generator_service'
import PathSolverService from '#services/path_solver_service'
import { serializeLevel, serializeUser } from '#utils/serializers'

test.group('Game services and serializers', () => {
  test('generated level is valid and solvable by PathSolverService', ({ assert }) => {
    const generator = new LevelGeneratorService()
    const validator = new GameValidatorService()
    const solver = new PathSolverService()

    const generated = generator.generate('medium', { gridSize: 4 })
    const validation = validator.validatePath(generated.solution, generated.clues, {
      gridSize: 4,
      requireComplete: true,
    })

    assert.isTrue(validation.isValid)
    assert.isTrue(validation.isComplete)
    assert.isTrue(solver.hasSolution(generated.clues, { gridSize: 4 }))
  })

  test('GameAssistanceService calculates server-side scores and hints accurately', ({ assert }) => {
    const assistance = new GameAssistanceService()

    const easyScore = assistance.calculateScore({
      difficulty: 'easy',
      elapsedSeconds: 50,
      mistakesCount: 2,
      hintsUsed: 1,
    })
    assert.equal(easyScore, 1000 + 70 * 3 - 2 * 25 - 150)

    const hardScore = assistance.calculateScore({
      difficulty: 'hard',
      elapsedSeconds: 10,
      mistakesCount: 0,
      hintsUsed: 0,
    })
    assert.equal(hardScore, 3000 + 290 * 3)

    const floorScore = assistance.calculateScore({
      difficulty: 'easy',
      elapsedSeconds: 1000,
      mistakesCount: 50,
      hintsUsed: 20,
    })
    assert.equal(floorScore, 100)

    const hint = assistance.getHint([0, 1], [0, 1, 2, 3])
    assert.deepEqual(hint, {
      cell: 2,
      step: 3,
      reason: 'Continue along a valid solution path',
    })
  })

  test('serializers never expose user password or level solution', ({ assert }) => {
    const fakeUser = {
      id: 1,
      fullName: 'Test Player',
      email: 'player@zipgame.test',
      password: 'hashed_secret_password',
      createdAt: DateTime.utc(),
    } as unknown as User

    const serializedUser = serializeUser(fakeUser)
    assert.notProperty(serializedUser, 'password')
    assert.equal(serializedUser.email, 'player@zipgame.test')

    const fakeLevel = {
      id: 10,
      name: 'Secret Level',
      difficulty: 'easy',
      gridSize: 6,
      clues: [
        { number: 1, cell: 0 },
        { number: 2, cell: 35 },
      ],
      solution: Array.from({ length: 36 }, (_, index) => index),
      isGenerated: true,
      createdAt: DateTime.utc(),
    } as unknown as Level

    const serializedLevel = serializeLevel(fakeLevel)
    assert.notProperty(serializedLevel, 'solution')
    assert.equal(serializedLevel.id, 10)
    assert.lengthOf(serializedLevel.clues, 2)
  })
})
