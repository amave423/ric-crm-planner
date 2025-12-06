import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import EventsPage from "../pages/Events/EventsPage";
import DirectionsPage from "../pages/Directions/DirectionsPage";
import ProjectsPage from "../pages/Projects/ProjectsPage";
import ProfilePage from "../pages/Profile/ProfilePage";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Header />
      <Sidebar />

      <main className="content">
        <Routes>
          <Route path="/" element={<EventsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/directions" element={<DirectionsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
