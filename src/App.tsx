import * as React from 'react';
import { Routes, Route, Outlet, Link } from 'react-router-dom';
import Home from './Home';
import User from './User';
import Article from './Article';
import Loading from './components/Loading';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryStreamedHydration } from './components/ReactQueryStreamedHydration';

function App() {
  // Instead do this, which ensures each request has its own cache:
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: Infinity,
          },
        },
      })
  );
  return (
    <div className='App'>
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration>
          <Routes>
            <Route path='/' element={<Layout />}>
              <Route index element={<Home />} />
              <Route path='user' element={<User />} />
              <Route path='article' element={<Article />} />
              <Route path='*' element={<NoMatch />} />
            </Route>
          </Routes>
        </ReactQueryStreamedHydration>
      </QueryClientProvider>
    </div>
  );
}

export default App;

function Layout() {
  return (
    <div>
      {/* A "layout route" is a good place to put markup you want to
          share across all the pages on your site, like navigation. */}
      <nav>
        <ul>
          <li>
            <Link to='/'>Home</Link>
          </li>
          <li>
            <Link to='/user'>User</Link>
          </li>
          <li>
            <Link to='/article'>Article</Link>
          </li>
          <li>
            <Link to='/nothing-here'>Nothing Here</Link>
          </li>
        </ul>
      </nav>

      <hr />

      {/* An <Outlet> renders whatever child route is currently active,
          so you can think about this <Outlet> as a placeholder for
          the child routes we defined above. */}
      <React.Suspense fallback={<Loading color='yellow' />}>
        <Outlet />
      </React.Suspense>
    </div>
  );
}
function NoMatch() {
  return (
    <div>
      <h2>Nothing to see here!</h2>
      <p>
        <Link to='/'>Go to the home page</Link>
      </p>
    </div>
  );
}
