// src/components/PasteExcel.jsx
import { useState } from "react";

export default function PasteExcel({ judulKolom, onSimpan }) {
  const [teksMentah, setTeksMentah] = useState("");
  const [dataPreview, setDataPreview] = useState([]);
  const [modeInput, setModeInput] = useState("excel");

  // Fungsi pengaman: Memaksa tanggal jadi YYYY-MM-DD apapun yang terjadi
  const formatTanggal = (tgl) => {
    if (!tgl) return "";
    if (tgl.match(/^\d{4}-\d{2}-\d{2}$/)) return tgl; // Sudah benar (YYYY-MM-DD)
    
    // Jika formatnya DD/MM/YYYY atau DD-MM-YYYY, kita putar balik
    const parts = tgl.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return tgl;
  };

  const prosesData = () => {
    if (!teksMentah.trim()) return;

    try {
      if (modeInput === "json") {
        let parsed = JSON.parse(teksMentah);
        if (!Array.isArray(parsed)) throw new Error("JSON harus berupa Array!");
        
        // AUTO-MAPPER: Mencocokkan nama key JSON dengan judul kolom kita
        const hasilParse = parsed.map((baris) => {
          let barisData = {};
          judulKolom.forEach((judul) => {
            if (!judul.skip) {
              const targetKey = judul.key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
              const targetLabel = judul.label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
              
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
              // Terapkan format tanggal khusus untuk kolom tanggal
              if (judul.key === "tanggal") isiSel = formatTanggal(isiSel);
              barisData[judul.key] = isiSel;
            }
          });
          return barisData;
        });
        setDataPreview(hasilParse);
      }
    } catch (error) {
      alert("Format data tidak valid! Pastikan format sesuai dengan opsi (Excel/JSON) yang dipilih.");
      console.error(error);
    }
  };

  const resetData = () => {
    setTeksMentah("");
    setDataPreview([]);
  };

  return (
    <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "10px", border: "1px solid #ddd" }}>
      
      {/* KONTROL PILIHAN MODE EXCEL / JSON */}
      <div style={{ marginBottom: "15px", display: "flex", gap: "15px", alignItems: "center", borderBottom: "2px solid #ddd", paddingBottom: "10px" }}>
        <b style={{ color: "#0A2540" }}>Pilih Mode Paste:</b>
        <label style={{ cursor: "pointer", display: "flex", gap: "5px", alignItems: "center" }}>
          <input type="radio" value="excel" checked={modeInput === "excel"} onChange={() => setModeInput("excel")} /> Dari Excel Biasa
        </label>
        <label style={{ cursor: "pointer", display: "flex", gap: "5px", alignItems: "center" }}>
          <input type="radio" value="json" checked={modeInput === "json"} onChange={() => setModeInput("json")} /> Format JSON
        </label>
      </div>

      <p style={{ color: "gray", fontSize: "14px", marginTop: 0 }}>
        {modeInput === "excel" 
          ? "Blok baris data di Excel Anda, tekan Ctrl+C (Copy), lalu Paste di kotak bawah."
          : "Gunakan website konverter Excel ke JSON online, lalu paste hasilnya di bawah."}
      </p>

      <textarea
        rows="8"
        value={teksMentah}
        onChange={(e) => setTeksMentah(e.target.value)}
        placeholder={modeInput === "excel" ? "Paste (tempel) data dari Excel di sini..." : 'Contoh: [ {"Tanggal": "2026-05-30", "Masa Raya": "Epifani"...} ]'}
        style={{ width: "100%", padding: "10px", fontFamily: "monospace", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }}
      ></textarea>

      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={prosesData} style={{ padding: "10px 15px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>
          Tampilkan Pratinjau (Draft)
        </button>
        {dataPreview.length > 0 && (
          <button onClick={resetData} style={{ padding: "10px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>
            Batal / Bersihkan
          </button>
        )}
      </div>

      {dataPreview.length > 0 && (
        <div style={{ marginTop: "30px", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#0A2540" }}>Pratinjau Data (Periksa sebelum disimpan)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", minWidth: "1000px" }}>
            <thead>
              <tr style={{ backgroundColor: "#007BFF", color: "white", textAlign: "left", fontSize: "13px" }}>
                {judulKolom.filter(j => !j.skip).map((judul) => (
                  <th key={judul.key} style={{ padding: "10px", border: "1px solid #0056b3" }}>{judul.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataPreview.map((baris, indexBaris) => (
                <tr key={indexBaris}>
                  {judulKolom.filter(j => !j.skip).map((judul) => (
                    <td key={judul.key} style={{ padding: "8px", border: "1px solid #ddd", fontSize: "13px" }}>{baris[judul.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <button 
            onClick={() => { onSimpan(dataPreview); resetData(); }} 
            style={{ marginTop: "20px", width: "100%", padding: "15px", backgroundColor: "#28a745", color: "white", fontWeight: "bold", fontSize: "16px", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            Simpan Jadwal ke Database
          </button>
        </div>
      )}
    </div>
  );
}