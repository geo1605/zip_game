import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import GameSession from '#models/game_session'
import Score from '#models/score'

export type LevelDifficulty = 'easy' | 'medium' | 'hard'

export interface LevelClue {
  number: number
  cell: number
}

export default class Level extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare difficulty: LevelDifficulty

  @column()
  declare gridSize: number

  @column({
    prepare: (value: LevelClue[]) => JSON.stringify(value),
    consume: (value: string | LevelClue[]) =>
      typeof value === 'string' ? (JSON.parse(value) as LevelClue[]) : value,
  })
  declare clues: LevelClue[]

  @column({
    serializeAs: null,
    prepare: (value: number[]) => JSON.stringify(value),
    consume: (value: string | number[]) =>
      typeof value === 'string' ? (JSON.parse(value) as number[]) : value,
  })
  declare solution: number[]

  @column({
    consume: (value: number | boolean) => Boolean(value),
  })
  declare isGenerated: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => GameSession)
  declare gameSessions: HasMany<typeof GameSession>

  @hasMany(() => Score)
  declare scores: HasMany<typeof Score>
}
