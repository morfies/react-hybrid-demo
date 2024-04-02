import { useSuspenseQuery } from '@tanstack/react-query';

import { useEffect, useState, Suspense } from 'react';

const API =
  'https://api.sunrise-sunset.org/json?lat=30.29745859980437&lng=120.15951870352252&date=today&tzid=Asia/Shanghai';

function Sunrise() {
  // const [data, setData] = useState({});

  // if we use effects to get data, it's totally client side
  // also, for development mode and StrictMode, these effects will run twice(React)
  // useEffect(() => {
  //   fetch(API)
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setData(data.results);
  //     });
  // }, [API]);

  // data is guaranteed to be defined by Suspense boundary
  const { data } = useSuspenseQuery({
    // this is a cache key, if any unique parameters, pass in
    // here I intentionally avoid caching
    queryKey: ['sun-data'],

    // this function needs to return the final data your component wants
    queryFn: () =>
      sleep(1).then(() =>
        fetch(API)
          .then((res) => res.json())
          .then((resp) => resp.results)
      ),
  });

  return (
    <div>
      <p>On this beautiful day in HangZhou</p>
      <Suspense
        fallback={<div style={{ colur: 'blue' }}>Inner loading...</div>}
      >
        <p>The sun rises at {data.sunrise}</p>
        <p>And sets at {data.sunset}</p>
      </Suspense>
    </div>
  );
}

export default Sunrise;

async function sleep(sec) {
  return new Promise((resolve) => setTimeout(() => resolve(), sec * 1000));
}
