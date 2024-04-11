# ssr demo

The original demo starts from a forked version of github react-ssr-example.

I am using this to test v18 ssr. V18 has stricter hydration content mis-match checking, for example, you can return an extra `div` from server html to see the error message. With a single mismatch error, react will fallback to csr instead.

Along the way, I am trying to test things out:

- https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
- Suspense will generate `<!--$-->` comment separator, if you are building your own render service such as `tree-walker` and want to compatible with v18, these need to pay attention.
- v18 with new APIs has stricter hydration content match checking
- If using v18 still with old v17 APIs, the whole app actually just stays in v17 logic, no v18 features are introduced, including stricter checking or auto-batching etc.
- CSR is v18 based and build the dist first, then we switch server to v17 and then build server only, then we start the server. This way we test if hydration compatable between versions.
  - v17 domServer doesn't support `Suspense`
  - `renderToString` doesn't support Suspense boundary
  - todo

## scripts

#### `npm start`

This is to start the static dev server for the app. Namely if you want to see only CSR in action, use this command.

#### `npm run build`

This is to build the static app and outputs are stored in `dist/` folder:

- bundle.js: our client side js bundle file, including app code and react as such libraries.
  > This is also the bootstrapScripts for ssr `renderToPipeableStream`.
- index.html: this is the app's entry html with our bundle.js injected
  > Only used for CSR case.

> I intentionally bundle with `development` mode to better see error messages for local development.

#### `npm run dev`

This will build our client side code and server side code for this app, and then start the server.

After this command, you can visit our hybrid app at localhost:3006

#### `npm run dev:build-server`

This is to build server code into `server-build/index.js`,
then we can run `npm run dev:start-server` to start the express server locally to serve ssr html.

The served html is from `./dist/index.html`, which has our client-side `bundle.js` injected already. So after been loaded, client-side bundle will do the hydration upon calling `hydrateRoot`.

## How to start Hybrid

- First run `npm run build` to build our `bundle.js` into `dist/` folder
- Then run `npm run dev:build-server` to build server bundle into `server-build`
- Finally run `npm run dev:start-server` to start our server
- Visit `localhost:3006/` to see our hybrid application

## Webpack config

For simplicity, I only configured to support typescript and tsx. The reason to split into two config files is to generate different dist for server and client.

- webpack.config.js is used for csr
- webpack.server.js is used for ssr

## Applications

The SSR here we talk about are not actually pure SSR, it's hybrid mode, namely we also involve the client hydration phase and thus our application is fully interactive.

### Shared Setup

- `ServerEntry.tsx` is our react app entry for the server side
- `index.tsx` is our react app entry for the client side

The main difference is we need to use different routers from react-router-dom for client and server.

### Basic SSR with `renderToString`

> Branch `rendertostring`

Setup:

- Client is using `BrowserRouter` to support MPA like urls, while server is suing `StaticRouter` which will help to render the correct `path` with current `url` requested.
- In `index.tsx`, we are calling `hydrateRoot` to start our app in hybrid mode.
- Client build will generate:
  - `dist/bundle.js` the client js bundle, which is injected into template in `index.html`
  - `dist/index.html` the entry document that our server will return, with `bundle.js` injected
- Server build will generate:
  - `server-build/index.js` this is a js file that includes our express server and request handlers, basically it accepts two kinds of request:
    - static accsets, such as `/static/bundle.js` to request the js file for client hydration
    - document requests, this will return our `index.html` file content, namely ssr generated content

In the server, we use `ReactDOMServer.renderToString` to render our app to html and return.

**This way has a few pitfalls:**

- Server only returns when the whole app finishes rendering, namely slow data fetching if any in parts of the app can slow the whole process down.
- Client side needs the whole app's bundle.js to do hydration, namely before becoming interactive, a large bundle.js file needs to be downloaded and loaded.
- Also `renderToString` doesn't support Suspense boundary in the server, namely concurrent rendering is not enabled. If we check the returned html from server we can see that the Suspense boundaries are not rendered correctly. Visit `/article` page and see the error in action.
  > Uncaught Error: The server did not finish this Suspense boundary: The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server

**In this basic version**, we get a simple understanding of react ssr/hybrid: The server needs to return the same html as the client's initial rendering, otherwise mismatch error will throw. Client hydration is acomplished by server html inject the `bundle.js` of our whole react app, upon loading of the js, hydration will happen in the client, only after this process, our application will become hydrated and interactive.

We can try to improve this by using v18 streaming and Suspense.

> Streaming: In HTTP streaming, data is sent as a continuous stream, allowing the client to start processing data as soon as it is received, without waiting for the entire react application to be transferred. This enables low-latency delivery and real-time interaction.

### Advanced SSR with `renderToPipeableStream`

(https://github.com/reactwg/react-18/discussions/37)

#### Tests to run

- Test when Suspense failed ssr, how does csr kick in?
- Use `renderToPipableStream` api
  - How to make api calls happen in server only?
    > This is complicated, let's explain in details at below🔽. The implementation is in `ReactQueryStreamedHydration`
  - Why the returned html seems been cached after the first visit?
    > Probably cached by `react-query`!
- If a hydration content mis-match error happens, the app will fallback to csr, meaning in this case, the whole csr bundle.js will take control and generate the DOM and event handlers totally.(The server can return absolutely different html than the client to test)

  - The first test: in `ServerEntry.js` add an extra shell layer html(a `div` for example), this will cause a mis-match with CSR thus an `hydration failure`. From the error and also the final html of the page we can tell that CSR is in action indeed.

    > Uncaught Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.

  - The second test: cause a mis-match inside a `Suspense`. Normally I think this kind of mismatch is caused by explicitly control different behiver by using ENV variables such as `_SERVER_RENDER_ ? <A /> : <B />`. In our example, we can first build csr bundle.js then modify a component and then only build the server bundle to cause this mismatch. For example, I add an `extra static string` in our `Sunrise` component, since this component has a delayed api call, will only finish rendering after the delay, the `extra static string` will be returned and rendered initially, but after suspense resolved, the mismatch happens, then revert to csr, causing the `extra static string` to disapper.
    > Uncaught Error: There was an error while hydrating this Suspense boundary. Switched to client rendering.

#### Things we want to add

- Add more components with `Suspense` or `lazy`
  - Selective Hydration
- Use react-query for data-fetching, which is said to support Suspense boundary
- Test if initial bundle is splited?
- ~~Test if Suspense is streamed partially as expected and check the partial returned data(with js to hydrate this part of UI? From the doc, this is no, client js bundles can be splited by `lazy`)~~

  - The above is incorrect: streaming is an http protocol, namely only a single connection with the server, but data is sent continuously in a stream instead of in discrete packets. And client will process whatever it gets so far from server.
  - In our example, if you visit ssr rendered `localhost:3006/article` page, you can see in network the document request is streaming in action, the request timeline actually lasts as long as our api returns, but the initial html is returned and rendered instantly, also hydrated selectively. Here is the returned html that react can handle with it's suspense:

#### Before we add `ReactQueryStreamedHydration`

This will be the final ssr html returned for `/article` page, but keep in mind that this html conent is not generated and returned in a single tick, it's actually lasts for 5 seconds, but since we are using streaming, this is a single http connection, and the client is rendered and hydrated gradually as the data chunks arrives, not blocking the UI interactivity.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>React App</title>
  </head>
  <body>
    <div class="App">
      <div>
        <nav>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/user">User</a>
            </li>
            <li>
              <a href="/article">Article</a>
            </li>
            <li>
              <a href="/nothing-here">Nothing Here</a>
            </li>
          </ul>
        </nav>
        <hr />
        <!--$-->
        <div style="border:1px dashed gray">
          <h1>This is an article page</h1>
          <!--$?-->
          <template id="B:0"></template>
          <div style="color:red">Loading...</div>
          <!--/$-->
        </div>
        <!--/$-->
      </div>
    </div>
  </body>
</html>
<script src="/static/bundle.js" async=""></script>
<div hidden id="S:0">
  <div>
    <p>On this beautiful day in HangZhou</p>
    <!--$-->
    <p>
      The sun rises at
      <!-- -->
      5:45:47 AM
    </p>
    <p>
      And sets at
      <!-- -->
      6:19:57 PM
    </p>
    <!--/$-->
  </div>
</div>
<script>
  function $RC(a, b) {
    a = document.getElementById(a);
    b = document.getElementById(b);
    b.parentNode.removeChild(b);
    if (a) {
      a = a.previousSibling;
      var f = a.parentNode,
        c = a.nextSibling,
        e = 0;
      do {
        if (c && 8 === c.nodeType) {
          var d = c.data;
          if ('/$' === d)
            if (0 === e) break;
            else e--;
          else ('$' !== d && '$?' !== d && '$!' !== d) || e++;
        }
        d = c.nextSibling;
        f.removeChild(c);
        c = d;
      } while (c);
      for (; b.firstChild; ) f.insertBefore(b.firstChild, c);
      a.data = '$';
      a._reactRetry && a._reactRetry();
    }
  }
  $RC('B:0', 'S:0');
</script>
```

Interestingly, we can see the initial html only has our `fallback` loading content, along with a `template` indicating our suspense boundary, but later as the server finishes Suspense, another partial chunk is streamed, react will then replace our loading content with this newly rendered content and at the same time do hydration of the part.

**[Duplication] APIs are called on both server and client**

At this point, actually our ssr is not perfect, you will see that even if our server has called api and got the data(our html even already has got the data injected in some way), once upon client hydration, the client will still send out api requests. Why?

**Reason**

The protocol is query SDK wise, react itself currently doesn't care about this, it only takes care of server concurrent rendering and streaming. So in server we have used react-query client to call api and get data, we need some protocol to let react-query client in the client-side to know the data has been retrieved and no need to call again on client-side. This protocol is done in our `ReactQueryStreamedHydration` lib.

Refer to [How to avoid client re-calling APIs for SSR?]() below to understand the implementation.

# Other take-aways

## URLs(traditional vs hash)

You can see that multi-page apps(traditional urls) are usually achieved with hybrid mode,
for example, if you start the csr `npm start` and visit `http://localhost:3000/article` directly, you will encounter with page not found error.
This is because the server has no such path `/article` only `/` which serves `index.html` file. We are only using `BrowserRouter`, meaning all the routers are client-side routing.

SPA works with hash routes, meaning the server always receives `/` path, leaving the client js to resolve the hash part and then render the correct page compoment.

## MPA

During the testing process, after I switched to `renderToPipeableStream` with hybrid mode, I found that even if I killed the server, che client pages can work normally as if an SPA, whithout requesting the server anymore(no api involved).

## http headers(CSR vs SSR-streaming)

- csr

```text
  Accept-Ranges: bytes
  Connection:keep-alive
  Date:Tue, 02 Apr 2024 06:12:13 GMT
  Etag:W/"196-+O0uBHqI7J6BBg8u60qIx52req0"
  Keep-Alive:timeout=5
  X-Powered-By:Express
```

- ssr

```text
  Connection:keep-alive
  Content-Type:text/html
  Date:Tue, 02 Apr 2024 06:24:08 GMT
  Keep-Alive:timeout=5
  Transfer-Encoding:chunked
  X-Powered-By:Express
```

In streaming scenarios, 'Transfer-Encoding: chunked' is commonly used to transmit data in smaller, more manageable pieces. Each chunk is preceded by its size in hexadecimal format, followed by a carriage return and line feed, the chunk data itself, and another carriage return and line feed. The final chunk is followed by a zero-sized chunk to indicate the end of the data stream.

This mechanism enables efficient streaming of large media files or data streams over HTTP, as it allows the server to start sending data to the client as soon as it becomes available, without needing to buffer the entire content in memory or on disk before transmission. It also facilitates better utilization of network resources and supports streaming scenarios where the total content length may be unknown or dynamically generated.

## SSR only happens for the first page visited

If you first visit `/` homepage, then click link to go to `/article`, namely by client-side navigation, you will see that no more document requests are sent to server. This means once our first page is requested(document along with our bundle.js), the following navigations are client-side-rendering and client-side navigation only. Unless you refresh the page, which will request from server again and thus SSR returned.

## How to avoid client re-calling APIs for SSR?

### The situation here is

In our `/article` page, we used `Suspense` to split our components into different parts, each calls a long-time-response api to get data.

Without wrapping `ReactQueryStreamedHydration`, the ssr returned html schema will be like above posted html content.

But, if we refresh the page, we can see both server and client will call apis as if the client doesn't know the server has already got the data. This is true.

Before we go into details, let's post a final html schema after wrapping with `ReactQueryStreamedHydration`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>React App</title>
  </head>
  <body>
    <div class="App">
      <div>
        <nav>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/user">User</a>
            </li>
            <li>
              <a href="/article">Article</a>
            </li>
            <li>
              <a href="/nothing-here">Nothing Here</a>
            </li>
          </ul>
        </nav>
        <hr />
        <!--$-->
        <div style="border:1px dashed gray">
          <h1>This is an article page</h1>
          <!--$?-->
          <template id="B:0"></template>
          <div style="color:red">Loading...</div>
          <!--/$-->
          <!--$?-->
          <template id="B:1"></template>
          <div style="color:blue">Loading...</div>
          <!--/$-->
        </div>
        <!--/$-->
      </div>
    </div>
  </body>
</html>
<script src="/static/bundle.js" async=""></script>
<script>
  window['__RQ:R2:'] = window['__RQ:R2:'] || [];
  window['__RQ:R2:'].push({
    mutations: [],
    queries: [
      {
        state: {
          data: {
            sunrise: '6:43:23 PM',
            sunset: '7:21:11 AM',
            solar_noon: '1:02:17 AM',
            day_length: '12:37:48',
            civil_twilight_begin: '6:20:25 PM',
            civil_twilight_end: '7:44:10 AM',
            nautical_twilight_begin: '5:51:57 PM',
            nautical_twilight_end: '8:12:37 AM',
            astronomical_twilight_begin: '5:23:00 PM',
            astronomical_twilight_end: '8:41:35 AM',
          },
          dataUpdateCount: 1,
          dataUpdatedAt: 1712217438706,
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          isInvalidated: false,
          status: 'success',
          fetchStatus: 'idle',
        },
        queryKey: ['sun-data', 0.4, 'America/Sao_Paulo'],
        queryHash: '["sun-data",0.4,"America/Sao_Paulo"]',
      },
    ],
  });
</script>
<div hidden id="S:1">
  <div>
    <p>
      On this beautiful day in
      <!-- -->
      America/Sao_Paulo
    </p>
    <!--$-->
    <p>
      The sun rises at
      <!-- -->
      6:43:23 PM
    </p>
    <p>
      And sets at
      <!-- -->
      7:21:11 AM
    </p>
    <!--/$-->
  </div>
</div>
<script>
  function $RC(a, b) {
    a = document.getElementById(a);
    b = document.getElementById(b);
    b.parentNode.removeChild(b);
    if (a) {
      a = a.previousSibling;
      var f = a.parentNode,
        c = a.nextSibling,
        e = 0;
      do {
        if (c && 8 === c.nodeType) {
          var d = c.data;
          if ('/$' === d)
            if (0 === e) break;
            else e--;
          else ('$' !== d && '$?' !== d && '$!' !== d) || e++;
        }
        d = c.nextSibling;
        f.removeChild(c);
        c = d;
      } while (c);
      for (; b.firstChild; ) f.insertBefore(b.firstChild, c);
      a.data = '$';
      a._reactRetry && a._reactRetry();
    }
  }
  $RC('B:1', 'S:1');
</script>
<script>
  window['__RQ:R2:'] = window['__RQ:R2:'] || [];
  window['__RQ:R2:'].push({
    mutations: [],
    queries: [
      {
        state: {
          data: {
            sunrise: '5:43:23 AM',
            sunset: '6:21:11 PM',
            solar_noon: '12:02:17 PM',
            day_length: '12:37:48',
            civil_twilight_begin: '5:20:25 AM',
            civil_twilight_end: '6:44:10 PM',
            nautical_twilight_begin: '4:51:57 AM',
            nautical_twilight_end: '7:12:37 PM',
            astronomical_twilight_begin: '4:23:00 AM',
            astronomical_twilight_end: '7:41:35 PM',
          },
          dataUpdateCount: 1,
          dataUpdatedAt: 1712217443729,
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          isInvalidated: false,
          status: 'success',
          fetchStatus: 'idle',
        },
        queryKey: ['sun-data', 5, 'Asia/Shanghai'],
        queryHash: '["sun-data",5,"Asia/Shanghai"]',
      },
    ],
  });
</script>
<div hidden id="S:0">
  <div>
    <p>
      On this beautiful day in
      <!-- -->
      Asia/Shanghai
    </p>
    <!--$-->
    <p>
      The sun rises at
      <!-- -->
      5:43:23 AM
    </p>
    <p>
      And sets at
      <!-- -->
      6:21:11 PM
    </p>
    <!--/$-->
  </div>
</div>
<script>
  $RC('B:0', 'S:0');
</script>
```

In this schema we can see extra content as `window['__RQ:R2:']`, this is how our client `react-query`(SDK) will recognise and thus know "wow, the server has the data now, I no need to call apis again!".

### High-level Explanation

React(`v18.2.0`) itself only takes care of the streaming and concurrent rendering, once a suspense boundary resolves, it streams the extra chunk to client. That's all!

We are using `@tanstack/react-query@5.28.14`(support suspense) as our fetch SDK, so the sdk itself somehow needs to handle the apis correctly and if the query is called in server, the client needs to know this thus avoid duplicate calling.

### Details about `ReactQueryStreamedHydration`

The SDK exports two HoC components:

- `StreamableContext`

  > This is used to wrap our root serverEntry component and intercept the stream data returned by `renderToPipeableStream` and inject with server data hydrated into final html schema(wrapped in a `script` tag).
  > This is done by `useServerInsertedHTML`, we use it to register a callback which will call `onFlush` once a chunk is streamed and return the dehyrated schema(script tag with `window[id].push(data)`), the `onFlush` will in turn dehyrate our react-query data and return `dehydratedState`

  ```js
  <script>
  window['__RQ:R2:'] = window['__RQ:R2:'] || [];
  window['__RQ:R2:'].push({
    mutations: [],
    queries: [
      {
        state: {
          data: {
            sunrise: '5:43:23 AM',
            sunset: '6:21:11 PM',
            solar_noon: '12:02:17 PM',
            day_length: '12:37:48',
            civil_twilight_begin: '5:20:25 AM',
            civil_twilight_end: '6:44:10 PM',
            nautical_twilight_begin: '4:51:57 AM',
            nautical_twilight_end: '7:12:37 PM',
            astronomical_twilight_begin: '4:23:00 AM',
            astronomical_twilight_end: '7:41:35 PM',
          },
          dataUpdateCount: 1,
          dataUpdatedAt: 1712217443729,
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          isInvalidated: false,
          status: 'success',
          fetchStatus: 'idle',
        },
        queryKey: ['sun-data', 5, 'Asia/Shanghai'],
        queryHash: '["sun-data",5,"Asia/Shanghai"]',
      },
    ],
  });
  </script>
  ```

  > Once the `dehydratedState` data is streamed to client, the script will be loaded and trigger the hijacked `push` function, which will then call `onEntries`, which will then `hydrate` the queryClient on client side.

- `ReactQueryStreamedHydration`
  > This is used to wrap our `App` and listen on `queryClient` to track all the queries happened in our Suspense boundaries, `dehydrate` the data on the server and then `hydrate` the data on the client, this way the client SDK gets to know the data has been called already.

What all the Providers and components are doing here mainly are binding event listeners to be triggered by server data stream(which caused by react suspense streaming), then by client onload. All about closures.

## Other Learning docs

- https://blog.logrocket.com/data-fetching-react-suspense
