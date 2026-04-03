/**
 * Sentry Client-side Configuration
 * Initializes Sentry for browser runtime (client components, pages)
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs
 */

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set to true to automatically send PII (user info, IP addresses)
  sendDefaultPii: true,

  // Session Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable structured logs
  enableLogs: true,

  // Integrations for client-side
  integrations: [
    // Session Replay - records user sessions
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // User Feedback widget
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  // Track router transitions for better performance monitoring
  _experiments: {
    enableLogs: true,
  },
})

// Export for router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart