"use strict";

const lifter = require("..");
const _ = require("lodash");

const isPromise = obj => obj.then && typeof obj.then === "function";

const allDeep = async obj => {
  const root = { obj };
  const stack = [[root, "obj"]];
  const pending = [];

  // Find any promises
  while (stack.length) {
    const [owner, key] = stack.pop();
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

const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms));

const slowCooker = async v => {
  await delay(10);
  return v + 1;
};

const doc = {
  seq: 10,
  id: "ABC",
  parts: [
    { id: 1, seq: 3 },
    { id: 2, seq: 4 },
    { id: 3, seq: 99 }
  ]
};

(async () => {
  const lift = lifter({ src: "$..seq", via: slowCooker }, { src: "$..id" });
  const pend = lift(doc);
  console.log(pend);
  const got = await allDeep(pend);
  console.log(got);
})();
