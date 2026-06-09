import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // <-- HANYA FIRESTORE, TANPA STORAGE
import KehadiranJemaat from "./KehadiranJemaat";
import { getAuth } from "firebase/auth"; // <-- Tambahkan ini di atas

import { buatPPTWarta } from "./exportPPT"; // <--- IMPORT FILE PPT BARU

// Kode Baru: Import react-pdf
import { Document, Page, pdfjs } from 'react-pdf';
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Solusi Lokal Vite (Anti-CORS): Memanggil worker langsung dari folder internal
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PdfViewerCetak = ({ url }) => {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="pdf-wrapper-luar" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "10px" }}>
      
      {/* KELAS pdf-container-dalam AKAN DIATUR OLEH CSS */}
      <div className="pdf-container-dalam" style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 auto" }}>
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div style={{ padding: "20px", fontWeight: "bold" }}>⏳ Sedang memuat halaman PDF...</div>}
        >
          {Array.from(new Array(numPages || 1), (el, index) => (
            <div 
              key={`page_${index + 1}`} 
              className="halaman-pdf-print" 
              style={{ width: "100%", marginBottom: "15px", display: "flex", justifyContent: "center" }}
            >
              <Page 
                pageNumber={index + 1} 
                width={750} 
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          ))}
        </Document>
        
        <div className="no-print" style={{ textAlign: "center", marginTop: "15px", paddingBottom: "15px" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", backgroundColor: "#0A2540", color: "white", padding: "8px 20px", borderRadius: "5px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
            📥 Download PDF Asli
          </a>
        </div>
      </div>
      
    </div>
  );
};

export default function Dashboard() {
  const [tabAktif, setTabAktif] = useState("minggu");
  const [semuaJadwalMinggu, setSemuaJadwalMinggu] = useState([]);
  const [semuaJadwalHarian, setSemuaJadwalHarian] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tanggalTerpilih, setTanggalTerpilih] = useState("");
  
  // STATE BARU UNTUK WARTA LAIN-LAIN
  const stateWartaAwal = {
    sapaan: "",
    ulangTahun: "",
    baptisan: "",
    pernikahan: [{ teks: "", gambarUrl: "" }], // Sekarang berbentuk Array (Bisa banyak)
    kematian: [{ teks: "", gambarUrl: "" }],   // Sekarang berbentuk Array (Bisa banyak)
    pembangunan: "",
    informasiLain: "",
    bacaanHarian: "" // TAMBAHAN: Menyimpan text raw dari Copy-Paste Excel
  };
  const [wartaLain, setWartaLain] = useState(stateWartaAwal);
  const [isEditingWarta, setIsEditingWarta] = useState(false);

  // FUNGSI RENDER TABEL EXCEL KHUSUS ULANG TAHUN
  // FUNGSI RENDER TABEL EXCEL KHUSUS ULANG TAHUN (DENGAN HITUNG USIA OTOMATIS)
  const renderTabelExcel = (text) => {
    if (!text) return null;
    const rows = text.trim().split('\n');

    // Mesin pendeteksi tahun dan penghitung usia
    const hitungUsia = (teksTanggal) => {
      if (!teksTanggal) return "-";
      let tahunLahir = null;
      
      // Deteksi format YYYY-MM-DD
      if (teksTanggal.includes('-') && teksTanggal.split('-')[0].length === 4) {
        tahunLahir = parseInt(teksTanggal.split('-')[0]);
      } 
      // Deteksi format DD/MM/YYYY
      else if (teksTanggal.includes('/')) {
        const parts = teksTanggal.split('/');
        if (parts.length === 3) tahunLahir = parseInt(parts[2]);
      } 
      // Deteksi angka 4 digit beruntun (Tahun) dari teks (misal: "15 Juni 1990")
      else {
        const pencarianTahun = teksTanggal.match(/\b(19\d{2}|20\d{2})\b/);
        if (pencarianTahun) tahunLahir = parseInt(pencarianTahun[0]);
      }

      if (tahunLahir) {
        const tahunSekarang = new Date().getFullYear();
        const usia = tahunSekarang - tahunLahir;
        return usia > 0 ? `${usia} Tahun` : "-";
      }
      return "-"; // Jika sistem tidak menemukan pola tahun
    };

return (
      <>
        {/* --- TAMPILAN DESKTOP & CETAK (TABEL) --- */}
        <div className="table-responsive tabel-desktop">
          <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px', backgroundColor: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: "#0A2540", color: "#fff" }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '45%' }}>Nama Jemaat</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '35%' }}>Tanggal Lahir</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', width: '20%' }}>HUT Ke-</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const cells = row.split('\t');
                const nama = cells[0] || "-";
                const tglLahir = cells[1] || "-";
                const usiaOtomatis = hitungUsia(tglLahir);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{nama}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{tglLahir}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#dc3545', backgroundColor: '#fdf1f1' }}>
                      {usiaOtomatis}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- TAMPILAN MOBILE (CARD KOMPAK) --- */}
        <div className="card-mobile no-print" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginTop: "10px" }}>
          {rows.map((row, i) => {
            const cells = row.split('\t');
            const nama = cells[0] || "-";
            const tglLahir = cells[1] || "-";
            const usiaOtomatis = hitungUsia(tglLahir);
            
            // Ambil hanya angka dari string "12 Tahun"
            const angkaUsia = usiaOtomatis.replace(/[^0-9]/g, '');

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "15px", borderRadius: "12px", border: "1px solid #eee", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                {/* Bagian Kiri: Usia Besar */}
                <div style={{ flex: "0 0 70px", textAlign: "center", borderRight: "2px dashed #ccc", paddingRight: "15px", marginRight: "15px" }}>
                  <span style={{ display: "block", fontSize: "24px", fontWeight: "900", color: "#dc3545", lineHeight: "1" }}>
                    {angkaUsia || "-"}
                  </span>
                  <span style={{ display: "block", fontSize: "11px", color: "gray", marginTop: "4px", fontWeight: "bold", textTransform: "uppercase" }}>
                    Tahun
                  </span>
                </div>
                
                {/* Bagian Kanan: Nama & Tanggal */}
                <div style={{ flex: "1" }}>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", color: "#0A2540", fontWeight: "bold" }}>{nama}</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                    🎂 {tglLahir}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // FUNGSI RENDER CARD KHUSUS BACAAN HARIAN
  const renderCardBacaanHarian = (text) => {
    if (!text) return null;
    const rows = text.trim().split('\n');

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px", marginTop: "20px" }}>
        {rows.map((row, i) => {
          const cells = row.split('\t');
          if (cells.length < 2) return null; // Abaikan baris kosong atau tidak valid
          
          const hariTanggal = cells[0] || "-";
          const bacaan = cells[1] || "-";
          const tema = cells[2] || ""; // Kolom 3: Tema (opsional jika ada)

          // Palet warna cerah bergantian untuk Card
          const colors = ["#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#fbe9e7", "#e0f7fa", "#fce4ec"];
          const bg = colors[i % colors.length];

          return (
            <div key={i} style={{ backgroundColor: bg, padding: "20px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <h4 style={{ margin: "0 0 12px 0", borderBottom: "2px solid rgba(0,0,0,0.08)", paddingBottom: "8px", color: "#333", fontSize: "16px" }}>
                🗓️ {hariTanggal}
              </h4>
              <p style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "#000" }}>
                📖 {bacaan}
              </p>
              {tema && <p style={{ margin: 0, fontSize: "14px", fontStyle: "italic", color: "#555" }}>Tema: {tema}</p>}
            </div>
          );
        })}
      </div>
    );
  };

  const [fileKeuangan, setFileKeuangan] = useState([]);
  const [isKeuanganTersimpan, setIsKeuanganTersimpan] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragItem = useRef();
  const dragOverItem = useRef();

  const [profilGereja, setProfilGereja] = useState({
    wakilKetua: "", sekretaris: "", namaJemaat: "Koa I", namaMataJemaat: "Syalom Haususu"
  });

  // Mengambil data user yang sedang login saat ini
  const auth = getAuth();
  const user = auth.currentUser;
  
  // Ganti "email_sekretaris@gmail.com" dengan email asli yang Anda gunakan untuk login!
  const emailSekretarisDiizinkan = ["sekretaris@haususu.com", "sekretaris@gereja.com"];
  const apakahSekretaris = user && emailSekretarisDiizinkan.includes(user.email);

  useEffect(() => {
    const ambilData = async () => {
      try {
        const [mingguSnap, harianSnap, masterSnap] = await Promise.all([
          getDocs(collection(db, "jadwal_minggu")),
          getDocs(collection(db, "jadwal_pelayanan")),
          getDoc(doc(db, "konfigurasi", "master_data"))
        ]);
        
        const dataMinggu = mingguSnap.docs.map(d => ({ id: d.id, ...d.data() 
        })).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
      
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

        // Cari tanggal Minggu terdekat
        if (dataMinggu.length > 0) {
          const today = new Date().toISOString().split('T')[0]; 
          const upcomingSunday = dataMinggu.find(d => d.tanggal >= today);
          
          if (upcomingSunday) {
            setTanggalTerpilih(upcomingSunday.tanggal);
          } else {
            setTanggalTerpilih(dataMinggu[dataMinggu.length - 1].tanggal);
          }
        }

        if (masterSnap.exists()) {
          const data = masterSnap.data();
          if (data.profilGereja) {
            setProfilGereja({
              wakilKetua: data.profilGereja.wakilKetua || "",
              sekretaris: data.profilGereja.sekretaris || "",
              namaJemaat: data.profilGereja.namaJemaat || "Koa I",
              namaMataJemaat: data.profilGereja.namaMataJemaat || "Syalom Haususu"
            });
          }
        }
      } catch (e) { 
        console.error("Error Firebase:", e); 
        alert("Gagal memuat jadwal: " + e.message);
      }
      setLoading(false);
    };
    ambilData();
  }, []);

  useEffect(() => {
    const ambilDataSpesifikTanggal = async () => {
      if (!tanggalTerpilih) return;
      try {
        const docRefTeks = doc(db, "warta_lainnya_teks", tanggalTerpilih);
        const docSnapTeks = await getDoc(docRefTeks);
        if (docSnapTeks.exists()) {
          const data = docSnapTeks.data();
          if (typeof data.teks === 'string' && !data.warta) {
            setWartaLain({ ...stateWartaAwal, informasiLain: data.teks });
          } else if (data.warta) {
            
            // --- MULAI NORMALISASI DATA (ANTI CRASH) ---
            let wartaAman = { ...stateWartaAwal, ...data.warta };
            
            // Jika pernikahan masih berupa Object (data lama), bungkus jadi Array
            if (!Array.isArray(wartaAman.pernikahan)) {
              wartaAman.pernikahan = wartaAman.pernikahan ? [wartaAman.pernikahan] : [{ teks: "", gambarUrl: "" }];
            }
            
            // Jika kematian masih berupa Object (data lama), bungkus jadi Array
            if (!Array.isArray(wartaAman.kematian)) {
              wartaAman.kematian = wartaAman.kematian ? [wartaAman.kematian] : [{ teks: "", gambarUrl: "" }];
            }
            
            setWartaLain(wartaAman);
            // --- SELESAI NORMALISASI ---

          }
        } else {
          setWartaLain(stateWartaAwal); 
        }

        const docRefKeuangan = doc(db, "warta_keuangan_arsip", tanggalTerpilih);
        const docSnapKeuangan = await getDoc(docRefKeuangan);
        if (docSnapKeuangan.exists() && docSnapKeuangan.data().gambarKeuangan) {
          setFileKeuangan(docSnapKeuangan.data().gambarKeuangan);
          setIsKeuanganTersimpan(true);
        } else {
          setFileKeuangan([]);
          setIsKeuanganTersimpan(false);
        }
      } catch (e) { console.error(e); }
    };
    ambilDataSpesifikTanggal();
  }, [tanggalTerpilih]);

  const simpanWartaLain = async () => {
    if (!tanggalTerpilih) return;
    try {
      await setDoc(doc(db, "warta_lainnya_teks", tanggalTerpilih), {
        warta: wartaLain,
        tanggal: tanggalTerpilih
      });
      setIsEditingWarta(false);
      alert("Warta Lain-lain berhasil disimpan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan warta.");
    }
  };

// --- FUNGSI BARU: UPLOAD INSTAN UNTUK WARTA PERNIKAHAN & KEMATIAN ---
  const handleUploadGambarWarta = async (e, kategori, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mengambil konfigurasi dari .env Vite berdasarkan tenant yang sedang berjalan
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        alert("Konfigurasi Cloudinary belum diatur di file .env");
        return;
    } 

    // Beri efek visual "Mengunggah..." pada input teks
    const newArr = [...wartaLain[kategori]];
    newArr[index].gambarUrl = "Mengunggah...";
    setWartaLain({ ...wartaLain, [kategori]: newArr });

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
        // Ganti teks "Mengunggah..." dengan URL asli dari Cloudinary
        const updatedArr = [...wartaLain[kategori]];
        updatedArr[index].gambarUrl = data.secure_url;
        setWartaLain({ ...wartaLain, [kategori]: updatedArr });
      } else {
        throw new Error("Gagal mengunggah gambar");
      }
    } catch (error) {
      alert("Upload gagal: " + error.message);
      // Kosongkan kembali jika gagal
      const resetArr = [...wartaLain[kategori]];
      resetArr[index].gambarUrl = "";
      setWartaLain({ ...wartaLain, [kategori]: resetArr });
    }
  };

  const handlePilihGambar = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validImages = Array.from(files).filter(f => f.type.includes("image") || f.type === "application/pdf");
    
    if (validImages.length > 0) {
      setFileKeuangan(prevLama => {
        // Gabungkan semua gambar (yang sudah ada di layar + yang baru dipilih)
        const semuaGambarGabungan = [...prevLama, ...validImages];

        // Buat penyaring mutlak berbasis Set (kumpulan data unik)
        const gambarUnikFinal = [];
        const jejakPenanda = new Set();

        semuaGambarGabungan.forEach(file => {
          if (typeof file === "string") {
            // Jika file dari database (URL String)
            if (!jejakPenanda.has(file)) {
              jejakPenanda.add(file);
              gambarUnikFinal.push(file);
            }
          } else {
            // Jika file baru (File Object), jadikan Nama dan Ukuran File sebagai penanda
            const identitasFile = `${file.name}-${file.size}`;
            if (!jejakPenanda.has(identitasFile)) {
              jejakPenanda.add(identitasFile);
              gambarUnikFinal.push(file);
            }
          }
        });

        return gambarUnikFinal; // Kembalikan array yang dijamin 100% tidak ada duplikat
      });
      setIsKeuanganTersimpan(false);
    }
    
    // Wajib reset input agar file yang sama bisa dipilih lagi kalau user sengaja menghapusnya
    e.target.value = "";
  };

  const dragStart = (e, position) => { dragItem.current = position; };
  const dragEnter = (e, position) => { dragOverItem.current = position; };
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

  // LOGIKA SIMPAN GAMBAR KE CLOUDINARY (DENGAN ANTI-DUPLIKAT)
  const simpanFileKeuangan = async () => {
    if (fileKeuangan.length === 0 || !tanggalTerpilih) return;
    setIsUploading(true);
    
    // MASUKKAN CLOUD NAME & UPLOAD PRESET KAMU DI SINI
    const CLOUD_NAME = "duaf1qnbb"; // <-- Diisi dengan Cloud Name asli Anda
    const UPLOAD_PRESET = "preset_gereja"; // <-- Ganti dengan nama preset Unsigned yang baru saja Anda buat/simpan di Langkah 1
    
    try {
      // PERBAIKAN 1: Buat antrean janji (promises) agar semua file diupload BERSAMAAN
      const uploadPromises = fileKeuangan.map(async (file) => {
        if (typeof file === "string") {
          return file; // Jika sudah berupa URL, kembalikan langsung
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        
        // PERBAIKAN 2: Ubah /image/upload menjadi /auto/upload agar aman menerima PDF
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: "POST",
          body: formData
        });
        
        const data = await response.json();
        if (data.secure_url) {
          return data.secure_url;
        } else {
          throw new Error(data.error?.message || "Gagal mengunggah file ke server");
        }
      });

      // Eksekusi semua antrean upload secara paralel
      const hasilUpload = await Promise.all(uploadPromises);

      // FITUR BARU: Menghapus URL yang ganda/dobel sebelum disimpan
      const urlBersihTanpaDobel = [...new Set(hasilUpload)];

      // Simpan URL yang sudah bersih dari duplikat ke Firestore
      await setDoc(doc(db, "warta_keuangan_arsip", tanggalTerpilih), {
        gambarKeuangan: urlBersihTanpaDobel,
        tanggal: tanggalTerpilih
      });

      // Update tampilan di layar
      setFileKeuangan(urlBersihTanpaDobel); 
      setIsKeuanganTersimpan(true);
      alert("File laporan keuangan berhasil diunggah dan disimpan secara permanen!");
      
    } catch (error) {
      console.error("Detail Error Upload:", error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
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
    const hari = d.toLocaleDateString("id-ID", { weekday: 'long' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString("id-ID", { month: 'long' });
    const year = d.getFullYear();
    return `${hari}, ${day}-${month}-${year}`;
  };

  const namaHari = (tgl) => {
    if (!tgl) return "-";
    const d = new Date(tgl + "T00:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("id-ID", { weekday: 'long' });
  };

  const getBobotKategori = (namaKategori) => {
    const k = (namaKategori || "").toUpperCase();
    if (k.includes("BAPAK")) return 1;
    if (k.includes("PEREMPUAN")) return 2;
    if (k.includes("PEMUDA")) return 3;
    if (k.includes("TERUNA")) return 4;
    if (k.includes("PAR")) return 5;
    if (k.includes("LANSIA")) return 6;
    return 99;
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
      
      jadwalRayonSepekan = harianSepekan
        .filter(j => j.kategoriPelayanan === "Rayon")
        .sort((a, b) => {
          // 1. Urutkan berdasarkan Nama Rayon terlebih dahulu
          const urutRayon = (a.namaUnit || "").localeCompare(b.namaUnit || "", undefined, { numeric: true, sensitivity: 'base' });
          if (urutRayon !== 0) return urutRayon;
          // 2. Jika Rayon-nya sama, urutkan berdasarkan Tanggal terkecil ke terbesar (Rabu lalu Jumat)
          return new Date(a.tanggal) - new Date(b.tanggal);
        });
      
      jadwalKategorialSepekan = harianSepekan
        .filter(j => j.kategoriPelayanan === "Kategorial")
        .sort((a, b) => {
          // 1. Urutkan berdasarkan Bobot Kategori Induk
          const bobotA = getBobotKategori(a.namaKategoriInduk);
          const bobotB = getBobotKategori(b.namaKategoriInduk);
          if (bobotA !== bobotB) return bobotA - bobotB;
          
          // 2. Urutkan berdasarkan Nama Sektor
          const urutSektor = (a.namaUnit || "").localeCompare(b.namaUnit || "", undefined, { numeric: true, sensitivity: 'base' });
          if (urutSektor !== 0) return urutSektor;

          // 3. Jika Sektor-nya sama, urutkan berdasarkan Tanggal terkecil ke terbesar
          return new Date(a.tanggal) - new Date(b.tanggal);
        });
    }
  }

  // --- FUNGSI BARU: EXPORT DATA KE POWERPOINT (PPTX) ---
   const handleDownloadPPT = () => {
     if (!tanggalTerpilih) return alert("Pilih tanggal terlebih dahulu!");

     // Lempar semua datanya ke fungsi helper yang ada di file exportPPT.js
     buatPPTWarta({
       tanggalTerpilih,
       profilGereja,
       mingguIni,
       mingguDepan,
       jadwalRayonSepekan,
       jadwalKategorialSepekan,
       fileKeuangan,
       wartaLain
     });
   };
   // --- AKHIR FUNGSI PPT ---
  
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      <style dangerouslySetInnerHTML={{__html: `
        /* --- MENGATUR VISIBILITAS DESKTOP VS MOBILE --- */
        /* Pastikan narasi HILANG MUTLAK di layar besar */
        .card-mobile { display: none !important; }
        .tabel-desktop { display: table !important; width: 100%; }

        /* Tampilkan Narasi HANYA saat layar HP (Lebar max 768px) */
        @media screen and (max-width: 768px) {
          .tabel-desktop { display: none !important; }
          .card-mobile { display: flex !important; flex-direction: column !important; }
        }

        /* Saat Cetak PDF/Kertas, paksa tabel muncul dan narasi hilang */
        @media print {
          .tabel-desktop { display: table !important; width: 100% !important; }
          .card-mobile { display: none !important; }
        }
          
        /* --- MENGATUR VISIBILITAS DESKTOP VS MOBILE --- */
        .tabel-desktop { display: table; width: 100%; }
        .card-mobile { display: none; }

        @media screen and (max-width: 768px) {
          .tabel-desktop { display: none !important; }
          .card-mobile { display: block !important; }
        }

        @media print {
          .tabel-desktop { display: table !important; }
          .card-mobile { display: none !important; }
        }

        /* --- KELAS UNTUK TAMPILAN LAYAR (LOCALHOST) --- */
        .screen-none { display: none; }
        .screen-block { display: block; }
        .print-only { display: none !important; }

        /* TAMPILAN KHUSUS PDF (RESPONSIVE) */
        .pdf-desktop { display: block; width: 100%; height: 800px; }
        .pdf-mobile { display: none; }
        
        /* Deteksi Layar HP (Maksimal lebar 768px) */
        @media screen and (max-width: 768px) {
          .pdf-desktop { display: none !important; }
          .pdf-mobile { display: block !important; width: 100%; }
        }
        
        /* --- WRAPPER TABEL BISA SCROLL KANAN-KIRI (HP) --- */
        .table-responsive {
          width: 100%;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch; /* Smooth scroll di iOS */
          margin-bottom: 40px;
          display: block; /* Memastikan sifat overflow bekerja utuh */
        }

        /* Memaksa tabel tetap lebar di dalam wrapper agar bisa di-scroll, bukan malah menyusut */
        .table-responsive table {
          min-width: 600px !important; /* Angka ini memaksa tabel melebar melebihi layar HP */
          width: 100%;
          border-collapse: collapse;
        }

        /* --- ATURAN PENCETAKAN (PRINT CSS) --- */
        @media print { 
          /* Tambahkan perintah ini untuk memaksa seluruh lapis web menjadi putih mutlak */
          html, body, #root { 
            background-color: white !important; 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Mematikan margin bawaan browser Chrome/Edge */
          @page {
            margin: 0mm; 
          }

          /* Pastikan print area tidak memiliki garis atau bayangan */
          .print-area { 
            border: none !important; 
            box-shadow: none !important; 
            background: transparent !important; 
          } 
          #dashboard-tabs, .no-print { display: none !important; } 
          
          .screen-none, .screen-block { 
            display: block !important; 
            visibility: visible !important;
            opacity: 1 !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          .print-section { 
            display: block !important;
            page-break-after: auto; 
            width: 100%; 
            margin-bottom: 30px; 
          } 
          
          .print-only { 
            display: flex !important;
            page-break-inside: avoid; 
          }
          
          body { 
            background-color: white !important; 
            margin: 0;
            padding: 0; 
          } 

          /* 1. MENGHILANGKAN GARIS ABU-ABU & SCROLLBAR */
          ::-webkit-scrollbar { 
            display: none !important; 
          }
          
          .wadah-tabel-print {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          
          .table-responsive {
            overflow-x: visible !important;
            display: block !important;
            margin-bottom: 20px !important;
            border: none !important;
          }
          
          /* 2. MERAPIKAN TABEL & MEMAKSA SUPER RAPAT (HEMAT KERTAS) */
          table, .tabel-desktop table, .table-responsive table { 
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important; 
            table-layout: auto !important; 
            margin-bottom: 5px !important; /* Jarak bawah tabel dikurangi */
          } 
          
          /* Targetkan semua sel tabel secara brutal */
          table th, table td, .tabel-desktop th, .tabel-desktop td, tbody td, thead th { 
            border: 1px solid #000 !important;
            padding: 2px 4px !important; /* SUPER RAPAT: Atas-bawah 2px, Kiri-Kanan 4px */
            color: black !important; 
            white-space: normal !important; 
            word-wrap: break-word !important;
            font-size: 11px !important; /* Perkecil huruf tabel */
            line-height: 1.1 !important; /* Rapatkan spasi antar baris kalimat */
            height: auto !important;
          } 

          /* Perkecil judul di atas tabel */
          h2, h3, h4 {
            margin-top: 5px !important;
            margin-bottom: 5px !important;
            padding-bottom: 2px !important;
          }

          /* Aturan Break Page untuk PDF */
          .halaman-pdf-print {
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .halaman-pdf-print canvas {
            max-width: 100% !important;
            height: auto !important;
          }

          /* Hemat ruang pada kop surat */
          .kop-surat-print div {
            font-size: 12px !important;
            line-height: 1.1 !important;
          } 
          
         /* ATURAN GAMBAR KEUANGAN (UPDATE FINAL: PERKECIL SKALA AGAR MUAT 3 GAMBAR) */
          .grid-keuangan { 
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important; 
            gap: 5px !important; /* Jarak antar gambar dirapatkan menjadi 5px */
          }
          
          .gambar-wrapper-cetak {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important; 
            page-break-after: auto !important; 
            page-break-inside: avoid !important; 
            border: none !important; 
            padding: 0 !important;
            margin: 0 0 5px 0 !important; /* Margin bawah dirapatkan */
            box-shadow: none !important;
          }
          
          .gambar-wrapper-cetak > div {
            padding: 0 !important;
            min-height: auto !important;
            background-color: transparent !important;
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }

          .item-gambar-cetak { 
            /* KUNCI: Turunkan skala lebar dari 85% menjadi 65% (atau 60% jika masih kurang muat) */
            width: 45% !important; 
            max-height: none !important; 
            height: auto !important; 
            object-fit: contain !important; 
            border: none !important; 
          }

          /* --- ATURAN SCROLL PDF HP & ANTI-POTONG SAAT CETAK --- */
        @media screen and (max-width: 768px) {
          .pdf-container-dalam { min-width: 800px !important; }
        }

        @media print {
          .pdf-wrapper-luar { overflow: visible !important; }
          .pdf-container-dalam { min-width: 0 !important; width: 100% !important; }
          .halaman-pdf-print canvas { max-width: 100% !important; width: 100% !important; height: auto !important; }
        }
      `}} />

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e9ecef", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h3 style={{ margin: "0 0 5px 0", color: "#0A2540" }}>Sistem Warta Jemaat</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "gray" }}>Pilih tahun dan tanggal untuk melihat jadwal pelayanan dan arsip.</p>
        </div>
        
        <div style={{ flex: "1 1 auto", minWidth: "250px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <label style={{ fontWeight: "bold", color: "#444" }}>Pilih Tanggal Acuan:</label>
          {semuaJadwalMinggu.length > 0 ? (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}>
              {/* 1. FILTER TAHUN DINAMIS */}
              <select 
                value={tanggalTerpilih ? new Date(tanggalTerpilih).getFullYear() : new Date().getFullYear()} 
                onChange={(e) => {
                   const tahunPilihan = e.target.value;
                   // Cari jadwal/tanggal pertama yang tersedia di tahun yang dipilih
                   const opsiTahun = semuaJadwalMinggu.find(j => new Date(j.tanggal).getFullYear().toString() === tahunPilihan);
                   if (opsiTahun) setTanggalTerpilih(opsiTahun.tanggal);
                }}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #00acc1", fontWeight: "bold", cursor: "pointer", backgroundColor: "#e0f7fa", color: "#006064" }}
              >
                {[...new Set(semuaJadwalMinggu.map(j => new Date(j.tanggal).getFullYear()))].map(thn => (
                  <option key={thn} value={thn}>Tahun {thn}</option>
                ))}
              </select>

              {/* 2. FILTER TANGGAL (MENYESUAIKAN TAHUN) */}
              <select 
                value={tanggalTerpilih} 
                onChange={(e) => setTanggalTerpilih(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", flex: 1, minWidth: "200px", maxWidth: "300px", fontWeight: "bold", cursor: "pointer", backgroundColor: "white" }}
              >
                {semuaJadwalMinggu
                  .filter(j => new Date(j.tanggal).getFullYear() === (tanggalTerpilih ? new Date(tanggalTerpilih).getFullYear() : new Date().getFullYear()))
                  .map(j => (
                    <option key={j.id} value={j.tanggal}>
                      {formatTanggalDropdown(j.tanggal)}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <span style={{ color: "red", fontSize: "14px", fontWeight: "bold" }}>Belum ada data jadwal.</span>
          )}
        </div>
      </div>
      
      <div id="dashboard-tabs" style={{ display: "flex", borderBottom: "4px solid #0A2540", marginBottom: "0", flexWrap: "wrap", gap: "5px" }}>
        <button style={getTabStyle("minggu")} onClick={() => setTabAktif("minggu")}>⛪ Informasi Pelayanan</button>
        <button style={getTabStyle("keuangan")} onClick={() => setTabAktif("keuangan")}>💰 Warta Keuangan</button>
        <button style={getTabStyle("lainnya")} onClick={() => setTabAktif("lainnya")}>📢 Warta Lain-lain</button>
        <button style={getTabStyle("bacaan")} onClick={() => setTabAktif("bacaan")}>📖 Bacaan Harian</button>
        
        {/* BUNGKUS KEDUA TOMBOL AGAR BERSEBELAHAN DI KANAN */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          
          {/* Tombol Export PPT Baru (HANYA MUNCUL UNTUK SEKRETARIS) */}
          {apakahSekretaris && (
            <button onClick={handleDownloadPPT} style={{ padding: "12px 20px", backgroundColor: "#f25c05", color: "white", border: "none", borderRadius: "8px 8px 0 0", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              📊 Download PPT
            </button>
          )}
          
          <button onClick={() => window.print()} style={{ padding: "12px 25px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px 8px 0 0", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            🖨️ Cetak Keseluruhan
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "0 0 10px 10px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)", border: "1px solid #ddd", borderTop: "none" }}>
        
        {/* TAB 1: INFORMASI PELAYANAN */}
        <div className={`print-section ${tabAktif === "minggu" ? "screen-block" : "screen-none"}`}>
          
          {/* ======== MULAI KOP SURAT ======== */}
<div style={{ display: "flex", width: "100%", borderBottom: "3px solid black", marginBottom: "30px", fontFamily: "'Times New Roman', Times, serif", color: "black", alignItems: "center" }}>
  
  {/* BAGIAN BARU: Kolom Khusus Logo */}
  <div style={{ padding: "0 15px", display: "flex", justifyContent: "center" }}>
    <img src="/logo.png" alt="Logo GMIT" style={{ width: "80px", height: "auto" }} />
  </div>

  {/* Kolom Tengah: Teks GMIT */}
  <div style={{ flex: "1", borderRight: "1px solid black", padding: "10px 5px", textAlign: "center", lineHeight: "1.4" }}>
    <div style={{ fontSize: "12px", fontWeight: "bold" }}>GEREJA MASEHI INJILI DI TIMOR</div>
    <div style={{ fontSize: "12px" }}>(GBM, GPI dan Anggota PGI)</div>
    <div style={{ fontSize: "12px", fontWeight: "bold" }}>KLASIS MOLLO BARAT</div>
    <div style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>MAJELIS JEMAAT {profilGereja.namaJemaat}</div>
    <div style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>MATA JEMAAT {profilGereja.namaMataJemaat}</div>
  </div>
  
  {/* Kolom Kanan: Info Warta */}
  <div style={{ flex: "1", padding: "10px 5px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: "1.4" }}>
    <div style={{ fontSize: "16px", fontWeight: "bold" }}>WARTA MINGGU</div>
    <div style={{ fontSize: "16px", margin: "10px 0" }}>{tanggalTerpilih ? formatTgl(tanggalTerpilih) : "-"}</div>
    <div style={{ fontSize: "16px", fontWeight: "bold" }}>
      {mingguIni ? (mingguIni.masa_raya || mingguIni.tema || "KEBAKTIAN MINGGU") : "-"}
    </div>
  </div>
</div>
{/* ======== SELESAI KOP SURAT ======== */}

          {/* ======== KATA SAMBUTAN (PINDAH KE DALAM TAB 1) ======== */}
          <div style={{ marginTop: "20px", marginBottom: "35px", fontSize: "15px", lineHeight: "1.6", textAlign: "justify", fontFamily: "'Times New Roman', Times, serif", color: "black" }}>
            <ol style={{ margin: 0, paddingLeft: "25px" }}>
              <li style={{ marginBottom: "10px" }}>Atas nama Majelis Jemaat GMIT {profilGereja.namaJemaat} - Mata Jemaat {profilGereja.namaMataJemaat}, mengucapkan selamat datang & selamat beribadah kepada seluruh Jemaat yang telah hadir di ibadah saat ini, kiranya ibadah membawa berkat, sukacita & damai sejahtera bagi kita.</li>
              <li>Diucapkan selamat datang dan selamat beribadah bagi jemaat tamu yang telah hadir pada ibadah saat ini, berkat dan anugerah kiranya selalu mengawali dan menyertai kita sekalian.</li>
            </ol>
          </div>
          {/* ======== SELESAI KATA SAMBUTAN ======== */}
          {!loading && semuaJadwalMinggu.length > 0 && (
            <div className="wadah-tabel-print" style={{ border: "1px solid #e0e0e0", padding: "25px", borderRadius: "10px", backgroundColor: "white", marginBottom: "30px" }}>
              
              {/* TABEL KEBAKTIAN MINGGU */}
              <h2 className="print-only" style={{ textAlign: "center", marginBottom: "20px" }}>WARTA PELAYANAN MINGGUAN</h2>
              {mingguIni ? (
                <>
                  <h4 style={{ backgroundColor: "#0A2540", color: "white", padding: "12px", margin: "-25px -25px 20px -25px", borderRadius: "10px 10px 0 0", textAlign: "center", fontSize: "16px" }}>
                    {(mingguIni.masa_raya || mingguIni.tema || "KEBAKTIAN MINGGU").toUpperCase()}
                  </h4>
                  
                  {/* --- VERSI TABEL DESKTOP / CETAK --- */}
                  <div className="table-responsive tabel-desktop">
                    <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f4f4f4", borderBottom: "2px solid #ccc", textAlign: "left" }}>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "25%" }}>Parameter Pelayanan</th>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Ini ({formatTgl(mingguIni.tanggal)})</th>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Depan ({mingguDepan ? formatTgl(mingguDepan.tanggal) : "-"})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['petugas', 'pendamping', 'baca_firman', 'doa_persembahan', 'mazmur', 'pembacaan', 'masa_raya', 'tema', 'stola', 'busana', 'psvg', 'pemandu_lagu', 'pemandu_lagu_rayon'].map((k) => {
                          // Variabel pembantu untuk nama parameter
                          const namaParameter = k === 'pemandu_lagu' ? 'Pemandu Lagu' : k === 'pemandu_lagu_rayon' ? 'Pemandu Lagu dari Rayon' : k.replace(/_/g, ' ');
                          
                          return (
                            <tr key={k}>
                              <td data-label="Parameter" style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold", textTransform: "capitalize" }}>
                                {namaParameter}
                              </td>
                              <td data-label="Minggu Ini" style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center", color: k === 'petugas' ? "#007BFF" : "black", fontWeight: "bold" }}>
                                {mingguIni[k] || "-"}
                              </td>
                              <td data-label="Minggu Depan" style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center", fontWeight: "bold" }}>
                                {mingguDepan?.[k] || "-"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* --- VERSI NARASI CARD HP (HANYA MUNCUL DI LAYAR KECIL) --- */}
                  <div className="card-mobile no-print" style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
                    
                    {/* KARTU MINGGU INI */}
                    <div style={{ backgroundColor: "#e0f7fa", padding: "20px", borderRadius: "12px", border: "1px solid #b2ebf2", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#006064", borderBottom: "2px solid #00acc1", paddingBottom: "5px" }}>Minggu Ini</h4>
                      <p style={{ margin: "5px 0", lineHeight: "1.6", fontSize: "15px", color: "#333" }}>
                        <b style={{fontWeight: "900", color: "#000"}}>{formatTgl(mingguIni.tanggal)}</b><br/>
                        <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.masa_raya}</b><br/>
                        Tema: <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.tema}</b><br/>
                        Pembacaan <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.pembacaan}</b> dengan Mazmur <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.mazmur}</b>
                        
                        <br/><br/>{/* JARAK 1: Antara Mazmur dan Petugas */}

                        Yang bertugas minggu ini <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.petugas}</b> dengan pendamping <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.pendamping}</b><br/>
                        Yang membaca firman <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.baca_firman}</b><br/>
                        Doa persembahan oleh <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.doa_persembahan}</b>
                        
                        <br/><br/>{/* JARAK 2: Antara Doa Persembahan dan Stola */}

                        Dengan stola <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.stola}</b> dan berbusana <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.busana}</b>
                        
                        <br/><br/>{/* JARAK 3: Antara Stola dan Pemandu Lagu */}

                        Yang mengisi pujian <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.psvg}</b> dengan pemandu lagu <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.pemandu_lagu}</b> dan pemandu lagu dari rayon <b style={{fontWeight: "900", color: "#000"}}>{mingguIni.pemandu_lagu_rayon}</b>.
                      </p>
                    </div>

                    {/* KARTU MINGGU DEPAN */}
                    {mingguDepan && (
                      <div style={{ backgroundColor: "#fff9c4", padding: "20px", borderRadius: "12px", border: "1px solid #fff59d", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#f57f17", borderBottom: "2px solid #fbc02d", paddingBottom: "5px" }}>Minggu Depan</h4>
                        <p style={{ margin: "5px 0", lineHeight: "1.6", fontSize: "15px", color: "#333" }}>
                          <b style={{fontWeight: "900", color: "#000"}}>{formatTgl(mingguDepan.tanggal)}</b><br/>
                          <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.masa_raya}</b><br/>
                          Tema: <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.tema}</b><br/>
                          Pembacaan <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.pembacaan}</b> dengan Mazmur <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.mazmur}</b>
                          
                          <br/><br/>{/* JARAK 1: Antara Mazmur dan Petugas */}

                          Yang bertugas minggu depan <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.petugas}</b> dengan pendamping <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.pendamping}</b><br/>
                          Yang membaca firman <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.baca_firman}</b><br/>
                          Doa persembahan oleh <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.doa_persembahan}</b>
                          
                          <br/><br/>{/* JARAK 2: Antara Doa Persembahan dan Stola */}

                          Dengan stola <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.stola}</b> dan berbusana <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.busana}</b>
                          
                          <br/><br/>{/* JARAK 3: Antara Stola dan Pemandu Lagu */}

                          Yang mengisi pujian <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.psvg}</b> dengan pemandu lagu <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.pemandu_lagu}</b> dan pemandu lagu dari rayon <b style={{fontWeight: "900", color: "#000"}}>{mingguDepan.pemandu_lagu_rayon}</b>.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : <p style={{ textAlign: "center", fontStyle: "italic", color: "red", marginBottom: "30px" }}>Tidak ada Jadwal Kebaktian untuk pekan ini.</p>}

              {/* KOMPONEN KEHADIRAN DISISIPKAN DI SINI */}
                <KehadiranJemaat 
                  tanggal={tanggalTerpilih} 
                  isSekretaris={apakahSekretaris} 
                /> 

              {/* TABEL & CARD IBADAH RAYON */}
              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px", marginTop: !mingguIni ? "0" : "20px" }}>PELAYANAN IBADAH RAYON SEPEKAN</h4>
              {jadwalRayonSepekan.length > 0 ? (
                <>
                  {/* VERSI TABEL DESKTOP */}
                  <div className="table-responsive tabel-desktop">
                    <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Rayon</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Keluarga Pelayan</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Penatua Bertugas</th></tr></thead>
                      <tbody>
                        {jadwalRayonSepekan.map((j, i) => (
                          <tr key={i}>
                            <td data-label="Rayon" style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaUnit}</td>
                            <td data-label="Hari & Tanggal" style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)},<br/>{formatTgl(j.tanggal)}</td>
                            <td data-label="Keluarga Pelayan" style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td>
                            <td data-label="Penatua Bertugas" style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* VERSI NARASI CARD HP - RAYON (WARNA KONSISTEN PER NAMA RAYON) */}
                  <div className="card-mobile no-print" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginBottom: "25px" }}>
                    {jadwalRayonSepekan.map((j, i) => {
                      const paletRayon = [
                        { bg: "#e8f5e9", border: "#c8e6c9", left: "#43a047", text: "#2e7d32" }, // Hijau
                        { bg: "#e3f2fd", border: "#bbdefb", left: "#1e88e5", text: "#1565c0" }, // Biru
                        { bg: "#fff3e0", border: "#ffe0b2", left: "#fb8c00", text: "#ef6c00" }, // Orange
                        { bg: "#fce4ec", border: "#f8bbd0", left: "#d81b60", text: "#ad1457" }, // Pink
                        { bg: "#f3e5f5", border: "#e1bee7", left: "#8e24aa", text: "#6a1b9a" }  // Ungu
                      ];
                      
                      // LOGIKA BARU: Menghitung kode warna berdasarkan Teks Nama Rayon
                      const hitungKode = (j.namaUnit || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const warna = paletRayon[hitungKode % paletRayon.length];

                      return (
                        <div key={i} style={{ backgroundColor: warna.bg, padding: "15px", borderRadius: "10px", border: `1px solid ${warna.border}`, borderLeft: `5px solid ${warna.left}` }}>
                          <h4 style={{ margin: "0 0 10px 0", color: warna.text, borderBottom: `1px solid ${warna.border}`, paddingBottom: "5px" }}>{j.namaUnit}</h4>
                          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.8", color: "#333" }}>
                            Ibadah rayon pada hari <b style={{fontWeight: "900", color: "#000"}}>{namaHari(j.tanggal)}, {formatTgl(j.tanggal)}</b><br/>
                            di rumah keluarga <b style={{fontWeight: "900", color: "#000"}}>{j.tempatKeluarga}</b><br/>
                            dengan petugas <b style={{fontWeight: "900", color: "#000"}}>{j.petugas}</b>.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <p style={{ color: "gray", fontStyle: "italic", marginBottom: "40px" }}>Tidak ada jadwal ibadah rayon pada pekan ini.</p>}

              {/* TABEL & CARD KATEGORIAL */}
              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px" }}>PELAYANAN KATEGORIAL & TAMBAHAN SEPEKAN</h4>
              {jadwalKategorialSepekan.length > 0 ? (
                <>
                  {/* VERSI TABEL DESKTOP */}
                  <div className="table-responsive tabel-desktop">
                    <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Kategori & Sektor</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Tempat / Anggota</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Petugas Pelayan</th></tr></thead>
                      <tbody>
                        {jadwalKategorialSepekan.map((j, i) => (
                          <tr key={i}>
                            <td data-label="Kategori & Sektor" style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaKategoriInduk} - {j.namaUnit}</td>
                            <td data-label="Hari & Tanggal" style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)},<br/>{formatTgl(j.tanggal)}</td>
                            <td data-label="Tempat / Anggota" style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td>
                            <td data-label="Petugas Pelayan" style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* VERSI NARASI CARD HP - KATEGORIAL (DENGAN WARNA & NARASI DINAMIS TAHAN BANTING) */}
                  <div className="card-mobile no-print" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginBottom: "25px" }}>
                    {jadwalKategorialSepekan.map((j, i) => {
                      const paletKategorial = [
                        { bg: "#e0f2f1", border: "#b2dfdb", left: "#00897b", text: "#00695c" }, // Teal
                        { bg: "#fff8e1", border: "#ffecb3", left: "#ffb300", text: "#ff8f00" }, // Amber
                        { bg: "#e8eaf6", border: "#c5cae9", left: "#3f51b5", text: "#283593" }, // Indigo
                        { bg: "#fbe9e7", border: "#ffccbc", left: "#f4511e", text: "#d84315" }, // Deep Orange
                        { bg: "#e0f7fa", border: "#b2ebf2", left: "#00acc1", text: "#00838f" }  // Cyan
                      ];
                      
                      const hitungKode = (j.namaKategoriInduk || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const warna = paletKategorial[hitungKode % paletKategorial.length];

                      // LOGIKA BARU: Detektor Ganda (Cek Induk dan Cek Unit)
                      const teksInduk = (j.namaKategoriInduk || "").toLowerCase().trim();
                      const teksUnit = (j.namaUnit || "").toLowerCase().trim();
                      
                      // Jika salah satunya mengandung kata "doa", ubah narasinya!
                      const isPersekutuanDoa = teksInduk.includes("doa") || teksUnit.includes("doa");
                      const awalanNarasi = isPersekutuanDoa ? `Pelayanan ${j.namaUnit}` : "Pelayanan kategorial";

                      return (
                        <div key={i} style={{ backgroundColor: warna.bg, padding: "15px", borderRadius: "10px", border: `1px solid ${warna.border}`, borderLeft: `5px solid ${warna.left}` }}>
                          <h4 style={{ margin: "0 0 10px 0", color: warna.text, borderBottom: `1px solid ${warna.border}`, paddingBottom: "5px" }}>{j.namaKategoriInduk} - {j.namaUnit}</h4>
                          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.8", color: "#333" }}>
                            {awalanNarasi} pada hari <b style={{fontWeight: "900", color: "#000"}}>{namaHari(j.tanggal)}, {formatTgl(j.tanggal)}</b><br/>
                            bertempat di <b style={{fontWeight: "900", color: "#000"}}>{j.tempatKeluarga}</b><br/>
                            dengan petugas pelayan <b style={{fontWeight: "900", color: "#000"}}>{j.petugas}</b>.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <p style={{ color: "gray", fontStyle: "italic" }}>Tidak ada jadwal kategorial pada pekan ini.</p>}
            </div>
          )}
        </div>

        {/* TAB 2: KEUANGAN */}
        <div className={`print-section ${tabAktif === "keuangan" ? "screen-block" : "screen-none"}`}>
          <h2 className="print-only" style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "20px" }}>Laporan Keuangan Jemaat</h2>
          
          {/* HANYA MUNCUL JIKA SEKRETARIS YANG LOGIN */}
          {apakahSekretaris && (
            <div className="no-print" style={{ backgroundColor: "#fdf1f1", padding: "30px", borderRadius: "8px", border: "2px dashed #dc3545", textAlign: "center", marginBottom: "30px", marginTop: "20px" }}>
              
              {/* OPSI 1: PASTE URL (LINK MANUAL) */}
              <div style={{ marginBottom: "25px", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #f5c6cb" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px", color: "#333" }}>🔗 Opsi 1: Paste URL / Link Laporan (PDF/Gambar dari Drive)</label>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <input 
                    type="text" 
                    id="input-url-keuangan" 
                    placeholder="Contoh: https://link-google-drive.com/file.pdf" 
                    style={{ flex: "1", minWidth: "250px", maxWidth: "500px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} 
                  />
                  <button onClick={() => {
                    const inputEl = document.getElementById("input-url-keuangan");
                    if(inputEl.value.trim() !== "") {
                      setFileKeuangan(prev => [...prev, inputEl.value]);
                      setIsKeuanganTersimpan(false);
                      inputEl.value = ""; // Kosongkan input setelah ditambah
                    }
                  }} style={{ padding: "10px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                    ➕ Tambahkan Link
                  </button>
                </div>
              </div>

              <div style={{ margin: "20px 0", color: "gray", fontWeight: "bold" }}>ATAU</div>

              {/* OPSI 2: UPLOAD FILE (LAPTOP/HP) */}
              <label htmlFor="tombol-upload-mutlak" style={{ cursor: "pointer", fontWeight: "bold", color: "white", display: "inline-block", padding: "12px 25px", backgroundColor: "#dc3545", border: "none", borderRadius: "5px" }}>
                📄 / 📸 Opsi 2: Upload File (PDF / Gambar)
              </label>
              
              <input id="tombol-upload-mutlak" type="file" multiple accept=".png,.jpg,.jpeg,.pdf" style={{ display: "none" }} onChange={handlePilihGambar} />
              <p style={{ marginTop: "10px", fontSize: "13px", color: "gray" }}>Pilih file langsung dari memori perangkat (PDF/JPG/PNG).</p>
            </div>
          )}

          {fileKeuangan.length > 0 ? (
            <div style={{ marginTop: "20px" }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontWeight: "bold", color: "#333" }}>Terpilih {fileKeuangan.length} Gambar</span>
                  <span style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "3px" }}>🔄 Tahan dan geser (drag) gambar di bawah untuk mengubah urutan cetak.</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {!isKeuanganTersimpan && (
                    <button 
                      onClick={simpanFileKeuangan} 
                      disabled={isUploading}
                      style={{ padding: "8px 15px", backgroundColor: isUploading ? "#88c999" : "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: isUploading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                        {isUploading ? "⏳ Menyimpan..." : "💾 Simpan ke Server"}
                    </button>
                  )}
                  <button onClick={hapusSemuaFileKeuangan} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>🗑️ Hapus Semua</button>
                </div>
              </div>

              {/* PERBAIKAN: Jika file cuma 1, penuhi layar (1fr). Jika banyak, susun bersampingan. */}
              <div className="grid-keuangan" style={{ display: "grid", gridTemplateColumns: fileKeuangan.length === 1 ? "1fr" : "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
                {fileKeuangan.map((file, index) => (
                  <div 
                    key={index}
                    className="gambar-wrapper-cetak"
                    draggable
                    onDragStart={(e) => dragStart(e, index)}
                    onDragEnter={(e) => dragEnter(e, index)}
                    onDragEnd={drop}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ cursor: "grab", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff", width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  >
                    
                    {/* BARIS KEPALA (HEADER): Memisahkan Label/Tombol agar tidak menumpuk di gambar */}
                    <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0A2540", padding: "10px 15px" }}>
                      <span style={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>
                        Halaman {index + 1}
                      </span>
                      <button 
                        onClick={() => hapusSatuGambar(index)}
                        style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", padding: "6px 15px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                      >
                        Hapus
                      </button>
                    </div>

                    {/* AREA KONTEN: Mendukung Gambar & PDF */}
                    <div style={{ padding: "15px", backgroundColor: "#f4f4f4", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                      {/* LOGIKA PENGECEKAN: Apakah ini PDF? */}
                      {(typeof file === "string" ? file.toLowerCase().endsWith(".pdf") : file && file.type === "application/pdf") ? (
                        
                        /* JIKA PDF: Panggil Sub-Komponen */
                        <div style={{ width: "100%", height: "100%", minHeight: "200px", display: "flex", flexDirection: "column", padding: "0" }}>
                          {typeof file === "string" ? (
                            <PdfViewerCetak url={file} />
                          ) : (
                            <div style={{ textAlign: "center", padding: "40px" }}>
                              <div style={{ fontSize: "50px", marginBottom: "10px" }}>📄</div>
                              <span style={{ color: "#28a745", fontWeight: "bold", fontSize: "15px" }}>PDF siap diunggah...<br/>(Klik Simpan ke Server)</span>
                            </div>
                          )}
                        </div>

                      ) : (

                        /* JIKA GAMBAR: Tampilkan Seperti Biasa */
                        <img 
                          src={typeof file === "string" ? file : (file ? URL.createObjectURL(file) : "")} 
                          alt={`Laporan ${index + 1}`} 
                          className="item-gambar-cetak"
                          style={{ width: "100%", height: "auto", display: "block", maxHeight: "600px", objectFit: "contain" }} 
                          onError={(e) => { e.target.src = "https://via.placeholder.com/800x400?text=Gambar+Tidak+Tersedia"; }}
                        />

                      )}
                    </div>

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
          
          {/* TOMBOL EDIT HANYA MUNCUL JIKA USER ADALAH SEKRETARIS */}
          {apakahSekretaris && (
            <div className="no-print" style={{ textAlign: "right", marginBottom: "15px", backgroundColor: "#fff3cd", padding: "10px", borderRadius: "5px", border: "1px solid #ffeeba" }}>
              <span style={{ marginRight: "15px", fontWeight: "bold", color: "#856404" }}>🔒 Akses Admin Warta</span>
              {isEditingWarta ? (
                <button onClick={simpanWartaLain} style={{ padding: "8px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>💾 Simpan Perubahan</button>
              ) : (
                <button onClick={() => setIsEditingWarta(true)} style={{ padding: "8px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>✏️ Edit Warta Kategori</button>
              )}
            </div>
          )}

          {isEditingWarta ? (
            <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}>
              
              <div><label style={{fontWeight: "bold"}}>1. Sapaan</label>
              <textarea value={wartaLain.sapaan} onChange={(e) => setWartaLain({...wartaLain, sapaan: e.target.value})} style={{width: "100%", height: "80px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} /></div>

              <div><label style={{fontWeight: "bold"}}>2. Ucapan Selamat Ulang Tahun (Copy-Paste Excel Kolom Nama & Tgl)</label>
              <textarea value={wartaLain.ulangTahun} onChange={(e) => setWartaLain({...wartaLain, ulangTahun: e.target.value})} placeholder="Paste dari excel di sini..." style={{width: "100%", height: "120px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} /></div>

              <div><label style={{fontWeight: "bold"}}>3. Warta Baptisan</label>
              <textarea value={wartaLain.baptisan} onChange={(e) => setWartaLain({...wartaLain, baptisan: e.target.value})} style={{width: "100%", height: "80px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} /></div>

              {/* --- DYNAMIC INPUT PERNIKAHAN --- */}
              <div style={{ border: "1px solid #bee5eb", padding: "15px", borderRadius: "5px", backgroundColor: "#e0f7fa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{fontWeight: "bold", fontSize: "16px"}}>4. Warta Pernikahan</label>
                  <button onClick={() => setWartaLain({...wartaLain, pernikahan: [...wartaLain.pernikahan, {teks: "", gambarUrl: ""}]})} style={{ padding: "5px 10px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>+ Tambah Pasangan</button>
                </div>
                
                {wartaLain.pernikahan.map((item, index) => (
                  <div key={index} style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: index !== wartaLain.pernikahan.length - 1 ? "1px dashed #b2ebf2" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#00838f" }}>Pasangan #{index + 1}</span>
                      {wartaLain.pernikahan.length > 1 && (
                        <button onClick={() => {
                          const newArr = [...wartaLain.pernikahan];
                          newArr.splice(index, 1);
                          setWartaLain({...wartaLain, pernikahan: newArr});
                        }} style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>Hapus</button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                      <label style={{ cursor: "pointer", backgroundColor: "#17a2b8", color: "white", padding: "8px 15px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap", margin: 0 }}>
                        📷 Upload Gambar
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadGambarWarta(e, "pernikahan", index)} />
                      </label>
                      <input type="text" value={item.gambarUrl} onChange={(e) => {
                        const newArr = [...wartaLain.pernikahan];
                        newArr[index].gambarUrl = e.target.value;
                        setWartaLain({...wartaLain, pernikahan: newArr});
                      }} placeholder="Atau paste Link Gambar di sini..." style={{ flex: "1", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: item.gambarUrl === "Mengunggah..." ? "#e9ecef" : "#fff", color: item.gambarUrl === "Mengunggah..." ? "#28a745" : "#000", fontWeight: item.gambarUrl === "Mengunggah..." ? "bold" : "normal" }} disabled={item.gambarUrl === "Mengunggah..."} />
                    </div>
                    <textarea value={item.teks} onChange={(e) => {
                      const newArr = [...wartaLain.pernikahan];
                      newArr[index].teks = e.target.value;
                      setWartaLain({...wartaLain, pernikahan: newArr});
                    }} placeholder="Teks Warta Pernikahan..." style={{width: "100%", height: "60px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc"}} />
                  </div>
                ))}
              </div>

              {/* --- DYNAMIC INPUT KEMATIAN --- */}
              <div style={{ border: "1px solid #f5c6cb", padding: "15px", borderRadius: "5px", backgroundColor: "#f8d7da" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{fontWeight: "bold", fontSize: "16px"}}>5. Warta Kematian</label>
                  <button onClick={() => setWartaLain({...wartaLain, kematian: [...wartaLain.kematian, {teks: "", gambarUrl: ""}]})} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>+ Tambah Berita</button>
                </div>
                
                {wartaLain.kematian.map((item, index) => (
                  <div key={index} style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: index !== wartaLain.kematian.length - 1 ? "1px dashed #f5c6cb" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#c82333" }}>Almarhum/ah #{index + 1}</span>
                      {wartaLain.kematian.length > 1 && (
                        <button onClick={() => {
                          const newArr = [...wartaLain.kematian];
                          newArr.splice(index, 1);
                          setWartaLain({...wartaLain, kematian: newArr});
                        }} style={{ backgroundColor: "#c82333", color: "white", border: "none", borderRadius: "3px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>Hapus</button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                      <label style={{ cursor: "pointer", backgroundColor: "#c82333", color: "white", padding: "8px 15px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap", margin: 0 }}>
                        📷 Upload Gambar
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadGambarWarta(e, "kematian", index)} />
                      </label>
                      <input type="text" value={item.gambarUrl} onChange={(e) => {
                        const newArr = [...wartaLain.kematian];
                        newArr[index].gambarUrl = e.target.value;
                        setWartaLain({...wartaLain, kematian: newArr});
                      }} placeholder="Atau paste Link Gambar di sini..." style={{ flex: "1", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: item.gambarUrl === "Mengunggah..." ? "#e9ecef" : "#fff", color: item.gambarUrl === "Mengunggah..." ? "#28a745" : "#000", fontWeight: item.gambarUrl === "Mengunggah..." ? "bold" : "normal" }} disabled={item.gambarUrl === "Mengunggah..."} />
                    </div>
                    <textarea value={item.teks} onChange={(e) => {
                      const newArr = [...wartaLain.kematian];
                      newArr[index].teks = e.target.value;
                      setWartaLain({...wartaLain, kematian: newArr});
                    }} placeholder="Teks Warta Kematian..." style={{width: "100%", height: "60px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc"}} />
                  </div>
                ))}
              </div>

              <div><label style={{fontWeight: "bold"}}>6. Informasi Pembangunan</label>
              <textarea value={wartaLain.pembangunan} onChange={(e) => setWartaLain({...wartaLain, pembangunan: e.target.value})} style={{width: "100%", height: "80px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} /></div>

              <div><label style={{fontWeight: "bold"}}>7. Informasi Lain-lain</label>
              <textarea value={wartaLain.informasiLain} onChange={(e) => setWartaLain({...wartaLain, informasiLain: e.target.value})} style={{width: "100%", height: "100px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} /></div>
            </div>
          ) : (
            <div style={{ padding: "20px", backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", fontFamily: "Arial", lineHeight: "1.6", fontSize: "14px" }}>
              
              {/* RENDER KATEGORI JIKA ADA ISINYA SAJA */}
              {wartaLain.sapaan && <div style={{marginBottom:"20px"}}><h4>Sapaan</h4><p style={{whiteSpace:"pre-wrap"}}>{wartaLain.sapaan}</p></div>}
              
              {wartaLain.ulangTahun && <div style={{marginBottom:"20px"}}><h4>Ucapan Selamat Ulang Tahun</h4>{renderTabelExcel(wartaLain.ulangTahun)}</div>}
              
              {wartaLain.baptisan && <div style={{marginBottom:"20px"}}><h4>Warta Baptisan</h4><p style={{whiteSpace:"pre-wrap"}}>{wartaLain.baptisan}</p></div>}
              
              {/* RENDER PERNIKAHAN (ARRAY MAP) */}
              {Array.isArray(wartaLain.pernikahan) && wartaLain.pernikahan.some(p => p.teks) && (
                <div style={{marginBottom:"20px", border:"1px solid #bee5eb", padding:"15px", borderRadius:"8px"}}>
                  <h4>Warta Pernikahan</h4>
                  {wartaLain.pernikahan.map((item, idx) => item.teks ? (
                    <div key={idx} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "15px", paddingBottom: "15px", borderBottom: idx !== wartaLain.pernikahan.length - 1 ? "1px dashed #bee5eb" : "none" }}>
                      {item.gambarUrl && <img src={item.gambarUrl} alt="Pernikahan" style={{maxWidth: "200px", borderRadius: "8px"}} />}
                      <p style={{whiteSpace:"pre-wrap", flex: 1, margin: 0}}>{item.teks}</p>
                    </div>
                  ) : null)}
                </div>
              )}

              {/* RENDER KEMATIAN (ARRAY MAP) */}
              {Array.isArray(wartaLain.kematian) && wartaLain.kematian.some(k => k.teks) && (
                <div style={{marginBottom:"20px", border:"1px solid #f5c6cb", padding:"15px", borderRadius:"8px"}}>
                  <h4>Warta Kematian</h4>
                  {wartaLain.kematian.map((item, idx) => item.teks ? (
                    <div key={idx} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "15px", paddingBottom: "15px", borderBottom: idx !== wartaLain.kematian.length - 1 ? "1px dashed #f5c6cb" : "none" }}>
                      {item.gambarUrl && <img src={item.gambarUrl} alt="Kematian" style={{maxWidth: "200px", borderRadius: "8px"}} />}
                      <p style={{whiteSpace:"pre-wrap", flex: 1, margin: 0}}>{item.teks}</p>
                    </div>
                  ) : null)}
                </div>
              )}

              {wartaLain.kematian?.teks && (
                <div style={{marginBottom:"20px", border:"1px solid #f5c6cb", padding:"15px", borderRadius:"8px"}}>
                  <h4>Warta Kematian</h4>
                  <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-start" }}>
                    {wartaLain.kematian.gambarUrl && <img src={wartaLain.kematian.gambarUrl} alt="Kematian" style={{maxWidth: "200px", borderRadius: "8px"}} />}
                    <p style={{whiteSpace:"pre-wrap", flex: 1}}>{wartaLain.kematian.teks}</p>
                  </div>
                </div>
              )}
              
              {wartaLain.pembangunan && <div style={{marginBottom:"20px"}}><h4>Informasi Pembangunan</h4><p style={{whiteSpace:"pre-wrap"}}>{wartaLain.pembangunan}</p></div>}
              
              {wartaLain.informasiLain && <div style={{marginBottom:"20px"}}><h4>Informasi Lain-lain</h4><p style={{whiteSpace:"pre-wrap"}}>{wartaLain.informasiLain}</p></div>}

              {/* Jika Semua Kosong */}
              {(!wartaLain.sapaan && !wartaLain.ulangTahun && !wartaLain.baptisan && !wartaLain.pernikahan?.teks && !wartaLain.kematian?.teks && !wartaLain.pembangunan && !wartaLain.informasiLain) && (
                <span style={{ color: "gray", fontStyle: "italic", textAlign: "center", display: "block" }}>Tidak ada warta tambahan untuk tanggal ini.</span>
              )}

            </div>
          )}
        </div>

        {/* TAB 4: BACAAN HARIAN (DENGAN CLASS no-print AGAR TIDAK TERCETAK) */}
        <div className="no-print" style={{ display: tabAktif === "bacaan" ? "block" : "none" }}>
          <h2 style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "20px" }}>Bacaan Harian Jemaat</h2>
          
          {/* TOMBOL EDIT HANYA MUNCUL JIKA USER ADALAH SEKRETARIS */}
          {apakahSekretaris && (
            <div style={{ textAlign: "right", marginBottom: "15px", backgroundColor: "#e2e3e5", padding: "10px", borderRadius: "5px", border: "1px solid #d6d8db" }}>
              <span style={{ marginRight: "15px", fontWeight: "bold", color: "#383d41" }}>⚙️ Akses Admin Bacaan</span>
              {isEditingWarta ? (
                <button onClick={simpanWartaLain} style={{ padding: "8px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>💾 Simpan Perubahan</button>
              ) : (
                <button onClick={() => setIsEditingWarta(true)} style={{ padding: "8px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>✏️ Edit Bacaan Harian</button>
              )}
            </div>
          )}

          {isEditingWarta ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}>
              <div>
                <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>📋 Input Bacaan Harian (Copy-Paste dari Excel)</label>
                <p style={{fontSize: "13px", color: "#666", marginTop: 0, marginBottom: "10px"}}>
                  Pastikan berurutan 3 kolom di excel Anda: <strong>Hari & Tanggal</strong> (Tab) <strong>Bacaan</strong> (Tab) <strong>Tema</strong>
                </p>
                <textarea 
                  value={wartaLain.bacaanHarian || ""} 
                  onChange={(e) => setWartaLain({...wartaLain, bacaanHarian: e.target.value})} 
                  placeholder="Paste langsung dari blok cell excel di sini..." 
                  style={{width: "100%", height: "200px", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "monospace"}} 
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 0" }}>
              {wartaLain.bacaanHarian ? (
                renderCardBacaanHarian(wartaLain.bacaanHarian)
              ) : (
                <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
                  <span style={{ color: "gray", fontStyle: "italic", fontSize: "15px" }}>Belum ada jadwal bacaan harian yang diunggah untuk sepekan ini.</span>
                </div>
              )}
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