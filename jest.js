import { spawn } from 'child_process';

const proc = spawn(process.execPath, ['--test'], { stdio: 'inherit' });
proc.on('exit', code => process.exit(code));
