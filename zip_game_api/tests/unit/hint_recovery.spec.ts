import { test } from '@japa/runner'
import GameAssistanceService from '#services/game_assistance_service'
import GameValidatorService from '#services/game_validator_service'

const solution = [
  0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 12, 13, 14, 15, 16, 17, 23, 22, 21, 20, 19, 18, 24, 25, 26,
  27, 28, 29, 35, 34, 33, 32, 31, 30,
]
const clues = [
  { number: 1, cell: 0 },
  { number: 2, cell: 5 },
  { number: 3, cell: 12 },
  { number: 4, cell: 30 },
]

test.group('Hint recovery on a 6x6 board', () => {
  const assistance = new GameAssistanceService()
  const validator = new GameValidatorService()

  test('a deviation returns the first divergent step, not a repeated cell', ({ assert }) => {
    const path = [0, 6, 7, 1]
    const hint = assistance.getHint(path, solution)!
    assert.equal(hint.step, 2)
    assert.equal(hint.cell, 1)
    const corrected = [...path.slice(0, hint.step - 1), hint.cell]
    assert.isTrue(validator.validatePath(corrected, clues, { requireComplete: false }).isValid)
  })

  test('every prefix of the complete board has a playable hint', ({ assert }) => {
    for (let count = 0; count < solution.length; count++) {
      const prefix = solution.slice(0, count)
      const hint = assistance.getHint(prefix, solution)!
      assert.equal(hint.step, count + 1)
      assert.isTrue(
        validator.validatePath([...prefix, hint.cell], clues, {
          requireComplete: false,
        }).isValid
      )
    }
    assert.isNull(assistance.getHint(solution, solution))
  })

  test('an invalid full-length path can still be corrected', ({ assert }) => {
    const hint = assistance.getHint(Array(36).fill(0), solution)!
    assert.equal(hint.step, 2)
    assert.equal(hint.cell, 1)
  })
})
