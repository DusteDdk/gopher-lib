# gopher-lib
A node library for communication via the Gopher Internet protocol.<br>
Useful for implementing Gopher clients and servers (server class coming soon).

```bash
npm install gopher-lib
```

```javascript
const Gopher = require('gopher-lib');

var client = new Gopher.Client();

client.get('gopher://gopher.floodgap.com/0/gopher/relevance.txt', (err, reply)=>{
	if(err) {
    	console.error(err);
    } else {
    	console.log(reply.text);
    }
});
```

# API

### Class: Server

```bash
npm install
./node_modules/jsdoc/jsdoc.js server.js common.js
firefox out/index.html
```

### Class: Client([{timeout: 5000, parseDir: true}])
If timeout is set false, no timeout is used.<br>
If parseDir is set false, the directory in the result will be a buffer with the raw text from the server instead of being an Array of GopherResource.

```javascript
var client = new Gopher.Client();
```
##### Method: Client.get(URI|GopherResource, replyHandler [, fileName])
If an URI is used, it must be accepted by GopherResource.<br>
If fileName is provided, all received data is streamed directly to the file on disk regardless of type.<br>
NOTE: If parseDir===true, then 'i' entries will have all info execpt name stripped before the GopherResource is created.

```javascript
replyHandler = (err, reply)=>{};

err = Error; // If error is set, reply may contain useful debug information (may).

reply = {
	request: {
    	resource: GopherResource,	// The resource used for making this request
        start: null | Date,			// Request begin time
        stop: null | Date,			// Request end time
        elapsed: null | Integer,	// Elapsed time
        remoteAddress: null | ip,		// The IP address that the host name resolved to
        bytesSent: null | Integer,		// How many bytes were sent to the server
        bytesReceived: null | Integer,	// How many bytes were received from the server
        fileName: null | String,		// If a fileName was given, received data was saved to filaName
    },
    // The following properties are not added if the get method was provided with a fileName.
    directory: null | [GopherResource],		// If res.type is directory or search
    buffer: null | Buffer,					// If res.type is binary file
    text: null | String						// If res.type is text, html or encoded file
};
```

### Class: Resource(URI|[host,port,selector,type,name[,query]]) 
Valid URI: [gopher://]host[:port][/[type][selector][?query][#name]]
Selectors, queries and names can contain spaces or be uriencoded (%20=space)
Name will only be set in the resource, it is not used in interaction with the server.

```javascript
var resourcea = new Gopher.Resource( 'gopher://dusted.dk/0/computers/computers.txt#DusteDs%20computers' );
var resourceb = new Gopher.Resource( 'dusted.dk', '70', '/computers/computers.txt', '0', 'DusteDs computers' );
var resourcec = new Gopher.Resource( 'floodgap.com' );
```
##### Method: Resource.toJson()
##### Method: Resource.toURI()
##### Method: Resource.toShortURI()
##### Method: Resource.toDirectoryEntity()

```javascript
var res = new Gopher.Resource('dusted.dk', '70', Gopher.Types.text, '/pages/about/this_server.txt', 'About my Server');

console.log(res.toJson());
//{"host":"dusted.dk","port":"70","type":"0","selector":"/pages/about/this_server.txt","query":false,"name":"About my Server"}

console.log(res.toURI());
//gopher://dusted.dk:70/0/pages/about/this_server.txt#About%20my%20Server

console.log(res.toShortURI());
//gopher://dusted.dk:70/0/pages/about/this_server.txt

console.log(res.toDirectoryEntity());
//0About my Server    /pages/about/this_server.txt    dusted.dk       70
```

### File: example-client.js
```bash
# A simple command-line client for interacting with gopher servers and downloading files.
node example-client.js gopher://dusted.dk/
node example-client.js gopher://dusted.dk/9/pages/goatlove/LD28_GoatLove_linux_b0021.tar.bz2 goatlove.tar.bz2
```

### File: test.js
```bash
# Unit test (of the Resource capability to parse a URI)
npm test
```
