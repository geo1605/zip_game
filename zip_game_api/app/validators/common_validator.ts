import vine from '@vinejs/vine'

export const idParamValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals().min(1),
  })
)

export const limitQueryValidator = vine.compile(
  vine.object({
    limit: vine.number().withoutDecimals().min(1).max(100).optional(),
  })
)
