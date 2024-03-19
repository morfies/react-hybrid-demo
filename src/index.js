import React from 'react';
import ReactDOM from 'react-dom/client';
// import ReactDOM from 'react-dom';
import App from './App';

// hybrid
ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// csr
// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

// old api
// ReactDOM.hydrate(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );
