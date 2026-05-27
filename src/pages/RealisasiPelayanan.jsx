import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function RealisasiPelayanan() {
  const [jadwal, setJadwal] = useState([]);
  const [subMode, setSubMode] = useState("rayon"); // "rayon", "kategori", atau "grafik"
  const [indexSlider, setIndexSlider] = useState(0);

  // Load data dari Firestore
  useEffect(() => {
    const load = async () => {
      const q = await getDocs(collection(db, "jadwal_pelayanan"));
      setJadwal(
        q.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
      );
    };
    load();
  }, []);

  // Fungsi untuk update data realisasi langsung ke Firestore
  const handleUpdateRealisasi = async (id, field, value) => {
    setJadwal((prevData) =>
      prevData.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    try {
      const jadwalRef = doc(db, "jadwal_pelayanan", id);
      await updateDoc(jadwalRef, {
        [field]: value,
      });
    } catch (error) {
      console.error("Gagal mengupdate data:", error);
      alert("Gagal menyimpan data ke database. Periksa koneksi Anda.");
    }
  };

  const listUnit =
    subMode === "rayon"
      ? [...new Set(jadwal.filter((j) => j.kategoriPelayanan === "Rayon").map((j) => j.namaUnit || "Tanpa Nama"))].sort((a, b) => (a || "").localeCompare(b || "", undefined, { numeric: true }))
      : subMode === "kategori"
      ? [...new Set(jadwal.filter((j) => j.kategoriPelayanan === "Kategorial").map((j) => j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit || "Tanpa Nama"))].sort((a, b) => (a || "").localeCompare(b || ""))
      : [];

  const targetUnit = listUnit[indexSlider] || "";

  const filteredData = jadwal.filter((j) => {
    const nama = j.namaKategoriInduk ? `${j.namaKategoriInduk} - ${j.namaUnit}` : j.namaUnit;
    return nama === targetUnit;
  });

  const getChartDataRayon = () => {
    const chartMap = {};
    jadwal
      .filter((j) => j.kategoriPelayanan === "Rayon")
      .forEach((j) => {
        const isTerlaksana = j.tgl_pelaksanaan ? 1 : 0;
        const groupName = j.namaUnit || "Rayon Tidak Diketahui";

        if (!chartMap[groupName]) {
          chartMap[groupName] = { name: groupName, Terencana: 0, Terlaksana: 0 };
        }
        chartMap[groupName].Terencana += 1;
        chartMap[groupName].Terlaksana += isTerlaksana;
      });

    return Object.values(chartMap).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  };

  const getChartDataKategori = () => {
    const chartMap = {};
    jadwal
      .filter((j) => j.kategoriPelayanan === "Kategorial")
      .forEach((j) => {
        const isTerlaksana = j.tgl_pelaksanaan ? 1 : 0;
        const groupName = j.namaKategoriInduk
          ? `${j.namaKategoriInduk} - ${j.namaUnit}`
          : j.namaUnit || "Kategori Tidak Diketahui";

        if (!chartMap[groupName]) {
          chartMap[groupName] = { name: groupName, Terencana: 0, Terlaksana: 0 };
        }
        chartMap[groupName].Terencana += 1;
        chartMap[groupName].Terlaksana += isTerlaksana;
      });

    return Object.values(chartMap).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  };

  const getBtnStyle = (aktif) => ({
    padding: "12px 20px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    borderRadius: "8px 8px 0 0",
    backgroundColor: aktif ? "#0A2540" : "#eee",
    color: aktif ? "white" : "black",
    flex: "1 1 auto", 
    minWidth: "150px", 
    textAlign: "center"
  });

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      
      {/* GLOBAL STYLES (Print Tighter & Scrollbar) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
          @page {
            size: A4 portrait; 
            margin: 8mm; 
          }
          .no-print { display: none !important; } 
          body { background-color: white !important; margin: 0; padding: 0; } 
          
          /* Merapatkan Judul (Kop) */
          h3 { margin: 5px 0 !important; font-size: 14px !important; line-height: 1.2 !important; }

          /* Merapatkan Tabel & Memaksa Fit ke Kertas A4 Portrait */
          table { 
            width: 100% !important; 
            min-width: 100% !important; /* Menimpa lebar minimal 850px dari mode layar */
            max-width: 100% !important; 
            border-collapse: collapse !important; 
            font-size: 11px !important; 
            page-break-inside: auto; 
            table-layout: fixed !important; /* Memaksa browser menghormati lebar persentase tiap kolom */
            word-wrap: break-word !important; 
          } 
          tr { page-break-inside: avoid; page-break-after: auto; }
          
          /* Modifikasi padding agar sangat rapat dari atas-bawah */
          th, td { 
            border: 1px solid black !important; 
            padding: 4px !important; 
            color: black !important; 
            line-height: 1.2 !important;
            height: auto !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important; /* Jika ada nama panjang, otomatis turun ke bawah, tidak merusak tabel */
          } 
          
          .no-print-input { display: none !important; }
          .print-only { display: inline !important; }
        }
        .print-only { display: none; }

        /* Scrollbar kustom untuk tabel responsif */
        .table-responsive::-webkit-scrollbar { height: 8px; }
        .table-responsive::-webkit-scrollbar-thumb { background-color: #0A2540; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-track { background-color: #f1f1f1; }
      `}} />

      {/* MENU NAVIGASI */}
      <div className="no-print" style={{ display: "flex", gap: "10px", borderBottom: "3px solid #0A2540", marginBottom: "25px", flexWrap: "wrap" }}>
        <button onClick={() => { setSubMode("rayon"); setIndexSlider(0); }} style={getBtnStyle(subMode === "rayon")}>
          Evaluasi Rayon
        </button>
        <button onClick={() => { setSubMode("kategori"); setIndexSlider(0); }} style={getBtnStyle(subMode === "kategori")}>
          Evaluasi Kategorial
        </button>
        <button onClick={() => setSubMode("grafik")} style={getBtnStyle(subMode === "grafik")}>
          📈 Grafik Capaian
        </button>
        <button onClick={() => window.print()} style={{ flex: "1 1 auto", minWidth: "200px", backgroundColor: "#28a745", color: "white", padding: "12px 20px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginBottom: "10px" }}>
          🖨️ Cetak Lembar Realisasi
        </button>
      </div>

      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd" }}>
        
        {subMode === "grafik" ? (
          <div>
            {/* GRAFIK 1: RAYON */}
            <div style={{ marginBottom: "50px" }}>
              <h3 style={{ textAlign: "center", textTransform: "uppercase", marginBottom: "20px", color: "#0A2540" }}>
                Grafik Capaian Pelayanan - Rayon
              </h3>
              <div style={{ width: "100%", height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartDataRayon()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: "20px" }} />
                    <Bar dataKey="Terencana" fill="#8884d8" name="Jadwal Terencana" />
                    <Bar dataKey="Terlaksana" fill="#82ca9d" name="Jadwal Terlaksana" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <hr style={{ border: "1px dashed #ccc", marginBottom: "40px" }} />

            {/* GRAFIK 2: KATEGORIAL */}
            <div>
              <h3 style={{ textAlign: "center", textTransform: "uppercase", marginBottom: "20px", color: "#0A2540" }}>
                Grafik Capaian Pelayanan - Kategorial
              </h3>
              <div style={{ width: "100%", height: "450px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartDataKategori()} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: "20px" }} />
                    <Bar dataKey="Terencana" fill="#f4a261" name="Jadwal Terencana" />
                    <Bar dataKey="Terlaksana" fill="#2a9d8f" name="Jadwal Terlaksana" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          
          /* RENDER TABEL EVALUASI */
          <>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f4f8ff", padding: "15px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #cce5ff", flexWrap: "wrap", gap: "10px" }}>
              <button onClick={() => setIndexSlider(indexSlider > 0 ? indexSlider - 1 : 0)} style={{ padding: "8px 15px", cursor: "pointer", fontWeight: "bold", border: "1px solid #ccc", borderRadius: "4px" }}>
                &lt;&lt; Mundur
              </button>
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#0A2540", textAlign: "center", flex: "1 1 auto" }}>
                {targetUnit || "Tidak ada data"}
              </span>
              <button onClick={() => setIndexSlider(indexSlider < listUnit.length - 1 ? indexSlider + 1 : indexSlider)} style={{ padding: "8px 15px", cursor: "pointer", fontWeight: "bold", border: "1px solid #ccc", borderRadius: "4px" }}>
                Maju &gt;&gt;
              </button>
            </div>

            <h3 style={{ textAlign: "center", textTransform: "uppercase", marginBottom: "20px" }}>
              LEMBAR REALISASI PELAYANAN {targetUnit}
            </h3>

            {filteredData.length > 0 ? (
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "850px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0A2540", color: "white", textAlign: "left" }}>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "5%", textAlign: "center" }}>No</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "20%" }}>Hari / Tanggal</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "20%" }}>Keluarga / Tempat</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "20%" }}>Tgl Pelaksanaan</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "20%" }}>Jumlah Persembahan</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd", width: "15%" }}>Paraf BP3J</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((j, i) => {
                      const datePrint = j.tanggal
                        ? new Date(j.tanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
                        : "-";

                      return (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9f9f9" }}>
                          <td style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                          <td style={{ padding: "12px", border: "1px solid #ddd" }}>{datePrint}</td>
                          <td style={{ padding: "12px", border: "1px solid #ddd" }}>{j.tempatKeluarga}</td>
                          
                          <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                            <input
                              type="date"
                              className="no-print-input"
                              value={j.tgl_pelaksanaan || ""}
                              onChange={(e) => handleUpdateRealisasi(j.id, "tgl_pelaksanaan", e.target.value)}
                              style={{ padding: "8px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }}
                            />
                            <span className="print-only">
                              {j.tgl_pelaksanaan ? new Date(j.tgl_pelaksanaan).toLocaleDateString("id-ID") : ""}
                            </span>
                          </td>

                          <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <span className="no-print-input" style={{ marginRight: "5px" }}>Rp.</span>
                              <input
                                type="number"
                                className="no-print-input"
                                value={j.jumlah_persembahan || ""}
                                onChange={(e) => handleUpdateRealisasi(j.id, "jumlah_persembahan", Number(e.target.value))}
                                placeholder="0"
                                style={{ padding: "8px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }}
                              />
                              <span className="print-only">
                                {j.jumlah_persembahan ? "Rp. " + j.jumlah_persembahan.toLocaleString("id-ID") : ""}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "12px", border: "1px solid #ddd" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "gray" }}>Pilih unit pelayanan di atas.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}