import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests',workers:1,testMatch:'*.browser.ts',use:{baseURL:'http://127.0.0.1:5173',headless:true,viewport:{width:1440,height:1000},launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}},webServer:{command:'pnpm dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},timeout:45000});
