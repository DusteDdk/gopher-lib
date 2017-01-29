'use strict';

const net = require('net');
const fs = require('fs');

const Common = require('./common.js');
const GopherResource = Common.Resource;
const GopherTypes = Common.Type;

const supportedTypes = '0145679hIgM';
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
			//Add the selector
			var request=res.selector;
			//Add a query?
			if(res.query!==false) {
				request +='\t'+res.query;
			}
			//End line
			request+='\r\n';

			socket.write(request);
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
								return callback(new Error('Error parsing directory item.'), { request: requestInfo, offendingLine: l, split:split, exception: e });
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

module.exports = GopherClient;