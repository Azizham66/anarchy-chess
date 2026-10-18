import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Play from "@/pages/Play";
import Rules from "@/pages/Rules";
import About from "@/pages/About";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Play />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Play />} />
      </Route>
    </Routes>
  );
}
