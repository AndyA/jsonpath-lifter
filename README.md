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



## License

[MIT](LICENSE)