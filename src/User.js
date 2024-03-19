import { useEffect, useState } from 'react';
import { getUser } from './api';
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
  );
}

export default User;
