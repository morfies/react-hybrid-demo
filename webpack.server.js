const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'development',
  entry: './server/index.tsx',
  target: 'node',
  // in order to ignore built-in modules like path, fs, etc.
  externalsPresets: { node: true },
  // All node modules will no longer be bundled but will be left as require('module')
  // externals: [nodeExternals()],
  output: {
    path: path.resolve('server-build'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        // for server side, we only need babel-loader to transpile jsx to plain js
        use: 'babel-loader',
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
};
