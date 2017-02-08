# gulp-taco-remote

Gulp plugin to build Cordova iOS app remotely using [Visual Studio Tools for Apache Cordova](https://taco.visualstudio.com/).

# How to use

Install [`remotebuild`](https://taco.visualstudio.com/en-us/docs/ios-guide/) on your Mac or [MacInCloud](https://macincloud.com/).

```js
const taco = require('./gulp-taco-remote');

return gulp.src('./**/*')
  .pipe(taco({
    configuration: IS_PRODUCTION ? 'release' : 'debug',
    hostname     : '127.0.0.1'
  }))
  .pipe(gulp.dest('dist/'));
```

It will send your files (excluding `bin`, `bld` and `platforms`) to your Mac, build it, and send the IPA file back to your Gulp box.

```
02/08/2017  06:08 PM         1,054,050 myapp.app.dSYM.zip
02/08/2017  06:08 PM         1,412,198 myapp.ipa
02/08/2017  06:08 PM               831 myapp.plist
02/08/2017  06:08 PM           417,042 taco.log
```

# Options

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

# Known issues

* Secured `remotebuild` is not supported yet
