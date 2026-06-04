// src/App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Dashboard from "./pages/Dashboard";
import CetakPelayanan from "./pages/CetakPelayanan";
import RealisasiPelayanan from "./pages/RealisasiPelayanan";
import JadwalMinggu from "./pages/JadwalMinggu";
import SetPelayanan from "./pages/SetPelayanan";
import PembuatanJadwal from "./pages/PembuatanJadwal";
import Login from "./pages/Login";
import Tentang from "./pages/Tentang"; // Sesuaikan path foldernya jika berbeda

const HeaderDanNavigasi = ({ user, handleLogout }) => {
  const location = useLocation();
  const path = location.pathname;
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const ambilProfil = async () => {
      try {
        const docSnap = await getDoc(doc(db, "konfigurasi", "master_data"));
        if (docSnap.exists()) setProfil(docSnap.data().profilGereja);
      } catch (error) { console.error(error); }
    };
    ambilProfil();
  }, [path]);

  const isManajemenAktif = ["/set-pelayanan", "/jadwal-minggu", "/pembuatan-jadwal" ].includes(path);

  return (
    <>
      {/* INJEKSI CSS AGRESIF UNTUK MENGHILANGKAN MENU SAAT CETAK PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          #header-nav { display: none !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }
        }
      `}} />

      <div id="header-nav" style={{ backgroundColor: "#0A2540", color: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "25px 20px", display: "flex", alignItems: "center", gap: "20px", borderBottom: "1px solid #1a3a5a" }}>
          <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo GMIT" style={{ width: "65px", height: "auto" }} />
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#ffffff" }}>GEREJA MASEHI INJILI DI TIMOR</h2>
            <h4 style={{ margin: "3px 0 0 0", fontSize: "14px", color: "#ffffff" }}>
              KLASIS {profil?.namaKlasis ? profil.namaKlasis.toUpperCase() : "MOLLO BARAT"}
            </h4>
            <h4 style={{ margin: "2px 0 0 0", fontSize: "14px", color: "#ffffff" }}>
              MAJELIS JEMAAT {profil?.namaJemaat ? profil.namaJemaat.toUpperCase() : "KOA I"}
            </h4>
            <h5 style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#ffffff" }}>
              MATA JEMAAT {profil?.namaMataJemaat ? profil.namaMataJemaat.toUpperCase() : "SYALOM HAUSUSU"}
            </h5>
          </div>
        </div>

        <nav style={{ padding: "12px 20px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: "#0e2e4e", flexWrap: "wrap", fontSize: "14px" }}>
          <Link to="/" style={{ color: path === "/" ? "#FFD700" : "white", textDecoration: "none", fontWeight: "bold" }}>📰 Informasi Pelayanan</Link>
          <Link to="/cetak-pelayanan" style={{ color: path.includes("cetak") ? "#FFD700" : "white", textDecoration: "none", fontWeight: "bold" }}>🖨️ Cetak Pelayanan</Link>
          {user && <Link to="/realisasi-pelayanan" style={{ color: path === "/realisasi-pelayanan" ? "#FFD700" : "white", textDecoration: "none", fontWeight: "bold" }}>📊 Realisasi Pelayanan</Link>}
          {user && <Link to="/jadwal-minggu" style={{ color: isManajemenAktif ? "#FFD700" : "white", textDecoration: "none", fontWeight: "bold" }}>⚙️ Manajemen Data</Link>}
          <Link to="/tentang" style={{ color: "white", textDecoration: "none", fontWeight: "bold", marginLeft: "15px" }}>ℹ️ Tentang Profil</Link>
          
          <button onClick={() => window.location.reload()} style={{ marginLeft: "auto", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>🔄 Segarkan</button>

          {user ? (
            <button onClick={handleLogout} style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Keluar</button>
          ) : (
            <Link to="/login" style={{ color: "#6c757d", textDecoration: "none", fontSize: "12px" }}>🔒 Login</Link>
          )}
        </nav>

        {user && isManajemenAktif && (
          <div style={{ backgroundColor: "#12375c", padding: "10px 20px", display: "flex", gap: "20px", fontSize: "14px", borderTop: "1px solid #1a446c" }}>
            <Link to="/set-pelayanan" style={{ color: path === "/set-pelayanan" ? "#FFD700" : "#cbd5e1", textDecoration: "none" }}>🛠️ Set Jumlah & Waktu</Link>
            <Link to="/jadwal-minggu" style={{ color: path === "/jadwal-minggu" ? "#FFD700" : "#cbd5e1", textDecoration: "none" }}>⛪ Jadwal Minggu</Link>
            <Link to="/pembuatan-jadwal" style={{ color: path === "/pembuatan-jadwal" ? "#FFD700" : "#cbd5e1", textDecoration: "none" }}>📅 Pembuatan Jadwal</Link>
          </div>
        )}
      </div>
    </>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Memuat sistem...</div>;

  return (
    <Router>
      <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
        <HeaderDanNavigasi user={user} handleLogout={() => signOut(auth)} />
        <div style={{ padding: "20px" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cetak-pelayanan" element={<CetakPelayanan />} />
            <Route path="/realisasi-pelayanan" element={user ? <RealisasiPelayanan /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/jadwal-minggu" />} />
            <Route path="/set-pelayanan" element={user ? <SetPelayanan /> : <Navigate to="/login" />} />
            <Route path="/jadwal-minggu" element={user ? <JadwalMinggu /> : <Navigate to="/login" />} />
            <Route path="/pembuatan-jadwal" element={user ? <PembuatanJadwal /> : <Navigate to="/login" />} />
            <Route path="/tentang" element={<Tentang />} />
            </Routes>
        </div>
      </div>
    </Router>
  );
}