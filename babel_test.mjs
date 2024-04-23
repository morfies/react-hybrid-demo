import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { CodeGenerator } from '@babel/generator';
import * as t from '@babel/types';

let added = false;
const stack = [];

const code = `
import React from 'react';
function handleClick(){}
var name={};
var Text = () => <div
    style={name}
    onClick={handleClick}
    dangerouslySetInnerHTML={{__html:'ooo'}}
  >
  hello
  <p>xx</p>
</div>;
`;
const ast = parse(code, {
  sourceType: 'module',
  plugins: ['jsx'],
});

traverse.default(ast, {
  Program(_path, state) {
    console.log('program visited');
  },
  JSXElement: {
    enter(path, state) {
      console.log('jsxelm enter', path.get('openingElement.name').node.name);
      stack.push(path);
      for (const attr of path.get('openingElement').get('attributes')) {
        // console.log('attr isJSXAttribute', attr.isJSXAttribute());
        // console.log(
        //   'attr name isJSXIdentifier',
        //   attr.get('name').isJSXIdentifier()
        // );
        const attrName = attr.get('name').node.name;
        // console.log('attr name:', attrName);
        // this way we can remove the onClick prop
        if (attrName.startsWith('on')) {
          attr.remove();
        }
      }
    },
    exit(path, state) {
      const eleName = path.get('openingElement.name').node.name;
      console.log('jsxelm exit', eleName);
      stack.pop();
      console.log('stack len:', stack.length);
      const targetScope = path.scope.getProgramParent();
      // the whole AST is reactive, meaning after we adding these identifiers, the Identifier will traverse them
      const cached_jsx = targetScope.generateUidIdentifier('cached_jsx');
      targetScope.push({ id: cached_jsx });

      // we can try to add a wrapper JSX element to see if it reactive
      // 现象：添加一层wrapper后，会重新开始遍历一次，包括所有的children节点
      if (eleName === 'div' && !added) {
        path.replaceWith(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier('Wrapper'), []),
            t.jsxClosingElement(t.jsxIdentifier('Wrapper')),
            [path.node]
          )
        );
        added = true;
      }
    },
  },
  Identifier(path, state) {
    console.log('identifier::', path.node.name);
  },
});

const output = new CodeGenerator(ast).generate().code;
console.log('======output:\n', output);
