// src/pages/ManajemenJadwalMinggu.jsx
import React from "react";
import PasteExcel from "../components/PasteExcel";

export default function ManajemenJadwalMinggu() {
  
  // Mendefinisikan urutan kolom sesuai dengan format file Excel Warta
  const strukturKolomMinggu = [
    { key: "tanggal", label: "Tanggal" },
    { key: "masa_raya", label: "Masa Raya" },
    { key: "pembacaan_mazmur", label: "Pembacaan Mazmur" },
    { key: "pembacaan_alkitab", label: "Pembacaan Alkitab" },
    { key: "stola", label: "Stola" },
    { key: "tema", label: "Tema" },
    { key: "petugas", label: "Petugas Utama" },
    { key: "pendamping", label: "Pendamping" },
    { key: "baca_firman", label: "Baca Firman" },
    { key: "doa_persembahan", label: "Doa Persembahan" }
  ];

  // Fungsi yang akan dijalankan ketika sekretaris mengklik "Simpan Data Permanen"
  const handleSimpanKeDatabase = async (dataDraft) => {
    console.log("Data yang siap dikirim ke Firebase:", dataDraft);
    // Nanti kita akan tambahkan fungsi untuk push data ini ke Firestore (Firebase)
    alert(`Berhasil menangkap ${dataDraft.length} baris jadwal! Cek Console.`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Manajemen Jadwal Kebaktian Minggu</h2>
      <p>Gunakan formulir di bawah ini untuk menginput jadwal mingguan dari Excel secara massal.</p>
      
      {/* Memanggil komponen PasteExcel dengan struktur khusus Kebaktian Minggu */}
      <PasteExcel 
        judulKolom={strukturKolomMinggu} 
        onSimpan={handleSimpanKeDatabase} 
      />
    </div>
  );
}