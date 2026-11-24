import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import GameSessionRepository, { type MoveInput } from '#repositories/game_session_repository'
import LevelRepository from '#repositories/level_repository'
import GameValidatorService from '#services/game_validator_service'
import GameAssistanceService from '#services/game_assistance_service'
import HintService from '#services/hint_service'
import { idParamValidator } from '#validators/common_validator'
import {
  completeGameSessionValidator,
  createGameSessionValidator,
  hintRequestValidator,
  recordMoveValidator,
} from '#validators/game_session_validator'
import { serializeGameSession, serializeLevel, serializeScore } from '#utils/serializers'

export default class GameSessionsController {
  private readonly gameSessionRepository = new GameSessionRepository()
  private readonly levelRepository = new LevelRepository()
  private readonly gameValidatorService = new GameValidatorService()
  private readonly gameAssistanceService = new GameAssistanceService()
  private readonly hintService = new HintService()

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createGameSessionValidator)

    const level = await this.levelRepository.findById(payload.levelId)
    if (!level) {
      return response.notFound({
        message: 'Level not found',
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
      return response.notFound({
        message: 'Game session not found',
      })
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
      return response.notFound({
        message: 'Game session not found',
      })
    }

    if (session.status !== 'in_progress') {
      return response.conflict({
        message: 'Game session is not active',
      })
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
      return response.notFound({
        message: 'Game session not found',
      })
    }

    if (session.status !== 'in_progress') {
      return response.conflict({
        message: 'Game session is not active',
      })
    }

    const board = {
      size: session.level.gridSize,
      checkpoints: [...session.level.clues]
        .sort((a, b) => a.number - b.number)
        .map((clue) => clue.cell),
    }
    const hint = this.hintService.getHint(board, session.level.solution, payload.path ?? [])
    if (hint.status === 'invalid') {
      return response.unprocessableEntity({
        message: hint.message,
        code: hint.code,
        index: hint.index,
      })
    }

    await this.gameSessionRepository.incrementHints(session)

    return response.ok({
      data: {
        hint,
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
      return response.notFound({
        message: 'Game session not found',
      })
    }

    if (session.status !== 'in_progress') {
      return response.conflict({
        message: 'Game session is already closed',
      })
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

    const points = this.gameAssistanceService.calculateScore({
      difficulty: session.level.difficulty,
      elapsedSeconds,
      mistakesCount,
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
        points,
        moves,
      }
    )

    return response.ok({
      data: {
        session: serializeGameSession(completedSession),
        score: serializeScore(score),
      },
    })
  }

  async abandon({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)

    const session = await this.gameSessionRepository.findByIdForUser(id, user.id)
    if (!session) {
      return response.notFound({
        message: 'Game session not found',
      })
    }

    if (session.status !== 'in_progress') {
      return response.conflict({
        message: 'Game session is already closed',
      })
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
}
