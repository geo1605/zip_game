import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import hash from '@adonisjs/core/services/hash'
import User from '#models/user'

test.group('Auth API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('registers a new user, hashes password with scrypt, and returns a bearer token', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/api/auth/register').json({
      fullName: 'Ada Lovelace',
      email: 'ADA@ZipGame.Test',
      password: 'password123',
    })

    response.assertStatus(201)
    const body = response.body()

    assert.equal(body.user.fullName, 'Ada Lovelace')
    assert.equal(body.user.email, 'ada@zipgame.test')
    assert.notProperty(body.user, 'password')
    assert.equal(body.token.type, 'bearer')
    assert.isString(body.token.value)

    const savedUser = await User.findByOrFail('email', 'ada@zipgame.test')
    assert.notEqual(savedUser.password, 'password123')
    assert.isTrue(await hash.verify(savedUser.password, 'password123'))
  })

  test('rejects duplicate email with 409 and invalid payloads with 422', async ({ client }) => {
    await client.post('/api/auth/register').json({
      fullName: 'First User',
      email: 'dup@zipgame.test',
      password: 'password123',
    })

    const duplicate = await client.post('/api/auth/register').json({
      fullName: 'Second User',
      email: 'DUP@zipgame.test',
      password: 'password123',
    })
    duplicate.assertStatus(409)

    const invalid = await client.post('/api/auth/register').json({
      fullName: 'A',
      email: 'invalid-email',
      password: '123',
    })
    invalid.assertStatus(422)
  })

  test('logs in valid user, accesses /api/auth/me, and revokes token on logout', async ({
    client,
    assert,
  }) => {
    await User.create({
      fullName: 'Grace Hopper',
      email: 'grace@zipgame.test',
      password: 'password123',
    })

    const badLogin = await client.post('/api/auth/login').json({
      email: 'grace@zipgame.test',
      password: 'wrongpassword',
    })
    badLogin.assertStatus(401)

    const loginResponse = await client.post('/api/auth/login').json({
      email: 'grace@zipgame.test',
      password: 'password123',
    })
    loginResponse.assertStatus(200)
    const token: string = loginResponse.body().token.value

    const unauthMe = await client.get('/api/auth/me')
    unauthMe.assertStatus(401)

    const meResponse = await client.get('/api/auth/me').bearerToken(token)
    meResponse.assertStatus(200)
    assert.equal(meResponse.body().user.email, 'grace@zipgame.test')

    const logoutResponse = await client.post('/api/auth/logout').bearerToken(token)
    logoutResponse.assertStatus(200)

    const revokedMe = await client.get('/api/auth/me').bearerToken(token)
    revokedMe.assertStatus(401)
  })
})
