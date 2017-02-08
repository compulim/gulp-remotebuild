'use strict';

const archiver        = require('archiver');
const colors          = require('colors');
const decompress      = require('decompress');
const fetch           = require('node-fetch');
const gutil           = require('gulp-util');
const HttpsProxyAgent = require('https-proxy-agent');
const numeral         = require('numeral');
const path            = require('path');
const through2        = require('through2');
const timedReport     = require('./timedReport');
const url             = require('url');
const { BuildInfo }   = require('taco-utils');

const DEFAULT_REMOTE_BUILD_OPTIONS = {
  buildTimeout  : 300000,
  configuration : 'debug',
  cordovaVersion: '6.1.1',
  hostname      : '192.168.0.104',
  logLevel      : 'warn',
  mount         : 'cordova',
  options       : '--device',
  pollInterval  : 1000,
  port          : 3000
};

module.exports = function (options = DEFAULT_REMOTE_BUILD_OPTIONS) {
  options = Object.assign({}, DEFAULT_REMOTE_BUILD_OPTIONS, options);

  const basename = path.basename(__dirname);
  const tar = archiver('tar', { gzip: true });
  let filesCompressed = 0;
  const timer = timedReport(() => gutil.log(`Compressing ${ colors.cyan(numeral(filesCompressed).format('0,0')) } files`));

  return through2.obj(
    function (file, enc, callback) {
      const filename = file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : '');

      if (!(
        /^bin\//.test(filename)
        || /^bld\//.test(filename)
        || /^platforms\//.test(filename)
      )) {
        tar.append(
          file.contents,
          {
            name: path.join(basename, filename),
            date: file.stat && file.stat.mtime ? file.stat.mtime : null
          }
        );

        filesCompressed++;
      }

      callback();
    },
    function (callback) {
      timer.stop();
      tar.finalize();

      const remoteBuildProcess = new RemoteBuildProcess(options);

      Promise.resolve()
        .then(() => {
          gutil.log(`Remote building on ${ colors.green(options.hostname) }:${ colors.green(options.port) }`);

          return remoteBuildProcess.build(tar);
        })
        .then(buildOutput => {
          this.push(new gutil.File({
            contents: new Buffer(buildOutput.log),
            path    : 'taco.log'
          }));

          return decompress(buildOutput.zip);
        })
        .then(files => {
          files.forEach(file => {
            gutil.log(`Extracting ${ colors.magenta(file.path) }`);

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

class RemoteBuildProcess {
  constructor(options) {
    this.options = options;
  }

  _fetch(relativePath, query = {}, fetchOptions = {}) {
    const { http_proxy: httpProxy } = process.env;

    return fetch(
      url.format({
        hostname: this.options.hostname,
        pathname: `${ encodeURI(this.options.mount) }/${ relativePath }`,
        port    : this.options.port,
        protocol: 'http',
        query
      }),
      Object.assign({
        agent : httpProxy ? new HttpsProxyAgent(httpProxy) : null,
        method: fetchOptions.method || 'GET',
      }, fetchOptions)
    ).then(res => {
      const { status } = res;

      if (status === 201) {
        return;
      } else if (~~(status / 100) === 2) {
        const contentType = res.headers.get('content-type');

        if (/^application\/json/.test(contentType)) {
          return res.json();
        } else if (/^text\/plain/.test(contentType)) {
          return res.text();
        } else {
          return res.buffer();
        }
      } else {
        return Promise.reject(new Error(`server returned ${ status }`));
      }
    });
  }

  build(gzip) {
    return Promise.resolve()
      .then(() => this._callBuild(gzip))
      .then(buildNumber => Promise.resolve()
        .then(() => this._waitUntilBuildComplete(buildNumber))
        .then(() => Promise.all([
          this._downloadBuild(buildNumber),
          this._downloadLog(buildNumber)
        ]))
        .then(result => ({
          log: result[1],
          zip: result[0]
        }))
      );
  }

  _callBuild(gzip) {
    return this._fetch(
      `build/tasks`,
      {
        cfg        : this.options.configuration,
        command    : 'build',
        loglevel   : this.options.logLevel,
        options    : this.options.options,
        vcordova   : this.options.cordovaVersion
      },
      {
        body  : gzip,
        method: 'POST'
      }
    )
    .then(json => json.buildNumber);
  }

  _waitUntilBuildComplete(buildNumber) {
    gutil.log(`Waiting for build to complete`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const once = () => {
        this._fetch(`build/tasks/${ buildNumber }`).then(
          buildInfo => {
            switch (buildInfo.status) {
            case BuildInfo.ERROR:
            case BuildInfo.DOWNLOADED:
            case BuildInfo.INVALID:
              reject(new Error(`Build failed: ${ buildInfo.status }`));
              break;

            case BuildInfo.COMPLETE:
              resolve();
              break;

            default:
              if (Date.now() - startTime > this.options.buildTimeout) {
                reject(new Error('Build timeout'));
              } else {
                setTimeout(() => once(), this.options.pollInterval);
              }

              break;
            }
          },
          reject
        );
      };

      once();
    });
  }

  _downloadBuild(buildNumber) {
    return this._fetch(`build/${ buildNumber }/download`);
  }

  _downloadLog(buildNumber) {
    return this._fetch(`build/tasks/${ buildNumber }/log`);
  }
}
