"use strict";

const lifter = require("..");
const doc = require("./all_hour");

const toISOTime = t => new Date(t).toISOString();

const liftPoint = lifter.pipe(
  lifter(
    { dst: `$.lat`, src: `$.coordinates[1]` },
    { dst: `$.lon`, src: `$.coordinates[0]` },
    { dst: `$.alt`, src: `$.coordinates[2]` }
  ),
  lifter(
    { src: ["$.lat", "$.lon", "$.alt"] },
    {
      dst: `$.map`,
      src: `$`,
      via: v => `https://www.google.co.uk/maps/place/${v.lat},${v.lon}`
    }
  )
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
    // Dangerous!
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
