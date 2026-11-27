import type { NextConfig } from "next";

import { localizeRules } from "games-localize/next";

export default {
  devIndicators: false,
  experimental: { turbopackRustReactCompiler: true },
  output: "export",
  poweredByHeader: false,
  reactCompiler: true,
  trailingSlash: true,
  transpilePackages: ["games-localize", "games-common"],
  turbopack: {
    rules: {
      "*.css": { as: "*.css", loaders: ["@tailwindcss/turbopack"] },
      ...localizeRules({ localeParam: "locale" }),
    },
  },
} satisfies NextConfig;
