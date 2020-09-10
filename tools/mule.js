"use strict";

const lifter = require("..");

const doc = { id: "ABC" };
const lift = lifter({ src: "$" });
const got = lift(doc);
console.log(got);
