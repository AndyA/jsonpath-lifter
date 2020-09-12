"use strict";

const _ = require("lodash");

const pipe = (...lifts) => {
  const work = _.flattenDeep(lifts);
  const last = work.pop() || (doc => doc);

  return (doc, out, $) => {
    for (const lift of work) doc = lift(doc, undefined, $);
    return last(doc, out, $);
  };
};

module.exports = pipe;
