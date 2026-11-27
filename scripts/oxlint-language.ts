/* oxlint-disable language/missing-value, language/optional-type -- Oxlint AST nodes use distinct null and undefined values. */
import type { RuleTester } from "oxlint/plugins-dev";

type Rule = Parameters<RuleTester["run"]>[1];
type SourceCode = Parameters<Extract<Rule, { createOnce: unknown }>["createOnce"]>[0]["sourceCode"];
type Visitor = ReturnType<Extract<Rule, { createOnce: unknown }>["createOnce"]>;
type Node = Parameters<NonNullable<Visitor["BinaryExpression"]>>[0]["parent"];

/** Playwright serializes these callbacks without the module's runtime imports. */
function isSerializedPlaywrightCallback(node: Node, sourceCode: SourceCode) {
  for (let child = node; child.parent; child = child.parent) {
    const call = child.parent;
    if (
      (child.type !== "ArrowFunctionExpression" && child.type !== "FunctionExpression") ||
      call.type !== "CallExpression" ||
      call.callee.type !== "MemberExpression"
    ) {
      continue;
    }
    const member = call.callee;
    let method: unknown = undefined;
    if (member.computed) {
      if (member.property.type === "Literal") {
        method = member.property.value;
      }
    } else if (member.property.type === "Identifier") {
      method = member.property.name;
    }
    if (typeof method !== "string") {
      continue;
    }
    const argument = method === "$eval" || method === "$$eval" ? 1 : 0;
    if (
      call.arguments[argument] === child &&
      [
        "evaluate",
        "evaluateHandle",
        "evaluateAll",
        "waitForFunction",
        "addInitScript",
        "$eval",
        "$$eval",
      ].includes(method)
    ) {
      return sourceCode.ast.body.some(
        (statement) =>
          statement.type === "ImportDeclaration" &&
          (statement.source.value === "playwright" || statement.source.value === "playwright-core"),
      );
    }
  }
  return false;
}

const optionalType = {
  createOnce(context) {
    return {
      TSUnionType(node) {
        if (
          node.types.some(
            (member) => member.type === "TSNullKeyword" || member.type === "TSUndefinedKeyword",
          )
        ) {
          context.report({
            message:
              "This project treats null and undefined as the same missing value. Use Optional<T> for this type.",
            node,
          });
        }
      },
    };
  },
  meta: { docs: { description: "Use Optional<T> for missing values." }, type: "suggestion" },
} satisfies Rule;

const missingValue = {
  createOnce(context) {
    return {
      BinaryExpression(node) {
        if (!["==", "!=", "===", "!=="].includes(node.operator)) {
          return;
        }
        const checksMissingValue = [node.left, node.right].some(
          (operand) =>
            (operand.type === "Literal" && operand.value === null) ||
            (operand.type === "Identifier" &&
              operand.name === "undefined" &&
              context.sourceCode.isGlobalReference(operand)) ||
            (operand.type === "UnaryExpression" && operand.operator === "void"),
        );
        const checksUndefinedType =
          (node.left.type === "UnaryExpression" &&
            node.left.operator === "typeof" &&
            node.right.type === "Literal" &&
            node.right.value === "undefined") ||
          (node.right.type === "UnaryExpression" &&
            node.right.operator === "typeof" &&
            node.left.type === "Literal" &&
            node.left.value === "undefined");
        if (
          (checksMissingValue || checksUndefinedType) &&
          !isSerializedPlaywrightCallback(node, context.sourceCode)
        ) {
          context.report({
            message:
              "Both null and undefined count as missing. Use hasValue(value) to check for a value, or !hasValue(value) to check for a missing value.",
            node,
          });
        }
      },
    };
  },
  meta: { docs: { description: "Use hasValue for missing-value checks." }, type: "suggestion" },
} satisfies Rule;

const assertedValue = {
  createOnce(context) {
    return {
      TSNonNullExpression(node) {
        context.report({
          message:
            "A non-null assertion does not check the value at runtime. Use hasValue to branch, assertValue to throw if missing, or mapValue to transform a present value.",
          node,
        });
      },
    };
  },
  meta: {
    docs: { description: "Handle optional values explicitly instead of asserting non-null." },
    type: "suggestion",
  },
} satisfies Rule;

const recordMethods = {
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (node.object.type !== "Identifier" || node.object.name !== "Object") {
          return;
        }
        let method: string | undefined = undefined;
        if (node.computed) {
          if (node.property.type === "Literal" && typeof node.property.value === "string") {
            method = node.property.value;
          }
        } else if (node.property.type === "Identifier") {
          method = node.property.name;
        }
        if (method === "keys" || method === "entries" || method === "fromEntries") {
          if (!context.sourceCode.isGlobalReference(node.object)) {
            return;
          }
          if (isSerializedPlaywrightCallback(node, context.sourceCode)) {
            return;
          }
          context.report({ messageId: method, node });
        }
      },
    };
  },
  meta: {
    docs: { description: "Use the typed record helpers from games-common." },
    messages: {
      entries:
        "Object.entries loses the declared key type. Use entries from games-common/language to keep typed keys and values.",
      fromEntries:
        "Use fromEntries from games-common/language to preserve the entry key type in the resulting record.",
      keys: "Object.keys returns string[] and loses the declared key type. Use keys from games-common/language.",
    },
    type: "suggestion",
  },
} satisfies Rule;

const plugin = {
  meta: { name: "language" },
  rules: {
    "asserted-value": assertedValue,
    "missing-value": missingValue,
    "optional-type": optionalType,
    "record-methods": recordMethods,
  },
};

export default plugin;
