import vine from '@vinejs/vine'

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const listLevelsQueryValidator = vine.compile(
  vine.object({
    difficulty: vine.enum(DIFFICULTIES).optional(),
  })
)

export const generateLevelValidator = vine.compile(
  vine.object({
    difficulty: vine.enum(DIFFICULTIES),
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    gridSize: vine.number().withoutDecimals().min(4).max(8).optional(),
  })
)
