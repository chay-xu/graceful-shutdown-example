'use strict';

console.log('Startup child processing task: ', process.pid)

setInterval(()=>{
  console.log(`${process.pid} Child process is alive`)
}, 8000)

process.on('exit', (code) => {
  console.log(`Child process exited with code ${code}`);
});