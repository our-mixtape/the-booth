import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['--env-file-if-exists=.env','server/index.mjs'],{stdio:'inherit'}),spawn('pnpm',['dev:client'],{stdio:'inherit'})];
let stopped=false;
function stop(code=0){if(stopped)return;stopped=true;process.exitCode=code;for(const child of children)child.kill('SIGTERM');}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const child of children){child.on('exit',code=>stop(code??0));child.on('error',error=>{console.error(error.message);stop(1);});}
