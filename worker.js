'use strict';

const http = require('http');
const { fork } = require('child_process');
const graceful = require('./graceful');

fork('./child');

// Workers can share any TCP connection
// In this case it is an HTTP server
const server = http
  .createServer((req, res) => {
    // services excption
    try {
      throw new Error('Happened error');
    } catch (err) {
      res.writeHead(200);
      res.end(`${err.stack.toString()}`);
    }
    // console.log(res)
    // res.setHeader('Content-Type', 'application/json');
    // res.setHeader('Access-Control-Allow-Origin', '*');
    // res.writeHead(200);
    // res.end(JSON.stringify({ success: true }));
  })
  .listen(8000);

graceful({
  server,
});

// Send to master
process.send({
  message: 'from worker',
  // server
});

process.on('message', data => {
  // Receive by the master
  if (data.action && data.action === 'throw error') {
    // The process threw an exception
    throw new Error('Kill myself');
  }
  console.log('Worker message', data);
});
