// Flat ESLint config without Next's runner/patch to avoid @rushstack/eslint-patch warnings
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: false,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      'typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // parity with previous rules
      'react-hooks/rules-of-hooks': 'error',
      'prefer-spread': 'error',
      'typescript-eslint/no-explicit-any': 'error',
    },
  },
];
