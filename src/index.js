import React from 'react';
import ReactDOM from 'react-dom/client';
import "./Styles/main.css";
import App from './App';

// This file is the starting point for the React application.
// React looks for the <div id="root"></div> inside public/index.html,
// then places the whole app inside that div.
const root = ReactDOM.createRoot(document.getElementById('root'));

// React.StrictMode is a development helper. It warns about some common React
// mistakes while you are building the app. It does not show anything on screen.
root.render(
  <React.StrictMode>
    {/* App contains the routes, layout, pages, and authentication wrapper. */}
    <App />
  </React.StrictMode>
);
