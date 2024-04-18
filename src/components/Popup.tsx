import * as React from 'react';
import Loading from './Loading';
import { useSuspenseQuery } from '@tanstack/react-query';
export default function ({ show }: { show: boolean }) {
  const { data } = useSuspenseQuery<{ image: string }>({
    queryKey: ['fox-query'],
    queryFn: async () => {
      const res = await fetch('https://randomfox.ca/floof');
      const data = await res.json();
      return data;
    },
  });
  return (
    <div style={{ display: show ? 'block' : 'none' }}>
      <h2>A popup with Suspense boundary(Selective hydration)</h2>
      <React.Suspense fallback={<Loading color='blue' text='Image loading' />}>
        <img src={data.image} alt='a fox'></img>
      </React.Suspense>
    </div>
  );
}
