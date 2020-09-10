"use strict";

const jp = require("jsonpath-faster");
const _ = require("lodash");

const lifter = (...recipe) => {
  const nest = jp.string.nest();

  const liftNest = (nest, doc, out, $) => {
    $ = $ || {};
    const local = $.local || {};
    const ctx = { ...$, doc, out, local: { ...local } };
    nest(doc, ctx);
    return ctx.out;
  };

  const lift = (doc, out, $) => liftNest(nest, doc, out, $);

  const cookVia = via => {
    if (!via || _.isFunction(via)) return via;
    if (_.isArray(via)) return lifter(via);
    throw new Error(`via must be a function or a recipe array`);
  };

  const isLocal = path => /^@/.test(path) && path.replace(/^@/, "$");

  const addRule = rule => {
    if (_.isFunction(rule)) return addRule({ src: "$", via: rule });

    const { src, dst, set, via, mv, clone, leaf, ...rest } = rule;

    const unknown = Object.keys(rest).sort();
    if (unknown.length)
      throw new Error(`Unknown properties in rule: ${unknown.join(", ")}`);

    const realVia = cookVia(via);

    const action = (value, dst, $) => {
      const ld = isLocal(dst);
      const key = ld ? "local" : "out";
      const path = ld || dst;

      if (clone) value = _.cloneDeep(value);
      if (realVia) value = realVia(value, jp.value($[key] || {}, path), $);

      $[key] = jp.visit($[key], path, v => {
        if (mv) return (v || []).concat(value);
        return value;
      });
    };

    if (set) {
      if (src) throw new Error(`Can't have src and set`);
      if (!dst) throw new Error(`No dst for set`);
      return nest.visitor("$", (v, p, $) =>
        action(_.isFunction(set) ? set($.doc) : set, dst, $)
      );
    }

    if (!src) throw new Error(`Missing src / set`);

    const handler = dst
      ? _.isFunction(dst)
        ? (value, path, $) => action(value, dst(value, path, $), $)
        : (value, path, $) => action(value, dst, $)
      : (value, path, $) => action(value, path, $);

    const n = leaf ? nest.leaf : nest;
    for (const path of _.castArray(src)) {
      const localPath = isLocal(path);
      if (localPath) {
        const localNest = jp.string.nest().visitor(localPath, handler);
        n.visitor("$", (v, p, $) => liftNest(localNest, $.local, $.out, $));
      } else {
        n.visitor(path, handler);
      }
    }
  };

  const self = Object.assign(lift, {
    add(...recipe) {
      for (const rule of _.flattenDeep(recipe)) addRule(rule);
      return this;
    }
  });

  return self.add(recipe);
};

module.exports = lifter;
