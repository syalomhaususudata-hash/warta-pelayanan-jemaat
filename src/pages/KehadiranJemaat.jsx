import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function KehadiranJemaat({ tanggal, isSekretaris }) {
  const [kehadiran, setKehadiran] = useState({ laki: "", perempuan: "", total: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mengambil data dari Firebase setiap kali tanggal berubah
  useEffect(() => {
    const fetchKehadiran = async () => {
      if (!tanggal) return;
      try {
        const docRef = doc(db, "laporan_kehadiran", tanggal);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setKehadiran(docSnap.data());
        } else {
          setKehadiran({ laki: "", perempuan: "", total: 0 });
        }
      } catch (error) {
        console.error("Gagal mengambil data kehadiran:", error);
      }
    };
    fetchKehadiran();
  }, [tanggal]);

  const hitungTotal = (laki, perempuan) => {
    const numLaki = parseInt(laki) || 0;
    const numPerempuan = parseInt(perempuan) || 0;
    return numLaki + numPerempuan;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setKehadiran((prev) => {
      const newData = { ...prev, [name]: value };
      newData.total = hitungTotal(newData.laki, newData.perempuan);
      return newData;
    });
  };

  const handleSimpan = async () => {
    if (!tanggal) return alert("Pilih tanggal terlebih dahulu!");
    setLoading(true);
    try {
      const dataSimpan = {
        laki: parseInt(kehadiran.laki) || 0,
        perempuan: parseInt(kehadiran.perempuan) || 0,
        total: kehadiran.total,
        tanggalAcuan: tanggal
      };
      
      await setDoc(doc(db, "laporan_kehadiran", tanggal), dataSimpan);
      setIsEditing(false);
      alert("Data kehadiran berhasil disimpan!");
    } catch (error) {
      alert("Gagal menyimpan data kehadiran.");
      console.error(error);
    }
    setLoading(false);
  };

  if (!tanggal) return null;

  return (
    <div style={{ border: "1px solid #e0e0e0", padding: "20px", borderRadius: "10px", backgroundColor: "#fdfdfd", marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0A2540", paddingBottom: "8px", marginBottom: "15px" }}>
        <h4 style={{ margin: 0, color: "#0A2540", fontSize: "16px", textTransform: "uppercase" }}>
          Laporan Kehadiran Jemaat (Minggu Lalu)
        </h4>
        
        {/* Tombol ini HANYA MUNCUL jika prop isSekretaris = true dan tidak saat di-print */}
        {isSekretaris && (
          <button 
            className="no-print"
            onClick={() => setIsEditing(!isEditing)} 
            style={{ padding: "6px 12px", backgroundColor: isEditing ? "#6c757d" : "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
          >
            {isEditing ? "Batal Edit" : "Input / Edit Data"}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="no-print" style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap", backgroundColor: "#f4f4f4", padding: "15px", borderRadius: "8px" }}>
          <div style={{ flex: "1", minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" }}>Laki-laki</label>
            <input type="number" name="laki" value={kehadiran.laki} onChange={handleChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "5px", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "1", minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" }}>Perempuan</label>
            <input type="number" name="perempuan" value={kehadiran.perempuan} onChange={handleChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "5px", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "1", minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" }}>Total (Otomatis)</label>
            <input type="number" value={kehadiran.total} disabled style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#e9ecef", fontWeight: "bold", boxSizing: "border-box" }} />
          </div>
          <div>
            <button onClick={handleSimpan} disabled={loading} style={{ padding: "9px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", height: "100%" }}>
              {loading ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "20px", justifyContent: "flex-start", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", padding: "10px 20px", backgroundColor: "#e3f2fd", borderRadius: "8px", minWidth: "100px", border: "1px solid #90caf9" }}>
            <div style={{ fontSize: "12px", color: "#1565c0", fontWeight: "bold" }}>LAKI-LAKI</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0d47a1" }}>{kehadiran.laki || 0}</div>
          </div>
          <div style={{ textAlign: "center", padding: "10px 20px", backgroundColor: "#fce4ec", borderRadius: "8px", minWidth: "100px", border: "1px solid #f48fb1" }}>
            <div style={{ fontSize: "12px", color: "#c2185b", fontWeight: "bold" }}>PEREMPUAN</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#880e4f" }}>{kehadiran.perempuan || 0}</div>
          </div>
          <div style={{ textAlign: "center", padding: "10px 20px", backgroundColor: "#e8f5e9", borderRadius: "8px", minWidth: "100px", border: "1px solid #a5d6a7" }}>
            <div style={{ fontSize: "12px", color: "#2e7d32", fontWeight: "bold" }}>TOTAL JUMLAH</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1b5e20" }}>{kehadiran.total || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}