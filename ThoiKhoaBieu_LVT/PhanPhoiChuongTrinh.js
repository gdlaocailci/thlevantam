// KHỐI 1: KHỞI TẠO BIẾN TOÀN CỤC, KHO ĐỆM ĐA TẦNG VÀ GẮN GIAO DIỆN VÀO DOM
// =========================================================================
let duLieuPpctGoc = []; 
let duLieuTkbTuan = [];
let trangThaiDaTaiGiaoDienPPCT = false;
let trangThaiChoPhepSua = false; // [NÂNG CẤP]: Biến lưu trạng thái khoá/mở sửa bảng
let cheDoXemPPCT = 'lop'; // 'lop' (Theo Lớp - GVCN) | 'gvbm' (Theo Môn - GVBM nhiều lớp)
let sapXepGvbmPPCT = 'lop'; // 'lop' (Gom theo Tên lớp) | 'ngay' (Theo Ngày dạy)
let duLieuGvbmTheoLop = {}; // { [maLop]: { khoi, dsTkb, dsPpct } }
let _tuanDangHienThiGvbmPPCT = '';

// =========================================================================
// [NÂNG CẤP HIỆU NĂNG]: KHO BỘ NHỚ ĐỆM SÀNG LỌC THÔNG MINH CHO PPCT & TKB (0ms)
// - Phân phối chương trình (PPCT) được lưu theo từng Khối (khoPpctToanTruong[khoi]),
//   kế thừa trực tiếp từ kho dữ liệu tĩnh của Sổ đầu bài (SDB_DATA_STATIC_SHARED_V2) nếu đã có.
// - Thời khóa biểu (TKB) của tuần/lớp được sàng lọc liên thông từ bộ nhớ đa tuần của app.js
//   (window.sangLocTkbTuanDaCo / duLieuTkbHienTai) và kho TKB toàn tập của SoDauBai.js.
// - Chỉ tải phần dữ liệu còn thiếu (Differential Fetch), tuyệt đối không tải lại từ đầu.
// =========================================================================
window.khoPpctToanTruong = window.khoPpctToanTruong || {};
window.tapKhoiPpctDaXacThucPhien = window.tapKhoiPpctDaXacThucPhien || new Set();
window.khoTkbTuanLopPPCT = window.khoTkbTuanLopPPCT || {};
window.tapTkbTuanLopDaXacThucPhien = window.tapTkbTuanLopDaXacThucPhien || new Set();
window.khoTkbCoDinhLopPPCT = window.khoTkbCoDinhLopPPCT || {};
window.tapTkbCoDinhLopDaXacThucPhien = window.tapTkbCoDinhLopDaXacThucPhien || new Set();
let _daKhoiPhucKhoPPCT = false;
let _capTuanLopDangHienThiPPCT = '';
let _boDemDebouncingTuanPPCT = null;
let _tuanDangXemDongBoCuoiPPCT = null;

function layKhoaCachLyPPCT(tenKhoaGoc) {
    if (typeof window.layKhoaCachLy === 'function') return window.layKhoaCachLy(tenKhoaGoc);
    let maTruong = (typeof CAU_HINH_FRONTEND !== 'undefined' && CAU_HINH_FRONTEND.MA_DON_VI) ? CAU_HINH_FRONTEND.MA_DON_VI : 'DEFAULT';
    return `${maTruong}_${tenKhoaGoc}`;
}

function chuanHoaBanGhiPpct(raw) {
    if (!raw || typeof raw !== 'object') return null;
    let tietVal = String(raw.tietPpc !== undefined ? raw.tietPpc : (raw.tiet !== undefined ? raw.tiet : (raw.B !== undefined ? raw.B : ''))).trim();
    if (tietVal === '') return null;
    let monVal = String(raw.mon !== undefined ? raw.mon : (raw.monHoc !== undefined ? raw.monHoc : (raw.C !== undefined ? raw.C : ''))).trim();
    let tenBaiVal = String(raw.tenBai !== undefined ? raw.tenBai : (raw.tenBaiHoc !== undefined ? raw.tenBaiHoc : (raw.D !== undefined ? raw.D : ''))).trim();
    let dieuChinhVal = String(raw.dieuChinh !== undefined ? raw.dieuChinh : (raw.ghiChu !== undefined ? raw.ghiChu : (raw.E !== undefined ? raw.E : ''))).trim();
    return {
        tiet: tietVal,
        tietPpc: tietVal,
        mon: monVal,
        monHoc: monVal,
        tenBai: tenBaiVal,
        tenBaiHoc: tenBaiVal,
        dieuChinh: dieuChinhVal
    };
}

function khoiPhucKhoPpctTuStorage() {
    if (_daKhoiPhucKhoPPCT) return;
    _daKhoiPhucKhoPPCT = true;
    try {
        let kKho = layKhoaCachLyPPCT('PPCT_KHO_TOAN_TRUONG_V2');
        let raw = sessionStorage.getItem(kKho) || localStorage.getItem(kKho);
        if (raw) {
            let parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(k => {
                    if (Array.isArray(parsed[k]) && parsed[k].length > 0 && !window.khoPpctToanTruong[k]) {
                        window.khoPpctToanTruong[k] = parsed[k];
                    }
                });
            }
        }
    } catch (e) {}
}

function luuKhoPpctVaoStorage(khoi, dsPpct, daXacThucMayChu = false) {
    if (!khoi || !Array.isArray(dsPpct)) return;
    khoiPhucKhoPpctTuStorage();
    let khoiStr = String(khoi).trim();
    let dsChuan = [];
    for (let i = 0; i < dsPpct.length; i++) {
        let item = chuanHoaBanGhiPpct(dsPpct[i]);
        if (item) dsChuan.push(item);
    }
    if (dsChuan.length > 0) {
        window.khoPpctToanTruong[khoiStr] = dsChuan;
        if (daXacThucMayChu) {
            window.tapKhoiPpctDaXacThucPhien.add(khoiStr);
        }
        try {
            let kKho = layKhoaCachLyPPCT('PPCT_KHO_TOAN_TRUONG_V2');
            let str = JSON.stringify(window.khoPpctToanTruong);
            try { sessionStorage.setItem(kKho, str); } catch (e1) {}
            try { localStorage.setItem(kKho, str); } catch (e2) {}
        } catch (e) {}
    }
}

// Sàng lọc PPCT của một Khối từ RAM, Storage hoặc kho dữ liệu tĩnh đã tải của Sổ Đầu Bài
window.sangLocPpctKhoiDaCo = function(khoiMucTieu) {
    khoiPhucKhoPpctTuStorage();
    let khoiStr = String(khoiMucTieu || '').trim();
    if (!khoiStr || khoiStr === 'KX') return null;

    // 1. Kiểm tra trực tiếp trong kho PPCT toàn trường trên RAM
    if (window.khoPpctToanTruong[khoiStr] && Array.isArray(window.khoPpctToanTruong[khoiStr]) && window.khoPpctToanTruong[khoiStr].length > 0) {
        return {
            ds: window.khoPpctToanTruong[khoiStr],
            daXacThucPhien: window.tapKhoiPpctDaXacThucPhien.has(khoiStr)
        };
    }

    // 2. Sàng lọc liên thông từ kho dữ liệu tĩnh của Sổ đầu bài (SDB_DATA_STATIC_SHARED_V2) nếu đã tải
    try {
        let kStaticSDB = layKhoaCachLyPPCT('SDB_DATA_STATIC_SHARED_V2');
        let rawStatic = sessionStorage.getItem(kStaticSDB) || localStorage.getItem(kStaticSDB);
        if (rawStatic) {
            let parsedStatic = JSON.parse(rawStatic);
            if (parsedStatic && Array.isArray(parsedStatic.PPCT) && parsedStatic.PPCT.length > 0) {
                let gomTheoKhoi = {};
                let coCotE = false;
                let lastMon = '';
                for (let i = 0; i < parsedStatic.PPCT.length; i++) {
                    let r = parsedStatic.PPCT[i];
                    let kRaw = String(r.A || '').trim();
                    let kSoMatch = kRaw.match(/\d+/);
                    let kKey = kSoMatch ? kSoMatch[0] : kRaw;
                    if (!kKey) continue;
                    let mRaw = String(r.C || '').trim();
                    if (mRaw !== '') lastMon = mRaw;
                    if (r.E !== undefined) coCotE = true;
                    let banGhi = chuanHoaBanGhiPpct({
                        tietPpc: r.B,
                        mon: mRaw || lastMon,
                        tenBai: r.D,
                        dieuChinh: r.E || ''
                    });
                    if (banGhi) {
                        if (!gomTheoKhoi[kKey]) gomTheoKhoi[kKey] = [];
                        gomTheoKhoi[kKey].push(banGhi);
                    }
                }
                Object.keys(gomTheoKhoi).forEach(kKey => {
                    if (!window.khoPpctToanTruong[kKey] && gomTheoKhoi[kKey].length > 0) {
                        window.khoPpctToanTruong[kKey] = gomTheoKhoi[kKey];
                        if (coCotE) window.tapKhoiPpctDaXacThucPhien.add(kKey);
                    }
                });
                if (window.khoPpctToanTruong[khoiStr] && window.khoPpctToanTruong[khoiStr].length > 0) {
                    return {
                        ds: window.khoPpctToanTruong[khoiStr],
                        daXacThucPhien: coCotE
                    };
                }
            }
        }
    } catch (eSDB) {}

    return null;
};

function saoChepDanhSachTkb(dsNguon, xoaTietPpc = false) {
    if (!Array.isArray(dsNguon)) return [];
    return dsNguon.map(t => ({
        thu: String(t.thu || '').trim(),
        buoi: String(t.buoi || '').trim(),
        tiet: parseInt(t.tiet, 10) || t.tiet,
        monHoc: String(t.monHoc || '').trim(),
        ngay: xoaTietPpc ? '' : String(t.ngay || '').trim(),
        tietPpc: xoaTietPpc ? '' : (t.tietPpc ? String(t.tietPpc).trim() : ''),
        maGv: t.maGv !== undefined ? String(t.maGv).trim() : '',
        idGv: t.idGv !== undefined ? String(t.idGv).trim() : '',
        giaoVien: t.giaoVien !== undefined ? String(t.giaoVien).trim() : '',
        tenGv: t.tenGv !== undefined ? String(t.tenGv).trim() : '',
        gv: t.gv !== undefined ? String(t.gv).trim() : ''
    }));
}

// Sàng lọc TKB của (Tuần, Lớp) từ RAM hoặc kế thừa trực tiếp từ bộ nhớ đa tuần của app.js / SoDauBai.js
window.sangLocTkbTuanLopDaCo = function(tuanMucTieu, lopMucTieu) {
    let tuanSo = parseInt(String(tuanMucTieu || '').replace(/\D/g, ''), 10) || 1;
    let lopStr = String(lopMucTieu || '').trim();
    if (!lopStr) return null;

    let khoaTkbLop = `${tuanSo}_${lopStr}`;
    if (window.khoTkbTuanLopPPCT[khoaTkbLop] && Array.isArray(window.khoTkbTuanLopPPCT[khoaTkbLop]) && window.khoTkbTuanLopPPCT[khoaTkbLop].length > 0) {
        return {
            ds: window.khoTkbTuanLopPPCT[khoaTkbLop],
            daXacThucPhien: window.tapTkbTuanLopDaXacThucPhien.has(khoaTkbLop)
        };
    }

    let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);
    let nguon = (tuanSo < tuanHT) ? 'DATA_TKB' : ((tuanSo > tuanHT) ? 'TKB_CoDinh' : 'TKB_HIEN_TAI');

    // [NÂNG CẤP TỊNH TIẾN TUẦN TƯƠNG LAI]: Mọi tuần tương lai (> tuanHT) đều dùng chung TKB_CoDinh của lớp đó
    if (tuanSo > tuanHT && window.khoTkbCoDinhLopPPCT[lopStr] && Array.isArray(window.khoTkbCoDinhLopPPCT[lopStr]) && window.khoTkbCoDinhLopPPCT[lopStr].length > 0) {
        let dsClone = saoChepDanhSachTkb(window.khoTkbCoDinhLopPPCT[lopStr], true);
        window.khoTkbTuanLopPPCT[khoaTkbLop] = dsClone;
        let daXacThuc = window.tapTkbCoDinhLopDaXacThucPhien.has(lopStr);
        if (daXacThuc) window.tapTkbTuanLopDaXacThucPhien.add(khoaTkbLop);
        return { ds: dsClone, daXacThucPhien: daXacThuc };
    }

    // 1. Hỏi trực tiếp bộ sàng lọc đa tuần của app.js (đã bao gồm boNhoTkbTheoTuan, TKB_TUAN và mapTkbToanTap của SĐB)
    if (typeof window.sangLocTkbTuanDaCo === 'function') {
        let kqTuan = window.sangLocTkbTuanDaCo(tuanSo, nguon);
        if (kqTuan && Array.isArray(kqTuan.ds) && kqTuan.ds.length > 0) {
            let dsLop = [];
            for (let i = 0; i < kqTuan.ds.length; i++) {
                let t = kqTuan.ds[i];
                if (String(t.maLop || '').trim() === lopStr && String(t.monHoc || '').trim() !== '') {
                    dsLop.push({
                        thu: String(t.thu || '').trim(),
                        buoi: String(t.buoi || '').trim(),
                        tiet: parseInt(t.tiet, 10) || t.tiet,
                        monHoc: String(t.monHoc || '').trim(),
                        ngay: String(t.ngay || '').trim(),
                        tietPpc: t.tietPpc ? String(t.tietPpc).trim() : '',
                        maGv: t.maGv !== undefined ? String(t.maGv).trim() : '',
                        idGv: t.idGv !== undefined ? String(t.idGv).trim() : '',
                        giaoVien: t.giaoVien !== undefined ? String(t.giaoVien).trim() : '',
                        tenGv: t.tenGv !== undefined ? String(t.tenGv).trim() : '',
                        gv: t.gv !== undefined ? String(t.gv).trim() : ''
                    });
                }
            }
            if (dsLop.length > 0) {
                window.khoTkbTuanLopPPCT[khoaTkbLop] = dsLop;
                if (kqTuan.daXacThucPhien) window.tapTkbTuanLopDaXacThucPhien.add(khoaTkbLop);
                if (tuanSo > tuanHT) {
                    window.khoTkbCoDinhLopPPCT[lopStr] = saoChepDanhSachTkb(dsLop, true);
                    if (kqTuan.daXacThucPhien) window.tapTkbCoDinhLopDaXacThucPhien.add(lopStr);
                }
                return { ds: dsLop, daXacThucPhien: kqTuan.daXacThucPhien };
            }
        }
    }

    // 2. Dự phòng: Kiểm tra mảng duLieuTkbHienTai nếu đang ở đúng tuần đó
    if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai) && duLieuTkbHienTai.length > 0) {
        let tDangXem = (typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : tuanHT;
        if (tDangXem === tuanSo) {
            let dsLop = [];
            for (let i = 0; i < duLieuTkbHienTai.length; i++) {
                let t = duLieuTkbHienTai[i];
                if (String(t.maLop || '').trim() === lopStr && String(t.monHoc || '').trim() !== '') {
                    dsLop.push({
                        thu: String(t.thu || '').trim(),
                        buoi: String(t.buoi || '').trim(),
                        tiet: parseInt(t.tiet, 10) || t.tiet,
                        monHoc: String(t.monHoc || '').trim(),
                        ngay: String(t.ngay || '').trim(),
                        tietPpc: t.tietPpc ? String(t.tietPpc).trim() : '',
                        maGv: t.maGv !== undefined ? String(t.maGv).trim() : '',
                        idGv: t.idGv !== undefined ? String(t.idGv).trim() : '',
                        giaoVien: t.giaoVien !== undefined ? String(t.giaoVien).trim() : '',
                        tenGv: t.tenGv !== undefined ? String(t.tenGv).trim() : '',
                        gv: t.gv !== undefined ? String(t.gv).trim() : ''
                    });
                }
            }
            if (dsLop.length > 0) {
                window.khoTkbTuanLopPPCT[khoaTkbLop] = dsLop;
                return { ds: dsLop, daXacThucPhien: true };
            }
        }
    }

    // 3. [NÂNG CẤP CHO TUẦN TƯƠNG LAI]: Nếu chuyển lên tuần tương lai (> tuanHT) lần đầu tiên khi chưa kịp tải TKB_CoDinh,
    // kế thừa tạm thời khung TKB của tuần hiện tại (hoặc tuần vừa xem của cùng lớp) để tịnh tiến PPCT tức thì (0ms) trong lúc đồng bộ ngầm.
    if (tuanSo > tuanHT) {
        let khoaTuanHT = `${tuanHT}_${lopStr}`;
        if (window.khoTkbTuanLopPPCT[khoaTuanHT] && Array.isArray(window.khoTkbTuanLopPPCT[khoaTuanHT]) && window.khoTkbTuanLopPPCT[khoaTuanHT].length > 0) {
            return {
                ds: saoChepDanhSachTkb(window.khoTkbTuanLopPPCT[khoaTuanHT], true),
                daXacThucPhien: false
            };
        }
        if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai) && duLieuTkbHienTai.length > 0) {
            let dsTam = [];
            for (let i = 0; i < duLieuTkbHienTai.length; i++) {
                let t = duLieuTkbHienTai[i];
                if (String(t.maLop || '').trim() === lopStr && String(t.monHoc || '').trim() !== '') {
                    dsTam.push({
                        thu: String(t.thu || '').trim(),
                        buoi: String(t.buoi || '').trim(),
                        tiet: parseInt(t.tiet, 10) || t.tiet,
                        monHoc: String(t.monHoc || '').trim(),
                        ngay: '',
                        tietPpc: '',
                        maGv: t.maGv !== undefined ? String(t.maGv).trim() : '',
                        idGv: t.idGv !== undefined ? String(t.idGv).trim() : '',
                        giaoVien: t.giaoVien !== undefined ? String(t.giaoVien).trim() : '',
                        tenGv: t.tenGv !== undefined ? String(t.tenGv).trim() : '',
                        gv: t.gv !== undefined ? String(t.gv).trim() : ''
                    });
                }
            }
            if (dsTam.length > 0) {
                return { ds: dsTam, daXacThucPhien: false };
            }
        }
    }

    return null;
};

document.addEventListener('DOMContentLoaded', () => {
    taoMenuPhanPhoiChuongTrinh();
    taoKhungGiaoDienPPCT();
    
    // Liên tục lắng nghe trạng thái đăng nhập để phân quyền Admin / Quản lý PPCT & nút Khóa Sửa theo lớp
    setInterval(() => {
        let nhomNut = document.getElementById('nhomNutCongCuPPCT');
        if (nhomNut) {
            nhomNut.style.display = 'flex';
        }
        bomDuLieuVaoBoLoc(true);
        capNhatHienThiNutKhoaSuaPPCT();
    }, 1000);
});

function taoMenuPhanPhoiChuongTrinh() {
    if (!document.getElementById('menuPhanPhoiChuongTrinh')) {
        const nav = document.querySelector('nav');
        if (nav) {
            const menuPPCT = document.createElement('a');
            menuPPCT.id = 'menuPhanPhoiChuongTrinh';
            menuPPCT.onclick = moTabPhanPhoiChuongTrinh;
            menuPPCT.style.display = 'none';
            menuPPCT.className = 'flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group';
            menuPPCT.innerHTML = `
                <svg class="w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    <line x1="10" y1="6" x2="16" y2="6"></line>
                    <line x1="10" y1="10" x2="16" y2="10"></line>
                </svg>
                <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px] whitespace-nowrap">7. Phân phối Chương trình</span>
            `;
            const menuSGK = document.getElementById('menuDanhMucSGK');
            if (menuSGK) {
                menuSGK.insertAdjacentElement('afterend', menuPPCT);
            } else {
                nav.appendChild(menuPPCT);
            }
        }
    }
}

function taoKhungGiaoDienPPCT() {
    const vungHienThi = document.getElementById('vungHienThiChinh');
    if (vungHienThi) {
        const khungPPCT = document.createElement('div');
        khungPPCT.id = 'khungPhanPhoiChuongTrinh';
        khungPPCT.className = 'hidden p-4 w-full h-full flex-col font-sans bg-gray-50 reactbits-fade-in relative';
        
        khungPPCT.innerHTML = `
            <div class="flex flex-col lg:flex-row justify-between items-center mb-4 gap-3 flex-none">
                <div class="flex items-center gap-3">
                    <h2 class="text-xl font-extrabold text-blue-900 uppercase tracking-wide">Quản lý Phân Phối Chương Trình</h2>
                </div>
                
                <div id="nhomNutCongCuPPCT" class="flex flex-wrap items-center gap-2">
                    <input type="file" id="fileNhapPPCT" accept=".xlsx, .xls" class="hidden" onchange="xuLyNhapExcelPPCT(event)">
                    <button id="nutNhapExcelPPCT" onclick="document.getElementById('fileNhapPPCT').click()" style="display: none;" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm">
                        Nhập Excel
                    </button>
                    
                    <button id="nutSuaDuLieuPPCT" onclick="chuyenDoiTrangThaiSuaPPCT()" style="display: none;" class="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow transition-colors duration-300 flex items-center gap-1.5 text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        Khóa Sửa
                    </button>

                    <button onclick="xuLyXuatExcelPPCT()" class="bg-green-700 hover:bg-green-800 text-white font-bold py-1.5 px-3 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm">
                        Xuất Excel
                    </button>
                    <button id="nutLuuPPCT" onclick="luuDuLieuPPCTLenMayChu(event)" style="display: none;" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm ml-2">
                        Lưu PPCT
                    </button>
                </div>
            </div>

            <div class="bg-white border border-gray-300 shadow-sm p-3 rounded flex flex-wrap items-end gap-4 mb-4 flex-none">
                <div class="flex flex-col">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Chế độ xem</label>
                    <div class="inline-flex rounded-md border border-blue-300 bg-blue-50 p-0.5 h-[34px]">
                        <button type="button" id="btnCheDoLopPPCT" onclick="chuyenCheDoXemPPCT('lop')" class="px-3 py-1 text-xs font-bold rounded transition bg-blue-600 text-white shadow-sm whitespace-nowrap">
                            Theo Lớp (GVCN)
                        </button>
                        <button type="button" id="btnCheDoGvbmPPCT" onclick="chuyenCheDoXemPPCT('gvbm')" class="px-3 py-1 text-xs font-bold rounded transition text-blue-900 hover:bg-blue-100 whitespace-nowrap">
                            Theo Môn (GVBM)
                        </button>
                    </div>
                </div>
                <div class="flex flex-col w-24">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Tuần học</label>
                    <input type="number" id="locTuanUI" min="1" max="52" value="1" 
                           onfocus="this.dataset.oldValue = this.value; this.select();" 
                           onblur="if(this.value === '') this.value = this.dataset.oldValue || '1';" 
                           oninput="xuLyNhapTuanPPCT(this)"
                           onchange="xuLyThayDoiBoLocPPCT('tuan')"
                           class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-900 bg-blue-50 text-center">
                </div>
                <div id="khungLocLopPPCT" class="flex flex-col w-32">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Lớp</label>
                    <input type="text" id="locLopPPCT" list="listLopPPCT" 
                           onfocus="this.dataset.oldValue = this.value; this.value = '';" 
                           onblur="if(this.value === '') this.value = this.dataset.oldValue;" 
                           oninput="tuDongTinhKhoiLop(); capNhatHienThiNutKhoaSuaPPCT();"
                           onchange="tuDongTinhKhoiLop(); this.blur(); xuLyThayDoiBoLocPPCT('lop'); capNhatHienThiNutKhoaSuaPPCT();" 
                           class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-blue-50 text-center" placeholder="Chọn lớp">
                    <datalist id="listLopPPCT"></datalist>
                </div>
                <div id="khungLocKhoiPPCT" class="flex flex-col w-24">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Khối Lớp</label>
                    <input type="text" id="locKhoiPPCT" readonly class="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-100 font-extrabold text-slate-700 text-center select-none" title="Tự động trích xuất từ Tên Lớp" placeholder="--">
                </div>
                <div class="flex flex-col w-48">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Môn học</label>
                    <input type="text" id="locMonPPCT" list="listMonPPCT" 
                           onfocus="this.dataset.oldValue = this.value; this.value = '';" 
                           onblur="if(this.value === '') this.value = this.dataset.oldValue;" 
                           onchange="this.blur(); xuLyThayDoiBoLocPPCT('mon');" 
                           class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-blue-50 text-center" placeholder="Chọn môn">
                    <datalist id="listMonPPCT"></datalist>
                </div>
                <div id="khungThongTinGvbmPPCT" class="hidden flex-col">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Sắp xếp bảng</label>
                    <select id="chonSapXepGvbmPPCT" onchange="sapXepGvbmPPCT = this.value; veBangGvbmPPCT(document.getElementById('locMonPPCT').value.trim());" class="px-2 py-1.5 border border-indigo-300 rounded bg-indigo-50 text-indigo-900 font-bold text-xs h-[34px] outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="lop">Gom theo Tên lớp</option>
                        <option value="ngay">Theo Ngày dạy</option>
                    </select>
                </div>
                <div id="khungBadgePhanCongGvbmPPCT" class="hidden items-center px-3 py-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold h-[34px]">
                    Lọc tất cả các lớp được phân công dạy trong tuần
                </div>
               <button id="nutXemPPCT" onclick="taiDuLieuTkbVaPpct()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-6 rounded shadow transition duration-200 text-sm ml-auto flex items-center gap-2 h-[34px]">
                    Xem
                </button>
            </div>

            <div class="flex-1 overflow-auto border border-gray-400 shadow-sm bg-white relative">
                <table class="bang-excel w-full text-center border-collapse">
                    <thead id="theadBangPPCT" class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm border-b-2 border-slate-400">
                        <tr>
                            <th class="py-2.5 px-2 border border-slate-400 w-28">Thứ / Ngày</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-20">Buổi</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-12">Tiết</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-32">Môn</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-24">Tiết PPCT</th>
                            <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[250px]">Tên bài dạy</th>
                            <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[200px]">Điều chỉnh/Bổ sung/Tích hợp</th>
                        </tr>
                    </thead>
                    <tbody id="vungDuLieuLichPPCT">
                        <tr><td colspan="7" class="text-center py-10 text-slate-500 font-bold italic">Vui lòng chọn Tuần, Lớp và bấm "Xác nhận"</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        vungHienThi.appendChild(khungPPCT);
    }
}

function capNhatTieuDeBangPPCT() {
    const thead = document.getElementById('theadBangPPCT');
    if (!thead) return;
    if (cheDoXemPPCT === 'gvbm') {
        thead.innerHTML = `
            <tr>
                <th class="py-2.5 px-3 border border-slate-400 w-28">Tên lớp</th>
                <th class="py-2.5 px-3 border border-slate-400 w-44">Ngày dạy</th>
                <th class="py-2.5 px-2 border border-slate-400 w-24">Tiết PPCT</th>
                <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[260px]">Tên bài học</th>
                <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[220px]">Nội dung điều chỉnh</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th class="py-2.5 px-2 border border-slate-400 w-28">Thứ / Ngày</th>
                <th class="py-2.5 px-2 border border-slate-400 w-20">Buổi</th>
                <th class="py-2.5 px-2 border border-slate-400 w-12">Tiết</th>
                <th class="py-2.5 px-2 border border-slate-400 w-32">Môn</th>
                <th class="py-2.5 px-2 border border-slate-400 w-24">Tiết PPCT</th>
                <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[250px]">Tên bài dạy</th>
                <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[200px]">Điều chỉnh/Bổ sung/Tích hợp</th>
            </tr>
        `;
    }
}

function chuyenCheDoXemPPCT(cheDoMoi) {
    if (cheDoMoi !== 'lop' && cheDoMoi !== 'gvbm') return;
    cheDoXemPPCT = cheDoMoi;

    const btnLop = document.getElementById('btnCheDoLopPPCT');
    const btnGvbm = document.getElementById('btnCheDoGvbmPPCT');
    const khungLop = document.getElementById('khungLocLopPPCT');
    const khungKhoi = document.getElementById('khungLocKhoiPPCT');
    const khungSortGvbm = document.getElementById('khungThongTinGvbmPPCT');
    const khungBadgeGvbm = document.getElementById('khungBadgePhanCongGvbmPPCT');

    if (cheDoXemPPCT === 'gvbm') {
        if (btnLop) btnLop.className = 'px-3 py-1 text-xs font-bold rounded transition text-blue-900 hover:bg-blue-100 whitespace-nowrap';
        if (btnGvbm) btnGvbm.className = 'px-3 py-1 text-xs font-bold rounded transition bg-blue-600 text-white shadow-sm whitespace-nowrap';
        if (khungLop) khungLop.classList.add('hidden');
        if (khungKhoi) khungKhoi.classList.add('hidden');
        if (khungSortGvbm) { khungSortGvbm.classList.remove('hidden'); khungSortGvbm.classList.add('flex'); }
        if (khungBadgeGvbm) { khungBadgeGvbm.classList.remove('hidden'); khungBadgeGvbm.classList.add('flex'); }
    } else {
        if (btnLop) btnLop.className = 'px-3 py-1 text-xs font-bold rounded transition bg-blue-600 text-white shadow-sm whitespace-nowrap';
        if (btnGvbm) btnGvbm.className = 'px-3 py-1 text-xs font-bold rounded transition text-blue-900 hover:bg-blue-100 whitespace-nowrap';
        if (khungLop) khungLop.classList.remove('hidden');
        if (khungKhoi) khungKhoi.classList.remove('hidden');
        if (khungSortGvbm) { khungSortGvbm.classList.add('hidden'); khungSortGvbm.classList.remove('flex'); }
        if (khungBadgeGvbm) { khungBadgeGvbm.classList.add('hidden'); khungBadgeGvbm.classList.remove('flex'); }
    }

    capNhatTieuDeBangPPCT();
    _chuKyBoLocPPCT = '';
    _chuKyBoLocMonGvbmPPCT = '';

    if (cheDoXemPPCT === 'gvbm') {
        bomDuLieuVaoBoLoc(false);
        taiDuLieuGvbmPPCT(false);
    } else {
        bomDuLieuVaoBoLoc(false);
        taiDuLieuTkbVaPpct(false);
    }
    capNhatHienThiNutKhoaSuaPPCT();
}

// =========================================================================
// KHỐI 1.5: ĐIỀU KHIỂN BẬT/TẮT TRẠNG THÁI SỬA DỮ LIỆU VÀ BẮT SỰ KIỆN GHI ĐÈ
// =========================================================================
function chuanHoaDinhDanhGvPPCT(giaTri) {
    if (giaTri === undefined || giaTri === null) return '';
    return String(giaTri).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function layTapDinhDanhNguoiDangNhapPPCT() {
    let tap = new Set();
    let them = (v) => {
        if (v === undefined || v === null) return;
        if (typeof v === 'object') {
            ['idGv', 'maGv', 'id', 'ma', 'tenGv', 'hoTen', 'ten', 'name', 'tenHienThi', 'displayName', 'fullName', 'hoVaTen', 'maGiaoVien', 'tenGiaoVien', 'giaoVien', 'nguoiDung', 'email', 'taiKhoan', 'username', 'gv'].forEach(k => {
                if (v[k] !== undefined && v[k] !== null) {
                    let s = chuanHoaDinhDanhGvPPCT(v[k]);
                    if (s) tap.add(s);
                }
            });
            return;
        }
        let s = chuanHoaDinhDanhGvPPCT(v);
        if (s && s !== 'guest' && s !== 'khách' && s !== 'public' && s !== 'công khai') tap.add(s);
    };

    if (typeof quyenChiTiet !== 'undefined' && quyenChiTiet) them(quyenChiTiet);
    if (typeof nguoiDungHienTai !== 'undefined' && nguoiDungHienTai) them(nguoiDungHienTai);
    if (typeof taiKhoanDangNhap !== 'undefined' && taiKhoanDangNhap) them(taiKhoanDangNhap);
    if (typeof userHienTai !== 'undefined' && userHienTai) them(userHienTai);
    if (typeof currentUser !== 'undefined' && currentUser) them(currentUser);
    if (typeof gvDangNhap !== 'undefined' && gvDangNhap) them(gvDangNhap);
    if (typeof giaoVienDangNhap !== 'undefined' && giaoVienDangNhap) them(giaoVienDangNhap);
    if (typeof idGvDangNhap !== 'undefined' && idGvDangNhap) them(idGvDangNhap);
    if (typeof maGvDangNhap !== 'undefined' && maGvDangNhap) them(maGvDangNhap);
    if (typeof tenGvDangNhap !== 'undefined' && tenGvDangNhap) them(tenGvDangNhap);
    if (typeof emailDangNhap !== 'undefined' && emailDangNhap) them(emailDangNhap);
    if (typeof emailHienTai !== 'undefined' && emailHienTai) them(emailHienTai);
    if (typeof window.HT_SSO === 'object' && window.HT_SSO) {
        them(window.HT_SSO.currentUser || window.HT_SSO.user || window.HT_SSO);
    }
    try {
        let ssoToken = localStorage.getItem('HT_SSO_TOKEN');
        if (ssoToken && ssoToken.split('.').length === 3) {
            let b64 = ssoToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            let jsonPayload = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            let payload = JSON.parse(jsonPayload);
            if (payload) them(payload);
        }
    } catch (eSso) {}

    // Đối chiếu chéo qua danh sách giáo viên (nếu có) để đồng bộ giữa Mã GV, Tên GV và Email
    let dsGv = (typeof thongSoHocVu !== 'undefined' && (thongSoHocVu.DANH_SACH_GV || thongSoHocVu.DANH_SACH_GIAO_VIEN || thongSoHocVu.DM_GIAOVIEN || thongSoHocVu.GIAO_VIEN))
        || (typeof danhSachGiaoVien !== 'undefined' ? danhSachGiaoVien : (typeof dmGiaoVien !== 'undefined' ? dmGiaoVien : (typeof danhMucGiaoVien !== 'undefined' ? danhMucGiaoVien : null)));
    if (Array.isArray(dsGv) && tap.size > 0) {
        dsGv.forEach(gv => {
            if (!gv || typeof gv !== 'object') return;
            let cacGiaTri = [gv.id, gv.idGv, gv.maGv, gv.ma, gv.ten, gv.hoTen, gv.tenGv, gv.email, gv['Mã GV'], gv['ID'], gv['Họ tên'], gv['Tên GV'], gv['Email']];
            let khop = cacGiaTri.some(val => {
                let s = chuanHoaDinhDanhGvPPCT(val);
                return s && tap.has(s);
            });
            if (khop) {
                cacGiaTri.forEach(val => {
                    let s = chuanHoaDinhDanhGvPPCT(val);
                    if (s) tap.add(s);
                });
            }
        });
    }

    return tap;
}

function banGhiTkbCoThongTinGvPPCT(item) {
    if (!item || typeof item !== 'object') return false;
    let cacTruongGv = [
        item.maGv, item.idGv, item.giaoVien, item.tenGv, item.gv, item.nguoiDay,
        item.idGiaoVien, item.maGiaoVien, item.gvDay, item.email, item.emailGv,
        item['Mã GV'], item['ID GV'], item['ID'], item['Giáo viên'], item['Tên GV'], item['Người dạy'], item['GV dạy'], item['Mã giáo viên'], item['Email']
    ];
    return cacTruongGv.some(val => chuanHoaDinhDanhGvPPCT(val) !== '');
}

function banGhiTkbKhopNguoiDayPPCT(item, tapNguoiDung) {
    if (!item || typeof item !== 'object' || tapNguoiDung.size === 0) return false;
    let cacTruongGv = [
        item.maGv, item.idGv, item.giaoVien, item.tenGv, item.gv, item.nguoiDay,
        item.idGiaoVien, item.maGiaoVien, item.gvDay, item.email, item.emailGv,
        item['Mã GV'], item['ID GV'], item['ID'], item['Giáo viên'], item['Tên GV'], item['Người dạy'], item['GV dạy'], item['Mã giáo viên'], item['Email']
    ];
    for (let i = 0; i < cacTruongGv.length; i++) {
        let val = chuanHoaDinhDanhGvPPCT(cacTruongGv[i]);
        if (val && tapNguoiDung.has(val)) return true;
    }
    return false;
}

function monHocKhopPPCT(monA, monB) {
    let a = String(monA || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    let b = String(monB || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    if (!a || !b) return false;
    if (a === b) return true;
    let aGoc = a.replace(/[0-9\(\)]/g, '').trim();
    let bGoc = b.replace(/[0-9\(\)]/g, '').trim();
    return aGoc !== '' && aGoc === bGoc;
}

function layDanhSachMonPhanCongCuaGvPPCT(tuanMucTieu) {
    let tuanSo = parseInt(String(tuanMucTieu || 1).replace(/\D/g, ''), 10) || 1;
    let tapNguoiDung = layTapDinhDanhNguoiDangNhapPPCT();
    let tapMon = new Map();
    let themMon = (m) => {
        let s = String(m || '').trim();
        if (!s || s === '--' || s === '---') return;
        let k = s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        if (!tapMon.has(k)) tapMon.set(k, s);
    };

    if (tapNguoiDung.size > 0) {
        if (typeof window.sangLocTkbTuanDaCo === 'function') {
            let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
                ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
                : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);
            let nguon = (tuanSo < tuanHT) ? 'DATA_TKB' : ((tuanSo > tuanHT) ? 'TKB_CoDinh' : 'TKB_HIEN_TAI');
            let kqTuan = window.sangLocTkbTuanDaCo(tuanSo, nguon);
            if (kqTuan && Array.isArray(kqTuan.ds)) {
                kqTuan.ds.forEach(t => {
                    if (banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) themMon(t.monHoc);
                });
            }
        }
        if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai)) {
            duLieuTkbHienTai.forEach(t => {
                if (banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) themMon(t.monHoc);
            });
        }
        let dsPhanCong = (typeof thongSoHocVu !== 'undefined' && Array.isArray(thongSoHocVu.PHAN_CONG))
            ? thongSoHocVu.PHAN_CONG
            : ((typeof duLieuPhanCong !== 'undefined' && Array.isArray(duLieuPhanCong)) ? duLieuPhanCong : null);
        if (dsPhanCong) {
            dsPhanCong.forEach(pc => {
                if (banGhiTkbKhopNguoiDayPPCT(pc, tapNguoiDung)) {
                    themMon(pc.monHoc || pc.mon || pc['Môn'] || pc['Môn Học'] || pc['Môn học']);
                }
            });
        }
        if (Array.isArray(duLieuTkbTuan)) {
            duLieuTkbTuan.forEach(t => {
                if (banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) themMon(t.monHoc);
            });
        }
        if (duLieuGvbmTheoLop && typeof duLieuGvbmTheoLop === 'object') {
            Object.values(duLieuGvbmTheoLop).forEach(goi => {
                if (goi && Array.isArray(goi.dsTkb)) {
                    goi.dsTkb.forEach(t => {
                        if (banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) themMon(t.monHoc);
                    });
                }
            });
        }
        if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
            duLieuTKBGopDaMap.forEach(d => {
                if (banGhiTkbKhopNguoiDayPPCT(d, tapNguoiDung)) themMon(d['Môn Học'] || d.monHoc);
            });
        }
        if (typeof window.mapTkbToanTap === 'object' && window.mapTkbToanTap) {
            Object.values(window.mapTkbToanTap).forEach(d => {
                if (banGhiTkbKhopNguoiDayPPCT(d, tapNguoiDung)) themMon(d['Môn Học'] || d.monHoc);
            });
        }
    }
    return Array.from(tapMon.values()).sort((a, b) => a.localeCompare(b, 'vi'));
}

function layDanhSachMonChoCheDoGvbmPPCT(tuanMucTieu) {
    let dsMonPc = layDanhSachMonPhanCongCuaGvPPCT(tuanMucTieu);
    if (dsMonPc.length > 0) return dsMonPc;

    // Dự phòng riêng cho chế độ GVBM: lấy các môn thực tế có trong TKB của các lớp được phân công
    let tapMon = new Map();
    let themMon = (m) => {
        let s = String(m || '').trim();
        if (!s || s === '--' || s === '---') return;
        let k = s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        if (!tapMon.has(k)) tapMon.set(k, s);
    };
    if (duLieuGvbmTheoLop && typeof duLieuGvbmTheoLop === 'object') {
        Object.values(duLieuGvbmTheoLop).forEach(goi => {
            if (goi && Array.isArray(goi.dsTkb)) {
                goi.dsTkb.forEach(t => themMon(t.monHoc));
            }
        });
    }
    return Array.from(tapMon.values()).sort((a, b) => a.localeCompare(b, 'vi'));
}

function layDanhSachLopPhanCongGvbmPPCT(tuanMucTieu, monMucTieu = '') {
    let tuanSo = parseInt(String(tuanMucTieu || 1).replace(/\D/g, ''), 10) || 1;
    let monChon = String(monMucTieu || '').trim();
    let isXemTatCaMon = (monChon === '' || monChon.toLowerCase() === 'tất cả');
    let tapNguoiDung = layTapDinhDanhNguoiDangNhapPPCT();

    let tapLopMap = new Map(); // upper -> original
    let themLop = (lop) => {
        let s = String(lop || '').trim();
        if (!s) return;
        let k = s.toUpperCase();
        if (!tapLopMap.has(k)) tapLopMap.set(k, s);
    };

    // 1. Kiểm tra theo TKB thực tế của tuần đó (hoặc TKB hiện tại / DATA_TKB / mapTkbToanTap)
    const quetDanhSachTkb = (ds, laTuanMucTieu) => {
        if (!Array.isArray(ds)) return;
        for (let i = 0; i < ds.length; i++) {
            let t = ds[i];
            let lop = t.maLop || t['Mã Lớp'] || t.lop || t['Lớp'] || '';
            let mon = t.monHoc || t['Môn Học'] || t.mon || t['Môn'] || '';
            if (!lop || !mon || mon === '--' || mon === '---') continue;
            if (!isXemTatCaMon && !monHocKhopPPCT(mon, monChon)) continue;
            if (tapNguoiDung.size > 0 && banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) {
                themLop(lop);
            }
        }
    };

    if (typeof window.sangLocTkbTuanDaCo === 'function') {
        let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
            ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
            : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);
        let nguon = (tuanSo < tuanHT) ? 'DATA_TKB' : ((tuanSo > tuanHT) ? 'TKB_CoDinh' : 'TKB_HIEN_TAI');
        let kqTuan = window.sangLocTkbTuanDaCo(tuanSo, nguon);
        if (kqTuan && Array.isArray(kqTuan.ds)) {
            quetDanhSachTkb(kqTuan.ds, true);
        }
    }

    if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai)) {
        quetDanhSachTkb(duLieuTkbHienTai, false);
    }

    if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
        let dsDungTuan = duLieuTKBGopDaMap.filter(d => {
            let tD = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            return tD === 0 || tD === tuanSo;
        });
        quetDanhSachTkb(dsDungTuan.length > 0 ? dsDungTuan : duLieuTKBGopDaMap, false);
    }

    if (typeof window.mapTkbToanTap === 'object' && window.mapTkbToanTap) {
        let dsMap = Object.values(window.mapTkbToanTap);
        quetDanhSachTkb(dsMap, false);
    }

    // 2. Bổ sung từ bảng Phân công chuyên môn (PHAN_CONG) nếu có
    let dsPhanCong = (typeof thongSoHocVu !== 'undefined' && Array.isArray(thongSoHocVu.PHAN_CONG))
        ? thongSoHocVu.PHAN_CONG
        : ((typeof duLieuPhanCong !== 'undefined' && Array.isArray(duLieuPhanCong)) ? duLieuPhanCong : null);
    if (dsPhanCong && tapNguoiDung.size > 0) {
        for (let i = 0; i < dsPhanCong.length; i++) {
            let pc = dsPhanCong[i];
            let lopPc = String(pc.maLop || pc.lop || pc['Lớp'] || pc['Mã Lớp'] || '').trim();
            let monPc = String(pc.monHoc || pc.mon || pc['Môn'] || pc['Môn Học'] || pc['Môn học'] || '').trim();
            if (!lopPc) continue;
            if (!isXemTatCaMon && monPc && !monHocKhopPPCT(monPc, monChon)) continue;
            if (banGhiTkbKhopNguoiDayPPCT(pc, tapNguoiDung)) {
                themLop(lopPc);
            }
        }
    }

    // 3. Kết hợp hàm sàng lọc lớp của Sổ đầu bài (nếu là tuần tương lai thì kế thừa phân công của tuần hiện tại)
    let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);

    if (tapLopMap.size === 0 && typeof window.layDanhSachLopDuocDayTheoTuanSDB === 'function') {
        try {
            let dsSdb = window.layDanhSachLopDuocDayTheoTuanSDB(tuanSo);
            if ((!Array.isArray(dsSdb) || dsSdb.length === 0) && tuanSo > tuanHT) {
                dsSdb = window.layDanhSachLopDuocDayTheoTuanSDB(tuanHT);
            }
            if (Array.isArray(dsSdb)) {
                dsSdb.forEach(l => themLop(l));
            }
        } catch (eSdb) {}
    }

    // 3.5 Dự phòng riêng cho tuần tương lai: kế thừa lớp từ TKB tuần hiện tại nếu TKB_CoDinh chưa có
    if (tapLopMap.size === 0 && tuanSo > tuanHT && typeof window.sangLocTkbTuanDaCo === 'function') {
        let kqTuanHT = window.sangLocTkbTuanDaCo(tuanHT, 'TKB_HIEN_TAI');
        if (kqTuanHT && Array.isArray(kqTuanHT.ds)) {
            quetDanhSachTkb(kqTuanHT.ds, false);
        }
    }

    // 4. Dự phòng riêng cho Admin/BGH không có tiết đứng lớp cá nhân: cho phép xem toàn trường theo môn
    let laCheDoAdminFallback = false;
    if (tapLopMap.size === 0 && laAdminHoacBghPPCT() && typeof thongSoHocVu !== 'undefined' && Array.isArray(thongSoHocVu.DANH_SACH_LOP)) {
        thongSoHocVu.DANH_SACH_LOP.forEach(l => themLop(l));
        laCheDoAdminFallback = true;
    }

    // Sắp xếp danh sách lớp theo thứ tự tự nhiên (6A, 6B, 7A...)
    let dsKetQua = Array.from(tapLopMap.values()).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
    return { dsLop: dsKetQua, laCheDoAdminFallback };
}

function kiemTraQuyenDayLopPPCT(lopMucTieu, tuanMucTieu) {
    let lopStr = String(lopMucTieu || '').trim();
    if (!lopStr) return false;
    let lopUpper = lopStr.toUpperCase();
    let tuanSo = parseInt(String(tuanMucTieu || 1).replace(/\D/g, ''), 10) || 1;
    let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);

    // 0. Ưu tiên dùng hàm sàng lọc lớp được dạy chuẩn của Sổ đầu bài (tuần tương lai kế thừa từ tuần hiện tại giống GVBM)
    if (typeof window.layDanhSachLopDuocDayTheoTuanSDB === 'function') {
        try {
            let dsLopDuocDay = window.layDanhSachLopDuocDayTheoTuanSDB(tuanSo);
            if ((!Array.isArray(dsLopDuocDay) || dsLopDuocDay.length === 0) && tuanSo > tuanHT) {
                dsLopDuocDay = window.layDanhSachLopDuocDayTheoTuanSDB(tuanHT);
            }
            if (Array.isArray(dsLopDuocDay) && dsLopDuocDay.some(l => String(l || '').trim().toUpperCase() === lopUpper)) {
                return true;
            }
        } catch (eSdbFn) {}
    }

    let tapNguoiDung = layTapDinhDanhNguoiDangNhapPPCT();
    if (tapNguoiDung.size === 0) return false;

    // 1. Kiểm tra trực tiếp trong duLieuTkbTuan đang hiển thị
    if (Array.isArray(duLieuTkbTuan) && duLieuTkbTuan.length > 0) {
        for (let i = 0; i < duLieuTkbTuan.length; i++) {
            let t = duLieuTkbTuan[i];
            if (String(t.monHoc || '').trim() !== '' && banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) {
                return true;
            }
        }
    }

    // 2. Kiểm tra trong bộ nhớ đa tuần của app.js (window.sangLocTkbTuanDaCo)
    if (typeof window.sangLocTkbTuanDaCo === 'function') {
        let tuanHT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
            ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
            : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);
        let nguon = (tuanSo < tuanHT) ? 'DATA_TKB' : ((tuanSo > tuanHT) ? 'TKB_CoDinh' : 'TKB_HIEN_TAI');
        let kqTuan = window.sangLocTkbTuanDaCo(tuanSo, nguon);
        if (kqTuan && Array.isArray(kqTuan.ds)) {
            for (let i = 0; i < kqTuan.ds.length; i++) {
                let t = kqTuan.ds[i];
                if (String(t.maLop || '').trim().toUpperCase() === lopUpper &&
                    String(t.monHoc || '').trim() !== '' &&
                    banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) {
                    return true;
                }
            }
        }
    }

    // 3. Kiểm tra trong duLieuTkbHienTai của app.js
    if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai)) {
        for (let i = 0; i < duLieuTkbHienTai.length; i++) {
            let t = duLieuTkbHienTai[i];
            if (String(t.maLop || '').trim().toUpperCase() === lopUpper &&
                String(t.monHoc || '').trim() !== '' &&
                banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) {
                return true;
            }
        }
    }

    // 4. Kiểm tra trong duLieuTKBGopDaMap & window.mapTkbToanTap của SoDauBai.js
    if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
        for (let i = 0; i < duLieuTKBGopDaMap.length; i++) {
            let d = duLieuTKBGopDaMap[i];
            let tD = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            if (String(d['Mã Lớp'] || '').trim().toUpperCase() === lopUpper &&
                (tD === 0 || tD === tuanSo) &&
                String(d['Môn Học'] || '').trim() !== '' &&
                banGhiTkbKhopNguoiDayPPCT(d, tapNguoiDung)) {
                return true;
            }
        }
    }
    if (typeof window.mapTkbToanTap === 'object' && window.mapTkbToanTap) {
        let dsMap = Object.values(window.mapTkbToanTap);
        for (let i = 0; i < dsMap.length; i++) {
            let d = dsMap[i];
            let tD = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            if (String(d['Mã Lớp'] || d.maLop || '').trim().toUpperCase() === lopUpper &&
                (tD === 0 || tD === tuanSo) &&
                String(d['Môn Học'] || d.monHoc || '').trim() !== '' &&
                banGhiTkbKhopNguoiDayPPCT(d, tapNguoiDung)) {
                return true;
            }
        }
    }

    // 5. Dự phòng: Kiểm tra trong bảng Phân công chuyên môn (nếu đã nạp trong thongSoHocVu hoặc biến toàn cục)
    let dsPhanCong = (typeof thongSoHocVu !== 'undefined' && Array.isArray(thongSoHocVu.PHAN_CONG))
        ? thongSoHocVu.PHAN_CONG
        : ((typeof duLieuPhanCong !== 'undefined' && Array.isArray(duLieuPhanCong)) ? duLieuPhanCong : null);
    if (dsPhanCong) {
        for (let i = 0; i < dsPhanCong.length; i++) {
            let pc = dsPhanCong[i];
            let lopPc = String(pc.maLop || pc.lop || pc['Lớp'] || pc['Mã Lớp'] || '').trim().toUpperCase();
            if (lopPc === lopUpper && banGhiTkbKhopNguoiDayPPCT(pc, tapNguoiDung)) {
                return true;
            }
        }
    }

    // 6. Đồng bộ với bộ lọc lớp được phân công (bao gồm kế thừa tuần tương lai từ tuần hiện tại giống GVBM)
    if (typeof layDanhSachLopPhanCongGvbmPPCT === 'function') {
        let { dsLop: dsLopPc } = layDanhSachLopPhanCongGvbmPPCT(tuanSo, '');
        if (Array.isArray(dsLopPc) && dsLopPc.some(l => String(l || '').trim().toUpperCase() === lopUpper)) {
            return true;
        }
        if (tuanSo > tuanHT) {
            let { dsLop: dsLopPcHT } = layDanhSachLopPhanCongGvbmPPCT(tuanHT, '');
            if (Array.isArray(dsLopPcHT) && dsLopPcHT.some(l => String(l || '').trim().toUpperCase() === lopUpper)) {
                return true;
            }
        }
    }

    // 7. Kế thừa trực tiếp quyền dạy lớp ở tuần hiện tại cho các tuần tương lai (> tuanHT)
    if (tuanSo > tuanHT) {
        if (typeof window.sangLocTkbTuanDaCo === 'function') {
            let kqTuanHT = window.sangLocTkbTuanDaCo(tuanHT, 'TKB_HIEN_TAI');
            if (kqTuanHT && Array.isArray(kqTuanHT.ds)) {
                for (let i = 0; i < kqTuanHT.ds.length; i++) {
                    let t = kqTuanHT.ds[i];
                    if (String(t.maLop || '').trim().toUpperCase() === lopUpper &&
                        String(t.monHoc || '').trim() !== '' &&
                        banGhiTkbKhopNguoiDayPPCT(t, tapNguoiDung)) {
                        return true;
                    }
                }
            }
        }
        return kiemTraQuyenDayLopPPCT(lopStr, tuanHT);
    }

    return false;
}

function laAdminHoacBghPPCT() {
    if (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) return true;
    if (typeof laAdmin !== 'undefined' && laAdmin) return true;
    if (typeof isAdmin !== 'undefined' && isAdmin) return true;
    if (typeof laBGH !== 'undefined' && laBGH) return true;
    if (typeof isBGH !== 'undefined' && isBGH) return true;

    const kiemTraChuoiVaiTro = (val) => {
        let s = chuanHoaDinhDanhGvPPCT(val);
        if (!s) return false;
        return s === 'admin' || s === 'bgh' || s.includes('admin') || s.includes('quản trị') ||
               s.includes('ban giám hiệu') || s.includes('hiệu trưởng') || s.includes('phó hiệu trưởng');
    };

    if (typeof vaiTroHienTai !== 'undefined' && kiemTraChuoiVaiTro(vaiTroHienTai)) return true;
    if (typeof chucVuHienTai !== 'undefined' && kiemTraChuoiVaiTro(chucVuHienTai)) return true;

    if (typeof quyenChiTiet !== 'undefined' && quyenChiTiet && typeof quyenChiTiet === 'object') {
        if (quyenChiTiet.isAdmin || quyenChiTiet.laAdmin || quyenChiTiet.isBGH || quyenChiTiet.laBGH) return true;
        if (['vaiTro', 'role', 'chucVu', 'loaiTaiKhoan', 'nhomQuyen'].some(k => kiemTraChuoiVaiTro(quyenChiTiet[k]))) {
            return true;
        }
        let danhSachNut = [];
        ['nut', 'chucNang', 'quyen', 'buttons', 'permissions'].forEach(k => {
            if (Array.isArray(quyenChiTiet[k])) danhSachNut = danhSachNut.concat(quyenChiTiet[k]);
        });
        if (danhSachNut.includes('btnKhoaSoDauBai') || danhSachNut.includes('nutSuaDuLieuPPCT')) return true;
    }

    return false;
}

function coQuyenDangNhapPPCT() {
    if (laAdminHoacBghPPCT()) return true;
    if (layTapDinhDanhNguoiDangNhapPPCT().size > 0) return true;
    if (typeof quyenChiTiet !== 'undefined' && quyenChiTiet && Array.isArray(quyenChiTiet.menu) && quyenChiTiet.menu.includes('menuPhanPhoiChuongTrinh')) return true;
    return false;
}

function capNhatHienThiNutKhoaSuaPPCT() {
    const laQuanTri = laAdminHoacBghPPCT();

    const nutNhapExcel = document.getElementById('nutNhapExcelPPCT');
    if (nutNhapExcel) nutNhapExcel.style.display = (laQuanTri && cheDoXemPPCT === 'lop') ? 'flex' : 'none';

    const nutLuu = document.getElementById('nutLuuPPCT');

    const nutSua = document.getElementById('nutSuaDuLieuPPCT');
    if (!nutSua) return;

    const elLop = document.getElementById('locLopPPCT');
    const elTuan = document.getElementById('locTuanUI');
    const lop = elLop ? elLop.value.trim() : '';
    const tuan = elTuan ? elTuan.value.trim() : '1';

    const daDangNhap = coQuyenDangNhapPPCT();
    const coDongDuLieu = document.querySelectorAll('#vungDuLieuLichPPCT [data-loai="tietPpc"]').length > 0;

    let coQuyenSua = false;
    if (daDangNhap && coDongDuLieu) {
        if (cheDoXemPPCT === 'gvbm') {
            coQuyenSua = laQuanTri || Object.keys(duLieuGvbmTheoLop).length > 0;
        } else {
            coQuyenSua = laQuanTri || (lop !== '' && kiemTraQuyenDayLopPPCT(lop, tuan));
        }
    }
    const dangXemTruocExcel = laQuanTri && cheDoXemPPCT === 'lop' && document.querySelectorAll('#vungDuLieuLichPPCT .dong-xem-truoc-excel').length > 0;
    nutSua.style.display = coQuyenSua ? 'flex' : 'none';
    if (nutLuu) {
        nutLuu.style.display = dangXemTruocExcel ? 'flex' : nutSua.style.display;
    }

    if (!coQuyenSua && trangThaiChoPhepSua) {
        trangThaiChoPhepSua = false;
        nutSua.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow transition-colors duration-300 flex items-center gap-1.5 text-sm';
        nutSua.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Khóa Sửa
        `;
        capNhatTrangThaiCacO();
    }
}

function chuyenDoiTrangThaiSuaPPCT() {
    const elLop = document.getElementById('locLopPPCT');
    const elTuan = document.getElementById('locTuanUI');
    const lop = elLop ? elLop.value.trim() : '';
    const tuan = elTuan ? elTuan.value.trim() : '1';
    const laQuanTri = laAdminHoacBghPPCT();
    const daDangNhap = coQuyenDangNhapPPCT();
    const coDongDuLieu = document.querySelectorAll('#vungDuLieuLichPPCT [data-loai="tietPpc"]').length > 0;
    const hopLe = daDangNhap && coDongDuLieu && (
        (cheDoXemPPCT === 'gvbm')
            ? (laQuanTri || Object.keys(duLieuGvbmTheoLop).length > 0)
            : (laQuanTri || kiemTraQuyenDayLopPPCT(lop, tuan))
    );
    if (!hopLe) {
        capNhatHienThiNutKhoaSuaPPCT();
        return;
    }

    trangThaiChoPhepSua = !trangThaiChoPhepSua;
    const nutSua = document.getElementById('nutSuaDuLieuPPCT');
    
    if (trangThaiChoPhepSua) {
        nutSua.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded shadow transition-colors duration-300 flex items-center gap-1.5 text-sm';
        nutSua.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            Mở Sửa
        `;
    } else {
        nutSua.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow transition-colors duration-300 flex items-center gap-1.5 text-sm';
        nutSua.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Khóa Sửa
        `;
    }
    const nutLuu = document.getElementById('nutLuuPPCT');
    if (nutLuu && nutSua) nutLuu.style.display = nutSua.style.display;
    capNhatTrangThaiCacO();
}

function capNhatTrangThaiCacO() {
    const cacO = document.querySelectorAll('[data-loai="tietPpc"], [data-loai="tenBai"], [data-loai="dieuChinh"]');
    cacO.forEach(o => {
        o.contentEditable = trangThaiChoPhepSua ? "true" : "false";
        
        // Luôn gỡ sự kiện cũ trước khi gắn mới để tránh lặp (Memory leak)
        o.removeEventListener('input', xuLyKhiNhapDuLieu);
        
        if (trangThaiChoPhepSua) {
            o.classList.add('outline-none', 'ring-1', 'ring-blue-400', 'bg-blue-50/50', 'hover:bg-blue-100', 'cursor-text', 'px-1', 'rounded', 'min-h-[24px]');
            o.addEventListener('input', xuLyKhiNhapDuLieu);
        } else {
            o.classList.remove('outline-none', 'ring-1', 'ring-blue-400', 'bg-blue-50/50', 'hover:bg-blue-100', 'cursor-text', 'px-1', 'rounded', 'min-h-[24px]');
        }
    });
}

function xuLyKhiNhapDuLieu(event) {
    const tr = event.target.closest('tr');
    // Chỉ xử lý gắn cờ 1 lần duy nhất cho mỗi dòng khi phát sinh thay đổi
    if (tr && tr.getAttribute('data-da-sua') !== 'true') {
        tr.setAttribute('data-da-sua', 'true');
        
        // Kích hoạt hiệu ứng cảnh báo trên dòng
        tr.classList.remove('bg-white', 'hover:bg-slate-50');
        tr.classList.add('bg-amber-100', 'hover:bg-amber-200');
        
        const vungBadge = tr.querySelector('.vung-badge-sua');
        if (vungBadge && !vungBadge.querySelector('.badge-sua')) {
            vungBadge.innerHTML += `<div class="badge-sua text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm mt-1 font-bold animate-pulse flex items-center justify-center gap-1 mx-auto w-max"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>ĐÃ SỬA</div>`;
            return;
        }

        // Tìm cột kế tiếp cột Tiết PPCT để gắn badge mà không làm hỏng dữ liệu nhập
        const oTietPpc = tr.querySelector('[data-loai="tietPpc"]');
        if (oTietPpc) {
            const tdMon = oTietPpc.nextElementSibling;
            if (tdMon && !tdMon.querySelector('.badge-sua')) {
                tdMon.innerHTML += `<div class="badge-sua text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm mt-1 font-bold animate-pulse flex items-center justify-center gap-1 mx-auto w-max"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>ĐÃ SỬA</div>`;
            }
        }
    }
}

// =========================================================================
// KHỐI 2: ĐIỀU HƯỚNG TAB VÀ TỰ ĐỘNG HIỂN THỊ TỨC THÌ (0ms)
// =========================================================================
function moTabPhanPhoiChuongTrinh() {
    // 1. Reset TẤT CẢ các menu về trạng thái mặc định (inactive)
    document.querySelectorAll('nav a').forEach(m => {
        m.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group";
        let span = m.querySelector('span');
        if (span) span.className = "font-bold text-white/80 group-hover:text-white transition-colors text-[14px]";
        let svg = m.querySelector('svg');
        if (svg) svg.className = "w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white";
    });
    
    // 2. Kích hoạt hiệu ứng sáng lên cho riêng Menu PPCT
    const mActive = document.getElementById('menuPhanPhoiChuongTrinh');
    if (mActive) {
        mActive.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 shadow-md backdrop-blur-sm cursor-pointer group mt-1";
        let spanActive = mActive.querySelector('span');
        if (spanActive) spanActive.className = "font-bold text-menu-active text-[14px]";
        let svgActive = mActive.querySelector('svg');
        if (svgActive) svgActive.className = "w-5 h-5 flex-none text-menu-active opacity-100";
    }

    // 3. Ẩn tất cả các khung giao diện hiện tại
    let vungChinh = document.getElementById('vungHienThiChinh');
    if (vungChinh) {
        Array.from(vungChinh.children).forEach(el => {
            if (el.tagName === 'DIV' && el.id !== 'khungNoiDungModal' && el.id !== 'khungPhanPhoiChuongTrinh') {
                el.classList.add('hidden');
                el.classList.remove('block', 'flex');
            }
        });
    }
    
    // [ĐÃ SỬA THEO YÊU CẦU]: Ẩn toàn bộ khu vực thanh công cụ TKB (Khu vực viền đỏ)
    const thanhCongCu = document.getElementById('thanhCongCuTKB');
    if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }

    // Ẩn Header hệ thống
    const headerHeThong = document.querySelector('header');
    if (headerHeThong) { headerHeThong.style.display = ''; }

    // 4. Hiện khung PPCT
    const khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
    if (khungPPCT) { khungPPCT.classList.remove('hidden'); khungPPCT.classList.add('flex'); }

    // 5. Nạp dữ liệu vào ô lọc và tự động kết xuất ngay lập tức (0ms nếu đã có trong bộ nhớ)
    bomDuLieuVaoBoLoc();
    if (typeof tuanDangXem !== 'undefined' && (!trangThaiDaTaiGiaoDienPPCT || _tuanDangXemDongBoCuoiPPCT !== tuanDangXem)) {
        let theTuanUI = document.getElementById('locTuanUI');
        if (theTuanUI) theTuanUI.value = tuanDangXem;
        _tuanDangXemDongBoCuoiPPCT = tuanDangXem;
    }

    const tuan = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
    if (cheDoXemPPCT === 'gvbm') {
        if (tuan) {
            trangThaiDaTaiGiaoDienPPCT = true;
            taiDuLieuGvbmPPCT(false);
        }
    } else {
        const lop = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
        const khoi = document.getElementById('locKhoiPPCT') ? document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so') : '';
        if (tuan && lop && khoi && khoi !== 'KX') {
            trangThaiDaTaiGiaoDienPPCT = true;
            taiDuLieuTkbVaPpct(false);
        }
    }
    capNhatHienThiNutKhoaSuaPPCT();
}

let _chuKyBoLocPPCT = '';
function bomDuLieuVaoBoLoc(tuDongTaiKhiThayDoi = false) {
    if (typeof thongSoHocVu !== 'undefined') {
        const dsLopToanTruong = thongSoHocVu.DANH_SACH_LOP || [];
        const dsMonToanTruong = thongSoHocVu.DANH_SACH_MON_HOC || [];
        const elTuan = document.getElementById('locTuanUI');
        const tuan = elTuan ? elTuan.value.trim() : '1';

        const laQuanTri = laAdminHoacBghPPCT();
        const daDangNhap = coQuyenDangNhapPPCT();

        let dsLopHienThi = dsLopToanTruong;
        let daLocLopTheoPhanCong = false;

        if (daDangNhap && !laQuanTri) {
            let { dsLop: dsLopPhanCong } = layDanhSachLopPhanCongGvbmPPCT(tuan, '');
            if (Array.isArray(dsLopPhanCong) && dsLopPhanCong.length > 0) {
                dsLopHienThi = dsLopPhanCong;
                daLocLopTheoPhanCong = true;
            }
        }

        const listLop = document.getElementById('listLopPPCT');
        const listMon = document.getElementById('listMonPPCT');
        const inputLop = document.getElementById('locLopPPCT');
        const inputMon = document.getElementById('locMonPPCT');

        let chuKyMoi = `${cheDoXemPPCT}__${dsLopHienThi.join('|')}__${dsMonToanTruong.join('|')}__${daLocLopTheoPhanCong ? 'PCL' : 'ALLL'}`;
        if (_chuKyBoLocPPCT !== chuKyMoi) {
            _chuKyBoLocPPCT = chuKyMoi;
            if (listLop) listLop.innerHTML = dsLopHienThi.map(lop => `<option value="${lop}">`).join('');
            if (listMon) {
                listMon.innerHTML = `<option value="Tất cả"></option>` + dsMonToanTruong.map(mon => `<option value="${mon}">`).join('');
            }
        }

        let daDoiGiaTriTuDong = false;

        if (inputLop && dsLopHienThi.length > 0 && document.activeElement !== inputLop) {
            let lopHienTaiUpper = inputLop.value.trim().toUpperCase();
            let lopHopLe = lopHienTaiUpper !== '' && (!daLocLopTheoPhanCong || dsLopHienThi.some(l => String(l).trim().toUpperCase() === lopHienTaiUpper));
            if (!lopHopLe) {
                inputLop.value = dsLopHienThi[0];
                tuDongTinhKhoiLop();
                daDoiGiaTriTuDong = true;
            }
        }

        if (inputMon && document.activeElement !== inputMon && inputMon.value === '') {
            inputMon.value = 'Tất cả';
        }

        if (tuDongTaiKhiThayDoi && daDoiGiaTriTuDong) {
            const khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
            if (khungPPCT && !khungPPCT.classList.contains('hidden')) {
                taiDuLieuTkbVaPpct(false);
            }
        }
    }
}

function tuDongTinhKhoiLop() {
    const elLop = document.getElementById('locLopPPCT');
    const inputLop = elLop ? elLop.value.trim() : '';
    const inputKhoi = document.getElementById('locKhoiPPCT');
    if (!inputKhoi) return;
    if (inputLop === '') { inputKhoi.value = ''; return; }
    
    const ketQuaKhoi = inputLop.match(/\d+/);
    if (ketQuaKhoi && ketQuaKhoi.length > 0) {
        inputKhoi.value = `Khối ${ketQuaKhoi[0]}`;
        inputKhoi.setAttribute('data-khoi-so', ketQuaKhoi[0]);
    } else {
        inputKhoi.value = 'KX';
        inputKhoi.setAttribute('data-khoi-so', 'KX');
    }
}

// Bắt sự kiện tức thì khi người dùng ấn nút mũi tên lên/xuống tuần trên ô Tuần học
function xuLyNhapTuanPPCT(elInput) {
    if (!elInput) return;
    let val = elInput.value.trim();
    let tuanSo = parseInt(val, 10);
    if (isNaN(tuanSo) || tuanSo < 1 || tuanSo > 52) return;
    elInput.dataset.oldValue = String(tuanSo);
    if (_boDemDebouncingTuanPPCT) clearTimeout(_boDemDebouncingTuanPPCT);
    _boDemDebouncingTuanPPCT = setTimeout(() => {
        xuLyThayDoiBoLocPPCT('tuan');
    }, 60);
}

// Xử lý thông minh khi người dùng thay đổi Tuần / Lớp / Môn trên bộ lọc
function xuLyThayDoiBoLocPPCT(loaiThayDoi) {
    if (_boDemDebouncingTuanPPCT) {
        clearTimeout(_boDemDebouncingTuanPPCT);
        _boDemDebouncingTuanPPCT = null;
    }
    const tuan = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
    const mon = document.getElementById('locMonPPCT') ? document.getElementById('locMonPPCT').value.trim() : 'Tất cả';

    if (cheDoXemPPCT === 'gvbm') {
        if (!tuan) return;
        if (loaiThayDoi === 'mon' && _tuanDangHienThiGvbmPPCT === tuan && Object.keys(duLieuGvbmTheoLop).length > 0) {
            veBangGvbmPPCT(mon);
            return;
        }
        taiDuLieuGvbmPPCT(false);
        return;
    }

    const lop = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
    const khoi = document.getElementById('locKhoiPPCT') ? document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so') : '';

    if (!tuan || !lop || !khoi || khoi === 'KX') {
        capNhatHienThiNutKhoaSuaPPCT();
        return;
    }

    // Nếu chỉ đổi Môn học mà dữ liệu TKB (tuần_lớp) và PPCT (khối) đã nạp sẵn -> Lọc và vẽ lại tức thì trong 0ms, tuyệt đối không gọi mạng!
    if (loaiThayDoi === 'mon' && _capTuanLopDangHienThiPPCT === `${tuan}_${lop}` && duLieuTkbTuan.length > 0 && duLieuPpctGoc.length > 0) {
        veBangKhungLichPPCT(mon);
        return;
    }

    taiDuLieuTkbVaPpct(false);
}

// Lắng nghe sự kiện click menu để tự động ẩn tab PPCT và khôi phục Header
document.addEventListener('click', function(e) {
    let menuClicked = e.target.closest('nav a');
    if (menuClicked && menuClicked.id !== 'menuPhanPhoiChuongTrinh') {
        let khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
        if (khungPPCT) {
            khungPPCT.classList.remove('flex', 'block');
            khungPPCT.classList.add('hidden');
        }
        let m = document.getElementById('menuPhanPhoiChuongTrinh');
        if (m) {
            m.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group mt-1";
            let span = m.querySelector('span');
            if (span) span.className = "font-bold text-white/80 group-hover:text-white transition-colors text-[14px]";
            let svg = m.querySelector('svg');
            if (svg) svg.className = "w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white";
        }
        
        const headerHeThong = document.querySelector('header');
        if (headerHeThong) { 
            headerHeThong.style.display = ''; // Luôn giữ Header hiển thị ở mọi tab để bảo toàn nút 3 gạch chuyển menu
        }
    }
});

// =========================================================================
// KHỐI 3: SÀNG LỌC DỮ LIỆU ĐÃ CÓ, ĐỐI CHIẾU TÍCH LŨY CHUẨN SỔ ĐẦU BÀI & TẢI SIÊU TỐC
// =========================================================================
window.khoTienDoTichLuyPPCT = window.khoTienDoTichLuyPPCT || {};
window.tapTienDoTichLuyDaXacThucPhien = window.tapTienDoTichLuyDaXacThucPhien || new Set();

// Hàm chuẩn hóa tên môn học về môn gốc (Gộp HĐTN1, HĐTN2, HĐTN3 -> 'hđtn', giữ nguyên 'ai', 'tc toán', 'tc tv'...)
function chuanHoaTenMonGocPPCT(tenMon) {
    if (!tenMon) return '';
    return String(tenMon).normalize('NFC').replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Hàm đếm số tiết từng môn trong 1 danh sách TKB của 1 tuần
function demSoTietTheoMonTrongTuanPPCT(dsTkb) {
    let boDem = {};
    if (!Array.isArray(dsTkb) || dsTkb.length === 0) return boDem;
    let tapSlot = new Set();
    for (let i = 0; i < dsTkb.length; i++) {
        let t = dsTkb[i];
        let mon = String(t.monHoc || t['Môn Học'] || '').trim();
        if (!mon || mon === '--' || mon === '---') continue;
        let thu = String(t.thu || t['Thứ'] || '').trim().toLowerCase();
        let buoi = String(t.buoi || t['Buổi'] || '').trim().toLowerCase();
        let tiet = String(t.tiet || t['Tiết'] || '').trim();
        let slotKey = `${thu}_${buoi}_${tiet}`;
        if (tapSlot.has(slotKey)) continue;
        tapSlot.add(slotKey);
        let mGoc = chuanHoaTenMonGocPPCT(mon);
        if (mGoc) {
            boDem[mGoc] = (boDem[mGoc] || 0) + 1;
        }
    }
    return boDem;
}

// Thuật toán đếm số tiết tích lũy thực tế từ Tuần 1 đến hết Tuần (tuan - 1) giống hệt Tab Sổ đầu bài
// [NÂNG CẤP]: Tự động tịnh tiến chính xác số tiết cho các tuần tương lai (> tuanHienTaiHeThong)
window.layBoDemTichLuyChuanSoDauBai = function(lopMucTieu, tuanMucTieu, dsTkbTuanHienHanh) {
    let tuanSo = parseInt(String(tuanMucTieu || 1).replace(/\D/g, ''), 10) || 1;
    let lopUpper = String(lopMucTieu || '').trim().toUpperCase();
    let boDemTichLuy = {};
    let coLichSuLop = false;

    if (tuanSo <= 1 || !lopUpper) {
        return { boDemTichLuy, coLichSuLop: true };
    }

    let tuanHienTaiHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : ((typeof tuanDangXem !== 'undefined') ? (parseInt(tuanDangXem, 10) || 1) : 1);

    // Mốc lịch sử chuẩn từ DATA_TKB: Nếu đang xem tuần tương lai (> tuanHienTaiHeThong),
    // lấy chuẩn số tiết lịch sử tính đến trước tuần hiện tại (< tuanHienTaiHeThong),
    // sau đó tịnh tiến từng tuần từ tuanHienTaiHeThong đến (tuanSo - 1).
    let tuanMocLichSu = (tuanSo > tuanHienTaiHeThong) ? tuanHienTaiHeThong : tuanSo;
    let namHoc = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? String(thongSoHocVu.NAM_HOC).trim() : '';
    let khoaTichLuyMoc = `${namHoc}_TUAN_${tuanMocLichSu}`;
    let khoaTichLuyTuan = `${namHoc}_TUAN_${tuanSo}`;

    // 1. Nguồn 1: Lấy từ dữ liệu tích lũy chuẩn của máy chủ (API layTienDoTichLuy quét từ DATA_TKB)
    let demTuServer = {};
    if (tuanMocLichSu > 1 && window.khoTienDoTichLuyPPCT) {
        let dataServer = window.khoTienDoTichLuyPPCT[khoaTichLuyMoc] || window.khoTienDoTichLuyPPCT[khoaTichLuyTuan];
        if (dataServer) {
            let objLop = dataServer[lopUpper] || dataServer[lopMucTieu];
            if (objLop && typeof objLop === 'object') {
                Object.keys(objLop).forEach(mon => {
                    let mGoc = chuanHoaTenMonGocPPCT(mon);
                    let soTiet = parseInt(objLop[mon], 10) || 0;
                    if (mGoc && soTiet > 0) {
                        demTuServer[mGoc] = (demTuServer[mGoc] || 0) + soTiet;
                        coLichSuLop = true;
                    }
                });
            }
        }
    }

    // 2. Nguồn 2: Quét từ duLieuTKBGopDaMap (RAM của Sổ đầu bài nếu đã khởi chạy) cho các tuần < tuanMocLichSu
    let demTuRamSDB = {};
    let maxTietLuuSDB = {};
    if (tuanMocLichSu > 1 && typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap) && duLieuTKBGopDaMap.length > 0) {
        let tapSlotDaDem = new Set();
        duLieuTKBGopDaMap.forEach(d => {
            let tTruoc = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            let lTruoc = String(d['Mã Lớp'] || '').trim().toUpperCase();
            if (lTruoc === lopUpper && tTruoc > 0 && tTruoc < tuanMocLichSu) {
                let mon = String(d['Môn Học'] || '').trim();
                if (mon !== '' && mon !== '--' && mon !== '---') {
                    let thu = String(d['Thứ'] || '').trim().toLowerCase();
                    let buoi = String(d['Buổi'] || '').trim().toLowerCase();
                    let tiet = String(d['Tiết'] || '').trim();
                    let slotKey = `${tTruoc}_${thu}_${buoi}_${tiet}`;
                    if (tapSlotDaDem.has(slotKey)) return;
                    tapSlotDaDem.add(slotKey);

                    let mGoc = chuanHoaTenMonGocPPCT(mon);
                    demTuRamSDB[mGoc] = (demTuRamSDB[mGoc] || 0) + 1;
                    coLichSuLop = true;

                    if (d.DaLuu === true) {
                        let tietLuu = parseInt(String(d['TietPPCT_Thuc'] || '').replace(/\D/g, ''), 10) || 0;
                        if (tietLuu > 0) {
                            maxTietLuuSDB[mGoc] = Math.max(maxTietLuuSDB[mGoc] || 0, tietLuu);
                        }
                    }
                }
            }
        });
    }

    // 3. Nguồn 3: Quét từ window.mapTkbToanTap hoặc Snapshot SDB_SNAPSHOT_FAST_V2 trong Storage nếu chưa có Nguồn 1 & 2
    let demTuSnapshot = {};
    if (tuanMocLichSu > 1 && !coLichSuLop) {
        let tapSlotSnap = new Set();
        if (typeof window.mapTkbToanTap === 'object' && window.mapTkbToanTap && Object.keys(window.mapTkbToanTap).length > 0) {
            Object.values(window.mapTkbToanTap).forEach(item => {
                let tTruoc = parseInt(String(item['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
                let lTruoc = String(item['Mã Lớp'] || '').trim().toUpperCase();
                if (lTruoc === lopUpper && tTruoc > 0 && tTruoc < tuanMocLichSu) {
                    let mon = String(item['Môn Học'] || '').trim();
                    if (mon !== '' && mon !== '--' && mon !== '---') {
                        let slotKey = `${tTruoc}_${item['Thứ']}_${item['Buổi']}_${item['Tiết']}`;
                        if (!tapSlotSnap.has(slotKey)) {
                            tapSlotSnap.add(slotKey);
                            let mGoc = chuanHoaTenMonGocPPCT(mon);
                            demTuSnapshot[mGoc] = (demTuSnapshot[mGoc] || 0) + 1;
                            coLichSuLop = true;
                        }
                    }
                }
            });
        }

        if (!coLichSuLop) {
            try {
                let snapKey = layKhoaCachLyPPCT('SDB_SNAPSHOT_FAST_V2');
                let rawSnap = sessionStorage.getItem(snapKey) || localStorage.getItem(snapKey);
                if (rawSnap) {
                    let snap = JSON.parse(rawSnap);
                    let dsData = (snap && Array.isArray(snap.DATA_TKB)) ? snap.DATA_TKB : [];
                    dsData.forEach(dong => {
                        let tTruoc = parseInt(String(dong['C'] || '').replace(/\D/g, ''), 10) || 0;
                        let lTruoc = String(dong['G'] || '').trim().toUpperCase();
                        if (lTruoc === lopUpper && tTruoc > 0 && tTruoc < tuanMocLichSu) {
                            let mon = String(dong['H'] || '').trim();
                            if (mon !== '' && mon !== '--' && mon !== '---') {
                                let slotKey = `${tTruoc}_${dong['D']}_${dong['E']}_${dong['F']}`;
                                if (!tapSlotSnap.has(slotKey)) {
                                    tapSlotSnap.add(slotKey);
                                    let mGoc = chuanHoaTenMonGocPPCT(mon);
                                    demTuSnapshot[mGoc] = (demTuSnapshot[mGoc] || 0) + 1;
                                    coLichSuLop = true;
                                }
                            }
                        }
                    });
                }
            } catch (eSnap) {}
        }
    }

    if (tuanMocLichSu <= 1) {
        coLichSuLop = true;
    }

    // Hợp nhất kết quả lịch sử tính đến hết tuần (tuanMocLichSu - 1)
    let tapMon = new Set([
        ...Object.keys(demTuServer),
        ...Object.keys(demTuRamSDB),
        ...Object.keys(maxTietLuuSDB),
        ...Object.keys(demTuSnapshot)
    ]);

    tapMon.forEach(mGoc => {
        let soTietTkb = (demTuServer[mGoc] !== undefined)
            ? demTuServer[mGoc]
            : ((demTuRamSDB[mGoc] !== undefined) ? demTuRamSDB[mGoc] : (demTuSnapshot[mGoc] || 0));
        let soTietSdb = maxTietLuuSDB[mGoc] || 0;
        boDemTichLuy[mGoc] = Math.max(soTietTkb, soTietSdb);
    });

    // =====================================================================
    // [THUẬT TOÁN TỊNH TIẾN TUẦN TƯƠNG LAI]:
    // Khi người dùng xem tuần tương lai (tuanSo > tuanHienTaiHeThong),
    // cộng dồn chính xác số tiết của từng tuần từ tuanHienTaiHeThong đến (tuanSo - 1)
    // dựa trên Thời khóa biểu của từng tuần trung gian (TKB_HIEN_TAI và TKB_CoDinh).
    // =====================================================================
    if (tuanSo > tuanHienTaiHeThong && coLichSuLop) {
        let dsTkbMacDinh = (Array.isArray(dsTkbTuanHienHanh) && dsTkbTuanHienHanh.length > 0)
            ? dsTkbTuanHienHanh
            : duLieuTkbTuan;
        let demMacDinhTuan = demSoTietTheoMonTrongTuanPPCT(dsTkbMacDinh);

        let khungChuongTrinhLop = {};
        if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH && thongSoHocVu.KHUNG_CHUONG_TRINH[lopMucTieu]) {
            let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lopMucTieu];
            Object.keys(dmKhoi).forEach(m => {
                let bName = chuanHoaTenMonGocPPCT(m);
                if (bName) {
                    khungChuongTrinhLop[bName] = (khungChuongTrinhLop[bName] || 0) + (parseInt(dmKhoi[m], 10) || 0);
                }
            });
        }

        for (let w = tuanHienTaiHeThong; w < tuanSo; w++) {
            let demTuanW = null;
            let kqTkbW = window.sangLocTkbTuanLopDaCo(w, lopMucTieu);
            if (kqTkbW && Array.isArray(kqTkbW.ds) && kqTkbW.ds.length > 0) {
                demTuanW = demSoTietTheoMonTrongTuanPPCT(kqTkbW.ds);
            } else if (Object.keys(demMacDinhTuan).length > 0) {
                demTuanW = demMacDinhTuan;
            } else {
                demTuanW = khungChuongTrinhLop;
            }

            Object.keys(demTuanW).forEach(mGoc => {
                let soTietW = demTuanW[mGoc] || 0;
                if (soTietW > 0) {
                    boDemTichLuy[mGoc] = (boDemTichLuy[mGoc] || 0) + soTietW;
                }
            });

            // Nếu ở tuần hiện tại (w === tuanHienTaiHeThong) giáo viên đã lưu Tiết PPCT thực tế trên Sổ đầu bài thì đồng bộ mốc đó
            if (w === tuanHienTaiHeThong && typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap) && duLieuTKBGopDaMap.length > 0) {
                duLieuTKBGopDaMap.forEach(d => {
                    let tD = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
                    let lD = String(d['Mã Lớp'] || '').trim().toUpperCase();
                    if (tD === tuanHienTaiHeThong && lD === lopUpper && d.DaLuu === true) {
                        let mGoc = chuanHoaTenMonGocPPCT(d['Môn Học']);
                        let tietLuu = parseInt(String(d['TietPPCT_Thuc'] || '').replace(/\D/g, ''), 10) || 0;
                        if (mGoc && tietLuu > 0) {
                            boDemTichLuy[mGoc] = Math.max(boDemTichLuy[mGoc] || 0, tietLuu);
                        }
                    }
                });
            }
        }
    }

    return { boDemTichLuy, coLichSuLop };
};

function fetchVoiTimeoutPPCT(url, options, timeoutMs = 15000) {
    const fetchFn = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;
    return Promise.race([
        fetchFn(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Quá thời gian chờ máy chủ')), timeoutMs))
    ]);
}

async function chayTheoLoPPCT(danhSachHamTacVu, kichThuocLo = 3) {
    const ketQua = [];
    for (let i = 0; i < danhSachHamTacVu.length; i += kichThuocLo) {
        const lo = danhSachHamTacVu.slice(i, i + kichThuocLo).map(fn => fn());
        const kqLo = await Promise.all(lo);
        ketQua.push(...kqLo);
    }
    return ketQua;
}

let _dangTaiPPCT = false;
let _yeuCauTaiLaiPPCT = null;
async function taiDuLieuTkbVaPpct(epDongBo = false) {
    if (cheDoXemPPCT === 'gvbm') {
        return taiDuLieuGvbmPPCT(epDongBo);
    }

    const tuan = document.getElementById('locTuanUI').value.trim();
    const lop = document.getElementById('locLopPPCT').value.trim();
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    const nutXacNhan = document.getElementById('nutXemPPCT') || document.querySelector('button[onclick="taiDuLieuTkbVaPpct()"]');
    if (nutXacNhan && !nutXacNhan.dataset.labelGoc) {
        nutXacNhan.dataset.labelGoc = nutXacNhan.innerHTML.includes('Đang đồng bộ') ? 'Xem' : nutXacNhan.innerHTML;
    }
    const theGocNutXacNhan = (nutXacNhan && nutXacNhan.dataset.labelGoc) ? nutXacNhan.dataset.labelGoc : 'Xem';

    if (!tuan || !lop || !khoi || khoi === 'KX') {
        alert("Đồng chí vui lòng điền đầy đủ: Tuần, Lớp để truy xuất dữ liệu.");
        return;
    }

    const tuanSo = parseInt(tuan, 10) || 1;
    const tuanHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : (typeof tuanDangXem !== 'undefined' ? (parseInt(tuanDangXem, 10) || 1) : 1);
    const tuanMocTichLuy = (tuanSo > tuanHeThong) ? tuanHeThong : tuanSo;
    const namHoc = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? String(thongSoHocVu.NAM_HOC).trim() : '';
    const khoaTichLuy = `${namHoc}_TUAN_${tuanMocTichLuy}`;

    // 1. SÀNG LỌC DỮ LIỆU ĐÃ CÓ TRONG BỘ NHỚ (TKB THEO TUẦN_LỚP, PPCT THEO KHỐI & TIẾN ĐỘ TÍCH LŨY)
    const kqTkbSanCo = window.sangLocTkbTuanLopDaCo(tuan, lop);
    const kqPpctSanCo = window.sangLocPpctKhoiDaCo(khoi);

    const daCoTkb = !!(kqTkbSanCo && Array.isArray(kqTkbSanCo.ds) && kqTkbSanCo.ds.length > 0);
    const daCoPpct = !!(kqPpctSanCo && Array.isArray(kqPpctSanCo.ds) && kqPpctSanCo.ds.length > 0);

    // Dự phòng tương thích ngược với cache khóa cũ nếu có
    const cacheKeyLegacy = `PPCT_CACHE_${tuan}_${lop}_${mon}`;
    let duLieuDemLegacy = null;
    if (!daCoTkb || !daCoPpct) {
        try {
            let rawLegacy = localStorage.getItem(cacheKeyLegacy);
            if (rawLegacy) {
                duLieuDemLegacy = JSON.parse(rawLegacy);
                if (!daCoTkb && Array.isArray(duLieuDemLegacy.duLieuTkb) && duLieuDemLegacy.duLieuTkb.length > 0) {
                    window.khoTkbTuanLopPPCT[`${tuan}_${lop}`] = duLieuDemLegacy.duLieuTkb;
                }
                if (!daCoPpct && Array.isArray(duLieuDemLegacy.duLieuPpct) && duLieuDemLegacy.duLieuPpct.length > 0 && (mon === 'Tất cả' || mon === '')) {
                    luuKhoPpctVaoStorage(khoi, duLieuDemLegacy.duLieuPpct, false);
                }
            }
        } catch (eLeg) {}
    }

    const kqTkbHienHanh = window.sangLocTkbTuanLopDaCo(tuan, lop);
    const kqPpctHienHanh = window.sangLocPpctKhoiDaCo(khoi);
    const coSanTkb = !!(kqTkbHienHanh && Array.isArray(kqTkbHienHanh.ds) && kqTkbHienHanh.ds.length > 0);
    const coSanPpct = !!(kqPpctHienHanh && Array.isArray(kqPpctHienHanh.ds) && kqPpctHienHanh.ds.length > 0);
    const coSanTichLuy = (tuanMocTichLuy <= 1) || window.tapTienDoTichLuyDaXacThucPhien.has(khoaTichLuy);

    // 2. NẾU ĐÃ CÓ DỮ LIỆU TRONG BỘ NHỚ -> KẾT XUẤT NGAY TỨC THÌ (0ms)
    if (coSanTkb && coSanPpct) {
        duLieuTkbTuan = kqTkbHienHanh.ds;
        duLieuPpctGoc = kqPpctHienHanh.ds;
        _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
        veBangKhungLichPPCT(mon);

        // Nếu cả TKB, PPCT và Tiến độ tích lũy các tuần trước đều đã xác thực trong phiên -> Hoàn tất ngay (0ms)!
        if (!epDongBo && kqTkbHienHanh.daXacThucPhien && kqPpctHienHanh.daXacThucPhien && coSanTichLuy) {
            return;
        }
    } else if (coSanTkb && !coSanPpct) {
        duLieuTkbTuan = kqTkbHienHanh.ds;
        duLieuPpctGoc = [];
        _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
        veBangKhungLichPPCT(mon);
    } else if (!coSanTkb && coSanPpct) {
        duLieuPpctGoc = kqPpctHienHanh.ds;
    }

    if (_dangTaiPPCT) {
        _yeuCauTaiLaiPPCT = { epDongBo };
        return;
    }
    _dangTaiPPCT = true;

    const daHienThiTruoc = (coSanTkb && coSanPpct) || coSanTkb;
    if (daHienThiTruoc) {
        if (nutXacNhan) {
            nutXacNhan.innerHTML = `
                <svg class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
                <span class="opacity-90">Đang đồng bộ...</span>`;
            nutXacNhan.classList.add('opacity-80', 'cursor-wait');
        }
    } else {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-blue-600 font-bold reactbits-fade-in">
            <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            Đang trích xuất Thời khoá biểu và Phân phối chương trình...
        </td></tr>`;
        if (nutXacNhan) nutXacNhan.disabled = true;
    }

    // 3. TẢI CHÊNH LỆCH SIÊU TỐC SONG SONG (TKB + PPCT + TIẾN ĐỘ TÍCH LŨY CÁC TUẦN TRƯỚC)
    try {
        const coPpctXacThuc = (!epDongBo && coSanPpct && kqPpctHienHanh.daXacThucPhien) ? '1' : '0';
        const coTkbXacThuc = (!epDongBo && coSanTkb && kqTkbHienHanh.daXacThucPhien) ? '1' : '0';
        const danhSachTacVu = [];

        // Tác vụ 1: Lấy TKB & PPCT nếu chưa đủ
        if (coPpctXacThuc === '0' || coTkbXacThuc === '0') {
            const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTkbVaPpct&tuan=${tuan}&lop=${encodeURIComponent(lop)}&khoi=${khoi}&mon=&tuanHienTai=${tuanHeThong}&daCoPpct=${coPpctXacThuc}&daCoTkb=${coTkbXacThuc}`;
            danhSachTacVu.push(
                fetchVoiTimeoutPPCT(urlAPI).then(r => {
                    if (!r.ok) throw new Error("Mất kết nối máy chủ");
                    return r.json();
                }).then(ketQua => ({ loai: 'TKB_PPCT', ketQua }))
            );
        }

        // Tác vụ 2: Lấy Tiến độ tích lũy thực tế từ Tuần 1 -> (tuanMocTichLuy - 1) trên DATA_TKB để tính chuẩn số tiết như Sổ đầu bài
        if (tuanMocTichLuy > 1 && (epDongBo || !coSanTichLuy)) {
            const urlTichLuy = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTienDoTichLuy&tuan=${tuanMocTichLuy}&namHoc=${encodeURIComponent(namHoc)}`;
            danhSachTacVu.push(
                fetchVoiTimeoutPPCT(urlTichLuy).then(r => r.json()).then(dataTL => ({ loai: 'TICH_LUY', dataTL })).catch(() => ({ loai: 'TICH_LUY', dataTL: null }))
            );
        }

        const ketQuaSongSong = await Promise.all(danhSachTacVu);
        let canVeLai = !daHienThiTruoc;

        ketQuaSongSong.forEach(item => {
            if (item.loai === 'TKB_PPCT' && item.ketQua) {
                const ketQua = item.ketQua;
                if (ketQua.trangThai === 'Lỗi' || ketQua.trangThai === 'loi_he_thong') {
                    throw new Error(ketQua.thongBao || "Lỗi truy xuất từ máy chủ");
                }
                if (Array.isArray(ketQua.duLieuTkb) && (coTkbXacThuc === '0' || ketQua.duLieuTkb.length > 0)) {
                    if (JSON.stringify(duLieuTkbTuan) !== JSON.stringify(ketQua.duLieuTkb)) {
                        canVeLai = true;
                    }
                    duLieuTkbTuan = ketQua.duLieuTkb;
                    window.khoTkbTuanLopPPCT[`${tuan}_${lop}`] = duLieuTkbTuan;
                    window.tapTkbTuanLopDaXacThucPhien.add(`${tuan}_${lop}`);
                    if (tuanSo > tuanHeThong && duLieuTkbTuan.length > 0) {
                        window.khoTkbCoDinhLopPPCT[lop] = saoChepDanhSachTkb(duLieuTkbTuan, true);
                        window.tapTkbCoDinhLopDaXacThucPhien.add(lop);
                    }
                }
                if (Array.isArray(ketQua.duLieuPpct) && (coPpctXacThuc === '0' || ketQua.duLieuPpct.length > 0)) {
                    let dsPpctChuan = [];
                    for (let i = 0; i < ketQua.duLieuPpct.length; i++) {
                        let b = chuanHoaBanGhiPpct(ketQua.duLieuPpct[i]);
                        if (b) dsPpctChuan.push(b);
                    }
                    if (JSON.stringify(duLieuPpctGoc) !== JSON.stringify(dsPpctChuan)) {
                        canVeLai = true;
                    }
                    duLieuPpctGoc = dsPpctChuan;
                    luuKhoPpctVaoStorage(khoi, dsPpctChuan, true);
                }
            } else if (item.loai === 'TICH_LUY' && item.dataTL && typeof item.dataTL === 'object' && item.dataTL.trangThai !== 'loi_he_thong') {
                let strCu = JSON.stringify(window.khoTienDoTichLuyPPCT[khoaTichLuy] || {});
                let strMoi = JSON.stringify(item.dataTL || {});
                if (strCu !== strMoi) {
                    window.khoTienDoTichLuyPPCT[khoaTichLuy] = item.dataTL;
                    canVeLai = true;
                }
                window.tapTienDoTichLuyDaXacThucPhien.add(khoaTichLuy);
            }
        });

        // Chỉ vẽ lại nếu người dùng vẫn đang chọn đúng Tuần và Lớp đó
        const tuanHienTaiUI = document.getElementById('locTuanUI').value.trim();
        const lopHienTaiUI = document.getElementById('locLopPPCT').value.trim();
        const monHienTaiUI = document.getElementById('locMonPPCT').value.trim();
        if (cheDoXemPPCT === 'lop' && tuanHienTaiUI === tuan && lopHienTaiUI === lop && canVeLai) {
            _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
            bomDuLieuVaoBoLoc(false);
            veBangKhungLichPPCT(document.getElementById('locMonPPCT') ? document.getElementById('locMonPPCT').value.trim() : monHienTaiUI);
        }
    } catch (loi) {
        if (!daHienThiTruoc) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-600 font-bold">⚠️ Sự cố truy xuất dữ liệu từ máy chủ. Đảm bảo kết nối mạng ổn định.</td></tr>`;
        }
        console.error("Lỗi đồng bộ ngầm PPCT:", loi);
    } finally {
        _dangTaiPPCT = false;
        if (nutXacNhan) {
            nutXacNhan.innerHTML = theGocNutXacNhan;
            nutXacNhan.classList.remove('opacity-80', 'cursor-wait');
            nutXacNhan.disabled = false;
        }
        const tuanCuoiUI = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
        const lopCuoiUI = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
        if (cheDoXemPPCT === 'lop' && (_yeuCauTaiLaiPPCT || (tuanCuoiUI && lopCuoiUI && `${tuanCuoiUI}_${lopCuoiUI}` !== `${tuan}_${lop}`))) {
            const ep = _yeuCauTaiLaiPPCT ? _yeuCauTaiLaiPPCT.epDongBo : false;
            _yeuCauTaiLaiPPCT = null;
            taiDuLieuTkbVaPpct(ep);
        }
    }
}

// =========================================================================
// KHỐI 3.5: CHẾ ĐỘ GIÁO VIÊN BỘ MÔN (LỌC TẤT CẢ CÁC LỚP ĐƯỢC PHÂN CÔNG TRONG TUẦN)
// =========================================================================
let _dangTaiGvbmPPCT = false;
let _yeuCauTaiLaiGvbmPPCT = null;
let _chuKyBoLocMonGvbmPPCT = '';

function capNhatBoLocMonRiengChoGvbmPPCT(tuDongTaiKhiThayDoi = false) {
    if (cheDoXemPPCT !== 'gvbm' || typeof thongSoHocVu === 'undefined') return;

    const dsMonToanTruong = thongSoHocVu.DANH_SACH_MON_HOC || [];
    const elTuan = document.getElementById('locTuanUI');
    const tuan = elTuan ? elTuan.value.trim() : '1';
    const listMon = document.getElementById('listMonPPCT');
    const inputMon = document.getElementById('locMonPPCT');

    const laQuanTri = laAdminHoacBghPPCT();
    const daDangNhap = coQuyenDangNhapPPCT();

    let dsMonHienThi = dsMonToanTruong;
    let daLocMonGvbm = false;

    if (daDangNhap && !laQuanTri) {
        let dsMonPc = layDanhSachMonChoCheDoGvbmPPCT(tuan);
        if (Array.isArray(dsMonPc) && dsMonPc.length > 0) {
            dsMonHienThi = dsMonPc;
            daLocMonGvbm = true;
        }
    }

    let chuKyMoi = `${dsMonHienThi.join('|')}__${daLocMonGvbm ? 'GVBM_PC' : 'GVBM_ALL'}`;
    if (_chuKyBoLocMonGvbmPPCT !== chuKyMoi) {
        _chuKyBoLocMonGvbmPPCT = chuKyMoi;
        if (listMon) {
            let htmlMon = (daLocMonGvbm && dsMonHienThi.length === 1) ? '' : `<option value="Tất cả"></option>`;
            listMon.innerHTML = htmlMon + dsMonHienThi.map(mon => `<option value="${mon}">`).join('');
        }
    }

    if (inputMon && document.activeElement !== inputMon) {
        let monHienTaiChuan = inputMon.value.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        let laTatCa = (monHienTaiChuan === '' || monHienTaiChuan === 'tất cả');
        let monTrongDs = !laTatCa && dsMonHienThi.some(m => monHocKhopPPCT(m, inputMon.value));
        let daDoi = false;

        if (daLocMonGvbm) {
            if (dsMonHienThi.length === 1 && (laTatCa || !monTrongDs)) {
                inputMon.value = dsMonHienThi[0];
                daDoi = true;
            } else if (!laTatCa && !monTrongDs) {
                inputMon.value = 'Tất cả';
                daDoi = true;
            }
        } else if (inputMon.value === '') {
            inputMon.value = 'Tất cả';
        }

        if (tuDongTaiKhiThayDoi && daDoi) {
            const khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
            if (khungPPCT && !khungPPCT.classList.contains('hidden')) {
                veBangGvbmPPCT(inputMon.value.trim());
            }
        }
    }
}

async function taiDuLieuGvbmPPCT(epDongBo = false) {
    const tuan = document.getElementById('locTuanUI').value.trim();
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    const nutXacNhan = document.getElementById('nutXemPPCT') || document.querySelector('button[onclick="taiDuLieuTkbVaPpct()"]');
    if (nutXacNhan && !nutXacNhan.dataset.labelGoc) {
        nutXacNhan.dataset.labelGoc = nutXacNhan.innerHTML.includes('Đang đồng bộ') ? 'Xem' : nutXacNhan.innerHTML;
    }
    const theGocNutXacNhan = (nutXacNhan && nutXacNhan.dataset.labelGoc) ? nutXacNhan.dataset.labelGoc : 'Xem';

    capNhatTieuDeBangPPCT();

    if (!tuan) {
        alert("Đồng chí vui lòng nhập Tuần học để truy xuất dữ liệu.");
        return;
    }

    const tuanSo = parseInt(tuan, 10) || 1;
    const tuanHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? (parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) || 1)
        : (typeof tuanDangXem !== 'undefined' ? (parseInt(tuanDangXem, 10) || 1) : 1);
    const tuanMocTichLuy = (tuanSo > tuanHeThong) ? tuanHeThong : tuanSo;
    const namHoc = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? String(thongSoHocVu.NAM_HOC).trim() : '';
    const khoaTichLuy = `${namHoc}_TUAN_${tuanMocTichLuy}`;

    // Tìm danh sách các lớp được phân công (lọc sơ bộ theo môn nếu đã có TKB/Phân công)
    let { dsLop, laCheDoAdminFallback } = layDanhSachLopPhanCongGvbmPPCT(tuanSo, '');
    if (dsLop.length === 0) {
        duLieuGvbmTheoLop = {};
        _tuanDangHienThiGvbmPPCT = tuan;
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-500 font-bold italic">Không tìm thấy lớp nào được phân công giảng dạy cho tài khoản hiện tại trong Tuần ${tuan}.</td></tr>`;
        capNhatHienThiNutKhoaSuaPPCT();
        return;
    }

    // Kiểm tra trạng thái bộ nhớ đệm cho tất cả các lớp được phân công
    const khoiTheoLop = {};
    const danhSachCanTai = [];
    const tapKhoiDaHenTaiPpct = new Set();
    let coSanItNhatMotLop = false;
    let tatCaDaXacThuc = true;

    duLieuGvbmTheoLop = {};
    dsLop.forEach(lopItem => {
        let matchKhoi = String(lopItem).match(/\d+/);
        let khoiItem = matchKhoi ? matchKhoi[0] : 'KX';
        if (khoiItem === 'KX') return;
        khoiTheoLop[lopItem] = khoiItem;

        let kqTkb = window.sangLocTkbTuanLopDaCo(tuan, lopItem);
        let kqPpct = window.sangLocPpctKhoiDaCo(khoiItem);
        let coTkb = !!(kqTkb && Array.isArray(kqTkb.ds) && kqTkb.ds.length > 0);
        let coPpct = !!(kqPpct && Array.isArray(kqPpct.ds) && kqPpct.ds.length > 0);

        if (coTkb && coPpct) {
            coSanItNhatMotLop = true;
        }
        duLieuGvbmTheoLop[lopItem] = {
            khoi: khoiItem,
            dsTkb: coTkb ? kqTkb.ds : [],
            dsPpct: coPpct ? kqPpct.ds : [],
            laCheDoAdminFallback
        };

        let coTkbTuanHienTaiTrongRam = (tuanSo === tuanHeThong) && (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai) && duLieuTkbHienTai.length > 0);
        let tkbXacThuc = !epDongBo && coTkb && (kqTkb.daXacThucPhien || coTkbTuanHienTaiTrongRam);
        let ppctXacThuc = !epDongBo && coPpct && kqPpct.daXacThucPhien;
        if (!tkbXacThuc || !ppctXacThuc) {
            tatCaDaXacThuc = false;
            let daCoPpctParam = (ppctXacThuc || tapKhoiDaHenTaiPpct.has(khoiItem)) ? '1' : '0';
            if (daCoPpctParam === '0') tapKhoiDaHenTaiPpct.add(khoiItem);
            danhSachCanTai.push({
                lop: lopItem,
                khoi: khoiItem,
                daCoPpct: daCoPpctParam,
                daCoTkb: tkbXacThuc ? '1' : '0'
            });
        }
    });

    const coSanTichLuy = (tuanMocTichLuy <= 1) || window.tapTienDoTichLuyDaXacThucPhien.has(khoaTichLuy);
    if (!coSanTichLuy || epDongBo) tatCaDaXacThuc = false;

    if (coSanItNhatMotLop) {
        _tuanDangHienThiGvbmPPCT = tuan;
        veBangGvbmPPCT(mon);
        if (tatCaDaXacThuc) return;
    }

    if (_dangTaiGvbmPPCT) {
        _yeuCauTaiLaiGvbmPPCT = { epDongBo };
        return;
    }
    _dangTaiGvbmPPCT = true;

    if (coSanItNhatMotLop) {
        if (nutXacNhan) {
            nutXacNhan.innerHTML = `
                <svg class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
                <span class="opacity-90">Đang đồng bộ...</span>`;
            nutXacNhan.classList.add('opacity-80', 'cursor-wait');
        }
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-blue-600 font-bold reactbits-fade-in">
            <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            Đang tổng hợp lịch giảng dạy và PPCT của ${dsLop.length} lớp được phân công...
        </td></tr>`;
        if (nutXacNhan) nutXacNhan.disabled = true;
    }

    try {
        const danhSachHamTacVu = [];

        danhSachCanTai.forEach(req => {
            const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTkbVaPpct&tuan=${tuan}&lop=${encodeURIComponent(req.lop)}&khoi=${req.khoi}&mon=&tuanHienTai=${tuanHeThong}&daCoPpct=${req.daCoPpct}&daCoTkb=${req.daCoTkb}`;
            danhSachHamTacVu.push(() =>
                fetchVoiTimeoutPPCT(urlAPI)
                    .then(r => r.json())
                    .then(ketQua => ({ loai: 'LOP_TKB_PPCT', lop: req.lop, khoi: req.khoi, ketQua }))
                    .catch(() => ({ loai: 'LOP_TKB_PPCT', lop: req.lop, khoi: req.khoi, ketQua: null }))
            );
        });

        if (tuanMocTichLuy > 1 && (epDongBo || !coSanTichLuy)) {
            const urlTichLuy = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTienDoTichLuy&tuan=${tuanMocTichLuy}&namHoc=${encodeURIComponent(namHoc)}`;
            danhSachHamTacVu.push(() =>
                fetchVoiTimeoutPPCT(urlTichLuy)
                    .then(r => r.json())
                    .then(dataTL => ({ loai: 'TICH_LUY', dataTL }))
                    .catch(() => ({ loai: 'TICH_LUY', dataTL: null }))
            );
        }

        const ketQuaSongSong = await chayTheoLoPPCT(danhSachHamTacVu, 3);
        ketQuaSongSong.forEach(item => {
            if (item.loai === 'LOP_TKB_PPCT' && item.ketQua && item.ketQua.trangThai !== 'Lỗi' && item.ketQua.trangThai !== 'loi_he_thong') {
                let kq = item.ketQua;
                if (Array.isArray(kq.duLieuTkb) && kq.duLieuTkb.length > 0) {
                    window.khoTkbTuanLopPPCT[`${tuan}_${item.lop}`] = kq.duLieuTkb;
                    window.tapTkbTuanLopDaXacThucPhien.add(`${tuan}_${item.lop}`);
                    if (tuanSo > tuanHeThong) {
                        window.khoTkbCoDinhLopPPCT[item.lop] = saoChepDanhSachTkb(kq.duLieuTkb, true);
                        window.tapTkbCoDinhLopDaXacThucPhien.add(item.lop);
                    }
                    if (!duLieuGvbmTheoLop[item.lop]) {
                        duLieuGvbmTheoLop[item.lop] = { khoi: item.khoi, dsTkb: [], dsPpct: [], laCheDoAdminFallback };
                    }
                    duLieuGvbmTheoLop[item.lop].dsTkb = kq.duLieuTkb;
                }
                if (Array.isArray(kq.duLieuPpct) && kq.duLieuPpct.length > 0) {
                    let dsPpctChuan = [];
                    for (let i = 0; i < kq.duLieuPpct.length; i++) {
                        let b = chuanHoaBanGhiPpct(kq.duLieuPpct[i]);
                        if (b) dsPpctChuan.push(b);
                    }
                    luuKhoPpctVaoStorage(item.khoi, dsPpctChuan, true);
                }
            } else if (item.loai === 'TICH_LUY' && item.dataTL && typeof item.dataTL === 'object' && item.dataTL.trangThai !== 'loi_he_thong') {
                window.khoTienDoTichLuyPPCT[khoaTichLuy] = item.dataTL;
                window.tapTienDoTichLuyDaXacThucPhien.add(khoaTichLuy);
            }
        });

        // Gắn lại PPCT mới nhất từ kho khối cho từng lớp (vì nhiều lớp cùng khối dùng chung 1 PPCT)
        Object.keys(duLieuGvbmTheoLop).forEach(lopItem => {
            let khoiItem = duLieuGvbmTheoLop[lopItem].khoi;
            let kqPpct = window.sangLocPpctKhoiDaCo(khoiItem);
            if (kqPpct && Array.isArray(kqPpct.ds)) {
                duLieuGvbmTheoLop[lopItem].dsPpct = kqPpct.ds;
            }
        });

        const tuanHienTaiUI = document.getElementById('locTuanUI').value.trim();
        const monHienTaiUI = document.getElementById('locMonPPCT').value.trim();
        if (cheDoXemPPCT === 'gvbm' && tuanHienTaiUI === tuan) {
            _tuanDangHienThiGvbmPPCT = tuan;
            veBangGvbmPPCT(document.getElementById('locMonPPCT') ? document.getElementById('locMonPPCT').value.trim() : monHienTaiUI);
        }
    } catch (loi) {
        if (!coSanItNhatMotLop) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-600 font-bold">⚠️ Sự cố truy xuất dữ liệu GVBM từ máy chủ.</td></tr>`;
        }
        console.error("Lỗi đồng bộ GVBM PPCT:", loi);
    } finally {
        _dangTaiGvbmPPCT = false;
        if (nutXacNhan) {
            nutXacNhan.innerHTML = theGocNutXacNhan;
            nutXacNhan.classList.remove('opacity-80', 'cursor-wait');
            nutXacNhan.disabled = false;
        }
        const tuanCuoiUI = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
        if (cheDoXemPPCT === 'gvbm' && (_yeuCauTaiLaiGvbmPPCT || (tuanCuoiUI && tuanCuoiUI !== tuan))) {
            const ep = _yeuCauTaiLaiGvbmPPCT ? _yeuCauTaiLaiGvbmPPCT.epDongBo : false;
            _yeuCauTaiLaiGvbmPPCT = null;
            taiDuLieuGvbmPPCT(ep);
        }
    }
}

function veBangGvbmPPCT(monDangChon) {
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    if (!tbody) return;
    capNhatTieuDeBangPPCT();

    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    const doLechThu = { "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4 };
    const cauTrucTiet = { "Sáng": [1, 2, 3, 4, 5], "Chiều": [1, 2, 3, 4] };

    const tuan = parseInt(document.getElementById('locTuanUI').value.trim(), 10) || 1;
    const monChonChuan = String(monDangChon || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    const monChonGoc = monChonChuan.replace(/[0-9\(\)]/g, '').trim();
    const isXemTatCa = (monChonChuan === 'tất cả' || monChonChuan === '');
    const tapNguoiDung = layTapDinhDanhNguoiDangNhapPPCT();

    const tuanHienTaiHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10)
        : ((typeof tuanDangXem !== 'undefined') ? parseInt(tuanDangXem, 10) : 1);
    const tuanMocNgayUI = (typeof tuanDangXem !== 'undefined') ? parseInt(tuanDangXem, 10) : tuanHienTaiHeThong;
    const isTuongLai = tuan > tuanHienTaiHeThong;

    let ngayGocThu2 = null;
    if (typeof ngayDauTuanUI === 'string' && ngayDauTuanUI.trim() !== '') {
        let parts = ngayDauTuanUI.trim().split('-');
        if (parts.length === 3) {
            ngayGocThu2 = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            let lechTuan = tuan - tuanMocNgayUI;
            if (lechTuan !== 0) ngayGocThu2.setDate(ngayGocThu2.getDate() + (lechTuan * 7));
        }
    }

    const tinhNgayTheoThu = (thu) => {
        if (!ngayGocThu2) return '--/--/----';
        let ngayCuaThu = new Date(ngayGocThu2.getTime());
        ngayCuaThu.setDate(ngayGocThu2.getDate() + (doLechThu[thu] || 0));
        let d = ngayCuaThu.getDate().toString().padStart(2, '0');
        let m = (ngayCuaThu.getMonth() + 1).toString().padStart(2, '0');
        let y = ngayCuaThu.getFullYear();
        return `${d}/${m}/${y}`;
    };

    // Chuẩn hóa PPCT theo từng khối để tái sử dụng nhanh
    const cachePpctTheoKhoiMon = {};
    const layPpctChoKhoiMon = (khoi, dsPpct, monGrid) => {
        let monGridChuan = String(monGrid).normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        let monGridGoc = monGridChuan.replace(/[0-9\(\)]/g, '').trim();
        let cacheKey = `${khoi}_${monGridChuan}`;
        if (cachePpctTheoKhoiMon[cacheKey]) return cachePpctTheoKhoiMon[cacheKey];

        let dsChuan = (dsPpct || []).map(b => {
            let m = String(b.mon || b.monHoc || b.tenMon || b["Môn học"] || b["Môn"] || "").normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
            let mGoc = m.replace(/[0-9\(\)]/g, '').trim();
            return { ...b, mChuan: m, mGoc: mGoc };
        });

        let ketQuaLoc = dsChuan.filter(b => {
            if (b.mChuan === "") return false;
            return b.mChuan === monGridChuan || b.mChuan === monGridGoc || b.mGoc === monGridGoc;
        }).sort((a, b) => parseInt(a.tietPpc || a.tiet || 0, 10) - parseInt(b.tietPpc || b.tiet || 0, 10));

        cachePpctTheoKhoiMon[cacheKey] = ketQuaLoc;
        return ketQuaLoc;
    };

    const danhSachDong = [];
    const dsLopSapXep = Object.keys(duLieuGvbmTheoLop).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

    dsLopSapXep.forEach(lopItem => {
        let goi = duLieuGvbmTheoLop[lopItem];
        if (!goi || !Array.isArray(goi.dsTkb) || goi.dsTkb.length === 0) return;

        let maTranTkb = {};
        goi.dsTkb.forEach(t => {
            if (!maTranTkb[t.thu]) maTranTkb[t.thu] = {};
            if (!maTranTkb[t.thu][t.buoi]) maTranTkb[t.thu][t.buoi] = {};
            maTranTkb[t.thu][t.buoi][t.tiet] = t;
        });

        const { boDemTichLuy, coLichSuLop } = window.layBoDemTichLuyChuanSoDauBai(lopItem, tuan, goi.dsTkb);
        let trackerPpct = {};
        let tongTietNhom = {};
        let soTietTrenLuoiTuan = demSoTietTheoMonTrongTuanPPCT(goi.dsTkb);

        if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) {
            let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lopItem] || {};
            Object.keys(dmKhoi).forEach(m => {
                let baseName = chuanHoaTenMonGocPPCT(m);
                if (baseName) {
                    tongTietNhom[baseName] = (tongTietNhom[baseName] || 0) + (parseInt(dmKhoi[m], 10) || 0);
                }
            });
        }

        let tapMonGoc = new Set([
            ...Object.keys(tongTietNhom),
            ...Object.keys(boDemTichLuy),
            ...Object.keys(soTietTrenLuoiTuan)
        ]);

        tapMonGoc.forEach(baseName => {
            let soTietDaHocTruocDo = 0;
            let laMonAI = (baseName === 'ai' || baseName.startsWith('ai ') || baseName.includes('trí tuệ nhân tạo') || baseName.includes('tri tue nhan tao'));
            if (boDemTichLuy[baseName] !== undefined) {
                soTietDaHocTruocDo = boDemTichLuy[baseName];
            } else if (coLichSuLop || laMonAI) {
                soTietDaHocTruocDo = 0;
            } else {
                let soTiet1Tuan = soTietTrenLuoiTuan[baseName] || tongTietNhom[baseName] || 1;
                soTietDaHocTruocDo = (tuan - 1) * soTiet1Tuan;
            }
            trackerPpct[baseName] = {
                tietPpcAuto: soTietDaHocTruocDo + 1,
                chiSoPpctTuDong: soTietDaHocTruocDo
            };
        });

        thuMacDinh.forEach((thu, idxThu) => {
            let ngayHienThi = tinhNgayTheoThu(thu);
            ["Sáng", "Chiều"].forEach((buoi, idxBuoi) => {
                cauTrucTiet[buoi].forEach(tiet => {
                    let tietTkb = (maTranTkb[thu] && maTranTkb[thu][buoi] && maTranTkb[thu][buoi][tiet]) ? maTranTkb[thu][buoi][tiet] : null;
                    if (!tietTkb || !tietTkb.monHoc) return;

                    let tenMonTkb = String(tietTkb.monHoc).trim();
                    if (!tenMonTkb || tenMonTkb === '--' || tenMonTkb === '---') return;

                    let monTkbChuan = tenMonTkb.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
                    let monTkbGoc = monTkbChuan.replace(/[0-9\(\)]/g, '').trim();

                    // Luôn tăng bộ đếm PPCT đúng thứ tự tuần của lớp
                    let track = trackerPpct[monTkbGoc];
                    let valTietPPC = '';
                    let chiSoHienTai = 0;
                    if (track) {
                        valTietPPC = track.tietPpcAuto;
                        chiSoHienTai = track.chiSoPpctTuDong;
                        track.chiSoPpctTuDong++;
                        track.tietPpcAuto++;
                    } else {
                        valTietPPC = 1;
                    }

                    // Lọc theo môn đang chọn
                    let khopMon = isXemTatCa || monTkbChuan === monChonChuan || monTkbGoc === monChonGoc;
                    if (!khopMon) return;

                    // Nếu bản ghi TKB có thông tin GV và không phải chế độ Admin fallback -> kiểm tra đúng GV đang đăng nhập
                    if (!goi.laCheDoAdminFallback && tapNguoiDung.size > 0 && banGhiTkbCoThongTinGvPPCT(tietTkb)) {
                        if (!banGhiTkbKhopNguoiDayPPCT(tietTkb, tapNguoiDung)) return;
                    }

                    let ppctCuaMon = layPpctChoKhoiMon(goi.khoi, goi.dsPpct, tenMonTkb);
                    let valTenBai = '';
                    let valDieuChinh = '';
                    if (valTietPPC !== '') {
                        let baiGoc = ppctCuaMon.find(b => {
                            let tGoc = String(b.tietPpc || b.tiet || '').trim();
                            if (tGoc === String(valTietPPC).trim()) return true;
                            let soGoc = parseInt(tGoc.replace(/\D/g, ''), 10);
                            let soMucTieu = parseInt(String(valTietPPC).replace(/\D/g, ''), 10);
                            return !isNaN(soGoc) && !isNaN(soMucTieu) && soGoc === soMucTieu;
                        });
                        if (!baiGoc && chiSoHienTai < ppctCuaMon.length) {
                            let ungVien = ppctCuaMon[chiSoHienTai];
                            let tUngVien = String(ungVien.tietPpc || ungVien.tiet || '').replace(/\D/g, '');
                            if (!tUngVien) baiGoc = ungVien;
                        }
                        if (baiGoc) {
                            if (baiGoc.tietPpc !== undefined || baiGoc.tiet !== undefined) {
                                valTietPPC = baiGoc.tietPpc || baiGoc.tiet;
                            }
                            valTenBai = baiGoc.tenBai || baiGoc.tenBaiHoc || baiGoc.tenBaiDay || '';
                            valDieuChinh = baiGoc.dieuChinh || baiGoc.ghiChu || '';
                        }
                    }

                    danhSachDong.push({
                        lop: lopItem,
                        khoi: goi.khoi,
                        thu: thu,
                        idxThu: idxThu,
                        ngayHienThi: ngayHienThi,
                        buoi: buoi,
                        idxBuoi: idxBuoi,
                        tiet: tiet,
                        monHoc: tenMonTkb,
                        valTietPPC: valTietPPC,
                        valTenBai: valTenBai,
                        valDieuChinh: valDieuChinh
                    });
                });
            });
        });
    });

    if (danhSachDong.length === 0) {
        let msg = isXemTatCa
            ? `Không có tiết dạy nào trong các lớp được phân công ở Tuần ${tuan}.`
            : `Không có tiết dạy môn "${monDangChon}" ở các lớp được phân công trong Tuần ${tuan}.`;
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-500 font-bold italic">${msg}</td></tr>`;
        capNhatHienThiNutKhoaSuaPPCT();
        return;
    }

    if (sapXepGvbmPPCT === 'ngay') {
        danhSachDong.sort((a, b) => {
            if (a.idxThu !== b.idxThu) return a.idxThu - b.idxThu;
            if (a.idxBuoi !== b.idxBuoi) return a.idxBuoi - b.idxBuoi;
            if (a.tiet !== b.tiet) return parseInt(a.tiet, 10) - parseInt(b.tiet, 10);
            return a.lop.localeCompare(b.lop, 'vi', { numeric: true });
        });
    }

    // Đếm số dòng mỗi lớp khi gom theo Tên lớp để dùng rowspan gọn đẹp
    const demDongTheoLop = {};
    if (sapXepGvbmPPCT === 'lop') {
        danhSachDong.forEach(r => {
            demDongTheoLop[r.lop] = (demDongTheoLop[r.lop] || 0) + 1;
        });
    }

    let html = '';
    let lopDaIn = new Set();

    danhSachDong.forEach(row => {
        let idKhoa = `${row.lop}_${row.thu}_${row.buoi}_${row.tiet}`;
        let tenMonEsc = row.monHoc.replace(/'/g, "\\'");
        let theDuKien = isTuongLai ? `<span class="text-[10px] font-bold text-orange-600 uppercase tracking-wider mr-1">(Dự kiến)</span>` : '';
        let badgeMon = isXemTatCa ? `<div class="text-[11px] font-bold text-indigo-700 mt-0.5">${row.monHoc}</div>` : '';

        html += `<tr class="bg-white hover:bg-slate-50 transition-colors border-b border-gray-300"
                     data-lop="${row.lop}" data-khoi="${row.khoi}" data-mon="${row.monHoc}"
                     data-thu="${row.thu}" data-buoi="${row.buoi}" data-tiet="${row.tiet}">`;

        if (sapXepGvbmPPCT === 'lop') {
            if (!lopDaIn.has(row.lop)) {
                lopDaIn.add(row.lop);
                html += `<td rowspan="${demDongTheoLop[row.lop]}" class="border-r border-gray-400 bg-blue-50/40 align-middle text-center p-2 font-extrabold text-blue-900 text-base">
                            <div>${row.lop}</div>
                            <div class="text-[11px] font-semibold text-slate-500 mt-0.5">Khối ${row.khoi}</div>
                         </td>`;
            }
        } else {
            html += `<td class="border-r border-gray-400 bg-blue-50/40 align-middle text-center p-2 font-extrabold text-blue-900 text-base">
                        <div>${row.lop}</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-0.5">Khối ${row.khoi}</div>
                     </td>`;
        }

        html += `
            <td class="border-r border-gray-300 align-middle text-center p-2">
                <div class="font-bold text-slate-800 text-sm">${theDuKien}${row.thu} <span class="text-xs font-semibold text-gray-500">(${row.ngayHienThi})</span></div>
                <div class="text-xs font-semibold text-blue-800 mt-0.5">${row.buoi} - Tiết ${row.tiet}</div>
                ${badgeMon}
            </td>
            <td class="border-r border-gray-300 align-middle text-center p-3 font-extrabold text-red-600 whitespace-normal" data-ppct-id="${idKhoa}" data-loai="tietPpc" data-tiet-ppc-goc="${row.valTietPPC}">${row.valTietPPC}</td>
            <td class="border-r border-gray-300 align-middle text-left p-3 leading-relaxed vung-badge-sua" style="white-space: normal !important; min-width: 220px; max-width: 360px; word-wrap: break-word; word-break: break-word;">
                <div class="flex items-start justify-between gap-2">
                    <span class="font-semibold text-slate-900 flex-1 whitespace-normal break-words" style="word-break: break-word;" data-ppct-id="${idKhoa}" data-loai="tenBai">${row.valTenBai}</span>
                    <button onclick="kichHoatXemTruocSGK('${row.khoi}', '${tenMonEsc}', document.querySelector('[data-ppct-id=\\'${idKhoa}\\'][data-loai=\\'tenBai\\']').innerText)"
                            class="p-1.5 rounded bg-blue-50 hover:bg-blue-200 text-blue-700 transition flex-none shadow-sm border border-blue-200 mt-0.5"
                            title="Xem và tải trang SGK bài học này">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                </div>
            </td>
            <td class="align-middle text-left p-3 italic text-gray-700 leading-relaxed whitespace-normal break-words" data-ppct-id="${idKhoa}" data-loai="dieuChinh" style="white-space: normal !important; min-width: 220px; max-width: 420px; word-wrap: break-word; word-break: break-word;">${row.valDieuChinh}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
    capNhatHienThiNutKhoaSuaPPCT();
    if (trangThaiChoPhepSua) {
        capNhatTrangThaiCacO();
    }
}

// Gắn bí danh để tương thích với bộ điều phối chuyển tab của app.js
window.taiDuLieuTkbVaPpct = taiDuLieuTkbVaPpct;
window.taiDuLieuPhanPhoiChuongTrinh = taiDuLieuTkbVaPpct;
window.taiDuLieuPPCT = taiDuLieuTkbVaPpct;

function veBangKhungLichPPCT(monDangChon) {
    if (cheDoXemPPCT === 'gvbm') {
        return veBangGvbmPPCT(monDangChon);
    }
    capNhatTieuDeBangPPCT();
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    let html = '';
    
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    const cauTrucTiet = { "Sáng": [1,2,3,4,5], "Chiều": [1,2,3,4] };
    
    let maTranTkb = {};
    const monChonChuan = monDangChon.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
    const monChonGoc = monChonChuan.replace(/[0-9\(\)]/g, '').trim();
    
    duLieuTkbTuan.forEach(t => {
        if (!maTranTkb[t.thu]) maTranTkb[t.thu] = {};
        if (!maTranTkb[t.thu][t.buoi]) maTranTkb[t.thu][t.buoi] = {};
        maTranTkb[t.thu][t.buoi][t.tiet] = t;
    });

    const tuan = parseInt(document.getElementById('locTuanUI').value.trim()) || 1;
    const lop = document.getElementById('locLopPPCT').value.trim();
    const isXemTatCa = (monChonChuan === 'tất cả' || monChonChuan === '');
    
    let ngayGocThu2 = null;
    const tuanHienTaiHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
        ? parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10)
        : ((typeof tuanDangXem !== 'undefined') ? parseInt(tuanDangXem, 10) : 1);
    const tuanMocNgayUI = (typeof tuanDangXem !== 'undefined') ? parseInt(tuanDangXem, 10) : tuanHienTaiHeThong;
    const isTuongLai = tuan > tuanHienTaiHeThong;
    
    if (typeof ngayDauTuanUI === 'string' && ngayDauTuanUI.trim() !== '') {
        let parts = ngayDauTuanUI.trim().split('-');
        if (parts.length === 3) {
            let yy = parseInt(parts[0], 10);
            let mm = parseInt(parts[1], 10) - 1; 
            let dd = parseInt(parts[2], 10);
            ngayGocThu2 = new Date(yy, mm, dd);
            let lechTuan = tuan - tuanMocNgayUI;
            if (lechTuan !== 0) ngayGocThu2.setDate(ngayGocThu2.getDate() + (lechTuan * 7));
        }
    }

    // =====================================================================
    // [LÕI THUẬT TOÁN ĐỒNG BỘ 100% VỚI TAB SỔ ĐẦU BÀI & TỊNH TIẾN TUẦN TƯƠNG LAI]:
    // - Các tuần quá khứ / hiện tại: Đếm chính xác số tiết đã học từ Tuần 1 -> Tuần (tuan - 1) trong DATA_TKB & SoDauBai.
    // - Các tuần tương lai (tuan > tuanHienTaiHeThong): Tự động tịnh tiến nối tiếp từ mốc lịch sử qua từng tuần tương lai.
    // =====================================================================
    const { boDemTichLuy, coLichSuLop } = window.layBoDemTichLuyChuanSoDauBai(lop, tuan, duLieuTkbTuan);
    let trackerPpct = {};
    let tongTietNhom = {};
    let soTietTrenLuoiTuan = demSoTietTheoMonTrongTuanPPCT(duLieuTkbTuan);

    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) {
        let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lop] || {};
        Object.keys(dmKhoi).forEach(m => {
            let baseName = chuanHoaTenMonGocPPCT(m);
            if (baseName) {
                tongTietNhom[baseName] = (tongTietNhom[baseName] || 0) + (parseInt(dmKhoi[m], 10) || 0);
            }
        });
    }

    // Gom tất cả các môn xuất hiện trong Khung CT, trong TKB tuần đang xem và trong Lịch sử
    let tapMonGoc = new Set([
        ...Object.keys(tongTietNhom),
        ...Object.keys(boDemTichLuy),
        ...Object.keys(soTietTrenLuoiTuan)
    ]);

    tapMonGoc.forEach(baseName => {
        let soTietDaHocTruocDo = 0;
        let laMonAI = (baseName === 'ai' || baseName.startsWith('ai ') || baseName.includes('trí tuệ nhân tạo') || baseName.includes('tri tue nhan tao'));

        if (boDemTichLuy[baseName] !== undefined) {
            // Đã có số đếm thực tế từ DATA_TKB / SoDauBai + số tiết tịnh tiến của các tuần tương lai trước tuần đang xem
            soTietDaHocTruocDo = boDemTichLuy[baseName];
        } else if (coLichSuLop || laMonAI) {
            // Lớp đã có lịch sử các tuần trước nhưng môn này chưa từng phát sinh tiết nào trước tuần đang xem -> Bằng 0
            soTietDaHocTruocDo = 0;
        } else {
            // Dự phòng duy nhất khi cả trường chưa có dữ liệu lịch sử DATA_TKB nào mà đang xem thử tuần > 1
            let soTiet1Tuan = soTietTrenLuoiTuan[baseName] || tongTietNhom[baseName] || 1;
            soTietDaHocTruocDo = (tuan - 1) * soTiet1Tuan;
        }

        trackerPpct[baseName] = {
            tietPpcAuto: soTietDaHocTruocDo + 1,
            chiSoPpctTuDong: soTietDaHocTruocDo
        };
    });

    // [TỐI ƯU HIỆU NĂNG SIÊU TỐC]: Chuẩn hóa mảng PPCT gốc một lần duy nhất trước khi vào vòng lặp
    let duLieuPpctDaChuanHoa = duLieuPpctGoc.map(b => {
        let m = String(b.mon || b.monHoc || b.tenMon || b["Môn học"] || b["Môn"] || "").normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        let mGoc = m.replace(/[0-9\(\)]/g, '').trim();
        return { ...b, mChuan: m, mGoc: mGoc };
    });

    // Tạo bộ đệm (Cache) lưu kết quả. Môn nào đã lọc và sắp xếp rồi thì các tiết sau chỉ việc lấy ra dùng, không tính lại.
    let cachePpctTheoMon = {};

    let getPpctGocChoMon = (monGrid) => {
        let monGridChuan = String(monGrid).normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        let monGridGoc = monGridChuan.replace(/[0-9\(\)]/g, '').trim();
        
        if (cachePpctTheoMon[monGridChuan]) return cachePpctTheoMon[monGridChuan];
        
        let ketQuaLoc = duLieuPpctDaChuanHoa.filter(b => {
            if (b.mChuan === "") return !isXemTatCa;
            return b.mChuan === monGridChuan || b.mChuan === monGridGoc || b.mGoc === monGridGoc;
        }).sort((a, b) => parseInt(a.tietPpc || a.tiet || 0) - parseInt(b.tietPpc || b.tiet || 0));
        
        cachePpctTheoMon[monGridChuan] = ketQuaLoc; 
        return ketQuaLoc;
    };

    let tongSoDongMucTieu = 0;

    thuMacDinh.forEach(thu => {
        let dsTietCuaThu = []; 
        ["Sáng", "Chiều"].forEach(buoi => {
            cauTrucTiet[buoi].forEach(tiet => {
                let tietTkb = (maTranTkb[thu] && maTranTkb[thu][buoi] && maTranTkb[thu][buoi][tiet]) ? maTranTkb[thu][buoi][tiet] : null;
                let tenMonTkb = tietTkb ? tietTkb.monHoc.trim() : '';
                let monTkbChuan = tenMonTkb.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
                let monTkbGoc = monTkbChuan.replace(/[0-9\(\)]/g, '').trim();

                if ((isXemTatCa || monTkbChuan === monChonChuan || monTkbGoc === monChonGoc) && tenMonTkb !== '') {
                    dsTietCuaThu.push({ buoi: buoi, tiet: tiet, tietTkb: tietTkb });
                    tongSoDongMucTieu++;
                }
            });
        });

        if (dsTietCuaThu.length > 0) {
            let ngayHienThi = '--/--/----';
            if (ngayGocThu2) {
                const doLechThu = {"Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4};
                let ngayCuaThu = new Date(ngayGocThu2.getTime());
                ngayCuaThu.setDate(ngayGocThu2.getDate() + (doLechThu[thu] || 0));
                let d = ngayCuaThu.getDate().toString().padStart(2, '0');
                let m = (ngayCuaThu.getMonth() + 1).toString().padStart(2, '0');
                let y = ngayCuaThu.getFullYear();
                ngayHienThi = `${d}/${m}/${y}`;
            }

            let nhomBuoi = { "Sáng": [], "Chiều": [] };
            dsTietCuaThu.forEach(item => nhomBuoi[item.buoi].push(item));
            let daInCotThu = false;

            ["Sáng", "Chiều"].forEach(buoi => {
                if (nhomBuoi[buoi].length > 0) {
                    let daInCotBuoi = false;
                    nhomBuoi[buoi].forEach(item => {
                        let tiet = item.tiet;
                        let tietTkb = item.tietTkb;
                        let tenMonTkb = tietTkb.monHoc;
                        
                        let monTkbChuan = tenMonTkb.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
                        let monTkbGoc = monTkbChuan.replace(/[0-9\(\)]/g, '').trim();

                        // Lấy riêng mảng PPCT của đúng môn học trên cột này
                        let ppctCuaMon = getPpctGocChoMon(tenMonTkb);
                        let valTietPPC = '';
                        let chiSoHienTai = 0;

                        // Luôn ưu tiên tính từ bộ đếm tích lũy thực tế chuẩn Sổ đầu bài & tịnh tiến tuần tương lai
                        let track = trackerPpct[monTkbGoc];
                        if (track) {
                            valTietPPC = track.tietPpcAuto;
                            chiSoHienTai = track.chiSoPpctTuDong;
                            track.chiSoPpctTuDong++;
                            track.tietPpcAuto++; 
                        } else {
                            valTietPPC = 1;
                        }

                        let valTenBai = ''; let valDieuChinh = '';
                        
                        if (valTietPPC !== '') {
                            let baiGoc = ppctCuaMon.find(b => {
                                let tGoc = String(b.tietPpc || b.tiet || '').trim();
                                if (tGoc === String(valTietPPC).trim()) return true;
                                let soGoc = parseInt(tGoc.replace(/\D/g, ''), 10);
                                let soMucTieu = parseInt(String(valTietPPC).replace(/\D/g, ''), 10);
                                return !isNaN(soGoc) && !isNaN(soMucTieu) && soGoc === soMucTieu;
                            });
                            if (!baiGoc && chiSoHienTai < ppctCuaMon.length) {
                                let ungVien = ppctCuaMon[chiSoHienTai];
                                let tUngVien = String(ungVien.tietPpc || ungVien.tiet || '').replace(/\D/g, '');
                                if (!tUngVien) baiGoc = ungVien;
                            }
                            if (baiGoc) { 
                                if (baiGoc.tietPpc !== undefined || baiGoc.tiet !== undefined) {
                                    valTietPPC = baiGoc.tietPpc || baiGoc.tiet;
                                }
                                valTenBai = baiGoc.tenBai || baiGoc.tenBaiHoc || baiGoc.tenBaiDay || ''; 
                                valDieuChinh = baiGoc.dieuChinh || baiGoc.ghiChu || ''; 
                            }
                        }

                        html += `<tr class="bg-white hover:bg-slate-50 transition-colors border-b border-gray-300">`;
                        if (!daInCotThu) {
                            let theDuKien = isTuongLai ? `<div class="text-[10px] font-bold text-orange-600 uppercase mb-0.5 tracking-wider">(Dự kiến)</div>` : '';
                            html += `<td rowspan="${dsTietCuaThu.length}" class="border-r border-gray-400 bg-white align-middle text-center">
                                        ${theDuKien}
                                        <div class="font-extrabold text-slate-800 text-base">${thu}</div>
                                        <div class="text-[11px] font-semibold text-gray-500 mt-1">(${ngayHienThi})</div>
                                     </td>`;
                            daInCotThu = true;
                        }
                        if (!daInCotBuoi) {
                            html += `<td rowspan="${nhomBuoi[buoi].length}" class="border-r border-gray-400 bg-white align-middle text-center font-bold text-slate-700">${buoi}</td>`;
                            daInCotBuoi = true;
                        }

                        let idKhoa = `${thu}_${buoi}_${tiet}`;

                        html += `
                            <td class="border-r border-gray-400 align-middle font-extrabold text-slate-800 text-center">${tiet}</td>
                            <td class="border-r border-gray-300 align-middle text-center font-bold text-blue-800 whitespace-normal" data-loai="mon">${tenMonTkb}</td>
                            <td class="border-r border-gray-300 align-middle text-center p-3 font-extrabold text-red-600 whitespace-normal" data-ppct-id="${idKhoa}" data-loai="tietPpc" data-tiet-ppc-goc="${valTietPPC}">${valTietPPC}</td>

                          <td class="border-r border-gray-300 align-middle text-left p-3 leading-relaxed" style="white-space: normal !important; min-width: 200px; max-width: 300px; word-wrap: break-word; word-break: break-word;">
                                <div class="flex items-start justify-between gap-2">
                                    <span class="font-semibold text-slate-900 flex-1 whitespace-normal break-words" style="word-break: break-word;" data-ppct-id="${idKhoa}" data-loai="tenBai">${valTenBai}</span>
                                    
                                    <button onclick="kichHoatXemTruocSGK(document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so'), '${tenMonTkb}', document.querySelector('[data-ppct-id=\\'${idKhoa}\\'][data-loai=\\'tenBai\\']').innerText)" 
                                            class="p-1.5 rounded bg-blue-50 hover:bg-blue-200 text-blue-700 transition flex-none shadow-sm border border-blue-200 mt-0.5" 
                                            title="Xem và tải trang SGK bài học này">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>                     

                            <td class="align-middle text-left p-3 italic text-gray-700 leading-relaxed whitespace-normal break-words" data-ppct-id="${idKhoa}" data-loai="dieuChinh" style="white-space: normal !important; min-width: 250px; max-width: 450px; word-wrap: break-word; word-break: break-word;">${valDieuChinh}</td>
                        </tr>`;
                    });
                }
            });
        }
    });

    if (tongSoDongMucTieu === 0) {
        let msg = isXemTatCa ? `Lớp ${lop} không có dữ liệu thời khóa biểu trong Tuần ${tuan}.` : `Lịch giảng dạy tuần này không có môn "${monDangChon}".`;
        html = `<tr><td colspan="7" class="text-center py-10 text-red-500 font-bold italic">${msg}</td></tr>`;
    }
    tbody.innerHTML = html;
    capNhatHienThiNutKhoaSuaPPCT();
    if (trangThaiChoPhepSua) {
        capNhatTrangThaiCacO();
    }
}

// =========================================================================
// KHỐI 4: GIAO TIẾP EXCEL BẰNG SHEETJS (XLSX)
// =========================================================================
function xuLyXuatExcelPPCT() {
    if (typeof XLSX === 'undefined') { alert("Thư viện Excel chưa tải xong."); return; }

    if (cheDoXemPPCT === 'gvbm') {
        const tuan = document.getElementById('locTuanUI').value.trim() || '1';
        const mon = document.getElementById('locMonPPCT').value.trim() || 'TatCa';
        const cacO = document.querySelectorAll('#vungDuLieuLichPPCT [data-loai="tietPpc"]');
        if (cacO.length === 0) {
            alert("Không có dữ liệu GVBM để xuất Excel.");
            return;
        }
        const rowsArr = [["Tuần", "Tên lớp", "Ngày dạy", "Môn học", "Tiết PPCT", "Tên bài học", "Nội dung điều chỉnh"]];
        cacO.forEach(inp => {
            let tr = inp.closest('tr');
            if (!tr) return;
            let idKhoa = inp.getAttribute('data-ppct-id');
            let tenLop = tr.getAttribute('data-lop') || '';
            let monDong = tr.getAttribute('data-mon') || mon;
            let thuDong = tr.getAttribute('data-thu') || '';
            let buoiDong = tr.getAttribute('data-buoi') || '';
            let tietDong = tr.getAttribute('data-tiet') || '';
            let tdNgay = tr.querySelector('td:nth-child(' + (tr.querySelector('td[rowspan]') ? 2 : 1) + ')');
            let ngayText = tdNgay ? tdNgay.innerText.replace(/\s+/g, ' ').trim() : `${thuDong} (${buoiDong} - Tiết ${tietDong})`;
            let valTiet = inp.innerText.trim();
            let elTenBai = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`);
            let elDieuChinh = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`);
            let valTenBai = elTenBai ? elTenBai.innerText.trim() : '';
            let valDieuChinh = elDieuChinh ? elDieuChinh.innerText.trim() : '';
            rowsArr.push([tuan, tenLop, ngayText, monDong, valTiet, valTenBai, valDieuChinh]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rowsArr);
        ws['!cols'] = [{wch: 8}, {wch: 12}, {wch: 30}, {wch: 18}, {wch: 12}, {wch: 42}, {wch: 32}];
        let tenFile = (mon === 'Tất cả' || mon === '')
            ? `LichBaoGiang_GVBM_Tuan${tuan}_TatCaMon`
            : `LichBaoGiang_GVBM_Tuan${tuan}_${mon.replace(/\s+/g, '')}`;
        XLSX.utils.book_append_sheet(wb, ws, "Lich_GVBM");
        XLSX.writeFile(wb, `${tenFile}.xlsx`);
        return;
    }
    
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    
    if(!khoi || khoi === 'KX') { alert("Vui lòng chọn Lớp học hợp lệ trước khi xuất."); return; }
    
    const cacOInputTiet = document.querySelectorAll('[data-loai="tietPpc"]');
    cacOInputTiet.forEach(inp => {
        let valTiet = inp.innerText.trim();
        if (valTiet !== '') {
            let tr = inp.closest('tr');
            let idKhoa = inp.getAttribute('data-ppct-id');
            let theMonTrenLuoi = tr.querySelector('[data-loai="mon"]');
            let monTrenLuoi = theMonTrenLuoi ? theMonTrenLuoi.innerText.trim() : mon;
            if (monTrenLuoi === 'Tất cả') monTrenLuoi = '';

            let valTenBai = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`).innerText.trim();
            let valDieuChinh = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`).innerText.trim();
            
            let idx = duLieuPpctGoc.findIndex(b => {
                let tGoc = b.tietPpc || b.tiet || '';
                let mGoc = b.mon || b.monHoc || '';
                return String(tGoc).trim() === valTiet && (mGoc === monTrenLuoi || mon === monTrenLuoi);
            });

            if (idx !== -1) {
                duLieuPpctGoc[idx].tenBai = valTenBai;
                duLieuPpctGoc[idx].dieuChinh = valDieuChinh;
            } else {
                duLieuPpctGoc.push({ tietPpc: valTiet, mon: monTrenLuoi, tenBai: valTenBai, dieuChinh: valDieuChinh });
            }
        }
    });

    const header = ["Khối lớp", "Tiết PPCT", "Tên môn học", "Tên bài học", "Điều chỉnh"];
    let rowsArr = [header];
    
    duLieuPpctGoc.sort((a,b) => {
        let tA = parseInt(a.tietPpc || a.tiet || 0);
        let tB = parseInt(b.tietPpc || b.tiet || 0);
        return tA - tB;
    }).forEach(dong => {
        let t = dong.tietPpc || dong.tiet || '';
        let m = dong.mon || dong.monHoc || (mon === 'Tất cả' ? '' : mon);
        let tb = dong.tenBai || dong.tenBaiHoc || '';
        let dc = dong.dieuChinh || dong.ghiChu || '';
        if(String(t).trim() !== '') rowsArr.push([khoi, t, m, tb, dc]);
    });

    if (rowsArr.length === 1 && mon !== 'Tất cả') { 
        for (let i = 1; i <= 35; i++) rowsArr.push([khoi, i, mon, "", ""]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rowsArr);
    ws['!cols'] = [{wch: 10}, {wch: 15}, {wch: 20}, {wch: 40}, {wch: 30}];
    let tenFile = mon === 'Tất cả' ? `LichBaoGiang_Khoi${khoi}_TongHop` : `LichBaoGiang_Khoi${khoi}_${mon.replace(/\s+/g, '')}`;
    XLSX.utils.book_append_sheet(wb, ws, "Lich_Bao_Giang");
    XLSX.writeFile(wb, `${tenFile}.xlsx`);
}

function xuLyNhapExcelPPCT(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert("Cảnh báo: Thư viện Excel chưa được tải xong."); return; }

    const khoiUI = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const monUI = document.getElementById('locMonPPCT').value.trim();

    if (!khoiUI || khoiUI === 'KX') {
        alert("Yêu cầu chọn Lớp học hợp lệ trên phễu lọc trước khi tải file.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            // Sử dụng header: 1 để giữ nguyên cấu trúc ma trận dòng/cột của Excel
            const rowsArr = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

            if (rowsArr.length > 1) {
                // [THUẬT TOÁN ĐỊNH VỊ]: Quét dòng 1 để tìm chính xác tọa độ các cột dựa vào tên tiêu đề
                let headerRow = rowsArr[0];
                let colTiet = 1, colMon = 2, colTenBai = 3, colDieuChinh = 4; // Mặc định an toàn

                for (let j = 0; j < headerRow.length; j++) {
                    let h = String(headerRow[j] || '').toLowerCase().trim();
                    if (h.includes('tiết ppct') || h.includes('tiết')) colTiet = j;
                    else if (h.includes('tên môn') || h === 'môn' || h === 'môn học') colMon = j;
                    else if (h.includes('tên bài') || h.includes('bài học') || h.includes('bài dạy')) colTenBai = j;
                    else if (h.includes('điều chỉnh') || h.includes('ghi chú')) colDieuChinh = j;
                }

                duLieuPpctGoc = [];
                for (let i = 1; i < rowsArr.length; i++) {
                    let r = rowsArr[i];
                    // Bỏ qua dòng trống
                    if (!r || r.length === 0) continue;

                    let valTiet = r[colTiet] !== undefined ? r[colTiet].toString().trim() : '';

                    if (valTiet !== "") {
                        let monExcel = r[colMon] !== undefined ? r[colMon].toString().trim() : '';
                        
                        // Cơ chế dự phòng: Nếu tải file đơn môn mà để trống cột C, lấy tên môn trên UI đắp vào
                        if (monExcel === '' && monUI !== 'Tất cả') monExcel = monUI;

                        duLieuPpctGoc.push({
                            tietPpc: valTiet,
                            tiet: valTiet, 
                            mon: monExcel,
                            monHoc: monExcel, // Gắn đa biến để tương thích ngược với các module khác
                            tenBai: r[colTenBai] !== undefined ? r[colTenBai].toString().trim() : '',
                            tenBaiHoc: r[colTenBai] !== undefined ? r[colTenBai].toString().trim() : '',
                            dieuChinh: r[colDieuChinh] !== undefined ? r[colDieuChinh].toString().trim() : ''
                        });
                    }
                }

                // MỞ RỘNG GIAO DIỆN: XUẤT TOÀN BỘ DỮ LIỆU EXCEL XUỐNG BÊN DƯỚI ĐỂ KIỂM TRA
                const tbody = document.getElementById('vungDuLieuLichPPCT');
                let htmlPreview = `
                    <tr class="dong-xem-truoc-excel">
                        <td colspan="7" class="bg-indigo-100 text-indigo-900 font-extrabold py-3 uppercase tracking-wide border-y-2 border-indigo-300 text-center shadow-inner">
                            🔍 BẢN XEM TRƯỚC TOÀN BỘ DỮ LIỆU EXCEL (SẼ ĐƯỢC LƯU VÀO HỆ THỐNG KHI BẤM "LƯU PPCT")
                        </td>
                    </tr>
                `;
                
                duLieuPpctGoc.forEach(row => {
                    // [LOGIC XEM TRƯỚC CHUẨN]: Chọn Tất cả -> Lấy môn Excel. Chọn môn cụ thể -> Lấy môn ô lọc.
                    let tenMonHienThi = (monUI === 'Tất cả' || monUI === '') ? (row.mon || row.monHoc) : monUI;

                    // [NÂNG CẤP CSS]: Bổ sung whitespace-normal, break-words và style inline để tự động xuống dòng an toàn
                    htmlPreview += `
                    <tr class="dong-xem-truoc-excel bg-indigo-50/40 hover:bg-indigo-100 transition-colors border-b border-indigo-200">
                        <td colspan="3" class="text-center italic text-indigo-600/70 text-[13px] align-middle font-semibold border-r border-indigo-200">
                            ⚡ Chờ đồng bộ...
                        </td>
                        <td class="border-r border-indigo-200 align-middle text-center p-2 font-extrabold text-red-600">${row.tiet}</td>
                        <td class="border-r border-indigo-200 align-middle text-center font-bold text-indigo-800" data-loai="mon">${tenMonHienThi}</td>
                        <td class="border-r border-indigo-200 align-middle text-left p-2 font-semibold text-slate-900 whitespace-normal break-words" style="white-space: normal !important; min-width: 200px; max-width: 400px; word-wrap: break-word; word-break: break-word;">${row.tenBaiHoc}</td>
                        <td class="align-middle text-left p-2 italic text-gray-700 whitespace-normal break-words" style="white-space: normal !important; min-width: 200px; max-width: 350px; word-wrap: break-word; word-break: break-word;">${row.dieuChinh}</td>
                    </tr>`;
                });

                // [LÕI NÂNG CẤP]: Ghi đè toàn bộ khung hiển thị thay vì gắn thêm vào dưới cùng
                tbody.innerHTML = htmlPreview;
                
                alert(`✅ Đã nạp thành công ${duLieuPpctGoc.length} tiết từ file Excel!\n(Hệ thống tự động định vị: Cột Môn học [${colMon+1}], Cột Tiết PPCT [${colTiet+1}])\n\n👉 Đồng chí hãy đối chiếu danh sách xem trước và nhấn "Lưu PPCT".`);
            } else {
                alert("Lỗi: File Excel trống hoặc không đúng biểu mẫu chuẩn.");
            }
        } catch (loi) {
            alert("Sự cố đọc file Excel: " + loi.message);
        } finally {
            // Giải phóng bộ nhớ đệm input để cho phép tải lại cùng 1 file nhiều lần
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

async function luuDuLieuPPCTLenMayChu(event) {
    const nutBam = event.currentTarget;
    const noiDungGoc = nutBam.innerHTML;
    
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tuan = document.getElementById('locTuanUI').value.trim();
    const laCapNhatMoiTuExcel = document.querySelectorAll('#vungDuLieuLichPPCT .dong-xem-truoc-excel').length > 0;

    // =====================================================================
    // TRƯỜNG HỢP 1: SỬA TRỰC TIẾP TRÊN BẢNG -> CHỈ GỬI CÁC DÒNG CÓ GÁN CỜ
    // VÀ MAP ĐÚNG TIẾT PPCT CỦA MÔN ĐÓ, LỚP/KHỐI ĐÓ ĐỂ GHI ĐÈ
    // =====================================================================
    if (!laCapNhatMoiTuExcel) {
        if (!tuan) {
            alert("Lỗi: Phải xác định rõ Tuần học trước khi Lưu.");
            return;
        }

        const cacDongDaSua = document.querySelectorAll('#vungDuLieuLichPPCT tr[data-da-sua="true"]');
        if (cacDongDaSua.length === 0) {
            alert("Chưa có dòng nào được chỉnh sửa (chưa gắn cờ ĐÃ SỬA) để lưu.");
            return;
        }

        const lopMacDinh = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
        const khoiMacDinh = document.getElementById('locKhoiPPCT') ? document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so') : '';
        if (cheDoXemPPCT !== 'gvbm' && (!khoiMacDinh || khoiMacDinh === 'KX' || !lopMacDinh)) {
            alert("Lỗi: Phải xác định rõ Tuần, Lớp trên bộ lọc trước khi Lưu.");
            return;
        }

        let mangGhiDaSua = [];
        const tapKhoiCapNhat = new Set();
        const capNhatKhoaSauKhiLuu = [];

        cacDongDaSua.forEach(tr => {
            let inp = tr.querySelector('[data-loai="tietPpc"]');
            if (!inp) return;
            let valTiet = inp.innerText.trim();
            if (valTiet === '') return;

            let valTietGoc = (inp.getAttribute('data-tiet-ppc-goc') || valTiet).trim();
            let idKhoa = inp.getAttribute('data-ppct-id');

            let lopRow = tr.getAttribute('data-lop') || lopMacDinh;
            let khoiRow = tr.getAttribute('data-khoi') || khoiMacDinh;
            if (!khoiRow && lopRow) {
                let mK = String(lopRow).match(/\d+/);
                if (mK) khoiRow = mK[0];
            }

            let theMonTrenLuoi = tr.querySelector('[data-loai="mon"]');
            let monRow = tr.getAttribute('data-mon') || (theMonTrenLuoi ? theMonTrenLuoi.innerText.trim() : '') || (mon !== 'Tất cả' ? mon : '');
            if (!khoiRow || !monRow) return;

            let thuRow = tr.getAttribute('data-thu') || '';
            let buoiRow = tr.getAttribute('data-buoi') || '';
            let tietRow = tr.getAttribute('data-tiet') || '';
            if ((!thuRow || !buoiRow || !tietRow) && idKhoa) {
                let parts = idKhoa.split('_');
                if (cheDoXemPPCT === 'gvbm' && parts.length >= 4) {
                    thuRow = thuRow || parts[1];
                    buoiRow = buoiRow || parts[2];
                    tietRow = tietRow || parts[3];
                } else if (parts.length >= 3) {
                    thuRow = thuRow || parts[0];
                    buoiRow = buoiRow || parts[1];
                    tietRow = tietRow || parts[2];
                }
            }

            let elTenBai = tr.querySelector('[data-loai="tenBai"]') || document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`);
            let elDieuChinh = tr.querySelector('[data-loai="dieuChinh"]') || document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`);
            let valTenBai = elTenBai ? elTenBai.innerText.trim() : '';
            let valDieuChinh = elDieuChinh ? elDieuChinh.innerText.trim() : '';

            mangGhiDaSua.push({
                khoi: khoiRow,
                lop: lopRow,
                tietPpc: valTiet,
                tietPpcGoc: valTietGoc,
                mon: monRow,
                tenBai: valTenBai,
                dieuChinh: valDieuChinh,
                thongTinTkb: { tuan: tuan, lop: lopRow, thu: thuRow, buoi: buoiRow, tietTkb: tietRow },
                daSua: true
            });

            capNhatKhoaSauKhiLuu.push({
                tr, inp, khoiRow, lopRow, monRow, thuRow, buoiRow, tietRow, valTiet, valTietGoc, valTenBai, valDieuChinh
            });
        });

        if (mangGhiDaSua.length === 0) {
            alert("Không có dòng đã sửa nào có Tiết PPCT và Môn học hợp lệ để lưu.");
            return;
        }

        nutBam.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang lưu...</span></div>`;
        nutBam.disabled = true;

        try {
            const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai : fetch)(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
                method: 'POST',
                body: JSON.stringify({
                    thaoTac: 'luuPPCT',
                    cheDo: 'capNhatDongDaSua',
                    duLieu: mangGhiDaSua
                })
            });
            const ketQua = await phanHoi.json();

            if (ketQua.trangThai === 'Thành công') {
                capNhatKhoaSauKhiLuu.forEach(u => {
                    u.inp.setAttribute('data-tiet-ppc-goc', u.valTiet);

                    if (cheDoXemPPCT === 'gvbm' && duLieuGvbmTheoLop[u.lopRow]) {
                        let tietTkbItem = duLieuGvbmTheoLop[u.lopRow].dsTkb.find(t => String(t.thu) === u.thuRow && String(t.buoi) === u.buoiRow && String(t.tiet) === String(u.tietRow));
                        if (tietTkbItem) tietTkbItem.tietPpc = u.valTiet;
                        window.khoTkbTuanLopPPCT[`${tuan}_${u.lopRow}`] = duLieuGvbmTheoLop[u.lopRow].dsTkb;
                    } else if (Array.isArray(duLieuTkbTuan)) {
                        let tietTkbItem = duLieuTkbTuan.find(t => String(t.thu) === u.thuRow && String(t.buoi) === u.buoiRow && String(t.tiet) === String(u.tietRow));
                        if (tietTkbItem) tietTkbItem.tietPpc = u.valTiet;
                        window.khoTkbTuanLopPPCT[`${tuan}_${u.lopRow}`] = duLieuTkbTuan;
                    }

                    const capNhatMangPpct = (ds) => {
                        if (!Array.isArray(ds)) return;
                        let idx = ds.findIndex(b => {
                            let tB = String(b.tietPpc || b.tiet || '').trim();
                            let mB = b.mon || b.monHoc || '';
                            return (tB === u.valTietGoc || tB === u.valTiet) && monHocKhopPPCT(mB, u.monRow);
                        });
                        if (idx !== -1) {
                            ds[idx].tietPpc = u.valTiet;
                            ds[idx].tiet = u.valTiet;
                            ds[idx].tenBai = u.valTenBai;
                            ds[idx].tenBaiHoc = u.valTenBai;
                            ds[idx].dieuChinh = u.valDieuChinh;
                        } else {
                            ds.push({
                                tietPpc: u.valTiet, tiet: u.valTiet,
                                mon: u.monRow, monHoc: u.monRow,
                                tenBai: u.valTenBai, tenBaiHoc: u.valTenBai,
                                dieuChinh: u.valDieuChinh
                            });
                        }
                    };

                    if (u.khoiRow && window.khoPpctToanTruong[u.khoiRow]) {
                        capNhatMangPpct(window.khoPpctToanTruong[u.khoiRow]);
                        tapKhoiCapNhat.add(u.khoiRow);
                    }
                    if (cheDoXemPPCT !== 'gvbm') {
                        capNhatMangPpct(duLieuPpctGoc);
                    }

                    u.tr.removeAttribute('data-da-sua');
                    u.tr.classList.remove('bg-amber-100', 'hover:bg-amber-200');
                    u.tr.classList.add('bg-white', 'hover:bg-slate-50');
                    let badge = u.tr.querySelector('.badge-sua');
                    if (badge) badge.remove();
                });

                tapKhoiCapNhat.forEach(k => luuKhoPpctVaoStorage(k, window.khoPpctToanTruong[k], true));
                if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();

                alert(`Đã lưu đè thành công ${mangGhiDaSua.length} dòng PPCT đã sửa lên hệ thống!`);
            } else {
                alert(`Sự cố lưu trữ: ${ketQua.thongBao}`);
            }
        } catch (loi) {
            alert('Lỗi kết nối máy chủ: ' + loi.message);
        } finally {
            nutBam.innerHTML = noiDungGoc;
            nutBam.disabled = false;
        }
        return;
    }

    // =====================================================================
    // TRƯỜNG HỢP 2: CẬP NHẬT MỚI TỪ FILE EXCEL -> GIỮ NGUYÊN NHƯ TỆP GỐC
    // =====================================================================
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const lop = document.getElementById('locLopPPCT').value.trim();
    
    if (mon === 'Tất cả' || mon === '') {
        let phanHoiXacNhan = confirm("Hệ thống sẽ đồng bộ hóa cấu trúc báo giảng cho Toàn bộ môn học đang hiển thị trên lưới. Đồng ý tiếp tục?");
        if (!phanHoiXacNhan) return;
    }
    
    if (!khoi || khoi === 'KX' || !tuan || !lop) {
        alert("Lỗi: Phải xác định rõ Tuần, Lớp trên bộ lọc trước khi Lưu.");
        return;
    }
    
    let mangGhi = [];
    const cacOInputTiet = document.querySelectorAll('[data-loai="tietPpc"]');
    
    // ========================================================
    // VÒNG LẶP 1: QUÉT CÁC TIẾT HIỂN THỊ TRÊN LƯỚI
    // ========================================================
    cacOInputTiet.forEach(inp => {
        let tr = inp.closest('tr');
        let laDongDaSua = tr.getAttribute('data-da-sua') === 'true'; 
        
        let valTiet = inp.innerText.trim();
        if (valTiet !== '') {
            let idKhoa = inp.getAttribute('data-ppct-id');
            let parts = idKhoa.split('_'); 
            
            // [LOGIC CHUẨN]: Quyết định tên môn gán lên máy chủ
            let monLuuTru = "";
            if (mon === 'Tất cả' || mon === '') {
                let theMonTrenLuoi = tr.querySelector('[data-loai="mon"]'); 
                monLuuTru = theMonTrenLuoi ? theMonTrenLuoi.innerText.trim() : "";
            } else {
                monLuuTru = mon;
            }

            let valTenBai = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`).innerText.trim();
            let valDieuChinh = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`).innerText.trim();
            
            mangGhi.push({
                khoi: khoi, 
                tietPpc: valTiet, 
                mon: monLuuTru, 
                tenBai: valTenBai, 
                dieuChinh: valDieuChinh,
                thongTinTkb: { tuan: tuan, lop: lop, thu: parts[0], buoi: parts[1], tietTkb: parts[2] },
                daSua: laDongDaSua 
            });

            let tietTkbItem = duLieuTkbTuan.find(t => String(t.thu) === parts[0] && String(t.buoi) === parts[1] && String(t.tiet) === String(parts[2]));
            if (tietTkbItem) tietTkbItem.tietPpc = valTiet;
            
            let idx = duLieuPpctGoc.findIndex(b => {
                let tGoc = b.tietPpc || b.tiet || '';
                let mGoc = b.mon || b.monHoc || '';
                return String(tGoc).trim() === valTiet && (mGoc === monLuuTru || mon === monLuuTru);
            });

            if (idx !== -1) {
                duLieuPpctGoc[idx].tenBai = valTenBai;
                duLieuPpctGoc[idx].tenBaiHoc = valTenBai;
                duLieuPpctGoc[idx].dieuChinh = valDieuChinh;
                duLieuPpctGoc[idx].mon = monLuuTru;
                duLieuPpctGoc[idx].monHoc = monLuuTru;
            } else {
                duLieuPpctGoc.push({ tietPpc: valTiet, tiet: valTiet, mon: monLuuTru, monHoc: monLuuTru, tenBai: valTenBai, tenBaiHoc: valTenBai, dieuChinh: valDieuChinh });
            }
        }
    });
    
    // ========================================================
    // VÒNG LẶP 2: BÙ ĐẮP DỮ LIỆU CỦA CÁC TIẾT BỊ ẨN TRONG BỘ NHỚ
    // ========================================================
    duLieuPpctGoc.forEach(goc => {
        let tGoc = goc.tietPpc || goc.tiet || '';
        
        let mGoc = "";
        if (mon === 'Tất cả' || mon === '') {
            mGoc = goc.mon || goc.monHoc || ''; 
        } else {
            mGoc = mon;
        }

        let daCoTrenLuoi = mangGhi.some(ghi => String(ghi.tietPpc) === String(tGoc) && (mGoc === '' || ghi.mon === mGoc));
        
        if (!daCoTrenLuoi && String(tGoc).trim() !== '') {
            mangGhi.push({
                khoi: khoi, tietPpc: tGoc, mon: mGoc, tenBai: goc.tenBai || goc.tenBaiHoc || '', dieuChinh: goc.dieuChinh || goc.ghiChu || '',
                thongTinTkb: null, daSua: false 
            });
        }
    });
    
    nutBam.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang lưu...</span></div>`;
    nutBam.disabled = true;

    try {
        const payload = { thaoTac: 'luuPPCT', duLieu: mangGhi };
        
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai : fetch)(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') {
            alert(`Đã lưu Phân phối chương trình Khối ${khoi} lên hệ thống thành công!`);
            const cacheKeyToClear = `PPCT_CACHE_${tuan}_${lop}_${mon}`;
            localStorage.removeItem(cacheKeyToClear);

            luuKhoPpctVaoStorage(khoi, duLieuPpctGoc, true);
            window.khoTkbTuanLopPPCT[`${tuan}_${lop}`] = duLieuTkbTuan;
            window.tapTkbTuanLopDaXacThucPhien.add(`${tuan}_${lop}`);
            if (typeof window.lamSachBoNhoSoDauBai === 'function') window.lamSachBoNhoSoDauBai();
            
            document.querySelectorAll('tr[data-da-sua="true"]').forEach(tr => {
                tr.removeAttribute('data-da-sua');
                tr.classList.remove('bg-amber-100', 'hover:bg-amber-200');
                tr.classList.add('bg-white', 'hover:bg-slate-50');
                let badge = tr.querySelector('.badge-sua');
                if (badge) badge.remove();
            });

            document.querySelectorAll('.dong-xem-truoc-excel').forEach(dong => dong.remove());
            
        } else {
            alert(`Sự cố lưu trữ: ${ketQua.thongBao}`);
        }
    } catch (loi) {
        alert('Lỗi kết nối máy chủ: ' + loi.message);
    } finally {
        nutBam.innerHTML = noiDungGoc;
        nutBam.disabled = false;
    }
}

// =========================================================================
// KHỐI 6: XỬ LÝ XOÁ DỮ LIỆU TRA CỨU TRÊN UI
// =========================================================================
function xoDuLieuTraCuuPPCTOnUI() {
    // 1. Reset các ô input lọc về giá trị rỗng hoặc mặc định
    const inputTuan = document.getElementById('locTuanUI');
    if (inputTuan) {
        if (typeof tuanDangXem !== 'undefined') inputTuan.value = tuanDangXem;
        else inputTuan.value = "1";
    }

    const inputLop = document.getElementById('locLopPPCT');
    if (inputLop) inputLop.value = "";

    const inputKhoi = document.getElementById('locKhoiPPCT');
    if (inputKhoi) {
        inputKhoi.value = "";
        inputKhoi.removeAttribute('data-khoi-so');
    }

    const inputMon = document.getElementById('locMonPPCT');
    if (inputMon) inputMon.value = "";

    // 2. Clear bảng dữ liệu về trạng thái ban đầu
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    if (tbody) {
        const soCot = (cheDoXemPPCT === 'gvbm') ? 5 : 7;
        tbody.innerHTML = `<tr><td colspan="${soCot}" class="text-center py-10 text-slate-500 font-bold italic">Vui lòng chọn Tuần, Lớp, Môn và bấm "Xác nhận"</td></tr>`;
    }

    // 3. Reset các biến dữ liệu toàn cục liên quan đến view này (để tránh Lưu nhầm)
    duLieuTkbTuan = [];
    duLieuPpctGoc = [];
    duLieuGvbmTheoLop = {};
    _capTuanLopDangHienThiPPCT = '';
    _tuanDangHienThiGvbmPPCT = '';
    
    // 4. Khôi phục lại datalist cho các ô input (nếu có)
    bomDuLieuVaoBoLoc();
    capNhatHienThiNutKhoaSuaPPCT();
}
