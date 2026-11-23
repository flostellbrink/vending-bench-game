import type { NextConfig } from "next";

import { localizeRules } from "games-localize/next";

export default {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  poweredByHeader: false,
  transpilePackages: ["games-localize", "games-common"],
  reactCompiler: true,
  experimental: { turbopackRustReactCompiler: true },
  turbopack: {
    rules: {
      "*.css": { as: "*.css", loaders: ["@tailwindcss/turbopack"] },
      ...localizeRules({ localeParam: "locale" }),
    },
  },
} satisfies NextConfig;
