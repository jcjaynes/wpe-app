
var servicesApp = angular.module('wpApp.services');

servicesApp.service('InstallService', function($http) {

  this.getForAccount = function(accountName) {
    // TODO:  Hard coded IPs...
    var installUrl = 'http://10.10.68.101:3000/api/accounts/' + accountName + '/installs/?wpe_apikey=devkey';

    return $http.get(installUrl);
  };

});
