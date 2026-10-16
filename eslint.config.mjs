// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ℹ️ Plugin guardrails: a plugin may only reach the platform through @unifyamerica/demleague-plugin-sdk. These rules are
// part of the plugin template and are also checked in review, since a plugin runs in the API's process (and
// its UI in the SPA's).
const ALLOWED_PACKAGES = [
  '@unifyamerica/demleague-plugin-sdk',
  '@unifyamerica/demleague-plugin-sdk/manifest',
  '@nestjs/common',
  'class-validator',
  'class-transformer',
];
// The UI (`src/ui`, bundled by the SPA) gets Vue, PrimeVue and the SDK's Vue entry, and of the plugin's
// server code only its manifest
const UI_ALLOWED_PACKAGES = [
  '@unifyamerica/demleague-plugin-sdk/vue',
  'vue',
  'primevue/[a-z-]+',
  'primeicons/[a-z./-]+',
];

// Elements that embed another document. Plugin UIs render into the SPA's own page, never a framed one.
const FRAME_ELEMENTS = ['iframe', 'frame', 'frameset', 'object', 'embed'];
const FRAME_ELEMENTS_REGEX = `/^(?:${FRAME_ELEMENTS.join('|')})$/i`;
const NO_FRAMES =
  'Plugin UIs may not include, create or inject iframes (or frame, object, embed). Build the UI with Vue and PrimeVue.';
const NO_HTML =
  'Plugin UIs may not write raw HTML (v-html, innerHTML, insertAdjacentHTML, document.write). Render it with Vue, or HTML with the SDK\'s v-safe-html directive.';

const escape = (name) => name.replace(/[./]/g, (c) => `\\${c}`);
const onlyImports = (packages, relative, message) => [
  'error',
  {
    patterns: [
      {
        regex: `^(?!${relative}|(?:${packages.join('|')})$)`,
        message,
      },
    ],
  },
];

export default tseslint.config(
  { ignores: ['eslint.config.mjs', 'dist/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      // The editor's ESLint server loads every package's config in one process, so each must say where it is
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts', 'src/ui/**'],
    rules: {
      'no-restricted-imports': onlyImports(
        ALLOWED_PACKAGES.map(escape),
        '\\.',
        `Plugins may only import ${ALLOWED_PACKAGES.join(', ')} and their own files. Ask for a new SDK capability instead.`,
      ),
    },
  },
  // Per folder depth below src/ui, so relative imports can't climb out of it (except to the manifest)
  ...[0, 1, 2, 3].map((depth) => ({
    files: [`src/ui/${'*/'.repeat(depth)}*.{ts,vue}`],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': onlyImports(
        UI_ALLOWED_PACKAGES.map((name) => name.replace(/\//g, '\\/')),
        `\\./|(?:\\.\\./){1,${Math.max(depth, 1)}}(?!\\.\\./)${depth === 0 ? 'manifest$' : ''}|(?:\\.\\./){${depth + 1}}manifest$`,
        `Plugin UIs may only import @unifyamerica/demleague-plugin-sdk/vue, vue, primevue, primeicons, the manifest and their own files. Ask for a new SDK capability instead.`,
      ),
    },
  })),
  {
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Plugins get configuration from the host, not process.env.',
        },
      ],
      'no-restricted-globals': ['error', 'eval', 'Function', 'require'],
    },
  },
  // No iframes (or other embedded documents) in the UI: not in templates, render functions or HTML strings.
  // The SPA's CSP blocks them anyway (frame-src 'none'), and the shipped-code check looks for them too.
  {
    files: ['src/ui/**/*.{ts,vue}'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'vue/no-restricted-html-elements': [
        'error',
        { element: FRAME_ELEMENTS, message: NO_FRAMES },
      ],
      'vue/no-restricted-static-attribute': [
        'error',
        { key: 'is', value: FRAME_ELEMENTS_REGEX, message: NO_FRAMES },
        { key: 'srcdoc', message: NO_FRAMES },
      ],
      'vue/no-v-html': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // h('iframe'), document.createElement('iframe'), createVNode('iframe'), …
          selector: `CallExpression > Literal.arguments[value=${FRAME_ELEMENTS_REGEX}]`,
          message: NO_FRAMES,
        },
        {
          selector:
            'MemberExpression[property.name=/^(?:innerHTML|outerHTML|srcdoc)$/], Property[key.name=/^(?:innerHTML|outerHTML|srcdoc)$/]',
          message: NO_HTML,
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(?:insertAdjacentHTML|createContextualFragment|setHTMLUnsafe)$/], CallExpression[callee.object.name="document"][callee.property.name=/^(?:write|writeln)$/]',
          message: NO_HTML,
        },
      ],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // ℹ️ Pages are named by their role (e.g. `NotesPage.vue`)
      'vue/multi-word-component-names': 'off',
    },
  },
);
