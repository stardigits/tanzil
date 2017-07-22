#!/usr/bin/env node
var tanzil = require('./../lib/tanzil');

function exit(code, str) {
  console.log(str) || process.exit(code);
}

function usage() {
  var out = ['Usage: tanzil [search|genindex] '];
  out.push('Examples: \n tanzil search\n tanzil genindex');
  exit(1, out.join('\n'))
}

if (process.argv[2] == '-v' || process.argv[2] == '--version') exit(0, tanzil.version);
else if (process.argv[2] == null) usage();
var method = process.argv[2], query = process.argv[3];
var options = { limit: 100, transFile: './../public/trans-id.txt', indexFile: './../public/trans-id.json'};
var callback = function(err, resp) {
  if (err) return exit(1, "Error: " + err.message);
  if (process.argv.indexOf('-i') != -1)
    console.log(resp.headers) || console.log('');
  console.log(resp.body.toString());
};

var trans = tanzil.search(query);
console.log(trans);
