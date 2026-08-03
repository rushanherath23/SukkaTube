'use client'

import { useActionState } from 'react'
import { logIn } from '@/app/auth-actions'
import { ERROR_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/form-styles'

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(logIn, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Username</span>
        <input
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={pending}
          className={INPUT_CLASS}
        />
      </label>

      {state?.error && (
        <p aria-live="polite" className={ERROR_CLASS}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} self-start`}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
