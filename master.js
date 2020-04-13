'use strict';

const cluster = require('cluster');
const killTree = require('./kill-tree');
const numCPUs = require('os').cpus().length;
// const numCPUs = 1;

let stopping = false;

console.log(`Master ${process.pid} is running`);

cluster.setupMaster({
  exec: 'worker.js',
  // silent: true,
});

// Fork workers.
for (let i = 0; i < numCPUs; i++) {
  cluster.fork();
}

cluster.on('fork', worker => {
  worker.on('message', data => {
    // Receive by the worker
    console.log(`${worker.process.pid} master message: `, data);
  });
});

// Kill all workers
async function onMasterSignal() {
  if (stopping) return;
  stopping = true;

  const killsCall = Object.keys(cluster.workers).map(id => {
    const worker = cluster.workers[id];

    return killTree(worker.process.pid);
  });

  await Promise.all(killsCall);
}

// kill(2) Ctrl-C
// kill(3) Ctrl-\
// kill(15) default
// Master exit
['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach(signal => {
  process.once(signal, onMasterSignal);
});

// Terminate the master process
process.once('exit', () => {
  console.log(`Master about to exit`);
});

// Worker is listening
cluster.on('listening', (worker, address) => {
  // Send to worker
  worker.send({ message: 'from master' });
});

cluster.on('disconnect', worker => {
  console.log(`${worker.id} disconnect`);
});

// Worker died
cluster.on('exit', (worker, code, signal) => {
  console.log(
    `Worker ${worker.process.pid} died, code: ${code}, signal: ${signal}`
  );

  worker.removeAllListeners();

  // killTree(worker.process.pid, function(err) {
  //   console.log(err)
  // });
  
  // stopping server
  if (stopping) return;

  console.log('====Refork====');
  // refork a new worker
  cluster.fork();
});

setTimeout(() => {
  cluster.workers[1].send({
    action: 'throw error',
  });
}, 600);
