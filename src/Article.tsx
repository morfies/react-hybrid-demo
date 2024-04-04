import * as React from 'react';
import { Suspense } from 'react';
import Sunrise from './components/Sunrise';
import Loading from './components/Loading';

function Article() {
  return (
    <div style={{ border: '1px dashed gray' }}>
      <h1>This is an article page</h1>
      <Suspense fallback={<Loading color={'red'} />}>
        <Sunrise sleepsec={5} location={'Asia/Shanghai'} />
      </Suspense>
      <Suspense fallback={<Loading color={'blue'} />}>
        <Sunrise sleepsec={0.4} location={'America/Sao_Paulo'} />
      </Suspense>
    </div>
  );
}

export default Article;
