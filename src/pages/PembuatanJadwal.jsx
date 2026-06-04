import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, query, where, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function PembuatanJadwal() {
  const [loading, setLoading] = useState(true);
  const [subMode, setSubMode] = useState("rayon"); 
  
  // Data Master
  const [daftarRayon, setDaftarRayon] = useState([]);
  const [dataKategorial, setDataKategorial] = useState({});
  const [kategoriAktif, setKategoriAktif] = useState([]);
  const [kategoriIndex, setKategoriIndex] = useState(0);
  
  // Target Target (Rayon/Sektor)
  const [targetTerpilih, setTargetTerpilih] = useState(null);
  
  // UI States
  const [showForm, setShowForm] = useState(false);
  
  // Form Generate
  const [konfigurasi, setKonfigurasi] = useState({
    namaTarget: "", namaPenatua: "", kkPenatua: "", 
    tanggalMulai: "", tanggalAkhir: "", jumlahPelayanan: 1, 
    hari1: "3", hari2: "5", jangkaWaktu: 1
  });
  const [teksDaftarKK, setTeksDaftarKK] = useState("");
  
  // Data Tabel
  const [jadwalTersimpan, setJadwalTersimpan] = useState([]);
  const [editBarisId, setEditBarisId] = useState(null);
  const [dataEdit, setDataEdit] = useState({});
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        // 1. Ambil Data Master Konfigurasi
        const docSnap = await getDoc(doc(db, "konfigurasi", "master_data"));
        
        // 2. Ambil seluruh data jadwal untuk mengecek status centang awal (sudah terisi atau belum)
        const jadwalSnap = await getDocs(collection(db, "jadwal_pelayanan"));
        const semuaJadwal = jadwalSnap.docs.map(d => d.data());

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.pengaturanRayon) {
            setDaftarRayon(data.pengaturanRayon.map(r => {
              // Cek apakah Rayon ini sudah punya jadwal
              const sudahAda = semuaJadwal.some(j => j.kategoriPelayanan === 'Rayon' && j.namaUnit === r.namaRayon);
              return { ...r, isSelesai: sudahAda };
            }));
          }
          
          if (data.pengaturanKategorial) {
            const aktifKats = Object.keys(data.pengaturanKategorial).filter(k => data.pengaturanKategorial[k].aktif);
            setKategoriAktif(aktifKats);
            
            let katData = { ...data.pengaturanKategorial };
            aktifKats.forEach(k => {
              katData[k].daftarSektor = katData[k].daftarSektor.map(s => {
                // Cek apakah Sektor pada Kategori ini sudah punya jadwal (Isolasi 3 Parameter)
                const sudahAda = semuaJadwal.some(j => j.kategoriPelayanan === 'Kategorial' && j.namaKategoriInduk === k && j.namaUnit === s.namaSektor);
                return { ...s, isSelesai: sudahAda };
              });
            });
            setDataKategorial(katData);
          }
        }
      } catch (error) {
        console.error("Gagal menarik data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Jadwal Terisolasi agar tidak "Bocor" antar Kategori/Rayon yang namanya sama
  const fetchJadwalUnit = async (target) => {
    if (!target) return;
    try {
      let q;
      if (target.tipe === 'rayon') {
        q = query(collection(db, "jadwal_pelayanan"), 
          where("kategoriPelayanan", "==", "Rayon"),
          where("namaUnit", "==", target.namaRayon)
        );
      } else {
        q = query(collection(db, "jadwal_pelayanan"), 
          where("kategoriPelayanan", "==", "Kategorial"),
          where("namaKategoriInduk", "==", target.namaKategoriRoot),
          where("namaUnit", "==", target.namaSektor)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const jadwal = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      jadwal.sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
      setJadwalTersimpan(jadwal);
      setCurrentPage(1); 
    } catch (error) {
      console.error("Gagal fetch jadwal unit", error);
    }
  };

  const handlePilihTarget = (item, tipe, namaKategoriRoot = "") => {
    const targetBaru = { ...item, tipe, namaKategoriRoot };
    setTargetTerpilih(targetBaru);
    
    const targetName = tipe === 'rayon' ? item.namaRayon : item.namaSektor;
    setKonfigurasi(prev => ({
      ...prev,
      namaTarget: targetName,
      namaPenatua: item.namaPenatua,
      kkPenatua: ""
    }));
    
    // Tarik data tabel berdasarkan target yang baru dipilih
    fetchJadwalUnit(targetBaru);
    setShowForm(false); 
  };

  const geserKiri = () => setKategoriIndex(prev => (prev === 0 ? kategoriAktif.length - 1 : prev - 1));
  const geserKanan = () => setKategoriIndex(prev => (prev === kategoriAktif.length - 1 ? 0 : prev + 1));
  const handleConfigChange = (e) => setKonfigurasi({ ...konfigurasi, [e.target.name]: e.target.value });

  const buatDanSimpanJadwal = async () => {
    if (!konfigurasi.tanggalMulai || !konfigurasi.tanggalAkhir || !konfigurasi.kkPenatua) {
      alert("Lengkapi Tanggal & KK Penatua!");
      return;
    }
    const daftarKK = teksDaftarKK.split("\n").map(n => n.trim()).filter(n => n !== "");
    if (!daftarKK.length) return alert("Daftar Anggota/KK kosong!");

    let currentDate = new Date(konfigurasi.tanggalMulai);
    const endDate = new Date(konfigurasi.tanggalAkhir);
    const hariDiizinkan = [parseInt(konfigurasi.hari1, 10)];
    if (parseInt(konfigurasi.jumlahPelayanan, 10) === 2) hariDiizinkan.push(parseInt(konfigurasi.hari2, 10));

    let hasilJadwal = [], indeksKK = 0;
    while (currentDate <= endDate) {
      const hariIni = currentDate.getDay();
      if (hariDiizinkan.includes(hariIni)) {
        const namaKeluargaSaatIni = daftarKK[indeksKK % daftarKK.length];
        let petugasSaatIni = konfigurasi.namaPenatua;
        if (namaKeluargaSaatIni.toLowerCase() === konfigurasi.kkPenatua.toLowerCase()) {
          petugasSaatIni = "Rekan Penatua";
        }
        hasilJadwal.push({
          kategoriPelayanan: targetTerpilih.tipe === 'rayon' ? 'Rayon' : 'Kategorial',
          namaKategoriInduk: targetTerpilih.tipe === 'kategori' ? targetTerpilih.namaKategoriRoot : null,
          namaUnit: konfigurasi.namaTarget,
          tanggal: currentDate.toISOString().split("T")[0],
          tempatKeluarga: namaKeluargaSaatIni, 
          petugas: petugasSaatIni
        });
        indeksKK++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      if (hariIni === 6 && parseInt(konfigurasi.jangkaWaktu, 10) === 2) {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    try {
      const batch = writeBatch(db);
      const jadwalRef = collection(db, "jadwal_pelayanan");
      hasilJadwal.forEach(j => {
        batch.set(doc(jadwalRef), j);
      });
      await batch.commit();

      // Beri Centang Selesai di UI Kiri
      if (targetTerpilih.tipe === 'rayon') {
        setDaftarRayon(prev => prev.map(r => r.id === targetTerpilih.id ? { ...r, isSelesai: true } : r));
      } else {
        setDataKategorial(prev => {
          const root = targetTerpilih.namaKategoriRoot;
          const sektorBaru = prev[root].daftarSektor.map(s => s.id === targetTerpilih.id ? { ...s, isSelesai: true } : s);
          return { ...prev, [root]: { ...prev[root], daftarSektor: sektorBaru } };
        });
      }

      alert("Jadwal berhasil digenerate dan disimpan!");
      setTeksDaftarKK("");
      setShowForm(false);
      fetchJadwalUnit(targetTerpilih); // Refresh tabel dengan objek target
    } catch (error) { 
      alert("Gagal menyimpan jadwal."); 
    }
  };

  const handleHapusMassal = async () => {
    if(!window.confirm(`PERINGATAN: Anda akan menghapus SELURUH data Jadwal Kebaktian untuk ${konfigurasi.namaTarget}. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`)) return;
    try {
      const batch = writeBatch(db);
      // Hapus data yang ada di tabel saat ini (yang sudah terisolasi aman)
      jadwalTersimpan.forEach(j => {
        batch.delete(doc(db, "jadwal_pelayanan", j.id));
      });
      await batch.commit();
      
      // Hapus Centang jadi Kotak Kosong di UI Kiri
      if (targetTerpilih.tipe === 'rayon') {
        setDaftarRayon(prev => prev.map(r => r.id === targetTerpilih.id ? { ...r, isSelesai: false } : r));
      } else {
        setDataKategorial(prev => {
          const root = targetTerpilih.namaKategoriRoot;
          const sektorBaru = prev[root].daftarSektor.map(s => s.id === targetTerpilih.id ? { ...s, isSelesai: false } : s);
          return { ...prev, [root]: { ...prev[root], daftarSektor: sektorBaru } };
        });
      }
      
      fetchJadwalUnit(targetTerpilih);
    } catch (err) {
      alert("Gagal menghapus jadwal massal");
    }
  };

  const handleHapusSatu = async (id) => {
    if(!window.confirm("Hapus baris jadwal ini?")) return;
    await deleteDoc(doc(db, "jadwal_pelayanan", id));
    fetchJadwalUnit(targetTerpilih);
  };

  const handleSimpanEdit = async (id) => {
    await updateDoc(doc(db, "jadwal_pelayanan", id), dataEdit);
    setEditBarisId(null);
    fetchJadwalUnit(targetTerpilih);
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJadwal = jadwalTersimpan.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jadwalTersimpan.length / itemsPerPage) || 1;

  if (loading) return <p style={{ padding: "20px" }}>Memuat Master Data & Status Jadwal...</p>;

  const kategoriSaatIni = kategoriAktif[kategoriIndex];

  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => { setSubMode("rayon"); setTargetTerpilih(null); setJadwalTersimpan([]); setShowForm(false); }} style={{ padding: "10px", fontWeight: "bold", backgroundColor: subMode === "rayon" ? "#007BFF" : "#ddd", color: subMode === "rayon" ? "white" : "black", border: "none", cursor: "pointer", borderRadius: "5px" }}>Pelayanan Rayon</button>
        <button onClick={() => { setSubMode("kategori"); setTargetTerpilih(null); setJadwalTersimpan([]); setShowForm(false); }} style={{ padding: "10px", fontWeight: "bold", backgroundColor: subMode === "kategori" ? "#007BFF" : "#ddd", color: subMode === "kategori" ? "white" : "black", border: "none", cursor: "pointer", borderRadius: "5px" }}>Pelayanan Kategorial</button>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* PANEL KIRI */}
        <div style={{ width: "250px", borderRight: "2px solid #ddd", paddingRight: "20px" }}>
          {subMode === "rayon" ? (
            <>
              <h3>Daftar Rayon</h3>
              {daftarRayon.map(r => (
                <div key={r.id} onClick={() => handlePilihTarget(r, 'rayon')} style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "5px", cursor: "pointer", display: "flex", justifyContent: "space-between", backgroundColor: targetTerpilih?.id === r.id ? "#e6f2ff" : "white", borderRadius: "5px" }}>
                  <span>{r.namaRayon}</span> <span style={{ color: r.isSelesai ? "green" : "gray" }}>{r.isSelesai ? "✅" : "◻️"}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <h3>Daftar Kategorial</h3>
              {kategoriAktif.length > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#333", color: "white", padding: "10px", borderRadius: "5px", marginBottom: "15px" }}>
                    <span onClick={geserKiri} style={{ cursor: "pointer", fontWeight: "bold", padding: "0 10px" }}>&lt;&lt;</span>
                    <span style={{ fontWeight: "bold", textAlign: "center", flex: 1 }}>{kategoriSaatIni}</span>
                    <span onClick={geserKanan} style={{ cursor: "pointer", fontWeight: "bold", padding: "0 10px" }}>&gt;&gt;</span>
                  </div>
                  {dataKategorial[kategoriSaatIni]?.daftarSektor.map(s => (
                    <div key={s.id} onClick={() => handlePilihTarget(s, 'kategori', kategoriSaatIni)} style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "5px", cursor: "pointer", display: "flex", justifyContent: "space-between", backgroundColor: targetTerpilih?.id === s.id ? "#e6f2ff" : "white", borderRadius: "5px" }}>
                      <span>{s.namaSektor}</span> <span style={{ color: s.isSelesai ? "green" : "gray" }}>{s.isSelesai ? "✅" : "◻️"}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p style={{ color: "red", fontSize: "12px" }}>Belum ada kategori aktif. Atur di Master Data.</p>
              )}
            </>
          )}
        </div>

        {/* PANEL KANAN */}
        <div style={{ flex: 1 }}>
          {!targetTerpilih ? <h2 style={{ color: "gray", textAlign: "center", marginTop: "50px" }}>Pilih unit di panel kiri.</h2> : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h2>Manajemen: {targetTerpilih.tipe === 'kategori' ? `${targetTerpilih.namaKategoriRoot} - ` : ''}{konfigurasi.namaTarget}</h2>
                {jadwalTersimpan.length > 0 && (
                  <button onClick={handleHapusMassal} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                    🗑️ Kosongkan Data Jadwal {konfigurasi.namaTarget}
                  </button>
                )}
              </div>

              <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: "20px", padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>
                {showForm ? "Sembunyikan Form Tambah Jadwal" : "+ Tambah Jadwal Manual"}
              </button>

              {showForm && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "20px" }}>
                  <div><label>Penatua Bertugas</label><input type="text" name="namaPenatua" value={konfigurasi.namaPenatua} onChange={handleConfigChange} style={{ width: "100%", padding: "5px" }} /></div>
                  <div><label style={{ color: "blue" }}>KK / Anggota Penatua</label><input type="text" name="kkPenatua" value={konfigurasi.kkPenatua} onChange={handleConfigChange} placeholder="Pemicu Rekan Penatua" style={{ width: "100%", padding: "5px" }} /></div>
                  <div><label>Tgl Mulai</label><input type="date" name="tanggalMulai" value={konfigurasi.tanggalMulai} onChange={handleConfigChange} style={{ width: "100%", padding: "5px" }} /></div>
                  <div><label>Tgl Akhir</label><input type="date" name="tanggalAkhir" value={konfigurasi.tanggalAkhir} onChange={handleConfigChange} style={{ width: "100%", padding: "5px" }} /></div>
                  
                  <div style={{ gridColumn: "1 / span 2", display: "flex", gap: "10px", marginTop: "10px" }}>
                    <select name="jangkaWaktu" value={konfigurasi.jangkaWaktu} onChange={handleConfigChange} style={{ padding: "5px" }}>
                      <option value={1}>Tiap Minggu</option><option value={2}>Lompat 2 Minggu</option>
                    </select>
                    <select name="jumlahPelayanan" value={konfigurasi.jumlahPelayanan} onChange={handleConfigChange} style={{ padding: "5px" }}>
                      <option value={1}>1x Seminggu</option><option value={2}>2x Seminggu</option>
                    </select>
                    <select name="hari1" value={konfigurasi.hari1} onChange={handleConfigChange} style={{ padding: "5px" }}>
                      <option value="0">Ming</option><option value="1">Sen</option><option value="2">Sel</option><option value="3">Rab</option><option value="4">Kam</option><option value="5">Jum</option><option value="6">Sab</option>
                    </select>
                    {parseInt(konfigurasi.jumlahPelayanan) === 2 && (
                      <select name="hari2" value={konfigurasi.hari2} onChange={handleConfigChange} style={{ padding: "5px" }}>
                        <option value="0">Ming</option><option value="1">Sen</option><option value="2">Sel</option><option value="3">Rab</option><option value="4">Kam</option><option value="5">Jum</option><option value="6">Sab</option>
                      </select>
                    )}
                  </div>
                  <textarea rows="4" value={teksDaftarKK} onChange={e => setTeksDaftarKK(e.target.value)} placeholder="Paste data anggota di sini..." style={{ gridColumn: "1 / span 2", width: "100%", marginTop: "10px", padding: "10px" }}></textarea>
                  <button onClick={buatDanSimpanJadwal} style={{ gridColumn: "1 / span 2", padding: "10px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Generate & Simpan</button>
                </div>
              )}

              {/* TABEL HASIL & INLINE EDIT */}
              <div style={{ marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0 }}>Hasil Jadwal: {konfigurasi.namaTarget}</h3>
                  {jadwalTersimpan.length > 0 && (
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: "5px", borderRadius: "5px" }}>
                      <option value={5}>Tampilkan 5 Baris</option>
                      <option value={10}>Tampilkan 10 Baris</option>
                    </select>
                  )}
                </div>

                {jadwalTersimpan.length > 0 ? (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                      <thead>
                        <tr style={{ background: "#eee", textAlign: "left" }}>
                          <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Tanggal</th>
                          <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Keluarga/Anggota</th>
                          <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Petugas</th>
                          <th style={{ padding: "10px", borderBottom: "1px solid #ccc", textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentJadwal.map((j) => (
                          <tr key={j.id} style={{ borderBottom: "1px solid #eee" }}>
                            {editBarisId === j.id ? (
                              <>
                                <td style={{ padding: "8px" }}><input type="date" value={dataEdit.tanggal} onChange={(e) => setDataEdit({ ...dataEdit, tanggal: e.target.value })} style={{ width: "100%" }} /></td>
                                <td style={{ padding: "8px" }}><input type="text" value={dataEdit.tempatKeluarga} onChange={(e) => setDataEdit({ ...dataEdit, tempatKeluarga: e.target.value })} style={{ width: "100%" }} /></td>
                                <td style={{ padding: "8px" }}><input type="text" value={dataEdit.petugas} onChange={(e) => setDataEdit({ ...dataEdit, petugas: e.target.value })} style={{ width: "100%" }} /></td>
                                <td style={{ padding: "8px", textAlign: "center", display: "flex", gap: "5px", justifyContent: "center" }}>
                                  <button onClick={() => handleSimpanEdit(j.id)} style={{ padding: "5px 10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>Simpan</button>
                                  <button onClick={() => setEditBarisId(null)} style={{ padding: "5px 10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>Batal</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: "8px" }}>{j.tanggal}</td>
                                <td style={{ padding: "8px" }}>{j.tempatKeluarga}</td>
                                <td style={{ padding: "8px", color: j.petugas === "Rekan Penatua" ? "green" : "black" }}>{j.petugas}</td>
                                <td style={{ padding: "8px", textAlign: "center", display: "flex", gap: "5px", justifyContent: "center" }}>
                                  <button onClick={() => { setEditBarisId(j.id); setDataEdit(j); }} style={{ padding: "5px 10px", backgroundColor: "#ffc107", border: "none", borderRadius: "3px", cursor: "pointer" }}>✏️ Edit</button>
                                  <button onClick={() => handleHapusSatu(j.id)} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>🗑️ Hapus</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Kontrol Pagination */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" }}>
                      <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: "8px 12px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>&lt; Prev</button>
                      <span>Halaman {currentPage} dari {totalPages}</span>
                      <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: "8px 12px", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next &gt;</button>
                    </div>
                  </>
                ) : (
                  <p style={{ textAlign: "center", color: "gray", marginTop: "20px" }}>Belum ada jadwal tersimpan untuk unit ini. Status tabel masih kosong (◻️).</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}