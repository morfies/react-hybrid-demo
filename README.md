# ssr demo

This demo is a forked version of github react-ssr-example.

I am using this to test v18 ssr. V18 has stricter hydration content mis-match checking, for example, you can return an extra `div` from server html to see the error message.

And test other things:

- https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
- Suspense will generate `<!--$-->` comment separator
- v18 with new APIs has stricter hydration content match checking, can try to add an extra `div` layer from ssr html to see the error.
- If using v18 still with old v17 APIs, the whole app actually just stays in v17 logic, no v18 features are introduced, including stricter checking or auto-batching etc.
- CSR is v18 based and build the dist first, then we switch server to v17 and then build server only, then we start the server. This way we test if hydration compatable between versions.
  - v17 domServer doesn't support `Suspense`

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

#### `npm run dev:build-server`

This is to build server code into `server-build/index.js`,
then we can run `npm run dev:start-server` to start the express server locally to serve ssr html.

The served html is from `./dist/index.html`, which has our client-side `bundle.js` injected already. So after been loaded, client-side bundle will do the hydration upon calling `hydrateRoot`.

## webpack

- webpack.config.js is used for csr
- webpack.server.js is used for ssr

## Improvement

### Basic

In the server, we use `ReactDOMServer.renderToString` to render our app to html and return.

This way has a few pitfalls:

- Server only returns when the whole app finishes rendering, namely slow data fetching if any in parts of the app can slow the whole process down.
- Client side needs the whole app's bundle.js to do hydration, namely before becoming interactive, a large bundle.js file needs to be downloaded and loaded.

We can try to improve this by using v18 streaming and Suspense.

### Advanced

(https://github.com/reactwg/react-18/discussions/37)

Things we want to add:

- Add more components with `Suspense` or `lazy`
  - Selective Hydration
- Use react-query for data-fetching
- Test if initial bundle is splited
- Test if Suspense is streamed partially as expected and check the partial returned data(with js to hydrate this part of UI? From the doc, this is no, client js bundles can be splited by `lazy`)
- Test when Suspense failed ssr, how does csr kick in?
- Use `renderToPipableStream` api
- If a hydration content mis-match error happens, the app will fallback to csr, meaning in this case, the whole csr bundle.js will take control and generate the DOM and event handlers totally.(The server can return absolutely different html than the client to test)

# Take aways

## URLs(traditional vs hash)

You can see that multi-page apps(traditional urls) are usually achieved with hybrid mode,
for example, if you start the csr `npm start` and visit `http://localhost:3000/article` directly, you will encounter with page not found error.
This is because the server has no such path `/article` only `/` which serves `index.html` file. We are only using `BrowserRouter`, meaning all the routers are client-side routing.

SPA works with hash routes, meaning the server always receives `/` path, leaving the client js to resolve the hash part and then render the correct page compoment.
