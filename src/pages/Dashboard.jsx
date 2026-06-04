import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // <-- HANYA FIRESTORE, TANPA STORAGE
import KehadiranJemaat from "./KehadiranJemaat";
import { getAuth } from "firebase/auth"; // <-- Tambahkan ini di atas

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
          setTeksWartaLain(docSnapTeks.data().teks);
        } else {
          setTeksWartaLain(""); 
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validImages = Array.from(files).filter(f => f.type.includes("image"));
    
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
    const CLOUD_NAME = "dn1vrtpi5"; 
    const UPLOAD_PRESET = "tae9icgg"; 
    
    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < fileKeuangan.length; i++) {
        const file = fileKeuangan[i];
        
        if (typeof file === "string") {
          // Jika sudah berupa URL (sudah pernah diupload), langsung masukkan
          uploadedUrls.push(file);
        } else {
          // Jika file baru, upload ke Cloudinary
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", UPLOAD_PRESET);
          
          const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
          });
          
          const data = await response.json();
          if (data.secure_url) {
            uploadedUrls.push(data.secure_url);
          } else {
            throw new Error(data.error?.message || "Gagal mengunggah gambar ke server");
          }
        }
      }

      // FITUR BARU: Menghapus URL yang ganda/dobel sebelum disimpan
      const urlBersihTanpaDobel = [...new Set(uploadedUrls)];

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

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", fontFamily: "Arial", padding: "20px" }}>
      <style dangerouslySetInnerHTML={{__html: `
        /* --- KELAS UNTUK TAMPILAN LAYAR (LOCALHOST) --- */
        .screen-none { display: none; }
        .screen-block { display: block; }
        .print-only { display: none !important; }
        
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 40px;
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
          
          /* 2. MERAPIKAN TABEL & TEKS PEMANDU LAGU */
          table { 
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse; 
            table-layout: auto !important; 
          } 
          
          th, td { 
            border: 1px solid #000 !important;
            padding: 6px !important; 
            color: black !important; 
            white-space: normal !important; 
            word-wrap: break-word !important;
            font-size: 12px !important;
          } 
          
          /* ATURAN GAMBAR KEUANGAN */
          .grid-keuangan { display: block !important; }
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

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e9ecef", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h3 style={{ margin: "0 0 5px 0", color: "#0A2540" }}>Sistem Warta Jemaat</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "gray" }}>Pilih tanggal untuk melihat jadwal pelayanan dan arsip.</p>
        </div>
        <div style={{ flex: "1 1 auto", minWidth: "250px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px", color: "#444" }}>Pilih Tanggal Acuan:</label>
          {semuaJadwalMinggu.length > 0 ? (
            <select 
              value={tanggalTerpilih} 
              onChange={(e) => setTanggalTerpilih(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", maxWidth: "300px", fontWeight: "bold", cursor: "pointer", backgroundColor: "white", marginTop: "5px" }}
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
        <button style={getTabStyle("minggu")} onClick={() => setTabAktif("minggu")}>📋 Informasi Pelayanan</button>
        <button style={getTabStyle("keuangan")} onClick={() => setTabAktif("keuangan")}>💰 Warta Keuangan</button>
        <button style={getTabStyle("lainnya")} onClick={() => setTabAktif("lainnya")}>📌 Warta Lain-lain</button>
        
        <button onClick={() => window.print()} style={{ padding: "12px 25px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px 8px 0 0", marginLeft: "auto", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          🖨️ Cetak Keseluruhan
        </button>
      </div>

      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "0 0 10px 10px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)", border: "1px solid #ddd", borderTop: "none" }}>
        
        {/* TAB 1: INFORMASI PELAYANAN */}
        <div className={`print-section ${tabAktif === "minggu" ? "screen-block" : "screen-none"}`}>
          
          {/* ======== MULAI KOP SURAT (PINDAH KE DALAM TAB 1) ======== */}
          <div style={{ display: "flex", width: "100%", borderBottom: "3px solid black", marginBottom: "30px", fontFamily: "'Times New Roman', Times, serif", color: "black" }}>
            <div style={{ flex: "1", borderRight: "1px solid black", padding: "10px 5px", textAlign: "center", lineHeight: "1.4" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>GEREJA MASEHI INJILI DI TIMOR</div>
              <div style={{ fontSize: "14px" }}>(GBM, GPI dan Anggota PGI)</div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>KLASIS MOLLO BARAT</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase" }}>MAJELIS JEMAAT {profilGereja.namaJemaat}</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase" }}>MATA JEMAAT {profilGereja.namaMataJemaat}</div>
            </div>
            
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
                  
                  <div className="table-responsive">
                    <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f4f4f4", borderBottom: "2px solid #ccc", textAlign: "left" }}>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "25%" }}>Parameter Pelayanan</th>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Ini ({formatTgl(mingguIni.tanggal)})</th>
                          <th style={{ padding: "12px", border: "1px solid #ddd", width: "37.5%", textAlign: "center" }}>Minggu Depan ({mingguDepan ? formatTgl(mingguDepan.tanggal) : "-"})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['petugas', 'pendamping', 'baca_firman', 'doa_persembahan', 'mazmur', 'pembacaan', 'masa_raya', 'tema', 'stola', 'busana', 'psvg', 'pemandu_lagu', 'pemandu_lagu_rayon'].map((k) => (
                          <tr key={k}>
                            <td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold", textTransform: "capitalize" }}>
                              {/* Logika untuk menampilkan nama label dengan rapi */}
                              {k === 'pemandu_lagu' ? 'Pemandu Lagu' : 
                              k === 'pemandu_lagu_rayon' ? 'Pemandu Lagu dari Rayon' : 
                              k.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center", color: k === 'petugas' ? "#007BFF" : "black", fontWeight: k === 'petugas' ? "bold" : "normal" }}>{mingguIni[k] || "-"}</td>
                            <td style={{ padding:"10px", border:"1px solid #ddd", textAlign:"center" }}>{mingguDepan?.[k] || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p style={{ textAlign: "center", fontStyle: "italic", color: "red", marginBottom: "30px" }}>Tidak ada Jadwal Kebaktian untuk pekan ini.</p>}

              {/* KOMPONEN KEHADIRAN DISISIPKAN DI SINI */}
                <KehadiranJemaat 
                  tanggal={tanggalTerpilih} 
                  isSekretaris={apakahSekretaris} 
                /> 

              {/* TABEL IBADAH RAYON */}
              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px", marginTop: !mingguIni ? "0" : "20px" }}>PELAYANAN IBADAH RAYON SEPEKAN</h4>
              {jadwalRayonSepekan.length > 0 ? (
                <div className="table-responsive">
                  <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Rayon</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Keluarga Pelayan</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Penatua Bertugas</th></tr></thead>
                    <tbody>{jadwalRayonSepekan.map((j, i) => <tr key={i}><td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaUnit}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)},<br/>{formatTgl(j.tanggal)}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p style={{ color: "gray", fontStyle: "italic", marginBottom: "40px" }}>Tidak ada jadwal ibadah rayon pada pekan ini.</p>}

              {/* TABEL KATEGORIAL */}
              <h4 style={{ borderBottom: "2px solid #0A2540", paddingBottom: "8px", color: "#0A2540", fontSize: "16px" }}>PELAYANAN KATEGORIAL & TAMBAHAN SEPEKAN</h4>
              {jadwalKategorialSepekan.length > 0 ? (
                <div className="table-responsive">
                  <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead><tr style={{ backgroundColor: "#f4f4f4" }}><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Kategori & Sektor</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hari & Tanggal</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Tempat / Anggota</th><th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Petugas Pelayan</th></tr></thead>
                    <tbody>{jadwalKategorialSepekan.map((j, i) => <tr key={i}><td style={{ padding:"10px", border:"1px solid #ddd", fontWeight:"bold" }}>{j.namaKategoriInduk} - {j.namaUnit}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{namaHari(j.tanggal)},<br/>{formatTgl(j.tanggal)}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.tempatKeluarga}</td><td style={{ padding:"10px", border:"1px solid #ddd" }}>{j.petugas}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p style={{ color: "gray", fontStyle: "italic" }}>Tidak ada jadwal kategorial pada pekan ini.</p>}
            </div>
          )}
        </div>

        {/* TAB 2: KEUANGAN */}
        <div className={`print-section ${tabAktif === "keuangan" ? "screen-block" : "screen-none"}`}>
          <h2 className="print-only" style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", color: "black", marginTop: "20px" }}>Laporan Keuangan Jemaat</h2>
          
          <div className="no-print" style={{ backgroundColor: "#fdf1f1", padding: "30px", borderRadius: "8px", border: "2px dashed #dc3545", textAlign: "center", marginBottom: "30px", marginTop: "20px" }}>
            
            {/* PASTIKAN LABEL DAN INPUT TERPISAH SEPERTI INI */}
            <label htmlFor="tombol-upload-mutlak" style={{ cursor: "pointer", fontWeight: "bold", color: "white", display: "inline-block", padding: "12px 25px", backgroundColor: "#dc3545", border: "none", borderRadius: "5px" }}>
              ➕ Tambahkan Gambar Laporan
            </label>
            
            <input 
              id="tombol-upload-mutlak"
              type="file" 
              multiple 
              accept=".png,.jpg,.jpeg" 
              style={{ display: "none" }} 
              onChange={handlePilihGambar} 
            />
            
            <p style={{ marginTop: "10px", fontSize: "13px", color: "gray" }}>Anda dapat memilih lebih dari 1 file gambar sekaligus (JPG/PNG).</p>
          </div>

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
                    // HAPUS position: relative, TAMBAH flex column agar punya baris kepala
                    style={{ cursor: "grab", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff", width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
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

                    {/* AREA GAMBAR: Aman dari tumpukan teks */}
                    <div style={{ padding: "15px", backgroundColor: "#f4f4f4" }}>
                      <img 
                        src={typeof file === "string" ? file : (file ? URL.createObjectURL(file) : "")} 
                        alt={`Keuangan ${index + 1}`} 
                        className="item-gambar-cetak"
                        style={{ width: "100%", height: "auto", display: "block", minHeight: "200px", objectFit: "contain" }} 
                        onError={(e) => { e.target.src = "https://via.placeholder.com/800x400?text=Gambar+Tidak+Tersedia"; }}
                      />
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
          
          <div className="no-print" style={{ textAlign: "right", marginBottom: "15px" }}>
            {isEditingWarta ? (
              <button onClick={simpanWartaLain} style={{ padding: "8px 20px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>💾 Simpan Teks</button>
            ) : (
              <button onClick={() => setIsEditingWarta(true)} style={{ padding: "8px 20px", backgroundColor: "#f8f9fa", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" }}>📝 Edit (Copy-Paste dari Word)</button>
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