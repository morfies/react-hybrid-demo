import { Suspense } from 'react';
import Sunrise from './components/Sunrise';
import Loading from './components/Loading';

function Article() {
  return (
    <div style={{ border: '1px dashed gray' }}>
      <h1>This is an article page</h1>
      <Suspense fallback={<Loading />}>
        <Sunrise />
      </Suspense>
    </div>
  );
}

export default Article;
