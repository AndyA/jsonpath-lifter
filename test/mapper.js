"use strict";

const tap = require("tap");
const lifter = require("..");

const docs = [
  { id: "001", name: "Bignose" },
  { id: "002", name: "Littlefuse" },
  { id: "003", name: "Pizzo" }
];

const lift = lifter(
  { src: "$.id", via: Number },
  { src: "$.name", dst: "$.title" }
);

const got = docs.map(lift.mapper);
const want = [
  { id: 1, title: "Bignose" },
  { id: 2, title: "Littlefuse" },
  { id: 3, title: "Pizzo" }
];

tap.same(got, want, `mapper`);

const pipeLift = lifter.pipe(lift);
const pipeGot = docs.map(pipeLift.mapper);
tap.same(pipeGot, want, `pipe mapper`);

tap.throws(() => docs.map(lift), /map-like/i, "detects use in map");
