import type { NextConfig } from "next";
import { readAppBuildMetadata } from "./lib/app-build-metadata.ts";

const healthBuild = readAppBuildMetadata(__dirname);

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  // Next substitutes these two explicit references at build time. Do not
  // spread process.env or accept runtime overrides for the built identity.
  env: {
    GEOSUB_HEALTH_BUILD_VERSION: healthBuild.version ?? "",
    GEOSUB_HEALTH_BUILD_COMMIT: healthBuild.commit ?? "",
  },
  distDir: process.env.GEOSUB_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1"],
  trailingSlash: false,
  outputFileTracingIncludes: {
    "/reports/**/*": ["./assets/fonts/*.otf", "./assets/fonts/*.ttf", "./node_modules/@fontsource/**/*.woff"],
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "www.geosub.org" }],
        destination: "https://geosub.org/zh",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.geosub.org" }],
        destination: "https://geosub.org/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/brand-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
