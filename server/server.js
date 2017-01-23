'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var feed = require('feed-read');

var app = module.exports = loopback();
var feedModel = app.models.feed;
//TODO: move this into the database
var arrayOfRSSFeeds = ['http://feeds.ign.com/ign/all', 'http://feeds.feedburner.com/CrackedRSS', 'http://www.theonion.com/feeds/rss', 'http://www.npr.org/rss/rss.php', 'http://feeds.feedburner.com/techcrunch'];
var sourceCheck = ['feeds.ign.com', 'feedproxy.google.com/~r/CrackedRSS', 'www.theonion.com', 'www.npr.org', 'techcrunch.com'];
var feedSources = ['IGN', 'Cracked','The Onion','NPR', 'TechCrunch'];
var articles = []
var acquireBatchOfRSS = function() {

  for(var r in arrayOfRSSFeeds) {

  	feed(arrayOfRSSFeeds[r], function(err, articles) {
    	if (err)  throw err;
      
    var currentArticle;
  	for(var i in articles) {
  		var currentArticle = articles[i];
      //error handling
      if(currentArticle.published == '') {
        currentArticle.published = null;
      }
      app.models.feed.findOrCreate({where:{title:currentArticle.title}}, {title:currentArticle.title,
                                                                         author:currentArticle.author,
                                                                         link:currentArticle.link,
                                                                         content: "<style>img{display: inline;height: auto;max-width: 100%;}</style>" + currentArticle.content,
                                                                          published: currentArticle.published,
                                                                          source: determineSource(currentArticle.link) }, function(response){
                                                                          });
  	}
  	});
  }
}

var determineSource = function(link) {
  for(var i in sourceCheck) {
      if(link.includes(sourceCheck[i])) {
        return feedSources[i];
      }
  }
}

var purgeOlderFeeds = function() {
  //todays date
  var today = new Date()
  var yesterday = today.setDate(today.getDate() - 1);
  var yesterdayString = yesterday.toISOString().slice(0, 19).replace('T', ' ');

  var HALF_DAY = 12 * 60 * 60 * 1000;  // Month in milliseconds
  app.models.feed.destroyAll({where: {published: {lt: Date.now() - HALF_DAY}}}, function(err, info){
      if (err) throw err;
  });
}


app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
      acquireBatchOfRSS();
    	 setInterval(acquireBatchOfRSS,900000); //15 minutes
      //setInterval(acquireBatchOfRSS,10000); //10 seconds
      var ONE_DAY = 1 * 24 * 60 * 60 * 1000;
      setInterval(purgeOlderFeeds, ONE_DAY);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});

