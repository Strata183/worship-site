import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./Components/Navbar";

import Home from "./Pages/Home";
import Songs from "./Pages/Songs";
import Tutorials from "./Pages/Tutorials";
import Blog from "./Pages/Articles";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route path="/articles" element={<Blog />} />
      </Routes>
    </BrowserRouter>


  );
}

export default App;