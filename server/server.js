'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var feed = require('feed-read');

var app = module.exports = loopback();
var feedModel = app.models.feed;
//TODO: move this into the database
var arrayOfRSSFeeds = ['http://feeds.ign.com/ign/all', 'http://feeds.feedburner.com/CrackedRSS', 'http://www.theonion.com/feeds/rss', 'http://www.npr.org/rss/rss.php']
var feedSources = ['ign', 'cracked','theonion','npr']
var articles = []
var acquireBatchOfRSS = function() {

  for(var r in arrayOfRSSFeeds) {
  	feed(arrayOfRSSFeeds[r], function(err, articles) {
    	if (err) {
        console.log('Error from stream ' + arrayOfRSSFeeds[r]);
        throw err;
      }
    var currentArticle;
  	for(var i in articles) {
  		var currentArticle = articles[i];
      var currentSource = feedSources[i];
      //error handling
      if(currentArticle.published == '') {
        currentArticle.published = null;
      }
      app.models.feed.findOrCreate({where:{title:currentArticle.title}}, {title:currentArticle.title,
                                                                         author:currentArticle.author,
                                                                         link:currentArticle.link,
                                                                         content: currentArticle.content,
                                                                          published: currentArticle.published,
                                                                          source: currentSource }, function(response){
                                                                          });
  	}
  	});
  }
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
    	 setInterval(acquireBatchOfRSS,900000); //15 minutes
      //setInterval(acquireBatchOfRSS,10000); //10 seconds
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

