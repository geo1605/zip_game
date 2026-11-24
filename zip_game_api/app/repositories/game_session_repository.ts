import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import GameException from '#exceptions/game_exception'
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

  async findByIdForUserForUpdate(
    sessionId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<GameSession | null> {
    return GameSession.query({ client: trx })
      .where('id', sessionId)
      .where('user_id', userId)
      .forUpdate()
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
      const locked = await this.findByIdForUserForUpdate(session.id, session.userId, trx)
      if (!locked) {
        throw new GameException('Game session not found', {
          status: 404,
          code: 'E_SESSION_NOT_FOUND',
        })
      }
      if (locked.status !== 'in_progress') {
        throw new GameException('This game session is already finished', {
          status: 409,
          code: 'E_ALREADY_FINISHED',
        })
      }

      locked.useTransaction(trx)
      locked.status = 'completed'
      locked.finishedAt = DateTime.utc()
      locked.elapsedSeconds = data.elapsedSeconds
      locked.mistakesCount = data.mistakesCount
      locked.hintsUsed = data.hintsUsed
      await locked.save()

      await this.recordMoves(locked.id, data.moves, trx)

      const score = await Score.create(
        {
          userId: locked.userId,
          levelId: locked.levelId,
          gameSessionId: locked.id,
          points: data.points,
          elapsedSeconds: data.elapsedSeconds,
          mistakesCount: data.mistakesCount,
          hintsUsed: data.hintsUsed,
        },
        { client: trx }
      )

      return { session: locked, score }
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

  async findRecentByUser(userId: number, limit = 10): Promise<GameSession[]> {
    return GameSession.query()
      .where('user_id', userId)
      .preload('level')
      .orderBy('started_at', 'desc')
      .limit(limit)
  }
}
