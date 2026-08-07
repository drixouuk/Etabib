import * as Sentry from '@sentry/nextjs'

const dsn =
  process.env.NEXT_PUBLIC_GLITCHTIP_DSN ??
  'http://98904b9f42634ec09db0eea9e2a2e4de@glitch.etabibi.ma/1'

Sentry.init({
  dsn,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'production',
  tracesSampleRate: 0.1,
})
