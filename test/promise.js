"use strict";

const tap = require("tap");

const lifter = require("..");

const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms));

const slowCooker = async v => {
  await delay(10);
  return v + 1;
};

tap.test("delayed cooker", async () => {
  const doc = {
    seq: 10,
    id: "ABC",
    parts: [
      { id: 1, seq: 3 },
      { id: 2, seq: 4 },
      { id: 3, seq: 99 }
    ]
  };

  const want = {
    seq: 11,
    parts: [
      { seq: 4, id: 1 },
      { seq: 5, id: 2 },
      { seq: 100, id: 3 }
    ],
    id: "ABC"
  };

  const lift = lifter({ src: "$..seq", via: slowCooker }, { src: "$..id" });
  const got = await lift.promise(doc);
  tap.same(got, want, "async lift");
});
