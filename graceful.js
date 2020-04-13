'use strict';

const cluster = require('cluster');
const killTree = require('./kill-tree');

module.exports = options => {
  const { processKillTimeout = 3000, server } = options;

  let throwErrorTimes = 0

  process.on('SIGTERM', function onSigterm () {
    console.info(`Only graceful shutdown, worker ${process.pid}`)
    close()
  })

  process.on('uncaughtException', function(err) {
    throwErrorTimes += 1;
    console.log('====uncaughtException====');
    console.error(err)

    if (throwErrorTimes > 1) {
      return;
    }

    close()
  });

  function close(){
    server.on('request', (req, res) => {
      // closing the http request
      req.shouldKeepAlive = false;
      res.shouldKeepAlive = false;
      if (!res._header) {
        // closing the socket connection
        res.setHeader('Connection', 'close');
      }
    });

    if (processKillTimeout) {
      const timer = setTimeout(() => {
        // Kill all child process
        killTree(process.pid,()=>{
          // Worker process to exit
          process.exit(1);
        })
      }, processKillTimeout);

      timer.unref && timer.unref();
    }

    const worker = cluster.worker;
    if (worker) {
      try {
        server.close(() => {
          try {
            worker.send({ message: 'disconnect' });
            worker.disconnect();
          } catch (err) {
            console.error('Error on worker disconnect');
          }
        });
      } catch (err) {
        console.error('Error on server close');
      }
    }
  }
};
