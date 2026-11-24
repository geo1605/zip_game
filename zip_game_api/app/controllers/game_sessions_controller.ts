import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import GameException from '#exceptions/game_exception'
import GameSessionRepository, { type MoveInput } from '#repositories/game_session_repository'
import LevelRepository from '#repositories/level_repository'
import GameValidatorService from '#services/game_validator_service'
import HintService from '#services/hint_service'
import ScoringService from '#services/scoring_service'
import { idParamValidator } from '#validators/common_validator'
import {
  completeGameSessionValidator,
  createGameSessionValidator,
  hintRequestValidator,
  recordMoveValidator,
} from '#validators/game_session_validator'
import { serializeGameSession, serializeLevel, serializeScore } from '#utils/serializers'

@inject()
export default class GameSessionsController {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly levelRepository: LevelRepository,
    private readonly gameValidatorService: GameValidatorService,
    private readonly hintService: HintService,
    private readonly scoringService: ScoringService
  ) {}

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createGameSessionValidator)

    const level = await this.levelRepository.findById(payload.levelId)
    if (!level) {
      throw new GameException('Level not found', {
        status: 404,
        code: 'E_LEVEL_NOT_FOUND',
      })
    }

    const session = await this.gameSessionRepository.create({
      userId: user.id,
      levelId: level.id,
    })

    return response.created({
      data: {
        ...serializeGameSession(session),
        level: serializeLevel(level),
      },
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      throw this.sessionNotFound()
    }

    return response.ok({
      data: serializeGameSession(session),
    })
  }

  async move({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)
    const payload = await request.validateUsing(recordMoveValidator)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      throw this.sessionNotFound()
    }

    if (session.status !== 'in_progress') {
      throw this.sessionAlreadyClosed()
    }

    const validation = this.gameValidatorService.validatePath(payload.path, session.level.clues, {
      gridSize: session.level.gridSize,
      requireComplete: false,
    })

    await this.gameSessionRepository.recordMoves(session.id, [
      {
        stepOrder: payload.path.length,
        cellIndex: payload.path[payload.path.length - 1],
        isValid: validation.isValid,
      },
    ])

    if (!validation.isValid) {
      session.mistakesCount += 1
      await session.save()
    }

    return response.ok({
      data: {
        sessionId: session.id,
        isValid: validation.isValid,
        isComplete: validation.isComplete,
        errors: validation.errors,
        nextClue: validation.nextClue,
        mistakesCount: session.mistakesCount,
        pathLength: payload.path.length,
      },
    })
  }

  async hint({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)
    const payload = await request.validateUsing(hintRequestValidator)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      throw this.sessionNotFound()
    }

    if (session.status !== 'in_progress') {
      throw this.sessionAlreadyClosed()
    }

    const currentPath = payload.path ?? []
    const board = {
      size: session.level.gridSize,
      checkpoints: [...session.level.clues]
        .sort((a, b) => a.number - b.number)
        .map((clue) => clue.cell),
    }

    const hint = this.hintService.getHint(board, session.level.solution, currentPath)
    if (hint.status === 'invalid') {
      throw new GameException(hint.message, {
        status: 422,
        code: `E_${hint.code}`,
        details: { index: hint.index },
      })
    }

    await this.gameSessionRepository.incrementHints(session)

    const step =
      hint.status === 'backtrack'
        ? Math.max(1, currentPath.length - hint.undoSteps + 1)
        : currentPath.length + 1

    return response.ok({
      data: {
        hint: {
          cell: hint.nextCell,
          step,
          status: hint.status,
          nextCell: hint.nextCell,
          undoSteps: hint.undoSteps,
          reason:
            hint.status === 'backtrack'
              ? `Backtrack ${hint.undoSteps} step(s) and continue to cell ${hint.nextCell}`
              : currentPath.length === 0
                ? 'Start at the first cell'
                : 'Continue along a valid solution path',
        },
        hintsUsed: session.hintsUsed,
      },
    })
  }

  async complete({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)
    const payload = await request.validateUsing(completeGameSessionValidator)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      throw this.sessionNotFound()
    }

    if (session.status !== 'in_progress') {
      throw this.sessionAlreadyClosed()
    }

    const validation = this.gameValidatorService.validatePath(payload.path, session.level.clues, {
      gridSize: session.level.gridSize,
      requireComplete: true,
    })

    if (!validation.isValid || !validation.isComplete) {
      session.mistakesCount += 1
      await session.save()

      return response.unprocessableEntity({
        message: 'Submitted path is invalid or incomplete',
        code: validation.code ? `E_${validation.code}` : 'E_INVALID_PATH',
        errors: validation.errors,
        nextClue: validation.nextClue,
        mistakesCount: session.mistakesCount,
      })
    }

    const serverElapsedSeconds = Math.max(
      0,
      Math.round(DateTime.utc().diff(session.startedAt, 'seconds').seconds)
    )
    const elapsedSeconds = Math.max(serverElapsedSeconds, payload.elapsedSeconds ?? 0)
    const mistakesCount = Math.max(session.mistakesCount, payload.mistakesCount ?? 0)
    const hintsUsed = session.hintsUsed

    const breakdown = this.scoringService.calculate({
      difficulty: session.level.difficulty,
      durationSeconds: elapsedSeconds,
      mistakes: mistakesCount,
      hintsUsed,
    })

    const moves: MoveInput[] = payload.path.map((cellIndex, index) => ({
      stepOrder: index + 1,
      cellIndex,
      isValid: true,
    }))

    const { session: completedSession, score } = await this.gameSessionRepository.completeWithScore(
      session,
      {
        elapsedSeconds,
        mistakesCount,
        hintsUsed,
        points: breakdown.total,
        moves,
      }
    )

    return response.ok({
      data: {
        session: serializeGameSession(completedSession),
        score: serializeScore(score),
        breakdown,
      },
    })
  }

  async abandon({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      throw this.sessionNotFound()
    }

    if (session.status !== 'in_progress') {
      throw this.sessionAlreadyClosed()
    }

    session.status = 'abandoned'
    session.finishedAt = DateTime.utc()
    session.elapsedSeconds = Math.max(
      0,
      Math.round(DateTime.utc().diff(session.startedAt, 'seconds').seconds)
    )
    await session.save()

    return response.ok({
      data: serializeGameSession(session),
    })
  }

  private sessionNotFound() {
    return new GameException('Game session not found', {
      status: 404,
      code: 'E_SESSION_NOT_FOUND',
    })
  }

  private sessionAlreadyClosed() {
    return new GameException('This game session is already finished', {
      status: 409,
      code: 'E_ALREADY_FINISHED',
    })
  }
}
