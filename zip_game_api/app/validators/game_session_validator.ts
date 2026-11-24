import vine from '@vinejs/vine'

const cellIndexSchema = vine.number().withoutDecimals().min(0).max(63)

export const createGameSessionValidator = vine.compile(
  vine.object({
    levelId: vine.number().withoutDecimals().min(1),
  })
)

export const recordMoveValidator = vine.compile(
  vine.object({
    path: vine.array(cellIndexSchema).minLength(1).maxLength(64),
  })
)

export const hintRequestValidator = vine.compile(
  vine.object({
    path: vine.array(cellIndexSchema).maxLength(64).optional(),
  })
)

export const completeGameSessionValidator = vine.compile(
  vine.object({
    path: vine.array(cellIndexSchema).minLength(4).maxLength(64),
    elapsedSeconds: vine.number().withoutDecimals().min(0).max(86400).optional(),
    mistakesCount: vine.number().withoutDecimals().min(0).max(10000).optional(),
  })
)
