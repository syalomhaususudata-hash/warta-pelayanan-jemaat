import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Tentang() {
  const [profilGereja, setProfilGereja] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ambilDataProfil = async () => {
      try {
        const masterSnap = await getDoc(doc(db, "konfigurasi", "master_data"));
        if (masterSnap.exists() && masterSnap.data().profilGereja) {
          setProfilGereja(masterSnap.data().profilGereja);
        }
      } catch (error) {
        console.error("Gagal memuat data profil tentang:", error);
      } finally {
        setLoading(false);
      }
    };
    ambilDataProfil();
  }, []);

  const getWaLink = (noWa) => {
    if (!noWa) return "#";
    const cleanNo = noWa.replace(/[^0-9]/g, "");
    const formattedNo = cleanNo.startsWith("0") ? "62" + cleanNo.slice(1) : cleanNo;
    return `https://wa.me/${formattedNo}`;
  };

  if (loading) return <div style={{ padding: "30px", fontFamily: "Arial", color: "gray" }}>Memuat profil instansi...</div>;
  if (!profilGereja) return <div style={{ padding: "30px", fontFamily: "Arial", color: "red" }}>Data profil belum dikonfigurasi di Master Data.</div>;

  const {
    namaKlasis, namaJemaat, namaMataJemaat, namaPendeta,
    alamatLengkap, visiMisi, linkDataJemaat, emailGereja, kontakWA,
    wakilKetua, sekretaris, tautanLogo
  } = profilGereja;

  return (
    <div style={{ fontFamily: "Arial", padding: "20px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #ddd", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
      {/* HEADER UTAMA */}
      <div style={{ textAlign: "left", marginBottom: "30px", borderBottom: "2px solid #e9ecef", paddingBottom: "20px" }}>
        <h2 style={{ color: "#0A2540", margin: "0 0 5px 0", textTransform: "uppercase" }}>
          Profil Majelis Jemaat
        </h2>
        <p style={{ margin: 0, color: "gray", fontSize: "14px" }}>
          Klasis {namaKlasis || "-"} • {namaJemaat || "Koa I"}
        </p>
      </div>

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* BAGIAN KIRI: LOGO & LINK PENDATAAN */}
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "20px", textAlign: "center", backgroundColor: "#fdfdfd" }}>
            {tautanLogo ? (
              <img 
                src={tautanLogo} 
                alt="Logo Instansi" 
                style={{ maxWidth: "150px", height: "auto", marginBottom: "15px", objectFit: "contain" }} 
              />
            ) : (
              <div style={{ width: "100px", height: "100px", backgroundColor: "#e9ecef", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto", color: "gray", fontSize: "30px" }}>
                ⛪
              </div>
            )}
            <h3 style={{ margin: "0 0 5px 0", color: "#0A2540", fontSize: "18px" }}>{namaMataJemaat || "Syalom Haususu"}</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "gray" }}>Pendeta: {namaPendeta || "-"}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {linkDataJemaat ? (
              <a href={linkDataJemaat} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", backgroundColor: "#007BFF", color: "white", fontWeight: "bold", textDecoration: "none", borderRadius: "6px", boxShadow: "0 2px 4px rgba(0,123,255,0.1)" }}>
                📊 Akses Tautan Pendataan Jemaat
              </a>
            ) : (
              <div style={{ padding: "12px", textAlign: "center", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "6px", fontSize: "13px", border: "1px solid #ffeeba" }}>
                ⚠️ Tautan database jemaat belum dikonfigurasi
              </div>
            )}
          </div>
        </div>

        {/* BAGIAN KANAN: DETAIL KONTEN */}
        <div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column", gap: "25px" }}>
          <div>
            <h4 style={{ color: "#0A2540", margin: "0 0 8px 0", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>Visi & Misi</h4>
            <div style={{ whiteSpace: "pre-wrap", textAlign: "justify", fontSize: "14px", color: "#555", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", lineHeight: "1.6" }}>
              {visiMisi || "Visi dan misi belum diisi."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <div style={{ padding: "15px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fff" }}>
              <strong style={{ display: "block", fontSize: "11px", color: "gray" }}>📧 GMAIL RESMI</strong>
              <span style={{ fontSize: "14px" }}>{emailGereja || "-"}</span>
            </div>
            <div style={{ padding: "15px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fff" }}>
              <strong style={{ display: "block", fontSize: "11px", color: "gray" }}>💬 WHATSAPP SEKRETARIAT</strong>
              {kontakWA ? (
                <a href={getWaLink(kontakWA)} target="_blank" rel="noreferrer" style={{ fontSize: "14px", color: "#25D366", fontWeight: "bold", textDecoration: "none" }}>
                  {kontakWA} ↗
                </a>
              ) : (
                <span style={{ fontSize: "14px" }}>-</span>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ color: "#0A2540", margin: "0 0 5px 0", fontSize: "14px" }}>📍 Alamat Lengkap</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>{alamatLengkap || "-"}</p>
          </div>

          <div style={{ padding: "15px", backgroundColor: "#f4f8ff", borderRadius: "8px", border: "1px solid #cce5ff" }}>
            <h4 style={{ color: "#0A2540", margin: "0 0 10px 0", fontSize: "14px" }}>Struktur Pengurus Utama</h4>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div><strong>Wakil Ketua:</strong> {wakilKetua || "-"}</div>
              <div><strong>Sekretaris:</strong> {sekretaris || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}