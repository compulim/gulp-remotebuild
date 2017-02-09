'use strict';

const colors          = require('colors');
const fetch           = require('node-fetch');
const gutil           = require('gulp-util');
const HttpsProxyAgent = require('https-proxy-agent');
const url             = require('url');
const whilst          = require('./whilst');
const { BuildInfo }   = require('taco-utils');

class RemoteBuildClient {
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

  _getBuildInfo(buildNumber) {
    return this._fetch(`build/tasks/${ buildNumber }`);
  }

  _waitUntilBuildComplete(buildNumber) {
    const startTime = Date.now();
    let lastMessage = null;

    return whilst(
      () => {
        if (Date.now() - startTime > this.options.buildTimeout) {
          return Promise.reject(new Error('build timeout'));
        }

        return this._getBuildInfo(buildNumber).then(buildInfo => {
          if (lastMessage !== buildInfo.message) {
            lastMessage = buildInfo.message;
            gutil.log(`${ colors.cyan('remotebuild') }: ${ lastMessage }`);
          }

          switch (buildInfo.status) {
          case BuildInfo.ERROR:
          case BuildInfo.DOWNLOADED:
          case BuildInfo.INVALID:
            return Promise.reject(new Error(`Build failed: ${ buildInfo.status }`));

          case BuildInfo.COMPLETE:
            return false;

          default:
            return true;
          }
        });
      },
      () => new Promise(resolve => setTimeout(resolve, this.options.pollInterval))
    );
  }

  // _waitUntilBuildComplete(buildNumber) {
  //   gutil.log(`Waiting for build to complete`);

  //   return new Promise((resolve, reject) => {
  //     const startTime = Date.now();

  //     const once = () => {
  //       this._getBuildInfo(buildNumber).then(
  //         buildInfo => {
  //           switch (buildInfo.status) {
  //           case BuildInfo.ERROR:
  //           case BuildInfo.DOWNLOADED:
  //           case BuildInfo.INVALID:
  //             reject(new Error(`Build failed: ${ buildInfo.status }`));
  //             break;

  //           case BuildInfo.COMPLETE:
  //             resolve();
  //             break;

  //           default:
  //             if (Date.now() - startTime > this.options.buildTimeout) {
  //               reject(new Error('Build timeout'));
  //             } else {
  //               setTimeout(() => once(), this.options.pollInterval);
  //             }

  //             break;
  //           }
  //         },
  //         reject
  //       );
  //     };

  //     once();
  //   });
  // }

  _downloadBuild(buildNumber) {
    return this._fetch(`build/${ buildNumber }/download`);
  }

  _downloadLog(buildNumber) {
    return this._fetch(`build/tasks/${ buildNumber }/log`);
  }
}

module.exports = RemoteBuildClient;