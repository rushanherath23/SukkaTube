'use client'

import { useActionState } from 'react'
import { signUp } from '@/app/auth-actions'
import { ERROR_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/form-styles'
import {
  MAX_USERNAME_LENGTH,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_PATTERN,
} from '@/lib/limits'

export function SignupForm({ next, maxBirthDate }: { next: string; maxBirthDate: string }) {
  const [state, formAction, pending] = useActionState(signUp, {})

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
          minLength={MIN_USERNAME_LENGTH}
          maxLength={MAX_USERNAME_LENGTH}
          pattern={USERNAME_PATTERN}
          disabled={pending}
          className={INPUT_CLASS}
        />
        <span className="text-xs text-muted">
          {MIN_USERNAME_LENGTH}–{MAX_USERNAME_LENGTH} characters. Letters, numbers and
          underscores. This is the name shown on your videos and comments.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          disabled={pending}
          className={INPUT_CLASS}
        />
        <span className="text-xs text-muted">At least {MIN_PASSWORD_LENGTH} characters.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Date of birth</span>
        <input
          name="dateOfBirth"
          type="date"
          required
          max={maxBirthDate}
          disabled={pending}
          className={INPUT_CLASS}
        />
        <span className="text-xs text-muted">
          You must be {MIN_AGE} or older to create an account.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
        <input
          name="consent"
          type="checkbox"
          required
          disabled={pending}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
        />
        <span className="text-sm leading-relaxed">
          I confirm I am {MIN_AGE} years old or older, and I agree to the rules of this site:
          I only upload material I have the right to share, and I keep comments civil.
        </span>
      </label>

      {state?.error && (
        <p aria-live="polite" className={ERROR_CLASS}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} self-start`}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
