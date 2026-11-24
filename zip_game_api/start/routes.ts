/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const LevelsController = () => import('#controllers/levels_controller')
const GameSessionsController = () => import('#controllers/game_sessions_controller')

router.get('/', async () => {
  return {
    status: 'ok',
    service: 'zip_game_api',
  }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('/register', [AuthController, 'register'])
        router.post('/login', [AuthController, 'login'])
        router.get('/me', [AuthController, 'me']).use(middleware.auth())
        router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
      })
      .prefix('/auth')

    router
      .group(() => {
        router.get('/', [LevelsController, 'index'])
        router.get('/recommended', [LevelsController, 'recommended'])
        router.post('/generate', [LevelsController, 'generate'])
        router.get('/:id', [LevelsController, 'show'])
      })
      .prefix('/levels')
      .use(middleware.auth())

    router
      .group(() => {
        router.post('/', [GameSessionsController, 'store'])
        router.get('/:id', [GameSessionsController, 'show'])
        router.post('/:id/moves', [GameSessionsController, 'move'])
        router.post('/:id/hint', [GameSessionsController, 'hint'])
        router.post('/:id/complete', [GameSessionsController, 'complete'])
        router.post('/:id/abandon', [GameSessionsController, 'abandon'])
      })
      .prefix('/sessions')
      .use(middleware.auth())
  })
  .prefix('/api')
