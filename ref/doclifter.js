"use strict";

const jp = require("jsonpath-faster");
const _ = require("lodash");
const MW = require("mixwith");

/**
 * Apply a recipe of transformation rules to data structures. Rules use JSONPath addressing
 * to target deep elements in the structure.
 *
 * ```js
 * const DocLifter = require("doclifter");
 *
 * const dl = new DocLifter([
 *   {
 *     // copy whole document
 *     src: "$",
 *     dst: "$"
 *   },
 *   {
 *     // parse a timestamp
 *     src: "$.meta.published_time",
 *     transform: t => moment(t),
 *     dst: "$.published_time"
 *   }
 * ]);
 *
 * const outDocs = inDocs.map(dl.transform);
 * ```
 *
 * ## Recipes
 *
 * A recipe is an array of rules to be applied in sequence to an input document to
 * create an output document. Each rule potentially copies some data from the input
 * document into the output document.
 *
 * Here's a simple recipe:
 *
 * ```js
 * const dl = new DocLifter([{ src: "$.meta.title", dst: "$.title" }]);
 * ```
 *
 * It contains a single stage that plucks $.meta.title from a document and produces
 * a new docment containing only $.title.
 *
 * ## Rules
 * 
 * Rules may contain the following properties
 *
 * ### recipe    
 *
 * A nested recipe to translate via. May be an array of rules, a DocLifter or a function
 * that will return an array of rules of a DocLifter.
 *
 * ### transform
 *
 * A function or Lifter to transform the value.
 *
 * ### clone
 *
 * Clone src into dst rather than merely copying the ref.
 *
 * ### mv
 *
 * Multivalue: dst is an array into which each matching src is pushed.
 *
 * ### src
 *
 * One or more source paths for this rule to check. The rule will be executed once for
 * each matching value on each of the supplied paths.
 *
 * ### leaf
 *
 * Rule will only match leaf nodes.
 *
 * ### set
 *
 * Provide a constant. One of `src` or `set` must be supplied. Is either the value to
 * set or a function returning a value to set
 *
 * ### dst
 *
 * Destination path to assign to. May be a function that returns a path. May be omitted
 * if `src` is used in which case `dst` = `src`.
 *
 */

class DocLifter extends MW.mix(class {}).with(require("./mixin/lifter")) {
  /**
   * @param {Array} recipe - an array of rules to be applied to each document
   */
  constructor(recipe = []) {
    super();
    this._doclifter_recipe = _.castArray(recipe);
  }

  lift(doc, ctx = {}) {
    return this.constructor.liftDoc(this.recipe, doc, ctx);
  }

  /**
   * Apply a recipe to a single doc object.
   * @param {Array} recipe - an array of rules to apply to the document
   * @param {Object} doc - the object to transform
   * @return {Object} - the transformed object
   */
  static liftDoc(recipe, doc, ctx = {}) {
    if (!doc) throw new Error("Missing document");
    if (!_.isObject(doc)) return doc;

    let out = {};
    const set = new Set();
    let lctx = ctx;

    const ctxPath = path => path.replace(/^@/, "$");

    const jpValue = (path, ...args) => {
      if (path[0] === "@") {
        // Copy on write
        if (lctx === ctx && args.length) lctx = Object.assign({}, ctx);
        return jp.value(lctx, ctxPath(path), ...args);
      }

      return jp.value(out, path, ...args);
    };

    const jpNodes = path => {
      if (path[0] === "@") return jp.nodes(lctx, ctxPath(path));
      return jp.nodes(doc, path);
    };

    const ruleAction = (rule, value, dst) => {
      if (rule.recipe) {
        const recipe = _.isFunction(rule.recipe)
          ? rule.recipe(doc, lctx)
          : rule.recipe;
        value = _.isFunction(recipe.lift)
          ? recipe.lift(value, lctx)
          : this.liftDoc(recipe, value, lctx);
      }

      if (value === undefined) return;
      if (rule.transform) value = rule.transform(value, doc);
      if (value === undefined) return;

      if (dst !== "$" && rule.clone) value = _.cloneDeep(value);

      if (rule.mv) {
        if (dst === "$") throw new Error("Root node may not be multivalued");
        let rv = jpValue(dst);
        if (!rv) jpValue(dst, (rv = []));
        if (!_.isArray(rv)) throw new Error(dst + " is not an array");
        rv.push(value);
      } else {
        if (set.has(dst)) throw new Error(dst + " already set");
        if (dst === "$") {
          if (set.size)
            throw new Error("Root node must be copied before any others");
          // Make sure we preserve our input
          out = _.cloneDeep(value);
        } else {
          jpValue(dst, value);
        }
      }

      set.add(rule.dst);
    };

    const getDest = (rule, node, value) => {
      if (rule.dst && _.isFunction(rule.dst))
        return rule.dst(jp.stringify(node.path), value, lctx);
      return rule.dst || jp.stringify(node.path);
    };

    for (const rule of recipe) {
      if (rule.set) {
        if (rule.dst === undefined) throw new Error("Missing dst in rule");
        const v = _.isFunction(rule.set) ? rule.set(doc, lctx) : rule.set;
        ruleAction(rule, v, rule.dst);
        continue;
      }

      if (rule.src) {
        for (const src of _.castArray(rule.src)) {
          const nodes = jpNodes(src);
          for (const node of nodes) {
            const v = node.value;
            if (rule.leaf && (_.isArray(v) || _.isPlainObject(v))) continue;
            if (v === undefined) continue;
            ruleAction(rule, v, getDest(rule, node, v));
          }
        }
        continue;
      }

      throw new Error("Missing src/set in rule");
    }

    return out;
  }

  static via(recipe) {
    return doc => this.liftDoc(recipe, doc);
  }

  get recipe() {
    return this._doclifter_recipe;
  }
}

module.exports = DocLifter;
