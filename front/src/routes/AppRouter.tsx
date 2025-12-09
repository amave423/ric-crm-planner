// src/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";

import Header from "../components/Header/Header";

import EventsPage from "../pages/Events/EventsPage";
import DirectionsPage from "../pages/Directions/DirectionsPage";
import ProjectsPage from "../pages/Projects/ProjectsPage";

import RequestsPage from "../pages/Requests/RequestsPage";
import PlannerPage from "../pages/Planner/PlannerPage";
import ProfilePage from "../pages/Profile/ProfilePage";

import LoginPage from "../pages/Auth/Login";
import RegisterPage from "../pages/Auth/Register";

export default function AppRouter() {
  const { user } = useContext(AuthContext);
  const isGuest = !user;

  return (
    <BrowserRouter>
      <Header />
      <Routes>

        {/* Главный маршрут */}
        <Route path="/" element={<Navigate to="/events" replace />} />

        {/* Для всех */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ГОСТЬ МОЖЕТ СМОТРЕТЬ ТОЛЬКО МЕРОПРИЯТИЯ */}
        <Route path="/events" element={<EventsPage />} />

        {/* Если пользователь НЕ авторизован, ему запрещены остальные маршруты */}
        {isGuest ? (
          <>
            <Route path="*" element={<Navigate to="/events" replace />} />
          </>
        ) : (
          <>
            {/* Направления внутри мероприятия */}
            <Route
              path="/events/:eventId/directions"
              element={<DirectionsPage />}
            />

            {/* Проекты внутри направления */}
            <Route
              path="/events/:eventId/directions/:directionId/projects"
              element={<ProjectsPage />}
            />

            {/* Только авторизованные */}
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Только организатор */}
            {user.role === "organizer" && (
              <Route path="/requests" element={<RequestsPage />} />
            )}

            {/* Остальное */}
            <Route path="*" element={<Navigate to="/events" replace />} />
          </>
        )}

      </Routes>
    </BrowserRouter>
  );
}
