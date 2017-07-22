var config = {}
config.limit = 40;                    // limit row per page
config.pathTrans = './public';        // path location of translation & index files
config.transFile = 'trans-id.txt';    // Translation text file
config.indexFile = 'trans-id.json';   // Prebuild search index file by elasticlunr

module.exports = config;