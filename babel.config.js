// Babel configuration that works with Next.js, Jest, and build processes
const isJest =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('jest'));

// For Next.js development and build, use a minimal configuration that doesn't conflict
// For Jest, use the full configuration
if (isJest) {
  module.exports = {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }]
    ]
  };
} else {
  // Minimal configuration for Next.js that doesn't interfere with its built-in Babel
  module.exports = {
    presets: [['@babel/preset-react', { runtime: 'automatic' }]]
  };
}
