# gulp-remotebuild

[![npm version](https://badge.fury.io/js/gulp-remotebuild.svg)](https://badge.fury.io/js/gulp-remotebuild) [![Node.js dependencies](https://david-dm.org/compulim/gulp-remotebuild.svg)](https://david-dm.org/compulim/gulp-remotebuild) [![npm downloads](https://img.shields.io/npm/dm/gulp-remotebuild.svg)](https://img.shields.io/npm/dm/gulp-remotebuild.svg)

Gulp plug-in to build Cordova iOS app remotely using [Visual Studio Tools for Apache Cordova](https://taco.visualstudio.com/).

You can also use this plug-in and TACO to aid continuous integration.

This Gulp plug-in is largely based on this [REST API doc](https://github.com/Microsoft/remotebuild/blob/master/src/taco-remote/RESTAPI.md).

## How to use

Install [`remotebuild`](https://taco.visualstudio.com/en-us/docs/ios-guide/) on your Mac or [MacInCloud](https://macincloud.com/).

```js
const taco = require('./gulp-remotebuild');

return gulp.src('./**/*')
  .pipe(taco.build({
    configuration: process.env.node_env === 'production' ? 'release' : 'debug',
    host         : 'localhost:3000'
  }))
  .pipe(gulp.dest('dist/'));
```

It will send all your files (excluding `bin`, `bld` and `platforms`) to your Mac, build it, and send the [.ipa file](https://en.wikipedia.org/wiki/.ipa) back to your Gulp box.

```
[16:09:20] Starting 'default'...
[16:09:22] taco.json requested for Cordova version 6.1.1
[16:09:23] Compressing 1,221 files
[16:09:25] Compressing 5,259 files
[16:09:27] Compressing 9,944 files
[16:09:28] Compressing 12,292 files
[16:09:28] Building on localhost:3000 against Cordova version 6.1.1
[16:09:32] remotebuild: Uploaded build request payload.
[16:09:45] remotebuild: Acquiring Cordova.
[16:09:47] remotebuild: Updating platform.
[16:09:59] remotebuild: Build completed successfully.
[16:10:00] Extracting myapp.plist (831 B)
[16:10:00] Extracting myapp.ipa (1.5 MB)
[16:10:00] Extracting myapp.app.dSYM.zip (527.4 KB)
[16:10:00] Finished 'default' after 39 s
```

Files outputted at `/dist/`.

```
02/08/2017  06:08 PM           527,375 myapp.app.dSYM.zip
02/08/2017  06:08 PM         1,499,789 myapp.ipa
02/08/2017  06:08 PM               831 myapp.plist
02/08/2017  06:08 PM           254,170 taco-build.log
```

## Options

Default options are as below:

```js
{
  buildTimeout  : 300000,
  configuration : 'debug',
  cordovaVersion: '5.1.1',
  host          : 'localhost:3000',
  logLevel      : 'warn',
  mount         : 'cordova',
  options       : '--device',
  pollInterval  : 1000
}
```

| Name             | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `buildTimeout`   | Seconds to wait for build to complete                                   |
| `configuration`  | `debug` for debug build, `release` for production build                 |
| `cordovaVersion` | Cordova CLI version to use during build                                 |
| `host    `       | Host name and port number of the `remotebuild` box                      |
| `logLevel`       | Log level                                                               |
| `mount`          | Web mount point for `remotebuild`, i.e. https://localhost:3000/cordova/ |
| `options`        | Options to send to Cordova CLI                                          |
| `pollInterval`   | Interval to poll for build completion                                   |

## FAQs

### Instead of REST APIs, why not connect via `taco-cli`?

[`taco-cli`](https://github.com/microsoft/taco-cli) is a CLI built by Microsoft and it talks to `remotebuild` box.

Since Gulp prefer `vinyl` objects and `taco-cli` requires physical file system, bridging Gulp to `taco-cli` would increase the build time. Per discussion with `remotebuild` dev, the REST API provided by `remotebuild` is stable.

Thus, in the current moment, we prefer talking to `remotebuild` box via REST API instead of `taco-cli`.

See the discussions at [https://github.com/Microsoft/remotebuild/issues/23].

## Known issues

* Secured `remotebuild` is not supported yet
* Currently, only `build` command is supported
* Does not support incremental build

## Contributions

Like us? [Star us](https://github.com/compulim/gulp-remotebuild/stargazers).

Found a bug? File us an [issue](https://github.com/compulim/gulp-remotebuild/issues).
