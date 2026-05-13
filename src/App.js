import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./Components/Navbar";

import Home from "./Pages/Home";
import Songs from "./Pages/Songs";
import Tutorials from "./Pages/Tutorials";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/tutorials" element={<Tutorials />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;