var Gopher = require('./lib.js');

var get = process.argv[2];
var fn = process.argv[3];

if(!process.argv[2]) {
	console.log('Usage: URI [fileName]');
	console.log('           URI      - A Gopher uri, such as gopher://dusted.dk/');
	console.log('           fileName - Save to file instead of showing.');
	console.log('           URI Schema: gopher://host[:port][/[type][selector][?query]]');
	console.log('           Types: 0,1,(5),6,7,(9,I,g,h)  (=Binary)');
	process.exit(1);
}

var res = new Gopher.Resource(get);
var client = new Gopher.Client({parseDir:true, timeout: 5000});
console.log( res.toJson() );
console.log( res.toURI() );
console.log( res.toDirectoryEntity() );

client.get( res, (err, reply)=>{

	console.log(err, reply);
	if(err) {
		process.exit(1);
	}
}, fn);

