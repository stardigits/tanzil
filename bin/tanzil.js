#!/usr/bin/env node
var tanzil = require('./../lib/tanzil');

function exit(code, str) {
  console.log(str) || process.exit(code);
}

function usage() {
  var str = "tanzil.js (" + tanzil.version + ")";
  str += `
Usage: tanzil [<method>|<keyword>]

Methods:
  search <keyword>     Search for Quran Text by 'smart' keyword
  config               Show configuration
  index                Generate search index json file
  transpath            Show path of translation and index files
  
Examples:
  tanzil search 1      Search Quran translation by Sura/Chapter number 1
  tanzil search 71:1   Search Quran translation by Aya/Verse number 71:1
  tanzil search kursi  Search Quran translation for word 'kursi'
`;
  exit(1, str);
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

var trans = {};
var m = ["search","index","config","transpath"];
if (m.indexOf(method)!=-1) {
  trans = tanzil[method](query);
  if (Object.keys(trans).length !== 0) console.log(trans);
} else {
  trans = tanzil.search(method);
  if (Object.keys(trans).length !== 0) console.log(trans);
}
