import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Stage an explicit allowlist: private collection, .env files and evidence never enter it.
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=await mkdtemp(join(tmpdir(),'booth-deploy-'));
for(const name of ['api','server','src','public','tests','package.json','pnpm-lock.yaml','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','vercel.json']){
 await cp(join(root,name),join(destination,name),{recursive:true});
}
const {projectId,orgId}=JSON.parse(await readFile(join(root,'.vercel/project.json'),'utf8'));
await mkdir(join(destination,'.vercel'));
await writeFile(join(destination,'.vercel/project.json'),JSON.stringify({projectId,orgId}));
console.log(destination);
