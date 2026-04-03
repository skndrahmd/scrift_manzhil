import { withSentryConfig } from "@sentry/nextjs"

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

// Sentry configuration for source maps and error tracking
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map uploads (set SENTRY_AUTH_TOKEN in CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silence build logs (set to false in CI for visibility)
  silent: !process.env.CI,

  // Widen client file upload - includes third-party code in source maps
  widenClientFileUpload: true,

  // Transpile Sentry SDKs for better compatibility
  transpileClientSDKs: true,

  // Tunnel route to bypass ad blockers
  // tunnelRoute: "/api/monitoring",

  // Delete source maps after upload (for security)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
}

// Only wrap with Sentry if DSN is configured
export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig