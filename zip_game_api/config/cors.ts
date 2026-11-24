import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/*
|--------------------------------------------------------------------------
| CORS configuration for Flutter Web
|--------------------------------------------------------------------------
| Flutter Web runs on http://localhost:<random-port>.
| In development any localhost / 127.0.0.1 port is allowed.
| In production only origins explicitly listed in CORS_ORIGINS are allowed.
*/
const allowedOrigins = (env.get('CORS_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const corsConfig = defineConfig({
  enabled: true,
  origin: (requestOrigin) => {
    if (allowedOrigins.includes(requestOrigin)) return true
    return !app.inProduction && localhostPattern.test(requestOrigin)
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
