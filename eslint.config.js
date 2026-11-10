import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'referencia', 'playwright-report', 'test-results', 'dev-dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'import-x': importX },
    settings: { 'import-x/resolver': { node: { extensions: ['.ts', '.tsx', '.js'] } } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Regras de dependência entre camadas (docs/ARCHITECTURE.md, seção 1)
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/dominio',
              from: ['./src/dados', './src/pdf', './src/app', './src/ui'],
              message: 'dominio/ é puro: não depende de dados, pdf, app nem ui.',
            },
            { target: './src/pdf', from: ['./src/dominio', './src/dados', './src/app', './src/ui'] },
            { target: './src/dados', from: ['./src/app', './src/ui', './src/pdf'] },
            { target: './src/app', from: ['./src/ui'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/dominio/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['preact', 'preact/*', '@preact/*', 'dexie', 'pdfjs-dist', 'pdfjs-dist/*', 'jspdf'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB', 'navigator'],
    },
  },
  prettier,
);
