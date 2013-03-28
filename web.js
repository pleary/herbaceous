var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');

// GET /javascripts/jquery.js
// GET /style.css
// GET /favicon.ico
app.use(express.static(__dirname + '/public'));

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

var port = process.env.PORT || 5000; // Use the port that Heroku provides or default to 5000
server.listen(port, function() {
  console.log("Express server listening on port %d", server.address().port);
});

var openConnections = 0;
io.sockets.on('connection', function (socket) {
  openConnections++;
  io.sockets.emit('update_user_count', openConnections);
  // socket.on('connect', function () {
  //   openConnections++;
  //   io.sockets.emit('update_user_count', openConnections);
  // });
  socket.on('disconnect', function () {
    openConnections--;
    io.sockets.emit('update_user_count', openConnections);
  });
  socket.on('lets_all_look_at', function(taxon_data) {
    fs.appendFile('search_log.txt', JSON.stringify(taxon_data)+"\n", function (err) {
      if (err) throw err;
    });
    socket.broadcast.emit('set_image', taxon_data);
  });
});
