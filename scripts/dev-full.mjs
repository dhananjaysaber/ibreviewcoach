import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['server/local-lab.mjs'],{stdio:'inherit',shell:false});
const vite=spawn('npm',['run','dev'],{stdio:'inherit',shell:process.platform==='win32'});
const finish=()=>{server.kill('SIGTERM');vite.kill('SIGTERM');process.exit(0)};
process.once('SIGINT',finish);process.once('SIGTERM',finish);server.on('exit',code=>{if(code!==0){console.error('Local IA backend exited:',code);vite.kill();process.exitCode=1}});
