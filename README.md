# ssr demo

This demo is a forked version of github react-ssr-example.

I am using this to test v18 ssr. V18 has stricter hydration content mis-match checking, for example, you can return an extra `div` from server html to see the error message.

And test other things:

- https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
- Suspense will generate `<!--$-->` comment separator
- v18 with new APIs has stricter hydration content match checking, can try to add an extra `div` layer from ssr html to see the error.
- If using v18 still with old v17 APIs, the whole app actually just stays in v17 logic, no v18 features are introduced, including stricter checking or auto-batching etc.

## scripts

#### `npm start`

This is to start the static dev server for the app.

#### `npm run build`

This is to build the static app and outputs are stored in `dist/` folder:

- bundle.js: our client side js bundle file, including app code and react as such libraries.
- index.html: this is the app's entry html with our bundle.js injected

> I intentionally bundle with `development` mode to better see error messages for local development.

#### `npm run dev`

This will build our client side code and server side code for this app, and then start the server.

After this command, you can visit our hybrid app at localhost:3006

## webpack

- webpack.config.js is used for csr
- webpack.server.js is used for ssr
