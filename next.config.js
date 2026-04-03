/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  // Enable instrumentation hook for server startup
  experimental: {
    instrumentationHook: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

// Only wrap with Sentry during builds when auth token is present
// This avoids ESM/CJS issues during Vercel builds
const withSentryConfig = (config) => {
  // Skip Sentry wrapper if no auth token (not building for Sentry)
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return config
  }

  try {
    // Dynamic import to avoid ESM issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { withSentryConfig: sentryWrapper } = require("@sentry/nextjs")
    return sentryWrapper(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
    })
  } catch {
    // If Sentry fails to load, return config without Sentry
    return config
  }
}

module.exports = withSentryConfig(nextConfig)