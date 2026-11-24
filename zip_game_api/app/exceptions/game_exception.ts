import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/*
|--------------------------------------------------------------------------
| GameException
|--------------------------------------------------------------------------
| Domain exception that self-handles as structured JSON:
| { message, code, details? } with the provided HTTP status (404, 409, 422...).
*/
export default class GameException extends Exception {
  declare details?: unknown

  constructor(message: string, options: { status: number; code: string; details?: unknown }) {
    super(message, { status: options.status, code: options.code })
    this.details = options.details
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({
      message: error.message,
      code: error.code,
      ...(error.details !== undefined ? { details: error.details } : {}),
    })
  }
}
