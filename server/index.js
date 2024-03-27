import path from 'path';
import fs from 'fs';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import express from 'express';

import ServerEntry from '../src/ServerEntry';

const PORT = process.env.PORT || 3006;
const app = express();

// bundle.js
app.use('/static', express.static('./dist'));

app.get('*', async (req, res) => {
  const url = req.originalUrl;
  console.log('========url', url);
  const app = ReactDOMServer.renderToString(<ServerEntry url={url} />);

  console.log('ssr html >>>>', app);
  // index.html is bundled with csr js and react libs
  const indexFile = path.resolve('./dist/index.html');

  fs.readFile(indexFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Something went wrong:', err);
      return res.status(500).send('Oops, better luck next time!');
    }

    return res.send(
      data.replace(
        '<div id="root"></div>',
        // `<div id="root"><div>${app}</div></div>`  // an extra div layer
        `<div id='root'>${app}</div>`
      )
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
