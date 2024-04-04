import * as React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

// Asia/Shanghai or America/Sao_Paulo
const API =
  'https://api.sunrise-sunset.org/json?lat=30.29745859980437&lng=120.15951870352252&date=today&tzid=';

// if we don't use Suspense-enabled useSuspenseQuery here, the Suspense component will have no effect, making this component totally csr, no loading shown
function Sunrise({
  sleepsec,
  location,
}: {
  sleepsec: number;
  location: string;
}) {
  // data is guaranteed to be defined by Suspense boundary
  const { data } = useSuspenseQuery({
    // this is a cache key, if any unique parameters, pass in
    // here I intentionally avoid caching
    queryKey: ['sun-data', sleepsec, location],

    // this function needs to return the final data your component wants
    queryFn: () =>
      sleep(sleepsec).then(() =>
        fetch(API + location)
          .then((res) => res.json())
          .then((resp) => {
            console.log('===============get data from api');
            return resp.results;
          })
      ),
  });

  return (
    <div>
      <p>On this beautiful day in {location}</p>
      <Suspense
        fallback={<div style={{ color: 'blue' }}>Inner loading...</div>}
      >
        <p>The sun rises at {data.sunrise}</p>
        <p>And sets at {data.sunset}</p>
      </Suspense>
    </div>
  );
}

export default Sunrise;

async function sleep(sec: number) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(void 0), sec * 1000)
  );
}
