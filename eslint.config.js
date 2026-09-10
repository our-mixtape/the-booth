import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['Mixtape booth redesign direction/**','local-tracks/**','dist/**','node_modules/**','test-results/**','playwright-report/**'] }, js.configs.recommended, ...tseslint.configs.recommended, { languageOptions: { globals: { process:'readonly', console:'readonly', Buffer:'readonly', fetch:'readonly', URL:'readonly', setTimeout:'readonly', clearTimeout:'readonly', AbortSignal:'readonly' } }, rules: { '@typescript-eslint/no-explicit-any':'error' } });
