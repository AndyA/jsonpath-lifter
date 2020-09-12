"use strict";

const _ = require("lodash");

const pipe = (...lifts) => {
  const work = _.flattenDeep(lifts);

  for (const lift of work)
    if (!_.isFunction(lift))
      throw new Error(
        `All pipe members must be functions or arrays of functions`
      );

  const last = work.pop() || (doc => doc);

  return (doc, out, $) => {
    for (const lift of work) doc = lift(doc, undefined, $);
    return last(doc, out, $);
  };
};

module.exports = pipe;
