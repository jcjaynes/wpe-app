
var servicesApp = angular.module('wpApp.services');

servicesApp.service('InstallService', function($http) {
  var baseUrl = 'http://mypreview.wpengine.com'
  var baseUrl = '//10.10.69.217:3000'

  this.getForAccount = function(accountName) {
    // TODO:  Hard coded IPs...
    var installUrl = baseUrl + '/api/accounts/' + accountName + '/installs/?wpe_apikey=devkey';

    return $http.get(installUrl);
  };

  this.getStats = function(accountName, installName) {
    var statsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/usage?wpe_apikey=devkey';

    return $http.get(statsUrl);
  };

  this.getErrorLogs = function(accountName, installName) {
    var errorsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/error_logs?wpe_apikey=devkey';

    return $http.get(errorsUrl);
  };

  this.getStatusFeed = function(url) {
  	return $http.jsonp('//ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=50&callback=JSON_CALLBACK&q=' + encodeURIComponent(url));
  };

  this.getBackups = function(accountName, installName) {
    var backupsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/backup_points?wpe_apikey=devkey';

    return $http.get(backupsUrl);
  };

  this.backup = function(accountName, installName, commit) {
    var backupsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/restore?wpe_apikey=devkey&checkpoint[commit_id]=' + commit;

    return $http.post(backupsUrl);
  };

  this.purgeCache = function(accountName, installName) {
    var purgeCacheUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/purge_cache?wpe_apikey=devkey';
      console.log(purgeCacheUrl)
    return $http.post(purgeCacheUrl);
  };

});
