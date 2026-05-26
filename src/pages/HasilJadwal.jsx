// src/pages/HasilJadwal.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function HasilJadwal() {
  const [jadwalHarian, setJadwalHarian] = useState([]);
  const [jadwalMinggu, setJadwalMinggu] = useState([]);
  const [unitTerpilih, setUnitTerpilih] = useState("");
  const [loading, setLoading] = useState(true);

  // --- STATE PAGINATION KEBAKTIAN MINGGU ---
  const [currentPageMinggu, setCurrentPageMinggu] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    const q1 = await getDocs(collection(db, "jadwal_pelayanan"));
    setJadwalHarian(q1.docs.map(d => ({ id: d.id, ...d.data() }))
                             .filter(j => j.kategoriPelayanan !== "Kebaktian Minggu")
                             .sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal)));
    
    const q2 = await getDocs(collection(db, "jadwal_minggu"));
    setJadwalMinggu(q2.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal)));
    
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Reset halaman ke 1 setiap kali mengganti unit terpilih
  useEffect(() => { setCurrentPageMinggu(1); }, [unitTerpilih]);

  const semuaUnit = [...new Set(jadwalHarian.map(j => j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit || "Tanpa Nama"))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  
  const dataTampil = jadwalHarian.filter(j => {
    const nama = j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit;
    return nama === unitTerpilih;
  });

  const keluargaDasarSet = new Set();
  const dataDenganKunci = dataTampil.map(j => {
    const tempat = j.tempatKeluarga || "Kosong";
    const isBase = !keluargaDasarSet.has(tempat.toLowerCase());
    keluargaDasarSet.add(tempat.toLowerCase());
    return { ...j, isBase }; 
  });

  const handleEditMassal = async (oldName, newName, field) => {
    if (!newName.trim() || oldName === newName) return;
    const dokumenTerdampak = dataTampil.filter(j => (j[field] || "").toLowerCase() === oldName.toLowerCase());
    const batch = writeBatch(db);
    dokumenTerdampak.forEach(docItem => {
      batch.update(doc(db, "jadwal_pelayanan", docItem.id), { [field]: newName });
    });
    await batch.commit();
    loadData(); 
  };

  const handleHapusHarian = async (id) => {
    if (window.confirm("Hapus baris jadwal ini secara permanen?")) {
      await deleteDoc(doc(db, "jadwal_pelayanan", id));
      loadData();
    }
  };

  const handleHapusMinggu = async (id) => {
    if (window.confirm("Hapus jadwal minggu ini secara permanen?")) {
      await deleteDoc(doc(db, "jadwal_minggu", id));
      loadData();
    }
  };

  const handleUpdateMinggu = async (id, field, value) => {
    await updateDoc(doc(db, "jadwal_minggu", id), { [field]: value });
    loadData();
  };

  // --- LOGIKA PAGINATION ---
  const indexOfLastItem = currentPageMinggu * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJadwalMinggu = jadwalMinggu.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesMinggu = Math.ceil(jadwalMinggu.length / itemsPerPage);

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Memuat hasil jadwal...</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      <h2 style={{ color: "#0A2540", marginBottom: "20px" }}>📋 Peninjauan & Koreksi Hasil Jadwal</h2>
      
      <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}>Pilih Unit untuk Dikoreksi:</label>
        <select value={unitTerpilih} onChange={e => setUnitTerpilih(e.target.value)} style={{ padding: "10px", width: "100%", borderRadius: "5px", border: "1px solid #aaa" }}>
          <option value="">-- Pilih Jadwal yang ingin dikoreksi --</option>
          <optgroup label="Ibadah Rayon / Kategorial">
            {semuaUnit.map((u, i) => <option key={i} value={u}>{u}</option>)}
          </optgroup>
        </select>
      </div>
    </div>
  );
}