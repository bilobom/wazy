#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app').app;
var debug = require('debug')('myfirstservermvc:server');
var http = require('http');
var https = require('https');
var fs= require('fs')
var path = require('path');
var cluster= require('cluster');
var horzScaling = false;


var index = require('../routes/index');
var users = require('../routes/user');

index.init(app); users.init(app);


/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '7000');
app.set('port', port);

/**
 * Create HTTP & HTTPS server.
 */
var sslOption={
  key: fs.readFileSync(path.join(__dirname, resolveURL('sslKey/key.key'))),
  cert: fs.readFileSync(path.join(__dirname, resolveURL('sslKey/cert.cert')))
}

var server = http.createServer(app);
//var server = https.createServer(sslOption,app);

/**
 *  Run the server
 */
function runServer() {
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
  /**
    * Signaling Server
    */
  require('../Signaling-Server.js')(server);
}

runServer();


/**
 * Listen on provided port, on all network interfaces.
if (horzScaling) {
  // Code to run if we're in the master process
  if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;
    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
      cluster.fork();
    }
  } else { // Code to run if we're in a worker process
      runServer();
    }
} else {
  runServer();
}
/**
 * Normalize a port into a number, string, or false.
 */


function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
/**
 * to resolve url
 */
function resolveURL(url) {
    var isWin = !!process.platform.match(/^win/);
    if (!isWin) return url;
    return url.replace(/\//g, '\\');
}
