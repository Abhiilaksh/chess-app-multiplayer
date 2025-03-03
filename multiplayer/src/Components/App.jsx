import OnlineGame from './OnlineGame';
import LocalGame from "./localGame";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Home from './Home';
import LocalGamePage from "./localGamePage";
import Login from './Login';
import ProtectedRoute from './ProtectedRoutes';

function App() {

  return (
    <div>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />}></Route>
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }></Route>
          <Route path="/localgame" element={
            <ProtectedRoute><LocalGame /></ProtectedRoute>
          }></Route>
          <Route path="/game" element={
            <ProtectedRoute><OnlineGame /></ProtectedRoute>
          }></Route>
          <Route path="/localgamePage" element={
            <ProtectedRoute><LocalGamePage /></ProtectedRoute>
          }></Route>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
