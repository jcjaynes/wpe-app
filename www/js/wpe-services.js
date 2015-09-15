
var servicesApp = angular.module('wpApp.services');

servicesApp.service('InstallService', function($http) {
  var baseUrl = 'http://mypreview.wpengine.com';
  var baseUrl = 'http://localhost:3000';

  this.getForAccount = function(accountName) {
    var installUrl = baseUrl + '/api/accounts/' + accountName + '/installs/?wpe_apikey=devkey';

    return $http.get(installUrl);
  };

  this.getInvoices = function(accountName) {
    var invoicesUrl = baseUrl + '/api/accounts/' + accountName + '/installs/invoices/?wpe_apikey=devkey';

    return $http.get(invoicesUrl);
  };

  this.getInvoice = function(accountName, invoiceID) {
    var invoiceUrl = baseUrl + '/api/accounts/' + accountName + '/installs/invoice?id=' + invoiceID + '&wpe_apikey=devkey';

    return $http.get(invoiceUrl);
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
    return $http.post(purgeCacheUrl);
  };

});


servicesApp.service('AccountService', function($http) {
  var baseUrl = 'http://mypreview.wpengine.com';

  this.getUsage = function(accountName) {
    var usageUrl = baseUrl + '/api/accounts/' + accountName + '/installs/plan_usage?wpe_apikey=devkey';

    return $http.get(usageUrl);
  };

  this.planForUsage = function(usage) {
    var plans = {
      personal: {
        name: 'Personal',
        installs: 1,
        visits: '25,000',
        storage: 10
      },
      professional: {
        name: 'Professional',
        installs: 10,
        visits: '100,000',
        storage: 20
      },
      business: {
        name: 'Business',
        installs: 25,
        visits: '400,000',
        storage: 30
      },
      premium: {
        name: 'Premium',
        installs: 150,
        visits: '1,000,000+',
        storage: '100-300'
      },
      comped: {
        name: 'Comped',
        installs: 1,
        visits: '100,000',
        storage: 10
      }
    };

    var noPlan = {
        name: 'No',
        installs: 0,
        visits: 0,
        storage: 0
    };

    return plans[usage.current_billing_cycle.account.plan] || noPlan;
  };


});
