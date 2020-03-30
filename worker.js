const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

const graceful = require('./graceful');

// Workers can share any TCP connection
// In this case it is an HTTP server
const server = http
  .createServer((req, res) => {
    // res.writeHead(200);
    // res.end('hello world\n');

    // services excption
    try {
      throw new Error('happened error');
    } catch (err) {
      res.writeHead(200);
      res.end(`${err.stack.toString()}`);
    }
  })
  .listen(8000);

// console.log(`Worker ${process.pid} started`);
graceful({
  server
})

// Send to master
process.send({
  message: 'from worker',
  // server
});

process.on('message', data => {
  // Receive by the master
  if (data.action && data.action === 'throw error') {
    // The process threw an exception
    throw new Error('kill myself');
  }
  console.log('worker message', data);
});
