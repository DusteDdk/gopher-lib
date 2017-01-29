/*jslint node: true */
/*jshint esversion: 6 */

'use strict';

const net = require('net');
const fs = require('fs');
const path = require('path');

const Common = require('./common.js');
const GopherResource = Common.Resource;


/** @class */
class Reply {
	constructor(hostname, port, socket, endCallback) {
		/**
		 * @property {net.Socket} socket - The node network socket, contains interesting information. (Voids warranty)
		 */
		this.socket = socket;

		this.hostname=hostname;
		this.port=port;

		this.queue = 0;
		this.endCallback = endCallback;
		this.wroteMenu = false;
	}

	/**
	 * @param {string} - data
	 * @description Send data to client. Connection kept open!
	 */
	write(data) {
		if (!this.socket.write(data)) {
			this.queue++;
			var self = this;
			this.socket.on('drain', () => {
				self.queue--;
			});
		}
	}

	/**
	 * @param {string} filname
	 * @description Send file from disk, close connection when complete.
	 */
	file(fn) {
		var socket = this.socket;

		var self = this;
		var readStream = fs.createReadStream(fn);

		socket.on('drain', () => {
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

	/**
	 * @param {GopherMapEntry} item
	 * @description Send one Gopher menu-entry to the client. Connection kept open!
	 */
	menuItem(item) {
		this.wroteMenu = true;
		if (item.url) {
			item.host = item.url;
		} else if (item.type != 'i' && item.type != '3') {
			item.host = item.host || this.hostname;
			item.port = item.port || this.port;
		} else {
			item.host = 'h';
			item.port = '1';
		}
		item.selector = item.selector || '';
		this.write(new GopherResource(item.host, item.port, item.selector, item.type, item.name).toDirectoryEntity());
	}

	/**
	 * @param {string} message
	 * @description Send an error item to client. Connection kept open!
	 */
	menuErr(txt) {
		this.menuItem(GopherResource.error(txt));
	}

	/**
	 * @param {string} message
	 * @description Send an info item to client. Connection kept open!
	 */
	menuInfo(txt) {
		this.menuItem(GopherResource.info(txt));
	}

	/**
	 * @description Close connection. Note: This waits for data to be sent to client before the connection is closed.
	 */
	end() {
		var socket = this.socket;
		var self = this;

		if (this.wroteMenu) {
			socket.write('.');
		}

		if (this.queue || socket.bufferSize) {
			socket.on('drain', () => {
				socket.end();
				self.endCallback();
			});
		} else {
			socket.end();
			self.endCallback();
		}
	}
}


/** @class */
class GopherMenu {
	constructor() {
		this.entries = [];
	}

	send(reply) {
		for (var entry of this.entries) {
			reply.menuItem(entry);
		}
		reply.end();
	}

	/**
	 * @param {fileName} fileName - Name of file containing JSON array of GopherMapEntry
	 * @param {bool} [silent=false] - Don't throw error if adding the file fails
	 * @description Populate the menu from a file, see {@link GopherMapEntry}
	 * 
	 */
	fromFile(fileName, silent) {

		try {
			var fileObj = JSON.parse(fs.readFileSync(fileName));
			if (fileObj) {
				fileObj.forEach((itemObj) => {
					this.addEntry(itemObj);
				});
			}
		} catch (e) {
			if (!silent) {
				throw e;
			}
		}
	}

	/**
	 * @param {GopherMapEntry} item - Item to add to menu
	 * @description Add a menu-item to the menu, fills out host, port if empty.
	 * @returns {GopherMenu} - Returns same instance for easy chaining.
	 */
	addEntry(item) {
		/**
		 * @typedef {Object} GopherMapEntry
		 * @description An object from which a GopherResource can be constructed
		 * @property {string} [type='3'] - The type of resource that this is
		 * @property {string} [url] - A gopher url, all other parameters are ignored.
		 * @property {string} [name='No Name] - Name of this entry
		 * @property {string} [selector=''] - Selector
		 * @property {string} [host=(Servers hostname)] - If empty, autofilled if type != 'i' or '3'
		 * @property {string} [port=(Servers port)] - If empty, autofilled if type != 'i' or '3'
		 * 
		 */

		this.entries.push(item);
		return this;
	}

}


/** @class */
class GopherServer {

	/**
	 * @param {integer} port - The port on which to listen
	 * @param {string} hostname - The hostname that should be reported in menus
	 * @description Create a new GopherServer class, it will not listen before you call listen().
	 * Note that the server supports listening on a different port than it reports to clients.
	 * */
	constructor(port, hostname) {
		this.handlers = new Map();
		this.handlers.set('err', this._errHandler);
		this.server = null;
		this.port = port;
		this.hostname = hostname;
		this.preHandlers = [];
		this.postHandlers = [];
		this.numRequests = 1;
	}

	_errHandler(request, reply) {
		reply.menuErr('Selector not found: "' + request.selector + '"');
		reply.end();
	}

	/**
	 * @param {GopherServer~handlerCallback} preHandler
	 * @description Add a handler that is called on any selector (found or not), this should generally not send data or modify the socket.
	 */
	addPreHandler(handler) {
		this.preHandlers.push(handler);
	}

	/**
	 * @param {GopherServer~handlerCallback} postHandler
	 * @description Add a handler that is called on any selecter, after the reply.end() has been called, and socket been drained and closed.
	 */
	addPostHandler(handler) {
		this.postHandlers.push(handler);
	}


	/**
	 * @param {string} selector - Selector that this handler should serve
	 * @param {GopherServer~handlerCallback} - The handler to serve this selector
	 */
	addHandler(selector, handler) {
		this.handlers.set(selector, handler);
	}

	/**
	 * @param {string} selector - The selector on which file should be available
	 * @param {string} filename - The file to send
	 * @description Send a file when selector is hit, this could be anything, even a gophermap
	 */
	addFile(selector, fn) {
		this.addHandler(selector, (request, reply) => {
			reply.file(fn);
		});
	}

	/**
	 * @param {string} - Selector
	 * @description Send a menu from selector
	 * @returns {GopherMenu} - The menu object that was created
	 */
	addMenu(selector) {

		var menu = new GopherMenu();

		this.addHandler(selector, (request, reply) => {
			menu.send(reply);
		});
		return (menu);
	}

	fileInfo(fn) {
		var info = {
			type: '9',
			stat: fs.statSync(fn)
		};

		if (info.stat.isDirectory()) {
			info.type = '1';
		} else {
			var ext = path.extname(fn).toLowerCase();
			switch (ext) {
				case '.html':
				case '.htm':
				case '.txt':
				case '.md':
				case '.c':
				case '.cpp':
				case '.h':
				case '.hpp':
				case '.sh':
				case '.js':
				case '.json':
					info.type = '0';
					break;
				case '.gif':
					info.type = 'g';
					break;
				case '.jpg':
				case '.jpe':
				case '.jpeg':
				case '.png':
				case '.tga':
				case '.bmp':
				case '.ico':
					info.type = 'I';
					break;
			}
		}

		return (info);
	}

	/**
	 * @param {string} selector - The selector on which directory listing/menu should be available
	 * @param {string} dir - The directory to scan
	 * @param {GopherServer~addDirOptions} [options] - Options
	 * @description Attach directory to selector
	 */
	addDir(selector, dir, options) {
		/**
		 * @typedef {object} GopherServer~addDirOptions
		 * @property {bool} [recurse=true] - Recurse into subdirectories
		 * @property {bool} [useMap=true] - Read map files and use for menus instead of generating an index
		 * @property {integer} [showSizeAt=32768] - Filesize at which size is displayed next to the name
		 * @property {bool} [dotFiles=false] - Include dotFiles in the directory listing
		 * @property {string} [oldMapFileName='.cache'] - When useMap is enabled, look for this file (if no jsonmap found)
		 * @property {string} [jsonMapFileName='gophermap.json'] - When useMap is enabled, look for this file before falling back on oldMapFileName or directory index.
		 */

		const confDefaults = {
			recurse: true,
			useMap: true,
			showSizeAt: 32768,
			dotFiles: false,
			oldMapFileName: '.cache',
			jsonMapFileName: 'gophermap.json'
		};

		options = options || {};

		for (var key in confDefaults) {
			options[key] = options[key] || confDefaults[key];
		}

		var menu = false;

		var self = this;
		var files = fs.readdirSync(dir);

		var hasMap = false;

		if (options.useMap) {
			hasMap = files.includes(options.jsonMapFileName);
			if (hasMap) {
				menu = this.addMenu(selector);
				menu.fromFile(path.join(dir, options.jsonMapFileName));
			} else {
				hasMap = files.includes(options.oldMapFileName);
				if (hasMap) {
					this.addFile(selector, path.join(dir, options.oldMapFileName));
					menu = true;
				}
			}
		}

		if (!menu) {
			menu = this.addMenu(selector);
		}

		files.forEach((item) => {

			if (!options.dotFiles && item[0] === '.') {
				return;
			}

			var selectorName = selector + '/' + item;
			var longName = path.join(dir, item);
			var info = self.fileInfo(longName);

			if (info.stat.isDirectory()) {
				if (options.recurse) {
					self.addDir(selectorName, longName, options);
				}
			} else if (info.stat.isFile()) {

				// Add selector for file
				self.addFile(selectorName, longName);
				// Add menu entry for file
				if (info.stat.size >= options.showSizeAt) {
					var size = parseInt(info.stat.size);
					if (size > 1024 * 1024 * 1024) {
						size /= 1024 * 1024 * 1024;
						size = size.toFixed(0) + ' GiB';
					} else if (size > 1024 * 1024) {
						size /= 1024 * 1024;
						size = size.toFixed(0) + ' MiB';
					} else if (size > 1024) {
						size /= 1024;
						size = size.toFixed(0) + ' KiB';
					} else {
						size = size + ' B';
					}
					item = item + ' (' + size + ')';
				}
			}

			var entry = {
				name: item,
				selector: selectorName,
				type: info.type
			};

			if (!hasMap) {
				if(info.stat.isFile() || options.recurse) {
					menu.addEntry(entry);
				}
			}

		});
	}

	/**
	 * @description Start listening for incoming connections
	 * @param {function} [callback] - Called when the server is started and listening
	 */
	listen(callback) {
		var self = this;

		this.server = net.createServer((socket) => {
			socket.setEncoding('ascii');

			var serial = self.numRequests++;

			socket.on('data', (data) => {
				var args = data.toString().trim().split('\t');

				/**
				 * @typedef {object} GopherServer~requestInformation
				 * @property {string} selector - The selector sent by the client
				 * @property {string} [query] - The search string, if any
				 * @property {integer} serial - Which request was this (unique during server-lifetime only)
				 * @property {GopherServer~handlerCallback} [handler] - Which handler (if any) handles this
				 */
				var request = {
					selector: args[0],
					query: args[1],
					serial: serial,
					handler: false
				};

				var reply = new Reply(self.hostname, self.port, socket, () => {
					for (var postHandler of self.postHandlers) {
						postHandler(request, reply);
					}
				});

				var handler = self.handlers.get(request.selector);
				if(handler) {
					request.handler = handler;
				}

				for (var preHandler of self.preHandlers) {
					preHandler(request, reply);
				}

				if (handler) {
					handler(request, reply);
				} else {
					this.handlers.get('err')(request, reply);
				}
			});

			socket.on('error', (e) => {
				console.log('Socket error (request serial ' + serial + '), Error:', e.message);
			});

		});

		this.server.on('error', (e) => {
			console.log('Server error:', e);
		});

		this.server.listen(this.port, () => {
			if (callback) {
				callback();
			}
		});
	}
}

/**
 * @callback GopherServer~handlerCallback
 * @param {GopherServer~requestInformation} request - Information about the request made by the client
 * @param {Reply} reply - Used to send data back to the client
 * @description This method is responsible for replying to incoming requests.
 */

module.exports = GopherServer;