import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import GameSession from '#models/game_session'
import GameMove from '#models/game_move'
import Score from '#models/score'

export interface CreateSessionData {
  userId: number
  levelId: number
}

export interface MoveInput {
  stepOrder: number
  cellIndex: number
  isValid: boolean
}

export interface CompleteSessionData {
  elapsedSeconds: number
  mistakesCount: number
  hintsUsed: number
  points: number
  moves: MoveInput[]
}

export default class GameSessionRepository {
  async create(data: CreateSessionData): Promise<GameSession> {
    return GameSession.create({
      userId: data.userId,
      levelId: data.levelId,
      status: 'in_progress',
      startedAt: DateTime.utc(),
      finishedAt: null,
      elapsedSeconds: 0,
      mistakesCount: 0,
      hintsUsed: 0,
    })
  }

  async findByIdForUser(sessionId: number, userId: number): Promise<GameSession | null> {
    return GameSession.query()
      .where('id', sessionId)
      .where('user_id', userId)
      .preload('level')
      .preload('score')
      .first()
  }

  async incrementHints(session: GameSession): Promise<GameSession> {
    session.hintsUsed += 1
    await session.save()
    return session
  }

  async recordMoves(
    sessionId: number,
    moves: MoveInput[],
    trx?: TransactionClientContract
  ): Promise<GameMove[]> {
    if (moves.length === 0) {
      return []
    }

    const payload = moves.map((move) => ({
      gameSessionId: sessionId,
      stepOrder: move.stepOrder,
      cellIndex: move.cellIndex,
      isValid: move.isValid,
    }))

    return GameMove.createMany(payload, trx ? { client: trx } : undefined)
  }

  async completeWithScore(
    session: GameSession,
    data: CompleteSessionData
  ): Promise<{ session: GameSession; score: Score }> {
    return db.transaction(async (trx) => {
      session.useTransaction(trx)
      session.status = 'completed'
      session.finishedAt = DateTime.utc()
      session.elapsedSeconds = data.elapsedSeconds
      session.mistakesCount = data.mistakesCount
      session.hintsUsed = data.hintsUsed
      await session.save()

      await this.recordMoves(session.id, data.moves, trx)

      const score = await Score.create(
        {
          userId: session.userId,
          levelId: session.levelId,
          gameSessionId: session.id,
          points: data.points,
          elapsedSeconds: data.elapsedSeconds,
          mistakesCount: data.mistakesCount,
          hintsUsed: data.hintsUsed,
        },
        { client: trx }
      )

      return { session, score }
    })
  }

  async findHistoryByUser(userId: number, limit = 20): Promise<GameSession[]> {
    return GameSession.query()
      .where('user_id', userId)
      .where('status', 'completed')
      .preload('level')
      .preload('score')
      .orderBy('finished_at', 'desc')
      .limit(limit)
  }
}
