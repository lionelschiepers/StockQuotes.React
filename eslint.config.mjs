import nextPlugin from '@next/eslint-plugin-next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      'public/**',
      'components/ui/Loading.js',
      'components/ui/SkeletonLoader.js'
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
  nextPlugin.configs['core-web-vitals'],
  reactHooksPlugin.configs.flat['recommended-latest'],
  {
    files: [
      '**/*.{test,spec}.{js,jsx}',
      '**/__tests__/**/*.{js,jsx}',
      'jest.setup.js'
    ],
    languageOptions: {
      globals: globals.jest
    }
  }
];

export default config;
