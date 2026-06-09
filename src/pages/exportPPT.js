import pptxgen from "pptxgenjs";

const formatTgl = (tgl) => {
  if (!tgl) return "-";
  const d = new Date(tgl + "T00:00:00");
  return isNaN(d) ? tgl : d.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
};

const namaHari = (tgl) => {
  if (!tgl) return "-";
  const d = new Date(tgl + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString("id-ID", { weekday: 'long' });
};

export const buatPPTWarta = ({
  tanggalTerpilih, profilGereja, mingguIni, mingguDepan,
  jadwalRayonSepekan, jadwalKategorialSepekan, fileKeuangan, wartaLain
}) => {
  let pres = new pptxgen();
  const warnaUtama = "0A2540";
  const bgTerang = "F4F8FF";

  const pecahArray = (array, ukuran) => {
    const hasil = [];
    for (let i = 0; i < array.length; i += ukuran) {
      hasil.push(array.slice(i, i + ukuran));
    }
    return hasil;
  };

  const hitungUsiaPPT = (teksTanggal) => {
    if (!teksTanggal) return "-";
    let tahunLahir = null;
    if (teksTanggal.includes('-') && teksTanggal.split('-')[0].length === 4) {
      tahunLahir = parseInt(teksTanggal.split('-')[0]);
    } else if (teksTanggal.includes('/')) {
      const parts = teksTanggal.split('/');
      if (parts.length === 3) tahunLahir = parseInt(parts[2]);
    } else {
      const pencarian = teksTanggal.match(/\b(19\d{2}|20\d{2})\b/);
      if (pencarian) tahunLahir = parseInt(pencarian[0]);
    }
    if (tahunLahir) {
      const usia = new Date().getFullYear() - tahunLahir;
      return usia > 0 ? `${usia} Tahun` : "-";
    }
    return "-";
  };

  // ==========================================
  // SLIDE 1: JUDUL UTAMA
  // ==========================================
  let slideJudul = pres.addSlide();
  slideJudul.background = { color: bgTerang };
  slideJudul.addText("WARTA JEMAAT", { x: 0.5, y: 1.2, w: "90%", fontSize: 48, bold: true, align: "center", color: warnaUtama });
  slideJudul.addText(`Mata Jemaat ${profilGereja.namaMataJemaat}`, { x: 0.5, y: 2.1, w: "90%", fontSize: 28, align: "center", color: "333333" });
  let masaRayaTeks = mingguIni?.masa_raya ? mingguIni.masa_raya : "Kebaktian Minggu";
  slideJudul.addText(masaRayaTeks.toUpperCase(), { x: 0.5, y: 3.0, w: "90%", fontSize: 24, bold: true, align: "center", color: "dc3545" });
  slideJudul.addText(`${formatTgl(tanggalTerpilih)}`, { x: 0.5, y: 3.6, w: "90%", fontSize: 22, align: "center", color: "666666" });

  // ==========================================
  // SLIDE MINGGU INI (DIPECAH 3 BAGIAN)
  // ==========================================
  if (mingguIni) {
    let slideMinggu1 = pres.addSlide();
    slideMinggu1.addText("JADWAL MINGGU INI (Bagian 1)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisMinggu1 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Tema", options: { fontSize: 16 } }, { text: mingguIni.tema || "-", options: { fontSize: 16 } }],
      [{ text: "Pembacaan", options: { fontSize: 16 } }, { text: mingguIni.pembacaan || "-", options: { fontSize: 16 } }],
      [{ text: "Mazmur", options: { fontSize: 16 } }, { text: mingguIni.mazmur || "-", options: { fontSize: 16 } }],
      [{ text: "Pengkhotbah", options: { fontSize: 16 } }, { text: mingguIni.petugas || "-", options: { fontSize: 16 } }],
      [{ text: "Pendamping", options: { fontSize: 16 } }, { text: mingguIni.pendamping || "-", options: { fontSize: 16 } }]
    ];
    slideMinggu1.addTable(barisMinggu1, { x: 0.5, y: 1.0, w: 9, colW: [2.5, 6.5], border: { pt: 1, color: "cccccc" }, rowH: 0.7, valign: "middle" });

    let slideMinggu2 = pres.addSlide();
    slideMinggu2.addText("JADWAL MINGGU INI (Bagian 2)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisMinggu2 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Baca Firman", options: { fontSize: 16 } }, { text: mingguIni.baca_firman || "-", options: { fontSize: 16 } }],
      [{ text: "Doa Persembahan", options: { fontSize: 16 } }, { text: mingguIni.doa_persembahan || "-", options: { fontSize: 16 } }],
      [{ text: "Stola", options: { fontSize: 16 } }, { text: mingguIni.stola || "-", options: { fontSize: 16 } }]
    ];
    slideMinggu2.addTable(barisMinggu2, { x: 0.5, y: 1.0, w: 9, colW: [3.5, 5.5], border: { pt: 1, color: "cccccc" }, rowH: 0.8, valign: "middle" });

    let slideMinggu3 = pres.addSlide();
    slideMinggu3.addText("JADWAL MINGGU INI (Bagian 3)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisMinggu3 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Busana", options: { fontSize: 16 } }, { text: mingguIni.busana || "-", options: { fontSize: 16 } }],
      [{ text: "Pujian / PSVG", options: { fontSize: 16 } }, { text: mingguIni.psvg || "-", options: { fontSize: 16 } }],
      [{ text: "Pemandu Lagu", options: { fontSize: 16 } }, { text: mingguIni.pemandu_lagu || "-", options: { fontSize: 16 } }],
      [{ text: "Pemandu Lagu Rayon", options: { fontSize: 16 } }, { text: mingguIni.pemandu_lagu_rayon || "-", options: { fontSize: 16 } }]
    ];
    slideMinggu3.addTable(barisMinggu3, { x: 0.5, y: 1.0, w: 9, colW: [3.5, 5.5], border: { pt: 1, color: "cccccc" }, rowH: 0.8, valign: "middle" });
  }

  // ==========================================
  // SLIDE MINGGU DEPAN (DIPECAH 3 BAGIAN)
  // ==========================================
  if (mingguDepan) {
    let slideDepan1 = pres.addSlide();
    slideDepan1.addText("JADWAL MINGGU DEPAN (Bagian 1)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisDepan1 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Tema", options: { fontSize: 16 } }, { text: mingguDepan.tema || "-", options: { fontSize: 16 } }],
      [{ text: "Pembacaan", options: { fontSize: 16 } }, { text: mingguDepan.pembacaan || "-", options: { fontSize: 16 } }],
      [{ text: "Mazmur", options: { fontSize: 16 } }, { text: mingguDepan.mazmur || "-", options: { fontSize: 16 } }],
      [{ text: "Pengkhotbah", options: { fontSize: 16 } }, { text: mingguDepan.petugas || "-", options: { fontSize: 16 } }],
      [{ text: "Pendamping", options: { fontSize: 16 } }, { text: mingguDepan.pendamping || "-", options: { fontSize: 16 } }]
    ];
    slideDepan1.addTable(barisDepan1, { x: 0.5, y: 1.0, w: 9, colW: [2.5, 6.5], border: { pt: 1, color: "cccccc" }, rowH: 0.7, valign: "middle" });

    let slideDepan2 = pres.addSlide();
    slideDepan2.addText("JADWAL MINGGU DEPAN (Bagian 2)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisDepan2 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Baca Firman", options: { fontSize: 16 } }, { text: mingguDepan.baca_firman || "-", options: { fontSize: 16 } }],
      [{ text: "Doa Persembahan", options: { fontSize: 16 } }, { text: mingguDepan.doa_persembahan || "-", options: { fontSize: 16 } }],
      [{ text: "Stola", options: { fontSize: 16 } }, { text: mingguDepan.stola || "-", options: { fontSize: 16 } }]
    ];
    slideDepan2.addTable(barisDepan2, { x: 0.5, y: 1.0, w: 9, colW: [3.5, 5.5], border: { pt: 1, color: "cccccc" }, rowH: 0.8, valign: "middle" });

    let slideDepan3 = pres.addSlide();
    slideDepan3.addText("JADWAL MINGGU DEPAN (Bagian 3)", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
    let barisDepan3 = [
      [ { text: "Uraian", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Detail Pelayanan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } } ],
      [{ text: "Busana", options: { fontSize: 16 } }, { text: mingguDepan.busana || "-", options: { fontSize: 16 } }],
      [{ text: "Pujian / PSVG", options: { fontSize: 16 } }, { text: mingguDepan.psvg || "-", options: { fontSize: 16 } }],
      [{ text: "Pemandu Lagu", options: { fontSize: 16 } }, { text: mingguDepan.pemandu_lagu || "-", options: { fontSize: 16 } }],
      [{ text: "Pemandu Lagu Rayon", options: { fontSize: 16 } }, { text: mingguDepan.pemandu_lagu_rayon || "-", options: { fontSize: 16 } }]
    ];
    slideDepan3.addTable(barisDepan3, { x: 0.5, y: 1.0, w: 9, colW: [3.5, 5.5], border: { pt: 1, color: "cccccc" }, rowH: 0.8, valign: "middle" });
  }

  // ==========================================
  // SLIDE: PELAYANAN RAYON & KATEGORIAL
  // ==========================================
  if (jadwalRayonSepekan && jadwalRayonSepekan.length > 0) {
    const headerRayon = [{ text: "Rayon", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Waktu", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Keluarga", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Pelayan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }];
    const chunksRayon = pecahArray(jadwalRayonSepekan, 2); 
    chunksRayon.forEach((chunk, index) => {
      let slideRayon = pres.addSlide();
      slideRayon.addText(`IBADAH RAYON ${chunksRayon.length > 1 ? `(Bagian ${index + 1})` : ""}`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
      let barisRayon = chunk.map(j => [ { text: j.namaUnit || "-", options: { fontSize: 18 } }, { text: `${namaHari(j.tanggal)},\n${formatTgl(j.tanggal)}`, options: { fontSize: 16 } }, { text: j.tempatKeluarga || "-", options: { fontSize: 18 } }, { text: j.petugas || "-", options: { fontSize: 18 } } ]);
      slideRayon.addTable([headerRayon, ...barisRayon], { x: 0.5, y: 1.0, w: 9, colW: [1.5, 2.5, 2.5, 2.5], border: { pt: 1, color: "cccccc" }, valign: "middle", rowH: 1.2 }); 
    });
  }

  if (jadwalKategorialSepekan && jadwalKategorialSepekan.length > 0) {
    const kategorialGrouped = jadwalKategorialSepekan.reduce((acc, obj) => {
      const key = obj.namaKategoriInduk || "Kategorial Lainnya";
      if (!acc[key]) acc[key] = [];
      acc[key].push(obj);
      return acc;
    }, {});
    const headerKat = [{ text: "Sektor/Unit", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Waktu", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Tempat", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Pelayan", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }];
    Object.keys(kategorialGrouped).forEach((kategoriNama) => {
      const chunksKat = pecahArray(kategorialGrouped[kategoriNama], 4);
      chunksKat.forEach((chunk, index) => {
        let slideKat = pres.addSlide();
        slideKat.addText(`PELAYANAN ${kategoriNama.toUpperCase()} ${chunksKat.length > 1 ? `(Bag. ${index + 1})` : ""}`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
        let barisKat = chunk.map(j => [ { text: j.namaUnit || "-", options: { fontSize: 16 } }, { text: `${namaHari(j.tanggal)},\n${formatTgl(j.tanggal)}`, options: { fontSize: 16 } }, { text: j.tempatKeluarga || "-", options: { fontSize: 18 } }, { text: j.petugas || "-", options: { fontSize: 18 } } ]);
        slideKat.addTable([headerKat, ...barisKat], { x: 0.5, y: 1.0, w: 9, colW: [2.0, 2.5, 2.5, 2.0], border: { pt: 1, color: "cccccc" }, valign: "middle", rowH: 0.8 });
      });
    });
  }

  // ==========================================
  // SLIDE: WARTA KEUANGAN (1 Gambar = 1 Slide)
  // ==========================================
  if (fileKeuangan && fileKeuangan.length > 0) {
    fileKeuangan.forEach((fileUrl, fIdx) => {
       if (typeof fileUrl === "string" && !fileUrl.toLowerCase().endsWith(".pdf")) {
          let slideUang = pres.addSlide();
          slideUang.addText(`WARTA KEUANGAN (Lembar ${fIdx + 1})`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
          
          // Menggunakan sizing { type: "contain" } agar gambar presisi menempati area
          // tanpa terpotong (auto-fit).
          slideUang.addImage({ path: fileUrl, x: 0.5, y: 1.0, w: 9, h: 4.5, sizing: { type: "contain" } });
       }
    });
  }

  // ==========================================
  // SLIDE: WARTA LAIN-LAIN (Dengan Auto-Fit)
  // ==========================================
  if (wartaLain) {
    
    if (wartaLain.sapaan) {
        const teksPenuh = wartaLain.sapaan;
        const panjangTeks = teksPenuh.length;
        const batas1 = Math.ceil(panjangTeks / 3);
        const batas2 = Math.ceil(panjangTeks * (2/3));

        const potong1 = teksPenuh.lastIndexOf(' ', batas1);
        const potong2 = teksPenuh.lastIndexOf(' ', batas2);

        const sapaanChunks = [
            teksPenuh.slice(0, potong1),
            teksPenuh.slice(potong1, potong2),
            teksPenuh.slice(potong2)
        ];

        sapaanChunks.forEach((chunk, index) => {
            let slideSapaan = pres.addSlide();
            slideSapaan.addText(`SAPAAN MAJELIS JEMAAT (Bagian ${index + 1})`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
            // autoFit: true akan mengecilkan font jika melebihi tinggi bingkai (h: 4.5)
            slideSapaan.addText(chunk.trim(), { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
        });
    }

    if (wartaLain.ulangTahun) {
        const barisHutTeks = wartaLain.ulangTahun.trim().split('\n');
        // UPDATE: Ubah batasan dari 6 menjadi 5 orang per slide
        const chunksHut = pecahArray(barisHutTeks, 5); 
        chunksHut.forEach((chunk, index) => {
            let slideHut = pres.addSlide();
            slideHut.addText(`WARTA ULANG TAHUN ${chunksHut.length > 1 ? `(Bagian ${index + 1})` : ""}`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
            let headerHut = [{ text: "Nama Jemaat", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "Tanggal Lahir", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18 } }, { text: "HUT Ke-", options: { bold: true, fill: warnaUtama, color: "ffffff", fontSize: 18, align: "center" } }];
            let dataHut = chunk.map(row => {
                const cells = row.split('\t');
                return [ { text: cells[0] || "-", options: { fontSize: 16 } }, { text: cells[1] || "-", options: { fontSize: 16 } }, { text: hitungUsiaPPT(cells[1] || "-"), options: { fontSize: 16, align: "center", bold: true, color: "dc3545" } } ];
            });
            slideHut.addTable([headerHut, ...dataHut], { x: 0.5, y: 1.0, w: 9, colW: [4, 3, 2], border: { pt: 1, color: "cccccc" }, valign: "middle", rowH: 0.6 });
        });
    }

    if (wartaLain.baptisan) {
        let slideBap = pres.addSlide();
        slideBap.addText("WARTA BAPTISAN", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
        slideBap.addText(wartaLain.baptisan, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
    }

    if (wartaLain.pernikahan && Array.isArray(wartaLain.pernikahan)) {
        wartaLain.pernikahan.forEach((nikah) => {
            if (nikah.teks || nikah.gambarUrl) {
                let slideNikah = pres.addSlide();
                slideNikah.addText(`WARTA PERNIKAHAN`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
                if (nikah.gambarUrl && !nikah.gambarUrl.includes("Mengunggah")) {
                    slideNikah.addImage({ path: nikah.gambarUrl, x: 0.5, y: 1.0, w: 3, h: 4.5, sizing: { type: "contain" } });
                    slideNikah.addText(nikah.teks || "", { x: 3.8, y: 1.0, w: 5.5, h: 4.5, fontSize: 28, align: "left", valign: "top", color: "333333", autoFit: true });
                } else {
                    slideNikah.addText(nikah.teks || "", { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
                }
            }
        });
    }

    if (wartaLain.kematian && Array.isArray(wartaLain.kematian)) {
        wartaLain.kematian.forEach((mati) => {
            if (mati.teks || mati.gambarUrl) {
                let slideMati = pres.addSlide();
                slideMati.addText(`BERITA DUKACITA`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: "dc3545", border: { type: "bottom", pt: 2, color: "dc3545" } });
                if (mati.gambarUrl && !mati.gambarUrl.includes("Mengunggah")) {
                    slideMati.addImage({ path: mati.gambarUrl, x: 0.5, y: 1.0, w: 3, h: 4.5, sizing: { type: "contain" } });
                    slideMati.addText(mati.teks || "", { x: 3.8, y: 1.0, w: 5.5, h: 4.5, fontSize: 28, align: "left", valign: "top", color: "333333", autoFit: true });
                } else {
                    slideMati.addText(mati.teks || "", { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
                }
            }
        });
    }

    if (wartaLain.pembangunan) {
        let slideBangun = pres.addSlide();
        slideBangun.addText("INFORMASI PEMBANGUNAN", { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
        slideBangun.addText(wartaLain.pembangunan, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
    }

    if (wartaLain.informasiLain) {
        const barisInfo = wartaLain.informasiLain.split(/(?=\b\d+\.\s)/).filter(b => b.trim() !== "");
        
        barisInfo.forEach((infoText, index) => {
            let slideInfo = pres.addSlide();
            slideInfo.addText(`INFORMASI LAIN-LAIN (${index + 1})`, { x: 0.5, y: 0.3, w: "90%", fontSize: 26, bold: true, color: warnaUtama, border: { type: "bottom", pt: 2, color: warnaUtama } });
            // autoFit memastikan jika satu poin (misal Poin 5) teksnya sangat panjang, font otomatis mengecil.
            slideInfo.addText(infoText.trim(), { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 32, align: "left", valign: "top", color: "333333", autoFit: true });
        });
    }
  }

  // ==========================================
  // SLIDE TANDA TANGAN 
  // ==========================================
  let slideTtd = pres.addSlide();
  slideTtd.addText("MAJELIS JEMAAT", { x: 0.5, y: 0.8, w: "90%", fontSize: 32, bold: true, align: "center", color: warnaUtama });
  slideTtd.addText("Mengetahui,\nWakil Ketua\n\n\n\n( " + (profilGereja.wakilKetua || "....................................") + " )", 
    { x: 1.0, y: 2.2, w: 3.5, fontSize: 20, align: "center", color: "333333" }
  );
  let tglKop = tanggalTerpilih ? formatTgl(tanggalTerpilih) : "......................";
  slideTtd.addText(profilGereja.namaMataJemaat + ", " + tglKop + "\nSekretaris\n\n\n\n( " + (profilGereja.sekretaris || "....................................") + " )", 
    { x: 5.5, y: 2.2, w: 3.5, fontSize: 20, align: "center", color: "333333" }
  );

  pres.writeFile({ fileName: `Slide_Warta_${tanggalTerpilih}.pptx` });
};