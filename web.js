var express = require('express');
var http = require('http');
var path = require('path');
var stylus = require('stylus');
var routes = require('./routes');
var app = express();

/*  configure node, express  */
app.configure(function(){
  app.set('port', process.env.PORT || 5000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(stylus.middleware({
    src: __dirname + '/public',
    dest: __dirname + '/public'
  }));
  app.use(express.static(path.join(__dirname, 'public')));
});

/*  configure express routes  */
var site = require('./routes/index');
app.get('/', site.index);
app.get('/feed', site.feed);
app.get('/collage', site.collage);

/*  start node  */
var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});





/*  configure socket.io  */
var io = require('socket.io').listen(server);
io.configure(function () {
  // https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
  io.set("log level", 1);
});

/*  socket.io events  */
var openConnections = 0;
io.sockets.on('connection', function (socket) {
  openConnections++;
  io.sockets.emit('update_user_count', openConnections);

  socket.on('disconnect', function () {
    openConnections--;
    io.sockets.emit('update_user_count', openConnections);
  });

  socket.on('add_to_feed', function(taxon_data) {
    socket.broadcast.emit('add_to_feed', taxon_data);
  });

  socket.on('add_to_collage', function(taxon_data) {
    socket.broadcast.emit('add_to_collage', taxon_data);
  });

});
