/**
 * Babel configuration for transpiling JavaScript
 */
export default {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
  ],
};
