/**
 * Renders a synchronous inline script. It is `text/javascript` in the SSR HTML
 * so the browser runs it during parsing, and `text/plain` on the client so
 * React doesn't warn about script tags it can never execute.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
