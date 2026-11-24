import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { serializeUser } from '#utils/serializers'

export default class AuthController {
  private readonly userRepository = new UserRepository()

  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const existingUser = await this.userRepository.findByEmail(payload.email)
    if (existingUser) {
      return response.conflict({
        message: 'Email is already registered',
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
        return response.conflict({
          message: 'Email is already registered',
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
      return response.unauthorized({
        message: 'Invalid credentials',
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
