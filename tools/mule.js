"use strict";

const lifter = require("..");

const lower = s => s.toLowerCase();
const reverse = s =>
  s
    .split("")
    .reverse()
    .join("");

const innerLift = lifter(
  { dst: "@.id", src: "$.ident", via: lower },
  { dst: "$.ID1", src: "@.id" },
  { dst: "$.ID", src: "$.ident", via: lower },
  { dst: "$.ID2", src: "@.id", via: reverse }
);

const lift = lifter(
  //  { dst: "@.id", src: "$.ident", via: lower },
  { src: "$.parts[*]", via: innerLift }
  //  , { dst: "$.ID", src: "@.id", via: reverse }
);

const doc = {
  ident: "XYZ",
  parts: [{ ident: "ABC" } /*, { ident: "DEF" }, { ident: "GHI" }*/]
};

const got = lift(doc);

console.log("result", got);
