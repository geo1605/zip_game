import db from '@adonisjs/lucid/services/db'
import Level from '#models/level'
import type { LevelClue, LevelDifficulty } from '#models/level'

export interface CreateLevelData {
  name: string
  difficulty: LevelDifficulty
  gridSize?: number
  clues: LevelClue[]
  solution: number[]
  isGenerated?: boolean
}

export interface LevelWithStatus {
  level: Level
  completed: boolean
  bestPoints: number | null
}

export default class LevelRepository {
  async findAll(difficulty?: LevelDifficulty): Promise<Level[]> {
    const query = Level.query().orderBy('id', 'asc')
    if (difficulty) {
      query.where('difficulty', difficulty)
    }
    return query
  }

  async findAllWithUserStatus(
    userId: number,
    difficulty?: LevelDifficulty
  ): Promise<LevelWithStatus[]> {
    const levels = await this.findAll(difficulty)

    const bestScores = await db
      .from('scores')
      .where('user_id', userId)
      .groupBy('level_id')
      .select('level_id', db.raw('MAX(points) as best_points'))

    const bestByLevel = new Map<number, number>()
    for (const row of bestScores) {
      bestByLevel.set(Number(row.level_id), Number(row.best_points))
    }

    return levels.map((level) => {
      const best = bestByLevel.get(level.id)
      return {
        level,
        completed: best !== undefined,
        bestPoints: best ?? null,
      }
    })
  }

  async findById(id: number): Promise<Level | null> {
    return Level.find(id)
  }

  async findByIdWithUserStatus(id: number, userId: number): Promise<LevelWithStatus | null> {
    const level = await this.findById(id)
    if (!level) {
      return null
    }

    const bestScore = await db
      .from('scores')
      .where('user_id', userId)
      .where('level_id', level.id)
      .max('points as best_points')
      .first()

    const rawBest = bestScore?.best_points
    const hasScore = rawBest !== null && rawBest !== undefined

    return {
      level,
      completed: hasScore,
      bestPoints: hasScore ? Number(rawBest) : null,
    }
  }

  async create(data: CreateLevelData): Promise<Level> {
    return Level.create({
      name: data.name,
      difficulty: data.difficulty,
      gridSize: data.gridSize ?? 6,
      clues: data.clues,
      solution: data.solution,
      isGenerated: data.isGenerated ?? false,
    })
  }
}
