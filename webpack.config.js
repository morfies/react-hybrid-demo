const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: './src/index.js', // Entry point of your application
  output: {
    filename: 'bundle.js', // Output bundle file name
    path: path.resolve(__dirname, 'dist'), // Output directory
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve('public', 'index.html'),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      // react$: path.resolve(
      //   __dirname,
      //   'node_modules/react/cjs/react.development.js'
      // ),
      // 'react-dom$': path.resolve(
      //   __dirname,
      //   'node_modules/react-dom/cjs/react-dom.development.js'
      // ),
      // User$: path.resolve(__dirname, 'src/User.js'),
    },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000, // Port for the development server
    open: true, // Open the default web browser when the server starts
  },
};
