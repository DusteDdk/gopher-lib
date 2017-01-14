'use strict';
const net = require('net');
const fs = require('fs');

const GopherServer = require('./server');

const GopherURIPattern='^(gopher:\\/\\/)?(.+?(?=:|\\/|$))(:\\d+?(?=$|\\/))?(\\/(\\d|g|I|h|t|M)?)?([^#]+?(?=\\?|$|#))?(\\?.+?(?=$|#))?(#.+)?';
const supportedTypes = '0145679hIgM';

class GopherMap { 
	constructor() {
		this.map={};
	}

	addDir( path ) {
		var dir = {
			path: path,
			resources: resources
		};
		this.map.push(dir);
	}
}

class GopherResource {
	constructor( host, port, selector, type, name, query, itemNum ) {
		if(host && !port) {
			var regEx = new RegExp(GopherURIPattern);
			var matches = regEx.exec(decodeURI(host));
			try {
			this.host = matches[2];
			this.port = (matches[3])?matches[3].substring(1):'70';
			this.type = (matches[5])?matches[5]:'1';
			this.selector = (matches[6])?matches[6]:'';
			this.query = (matches[7])?matches[7].substring(1):false;
			this.name= (matches[8])?matches[8].substring(1):this.toURI();
			} catch(e) {
				throw new Error('Not a valid gopher URI: '+host);
			}
		} else if(host && port && typeof selector === 'string' && type) {
			this.host=host;
			this.port=port;
			this.type=type;
			this.selector=selector;
			this.name=name;
			this.query=(query)?query:false;
			this.itemNum;
		} else {
			throw new Error('Invalid arguments to constructor.');
		}
		if( !this.host || !this.port || !this.type || typeof this.selector !== 'string' ) {
			throw new Error('Not a valid GopherResource: '+JSON.stringify(this));
		}
	}

	toShortURI() {
		return encodeURI('gopher://'+this.host+':'+this.port+'/'+this.type+this.selector+( (this.query!==false)?'?'+this.query:'' ) );
	}

	toURI() {
		return this.toShortURI()+( (this.name)?'#'+encodeURIComponent(this.name):'' );

	}

	toDirectoryEntity() {
		return this.type+this.name+'\t'+this.selector+'\t'+this.host+'\t'+this.port+'\r\n';
	}

	toJson() {
		return JSON.stringify(this);
	}
}

class GopherClient {
	constructor( options ) {
		this.timeout = (options && options.timeout)?options.timeout:5000;
		this.parseDir = (options && options.parseDir !== undefined)?options.parseDir:true;
	}

	get(res, callback, fileName) {
		if( !(res instanceof GopherResource)) {
			try {
				res = new GopherResource(res);
			} catch(err) {
				return callback(err);
			}
		}
		if( supportedTypes.indexOf(res.type) === -1 ) {
			return callback(new Error('Unsupported type. Can get resources of type: '+supportedTypes));
		}

		var requestInfo = {
			resource: res,
			start: null,
			stop: null,
			elapsed: null,
			remoteAddress: null,
			bytesReceived: null,
			bytesSent: null,
			fileName: null
		};

		var fileWriteStream=null;
		if( fileName ) {
			fileWriteStream = fs.createWriteStream(fileName);
			requestInfo.fileName=fileName;
		}
		requestInfo.start = new Date();
		var socket = net.createConnection( {port: res.port, host: res.host}, ()=>{
			//Send the selector
			socket.write(res.selector);
			//Send a query?
			if(res.query!==false) {
				socket.write('\t'+res.query);
			}
			//End line
			socket.write('\r\n');
			requestInfo.remoteAddress=socket.remoteAddress;
		});
		var data=[];
		if(fileWriteStream) {
			socket.pipe(fileWriteStream);
		}

		socket.on('error', (err)=>{
			if(fileName && fileWriteStream) {
				fileWriteStream.end();
				fs.unlinkSync(fileName);
			}
			return callback(err, {request: requestInfo} );
		});
		if(!fileWriteStream) {
			socket.on('data', (d)=>{
				data.push(d);
			});
		}
		socket.on('end', ()=>{
			requestInfo.stop=new Date();
			requestInfo.elapsed = requestInfo.stop-requestInfo.start;

			requestInfo.bytesReceived=socket.bytesRead;
			requestInfo.bytesSent=socket.bytesWritten;

			socket.end();
			socket.destroy();

			if(fileWriteStream) {
				fileWriteStream.end( ()=>{
					return callback(null, { request: requestInfo });
				});
			}

			data = Buffer.concat(data);

			var dir=null;
			var buffer=null;
			var txt=null;

			if(res.type===GopherTypes.directory || res.type===GopherTypes.search) {
				data=data.toString();
				if(!this.parseDir) {
					dir=data;
				} else {
					dir=[];
					var itemNum=0;
					var arr = data.replace(/\r\n/g,'\n').split('\n');
					for( var idx=0; idx < arr.length; ++idx) {
						var l=arr[idx];
						if(l.length===0) {
							break;
						}
						switch(l[0]) {
							case 'i':
							case '3':
					//		dir.push( { type: l[0], txt: l.substring(1).replace(/\t.+$/,'') });
							dir.push( new GopherResource( '-', '1', '', l[0], l.substring(1).replace(/\t.+$/,'') ) );  
							break;
							default:
							if(l==='.') {
								break;
							}	
							var split=l.substring(1).split('\t');
							var name=split[0];
							var selector=split[1];
							var host=split[2];
							var port=split[3];
							itemNum++;
							try {
								dir.push( new GopherResource( host, port, selector, l[0], name, false, itemNum ) );
							} catch(e) {
								return callback(new Error('Error parsing directory item.'), { request: requestInfo, offendingLine: l, split:split });
							}
							break;
						}
					}
				}
			} else if(!fileName && (res.type==='0' || res.type==='h' || res.type==='4' || res.type === '6' || res.type === 'M')) {
				txt=data.toString();
			} else if(!fileName && (res.type==='5' || res.type==='9' || res.type==='g' ||res.type==='I')) {
				buffer=data;
			}
			return callback( null, { request: requestInfo, directory: dir, buffer: buffer, text: txt } );
		});
		
		if(this.timeout) {
			socket.setTimeout( this.timeout, ()=>{
				socket.destroy();
				callback( new Error('Connection to '+res.toString()+' timed out after '+this.timeout+' ms.') );
			});
		}
	}
}

const GopherTypes = {
	text: '0',
	directory: '1',
	phonebook: '2',
	error: '3',
	binhex: '4',
	dosbinary: '5',
	uuencoded: '6',
	search: '7',
	telnet: '8',
	binary: '9',
	redundant: '+',
	tn3270: 'T',
	gif: 'g',
	image: 'I',
	html: 'h',
	mail: 'M',
	info: 'i'
};

module.exports = {
	Client: GopherClient,
	Server: GopherServer,
	Map: GopherMap,
	Resource: GopherResource,
	Type: GopherTypes
};
