import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Player from "./pages/Player";
import "./App.css";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/embed/:channel" element={<Player />} />
      </Routes>
    </Router>
  );
};

export default App;
