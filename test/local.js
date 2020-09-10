"use strict";

const tap = require("tap");
const _ = require("lodash");

const lifter = require("..");

tap.test("access local storage", async () => {
  const lift = lifter(
    { set: "OK", dst: "$.status" },
    { src: "@.id", dst: "$.ident" }
  );
  const got = lift({}, {}, { local: { id: "ABC" } });
  const want = { status: "OK", ident: "ABC" };
  tap.same(got, want, "fetch from local");
});
