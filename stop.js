'use strict';

const util = require('util');
const childProcess = require('child_process');
// const killTree = require('./kill-tree');

const exec = util.promisify(childProcess.exec);
const isWin = process.platform === 'win32';
const TEN_MEGABYTES = 1000 * 1000 * 10;
const REGEX = isWin ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;

const main = async () => {
  const ret = [];

  const command = isWin
    ? 'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId'
    : // command, cmd are alias of args, not POSIX standard, so we use args
      'ps -eo "pid,args" | grep node';

  const { stdout } = await exec(command, {
    maxBuffer: TEN_MEGABYTES,
  });

  for (let line of stdout
    .trim()
    .split('\n')
    .slice(1)) {
    line = line.trim();

    const m = line.match(REGEX);

    if (m) {
      const proc = isWin
          ? {
              pid: m[2],
              cmd: m[1],
            }
          : {
              pid: m[1],
              cmd: m[2],
            }
      
      // Exclude the stop.js
      // Find the startup script
      if(proc.cmd && !proc.cmd.includes('stop.js') && proc.cmd.includes(process.argv[2])){
        // process.argv[2]
        ret.push(
          proc
        );
      }
      
    }

  }

  return ret
};

main().then((result)=>{
  result.forEach((item)=>{
    process.kill(item.pid, 'SIGTERM')
    // killTree(item.pid)
  });
})
