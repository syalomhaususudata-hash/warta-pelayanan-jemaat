import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// =========================================================================
// KOMPONEN LOKAL: FITUR PASTE
// =========================================================================
function FiturPasteMasal({ judulKolom, onSimpan }) {
  const [teksMentah, setTeksMentah] = useState("");
  const [dataPreview, setDataPreview] = useState([]);
  const [modeInput, setModeInput] = useState("excel");

  const formatTanggal = (tgl) => {
    if (!tgl) return "";
    if (tgl.match(/^\d{4}-\d{2}-\d{2}$/)) return tgl; 
    const parts = tgl.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return tgl;
  };

  const prosesData = () => {
    if (!teksMentah.trim()) return;
    try {
      if (modeInput === "json") {
        let parsed = JSON.parse(teksMentah);
        if (!Array.isArray(parsed)) throw new Error("JSON harus Array!");
        
        // AUTO-MAPPER JSON: Mencocokkan nama kolom Excel dengan key sistem kita
        const hasilParse = parsed.map((baris) => {
          let barisData = {};
          judulKolom.forEach((judul) => {
            if (!judul.skip) {
              const targetKey = judul.key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
              const targetLabel = judul.label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
              
              // Cari key di JSON yang paling mendekati target (Abaikan spasi & huruf besar)
              const foundKey = Object.keys(baris).find(k => {
                const cleanK = k.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                return cleanK === targetKey || cleanK === targetLabel;
              });

              let isiSel = foundKey ? baris[foundKey] : "";
              if (judul.key === "tanggal") isiSel = formatTanggal(isiSel || baris.tanggal || baris.Tanggal);
              barisData[judul.key] = isiSel;
            }
          });
          return barisData;
        });
        setDataPreview(hasilParse);
      } else {
        const barisExcel = teksMentah.trim().split("\n");
        const hasilParse = barisExcel.map((baris) => {
          const kolomExcel = baris.split("\t"); 
          let barisData = {};
          judulKolom.forEach((judul, index) => {
            if (!judul.skip) {
              let isiSel = kolomExcel[index] ? kolomExcel[index].trim() : "";
              if (judul.key === "tanggal") isiSel = formatTanggal(isiSel);
              barisData[judul.key] = isiSel;
            }
          });
          return barisData;
        });
        setDataPreview(hasilParse);
      }
    } catch (error) {
      alert("Format data tidak valid! Pastikan format teks benar.");
      console.error(error);
    }
  };

  const resetData = () => { setTeksMentah(""); setDataPreview([]); };

  return (
    <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "10px", border: "1px solid #ddd" }}>
      <div style={{ marginBottom: "15px", display: "flex", gap: "15px", alignItems: "center" }}>
        <b style={{ color: "#0A2540" }}>Mode Paste:</b>
        <label><input type="radio" value="excel" checked={modeInput === "excel"} onChange={() => setModeInput("excel")} /> Excel</label>
        <label><input type="radio" value="json" checked={modeInput === "json"} onChange={() => setModeInput("json")} /> JSON</label>
      </div>
      <textarea rows="6" value={teksMentah} onChange={(e) => setTeksMentah(e.target.value)} placeholder="Paste data di sini..." style={{ width: "100%", padding: "10px", fontFamily: "monospace", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }}></textarea>
      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={prosesData} style={{ padding: "8px 15px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Pratinjau</button>
        {dataPreview.length > 0 && <button onClick={resetData} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Batal</button>}
      </div>

      {dataPreview.length > 0 && (
        <div style={{ marginTop: "20px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px", fontSize:"12px" }}>
            <thead><tr style={{ backgroundColor: "#0A2540", color: "white" }}>{judulKolom.filter(j => !j.skip).map(judul => <th key={judul.key} style={{ padding: "8px", border: "1px solid #ccc" }}>{judul.label}</th>)}</tr></thead>
            <tbody>{dataPreview.map((baris, i) => (<tr key={i}>{judulKolom.filter(j => !j.skip).map(judul => <td key={judul.key} style={{ padding: "6px", border: "1px solid #ddd" }}>{baris[judul.key]}</td>)}</tr>))}</tbody>
          </table>
          <button onClick={() => { onSimpan(dataPreview); resetData(); }} style={{ marginTop: "15px", width: "100%", padding: "12px", backgroundColor: "#28a745", color: "white", fontWeight: "bold", border: "none", borderRadius: "5px", cursor: "pointer" }}>Simpan Data ke Database</button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// HALAMAN UTAMA: JADWAL MINGGU
// =========================================================================
export default function JadwalMinggu() {
  const [jadwalMinggu, setJadwalMinggu] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  
  const [formData, setFormData] = useState({
    tanggal: "", masa_raya: "", mazmur: "", pembacaan: "", 
    stola: "", tema: "", petugas: "", pendamping: "", 
    baca_firman: "", doa_persembahan: "", busana: "", psvg: "",
    pemandu_lagu: "", // Penambahan state pemandu_lagu
    pemandu_lagu_rayon: "" // <--- TAMBAHAN BARU
  });
  const [editId, setEditId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const strukturKolomMinggu = [
    { key: "tanggal", label: "Tanggal" }, { key: "masa_raya", label: "Masa Raya" },
    { key: "pembacaan", label: "Pembacaan" }, { key: "mazmur", label: "Mazmur" },
    { key: "tema", label: "Tema" }, { key: "stola", label: "Stola" },
    { key: "busana", label: "Busana" }, { key: "psvg", label: "PS / VG" },
    { key: "petugas", label: "Petugas" }, { key: "pendamping", label: "Pendamping" },
    { key: "baca_firman", label: "Baca Firman" }, { key: "doa_persembahan", label: "Doa Persembahan" },
    { key: "pemandu_lagu", label: "Pemandu Lagu" }, // Penambahan kolom untuk tabel dan mapper
    { key: "pemandu_lagu_rayon", label: "Pemandu Lagu Rayon" } // <--- TAMBAHAN BARU
  ];

  const fetchJadwal = async () => {
    setLoading(true);
    const q = await getDocs(collection(db, "jadwal_minggu"));
    setJadwalMinggu(q.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal)));
    setLoading(false);
  };

  useEffect(() => { fetchJadwal(); }, []);

  const handleSimpanKeDatabase = async (dataDraft) => {
    try {
      const jadwalMingguRef = collection(db, "jadwal_minggu");
      for (const jadwal of dataDraft) {
        await addDoc(jadwalMingguRef, { ...jadwal, kategoriPelayanan: "Kebaktian Minggu" });
      }
      alert("Berhasil disimpan!"); fetchJadwal();
    } catch (error) { alert("Gagal menyimpan data masal."); }
  };

  const handleSimpanManual = async (e) => {
    e.preventDefault();
    if (!formData.tanggal) return alert("Pilih tanggal!");
    try {
      await addDoc(collection(db, "jadwal_minggu"), { ...formData, kategoriPelayanan: "Kebaktian Minggu" });
      alert("Jadwal ditambahkan!");
      resetForm(); setShowModalAdd(false); fetchJadwal();
    } catch (error) { alert("Gagal menyimpan jadwal manual."); }
  };

  const handleUpdateManual = async (e) => {
    e.preventDefault();
    if (!formData.tanggal) return alert("Tanggal tidak boleh kosong!");
    try {
      await updateDoc(doc(db, "jadwal_minggu", editId), { ...formData });
      alert("Jadwal berhasil diperbarui!");
      resetForm(); setShowModalEdit(false); fetchJadwal();
    } catch (error) { alert("Gagal memperbarui jadwal."); }
  };

  const handleHapus = async (id) => {
    if (window.confirm("Hapus jadwal ini?")) {
      await deleteDoc(doc(db, "jadwal_minggu", id)); fetchJadwal();
    }
  };

  const klikEdit = (jadwal) => {
    setFormData({
      tanggal: jadwal.tanggal || "", masa_raya: jadwal.masa_raya || "", mazmur: jadwal.mazmur || "", pembacaan: jadwal.pembacaan || "", 
      stola: jadwal.stola || "", tema: jadwal.tema || "", petugas: jadwal.petugas || "", pendamping: jadwal.pendamping || "", 
      baca_firman: jadwal.baca_firman || "", doa_persembahan: jadwal.doa_persembahan || "", busana: jadwal.busana || "", psvg: jadwal.psvg || "",
      pemandu_lagu: jadwal.pemandu_lagu || "", // Memastikan data lama masuk ke form edit
      pemandu_lagu_rayon: jadwal.pemandu_lagu_rayon || "" // <--- TAMBAHAN BARU
    });
    setEditId(jadwal.id);
    setShowModalEdit(true);
  };

  const resetForm = () => {
    setFormData({ tanggal: "", masa_raya: "", mazmur: "", pembacaan: "", stola: "", tema: "", petugas: "", pendamping: "", baca_firman: "", doa_persembahan: "", busana: "", psvg: "", pemandu_lagu: "", pemandu_lagu_rayon: "" }); // <--- PASTIKAN ADA KEDUANYA DI SINI
    setEditId(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJadwalMinggu = jadwalMinggu.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jadwalMinggu.length / itemsPerPage);

  return (
    <div style={{ fontFamily: "Arial", maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>
        <h2 style={{ color: "#0A2540", margin: 0 }}>Manajemen Jadwal Kebaktian Minggu</h2>
        <button onClick={() => { resetForm(); setShowModalAdd(true); }} style={{ padding: "10px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>+ Tambah Manual</button>
      </div>

      {(showModalAdd || showModalEdit) && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "10px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginTop: 0, color: showModalEdit ? "#ffc107" : "#17a2b8" }}>{showModalEdit ? "Edit Jadwal" : "Tambah Jadwal Satuan"}</h3>
            <form onSubmit={showModalEdit ? handleUpdateManual : handleSimpanManual}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                {strukturKolomMinggu.map((kolom) => (
                  <div key={kolom.key}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" }}>{kolom.label}</label>
                    <input type={kolom.key === "tanggal" ? "date" : "text"} name={kolom.key} value={formData[kolom.key]} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} required={kolom.key === "tanggal"} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "5px", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setShowModalAdd(false); setShowModalEdit(false); resetForm(); }} style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Batal</button>
                <button type="submit" style={{ padding: "10px 20px", backgroundColor: showModalEdit ? "#ffc107" : "#28a745", color: showModalEdit ? "black" : "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>{showModalEdit ? "Simpan Perubahan" : "Simpan Jadwal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
        <h3 style={{ marginTop: 0, color: "#28a745" }}>Input Jadwal Masal (Paste/JSON)</h3>
        <FiturPasteMasal judulKolom={strukturKolomMinggu} onSimpan={handleSimpanKeDatabase} />
      </div>

      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginTop: 0, color: "#0A2540" }}>Daftar Jadwal Kebaktian Minggu</h3>
        {loading ? <p>Memuat data...</p> : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0A2540", color: "white", textAlign: "left" }}>
                    {strukturKolomMinggu.map(k => <th key={k.key} style={{ padding: "10px", border: "1px solid #ccc" }}>{k.label}</th>)}
                    <th style={{ padding: "10px", border: "1px solid #ccc", textAlign: "center", position: "sticky", right: 0, background: "#0A2540", zIndex: 1 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentJadwalMinggu.map(j => (
                    <tr key={j.id} style={{ backgroundColor: "#f9f9f9" }}>
                      {strukturKolomMinggu.map(k => <td key={k.key} style={{ padding: "8px", border: "1px solid #ccc" }}>{k.key === "tanggal" && j[k.key] ? new Date(j[k.key]).toLocaleDateString("id-ID") : j[k.key]}</td>)}
                      <td style={{ padding: "8px", border: "1px solid #ccc", textAlign: "center", position: "sticky", right: 0, background: "#f4f4f4", zIndex: 1, display: "flex", gap: "5px", justifyContent: "center" }}>
                        <button onClick={() => klikEdit(j)} style={{ backgroundColor: "#ffc107", color: "black", padding: "6px 10px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Edit</button>
                        <button onClick={() => handleHapus(j.id)} style={{ backgroundColor: "#dc3545", color: "white", padding: "6px 10px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "10px", backgroundColor: "#f4f4f4", borderRadius: "5px" }}>
                 <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "8px 15px", cursor: currentPage === 1 ? "not-allowed" : "pointer", backgroundColor: currentPage === 1 ? "#ccc" : "#0A2540", color: "white", border: "none", borderRadius: "4px" }}>&laquo; Sebelumnya</button>
                 <span style={{ fontWeight: "bold", fontSize: "14px" }}>Halaman {currentPage} dari {totalPages}</span>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "8px 15px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", backgroundColor: currentPage === totalPages ? "#ccc" : "#0A2540", color: "white", border: "none", borderRadius: "4px" }}>Selanjutnya &raquo;</button>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}