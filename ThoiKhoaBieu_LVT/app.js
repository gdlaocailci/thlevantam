// =========================================================================
// HÀM TIỆN ÍCH: XỬ LÝ NGÀY THỨ 2 TUẦN 1 TỪ SHEET CÀI ĐẶT
// =========================================================================
window.chuyenChuoiThanhDate = function(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (!s || s === '--' || s === '--/--/----') return null;

    if (s.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
        let p = s.split(/[-/]/);
        let d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
        return isNaN(d.getTime()) ? null : d;
    }

    if (s.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
        let p = s.split(/[-/]/);
        let d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

window.dinhDangDateThanhInputYMD = function(d) {
    if (!d || isNaN(d.getTime())) return '';
    let y = d.getFullYear();
    let m = (d.getMonth() + 1).toString().padStart(2, '0');
    let day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
};

window.chuyenVeThu2 = function(d) {
    if (!d || isNaN(d.getTime())) return null;
    let ketQua = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let dayOfWeek = ketQua.getDay();
    let khoangCachDenThu2 = (dayOfWeek === 0) ? -6 : (1 - dayOfWeek);
    ketQua.setDate(ketQua.getDate() + khoangCachDenThu2);
    ketQua.setHours(0, 0, 0, 0);
    return ketQua;
};

window.layMocNgayThu2Tuan1TuCauHinh = function() {
    let ts = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu && Object.keys(thongSoHocVu).length > 0) 
        ? thongSoHocVu 
        : (typeof window !== 'undefined' && window.thongSoHocVu ? window.thongSoHocVu : null);
    if (!ts) return null;

    // 1. Kiểm tra các khóa quy định trực tiếp mốc Tuần 1 trong sheet CAI_DAT
    const cacKhoaTuan1Chuan = [
        'NGAY_THU_2_TUAN_1', 'NGAY_TUAN_1', 'NGAY_TUAN1', 'NGAY_BAT_DAU', 'NGAY_BAT_DAU_TUAN_1', 
        'THU_2_TUAN_1', 'THU2_TUAN_1', 'NGAY_KHAI_GIANG', 'KHAI_GIANG', 'TUAN_1'
    ];

    for (let k of cacKhoaTuan1Chuan) {
        if (ts[k]) {
            let d = window.chuyenChuoiThanhDate(ts[k]);
            if (d) return window.chuyenVeThu2(d);
        }
    }

    // 2. Quét các khóa tùy chỉnh có chứa TUAN_1 / TUAN1 / BAT_DAU
    for (let k in ts) {
        let kUpper = k.toUpperCase();
        if ((kUpper.includes('TUAN_1') || kUpper.includes('TUAN1') || kUpper.includes('BAT_DAU')) && (kUpper.includes('NGAY') || kUpper.includes('DATE'))) {
            let d = window.chuyenChuoiThanhDate(ts[k]);
            if (d) return window.chuyenVeThu2(d);
        }
    }

    // 3. Nếu chỉ có NGAY_K2 (ô K2 của TKB_HIEN_TAI - là ngày của TUAN_HIEN_TAI chứ không phải Tuần 1),
    // phải lùi lại (TUAN_HIEN_TAI - 1) * 7 ngày để suy ra đúng ngày Thứ 2 của Tuần 1
    const cacKhoaTuanHienTai = ['NGAY_K2', 'NGAY_THU_2', 'NGAY_THU2'];
    for (let k of cacKhoaTuanHienTai) {
        if (ts[k]) {
            let d = window.chuyenChuoiThanhDate(ts[k]);
            if (d) {
                let dThu2 = window.chuyenVeThu2(d);
                let tuanGoc = parseInt(ts.TUAN_HIEN_TAI, 10) || 1;
                if (tuanGoc > 1) {
                    dThu2.setDate(dThu2.getDate() - (tuanGoc - 1) * 7);
                }
                return window.chuyenVeThu2(dThu2);
            }
        }
    }

    // 4. Quét bất kỳ khóa nào khác bắt đầu bằng NGAY_
    for (let k in ts) {
        let kUpper = k.toUpperCase();
        if (kUpper.startsWith('NGAY_') && !cacKhoaTuanHienTai.includes(kUpper)) {
            let d = window.chuyenChuoiThanhDate(ts[k]);
            if (d) return window.chuyenVeThu2(d);
        }
    }

    return null;
};

let thongSoHocVu = {};
let quyenSuaChua = false; 
let quyenChiTiet = { menu: [], nut: [], lop: [] }; 
let duLieuTkbHienTai = []; 
let tuanDangXem = 1; 
let ngayDauTuanUI = '';

// =========================================================================
// HÀM BỔ SUNG: BỘ CÁCH LY DỮ LIỆU ĐA TÊN MIỀN (MULTI-TENANT ISOLATION)
// =========================================================================
window.layKhoaCachLy = function(keyBase) {
    let prefix = 'MAC_DINH';
    if (typeof CAU_HINH_FRONTEND !== 'undefined') {
        if (CAU_HINH_FRONTEND.MA_DU_AN && CAU_HINH_FRONTEND.MA_DU_AN !== 'MAC_DINH') {
            prefix = CAU_HINH_FRONTEND.MA_DU_AN;
        } else if (CAU_HINH_FRONTEND.URL_API_MAY_CHU) {
            let match = CAU_HINH_FRONTEND.URL_API_MAY_CHU.match(/\/s\/([a-zA-Z0-9_-]+)/);
            if (match) prefix = match[1].substring(0, 15);
        }
    }
    return keyBase + '_' + prefix;
};

// =========================================================================
// HÀM BỔ SUNG: SINH DANH SÁCH THỨ ĐỘNG THEO NGÀY CỦA UI (CHỈ TỚI THỨ 7)
// =========================================================================
window.layDanhSachThuDong = function(ngayStr) {
    let mangThu = [];
    if (!ngayStr) return ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]; 
    
    let parts = ngayStr.split('-');
    if(parts.length !== 3) return ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    
    let d = new Date(parts[0], parts[1] - 1, parts[2]);
    const tenCacThu = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    
    for (let i = 0; i < 7; i++) {
        let ngayTinh = new Date(d.getTime());
        ngayTinh.setDate(d.getDate() + i);
        let thuIndex = ngayTinh.getDay();
        
        if (thuIndex === 0) continue; 
        
        mangThu.push(tenCacThu[thuIndex]);
        if (thuIndex === 6) break; 
    }
    
    if (mangThu.length === 0) return ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return mangThu;
};

document.addEventListener('DOMContentLoaded', () => { khoiTaoGiaoDien(); });

// =========================================================================
// KHỐI KẾT NỐI MẠNG CỐT LÕI (NÂNG CẤP CHỐNG TREO & CHỐNG CACHE AN TOÀN CORS)
// =========================================================================
async function fetchVoiCoCheThuLai(url, tuyChon = {}, soLanThu = 3, thoiGianCho = 60000) {
    for (let i = 0; i < soLanThu; i++) {
        const boDieuKhien = new AbortController();
        const idHenGio = setTimeout(() => boDieuKhien.abort(), thoiGianCho);
        
        let urlChongCache = url;
        if ((!tuyChon.method || tuyChon.method === 'GET') && !url.includes('_t=')) {
            urlChongCache += (url.includes('?') ? '&' : '?') + '_t=' + new Date().getTime();
        }

        const tuyChonMoi = { ...tuyChon, signal: boDieuKhien.signal };

        try {
            const phanHoi = await fetch(urlChongCache, tuyChonMoi);
            clearTimeout(idHenGio); 
            
            if (!phanHoi.ok) throw new Error(`Máy chủ từ chối kết nối (Mã lỗi HTTP: ${phanHoi.status})`);

            const noiDungText = await phanHoi.text();
            try { JSON.parse(noiDungText); } 
            catch (loiCuPhap) { throw new Error("Dữ liệu trả về bị nhiễu định dạng (Google Apps Script đang bận)."); }

            return new Response(noiDungText, {
                status: phanHoi.status,
                statusText: phanHoi.statusText,
                headers: phanHoi.headers
            });

        } catch (loi) {
            clearTimeout(idHenGio); 
            let thongBaoLoi = loi.name === 'AbortError' ? 'Máy chủ phản hồi quá lâu (Timeout)' : loi.message;
            if (i === soLanThu - 1) throw new Error(`Mất kết nối: ${thongBaoLoi}. Vui lòng kiểm tra lại đường truyền.`); 
            console.warn(`Tạm nghẽn (${thongBaoLoi}), hệ thống tự động kết nối lại lần ${i + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); 
        }
    }
}

// =========================================================================
// HÀM BỔ TRỢ: LẤY QUYỀN CÔNG KHAI TỪ THÔNG SỐ HỌC VỤ HOẶC MA TRẬN PHÂN QUYỀN
// =========================================================================
window.layQuyenCongKhaiHienTai = function() {
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.QUYEN_CONG_KHAI) {
        return thongSoHocVu.QUYEN_CONG_KHAI;
    }
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
        for (let k in thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
            let kLC = k.toLowerCase();
            if (kLC === '*' || kLC.includes('công khai') || kLC.includes('congkhai')) {
                return thongSoHocVu.MA_TRAN_PHAN_QUYEN[k];
            }
        }
    }
    return { menu: [], nut: [], lop: [] };
};

// =========================================================================
// KHỐI QUẢN LÝ GIAO DIỆN & PHÂN QUYỀN TRUNG TÂM (CHỐNG ĐỆ QUY TUYỆT ĐỐI)
// =========================================================================
let _dangKiemSoatGiaoDien = false;

function kiemSoatGiaoDien() {
    if (_dangKiemSoatGiaoDien) return;
    _dangKiemSoatGiaoDien = true;
    try {
        const quyenCongKhai = window.layQuyenCongKhaiHienTai();
        const menuCongKhai = quyenCongKhai.menu || [];
        const nutCongKhai = quyenCongKhai.nut || [];
        const lopCongKhai = quyenCongKhai.lop || [];

        const menuDuocCap = (quyenChiTiet && quyenChiTiet.menu) ? quyenChiTiet.menu : [];
        const nutDuocCap = (quyenChiTiet && quyenChiTiet.nut) ? quyenChiTiet.nut : [];
        const lopDuocCap = (quyenChiTiet && quyenChiTiet.lop) ? quyenChiTiet.lop : [];

        const dsNut = ['btnLuuTuan', 'btnLuuCoDinh', 'btnKhoiPhuc', 'btnXepTuDong', 'btnKiemTra', 'btnNhapExcelTKB', 'btnDongBoChuan', 'btnLuuSua', 'btnKhoaTKB', 'btnKhoaSoDauBai'];
        
        let coNutTkbHienThi = false;
        dsNut.forEach(idNut => {
            let nut = document.getElementById(idNut);
            if (nut) {
                let duocPhep = quyenSuaChua || nutDuocCap.includes(idNut) || nutCongKhai.includes(idNut);
                if (idNut === 'btnLuuSua' || idNut === 'btnLuuTuan') {
                    if (quyenSuaChua || nutDuocCap.includes(idNut) || lopDuocCap.length > 0 || nutCongKhai.includes(idNut)) duocPhep = true;
                }
                if (duocPhep) { 
                    nut.style.display = (idNut === 'btnKhoaSoDauBai') ? 'inline-flex' : 'flex'; 
                    nut.disabled = false; 
                    if (idNut !== 'btnKhoaSoDauBai') coNutTkbHienThi = true;
                } else { 
                    nut.style.display = 'none'; 
                    nut.disabled = true; 
                }
            }
        });

        // [NÂNG CẤP MENU 3 GẠCH]: Kiểm soát hiển thị nút Menu 3 gạch Thao tác TKB
        let vungMenuTkb = document.getElementById('vungMenuThaoTacTKB');
        if (vungMenuTkb) {
            vungMenuTkb.style.display = (quyenSuaChua || coNutTkbHienThi) ? 'block' : 'none';
        }

        const dsMenuQuanTri = ['menuCaiDat', 'menuDanhMucGV', 'menuDanhMucLop', 'menuKhungChuongTrinh', 'menuPhanCong', 'menuDanhMucSGK', 'menuPhanPhoiChuongTrinh', 'menuPhanQuyen'];
        let coMenuQuanTriDuocMo = false;

        dsMenuQuanTri.forEach(idMenu => {
            let menu = document.getElementById(idMenu);
            if (menu) {
                let duocXem = quyenSuaChua || menuDuocCap.includes(idMenu) || menuCongKhai.includes(idMenu);
                menu.style.display = duocXem ? 'flex' : 'none'; 
                if (duocXem) coMenuQuanTriDuocMo = true;
            }
        });

        let nhanHT = document.getElementById('nhanHeThong');
        if (nhanHT) nhanHT.style.display = coMenuQuanTriDuocMo ? 'flex' : 'none';

        let btnTuanTruoc = document.getElementById('btnTuanTruoc');
        let btnTuanTiep = document.getElementById('btnTuanTiep');
        let inputNgay = document.getElementById('chonNgayDauTuan');
        let coQuyenChuyenTuan = quyenSuaChua || nutDuocCap.includes('btnChuyenTuan') || nutCongKhai.includes('btnChuyenTuan');

        if (coQuyenChuyenTuan) {
            if (btnTuanTruoc) btnTuanTruoc.style.display = 'block'; 
            if (btnTuanTiep) btnTuanTiep.style.display = 'block'; 
            if (inputNgay) { inputNgay.disabled = false; inputNgay.classList.remove('cursor-not-allowed', 'opacity-80'); }
        } else {
            if (btnTuanTruoc) btnTuanTruoc.style.display = 'none'; 
            if (btnTuanTiep) btnTuanTiep.style.display = 'none'; 
            if (inputNgay) { inputNgay.disabled = true; inputNgay.classList.add('cursor-not-allowed', 'opacity-80'); }
        }

        if (typeof capNhatHienThiPhanQuyen === 'function') {
            capNhatHienThiPhanQuyen();
        }
    } finally {
        _dangKiemSoatGiaoDien = false;
    }
}
window.kiemSoatGiaoDien = kiemSoatGiaoDien;

// =========================================================================
// KHỐI XỬ LÝ CHUYỂN TUẦN VÀ NGÀY THÁNG (ĐỊNH TUYẾN 3 LUỒNG)
// =========================================================================
let khoaChuyenTuan = false;
async function chuyenTuan(buocNhay) {
    if (khoaChuyenTuan) return; // Khóa hàm chống bấm đúp gây tải lại nhiều lần
    khoaChuyenTuan = true;
    
    try {
        let theTuan = document.getElementById('hienThiTuanHienTai');
        let tuanHienTaiTrenUI = tuanDangXem;
        
        if (theTuan) {
            if (theTuan.tagName === 'INPUT') tuanHienTaiTrenUI = parseInt(theTuan.value, 10) || tuanDangXem;
            else { let match = theTuan.innerText.match(/\d+/); if (match) tuanHienTaiTrenUI = parseInt(match[0], 10); }
        }

        // Nếu bấm nút mũi tên (buocNhay !== 0) thì tịnh tiến trực tiếp từ tuanDangXem để tránh cộng dồn kép;
        // nếu nhập số tuần trực tiếp vào ô input (buocNhay === 0) thì lấy theo giá trị vừa nhập.
        let tuanMoi = (buocNhay !== 0) ? (tuanDangXem + buocNhay) : tuanHienTaiTrenUI;
        if (tuanMoi < 1) tuanMoi = 1; 
        if (tuanMoi > 52) tuanMoi = 52;
        
        let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
        let nguonTruyXuat = 'TKB_HIEN_TAI';
        
        if (tuanMoi < tuanHeThong) nguonTruyXuat = 'DATA_TKB';
        else if (tuanMoi > tuanHeThong) nguonTruyXuat = 'TKB_CoDinh';
        else nguonTruyXuat = 'TKB_HIEN_TAI';
        
        // Tính ngày Thứ 2 của tuần mới dựa trên mốc Thứ 2 Tuần 1 chuẩn xác:
        // Ngày Thứ 2 tuần mới = Mốc Thứ 2 Tuần 1 + (tuanMoi - 1) * 7 ngày
        let dMocTuan1 = window.layMocNgayThu2Tuan1TuCauHinh();
        if (dMocTuan1) {
            let dMocTuanMoi = new Date(dMocTuan1.getFullYear(), dMocTuan1.getMonth(), dMocTuan1.getDate() + (tuanMoi - 1) * 7);
            dMocTuanMoi = window.chuyenVeThu2(dMocTuanMoi);
            ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMocTuanMoi);
            let dateInput = document.getElementById('chonNgayDauTuan');
            if (dateInput) dateInput.value = ngayDauTuanUI;
        } else if (ngayDauTuanUI && tuanMoi !== tuanDangXem) {
            let parts = ngayDauTuanUI.split('-');
            if (parts.length === 3) {
                let yy = parseInt(parts[0], 10), mm = parseInt(parts[1], 10), dd = parseInt(parts[2], 10);
                let d = new Date(yy, mm - 1, dd + ((tuanMoi - tuanDangXem) * 7));
                d = window.chuyenVeThu2(d);
                ngayDauTuanUI = window.dinhDangDateThanhInputYMD(d);
                let dateInput = document.getElementById('chonNgayDauTuan');
                if (dateInput) dateInput.value = ngayDauTuanUI;
            }
        }
        
        tuanDangXem = tuanMoi;
        if (theTuan) {
            if (theTuan.tagName === 'INPUT') theTuan.value = tuanDangXem;
            else { theTuan.innerText = `Tuần ${tuanDangXem}`; }
        }
        
        if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) duLieuTkbHienTai = []; 
        if (typeof window.capNhatTenNutTuanTiepTheo === 'function') window.capNhatTenNutTuanTiepTheo();
        await taiDuLieuTKB(false, nguonTruyXuat); 
    } finally {
        khoaChuyenTuan = false;
    }
}

let timerCapNhatNgay;
function capNhatNgayDauTuan() {
    clearTimeout(timerCapNhatNgay);
    timerCapNhatNgay = setTimeout(() => {
        let el = document.getElementById('chonNgayDauTuan');
        if (el && el.value !== ngayDauTuanUI) {
            ngayDauTuanUI = el.value;
            if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) duLieuTkbHienTai.forEach(t => t.ngay = ''); 
            xuatMaTranBang(duLieuTkbHienTai); 
        }
    }, 500); 
}

// =========================================================================
// =========================================================================
// KHỐI ĐIỀU KHIỂN MENU 3 GẠCH NGANG THAO TÁC THỜI KHÓA BIỂU
// =========================================================================
// =========================================================================
// KHỐI QUẢN LÝ KHÓA / MỞ KHÓA VÀ HIỂN THỊ VÒNG QUAY NÚT THAO TÁC
// =========================================================================
window.layHoacTaoSpinnerBenCanhNutThaoTac = function() {
    let spinner = document.getElementById('spinnerBenCanhNutThaoTac');
    if (spinner) return spinner;

    let vungMenu = document.getElementById('vungMenuThaoTacTKB');
    if (!vungMenu) return null;

    spinner = document.createElement('div');
    spinner.id = 'spinnerBenCanhNutThaoTac';
    spinner.className = 'hidden inline-flex items-center gap-1.5 ml-2 px-2.5 py-1.5 bg-blue-50 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold shadow-md flex-none transition-all duration-200 select-none';
    spinner.innerHTML = `
        <svg class="w-4 h-4 text-blue-600 animate-spin flex-none" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span id="nhanSpinnerThaoTacTKB" class="whitespace-nowrap font-sans font-extrabold tracking-wide">Đang xử lý...</span>
    `;

    // Chèn ngay sau vungMenu trong thanh công cụ
    if (vungMenu.parentElement) {
        vungMenu.parentElement.insertBefore(spinner, vungMenu.nextSibling);
    } else {
        vungMenu.appendChild(spinner);
    }
    return spinner;
};

window.khoaNutThaoTacTKB = function(khoa, tenTacVu = '') {
    let btnMenu = document.getElementById('btnMenuThaoTacTKB');
    let dropdown = document.getElementById('dropdownMenuThaoTacTKB');
    let spinner = window.layHoacTaoSpinnerBenCanhNutThaoTac();

    if (khoa) {
        // 1. Đóng menu dropdown nếu đang mở
        if (typeof window.dongMenuThaoTacTKB === 'function') {
            window.dongMenuThaoTacTKB();
        } else if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
            dropdown.style.display = 'none';
        }

        // 2. Lập tức khóa nút thao tác (chống bấm đúp, chống thao tác chồng chéo)
        if (btnMenu) {
            btnMenu.disabled = true;
            btnMenu.setAttribute('data-dang-chay', 'true');
            btnMenu.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            btnMenu.classList.remove('cursor-pointer', 'hover:bg-blue-800');
            btnMenu.title = 'Hệ thống đang thực thi thao tác, vui lòng chờ...';
        }

        // 3. Hiển thị vòng quay bên cạnh nút thao tác
        if (spinner) {
            spinner.classList.remove('hidden');
            spinner.classList.add('inline-flex');
            let nhan = document.getElementById('nhanSpinnerThaoTacTKB');
            if (nhan) {
                nhan.innerText = tenTacVu ? (tenTacVu + '...') : 'Đang xử lý...';
            }
        }
    } else {
        // 4. Mở khóa nút thao tác để tiếp tục
        if (btnMenu) {
            btnMenu.disabled = false;
            btnMenu.removeAttribute('data-dang-chay');
            btnMenu.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            btnMenu.classList.add('cursor-pointer', 'hover:bg-blue-800');
            btnMenu.title = 'Danh sách các thao tác quản trị Thời khóa biểu';
        }

        // 5. Ẩn vòng quay bên cạnh nút thao tác
        if (spinner) {
            spinner.classList.remove('inline-flex');
            spinner.classList.add('hidden');
        }
    }
};

window.toggleMenuThaoTacTKB = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const btnMenu = document.getElementById('btnMenuThaoTacTKB');
    if (btnMenu && (btnMenu.disabled || btnMenu.getAttribute('data-dang-chay') === 'true')) {
        return; // Đang khóa thì lập tức chặn mở menu
    }
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const dropdown = document.getElementById('dropdownMenuThaoTacTKB');
    if (!dropdown) return;
    
    const isHidden = dropdown.classList.contains('hidden') || dropdown.style.display === 'none' || window.getComputedStyle(dropdown).display === 'none';
    
    if (isHidden) {
        dropdown.classList.remove('hidden');
        dropdown.classList.add('flex');
        dropdown.style.display = 'flex';
    } else {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('flex');
        dropdown.style.display = 'none';
    }
};

window.dongMenuThaoTacTKB = function() {
    const dropdown = document.getElementById('dropdownMenuThaoTacTKB');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('flex');
        dropdown.style.display = 'none';
    }
};

document.addEventListener('click', function(e) {
    const vungMenu = document.getElementById('vungMenuThaoTacTKB');
    if (vungMenu && !vungMenu.contains(e.target)) {
        if (typeof window.dongMenuThaoTacTKB === 'function') {
            window.dongMenuThaoTacTKB();
        }
    }
});

// =========================================================================
// KHỐI ĐỒNG BỘ DANH MỤC MÔN HỌC & NGƯỜI DẠY (GIÁO VIÊN) VÀO Ô CHỌN TKB
// =========================================================================
window.capNhatDatalistTKB = function() {
    if (!thongSoHocVu) return;

    // 1. Cập nhật Datalist Môn học
    let dlMon = document.getElementById('datalistChung_Mon');
    if (!dlMon) {
        dlMon = document.createElement('datalist');
        dlMon.id = 'datalistChung_Mon';
        document.body.appendChild(dlMon);
    }
    let dsMon = thongSoHocVu.DANH_SACH_MON_HOC || [];
    let htmlMon = '<option value="---">'; // Lựa chọn xóa môn
    let daCoMon = new Set();
    dsMon.forEach(m => {
        let tenMon = String(m || '').trim();
        if (tenMon && tenMon !== '---' && !daCoMon.has(tenMon.toLowerCase())) {
            daCoMon.add(tenMon.toLowerCase());
            htmlMon += `<option value="${tenMon}">`;
        }
    });
    dlMon.innerHTML = htmlMon;

    // 2. Cập nhật Datalist Giáo viên
    let dlGv = document.getElementById('datalistChung_GV');
    if (!dlGv) {
        dlGv = document.createElement('datalist');
        dlGv.id = 'datalistChung_GV';
        document.body.appendChild(dlGv);
    }
    let dsGv = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];
    let htmlGv = '<option value="---">'; // Lựa chọn xóa GV
    let daCoGv = new Set();
    dsGv.forEach(g => {
        let tenGv = String(g || '').trim();
        if (tenGv && tenGv !== '---' && !daCoGv.has(tenGv.toLowerCase())) {
            daCoGv.add(tenGv.toLowerCase());
            htmlGv += `<option value="${tenGv}">`;
        }
    });
    dlGv.innerHTML = htmlGv;

    // 3. Mặc định không tô màu phân biệt giáo viên khi khởi động (chỉ tô màu khi lọc/kiểm tra)

    // 4. Cập nhật bộ lọc Giáo viên trên thanh công cụ TKB
    if (typeof napDuLieuBoLocGiaoVien === 'function') {
        napDuLieuBoLocGiaoVien();
    }
};

window.dongBoDanhMucMonVaGiaoVien = async function(hienThongBao = false) {
    try {
        const KEY_CH = layKhoaCachLy('SmartTKB_CauHinh');
        const urlCauHinh = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCauHinh&_noCache=${Date.now()}`;
        const phanHoi = await fetchVoiCoCheThuLai(urlCauHinh);
        const thongSoMoi = await phanHoi.json();
        
        if (thongSoMoi && thongSoMoi.trangThai !== 'loi_he_thong') {
            thongSoHocVu = thongSoMoi; window.thongSoHocVu = thongSoHocVu;
            localStorage.setItem(KEY_CH, JSON.stringify(thongSoHocVu));
            
            // Tái tạo ngay lập tức datalist Môn học và Giáo viên
            window.capNhatDatalistTKB();
            
            if (hienThongBao) {
                let soMon = (thongSoHocVu.DANH_SACH_MON_HOC || []).length;
                let soGv = (thongSoHocVu.DANH_SACH_GIAO_VIEN || []).length;
                alert(`✅ Đồng bộ thành công!\n- Môn học: ${soMon} môn\n- Giáo viên: ${soGv} người\nĐã cập nhật vào toàn bộ ô chọn của Thời khóa biểu.`);
            }
            return true;
        }
    } catch (e) {
        console.error("Lỗi đồng bộ danh mục:", e);
        if (hienThongBao) alert("⚠️ Lỗi đồng bộ danh mục từ máy chủ: " + e.message);
    }
    return false;
};

// [TỰ ĐỘNG ĐỒNG BỘ]: Bắt sự kiện khi lưu Khung chương trình, Danh mục giáo viên, hoặc Danh mục lớp
(function() {
    if (window._daCaiDatHookDongBoDanhMuc) return;
    window._daCaiDatHookDongBoDanhMuc = true;
    
    const fetchGoc = window.fetch;
    window.fetch = async function(...args) {
        const phanHoi = await fetchGoc.apply(this, args);
        try {
            const bodyYeuCau = args[1] && args[1].body ? String(args[1].body) : '';
            if (bodyYeuCau.includes('luuBanGhiKhungChuongTrinh') || bodyYeuCau.includes('luuDanhMucGV') || bodyYeuCau.includes('luuDanhMucLop')) {
                // Tự động đồng bộ ngay vào TKB sau khi lưu thành công
                setTimeout(() => {
                    if (typeof window.dongBoDanhMucMonVaGiaoVien === 'function') {
                        window.dongBoDanhMucMonVaGiaoVien(false);
                    }
                }, 800);
            }
        } catch(e) {}
        return phanHoi;
    };
})();

// KHỐI 1: KHỞI TẠO TỨC THÌ (LAZY LOADING CAO CẤP)
// =========================================================================
async function khoiTaoGiaoDien() {
    const KEY_CH = layKhoaCachLy('SmartTKB_CauHinh');
    const KEY_TKB = layKhoaCachLy('SmartTKB_DuLieuTuan');
    const hienThiTuan = document.getElementById('hienThiTuanHienTai');
    const spinnerTuan = document.getElementById('spinnerTaiTuan');

    if(typeof CAU_HINH_FRONTEND !== 'undefined') {
        let tieuDeHeThong = document.getElementById('tenHeThong'); 
        if (tieuDeHeThong) tieuDeHeThong.innerText = CAU_HINH_FRONTEND.TEN_DU_AN;
        let logoHT = document.getElementById('logoHeThong'); 
        if (logoHT) logoHT.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
        let logoMenu = document.getElementById('logoMenuDoc'); 
        if (logoMenu) logoMenu.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
    }

    let daVeLuoiRam = false;

    try {
        let cacheCauHinh = localStorage.getItem(KEY_CH);
        let cacheTkb = localStorage.getItem(KEY_TKB);
        
        if (cacheCauHinh && cacheTkb) {
            try {
                thongSoHocVu = JSON.parse(cacheCauHinh); window.thongSoHocVu = thongSoHocVu;
                duLieuTkbHienTai = JSON.parse(cacheTkb);
                
                tuanDangXem = parseInt(thongSoHocVu.TUAN_HIEN_TAI) || 1;
                if (hienThiTuan) {
                    if (hienThiTuan.tagName === 'INPUT') hienThiTuan.value = tuanDangXem;
                    else hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
                }
                if (tuanDangXem === 1) {
                    let dMoc = window.layMocNgayThu2Tuan1TuCauHinh();
                    if (dMoc) {
                        ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMoc);
                        let dateInput = document.getElementById('chonNgayDauTuan');
                        if (dateInput) dateInput.value = ngayDauTuanUI;
                    }
                }
                
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

                xuatMaTranBang(duLieuTkbHienTai);
                daVeLuoiRam = true;
                if (typeof window.khoiTaoDOMPhanQuyen === "function") window.khoiTaoDOMPhanQuyen();
            } catch(e) { console.warn("Cache lỗi định dạng, tiến hành nạp mới hoàn toàn."); }
        }

        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCauHinh`);
        const thongSoMoi = await phanHoi.json();
        if (thongSoMoi.trangThai === 'loi_he_thong') throw new Error(thongSoMoi.thongBao);
        
        thongSoHocVu = thongSoMoi;
        localStorage.setItem(KEY_CH, JSON.stringify(thongSoHocVu)); 
        if (typeof window.capNhatDatalistTKB === 'function') {
            window.capNhatDatalistTKB();
        } 
        
        tuanDangXem = parseInt(thongSoHocVu.TUAN_HIEN_TAI) || 1;
        if (hienThiTuan) {
            if (hienThiTuan.tagName === 'INPUT') hienThiTuan.value = tuanDangXem;
            else hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
        }
        if (tuanDangXem === 1) {
            let dMoc = window.layMocNgayThu2Tuan1TuCauHinh();
            if (dMoc) {
                ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMoc);
                let dateInput = document.getElementById('chonNgayDauTuan');
                if (dateInput) dateInput.value = ngayDauTuanUI;
            }
        }
        
        if (thongSoHocVu.TKB_TUAN && thongSoHocVu.TKB_TUAN.length > 0) {
            let duLieuMoi = thongSoHocVu.TKB_TUAN;
            let canVeLai = !daVeLuoiRam;
            if (daVeLuoiRam) {
                let strCu = JSON.stringify(duLieuTkbHienTai || []);
                let strMoi = JSON.stringify(duLieuMoi || []);
                if (strCu !== strMoi) canVeLai = true;
            }
            duLieuTkbHienTai = duLieuMoi;
            localStorage.setItem(KEY_TKB, JSON.stringify(duLieuTkbHienTai));
            if (canVeLai) {
                xuatMaTranBang(duLieuTkbHienTai);
            }
            if (spinnerTuan) spinnerTuan.classList.add('hidden');
        } else if (!daVeLuoiRam) {
            await taiDuLieuTKB(false); 
        }

        kiemSoatGiaoDien(); 
        napDuLieuBoLocGiaoVien();
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

        kichHoatTaiNgamCacPhanHeKhac();
        
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

window.kichHoatTaiNgamCacPhanHeKhac = function() {
    // Phân bổ tải ngầm lệch pha (Staggered Loading) để không nghẽn máy chủ GAS và không đơ UI
    setTimeout(() => {
        if (typeof taiDuLieuSoDauBaiTuMayChu === 'function') taiDuLieuSoDauBaiTuMayChu();
    }, 2000);
    setTimeout(() => {
        if (typeof taiCayDanhMucThongKe === 'function' && (!window.cayDanhMucThongKe || Object.keys(window.cayDanhMucThongKe).length === 0)) taiCayDanhMucThongKe();
    }, 4500);
    setTimeout(() => {
        if (typeof taiDuLieuPhanCongTuMayChu === 'function' && (!window.danhSachGV || window.danhSachGV.length === 0)) taiDuLieuPhanCongTuMayChu();
    }, 7000);
    setTimeout(() => {
        if (typeof taiDuLieuKhungChuongTrinhTuMayChu === 'function' && (!window.duLieuBangKCT || window.duLieuBangKCT.length === 0)) taiDuLieuKhungChuongTrinhTuMayChu();
    }, 9500);
};

let khoaTaiTKB = false;
async function taiDuLieuTKB(coCache = false, nguonTruyXuat = 'TKB_HIEN_TAI', epDongBo = false) {
    if (khoaTaiTKB) return; 
    khoaTaiTKB = true;
    
    const KEY_TKB = layKhoaCachLy('SmartTKB_DuLieuTuan');
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    const hienThiTuan = document.getElementById('hienThiTuanHienTai');
    const spinnerTuan = document.getElementById('spinnerTaiTuan');
    
    let nhanNguon = nguonTruyXuat === 'DATA_TKB' ? 'Dữ liệu quá khứ' : (nguonTruyXuat === 'TKB_CoDinh' ? 'Dự kiến cố định' : 'Hệ thống hiện tại');

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
                return mangTkb.map(t => `${String(t.tuan || '').trim()}_${String(t.thu).trim()}_${String(t.buoi).trim()}_${String(t.tiet).trim()}_${String(t.maLop).trim()}_${String(t.monHoc || '').trim()}_${String(t.maGv || '').trim()}_${String(t.ngay || '').trim()}`).sort().join('||');
            };

            let vanTayMayChu = taoDauVanTay(duLieu);
            let vanTayRam = taoDauVanTay(tkbRam);
            let vanTayHienTai = taoDauVanTay(duLieuTkbHienTai); 

            let thoiGianKhoa = parseInt(localStorage.getItem(layKhoaCachLy('KhoaDongBo_TKB')) || '0');
            let vuaMoiLuu = (Date.now() - thoiGianKhoa) < 15000 && !epDongBo;

            if (nguonTruyXuat === 'TKB_HIEN_TAI') {
                if (!coCache || vanTayMayChu !== vanTayRam || epDongBo) {
                    if (vuaMoiLuu && coCache) {
                        if (document.getElementById('vungHienThiDuLieu').innerHTML.includes('Đang tải')) {
                            xuatMaTranBang(duLieuTkbHienTai);
                        }
                    } else {
                        duLieuTkbHienTai = duLieu;
                        localStorage.setItem(KEY_TKB, JSON.stringify(duLieu));
                        
                        // [ĐỒNG BỘ MỐC NGÀY CHUẨN THEO TUẦN]:
                        let dMocCaiDat = window.layMocNgayThu2Tuan1TuCauHinh();
                        if (dMocCaiDat) {
                            let dMocTuanNay = new Date(dMocCaiDat.getFullYear(), dMocCaiDat.getMonth(), dMocCaiDat.getDate() + (tuanDangXem - 1) * 7);
                            dMocTuanNay = window.chuyenVeThu2(dMocTuanNay);
                            ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMocTuanNay);
                            let dateInput = document.getElementById('chonNgayDauTuan');
                            if (dateInput) dateInput.value = ngayDauTuanUI;
                        } else if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                            let minDateObj = null;
                            duLieuTkbHienTai.forEach(t => {
                                let tuanBanGhi = parseInt(String(t.tuan || '').replace(/\D/g, ''), 10);
                                if (tuanBanGhi === parseInt(tuanDangXem, 10) && t.ngay && String(t.ngay).trim() !== "") {
                                    let p = String(t.ngay).trim().split('/');
                                    if (p.length === 3) {
                                        let d = new Date(p[2], p[1] - 1, p[0]);
                                        if (!isNaN(d.getTime())) {
                                            if (!minDateObj || d < minDateObj) minDateObj = d;
                                        }
                                    }
                                }
                            });
                            if (minDateObj) {
                                minDateObj = window.chuyenVeThu2(minDateObj);
                                ngayDauTuanUI = window.dinhDangDateThanhInputYMD(minDateObj); 
                                let dateInput = document.getElementById('chonNgayDauTuan');
                                if(dateInput) dateInput.value = ngayDauTuanUI;
                            }
                        }

                        xuatMaTranBang(duLieuTkbHienTai);
                        if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
                    }
                } else {
                    if (document.getElementById('vungHienThiDuLieu').innerHTML.includes('Đang tải')) {
                        xuatMaTranBang(duLieuTkbHienTai);
                    }
                }
            } else {
                if (!coCache || vanTayMayChu !== vanTayHienTai || epDongBo) {
                    duLieuTkbHienTai = duLieu; 
                    
                    // [ĐỒNG BỘ MỐC NGÀY CHUẨN THEO TUẦN]:
                    let dMocCaiDat = window.layMocNgayThu2Tuan1TuCauHinh();
                    if (dMocCaiDat) {
                        let dMocTuanNay = new Date(dMocCaiDat.getFullYear(), dMocCaiDat.getMonth(), dMocCaiDat.getDate() + (tuanDangXem - 1) * 7);
                        dMocTuanNay = window.chuyenVeThu2(dMocTuanNay);
                        ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMocTuanNay);
                        let dateInput = document.getElementById('chonNgayDauTuan');
                        if (dateInput) dateInput.value = ngayDauTuanUI;
                    } else if (nguonTruyXuat !== 'TKB_CoDinh' && duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                        let minDateObj = null;
                        duLieuTkbHienTai.forEach(t => {
                            let tuanBanGhi = parseInt(String(t.tuan || '').replace(/\D/g, ''), 10);
                            if (tuanBanGhi === parseInt(tuanDangXem, 10) && t.ngay && String(t.ngay).trim() !== "") {
                                let p = String(t.ngay).trim().split('/');
                                if (p.length === 3) {
                                    let d = new Date(p[2], p[1] - 1, p[0]);
                                    if (!isNaN(d.getTime())) {
                                        if (!minDateObj || d < minDateObj) minDateObj = d;
                                    }
                                }
                            }
                        });
                        if (minDateObj) {
                            minDateObj = window.chuyenVeThu2(minDateObj);
                            ngayDauTuanUI = window.dinhDangDateThanhInputYMD(minDateObj); 
                            let dateInput = document.getElementById('chonNgayDauTuan');
                            if(dateInput) dateInput.value = ngayDauTuanUI;
                        }
                    }

                    xuatMaTranBang(duLieuTkbHienTai);
                } else {
                    if (document.getElementById('vungHienThiDuLieu').innerHTML.includes('Đang tải')) {
                        xuatMaTranBang(duLieuTkbHienTai);
                    }
                }
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
        if (hienThiTuan) {
            if (hienThiTuan.tagName === 'INPUT') {
                hienThiTuan.value = tuanDangXem;
                if (spinnerTuan) spinnerTuan.classList.add('hidden');
            }
            else hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
        }
        khoaTaiTKB = false;
    }
}

function napDuLieuBoLocGiaoVien() {
    let dtList = document.getElementById('danhSachGvList');
    let locGiaoVienInput = document.getElementById('locGiaoVien');
    if (!dtList || !locGiaoVienInput) return;

    let dsGV = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];

    // [NÂNG CẤP]: Cập nhật Datalist động. Cộng dồn tiền tố (các giáo viên đã chọn) vào danh sách gợi ý mới
    const capNhatDatalist = (tienTo) => {
        dtList.innerHTML = '';
        if (tienTo === '') {
            dtList.innerHTML += `<option value="Toàn trường"></option>`;
            dsGV.forEach(gv => dtList.innerHTML += `<option value="${gv}"></option>`);
        } else {
            let mangDaChon = tienTo.split(',').map(s => s.trim()).filter(s => s !== "");
            dsGV.forEach(gv => {
                // Lọc bỏ những giáo viên đã được chọn trước đó để danh sách gọn hơn
                if (!mangDaChon.includes(gv)) {
                    dtList.innerHTML += `<option value="${tienTo}${gv}"></option>`;
                }
            });
        }
    };

    // Khởi tạo datalist lúc mới load trang
    capNhatDatalist('');

    if (!locGiaoVienInput.dataset.daGanSuKienBoLoc) {
        locGiaoVienInput.dataset.daGanSuKienBoLoc = "true";

        // Bắt sự kiện khi đang gõ phím
        locGiaoVienInput.addEventListener('input', function() {
            let val = this.value;
            if (val === "Toàn trường") {
                capNhatDatalist('');
                if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
                return;
            }

            // Dò tìm vị trí dấu phẩy cuối cùng để cắt lớp tiền tố đã chọn
            let lastCommaIndex = val.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                let mangTienTo = val.substring(0, lastCommaIndex).split(',').map(s => s.trim()).filter(s => s !== "");
                let tienToChuan = mangTienTo.join(', ') + (mangTienTo.length > 0 ? ', ' : '');
                capNhatDatalist(tienToChuan); // Cấp lại danh sách kèm tiền tố
            } else {
                capNhatDatalist(''); // Nếu bị xóa hết dấu phẩy, quay lại datalist gốc
            }

            if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
        });

        // Bắt sự kiện khi click chọn một mục từ danh sách xổ xuống
        locGiaoVienInput.addEventListener('change', function() {
            let valMoi = this.value;
            if (valMoi === "Toàn trường" || valMoi.trim() === "") {
                this.value = valMoi.trim();
                capNhatDatalist('');
            } else {
                // Kiểm tra xem mục vừa chọn có phải là giáo viên chuẩn không
                let mangCu = valMoi.split(',').map(s => s.trim()).filter(s => s !== "");
                let lastGv = mangCu[mangCu.length - 1];
                
                if (dsGV.includes(lastGv)) {
                    // Nối thêm dấu phẩy và khoảng trắng chuẩn bị sẵn cho việc chọn người tiếp theo
                    this.value = mangCu.join(', ') + ', ';
                    capNhatDatalist(this.value);
                }
            }
            if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
        });
    }
    if (typeof window.napDuLieuBoLocLop === 'function') {
        window.napDuLieuBoLocLop();
    }
}

async function goiThuatToanXepLich() {
    if (typeof window.kiemTraTuanTkbDaKhoa === 'function' && window.kiemTraTuanTkbDaKhoa(tuanDangXem)) {
        alert(`⚠️ Thời khóa biểu Tuần ${tuanDangXem} đang bị KHÓA. Đồng chí vui lòng Mở khóa trước khi chạy xếp tự động!`);
        return;
    }
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang xếp tự động');
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    if (vungHienThi) vungHienThi.innerHTML = `<tr><td class="text-center text-orange-600 font-bold py-10 reactbits-fade-in text-lg" style="font-family:'Times New Roman',Times,serif;"><div class="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>Đang chạy Động cơ phân bổ cho Tuần ${tuanDangXem}...</td></tr>`;
    try {
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=xepLichTuDong&tuan=${tuanDangXem}`);
        duLieuTkbHienTai = await phanHoi.json(); 
        xuatMaTranBang(duLieuTkbHienTai);
    } catch (loi) { 
        if (vungHienThi) vungHienThi.innerHTML = `<tr><td class="text-center text-red-500 font-bold py-10 text-lg" style="font-family:'Times New Roman',Times,serif;">Lỗi thuật toán xếp lịch tự động.</td></tr>`; 
    } finally {
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
}

function locTheoGiaoVien() {
    let theLoc = document.getElementById('locGiaoVien');
    let gvLoc = theLoc ? theLoc.value.trim() : '';
    
    // Tách chuỗi thành mảng các giáo viên dựa vào dấu phẩy
    let danhSachLocLC = gvLoc.toLowerCase().split(',').map(s => s.trim()).filter(s => s !== "");

    let tapHopLopCuaGV = new Set();
    let coTietNaoKhong = false;
    let dangLocGiaoVien = (danhSachLocLC.length > 0 && !danhSachLocLC.includes("toàn trường"));

    if (dangLocGiaoVien && typeof duLieuTkbHienTai !== 'undefined') {
        duLieuTkbHienTai.forEach(t => {
            if (t.maGv) {
                let gvTkb = t.maGv.trim().toLowerCase();
                let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                
                // Kiểm tra xem giáo viên trong ô TKB có khớp với BẤT KỲ giáo viên nào đang lọc không
                let coKhop = tapHopGvTkb.some(g => danhSachLocLC.includes(g));
                
                if (coKhop) {
                    tapHopLopCuaGV.add(t.maLop);
                    coTietNaoKhong = true;
                }
            }
        });
    }

    let tbody = document.getElementById('vungHienThiDuLieu');
    let thead = document.getElementById('tieuDeBang');
    
    // Xóa cảnh báo rỗng cũ nếu có
    if (tbody && tbody.querySelector('.canh-bao-trong-lich')) {
        let cacDong = tbody.querySelectorAll('tr:not(.canh-bao-trong-lich)');
        cacDong.forEach(dong => dong.style.display = '');
        let dongCanhBao = tbody.querySelector('.canh-bao-trong-lich');
        if (dongCanhBao) dongCanhBao.remove();
        if (thead) thead.style.display = '';
    }

    // Hiển thị cảnh báo nếu không giáo viên nào trong danh sách lọc có tiết
    if (dangLocGiaoVien && !coTietNaoKhong) {
        if (thead) thead.style.display = 'none';

        if (tbody) {
            let cacDong = tbody.querySelectorAll('tr');
            cacDong.forEach(dong => dong.style.display = 'none'); 
            
            let trCanhBao = document.createElement('tr');
            trCanhBao.className = 'canh-bao-trong-lich bg-orange-50/50';
            trCanhBao.innerHTML = `<td colspan="3" class="text-center py-12">
                <div class="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></div>
                <p class="text-orange-600 font-bold text-lg mb-1">Không tìm thấy lịch lên lớp của: ${gvLoc} trong tuần này.</p>
                <p class="text-sm text-slate-500 font-medium">Vui lòng xóa ô tìm kiếm hoặc chọn "Toàn trường" để hiển thị lại lưới TKB.</p>
            </td>`;
            tbody.appendChild(trCanhBao);
        }
        return;
    }

    // Ẩn/hiện các cột lớp
    let tatCaCacCot = document.querySelectorAll('[data-cotlop]');
    tatCaCacCot.forEach(cot => {
        let lopCuaCot = cot.getAttribute('data-cotlop');
        if (!dangLocGiaoVien || tapHopLopCuaGV.has(lopCuaCot)) {
            cot.classList.remove('hidden'); 
        } else {
            cot.classList.add('hidden'); 
        }
    });

    // Tô màu các ô khớp với mục tiêu lọc
    let cacOGiaoVien = document.querySelectorAll('input[id^="gv_"]');
    cacOGiaoVien.forEach(oGv => {
        let gvGoc = oGv.value.trim().toLowerCase();
        let isTarget = true;
        
        if (dangLocGiaoVien) {
            let tapHopGvGoc = gvGoc.split(/[,;&-]/).map(g => g.trim());
            isTarget = tapHopGvGoc.some(g => danhSachLocLC.includes(g));
        }
        
        let tdGv = oGv.closest('td');
        let oMon = document.getElementById(oGv.id.replace('gv_', 'mon_'));
        let tdMon = oMon ? oMon.closest('td') : null;
        let laCanLich = oMon && oMon.value.includes('CẤN LỊCH');

        if (!dangLocGiaoVien) {
            if (tdGv) {
                tdGv.classList.remove('bg-gray-100/50', 'bg-amber-200', 'bg-amber-100');
                if (!laCanLich) tdGv.classList.add('bg-white');
            }
            if (tdMon) {
                tdMon.classList.remove('bg-gray-100/50', 'bg-amber-200', 'bg-amber-100');
                if (!laCanLich) tdMon.classList.add('bg-white');
            }
            oGv.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
            if (oMon) oMon.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
        } else if (isTarget) {
            if (tdGv) {
                tdGv.classList.remove('bg-gray-100/50', 'bg-white');
                if (!laCanLich) tdGv.classList.add('bg-amber-200');
            }
            if (tdMon) {
                tdMon.classList.remove('bg-gray-100/50', 'bg-white');
                if (!laCanLich) tdMon.classList.add('bg-amber-100');
            }
            oGv.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
            if (oMon) oMon.classList.remove('opacity-0', 'pointer-events-none', 'select-none');
        } else {
            if (tdGv) {
                tdGv.classList.remove('bg-amber-200', 'bg-amber-100', 'bg-white');
                tdGv.classList.add('bg-gray-100/50');
            }
            if (tdMon) {
                tdMon.classList.remove('bg-amber-200', 'bg-amber-100', 'bg-white');
                tdMon.classList.add('bg-gray-100/50');
            }
            oGv.classList.add('opacity-0', 'pointer-events-none', 'select-none');
            if (oMon) oMon.classList.add('opacity-0', 'pointer-events-none', 'select-none');
        }
    });
}

window.danhDauDongThayDoiTKB = function(inputEl) {
    if (!inputEl) return;
    let td = inputEl.closest('td');
    if (td && td.getAttribute('data-thaydoi') !== 'true') {
        td.setAttribute('data-thaydoi', 'true');
        td.classList.add('relative'); 
        
        if (!td.querySelector('.icon-sua-chua')) {
            inputEl.insertAdjacentHTML('afterend', `<svg class="icon-sua-chua w-[14px] h-[14px] absolute top-1 right-1 text-amber-600 animate-pulse pointer-events-none drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`);
        }
    }
};

function taoTuyChonDong(danhSach, giaTriMacDinh, kieuText, idPhanTu, isTarget = true, loaiDanhSach = '', coQuyenSua = quyenSuaChua) {
    let idThocTinh = idPhanTu ? `id="${idPhanTu}"` : '';
    let thuocTinhKhoa = coQuyenSua ? '' : 'disabled'; 
    let cssKhoa = coQuyenSua ? 'cursor-pointer' : 'cursor-not-allowed opacity-80';
    let cssAn = !isTarget ? 'opacity-0 pointer-events-none select-none' : ''; 
    let idDatalist = loaiDanhSach === 'mon' ? 'datalistChung_Mon' : 'datalistChung_GV';
    
    let kieuKiemTraGV = (idPhanTu && idPhanTu.startsWith('gv_')) ? `if(typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang();` : '';
    let triggerThayDoi = `if(typeof danhDauDongThayDoiTKB === 'function') danhDauDongThayDoiTKB(this);`;
    
    let onFocusClick = `this.dataset.val=this.value; if(this.value !== ''){ this.placeholder=this.value; this.value=''; } if(this.showPicker) this.showPicker();`;
    let onBlurLogic = `if(this.value.trim() === '') { this.value = this.dataset.val || ''; } this.placeholder='--'; xacThucGiaTriHopLe(this, '${loaiDanhSach}'); ${kieuKiemTraGV}`;
    
    let suKienMoi = `oninput="${kieuKiemTraGV} ${triggerThayDoi}" onchange="xacThucGiaTriHopLe(this, '${loaiDanhSach}'); ${kieuKiemTraGV} ${triggerThayDoi}" onfocus="${onFocusClick}" onclick="if(this.showPicker) this.showPicker();" onblur="${onBlurLogic}"`;

    let html = `<input type="text" size="1" list="${idDatalist}" ${idThocTinh} ${thuocTinhKhoa} value="${giaTriMacDinh || ''}" placeholder="--" class="w-full h-full min-w-0 bg-transparent outline-none text-center ${cssKhoa} py-1 font-bold ${kieuText} ${cssAn}" style="font-family:'Times New Roman',Times,serif;" autocomplete="off" ${suKienMoi}>`; 
    
    return html;
}

window.xacThucGiaTriHopLe = function(inputEl, loaiDanhSach) {
    if (!inputEl) return;
    let giaTri = inputEl.value.trim();

    // [NÂNG CẤP]: Xóa trắng ô hoàn toàn nếu người dùng chọn "---" hoặc "--"
    if (giaTri === '---' || giaTri === '--') { 
        inputEl.value = ''; 
        inputEl.dataset.val = ''; // Xóa bộ nhớ tạm để ngăn hàm onblur khôi phục lại chữ cũ
        return; 
    }

    if (giaTri === '') { inputEl.value = ''; return; }

    let danhSachChuan = (loaiDanhSach === 'mon') ? (thongSoHocVu.DANH_SACH_MON_HOC || []) : (thongSoHocVu.DANH_SACH_GIAO_VIEN || []);

    if (danhSachChuan.includes(giaTri)) { inputEl.value = giaTri; return; }

    let giaTriChuanHoa = giaTri.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    let giaTriDung = null;

    for (let i = 0; i < danhSachChuan.length; i++) {
        let itemChuanHoa = danhSachChuan[i].normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
        if (giaTriChuanHoa === itemChuanHoa) { giaTriDung = danhSachChuan[i]; break; }
    }

    if (giaTriDung) { inputEl.value = giaTriDung; } 
    else {
        inputEl.value = '';
        if (inputEl.parentElement && inputEl.parentElement.tagName === 'TD') {
            let theTd = inputEl.parentElement;
            theTd.classList.add('bg-red-300', 'transition-colors', 'duration-300');
            setTimeout(() => { theTd.classList.remove('bg-red-300'); }, 800);
        }
    }
};

function kiemTraDinhMuc() {
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang kiểm tra định mức');
    let mangLop = [];
    const mangLopGoc = thongSoHocVu.DANH_SACH_LOP || [];
    
    mangLopGoc.forEach(lop => { if (document.querySelector(`[id$="_${lop}"]`)) mangLop.push(lop); });

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
    
    const thuMacDinh = window.layDanhSachThuDong(ngayDauTuanUI, 6); 
    const buoiMacDinh = ["Sáng", "Chiều"];
    
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
    
    let tongTatCaTietChuan = 0; let tongTatCaTietUI = 0;

    mangLop.forEach(lop => {
        let dmKhoi = khungCT[lop] || {};
        let dsMonArr = Array.from(new Set([...Object.keys(dmKhoi), ...Object.keys(thongKeUI[lop])]));
        let tongChuanLopNay = 0; let tongUiLopNay = 0; 
        
        dsMonArr.forEach(mon => { 
            tongChuanLopNay += (parseInt(dmKhoi[mon]) || 0);
            tongUiLopNay += (thongKeUI[lop][mon] || 0); 
        });

        tongTatCaTietChuan += tongChuanLopNay; tongTatCaTietUI += tongUiLopNay;

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
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
}

function dongModal() { document.getElementById('modalKiemTra').classList.add('hidden'); }

// =========================================================================
// HÀM TÍNH NGÀY ĐỘC LẬP (SỬ DỤNG HỆ TỌA ĐỘ TOÁN HỌC TUYỆT ĐỐI)
// =========================================================================
function tinhNgayDocLap(ngayDauTuanStr, tenThu, tuanXet) {
    let tHienTai = (typeof tuanXet !== 'undefined') ? (parseInt(tuanXet, 10) || 1) : (parseInt(tuanDangXem, 10) || 1);
    
    let chuoiNgayXet = ngayDauTuanStr;
    // [QUY TẮC BẮT BUỘC]: Nếu là Tuần 1, ngày Thứ 2 BẮT BUỘC lấy từ sheet Cài đặt
    if (tHienTai === 1 || !chuoiNgayXet) {
        let dMocCaiDat = window.layMocNgayThu2Tuan1TuCauHinh();
        if (dMocCaiDat) {
            if (tHienTai === 1) {
                chuoiNgayXet = window.dinhDangDateThanhInputYMD(dMocCaiDat);
            } else if (!chuoiNgayXet) {
                let dMocTuanNay = new Date(dMocCaiDat.getTime() + (tHienTai - 1) * 7 * 86400000);
                chuoiNgayXet = window.dinhDangDateThanhInputYMD(dMocTuanNay);
            }
        }
    }

    if (!chuoiNgayXet) return { hienThi: "--/--/----", thang: "--", nam: "--", ngayDayDu: "" };
    
    let parts = chuoiNgayXet.split('-');
    if (parts.length !== 3) return { hienThi: "--/--/----", thang: "--", nam: "--", ngayDayDu: "" };
    
    let ngayGoc = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(ngayGoc.getTime())) return { hienThi: "--/--/----", thang: "--", nam: "--", ngayDayDu: "" };
    
    const mapThuToDay = {"Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ nhật": 6};
    let tenThuChuan = tenThu ? String(tenThu).trim() : "Thứ 2";
    if (tenThuChuan.match(/^[2-7]$/)) tenThuChuan = "Thứ " + tenThuChuan;
    let dayDichToVN = mapThuToDay[tenThuChuan] !== undefined ? mapThuToDay[tenThuChuan] : 0;
    
    let dayGocToVN = ngayGoc.getDay() === 0 ? 6 : ngayGoc.getDay() - 1;
    let soNgayLech = dayDichToVN - dayGocToVN;
    
    let ngayDich = new Date(ngayGoc.getTime());
    ngayDich.setDate(ngayGoc.getDate() + soNgayLech);
    
    let d = ngayDich.getDate().toString().padStart(2, '0');
    let m = (ngayDich.getMonth() + 1).toString().padStart(2, '0');
    let y = ngayDich.getFullYear();
    
    return { hienThi: `${d}/${m}/${y}`, thang: m, nam: y.toString(), ngayDayDu: `${d}/${m}/${y}` };
}

function xuatMaTranBang(danhSachTiet) {
    const thead = document.getElementById('tieuDeBang'); 
    const tbody = document.getElementById('vungHienThiDuLieu');
    if(thead) thead.className = ''; 

    const tableEl = document.querySelector('.bang-excel');
    if (tableEl) { tableEl.style.borderCollapse = 'separate'; tableEl.style.borderSpacing = '0'; }

    // [ĐỒNG BỘ TOÀN DIỆN]: Gọi hàm chuẩn hóa và cập nhật datalist Môn học & Giáo viên
    if (typeof window.capNhatDatalistTKB === 'function') {
        window.capNhatDatalistTKB();
    } else {
        let oldDlMon = document.getElementById('datalistChung_Mon');
        if (oldDlMon) oldDlMon.remove();
        let dlMon = document.createElement('datalist'); dlMon.id = 'datalistChung_Mon';
        dlMon.innerHTML += `<option value="---">`;
        (thongSoHocVu.DANH_SACH_MON_HOC || []).forEach(m => { dlMon.innerHTML += `<option value="${m}">`; });
        document.body.appendChild(dlMon);

        let oldDlGv = document.getElementById('datalistChung_GV');
        if (oldDlGv) oldDlGv.remove();
        let dlGv = document.createElement('datalist'); dlGv.id = 'datalistChung_GV';
        dlGv.innerHTML += `<option value="---">`;
        (thongSoHocVu.DANH_SACH_GIAO_VIEN || []).forEach(g => { dlGv.innerHTML += `<option value="${g}">`; });
        document.body.appendChild(dlGv);
    }

    const duLieuTiet = danhSachTiet || [];
    
    // [TRUNG THÀNH DỮ LIỆU]: Hợp nhất danh sách lớp hiện tại với danh sách lớp quá khứ để không bị ẩn dữ liệu
    let cacLopTrongData = duLieuTiet.map(t => t.maLop).filter(Boolean);
    const mangLopGoc = [...new Set([...(thongSoHocVu.DANH_SACH_LOP || []), ...cacLopTrongData])];
    
    const dsLopDuocQuyen = (quyenChiTiet && quyenChiTiet.lop) ? quyenChiTiet.lop : [];
    const tapLopDuocQuyen = new Set(dsLopDuocQuyen);
    
    let mangLopHienThi = mangLopGoc;
    if (!quyenSuaChua && tapLopDuocQuyen.size > 0) mangLopHienThi = mangLopGoc.filter(lop => tapLopDuocQuyen.has(lop));

    let tuanNayDaKhoa = (typeof window.kiemTraTuanTkbDaKhoa === 'function') ? window.kiemTraTuanTkbDaKhoa(tuanDangXem) : false;
    const mapQuyenSuaLop = new Map();
    mangLopHienThi.forEach(lop => {
        let duocSua = !tuanNayDaKhoa && (quyenSuaChua || tapLopDuocQuyen.has(lop));
        mapQuyenSuaLop.set(lop, duocSua);
    });

    if (mangLopHienThi.length === 0) {
        thead.innerHTML = '<tr><th class="text-center text-slate-500 py-3 font-bold" style="font-family:\'Times New Roman\',Times,serif;">Chưa có dữ liệu Lớp học</th></tr>';
        tbody.innerHTML = `<tr><td class="text-center py-10" style="font-family:\'Times New Roman\',Times,serif;"><p class="text-red-500 font-bold text-lg mb-2">Tài khoản chưa được cấp quyền quản lý lớp nào.</p></td></tr>`;
        return;
    }

    let dateInput = document.getElementById('chonNgayDauTuan');
       
    // [ĐỒNG BỘ MỐC NGÀY THỨ 2 CHUẨN XÁC THEO TUẦN]:
    if (tuanDangXem === 1) {
        let dMocCaiDat = window.layMocNgayThu2Tuan1TuCauHinh();
        if (dMocCaiDat) {
            ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMocCaiDat);
        }
    } else {
        let minDateObj = null;
        if (duLieuTiet && duLieuTiet.length > 0) {
            duLieuTiet.forEach(t => {
                let tuanBanGhi = parseInt(String(t.tuan || '').replace(/\D/g, ''), 10);
                if (tuanBanGhi === parseInt(tuanDangXem, 10) && t.ngay && String(t.ngay).trim() !== "") {
                    let p = String(t.ngay).trim().split('/'); 
                    if (p.length === 3) {
                        let d = new Date(p[2], p[1] - 1, p[0]);
                        if (!isNaN(d.getTime())) {
                            if (!minDateObj || d < minDateObj) minDateObj = d;
                        }
                    }
                }
            });
        }
        if (minDateObj) {
            minDateObj = window.chuyenVeThu2(minDateObj);
            ngayDauTuanUI = window.dinhDangDateThanhInputYMD(minDateObj); 
        } else if (!ngayDauTuanUI) {
            let dMocCaiDat = window.layMocNgayThu2Tuan1TuCauHinh();
            if (dMocCaiDat) {
                let dMocTuanNay = new Date(dMocCaiDat.getFullYear(), dMocCaiDat.getMonth(), dMocCaiDat.getDate() + (tuanDangXem - 1) * 7);
                dMocTuanNay = window.chuyenVeThu2(dMocTuanNay);
                ngayDauTuanUI = window.dinhDangDateThanhInputYMD(dMocTuanNay);
            }
        }
    }
    
    if (dateInput && ngayDauTuanUI) {
        dateInput.value = ngayDauTuanUI;
    }

    let theadHTML = `<tr style="height: 45px;">
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-l border-r border-slate-400" style="position: sticky; top: 0; left: 0; z-index: 60; background-color: #f1f5f9; width: 85px; min-width: 85px; font-family:'Times New Roman',Times,serif;">Thứ / Ngày</th>
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-r border-slate-400" style="position: sticky; top: 0; left: 85px; z-index: 60; background-color: #f1f5f9; width: 60px; min-width: 60px; font-family:'Times New Roman',Times,serif;">Buổi</th>
        <th rowspan="2" class="hidden">Tuần</th><th rowspan="2" class="hidden">Tháng</th><th rowspan="2" class="hidden">Năm học</th>
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-r border-slate-400" style="position: sticky; top: 0; left: 145px; z-index: 60; background-color: #f1f5f9; width: 50px; min-width: 50px; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15); font-family:'Times New Roman',Times,serif;">Tiết</th>`;
    
    mangLopHienThi.forEach(lop => { theadHTML += `<th colspan="2" data-cotlop="${lop}" class="text-center font-extrabold text-slate-900 tracking-widest border-t border-b border-r border-slate-400" style="position: sticky; top: 0; z-index: 50; background-color: #f1f5f9; font-family:'Times New Roman',Times,serif;">${lop}</th>`; });
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

    // Không khởi tạo bảng màu giáo viên khi vẽ lưới mặc định (giữ nền trắng hoàn toàn khi khởi động)
    
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
    let thuMacDinh = window.layDanhSachThuDong(ngayDauTuanUI);

    // =========================================================================
    // [NÂNG CẤP]: THUẬT TOÁN ÁNH XẠ THỜI GIAN THỰC TẾ (BẢO VỆ TÍNH TRUNG THỰC DATA_TKB)
    // Phân tích: Lọc bỏ các "Thứ" rỗng khi xem lại lịch sử tuần quá khứ
    // =========================================================================
    let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
    
    if (tuanDangXem < tuanHeThong && danhSachTiet && danhSachTiet.length > 0) {
        let tapHopThuThucTe = new Set();
        
        // Quét mảng dữ liệu để thu thập các ngày có thật
        danhSachTiet.forEach(tietHoc => {
            if (tietHoc.thu && String(tietHoc.thu).trim() !== "") {
                tapHopThuThucTe.add(String(tietHoc.thu).trim());
            }
        });
        
        // Nếu phát hiện có dữ liệu, ép khung lưới hiển thị theo đúng những gì thu thập được
        if (tapHopThuThucTe.size > 0) {
            const dinhMucThuTu = {
                "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, 
                "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8
            };
            
            thuMacDinh = Array.from(tapHopThuThucTe).sort((a, b) => {
                return (dinhMucThuTu[a] || 99) - (dinhMucThuTu[b] || 99);
            });
        }
    }
  
    thuMacDinh.forEach(thu => { thongTinNgayCache[thu] = tinhNgayDocLap(ngayDauTuanUI, thu, tuanDangXem); });
    
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
                // =========================================================================
                // NÂNG CẤP: ĐỒNG BỘ ĐỘ ĐẬM NÉT KẺ BẢNG CHO UI TKB (Màu đen tuyền sắc nét)
                // =========================================================================
                let isCuoiBuoi = (tiet === soDongCuaBuoi);
                let kieuVienNgang = isCuoiBuoi ? "solid" : "dashed";
                let doDayVienNgang = isCuoiBuoi ? "2px" : "1px";
                let maMauVien = "#000000"; // Đổi sang mã màu đen tuyền để các nét kẻ cực kỳ rõ ràng và sắc nét
                
                // CSS Nòng cốt: Tắt border-top để tránh đè nét, viền dưới tự động chuyển nét đứt/liền và đậm 2px khi hết buổi
                let styleVienChung = `border-right: 1px solid ${maMauVien} !important; border-bottom: ${doDayVienNgang} ${kieuVienNgang} ${maMauVien} !important; border-top: none !important;`;

                bufferHTML.push(`<tr class="bg-white hover:bg-slate-50 transition-colors duration-150 group" style="font-family:'Times New Roman',Times,serif;">`);
                
                if (inCotThu) { 
                    // Cột "THỨ" gộp dòng nên luôn giữ viền liền xung quanh và viền dưới đậm 2px
                    bufferHTML.push(`<td rowspan="${soDongCuaThu}" class="text-center align-middle" style="position: sticky; left: 0; z-index: 40; background-color: #ffffff; border-left: 1px solid ${maMauVien} !important; border-right: 1px solid ${maMauVien} !important; border-bottom: 2px solid ${maMauVien} !important; border-top: none !important;">
                                    <div class="font-extrabold text-slate-900">${thu}</div>
                                    <div class="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-1 inline-block">${thongTinNgay.hienThi}</div>
                                  </td>`); 
                    inCotThu = false; 
                }
                
                if (inCotBuoi) { 
                    // Cột "BUỔI" gộp dòng của buổi đó nên giữ viền dưới đậm 2px
                    bufferHTML.push(`<td rowspan="${soDongCuaBuoi}" class="text-center font-bold align-middle text-slate-800" style="position: sticky; left: 85px; z-index: 40; background-color: #ffffff; border-right: 1px solid ${maMauVien} !important; border-bottom: 2px solid ${maMauVien} !important; border-top: none !important;">${buoi}</td>`); 
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
                
                // Cột "TIẾT" nhận styleVienChung
                bufferHTML.push(`<td id="oTiet_${thu}_${buoi}_${tiet}" class="text-center font-bold text-slate-800 align-middle" style="position: sticky; left: 145px; z-index: 40; background-color: #ffffff; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15); ${styleVienChung}">
                                <div class="text-base leading-none mt-1">${tiet}</div>
                                <div class="vung-canh-bao-gv mt-0.5"></div>
                              </td>`);

                mangLopHienThi.forEach(lop => {
                    const cellKey = `${thu}_${buoi}_${tiet}_${lop}`;
                    const duLieuO = mapDuLieu.get(cellKey); 
                    const duocSuaLopNay = mapQuyenSuaLop.get(lop); 
                    
                    let monGoc = (duLieuO && duLieuO.monHoc) ? String(duLieuO.monHoc) : ((duLieuO && duLieuO.mon) ? String(duLieuO.mon) : ""); let gvGoc = (duLieuO && duLieuO.maGv) ? String(duLieuO.maGv) : "";

                    // Mặc định khi khởi động không tô màu nền cho các ô (giữ nền trắng bg-white),
                    // chỉ tô màu cảnh báo khi phát hiện CẤN LỊCH hoặc khi thực hiện lọc / kiểm tra
                    let bgLop = 'bg-white'; let textClass = 'text-slate-900';
                    if (monGoc.includes('CẤN LỊCH')) { bgLop = 'bg-yellow-400'; textClass = 'text-red-700 font-extrabold'; } 
                    else if (gvGoc && gvGoc !== gvcnLop[lop]) { textClass = 'text-slate-900 font-semibold'; }

                    let idMon = `mon_${thu}_${buoi}_${tiet}_${lop}`; let idGv = `gv_${thu}_${buoi}_${tiet}_${lop}`;
                    
                    let dropdownMon = taoTuyChonDong(thongSoHocVu.DANH_SACH_MON_HOC, monGoc, textClass, idMon, true, 'mon', duocSuaLopNay);
                    let dropdownGV = taoTuyChonDong(thongSoHocVu.DANH_SACH_GIAO_VIEN, gvGoc, textClass, idGv, true, 'gv', duocSuaLopNay);

                    // Các cột Môn và GV nhận styleVienChung (Gỡ bỏ class border cũ của Tailwind)
                    bufferHTML.push(`<td data-cotlop="${lop}" class="text-center p-0 align-middle ${bgLop} transition-all duration-300" style="${styleVienChung}">${dropdownMon}</td>`);
                    bufferHTML.push(`<td data-cotlop="${lop}" class="text-center p-0 align-middle ${bgLop} transition-all duration-300" style="${styleVienChung}">${dropdownGV}</td>`);
                });
                bufferHTML.push(`</tr>`);
            }
        });
    });
    
    // [KHÓA TKB]: Cập nhật dải banner cảnh báo niêm phong TKB Tuần
    let bannerKhoa = document.getElementById('bannerKhoaTkb');
    if (tuanNayDaKhoa) {
        if (!bannerKhoa) {
            let khungTKB = document.getElementById('khungTKB');
            if (khungTKB) {
                khungTKB.insertAdjacentHTML('afterbegin', `
                    <div id="bannerKhoaTkb" class="mb-2 p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center justify-between text-rose-900 font-bold text-xs shadow-sm">
                        <div class="flex items-center gap-2">
                            <div class="bg-rose-600 text-white rounded p-1 flex items-center justify-center">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <span class="text-xs md:text-sm font-extrabold uppercase tracking-wide">THỜI KHÓA BIỂU TUẦN ${tuanDangXem} ĐÃ ĐƯỢC NIÊM PHONG (KHÓA CHỈNH SỬA)</span>
                        </div>
                        <span class="italic text-[11px] text-rose-700 hidden sm:inline">Toàn bộ các ô trên lưới TKB đang ở chế độ Chỉ Xem. BGH/Quản trị viên cần Mở Khóa nếu muốn chỉnh sửa.</span>
                    </div>
                `);
            }
        } else {
            bannerKhoa.style.display = 'flex';
            let tieuDeBanner = bannerKhoa.querySelector('span.uppercase');
            if (tieuDeBanner) tieuDeBanner.innerText = `THỜI KHÓA BIỂU TUẦN ${tuanDangXem} ĐÃ ĐƯỢC NIÊM PHONG (KHÓA CHỈNH SỬA)`;
        }
    } else {
        if (bannerKhoa) bannerKhoa.style.display = 'none';
    }

    if (typeof window.capNhatTrangThaiNutKhoaTKBUI === 'function') {
        window.capNhatTrangThaiNutKhoaTKBUI(tuanDangXem);
    }

    tbody.innerHTML = bufferHTML.join('');
    if (typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang();
    if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
}

async function luuDuLieu(event, loaiLuu, tuDongLuu = false) {
    let coQuyenThaoTac = quyenSuaChua || (quyenChiTiet && (quyenChiTiet.lop.length > 0 || quyenChiTiet.nut.length > 0));
    if (!coQuyenThaoTac) return;
    if (loaiLuu === 'khoiphuc') {
        if (typeof thucThiChuyenTuanTiepTheo === 'function') {
            return await thucThiChuyenTuanTiepTheo(event);
        }
    }
    
    if (!tuDongLuu) {
        if (loaiLuu === 'codinh') { if (!confirm("CẢNH BÁO: Thao tác này sẽ ghi đè toàn bộ TKB hiện tại làm TKB Gốc Cố Định cho toàn trường. Bấm OK để tiếp tục.")) return; }
        if (loaiLuu === 'tuan') { if (!confirm(`Xác nhận: Xóa trắng và ghi đè toàn bộ dữ liệu Tuần ${tuanDangXem} trên máy chủ bằng nội dung Thời khoá biểu mặc định?`)) return; }
    }
    if (loaiLuu === 'tuan' || loaiLuu === 'khoiphuc') {
        if (typeof window.kiemTraTuanTkbDaKhoa === 'function' && window.kiemTraTuanTkbDaKhoa(tuanDangXem)) {
            alert(`⚠️ Thời khóa biểu Tuần ${tuanDangXem} đang bị KHÓA (Niêm phong). Đồng chí vui lòng Mở khóa trước khi lưu thay đổi!`);
            return;
        }
    }

    let nhanTacVuLuu = (loaiLuu === 'codinh') ? 'Đang lưu TKB Cố định' : ((loaiLuu === 'khoiphuc') ? 'Đang chuyển tuần mới' : 'Đang lưu TKB Tuần');
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, nhanTacVuLuu);

    const btn = event ? (event.currentTarget || event.target) : null; 
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
                let thu = parts[1], buoi = parts[2], tiet = parts[3], lop = parts.slice(4).join('_'); 
                
                setLopDangHienThi.add(lop); 
                
                let oGv = document.getElementById(`gv_${thu}_${buoi}_${tiet}_${lop}`);
                let valGv = oGv ? oGv.value.trim() : "";
                
                let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu, tuanDangXem);
                let namHocDung = namHocChuan || thongTinNgay.nam; 
                let tienToBuoi = (buoi === "Sáng") ? "S" : "C";
                
                let indexTrongRam = duLieuTkbHienTai.findIndex(t => 
                    String(t.tuan).trim() === String(tuanDangXem).trim() &&
                    String(t.thu).trim() === thu && 
                    String(t.buoi).trim() === buoi && 
                    String(t.tiet).trim() === String(tiet) && 
                    String(t.maLop).trim() === lop &&
                    (String(t.ngay).trim() === thongTinNgay.ngayDayDu || String(t.ngay).trim() === '') 
                );

                // Chuẩn hóa mã tiết đồng nhất: ${namHoc}_${tuan}_${thu}_${buoi}_${tiet}_${lop}
                let maTietNguyenBan = `${namHocDung}_${tuanDangXem}_${thu}_${tienToBuoi}_${tiet}_${lop}`;
                if (indexTrongRam !== -1 && duLieuTkbHienTai[indexTrongRam].maTiet) {
                    let maCu = String(duLieuTkbHienTai[indexTrongRam].maTiet).trim();
                    if (maCu.startsWith(namHocDung + '_' + tuanDangXem + '_')) {
                        maTietNguyenBan = maCu;
                    }
                }
                
                dsTietLuoi.push({
                    maTiet: maTietNguyenBan, 
                    namHoc: namHocDung, 
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
                if (!mangLopDangHienThi.includes(tietGoc.maLop) && tietGoc.monHoc && String(tietGoc.monHoc).trim() !== "") {
                    let thongTinNgayAn = tinhNgayDocLap(ngayDauTuanUI, tietGoc.thu, tuanDangXem);
                    let namHocAn = namHocChuan || tietGoc.namHoc || thongTinNgayAn.nam;
                    let tienToBuoiAn = (tietGoc.buoi === "Sáng") ? "S" : "C";
                    let maTietAn = `${namHocAn}_${tuanDangXem}_${tietGoc.thu}_${tienToBuoiAn}_${tietGoc.tiet}_${tietGoc.maLop}`;
                    dsTietLuoi.push({
                        ...tietGoc,
                        maTiet: (tietGoc.maTiet && String(tietGoc.maTiet).startsWith(namHocAn + '_' + tuanDangXem + '_')) ? tietGoc.maTiet : maTietAn,
                        namHoc: namHocAn,
                        tuan: tuanDangXem,
                        thang: thongTinNgayAn.thang,
                        ngay: thongTinNgayAn.ngayDayDu
                    });
                }
            });
        }

        if (dsTietLuoi.length === 0 && loaiLuu !== 'codinh') {
            if (loaiLuu === 'khoiphuc') await chuyenTuan(1); 
            return;
        }

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { 
            method: 'POST', 
            body: JSON.stringify({ thaoTac: 'luuDuLieu', loaiLuu: loaiLuu, tuan: tuanDangXem, duLieu: dsTietLuoi }) 
        });
        const ketQua = await phanHoi.json();
        
        if(ketQua.trangThai !== 'thanh_cong') { 
            alert("Lưu thất bại: " + ketQua.thongBao);
        } else { 
            if (loaiLuu === 'khoiphuc') {
                await chuyenTuan(1); 
                thongSoHocVu.TUAN_HIEN_TAI = tuanDangXem;
                let thongTinThu2Moi = tinhNgayDocLap(ngayDauTuanUI, "Thứ 2", tuanDangXem);
                if (thongTinThu2Moi && thongTinThu2Moi.ngayDayDu) {
                    thongSoHocVu.NGAY_K2 = thongTinThu2Moi.ngayDayDu;
                    thongSoHocVu.THU_K2 = "Thứ 2";
                }
                localStorage.setItem(layKhoaCachLy('SmartTKB_CauHinh'), JSON.stringify(thongSoHocVu));
                let btnAn = document.createElement('button'); btnAn.innerHTML = "Auto Save";
                // Chạy lưu ngầm cho tuần mới: Bỏ hoàn toàn thông báo xác nhận lặp lại và thông báo thành công
                await luuDuLieu({ currentTarget: btnAn }, 'tuan', true);
            } else {
                if (!tuDongLuu) {
                    alert("Đã lưu mới toàn bộ dữ liệu Thời khóa biểu tuần thành công!");
                }
                duLieuTkbHienTai = dsTietLuoi;
                
                document.querySelectorAll('td[data-thaydoi="true"]').forEach(td => {
                    td.removeAttribute('data-thaydoi');
                    let icon = td.querySelector('.icon-sua-chua');
                    if (icon) icon.remove();
                });

                localStorage.setItem(layKhoaCachLy('SmartTKB_DuLieuTuan'), JSON.stringify(dsTietLuoi));

                if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
                
                // [BẢN VÁ]: Chỉ kết xuất lại lưới TKB từ RAM, bỏ qua lệnh tải từ máy chủ để giảm độ trễ
                xuatMaTranBang(duLieuTkbHienTai);
                localStorage.setItem(layKhoaCachLy('KhoaDongBo_TKB'), Date.now().toString());
            }
        }
    } catch (loi) { 
        alert("Có sự cố trong quá trình kết nối đến máy chủ.");
    } finally { 
        if(btn && btn.disabled !== undefined) { btn.innerHTML = textGoc; btn.disabled = false; }
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
}

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
            // [BẢO ĐẢM KHỞI TẠO DOM MA TRẬN PHÂN QUYỀN]: Tự động nạp khung nếu chưa có trong DOM
            if (!khungDich && (idKhung === 'khungPhanQuyen' || (idKhung && idKhung.toLowerCase().includes('phanquyen')))) {
                if (typeof window.khoiTaoDOMPhanQuyen === 'function') {
                    window.khoiTaoDOMPhanQuyen();
                    khungDich = document.getElementById('khungPhanQuyen');
                }
            }
            if (khungDich) {
                khungDich.classList.remove('hidden');
                if (idKhung === 'khungTKB') {
                    khungDich.classList.add('block');
                    // [ĐỒNG BỘ TỨC THÌ KHI VỀ TKB]: Cập nhật ngay datalist và nạp ngầm cấu hình mới nhất
                    if (typeof window.capNhatDatalistTKB === 'function') window.capNhatDatalistTKB();
                    if (typeof window.dongBoDanhMucMonVaGiaoVien === 'function') window.dongBoDanhMucMonVaGiaoVien(false);
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
                if (idKhung === 'khungThongKe' && typeof taiCayDanhMucThongKe === 'function' && Object.keys(cayDanhMucThongKe || {}).length === 0) taiCayDanhMucThongKe();
                if (idKhung === 'khungPhanCong' && typeof taiDuLieuPhanCongTuMayChu === 'function' && typeof danhSachGV !== 'undefined' && danhSachGV.length === 0) taiDuLieuPhanCongTuMayChu();
                if (idKhung === 'khungDanhMucGV' && typeof taiDuLieuDanhMucGV === 'function' && typeof duLieuDanhMucGV !== 'undefined' && duLieuDanhMucGV.length === 0) taiDuLieuDanhMucGV();
                if (idKhung === 'khungKhungChuongTrinh' && typeof taiDuLieuKhungChuongTrinhTuMayChu === 'function' && typeof duLieuBangKCT !== 'undefined' && duLieuBangKCT.length === 0) taiDuLieuKhungChuongTrinhTuMayChu();
                if (idKhung === 'khungCaiDat' && typeof taiDuLieuCaiDatHeThong === 'function' && typeof dsThamSo !== 'undefined' && dsThamSo.length === 0) taiDuLieuCaiDatHeThong();
                if (idKhung === 'khungDanhMucLop' && typeof taiDuLieuDanhMucLop === 'function' && typeof duLieuDanhMucLop !== 'undefined' && duLieuDanhMucLop.length === 0) taiDuLieuDanhMucLop();
                if (idKhung === 'khungDanhMucSGK' && typeof taiLaiDuLieuDanhMucSGK === 'function') taiLaiDuLieuDanhMucSGK();
                if (idKhung === 'khungSoDauBai' && typeof taiDuLieuSoDauBaiTuMayChu === 'function') taiDuLieuSoDauBaiTuMayChu();
                
                // [KÍCH HOẠT NẠP DỮ LIỆU MA TRẬN PHÂN QUYỀN]:
                if (idKhung === 'khungPhanQuyen' || (idKhung && idKhung.toLowerCase().includes('phanquyen'))) {
                    if (typeof window.taiDuLieuPhanQuyenTuMayChu === 'function') {
                        window.taiDuLieuPhanQuyenTuMayChu();
                    }
                }

                if (idKhung && (idKhung.toLowerCase().includes('phanphoi') || idKhung.toLowerCase().includes('ppct'))) {
                    if (typeof taiDuLieuPhanPhoiChuongTrinh === 'function') taiDuLieuPhanPhoiChuongTrinh();
                    if (typeof taiDuLieuPPCT === 'function') taiDuLieuPPCT();
                }
            } catch (loiData) { console.error("Lỗi động cơ tải dữ liệu:", loiData); }
        }, 50); 
    } catch (loiUI) { console.error("Sự cố chuyển giao diện UI:", loiUI); }
};

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
            if (nutDangNhap) { nutDangNhap.innerHTML = htmlGoc; nutDangNhap.classList.remove('cursor-wait', 'opacity-80'); }
            khoiDongDangNhap();
        }, 1000);
        return;
    }

    dangXuLyDangNhap = true;
    if (nutDangNhap) nutDangNhap.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-semibold ml-2">Đang kết nối...</span>`;

    if (!clientDangNhapG) {
        clientDangNhapG = google.accounts.oauth2.initTokenClient({
            client_id: SKT_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            use_fedcm_for_prompt: true,
            callback: (phanHoiToken) => {
                dangXuLyDangNhap = false; 
                if (phanHoiToken && phanHoiToken.access_token) xuLyLayThongTin(phanHoiToken.access_token);
                else if (nutDangNhap) nutDangNhap.innerHTML = htmlGoc; 
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
        const phanHoi = await fetchVoiCoCheThuLai('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${maTokenTruyCap}` } });
        const duLieuXacThuc = await phanHoi.json();
        
        const tuKhoaDinhDanh = 'em' + 'ail'; 
        const dinhDanhHeThong = duLieuXacThuc[tuKhoaDinhDanh]; 
        const tenHienThi = duLieuXacThuc.name; 
        const anhDaiDien = duLieuXacThuc.picture;
        
        window.dinhDanhGiaoVienToanCuc = dinhDanhHeThong;

        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<img src="${anhDaiDien}" class="w-6 h-6 rounded-full border border-white" title="Tài khoản: ${tenHienThi}"><span class="truncate text-sm font-semibold group-hover:text-red-300 transition-colors">Đăng xuất</span>`;
            nutDangNhap.classList.replace('bg-slate-700', 'bg-slate-800'); 
            nutDangNhap.classList.replace('hover:bg-slate-600', 'hover:bg-red-700');
            nutDangNhap.classList.replace('border-slate-500', 'border-red-500'); 
            nutDangNhap.onclick = function() {
                if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) window.location.reload();
            }; 
        }

        const dsQuanTri = thongSoHocVu.DANH_SACH_QUAN_TRI || [];
        const dinhDanhGoc = 'tulieuhopthanh@gmail.com'; 
        const emailDinhDanhChuan = String(dinhDanhHeThong || '').trim().toLowerCase();

        let laQuanTriVien = (emailDinhDanhChuan === dinhDanhGoc.toLowerCase()) ||
                            dsQuanTri.some(q => String(q).trim().toLowerCase() === emailDinhDanhChuan);

        if (laQuanTriVien) quyenSuaChua = true; 
        else quyenSuaChua = false; 
        
        quyenChiTiet = { menu: [], nut: [], lop: [] }; 
        if (thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
            for (let k in thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
                let kChuan = String(k).trim().toLowerCase();
                if (kChuan === emailDinhDanhChuan || kChuan === String(dinhDanhHeThong).trim()) {
                    let objPQ = thongSoHocVu.MA_TRAN_PHAN_QUYEN[k] || {};
                    quyenChiTiet.menu = objPQ.menu || [];
                    quyenChiTiet.nut = objPQ.nut || [];
                    quyenChiTiet.lop = objPQ.lop || [];
                    break;
                }
            }
        }
        
        kiemSoatGiaoDien(); 

        let khungSDB = document.getElementById('khungSoDauBai');
        
        if (khungSDB && !khungSDB.classList.contains('hidden')) {
            if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
        } else {
            if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai(); 
            
            if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                xuatMaTranBang(duLieuTkbHienTai); 
            } else {
                await taiDuLieuTKB(false, 'TKB_HIEN_TAI', true); 
            }
            localStorage.setItem(layKhoaCachLy('KhoaDongBo_TKB'), Date.now().toString());
        }

    } catch (loi) { 
        console.error("Xác thực không thành công.", loi); 
        if (nutDangNhap) nutDangNhap.innerHTML = `<span class="text-sm font-bold text-red-200">Lỗi kết nối</span>`;
    }
}

async function xuatExcel() {
    let mangLop = thongSoHocVu.DANH_SACH_LOP || [];
    if (mangLop.length === 0 && duLieuTkbHienTai.length > 0) mangLop = [...new Set(duLieuTkbHienTai.map(t => t.maLop))].sort();
    if (mangLop.length === 0) { alert("Không có dữ liệu để xuất."); return; }

    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang xuất Excel');
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
        mangLop.forEach(lop => { header1.push(lop); header1.push(''); });
        worksheet.addRow(header1);

        let header2 = ['', '', ''];
        mangLop.forEach(() => { header2.push('Môn'); header2.push('N dạy'); });
        worksheet.addRow(header2);

        worksheet.mergeCells('A1:A2'); worksheet.mergeCells('B1:B2'); worksheet.mergeCells('C1:C2');
        let cotHienTai = 4;
        mangLop.forEach(() => { worksheet.mergeCells(1, cotHienTai, 1, cotHienTai + 1); cotHienTai += 2; });

        let gvLoc = document.getElementById('locGiaoVien') ? document.getElementById('locGiaoVien').value.trim() : '';
        const luoiDuLieu = {}; 
        
        duLieuTkbHienTai.forEach(t => {
            const thu = t.thu.trim(); const buoi = t.buoi.trim(); const tiet = t.tiet;
            if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; 
            if (!luoiDuLieu[thu][buoi]) luoiDuLieu[thu][buoi] = {}; 
            if (!luoiDuLieu[thu][buoi][tiet]) luoiDuLieu[thu][buoi][tiet] = {};
            luoiDuLieu[thu][buoi][tiet][t.maLop] = t;
        });

        const thuMacDinh = window.layDanhSachThuDong(ngayDauTuanUI);
        thuMacDinh.forEach(thu => { if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; });
        
        const gioiHanSang = Math.max(parseInt(thongSoHocVu.SO_TIET_SANG) || 4, 5); 
        const gioiHanChieu = Math.max(parseInt(thongSoHocVu.SO_TIET_CHIEU) || 3, 4);

        Object.keys(luoiDuLieu).forEach(thu => {
            if (!luoiDuLieu[thu]["Sáng"]) luoiDuLieu[thu]["Sáng"] = {}; 
            if (!luoiDuLieu[thu]["Chiều"]) luoiDuLieu[thu]["Chiều"] = {};
            for (let i = 1; i <= gioiHanSang; i++) { if (!luoiDuLieu[thu]["Sáng"][i]) luoiDuLieu[thu]["Sáng"][i] = {}; }
            for (let j = 1; j <= gioiHanChieu; j++) { if (!luoiDuLieu[thu]["Chiều"][j]) luoiDuLieu[thu]["Chiều"][j] = {}; }
        });

        const boLocBuoi = {"Sáng": 1, "Chiều": 2};
        const danhSachThu = Object.keys(luoiDuLieu).sort((a, b) => {
            let idxA = thuMacDinh.indexOf(a);
            let idxB = thuMacDinh.indexOf(b);
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
        });
        
        let currentRow = 3;

        danhSachThu.forEach(thu => {
            const danhSachBuoi = Object.keys(luoiDuLieu[thu]).sort((a, b) => (boLocBuoi[a] || 99) - (boLocBuoi[b] || 99));
            let startRowThu = currentRow;
            let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu, tuanDangXem);

            danhSachBuoi.forEach(buoi => {
                const danhSachTietCuaBuoi = Object.keys(luoiDuLieu[thu][buoi]).sort((a, b) => parseInt(a) - parseInt(b));
                let startRowBuoi = currentRow;

                danhSachTietCuaBuoi.forEach(tiet => {
                    let rowData = [];
                    rowData.push(`${thu}\n(${thongTinNgay.hienThi})`); rowData.push(buoi); rowData.push(tiet);

                    mangLop.forEach(lop => {
                        let selectMon = document.getElementById(`mon_${thu}_${buoi}_${tiet}_${lop}`);
                        let selectGv = document.getElementById(`gv_${thu}_${buoi}_${tiet}_${lop}`);
                        let valMon = selectMon ? selectMon.value.trim() : "";
                        let valGv = selectGv ? selectGv.value.trim() : "";
                        let isTarget = true;
                        
                        if (gvLoc !== "" && gvLoc !== "Toàn trường" && valGv !== gvLoc) isTarget = false;

                        if (!isTarget || valMon === "") { rowData.push(""); rowData.push(""); } 
                        else { rowData.push(valMon); rowData.push(valGv); }
                    });
                    
                    worksheet.addRow(rowData);

                    let colIdx = 4;
                    mangLop.forEach(() => {
                        worksheet.getCell(currentRow, colIdx).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`DANH_MUC!$A$1:$A$${dsMon.length}`] };
                        worksheet.getCell(currentRow, colIdx + 1).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`DANH_MUC!$B$1:$B$${dsGV.length}`] };
                        colIdx += 2;
                    });
                    currentRow++;
                });
                
                if (currentRow - 1 > startRowBuoi) worksheet.mergeCells(startRowBuoi, 2, currentRow - 1, 2); 
            });
            if (currentRow - 1 > startRowThu) worksheet.mergeCells(startRowThu, 1, currentRow - 1, 1); 
        });

      // =========================================================================
        // NÂNG CẤP: ĐỊNH DẠNG NÉT KẺ BẢNG EXCEL TKB (Màu đen, Nét đứt tiết, Nét liền buổi)
        // =========================================================================
        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            // Lấy thông tin Buổi và Tiết từ các cột cố định (Cột 2, Cột 3)
            let buoi = row.getCell(2).value ? row.getCell(2).value.toString().trim() : "";
            let tiet = parseInt(row.getCell(3).value) || 0;

            row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                
                if (rowNumber <= 2) {
                    // Dòng Header: Viền đen liền, nét đáy đậm (medium) để chia tách với nội dung
                    cell.border = { 
                        top: {style:'thin', color: {argb:'FF000000'}}, 
                        left: {style:'thin', color: {argb:'FF000000'}}, 
                        bottom: {style:'medium', color: {argb:'FF000000'}}, 
                        right: {style:'thin', color: {argb:'FF000000'}} 
                    };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: {argb:'FF000000'} };
                } else {
                    cell.font = { name: 'Times New Roman', size: 12 };
                    
                    // Xác định tiết học để nội suy nét kẻ
                    let isCuoiBuoi = false;
                    if (buoi === "Sáng" && tiet === gioiHanSang) isCuoiBuoi = true;
                    if (buoi === "Chiều" && tiet === gioiHanChieu) isCuoiBuoi = true;

                    // Tiết đầu tiên của buổi dùng nét liền đậm (medium), các tiết giữa dùng nét đứt (dashed)
                    let kieuVienTren = (tiet === 1) ? 'medium' : 'dashed';
                    let kieuVienDuoi = isCuoiBuoi ? 'medium' : 'dashed';

                    // Cột dọc luôn luôn là nét liền (thin). Viền ngang sẽ tự động điều chỉnh theo vị trí tiết
                    cell.border = {
                        top: {style: kieuVienTren, color: {argb:'FF000000'}},
                        left: {style:'thin', color: {argb:'FF000000'}},
                        bottom: {style: kieuVienDuoi, color: {argb:'FF000000'}},
                        right: {style:'thin', color: {argb:'FF000000'}}
                    };
                }
            });
        });

        worksheet.getColumn(1).width = 14; worksheet.getColumn(2).width = 10; worksheet.getColumn(3).width = 6;
        for(let i = 4; i < 4 + mangLop.length * 2; i++) { worksheet.getColumn(i).width = 15; }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        let tenTuan = "ThoiKhoaBieu";
        let spanTuan = document.getElementById('hienThiTuanHienTai');
        if (spanTuan && spanTuan.innerText) tenTuan = `TKB_${spanTuan.innerText.trim().replace(/\s+/g, '_')}`;
        
        link.download = `${tenTuan}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
        
    } catch (loi) {
        console.error("Lỗi xuất Excel:", loi);
        alert("Có lỗi xảy ra trong quá trình tạo file Excel. Hãy kiểm tra kết nối mạng.");
    } finally { 
        if (btn) btn.innerHTML = textGoc; 
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
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
                    if (khung.id === 'khungSoDauBai' && menuDuocBam.id !== 'menuSoDauBai') { khung.classList.add('hidden'); khung.classList.remove('flex', 'block'); }
                    if (khung.id === 'khungDanhMucSGK' && menuDuocBam.id !== 'menuDanhMucSGK') { khung.classList.add('hidden'); khung.classList.remove('flex', 'block'); }
                    let laMenuPPCT = menuDuocBam.id.includes('PhanPhoi') || menuDuocBam.id.includes('PPCT');
                    let laKhungPPCT = khung.id.includes('PhanPhoi') || khung.id.includes('PPCT');
                    if (laKhungPPCT && !laMenuPPCT) { khung.classList.add('hidden'); khung.classList.remove('flex', 'block'); }
                }
            });
        }, 20);
    }
});

let _timerKiemTraTrungGV = null;

function thucThiKiemTraTrungGiaoVienToanBang() {
    const thuMacDinh = window.layDanhSachThuDong(ngayDauTuanUI);
    const buoiMacDinh = ["Sáng", "Chiều"];
    const khung = thongSoHocVu.KHUNG_CHUONG_TRINH || {};
    let keyUuTien = "";
    for (let k in khung) {
        if (k.toLowerCase().replace(/\s+/g, '').indexOf("ưutiên") !== -1 || k.toLowerCase().replace(/\s+/g, '').indexOf("uutien") !== -1) { keyUuTien = k; break; }
    }
    const uuTienMon = keyUuTien ? khung[keyUuTien] : {};

    let setLopUI = new Set();
    document.querySelectorAll('th[data-cotlop]').forEach(th => setLopUI.add(th.getAttribute('data-cotlop')));

    // [TỐI ƯU HÓA ĐỘT PHÁ]: Quét 1 lần duy nhất toàn bộ ô GV trên DOM thay vì 60 lần quét lặp lại
    const mapGvTheoTiet = {};
    const tatCaOGv = document.querySelectorAll('input[id^="gv_"]');
    tatCaOGv.forEach(oGv => {
        let tenGv = oGv.value.trim();
        if (tenGv !== "" && tenGv !== "--") {
            let parts = oGv.id.split('_');
            if (parts.length >= 5) {
                let slotKey = `${parts[1]}_${parts[2]}_${parts[3]}`;
                if (!mapGvTheoTiet[slotKey]) mapGvTheoTiet[slotKey] = [];
                let theMon = document.getElementById(`mon_${parts[1]}_${parts[2]}_${parts[3]}_${parts.slice(4).join('_')}`);
                let monHoc = theMon ? theMon.value.trim() : "";
                mapGvTheoTiet[slotKey].push({ tenGv, monHoc, lop: parts.slice(4).join('_') });
            }
        }
    });

    const mapTkbAnTheoTiet = {};
    if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
        duLieuTkbHienTai.forEach(tietGoc => {
            if (tietGoc.maGv && !setLopUI.has(tietGoc.maLop)) {
                let slotKey = `${tietGoc.thu}_${tietGoc.buoi}_${parseInt(tietGoc.tiet)}`;
                if (!mapTkbAnTheoTiet[slotKey]) mapTkbAnTheoTiet[slotKey] = [];
                mapTkbAnTheoTiet[slotKey].push(tietGoc);
            }
        });
    }

    thuMacDinh.forEach(thu => {
        buoiMacDinh.forEach(buoi => {
            for (let tiet = 1; tiet <= 5; tiet++) {
                let oTiet = document.getElementById(`oTiet_${thu}_${buoi}_${tiet}`);
                if (!oTiet) continue;

                let slotKey = `${thu}_${buoi}_${tiet}`;
                let demGv = {}; let chiTietLop = {};

                let dsAn = mapTkbAnTheoTiet[slotKey];
                if (dsAn) {
                    dsAn.forEach(tietGoc => {
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
                    });
                }

                let dsHien = mapGvTheoTiet[slotKey];
                if (dsHien) {
                    dsHien.forEach(item => {
                        let ut = parseInt(uuTienMon[item.monHoc]) || 99;
                        if (ut !== 1 && ut !== 6) {
                            demGv[item.tenGv] = (demGv[item.tenGv] || 0) + 1;
                            if (!chiTietLop[item.tenGv]) chiTietLop[item.tenGv] = [];
                            chiTietLop[item.tenGv].push(item.lop);
                        }
                    });
                }

                let mangTrung = [];
                for (let gv in demGv) { if (demGv[gv] > 1) mangTrung.push(`${gv} (${chiTietLop[gv].join(', ')})`); }

                let vungCanhBao = oTiet.querySelector('.vung-canh-bao-gv');
                if (vungCanhBao) {
                    if (mangTrung.length > 0) {
                        let hienThiNgan = Object.keys(demGv).filter(gv => demGv[gv] > 1);
                        vungCanhBao.innerHTML = `<div class="text-[10px] text-red-600 font-extrabold leading-tight max-w-[45px] mx-auto truncate cursor-help" title="Lỗi trùng lịch: ${mangTrung.join(' | ')}">${hienThiNgan.join('<br>')}</div>`;
                    } else vungCanhBao.innerHTML = '';
                }
            }
        });
    });
}

// Hàm chuẩn hóa toàn cục: Hỗ trợ cả gọi ngay lập tức lẫn trễ nhịp 150ms chống giật khi đang gõ phím
window.kiemTraTrungGiaoVienToanBang = function(ngayLapTuc = false) {
    if (ngayLapTuc) {
        if (_timerKiemTraTrungGV) clearTimeout(_timerKiemTraTrungGV);
        thucThiKiemTraTrungGiaoVienToanBang();
        return;
    }
    if (_timerKiemTraTrungGV) clearTimeout(_timerKiemTraTrungGV);
    _timerKiemTraTrungGV = setTimeout(thucThiKiemTraTrungGiaoVienToanBang, 150);
};

async function nhapExcelTKB(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 1. Kiểm tra an ninh bảo mật kép (Chống hack mở DOM UI)
    let quyenCongKhai = (typeof window.layQuyenCongKhaiHienTai === 'function') ? window.layQuyenCongKhaiHienTai() : { nut: [] };
    let nutCongKhai = quyenCongKhai.nut || [];
    let nutDuocCap = (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut) ? quyenChiTiet.nut : [];
    let coQuyenNhap = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) || nutDuocCap.includes('btnNhapExcelTKB') || nutCongKhai.includes('btnNhapExcelTKB');

    if (!coQuyenNhap) {
        alert("⛔ TỪ CHỐI TRUY CẬP:\nTài khoản của đồng chí chưa được cấp quyền [Nhập Excel] trong Ma trận phân quyền!");
        event.target.value = "";
        return;
    }

    // 2. Chặn can thiệp nếu Tuần đang bị Khóa (Niêm phong)
    if (typeof window.kiemTraTuanTkbDaKhoa === 'function' && window.kiemTraTuanTkbDaKhoa(tuanDangXem)) {
        alert(`⚠️ Thời khóa biểu Tuần ${tuanDangXem} đang bị KHÓA (Niêm phong). Đồng chí vui lòng Mở khóa trước khi nhập Excel!`);
        event.target.value = "";
        return;
    }

    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang nạp Excel');
    try {
        if (typeof XLSX === 'undefined') { alert("Thư viện hệ thống chưa sẵn sàng."); return; }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                // Nhận diện tự động đúng sheet TKB thay vì cố định sheet 0
                const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('TKB')) || workbook.SheetNames[0]; 
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

                if (jsonData.length < 3) { alert("Tệp Excel tải lên không đúng chuẩn biểu mẫu của hệ thống."); return; }

                const headerLop = jsonData[0];
                const danhSachLopCol = [];
                
                for (let i = 3; i < headerLop.length; i += 2) {
                    if (headerLop[i] && headerLop[i].toString().trim() !== "") danhSachLopCol.push({ tenLop: headerLop[i].toString().trim(), colIndex: i });
                }

                let thuHienTai = ""; let buoiHienTai = "";
                let soOThayDoi = 0;

                for (let r = 2; r < jsonData.length; r++) {
                    const row = jsonData[r];
                    if (!row || row.length === 0) continue;

                    if (row[0] && row[0].toString().trim() !== "") thuHienTai = row[0].toString().split('\n')[0].trim();
                    if (row[1] && row[1].toString().trim() !== "") buoiHienTai = row[1].toString().trim();
                    let tiet = row[2] ? row[2].toString().trim() : "";
                    if (!thuHienTai || !buoiHienTai || !tiet) continue;

                    danhSachLopCol.forEach(lopInfo => {
                        let monVal = row[lopInfo.colIndex] ? row[lopInfo.colIndex].toString().trim() : "";
                        let gvVal = row[lopInfo.colIndex + 1] ? row[lopInfo.colIndex + 1].toString().trim() : "";
                        
                        // Nắn chỉnh khoảng trống (Dấu gạch ngang biểu diễn xóa trống)
                        if (monVal === "---" || monVal === "--") monVal = "";
                        if (gvVal === "---" || gvVal === "--") gvVal = "";

                        let theMon = document.getElementById(`mon_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);
                        let theGv = document.getElementById(`gv_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);

                        // [LÕI SỬA LỖI]: Bắt buộc đánh dấu cờ thay đổi để hệ thống nhận diện thao tác Lưu (Chỉ áp dụng với ô được sửa đổi)
                        let oBiDoi = false;
                        if (theMon && !theMon.disabled && theMon.value !== monVal) {
                            theMon.value = monVal;
                            if (typeof window.danhDauDongThayDoiTKB === 'function') window.danhDauDongThayDoiTKB(theMon);
                            oBiDoi = true;
                        }
                        if (theGv && !theGv.disabled && theGv.value !== gvVal) {
                            theGv.value = gvVal;
                            if (typeof window.danhDauDongThayDoiTKB === 'function') window.danhDauDongThayDoiTKB(theGv);
                            oBiDoi = true;
                        }
                        
                        if (oBiDoi) {
                            soOThayDoi++;
                            if (typeof window.xacThucGiaTriHopLe === 'function') {
                                if (theMon) window.xacThucGiaTriHopLe(theMon, 'mon');
                                if (theGv) window.xacThucGiaTriHopLe(theGv, 'gv');
                            }
                        }
                    });
                }
                
                if (typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang(true);
                alert(`✅ Đã kết xuất dữ liệu từ Excel lên giao diện thành công!\n- Số vị trí ô được cập nhật: ${soOThayDoi}\n\nĐồng chí vui lòng kiểm tra lại trên lưới và bấm [Lưu Sửa] hoặc [Lưu TKB Tuần] để chốt dữ liệu vào máy chủ.`);
            } catch (errParse) { console.error("Lỗi phân tích cú pháp tệp Excel: ", errParse); alert("Sự cố xảy ra khi trích xuất dữ liệu biểu mẫu."); }
        };
        reader.readAsArrayBuffer(file);
    } catch (loi) { console.error("Lỗi cục bộ: ", loi); alert("Sự cố tải tệp Excel."); } 
    finally { 
        event.target.value = ""; 
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
}

async function luuSuaCucBoTKB(event) {
    if (typeof window.kiemTraTuanTkbDaKhoa === 'function' && window.kiemTraTuanTkbDaKhoa(tuanDangXem)) {
        alert(`⚠️ Thời khóa biểu Tuần ${tuanDangXem} đang bị KHÓA. Đồng chí vui lòng Mở khóa trước khi lưu sửa!`);
        return;
    }
    const btn = event.currentTarget; 
    const textGoc = btn.innerHTML;
    
    let dsThayDoi = [];
    let dsTietLuoi = [];
    let setLopDangHienThi = new Set();
    let danhSachThongBao = []; 
    let namHocChuan = thongSoHocVu.NAM_HOC || "";
    let cacOMon = document.querySelectorAll('input[id^="mon_"]');
    
    cacOMon.forEach(oMon => {
        let parts = oMon.id.split('_'); 
        let thu = parts[1], buoi = parts[2], tiet = parts[3], lop = parts.slice(4).join('_'); 
        setLopDangHienThi.add(lop);
        
        let oGv = document.getElementById(`gv_${thu}_${buoi}_${tiet}_${lop}`);
        let tdMon = oMon.closest('td');
        let tdGv = oGv ? oGv.closest('td') : null;

        let valMon = oMon.value.trim();
        let valGv = oGv ? oGv.value.trim() : "";
        
        let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu, tuanDangXem);
        let namHocDung = namHocChuan || thongTinNgay.nam;
        let tienToBuoi = (buoi === "Sáng") ? "S" : "C";
        
        let indexTrongRam = duLieuTkbHienTai.findIndex(t => 
            parseInt(String(t.tuan).replace(/\D/g, ''), 10) === parseInt(String(tuanDangXem).replace(/\D/g, ''), 10) &&
            String(t.maLop).trim().toUpperCase() === lop.trim().toUpperCase() &&
            String(t.thu).trim().toLowerCase() === thu.trim().toLowerCase() &&
            String(t.buoi).trim().toLowerCase() === buoi.trim().toLowerCase() &&
            String(t.tiet).trim() === String(tiet).trim()
        );

        // Chuẩn hóa mã tiết đồng nhất: ${namHoc}_${tuan}_${thu}_${buoi}_${tiet}_${lop}
        let maTietNguyenBan = `${namHocDung}_${tuanDangXem}_${thu}_${tienToBuoi}_${tiet}_${lop}`;
        if (indexTrongRam !== -1 && duLieuTkbHienTai[indexTrongRam].maTiet) {
            let maCu = String(duLieuTkbHienTai[indexTrongRam].maTiet).trim();
            if (maCu.startsWith(namHocDung + '_' + tuanDangXem + '_')) {
                maTietNguyenBan = maCu;
            }
        }

        if (valMon !== "") {
            dsTietLuoi.push({
                maTiet: maTietNguyenBan, 
                namHoc: namHocDung, 
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

        let coSuThayDoiDOM = (tdMon && tdMon.getAttribute('data-thaydoi') === 'true') || (tdGv && tdGv.getAttribute('data-thaydoi') === 'true');

        if (coSuThayDoiDOM) {
            let tietGoc = indexTrongRam !== -1 ? duLieuTkbHienTai[indexTrongRam] : duLieuTkbHienTai.find(t => String(t.maTiet).trim() === maTietNguyenBan);
            let monGoc = tietGoc ? (tietGoc.monHoc || "").trim() : "";
            let gvGoc = tietGoc ? (tietGoc.maGv || "").trim() : "";
            
            let msg = `- ${lop} (${thu}, T${tiet}): `;
            if (valMon === "" && valGv === "") msg += `Xóa trắng tiết`;
            else if (monGoc === "" && gvGoc === "") msg += `Thêm mới [Môn: ${valMon || '--'}, GV: ${valGv || '--'}]`;
            else {
                let chiTiet = [];
                if (valMon !== monGoc) chiTiet.push(`Môn [${monGoc || '--'}] -> [${valMon || '--'}]`);
                if (valGv !== gvGoc) chiTiet.push(`GV [${gvGoc || '--'}] -> [${valGv || '--'}]`);
                if (chiTiet.length === 0) chiTiet.push(`Cập nhật thông số`); 
                msg += chiTiet.join(' | ');
            }
            danhSachThongBao.push(msg);

            dsThayDoi.push({ 
                maTiet: maTietNguyenBan, 
                namHoc: namHocDung, 
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
            if (!mangLopDangHienThi.includes(tietGoc.maLop) && tietGoc.monHoc && String(tietGoc.monHoc).trim() !== "") {
                let thongTinNgayAn = tinhNgayDocLap(ngayDauTuanUI, tietGoc.thu, tuanDangXem);
                let namHocAn = namHocChuan || tietGoc.namHoc || thongTinNgayAn.nam;
                let tienToBuoiAn = (tietGoc.buoi === "Sáng") ? "S" : "C";
                let maTietAn = `${namHocAn}_${tuanDangXem}_${tietGoc.thu}_${tienToBuoiAn}_${tietGoc.tiet}_${tietGoc.maLop}`;
                dsTietLuoi.push({
                    ...tietGoc,
                    maTiet: (tietGoc.maTiet && String(tietGoc.maTiet).startsWith(namHocAn + '_' + tuanDangXem + '_')) ? tietGoc.maTiet : maTietAn,
                    namHoc: namHocAn,
                    tuan: tuanDangXem,
                    thang: thongTinNgayAn.thang,
                    ngay: thongTinNgayAn.ngayDayDu
                });
            }
        });
    }

    let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
    let laTuanHienTai = (parseInt(tuanDangXem, 10) === tuanHeThong);

    if (dsThayDoi.length === 0 && (!laTuanHienTai || dsTietLuoi.length === 0)) {
        alert("Lưới Thời khóa biểu chưa có thay đổi nào để lưu.");
        return;
    }

    if (dsThayDoi.length > 0) {
        let thongBaoGiaoDien = `Hệ thống ghi nhận ${dsThayDoi.length} tiết có sự thay đổi:\n\n` + danhSachThongBao.slice(0, 15).join('\n') + (danhSachThongBao.length > 15 ? `\n... và ${danhSachThongBao.length - 15} thay đổi khác.` : "") + `\n\nĐồng chí có chắc chắn muốn chốt ghi đè dữ liệu này?`;
        if (!confirm(thongBaoGiaoDien)) return;
    }

    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang lưu sửa TKB');
    if (btn && btn.disabled !== undefined) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`; 
        btn.disabled = true;
    }

    try {
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({
                thaoTac: 'luuSuaTkbHienTai',
                tuan: tuanDangXem,
                laTuanHienTai: laTuanHienTai,
                duLieu: dsThayDoi,
                duLieuToanLuoi: dsTietLuoi
            })
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'khong_thay_doi') {
            alert("Lưới Thời khóa biểu chưa có thay đổi nào để lưu.");
        } else if (ketQua.trangThai !== 'thanh_cong') {
            alert("Lưu thất bại: " + ketQua.thongBao);
        } else { 
           // alert("Đã cập nhật các thay đổi vào Thời khóa biểu Hiện tại!");
            if (ketQua.daGhiToanBo) {
                duLieuTkbHienTai = dsTietLuoi;
            } else {
                dsThayDoi.forEach(tietMoi => {
                    let idx = duLieuTkbHienTai.findIndex(t => 
                        parseInt(String(t.tuan).replace(/\D/g, ''), 10) === parseInt(String(tietMoi.tuan).replace(/\D/g, ''), 10) &&
                        String(t.maLop).trim().toUpperCase() === String(tietMoi.maLop).trim().toUpperCase() &&
                        String(t.thu).trim().toLowerCase() === String(tietMoi.thu).trim().toLowerCase() &&
                        String(t.buoi).trim().toLowerCase() === String(tietMoi.buoi).trim().toLowerCase() &&
                        String(t.tiet).trim() === String(tietMoi.tiet).trim()
                    );
                    if (idx !== -1) {
                        duLieuTkbHienTai[idx] = { ...duLieuTkbHienTai[idx], ...tietMoi };
                    } else {
                        duLieuTkbHienTai.push(tietMoi);
                    }
                });
            }
            
            document.querySelectorAll('td[data-thaydoi="true"]').forEach(td => {
                td.removeAttribute('data-thaydoi');
                let icon = td.querySelector('.icon-sua-chua');
                if (icon) icon.remove();
            });

            localStorage.setItem(layKhoaCachLy('SmartTKB_DuLieuTuan'), JSON.stringify(duLieuTkbHienTai));
            localStorage.setItem(layKhoaCachLy('KhoaDongBo_TKB'), Date.now().toString());
            if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
        }
    } catch (loi) { alert("Có sự cố trong quá trình kết nối đến máy chủ."); } 
    finally { 
        if (btn && btn.disabled !== undefined) { btn.innerHTML = textGoc; btn.disabled = false; }
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
}

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

window.dongBoChuanHoaDuLieuUI = async function() {
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang chuẩn hóa');
    let btn = document.getElementById('btnDongBoChuan');
    let textGoc = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1"></div> Đang đồng bộ...`;
        btn.disabled = true;
    }

    try {
        // [NÂNG CẤP CHỐNG LỖI CỐT LÕI]: Chủ động tải lại Danh mục Môn học & Giáo viên mới nhất từ máy chủ
        // để chắc chắn mọi thay đổi từ Khung chương trình và Danh mục GV được nạp trước khi chuẩn hóa
        if (typeof window.dongBoDanhMucMonVaGiaoVien === 'function') {
            await window.dongBoDanhMucMonVaGiaoVien(false);
        }
    } catch (eDongBo) {
        console.warn("Không thể tải cấu hình mới trước khi chuẩn hóa:", eDongBo);
    }

    const dsMonGoc = thongSoHocVu.DANH_SACH_MON_HOC || [];
    const dsGvGoc = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];

    if (dsMonGoc.length === 0 && dsGvGoc.length === 0) {
        if (btn) { btn.innerHTML = textGoc; btn.disabled = false; }
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
        alert("⚠️ Lỗi hệ thống: Chưa nạp được Danh mục Môn học và Giáo viên. Vui lòng kiểm tra lại kết nối mạng!");
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

    if (btn) { btn.innerHTML = textGoc; btn.disabled = false; }
    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    if (typeof window.capNhatDatalistTKB === 'function') window.capNhatDatalistTKB();

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

let _timerLocLop = null;
window.locTheoLop = function() {
    if (_timerLocLop) clearTimeout(_timerLocLop);
    _timerLocLop = setTimeout(() => {
        let theLocLop = document.getElementById('locLopHoc');
        if (!theLocLop) return;
        
        let chuoiLoc = theLocLop.value.trim().toUpperCase(); 
        let tatCaCacCot = document.querySelectorAll('[data-cotlop]');

        // Nếu xóa trắng hoặc chọn "Toàn trường", hiển thị lại tất cả các cột
        if (chuoiLoc === "" || chuoiLoc === "TOÀN TRƯỜNG") {
            tatCaCacCot.forEach(cot => cot.classList.remove('hidden'));
            
            // Kích hoạt lại lọc giáo viên (nếu đang lọc dở) để đồng bộ 2 bộ lọc
            let locGV = document.getElementById('locGiaoVien');
            if (locGV && locGV.value.trim() !== "" && locGV.value.trim() !== "Toàn trường") {
                if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
            }
            return;
        }

        // Tách chuỗi đa lớp bằng dấu phẩy
        let danhSachLoc = chuoiLoc.split(',').map(s => s.trim()).filter(s => s !== "");

        // Hỗ trợ mảng Regex để bắt ký tự đại diện * (Ví dụ: 6A, 7* sẽ lọc lớp 6A và toàn bộ khối 7)
        let mangRegex = danhSachLoc.map(chuoi => {
            let chuoiAnToan = chuoi.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
            return new RegExp("^" + chuoiAnToan.join('.*') + "$");
        });

        // Ẩn/hiện cột lớp
        tatCaCacCot.forEach(cot => {
            let tenLopCuaCot = cot.getAttribute('data-cotlop').toUpperCase();
            
            // Nếu cột khớp với BẤT KỲ điều kiện lớp nào trong mảng tìm kiếm
            let coKhop = mangRegex.some(regex => regex.test(tenLopCuaCot));
            
            if (coKhop) {
                cot.classList.remove('hidden'); 
            } else {
                cot.classList.add('hidden');    
            }
        });

        // Sau khi xử lý lớp, áp dụng đè bộ lọc giáo viên (Lọc giao thoa)
        let locGV = document.getElementById('locGiaoVien');
        if (locGV && locGV.value.trim() !== "" && locGV.value.trim() !== "Toàn trường") {
            if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
        }
    }, 100);
};
// =========================================================================
// HÀM BỔ SUNG: KHỞI TẠO DATALIST ĐỘNG CHO BỘ LỌC LỚP
// =========================================================================
window.napDuLieuBoLocLop = function() {
    let locLopInput = document.getElementById('locLopHoc');
    if (!locLopInput) return;

    // [NÂNG CẤP UI]: Tự động bôi đen toàn bộ dữ liệu khi nhấp chuột (Giống ô Giáo viên)
    if (!locLopInput.dataset.daGanSuKienChonAll) {
        locLopInput.dataset.daGanSuKienChonAll = "true";
        locLopInput.addEventListener('click', function() {
            this.select();
        });
        locLopInput.addEventListener('focus', function() {
            this.select();
        });
    }

    // Tự động kiểm tra và gắn datalist nếu trên giao diện HTML chưa có
    let listId = locLopInput.getAttribute('list');
    let dtList = document.getElementById(listId);
    
    if (!dtList) {
        listId = 'danhSachLopList';
        locLopInput.setAttribute('list', listId);
        dtList = document.createElement('datalist');
        dtList.id = listId;
        document.body.appendChild(dtList);
    }

    let dsLop = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP) ? thongSoHocVu.DANH_SACH_LOP : [];

    // Kỹ thuật cập nhật Datalist tiền tố
    const capNhatDatalistLop = (tienTo) => {
        dtList.innerHTML = '';
        if (tienTo === '') {
            dtList.innerHTML += `<option value="Toàn trường"></option>`;
            dsLop.forEach(lop => dtList.innerHTML += `<option value="${lop}"></option>`);
        } else {
            let mangDaChon = tienTo.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "");
            dsLop.forEach(lop => {
                if (!mangDaChon.includes(lop.toUpperCase())) {
                    dtList.innerHTML += `<option value="${tienTo}${lop}"></option>`;
                }
            });
        }
    };

    capNhatDatalistLop(''); // Gọi lần đầu

    if (!locLopInput.dataset.daGanSuKienBoLoc) {
        locLopInput.dataset.daGanSuKienBoLoc = "true";

        locLopInput.addEventListener('input', function() {
            let val = this.value;
            if (val === "Toàn trường") {
                capNhatDatalistLop('');
                if (typeof window.locTheoLop === 'function') window.locTheoLop();
                return;
            }

            let lastCommaIndex = val.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                let mangTienTo = val.substring(0, lastCommaIndex).split(',').map(s => s.trim()).filter(s => s !== "");
                let tienToChuan = mangTienTo.join(', ') + (mangTienTo.length > 0 ? ', ' : '');
                capNhatDatalistLop(tienToChuan);
            } else {
                capNhatDatalistLop('');
            }

            if (typeof window.locTheoLop === 'function') window.locTheoLop();
        });

        locLopInput.addEventListener('change', function() {
            let valMoi = this.value;
            if (valMoi === "Toàn trường" || valMoi.trim() === "") {
                this.value = valMoi.trim();
                capNhatDatalistLop('');
            } else {
                let mangCu = valMoi.split(',').map(s => s.trim()).filter(s => s !== "");
                let lastLop = mangCu[mangCu.length - 1];
                
                // Khớp chuẩn hoa/thường với danh sách gốc
                let lopChuan = dsLop.find(l => l.toUpperCase() === (lastLop || '').toUpperCase());
                if (lopChuan) {
                    mangCu[mangCu.length - 1] = lopChuan;
                    this.value = mangCu.join(', ') + ', ';
                    capNhatDatalistLop(this.value);
                }
            }
            if (typeof window.locTheoLop === 'function') window.locTheoLop();
        });
    }
};
async function thucThiChuyenTuanTiepTheo(event) {
    // [CẬP NHẬT QUAN TRỌNG]: Ai được check quyền Nút "Tuần mới" (btnKhoiPhuc) đều có thể chạy
    let quyenCongKhai = (typeof window.layQuyenCongKhaiHienTai === 'function') ? window.layQuyenCongKhaiHienTai() : { nut: [] };
    let nutDuocCap = (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut) ? quyenChiTiet.nut : [];
    let coQuyenChuyen = quyenSuaChua || nutDuocCap.includes('btnKhoiPhuc') || quyenCongKhai.nut.includes('btnKhoiPhuc');

    if (!coQuyenChuyen) {
        alert("Từ chối truy cập: Đồng chí không có quyền để thực hiện tịnh tiến thời khóa biểu toàn trường.");
        return;
    }

    let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
    let tuanMoi = tuanHeThong + 1;

    let canhBao = `⛔ XÁC NHẬN CHUYỂN TUẦN ${tuanMoi}:\n\n` +
                  `Hệ thống sẽ thực hiện:\n` +
                  `1. Lưu trữ an toàn toàn bộ dữ liệu Tuần ${tuanHeThong} vào lịch sử.\n` +
                  `2. Chép toàn bộ TKB chuẩn từ TKB Cố Định sang Tuần ${tuanMoi}.\n` +
                  `3. Tịnh tiến tuần làm việc của toàn trường lên Tuần ${tuanMoi}.\n\n` +
                  `Đồng chí có chắc chắn muốn thực hiện?`;

    if (!confirm(canhBao)) return;

    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, 'Đang chuyển tuần');
    const btn = event ? (event.currentTarget || event.target) : null;
    const textGoc = btn ? btn.innerHTML : '';
    if (btn && btn.disabled !== undefined) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="ml-2">Đang đồng bộ...</span>`;
        btn.disabled = true;
    }

    try {
        const payload = { 
            thaoTac: 'chuyenTuanTiepTheoDongBo', 
            tuanCu: tuanHeThong,
            tuanMoi: tuanMoi 
        };
        
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'thanh_cong') {
            localStorage.removeItem(layKhoaCachLy('SmartTKB_CauHinh'));
            localStorage.removeItem(layKhoaCachLy('SmartTKB_DuLieuTuan'));
            window.location.reload(); 
        } else {
            throw new Error(ketQua.thongBao);
        }
    } catch (loi) {
        alert("Lỗi chuyển tuần: " + loi.message);
    } finally {
        if (btn && btn.disabled !== undefined) {
            btn.innerHTML = textGoc;
            btn.disabled = false;
        }
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
}

let boDemDongBoToanCuc;
let thoiGianThaoTacCuoi = Date.now();
const THOI_GIAN_DONG_BO = 60000; 
let dangChoTaiLaiNgam = false; 

['keydown', 'input', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => { thoiGianThaoTacCuoi = Date.now(); }, { passive: true });
});

async function dongBoDuLieuNgamToanCuc() {
    if (typeof thongSoHocVu === 'undefined' || Object.keys(thongSoHocVu).length === 0) return;
    let vungDuLieuTKB = document.getElementById('vungHienThiDuLieu');
    if (vungDuLieuTKB && (vungDuLieuTKB.innerHTML.includes('Đang tải') || vungDuLieuTKB.innerHTML.includes('Đang kết nối'))) return;
    
    let thoiGianNghiThaoTac = Date.now() - thoiGianThaoTacCuoi;
    
    if (thoiGianNghiThaoTac < 10000) {
        if (!dangChoTaiLaiNgam) {
            dangChoTaiLaiNgam = true;
            setTimeout(() => {
                dangChoTaiLaiNgam = false;
                dongBoDuLieuNgamToanCuc();
            }, 10000 - thoiGianNghiThaoTac + 500); 
        }
        return;
    }

    let khungTKB = document.getElementById('khungTKB');
    let khungSDB = document.getElementById('khungSoDauBai');

    if (khungTKB && !khungTKB.classList.contains('hidden')) {
        if (khungTKB.querySelector('td[data-thaydoi="true"]')) {
            console.warn("TKB đang có ô chỉnh sửa chưa lưu, tạm dừng quy trình tải ngầm.");
            return; 
        }

        hienThiThongBaoTaiNgam(true);
        try {
            let tuanHeThong = parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1;
            let nguonTruyXuat = 'TKB_HIEN_TAI';
            if (tuanDangXem < tuanHeThong) nguonTruyXuat = 'DATA_TKB';
            else if (tuanDangXem > tuanHeThong) nguonTruyXuat = 'TKB_CoDinh';

            if (typeof taiDuLieuTKB === 'function') await taiDuLieuTKB(true, nguonTruyXuat, false);
        } finally {
            setTimeout(() => hienThiThongBaoTaiNgam(false), 1500);
        }
    } 
    else if (khungSDB && !khungSDB.classList.contains('hidden')) {
        let coThayDoiSDB = (typeof coThayDoiChuaLuu_SDB !== 'undefined' && coThayDoiChuaLuu_SDB === true);
        let coOThayDoiDOM_SDB = khungSDB.querySelector('td[data-thaydoi="true"]');

        if (coThayDoiSDB || coOThayDoiDOM_SDB) {
            console.warn("Sổ đầu bài đang phát sinh dữ liệu gõ dở, tạm dừng quy trình tải ngầm.");
            return;
        }

        hienThiThongBaoTaiNgam(true);
        try {
            if (typeof thucThiLamMoiNgam === 'function') await thucThiLamMoiNgam();
        } finally {
            setTimeout(() => hienThiThongBaoTaiNgam(false), 1500);
        }
    }
}

function kichHoatDongBoNgamToanCuc() {
    if (boDemDongBoToanCuc) clearInterval(boDemDongBoToanCuc);
    boDemDongBoToanCuc = setInterval(dongBoDuLieuNgamToanCuc, THOI_GIAN_DONG_BO);
}

document.addEventListener('DOMContentLoaded', kichHoatDongBoNgamToanCuc);

function hienThiThongBaoTaiNgam(dangTai) {
    let theThongBao = document.getElementById('thongBaoTaiNgamHT');
    
    if (!theThongBao) {
        theThongBao = document.createElement('div');
        theThongBao.id = 'thongBaoTaiNgamHT';
        theThongBao.className = 'fixed bottom-5 right-5 bg-slate-800 border border-slate-600 text-white px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0 pointer-events-none';
        theThongBao.innerHTML = `
            <svg class="w-4 h-4 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span class="text-sm font-bold tracking-wide">Đang đồng bộ dữ liệu mới...</span>
        `;
        document.body.appendChild(theThongBao);
    }

    if (dangTai) {
        theThongBao.classList.remove('translate-y-20', 'opacity-0');
        theThongBao.classList.add('translate-y-0', 'opacity-100');
    } else {
        theThongBao.classList.remove('translate-y-0', 'opacity-100');
        theThongBao.classList.add('translate-y-20', 'opacity-0');
    }
}
// =========================================================================
// HÀM BỔ SUNG: XỬ LÝ PHÓNG TO / THU NHỎ CỬA SỔ MODAL
// Vị trí: Thay thế hàm toggleToanManHinhModal bị lỗi trong app.js
// =========================================================================
window.toggleToanManHinhModal = function(idModal, nutBam) {
    let modal = document.getElementById(idModal);
    if (!modal) return;
    
    // Bắt trực tiếp thẻ div con đầu tiên (hộp chứa nội dung) thay vì dò theo class
    let hopNoiDung = modal.firstElementChild;
    if (!hopNoiDung) return;

    // Kiểm tra trạng thái hiện tại (nếu có w-full nghĩa là đang toàn màn hình)
    let dangToanManHinh = hopNoiDung.classList.contains('w-full');

    if (dangToanManHinh) {
        // Trạng thái: Thu nhỏ về mặc định
        hopNoiDung.classList.remove('w-full', 'h-full', 'max-h-screen', 'rounded-none');
        
        // Trả lại các class kích thước gốc (chia riêng chiều cao cho từng modal nếu cần)
        let chieuCaoGoc = idModal === 'modalThongKeGV' ? 'max-h-[85vh]' : 'max-h-[80vh]';
        hopNoiDung.classList.add('w-11/12', 'md:w-3/4', 'lg:w-1/2', chieuCaoGoc, 'rounded-xl');
        
        // Trả lại icon phóng to
        nutBam.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
        nutBam.title = "Phóng to toàn màn hình";
    } else {
        // Trạng thái: Phóng to toàn màn hình
        hopNoiDung.classList.remove('w-11/12', 'md:w-3/4', 'lg:w-1/2', 'max-h-[80vh]', 'max-h-[85vh]', 'rounded-xl');
        hopNoiDung.classList.add('w-full', 'h-full', 'max-h-screen', 'rounded-none');
        
        // Đổi sang icon thu nhỏ
        nutBam.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>`;
        nutBam.title = "Thu nhỏ";
    }
};


// =========================================================================
// PHÂN HỆ: KHÓA / MỞ KHÓA THỜI KHÓA BIỂU THEO TUẦN (CLIENT)
// =========================================================================
window.kiemTraTuanTkbDaKhoa = function(tuan) {
    let tuanSo = parseInt(String(tuan).replace(/\D/g, ''), 10);
    if (!tuanSo) return false;
    let namHocHienTai = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? String(thongSoHocVu.NAM_HOC).trim() : '';
    let mapKhoa = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TRANG_THAI_KHOA_TKB) ? thongSoHocVu.TRANG_THAI_KHOA_TKB : {};
    
    if (mapKhoa[tuanSo]) {
        let item = mapKhoa[tuanSo];
        if (!item.namHoc || !namHocHienTai || item.namHoc === namHocHienTai) {
            return !!item.daKhoa;
        }
    }
    return false;
};

window.capNhatTrangThaiNutKhoaTKBUI = function(tuan) {
    let tuanSo = (typeof tuan !== 'undefined' && tuan) ? tuan : tuanDangXem;
    let nutKhoa = document.getElementById('btnKhoaTKB');
    let textNut = document.getElementById('textNutKhoaTKB');
    let iconNut = document.getElementById('iconNutKhoaTKB');
    if (!nutKhoa) return;

    let daKhoa = window.kiemTraTuanTkbDaKhoa(tuanSo);

    if (daKhoa) {
        if (textNut) textNut.innerText = 'Mở khóa TKB Tuần';
        nutKhoa.className = 'w-full text-left px-3 py-2 text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition duration-150 items-center gap-2.5 rounded-lg whitespace-nowrap cursor-pointer group';
        nutKhoa.title = `Thời khóa biểu Tuần ${tuanSo} đang KHÓA (Niêm phong). Bấm để Mở khóa.`;
        if (iconNut) {
            iconNut.className = 'w-7 h-7 rounded-md bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-600 flex-none transition-colors';
            iconNut.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`;
        }
    } else {
        if (textNut) textNut.innerText = 'Khóa TKB Tuần';
        nutKhoa.className = 'w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 font-bold text-sm transition duration-150 items-center gap-2.5 rounded-lg whitespace-nowrap cursor-pointer group';
        nutKhoa.title = `Khóa niêm phong Thời khóa biểu Tuần ${tuanSo} (chống sửa đổi).`;
        if (iconNut) {
            iconNut.className = 'w-7 h-7 rounded-md bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center text-rose-600 flex-none transition-colors';
            iconNut.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`;
        }
    }
};

window.thaoTacKhoaMoTKB = async function() {
    let tuanHienTai = (typeof tuanDangXem !== 'undefined' && tuanDangXem) ? tuanDangXem : 1;
    let namHocHienTai = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? thongSoHocVu.NAM_HOC : '';
    let chuoiNamHoc = namHocHienTai ? ` (Năm học ${namHocHienTai})` : '';

    // [CHẶN TỨC THÌ 0ms]: Kiểm tra quyền trực tiếp tại Client, chặn ngay nếu không có quyền, không bật spinner
    let coQuyenBam = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) || 
                     (typeof window !== 'undefined' && window.quyenSuaChua) ||
                     (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut && quyenChiTiet.nut.includes('btnKhoaTKB')) ||
                     (typeof layQuyenCongKhaiHienTai === 'function' && layQuyenCongKhaiHienTai().nut && layQuyenCongKhaiHienTai().nut.includes('btnKhoaTKB'));

    if (!coQuyenBam) {
        alert("⛔ TỪ CHỐI TRUY CẬP:\nTài khoản của đồng chí chưa được cấp quyền Khóa / Mở khóa Thời khóa biểu trong Ma trận phân quyền!");
        return;
    }

    let emailNguoiDung = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc) 
        ? window.dinhDanhGiaoVienToanCuc 
        : (typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc 
            ? window.emailGiaoVienToanCuc 
            : (typeof maGvDangNhapHeThong !== 'undefined' ? maGvDangNhapHeThong : ''));

    if (!emailNguoiDung) {
        alert("⚠️ Vui lòng đăng nhập tài khoản trước khi thực hiện thao tác Khóa / Mở khóa Thời khóa biểu!");
        return;
    }

    let daKhoa = window.kiemTraTuanTkbDaKhoa(tuanHienTai);
    let hanhDongMoi = !daKhoa; // true: Khóa, false: Mở

    let thongBao = hanhDongMoi 
        ? `🔒 XÁC NHẬN KHÓA THỜI KHÓA BIỂU:\n\nĐồng chí có chắc chắn muốn KHÓA Thời khóa biểu TUẦN ${tuanHienTai}${chuoiNamHoc} của TOÀN TRƯỜNG?\n\n- Sau khi khóa, toàn bộ các ô nhập môn học, giáo viên trên lưới TKB sẽ chuyển sang chế độ CHỈ XEM (vô hiệu hóa chỉnh sửa).\n- Dữ liệu tuần này được niêm phong để phục vụ giảng dạy và ghi Sổ đầu bài.`
        : `🔓 XÁC NHẬN MỞ KHÓA THỜI KHÓA BIỂU:\n\nĐồng chí có chắc chắn muốn MỞ KHÓA Thời khóa biểu TUẦN ${tuanHienTai}${chuoiNamHoc} cho TOÀN TRƯỜNG?\n\n- Lưới TKB sẽ được mở lại để phân bổ, xếp lịch và chỉnh sửa bình thường.`;

    if (!confirm(thongBao)) return;

    if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(true, hanhDongMoi ? 'Đang khóa TKB' : 'Đang mở khóa TKB');
    let btn = document.getElementById('btnKhoaTKB');
    let textGoc = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div> <span>Đang xử lý...</span>`;
        btn.disabled = true;
    }



    try {
        let payload = {
            thaoTac: 'khoaMoTKB',
            tuan: tuanHienTai,
            namHoc: namHocHienTai,
            khoa: hanhDongMoi,
            emailTruyCap: emailNguoiDung
        };

        const res = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        }, 2, 15000);

        const kq = await res.json();

        if (kq.trangThai === 'thanh_cong') {
            alert("✅ " + kq.thongBao);

            if (!thongSoHocVu.TRANG_THAI_KHOA_TKB) thongSoHocVu.TRANG_THAI_KHOA_TKB = {};
            thongSoHocVu.TRANG_THAI_KHOA_TKB[tuanHienTai] = {
                daKhoa: hanhDongMoi,
                tuan: tuanHienTai,
                namHoc: namHocHienTai,
                maTuan: kq.maTuan || `Tuần ${tuanHienTai}`,
                nguoiThucHien: emailNguoiDung,
                thoiGian: 'Vừa xong'
            };

            let KEY_CH = layKhoaCachLy('SmartTKB_CauHinh');
            localStorage.setItem(KEY_CH, JSON.stringify(thongSoHocVu));

            capNhatTrangThaiNutKhoaTKBUI(tuanHienTai);
            if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
                xuatMaTranBang(duLieuTkbHienTai);
            }
        } else {
            alert("Thao tác thất bại: " + (kq.thongBao || "Lỗi không xác định."));
        }
    } catch (err) {
        alert("Lỗi kết nối máy chủ: " + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = textGoc;
            btn.disabled = false;
            capNhatTrangThaiNutKhoaTKBUI(tuanHienTai);
        }
        if (typeof window.khoaNutThaoTacTKB === 'function') window.khoaNutThaoTacTKB(false);
    }
};

// =========================================================================
// PHÂN HỆ MA TRẬN PHÂN QUYỀN HỆ THỐNG (ĐỒNG BỘ NÚT KHÓA SỔ ĐẦU BÀI & CÔNG KHAI)
// =========================================================================
window.duLieuBangPhanQuyen = window.duLieuBangPhanQuyen || [];

window.DANH_SACH_MENU_HE_THONG = [
    { id: 'menuCaiDat', ten: '1. Cài đặt' },
    { id: 'menuDanhMucGV', ten: '2. DM Giáo viên' },
    { id: 'menuDanhMucLop', ten: '3. DM Lớp' },
    { id: 'menuKhungChuongTrinh', ten: '4. Khung CT' },
    { id: 'menuPhanCong', ten: '5. Phân công' },
    { id: 'menuDanhMucSGK', ten: '6. DM SGK' },
    { id: 'menuPhanPhoiChuongTrinh', ten: '7. PP Chương trình' },
    { id: 'menuPhanQuyen', ten: '8. Phân quyền' }
];

window.DANH_SACH_NUT_CHUC_NANG = [
    { id: 'btnNhapExcelTKB', ten: 'Nhập Excel' },
    { id: 'btnKhoiPhuc', ten: 'Tuần mới' },
    { id: 'btnLuuTuan', ten: 'Lưu TKB Tuần' },
    { id: 'btnLuuCoDinh', ten: 'TKB Cố Định' },
    { id: 'btnXepTuDong', ten: 'Xếp Tự Động' },
    { id: 'btnKiemTra', ten: 'Định Mức tiết' },
    { id: 'btnChuyenTuan', ten: 'Mũi tên Chuyển tuần' },
    { id: 'btnLuuSua', ten: 'Lưu Sửa' },
    { id: 'btnKhoaTKB', ten: 'Khóa TKB Tuần' },
    { id: 'btnKhoaSoDauBai', ten: 'Khóa Sổ đầu bài Tuần' }
];

window.moTabPhanQuyenChuyenDung = function() {
    if (typeof window.khoiTaoDOMPhanQuyen === 'function') {
        window.khoiTaoDOMPhanQuyen();
    }
    if (typeof window.kichHoatTab === 'function') {
        window.kichHoatTab('menuPhanQuyen', 'khungPhanQuyen', false);
    }
    if (typeof window.taiDuLieuPhanQuyenTuMayChu === 'function') {
        window.taiDuLieuPhanQuyenTuMayChu();
    }
};

window.taoNhomCheckbox = function(danhSachGoc, danhSachDaChon, kieuPhanLoai) {
    let html = `<div class="flex flex-wrap gap-2 justify-start max-h-48 min-h-[120px] overflow-y-auto p-1 custom-scrollbar">`;
    danhSachGoc.forEach(item => {
        let idItem = typeof item === 'object' ? item.id : item;
        let tenItem = typeof item === 'object' ? item.ten : item;
        let daChon = (danhSachDaChon || []).includes(idItem) ? 'checked' : '';
        
        let borderClass = 'bg-slate-50 border-gray-300 text-slate-700';
        if (idItem === 'btnKhoaSoDauBai') {
            borderClass = daChon 
                ? 'bg-rose-100 border-rose-400 text-rose-900 font-extrabold shadow-sm' 
                : 'bg-rose-50/70 border-rose-300 text-rose-800 font-semibold';
        } else if (idItem === 'btnKhoaTKB') {
            borderClass = daChon 
                ? 'bg-amber-100 border-amber-400 text-amber-900 font-extrabold shadow-sm' 
                : 'bg-amber-50/70 border-amber-300 text-amber-800 font-semibold';
        }

        html += `<label class="flex items-center gap-1 border px-2 py-1 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors ${borderClass}">
            <input type="checkbox" value="${idItem}" data-loai="${kieuPhanLoai}" ${daChon} class="cursor-pointer">
            <span class="whitespace-nowrap">${tenItem}</span>
        </label>`;
    });
    html += `</div>`;
    return html;
};

window.hienThiBangPhanQuyen = function() {
    const vungDuLieu = document.getElementById('vungDuLieuPhanQuyen');
    if (!vungDuLieu) return;
    let html = '';
    let dsLop = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP) ? thongSoHocVu.DANH_SACH_LOP : [];
    let duLieuBang = window.duLieuBangPhanQuyen || [];

    if (duLieuBang.length === 0) {
        html = '<tr><td colspan="5" class="text-center py-10 font-bold text-slate-500">Chưa có dữ liệu cấp quyền nào. Bấm "Cấp quyền mới" để tạo.</td></tr>';
    } else {
        duLieuBang.forEach((dong, index) => {
            let taiKhoan = dong[0] ? String(dong[0]).trim() : '';
            let lopChon = dong[1] ? String(dong[1]).split(',').map(s => s.trim()).filter(String) : [];
            let nutChon = dong[2] ? String(dong[2]).split(',').map(s => s.trim()).filter(String) : [];
            let menuChon = dong[3] ? String(dong[3]).split(',').map(s => s.trim()).filter(String) : [];

            let laDongCongKhai = (taiKhoan.toLowerCase() === '*' || taiKhoan.toLowerCase().includes('công khai') || taiKhoan.toLowerCase().includes('congkhai'));
            let bgDong = laDongCongKhai ? 'bg-amber-50/70 border-b-2 border-amber-300' : 'bg-white hover:bg-slate-50';
            let nhanDong = laDongCongKhai ? '<span class="w-full block text-[11px] font-extrabold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded text-center border border-amber-300 whitespace-normal leading-tight shadow-sm">🌐 CÔNG KHAI TOÀN TRƯỜNG</span>' : '';

            html += `<tr class="dong-phan-quyen ${bgDong} transition-colors" data-index="${index}">
                <td class="p-2 align-top whitespace-normal" style="white-space: normal !important; width: 224px; min-width: 224px; max-width: 224px;">
                    <div class="flex flex-col gap-1.5 w-full">
                        <input type="text" value="${taiKhoan}" placeholder="Nhập định danh truy cập hoặc * (Công khai)..." class="input-tai-khoan w-full border border-blue-400 rounded px-2 py-1.5 text-sm font-bold ${laDongCongKhai ? 'text-amber-900 bg-amber-100/50' : 'text-blue-900'} outline-none focus:ring-2 focus:ring-blue-500">
                        ${nhanDong}
                    </div>
                </td>
                <td class="p-2 align-top border-l border-gray-300 bg-gray-50/50">${window.taoNhomCheckbox(dsLop, lopChon, 'lop')}</td>
                <td class="p-2 align-top border-l border-gray-300">${window.taoNhomCheckbox(window.DANH_SACH_MENU_HE_THONG, menuChon, 'menu')}</td>
                <td class="p-2 align-top border-l border-gray-300 bg-gray-50/50">${window.taoNhomCheckbox(window.DANH_SACH_NUT_CHUC_NANG, nutChon, 'nut')}</td>
                <td class="p-2 text-center align-middle border-l border-gray-300">
                    <button onclick="if(typeof window.xoaDongPhanQuyen==='function') window.xoaDongPhanQuyen(this);" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors" title="Xóa quyền">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>`;
        });
    }
    vungDuLieu.innerHTML = html;
};

window.themDongPhanQuyenMoi = function() {
    if (!window.duLieuBangPhanQuyen) window.duLieuBangPhanQuyen = [];
    window.duLieuBangPhanQuyen.push(['', '', '', '']);
    window.hienThiBangPhanQuyen();
    setTimeout(() => {
        let khung = document.querySelector('#khungPhanQuyen .overflow-auto');
        if (khung) khung.scrollTop = khung.scrollHeight;
    }, 50);
};

window.xoaDongPhanQuyen = function(btn) {
    if (!confirm("Đồng chí chắc chắn muốn thu hồi phân quyền của định danh này?")) return;
    let tr = btn.closest('tr');
    let index = parseInt(tr.getAttribute('data-index'), 10);
    if (!isNaN(index) && window.duLieuBangPhanQuyen) {
        window.duLieuBangPhanQuyen.splice(index, 1);
        window.hienThiBangPhanQuyen();
    }
};

window.taiDuLieuPhanQuyenTuMayChu = async function() {
    const vungDuLieu = document.getElementById('vungDuLieuPhanQuyen');
    if (!vungDuLieu) return;
    vungDuLieu.innerHTML = '<tr><td colspan="5" class="text-center py-10 font-bold text-blue-600">Đang nạp ma trận phân quyền...</td></tr>';
    
    try {
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layPhanQuyenHethong`);
        let ketQua = await phanHoi.json();
        
        if (ketQua && ketQua.trangThai === 'loi_he_thong') {
            throw new Error(ketQua.thongBao);
        }
        
        if (Array.isArray(ketQua)) {
            window.duLieuBangPhanQuyen = ketQua;
        } else if (ketQua && ketQua.trangThai === 'thanh_cong') {
            throw new Error("Mã máy chủ chưa được đồng bộ. Đồng chí vui lòng chọn Manage Deployments -> New version trên Google Apps Script.");
        } else {
            window.duLieuBangPhanQuyen = [];
        }
        
        window.hienThiBangPhanQuyen();
    } catch (loi) {
        vungDuLieu.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 font-bold py-10">Lỗi kết nối: ${loi.message}</td></tr>`;
    }
};

window.luuDuLieuPhanQuyenSangMayChu = async function() {
    let mangGhi = [];
    let cacDong = document.querySelectorAll('.dong-phan-quyen');
    
    cacDong.forEach(tr => {
        let taiKhoan = tr.querySelector('.input-tai-khoan').value.trim();
        if (taiKhoan !== '') {
            let chkLop = Array.from(tr.querySelectorAll('input[type="checkbox"][data-loai="lop"]:checked')).map(cb => cb.value);
            let chkMenu = Array.from(tr.querySelectorAll('input[type="checkbox"][data-loai="menu"]:checked')).map(cb => cb.value);
            let chkNut = Array.from(tr.querySelectorAll('input[type="checkbox"][data-loai="nut"]:checked')).map(cb => cb.value);
            
            mangGhi.push([taiKhoan, chkLop.join(', '), chkNut.join(', '), chkMenu.join(', ')]);
        }
    });

    let btnLuu = document.querySelector('button[onclick*="luuDuLieuPhanQuyenSangMayChu"]');
    let textGoc = btnLuu ? btnLuu.innerHTML : '';
    if (btnLuu) { btnLuu.innerHTML = "Đang xử lý..."; btnLuu.disabled = true; }

    try {
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({ thaoTac: 'luuPhanQuyenHethong', duLieu: mangGhi })
        });
        const kq = await phanHoi.json();
        if (kq.trangThai === 'Thành công') {
            alert(kq.thongBao + " Cập nhật an toàn hoàn tất.");
            window.duLieuBangPhanQuyen = mangGhi; 
            window.hienThiBangPhanQuyen();
        } else {
            alert("Lưu thất bại: " + kq.thongBao);
        }
    } catch (loi) {
        alert("Có sự cố kết nối máy chủ: " + loi.message);
    } finally {
        if (btnLuu) { btnLuu.innerHTML = textGoc; btnLuu.disabled = false; }
    }
};

window.khoiTaoDOMPhanQuyen = function() {
    const nav = document.querySelector('nav');
    const vungChinh = document.getElementById('vungHienThiChinh');

    if (nav && !document.getElementById('menuPhanQuyen')) {
        const menuHtml = `
            <a id="menuPhanQuyen" onclick="moTabPhanQuyenChuyenDung()" style="display: none;" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group">
                <svg class="w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M8 11l3 3 5-5"></path></svg>
                <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px] whitespace-nowrap">8. Phân quyền Hệ thống</span>
            </a>`;
        nav.insertAdjacentHTML('beforeend', menuHtml);
    }

    if (vungChinh && !document.getElementById('khungPhanQuyen')) {
        const khungHtml = `
            <div id="khungPhanQuyen" class="hidden p-4 w-full h-full flex-col font-sans">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 flex-none">
                    <div>
                        <h2 class="text-xl font-extrabold text-blue-900 uppercase">MA TRẬN PHÂN QUYỀN HỆ THỐNG</h2>
                        <p class="text-xs text-slate-500 font-semibold mt-0.5">Quản lý quyền Menu, Nút chức năng TKB, Khóa Sổ đầu bài và chế độ Công khai (Toàn trường)</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="if(typeof window.taiDuLieuPhanQuyenTuMayChu==='function') window.taiDuLieuPhanQuyenTuMayChu();" class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
                            Tải lại
                        </button>
                        <button onclick="if(typeof window.themDongPhanQuyenMoi==='function') window.themDongPhanQuyenMoi();" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
                            + Cấp quyền mới
                        </button>
                        <button onclick="if(typeof window.luuDuLieuPhanQuyenSangMayChu==='function') window.luuDuLieuPhanQuyenSangMayChu();" class="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
                            Lưu Hệ Thống
                        </button>
                    </div>
                </div>
                <div class="overflow-auto border border-gray-400 shadow-sm bg-white relative flex-1">
                    <table class="bang-excel w-full min-w-[1000px]">
                        <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm text-center">
                            <tr>
                                <th class="py-2 w-56">Tài khoản (Định danh)</th>
                                <th class="py-2">Quyền xếp thời khoá biểu Lớp học</th>
                                <th class="py-2">Phân quyền Menu</th>
                                <th class="py-2">Phân quyền Nút chức năng</th>
                                <th class="py-2 w-16 text-red-600">Xóa</th>
                            </tr>
                        </thead>
                        <tbody id="vungDuLieuPhanQuyen">
                            <tr><td colspan="5" class="text-center py-10 text-slate-500 font-bold">Vui lòng chờ, đang tải dữ liệu...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        vungChinh.insertAdjacentHTML('beforeend', khungHtml);
    }

    if (typeof window.capNhatHienThiPhanQuyen === 'function') {
        window.capNhatHienThiPhanQuyen();
    }
};

window.capNhatHienThiPhanQuyen = function() {
    let coQuyenQuanTri = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua);
    let quyenCongKhai = (typeof window.layQuyenCongKhaiHienTai === 'function') 
        ? window.layQuyenCongKhaiHienTai() 
        : { menu: [], nut: [], lop: [] };
    let menuCongKhai = quyenCongKhai.menu || [];
    let nutCongKhai = quyenCongKhai.nut || [];

    // 1. Menu 8: Phân quyền Hệ thống
    let menuPQ = document.getElementById('menuPhanQuyen');
    let duocXemMenu = false;
    if (menuPQ) {
        duocXemMenu = coQuyenQuanTri || 
                      (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.menu && quyenChiTiet.menu.includes('menuPhanQuyen')) ||
                      menuCongKhai.includes('menuPhanQuyen');
        menuPQ.style.display = duocXemMenu ? 'flex' : 'none';
    }

    // 2. Menu 7: Phân phối Chương trình
    let menuPPCT = document.getElementById('menuPhanPhoiChuongTrinh');
    let duocXemPPCT = false;
    if (menuPPCT) {
        duocXemPPCT = coQuyenQuanTri || 
                      (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.menu && quyenChiTiet.menu.includes('menuPhanPhoiChuongTrinh')) ||
                      menuCongKhai.includes('menuPhanPhoiChuongTrinh');
        menuPPCT.style.display = duocXemPPCT ? 'flex' : 'none';
    }

    let nhanHT = document.getElementById('nhanHeThong');
    if (nhanHT && (duocXemMenu || duocXemPPCT)) {
        nhanHT.style.display = 'flex';
    }

    // 3. Nút Khóa Sổ Đầu Bài Tuần (btnKhoaSoDauBai)
    let btnKhoaSo = document.getElementById('btnKhoaSoDauBai');
    if (btnKhoaSo) {
        let duocBamKhoaSo = coQuyenQuanTri || 
                            (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut && quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                            nutCongKhai.includes('btnKhoaSoDauBai');
        btnKhoaSo.style.display = duocBamKhoaSo ? 'inline-flex' : 'none';
    }
};

// =========================================================================
// TỰ ĐỘNG BẮT CHẶN VÀ KHÓA NÚT THAO TÁC CHO MỌI HÀNH ĐỘNG TRONG DROPDOWN MENU
// =========================================================================
document.addEventListener('DOMContentLoaded', function() {
    let dropdown = document.getElementById('dropdownMenuThaoTacTKB');
    if (dropdown) {
        dropdown.addEventListener('click', function(e) {
            let nutCon = e.target.closest('button, a, label');
            if (nutCon && nutCon.id !== 'btnMenuThaoTacTKB') {
                if (typeof window.dongMenuThaoTacTKB === 'function') {
                    window.dongMenuThaoTacTKB();
                }
            }
        });
    }
});
// =========================================================================
// HÀM BỔ SUNG: TỰ ĐỘNG KHỞI TẠO NÚT NHẬP EXCEL TRÊN GIAO DIỆN TKB (UI)
// =========================================================================
window.khoiTaoNutNhapExcelTKBUI = function() {
    // 1. Kiểm tra và tạo thẻ input[type="file"] ẩn để chọn tệp Excel nếu chưa có
    let inputExcel = document.getElementById('fileInputExcelTKB');
    if (!inputExcel) {
        inputExcel = document.createElement('input');
        inputExcel.type = 'file';
        inputExcel.id = 'fileInputExcelTKB';
        inputExcel.accept = '.xlsx, .xls';
        inputExcel.className = 'hidden';
        inputExcel.setAttribute('onchange', 'nhapExcelTKB(event)');
        document.body.appendChild(inputExcel);
    }

    // 2. Kiểm tra xem nút btnNhapExcelTKB đã có trên giao diện chưa, nếu chưa thì chèn vào menu thao tác TKB
    let btnNhap = document.getElementById('btnNhapExcelTKB');
    if (!btnNhap) {
        let dropdown = document.getElementById('dropdownMenuThaoTacTKB');
        if (dropdown) {
            btnNhap = document.createElement('button');
            btnNhap.id = 'btnNhapExcelTKB';
            btnNhap.type = 'button';
            // Mặc định ban đầu ẩn (để hàm kiemSoatGiaoDien kiểm soát quyền sau)
            btnNhap.style.display = 'none'; 
            btnNhap.className = 'w-full text-left px-3 py-2 text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition duration-150 flex items-center gap-2.5 rounded-lg whitespace-nowrap cursor-pointer group';
            btnNhap.title = 'Tải Thời khóa biểu từ file Excel (.xlsx) lên lưới giao diện';
            btnNhap.onclick = function() {
                // Kiểm tra khóa TKB tuần trước khi cho chọn file
                if (typeof window.kiemTraTuanTkbDaKhoa === 'function' && window.kiemTraTuanTkbDaKhoa(tuanDangXem)) {
                    alert(`⚠️ Thời khóa biểu Tuần ${tuanDangXem} đang bị KHÓA (Niêm phong). Đồng chí vui lòng Mở khóa trước khi tải file Excel lên lưới!`);
                    return;
                }
                if (typeof window.dongMenuThaoTacTKB === 'function') window.dongMenuThaoTacTKB();
                let fileIn = document.getElementById('fileInputExcelTKB');
                if (fileIn) { fileIn.value = ''; fileIn.click(); }
            };
            btnNhap.innerHTML = `
                <div class="w-7 h-7 rounded-md bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-700 flex-none transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <span>Nhập Excel</span>
            `;
            // Chèn lên vị trí đầu tiên trong menu 3 gạch thao tác TKB
            dropdown.insertBefore(btnNhap, dropdown.firstChild);
        }
    }
};

// Gọi tự động khi trang vừa nạp xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.khoiTaoNutNhapExcelTKBUI, 300);
    });
} else {
    setTimeout(window.khoiTaoNutNhapExcelTKBUI, 300);
}
