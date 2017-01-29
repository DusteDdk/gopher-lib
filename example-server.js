/*jslint node: true */
/*jshint esversion: 6 */

const Server = require('./server');
const Common = require('./common');
const Resource = Common.Resource;


const server = new Server(7000, 'localhost');

server.listen(() => {
    console.log('Server ready');
});

const preLog = (req, rep)=>{
    console.log('Incoming connection (' + req.serial + ') from ' + rep.socket.remoteAddress + ' requesting: "' + req.selector + '"');
    if(!req.handler) {
        console.log('NOTE: No handler found for selector, default error-message is sent to client.');
    }
};

const postLog = (req, rep)=>{
    console.log('Ended connection (' + req.serial + ') bytes sent: ' + rep.socket.bytesWritten);
};

const myHandler = (request, rep)=>{
    var remoteAddress = rep.socket.remoteAddress;
    var now = new Date();

    rep.menuItem( {name: 'Why hello there '+remoteAddress, type:'i'});
    rep.menuItem( {name: 'Lovely that you dropped by '+now, type:'i'});
    if(request.query) {
        rep.menuItem( {name: 'You wanted to search "'+request.query+'".', type:'i'});
    }
    rep.menuItem( {name: 'Back to index', type:'1'});

    rep.end();
};

server.addPreHandler(preLog);
server.addPostHandler(postLog);

server.addMenu('')
    .addEntry({name: '+--------------------------+', type:'i'})
    .addEntry({name: '| A gopher-server in node! |', type:'i'})
    .addEntry({name: '+--------------------------+', type:'i'})
    .addEntry({name: ' ', type:'i'})
    .addEntry({name: 'Dynamically generated menu!', type: '1', selector:'/userHandler'})
    .addEntry({name: 'Send query', type: '7', selector:'/userHandler'})
    .addEntry({name: 'Directory Index', type: '1', selector:'/dirIndex'})
    .addEntry({name: 'External Site', type: '1', host: 'dusted.dk', port: 70});

server.addHandler('/userHandler', myHandler);
server.addDir('/dirIndex', './');
