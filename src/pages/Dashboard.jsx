// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const [tabAktif, setTabAktif] = useState("minggu");
  const [semuaJadwalMinggu, setSemuaJadwalMinggu] = useState([]);
  const [semuaJadwalHarian, setSemuaJadwalHarian] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tanggalTerpilih, setTanggalTerpilih] = useState("");
  
  const [teksWartaLain, setTeksWartaLain] = useState("");
  const [isEditingWarta, setIsEditingWarta] = useState(false);

  const [fileKeuangan, setFileKeuangan] = useState([]);
  const [isKeuanganTersimpan, setIsKeuanganTersimpan] = useState(false);

  const dragItem = useRef();
  const dragOverItem = useRef();

  const [profilGereja, setProfilGereja] = useState({
    wakilKetua: "", sekretaris: ""
  });

  useEffect(() => {
    const ambilData = async () => {
      try {
        const [mingguSnap, harianSnap, masterSnap] = await Promise.all([
          getDocs(collection(db, "jadwal_minggu")),
          getDocs(collection(db, "jadwal_pelayanan")),
          getDoc(doc(db, "konfigurasi", "master_data"))
        ]);
        
        const dataMinggu = mingguSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
      
        const mapHarian = new Map();
        harianSnap.docs.forEach(d => {
          const data = d.data();
          if (data.tanggal) {
            const key = `${data.tanggal}-${data.namaUnit}-${data.tempatKeluarga}`;
            if (!mapHarian.has(key)) mapHarian.set(key, { id: d.id, ...data });
          }
        });
        const dataHarian = Array.from(mapHarian.values());

        setSemuaJadwalMinggu(dataMinggu);
        setSemuaJadwalHarian(dataHarian);

        if (dataMinggu.length > 0) {
          setTanggalTerpilih(dataMinggu[0].tanggal);
        }

        if (masterSnap.exists()) {
          const data = masterSnap.data();
          if (data.profilGereja) {
            setProfilGereja({
              wakilKetua: data.profilGereja.wakilKetua || "",
              sekretaris: data.profilGereja.sekretaris || ""
            });
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    ambilData();
  }, []);

  useEffect(() => {
    const ambilTeksWarta = async () => {
      if (!tanggalTerpilih) return;
      try {
        const docRef = doc(db, "warta_lainnya_teks", tanggalTerpilih);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTeksWartaLain(docSnap.data().teks);
        } else {
          setTeksWartaLain(""); 
        }
      } catch (e) { console.error(e); }
    };
    ambilTeksWarta();
  }, [tanggalTerpilih]);

  const simpanWartaLain = async () => {
    if (!tanggalTerpilih) return;
    try {
      await setDoc(doc(db, "warta_lainnya_teks", tanggalTerpilih), {
        teks: teksWartaLain,
        tanggal: tanggalTerpilih
      });
      setIsEditingWarta(false);
      alert("Teks Warta Lain-lain berhasil disimpan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan warta.");
    }
  };

  const handlePilihGambar = (e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter(f => f.type.includes("image"));
    
    if (validImages.length > 0) {
      setFileKeuangan(prev => [...prev, ...validImages]);
      setIsKeuanganTersimpan(false);
    }
  };

  const dragStart = (e, position) => {
    dragItem.current = position;
  };

  const dragEnter = (e, position) => {
    dragOverItem.current = position;
  };

  const drop = (e) => {
    const copyListItems = [...fileKeuangan];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setFileKeuangan(copyListItems);
    setIsKeuanganTersimpan(false);
  };

  const hapusSatuGambar = (index) => {
    setFileKeuangan(prev => prev.filter((_, i) => i !== index));
    setIsKeuanganTersimpan(false);
  };

  const hapusSemuaFileKeuangan = () => {
    setFileKeuangan([]);
    setIsKeuanganTersimpan(false);
  };

  const simpanFileKeuangan = () => {
    setIsKeuanganTersimpan(true);
    alert(`${fileKeuangan.length} file gambar keuangan siap untuk dicetak/disimpan.`);
  };

  const getTabStyle = (tabId) => ({
    padding: "15px 25px", cursor: "pointer", backgroundColor: tabAktif === tabId ? "#0A2540" : "#f4f4f4",
    color: tabAktif === tabId ? "white" : "#333", fontWeight: "bold", border: "none",
    borderRadius: "10px 10px 0 0", flex: "1 1 auto", textAlign: "center", fontSize: "15px"
  });

  const formatTgl = (tgl) => {
    if (!tgl) return "-";
    const d = new Date(tgl + "T00:00:00");
    return isNaN(d) ? tgl : d.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatTanggalDropdown = (tgl) => {
    if (!tgl) return "-";
    const d = new Date(tgl + "T00:00:00");
    if (isNaN(d)) return tgl;
    
    // Tambahkan pengambilan nama hari
    const hari = d.toLocaleDateString("id-ID", { weekday: 'long' }); 
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString("id-ID", { month: 'long' });
    const year = d.getFullYear();
    
    // Gabungkan hari dengan tanggal
    return `${hari}, ${day}-${month}-${year}`;
  };

  const namaHari = (tgl) => {
    if (!tgl) return "-";
    const d = new Date(tgl + "T00:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("id-ID", { weekday: 'long' });
  };

  // --- LOGIKA PENGURUTAN KATEGORIAL KUSTOM ---
  const getBobotKategori = (namaKategori) => {
    const k = (namaKategori || "").toUpperCase();
    if (k.includes("BAPAK")) return 1;
    if (k.includes("PEREMPUAN")) return 2;
    if (k.includes("PEMUDA")) return 3;
    if (k.includes("TERUNA")) return 4;
    if (k.includes("PAR")) return 5; // Menangkap PAR GMIT, PART, dll
    if (k.includes("LANSIA")) return 6;
    return 99; // Untuk kategori lainnya akan ditaruh paling bawah
  };

  let mingguIni = null, mingguDepan = null;
  let jadwalRayonSepekan = [], jadwalKategorialSepekan = [];

  if (tanggalTerpilih) {
    const dMulai = new Date(tanggalTerpilih + "T00:00:00");
    if (!isNaN(dMulai)) {
      const dAkhir = new Date(dMulai); dAkhir.setDate(dMulai.getDate() + 6);
      const dMingguDepan = new Date(dMulai); dMingguDepan.setDate(dMulai.getDate() + 7);

      const strAkhir = `${dAkhir.getFullYear()}-${String(dAkhir.getMonth() + 1).padStart(2, '0')}-${String(dAkhir.getDate()).padStart(2, '0')}`;
      const strMingguDepan = `${dMingguDepan.getFullYear()}-${String(dMingguDepan.getMonth() + 1).padStart(2, '0')}-${String(dMingguDepan.getDate()).padStart(2, '0')}`;

      mingguIni = semuaJadwalMinggu.find(j => j.tanggal === tanggalTerpilih);
      mingguDepan = semuaJadwalMinggu.find(j => j.tanggal === strMingguDepan);

      const harianSepekan = semuaJadwalHarian.filter(j => j.tanggal >= tanggalTerpilih && j.tanggal <= strAkhir);
      
      // Pengurutan Rayon Sepekan (Rayon 1, 2, 3... dst)
      jadwalRayonSepekan = harianSepekan
        .filter(j => j.kategoriPelayanan === "Rayon")
        .sort((a, b) => (a.namaUnit || "").localeCompare(b.namaUnit || "", undefined, { numeric: true, sensitivity: 'base' }));
      
      // Pengurutan Kategorial Sepekan Spesifik
      jadwalKategorialSepekan = harianSepekan
        .filter(j => j.kategoriPelayanan === "Kategorial")
        .sort((a, b) => {
          // 1. Urutkan berdasarkan Kategori Induk (Bapak, Perempuan, dst)
          const bobotA = getBobotKategori(a.namaKategoriInduk);
          const bobotB = getBobotKategori(b.namaKategoriInduk);
          
          if (bobotA !== bobotB) {
            return bobotA - bobotB;
          }
          
          // 2. Jika Kategorinya sama, urutkan berdasarkan nama Sektor/Rayon (Sektor A, B, C...)
          return (a.namaUnit || "").localeCompare(b.namaUnit || "", undefined, { numeric: true, sensitivity: 'base' });
        });
    }
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .screen-none { display: none; }
        .screen-block { display: block; }
        .print-only { display: none !important; }
        
        @media print { 
          #dashboard-tabs, .no-print { display: none !important; } 
          .screen-none { display: block !important; }
          .screen-block { display: block !important; }
          .print-section { page-break-after: auto; width: 100%; margin-bottom: 20px; } 
          .print-only { display: flex !important; page-break-inside: avoid; }
          body { background-color: white !important; margin: 0; padding: 0; } 
          table { width: 100% !important; border-collapse: collapse; } 
          th, td { border: 1px solid #000 !important; padding: 8px !important; color: black !important; } 
          
          /* Modifikasi CSS Cetak: Hancurkan Grid, Buat 1 Gambar 1 Halaman Penuh */
          .grid-keuangan {
            display: block !important;
          }
          .gambar-wrapper-cetak {
            display: block !important;
            width: 100% !important;
            page-break-after: always !important; 
            page-break-inside: avoid !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 0 20px 0 !important;
          }
          .item-gambar-cetak {
            width: 100% !important;
            max-height: 290mm !important; 
            object-fit: contain !important;
            border: none !important;
          }
        }
      `}} />

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e9ecef" }}>
        <div>
          <h3 style={{ margin: "0 0 5px 0", color: "#0A2540" }}>Sistem Warta Jemaat</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "gray" }}>Pilih tanggal untuk melihat jadwal pelayanan dan arsip.</p>
        </div>
        <div>
          <label style={{ fontWeight: "bold", marginRight: "10px", color: "#444" }}>Pilih Tanggal Acuan:</label>
          {semuaJadwalMinggu.length > 0 ? (
            <select 
              value={tanggalTerpilih} 
              onChange={(e) => setTanggalTerpilih(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", minWidth: "200px", fontWeight: "bold", cursor: "pointer", backgroundColor: "white" }}
            >
              {semuaJadwalMinggu.map(j => (
                <option key={j.id} value={j.tanggal}>
                  {formatTanggalDropdown(j.tanggal)}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: "red", fontSize: "14px" }}>Belum ada data jadwal.</span>
          )}
        </div>
      </div>
      
      <div id="dashboard-tabs" style={{ display: "flex", borderBottom: "4px solid #0A2540", marginBottom: "0", flexWrap: "wrap", gap: "5px" }}>
        <button style={getTabStyle("minggu")} onClick={() => setTabAktif("minggu")}>⛪ Informasi Pelayanan</button>
        <button style={getTabStyle("keuangan")} onClick={() => setTabAktif("keuangan")}>💰 Warta Keuangan</button>
        <button style={getTabStyle("lainnya")} onClick={() => setTabAktif("lainnya")}>📄 Warta Lain-lain</button>
        
        <button onClick={() => window.print()} style={{ padding: "12px 25px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px 8px 0 0", marginLeft: "auto", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          🖨️ Cetak Keseluruhan
        </button>
      </div>

      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "0 0 10px 10px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)", border: "1px solid #ddd", borderTop: "none" }}>
        
        {/* TAB 1: INFORMASI PELAYANAN */}
        <div className={`print-section ${tabAktif === "minggu" ? "screen-block" : "screen-none"}`}>
          {!loading && semuaJadwalMinggu.length > 0 && (
            <div style={{ border: "1px solid #e0e0e0", padding: "25px", borderRadius: "10px", backgroundColor: "white", marginBottom: "30px" }}>
              <h2 className="print-only" style={{ textAlign: "center", marginBottom: "20px" }}>WARTA PELAYANAN MINGGUAN</h2>
              {mingguIni ? (
                <>
                  <h4 style={{ backgroundColor: "#0A2540", color: "white", padding: "12px", margin: "-25px -25px 20px -25px", borderRadius: "10px 10px 0 0", textAlign: "center", fontSize: "16px" }}>
                    {(mingguIni.masa_raya || mingguIni.tema || "KEBAKTIAN MINGGU").toUpperCase()}
                  </h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f4f4f4", borderBottom: "2px solid #ccc", textAlign: "left" }}>
                        <th style={{ padding: "12px", border: "1px solid #ddd", width: "25%" }}>Parameter Pelayanan</th>
                        <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Ini ({formatTgl(mingguIni.tanggal)})</th>
                        <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Depan ({mingguDepan ? formatTgl(mingguDepan.tanggal) : "-"})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['petugas', 'pendamping', 'baca_firman', 'doa_persembahan', 'mazmur', 'pembacaan', 'masa_raya', 'tema', 'stola', 'busana', 'psvg'].map((k) => (
                        <tr key={k}>
                          <td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold", textTransform: "capitalize" }}>{k.replace('_', ' ')}</td>
                          <td style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center", color: k === 'petugas' ? "#007BFF" : "black", fontWeight: k === 'petugas' ? "bold" : "normal" }}>{mingguIni[k] || "-"}</td>
                          <td style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center" }}>{mingguDepan?.[k] || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : <p style={{ textAlign: "center", fontStyle: "italic", color: "red", marginBottom: "30px" }}>Tidak ada Jadwal Kebaktian untuk pekan ini.</p>}

              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px", marginTop: !mingguIni ? "0" : "20px" }}>PELAYANAN IBADAH RAYON SEPEKAN</h4>
              {jadwalRayonSepekan.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px", fontSize: "14px" }}>
                  <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Rayon</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Keluarga Pelayan</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Penatua Bertugas</th></tr></thead>
                  <tbody>{jadwalRayonSepekan.map((j, i) => <tr key={i}><td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaUnit}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)}, {formatTgl(j.tanggal)}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td></tr>)}</tbody>
                </table>
              ) : <p style={{ color: "gray", fontStyle: "italic", marginBottom: "40px" }}>Tidak ada jadwal ibadah rayon pada pekan ini.</p>}

              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px" }}>PELAYANAN KATEGORIAL & TAMBAHAN SEPEKAN</h4>
              {jadwalKategorialSepekan.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Kategori & Sektor</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Tempat / Anggota</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Petugas Pelayan</th></tr></thead>
                  <tbody>{jadwalKategorialSepekan.map((j, i) => <tr key={i}><td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaKategoriInduk} - {j.namaUnit}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)}, {formatTgl(j.tanggal)}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td></tr>)}</tbody>
                </table>
              ) : <p style={{ color: "gray", fontStyle: "italic" }}>Tidak ada jadwal kategorial pada pekan ini.</p>}
            </div>
          )}
        </div>

        {/* TAB 2: KEUANGAN */}
        <div className={`print-section ${tabAktif === "keuangan" ? "screen-block" : "screen-none"}`}>
          <h2 className="print-only" style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "20px" }}>Laporan Keuangan Jemaat</h2>
          
          <div className="no-print" style={{ backgroundColor: "#fdf1f1", padding: "30px", borderRadius: "8px", border: "2px dashed #dc3545", textAlign: "center", marginBottom: "30px", marginTop: "20px" }}>
            <label style={{ cursor: "pointer", fontWeight: "bold", color: "white", display: "inline-block", padding: "12px 25px", backgroundColor: "#dc3545", border: "none", borderRadius: "5px" }}>
              📂 Tambahkan Gambar Laporan
              <input type="file" multiple accept=".png,.jpg,.jpeg" style={{ display: "none" }} onChange={handlePilihGambar} />
            </label>
            <p style={{ marginTop: "10px", fontSize: "13px", color: "gray" }}>Anda dapat memilih lebih dari 1 file gambar sekaligus (JPG/PNG).</p>
          </div>

          {fileKeuangan.length > 0 ? (
            <div style={{ marginTop: "20px" }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "20px" }}>
                <div>
                  <span style={{ fontWeight: "bold", color: "#333" }}>Terpilih {fileKeuangan.length} Gambar</span>
                  <span style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "3px" }}>💡 Tahan dan geser (drag) gambar di bawah untuk mengubah urutan cetak.</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {!isKeuanganTersimpan && (
                    <button onClick={simpanFileKeuangan} style={{ padding: "8px 15px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>💾 Simpan</button>
                  )}
                  <button onClick={hapusSemuaFileKeuangan} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>🗑️ Hapus Semua</button>
                </div>
              </div>

              <div className="grid-keuangan" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {fileKeuangan.map((file, index) => (
                  <div 
                    key={index}
                    className="gambar-wrapper-cetak"
                    draggable
                    onDragStart={(e) => dragStart(e, index)}
                    onDragEnter={(e) => dragEnter(e, index)}
                    onDragEnd={drop}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ position: "relative", cursor: "grab", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", backgroundColor: "#f4f4f4", padding: "10px" }}
                  >
                    <div className="no-print" style={{ position: "absolute", top: "15px", left: "15px", backgroundColor: "#0A2540", color: "white", padding: "5px 10px", borderRadius: "5px", fontWeight: "bold", fontSize: "12px", zIndex: 1 }}>
                      Halaman {index + 1}
                    </div>
                    
                    <button 
                      className="no-print"
                      onClick={() => hapusSatuGambar(index)}
                      style={{ position: "absolute", top: "15px", right: "15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", zIndex: 1, fontSize: "12px" }}
                    >
                      Hapus
                    </button>

                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Keuangan ${index + 1}`} 
                      className="item-gambar-cetak"
                      style={{ width: "100%", height: "auto", display: "block" }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-print" style={{ textAlign: "center", color: "gray" }}>Belum ada laporan gambar untuk tanggal ini.</p>
          )}
        </div>

        {/* TAB 3: WARTA LAIN-LAIN */}
        <div className={`print-section ${tabAktif === "lainnya" ? "screen-block" : "screen-none"}`}>
          <h2 className="print-only" style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "20px" }}>Warta Lain-lain</h2>
          
          <div className="no-print" style={{ textAlign: "right", marginBottom: "15px" }}>
            {isEditingWarta ? (
              <button onClick={simpanWartaLain} style={{ padding: "8px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>💾 Simpan Teks</button>
            ) : (
              <button onClick={() => setIsEditingWarta(true)} style={{ padding: "8px 20px", backgroundColor: "#f8f9fa", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" }}>✏️ Edit (Copy-Paste dari Word)</button>
            )}
          </div>

          {isEditingWarta ? (
            <textarea
              className="no-print"
              value={teksWartaLain}
              onChange={(e) => setTeksWartaLain(e.target.value)}
              placeholder="Paste teks (copy dari Microsoft Word) di sini..."
              style={{ width: "100%", height: "400px", padding: "15px", borderRadius: "8px", border: "1px solid #007BFF", fontFamily: "Arial", fontSize: "14px", lineHeight: "1.6", boxSizing: "border-box" }}
            />
          ) : (
            <div style={{ minHeight: "200px", padding: "20px", backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", whiteSpace: "pre-wrap", textAlign: "justify", fontFamily: "Arial", lineHeight: "1.6", fontSize: "14px" }}>
              {teksWartaLain ? teksWartaLain : <span style={{ color: "gray", fontStyle: "italic", textAlign: "center", display: "block" }}>Tidak ada warta tambahan untuk tanggal ini. Klik tombol Edit untuk menambah warta.</span>}
            </div>
          )}
        </div>

        {/* BLOK TANDA TANGAN (HANYA MUNCUL SAAT CETAK KESELURUHAN) */}
        <div className="print-only" style={{ justifyContent: "space-between", marginTop: "60px", padding: "0 50px", pageBreakInside: "avoid" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 5px 0" }}>Mengetahui,</p>
            <p style={{ fontWeight: "bold", margin: "0 0 70px 0" }}>Wakil Ketua</p>
            <p style={{ fontWeight: "bold", margin: 0, textDecoration: "underline" }}>{profilGereja.wakilKetua || "......................................."}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 5px 0" }}>......, {formatTgl(tanggalTerpilih)}</p>
            <p style={{ fontWeight: "bold", margin: "0 0 70px 0" }}>Sekretaris</p>
            <p style={{ fontWeight: "bold", margin: 0, textDecoration: "underline" }}>{profilGereja.sekretaris || "......................................."}</p>
          </div>
        </div>

      </div>
    </div>
  );
}