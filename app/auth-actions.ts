'use server'

import { redirect } from 'next/navigation'
import { endSession, safeNext, startSession } from '@/lib/auth'
import { calculateAge } from '@/lib/format'
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
} from '@/lib/limits'
import { createUser, findByUsername, hashPassword, verifyPassword } from '@/lib/users'

export type AuthFormState = { error?: string }

const USERNAME_RE = new RegExp(`^[a-zA-Z0-9_]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`)

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim()
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = field(formData, 'username')
  const password = String(formData.get('password') ?? '')
  const dateOfBirth = field(formData, 'dateOfBirth')

  if (!USERNAME_RE.test(username)) {
    return {
      error: `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters, letters, numbers and underscores only`,
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'That password is too long' }
  }

  const age = calculateAge(dateOfBirth)
  if (age === null) return { error: 'Enter your date of birth' }
  if (age > 120) return { error: 'Check your date of birth' }
  if (age < MIN_AGE) return { error: `You must be ${MIN_AGE} or older to create an account` }

  if (formData.get('consent') !== 'on') {
    return { error: 'You need to accept the terms to continue' }
  }

  const user = await createUser({
    username,
    displayName: username,
    passwordHash: await hashPassword(password),
    dateOfBirth,
  })

  if (!user) return { error: 'That username is already taken' }

  await startSession(user.id)
  redirect(safeNext(field(formData, 'next')))
}

export async function logIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = field(formData, 'username')
  const password = String(formData.get('password') ?? '')

  const user = await findByUsername(username)
  if (!user) {
    // Burn comparable time so a missing account isn't obvious from the latency.
    await hashPassword(password)
    return { error: 'Wrong username or password' }
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Wrong username or password' }
  }

  await startSession(user.id)
  redirect(safeNext(field(formData, 'next')))
}

export async function logOut(): Promise<void> {
  await endSession()
  redirect('/')
}
