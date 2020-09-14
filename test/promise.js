"use strict";

const tap = require("tap");

const lifter = require("..");

const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms));

const slowCooker = async v => {
  await delay(10);
  return v + 1;
};

const slowLower = async v => {
  await delay(10);
  return v.toLowerCase();
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

tap.test("delayed cooker", async () => {
  const want = {
    seq: 11,
    parts: [
      { seq: 4, id: 1 },
      { seq: 5, id: 2 },
      { seq: 100, id: 3 }
    ],
    id: "abc"
  };

  const lift = lifter(
    { src: "$..seq", via: slowCooker },
    { src: "$..id" },
    { src: "$.id", via: slowLower }
  );
  const got = await lift.promise(doc);
  tap.same(got, want, "async lift");
});

tap.test(`promise pipe`, async () => {
  const lift = lifter.pipe(
    lifter({ src: "$..seq", via: slowCooker }, { src: "$..id" }),
    lifter({ src: "$..seq", via: slowCooker }, { src: "$..id" })
  );
  const got = await lift.promise(doc);

  const want = {
    seq: 12,
    parts: [
      { seq: 5, id: 1 },
      { seq: 6, id: 2 },
      { seq: 101, id: 3 }
    ],
    id: "ABC"
  };
  tap.same(got, want, "async pipe lift");
});
