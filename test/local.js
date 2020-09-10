"use strict";

const tap = require("tap");
const _ = require("lodash");

const lifter = require("..");

if (0)
  tap.test("access local storage", async () => {
    const lift = lifter(
      { set: "OK", dst: "$.status" },
      { src: "@.id", dst: "$.ident" }
    );
    const got = lift({}, {}, { local: { id: "ABC" } });
    const want = { status: "OK", ident: "ABC" };
    tap.same(got, want, "fetch from local");
  });

tap.test("use local storage", async () => {
  const lift = lifter(
    { dst: "@.id", src: "$.ident" },
    { dst: "$.status", set: "OK" },
    { dst: "$.ID", src: "@.id" }
  );

  const doc = { ident: "XYZ" };
  const got = lift(doc);
  const want = { ID: "XYZ", status: "OK" };
  tap.same(got, want, "use local");
});
