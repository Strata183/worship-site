import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import ProtectedRoute from "./Components/ProtectedRoute";

import Home from "./Pages/Home";
import Tutorials from "./Pages/Tutorials";
import Blog from "./Pages/Articles";
import About from "./Pages/About";
import Steadfast from "./Pages/Steadfast";
import WorthyForSong from "./Pages/WorthyForSong";
import Friends from "./Pages/Friends";
import Library from "./Pages/Library";
import Login from "./Pages/Login";

// App is the main "layout" component for the whole website.
// It decides which page appears for each URL.
function App() {
  return (
    // AuthProvider makes login/session information available everywhere below it.
    // Navbar, ProtectedRoute, Friends, Library, and Login can all use useAuth()
    // because they live inside this provider.
    <AuthProvider>
      {/* BrowserRouter turns normal-looking URLs into React pages. */}
      <BrowserRouter>
        {/* Navbar appears on every route because it sits outside <Routes>. */}
        <Navbar />

        {/* Routes is the list of pages this website knows how to show. */}
        <Routes>
          {/* Public route: anyone can visit the home page. */}
          <Route path="/" element={<Home />} />

          {/* Protected route: visitors must be signed in before seeing Library. */}
          <Route
            path="/songs"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          {/* Public informational pages. */}
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/steadfast" element={<Steadfast />} />
          <Route path="/worthy-for-song" element={<WorthyForSong />} />
          <Route path="/articles" element={<Blog />} />
          <Route path="/articles/:articleSlug" element={<Blog />} />
          <Route path="/about" element={<About />} />

          {/* Login handles both sign-in and sign-up. */}
          <Route path="/login" element={<Login />} />

          {/* Friends is also protected because it uses the signed-in user's id. */}
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Footer appears on every route because it also sits outside <Routes>. */}
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
