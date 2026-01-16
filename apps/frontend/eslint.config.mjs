import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // Allow underscore-prefixed unused variables (common pattern for intentionally unused vars)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Disallow console statements - use logger from @/lib/logger instead
      'no-console': 'error',
    },
  },
  // Allow console in specific files where it's legitimate
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts', 'src/lib/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]

export default eslintConfig
