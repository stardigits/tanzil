/*
tanzil.js
Node module for querying Quranic texts offline and the resources are taken from http://tanzil.net
(c) 2017, July 25, initially released by stardigits
*/

/* Depedencies */

var fs = require('fs'),
  path = require('path'),
  elasticlunr = require('elasticlunr'),
  config = require('./config');

var exit = function(code, str) {
  console.log(str) || process.exit(code);
}

indexOK = false;

var indexExist = function() {
  var libPath = path.dirname(fs.realpathSync(__filename));
  var trfjf = libPath + '/' + config.transJSONFile;
  var idxjf = libPath + '/' + config.indexJSONFile;
  if (!fs.existsSync(trfjf)) exit(1, '"'+trfjf+'" file not found!\nPlease generate it by command \'tanzil index\'');
  if (!fs.existsSync(idxjf)) exit(1, '"'+idxjf+'" file not found!\nplease generate it by command \'tanzil index\'');
  return true;
}

if (process.argv[2]!=='index') indexOK = indexExist();

var transjs = {}, indexjs = {};
if (indexOK) {
  transjs = require('./'+config.transJSONFile);
  indexjs = require('./'+config.indexJSONFile);
}

/* Stop words */

var customized_stop_words = ['dan', 'yang', 'di', 'ini', 'itu'];
elasticlunr.addStopWords(customized_stop_words);

/* Add new method on elasticlunr.Index */

elasticlunr.Index.prototype.searchNoSort = function (query, userConfig) {
  if (!query) return [];
  var configStr = null;
  if (userConfig != null) {
    configStr = JSON.stringify(userConfig);
  }
  var config = new elasticlunr.Configuration(configStr, this.getFields()).get();
  var queryTokens = this.pipeline.run(elasticlunr.tokenizer(query));
  var queryResults = {};
  for (var field in config) {
    var fieldSearchResults = this.fieldSearch(queryTokens, field, config);
  }
  var results = [];
  for (var docRef in fieldSearchResults) {
    results.push({ref: docRef});
  }
  return results;
};

var version = require('../package.json').version;

/* Main */

function Tanzil(method, data, options, callback) {
  this.libPath = path.dirname(fs.realpathSync(__filename));
  this.transPath = this.libPath + '/../'+config.transPath;
  this.method = method;
  this.data = data;
  this.options = config;
  if (options||callback){
  if (typeof options == 'function') {
    this.callback = options;
    this.options = {};
  } else {
    this.callback = callback;
    this.options = options;
  }
  }
}

Tanzil.prototype.start = function (){
  var data = this.data,
    method = this.method,
    callback = (typeof this.options == 'function') ? this.options : this.callback,
    options  = this.options || {},
    transPath = this.transPath,
    libPath = this.libPath;
    
  var result = {};
  if (method == 'index') generateIndex();
  else if (method=='config') result = config;
  else if (method=='transpath') console.log(transPath);
  else if (indexOK) {
    if (method=='search') result = showTrans(data);
  }

  function showTrans(arg){
    var trans={}, newTrans={}, m, j=0;
    if (arg) {
      var isAya = true;
      if ((arg>=1)&&(arg<=114)) trans = getTransBySura(arg);
      else if (/,/g.test(arg)) {
        var arr = arg.split(',');
        arr.forEach(function(i){
          var i = i.trim();
          if ((m = /^(\d{1,3}):(\d{1,3})$/.exec(i)) !== null) {
            trans = getTransByAya(i); 
            if (typeof trans[i] !== 'undefined' && trans[i]) newTrans[i]=trans[i];
          }
        });
        if (Object.keys(newTrans).length !== 0) return newTrans;
      }
      else if ((m = /^(\d{1,3})-(\d{1,3})$/.exec(arg)) !== null) trans = getTransByAya(arg);
      else if ((m = /^(\d{1,3}):(\d{1,3})$/.exec(arg)) !== null) trans = getTransByAya(arg);
      else if ((m = /^(\d{1,3}):(\d{1,3})-(\d{1,3}):(\d{1,3})$/.exec(arg)) !== null) trans = getTransByAya(arg);
      else trans = searchTrans(arg);
    }
    return trans;
  }

  function generateIndex() {
    console.time('generateJSONFiles');
    var tf = transPath + '/' + options.transTextFile;
    var trfjf = libPath + '/' + options.transJSONFile;
    var idxjf = libPath + '/' + options.indexJSONFile;
    var arr;
    if (arr = getTrans()) {
      try { 
        fs.writeFileSync(trfjf, '{"ayas":'+JSON.stringify(arr)+'}');
        console.log('Translation JSON file generated and saved to "' + trfjf + '"');
      }
      catch(err) {console.error(err);}
      var idx = elasticlunr();
      idx.setRef('aya');
      idx.addField('text');
      idx.saveDocument(false);
      arr.forEach(function(item){idx.addDoc(item);});
      try { 
        fs.writeFileSync(idxjf, JSON.stringify(idx));
        console.log('Search Index JSON index file generated and saved to "' + idxjf + '"');
      }
      catch(err) {console.error(err);}
    } else {exit(1, tf+' is not found, please download from http://tanzil.net/trans/');}
    console.timeEnd('generateJSONFiles');
  }

  function getTransByAya(aya) {
    var trans = {};
    var tf = transPath + '/' + options.transTextFile;
    if (indexOK) {
      var arr = transjs.ayas;
      var trans = {}; arr.forEach(function(item){
        if (item.aya==aya) {trans[item.aya]=item.text;}
      });
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function getTransBySura(sura) {
    var trans = {};
    var tf = transPath + '/' + options.transTextFile;
    if (indexOK) {
      //var arr = getTrans(tf);
      var arr = transjs.ayas;
      var trans = {}; arr.forEach(function(item){
      if (item.aya.split(':')[0]==sura) trans[item.aya]=item.text
      });
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function searchTrans(query) {
    var trans = {};
    var tf = transPath + '/' + options.transTextFile;
    var idxf = libPath + '/' + options.indexJSONFile;
    if (indexOK) {
      var arr = transjs.ayas;
      var obj = {}; arr.forEach(function(item){obj[item.aya]=item.text});
      if (indexOK) {
        var idx = elasticlunr.Index.load(indexjs);
        var trans = {};
        var cfg = {boost: 1, bool:'AND'};
        var res = idx.searchNoSort(query, cfg);
        console.log('Result of keyword \''+query+'\' ('+res.length+'):');
        for (k in res) {
          trans[res[k].ref] = obj[res[k].ref];
        }
      } 
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function getTrans() {
    var fn = transPath + '/' + options.transTextFile;
    if (fs.existsSync(fn)) {
      var str = fs.readFileSync(fn, 'utf8');
      var arr = str.match(/[^\r\n]+/gm);
      var trans = []; var obj = {};
      for (var i = 0; i < arr.length; i++) {
        var a = arr[i].split('|');
        if(a[0]<=114) {
          obj = {aya: a[0]+':'+a[1], text: a[2]};
          trans.push(obj);
        }
      }
      return trans;
    } else return null;
  }

  return result;
}

/* Exports */

exports.version = version;
'search index config transpath'.split(' ').forEach(function(method) {
  exports[method] = function(data, options, callback) {
    return new Tanzil(method, data, options, callback).start();
  }
});


/*
var transExist = function () {
  var libPath = path.dirname(fs.realpathSync(__filename));
  var tf = libPath + '/../' + config.transPath + '/' + config.transTextFile;
  if (!fs.existsSync(tf)) exit(1, '"'+tf+'" file not found, please download translation text from http://tanzil.net/trans/');
  return true;
}
transOK = transExist();
*/