import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function LiturgiMinggu({ tanggalTerpilih, isSekretaris }) {
  const [liturgiData, setLiturgiData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Ambil data Liturgi dari Firestore setiap kali tanggal berubah
  useEffect(() => {
    const fetchLiturgi = async () => {
      if (!tanggalTerpilih) return;
      try {
        const docSnap = await getDoc(doc(db, "liturgi_minggu", tanggalTerpilih));
        if (docSnap.exists()) {
          setLiturgiData(docSnap.data());
        } else {
          setLiturgiData(null);
        }
      } catch (error) {
        console.error("Gagal mengambil data liturgi:", error);
      }
    };
    fetchLiturgi();
  }, [tanggalTerpilih]);

  // LOGIKA UPLOAD KE CLOUDINARY
  const handleUploadCloudinary = async (e) => {
    const file = e.target.files[0];
    if (!file || !tanggalTerpilih) return;

    const validTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!validTypes.includes(file.type)) {
      alert("Format harus PDF atau Word (.doc, .docx).");
      return;
    }

    setIsUploading(true);

    const CLOUD_NAME = "duaf1qnbb"; 
    const UPLOAD_PRESET = "preset_gereja"; 

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.secure_url) {
        const isPdf = file.type === "application/pdf";
        
        const dataBaru = {
          url: data.secure_url,
          fileName: file.name,
          type: isPdf ? "pdf" : "word"
        };

        await setDoc(doc(db, "liturgi_minggu", tanggalTerpilih), dataBaru);
        setLiturgiData(dataBaru);
        alert("Liturgi berhasil diunggah ke Cloudinary!");
      } else {
        throw new Error(data.error?.message || "Gagal mengunggah ke Cloudinary");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Gagal mengunggah file: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = ""; 
    }
  };

  const handleHapus = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus jadwal Liturgi ini dari layar?")) return;
    
    try {
      await deleteDoc(doc(db, "liturgi_minggu", tanggalTerpilih));
      setLiturgiData(null);
      alert("Liturgi berhasil dihapus dari sistem.");
    } catch (error) {
      console.error("Error menghapus file:", error);
      alert("Gagal menghapus data.");
    }
  };

  return (
    <div className="no-print" style={{ paddingTop: "10px" }}>
      <h2 style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "10px", marginBottom: "20px" }}>
        Liturgi Ibadah - {tanggalTerpilih ? new Date(tanggalTerpilih).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : "-"}
      </h2>

      {isSekretaris && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e0f7fa", borderRadius: "8px", border: "1px solid #b2ebf2", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h4 style={{ margin: "0 0 5px 0", color: "#006064" }}>Admin Panel Liturgi</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#00838f" }}>Unggah file Word (.docx) atau PDF untuk dibaca oleh Jemaat.</p>
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {!liturgiData && (
              <label style={{ cursor: "pointer", backgroundColor: "#28a745", color: "white", padding: "10px 20px", borderRadius: "5px", fontWeight: "bold", fontSize: "14px", margin: 0 }}>
                {isUploading ? "⏳ Mengunggah..." : "📄 Upload Liturgi"}
                <input type="file" accept=".pdf, .doc, .docx" style={{ display: "none" }} onChange={handleUploadCloudinary} disabled={isUploading} />
              </label>
            )}

            {liturgiData && (
              <button onClick={handleHapus} style={{ backgroundColor: "#dc3545", color: "white", padding: "10px 20px", borderRadius: "5px", fontWeight: "bold", fontSize: "14px", border: "none", cursor: "pointer" }}>
                🗑️ Hapus Dokumen
              </button>
            )}
          </div>
        </div>
      )}

      {liturgiData ? (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
          <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
            <span style={{ fontWeight: "bold", color: "#333", fontSize: "15px" }}>Dokumen Siap Dibaca</span>
            <a href={liturgiData.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#007BFF", color: "white", padding: "10px 20px", borderRadius: "5px", textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}>
              ⬇️ Download File Asli
            </a>
          </div>

          {/* PERBAIKAN BUG RUANG PUTIH: Menggunakan tinggi spesifik (80vh) agar iframe merentang penuh */}
          <div style={{ width: "100%", height: "80vh", minHeight: "600px", border: "1px solid #ccc", borderRadius: "8px", overflow: "hidden", backgroundColor: "#e9ecef" }}>
            {liturgiData.type === "word" ? (
              <iframe 
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(liturgiData.url)}`} 
                width="100%" 
                height="100%" 
                frameBorder="0"
                title="Pratinjau Liturgi Word"
                style={{ display: "block" }}
              >
                Pratinjau tidak didukung.
              </iframe>
            ) : (
              <iframe 
                src={`${liturgiData.url}#toolbar=0`} 
                width="100%" 
                height="100%" 
                frameBorder="0"
                title="Pratinjau Liturgi PDF"
                style={{ display: "block" }}
              >
                Pratinjau tidak didukung.
              </iframe>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "80px 20px", border: "2px dashed #ccc", borderRadius: "10px", color: "gray", backgroundColor: "#fdfdfd" }}>
          <span style={{ fontSize: "50px", display: "block", marginBottom: "15px" }}>📖</span>
          <p style={{ margin: 0, fontSize: "16px" }}>Belum ada dokumen Liturgi yang diunggah untuk minggu ini.</p>
        </div>
      )}
    </div>
  );
}