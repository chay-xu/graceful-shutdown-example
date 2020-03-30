const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

let stop = false;

function sleep(time = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

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
    console.log('master message: ', data);
  });
});

function awaitEvent(emitter, event) {
  if (typeof emitter === 'string') {
    event = emitter;
    emitter = this;
  }

  return new Promise((resolve, reject) => {
    const done = event === 'error' ? reject : resolve;
    emitter.once(event, done);
  });
}

// Send the signal to the child processes
async function killWorker(worker, timeout) {
  await Promise.race([awaitEvent(worker, 'exit'), sleep(timeout)]);

  if (worker.killed) return;
  (worker.process || worker).kill('SIGKILL');
}

// Kill all workers
async function onMasterSignal() {
  console.log(1234)
  if (stop) return;
  stop = true;

  const timeout = 3000

  const killworkersCall = Object.keys(cluster.workers).map(id => {
    const worker = cluster.workers[id];

    return killWorker(worker, timeout);
  });

  await Promise.all(killworkersCall)
}

// kill(2) Ctrl-C
// kill(3) Ctrl-\
// kill(15) default
// Master exit
['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, onMasterSignal);
});

// Terminate the master process
process.once('exit', () => {
  console.log(`master about to exit`);
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
    `worker ${worker.process.pid} died, code: ${code}, signal: ${signal}`
  );

  worker.removeAllListeners();

  if(stop) return

  console.log('===refork===');
  // refork a new worker
  cluster.fork();
});

setTimeout(() => {
  cluster.workers[1].send({
    action: 'throw error',
  });
}, 600);
