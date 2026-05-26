// src/utils/dbQueries.js
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";

// Fungsi untuk mengecek dan menambah data jemaat baru
export const tambahDataJemaat = async (dataBaru) => {
  const jemaatRef = collection(db, "master_jemaat");
  
  // Validasi: Cek apakah ID atau Nama sudah ada di database
  const qId = query(jemaatRef, where("id_anggota", "==", dataBaru.id_anggota));
  const qNama = query(jemaatRef, where("nama_lengkap", "==", dataBaru.nama_lengkap));
  
  const [snapshotId, snapshotNama] = await Promise.all([getDocs(qId), getDocs(qNama)]);

  if (!snapshotId.empty) {
    throw new Error("Gagal: ID Anggota sudah terdaftar.");
  }
  if (!snapshotNama.empty) {
    throw new Error("Gagal: Nama Anggota sudah terdaftar.");
  }

  // Jika lolos validasi (tanggal lahir diabaikan dari pengecekan duplikat), simpan data
  await addDoc(jemaatRef, dataBaru);
  return "Data berhasil ditambahkan!";
};