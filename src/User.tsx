import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { getUser } from './api';
import Loading from './components/Loading';

type USER = {
  name: string;
  age: number;
};
// library needs to pre-fetch all requests ahead of component mount
const userPromise = getUser();
function UserInfo() {
  const user = userPromise.read();
  console.log('==========user', user);
  return (
    <div>
      <p>
        <span>Name:</span>
        {user.name}
      </p>
      <br />
      <p>
        <span>Age:</span>
        {user.age}
      </p>
    </div>
  );
}

function User() {
  return (
    <div style={{ border: '1px dashed gray' }}>
      <p>This is a profile of some user</p>
      <Suspense fallback={<Loading color='purple' />}>
        <UserInfo />
      </Suspense>
    </div>
  );
}

export default User;
