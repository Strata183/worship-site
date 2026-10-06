import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import KoFiWidget from "./Components/KoFiWidget";
import ProtectedRoute from "./Components/ProtectedRoute";
import ScrollToTop from "./Components/ScrollToTop";

import Home from "./Pages/Home";
import Tutorials from "./Pages/Tutorials";
import Blog from "./Pages/Articles";
import About from "./Pages/About";
import Steadfast from "./Pages/Steadfast";
import WorthyForSong from "./Pages/WorthyForSong";
import VbsKinderMusic from "./Pages/VbsKinderMusic";
import Friends from "./Pages/Friends";
import Library from "./Pages/Library";
import Login from "./Pages/Login";
import Prayer from "./Pages/Prayer";
import Resources from "./Pages/Resources";
import MastersBibleStudy from "./Pages/MastersBibleStudy";
import PspWorshipTeam from "./Pages/PspWorshipTeam";
import RoadToEmmaus from "./Pages/RoadToEmmaus/RoadToEmmaus";
import RoadToEmmausContributors from "./Pages/RoadToEmmaus/Contributors";
import RoadToEmmausSong from "./Pages/RoadToEmmaus/Song";
import WorthyForSongTrackPage from "./Pages/WorthyForSong/Song";

// App is the main "layout" component for the whole website.
// It decides which page appears for each URL.
function AppContent() {
  const pathname = useLocation().pathname;
  const isStandaloneAlbumPage =
    pathname === "/road-to-emmaus" ||
    pathname.startsWith("/road-to-emmaus/") ||
    pathname === "/worthy-for-song" ||
    pathname.startsWith("/worthy-for-song/");

  return (
    <>
      <ScrollToTop />

      {!isStandaloneAlbumPage && <Navbar />}

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
        <Route path="/resources" element={<Resources />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route
          path="/steadfast"
          element={
            <ProtectedRoute>
              <Steadfast />
            </ProtectedRoute>
          }
        />
        <Route path="/worthy-for-song" element={<WorthyForSong />} />
        <Route path="/worthy-for-song/:trackSlug" element={<WorthyForSongTrackPage />} />
        <Route path="/prayer" element={<Prayer />} />
        <Route
          path="/masters-bible-study"
          element={
            <ProtectedRoute>
              <MastersBibleStudy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters-bible-study/:weekSlug"
          element={
            <ProtectedRoute>
              <MastersBibleStudy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vbs-2026-kinder-music"
          element={
            <ProtectedRoute>
              <VbsKinderMusic />
            </ProtectedRoute>
          }
        />
        <Route
          path="/psp-worship-team"
          element={
            <ProtectedRoute>
              <PspWorshipTeam />
            </ProtectedRoute>
          }
        />
        <Route path="/articles" element={<Blog />} />
        <Route path="/articles/:articleSlug" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/road-to-emmaus" element={<RoadToEmmaus />} />
        <Route path="/road-to-emmaus/contributors" element={<RoadToEmmausContributors />} />
        <Route path="/road-to-emmaus/:trackSlug" element={<RoadToEmmausSong />} />

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

      {!isStandaloneAlbumPage && <Footer />}
      {!isStandaloneAlbumPage && <KoFiWidget />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
