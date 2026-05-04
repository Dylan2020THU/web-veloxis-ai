import { Route, Routes } from "react-router-dom";
import HomeMap from "./routes/HomeMap";
import CourseDetail from "./routes/CourseDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeMap />} />
      <Route path="/course/:id" element={<CourseDetail />} />
      <Route
        path="*"
        element={
          <div className="flex h-screen items-center justify-center text-ink">
            Page Not Found
          </div>
        }
      />
    </Routes>
  );
}
