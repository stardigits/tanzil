#!/usr/bin/env node
var tanzil = require('./../lib/tanzil');

function exit(code, str) {
  console.log(str) || process.exit(code);
}

function usage() {
  var out = ['Usage: tanzil [search|index|config] '];
  out.push('Examples: \n tanzil search\n tanzil index');
  exit(1, out.join('\n'))
}

if (process.argv[2] == '-v' || process.argv[2] == '--version') exit(0, tanzil.version);
else if (process.argv[2] == null) usage();
var method = process.argv[2], query = process.argv[3];
var callback = function(err, resp) {
  if (err) return exit(1, "Error: " + err.message);
  if (process.argv.indexOf('-i') != -1)
    console.log(resp.headers) || console.log('');
  console.log(resp.body.toString());
};

if ((method=='search')||(method=='index')||(method=='config')) {
  var trans = tanzil[method](query);
  if (Object.keys(trans).length !== 0) console.log(trans);
}
