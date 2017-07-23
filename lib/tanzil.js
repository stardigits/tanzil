/*
tanzil.js
Node module for querying Quranic texts offline and the resources are taken from http://tanzil.net
(c) 2017 by stardigits
*/

/* Depedencies */

var fs = require('fs'),
  path = require('path'),
  jsonfile = require('jsonfile'),
  elasticlunr = require('elasticlunr'),
  config = require('./config');

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

/* Helper */



/* Main */

function Tanzil(method, data, options, callback) {
  this.transAbsolutePath = path.dirname(fs.realpathSync(__filename))+ "\\..\\"+config.transPath;
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
    options  = this.options || {};
  var transAbsolutePath = this.transAbsolutePath;
  var result = {};
  if (method=='search') result = showTrans(data);
  else if (method=='index') generateIndex();
  else if (method=='config') result = config;
  else if (method=='transpath') console.log(transAbsolutePath);

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
    console.time('generateIndex');
    var tf = transAbsolutePath + '/' + options.transFile;
    var idxf = transAbsolutePath + '/' + options.indexFile;
    if (fs.existsSync(tf)) {
      var trans = getTrans(tf);
      var idx = elasticlunr();
      idx.setRef('aya');
      idx.addField('text');
      idx.saveDocument(false);
      trans.forEach(function(item){idx.addDoc(item);});
      try { 
        jsonfile.writeFileSync(idxf, idx);
        console.log('Translation search index file generated and saved to "' + idxf + '"');
      }
      catch(err) {console.error(err);}
      console.timeEnd('generateIndex');
      return idx;
    }
  }

  function getTransByAya(aya) {
    var trans = {};
    var tf = transAbsolutePath + '/' + options.transFile;
    if (fs.existsSync(tf)) {
      var arr = getTrans(tf);
      var trans = {}; arr.forEach(function(item){
        if (item.aya==aya) {trans[item.aya]=item.text;}
      });
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function getTransBySura(sura) {
    var trans = {};
    var tf = transAbsolutePath + '/' + options.transFile;
    if (fs.existsSync(tf)) {
      var arr = getTrans(tf);
      var trans = {}; arr.forEach(function(item){
      if (item.aya.split(':')[0]==sura) trans[item.aya]=item.text
      });
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function searchTrans(query) {
    var trans = {};
    var tf = transAbsolutePath + '/' + options.transFile;
    var idxf = transAbsolutePath + '/' + options.indexFile;
    if (fs.existsSync(tf)) {
      var arr = getTrans(tf);
      var obj = {}; arr.forEach(function(item){obj[item.aya]=item.text});
      try {
        var idxobj = jsonfile.readFileSync(idxf);
      } 
      catch(err) {console.log("Search index file not found, please do generate index");}
      if (idxobj) {
        var idx = elasticlunr.Index.load(idxobj);
        var trans = {};
        var cfg = {boost: 1, bool:'AND'};
        var res = idx.searchNoSort(query, cfg);
        console.log("Result of keyword \""+query+"\" ("+res.length+"):");
        for (k in res) {
          trans[res[k].ref] = obj[res[k].ref];
        }
      } 
    } else console.log(tf + ' is not found!');
    return trans;
  }

  function getTrans(fn) {
    /* return: array of object, fn: transFile */
    if (fs.existsSync(fn)) {
      var str = fs.readFileSync(fn, "utf8");
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
