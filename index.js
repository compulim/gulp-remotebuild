'use strict';

const archiver         = require('archiver');
const colors           = require('colors');
const decompress       = require('decompress');
const gutil            = require('gulp-util');
const intervalReporter = require('./lib/intervalReporter');
const numeral          = require('numeral');
const path             = require('path');
const readAllStream    = require('read-all-stream');
const TacoRemoteClient = require('./lib/TacoRemoteClient');
const url              = require('url');
const through2         = require('through2');

const DEFAULT_TACO_REMOTE_CLIENT_OPTIONS = {
  buildTimeout  : 300000,
  configuration : 'debug',
  cordovaVersion: '6.1.1',
  host          : 'localhost:3000',
  logLevel      : 'warn',
  mount         : 'cordova',
  options       : '--device',
  pollInterval  : 1000
};

function build(options = DEFAULT_TACO_REMOTE_CLIENT_OPTIONS) {
  options = Object.assign({}, DEFAULT_TACO_REMOTE_CLIENT_OPTIONS, options);

  const { hostname, port } = url.parse(`http://${ options.host }`);

  options.hostname = hostname;
  options.port = port;

  const tar = archiver('tar', { gzip: true });
  let filesCompressed = 0;
  const stopReport = intervalReporter(() => gutil.log(`Compressing ${ colors.cyan(numeral(filesCompressed).format('0,0')) } files`));
  let cordovaVersion;

  return through2.obj(
    function (file, enc, callback) {
      const filename = file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : '');
      const firstSegment = filename.split('/')[0];

      // TODO: Should also exclude merges/ios, res/[screens,icons,cert,native]/ios
      //       See https://github.com/Microsoft/taco-cli/blob/bb4de9a390a571cf272bdbde3b75471716986c1a/src/taco-cli/cli/remoteBuild/remoteBuildClientHelper.ts#L381

      if (
        firstSegment !== 'bin'
        && firstSegment !== 'bld'
        && firstSegment !== 'platforms'
        && firstSegment !== 'remote'
      ) {
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
            cordovaVersion = json['cordova-cli'];
            gutil.log(`${ colors.magenta('taco.json') } want Cordova version ${ colors.green(cordovaVersion) }`);
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

      const client = new TacoRemoteClient(options);

      Promise.resolve()
        .then(() => client.buildWorkflow(tar))
        .then(buildOutput => {
          this.push(new gutil.File({
            contents: new Buffer(buildOutput.log),
            path    : 'taco-build.log'
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

module.exports = {
  build
};
