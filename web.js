var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

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

io.sockets.on('connection', function (socket) {
  socket.on('lets_all_look_at', function(image_url, search_term, scientific_name) {
      socket.broadcast.emit('set_image', image_url, search_term, scientific_name);
  });
});
