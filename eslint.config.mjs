import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

const config = [
  {
    ignores: [
      'out/**',
      'build/**',
      'node_modules/**',
      'public/**',
      'components/ui/Loading.jsx',
      'components/ui/SkeletonLoader.jsx'
    ]
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  reactHooksPlugin.configs.flat['recommended-latest'],
  {
    files: [
      '**/*.{test,spec}.{js,jsx}',
      '**/__tests__/**/*.{js,jsx}',
      'vitest.setup.js'
    ],
    languageOptions: {
      globals: globals.vitest
    }
  }
];

export default config;
