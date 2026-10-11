import {build} from 'esbuild';
await build({entryPoints:['src/gemini_hook.ts'],outfile:'scripts/gemini_hook.mjs',bundle:true,platform:'node',target:'node20',format:'esm',logLevel:'silent',legalComments:'none'});
