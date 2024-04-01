import React, { useEffect, useState } from 'react';
const API =
  'https://api.sunrise-sunset.org/json?lat=30.29745859980437&lng=120.15951870352252&date=today&tzid=Asia/Shanghai';

function Sunrise() {
  const [data, setData] = useState({});

  useEffect(() => {
    fetch(API)
      .then((res) => res.json())
      .then((data) => {
        setData(data.results);
      });
  }, []);

  return (
    <div>
      <p>On this beautiful day in HangZhou</p>
      <p>The sun rises at {data.sunrise}</p>
      <p>And sets at {data.sunset}</p>
    </div>
  );
}

export default Sunrise;
