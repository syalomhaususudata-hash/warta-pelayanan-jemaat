// src/pages/SetPelayanan.jsx
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export default function SetPelayanan() {
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isProfileLocked, setIsProfileLocked] = useState(true);

  const [profilGereja, setProfilGereja] = useState({
    namaKlasis: "", namaJemaat: "", namaMataJemaat: "", namaPendeta: "",
    wakilKetua: "", sekretaris: "", wakilSekretaris: "", bendahara: "", wakilBendahara: ""
  });
  const [dataRayon, setDataRayon] = useState([]);
  const [pengaturanKategorial, setPengaturanKategorial] = useState({});
  const [kategoriBaru, setKategoriBaru] = useState("");

  useEffect(() => {
    const ambilData = async () => {
      try {
        const docSnap = await getDoc(doc(db, "konfigurasi", "master_data"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profilGereja) setProfilGereja(data.profilGereja);
          if (data.pengaturanRayon?.length > 0) setDataRayon(data.pengaturanRayon);
          if (data.pengaturanKategorial) setPengaturanKategorial(data.pengaturanKategorial);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    ambilData();
  }, []);

  const handlePasteProfil = (e) => {
    if (isProfileLocked) return;
    e.preventDefault();
    const rows = e.clipboardData.getData("text").trim().split("\n");
    let p = { ...profilGereja };
    const keys = ["namaKlasis", "namaJemaat", "namaMataJemaat", "namaPendeta", "wakilKetua", "sekretaris", "wakilSekretaris", "bendahara", "wakilBendahara"];
    rows.forEach((row, idx) => {
      const cols = row.split("\t");
      const val = cols.length >= 2 ? cols[1].trim() : cols[0].trim();
      if (idx < keys.length) p[keys[idx]] = val;
    });
    setProfilGereja(p);
  };

  const handlePasteRayon = (e) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").trim().split("\n");
    let r = rows.map((row, i) => {
      const cols = row.split("\t");
      return { id: i + 1, namaRayon: cols[0]?.trim() || "", namaPenatua: cols[1]?.trim() || "" };
    }).filter(item => item.namaRayon !== "");
    setDataRayon(r);
  };

  const handleTambahKategoriDinamis = () => {
    if (!kategoriBaru.trim()) return;
    setPengaturanKategorial({
      ...pengaturanKategorial,
      [kategoriBaru.trim()]: { aktif: true, jumlahSektor: 1, daftarSektor: [{ id: 1, namaSektor: "Sektor A", namaPenatua: "" }] }
    });
    setKategoriBaru("");
  };

  const handleSimpan = async () => {
    await setDoc(doc(db, "konfigurasi", "master_data"), { profilGereja, pengaturanRayon: dataRayon, pengaturanKategorial });
    setIsProfileLocked(true);
    alert("Konfigurasi data berhasil disimpan!");
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial" }}>Memuat data...</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#0A2540" }}>Set Jumlah & Waktu Pelayanan</h2>
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid #007BFF", marginBottom: "25px", flexWrap: "wrap" }}>
        <button style={{ padding: "15px", flex: 1, backgroundColor: activeTab === 1 ? "#007BFF" : "#f4f4f4", color: activeTab === 1 ? "white" : "#333", border: "none", fontWeight: "bold", borderRadius: "8px 0 0 0", cursor: "pointer" }} onClick={() => setActiveTab(1)}>1. Profil Gereja</button>
        <button style={{ padding: "15px", flex: 1, backgroundColor: activeTab === 2 ? "#007BFF" : "#f4f4f4", color: activeTab === 2 ? "white" : "#333", border: "none", fontWeight: "bold", cursor: "pointer" }} onClick={() => setActiveTab(2)}>2. Pengaturan Rayon</button>
        <button style={{ padding: "15px", flex: 1, backgroundColor: activeTab === 3 ? "#007BFF" : "#f4f4f4", color: activeTab === 3 ? "white" : "#333", border: "none", fontWeight: "bold", borderRadius: "0 8px 0 0", cursor: "pointer" }} onClick={() => setActiveTab(3)}>3. Pelayanan Kategorial</button>
      </div>

      <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd" }}>
        {activeTab === 1 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
              <p style={{ color: "gray", fontSize: "14px" }}>Jika terkunci, klik Edit untuk mengubah atau paste data.</p>
              <button onClick={() => setIsProfileLocked(!isProfileLocked)} style={{ padding: "8px 15px", backgroundColor: isProfileLocked ? "#ffc107" : "#28a745", color: "black", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                {isProfileLocked ? "🔒 Edit Profil" : "🔓 Selesai Edit"}
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#0A2540", color: "white" }}><th style={{ padding: "12px", textAlign: "left" }}>Parameter</th><th style={{ padding: "12px", textAlign: "left" }}>Nilai Input</th></tr></thead>
              <tbody onPaste={handlePasteProfil}>
                {Object.keys(profilGereja).map((key, i) => (
                  <tr key={key} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "white" }}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #ddd", fontWeight: "bold", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}><input type="text" disabled={isProfileLocked} value={profilGereja[key]} onChange={(e) => setProfilGereja({ ...profilGereja, [key]: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: isProfileLocked ? "#e9ecef" : "white" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#0A2540", color: "white" }}><th style={{ padding: "12px" }}>No</th><th style={{ padding: "12px", textAlign: "left" }}>Nama Rayon</th><th style={{ padding: "12px", textAlign: "left" }}>Penatua Bertugas</th><th style={{ padding: "12px" }}>Aksi</th></tr></thead>
              <tbody onPaste={handlePasteRayon}>
                {dataRayon.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ textAlign: "center", padding: "10px", fontWeight: "bold" }}>{i + 1}</td>
                    <td><input type="text" value={r.namaRayon} onChange={(e) => { let arr = [...dataRayon]; arr[i].namaRayon = e.target.value; setDataRayon(arr); }} style={{ width: "90%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} /></td>
                    <td><input type="text" value={r.namaPenatua} onChange={(e) => { let arr = [...dataRayon]; arr[i].namaPenatua = e.target.value; setDataRayon(arr); }} style={{ width: "90%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} /></td>
                    <td style={{ textAlign: "center" }}><button onClick={() => setDataRayon(dataRayon.filter((_, idx) => idx !== i))} style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer" }}>Hapus</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setDataRayon([...dataRayon, { id: dataRayon.length + 1, namaRayon: "", namaPenatua: "" }])} style={{ marginTop: "15px", padding: "10px 15px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>+ Tambah Baris Manual</button>
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <div style={{ marginBottom: "25px", display: "flex", gap: "10px", backgroundColor: "#f4f8ff", padding: "15px", borderRadius: "8px", border: "1px solid #cce5ff" }}>
              <input type="text" value={kategoriBaru} onChange={(e) => setKategoriBaru(e.target.value)} placeholder="Nama Kategori (Misal: Persekutuan Doa)" style={{ padding: "10px", flex: 1, borderRadius: "4px", border: "1px solid #ccc" }} />
              <button onClick={handleTambahKategoriDinamis} style={{ padding: "10px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>+ Tambah Kategori Baru</button>
            </div>
            
            {pengaturanKategorial && Object.keys(pengaturanKategorial).map(kat => (
              <div key={kat} style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px", marginBottom: "15px", backgroundColor: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h4 style={{ margin: 0, color: "#0A2540", fontSize: "18px" }}>{kat}</h4>
                  <button onClick={() => { let obj = { ...pengaturanKategorial }; delete obj[kat]; setPengaturanKategorial(obj); }} style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Hapus Kategori</button>
                </div>
                {pengaturanKategorial[kat]?.daftarSektor?.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <input type="text" value={s.namaSektor} onChange={(e) => { let obj = { ...pengaturanKategorial }; obj[kat].daftarSektor[idx].namaSektor = e.target.value; setPengaturanKategorial(obj); }} style={{ padding: "10px", flex: 1, borderRadius: "4px", border: "1px solid #ccc" }} placeholder="Nama Sektor / Kelompok" />
                    <input type="text" value={s.namaPenatua} onChange={(e) => { let obj = { ...pengaturanKategorial }; obj[kat].daftarSektor[idx].namaPenatua = e.target.value; setPengaturanKategorial(obj); }} style={{ padding: "10px", flex: 2, borderRadius: "4px", border: "1px solid #ccc" }} placeholder="Penatua Pendamping" />
                  </div>
                ))}
                <button onClick={() => { let obj = { ...pengaturanKategorial }; obj[kat].daftarSektor.push({ id: obj[kat].daftarSektor.length + 1, namaSektor: "", namaPenatua: "" }); setPengaturanKategorial(obj); }} style={{ marginTop: "10px", padding: "8px 15px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>+ Tambah Sektor/Kelompok</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSimpan} style={{ marginTop: "30px", width: "100%", padding: "15px", backgroundColor: "#28a745", color: "white", fontWeight: "bold", fontSize: "16px", border: "none", borderRadius: "8px", cursor: "pointer", boxShadow: "0 4px 6px rgba(40,167,69,0.2)" }}>💾 Simpan Seluruh Konfigurasi</button>
      </div>
    </div>
  );
}