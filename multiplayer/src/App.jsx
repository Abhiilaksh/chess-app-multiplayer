import OnlineGame from './OnlineGame';
import Room from './Room';
import LocalGame from "./localGame";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Home from './Home';
import LocalGamePage from "./localGamePage";

function App() {

  return (
    <div>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/localgame" element={<LocalGame />}></Route>
          <Route path="/game/:id" element={<OnlineGame />}></Route>
          <Route path="/localgamePage" element={<LocalGamePage />}></Route>
          <Route path="/room" element={<Room />}></Route>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
