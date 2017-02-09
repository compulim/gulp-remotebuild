'use strict';

module.exports = function (reporter, options = { interval: 2000 }) {
  const interval = setInterval(() => {
    reporter() === false && clearInterval(interval);
  }, options.interval);

  return () => {
    clearInterval(interval);
    reporter();
  };
}
