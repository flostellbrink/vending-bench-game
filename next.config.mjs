import {localizeRules} from 'games-localize/next';

export default {
  output: 'export',
  trailingSlash: true,
  devIndicators: false,
  poweredByHeader: false,
  transpilePackages: ['games-localize', 'games-common'],
  turbopack: {rules: localizeRules({localeParam:'locale'})}
};
