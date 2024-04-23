import isReference from 'is-reference';
import { CodeGenerator as _CodeGenerator } from '@babel/generator';
const CodeGenerator = _CodeGenerator;

export default function cacheJsx(babel, { enable = false, version = 2 } = {}) {
  const { types: t, template } = babel;
  const stack = [];
  const HOISTED = new WeakMap(); // 似乎是记录被遍历处理过的path
  const CACHED_VARS = new Set();
  // deal with @no-jsx-cache comment
  const noCacheVisitor = {
    // upon enter these nodes, we check if it's marked with the comment
    enter(path, state) {
      if (
        path.has('leadingComments') &&
        path.get('leadingComments.0.value').node.trim() === '@no-jsx-cache'
      ) {
        // and record the node into disabled state
        state.disabled.push(path.node);
      }
    },
    // upon exit the nodes, we need to clear the disabled state
    exit(path, state) {
      if (state.disabled.at(-1) === path.node) {
        state.disabled.pop();
      }
    },
  };
  return {
    name: 'cache-jsx',
    visitor: {
      // initialize local states variables
      Program(_path, state) {
        state.extractDependency = extractDependency;
        // this one is used to record and skip those FCs that are commented with //@no-jsx-cache
        state.disabled = [];
      },
      JSXElement: {
        enter(path, state) {
          var _a;
          // if plugin is not enabled, stop the traversal
          if (!enable) return;
          // this means the JSXElement is marked inside a FC with comment @no-jsx-cache, so we skip traversing the children
          if (state.disabled.length > 0) return path.skip();
          if (HOISTED.has(path.node)) return; // 如果已经处理过??
          // components after jsx transform, could be treated as anohter dependency,
          // doing this prevent it from recorded later
          CACHED_VARS.add(path.get('openingElement.name').node);
          // 取stack的第一个元素和当前path.node比较，不知为啥要这样写
          if (
            ((_a = stack.at(-1)) === null || _a === void 0
              ? void 0
              : _a[0].node) !== path.node
          ) {
            // 如果不相等，则入栈当前path。所以stack存的是还未遍历过的jsx元素??
            stack.push([path, new Map(), { bailOut: false }]);
          }
          // 处理jsx元素的特殊属性
          for (const attribute of path
            .get('openingElement')
            .get('attributes')) {
            // 什么情况下不是jsxattribute呢??
            if (!attribute.isJSXAttribute()) continue;
            if (!attribute.get('name').isJSXIdentifier()) continue;
            // 获取property的名字
            const attributeName = attribute.get('name').node.name;
            // remove unused properties for ssr, such as event listeners
            if (
              (attributeName.startsWith('on') && attributeName !== 'onFlush') ||
              attributeName === 'ref'
            ) {
              attribute.remove();
            }
            // 什么元素会带上这属性呢?? 不能cache吗?
            if (attributeName === 'dangerouslySetInnerHTML') {
              // 给stack里面所有元素的bailout设为true，即不缓存处理
              return bailout();
            }
          }
        },
        exit(path) {
          if (!enable) return;
          if (HOISTED.has(path.node)) return;
          const [, dependencies, { bailOut }] = stack.pop();
          HOISTED.set(path.node, true); // 标记处理过?
          if (bailOut) return; // 标记不缓存处理

          // 该程序的scope，即在最上层开始定义缓存变量，作内存缓存
          const targetScope = path.scope.getProgramParent();
          // 意味着到了当前1st-level JSXElement遍历完毕
          if (stack.length === 0) {
            for (const [, { paths }] of dependencies) {
              for (const p of paths) {
                if (p.scope !== path.scope) {
                  // bail out  这里没看懂？？？？
                  return;
                }
              }
            }
          }
          // 开始在当前程序的顶部生成代码
          const cached_jsx = targetScope.generateUidIdentifier('cached_jsx');
          // add a variable to targetScope
          targetScope.push({ id: cached_jsx });
          CACHED_VARS.add(cached_jsx);
          let condition = cached_jsx;
          let prelude = [];
          const keys = [...dependencies.keys()].reverse();
          for (const key of keys) {
            const dep = dependencies.get(key);
            if (version === 1) {
              // method 1
              if (!dep.lastName) {
                dep.lastName = targetScope.generateUidIdentifier(`last_${key}`);
                targetScope.push({ id: dep.lastName });
                replaceWith(
                  dep.paths[0],
                  template.expression.ast`(${dep.lastName} = ${dep.nodes[0]})`
                );
                CACHED_VARS.add(dep.lastName);
              }
              condition = template.expression
                .ast`${condition} && ${dep.lastName} === ${dep.nodes[0]}`;
            }
            // method 2
            if (version === 2) {
              if (!dep.condition) {
                const lastName = targetScope.generateUidIdentifier(
                  `last_${key}`
                );
                targetScope.push({ id: lastName });
                dep.lastName = lastName;
                dep.condition = path.scope.generateUidIdentifier(
                  `condition_${key}`
                );
                dep.conditionInit = template.expression
                  .ast`${lastName} === (${lastName} = ${dep.nodes[0]})`;
                path.scope.push({ id: dep.condition });
                dep.paths.forEach((path) => replaceWith(path, lastName));
                CACHED_VARS.add(dep.condition).add(lastName);
              } else {
                dep.paths.forEach((path) => replaceWith(path, dep.lastName));
              }
              condition = template.expression
                .ast`${condition} && ${dep.condition}`;
              if (stack.length === 0 || stack.at(-1)[2].bailOut) {
                prelude.push(
                  template.expression
                    .ast`${dep.condition} = ${dep.conditionInit}`
                );
              }
            }
          }
          const set_cache = t.assignmentExpression('=', cached_jsx, path.node);
          let replacement =
            dependencies.size === 0
              ? template.expression.ast`(${condition} || ${set_cache})`
              : t.conditionalExpression(condition, cached_jsx, set_cache);
          // Expression composed of other expressions, separated by the comma operator
          if (prelude.length > 0) {
            replacement = t.sequenceExpression([...prelude, replacement]);
          }
          if (
            path.parentPath.isJSXElement() ||
            path.parentPath.isJSXAttribute()
          ) {
            // 属性的情况下，用{}包含代码
            replacement = t.jsxExpressionContainer(replacement);
          }
          replaceWith(path, replacement);
        },
      },
      CallExpression(path) {
        // after react transform, we might go in to traverse the transformed nodes
        // in that case we should skip collecting dependencies
        const callee = path.get('callee');
        if (
          callee.isMemberExpression() &&
          callee.get('object').isIdentifier({ name: 'React' }) &&
          callee.get('property').isIdentifier({ name: 'createElement' })
        ) {
          path.skip();
        }
        if (
          callee.isIdentifier({ name: '_jsx' }) ||
          callee.isIdentifier({ name: '_jsxs' })
        ) {
          path.skip();
        }
      },
      // consider these cases of react components?
      FunctionDeclaration: noCacheVisitor,
      VariableDeclaration: noCacheVisitor,
      Identifier: extractDependencyFromIdentifier,
    },
  };
  function bailout() {
    for (let i = 0; i < stack.length; i++) {
      stack[i][2].bailOut = true;
    }
  }
  function isImportFrom(path, regexp) {
    if (!path.isReferencedIdentifier()) return false;
    const binding = path.scope.getBinding(path.node.name);
    if (!binding || binding.kind !== 'module') return false;
    const bindingParent = binding.path.parentPath;
    if (!bindingParent.isImportDeclaration()) return false;
    return regexp.test(bindingParent.node.source.value);
  }
  function extractDependency(name, node, path) {
    let prevDep;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i][1].has(name)) {
        prevDep = stack[i][1].get(name);
        break;
      }
    }
    if (!prevDep) {
      prevDep = { nodes: [node], paths: [path] };
    } else {
      prevDep.nodes.push(node);
      prevDep.paths.push(path);
    }
    for (const [, map] of stack) {
      if (!map.has(name)) {
        map.set(name, prevDep);
      }
    }
  }
  //
  function getMember(path) {
    let parent = path.parentPath;
    // something like this: o.b.a
    while (parent.isMemberExpression()) {
      path = parent;
      parent = parent.parentPath;
    }
    // o.b.a()
    if (parent.isCallExpression({ callee: path.node })) {
      path = parent;
    }
    // o.b.a++
    if (parent.isUpdateExpression()) {
      // cache is useless if the dependencies always change on every render
      bailout();
    }
    return { name: generate(path.node), node: path.node, path };
  }
  function extractDependencyFromIdentifier(path, state) {
    if (!enable) return;
    if (!stack.length) return;
    if (stack.at(-1)[2].bailOut) return;
    if (CACHED_VARS.has(path.node)) return;
    if (
      // @ts-expect-error is reference and babel doesnt work well in types
      !isReference(path.node, path.parent) ||
      path.parentPath.isObjectProperty({ key: path.node }) ||
      path.parentPath.isVariableDeclarator({ id: path.node })
    )
      return;
    // if the variable is imported from .css or .scss, do not treat as dynamic variable
    if (isImportFrom(path, /\.s?css/)) return;
    // do not treat classnames as dynamic
    if (isImportFrom(path, /^classnames$/)) return;
    if (isImportFrom(path, /^react$/)) return;
    if (path.node.name === 'React') return;
    if (path.scope !== stack[0][0].scope) return bailout();
    // if it is referenced in style attribute, eg: style={this_variable}
    // marking this_variable as dependencies is useless, because object reference could change
    // need to expand it up
    if (
      path.parentPath.parentPath.isJSXAttribute() &&
      path.parentPath.parentPath.get('name').isJSXIdentifier({ name: 'style' })
    ) {
      const binding = path.scope.getBinding(path.node.name);
      if (binding) {
        if (binding.path.isVariableDeclarator()) {
          cacheDeclarator(binding.path, state);
        }
      }
    }
    // if parent is a function call, use parent instead
    // should cache the return value of fn
    // something like this: this_variable()
    if (path.parentPath.isCallExpression({ callee: path.node })) {
      state.extractDependency(
        generate(path.parentPath.node),
        path.parent, // Node
        path.parentPath // Path(reactive representation of a node with relation info of Nodes)
      );
      return;
    }
    const { name, node, path: memberPath } = getMember(path);
    state.extractDependency(name, node, memberPath);
  }
  function cacheDeclarator(path, state) {
    if (!path.has('init')) return;
    const init = path.get('init');
    if (CACHED_VARS.has(path.node)) return;
    CACHED_VARS.add(path.node);
    const dependencies = new Map();
    init.traverse(
      {
        Identifier: extractDependencyFromIdentifier,
      },
      // state.extractDependency
      Object.assign(Object.assign({}, state), {
        extractDependency(name, node, path) {
          if (dependencies.has(name)) {
            dependencies.get(name).nodes.push(node);
            dependencies.get(name).paths.push(path);
          } else {
            dependencies.set(name, { nodes: [node], paths: [path] });
          }
        },
      })
    );
    const targetScope = path.scope.getProgramParent();
    const lastDeclarator = targetScope.generateUidIdentifier(`last_value`);
    targetScope.push({ id: lastDeclarator });
    let condition;
    if (dependencies.size > 0) {
      condition = template.expression.ast`+(!!${lastDeclarator})`;
      const keys = Array.from(dependencies.keys()).reverse();
      for (const key of keys) {
        const { nodes, paths } = dependencies.get(key);
        const lastName = targetScope.generateUidIdentifier(`last_${key}`);
        targetScope.push({ id: lastName });
        const compare = template.expression
          .ast`+(${lastName} === (${lastName} = ${nodes[0]}))`;
        condition = template.expression.ast`${condition} + ${compare}`;
        paths.forEach((path) => replaceWith(path, lastName));
      }
      condition = template.expression.ast`(${condition}) === ${t.numericLiteral(
        dependencies.size + 1
      )}`;
    } else {
      condition = lastDeclarator;
    }
    replaceWith(
      init,
      template.expression
        .ast`${condition} ? ${lastDeclarator} : (${lastDeclarator} = ${init.node})`
    );
  }
  function replaceWith(path, node) {
    path.replaceWith(node);
  }
}
function generate(ast) {
  return new CodeGenerator(ast).generate().code;
}
