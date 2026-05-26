import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CetakPelayanan() {
  const [jadwal, setJadwal] = useState([]);
  const [jadwalMinggu, setJadwalMinggu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabCetak, setTabCetak] = useState("rayon"); 
  const [sliderIndex, setSliderIndex] = useState(0);

  const [filterTanggalMulai, setFilterTanggalMulai] = useState("");
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [hasilCari, setHasilCari] = useState([]);
  
  const [profil, setProfil] = useState(null);
  const [masterRayon, setMasterRayon] = useState([]);
  const [masterKat, setMasterKat] = useState({});

  const [currentPageMinggu, setCurrentPageMinggu] = useState(1);
  const itemsPerPageMinggu = 10;

  useEffect(() => {
    const fetchSemua = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "jadwal_pelayanan"));
        const dataJadwal = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
        setJadwal(dataJadwal);

        const qMinggu = await getDocs(collection(db, "jadwal_minggu"));
        const dataMinggu = qMinggu.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
        setJadwalMinggu(dataMinggu);

        const docSnap = await getDoc(doc(db, "konfigurasi", "master_data"));
        if (docSnap.exists()) {
          const mData = docSnap.data();
          setProfil(mData.profilGereja);
          setMasterRayon(mData.pengaturanRayon || []);
          setMasterKat(mData.pengaturanKategorial || {});
        }
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchSemua();
  }, []);

  const jadwalRayon = jadwal.filter(j => j.kategoriPelayanan === "Rayon");
  const daftarNamaRayon = [...new Set(jadwalRayon.map(j => j.namaUnit || "Tanpa Nama"))].sort((a,b) => (a||"").localeCompare(b||"", undefined, {numeric: true}));
  
  const jadwalKategorial = jadwal.filter(j => j.kategoriPelayanan === "Kategorial");
  const daftarNamaKategori = [...new Set(jadwalKategorial.map(j => j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : (j.namaUnit || "Tanpa Nama")))].sort((a,b) => (a||"").localeCompare(b||""));
  
  const semuaUnit = [...new Set(jadwal.filter(j => j.kategoriPelayanan !== "Kebaktian Minggu").map(j => j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : (j.namaUnit || "Tanpa Nama")))].sort();

  const handleCari = () => {
    let filter = jadwal.filter(j => j.kategoriPelayanan !== "Kebaktian Minggu");
    if (filterTanggalMulai && filterTanggalAkhir) filter = filter.filter(j => j.tanggal >= filterTanggalMulai && j.tanggal <= filterTanggalAkhir);
    if (filterUnit) filter = filter.filter(j => {
       const uNama = j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit;
       return uNama === filterUnit;
    });
    setHasilCari(filter); 
  };

  const targetSlider = (tabCetak === "rayon" ? daftarNamaRayon[sliderIndex] : daftarNamaKategori[sliderIndex]) || "";
  
  const dataTampil = jadwal.filter(j => {
    const nama = j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit;
    return nama === targetSlider;
  });

  const generatePivotData = (arrJadwal) => {
    const mapKeluarga = new Map();
    arrJadwal.forEach(j => {
      const tKeluarga = j.tempatKeluarga || "Nama Kosong";
      if(!mapKeluarga.has(tKeluarga)) {
        mapKeluarga.set(tKeluarga, {
          nama: tKeluarga, petugas: j.petugas || "",
          bulan: { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[], 10:[], 11:[] }
        });
      }
      if (j.tanggal) {
        const d = new Date(j.tanggal + "T00:00:00");
        const monthIdx = d.getMonth();
        if (!isNaN(monthIdx)) {
          const dateStr = String(d.getDate()).padStart(2, '0');
          if(!mapKeluarga.get(tKeluarga).bulan[monthIdx].includes(dateStr)) {
            mapKeluarga.get(tKeluarga).bulan[monthIdx].push(dateStr);
          }
        }
      }
    });
    return Array.from(mapKeluarga.values());
  };

  const pivotData = generatePivotData(dataTampil);
  const bulanHeaders = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"];
  
  let namaSekretaris = profil?.sekretaris || "( .................................... )";
  let namaPenatua = "( .................................... )";

  if (tabCetak === "rayon" && targetSlider) {
      const r = masterRayon.find(x => x.namaRayon === targetSlider);
      if (r) namaPenatua = r.namaPenatua;
  } else if (tabCetak === "kategorial" && targetSlider) {
      const parts = targetSlider.split(" - ");
      if (parts.length === 2) {
           const k = masterKat[parts[0]];
           if (k) { const s = k.daftarSektor.find(x => x.namaSektor === parts[1]); if (s) namaPenatua = s.namaPenatua; }
      }
  }

  const indexOfLastMinggu = currentPageMinggu * itemsPerPageMinggu;
  const indexOfFirstMinggu = indexOfLastMinggu - itemsPerPageMinggu;
  const currentJadwalMinggu = jadwalMinggu.slice(indexOfFirstMinggu, indexOfLastMinggu);
  const totalPagesMinggu = Math.ceil(jadwalMinggu.length / itemsPerPageMinggu);

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Memuat modul cetak...</div>;

  return (
    <div style={{ backgroundColor: "#fdfdfd", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .tampilan-cetak-saja { display: none; }
        @media print { 
          #menu-cetak, .tampilan-layar-saja { display: none !important; } 
          .tampilan-cetak-saja { display: block !important; }
          body { background-color: white !important; } 
          .print-area { display: block !important; width: 100%; } 
          table { width: 100% !important; border-collapse: collapse; font-size: 11px; } 
          th, td { border: 1px solid black !important; padding: 4px !important; color: black !important; text-align: center; } 
          .align-left { text-align: left !important; }
          .ttd-box { display: flex !important; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; } 
        }
      `}} />

      <div id="menu-cetak" style={{ maxWidth: "1100px", margin: "20px auto", padding: "0 15px" }}>
        <div style={{ display: "flex", gap: "5px", borderBottom: "3px solid #007BFF", flexWrap: "wrap" }}>
          <button style={{ padding: "12px 15px", cursor: "pointer", border: "none", fontWeight: "bold", backgroundColor: tabCetak === "rayon" ? "#007BFF" : "#eee", color: tabCetak === "rayon" ? "white" : "black", borderRadius: "8px 8px 0 0", flex: 1 }} onClick={() => { setTabCetak("rayon"); setSliderIndex(0); }}>Ibadah Rayon</button>
          <button style={{ padding: "12px 15px", cursor: "pointer", border: "none", fontWeight: "bold", backgroundColor: tabCetak === "kategorial" ? "#007BFF" : "#eee", color: tabCetak === "kategorial" ? "white" : "black", borderRadius: "8px 8px 0 0", flex: 1 }} onClick={() => { setTabCetak("kategorial"); setSliderIndex(0); }}>Ibadah Kategorial</button>
          <button style={{ padding: "12px 15px", cursor: "pointer", border: "none", fontWeight: "bold", backgroundColor: tabCetak === "minggu" ? "#007BFF" : "#eee", color: tabCetak === "minggu" ? "white" : "black", borderRadius: "8px 8px 0 0", flex: 1 }} onClick={() => setTabCetak("minggu")}>Kebaktian Minggu</button>
          <button style={{ padding: "12px 15px", cursor: "pointer", border: "none", fontWeight: "bold", backgroundColor: tabCetak === "pencarian" ? "#007BFF" : "#eee", color: tabCetak === "pencarian" ? "white" : "black", borderRadius: "8px 8px 0 0", flex: 1 }} onClick={() => setTabCetak("pencarian")}>Pencarian & Filter</button>
        </div>

        <div style={{ padding: "25px", backgroundColor: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 8px 8px", marginBottom: "30px" }}>
          <button onClick={() => window.print()} style={{ float: "right", padding: "10px 15px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>🖨️ Cetak Seluruh Jadwal</button>
          <h2 style={{ marginTop: 0, color: "#0A2540" }}>Modul Cetak {tabCetak === "pencarian" ? "Pencarian" : tabCetak === "minggu" ? "Kebaktian Minggu" : targetSlider}</h2>

          {(tabCetak === "rayon" || tabCetak === "kategorial") && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0A2540", color: "white", padding: "12px", borderRadius: "8px", maxWidth: "450px", margin: "25px auto" }}>
              <button onClick={() => setSliderIndex(sliderIndex > 0 ? sliderIndex - 1 : 0)} style={{ cursor: "pointer", fontWeight: "bold", padding: "5px 15px", fontSize: "16px", color: "white", backgroundColor: "transparent", border: "none" }}>&lt;&lt;</button>
              <span style={{ fontWeight: "bold", textAlign: "center", flex: 1 }}>{targetSlider || "Belum ada data"}</span>
              <button onClick={() => setSliderIndex(sliderIndex < (tabCetak === "rayon" ? daftarNamaRayon.length : daftarNamaKategori.length) - 1 ? sliderIndex + 1 : sliderIndex)} style={{ cursor: "pointer", fontWeight: "bold", padding: "5px 15px", fontSize: "16px", color: "white", backgroundColor: "transparent", border: "none" }}>&gt;&gt;</button>
            </div>
          )}

          {tabCetak === "pencarian" && (
            <div style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap", backgroundColor: "#f4f8ff", padding: "20px", borderRadius: "8px", border: "1px solid #cce5ff" }}>
              <div><label style={{ fontWeight: "bold", fontSize: "13px" }}>Dari Tanggal</label><br/><input type="date" value={filterTanggalMulai} onChange={e => setFilterTanggalMulai(e.target.value)} style={{ padding: "10px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} /></div>
              <div><label style={{ fontWeight: "bold", fontSize: "13px" }}>Sampai Tanggal</label><br/><input type="date" value={filterTanggalAkhir} onChange={e => setFilterTanggalAkhir(e.target.value)} style={{ padding: "10px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} /></div>
              <div><label style={{ fontWeight: "bold", fontSize: "13px" }}>Pilih Rayon/Kategori</label><br/><select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} style={{ padding: "10px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }}><option value="">Semua Wilayah</option>{semuaUnit.map((u, i) => <option key={i} value={u}>{u}</option>)}</select></div>
              <button onClick={handleCari} style={{ padding: "11px 20px", backgroundColor: "#0A2540", color: "white", cursor: "pointer", border: "none", borderRadius: "4px", fontWeight: "bold" }}>🔍 Cari</button>
            </div>
          )}
        </div>
      </div>

      <div className="print-area" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 15px", backgroundColor: "white" }}>
        <div style={{ textAlign: "center", marginBottom: "20px", color: "black" }}>
          <h3 style={{ margin: "5px 0" }}>JADWAL {tabCetak === "minggu" ? "KEBAKTIAN MINGGU" : tabCetak === "pencarian" ? "IBADAH GEREJA" : "IBADAH " + (tabCetak === "rayon" ? "RUMAH TANGGA " : "KATEGORIAL ") + targetSlider?.toUpperCase()}</h3>
          <h3 style={{ margin: "5px 0" }}>JEMAAT {profil?.namaJemaat?.toUpperCase() || "KOA I"} – {profil?.namaMataJemaat?.toUpperCase() || "SYALOM HAUSUSU"}</h3>
        </div>

        {tabCetak === "minggu" ? (
          <>
            {/* TABEL 1: UNTUK TAMPILAN DI LAYAR (DENGAN PAGINATION) */}
            <div className="tampilan-layar-saja">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f4f4f4" }}>
                    <th>TANGGAL</th><th>MASA RAYA</th><th>BACAAN & MAZMUR</th>
                    <th>TEMA</th><th>STOLA & BUSANA</th><th>PS/VG</th>
                    <th>PELAYAN FIRMAN</th><th>PENDAMPING</th>
                    <th>BACA FIRMAN</th><th>DOA PERSEMBAHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {currentJadwalMinggu.map((j) => (
                    <tr key={j.id}>
                      <td>{j.tanggal ? new Date(j.tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</td>
                      <td>{j.masa_raya}</td>
                      <td className="align-left"><b>Baca:</b> {j.pembacaan}<br/><b>Mzr:</b> {j.mazmur}</td>
                      <td className="align-left">{j.tema}</td>
                      <td className="align-left"><b>Stola:</b> {j.stola}<br/><b>Busana:</b> {j.busana}</td>
                      <td>{j.psvg}</td>
                      <td className="align-left">{j.petugas}</td>
                      <td className="align-left">{j.pendamping}</td>
                      <td className="align-left">{j.baca_firman}</td>
                      <td className="align-left">{j.doa_persembahan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "10px", backgroundColor: "#f4f4f4", borderRadius: "5px" }}>
                <button onClick={() => setCurrentPageMinggu(p => Math.max(1, p - 1))} disabled={currentPageMinggu === 1} style={{ padding: "8px 15px", cursor: currentPageMinggu === 1 ? "not-allowed" : "pointer", backgroundColor: currentPageMinggu === 1 ? "#ccc" : "#0A2540", color: "white", border: "none", borderRadius: "4px" }}>&laquo; Sebelumnya</button>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>Tampilan Layar {currentPageMinggu} dari {totalPagesMinggu}</span>
                <button onClick={() => setCurrentPageMinggu(p => Math.min(totalPagesMinggu, p + 1))} disabled={currentPageMinggu === totalPagesMinggu} style={{ padding: "8px 15px", cursor: currentPageMinggu === totalPagesMinggu ? "not-allowed" : "pointer", backgroundColor: currentPageMinggu === totalPagesMinggu ? "#ccc" : "#0A2540", color: "white", border: "none", borderRadius: "4px" }}>Selanjutnya &raquo;</button>
              </div>
            </div>

            {/* TABEL 2: UNTUK MESIN CETAK/PDF (TAMPILKAN SEMUA DATA) */}
            <div className="tampilan-cetak-saja">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f4f4f4" }}>
                    <th>TANGGAL</th><th>MASA RAYA</th><th>BACAAN & MAZMUR</th>
                    <th>TEMA</th><th>STOLA & BUSANA</th><th>PS/VG</th>
                    <th>PELAYAN FIRMAN</th><th>PENDAMPING</th>
                    <th>BACA FIRMAN</th><th>DOA PERSEMBAHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwalMinggu.map((j) => (
                    <tr key={j.id}>
                      <td>{j.tanggal ? new Date(j.tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</td>
                      <td>{j.masa_raya}</td>
                      <td className="align-left"><b>Baca:</b> {j.pembacaan}<br/><b>Mzr:</b> {j.mazmur}</td>
                      <td className="align-left">{j.tema}</td>
                      <td className="align-left"><b>Stola:</b> {j.stola}<br/><b>Busana:</b> {j.busana}</td>
                      <td>{j.psvg}</td>
                      <td className="align-left">{j.petugas}</td>
                      <td className="align-left">{j.pendamping}</td>
                      <td className="align-left">{j.baca_firman}</td>
                      <td className="align-left">{j.doa_persembahan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tabCetak === "pencarian" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th>No</th><th>Unit</th><th>Tanggal</th><th>Tempat (Keluarga)</th><th>Petugas Pelayan</th></tr></thead>
            <tbody>
              {hasilCari.map((item, idx) => {
                const datePrint = item.tanggal ? new Date(item.tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-";
                return (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td className="align-left">{(item.namaKategoriInduk ? `${item.namaKategoriInduk} - ` : '') + (item.namaUnit || "")}</td>
                    <td>{datePrint}</td>
                    <td className="align-left">{item.tempatKeluarga}</td>
                    <td className="align-left">{item.petugas}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f4f4f4" }}>
                <th rowSpan="2" style={{ width: "3%" }}>NO</th>
                <th rowSpan="2" style={{ width: "15%" }} className="align-left">NAMA KK / ANGGOTA</th>
                <th colSpan="12">BULAN</th>
                <th rowSpan="2" style={{ width: "15%" }}>PETUGAS</th>
                <th rowSpan="2" style={{ width: "10%" }}>KET</th>
              </tr>
              <tr style={{ backgroundColor: "#f4f4f4" }}>
                {bulanHeaders.map(b => <th key={b} style={{ width: "4%" }}>{b}</th>)}
              </tr>
            </thead>
            <tbody>
              {pivotData.map((row, idx) => {
                 const isRekan = row.petugas.toLowerCase().includes("rekan");
                 return (
                   <tr key={idx}>
                     <td>{idx + 1}</td>
                     <td className="align-left" style={{ fontWeight: "bold" }}>{row.nama}</td>
                     {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => <td key={m}>{row.bulan[m].join(", ")}</td>)}
                     <td className="align-left">{row.petugas}</td>
                     <td className="align-left" style={{ color: isRekan ? "green" : "black", fontWeight: isRekan ? "bold" : "normal" }}>{isRekan ? "REKAN PENATUA" : ""}</td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        )}

        {tabCetak !== "pencarian" && tabCetak !== "minggu" && (
          <div className="ttd-box" style={{ display: "flex", justifyContent: "space-between", marginTop: "50px" }}>
            <div style={{ textAlign: "center", width: "40%" }}><p style={{ marginBottom: "70px", color: "black" }}>Penatua Bertugas,</p><p style={{ fontWeight: "bold", textDecoration: "underline", color: "black" }}>{namaPenatua}</p></div>
            <div style={{ textAlign: "center", width: "40%" }}><p style={{ marginBottom: "70px", color: "black" }}>Sekretaris Jemaat,</p><p style={{ fontWeight: "bold", textDecoration: "underline", color: "black" }}>{namaSekretaris}</p></div>
          </div>
        )}
      </div>
      <div style={{ paddingBottom: "50px" }}></div>
    </div>
  );
}