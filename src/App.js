import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import ProtectedRoute from "./Components/ProtectedRoute";

import Home from "./Pages/Home";
import Tutorials from "./Pages/Tutorials";
import Blog from "./Pages/Articles";
import About from "./Pages/About";
import Friends from "./Pages/Friends";
import Library from "./Pages/Library";
import Login from "./Pages/Login";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/songs"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/articles" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
        </Routes>

        <Footer />
      </BrowserRouter>
    </AuthProvider>


  );
}

export default App;
