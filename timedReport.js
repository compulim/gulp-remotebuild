'use strict';

module.exports = function (reporter, options = { interval: 2000 }) {
  const interval = setInterval(() => {
    if (reporter() === false) {
      clearInterval(interval);
    }
  }, options.interval);

  return {
    stop: () => {
      clearInterval(interval);
      reporter();
    }
  };
}
