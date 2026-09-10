import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { gatewayOrigin } from './src/agent/gateway.ts';
export default defineConfig(({ mode, command }) => {
 const env=loadEnv(mode,process.cwd(),'VITE_');
 gatewayOrigin(env.VITE_ASTRA_GATEWAY_ORIGIN || '',command==='serve');
 return { plugins: [react()], server: { host: '127.0.0.1', port: Number(process.env.PORT)||5173, strictPort: true, watch: { ignored: ['**/local-tracks/**'] }, fs: { deny: ['**/local-tracks/**','**/stem_splitter.py','**/mixtape-booth.xml','**/.env*','**/.git/**'] }, proxy: { '/api': `http://127.0.0.1:${process.env.GATEWAY_PORT||8787}` } } };
});
