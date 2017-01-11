const assert = require('assert');
const Gopher = require('./lib');
console.log('Testing Gopher.Resource...');

var proto = [ '','gopher://' ];
var host = [ 'dusted.dk', 'floodgap.com' ];
var port = [ '',':70', ':1337' ];
var type = [ '','0','1','2','3','4','5','6','7','8','9','g','I','h' ];
var selector = [ '', '/', '/dir', '/dir/subdir', '/dir/', '/dir/subdir/', 'dir', 'dir/subdir', 'dir/subdir/','selectors with space', 'URI%20Enoded%20Selectors%20With%20Space' ];
var query = [ '','?query', '?query with space', '?uri%20paced%20query' ];
var name = [ '', '#A_name', "#A name with spaces",'#An%20URI%20Encoded%20Name' ];

var ok=0, fail=0;

proto.forEach( (p)=>{
	host.forEach( (h)=>{
		port.forEach( (P)=>{
			type.forEach( (t)=>{
				selector.forEach( (s)=>{
					query.forEach( (q)=>{
						name.forEach( (n)=>{
							var URI= p+h+P;
							if(t) { URI+='/'+t; }
							if(s) {
								if(!t) { URI+='/'; }
								URI+=s;
							}
							if(q) {
								if(!s && !t) { URI+='/'; }
								URI+=q;
							}
							if(n) {
								if(!s && !t) { URI+='/'; }
								URI+=n;
							}
							
							var res;
							try {
								assert.doesNotThrow( ()=>{ res = new Gopher.Resource(URI); }, 'Could not create from URI "'+URI+'"');
								assert( res instanceof Gopher.Resource, "Expected to create a gopher resource.");
								assert.equal( res.host, h, 'wrong hostname');
								if(P) {
									assert.equal(res.port, P.substring(1), 'wrong set port');
								} else {
									assert.equal(res.port, '70', 'wrong default port');
								}
								
								if(s) {
									assert.equal(res.selector, decodeURIComponent(s), 'wrong set selector');
								} else if(!q) {
									assert.equal(res.selector, '', 'wrong default selector');
								}
								if(q && s) {
									assert.equal(res.query, decodeURIComponent(q.substring(1)), 'wrong set query');
								} else {
									assert.equal(res.query, false, 'wrong default query');
								}

								if(n) {
									assert.equal(res.name, decodeURIComponent(n.substring(1)), 'wrong set name');
								}
								ok++;
								//console.log( '{ "URI": '+URI+', "Resource": '+res.toJson() );
							} catch(e) {
								fail++;
								console.error('Could not create resource from URI "'+URI+'"',e);
							}
						});
					});
				});
			});
		});
	});
});

console.log('Ok: '+ok+' Fail: '+fail);

if(fail) {
	process.exit(1);
}
