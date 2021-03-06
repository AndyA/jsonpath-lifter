"use strict";

const tap = require("tap");
const lifter = require("..");

tap.test(`Simple pipe`, async () => {
  const lift = lifter.pipe(
    lifter({ src: "$.id", dst: "$.ident" }),
    lifter({ src: "$.ident", dst: "$.ID" })
  );

  const doc = { id: "ABC" };
  const got = lift(doc);
  const want = { ID: "ABC" };
  tap.same(got, want, `simple pipe`);
});

tap.test(`Empty pipe`, async () => {
  const lift = lifter.pipe();
  const doc = { id: "ABC" };
  const got = lift(doc);
  tap.same(got, undefined, `empty pipe`);
});
