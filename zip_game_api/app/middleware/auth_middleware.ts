import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Auth middleware authenticates API requests using bearer access tokens
 * and rejects unauthenticated requests with a 401 JSON response.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    const guards = options.guards?.length ? options.guards : (['api'] as (keyof Authenticators)[])
    await ctx.auth.authenticateUsing(guards)
    return next()
  }
}
