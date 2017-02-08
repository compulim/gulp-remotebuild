# gulp-taco-remote

Gulp plug-in to build Cordova iOS app remotely using [Visual Studio Tools for Apache Cordova](https://taco.visualstudio.com/).

You can also use this plug-in and TACO to aid continuous integration.

# How to use

Install [`remotebuild`](https://taco.visualstudio.com/en-us/docs/ios-guide/) on your Mac or [MacInCloud](https://macincloud.com/).

```js
const taco = require('./gulp-taco-remote');

return gulp.src('./**/*')
  .pipe(taco({
    configuration: process.env.node_env === 'production' ? 'release' : 'debug',
    hostname     : '127.0.0.1'
  }))
  .pipe(gulp.dest('dist/'));
```

It will send all your files (excluding `bin`, `bld` and `platforms`) to your Mac, build it, and send the IPA file back to your Gulp box.

```
[18:08:04] Starting 'default'...
[18:08:07] Compressing 693 files
[18:08:09] Compressing 3,570 files
[18:08:11] Compressing 6,552 files
[18:08:13] Compressing 9,588 files
[18:08:15] Compressing 11,357 files
[18:08:17] Compressing 12,292 files
[18:08:17] Remote building on 127.0.0.1:3000
[18:08:22] Waiting for build to complete
[18:08:52] Extracting myapp.plist
[18:08:52] Extracting myapp.ipa
[18:08:52] Extracting myapp.app.dSYM.zip
[18:08:52] Finished 'default' after 48 s
```

Files outputted at `/dist/`.

```
02/08/2017  06:08 PM         1,054,050 myapp.app.dSYM.zip
02/08/2017  06:08 PM         1,412,198 myapp.ipa
02/08/2017  06:08 PM               831 myapp.plist
02/08/2017  06:08 PM           417,042 taco.log
```

# Options

Default options are as below:

```js
{
  buildTimeout  : 300000,
  configuration : 'debug',
  cordovaVersion: '6.1.1',
  hostname      : '127.0.0.1',
  logLevel      : 'warn',
  mount         : 'cordova',
  options       : '--device',
  pollInterval  : 1000,
  port          : 3000
}
```

| Name             | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `buildTimeout`   | Seconds to wait for build to complete                                   |
| `configuration`  | `debug` for debug build, `release` for production build                 |
| `cordovaVersion` | Cordova CLI version to use during build                                 |
| `hostname`       | Host name of the `remotebuild` box                                      |
| `logLevel`       | Log level                                                               |
| `mount`          | Web mount point for `remotebuild`, i.e. https://127.0.0.1:3000/cordova/ |
| `options`        | Options to send to Cordova CLI                                          |
| `pollInterval`   | Interval to poll for build completion                                   |
| `port`           | Port number of the `remotebuild` box                                    |

# Known issues

* Secured `remotebuild` is not supported yet

# Contributions

Like us? [Star us](https://github.com/compulim/gulp-taco-remote/stargazers).

Found a bug? File us an [issue](https://github.com/compulim/gulp-taco-remote/issues).
