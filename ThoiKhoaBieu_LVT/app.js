let thongSoHocVu = {};
let quyenSuaChua = false; 
let quyenChiTiet = { menu: [], nut: [], lop: [] }; 
let duLieuTkbHienTai = []; 
let tuanDangXem = 1; 
let ngayDauTuanUI = '';

document.addEventListener('DOMContentLoaded', () => { khoiTaoGiaoDien(); });

// =========================================================================
// KHỐI KẾT NỐI MẠNG CỐT LÕI (NÂNG CẤP CHỐNG TREO & CHỐNG CACHE AN TOÀN CORS)
// =========================================================================
async function fetchVoiCoCheThuLai(url, tuyChon = {}, soLanThu = 3, thoiGianCho = 45000) {
    for (let i = 0; i < soLanThu; i++) {
        const boDieuKhien = new AbortController();
        const idHenGio = setTimeout(() => boDieuKhien.abort(), thoiGianCho);
        
        // [ĐỘNG CƠ CHỐNG CACHE AN TOÀN VỚI GOOGLE APPS SCRIPT]
        // Bơm mốc thời gian mili-giây vào URL GET để URL luôn mới, lừa trình duyệt bỏ qua cache
        let urlChongCache = url;
        if ((!tuyChon.method || tuyChon.method === 'GET') && !url.includes('_t=')) {
            urlChongCache += (url.includes('?') ? '&' : '?') + '_t=' + new Date().getTime();
        }

        // Bỏ các header tùy chỉnh để tránh bị Google chặn CORS (gây lỗi Failed to fetch)
        const tuyChonMoi = { 
            ...tuyChon, 
            signal: boDieuKhien.signal
        };

        try {
            const phanHoi = await fetch(urlChongCache, tuyChonMoi);
            clearTimeout(idHenGio); 
            
            if (!phanHoi.ok) {
                throw new Error(`Máy chủ từ chối kết nối (Mã lỗi HTTP: ${phanHoi.status})`);
            }

            const noiDungText = await phanHoi.text();

            try {
                JSON.parse(noiDungText);
            } catch (loiCuPhap) {
                throw new Error("Dữ liệu trả về bị nhiễu định dạng (Google Apps Script đang bận).");
            }

            return new Response(noiDungText, {
                status: phanHoi.status,
                statusText: phanHoi.statusText,
                headers: phanHoi.headers
            });

        } catch (loi) {
            clearTimeout(idHenGio); 
            let thongBaoLoi = loi.name === 'AbortError' ? 'Máy chủ phản hồi quá lâu (Timeout)' : loi.message;
            
            if (i === soLanThu - 1) {
                throw new Error(`Mất kết nối: ${thongBaoLoi}. Vui lòng kiểm tra lại đường truyền.`); 
            }
            
            console.warn(`Tạm nghẽn (${thongBaoLoi}), hệ thống tự động kết nối lại lần ${i + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); 
        }
    }
}

// =========================================================================
// KHỐI QUẢN LÝ GIAO DIỆN & PHÂN QUYỀN TRUNG TÂM
// =========================================================================
function kiemSoatGiaoDien() {
    const menuDuocCap = (quyenChiTiet && quyenChiTiet.menu) ? quyenChiTiet.menu : [];
    const nutDuocCap = (quyenChiTiet && quyenChiTiet.nut) ? quyenChiTiet.nut : [];
    const lopDuocCap = (quyenChiTiet && quyenChiTiet.lop) ? quyenChiTiet.lop : [];

    const dsNut = ['btnLuuTuan', 'btnLuuCoDinh', 'btnKhoiPhuc', 'btnXepTuDong', 'btnKiemTra', 'btnNhapExcelTKB', 'btnDongBoChuan'];
    dsNut.forEach(idNut => {
        let nut = document.getElementById(idNut);
        if (nut) {
            let duocPhep = quyenSuaChua || nutDuocCap.includes(idNut);
            if (duocPhep) { nut.style.display = 'flex'; nut.disabled = false; } 
            else { nut.style.display = 'none'; nut.disabled = true; }
        }
    });

    const dsMenuQuanTri = ['menuCaiDat', 'menuDanhMucGV', 'menuDanhMucLop', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucSGK'];
    let coMenuQuanTriDuocMo = false;

    dsMenuQuanTri.forEach(idMenu => {
        let menu = document.getElementById(idMenu);
        if (menu) {
            let duocXem = quyenSuaChua || menuDuocCap.includes(idMenu);
            menu.style.display = duocXem ? 'flex' : 'none'; 
            if (duocXem) coMenuQuanTriDuocMo = true;
        }
    });

    let nhanHT = document.getElementById('nhanHeThong');
    if (nhanHT) {
        nhanHT.style.display = coMenuQuanTriDuocMo ? 'flex' : 'none';
    }

    let btnTuanTruoc = document.getElementById('btnTuanTruoc');
    let btnTuanTiep = document.getElementById('btnTuanTiep');
    let inputNgay = document.getElementById('chonNgayDauTuan');
    let coQuyenChuyenTuan = quyenSuaChua || nutDuocCap.includes('btnChuyenTuan');

    if (coQuyenChuyenTuan) {
        if (btnTuanTruoc) { btnTuanTruoc.style.display = 'block'; }
        if (btnTuanTiep) { btnTuanTiep.style.display = 'block'; }
        
        if (inputNgay) { 
            inputNgay.disabled = false; 
            inputNgay.classList.remove('cursor-not-allowed', 'opacity-80'); 
        }
    } else {
        if (btnTuanTruoc) { btnTuanTruoc.style.display = 'none'; }
        if (btnTuanTiep) { btnTuanTiep.style.display = 'none'; }
        
        if (inputNgay) { 
            inputNgay.disabled = true; 
            inputNgay.classList.add('cursor-not-allowed', 'opacity-80'); 
        }
    }
}

// =========================================================================
// KHỐI XỬ LÝ CHUYỂN TUẦN VÀ NGÀY THÁNG (ĐỊNH TUYẾN 3 LUỒNG)
// =========================================================================
async function chuyenTuan(buocNhay) {
    let theTuan = document.getElementById('hienThiTuanHienTai');
    let tuanHienTaiTrenUI = tuanDangXem;
    
    if (theTuan) {
        if (theTuan.tagName === 'INPUT') {
            tuanHienTaiTrenUI = parseInt(theTuan.value, 10) || tuanDangXem;
        } else {
            let match = theTuan.innerText.match(/\d+/);
            if (match) tuanHienTaiTrenUI = parseInt(match[0], 10);
        }
    }

    let tuanMoi = tuanHienTaiTrenUI + buocNhay;
    if (tuanMoi < 1) tuanMoi = 1; 
    if (tuanMoi > 52) tuanMoi = 52;
    
    let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
    let nguonTruyXuat = 'TKB_HIEN_TAI';
    
    if (tuanMoi < tuanHeThong) {
        nguonTruyXuat = 'DATA_TKB';
    } else if (tuanMoi > tuanHeThong) {
        nguonTruyXuat = 'TKB_CoDinh';
    } else {
        nguonTruyXuat = 'TKB_HIEN_TAI';
    }
    
    if (ngayDauTuanUI && tuanMoi !== tuanDangXem) {
        let parts = ngayDauTuanUI.split('-');
        if (parts.length === 3) {
            let yy = parseInt(parts[0], 10);
            let mm = parseInt(parts[1], 10);
            let dd = parseInt(parts[2], 10);
            
            let d = new Date(yy, mm - 1, dd);
            let doLechTuan = tuanMoi - tuanDangXem; 
            d.setDate(d.getDate() + (doLechTuan * 7));
            
            let newYy = d.getFullYear();
            let newMm = (d.getMonth() + 1).toString().padStart(2, '0');
            let newDd = d.getDate().toString().padStart(2, '0');
            
            ngayDauTuanUI = `${newYy}-${newMm}-${newDd}`;
            let dateInput = document.getElementById('chonNgayDauTuan');
            if (dateInput) dateInput.value = ngayDauTuanUI;
        }
    }
    
    tuanDangXem = tuanMoi;
    
    if (theTuan) {
        if (theTuan.tagName === 'INPUT') {
            theTuan.value = tuanDangXem;
        } else {
            theTuan.innerText = `Tuần ${tuanDangXem}`;
        }
    }
    
    if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) { duLieuTkbHienTai = []; }
    
    if (typeof window.capNhatTenNutTuanTiepTheo === 'function') {
        window.capNhatTenNutTuanTiepTheo();
    }
    
    await taiDuLieuTKB(false, nguonTruyXuat); 
}

let timerCapNhatNgay;
function capNhatNgayDauTuan() {
    clearTimeout(timerCapNhatNgay);
    timerCapNhatNgay = setTimeout(() => {
        let el = document.getElementById('chonNgayDauTuan');
        if (el && el.value !== ngayDauTuanUI) {
            ngayDauTuanUI = el.value;
            if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                duLieuTkbHienTai.forEach(t => t.ngay = ''); 
            }
            xuatMaTranBang(duLieuTkbHienTai); 
        }
    }, 500); 
}

// =========================================================================
// KHỐI 1: KHỞI TẠO VÀ TẢI DỮ LIỆU CƠ BẢN (ĐÃ NÂNG CẤP SMART SYNC FINGERPRINT)
// =========================================================================
async function khoiTaoGiaoDien() {
    const MA_DA = (typeof CAU_HINH_FRONTEND !== 'undefined' && CAU_HINH_FRONTEND.MA_DU_AN) ? CAU_HINH_FRONTEND.MA_DU_AN : 'MAC_DINH';
    const KEY_CH = 'SmartTKB_CauHinh_' + MA_DA;
    const KEY_TKB = 'SmartTKB_DuLieuTuan_' + MA_DA;
    const hienThiTuan = document.getElementById('hienThiTuanHienTai');
    const spinnerTuan = document.getElementById('spinnerTaiTuan');

    try {
        if(typeof CAU_HINH_FRONTEND !== 'undefined') {
            let tieuDeHeThong = document.getElementById('tenHeThong'); 
            if (tieuDeHeThong) tieuDeHeThong.innerText = CAU_HINH_FRONTEND.TEN_DU_AN;
            let logoHT = document.getElementById('logoHeThong'); 
            if (logoHT) logoHT.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
            let logoMenu = document.getElementById('logoMenuDoc'); 
            if (logoMenu) logoMenu.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
        }

        let coCache = false;
        try {
            let cacheCauHinh = localStorage.getItem(KEY_CH);
            let cacheTkb = localStorage.getItem(KEY_TKB);
            
            if (cacheCauHinh && cacheTkb) {
                thongSoHocVu = JSON.parse(cacheCauHinh);
                duLieuTkbHienTai = JSON.parse(cacheTkb);
                
                kiemSoatGiaoDien(); 
                napDuLieuBoLocGiaoVien();
                
                if(thongSoHocVu.NAM_HOC) { 
                    let menuNam = document.getElementById('menuHienThiNamHoc'); 
                    if (menuNam) menuNam.innerText = thongSoHocVu.NAM_HOC; 
                }

                tuanDangXem = parseInt(thongSoHocVu.TUAN_HIEN_TAI) || 1;
                
                if (hienThiTuan) {
                    if (hienThiTuan.tagName === 'INPUT') {
                        hienThiTuan.value = tuanDangXem;
                        if (spinnerTuan) spinnerTuan.classList.remove('hidden');
                    } else {
                        hienThiTuan.innerHTML = `Tuần ${tuanDangXem} <svg class="inline w-4 h-4 text-blue-500 animate-spin ml-1.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg>`;
                    }
                }

                xuatMaTranBang(duLieuTkbHienTai);
                coCache = true;
            }
        } catch(e) { console.warn("Cache hỏng, tải lại từ đầu."); }

        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCauHinh`);
        const thongSoMoi = await phanHoi.json();
        
        if (thongSoMoi.trangThai === 'loi_he_thong') throw new Error(thongSoMoi.thongBao);
        
        thongSoHocVu = thongSoMoi;
        localStorage.setItem(KEY_CH, JSON.stringify(thongSoHocVu)); 
        
        kiemSoatGiaoDien(); 
        napDuLieuBoLocGiaoVien();
        
        if(thongSoHocVu.NAM_HOC) { 
            let menuNam = document.getElementById('menuHienThiNamHoc'); 
            if (menuNam) menuNam.innerText = thongSoHocVu.NAM_HOC; 
        }

        let theTrangThai = document.getElementById('trangThaiHeThong');
        if (theTrangThai && thongSoHocVu.TRANG_THAI_WEB) {
            let trangThai = thongSoHocVu.TRANG_THAI_WEB.trim();
            if (trangThai.toLowerCase() === 'hoạt động') {
                theTrangThai.innerText = 'Hệ thống mở';
                theTrangThai.className = 'font-bold text-green-700 text-base leading-tight inline-block mt-0.5';
            } else {
                theTrangThai.innerText = 'Hệ thống đang nâng cấp\nBảo trì'; 
                theTrangThai.className = 'font-bold text-red-600 text-base leading-tight inline-block mt-0.5 reactbits-bap-benh';
            }
        }
        
        tuanDangXem = parseInt(thongSoHocVu.TUAN_HIEN_TAI) || 1;
        
        // [NÂNG CẤP]: THUẬT TOÁN ĐỐI SÁNH THÔNG MINH CÓ KHÓA CHỐNG TRỄ
        if (thongSoHocVu.TKB_TUAN && thongSoHocVu.TKB_TUAN.length > 0) {
            let tkbMayChu = thongSoHocVu.TKB_TUAN;
            let tkbRam = [];
            try { tkbRam = JSON.parse(localStorage.getItem(KEY_TKB) || '[]'); } catch(e){}

            // Hàm băm dữ liệu (Tạo "dấu vân tay" loại bỏ nhiễu cấu trúc JSON)
            const taoDauVanTay = (mangTkb) => {
                if (!Array.isArray(mangTkb)) return '';
                return mangTkb.map(t => `${String(t.thu).trim()}_${String(t.buoi).trim()}_${String(t.tiet).trim()}_${String(t.maLop).trim()}_${String(t.monHoc || '').trim()}_${String(t.maGv || '').trim()}`).sort().join('||');
            };

            let vanTayMayChu = taoDauVanTay(tkbMayChu);
            let vanTayRam = taoDauVanTay(tkbRam);

            // Kiểm tra xem giáo viên có vừa ấn "Lưu" trong 15 giây qua không
            let thoiGianKhoa = parseInt(localStorage.getItem('KhoaDongBo_TKB') || '0');
            let vuaMoiLuu = (Date.now() - thoiGianKhoa) < 15000; 

            if (vanTayMayChu !== vanTayRam) {
                if (vuaMoiLuu) {
                    console.log("🔒 [Bảo vệ RAM]: Server có dấu hiệu trễ nhịp. Giữ nguyên dữ liệu vừa lưu trên UI!");
                    if (!duLieuTkbHienTai || duLieuTkbHienTai.length === 0) duLieuTkbHienTai = tkbRam;
                } else {
                    console.log("⚡ [Smart Sync]: Dữ liệu thay đổi. Đang đồng bộ hóa lưới UI...");
                    duLieuTkbHienTai = tkbMayChu;
                    localStorage.setItem(KEY_TKB, JSON.stringify(tkbMayChu));
                    xuatMaTranBang(duLieuTkbHienTai);
                    if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
                }
            } else {
                console.log("✅ [Smart Sync]: Dữ liệu RAM và Server khớp 100%.");
                if (!duLieuTkbHienTai || duLieuTkbHienTai.length === 0) {
                    duLieuTkbHienTai = tkbRam.length > 0 ? tkbRam : tkbMayChu;
                }
            }
            
            if (hienThiTuan) {
                if (hienThiTuan.tagName === 'INPUT') {
                    hienThiTuan.value = tuanDangXem;
                    if (spinnerTuan) spinnerTuan.classList.add('hidden');
                } else {
                    hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
                }
            }
        } else {
            await taiDuLieuTKB(coCache); 
        }
        
    } catch (loi) { 
        console.error("Lỗi khởi tạo:", loi); 
        let vungHienThi = document.getElementById('vungHienThiDuLieu');
        if (vungHienThi) {
            vungHienThi.innerHTML = `<tr><td class="px-6 py-10 text-center text-red-600 font-bold text-lg">
                ⚠️ Lỗi khởi động: ${loi.message}
            </td></tr>`;
        }
    }
}

// Bổ sung tham số thứ 3: epDongBo để nhận tín hiệu từ nút Lưu
async function taiDuLieuTKB(coCache = false, nguonTruyXuat = 'TKB_HIEN_TAI', epDongBo = false) {
    const MA_DA = (typeof CAU_HINH_FRONTEND !== 'undefined' && CAU_HINH_FRONTEND.MA_DU_AN) ? CAU_HINH_FRONTEND.MA_DU_AN : 'MAC_DINH';
    const KEY_TKB = 'SmartTKB_DuLieuTuan_' + MA_DA;
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    const hienThiTuan = document.getElementById('hienThiTuanHienTai');
    const spinnerTuan = document.getElementById('spinnerTaiTuan');
    
    let nhanNguon = nguonTruyXuat === 'DATA_TKB' ? 'Dữ liệu quá khứ' : (nguonTruyXuat === 'TKB_CoDinh' ? 'Dự kiến cố định' : 'Hệ thống hiện tại');

    // [HIỆU ỨNG]: Nếu coCache = true, giữ nguyên lưới nhưng hiển thị vòng quay ở ô Tuần
    if (!coCache) {
        vungHienThi.innerHTML = `<tr><td class="text-center text-blue-600 font-bold py-10 reactbits-fade-in text-lg" style="font-family:'Times New Roman',Times,serif;"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải TKB Tuần ${tuanDangXem} từ [${nhanNguon}]...</td></tr>`;
    } else if (hienThiTuan) {
        if (hienThiTuan.tagName === 'INPUT') {
            if (spinnerTuan) spinnerTuan.classList.remove('hidden');
        } else if (!hienThiTuan.innerHTML.includes('animate-spin')) {
            hienThiTuan.innerHTML = `Tuần ${tuanDangXem} <svg class="inline w-4 h-4 text-blue-500 animate-spin ml-1.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg>`;
        }
    }
    
    try {
        const urlTKB = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTKB&tuan=${tuanDangXem}&nguon=${nguonTruyXuat}&_noCacheTkb=${new Date().getTime()}`;
        const phanHoi = await fetchVoiCoCheThuLai(urlTKB);
        const textPhanHoi = await phanHoi.text();
        let duLieu;

        try {
            duLieu = JSON.parse(textPhanHoi);
        } catch (loiParse) {
            throw new Error("Máy chủ trả về dữ liệu hỏng. Hãy kiểm tra lại định dạng dữ liệu đầu ra.");
        }

        if (duLieu.trangThai === 'loi_he_thong') throw new Error(duLieu.thongBao);

        if (Array.isArray(duLieu)) {
            let tkbRam = [];
            try { tkbRam = JSON.parse(localStorage.getItem(KEY_TKB) || '[]'); } catch(e){}
            
            const taoDauVanTay = (mangTkb) => {
                if (!Array.isArray(mangTkb)) return '';
                return mangTkb.map(t => `${String(t.thu).trim()}_${String(t.buoi).trim()}_${String(t.tiet).trim()}_${String(t.maLop).trim()}_${String(t.monHoc || '').trim()}_${String(t.maGv || '').trim()}`).sort().join('||');
            };

            let vanTayMayChu = taoDauVanTay(duLieu);
            let vanTayRam = taoDauVanTay(tkbRam);

            let thoiGianKhoa = parseInt(localStorage.getItem('KhoaDongBo_TKB') || '0');
            // Nếu epDongBo = true, vô hiệu hóa Khóa 15s để cho phép tải dữ liệu mới
            let vuaMoiLuu = (Date.now() - thoiGianKhoa) < 15000 && !epDongBo;

            if (nguonTruyXuat === 'TKB_HIEN_TAI') {
                if (!coCache || vanTayMayChu !== vanTayRam || epDongBo) {
                    if (vuaMoiLuu && coCache) {
                        console.log("🔒 [Bảo vệ RAM]: Từ chối ghi đè dữ liệu cũ từ server do vừa mới lưu xong.");
                        if (document.getElementById('vungHienThiDuLieu').innerHTML.includes('Đang tải')) {
                            xuatMaTranBang(duLieuTkbHienTai);
                        }
                    } else {
                        console.log("⚡ [Smart Sync]: Cập nhật lưới TKB Hiện Tại từ Máy chủ...");
                        duLieuTkbHienTai = duLieu;
                        localStorage.setItem(KEY_TKB, JSON.stringify(duLieu));
                        xuatMaTranBang(duLieuTkbHienTai);
                        if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
                    }
                } else {
                    if (document.getElementById('vungHienThiDuLieu').innerHTML.includes('Đang tải')) {
                        xuatMaTranBang(duLieuTkbHienTai);
                    }
                }
            } else {
                duLieuTkbHienTai = duLieu; 
                xuatMaTranBang(duLieuTkbHienTai);
            }
        } else {
            throw new Error("Dữ liệu nhận được không đúng cấu trúc mảng.");
        }

    } catch (loi) {
        if (!coCache) {
            vungHienThi.innerHTML = `<tr><td class="text-center text-red-500 font-bold py-10 text-lg" style="font-family:'Times New Roman',Times,serif;">
                ⚠️ Lỗi nạp dữ liệu TKB:<br><span class="text-base text-slate-700 font-normal mt-2 inline-block">${loi.message}</span>
            </td></tr>`;
        }
    } finally {
        // Tắt vòng quay thông báo kết thúc tiến trình
        if (hienThiTuan) {
            if (hienThiTuan.tagName === 'INPUT') {
                hienThiTuan.value = tuanDangXem;
                if (spinnerTuan) spinnerTuan.classList.add('hidden');
            }
            else hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
        }
    }
}

// =========================================================================
// HÀM BỔ SUNG: NẠP DỮ LIỆU BỘ LỌC THEO ĐÚNG ID TRONG INDEX.HTML
// =========================================================================
function napDuLieuBoLocGiaoVien() {
    let dtList = document.getElementById('danhSachGvList');
    if (!dtList) return;
    
    dtList.innerHTML = '';
    dtList.innerHTML += `<option value="Toàn trường"></option>`;

    if (thongSoHocVu.DANH_SACH_GIAO_VIEN && thongSoHocVu.DANH_SACH_GIAO_VIEN.length > 0) {
        thongSoHocVu.DANH_SACH_GIAO_VIEN.forEach(gv => {
            dtList.innerHTML += `<option value="${gv}"></option>`;
        });
    }
}

async function goiThuatToanXepLich() {
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    vungHienThi.innerHTML = `<tr><td class="text-center text-orange-600 font-bold py-10 reactbits-fade-in text-lg" style="font-family:'Times New Roman',Times,serif;"><div class="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>Đang chạy Động cơ phân bổ cho Tuần ${tuanDangXem}...</td></tr>`;
    try {
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=xepLichTuDong&tuan=${tuanDangXem}`);
        duLieuTkbHienTai = await phanHoi.json(); 
        xuatMaTranBang(duLieuTkbHienTai);
    } catch (loi) { vungHienThi.innerHTML = `<tr><td class="text-center text-red-500 font-bold py-10 text-lg" style="font-family:'Times New Roman',Times,serif;">Lỗi thuật toán xếp lịch tự động.</td></tr>`; }
}

// =========================================================================
// THUẬT TOÁN LỌC GIÁO VIÊN SIÊU TỐC
// =========================================================================
function locTheoGiaoVien() {
    let gvLoc = document.getElementById('locGiaoVien') ? document.getElementById('locGiaoVien').value.trim() : '';
    let gvLocLC = gvLoc.toLowerCase(); 

    let tapHopLopCuaGV = new Set();
    let coTietNaoKhong = false;

    if (gvLoc !== "" && gvLoc !== "Toàn trường" && typeof duLieuTkbHienTai !== 'undefined') {
        duLieuTkbHienTai.forEach(t => {
            if (t.maGv) {
                let gvTkb = t.maGv.trim().toLowerCase();
                let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                
                if (tapHopGvTkb.includes(gvLocLC)) {
                    tapHopLopCuaGV.add(t.maLop);
                    coTietNaoKhong = true;
                }
            }
        });
    }

    let tbody = document.getElementById('vungHienThiDuLieu');
    let thead = document.getElementById('tieuDeBang');
    
    if (tbody && tbody.querySelector('.canh-bao-trong-lich')) {
        let cacDong = tbody.querySelectorAll('tr:not(.canh-bao-trong-lich)');
        cacDong.forEach(dong => dong.style.display = '');
        let dongCanhBao = tbody.querySelector('.canh-bao-trong-lich');
        if (dongCanhBao) dongCanhBao.remove();
        if (thead) thead.style.display = '';
    }

    if (gvLoc !== "" && gvLoc !== "Toàn trường" && !coTietNaoKhong) {
        if (thead) thead.style.display = 'none';

        if (tbody) {
            let cacDong = tbody.querySelectorAll('tr');
            cacDong.forEach(dong => dong.style.display = 'none'); 
            
            let trCanhBao = document.createElement('tr');
            trCanhBao.className = 'canh-bao-trong-lich bg-orange-50/50';
            trCanhBao.innerHTML = `<td colspan="3" class="text-center py-12">
                <div class="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></div>
                <p class="text-orange-600 font-bold text-lg mb-1">Đồng chí ${gvLoc} không có lịch lên lớp trong tuần này.</p>
                <p class="text-sm text-slate-500 font-medium">Vui lòng xóa ô tìm kiếm hoặc chọn "Toàn trường" để hiển thị lại lưới TKB.</p>
            </td>`;
            tbody.appendChild(trCanhBao);
        }
        return;
    }

    let tatCaCacCot = document.querySelectorAll('[data-cotlop]');
    tatCaCacCot.forEach(cot => {
        let lopCuaCot = cot.getAttribute('data-cotlop');
        if (gvLoc === "" || gvLoc === "Toàn trường" || tapHopLopCuaGV.has(lopCuaCot)) {
            cot.classList.remove('hidden'); 
        } else {
            cot.classList.add('hidden'); 
        }
    });

    let cacOGiaoVien = document.querySelectorAll('input[id^="gv_"]');
    cacOGiaoVien.forEach(oGv => {
        let gvGoc = oGv.value.trim().toLowerCase();
        let isTarget = true;
        
        if (gvLoc !== "" && gvLoc !== "Toàn trường") {
            let tapHopGvGoc = gvGoc.split(/[,;&-]/).map(g => g.trim());
            if (!tapHopGvGoc.includes(gvLocLC)) {
                isTarget = false;
            }
        }
        
        let tdGv = oGv.closest('td');
        let oMon = document.getElementById(oGv.id.replace('gv_', 'mon_'));
        let tdMon = oMon ? oMon.closest('td') : null;

        if (isTarget) {
            if(tdGv) tdGv.classList.remove('bg-gray-100/50');
            if(tdMon) tdMon.classList.remove('bg-gray-100/50');
            oGv.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
            if(oMon) oMon.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
        } else {
            if(tdGv) tdGv.classList.add('bg-gray-100/50');
            if(tdMon) tdMon.classList.add('bg-gray-100/50');
            oGv.classList.add('opacity-0', 'pointer-events-none', 'select-none');
            if(oMon) oMon.classList.add('opacity-0', 'pointer-events-none', 'select-none');
        }
    });
}

function taoTuyChonDong(danhSach, giaTriMacDinh, kieuText, idPhanTu, isTarget = true, loaiDanhSach = '', coQuyenSua = quyenSuaChua) {
    let idThocTinh = idPhanTu ? `id="${idPhanTu}"` : '';
    let thuocTinhKhoa = coQuyenSua ? '' : 'disabled'; 
    let cssKhoa = coQuyenSua ? 'cursor-pointer' : 'cursor-not-allowed opacity-80';
    let cssAn = !isTarget ? 'opacity-0 pointer-events-none select-none' : ''; 
    let idDatalist = loaiDanhSach === 'mon' ? 'datalistChung_Mon' : 'datalistChung_GV';
    
    let kieuKiemTraGV = (idPhanTu && idPhanTu.startsWith('gv_')) ? `if(typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang();` : '';
    
    // [THỦ THUẬT LÁCH LUẬT HTML5]: Đẩy tạm value sang placeholder để giữ hình ảnh chữ, ép datalist xổ toàn bộ
    let onFocusClick = `this.dataset.val=this.value; if(this.value !== ''){ this.placeholder=this.value; this.value=''; } if(this.showPicker) this.showPicker();`;
    let onBlurLogic = `if(this.value.trim() === '') { this.value = this.dataset.val || ''; } this.placeholder='--'; xacThucGiaTriHopLe(this, '${loaiDanhSach}'); ${kieuKiemTraGV}`;
    
    let suKienMoi = `oninput="${kieuKiemTraGV}" onchange="xacThucGiaTriHopLe(this, '${loaiDanhSach}'); ${kieuKiemTraGV}" onfocus="${onFocusClick}" onclick="if(this.showPicker) this.showPicker();" onblur="${onBlurLogic}"`;

    let html = `<input type="text" size="1" list="${idDatalist}" ${idThocTinh} ${thuocTinhKhoa} value="${giaTriMacDinh || ''}" placeholder="--" class="w-full h-full min-w-0 bg-transparent outline-none text-center ${cssKhoa} py-1 font-bold ${kieuText} ${cssAn}" style="font-family:'Times New Roman',Times,serif;" autocomplete="off" ${suKienMoi}>`; 
    
    return html;
}

window.xacThucGiaTriHopLe = function(inputEl, loaiDanhSach) {
    if (!inputEl) return;
    let giaTri = inputEl.value.trim();

    if (giaTri === '' || giaTri === '--') {
        inputEl.value = '';
        return;
    }

    let danhSachChuan = (loaiDanhSach === 'mon') ? (thongSoHocVu.DANH_SACH_MON_HOC || []) : (thongSoHocVu.DANH_SACH_GIAO_VIEN || []);

    if (danhSachChuan.includes(giaTri)) {
        inputEl.value = giaTri;
        return;
    }

    let giaTriChuanHoa = giaTri.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    let giaTriDung = null;

    for (let i = 0; i < danhSachChuan.length; i++) {
        let itemChuanHoa = danhSachChuan[i].normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
        if (giaTriChuanHoa === itemChuanHoa) {
            giaTriDung = danhSachChuan[i];
            break;
        }
    }

    if (giaTriDung) {
        inputEl.value = giaTriDung;
    } else {
        inputEl.value = '';
        if (inputEl.parentElement && inputEl.parentElement.tagName === 'TD') {
            let theTd = inputEl.parentElement;
            theTd.classList.add('bg-red-300', 'transition-colors', 'duration-300');
            setTimeout(() => {
                theTd.classList.remove('bg-red-300');
            }, 800);
        }
    }
};

// =========================================================================
// KHỐI 2: ĐỐI CHIẾU ĐỊNH MỨC VÀ KIỂM TRA
// =========================================================================
function kiemTraDinhMuc() {
    let mangLop = [];
    const mangLopGoc = thongSoHocVu.DANH_SACH_LOP || [];
    
    mangLopGoc.forEach(lop => {
        if (document.querySelector(`[id$="_${lop}"]`)) {
            mangLop.push(lop);
        }
    });

    if (mangLop.length === 0) {
        const cacSelect = document.querySelectorAll('input[id^="mon_"]');
        let setLop = new Set();
        cacSelect.forEach(sl => {
            let parts = sl.id.split('_');
            if (parts.length > 1) setLop.add(parts[parts.length - 1]);
        });
        mangLop = Array.from(setLop).sort();
    }

    const khungCT = thongSoHocVu.KHUNG_CHUONG_TRINH || {};
    let thongKeUI = {}; mangLop.forEach(lop => { thongKeUI[lop] = {}; });
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]; const buoiMacDinh = ["Sáng", "Chiều"];
    
    thuMacDinh.forEach(thu => {
        buoiMacDinh.forEach(buoi => {
            let soTietToiThieu = (buoi === "Sáng") ? 5 : 4;
            let soTiet = Math.max(parseInt(thongSoHocVu[(buoi==="Sáng")?"SO_TIET_SANG":"SO_TIET_CHIEU"]) || 4, soTietToiThieu);
            for(let t=1; t<=soTiet; t++) {
                mangLop.forEach(lop => {
                    let theSelectMon = document.getElementById(`mon_${thu}_${buoi}_${t}_${lop}`);
                    if(theSelectMon && theSelectMon.value) {
                        let tenMon = theSelectMon.value;
                        if(!thongKeUI[lop][tenMon]) thongKeUI[lop][tenMon] = 0; thongKeUI[lop][tenMon]++;
                    }
                });
            }
        });
    });

    let htmlKetQua = `<div class="overflow-x-auto"><table class="w-full text-sm text-center border-collapse border border-gray-400" style="font-family:'Times New Roman',Times,serif;"><thead class="bg-purple-100 text-purple-900 font-bold"><tr><th class="border border-gray-400 p-2 min-w-[60px]">Lớp</th><th class="border border-gray-400 p-2 min-w-[140px]">Môn học</th><th class="border border-gray-400 p-2 min-w-[100px]">Khung chuẩn</th><th class="border border-gray-400 p-2 min-w-[100px]">Đang xếp (UI)</th><th class="border border-gray-400 p-2 min-w-[140px]">Trạng thái</th><th class="border border-gray-400 p-2 min-w-[120px] bg-green-100 text-green-900">Tổng Tiết / Lớp</th></tr></thead><tbody>`;
    
    let tongTatCaTietChuan = 0;
    let tongTatCaTietUI = 0;

    mangLop.forEach(lop => {
        let dmKhoi = khungCT[lop] || {};
        let dsMonArr = Array.from(new Set([...Object.keys(dmKhoi), ...Object.keys(thongKeUI[lop])]));
        
        let tongChuanLopNay = 0;
        let tongUiLopNay = 0; 
        
        dsMonArr.forEach(mon => { 
            tongChuanLopNay += (parseInt(dmKhoi[mon]) || 0);
            tongUiLopNay += (thongKeUI[lop][mon] || 0); 
        });

        tongTatCaTietChuan += tongChuanLopNay;
        tongTatCaTietUI += tongUiLopNay;

        dsMonArr.forEach((mon, index) => {
            let chuan = parseInt(dmKhoi[mon]) || 0; 
            let ui = thongKeUI[lop][mon] || 0; 
            
            let trangThai = `<span class="text-green-700 font-bold">✔ Khớp</span>`; let cssRow = "";
            if (ui < chuan) { trangThai = `<span class="text-red-600 font-bold">⚠ Thiếu ${chuan - ui} tiết</span>`; cssRow = "bg-red-50/50"; } 
            else if (ui > chuan) { trangThai = `<span class="text-orange-600 font-bold">⚠ Thừa ${ui - chuan} tiết</span>`; cssRow = "bg-orange-50/50"; }
            
            htmlKetQua += `<tr class="${cssRow} hover:bg-gray-50 border-b border-gray-300">`;
            if (index === 0) htmlKetQua += `<td rowspan="${dsMonArr.length}" class="border-r border-gray-400 p-2 font-extrabold bg-gray-50 align-middle">${lop}</td>`;
            
            htmlKetQua += `<td class="border-r border-gray-300 p-2 font-semibold text-blue-900 text-left pl-4">${mon}</td>
                           <td class="border-r border-gray-300 p-2 font-bold text-gray-700">${chuan}</td>
                           <td class="border-r border-gray-300 p-2 font-extrabold text-blue-700 text-lg">${ui}</td>
                           <td class="border-r border-gray-300 p-2">${trangThai}</td>`;
            
            if (index === 0) htmlKetQua += `<td rowspan="${dsMonArr.length}" class="p-2 font-extrabold text-green-900 bg-green-50 align-middle leading-tight whitespace-nowrap">
                <div class="text-xs text-gray-600 font-semibold mb-1.5">Chuẩn: <span class="text-blue-700 text-lg font-bold ml-1">${tongChuanLopNay}</span></div>
                <div class="text-xs text-gray-600 font-semibold">Đã xếp: <span class="text-red-600 text-lg font-bold ml-1">${tongUiLopNay}</span></div>
            </td>`;
            htmlKetQua += `</tr>`;
        });
    });
    
    htmlKetQua += `<tr class="bg-gray-200 text-gray-900 font-extrabold border-t-2 border-gray-500">
        <td colspan="5" class="border-r border-gray-400 p-3 text-right uppercase">Tổng số tiết toàn trường trong tuần:</td>
        <td class="p-3 leading-tight whitespace-nowrap text-left pl-4">
            <div class="text-sm text-gray-700 mb-1">Chuẩn: <span class="text-2xl text-blue-700 ml-2">${tongTatCaTietChuan}</span></div>
            <div class="text-sm text-gray-700">Đã xếp: <span class="text-2xl text-red-600 ml-2">${tongTatCaTietUI}</span></div>
        </td>
    </tr></tbody></table></div>`;
    
    document.getElementById('noiDungKiemTra').innerHTML = htmlKetQua; 
    document.getElementById('modalKiemTra').classList.remove('hidden');
}

function dongModal() { 
    document.getElementById('modalKiemTra').classList.add('hidden'); 
}

// =========================================================================
// KHỐI 3: VẼ LƯỚI MA TRẬN VÀ LỌC CÁ NHÂN
// =========================================================================
function tinhNgayDocLap(ngayDauTuanStr, tenThu) {
    if (!ngayDauTuanStr) return { hienThi: "--/--/----", thang: "--", nam: "--", ngayDayDu: "" };
    
    let parts = ngayDauTuanStr.split('-');
    if (parts.length !== 3) return { hienThi: "--/--/----", thang: "--", nam: "--", ngayDayDu: "" };
    
    let ngayGoc = new Date(parts[0], parts[1] - 1, parts[2]);
    const doLechThu = {"Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ nhật": 6};
    let soNgayLech = doLechThu[tenThu] || 0;
    
    let ngayDich = new Date(ngayGoc.getTime());
    ngayDich.setDate(ngayGoc.getDate() + soNgayLech);
    
    let d = ngayDich.getDate().toString().padStart(2, '0');
    let m = (ngayDich.getMonth() + 1).toString().padStart(2, '0');
    let y = ngayDich.getFullYear();
    
    return { hienThi: `${d}/${m}/${y}`, thang: m, nam: y.toString(), ngayDayDu: `${d}/${m}/${y}` };
}

// =========================================================================
// KHỐI 3: ENGINE VẼ LƯỚI MA TRẬN
// =========================================================================
function xuatMaTranBang(danhSachTiet) {
    const thead = document.getElementById('tieuDeBang'); 
    const tbody = document.getElementById('vungHienThiDuLieu');
    if(thead) thead.className = ''; 

    const tableEl = document.querySelector('.bang-excel');
    if (tableEl) {
        tableEl.style.borderCollapse = 'separate';
        tableEl.style.borderSpacing = '0';
    }

    if (!document.getElementById('datalistChung_Mon')) {
        let dlMon = document.createElement('datalist'); dlMon.id = 'datalistChung_Mon';
        (thongSoHocVu.DANH_SACH_MON_HOC || []).forEach(m => { dlMon.innerHTML += `<option value="${m}">`; });
        document.body.appendChild(dlMon);
    }
    if (!document.getElementById('datalistChung_GV')) {
        let dlGv = document.createElement('datalist'); dlGv.id = 'datalistChung_GV';
        (thongSoHocVu.DANH_SACH_GIAO_VIEN || []).forEach(g => { dlGv.innerHTML += `<option value="${g}">`; });
        document.body.appendChild(dlGv);
    }

    const duLieuTiet = danhSachTiet || [];
    const mangLopGoc = (thongSoHocVu.DANH_SACH_LOP && thongSoHocVu.DANH_SACH_LOP.length > 0) ? thongSoHocVu.DANH_SACH_LOP : [...new Set(duLieuTiet.map(t => t.maLop))].sort();
    
    const dsLopDuocQuyen = (quyenChiTiet && quyenChiTiet.lop) ? quyenChiTiet.lop : [];
    const tapLopDuocQuyen = new Set(dsLopDuocQuyen);
    
    let mangLopHienThi = mangLopGoc;
    if (!quyenSuaChua && tapLopDuocQuyen.size > 0) {
        mangLopHienThi = mangLopGoc.filter(lop => tapLopDuocQuyen.has(lop));
    }

    const mapQuyenSuaLop = new Map();
    mangLopHienThi.forEach(lop => {
        let duocSua = quyenSuaChua || tapLopDuocQuyen.has(lop);
        mapQuyenSuaLop.set(lop, duocSua);
    });

    if (mangLopHienThi.length === 0) {
        thead.innerHTML = '<tr><th class="text-center text-slate-500 py-3 font-bold" style="font-family:\'Times New Roman\',Times,serif;">Chưa có dữ liệu Lớp học</th></tr>';
        tbody.innerHTML = `<tr><td class="text-center py-10" style="font-family:\'Times New Roman\',Times,serif;">
            <p class="text-red-500 font-bold text-lg mb-2">Tài khoản chưa được cấp quyền quản lý lớp nào.</p>
        </td></tr>`;
        return;
    }

    let dateInput = document.getElementById('chonNgayDauTuan');
    if (duLieuTiet && duLieuTiet.length > 0) {
        let thu2Data = duLieuTiet.find(t => t.thu === "Thứ 2" && t.ngay);
        if (thu2Data && thu2Data.ngay) {
            let p = thu2Data.ngay.split('/'); 
            if (p.length === 3) {
                ngayDauTuanUI = `${p[2]}-${p[1]}-${p[0]}`; 
                if (dateInput) dateInput.value = ngayDauTuanUI;
            }
        }
    }

    let theadHTML = `<tr style="height: 45px;">
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-l border-r border-slate-400" style="position: sticky; top: 0; left: 0; z-index: 60; background-color: #f1f5f9; width: 85px; min-width: 85px; font-family:'Times New Roman',Times,serif;">Thứ / Ngày</th>
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-r border-slate-400" style="position: sticky; top: 0; left: 85px; z-index: 60; background-color: #f1f5f9; width: 60px; min-width: 60px; font-family:'Times New Roman',Times,serif;">Buổi</th>
        <th rowspan="2" class="hidden">Tuần</th><th rowspan="2" class="hidden">Tháng</th><th rowspan="2" class="hidden">Năm học</th>
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-r border-slate-400" style="position: sticky; top: 0; left: 145px; z-index: 60; background-color: #f1f5f9; width: 50px; min-width: 50px; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15); font-family:'Times New Roman',Times,serif;">Tiết</th>`;
    
    mangLopHienThi.forEach(lop => { 
        theadHTML += `<th colspan="2" data-cotlop="${lop}" class="text-center font-extrabold text-slate-900 tracking-widest border-t border-b border-r border-slate-400" style="position: sticky; top: 0; z-index: 50; background-color: #f1f5f9; font-family:'Times New Roman',Times,serif;">${lop}</th>`; 
    });
    theadHTML += `</tr><tr style="height: 40px;">`;
    mangLopHienThi.forEach(lop => { 
        theadHTML += `<th data-cotlop="${lop}" class="text-center font-bold text-slate-800 border-b border-r border-slate-400" style="position: sticky; top: 45px; z-index: 50; background-color: #f8fafc; min-width: 130px; font-family:'Times New Roman',Times,serif;">Môn</th>
                      <th data-cotlop="${lop}" class="text-center font-bold text-slate-800 border-b border-r border-slate-400" style="position: sticky; top: 45px; z-index: 50; background-color: #f8fafc; min-width: 110px; font-family:'Times New Roman',Times,serif;">N dạy</th>`; 
    });
    theadHTML += `</tr>`; 
    thead.innerHTML = theadHTML;

    const mapDuLieu = new Map();
    const demTietGV = {}; 

    duLieuTiet.forEach(t => {
        const thu = t.thu.trim(); const buoi = t.buoi.trim();
        const key = `${thu}_${buoi}_${t.tiet}_${t.maLop}`;
        mapDuLieu.set(key, t);
        
        if (t.maGv && mangLopHienThi.includes(t.maLop)) {
            const gvKey = `${t.maLop}_${t.maGv}`;
            demTietGV[gvKey] = (demTietGV[gvKey] || 0) + 1;
        }
    });

    const bangMauGV = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-pink-200', 'bg-teal-200', 'bg-orange-200', 'bg-cyan-200', 'bg-lime-200', 'bg-fuchsia-200', 'bg-rose-200'];
    let mauGiaoVien = {}; 
    if (thongSoHocVu.DANH_SACH_GIAO_VIEN) { thongSoHocVu.DANH_SACH_GIAO_VIEN.forEach((gv, idx) => { mauGiaoVien[gv] = bangMauGV[idx % bangMauGV.length]; }); }
    
    let gvcnLop = {};
    mangLopHienThi.forEach(lop => {
        let maxTiet = 0, gvcn = ""; 
        (thongSoHocVu.DANH_SACH_GIAO_VIEN || []).forEach(gv => {
            let soTiet = demTietGV[`${lop}_${gv}`] || 0;
            if (soTiet > maxTiet) { maxTiet = soTiet; gvcn = gv; }
        });
        gvcnLop[lop] = gvcn;
    });

    const thongTinNgayCache = {};
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    thuMacDinh.forEach(thu => { thongTinNgayCache[thu] = tinhNgayDocLap(ngayDauTuanUI, thu); });

    const gioiHanSang = Math.max(parseInt(thongSoHocVu.SO_TIET_SANG) || 4, 5); 
    const gioiHanChieu = Math.max(parseInt(thongSoHocVu.SO_TIET_CHIEU) || 3, 4);
    const cauTrucTkb = [{ buoi: "Sáng", soTiet: gioiHanSang }, { buoi: "Chiều", soTiet: gioiHanChieu }];

    let bufferHTML = []; 

    thuMacDinh.forEach(thu => {
        let thongTinNgay = thongTinNgayCache[thu];
        let soDongCuaThu = gioiHanSang + gioiHanChieu;
        let inCotThu = true;

        cauTrucTkb.forEach(cTruc => {
            let buoi = cTruc.buoi;
            let soDongCuaBuoi = cTruc.soTiet;
            let inCotBuoi = true;

            for (let tiet = 1; tiet <= soDongCuaBuoi; tiet++) {
                bufferHTML.push(`<tr class="bg-white hover:bg-slate-50 transition-colors duration-150 group" style="font-family:'Times New Roman',Times,serif;">`);
                
                if (inCotThu) { 
                    bufferHTML.push(`<td rowspan="${soDongCuaThu}" class="text-center align-middle border-b border-l border-r border-slate-300" style="position: sticky; left: 0; z-index: 40; background-color: #ffffff;">
                                    <div class="font-extrabold text-slate-900">${thu}</div>
                                    <div class="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-1 inline-block">${thongTinNgay.hienThi}</div>
                                  </td>`); 
                    inCotThu = false; 
                }
                
                if (inCotBuoi) { 
                    bufferHTML.push(`<td rowspan="${soDongCuaBuoi}" class="text-center font-bold align-middle text-slate-800 border-b border-r border-slate-300" style="position: sticky; left: 85px; z-index: 40; background-color: #ffffff;">${buoi}</td>`); 
                    inCotBuoi = false; 
                }

                let duLieuDong = null;
                for (let l = 0; l < mangLopHienThi.length; l++) {
                    const checkKey = `${thu}_${buoi}_${tiet}_${mangLopHienThi[l]}`;
                    if (mapDuLieu.has(checkKey)) { duLieuDong = mapDuLieu.get(checkKey); break; }
                }

                let valTuan = duLieuDong ? duLieuDong.tuan : tuanDangXem;
                let valThang = (duLieuDong && duLieuDong.thang) ? duLieuDong.thang : thongTinNgay.thang;
                let valNam = (duLieuDong && duLieuDong.namHoc) ? duLieuDong.namHoc : (thongSoHocVu.NAM_HOC || thongTinNgay.nam);

                bufferHTML.push(`<td id="uiTuan_${thu}_${buoi}_${tiet}" class="hidden text-center font-bold text-red-600 align-middle">${valTuan}</td>`);
                bufferHTML.push(`<td id="uiThang_${thu}_${buoi}_${tiet}" data-ngay="${thongTinNgay.ngayDayDu}" class="hidden text-center font-bold text-red-600 align-middle">${valThang}</td>`);
                bufferHTML.push(`<td id="uiNam_${thu}_${buoi}_${tiet}" class="hidden text-center font-bold text-red-600 align-middle">${valNam}</td>`);
                
                bufferHTML.push(`<td id="oTiet_${thu}_${buoi}_${tiet}" class="text-center font-bold text-slate-800 align-middle border-b border-r border-slate-300" style="position: sticky; left: 145px; z-index: 40; background-color: #ffffff; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15);">
                                <div class="text-base leading-none mt-1">${tiet}</div>
                                <div class="vung-canh-bao-gv mt-0.5"></div>
                              </td>`);

                mangLopHienThi.forEach(lop => {
                    const cellKey = `${thu}_${buoi}_${tiet}_${lop}`;
                    const duLieuO = mapDuLieu.get(cellKey); 
                    const duocSuaLopNay = mapQuyenSuaLop.get(lop); 
                    
                    let monGoc = duLieuO ? duLieuO.monHoc : ""; let gvGoc = duLieuO ? duLieuO.maGv : "";

                    let bgLop = 'bg-white'; let textClass = 'text-slate-900';
                    if (monGoc.includes('CẤN LỊCH')) { bgLop = 'bg-yellow-400'; textClass = 'text-red-700 font-extrabold'; } 
                    else if (gvGoc && gvGoc !== gvcnLop[lop]) { bgLop = mauGiaoVien[gvGoc] || 'bg-gray-200'; textClass = 'text-slate-900 font-semibold'; }

                    let idMon = `mon_${thu}_${buoi}_${tiet}_${lop}`; let idGv = `gv_${thu}_${buoi}_${tiet}_${lop}`;
                    
                    let dropdownMon = taoTuyChonDong(thongSoHocVu.DANH_SACH_MON_HOC, monGoc, textClass, idMon, true, 'mon', duocSuaLopNay);
                    let dropdownGV = taoTuyChonDong(thongSoHocVu.DANH_SACH_GIAO_VIEN, gvGoc, textClass, idGv, true, 'gv', duocSuaLopNay);

                    bufferHTML.push(`<td data-cotlop="${lop}" class="text-center p-0 align-middle ${bgLop} border-b border-r border-slate-300 transition-all duration-300">${dropdownMon}</td>`);
                    bufferHTML.push(`<td data-cotlop="${lop}" class="text-center p-0 align-middle ${bgLop} border-b border-r border-slate-300 transition-all duration-300">${dropdownGV}</td>`);
                });
                bufferHTML.push(`</tr>`);
            }
        });
    });
    
    tbody.innerHTML = bufferHTML.join('');
    
    if (typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang();
    
    if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
}

// =========================================================================
// KHỐI 4: TRÌNH LƯU TRỮ VÀ XỬ LÝ DỮ LIỆU ĐA TẦNG
// =========================================================================
async function luuDuLieu(event, loaiLuu) {
    let coQuyenThaoTac = quyenSuaChua || (quyenChiTiet && (quyenChiTiet.lop.length > 0 || quyenChiTiet.nut.length > 0));
    if (!coQuyenThaoTac) return;
    
    if (loaiLuu === 'codinh') { if (!confirm("CẢNH BÁO: Thao tác này sẽ ghi đè toàn bộ TKB hiện tại làm TKB Gốc Cố Định cho toàn trường. Bấm OK để tiếp tục.")) return; }
    
    if (loaiLuu === 'khoiphuc') { if (!confirm(`Xác nhận: Lưu trữ toàn bộ TKB Tuần ${tuanDangXem}, tự động chuyển sang tuần tiếp theo?`)) return; }

    const btn = event.currentTarget; 
    const textGoc = btn.innerHTML;
    if(btn.disabled === undefined) { } else {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xử lý...`; 
        btn.disabled = true;
    }

    try {
        let dsTietLuoi = []; 
        let namHocChuan = thongSoHocVu.NAM_HOC || "";
        
        let cacOMon = document.querySelectorAll('input[id^="mon_"]');
        let setLopDangHienThi = new Set();
        
        cacOMon.forEach(oMon => {
            let valMon = oMon.value.trim();
            if (valMon !== "") {
                let parts = oMon.id.split('_'); 
                let thu = parts[1];
                let buoi = parts[2];
                let tiet = parts[3];
                let lop = parts.slice(4).join('_'); 
                
                setLopDangHienThi.add(lop); 
                
                let oGv = document.getElementById(`gv_${thu}_${buoi}_${tiet}_${lop}`);
                let valGv = oGv ? oGv.value.trim() : "";
                
                let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu);
                let tienToBuoi = (buoi === "Sáng") ? "S" : "C";
                
                dsTietLuoi.push({ 
                    maTiet: `${tuanDangXem}_${thu}_${tienToBuoi}_${tiet}_${lop}`, 
                    namHoc: namHocChuan || thongTinNgay.nam, 
                    thang: thongTinNgay.thang, 
                    ngay: thongTinNgay.ngayDayDu, 
                    tuan: tuanDangXem, 
                    thu: thu, 
                    buoi: buoi, 
                    tiet: tiet, 
                    maLop: lop, 
                    monHoc: valMon, 
                    maGv: valGv 
                });
            }
        });

        let mangLopDangHienThi = Array.from(setLopDangHienThi);
        if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
            duLieuTkbHienTai.forEach(tietGoc => {
                if (!mangLopDangHienThi.includes(tietGoc.maLop)) {
                    dsTietLuoi.push(tietGoc);
                }
            });
        }

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { 
            method: 'POST', 
            body: JSON.stringify({ thaoTac: 'luuDuLieu', loaiLuu: loaiLuu, tuan: tuanDangXem, duLieu: dsTietLuoi }) 
        });
        const ketQua = await phanHoi.json();
        
        if(ketQua.trangThai !== 'thanh_cong') { 
            console.error("Sự cố máy chủ."); 
            alert("Lưu thất bại: " + ketQua.thongBao);
        } else { 
            if (loaiLuu === 'khoiphuc') {
                await chuyenTuan(1); 
                console.log("Kích hoạt Lưu Tuần tự động để neo lại mốc thời gian...");
                let btnAn = document.createElement('button');
                btnAn.innerHTML = "Auto Save";
                await luuDuLieu({ currentTarget: btnAn }, 'tuan');
            } else {
                alert("Đã lưu dữ liệu thời khóa biểu thành công!");
                
                // 1. Lưu dự phòng ngay vào RAM để bảo vệ thành quả nếu lỡ rớt mạng ở bước sau
                duLieuTkbHienTai = dsTietLuoi;
                const MA_DA = (typeof CAU_HINH_FRONTEND !== 'undefined' && CAU_HINH_FRONTEND.MA_DU_AN) ? CAU_HINH_FRONTEND.MA_DU_AN : 'MAC_DINH';
                localStorage.setItem('SmartTKB_DuLieuTuan_' + MA_DA, JSON.stringify(dsTietLuoi));

                // 2. Dọn dẹp cache Sổ Đầu Bài
                if (typeof window.lamSachBoNhoSoDauBai === 'function') {
                    window.lamSachBoNhoSoDauBai();
                }

                // 3. [ĐÁP ỨNG YÊU CẦU]: Kích hoạt hiệu ứng tải ở ô tuần và kéo bản ghi chuẩn xác từ Server về.
                // Tham số thứ 3 (epDongBo = true) cho phép vòng quay hoạt động và ép hệ thống vượt qua Khóa bảo vệ.
                await taiDuLieuTKB(true, 'TKB_HIEN_TAI', true);

                // 4. Đặt Khóa chống trễ 15s sau khi đồng bộ xong để chặn F5 làm hỏng dữ liệu
                localStorage.setItem('KhoaDongBo_TKB', Date.now().toString());
            }
        }
    } catch (loi) { 
        console.error("Lỗi kết nối.", loi); 
        alert("Có sự cố trong quá trình kết nối đến máy chủ.");
    } finally { 
        if(btn.disabled !== undefined) { 
            btn.innerHTML = textGoc; 
            btn.disabled = false; 
        }
    }
}
// =========================================================================
// KHỐI 5: ĐỘNG CƠ ĐIỀU HƯỚNG SIÊU TỐC
// =========================================================================
window.kichHoatTab = function(idMenu, idKhung, hienThanhCongCuTKB) {
    try {
        document.querySelectorAll('nav a').forEach(m => {
            m.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 cursor-pointer group";
            let span = m.querySelector('span');
            if (span) span.className = "font-bold text-white/80 group-hover:text-white text-[14px]";
            let svg = m.querySelector('svg');
            if (svg) svg.className = "w-5 h-5 flex-none opacity-70 group-hover:opacity-100 text-white";
        });

        if (idMenu) {
            let mActive = document.getElementById(idMenu);
            if (mActive) {
                mActive.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 shadow-md backdrop-blur-sm cursor-pointer group";
                let spanActive = mActive.querySelector('span');
                if (spanActive) spanActive.className = "font-bold text-menu-active text-[14px]";
                let svgActive = mActive.querySelector('svg');
                if (svgActive) svgActive.className = "w-5 h-5 flex-none text-menu-active opacity-100";
            }
        }

        setTimeout(() => {
            let vungChinh = document.getElementById('vungHienThiChinh');
            if (vungChinh) {
                Array.from(vungChinh.children).forEach(el => {
                    if (el.tagName === 'DIV' && el.id !== 'khungNoiDungModal' && el.id !== idKhung) {
                        el.classList.add('hidden');
                        el.classList.remove('block', 'flex');
                    }
                });
            }
           let khungDich = document.getElementById(idKhung);
            if (khungDich) {
                khungDich.classList.remove('hidden');
                // Nắn lại: Chỉ khungTKB mới dùng block, tất cả các khung khác bắt buộc dùng flex để không hỏng thanh cuộn
                if (idKhung === 'khungTKB') {
                    khungDich.classList.add('block');
                } else {
                    khungDich.classList.add('flex');
                }
            }

            let thanhCongCu = document.getElementById('thanhCongCuTKB');
            if (thanhCongCu) {
                if (hienThanhCongCuTKB) {
                    thanhCongCu.classList.remove('hidden');
                    thanhCongCu.classList.add('flex');
                } else {
                    thanhCongCu.classList.remove('flex');
                    thanhCongCu.classList.add('hidden');
                }
            }

            try {
                if (idKhung === 'khungThongKe' && typeof taiCayDanhMucThongKe === 'function' && Object.keys(cayDanhMucThongKe).length === 0) taiCayDanhMucThongKe();
                if (idKhung === 'khungPhanCong' && typeof taiDuLieuPhanCongTuMayChu === 'function' && typeof danhSachGV !== 'undefined' && danhSachGV.length === 0) taiDuLieuPhanCongTuMayChu();
                if (idKhung === 'khungDanhMucGV' && typeof taiDuLieuDanhMucGV === 'function' && typeof duLieuDanhMucGV !== 'undefined' && duLieuDanhMucGV.length === 0) taiDuLieuDanhMucGV();
                if (idKhung === 'khungKhungChuongTrinh' && typeof taiDuLieuKhungChuongTrinhTuMayChu === 'function' && typeof duLieuBangKCT !== 'undefined' && duLieuBangKCT.length === 0) taiDuLieuKhungChuongTrinhTuMayChu();
                if (idKhung === 'khungCaiDat' && typeof taiDuLieuCaiDatHeThong === 'function' && typeof dsThamSo !== 'undefined' && dsThamSo.length === 0) taiDuLieuCaiDatHeThong();
                if (idKhung === 'khungDanhMucLop' && typeof taiDuLieuDanhMucLop === 'function' && typeof duLieuDanhMucLop !== 'undefined' && duLieuDanhMucLop.length === 0) taiDuLieuDanhMucLop();
                if (idKhung === 'khungDanhMucSGK' && typeof taiLaiDuLieuDanhMucSGK === 'function') taiLaiDuLieuDanhMucSGK();
                if (idKhung === 'khungSoDauBai' && typeof taiDuLieuSoDauBaiTuMayChu === 'function') taiDuLieuSoDauBaiTuMayChu();
                
                if (idKhung && (idKhung.toLowerCase().includes('phanphoi') || idKhung.toLowerCase().includes('ppct'))) {
                    if (typeof taiDuLieuPhanPhoiChuongTrinh === 'function') taiDuLieuPhanPhoiChuongTrinh();
                    if (typeof taiDuLieuPPCT === 'function') taiDuLieuPPCT();
                }
            } catch (loiData) {
                console.error("Lỗi động cơ tải dữ liệu:", loiData);
            }
        }, 50); 
        
    } catch (loiUI) {
        console.error("Sự cố chuyển giao diện UI:", loiUI);
    }
};

// =========================================================================
// KHỐI 6: XÁC THỰC DANH TÍNH 
// =========================================================================
let clientDangNhapG;
let dangXuLyDangNhap = false; 

function khoiDongDangNhap() {
    if (dangXuLyDangNhap) return;

    let nutDangNhap = document.getElementById('nutDangNhapG');
    let htmlGoc = nutDangNhap ? nutDangNhap.innerHTML : '';

    if (typeof google === 'undefined' || typeof SKT_GOOGLE_CLIENT_ID === 'undefined') {
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-semibold ml-2">Đang nạp thư viện...</span>`;
            nutDangNhap.classList.add('cursor-wait', 'opacity-80');
        }
        setTimeout(() => {
            if (nutDangNhap) {
                nutDangNhap.innerHTML = htmlGoc;
                nutDangNhap.classList.remove('cursor-wait', 'opacity-80');
            }
            khoiDongDangNhap();
        }, 1000);
        return;
    }

    dangXuLyDangNhap = true;
    if (nutDangNhap) {
         nutDangNhap.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-semibold ml-2">Đang kết nối...</span>`;
    }

    if (!clientDangNhapG) {
        clientDangNhapG = google.accounts.oauth2.initTokenClient({
            client_id: SKT_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            use_fedcm_for_prompt: true,
            callback: (phanHoiToken) => {
                dangXuLyDangNhap = false; 
                if (phanHoiToken && phanHoiToken.access_token) {
                    xuLyLayThongTin(phanHoiToken.access_token);
                } else if (nutDangNhap) {
                    nutDangNhap.innerHTML = htmlGoc; 
                }
            },
            error_callback: (loi) => {
                dangXuLyDangNhap = false;
                if (nutDangNhap) nutDangNhap.innerHTML = htmlGoc;
                console.error("Lỗi gián đoạn từ hệ thống Google:", loi);
            }
        });
    }
    clientDangNhapG.requestAccessToken();
}

async function xuLyLayThongTin(maTokenTruyCap) {
    let nutDangNhap = document.getElementById('nutDangNhapG');
    try {
        const phanHoi = await fetchVoiCoCheThuLai('https://www.googleapis.com/oauth2/v3/userinfo', { 
            headers: { Authorization: `Bearer ${maTokenTruyCap}` } 
        });
        const duLieuXacThuc = await phanHoi.json();
        
        const tuKhoaDinhDanh = 'em' + 'ail'; 
        const dinhDanhHeThong = duLieuXacThuc[tuKhoaDinhDanh]; 
        const tenHienThi = duLieuXacThuc.name; 
        const anhDaiDien = duLieuXacThuc.picture;
        window.emailGiaoVienToanCuc = dinhDanhHeThong;

        if (typeof window.lamSachBoNhoSoDauBai === 'function') {
            window.lamSachBoNhoSoDauBai();
        }
        
        // [NÂNG CẤP START]: Chuyển UI sang nút Đăng xuất, giữ ảnh đại diện làm icon
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<img src="${anhDaiDien}" class="w-6 h-6 rounded-full border border-white" title="Tài khoản: ${tenHienThi}"><span class="truncate text-sm font-semibold group-hover:text-red-300 transition-colors">Đăng xuất</span>`;
            
            // Đổi màu nền, viền và hiệu ứng hover sang tông màu đỏ/tối cảnh báo đăng xuất
            nutDangNhap.classList.replace('bg-slate-700', 'bg-slate-800'); 
            nutDangNhap.classList.replace('hover:bg-slate-600', 'hover:bg-red-700');
            nutDangNhap.classList.replace('border-slate-500', 'border-red-500'); 
            
            // Gắn sự kiện đăng xuất: Reset toàn bộ phiên làm việc bằng cách tải lại trang
            nutDangNhap.onclick = function() {
                if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
                    window.location.reload();
                }
            }; 
        }
        // [NÂNG CẤP END]

        const dsQuanTri = thongSoHocVu.DANH_SACH_QUAN_TRI || [];
        const dinhDanhGoc = 'tulieuhopthanh@gmail.com';

        if (dsQuanTri.includes(dinhDanhHeThong) || dinhDanhHeThong === dinhDanhGoc) { 
            quyenSuaChua = true; 
        } else { 
            quyenSuaChua = false; 
        }
        
        quyenChiTiet = { menu: [], nut: [], lop: [] }; 
        if (thongSoHocVu.MA_TRAN_PHAN_QUYEN && thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong]) {
            quyenChiTiet.menu = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].menu || [];
            quyenChiTiet.nut = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].nut || [];
            quyenChiTiet.lop = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].lop || [];
        }
        
        kiemSoatGiaoDien(); 

        if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
            xuatMaTranBang(duLieuTkbHienTai); 
        } else {
            await taiDuLieuTKB(); 
        }
    } catch (loi) { 
        console.error("Xác thực không thành công.", loi); 
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<span class="text-sm font-bold text-red-200">Lỗi kết nối</span>`;
        }
    }
}

// =========================================================================
// KHỐI TIỆN ÍCH: XUẤT NHẬP DỮ LIỆU EXCEL 
// =========================================================================
async function xuatExcel() {
    let mangLop = thongSoHocVu.DANH_SACH_LOP || [];
    if (mangLop.length === 0 && duLieuTkbHienTai.length > 0) {
        mangLop = [...new Set(duLieuTkbHienTai.map(t => t.maLop))].sort();
    }
    if (mangLop.length === 0) { alert("Không có dữ liệu để xuất."); return; }

    let btn = document.querySelector('button[onclick="xuatExcel()"]');
    let textGoc = btn ? btn.innerHTML : 'Xuất Excel';
    if (btn) btn.innerHTML = 'Đang xử lý...';

    try {
        if (typeof ExcelJS === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('TKB');
        const wsData = workbook.addWorksheet('DANH_MUC'); 
        
        let dsMon = thongSoHocVu.DANH_SACH_MON_HOC || [''];
        let dsGV = thongSoHocVu.DANH_SACH_GIAO_VIEN || [''];
        if(dsMon.length === 0) dsMon = [''];
        if(dsGV.length === 0) dsGV = [''];

        dsMon.forEach((mon, idx) => { wsData.getCell(`A${idx + 1}`).value = mon; });
        dsGV.forEach((gv, idx) => { wsData.getCell(`B${idx + 1}`).value = gv; });
        wsData.state = 'hidden';

        let header1 = ['Thứ / Ngày', 'Buổi', 'Tiết'];
        mangLop.forEach(lop => {
            header1.push(lop);
            header1.push(''); 
        });
        worksheet.addRow(header1);

        let header2 = ['', '', ''];
        mangLop.forEach(() => {
            header2.push('Môn');
            header2.push('N dạy');
        });
        worksheet.addRow(header2);

        worksheet.mergeCells('A1:A2');
        worksheet.mergeCells('B1:B2');
        worksheet.mergeCells('C1:C2');
        let cotHienTai = 4;
        mangLop.forEach(() => {
            worksheet.mergeCells(1, cotHienTai, 1, cotHienTai + 1);
            cotHienTai += 2;
        });

        let gvLoc = document.getElementById('locGiaoVien') ? document.getElementById('locGiaoVien').value.trim() : '';
        const luoiDuLieu = {}; 
        const boLocThu = {"Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8}; 
        const boLocBuoi = {"Sáng": 1, "Chiều": 2};

        duLieuTkbHienTai.forEach(t => {
            const thu = t.thu.trim(); const buoi = t.buoi.trim(); const tiet = t.tiet;
            if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; 
            if (!luoiDuLieu[thu][buoi]) luoiDuLieu[thu][buoi] = {}; 
            if (!luoiDuLieu[thu][buoi][tiet]) luoiDuLieu[thu][buoi][tiet] = {};
            luoiDuLieu[thu][buoi][tiet][t.maLop] = t;
        });

        const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        thuMacDinh.forEach(thu => { if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; });
        
        const gioiHanSang = Math.max(parseInt(thongSoHocVu.SO_TIET_SANG) || 4, 5); 
        const gioiHanChieu = Math.max(parseInt(thongSoHocVu.SO_TIET_CHIEU) || 3, 4);

        Object.keys(luoiDuLieu).forEach(thu => {
            if (!luoiDuLieu[thu]["Sáng"]) luoiDuLieu[thu]["Sáng"] = {}; 
            if (!luoiDuLieu[thu]["Chiều"]) luoiDuLieu[thu]["Chiều"] = {};
            for (let i = 1; i <= gioiHanSang; i++) { if (!luoiDuLieu[thu]["Sáng"][i]) luoiDuLieu[thu]["Sáng"][i] = {}; }
            for (let j = 1; j <= gioiHanChieu; j++) { if (!luoiDuLieu[thu]["Chiều"][j]) luoiDuLieu[thu]["Chiều"][j] = {}; }
        });

        const danhSachThu = Object.keys(luoiDuLieu).sort((a, b) => (boLocThu[a] || 99) - (boLocThu[b] || 99));
        let currentRow = 3;

        danhSachThu.forEach(thu => {
            const danhSachBuoi = Object.keys(luoiDuLieu[thu]).sort((a, b) => (boLocBuoi[a] || 99) - (boLocBuoi[b] || 99));
            let startRowThu = currentRow;
            let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu);

            danhSachBuoi.forEach(buoi => {
                const danhSachTietCuaBuoi = Object.keys(luoiDuLieu[thu][buoi]).sort((a, b) => parseInt(a) - parseInt(b));
                let startRowBuoi = currentRow;

                danhSachTietCuaBuoi.forEach(tiet => {
                    let rowData = [];
                    rowData.push(`${thu}\n(${thongTinNgay.hienThi})`);
                    rowData.push(buoi);
                    rowData.push(tiet);

                    mangLop.forEach(lop => {
                        let selectMon = document.getElementById(`mon_${thu}_${buoi}_${tiet}_${lop}`);
                        let selectGv = document.getElementById(`gv_${thu}_${buoi}_${tiet}_${lop}`);
                        
                        let valMon = selectMon ? selectMon.value.trim() : "";
                        let valGv = selectGv ? selectGv.value.trim() : "";
                        let isTarget = true;
                        
                        if (gvLoc !== "" && gvLoc !== "Toàn trường" && valGv !== gvLoc) {
                            isTarget = false;
                        }

                        if (!isTarget || valMon === "") {
                            rowData.push(""); rowData.push("");
                        } else {
                            rowData.push(valMon); rowData.push(valGv);
                        }
                    });
                    
                    worksheet.addRow(rowData);

                    let colIdx = 4;
                    mangLop.forEach(() => {
                        worksheet.getCell(currentRow, colIdx).dataValidation = {
                            type: 'list', allowBlank: true, showErrorMessage: false,
                            formulae: [`DANH_MUC!$A$1:$A$${dsMon.length}`]
                        };
                        worksheet.getCell(currentRow, colIdx + 1).dataValidation = {
                            type: 'list', allowBlank: true, showErrorMessage: false,
                            formulae: [`DANH_MUC!$B$1:$B$${dsGV.length}`]
                        };
                        colIdx += 2;
                    });
                    currentRow++;
                });
                
                if (currentRow - 1 > startRowBuoi) { worksheet.mergeCells(startRowBuoi, 2, currentRow - 1, 2); }
            });
            if (currentRow - 1 > startRowThu) { worksheet.mergeCells(startRowThu, 1, currentRow - 1, 1); }
        });

        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            row.eachCell({ includeEmpty: true }, function(cell) {
                cell.border = {
                    top: {style:'thin', color: {argb:'FF718096'}}, 
                    left: {style:'thin', color: {argb:'FF718096'}}, 
                    bottom: {style:'thin', color: {argb:'FF718096'}}, 
                    right: {style:'thin', color: {argb:'FF718096'}}
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.font = { name: 'Times New Roman', size: 12 };
                
                if (rowNumber <= 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: {argb:'FF0F172A'} };
                }
            });
        });

        worksheet.getColumn(1).width = 14;
        worksheet.getColumn(2).width = 10;
        worksheet.getColumn(3).width = 6;
        for(let i = 4; i < 4 + mangLop.length * 2; i++) { worksheet.getColumn(i).width = 15; }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        let tenTuan = "ThoiKhoaBieu";
        let spanTuan = document.getElementById('hienThiTuanHienTai');
        if (spanTuan && spanTuan.innerText) {
            tenTuan = `TKB_${spanTuan.innerText.trim().replace(/\s+/g, '_')}`;
        }
        
        link.download = `${tenTuan}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
        
    } catch (loi) {
        console.error("Lỗi xuất Excel:", loi);
        alert("Có lỗi xảy ra trong quá trình tạo file Excel. Hãy kiểm tra kết nối mạng.");
    } finally {
        if (btn) btn.innerHTML = textGoc;
    }
}

document.addEventListener('click', function(suKien) {
    let menuDuocBam = suKien.target.closest('nav a');
    if (menuDuocBam) {
        let vungChinh = document.getElementById('vungHienThiChinh');
        if (!vungChinh) return;

        setTimeout(() => {
            Array.from(vungChinh.children).forEach(khung => {
                if (khung.tagName === 'DIV' && !khung.classList.contains('hidden')) {
                    if (khung.id === 'khungSoDauBai' && menuDuocBam.id !== 'menuSoDauBai') {
                        khung.classList.add('hidden');
                        khung.classList.remove('flex', 'block');
                    }
                    if (khung.id === 'khungDanhMucSGK' && menuDuocBam.id !== 'menuDanhMucSGK') {
                        khung.classList.add('hidden');
                        khung.classList.remove('flex', 'block');
                    }
                    let laMenuPPCT = menuDuocBam.id.includes('PhanPhoi') || menuDuocBam.id.includes('PPCT');
                    let laKhungPPCT = khung.id.includes('PhanPhoi') || khung.id.includes('PPCT');
                    if (laKhungPPCT && !laMenuPPCT) {
                        khung.classList.add('hidden');
                        khung.classList.remove('flex', 'block');
                    }
                }
            });
        }, 20);
    }
});

// =========================================================================
// [NÂNG CẤP UI]: Thuật toán quét và cảnh báo giáo viên trùng lịch (Đa tầng)
// Quét trên cả lưới UI hiện tại và dữ liệu ngầm (ẩn do phân quyền)
// =========================================================================
window.kiemTraTrungGiaoVienToanBang = function() {
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const buoiMacDinh = ["Sáng", "Chiều"];
    
    const khung = thongSoHocVu.KHUNG_CHUONG_TRINH || {};
    let keyUuTien = "";
    for (let k in khung) {
        if (k.toLowerCase().replace(/\s+/g, '').indexOf("ưutiên") !== -1 || k.toLowerCase().replace(/\s+/g, '').indexOf("uutien") !== -1) {
            keyUuTien = k; break;
        }
    }
    const uuTienMon = keyUuTien ? khung[keyUuTien] : {};

    let setLopUI = new Set();
    document.querySelectorAll('th[data-cotlop]').forEach(th => setLopUI.add(th.getAttribute('data-cotlop')));
    
    thuMacDinh.forEach(thu => {
        buoiMacDinh.forEach(buoi => {
            for(let tiet = 1; tiet <= 5; tiet++) {
                let oTiet = document.getElementById(`oTiet_${thu}_${buoi}_${tiet}`);
                if (!oTiet) continue; 
                
                let demGv = {};
                let chiTietLop = {}; 

                if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                    duLieuTkbHienTai.forEach(tietGoc => {
                        if (tietGoc.thu === thu && tietGoc.buoi === buoi && parseInt(tietGoc.tiet) === tiet) {
                            if (!setLopUI.has(tietGoc.maLop)) { 
                                let tenGv = tietGoc.maGv ? tietGoc.maGv.trim() : "";
                                let monHoc = tietGoc.monHoc ? tietGoc.monHoc.trim() : "";
                                if (tenGv !== "" && tenGv !== "--") {
                                    let ut = parseInt(uuTienMon[monHoc]) || 99;
                                    if (ut !== 1 && ut !== 6) {
                                        demGv[tenGv] = (demGv[tenGv] || 0) + 1;
                                        if (!chiTietLop[tenGv]) chiTietLop[tenGv] = [];
                                        chiTietLop[tenGv].push(`${tietGoc.maLop}(ẩn)`);
                                    }
                                }
                            }
                        }
                    });
                }

                let cacOGiaoVien = document.querySelectorAll(`input[id^="gv_${thu}_${buoi}_${tiet}_"]`);
                cacOGiaoVien.forEach(oGv => {
                    let tenGv = oGv.value.trim();
                    if (tenGv !== "" && tenGv !== "--") {
                        let parts = oGv.id.split('_'); 
                        let lop = parts.slice(4).join('_'); 
                        let idMon = `mon_${thu}_${buoi}_${tiet}_${lop}`;
                        let theMon = document.getElementById(idMon);
                        
                        let monHoc = theMon ? theMon.value.trim() : "";
                        let ut = parseInt(uuTienMon[monHoc]) || 99;

                        if (ut !== 1 && ut !== 6) {
                            demGv[tenGv] = (demGv[tenGv] || 0) + 1;
                            if (!chiTietLop[tenGv]) chiTietLop[tenGv] = [];
                            chiTietLop[tenGv].push(lop);
                        }
                    }
                });
                
                let mangTrung = [];
                for (let gv in demGv) {
                    if (demGv[gv] > 1) mangTrung.push(`${gv} (${chiTietLop[gv].join(', ')})`);
                }
                
                let vungCanhBao = oTiet.querySelector('.vung-canh-bao-gv');
                if (vungCanhBao) {
                    if (mangTrung.length > 0) {
                        let hienThiNgan = Object.keys(demGv).filter(gv => demGv[gv] > 1);
                        vungCanhBao.innerHTML = `<div class="text-[10px] text-red-600 font-extrabold leading-tight max-w-[45px] mx-auto truncate cursor-help" title="Lỗi trùng lịch: ${mangTrung.join(' | ')}">${hienThiNgan.join('<br>')}</div>`;
                    } else {
                        vungCanhBao.innerHTML = '';
                    }
                }
            }
        });
    });
};

async function nhapExcelTKB(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (typeof XLSX === 'undefined') {
            alert("Thư viện hệ thống chưa sẵn sàng. Vui lòng đợi trong giây lát hoặc tải lại trang.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0]; 
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

                if (jsonData.length < 3) {
                    alert("Tệp Excel tải lên không đúng chuẩn biểu mẫu của hệ thống.");
                    return;
                }

                const headerLop = jsonData[0];
                const danhSachLopCol = [];
                
                for (let i = 3; i < headerLop.length; i += 2) {
                    if (headerLop[i] && headerLop[i].toString().trim() !== "") {
                        danhSachLopCol.push({ tenLop: headerLop[i].toString().trim(), colIndex: i });
                    }
                }

                let thuHienTai = "";
                let buoiHienTai = "";

                for (let r = 2; r < jsonData.length; r++) {
                    const row = jsonData[r];
                    if (!row || row.length === 0) continue;

                    if (row[0] && row[0].toString().trim() !== "") {
                        thuHienTai = row[0].toString().split('\n')[0].trim();
                    }
                    if (row[1] && row[1].toString().trim() !== "") {
                        buoiHienTai = row[1].toString().trim();
                    }
                    
                    let tiet = row[2] ? row[2].toString().trim() : "";
                    if (!thuHienTai || !buoiHienTai || !tiet) continue;

                    danhSachLopCol.forEach(lopInfo => {
                        let monVal = row[lopInfo.colIndex] ? row[lopInfo.colIndex].toString().trim() : "";
                        let gvVal = row[lopInfo.colIndex + 1] ? row[lopInfo.colIndex + 1].toString().trim() : "";

                        let theMon = document.getElementById(`mon_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);
                        let theGv = document.getElementById(`gv_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);

                        if (theMon) theMon.value = monVal;
                        if (theGv) theGv.value = gvVal;
                    });
                }
                
                if (typeof kiemTraTrungGiaoVienToanBang === 'function') {
                    kiemTraTrungGiaoVienToanBang();
                }
                
                alert("Đã kết xuất dữ liệu từ Excel lên giao diện thành công! Vui lòng kiểm tra đối chiếu và bấm [Lưu TKB Tuần] để lưu hệ thống.");
            } catch (errParse) {
                console.error("Lỗi phân tích cú pháp tệp Excel: ", errParse);
                alert("Sự cố xảy ra khi trích xuất dữ liệu biểu mẫu.");
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (loi) {
        console.error("Lỗi cục bộ: ", loi);
        alert("Sự cố tải tệp Excel.");
    } finally {
        event.target.value = "";
    }
}

// =========================================================================
// KHỐI THỐNG KÊ VÀ ĐỒNG BỘ 
// =========================================================================
window.hienThiThongKeSoTietGiaoVien = function() {
    let thongKeThucTe = {};
    const cacOGiaoVien = document.querySelectorAll('input[id^="gv_"]');
    
    cacOGiaoVien.forEach(oGv => {
        let tenGv = oGv.value.trim();
        if (tenGv !== "" && tenGv !== "--") {
            thongKeThucTe[tenGv] = (thongKeThucTe[tenGv] || 0) + 1;
        }
    });

    const danhSachGV = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];
    const dinhMucGV = thongSoHocVu.DINH_MUC_GIAO_VIEN || {}; 

    let htmlKetQua = '';
    let tongDinhMuc = 0;
    let tongThucTe = 0;

    danhSachGV.forEach(gv => {
        let thucTe = thongKeThucTe[gv] || 0;
        let dinhMuc = parseInt(dinhMucGV[gv]) || 0; 
        
        tongThucTe += thucTe;
        tongDinhMuc += dinhMuc;

        let trangThaiCSS = "text-slate-800 font-semibold";
        let badge = "";

        if (dinhMuc > 0) {
            if (thucTe > dinhMuc) {
                trangThaiCSS = "text-orange-600 font-extrabold bg-orange-50";
                badge = `<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-orange-200 text-orange-800">Vượt mức</span>`;
            } else if (thucTe < dinhMuc) {
                trangThaiCSS = "text-red-600 font-bold bg-red-50";
                badge = `<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-red-200 text-red-800">Chưa đủ</span>`;
            } else {
                trangThaiCSS = "text-green-700 font-extrabold bg-green-50";
                badge = `<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-green-200 text-green-800">Khớp chuẩn</span>`;
            }
        } else {
            trangThaiCSS = thucTe > 0 ? "text-blue-700 font-bold bg-blue-50" : "text-slate-700";
            dinhMuc = "--"; 
        }

        htmlKetQua += `
        <tr class="dong-gv hover:bg-slate-100 transition-colors border-b border-slate-300">
            <td class="ten-gv border-r border-slate-300 p-2 text-left font-bold text-slate-800 pl-4">${gv}</td>
            <td class="border-r border-slate-300 p-2 font-bold text-slate-600 text-lg">${dinhMuc}</td>
            <td class="p-2 text-lg ${trangThaiCSS}">${thucTe} ${badge}</td>
        </tr>`;
    });

    Object.keys(thongKeThucTe).forEach(gvNgoai => {
        if (!danhSachGV.includes(gvNgoai)) {
            htmlKetQua += `
            <tr class="dong-gv bg-red-50 hover:bg-red-100 border-b border-slate-300">
                <td class="ten-gv border-r border-slate-300 p-2 text-left font-bold text-red-700 pl-4">${gvNgoai} <span class="text-[10px] bg-red-200 text-red-800 px-1 rounded ml-1">Ngoài danh sách</span></td>
                <td class="border-r border-slate-300 p-2 font-bold text-slate-500">--</td>
                <td class="p-2 text-lg font-extrabold text-red-600">${thongKeThucTe[gvNgoai]}</td>
            </tr>`;
        }
    });

    htmlKetQua += `
    <tr class="dong-tong bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500 uppercase">
        <td class="border-r border-slate-400 p-3 text-right">TỔNG TOÀN TRƯỜNG:</td>
        <td class="border-r border-slate-400 p-3 text-lg text-slate-700">${tongDinhMuc > 0 ? tongDinhMuc : '--'}</td>
        <td class="p-3 text-xl text-indigo-700">${tongThucTe}</td>
    </tr>`;

    document.getElementById('noiDungThongKeGV').innerHTML = htmlKetQua;
    
    let boLoc = document.getElementById('locThongKeGV');
    if (boLoc) boLoc.value = '';

    const modal = document.getElementById('modalThongKeGV');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.locBangThongKeGV = function() {
    const inputLoc = document.getElementById('locThongKeGV');
    if (!inputLoc) return;
    
    const tuKhoa = inputLoc.value.toLowerCase().trim();
    const cacDongGV = document.querySelectorAll('#noiDungThongKeGV .dong-gv');
    
    cacDongGV.forEach(dong => {
        const theTen = dong.querySelector('.ten-gv');
        if (theTen) {
            const tenGiaoVien = theTen.textContent.toLowerCase();
            if (tuKhoa === '' || tuKhoa === 'toàn trường' || tenGiaoVien.includes(tuKhoa)) {
                dong.style.display = ''; 
            } else {
                dong.style.display = 'none'; 
            }
        }
    });
};

window.dongModalThongKeGV = function() {
    const modal = document.getElementById('modalThongKeGV');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.dongBoChuanHoaDuLieuUI = function() {
    const dsMonGoc = thongSoHocVu.DANH_SACH_MON_HOC || [];
    const dsGvGoc = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];

    if (dsMonGoc.length === 0 && dsGvGoc.length === 0) {
        alert("⚠️ Lỗi hệ thống: Chưa nạp được Danh mục Môn học và Giáo viên. Vui lòng tải lại trang (F5)!");
        return;
    }

    const chuanHoaChuoi = (chuoi) => {
        if (!chuoi) return '';
        return String(chuoi).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const tuDienMon = {};
    dsMonGoc.forEach(mon => { tuDienMon[chuanHoaChuoi(mon)] = String(mon).trim(); });

    const tuDienGV = {};
    dsGvGoc.forEach(gv => { tuDienGV[chuanHoaChuoi(gv)] = String(gv).trim(); });

    let demSuaLoi = 0;
    let danhSachLoiChiTiet = []; 

    const cacOMon = document.querySelectorAll('input[id^="mon_"]');
    const cacOGv = document.querySelectorAll('input[id^="gv_"]');

    cacOMon.forEach(oMon => {
        let giaTriUI = oMon.value;
        if (giaTriUI !== "" && giaTriUI !== "--") {
            let keyTruyVan = chuanHoaChuoi(giaTriUI);
            let giaTriChuan = tuDienMon[keyTruyVan];

            if (giaTriChuan) {
                if (giaTriUI !== giaTriChuan) {
                    oMon.value = giaTriChuan;
                    oMon.classList.add('bg-teal-100', 'text-teal-900', 'transition-colors');
                    demSuaLoi++;
                } else {
                    oMon.classList.remove('bg-teal-100', 'text-teal-900', 'bg-red-200', 'text-red-900');
                }
            } else {
                oMon.classList.add('bg-red-200', 'text-red-900', 'font-extrabold', 'transition-colors');
                let parts = oMon.id.split('_'); 
                let viTri = parts.length === 5 ? `Lớp ${parts[4]} (${parts[1]}, ${parts[2]}, Tiết ${parts[3]})` : 'Không rõ vị trí';
                danhSachLoiChiTiet.push(`- Môn "${giaTriUI}" tại ${viTri}`);
            }
        }
    });

    cacOGv.forEach(oGv => {
        let giaTriUI = oGv.value;
        if (giaTriUI !== "" && giaTriUI !== "--") {
            let keyTruyVan = chuanHoaChuoi(giaTriUI);
            let giaTriChuan = tuDienGV[keyTruyVan];

            if (giaTriChuan) {
                if (giaTriUI !== giaTriChuan) {
                    oGv.value = giaTriChuan;
                    oGv.classList.add('bg-teal-100', 'text-teal-900', 'transition-colors');
                    demSuaLoi++;
                } else {
                    oGv.classList.remove('bg-teal-100', 'text-teal-900', 'bg-red-200', 'text-red-900');
                }
            } else {
                oGv.classList.add('bg-red-200', 'text-red-900', 'font-extrabold', 'transition-colors');
                let parts = oGv.id.split('_'); 
                let viTri = parts.length === 5 ? `Lớp ${parts[4]} (${parts[1]}, ${parts[2]}, Tiết ${parts[3]})` : 'Không rõ vị trí';
                danhSachLoiChiTiet.push(`- GV "${giaTriUI}" tại ${viTri}`);
            }
        }
    });
    
    if (typeof kiemTraTrungGiaoVienToanBang === 'function') {
        kiemTraTrungGiaoVienToanBang();
    }

    if (demSuaLoi > 0 || danhSachLoiChiTiet.length > 0) {
        let thongBao = `Báo cáo Đồng bộ:\n- Đã nắn chỉnh: ${demSuaLoi} ô (Xanh).\n- Cảnh báo rác: ${danhSachLoiChiTiet.length} ô (Đỏ).\n`;
        
        if (danhSachLoiChiTiet.length > 0) {
            thongBao += `\n📍 CHI TIẾT VỊ TRÍ LỖI:\n` + danhSachLoiChiTiet.slice(0, 15).join('\n');
            if (danhSachLoiChiTiet.length > 15) thongBao += `\n... và ${danhSachLoiChiTiet.length - 15} lỗi khác.`;
        }
        alert(thongBao);
    } else {
        alert("Tuyệt vời! Toàn bộ dữ liệu trên lưới Thời khóa biểu đã khớp chuẩn 100% với danh mục máy chủ.");
    }
};

// =========================================================================
// KHỐI NÂNG CẤP: TỰ ĐỘNG CẬP NHẬT TÊN NÚT VÀ GIAO DIỆN MODAL
// =========================================================================
window.capNhatTenNutTuanTiepTheo = () => {
    const theHienThiTuan = document.getElementById('hienThiTuanHienTai');
    const nutKhoiPhuc = document.getElementById('btnKhoiPhuc');
    
    if (theHienThiTuan && nutKhoiPhuc) {
        let tuanHienTai = 1;
        if (theHienThiTuan.tagName === 'INPUT') {
            tuanHienTai = parseInt(theHienThiTuan.value, 10) || 1;
        } else {
            let textTuan = theHienThiTuan.innerText || '';
            let match = textTuan.match(/\d+/);
            if (match) tuanHienTai = parseInt(match[0], 10);
        }
        
        let tuanKeTiep = tuanHienTai + 1;
        nutKhoiPhuc.innerText = `Tuần tiếp theo ${tuanKeTiep}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.capNhatTenNutTuanTiepTheo, 1000); 
    
    const theHienThiTuan = document.getElementById('hienThiTuanHienTai');
    if (theHienThiTuan && theHienThiTuan.tagName === 'INPUT') {
        theHienThiTuan.addEventListener('input', window.capNhatTenNutTuanTiepTheo);

        // [NÂNG CẤP]: Khóa phím mũi tên Lên/Xuống ở ô nhập Tuần để tránh thay đổi nhầm
        theHienThiTuan.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
            }
        });

        // [NÂNG CẤP]: Khóa thao tác cuộn chuột làm thay đổi số tuần
        theHienThiTuan.addEventListener('wheel', function(e) {
            e.preventDefault();
        });
    }
});

window.toggleToanManHinhModal = function(idModal, nutBam) {
    const modal = document.getElementById(idModal);
    if (!modal) return;
    
    const khungNoiDung = modal.querySelector('div.bg-white');
    if (!khungNoiDung) return;

    const dangToanManHinh = khungNoiDung.classList.contains('w-full') && khungNoiDung.classList.contains('h-full');

    if (dangToanManHinh) {
        khungNoiDung.classList.remove('w-full', 'h-full', 'max-h-screen', 'rounded-none');
        khungNoiDung.classList.add('w-11/12', 'md:w-3/4', 'lg:w-1/2', 'max-h-[85vh]', 'rounded-xl');
        
        nutBam.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
        nutBam.title = "Phóng to toàn màn hình";
    } else {
        khungNoiDung.classList.remove('w-11/12', 'md:w-3/4', 'lg:w-1/2', 'max-h-[80vh]', 'max-h-[85vh]', 'rounded-xl');
        khungNoiDung.classList.add('w-full', 'h-full', 'max-h-screen', 'rounded-none');
        
        nutBam.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>`;
        nutBam.title = "Thu nhỏ về mặc định";
    }
};
// =========================================================================
// THUẬT TOÁN LỌC LỚP HỌC THÔNG MINH BẰNG KÝ TỰ ĐẠI DIỆN (*)
// Nguyên tắc: Chạy độc lập qua Regex, không làm hỏng cấu trúc bảng gốc
// =========================================================================
window.locTheoLop = function() {
    let theLocLop = document.getElementById('locLopHoc');
    if (!theLocLop) return;
    
    // Lấy giá trị, xóa khoảng trắng 2 đầu và in hoa tự động (vd: 1a1 -> 1A1)
    let chuoiLoc = theLocLop.value.trim().toUpperCase(); 
    let tatCaCacCot = document.querySelectorAll('[data-cotlop]');

    // Kịch bản 1: Nếu người dùng xóa trắng ô tìm kiếm -> Trả lại giao diện gốc
    if (chuoiLoc === "") {
        tatCaCacCot.forEach(cot => cot.classList.remove('hidden'));
        
        // Kích hoạt lại bộ lọc giáo viên (nếu có) để 2 bộ lọc không "đánh nhau"
        let locGV = document.getElementById('locGiaoVien');
        if (locGV && locGV.value.trim() !== "" && locGV.value.trim() !== "Toàn trường") {
            if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
        }
        return;
    }

    // Kịch bản 2: Động cơ chuyển đổi dấu (*) thành Biểu thức chính quy (Regex)
    // Ví dụ: "1*" -> /^1.*$/, "*A" -> /^.*A$/, "*A1*" -> /^.*A1.*$/
    
    // Bước A: Thoát các ký tự đặc biệt có thể gây lỗi hệ thống (trừ dấu *)
    let chuoiAnToan = chuoiLoc.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
    
    // Bước B: Ghép mảng lại bằng cụm '.*' và bọc đầu (^) cuối ($) chuỗi
    let regexHinhThai = new RegExp("^" + chuoiAnToan.join('.*') + "$");

    // Áp dụng bộ lọc Regex lên toàn bộ cột của ma trận
    tatCaCacCot.forEach(cot => {
        let tenLopCuaCot = cot.getAttribute('data-cotlop').toUpperCase();
        
        // Hàm .test() siêu tốc sẽ kiểm tra xem tên lớp (như 1A1) có khớp quy tắc không
        if (regexHinhThai.test(tenLopCuaCot)) {
            cot.classList.remove('hidden'); // Khớp -> Mở khóa hiển thị
        } else {
            cot.classList.add('hidden');    // Không khớp -> Đóng băng cột
        }
    });
};
