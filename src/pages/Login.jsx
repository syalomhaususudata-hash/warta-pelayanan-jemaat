// src/pages/Login.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/"); // Diarahkan ke halaman Master Data setelah berhasil
    } catch (err) {
      setError("Login gagal. Periksa kembali akses Anda.");
    }
  };

  return (
    <div style={{ maxWidth: "350px", margin: "100px auto", padding: "30px", border: "1px solid #eaeaea", borderRadius: "8px", fontFamily: "Arial", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>Login Sistem</h2>
      
      {error && (
        <div style={{ padding: "10px", backgroundColor: "#ffe6e6", color: "red", marginBottom: "15px", borderRadius: "4px", fontSize: "14px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: "100%", padding: "10px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }} 
            required 
          />
        </div>
        
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Kata Sandi</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: "100%", padding: "10px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }} 
            required 
          />
        </div>
        
        <button 
          type="submit" 
          style={{ padding: "12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}
        >
          Masuk
        </button>
      </form>
    </div>
  );
}