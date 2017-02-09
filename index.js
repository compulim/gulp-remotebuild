'use strict';

const archiver          = require('archiver');
const colors            = require('colors');
const decompress        = require('decompress');
const gutil             = require('gulp-util');
const numeral           = require('numeral');
const path              = require('path');
const readAllStream     = require('read-all-stream');
const RemoteBuildClient = require('./lib/remoteBuildClient');
const through2          = require('through2');
const intervalReporter  = require('./lib/intervalReporter');

const DEFAULT_REMOTE_BUILD_OPTIONS = {
  buildTimeout  : 300000,
  configuration : 'debug',
  cordovaVersion: '5.1.1',
  hostname      : 'localhost',
  logLevel      : 'warn',
  mount         : 'cordova',
  options       : '--device',
  pollInterval  : 1000,
  port          : 3000
};

module.exports = function (options = DEFAULT_REMOTE_BUILD_OPTIONS) {
  options = Object.assign({}, DEFAULT_REMOTE_BUILD_OPTIONS, options);

  const tar = archiver('tar', { gzip: true });
  let filesCompressed = 0;
  const stopReport = intervalReporter(() => gutil.log(`Compressing ${ colors.cyan(numeral(filesCompressed).format('0,0')) } files`));

  let cordovaVersion;

  return through2.obj(
    function (file, enc, callback) {
      const filename = file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : '');
      const firstSegment = filename.split('/')[0];

      if (firstSegment !== 'bin' && firstSegment !== 'bld' && firstSegment !== 'platforms') {
        tar.append(
          file.contents,
          {
            name: path.join('cordova-app', filename),
            date: file.stat && file.stat.mtime ? file.stat.mtime : null
          }
        );

        filesCompressed++;
      }

      if (filename === 'taco.json') {
        readJSON(file).then(
          json => {
            gutil.log(`${ colors.magenta('taco.json') } requested for Cordova version ${ colors.green(json['cordova-cli']) }`);
            cordovaVersion = json['cordova-cli'];
            callback();
          },
          err => callback(err)
        );
      } else {
        callback();
      }
    },
    function (callback) {
      stopReport();
      tar.finalize();

      options.cordovaVersion = cordovaVersion;

      gutil.log(`Building on ${ colors.magenta(options.hostname) }:${ colors.magenta(options.port) } against Cordova version ${ colors.green(cordovaVersion) }`);

      const client = new RemoteBuildClient(options);

      Promise.resolve()
        .then(() => client.build(tar))
        .then(buildOutput => {
          this.push(new gutil.File({
            contents: new Buffer(buildOutput.log),
            path    : 'taco.log'
          }));

          return decompress(buildOutput.zip);
        })
        .then(files => {
          files.forEach(file => {
            gutil.log(`Extracting ${ colors.magenta(file.path) } (${ colors.cyan(numeral(file.data.length).format('0[.]0 b')) })`);

            this.push(new gutil.File({
              contents: file.data,
              path    : file.path
            }));
          });
        })
        .then(() => callback(), err => callback(err));
    }
  );
};

function readBuffer(file, encoding) {
  if (file.isStream()) {
    return readAllStream(file.contents, encoding);
  } else {
    return Promise.resolve(file.contents);
  }
}

function readJSON(file) {
  return readBuffer(file).then(JSON.parse);
}
