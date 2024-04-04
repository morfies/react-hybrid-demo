import * as React from 'react';
export default function ({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#000000' />
        <title>React App</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
