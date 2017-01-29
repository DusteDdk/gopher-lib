'use strict';

const GopherClient = require('./client');
const GopherServer = require('./server');
const GopherCommon = require('./common');

module.exports = {
	Client: GopherClient,
	Server: GopherServer,
	Resource: GopherCommon.Resource,
	Type: GopherCommon.Type
};
