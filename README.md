# jsonpath-lifter

Transform JSON objects using JSONPath expressions

## Document Transformations

Suppose you have documents like this:

```javascript
const doc = {
  reporter: {
    name: "Andy Armstrong",
    email: "andy@example.com"
  },
  links: [
    "https://github.com/AndyA",
    "https://twitter.com/AndyArmstrong"
  ],
  repos: [
    { n: "jsonpath-faster", u: "https://github.com/AndyA/jsonpath-faster" },
    { n: "jsonpath-lifter", u: "https://github.com/AndyA/jsonpath-lifter" }
  ]
}
```

But you need the data arranged like this:

```javascript
const want = {
  ident: "Andy Armstrong <andy@example.com>",
  links: [
    "https://github.com/AndyA",
    "https://twitter.com/AndyArmstrong",
    "https://github.com/AndyA/jsonpath-faster",
    "https://github.com/AndyA/jsonpath-lifter"
  ]
}
```

All the links are collected in one place and the `name` and `email` properties of `reporter` have been merged as `ident`.

With `jsonpath-lifter` you can easily make a function to perform the transformation.

```javascript
const lifter = require("jsonpath-lifter");

// Make a new lifter
const lift = lifter(
  {
    src: "$.reporter",
    dst: "$.ident",
    via: rep => `${rep.name} <${rep.email}>` // translate value
  },
  {
    src: ["$.links[*]", "$.repos[*].u"], // multiple paths
    dst: "$.links",
    mv: true // allow multiple values
  }
);

const got = lift(doc);
```

This is a simple example. Read on to discover more complex rules and the interesting ways in which they can be composed.
## API

To create a new `lift` function call `lifter` which a list of rules. Any nested arrays in the input arguments will be flattened.

```javascript
const lift = lifter({ dst: "$.id", src: "$.serial" });
```

If any of the (flattened) arguments is a function it will be called with the same signature as the lift function itself when the lift function is used. This allows existing lifters to be composed together.

```javascript
const liftMeta = lifter({ ... });
const liftTimes = lifter({ ... });
const lift = lifter(
  { dst: "$.id", src: "$._id" },
  liftMeta,
  liftTimes
);
```

The returned `lift` is a function which accepts up to three arguments.

### lift(doc[, outDoc[, $]])

Argument | Meaning
---------|--------
`doc`    | The document to transform
`outDoc` | The output document to write to; automatically created if none passed
`$`      | A general purpose context variable which is passed to `via` and `dst` callbacks

The return value is the output document - either `outDoc` or a newly created object if `outDoc` is `undefined`.

The `lift` function has a couple of methods.

### lift.add(...rules)

Add additional rules to this lifter.

```javascript
lift.add({ set: () => new Date().toISOString(), dst: "$.modified"});
```

As for `lifter` any arrays of rule will be flattened.

### async lift.promise(doc[, outDoc[, $]])

Lift the supplied `doc` and return a promise that resolves when all of the promises in `outDoc` have resolved. Accepts the same arguments as the `lift` function itself.

## Rules

A lifter is a set of rules that are applied one after another to an input document to produce an output document. A rule is an object that may contain the following properties.

Property | Meaning 
---------|--------
`src`    | The source JSONPath to extract data from. May match multiple fields. May be an array of JSONPaths
`set`    | Used instead of `src` to provide a constant or computed value
`dst`    | JSONPath to write values to in the output document
`via`    | A function to cook the value with. May be another lifter or an array of rules (which will be compiled into a lifter)
`mv`     | True to make `dst` an array that receives all matched values
`clone`  | True to clone values copied from the source document
`leaf`   | `src` will only match leaf nodes

Let's take a look at them in more detail.

### src

Specify the JSONPath in the input document where this rule will look for values. It can be any valid JSONPath. If it matches at multiple points in the source document this rule will be executed once for each match.

```javascript
// Normalise ID: may in in _id, ident or _uuid
const idNorm = lifter({ src: ["$._id", "$.ident", "$._uuid"], dst: "$.ID" });
```

When there are multiple matches the effect depends on the settings of `dst` and `mv`. By default the last matching value will overwrite any previous values but see [mv](#mv) and [dst](#dst) for ways of gathering multiple values with a single rule.

### set

To add a value to the output document without having to match anything use `set`.

```javascript
lift.add(
  // Add modified stamp
  { set: () => new Date().toISOString(), dst: "$.modified"},
  // Say we were here
  { set: "FooMaching", dst: "$.processedBy" }
);
```

To compute the value dynamically `set` should be a function. It is called with two arguments: the input document and the `$` context.

```javascript
lift.add(
  { set: (doc, $) => `${doc.id}-${$.rev}`, dst: "$.stamp" }
);
```    

Set requires `dst` to be set and to be a literal JSONPath.

Every rule must contain either a `src` or `set` property. 

### dst

Specify the path in the output document where the matched value should be stored. For `set` `dst` is required and must be a JSONPath.

For `src` `dst` can take the following values

Value           | Meaning
----------------|----------
JSONPath string | The location in the output document for this value
A function      | Called with (`value`, `path`, `$`) - should return the JSONPath to use
`false`         | Disable writing to output document. Assumes `via` has side effects that we need
Missing         | Use the path in the input document where this value was found.

When `dst` is a JSONPath string and `mv` is not set each matching value will be written to the same location in the output document and only the last match will remain. If you supply a function as `dst` it can supply an output path based on the input path, the matched value and the context (`$`). Each match can be placed in a different location in the output document.

If `dst` is missing altogether the concrete path where each value was found will be used unaltered. Here's an example that makes a skeleton document that contains all the `id` fields in their original locations but nothing else.

```javascript
const liftIDs = lifter({ src: "$..id" });
```

### via

Values found in the input document may be modified before assigning them to the output document. Let's build on the previous example to convert all found ids to lower case.

```javascript
const liftIDs = lifter({ src: "$..id", via: id => id.toLowerCase() });
```

The `via` function is called with (`value`, `path`, `$`) and should return the value to be assigned to the output document. 

The signature of the `via` function is the same as that of `lifter` function. That means that lifters can be reused and composed easily.

```javascript
const liftMeta = lifter( { ... } );
const lift = lifter( { src: "$.meta", dst: "$.metadata", via: liftMeta } );
```

You may specify `via` as an array of rules which is a shorthand for supplying a nested lifter.

```javascript
const lift = lifter({
  src: "$.info",
  dst: "$.meta", 
  via: [
    { src: "$.name", dst: "$.moniker" },
    { src: "$.modified", 
      dst: "$.updated", 
      via: mod => new Date(mod).toISOString() }
  ]
});
```

### mv

Normally a single value is assigned to each location in the output document. However if 'mv' is set to 'true' the corresponding `dst` (however computed) is treated as an array into which each matching value is pushed.

```javascript
const collectLinks = lifter({
  dst: "$.links",
  mv: true,
  src: [ "$.link[*]", "$..info.link" ]
});
```

In the above example the output document would contain an array at `links` containing all of the links found at `$.link[*]` and `$..info.link`.

### clone

Set `clone` to deep clone each value before copying it into the output document.

```javascript
const lift = lifter(
  { dst: "$.meta", src: "$.metadata", clone: true }, 
  // Without clone this would alter the source document's
  // metadata object - because meta would be a reference
  // to it.
  { dst: "$.meta.author", src: "$.author" }
);
```

### leaf

Set `leaf` to force the `src` JSONPath to match only leaf nodes - i.e. not nodes containing an object or an array.

## Performance

Behind the scenes `jsonpath-lifter` uses [`jsonpath-faster`](https://www.npmjs.com/package/jsonpath-faster) which compiles JSONPath expressions into Javascript and caches the resulting functions. All of the `src` JSONPaths in a lifter are compiled into a single Javascript function which then dispatches to callbacks which handle the outcome of each rule. It's designed to be as fast and efficient as possible and is used in production as part of a processing pipeline which handles millions of complex documents an hour.

## License

[MIT](LICENSE)