import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Standard ESLint config for a React + Vite app.
//
// Notes:
// - parserOptions.ecmaFeatures.jsx makes the parser understand JSX.
// - react/jsx-uses-vars (from plugin:react) tells ESLint that a variable
//   used inside JSX (like <MyComponent />) counts as "used", so
//   no-unused-vars does not flag components that only appear in JSX.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React 17+ auto JSX runtime: no need to import React
      'react/react-in-jsx-scope': 'off',
      // We don't use PropTypes
      'react/prop-types': 'off',
      // Context files (like AuthContext) export a provider component AND a
      // hook from the same file — that is normal React, so keep this a
      // warning instead of an error
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
