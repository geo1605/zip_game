import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Level from '#models/level'
import GameMove from '#models/game_move'
import Score from '#models/score'

export type GameSessionStatus = 'in_progress' | 'completed' | 'abandoned'

export default class GameSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare levelId: number

  @column()
  declare status: GameSessionStatus

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare finishedAt: DateTime | null

  @column()
  declare elapsedSeconds: number

  @column()
  declare mistakesCount: number

  @column()
  declare hintsUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Level)
  declare level: BelongsTo<typeof Level>

  @hasMany(() => GameMove)
  declare moves: HasMany<typeof GameMove>

  @hasOne(() => Score)
  declare score: HasOne<typeof Score>
}
