import { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const navigate = useNavigate();

  // STEP 1 → SEND OTP
  const sendOtp = async () => {
    try {
      await axios.post("/auth/send-otp", { email });
      alert("OTP sent to email");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Error sending OTP");
    }
  };

  // STEP 2 → VERIFY OTP
  const verifyOtp = async () => {
    try {
      await axios.post("/auth/verify-otp", { email, otp });
      alert("OTP verified");
      setStep(3);
    } catch (err) {
      alert("Invalid OTP");
    }
  };

  // STEP 3 → RESET PASSWORD
  const resetPassword = async () => {
    try {
      await axios.post("/auth/reset-password", {
        email,
        newPassword,
      });

      alert("Password updated successfully");
      navigate("/login");
    } catch (err) {
      alert("Error resetting password");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Forgot Password</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={sendOtp}>Send OTP</button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp}>Verify OTP</button>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={resetPassword}>Reset Password</button>
          </>
        )}

        <p className="link" onClick={() => navigate("/login")}>
          Back to Login
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;