import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GameException from '#exceptions/game_exception'
import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { serializeUser } from '#utils/serializers'

@inject()
export default class AuthController {
  constructor(private readonly userRepository: UserRepository) {}

  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const existingUser = await this.userRepository.findByEmail(payload.email)
    if (existingUser) {
      throw new GameException('Email is already registered', {
        status: 409,
        code: 'E_EMAIL_EXISTS',
      })
    }

    let user: User
    try {
      user = await this.userRepository.create(payload)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new GameException('Email is already registered', {
          status: 409,
          code: 'E_EMAIL_EXISTS',
        })
      }
      throw error
    }

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '30 days',
    })

    return response.created({
      user: serializeUser(user),
      token: {
        type: 'bearer',
        value: token.value!.release(),
        expiresAt: token.expiresAt?.toISOString() ?? null,
      },
    })
  }

  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)

    let user: User
    try {
      user = await User.verifyCredentials(payload.email, payload.password)
    } catch {
      throw new GameException('Invalid credentials', {
        status: 401,
        code: 'E_INVALID_CREDENTIALS',
      })
    }

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '30 days',
    })

    return response.ok({
      user: serializeUser(user),
      token: {
        type: 'bearer',
        value: token.value!.release(),
        expiresAt: token.expiresAt?.toISOString() ?? null,
      },
    })
  }

  async me({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    return response.ok({
      user: serializeUser(user),
    })
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)

    return response.ok({
      message: 'Logged out successfully',
    })
  }
}
