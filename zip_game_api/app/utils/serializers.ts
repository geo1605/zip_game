import type User from '#models/user'

export interface SerializedUser {
  id: number
  fullName: string
  email: string
  createdAt: string | null
}

export function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt?.toISO() ?? null,
  }
}
