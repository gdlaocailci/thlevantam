// KHỐI 1: KHỞI TẠO BIẾN TOÀN CỤC, KHO ĐỆM ĐA TẦNG VÀ GẮN GIAO DIỆN VÀO DOM
// =========================================================================
let duLieuPpctGoc = []; 
let duLieuTkbTuan = [];
let trangThaiDaTaiGiaoDienPPCT = false;
let trangThaiChoPhepSua = false; // [NÂNG CẤP]: Biến lưu trạng thái khoá/mở sửa bảng

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
let _daKhoiPhucKhoPPCT = false;
let _capTuanLopDangHienThiPPCT = '';

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
                        tietPpc: t.tietPpc ? String(t.tietPpc).trim() : ''
                    });
                }
            }
            if (dsLop.length > 0) {
                window.khoTkbTuanLopPPCT[khoaTkbLop] = dsLop;
                if (kqTuan.daXacThucPhien) window.tapTkbTuanLopDaXacThucPhien.add(khoaTkbLop);
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
                        tietPpc: t.tietPpc ? String(t.tietPpc).trim() : ''
                    });
                }
            }
            if (dsLop.length > 0) {
                window.khoTkbTuanLopPPCT[khoaTkbLop] = dsLop;
                return { ds: dsLop, daXacThucPhien: true };
            }
        }
    }

    return null;
};

document.addEventListener('DOMContentLoaded', () => {
    taoMenuPhanPhoiChuongTrinh();
    taoKhungGiaoDienPPCT();
    
    // Liên tục lắng nghe trạng thái đăng nhập để phân quyền Admin / Quản lý PPCT
    setInterval(() => {
        let nhomNut = document.getElementById('nhomNutCongCuPPCT');
        if (nhomNut) {
            let coQuyen = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) || 
                          (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.menu && quyenChiTiet.menu.includes('menuPhanPhoiChuongTrinh'));
            nhomNut.style.display = coQuyen ? 'flex' : 'none';
        }
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
                    <img src="${typeof CAU_HINH_FRONTEND !== 'undefined' ? CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU : 'https://www.svgrepo.com/show/309489/document-report.svg'}" class="w-10 h-10 object-contain drop-shadow-md">
                    <h2 class="text-xl font-extrabold text-blue-900 uppercase tracking-wide">Quản lý Phân Phối Chương Trình</h2>
                </div>
                
                <div id="nhomNutCongCuPPCT" class="flex flex-wrap items-center gap-2" style="display: none;">
                    <input type="file" id="fileNhapPPCT" accept=".xlsx, .xls" class="hidden" onchange="xuLyNhapExcelPPCT(event)">
                    <button onclick="document.getElementById('fileNhapPPCT').click()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm">
                        Nhập Excel
                    </button>
                    
                    <button id="nutSuaDuLieuPPCT" onclick="chuyenDoiTrangThaiSuaPPCT()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow transition-colors duration-300 flex items-center gap-1.5 text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        Khóa Sửa
                    </button>

                    <button onclick="xuLyXuatExcelPPCT()" class="bg-green-700 hover:bg-green-800 text-white font-bold py-1.5 px-3 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm">
                        Xuất Excel
                    </button>
                    <button onclick="luuDuLieuPPCTLenMayChu(event)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded shadow transition duration-200 flex items-center gap-1.5 text-sm ml-2">
                        Lưu PPCT
                    </button>
                </div>
            </div>

            <div class="bg-white border border-gray-300 shadow-sm p-3 rounded flex flex-wrap items-end gap-4 mb-4 flex-none">
                <div class="flex flex-col w-24">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Tuần học</label>
                    <input type="number" id="locTuanUI" min="1" max="52" value="1" 
                           onfocus="this.dataset.oldValue = this.value; this.select();" 
                           onblur="if(this.value === '') this.value = this.dataset.oldValue || '1';" 
                           onchange="xuLyThayDoiBoLocPPCT('tuan')"
                           class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-900 bg-blue-50 text-center">
                </div>
                <div class="flex flex-col w-32">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Lớp</label>
                    <input type="text" id="locLopPPCT" list="listLopPPCT" 
                           onfocus="this.dataset.oldValue = this.value; this.value = '';" 
                           onblur="if(this.value === '') this.value = this.dataset.oldValue;" 
                           onchange="tuDongTinhKhoiLop(); this.blur(); xuLyThayDoiBoLocPPCT('lop');" 
                           class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-blue-50 text-center" placeholder="Chọn lớp">
                    <datalist id="listLopPPCT"></datalist>
                </div>
                <div class="flex flex-col w-24">
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
               <button onclick="taiDuLieuTkbVaPpct()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-6 rounded shadow transition duration-200 text-sm ml-auto flex items-center gap-2 h-[34px]">
                    Xem
                </button>
            </div>

            <div class="flex-1 overflow-auto border border-gray-400 shadow-sm bg-white relative">
                <table class="bang-excel w-full text-center border-collapse">
                    <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm border-b-2 border-slate-400">
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

// =========================================================================
// KHỐI 1.5: ĐIỀU KHIỂN BẬT/TẮT TRẠNG THÁI SỬA DỮ LIỆU VÀ BẮT SỰ KIỆN GHI ĐÈ
// =========================================================================
function chuyenDoiTrangThaiSuaPPCT() {
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
        
        // Tìm cột Môn học (liền kề cột Tiết PPCT) để gắn badge mà không làm hỏng dữ liệu nhập
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
    if (headerHeThong) { headerHeThong.style.display = 'none'; }

    // 4. Hiện khung PPCT
    const khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
    if (khungPPCT) { khungPPCT.classList.remove('hidden'); khungPPCT.classList.add('flex'); }

    // 5. Nạp dữ liệu vào ô lọc và tự động kết xuất ngay lập tức (0ms nếu đã có trong bộ nhớ)
    bomDuLieuVaoBoLoc();
    if (typeof tuanDangXem !== 'undefined' && !trangThaiDaTaiGiaoDienPPCT) {
        let theTuanUI = document.getElementById('locTuanUI');
        if (theTuanUI) theTuanUI.value = tuanDangXem;
    }

    const tuan = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
    const lop = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
    const khoi = document.getElementById('locKhoiPPCT') ? document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so') : '';
    if (tuan && lop && khoi && khoi !== 'KX') {
        trangThaiDaTaiGiaoDienPPCT = true;
        taiDuLieuTkbVaPpct(false);
    }
}

let _chuKyBoLocPPCT = '';
function bomDuLieuVaoBoLoc() {
    if (typeof thongSoHocVu !== 'undefined') {
        const dsLop = thongSoHocVu.DANH_SACH_LOP || [];
        const dsMon = thongSoHocVu.DANH_SACH_MON_HOC || [];
        
        const listLop = document.getElementById('listLopPPCT');
        const listMon = document.getElementById('listMonPPCT');
        const inputLop = document.getElementById('locLopPPCT');
        const inputMon = document.getElementById('locMonPPCT');

        let chuKyMoi = `${dsLop.join('|')}__${dsMon.join('|')}`;
        if (_chuKyBoLocPPCT !== chuKyMoi) {
            _chuKyBoLocPPCT = chuKyMoi;
            if (listLop) listLop.innerHTML = dsLop.map(lop => `<option value="${lop}">`).join('');
            // [NÂNG CẤP]: Đưa tùy chọn "Tất cả" lên đỉnh danh sách đổ xuống
            if (listMon) {
                listMon.innerHTML = `<option value="Tất cả"></option>` + dsMon.map(mon => `<option value="${mon}">`).join('');
            }
        }

        if (inputLop && inputLop.value === '' && dsLop.length > 0) {
            inputLop.value = dsLop[0];
            tuDongTinhKhoiLop(); 
        }
        
        // [NÂNG CẤP]: Mặc định hệ thống sẽ để trống hoặc chọn "Tất cả" để hiển thị toàn bộ thời khóa biểu
        if (inputMon && inputMon.value === '') {
            inputMon.value = 'Tất cả';
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

// Xử lý thông minh khi người dùng thay đổi Tuần / Lớp / Môn trên bộ lọc
function xuLyThayDoiBoLocPPCT(loaiThayDoi) {
    const tuan = document.getElementById('locTuanUI') ? document.getElementById('locTuanUI').value.trim() : '';
    const lop = document.getElementById('locLopPPCT') ? document.getElementById('locLopPPCT').value.trim() : '';
    const khoi = document.getElementById('locKhoiPPCT') ? document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so') : '';
    const mon = document.getElementById('locMonPPCT') ? document.getElementById('locMonPPCT').value.trim() : 'Tất cả';

    if (!tuan || !lop || !khoi || khoi === 'KX') return;

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
            if (menuClicked.id === 'menuTKB') {
                headerHeThong.style.display = ''; // Khôi phục khi về trang chủ
            } else {
                headerHeThong.style.display = 'none'; // Tiếp tục ẩn ở Thống kê, Cài đặt...
            }
        }
    }
});

// =========================================================================
// KHỐI 3: SÀNG LỌC DỮ LIỆU ĐÃ CÓ & TẢI CHÊNH LỆCH SIÊU TỐC (DIFFERENTIAL SYNC)
// =========================================================================
let _dangTaiPPCT = false;
async function taiDuLieuTkbVaPpct(epDongBo = false) {
    const tuan = document.getElementById('locTuanUI').value.trim();
    const lop = document.getElementById('locLopPPCT').value.trim();
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    const nutXacNhan = document.querySelector('button[onclick="taiDuLieuTkbVaPpct()"]');
    const theGocNutXacNhan = nutXacNhan ? nutXacNhan.innerHTML : 'Xem';

    if (!tuan || !lop || !khoi || khoi === 'KX') {
        alert("Đồng chí vui lòng điền đầy đủ: Tuần, Lớp để truy xuất dữ liệu.");
        return;
    }

    // 1. SÀNG LỌC DỮ LIỆU ĐÃ CÓ TRONG BỘ NHỚ (TKB THEO TUẦN_LỚP & PPCT THEO KHỐI)
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

    // 2. NẾU ĐÃ CÓ DỮ LIỆU TRONG BỘ NHỚ -> KẾT XUẤT NGAY TỨC THÌ (0ms)
    if (coSanTkb && coSanPpct) {
        duLieuTkbTuan = kqTkbHienHanh.ds;
        duLieuPpctGoc = kqPpctHienHanh.ds;
        _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
        veBangKhungLichPPCT(mon);

        // Nếu cả TKB của tuần/lớp và PPCT của khối đều đã được xác thực trong phiên làm việc này -> Hoàn tất ngay (0ms), không gọi lại máy chủ!
        if (!epDongBo && kqTkbHienHanh.daXacThucPhien && kqPpctHienHanh.daXacThucPhien) {
            return;
        }
    } else if (coSanTkb && !coSanPpct) {
        // Đã có sẵn khung TKB của lớp từ trang chính -> Vẽ ngay khung tiết học trong lúc nạp bổ sung PPCT của Khối
        duLieuTkbTuan = kqTkbHienHanh.ds;
        duLieuPpctGoc = [];
        _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
        veBangKhungLichPPCT(mon);
    } else if (!coSanTkb && coSanPpct) {
        // Đã có sẵn PPCT của Khối -> Giữ nguyên PPCT, chỉ cần lấy thêm TKB của tuần/lớp đó
        duLieuPpctGoc = kqPpctHienHanh.ds;
    }

    if (_dangTaiPPCT) return;
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

    // 3. CHỈ TẢI PHẦN DỮ LIỆU CHƯA XÁC THỰC TỪ MÁY CHỦ (DIFFERENTIAL FETCH)
    // Đặc biệt: Luôn yêu cầu toàn bộ môn của Khối (mon='') để lưu đệm trọn gói cả Khối 1 lần duy nhất
    try {
        const tuanHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI)
            ? thongSoHocVu.TUAN_HIEN_TAI
            : (typeof tuanDangXem !== 'undefined' ? tuanDangXem : 1);
        const coPpctXacThuc = (!epDongBo && coSanPpct && kqPpctHienHanh.daXacThucPhien) ? '1' : '0';
        const coTkbXacThuc = (!epDongBo && coSanTkb && kqTkbHienHanh.daXacThucPhien) ? '1' : '0';

        const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTkbVaPpct&tuan=${tuan}&lop=${encodeURIComponent(lop)}&khoi=${khoi}&mon=&tuanHienTai=${tuanHeThong}&daCoPpct=${coPpctXacThuc}&daCoTkb=${coTkbXacThuc}`;
        
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlAPI) : fetch(urlAPI));
        
        if (!phanHoi.ok) throw new Error("Mất kết nối máy chủ");
        const ketQua = await phanHoi.json();
        if (ketQua.trangThai === 'Lỗi' || ketQua.trangThai === 'loi_he_thong') {
            throw new Error(ketQua.thongBao || "Lỗi truy xuất từ máy chủ");
        }

        let canVeLai = !daHienThiTruoc;

        // Cập nhật TKB của (Tuần, Lớp) nếu máy chủ trả về
        if (Array.isArray(ketQua.duLieuTkb) && (coTkbXacThuc === '0' || ketQua.duLieuTkb.length > 0)) {
            if (JSON.stringify(duLieuTkbTuan) !== JSON.stringify(ketQua.duLieuTkb)) {
                canVeLai = true;
            }
            duLieuTkbTuan = ketQua.duLieuTkb;
            window.khoTkbTuanLopPPCT[`${tuan}_${lop}`] = duLieuTkbTuan;
            window.tapTkbTuanLopDaXacThucPhien.add(`${tuan}_${lop}`);
        }

        // Cập nhật PPCT của toàn Khối nếu máy chủ trả về
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

        // Chỉ vẽ lại nếu người dùng vẫn đang chọn đúng Tuần và Lớp đó
        const tuanHienTaiUI = document.getElementById('locTuanUI').value.trim();
        const lopHienTaiUI = document.getElementById('locLopPPCT').value.trim();
        const monHienTaiUI = document.getElementById('locMonPPCT').value.trim();
        if (tuanHienTaiUI === tuan && lopHienTaiUI === lop && canVeLai) {
            _capTuanLopDangHienThiPPCT = `${tuan}_${lop}`;
            veBangKhungLichPPCT(monHienTaiUI);
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
    }
}

// Gắn bí danh để tương thích với bộ điều phối chuyển tab của app.js
window.taiDuLieuTkbVaPpct = taiDuLieuTkbVaPpct;
window.taiDuLieuPhanPhoiChuongTrinh = taiDuLieuTkbVaPpct;
window.taiDuLieuPPCT = taiDuLieuTkbVaPpct;

function veBangKhungLichPPCT(monDangChon) {
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

    // [ÁP DỤNG LOGIC SỔ ĐẦU BÀI]: Gom nhóm phân môn bằng Regex loại bỏ số và ngoặc đơn
    let trackerPpct = {};
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) {
        let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lop] || {};
        let tongTietNhom = {};
        
        // Bóc tách hậu tố số và cộng dồn số tiết về 1 Môn Gốc duy nhất
        Object.keys(dmKhoi).forEach(m => {
            let tenM = m.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
            let baseName = tenM.replace(/[0-9\(\)]/g, '').trim(); 
            tongTietNhom[baseName] = (tongTietNhom[baseName] || 0) + (parseInt(dmKhoi[m]) || 0);
        });

        // Thiết lập bộ đếm tịnh tiến dùng chung
        Object.keys(tongTietNhom).forEach(baseName => {
            let soTiet1Tuan = tongTietNhom[baseName];
            trackerPpct[baseName] = {
                tietPpcAuto: (tuan - 1) * soTiet1Tuan + 1,
                chiSoPpctTuDong: (tuan - 1) * soTiet1Tuan
            };
        });
    }
//*****************************************************************************************************************************************************************
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
        
        // Truy xuất Cache siêu tốc O(1)
        if (cachePpctTheoMon[monGridChuan]) return cachePpctTheoMon[monGridChuan];
        
        let ketQuaLoc = duLieuPpctDaChuanHoa.filter(b => {
            if (b.mChuan === "") return !isXemTatCa;
            return b.mChuan === monGridChuan || b.mChuan === monGridGoc || b.mGoc === monGridGoc;
        }).sort((a, b) => parseInt(a.tietPpc || a.tiet || 0) - parseInt(b.tietPpc || b.tiet || 0));
        
        // Đóng băng kết quả vào Cache cho các vòng lặp sau
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

                // Quét qua phễu lọc bằng cả 2 điều kiện (Môn chuẩn hoặc Môn gốc)
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
                ngayCuaThu.setDate(ngayCuaThu.getDate() + (doLechThu[thu] || 0));
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
                        let valTietPPC = tietTkb.tietPpc || '';
                        
                        if (valTietPPC === '') {
                            // Gọi bộ đếm bằng Môn Gốc để các phân môn dùng chung một số tịnh tiến
                            let track = trackerPpct[monTkbGoc];
                            if (track) {
                                if (track.chiSoPpctTuDong < ppctCuaMon.length) {
                                    valTietPPC = ppctCuaMon[track.chiSoPpctTuDong].tietPpc || ppctCuaMon[track.chiSoPpctTuDong].tiet;
                                } else {
                                    valTietPPC = track.tietPpcAuto;
                                }
                                track.chiSoPpctTuDong++;
                                track.tietPpcAuto++; 
                            } else { valTietPPC = 1; }
                        }

                        let valTenBai = ''; let valDieuChinh = '';
                        
                        if (valTietPPC !== '') {
                            // Chỉ tìm Tên bài trong phạm vi dữ liệu của Môn này
                            let baiGoc = ppctCuaMon.find(b => String(b.tietPpc || b.tiet).trim() === String(valTietPPC).trim());
                            if (baiGoc) { 
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
                            <td class="border-r border-gray-300 align-middle text-center p-3 font-extrabold text-red-600 whitespace-normal" data-ppct-id="${idKhoa}" data-loai="tietPpc">${valTietPPC}</td>

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
    if (trangThaiChoPhepSua) {
        capNhatTrangThaiCacO();
    }
}

// =========================================================================
// KHỐI 4: GIAO TIẾP EXCEL BẰNG SHEETJS (XLSX)
// =========================================================================
function xuLyXuatExcelPPCT() {
    if (typeof XLSX === 'undefined') { alert("Thư viện Excel chưa tải xong."); return; }
    
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

                // MỞ RỘNG GIAO DIỆN: XUẤT TOÀN BỘ DỮ LIỆU EXCEL XUỐNG BÊN DỨC ĐỂ KIỂM TRA
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
    
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tuan = document.getElementById('locTuanUI').value.trim();
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
                // Lấy tên môn hiển thị trực tiếp trên lưới (Tên file Excel)
                let theMonTrenLuoi = tr.querySelector('[data-loai="mon"]'); 
                monLuuTru = theMonTrenLuoi ? theMonTrenLuoi.innerText.trim() : "";
            } else {
                // Bắt buộc ép theo tên môn tại ô lọc
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

            // Cập nhật trực tiếp tietPpc vào bộ nhớ TKB của tuần/lớp hiện hành
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
            // Lấy tên môn từ file Excel đang lưu trong bộ nhớ
            mGoc = goc.mon || goc.monHoc || ''; 
        } else {
            // Bắt buộc ép theo tên môn tại ô lọc
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
        
        // Sử dụng fetchVoiCoCheThuLai để chống lỗi kết nối
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai : fetch)(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') {
            alert(`Đã lưu Phân phối chương trình Khối ${khoi} lên hệ thống thành công!`);
            const cacheKeyToClear = `PPCT_CACHE_${tuan}_${lop}_${mon}`;
            localStorage.removeItem(cacheKeyToClear);

            // Đồng bộ tức thì dữ liệu vừa lưu vào kho PPCT của Khối và TKB của (Tuần, Lớp) để không phải tải lại
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-500 font-bold italic">Vui lòng chọn Tuần, Lớp, Môn và bấm "Xác nhận"</td></tr>`;
    }

    // 3. Reset các biến dữ liệu toàn cục liên quan đến view này (để tránh Lưu nhầm)
    duLieuTkbTuan = [];
    duLieuPpctGoc = [];
    _capTuanLopDangHienThiPPCT = '';
    
    // 4. Khôi phục lại datalist cho các ô input (nếu có)
    bomDuLieuVaoBoLoc();
}
