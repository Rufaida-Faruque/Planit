import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "../../api/axios";

const VerifyOTP = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [done, setDone] = useState(null);

  const verify = async () => {
    try {
      const res = await axios.post(`/public/${eventId}/signup/verify`, {
        email,
        otp,
      });
      setDone(res.data);
    } catch (error) {
      alert(error?.response?.data?.message || "Verify failed");
    }
  };

  return (
    <div style={{ maxWidth: "620px", margin: "30px auto", padding: "16px" }}>
      <h2>Verify OTP</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={verify}>Verify</button>

      {done && (
        <div className="card" style={{ marginTop: "16px" }}>
          <p>{done.message}</p>
          <p>Attendee ID: {done.attendeeId}</p>
          <p>QR Ticket: {done.qrCode}</p>
        </div>
      )}
    </div>
  );
};

export default VerifyOTP;
