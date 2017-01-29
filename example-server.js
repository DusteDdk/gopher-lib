const Server = require('./server');
const Common = require('./common');
const Type = Common.Type;

const server = new Server(7000, 'localhost');

server.listen(7000);

const menu = [
    ['i', 'This is a test server',' ', 'h',1],
    ['1', 'DusteD.dk', '/', 'dusted.dk', 70],
    ['1', 'Submenu', '/sub', 'localhost', 7000],
];

server.addMenu('',menu);


// TODO: This is not how it work yet.
// The idea is, that if host/port is left out,
// The ones used in the constructor will be inserted where relevant.
// If an entry has "file" then that file will be served.
// If an entry has "scan" then an index will be scanned from that.

const nicerMenu = [
    {
        type: Type.info,
        name: 'A test server indeed'
    },
    {
        type: Type.directory,
        name: 'Local path',
        path: '/something'
    },
    {
        url: 'gopher://gopher.floodgap.com/0/gopher/relevance.txt#Why is gopher still relevant today'
    },
    {
        type: Type.text,
        name: 'Why is gopher still relevant today',
        host: 'gopher.floodgap.com',
        path: '/gopher/relevance.txt',
        port: 70
    },
    {
        type: Type.text,
        name: 'Server source',
        path: '/server.js', /* This is optional, if left out, it is the hash of the filename */ 
        file: __dirname + 'server.js'
    },
    {
        type: Type.directory,
        name: 'Something dynamic',
        path: '/stuffs',
        scan: '/somewhere/over/the/rainbow'
    }
];

server.addMenu('/sub',nicerMenu);