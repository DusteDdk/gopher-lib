const Gopher = require('./lib');

var server = new Gopher.Server();


server.handler('', (req, res)=>{
	console.log('1 Got ',req);
});

server.handler('pages.txt', (req, res)=>{
	console.log('2 Got ',req);
});

server.handler('testdir/', (req, res)=>{
	console.log('3 Got ',req);
});

server.handler('testdir/different', (req, res)=>{
	console.log('4 Got ',req);
});


server.test('');
server.test('pages.txt');
server.test('testdir');
server.test('testdir/');
server.test('testdir/different');
server.test('testdir/123');
server.test('testdir/different456');
server.test('different');
