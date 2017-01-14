'use strict';
module.exports = class {

	constructor() {
		this.paths = {};
		this.log = ()=>{
			console.log.apply(console, arguments); 
		};
	}

	map( path, map ) {
		this.paths[path] = new MapHandler( map );
	}

	dir( path, dir ) {
		this.paths[path] = new DirHandler( dir );
	}

	handler( path, handler ) {
		this.paths[path] = handler;
	}

	listen( port, address ) {
		
	}

	test( selector ) {
		
		var best='';
		//Find most detailed selector
		Object.keys(this.paths).forEach( (path)=>{
			if( selector.indexOf( path ) === 0 ) {
				if( path.length > best.length ) {
					best=path;
				}
			}
		});

		var reply = new ServerReply(this.stats, socket, selector);

		if( best === -1 ) {
			console.log('Could not find a handler for selector "'+selector+'"');
			this.reply.sendError( 'Sorry! No selector "'+selector+'"' );
		} else {
			var cut = selector.substring(best.length, selector.length);
			console.log();
			console.log('Request: "'+selector+'" Handler: "'+best+'" With: "'+cut+'"');
			var request = {
				remoteAddress: socket.remoteAddress,
				selector: selector,
				path: path,
				argument: cut
			};


			this.paths[best](request, reply);
		}
	}
};
