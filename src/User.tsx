import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { getUser } from './api';
import Loading from './components/Loading';
function User() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    getUser().then((user) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    setUser({ name: 'temp', age: 0 });
  }, []);

  return (
    <div style={{ border: '1px dashed gray' }}>
      <p>This is a profile of some user</p>
      <Suspense fallback={<Loading color='purple' />}>
        <div>
          <p>
            <span>Name:</span>
            {user?.name}
          </p>
          <br />
          <p>
            <span>Age:</span>
            {user?.age}
          </p>
          <button onClick={() => setUser({ name: 'Mike', age: 33 })}>
            Click me
          </button>
        </div>
      </Suspense>
    </div>
  );
}

export default User;
