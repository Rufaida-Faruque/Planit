import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";


import ClientDashboard from "./pages/ClientDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";


import VendorPage from "./pages/VendorPage";
import PublicEvent from "./pages/public/PublicEvent";
import VerifyOTP from "./pages/public/VerifyOTP";
import PublicStallBooking from "./pages/public/PublicStallBooking";
import GuestPhotoShare from "./pages/public/GuestPhotoShare";
import VendorEventWorkspace from "./pages/vendor/VendorEventWorkspace";


function App() {
  return (
    <BrowserRouter>
    <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />  
        <Route path="/home" element={<Home />} />




        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/vendor/events/:id" element={<VendorEventWorkspace />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/vendor/:id" element={<VendorPage />} />
        <Route path="/public/:eventId/stalls" element={<PublicStallBooking />} />
        <Route path="/public/:eventId" element={<PublicEvent />} />
        <Route path="/public/:eventId/verify" element={<VerifyOTP />} />
        <Route path="/share-photos/:eventId/:token" element={<GuestPhotoShare />} />




      </Routes>
    </BrowserRouter>
  );
}

export default App;

