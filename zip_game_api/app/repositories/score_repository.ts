import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Score from '#models/score'

export interface CreateScoreData {
  userId: number
  levelId: number
  gameSessionId: number
  points: number
  elapsedSeconds: number
  mistakesCount: number
  hintsUsed: number
}

export interface LeaderboardRow {
  userId: number
  fullName: string
  totalPoints: number
  completedLevels: number
  totalGames: number
  avgElapsedSeconds: number
}

export default class ScoreRepository {
  async create(data: CreateScoreData, trx?: TransactionClientContract): Promise<Score> {
    return Score.create(data, trx ? { client: trx } : undefined)
  }

  async findBySessionId(gameSessionId: number): Promise<Score | null> {
    return Score.findBy('gameSessionId', gameSessionId)
  }

  async findByUser(userId: number, limit = 20): Promise<Score[]> {
    return Score.query()
      .where('user_id', userId)
      .preload('level')
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  async getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
    const rows = await db
      .from('scores')
      .innerJoin('users', 'users.id', 'scores.user_id')
      .groupBy('scores.user_id', 'users.full_name')
      .select(
        'scores.user_id as userId',
        'users.full_name as fullName',
        db.raw('SUM(scores.points) as totalPoints'),
        db.raw('COUNT(DISTINCT scores.level_id) as completedLevels'),
        db.raw('COUNT(scores.id) as totalGames'),
        db.raw('ROUND(AVG(scores.elapsed_seconds)) as avgElapsedSeconds')
      )
      .orderByRaw('totalPoints DESC, completedLevels DESC, avgElapsedSeconds ASC')
      .limit(limit)

    return rows.map((row) => ({
      userId: Number(row.userId),
      fullName: String(row.fullName),
      totalPoints: Number(row.totalPoints),
      completedLevels: Number(row.completedLevels),
      totalGames: Number(row.totalGames),
      avgElapsedSeconds: Number(row.avgElapsedSeconds),
    }))
  }
}
