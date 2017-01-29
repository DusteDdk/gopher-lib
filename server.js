'use strict';

const net = require('net');
const fs = require('fs');

const Common = require('./common.js');

class Reply {
	constructor(socket) {
		this.socket = socket;
		this.isBin = false;
		this.queue = 0;
	}

	write(data) {
		if (!this.socket.write(data)) {
			this.queue++;
			var self = this;
			this.socket.on('drain', () => {
				self.queue--;
			});
		}
	}


	file(fn, bin) {
		var socket = this.socket;
		this.isBin = bin || false;

		var socket = this.socket;
		var self = this;


		var readStream = fs.createReadStream(fn);

		socket.on('drain', () => {
			resume++;
			readStream.resume();
		});


		readStream.on('data', (data) => {
			// Todo: detect start-of-line, check if first character is '.', prepend another '.' if so.
			if (!socket.write(data)) {
				readStream.pause();
			}
		});

		readStream.on('end', () => {
			if (socket.bufferSize) {
				socket.on('drain', () => {
					self.end();
				});
			} else {
				self.end();
			}
		});
	}


	menuItem(type, txt, path, host, port) {
		path = path || '';
		host = host || 'h';
		port = port || 1;
		this.write(type + txt + '\t' + path + '\t' + host + '\t' + port + '\r\n');
	}

	menuErr(txt) {
		this.menuItem('3', txt, ' ', 'e', '1');
	}

	menuInfo(txt) {
		this.menuItem('i', txt, ' ', 'i', '1');
	}

	end() {
		var socket = this.socket;

		if (!this.isBin) {
			this.write('.\r\n');
		}

		if (this.queue || socket.bufferSize) {
			socket.on('drain', () => {
				socket.end();
			});
		} else {
			socket.end();
		}
	}
}

class GopherServer {

	constructor(externalPort, externalName) {
		this.handlers = new Map();
		this.handlers.set('err', this._errHandler);
		this.server = null;
		this.externalPort = externalPort;
		this.externalName = externalName;
	}

	_errHandler(request, reply) {
		reply.menuErr('Path not found: "' + request.path + '"');
		reply.end();
	}

	addHandler(path, handler) {
		this.handlers.set(path, handler);
	}

	addFile(path, fn) {
		this.addHandler(path, (request, reply) => {
			reply.file(fn);
		});
	}

	addMenu(path, menu) {
		this.addHandler(path, (request, reply) => {
			for (var item of menu) {
				reply.menuItem(...item);
			}
			reply.end();
		});
	}

	addDynamicMenu(path, menu) {

	}

	addDir(path, dir) {
		throw new Error('Not implemented yet');
	}

	listen(a, b) {
		var self = this;
		var port = 70;
		var callback = b;

		if (typeof a === 'number') {
			port = a;
		} else if (typeof a === 'function') {
			callback = a;
		}

		console.log('Listening on port', port);

		this.server = net.createServer((socket) => {
			socket.setEncoding('ascii');
			socket.on('data', (data) => {
				var args = data.toString().trim().split('\t');

				var request = {
					path: args[0],
					query: args[1]
				}
				var reply = new Reply(socket);

				var handler = self.handlers.get(request.path);


				if (handler) {
					handler(request, reply)
				} else {
					this.handlers.get('err')(request, reply);
				}
			})
		});

		this.server.on('error', (e) => {
			console.log('Server error:', e);
		});

		this.server.listen(port, () => {
			if (callback) {
				callback();
			}
		});
	}
}

module.exports = GopherServer;