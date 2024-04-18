// a simple example of jsx cache: https://github.com/jsx-plus/babel-plugin-transform-jsx-memo/tree/master

module.exports = function testPlugin({ types: t }) {
  return {
    visitor: {
      // only execute once
      Program(path) {
        console.log('====Program');
      },
      FunctionDeclaration(path, state) {
        console.log('======fn', state.opts);
        // { option1: true, option2: false }
      },
      Identifier(path) {
        // console.log('=====ident', path.node.name);
      },
      JSXElement: {
        enter(path, state) {
          console.log('enter JSXEle');
        },
        exit(path) {
          console.log('exit JSXEle');
        },
      },
    },
  };
};
