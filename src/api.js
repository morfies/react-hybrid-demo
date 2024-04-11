// simple example of fetching a user info
export function getUser() {
  const fetchPromise = sleep(1000).then(() =>
    // a mock api to return {name, age}
    fetch('https://run.mocky.io/v3/3f360bc2-8bf1-418a-a6f4-dc19ca8ca81b')
      .then((res) => res.json())
      .then((res) => res)
  );
  return wrapPromise(fetchPromise);
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// A simple example to make an async operation support supense,
// namely throw promise to communicate with React.Suspense to let react know an async task is going on
// To see this in action: use csr only, refresh the page then go to /user within 1 second
// If you want to see this for ssr, then need to go through react-query implementation(protocol to tell client the data is injected already thus avoid client duplicate request)
function wrapPromise(promise) {
  let status = 'pending';
  let response;

  const suspender = promise.then(
    (res) => {
      status = 'success';
      response = res;
    },
    (err) => {
      status = 'error';
      response = err;
    }
  );
  const read = () => {
    switch (status) {
      case 'pending':
        throw suspender;
      case 'error':
        throw response;
      default:
        return response;
    }
  };

  return { read };
}
