import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', watch: { ignored: ['**/local-tracks/**'] }, fs: { deny: ['**/local-tracks/**','**/stem_splitter.py','**/mixtape-booth.xml','**/.env*','**/.git/**'] }, proxy: { '/api': 'http://127.0.0.1:8787' } } });
