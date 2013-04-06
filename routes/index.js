exports.index = function(req, res){
  res.render('index', { title: 'herb.aceo.us' });
};

exports.feed = function(req, res){
  res.render('feed', { title: 'herb.aceo.us' });
};

exports.collage = function(req, res){
  res.render('collage', { title: 'herb.aceo.us' });
};