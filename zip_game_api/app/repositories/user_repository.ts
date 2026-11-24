import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

export interface CreateUserData {
  fullName: string
  email: string
  password: string
}

export interface UserProfileStats {
  completedLevelsCount: number
  totalSessions: number
  totalPoints: number
  bestScore: number
}

export default class UserRepository {
  async findById(id: number): Promise<User | null> {
    return User.find(id)
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findBy('email', email.trim().toLowerCase())
  }

  async create(data: CreateUserData): Promise<User> {
    return User.create({
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    })
  }

  async getProfileStats(userId: number): Promise<UserProfileStats> {
    const scoreSummary = await db
      .from('scores')
      .where('user_id', userId)
      .select(
        db.raw('COUNT(DISTINCT level_id) as completed_levels_count'),
        db.raw('COALESCE(SUM(points), 0) as total_points'),
        db.raw('COALESCE(MAX(points), 0) as best_score')
      )
      .first()

    const sessionSummary = await db
      .from('game_sessions')
      .where('user_id', userId)
      .count('* as total_sessions')
      .first()

    return {
      completedLevelsCount: Number(scoreSummary?.completed_levels_count ?? 0),
      totalPoints: Number(scoreSummary?.total_points ?? 0),
      bestScore: Number(scoreSummary?.best_score ?? 0),
      totalSessions: Number(sessionSummary?.total_sessions ?? 0),
    }
  }
}
