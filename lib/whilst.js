'use strict';

function whilst(predicate, promiseFactory) {
  return Promise.resolve()
    .then(() => predicate())
    .then(predication => {
      if (predication) {
        return Promise.resolve()
          .then(() => promiseFactory())
          .then(() => whilst(predicate, promiseFactory));
      } else {
        return predication;
      }
    })
}

module.exports = whilst;
