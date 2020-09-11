"use strict";

const _ = require("lodash");

const isPromise = obj => obj.then && typeof obj.then === "function";

const allDeep = async obj => {
  const root = { obj };
  const stack = [[root, "obj"]];
  const pending = [];

  // Find any promises
  while (stack.length) {
    const [owner, key] = stack.shift();
    const obj = owner[key];

    if (isPromise(obj)) {
      // Patch up value on resolve
      pending.push(obj.then(v => (owner[key] = v)));
      continue;
    }

    if (_.isArray(obj)) {
      for (let i = obj.length; i-- > 0; ) stack.push([obj, i]);
      continue;
    }

    if (_.isObject(obj)) {
      for (const key in obj) stack.push([obj, key]);
      continue;
    }
  }

  // Wait for all the promises to fulfill
  await Promise.all(pending);

  return root.obj;
};

module.exports = { isPromise, allDeep };
