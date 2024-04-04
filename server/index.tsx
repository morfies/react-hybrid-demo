import * as React from 'react';
// import ReactDOMServer from 'react-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import * as express from 'express';
import { PassThrough } from 'stream';

import ServerEntry from '../src/ServerEntry';
import { StreamableContext } from '../src/components/ReactQueryStreamedHydration';

const PORT = process.env.PORT || 3006;
const app = express();

// bundle.js
app.use('/static', express.static('./dist/static'));

// renderToPipeableStream
app.get('*', async (req, res) => {
  const url = req.originalUrl;
  console.log('request received for url:', url);

  // final hydrated stream with server data and pipe to response
  const hydratedStream = new PassThrough();
  // intermdeiate duplex stream for rawStream -> hydratedStream
  const reactStream = new PassThrough();
  // the raw html schema that react renders
  const rawStream = renderToPipeableStream(
    <StreamableContext
      hydratedStream={hydratedStream}
      reactStream={reactStream}
    >
      <ServerEntry url={url} />
    </StreamableContext>,
    {
      // this is the bundle generated by csr building
      bootstrapScripts: ['/static/bundle.js'],
      onShellReady() {
        res.setHeader('content-type', 'text/html');
        rawStream.pipe(reactStream);
        hydratedStream.pipe(res);
      },
      // this can be used for crawler cases to see full ready html
      // onAllReady
      onError(err) {
        console.error(err);
      },
    }
  );
});

// renderToString is sync and slow
// app.get('*', async (req, res) => {
//   const url = req.originalUrl;
//   console.log('========url', url);
//   const app = ReactDOMServer.renderToString(<ServerEntry url={url} />);
//   console.log('ssr html >>>>', app);
//   // index.html is bundled with csr js and react libs
//   const indexFile = path.resolve('./dist/index.html');

//   fs.readFile(indexFile, 'utf8', (err, data) => {
//     if (err) {
//       console.error('Something went wrong:', err);
//       return res.status(500).send('Oops, better luck next time!');
//     }
//     return res.send(
//       data.replace('<div id="root"></div>', `<div id='root'>${app}</div>`)
//     );
//   });
// });

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});