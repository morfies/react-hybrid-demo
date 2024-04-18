const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: './src/index.tsx', // Entry point of your application
  output: {
    filename: 'static/bundle.js', // Output bundle file name
    path: path.resolve(__dirname, 'dist'), // Output directory
    clean: true,
  },
  plugins: [new HtmlWebpackPlugin()],
  module: {
    rules: [
      // {
      //   test: /\.tsx?$/,
      //   use: 'ts-loader',
      //   exclude: /node_modules/,
      // },
      // https://stackoverflow.com/questions/38320220/how-to-setup-typescript-babel-webpack
      {
        test: /\.(js|jsx|tsx|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  devServer: {
    port: 3000, // Port for the development server
    open: true, // Open the default web browser when the server starts
  },
};
