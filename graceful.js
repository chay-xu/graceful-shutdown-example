const cluster = require('cluster');

module.exports = options => {
  const { processKillTimeout = 3000, server } = options;

  let throwErrorTimes = 0

  process.on('uncaughtException', function(err) {
    throwErrorTimes += 1;
    console.log('==========================');
    console.error(err)

    if (throwErrorTimes > 1) {
      return;
    }

    server.on('request', (req, res) => {
      req.shouldKeepAlive = false;
      res.shouldKeepAlive = false;
      if (!res._header) {
        res.setHeader('Connection', 'close');
      }
    });

    if (processKillTimeout) {
      const timer = setTimeout(() => {
        process.exit(1);
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
  });
};
