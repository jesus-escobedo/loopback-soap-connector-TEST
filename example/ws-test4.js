var loopback = require('loopback');
var path = require('path');

var app = module.exports = loopback();

app.set('restApiRoot', '/api');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    remotingEnabled: true,
    wsdl: 'http://192.168.123.218:8080/IPLine_WebService/Provisioning?wsdl',
    debug: true,
	operations: {
      processProvisioning: {
        service: 'ProvisioningService',
        port: 'ProvisioningPort',
        operation: 'processProvisioning'
      }
	  }
  });

// Unfortunately, the methods from the connector are mixed in asynchronously
// This is a hack to wait for the methods to be injected
ds.once('connected', function () {

  // Create the model
  var LipService = ds.createModel('LipService', {});

  // Refine the methods
  LipService.companyInfo = function (company,code,move_deta,move_type, cb) {
    LipService.movement({COMPANY: {CODE:code}, MOVE_DETA: '1', MOVE_TYPE: 'READ'}, function (err, response) {
      console.log('CompanyInfo: %j', response);
     // var result = (!err && response.processProvisioningResponse.RESULT) ?
      //  response.processProvisioningResponse.RESULT: [];
		var result = response;
      cb(err, result);
    });
  };
  
  // Map to REST/HTTP
  loopback.remoteMethod(
    LipService.companyInfo, {
      accepts: [
        {arg: 'code', type: 'string', required: true,
          http: {source: 'query'}}
      ],
      returns: {arg: 'result', type: 'object', root: true},
      http: {verb: 'get', path: '/company'}
    }
  );
  
  // Expose to REST
  app.model(LipService);

  // LoopBack REST interface
  app.use(app.get('restApiRoot'), loopback.rest());
// API explorer (if present)
  try {
    var explorer = require('loopback-explorer')(app);
    app.use('/explorer', explorer);
    app.once('started', function (baseUrl) {
      console.log('Browse your REST API at %s%s', baseUrl, explorer.route);
    });
  } catch (e) {
    console.log(
      'Run `npm install loopback-explorer` to enable the LoopBack explorer'
    );
  }

  //app.use(loopback.urlNotFound());
  app.use(loopback.errorHandler());

  if (require.main === module) {
    app.start();
  }

});

app.start = function () {
  return app.listen(3000, function () {
    var baseUrl = 'http://127.0.0.1:3000';
    app.emit('started', baseUrl);
    console.log('LoopBack server listening @ %s%s', baseUrl, '/');
	module.exports = function(app, cb) {
	  var ds = app.dataSources.soap;
		if (ds.connected) {
			var lip = ds.createModel('lip', {}, {base: 'Model'});
			app.model(lip);
			process.nextTick(cb);
		} else {
			ds.once('connected', function() {
			var lip = ds.createModel('lip', {}, {base: 'Model'});
			app.model(lip);
			cb();
			});
		}
	};
	console.log('Started');
  });
};

