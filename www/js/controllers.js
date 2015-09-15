angular.module('wpApp.controllers', [])

/*
 * TODO: Cached views don't update when item is deleted or changed, we need to check if anything changed on enter, and update the scope. Should be a background process so we don't affect performance.
 */

.controller('AppCtrl', function($scope, $rootScope, $localstorage ) {

  // Controller for main view, anything global should go here

  $rootScope.increment = function() {
    var i = $localstorage.get('increment');
    if(!i) {
      $localstorage.set('increment', 1);
      return 1;
    } else {
      i++;
      $localstorage.set('increment', i );
      return i;
    }
  }

  $rootScope.callback = '_jsonp=JSON_CALLBACK';

})

.controller('SitesCtrl', function( $scope, $http, DataLoader, $timeout, $rootScope, $ionicModal, $localstorage, $ionicLoading, CacheFactory, $ionicPlatform, SitesDB, InstallService ) {

  // Sites view: templates/sites.html

  // Initialize the database
  $ionicPlatform.ready( function() {
    SitesDB.initDB();

    $scope.account = {
      name: ''
    };

	 // Get all the sites from the database.
	 SitesDB.getAllSites().then( function( sites ) {
		 $scope.sites = sites;
	 });

	 SitesDB.count().then( function( count ) {
		if ( count > 0 ) {
			$scope.message = '';
		} else {
			$scope.message = "Click + to add a site.";
		}
	 });
  });

  if ( ! CacheFactory.get('siteCache') ) {
	  CacheFactory.createCache('siteCache');
  }

  // Add a site modal
  $ionicModal.fromTemplateUrl('templates/add-site-modal.html', {
    scope: $scope
  }).then(function(sitemodal) {
    $scope.sitemodal = sitemodal;
  });

  // Import a list of installs for an account
  $scope.importInstalls = function() {

    $ionicLoading.show({
      noBackdrop: true
    });

    // TODO:  Underscore plz
    var domains = [];
    angular.forEach($scope.sites, function(site) {
      domains.push(site.url);
    });

    // TODO:  This is pretty hacky - this should probably
    //        use the same DB mechanism as the sites
    $localstorage.set('accountName', $scope.account.name);

    InstallService.getForAccount($scope.account.name).then(function(response) {
      angular.forEach(response.data.installs, function(install) {
        var siteURL = 'http://' + install.name + '.wpengine.com';

        if (install.primary_domain) {
          siteURL = 'http://' + install.primary_domain;
        }

        var siteApi = siteURL + '/wp-json/' + '?' + $rootScope.callback;

        if (domains.indexOf(siteURL) === -1) {
          DataLoader.get(siteApi).then(function(response) {
              var site = {
                title: response.data.name,
                description: response.data.description,
                url: siteURL,
                account: $scope.account.name,
                install: install.name
              };

              SitesDB.addSite(site);
            }, function(response) {
              //alert('Please make sure the WP-API plugin v2 is installed on your site.');
              // TODO:  Emit a friendlier warning
              console.log('Site Factory error');
          });
        }
      });

    });

    $ionicLoading.hide();
    $scope.sitemodal.hide();
  };

  $scope.onItemDelete = function(item) {

    angular.forEach( window.localStorage, function( value, key ) {
	    // find and delete all site[id] caches (pages,posts,comments,etc)
	    if ( key.indexOf( 'site' + item._id ) >= 0 ) {
		    window.localStorage.removeItem( key );
	    }
    })

    SitesDB.deleteSite(item);
  }
})

.controller('SiteCtrl', function($scope, $stateParams, $ionicLoading, $localstorage, $rootScope, DataLoader, $state, $ionicPlatform, SitesDB ) {

  // Controller for single site detail page. templates/site.html

  // Site ID
  $scope.id = $stateParams.siteId;

  // Initialize the database.
  $ionicPlatform.ready( function() {
	 SitesDB.initDB();

	 SitesDB.getSite( $scope.id ).then( function( site ) {

    // Add this to rootScope so we don't have to make a DB call in other controllers
    $rootScope.site = site;

		// Example data
		$scope.content = '<img src="img/wpengine-logo-black.png" class="site-avatar" /><h2 class="padding">' + site.title + '</h2>';

		var url = site.url;

		// Default sections, can be passed in from somewhere else
		$scope.sitesections = [{'title': { 'rendered': 'Comments' }, 'icon':'ion-ios-chatbubble-outline', 'route':'/wp/v2/comments/' }, {'title': { 'rendered': 'Posts' }, 'icon':'ion-ios-browsers-outline', 'route':'/wp/v2/posts/' },{'title': { 'rendered': 'Pages' }, 'icon':'ion-ios-paper-outline', 'route':'/wp/v2/pages/'}];

		var dataURL = url + '/wp-json/wp-app/v1/app/?' + $rootScope.callback;

		// Example of adding a section
		DataLoader.get( dataURL ).then(function(response) {

        angular.forEach( response.data, function( value, key ) {

          console.log( value );

          $scope.sitesections.push({ 'title': { 'rendered': value.title.rendered }, 'icon': value.icon, 'route': value.route });

        });

		    $ionicLoading.hide();
		  }, function(response) {
		    $ionicLoading.hide();
		    console.log('No custom site sections to get.');
		});

	 });
  });

  // Gets the API route from the link in site.html, which we use in SiteSectionCtrl
  $scope.apiRoute = function(route) {
    $rootScope.route = route;
  }
})

.controller('SiteSectionCtrl', function($scope, $stateParams, DataLoader, $ionicLoading, $rootScope, $localstorage, $timeout, $ionicPlatform, SitesDB, Base64, CacheFactory ) {

  // Individual site data (posts, comments, pages, etc). templates/site-section.html. Should be broken into different controllers and templates for more fine-grained control

  $rootScope.base64 = Base64.encode( $rootScope.site.username + ':' + $rootScope.site.password );
  var dataURL = '';
  $scope.siteID = $stateParams.siteId;
  $scope.ids = [];

  // Get slug such as 'comments' from our route, to use to fetch data
  if($rootScope.route) {
    var slug = $rootScope.route.split('/');
    var slugindex = $rootScope.route.split('/').length - 2;
    $scope.slug = slug[slugindex];
  }

  // Gets API data
  $scope.loadData = function() {

    DataLoader.getAuth( $rootScope.base64, dataURL ).then(function(response) {

        $scope.data = response.data;
        $ionicLoading.hide();

        // Save all IDs so we can check for them in the loadmore func
        angular.forEach( $scope.data, function( value, key ) {
          $scope.ids.push(value.id);
        });

      }, function(response) {

        console.log('Error');
        $ionicLoading.hide();

    });
  }

  var options = '';

  if($scope.slug === 'comments') {
    options = '?status';
  }

  dataURL = $rootScope.site.url + '/wp-json' + $rootScope.route + options;

  // Load data on page load
  $scope.loadData();

  paged = 2;
  $scope.moreItems = true;

  // Load more (infinite scroll)
  $scope.loadMore = function() {

    if( !$scope.moreItems ) {
      return;
    }

    var pg = paged++;

    console.log('loading more...' + pg );

    $timeout(function() {

      DataLoader.getAuth( $rootScope.base64, dataURL + '?page=' + pg ).then(function(response) {

        angular.forEach( response.data, function( value, key ) {

          // Don't load more if item is not new
          if( $scope.ids.indexOf(value.id) >= 0 ) {
            $scope.moreItems = false;
            return;
          }

          $scope.data.push(value);
          $scope.ids.push(value.id);
        });

      }, function(response) {
        $scope.moreItems = false;
        console.log('Load more error');
      });

      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.$broadcast('scroll.resize');

    }, 2000);

  }

  $scope.moreDataExists = function() {
    return $scope.moreItems;
  }

  // Pull to refresh
  $scope.doRefresh = function() {

    console.log('Refreshing!');

    $timeout( function() {

      $scope.loadData();

      //Stop the ion-refresher from spinning
      $scope.$broadcast('scroll.refreshComplete');

    }, 1000);
  }
})

//WordPress Site Controls
.controller('CommentCtrl', function($scope, $stateParams, DataLoader, $ionicLoading, $rootScope, $localstorage, CacheFactory, SitesDB, Base64, $sce, $ionicHistory ) {

  console.log('CommentCtrl');

  $scope.siteID = $stateParams.siteId;
  $scope.slug = 'comments';
  $scope.itemID = $stateParams.itemId;

  if (!CacheFactory.get( 'site' + $scope.siteID + $scope.slug )) {
    // Create cache
    CacheFactory.createCache( 'site' + $scope.siteID + $scope.slug );
  }

  var dataCache = CacheFactory.get( 'site' + $scope.siteID + $scope.slug );

  // API url to fetch data
  var dataURL = $rootScope.site.url + '/wp-json' + $rootScope.route + $scope.itemID;

  if( !dataCache.get($scope.itemID) ) {

    $ionicLoading.show({
      noBackdrop: true
    });

    // Item doesn't exists, so go get it
    DataLoader.getAuth( $rootScope.base64, dataURL ).then(function(response) {

        $scope.siteData = response.data;
        $scope.content = $sce.trustAsHtml(response.data.content.rendered);
        dataCache.put( response.data.id, response.data );
        $scope.commentStatus = response.data.status;

        $ionicLoading.hide();
        // console.dir(response.data);
      }, function(response) {
        console.log('Error');
        $ionicLoading.hide();
    });

  } else {
    // Item exists, use localStorage
    $scope.siteData = dataCache.get( $scope.itemID );
    $scope.content = $sce.trustAsHtml( $scope.siteData.content.rendered );
    $scope.commentStatus = $scope.siteData.status;
  }

  $scope.deleteComment = function() {

    var itemURL = $rootScope.site.url + '/wp-json/wp/v2/' + $scope.slug + '/' + $scope.siteData.id;

    DataLoader.delete( $rootScope.base64, itemURL ).then(function(response) {

        // Remove item from cache
        dataCache.remove($scope.siteData.id);
        alert('Item deleted');

        // Go back to previous state. TODO: Deleted comment still exists in old state, need to remove it
        $ionicHistory.goBack();

      }, function(response) {
        // Getting an error even if it's successful
        console.log(response.data );
    });
  }

  $scope.approveComment = function(data) {

    var options = {
      'status': 'approved'
    }

    var itemURL = $rootScope.site.url + '/wp-json/wp/v2/' + $scope.slug + '/' + $scope.siteData.id;

    DataLoader.put( $rootScope.base64, itemURL, options ).then(function(response) {

        dataCache.put( $scope.siteData.id, response.data );
        alert('Item approved');

      }, function(response) {
        // Getting an error even if it's successful
        console.log(response );
    });
  }

})

.controller('PostCtrl', function($scope, $stateParams, DataLoader, $ionicLoading, $rootScope, $localstorage, CacheFactory, SitesDB, Base64, $sce, $ionicHistory ) {

  // Controller for posts and pages single-post.html

  console.log('PostCtrl');

  $scope.siteID = $stateParams.siteId;
  $scope.slug = 'posts';
  $scope.itemID = $stateParams.itemId;

  if (!CacheFactory.get( 'site' + $scope.siteID + $scope.slug )) {
    // Create cache
    CacheFactory.createCache( 'site' + $scope.siteID + $scope.slug );
  }

  var dataCache = CacheFactory.get( 'site' + $scope.siteID + $scope.slug );

  // API url to fetch data
  var dataURL = $rootScope.site.url + '/wp-json' + $rootScope.route + $scope.itemID;

  if( !dataCache.get($scope.itemID) ) {

    $ionicLoading.show({
      noBackdrop: true
    });

    // Item doesn't exists, so go get it
    DataLoader.getAuth( $rootScope.base64, dataURL ).then(function(response) {

        $scope.siteData = response.data;
        $scope.content = $sce.trustAsHtml(response.data.content.rendered);
        dataCache.put( response.data.id, response.data );

        $ionicLoading.hide();
        // console.dir(response.data);
      }, function(response) {
        console.log('Error');
        $ionicLoading.hide();
    });

  } else {
    // Item exists, use localStorage
    $scope.siteData = dataCache.get( $scope.itemID );
    $scope.content = $sce.trustAsHtml( $scope.siteData.content.rendered );
  }

  $scope.deletePost = function() {

    var itemURL = $rootScope.site.url + '/wp-json/wp/v2/' + $scope.slug + '/' + $scope.siteData.id;

    DataLoader.delete( $rootScope.base64, itemURL ).then(function(response) {

        // Remove item from cache
        dataCache.remove($scope.siteData.id);
        alert('Item deleted');

        // Go back to previous state. TODO: Deleted post still exists in old state, need to remove it
        $ionicHistory.goBack();

      }, function(response) {
        // Getting an error even if it's successful
        console.log(response.data );
    });
  }

})

.controller('AppPageCtrl', function($scope, $stateParams, DataLoader, $ionicLoading, $rootScope, $localstorage, CacheFactory, $sce, $timeout, $ionicPlatform, SitesDB, Base64 ) {

  // Single App Page view singe-apppage.html

  console.log('apppagectrl');

  $rootScope.siteCache = CacheFactory.get('siteCache');

  $scope.siteID = $stateParams.siteId;
  $scope.slug = $stateParams.slug;
  $scope.itemID = $stateParams.itemId;

  var url = $rootScope.site.url;

  if (!CacheFactory.get( 'site' + $scope.siteID + $scope.slug )) {
    // Create cache
    CacheFactory.createCache( 'site' + $scope.siteID + $scope.slug );
  }

  // Our data cache, i.e. site1postscache
  var dataCache = CacheFactory.get( 'site' + $scope.siteID + $scope.slug );

  // API url to fetch data
  var dataURL = url + '/wp-json' + $rootScope.route + $scope.itemID;

  // Handle charts
  $scope.loadChart = function(data) {

    console.log('loading chart');

    if(!data)
      return;

    $timeout( function() {

      var ctx = document.getElementById("myChart").getContext("2d");
      var myNewChart = new Chart(ctx).Line( data );

    }, 1000);

  }

  if( !dataCache.get($scope.itemID) ) {

    $ionicLoading.show({
      noBackdrop: true
    });

    // Item doesn't exists, so go get it
    DataLoader.getAuth( $rootScope.base64, dataURL ).then(function(response) {
        console.log(response.data);
        $scope.siteData = response.data;
        $scope.content = $sce.trustAsHtml(response.data.content.rendered);
        dataCache.put( response.data.id, response.data );

        if(response.data.chart) {
          $scope.loadChart(response.data.chart);
        }

        $ionicLoading.hide();
        // console.dir(response.data);
      }, function(response) {
        console.log('Error');
        $ionicLoading.hide();
    });

  } else {
    // Item exists, use localStorage
    $scope.siteData = dataCache.get( $scope.itemID );
    $scope.content = $sce.trustAsHtml( $scope.siteData.content.rendered );

    if($scope.siteData.chart) {
      $scope.loadChart( $scope.siteData.chart );
    }
  }

})

//WPEngine Controls
.controller('AcctCtrl', function($scope, $stateParams, InstallService, SitesDB) {

})

.controller('PlanUsageCtrl', function($scope, $localstorage, $ionicLoading, AccountService) {
  var account = $localstorage.get('accountName');

  $ionicLoading.show({
    template: 'Loading Plan...'
  });

  AccountService.getUsage(account).then(function(response) {
    var usage = response.data;
    $scope.plan = AccountService.planForUsage(usage);

    $scope.labels = ['Used', 'Remaining'];

    try {
      $scope.currentData = [
        usage.current_billing_cycle.overage_data.usage,
        Math.max(0,
          usage.current_billing_cycle.overage_data.plan -
          usage.current_billing_cycle.overage_data.usage
        )
      ];
      $scope.currentOverage = usage.current_billing_cycle.overage_data.overage;

      $scope.previousData = [
        usage.previous_billing_cycle.overage_data.usage,
        Math.max(0,
          usage.previous_billing_cycle.overage_data.plan -
          usage.previous_billing_cycle.overage_data.usage
        )
      ];
      $scope.previousOverage = usage.previous_billing_cycle.overage_data.overage;
    } catch(e) {
      $scope.currentData = null;
      $scope.previousData = null;
    }

    $ionicLoading.hide();
  });
})


.controller('InvoicesCtrl', function($scope, $localstorage, InstallService) {
  var account = $localstorage.get('accountName');
  $scope.invoices = [];

  InstallService.getInvoices(account).then(function(response) {
    $scope.invoices = response.data.invoices;
  });
})

.controller('InstallCtrl', function($scope, $stateParams, SitesDB, InstallService) {

  $scope.series = ['Days Ago'];
  $scope.labels = Array.apply(null, Array(30)).map(function (_, i) {
    if (i % 5 == 0) {
      return 30 - i;
    } else {
      return '';
    }
  });

  $scope.visitorData = [[]];
  $scope.bandwidthData = [[]];

  SitesDB.getSite($stateParams.siteId).then(function(site) {
    InstallService.getStats(site.account, site.install).then(function(response) {
      $scope.visitorData[0] = response.data.last_30_days_visitors;
      $scope.bandwidthData[0] = response.data.last_30_days_bandwidth_gb;
    });
  });
})


.controller('BackupsCtrl', function($scope, $stateParams, SitesDB, InstallService) {
  $scope.id = $stateParams.siteId;
  $scope.backups = [];

  SitesDB.getSite($stateParams.siteId).then(function(site) {
    InstallService.getBackups(site.account, site.install).then(function(response) {
      $scope.backups = response.data.checkpoints;
    });
  });

})


.controller('BackupCtrl', function($scope, $stateParams, $ionicLoading, $ionicPopup, SitesDB, InstallService) {
  var site;
  $scope.backup = {};

  // TODO:  Super inefficient - we are getting the whole list again
  //        Can we just put this on the scope?
  SitesDB.getSite($stateParams.siteId).then(function(s) {
    site = s;

    InstallService.getBackups(site.account, site.install).then(function(response) {
      angular.forEach(response.data.checkpoints, function(checkpoint) {
        if (checkpoint.commit === $stateParams.commit) {
          $scope.backup = checkpoint;
        }
      });
    });
  });

  $scope.restore = function() {
    confirm_restore = $ionicPopup.confirm({
      title: 'Are you sure you want to restore?',
      template: ''
    });

    confirm_restore.then(function(confirmed){

      if (confirmed) {
        $ionicLoading.show({
          template: 'Restoring...'
        });

        InstallService.backup(site.account, site.install, $scope.backup.commit)
          .then(function(respones) {
            $ionicLoading.hide();
            $ionicPopup.alert({
               title: respones.data.message,
               template: ''
             });
          })
          .catch(function() {
            $ionicLoading.hide();

            $ionicPopup.alert({
               title: 'Error',
               template: 'There was a problem restoring your backup.'
             });
          });
      }
    })
  };

})

.controller('ErrorLogsCtrl', function($scope, $stateParams, SitesDB, InstallService, $localstorage) {
  $scope.id = $stateParams.siteId;
  $scope.errors = [];

  SitesDB.getSite($stateParams.siteId).then(function(site) {
    InstallService.getErrorLogs(site.account, site.install).then(function(response) {
      $scope.errors = response.data.errors;
      $localstorage.setObject('error-logs-' + $stateParams.siteId, $scope.errors);
    });
  });
})

.controller('ErrorsCtrl', function($scope, $stateParams, SitesDB, $localstorage) {
  errors = $localstorage.getObject('error-logs-' + $stateParams.siteId);

  for ( var error_index in errors ){
    var error = errors[error_index];
    if ( $stateParams.id == error.id) {
      $scope.error = error;
    }
  }
})

.controller('UtilitiesCtrl', function($scope, $stateParams, $ionicLoading, $ionicPopup, InstallService, SitesDB) {
  var site;
  $scope.id = $stateParams.siteId;

  SitesDB.getSite($stateParams.siteId).then(function(s) {
    site = s;
  });

  $scope.purge_cache = function() {
    confirm_purge = $ionicPopup.confirm({
      title: 'Are you sure you want to purge cache?',
      template: ''
    });

    confirm_purge.then(function(confirmed){
      if (confirmed) {
        $ionicLoading.show({
          template: 'Purging...'
        });


        InstallService.purgeCache(site.account, site.install)
          .then(function(respones) {
            $ionicLoading.hide();
            $ionicPopup.alert({
               title: respones.data.message,
               template: ''
             });
          })
          .catch(function() {
            $ionicLoading.hide();

            $ionicPopup.alert({
               title: 'Error',
               template: 'There was a problem purging your cache.'
             });
          });
      }
    })
  };
})

.controller('StatsCtrl', function($scope ) {

  // This is our data for stats.html

  // Need this stuff if canvas element does not have attributes for data, options, etc.
  // var ctx = document.getElementById("line").getContext("2d");
  // var myNewChart = new Chart(ctx).Line(data, options);

  $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['2014', '2015'];
  $scope.data = [
      [65, 59, 80, 81, 56, 55, 40],
      [28, 48, 40, 19, 86, 27, 90]
  ];

})

.controller('StatusFeedCtrl', function($scope, InstallService, Base64, $localstorage) {
	$scope.open = [];
	$scope.resolved = [];

	InstallService.getStatusFeed('https://wpenginestatus.com/feed/').then(function(response) {
		$scope.data = response.data.responseData.feed.entries;
        angular.forEach( $scope.data, function( value, key ) {
			value.id = Base64.encode(value.publishedDate);
			value.publishedDate = new Date(value.publishedDate);
			if (value.title.indexOf("[Resolved]") >= 0) {
				$scope.resolved.push(value);
			} else {
				$scope.open.push(value);
			}
        });
		$localstorage.setObject('status-feed', $scope.data);
	});
})

.controller('StatusCtrl', function($scope, $stateParams, $localstorage) {
	var id = $stateParams.itemId;
	var data = $localstorage.getObject('status-feed').filter(function( obj ) {
	  return obj.id == id;
	});
	$scope.item = data[0];
	console.log($scope.item);
})

.controller('SiteSettingsCtrl', function($scope, $stateParams, DataLoader, $ionicLoading, $rootScope, $ionicPlatform, SitesDB ) {

  // Individual site settings, settings.html
  $scope.settings = {};
  //$scope.site = $rootScope.siteCache.get($stateParams.siteId);

  // Initialize the database.
  $ionicPlatform.ready( function() {
   SitesDB.initDB();

   SitesDB.getSite( $stateParams.siteId ).then( function( site ) {
     $scope.site = site;
     $scope.siteTitle = $scope.site.title;
     $scope.settings.url = $scope.site.url;
     $scope.settings.username = $scope.site.username;
     $scope.settings.password = $scope.site.password;
   });
  });


  //$scope.$on( '$ionicView.leave', $scope.saveSettings );

  $scope.saveSettings = function() {
    //console.log($scope.settings);
    $scope.site.url = $scope.settings.url;
    $scope.site.username = $scope.settings.username;
    $scope.site.password = $scope.settings.password;
    //console.log($scope.site);

    SitesDB.updateSite( $scope.site ).then( function() {
      alert('Saved!');
    });
  };

});

