const Gopher = require('./lib');

var server = new Gopher.Server();

server.map('', [
//	new Gopher.Resource('h', '1', '_', Gopher.Type.info, 'Welcome to my Server!', false),
	new Gopher.Resource('dusted.dk', '70', '/', Gopher.Type.directory, 'Welcome to Nothing', false)
]);
