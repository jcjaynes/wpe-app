
var servicesApp = angular.module('wpApp.services');

servicesApp.service('InstallService', function($http) {
  var baseUrl = 'http://10.10.68.101:3000/'

  this.getForAccount = function(accountName) {
    // TODO:  Hard coded IPs...
    var installUrl = baseUrl + '/api/accounts/' + accountName + '/installs/?wpe_apikey=devkey';

    return $http.get(installUrl);
  };

  this.getStats = function(accountName, installName) {
    var statsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/usage?wpe_apikey=devkey';

    return $http.get(statsUrl);
  }


  this.getErrorLogs = function(accountName, installName) {
    var errorsUrl = baseUrl + '/api/accounts/' + accountName + '/installs/' + installName + '/error_logs?wpe_apikey=devkey';

    return $http.get(errorsUrl);
  }
});
