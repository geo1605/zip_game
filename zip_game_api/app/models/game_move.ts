import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GameSession from '#models/game_session'

export default class GameMove extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare gameSessionId: number

  @column()
  declare stepOrder: number

  @column()
  declare cellIndex: number

  @column({
    consume: (value: number | boolean) => Boolean(value),
  })
  declare isValid: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => GameSession)
  declare gameSession: BelongsTo<typeof GameSession>
}
