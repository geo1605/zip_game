import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Level from '#models/level'
import type { LevelClue, LevelDifficulty } from '#models/level'

interface SeedLevel {
  name: string
  difficulty: LevelDifficulty
  gridSize: number
  clues: LevelClue[]
  solution: number[]
  isGenerated: boolean
}

const DEMO_LEVELS: SeedLevel[] = [
  {
    name: 'Tutorial - Serpiente',
    difficulty: 'easy',
    gridSize: 6,
    clues: [
      { number: 1, cell: 0 },
      { number: 2, cell: 5 },
      { number: 3, cell: 7 },
      { number: 4, cell: 15 },
      { number: 5, cell: 21 },
      { number: 6, cell: 25 },
      { number: 7, cell: 35 },
      { number: 8, cell: 30 },
    ],
    solution: [
      0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 12, 13, 14, 15, 16, 17, 23, 22, 21, 20, 19, 18, 24, 25,
      26, 27, 28, 29, 35, 34, 33, 32, 31, 30,
    ],
    isGenerated: false,
  },
  {
    name: 'Zigzag Vertical',
    difficulty: 'easy',
    gridSize: 6,
    clues: [
      { number: 1, cell: 0 },
      { number: 2, cell: 30 },
      { number: 3, cell: 1 },
      { number: 4, cell: 20 },
      { number: 5, cell: 21 },
      { number: 6, cell: 4 },
      { number: 7, cell: 34 },
      { number: 8, cell: 5 },
    ],
    solution: [
      0, 6, 12, 18, 24, 30, 31, 25, 19, 13, 7, 1, 2, 8, 14, 20, 26, 32, 33, 27, 21, 15, 9, 3, 4,
      10, 16, 22, 28, 34, 35, 29, 23, 17, 11, 5,
    ],
    isGenerated: false,
  },
  {
    name: 'Espiral Interior',
    difficulty: 'medium',
    gridSize: 6,
    clues: [
      { number: 1, cell: 0 },
      { number: 2, cell: 23 },
      { number: 3, cell: 30 },
      { number: 4, cell: 8 },
      { number: 5, cell: 28 },
      { number: 6, cell: 13 },
      { number: 7, cell: 20 },
    ],
    solution: [
      0, 1, 2, 3, 4, 5, 11, 17, 23, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6, 7, 8, 9, 10, 16, 22,
      28, 27, 26, 25, 19, 13, 14, 15, 21, 20,
    ],
    isGenerated: false,
  },
  {
    name: 'Doble Meandro',
    difficulty: 'medium',
    gridSize: 6,
    clues: [
      { number: 1, cell: 0 },
      { number: 2, cell: 9 },
      { number: 3, cell: 10 },
      { number: 4, cell: 15 },
      { number: 5, cell: 18 },
      { number: 6, cell: 32 },
      { number: 7, cell: 29 },
    ],
    solution: [
      0, 6, 7, 1, 2, 8, 9, 3, 4, 5, 11, 10, 16, 17, 23, 22, 21, 15, 14, 20, 19, 13, 12, 18, 24, 30,
      31, 25, 26, 32, 33, 27, 28, 34, 35, 29,
    ],
    isGenerated: false,
  },
  {
    name: 'Laberinto Oculto',
    difficulty: 'hard',
    gridSize: 6,
    clues: [
      { number: 1, cell: 14 },
      { number: 2, cell: 8 },
      { number: 3, cell: 15 },
      { number: 4, cell: 28 },
      { number: 5, cell: 30 },
      { number: 6, cell: 20 },
    ],
    solution: [
      14, 13, 12, 6, 0, 1, 7, 8, 2, 3, 4, 5, 11, 10, 9, 15, 16, 17, 23, 29, 35, 34, 28, 22, 21, 27,
      33, 32, 31, 30, 24, 18, 19, 25, 26, 20,
    ],
    isGenerated: false,
  },
]

export default class LevelSeeder extends BaseSeeder {
  async run() {
    for (const levelData of DEMO_LEVELS) {
      await Level.updateOrCreate({ name: levelData.name }, levelData)
    }
  }
}
