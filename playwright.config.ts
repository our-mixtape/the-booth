import { defineConfig } from '@playwright/test';
const baseURL=`http://127.0.0.1:${Number(process.env.PORT)||5173}`;
export default defineConfig({testDir:'tests',workers:1,testMatch:'*.browser.ts',use:{baseURL,headless:true,viewport:{width:1440,height:1000},launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}},webServer:{command:'pnpm dev',url:baseURL,reuseExistingServer:true},timeout:45000});
