import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
// import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Shell from './components/Shell';
import App from './App';

console.log('hello from client bundle js');
// hybrid
ReactDOM.hydrateRoot(
  document,
  <Shell>
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </Shell>
);

// csr
// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </React.StrictMode>
// );

// old api
// ReactDOM.hydrate(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );
