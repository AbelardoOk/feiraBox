import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Arquivos que o ESLint deve ignorar
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.next/**',
      '**/coverage/**',
      '**/generated/**',

      // Scripts/documentação auxiliar do Expo
      'mobile/scripts/**',

      // Arquivos auxiliares de agentes
      '**/.agents/**',
    ],
  },

  // Regras básicas do ESLint
  eslint.configs.recommended,

  // Backend — Bun + Elysia + TypeScript
  {
    files: ['server/**/*.ts'],

    extends: [tseslint.configs.recommended],

    languageOptions: {
      globals: globals.node,
    },
  },

  // Mobile — React Native + Expo + TypeScript
  {
    files: ['mobile/**/*.ts', 'mobile/**/*.tsx'],

    extends: [tseslint.configs.recommended],

    languageOptions: {
      globals: globals.browser,
    },

    rules: {
      // Expo/React Native utiliza require() em alguns casos,
      // principalmente para assets e compatibilidade.
      '@typescript-eslint/no-require-imports': 'off',

      // Durante o desenvolvimento do mobile,
      // variáveis não utilizadas não bloqueiam o commit.
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
