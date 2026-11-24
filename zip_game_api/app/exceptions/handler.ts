import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as lucidErrors } from '@adonisjs/lucid'

/*
|--------------------------------------------------------------------------
| Global HTTP exception handler
|--------------------------------------------------------------------------
| - Lucid 404 (findOrFail) => { message: 'Resource not found', code: 'E_NOT_FOUND' }
| - VineJS errors          => 422 { errors: [...] }
| - Auth errors            => 401 { errors: [...] }
| - Production 5xx errors never expose stack traces or SQL details.
*/
export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return ctx.response.status(404).send({ message: 'Resource not found', code: 'E_NOT_FOUND' })
    }

    const status = (error as { status?: number }).status ?? 500
    if (status >= 500 && app.inProduction) {
      return ctx.response.status(500).send({ message: 'Internal server error', code: 'E_INTERNAL' })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
