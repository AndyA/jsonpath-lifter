"use strict";

const lifter = require("..");
const doc = require("./all_hour");

const toISOTime = t => new Date(t).toISOString();

const liftPoint = lifter(
  { dst: `$.lat`, src: `$.coordinates[1]` },
  { dst: `$.lon`, src: `$.coordinates[0]` },
  { dst: `$.alt`, src: `$.coordinates[2]` },
  {
    dst: `$.map`,
    src: `$.coordinates`,
    via: v => `https://www.google.co.uk/maps/place/${v[1]},${v[0]}`
  }
);

const liftProps = lifter(
  { src: ["$.title", "$.url", "$.mag", "$.type"] },
  { src: ["$.time", "$.updated"], via: toISOTime }
);

const liftFeature = lifter(
  { src: `$.properties`, dst: `$`, via: liftProps },
  { src: `$[?(@.coordinates && @.type === "Point")]`, dst: `$`, via: liftPoint }
);

const lift = lifter(
  {
    src: "$.features[*]",
    dst: v => `$.events[${JSON.stringify(v.id)}]`,
    via: liftFeature
  },
  {
    src: "$.metadata",
    dst: "$.meta",
    via: [{ src: "$.generated", via: toISOTime }, { src: ["$.title", "$.url"] }]
  }
);

const out = lift(doc);
console.log(JSON.stringify(out, null, 2));
