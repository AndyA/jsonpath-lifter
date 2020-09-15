"use strict";

const tap = require("tap");
const lifter = require("..");

tap.test("via + mv", async () => {
  const cooker = lifter({
    dst: "$.people",
    src: "$.people[*]",
    mv: true,
    via: [{ src: "$.name" }]
  });

  const doc = {
    people: [{ name: "Smoo" }, { name: "Andy" }]
  };

  const cooked = cooker(doc);
  tap.same(cooked, doc, "via + mv");
});
