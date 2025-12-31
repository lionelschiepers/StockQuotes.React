import nextPlugin from 'eslint-config-next';

const config = [
  ...nextPlugin,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      'public/**',
      'components/ui/Loading.js', // Specific file for ignore
      'components/ui/SkeletonLoader.js' // Specific file for ignore
    ]
  }
];

export default config;
