// =========================================================================
// MODULE: TỔNG HỢP SĨ SỐ & THEO DÕI HỌC SINH NGHỈ (TongHopSiSo.js)
// Hỗ trợ: Lọc theo Năm học, Tuần học hoặc Từ ngày - Đến ngày, Khối, Lớp, Tìm HS.
// Bổ sung đầy đủ tỷ lệ % chuyên cần theo từng Lớp/Ngày, Lớp/Kỳ và Toàn trường.
// =========================================================================

let trangThaiTongHopSiSo = {
    namHocChon: '',
    cheDoLoc: 'TUAN', // 'TUAN' | 'KHOANG_NGAY'
    tuanChon: '',
    tuNgay: '',
    denNgay: '',
    khoiChon: 'ALL',
    lopChon: 'ALL',
    tuKhoaHS: '',
    chiHienCoVang: false,
    ketQuaHienTai: null
};

let cacheNguonTongHopSiSo = null;
let dangTaiNguonTongHopSiSo = false;
let cacheHoTenGiaoVienTHSS = {};
let cacheGvcnLopTHSS = {};

function layNamHocMacDinhTHSS() {
    if (typeof namHocHeThongSDB !== 'undefined' && namHocHeThongSDB) return String(namHocHeThongSDB).trim();
    if (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu && window.thongSoHocVu.NAM_HOC) {
        return String(window.thongSoHocVu.NAM_HOC).trim();
    }
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu && thongSoHocVu.NAM_HOC) {
        return String(thongSoHocVu.NAM_HOC).trim();
    }
    let now = new Date();
    let y = now.getFullYear();
    return (now.getMonth() + 1 >= 8) ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function xacDinhNamHocTuNgayTHSS(ngayStr) {
    if (!ngayStr) return '';
    let m = String(ngayStr).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!m) return '';
    let thang = parseInt(m[2], 10);
    let nam = parseInt(m[3], 10);
    return (thang >= 8) ? `${nam}-${nam + 1}` : `${nam - 1}-${nam}`;
}

function parseNgayVNToDateTHSS(ngayStr) {
    if (!ngayStr) return null;
    let m = String(ngayStr).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    let mIso = String(ngayStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (mIso) return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10));
    return null;
}

function formatDateToIsoTHSS(d) {
    if (!d || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateToVNTHSS(d) {
    if (!d || isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function tinhPhanTramTHSS(tuSo, mauSo) {
    if (!mauSo || mauSo <= 0) return '0.0';
    return ((tuSo / mauSo) * 100).toFixed(1);
}

// 1. Khởi tạo & tự động nạp dữ liệu
window.khoiTaoTongHopSiSo = async function(containerId = 'vungHienThiTongHopSiSo', buocTaiLai = false) {
    let container = document.getElementById(containerId);
    if (!container) return;

    if (!buocTaiLai) {
        if (cacheNguonTongHopSiSo && Array.isArray(cacheNguonTongHopSiSo.tkbRows) && cacheNguonTongHopSiSo.tkbRows.length > 0) {
            await napBoSungDanhMucGvcnTHSS(false);
            veGiaoDienTongHopSiSo(containerId);
            return;
        }
        if (typeof window.mapTkbToanTap !== 'undefined' && window.mapTkbToanTap && Object.keys(window.mapTkbToanTap).length > 0) {
            await napBoSungDanhMucGvcnTHSS(false);
            veGiaoDienTongHopSiSo(containerId);
            return;
        }
    }

    if (dangTaiNguonTongHopSiSo) return;
    dangTaiNguonTongHopSiSo = true;

    container.innerHTML = `<div class="text-center py-12 text-slate-500 font-bold">
        <div class="w-9 h-9 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-base text-blue-900 font-extrabold">Đang tải dữ liệu chuyên cần &amp; Sĩ số từ máy chủ...</p>
    </div>`;

    try {
        if (!buocTaiLai && typeof dangTaiDuLieuSoDauBai !== 'undefined' && dangTaiDuLieuSoDauBai === true) {
            for (let w = 0; w < 20; w++) {
                await new Promise(r => setTimeout(r, 250));
                if (typeof window.mapTkbToanTap !== 'undefined' && window.mapTkbToanTap && Object.keys(window.mapTkbToanTap).length > 0) {
                    break;
                }
            }
        }

        let vanChuaCoDuLieu = (typeof window.mapTkbToanTap === 'undefined' || !window.mapTkbToanTap || Object.keys(window.mapTkbToanTap).length === 0);
        if (buocTaiLai || vanChuaCoDuLieu) {
            if (typeof CAU_HINH_FRONTEND === 'undefined' || !CAU_HINH_FRONTEND.URL_API_MAY_CHU) {
                throw new Error("Không tìm thấy cấu hình URL máy chủ (CAU_HINH_FRONTEND).");
            }
            let url = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDuLieuTongHopSiSo`;
            const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(url, {}, 3, 60000) : fetch(url));
            const duLieuSever = await phanHoi.json();

            if (!duLieuSever || duLieuSever.trangThai === 'loi_he_thong') {
                throw new Error((duLieuSever && duLieuSever.thongBao) ? duLieuSever.thongBao : "Máy chủ trả về lỗi.");
            }
            if (duLieuSever.DIEM_DANH_SDB && typeof duLieuSever.DIEM_DANH_SDB === 'object') {
                window.duLieuDiemDanhSDB = { ...duLieuSever.DIEM_DANH_SDB };
            }
            if (duLieuSever.SI_SO_THEO_LOP && typeof duLieuSever.SI_SO_THEO_LOP === 'object') {
                if (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu) {
                    window.thongSoHocVu.SI_SO_THEO_LOP = { ...(window.thongSoHocVu.SI_SO_THEO_LOP || {}), ...duLieuSever.SI_SO_THEO_LOP };
                }
            }
            if (duLieuSever.GVCN_THEO_LOP && typeof duLieuSever.GVCN_THEO_LOP === 'object') {
                Object.assign(cacheGvcnLopTHSS, duLieuSever.GVCN_THEO_LOP);
                if (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu) {
                    window.thongSoHocVu.GVCN_THEO_LOP = { ...(window.thongSoHocVu.GVCN_THEO_LOP || {}), ...duLieuSever.GVCN_THEO_LOP };
                }
            }
            if (duLieuSever.TU_DIEN_HO_TEN_GV && typeof duLieuSever.TU_DIEN_HO_TEN_GV === 'object') {
                Object.assign(cacheHoTenGiaoVienTHSS, duLieuSever.TU_DIEN_HO_TEN_GV);
                if (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu) {
                    window.thongSoHocVu.TU_DIEN_HO_TEN_GV = { ...(window.thongSoHocVu.TU_DIEN_HO_TEN_GV || {}), ...duLieuSever.TU_DIEN_HO_TEN_GV };
                }
            }
            cacheNguonTongHopSiSo = trichXuatNguonTuServerTHSS(duLieuSever);
        }
        await napBoSungDanhMucGvcnTHSS(buocTaiLai);
    } catch (loi) {
        container.innerHTML = `<div class="text-center py-10 text-red-600 font-bold">
            ⚠️ Lỗi tải dữ liệu sĩ số: ${loi.message}
            <div class="mt-3"><button type="button" onclick="khoiTaoTongHopSiSo('${containerId}', true)" class="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer">Thử tải lại</button></div>
        </div>`;
        dangTaiNguonTongHopSiSo = false;
        return;
    }

    dangTaiNguonTongHopSiSo = false;
    veGiaoDienTongHopSiSo(containerId);
};

function trichXuatNguonTuServerTHSS(duLieuSever) {
    let nhMacDinh = duLieuSever.NAM_HOC || layNamHocMacDinhTHSS();
    const chuanHoaThu = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    let mapSlot = {};
    const napTkb = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(d => {
            let t = parseInt(String(d['C'] || '').replace(/\D/g, ''), 10) || 0;
            let lop = String(d['G'] || '').trim().toUpperCase();
            let thu = chuanHoaThu(d['D'] || '');
            let buoi = String(d['E'] || '').trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(d['F'] || '').trim();
            let ngay = String(d['K'] || '').trim();
            if (!t || !lop || !thu || !tiet) return;
            let nh = xacDinhNamHocTuNgayTHSS(ngay) || nhMacDinh;
            mapSlot[`${nh}_${t}_${lop}_${thu}_${buoi}_${tiet}`] = {
                'Năm học': nh,
                'Tuần': String(t),
                'Mã Lớp': lop,
                'Thứ': thu,
                'Buổi': buoi,
                'Tiết': tiet,
                'Ngày': ngay,
                'Môn Học': d['H'] || '',
                'ChuyenCan_Thuc': ''
            };
        });
    };
    // Chỉ đọc duy nhất từ sheet DATA_TKB để lấy Năm học, Tuần, Thứ, Ngày, Lớp
    napTkb(duLieuSever.DATA_TKB);

    return {
        namHocMacDinh: nhMacDinh,
        tkbRows: Object.values(mapSlot),
        diemDanhMap: duLieuSever.DIEM_DANH_SDB || {},
        siSoMap: duLieuSever.SI_SO_THEO_LOP || {},
        gvcnMap: duLieuSever.GVCN_THEO_LOP || {},
        hoTenGvMap: duLieuSever.TU_DIEN_HO_TEN_GV || {}
    };
}

// 2. Lấy nguồn dữ liệu hợp nhất
function layNguonHopNhatTHSS() {
    let nhMacDinh = layNamHocMacDinhTHSS();
    let rows = [];
    if (cacheNguonTongHopSiSo && Array.isArray(cacheNguonTongHopSiSo.tkbRows) && cacheNguonTongHopSiSo.tkbRows.length > 0) {
        rows = cacheNguonTongHopSiSo.tkbRows;
    } else if (typeof window.mapTkbToanTap !== 'undefined' && window.mapTkbToanTap) {
        rows = Object.values(window.mapTkbToanTap);
    }
    let ddMap = (window.duLieuDiemDanhSDB && Object.keys(window.duLieuDiemDanhSDB).length > 0)
        ? window.duLieuDiemDanhSDB
        : (cacheNguonTongHopSiSo ? cacheNguonTongHopSiSo.diemDanhMap : {});

    return { nhMacDinh, rows, ddMap };
}

// Suy diễn chính xác toàn bộ ngày Thứ 2 -> Chủ nhật cho mọi Tuần dựa vào bất kỳ ngày gốc nào có trong DATA_TKB / RAM / Cài đặt
function xayDungBanDoNgayToanTuanTHSS(rows) {
    let mapNgayTuanThu = {}; // `${t}_${thu}` -> "dd/mm/yyyy"
    let mapThu2TheoTuan = {}; // tuanSo -> Date (Thứ 2 của tuần đó)
    const doLechThu = { 'Thứ 2': 0, 'Thứ 3': 1, 'Thứ 4': 2, 'Thứ 5': 3, 'Thứ 6': 4, 'Thứ 7': 5, 'Chủ nhật': 6 };

    const ghiNhan = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(d => {
            let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            let rawThu = String(d['Thứ'] || '').trim().toLowerCase();
            let thu = rawThu ? (rawThu.charAt(0).toUpperCase() + rawThu.slice(1)) : '';
            let ngay = String(d['Ngày'] || '').trim();
            if (t <= 0 || !thu || !ngay || ngay === '...') return;
            if (!mapNgayTuanThu[`${t}_${thu}`]) mapNgayTuanThu[`${t}_${thu}`] = ngay;
            if (!mapThu2TheoTuan[t] && doLechThu[thu] !== undefined) {
                let dt = parseNgayVNToDateTHSS(ngay);
                if (dt) {
                    let thu2 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - doLechThu[thu]);
                    mapThu2TheoTuan[t] = thu2;
                }
            }
        });
    };

    ghiNhan(rows);
    if (typeof duLieuTKBGopDaMap !== 'undefined') ghiNhan(duLieuTKBGopDaMap);

    // Nếu trên lưới Thời khóa biểu hiện tại có ô #chonNgayDauTuan và #hienThiTuanHienTai thì lấy làm mốc bổ sung
    let elTuanUI = document.getElementById('hienThiTuanHienTai');
    let elNgayUI = document.getElementById('chonNgayDauTuan');
    if (elTuanUI && elNgayUI && elNgayUI.value) {
        let tUI = parseInt(elTuanUI.value, 10) || 0;
        let dtUI = parseNgayVNToDateTHSS(elNgayUI.value);
        if (tUI > 0 && dtUI && !mapThu2TheoTuan[tUI]) {
            mapThu2TheoTuan[tUI] = dtUI;
        }
    }

    // Nếu biết Thứ 2 của ít nhất 1 tuần bất kỳ, suy diễn Thứ 2 cho các tuần còn lại chưa có ngày
    let danhSachTuanCoMoc = Object.keys(mapThu2TheoTuan).map(Number).sort((a, b) => a - b);
    if (danhSachTuanCoMoc.length > 0) {
        let tuanGoc = danhSachTuanCoMoc[danhSachTuanCoMoc.length - 1];
        let thu2Goc = mapThu2TheoTuan[tuanGoc];
        for (let t = 1; t <= 52; t++) {
            let thu2 = mapThu2TheoTuan[t] || new Date(thu2Goc.getFullYear(), thu2Goc.getMonth(), thu2Goc.getDate() + (t - tuanGoc) * 7);
            Object.keys(doLechThu).forEach(thu => {
                let k = `${t}_${thu}`;
                if (!mapNgayTuanThu[k]) {
                    let d = new Date(thu2.getFullYear(), thu2.getMonth(), thu2.getDate() + doLechThu[thu]);
                    mapNgayTuanThu[k] = formatDateToVNTHSS(d);
                }
            });
        }
    }

    return mapNgayTuanThu;
}

function layDanhSachNamHocTHSS() {
    let { nhMacDinh, rows } = layNguonHopNhatTHSS();
    let tapNH = new Set();
    if (nhMacDinh) tapNH.add(nhMacDinh);
    rows.forEach(d => {
        let nh = d['Năm học'] || xacDinhNamHocTuNgayTHSS(d['Ngày']);
        if (nh) tapNH.add(nh);
    });
    return Array.from(tapNH).sort((a, b) => b.localeCompare(a));
}

function layDanhSachTuanVaNgayTheoNamHocTHSS(namHocLoc) {
    let { nhMacDinh, rows, ddMap } = layNguonHopNhatTHSS();
    let mapNgayTuanThu = xayDungBanDoNgayToanTuanTHSS(rows);
    let mapTuanNgay = {};

    rows.forEach(d => {
        let nhDong = d['Năm học'] || xacDinhNamHocTuNgayTHSS(d['Ngày']) || nhMacDinh;
        if (namHocLoc && nhDong && nhDong !== namHocLoc) return;
        let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
        if (t <= 0) return;
        if (!mapTuanNgay[t]) {
            let dMin = parseNgayVNToDateTHSS(mapNgayTuanThu[`${t}_Thứ 2`]);
            let dMax = parseNgayVNToDateTHSS(mapNgayTuanThu[`${t}_Thứ 6`]);
            mapTuanNgay[t] = { tuan: t, minDate: dMin, maxDate: dMax };
        }
    });

    if (ddMap && (!namHocLoc || namHocLoc === nhMacDinh)) {
        Object.keys(ddMap).forEach(k => {
            let t = parseInt(String(k.split('_')[0] || '').replace(/\D/g, ''), 10) || 0;
            if (t > 0 && !mapTuanNgay[t]) {
                let dMin = parseNgayVNToDateTHSS(mapNgayTuanThu[`${t}_Thứ 2`]);
                let dMax = parseNgayVNToDateTHSS(mapNgayTuanThu[`${t}_Thứ 6`]);
                mapTuanNgay[t] = { tuan: t, minDate: dMin, maxDate: dMax };
            }
        });
    }

    return Object.values(mapTuanNgay).sort((a, b) => b.tuan - a.tuan);
}

function layDanhSachLopTongHopSS(namHocLoc) {
    let { nhMacDinh, rows } = layNguonHopNhatTHSS();
    let tapLop = new Set();
    rows.forEach(d => {
        let nhDong = d['Năm học'] || xacDinhNamHocTuNgayTHSS(d['Ngày']) || nhMacDinh;
        if (namHocLoc && nhDong && nhDong !== namHocLoc) return;
        let l = String(d['Mã Lớp'] || '').trim().toUpperCase();
        if (l) tapLop.add(l);
    });
    return Array.from(tapLop).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function laySiSoChuanTongHopSS(maLop) {
    let lopUp = String(maLop || '').trim().toUpperCase();
    if (typeof window.laySiSoChuanCuaLopSDB === 'function') {
        let ss = window.laySiSoChuanCuaLopSDB(lopUp);
        if (ss > 0) return ss;
    }
    if (cacheNguonTongHopSiSo && cacheNguonTongHopSiSo.siSoMap && cacheNguonTongHopSiSo.siSoMap[lopUp]) {
        return parseInt(cacheNguonTongHopSiSo.siSoMap[lopUp], 10) || 0;
    }
    let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
        ? window.thongSoHocVu
        : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);
    if (nguonHV && nguonHV.SI_SO_THEO_LOP && nguonHV.SI_SO_THEO_LOP[lopUp]) {
        return parseInt(nguonHV.SI_SO_THEO_LOP[lopUp], 10) || 0;
    }
    return 0;
}

function chuanHoaKhoaGvTHSS(val) {
    if (!val) return '';
    if (typeof window.chuanHoaDinhDanhGiaoVien === 'function') {
        return window.chuanHoaDinhDanhGiaoVien(val);
    }
    let s = String(val).trim().toLowerCase().normalize('NFC');
    const tuDienDau = {
        'òa': 'oà', 'óa': 'oá', 'ỏa': 'oả', 'õa': 'oã', 'ọa': 'oạ',
        'òe': 'oè', 'óe': 'oé', 'ỏe': 'oẻ', 'õe': 'oẽ', 'ọe': 'oẹ',
        'ùy': 'uỳ', 'úy': 'uý', 'ủy': 'uỷ', 'ũy': 'uỹ', 'ụy': 'uỵ'
    };
    for (let [kieuCu, kieuMoi] of Object.entries(tuDienDau)) {
        s = s.replace(new RegExp(kieuCu, 'g'), kieuMoi);
    }
    return s;
}

async function napBoSungDanhMucGvcnTHSS(buocTaiLai = false) {
    if (typeof CAU_HINH_FRONTEND === 'undefined' || !CAU_HINH_FRONTEND.URL_API_MAY_CHU) return;
    let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
        ? window.thongSoHocVu
        : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);

    let daCoGvcn = !buocTaiLai && (
        Object.keys(cacheGvcnLopTHSS).length > 0
        || (cacheNguonTongHopSiSo && cacheNguonTongHopSiSo.gvcnMap && Object.keys(cacheNguonTongHopSiSo.gvcnMap).length > 0)
        || (nguonHV && nguonHV.GVCN_THEO_LOP && Object.keys(nguonHV.GVCN_THEO_LOP).length > 0)
    );

    let daCoTenGV = !buocTaiLai && (
        Object.keys(cacheHoTenGiaoVienTHSS).length > 0
        || (cacheNguonTongHopSiSo && cacheNguonTongHopSiSo.hoTenGvMap && Object.keys(cacheNguonTongHopSiSo.hoTenGvMap).length > 0)
        || (nguonHV && nguonHV.TU_DIEN_HO_TEN_GV && Object.keys(nguonHV.TU_DIEN_HO_TEN_GV).length > 0)
    );

    let tasks = [];
    if (!daCoTenGV) {
        let urlGV = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucGV`;
        tasks.push(
            (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlGV, {}, 2, 30000) : fetch(urlGV))
                .then(r => r.json())
                .then(rowsGV => {
                    if (Array.isArray(rowsGV) && rowsGV.length > 1) {
                        cacheHoTenGiaoVienTHSS = {};
                        for (let i = 1; i < rowsGV.length; i++) {
                            let maGV = String(rowsGV[i][0] || '').trim();
                            let hoTen = String(rowsGV[i][1] || '').trim();
                            if (maGV && hoTen) {
                                cacheHoTenGiaoVienTHSS[chuanHoaKhoaGvTHSS(maGV)] = hoTen;
                                cacheHoTenGiaoVienTHSS[maGV.toLowerCase().normalize('NFC')] = hoTen;
                            }
                        }
                        if (nguonHV) {
                            nguonHV.TU_DIEN_HO_TEN_GV = { ...(nguonHV.TU_DIEN_HO_TEN_GV || {}), ...cacheHoTenGiaoVienTHSS };
                        }
                    }
                }).catch(() => {})
        );
    }
    if (!daCoGvcn) {
        let urlLop = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucLop`;
        tasks.push(
            (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlLop, {}, 2, 30000) : fetch(urlLop))
                .then(r => r.json())
                .then(rowsLop => {
                    if (Array.isArray(rowsLop) && rowsLop.length > 1) {
                        cacheGvcnLopTHSS = {};
                        for (let i = 1; i < rowsLop.length; i++) {
                            let mLop = String(rowsLop[i][0] || '').trim().toUpperCase();
                            let gvcn = String(rowsLop[i][2] || '').trim();
                            if (mLop) cacheGvcnLopTHSS[mLop] = gvcn;
                        }
                        if (nguonHV) {
                            nguonHV.GVCN_THEO_LOP = { ...(nguonHV.GVCN_THEO_LOP || {}), ...cacheGvcnLopTHSS };
                        }
                        if (cacheNguonTongHopSiSo) {
                            cacheNguonTongHopSiSo.gvcnMap = { ...(cacheNguonTongHopSiSo.gvcnMap || {}), ...cacheGvcnLopTHSS };
                        }
                    }
                }).catch(() => {})
        );
    }
    if (tasks.length > 0) await Promise.all(tasks);
}

function layHoTenGvcnTongHopSS(maLop) {
    let lopUp = String(maLop || '').trim().toUpperCase();
    if (!lopUp) return '';

    let maGvcn = '';
    let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
        ? window.thongSoHocVu
        : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);
    if (nguonHV && nguonHV.GVCN_THEO_LOP) {
        if (nguonHV.GVCN_THEO_LOP[lopUp] !== undefined) maGvcn = String(nguonHV.GVCN_THEO_LOP[lopUp] || '').trim();
        else {
            let kMatch = Object.keys(nguonHV.GVCN_THEO_LOP).find(k => String(k).trim().toUpperCase() === lopUp);
            if (kMatch) maGvcn = String(nguonHV.GVCN_THEO_LOP[kMatch] || '').trim();
        }
    }
    if (!maGvcn && cacheGvcnLopTHSS[lopUp]) {
        maGvcn = String(cacheGvcnLopTHSS[lopUp]).trim();
    }
    if (!maGvcn && cacheNguonTongHopSiSo && cacheNguonTongHopSiSo.gvcnMap) {
        if (cacheNguonTongHopSiSo.gvcnMap[lopUp]) maGvcn = String(cacheNguonTongHopSiSo.gvcnMap[lopUp]).trim();
        else {
            let kMatch = Object.keys(cacheNguonTongHopSiSo.gvcnMap).find(k => String(k).trim().toUpperCase() === lopUp);
            if (kMatch) maGvcn = String(cacheNguonTongHopSiSo.gvcnMap[kMatch] || '').trim();
        }
    }
    if (!maGvcn && typeof tuDienGvcnTheoLopToanCuc !== 'undefined' && tuDienGvcnTheoLopToanCuc && tuDienGvcnTheoLopToanCuc[lopUp]) {
        maGvcn = String(tuDienGvcnTheoLopToanCuc[lopUp]).trim();
    }
    if (!maGvcn) return '';

    let khoaChuan = chuanHoaKhoaGvTHSS(maGvcn);
    let khoaNfc = maGvcn.toLowerCase().normalize('NFC');

    if (cacheHoTenGiaoVienTHSS[khoaChuan]) return cacheHoTenGiaoVienTHSS[khoaChuan];
    if (cacheHoTenGiaoVienTHSS[khoaNfc]) return cacheHoTenGiaoVienTHSS[khoaNfc];

    if (cacheNguonTongHopSiSo && cacheNguonTongHopSiSo.hoTenGvMap) {
        if (cacheNguonTongHopSiSo.hoTenGvMap[khoaChuan]) return cacheNguonTongHopSiSo.hoTenGvMap[khoaChuan];
        if (cacheNguonTongHopSiSo.hoTenGvMap[khoaNfc]) return cacheNguonTongHopSiSo.hoTenGvMap[khoaNfc];
    }
    if (nguonHV && nguonHV.TU_DIEN_HO_TEN_GV) {
        if (nguonHV.TU_DIEN_HO_TEN_GV[khoaChuan]) return nguonHV.TU_DIEN_HO_TEN_GV[khoaChuan];
        if (nguonHV.TU_DIEN_HO_TEN_GV[khoaNfc]) return nguonHV.TU_DIEN_HO_TEN_GV[khoaNfc];
    }
    if (typeof window.layHoTenDayDuGiaoVienSDB === 'function') {
        let hoTenSDB = window.layHoTenDayDuGiaoVienSDB(maGvcn);
        if (hoTenSDB && hoTenSDB.toLowerCase() !== maGvcn.toLowerCase()) return hoTenSDB;
    }
    return maGvcn;
}

// 3. Thuật toán lõi: Hỗ trợ Theo Tuần & Từ ngày - Đến ngày + tính % mọi cấp độ
window.tinhToanTongHopSiSoTuan = function(op) {
    let { nhMacDinh, rows, ddMap } = layNguonHopNhatTHSS();
    let namHocLoc = op.namHoc || nhMacDinh;
    let cheDoLoc = op.cheDoLoc || 'TUAN';
    let tuanSo = parseInt(op.tuanSo, 10) || 0;
    let dtTu = op.tuNgay ? parseNgayVNToDateTHSS(op.tuNgay) : null;
    let dtDen = op.denNgay ? parseNgayVNToDateTHSS(op.denNgay) : null;
    if (dtTu) dtTu.setHours(0, 0, 0, 0);
    if (dtDen) dtDen.setHours(23, 59, 59, 999);

    let dsLop = layDanhSachLopTongHopSS(namHocLoc).filter(lop => {
        if (op.lopLoc !== 'ALL' && lop !== op.lopLoc) return false;
        if (op.khoiLoc !== 'ALL') {
            let m = lop.match(/^\d+/) || lop.match(/\d+/);
            let k = m ? m[0] : '';
            if (k !== op.khoiLoc) return false;
        }
        return true;
    });

    let mapNgayTuanThu = xayDungBanDoNgayToanTuanTHSS(rows);

    let indexSlotPhamVi = {};
    let tapTuanTrongPhamVi = new Set();
    let tapNgayHopLeTrongKhoang = new Set();
    let mapNgayTheoThu = {};
    let coThu7 = false, coChuNhat = false;

    const quetNguonDong = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(d => {
            let nhDong = d['Năm học'] || xacDinhNamHocTuNgayTHSS(d['Ngày']) || nhMacDinh;
            if (namHocLoc && nhDong && nhDong !== namHocLoc) return;

            let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            if (t <= 0) return;

            let rawThu = String(d['Thứ'] || '').trim().toLowerCase();
            let thu = rawThu ? (rawThu.charAt(0).toUpperCase() + rawThu.slice(1)) : '';
            if (!thu) return;

            let ngay = String(d['Ngày'] || '').trim();
            if (!ngay || ngay === '...') ngay = mapNgayTuanThu[`${t}_${thu}`] || '';

            if (cheDoLoc === 'TUAN') {
                if (t !== tuanSo) return;
            } else {
                let dtDong = parseNgayVNToDateTHSS(ngay);
                if (!dtDong) return;
                if (dtTu && dtDong < dtTu) return;
                if (dtDen && dtDong > dtDen) return;
                tapNgayHopLeTrongKhoang.add(`${t}_${thu}`);
            }

            if (thu === 'Thứ 7') coThu7 = true;
            if (thu === 'Chủ nhật') coChuNhat = true;
            if (cheDoLoc === 'TUAN' && ngay && !mapNgayTheoThu[thu]) {
                mapNgayTheoThu[thu] = ngay;
            }

            let lop = String(d['Mã Lớp'] || '').trim().toUpperCase();
            let buoi = String(d['Buổi'] || '').trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(d['Tiết'] || '').trim();
            if (lop && tiet) {
                tapTuanTrongPhamVi.add(t);
                let kSlot = `${t}_${lop}_${thu}_${buoi}_${tiet}`;
                if (!indexSlotPhamVi[kSlot]) {
                    indexSlotPhamVi[kSlot] = { d, ngay, thu, t };
                }
            }
        });
    };

    quetNguonDong(rows);
    if (typeof duLieuTKBGopDaMap !== 'undefined') quetNguonDong(duLieuTKBGopDaMap);

    // Đảm bảo mọi bản ghi trong ddMap (DIEM_DANH_SDB) luôn được đối chiếu ngày chính xác
    if (ddMap && (!namHocLoc || namHocLoc === nhMacDinh)) {
        Object.keys(ddMap).forEach(kDD => {
            let parts = kDD.split('_');
            if (parts.length < 5) return;
            let tDD = parseInt(String(parts[0]).replace(/\D/g, ''), 10) || 0;
            let thuDD = parts[2];
            if (tDD <= 0 || !thuDD) return;
            let ngayDD = mapNgayTuanThu[`${tDD}_${thuDD}`] || '';
            if (cheDoLoc === 'TUAN') {
                if (tDD !== tuanSo) return;
                if (ngayDD && !mapNgayTheoThu[thuDD]) mapNgayTheoThu[thuDD] = ngayDD;
                tapTuanTrongPhamVi.add(tDD);
            } else {
                let dtDD = parseNgayVNToDateTHSS(ngayDD);
                if (dtDD && (!dtTu || dtDD >= dtTu) && (!dtDen || dtDD <= dtDen)) {
                    tapTuanTrongPhamVi.add(tDD);
                    tapNgayHopLeTrongKhoang.add(`${tDD}_${thuDD}`);
                }
            }
            if (thuDD === 'Thứ 7') coThu7 = true;
            if (thuDD === 'Chủ nhật') coChuNhat = true;
        });
    }

    if (cheDoLoc === 'TUAN' && tuanSo > 0) {
        tapTuanTrongPhamVi.add(tuanSo);
        ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].forEach(thu => {
            if (!mapNgayTheoThu[thu] && mapNgayTuanThu[`${tuanSo}_${thu}`]) {
                mapNgayTheoThu[thu] = mapNgayTuanThu[`${tuanSo}_${thu}`];
            }
        });
    }

    let dsTuanXet = Array.from(tapTuanTrongPhamVi).sort((a, b) => a - b);

    const dsThuChuan = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];
    let dsThuHienThi = [...dsThuChuan];
    if (coThu7) dsThuHienThi.push('Thứ 7');
    if (coChuNhat) dsThuHienThi.push('Chủ nhật');

    let ketQuaTheoLop = [];
    let mapHocSinhNghi = {};
    let tongSiSoToanPhamVi = 0;
    let tongLuotCoTheToanTruong = 0;
    let tongLuotVangP = 0;
    let tongLuotVangKP = 0;
    let tuKhoaNorm = String(op.tuKhoaHS || '').trim().toLowerCase().normalize('NFC');

    // Tổng hợp toàn trường theo từng cột Thứ (dùng cho dòng Tổng cộng cuối bảng)
    let tongTruongTheoThu = {};
    dsThuHienThi.forEach(thu => {
        tongTruongTheoThu[thu] = { tongSiSo: 0, coMat: 0, vangP: 0, vangKP: 0 };
    });

    dsLop.forEach(maLop => {
        let siSoChuan = laySiSoChuanTongHopSS(maLop);
        let gvcn = layHoTenGvcnTongHopSS(maLop);
        let ngayData = {};
        let tongPLop = 0;
        let tongKPLop = 0;
        let tongLuotCoTheLop = 0;
        let soNgayCoDuLieuLop = 0;
        let mapHsLop = {};

        dsTuanXet.forEach(tXet => {
            dsThuHienThi.forEach(thu => {
                if (cheDoLoc === 'KHOANG_NGAY' && !tapNgayHopLeTrongKhoang.has(`${tXet}_${thu}`)) {
                    return;
                }

                let cacBanGhiTrongNgay = [];
                let ngayCuaDong = mapNgayTuanThu[`${tXet}_${thu}`] || '';

                for (let buoi of ['sáng', 'chiều']) {
                    let maxTiet = buoi === 'sáng' ? 5 : 4;
                    for (let tiet = 1; tiet <= maxTiet; tiet++) {
                        let khoaSlot = `${tXet}_${maLop}_${thu}_${buoi}_${tiet}`;
                        let slotInfo = indexSlotPhamVi[khoaSlot] || null;
                        if (slotInfo && slotInfo.ngay && !ngayCuaDong) ngayCuaDong = slotInfo.ngay;
                        let dongMap = slotInfo ? slotInfo.d : null;
                        let ct = (ddMap && (!namHocLoc || namHocLoc === nhMacDinh) && ddMap[khoaSlot]) ? ddMap[khoaSlot] : null;
                        if (!ct && dongMap && dongMap.ChiTietChuyenCan) ct = dongMap.ChiTietChuyenCan;
                        let chuoiCC = dongMap ? String(dongMap['ChuyenCan_Thuc'] || '').trim() : '';

                        if (ct && (parseInt(ct.tongSiSo, 10) || 0) > 0) {
                            cacBanGhiTrongNgay.push({ buoi, tiet, ct, chuoiCC });
                        } else if (chuoiCC !== '') {
                            cacBanGhiTrongNgay.push({ buoi, tiet, ct: null, chuoiCC });
                        }
                    }
                }

                if (cacBanGhiTrongNgay.length === 0) {
                    if (cheDoLoc === 'TUAN' && !ngayData[thu]) ngayData[thu] = { daDiemDanh: false };
                    return;
                }

                let maxTongNgay = siSoChuan;
                let minCoMatNgay = null;
                let mapTenP = new Map();
                let mapTenKP = new Map();
                let maxSoKhongTenP = 0;
                let maxSoKhongTenKP = 0;
                let buoiTietKhongTenP = [];
                let buoiTietKhongTenKP = [];
                let chuoiFallback = '';

                cacBanGhiTrongNgay.forEach(item => {
                    let nhanBuoiTiet = `${item.buoi === 'sáng' ? 'S' : 'C'}-T${item.tiet}`;
                    if (item.ct) {
                        let tong = parseInt(item.ct.tongSiSo, 10) || 0;
                        if (tong > maxTongNgay) maxTongNgay = tong;
                        let coMat = parseInt(item.ct.coMat, 10);
                        if (!isNaN(coMat)) minCoMatNgay = (minCoMatNgay === null) ? coMat : Math.min(minCoMatNgay, coMat);

                        let dsP = Array.isArray(item.ct.dsVangCoPhep) ? item.ct.dsVangCoPhep.filter(Boolean) : [];
                        let dsKP = Array.isArray(item.ct.dsVangKhongPhep) ? item.ct.dsVangKhongPhep.filter(Boolean) : [];
                        let soP = parseInt(item.ct.vangCoPhep, 10) || 0;
                        let soKP = parseInt(item.ct.vangKhongPhep, 10) || 0;

                        if (dsP.length > 0) {
                            dsP.forEach(ten => {
                                let k = ten.trim().toLowerCase().normalize('NFC');
                                if (!mapTenP.has(k)) mapTenP.set(k, { ten: ten.trim(), buoiTiet: [] });
                                mapTenP.get(k).buoiTiet.push(nhanBuoiTiet);
                            });
                        } else if (soP > 0) {
                            if (soP > maxSoKhongTenP) maxSoKhongTenP = soP;
                            buoiTietKhongTenP.push(nhanBuoiTiet);
                        }

                        if (dsKP.length > 0) {
                            dsKP.forEach(ten => {
                                let k = ten.trim().toLowerCase().normalize('NFC');
                                if (!mapTenKP.has(k)) mapTenKP.set(k, { ten: ten.trim(), buoiTiet: [] });
                                mapTenKP.get(k).buoiTiet.push(nhanBuoiTiet);
                            });
                        } else if (soKP > 0) {
                            if (soKP > maxSoKhongTenKP) maxSoKhongTenKP = soKP;
                            buoiTietKhongTenKP.push(nhanBuoiTiet);
                        }
                    } else if (item.chuoiCC) {
                        chuoiFallback = item.chuoiCC;
                    }
                });

                if (mapTenP.size === 0 && maxSoKhongTenP > 0) {
                    for (let idxP = 1; idxP <= maxSoKhongTenP; idxP++) {
                        let tenTamP = maxSoKhongTenP === 1 ? 'Chưa ghi tên HS' : `Chưa ghi tên HS #${idxP}`;
                        let kTamP = `${tenTamP.toLowerCase()}_p_${tXet}_${thu}`;
                        mapTenP.set(kTamP, { ten: tenTamP, buoiTiet: [...buoiTietKhongTenP] });
                    }
                }
                if (mapTenKP.size === 0 && maxSoKhongTenKP > 0) {
                    for (let idxKP = 1; idxKP <= maxSoKhongTenKP; idxKP++) {
                        let tenTamKP = maxSoKhongTenKP === 1 ? 'Chưa ghi tên HS (KP)' : `Chưa ghi tên HS (KP) #${idxKP}`;
                        let kTamKP = `${tenTamKP.toLowerCase()}_kp_${tXet}_${thu}`;
                        mapTenKP.set(kTamKP, { ten: tenTamKP, buoiTiet: [...buoiTietKhongTenKP] });
                    }
                }

                if (siSoChuan === 0 && maxTongNgay > 0) siSoChuan = maxTongNgay;

                let soVangPNgay = mapTenP.size > 0 ? mapTenP.size : maxSoKhongTenP;
                let soVangKPNgay = mapTenKP.size > 0 ? mapTenKP.size : maxSoKhongTenKP;
                let coMatHienThi = (maxTongNgay > 0)
                    ? Math.max(0, maxTongNgay - soVangPNgay - soVangKPNgay)
                    : (minCoMatNgay !== null ? minCoMatNgay : 0);

                tongPLop += soVangPNgay;
                tongKPLop += soVangKPNgay;
                tongLuotVangP += soVangPNgay;
                tongLuotVangKP += soVangKPNgay;

                if (maxTongNgay > 0) {
                    soNgayCoDuLieuLop++;
                    tongLuotCoTheLop += maxTongNgay;
                    if (cheDoLoc === 'TUAN') {
                        tongTruongTheoThu[thu].tongSiSo += maxTongNgay;
                        tongTruongTheoThu[thu].coMat += coMatHienThi;
                        tongTruongTheoThu[thu].vangP += soVangPNgay;
                        tongTruongTheoThu[thu].vangKP += soVangKPNgay;
                    }
                }

                let khoaNgayDuyNhat = `${tXet}_${thu}`;
                const ghiHs = (mapTen, loaiVang) => {
                    mapTen.forEach((info, kTen) => {
                        let keyGlobal = `${maLop}||${kTen}`;
                        if (!mapHocSinhNghi[keyGlobal]) {
                            mapHocSinhNghi[keyGlobal] = { ten: info.ten, lop: maLop, ngayMap: new Map() };
                        }
                        let existingDay = mapHocSinhNghi[keyGlobal].ngayMap.get(khoaNgayDuyNhat);
                        if (!existingDay) {
                            mapHocSinhNghi[keyGlobal].ngayMap.set(khoaNgayDuyNhat, {
                                tuan: tXet, thu: thu, ngay: ngayCuaDong, loai: loaiVang, buoiTiet: [...info.buoiTiet]
                            });
                        } else {
                            if (loaiVang === 'KP') existingDay.loai = 'KP';
                            existingDay.buoiTiet.push(...info.buoiTiet);
                        }

                        if (!mapHsLop[kTen]) mapHsLop[kTen] = { ten: info.ten, pDays: new Set(), kpDays: new Set() };
                        if (loaiVang === 'P') mapHsLop[kTen].pDays.add(khoaNgayDuyNhat);
                        else mapHsLop[kTen].kpDays.add(khoaNgayDuyNhat);
                    });
                };
                ghiHs(mapTenP, 'P');
                ghiHs(mapTenKP, 'KP');

                if (cheDoLoc === 'TUAN') {
                    ngayData[thu] = {
                        daDiemDanh: true,
                        tong: maxTongNgay,
                        coMat: coMatHienThi,
                        vangP: soVangPNgay,
                        vangKP: soVangKPNgay,
                        tyLeNgay: maxTongNgay > 0 ? tinhPhanTramTHSS(coMatHienThi, maxTongNgay) : '100.0',
                        dsTenP: Array.from(mapTenP.values()).map(x => x.ten),
                        dsTenKP: Array.from(mapTenKP.values()).map(x => x.ten),
                        chuoiFallback: chuoiFallback
                    };
                }
            });
        });

        if (siSoChuan > 0) tongSiSoToanPhamVi += siSoChuan;

        // Nếu lớp có sĩ số chuẩn nhưng chưa điểm danh ngày nào, vẫn tính mẫu số chuẩn để tỷ lệ toàn trường phản ánh đúng
        let soNgayKhoang = (cheDoLoc === 'KHOANG_NGAY') ? Math.max(1, tapNgayHopLeTrongKhoang.size) : Math.max(1, soNgayCoDuLieuLop);
        let mauSoTyLeLop = tongLuotCoTheLop > 0 ? tongLuotCoTheLop : (siSoChuan * soNgayKhoang);
        let tyLeLop = mauSoTyLeLop > 0
            ? tinhPhanTramTHSS(Math.max(0, mauSoTyLeLop - tongPLop - tongKPLop), mauSoTyLeLop)
            : '100.0';

        if (cheDoLoc === 'KHOANG_NGAY') {
            tongLuotCoTheToanTruong += (siSoChuan * Math.max(1, tapNgayHopLeTrongKhoang.size));
        } else {
            tongLuotCoTheToanTruong += tongLuotCoTheLop;
        }

        let tomTatHsLop = Object.values(mapHsLop).map(h => {
            let parts = [];
            if (h.pDays.size > 0) parts.push(`${h.pDays.size}P`);
            if (h.kpDays.size > 0) parts.push(`${h.kpDays.size}KP`);
            return `${h.ten} (${parts.join(', ')})`;
        });

        ketQuaTheoLop.push({
            maLop: maLop,
            siSoChuan: siSoChuan,
            gvcn: gvcn,
            ngayData: ngayData,
            tongP: tongPLop,
            tongKP: tongKPLop,
            tyLeCC: tyLeLop,
            coVang: (tongPLop > 0 || tongKPLop > 0),
            tomTatHsLop: tomTatHsLop
        });
    });

    let dsHocSinhNghi = Object.values(mapHocSinhNghi).map(item => {
        let chiTietNgay = Array.from(item.ngayMap.values());
        let soP = chiTietNgay.filter(d => d.loai === 'P').length;
        let soKP = chiTietNgay.filter(d => d.loai === 'KP').length;
        return {
            ten: item.ten,
            lop: item.lop,
            soNgayNghi: chiTietNgay.length,
            soP: soP,
            soKP: soKP,
            chiTietNgay: chiTietNgay
        };
    }).filter(hs => {
        if (!tuKhoaNorm) return true;
        return hs.ten.toLowerCase().normalize('NFC').includes(tuKhoaNorm) || hs.lop.toLowerCase().includes(tuKhoaNorm);
    }).sort((a, b) => b.soNgayNghi - a.soNgayNghi || a.lop.localeCompare(b.lop, undefined, { numeric: true }));

    let mauSoToanTruong = tongLuotCoTheToanTruong > 0 ? tongLuotCoTheToanTruong : tongSiSoToanPhamVi;
    let coMatToanTruong = Math.max(0, mauSoToanTruong - tongLuotVangP - tongLuotVangKP);
    let tyLeChuyenCan = mauSoToanTruong > 0 ? tinhPhanTramTHSS(coMatToanTruong, mauSoToanTruong) : '100.0';
    let tyLeVangP = mauSoToanTruong > 0 ? tinhPhanTramTHSS(tongLuotVangP, mauSoToanTruong) : '0.0';
    let tyLeVangKP = mauSoToanTruong > 0 ? tinhPhanTramTHSS(tongLuotVangKP, mauSoToanTruong) : '0.0';

    dsThuHienThi.forEach(thu => {
        let obj = tongTruongTheoThu[thu];
        obj.tyLe = obj.tongSiSo > 0 ? tinhPhanTramTHSS(obj.coMat, obj.tongSiSo) : '';
    });

    return {
        namHoc: namHocLoc,
        cheDoLoc: cheDoLoc,
        tuanSo: tuanSo,
        tuNgay: op.tuNgay || '',
        denNgay: op.denNgay || '',
        dsThu: dsThuHienThi,
        mapNgayTheoThu: mapNgayTheoThu,
        ketQuaTheoLop: ketQuaTheoLop,
        tongTruongTheoThu: tongTruongTheoThu,
        dsHocSinhNghi: dsHocSinhNghi,
        tongKet: {
            soLop: ketQuaTheoLop.length,
            tongSiSo: tongSiSoToanPhamVi,
            mauSoToanTruong: mauSoToanTruong,
            coMatToanTruong: coMatToanTruong,
            tongVangP: tongLuotVangP,
            tongVangKP: tongLuotVangKP,
            tyLeVangP: tyLeVangP,
            tyLeVangKP: tyLeVangKP,
            tongVang: tongLuotVangP + tongLuotVangKP,
            tyLeChuyenCan: tyLeChuyenCan
        }
    };
};

// 4. Kết xuất giao diện Tổng hợp Sĩ số
window.veGiaoDienTongHopSiSo = function(containerId = 'vungHienThiTongHopSiSo') {
    let container = document.getElementById(containerId);
    if (!container) return;

    let dsNamHoc = layDanhSachNamHocTHSS();
    if (!trangThaiTongHopSiSo.namHocChon || !dsNamHoc.includes(trangThaiTongHopSiSo.namHocChon)) {
        trangThaiTongHopSiSo.namHocChon = dsNamHoc[0] || layNamHocMacDinhTHSS();
    }
    let namHocChon = trangThaiTongHopSiSo.namHocChon;

    let dsTuanInfo = layDanhSachTuanVaNgayTheoNamHocTHSS(namHocChon);
    let dsTuanSo = dsTuanInfo.map(x => x.tuan);
    if (!trangThaiTongHopSiSo.tuanChon || !dsTuanSo.includes(Number(trangThaiTongHopSiSo.tuanChon))) {
        let tuanHeThong = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu && window.thongSoHocVu.TUAN_HIEN_TAI)
            ? parseInt(window.thongSoHocVu.TUAN_HIEN_TAI, 10)
            : (dsTuanSo[0] || 0);
        trangThaiTongHopSiSo.tuanChon = dsTuanSo.includes(tuanHeThong) ? tuanHeThong : (dsTuanSo[0] || 0);
    }

    let tuanSo = parseInt(trangThaiTongHopSiSo.tuanChon, 10) || 0;
    if (!trangThaiTongHopSiSo.tuNgay || !trangThaiTongHopSiSo.denNgay) {
        let infoTuanChon = dsTuanInfo.find(x => x.tuan === tuanSo) || dsTuanInfo[0];
        if (infoTuanChon && infoTuanChon.minDate) {
            trangThaiTongHopSiSo.tuNgay = formatDateToIsoTHSS(infoTuanChon.minDate);
            trangThaiTongHopSiSo.denNgay = formatDateToIsoTHSS(infoTuanChon.maxDate || infoTuanChon.minDate);
        }
    }

    let dsTatCaLop = layDanhSachLopTongHopSS(namHocChon);
    let tapKhoi = new Set();
    dsTatCaLop.forEach(l => {
        let m = l.match(/^\d+/) || l.match(/\d+/);
        if (m) tapKhoi.add(m[0]);
    });
    let dsKhoi = Array.from(tapKhoi).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    let htmlBoLoc = `
        <div class="bg-white border border-slate-200 rounded-lg p-3 mb-4 shadow-sm flex flex-col gap-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2.5">
                <div class="flex flex-wrap items-center gap-2.5">
                    <div class="flex items-center gap-1.5">
                        <label class="text-xs font-bold text-slate-700">Năm học:</label>
                        <select onchange="trangThaiTongHopSiSo.namHocChon=this.value; trangThaiTongHopSiSo.tuanChon=''; trangThaiTongHopSiSo.tuNgay=''; trangThaiTongHopSiSo.denNgay=''; veGiaoDienTongHopSiSo('${containerId}')" class="px-2.5 py-1.5 text-xs font-extrabold text-blue-900 border border-blue-300 rounded bg-blue-50 outline-none cursor-pointer">
                            ${dsNamHoc.map(nh => `<option value="${nh}" ${nh === namHocChon ? 'selected' : ''}>${nh}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <label class="text-xs font-bold text-slate-700">Lọc theo:</label>
                        <select onchange="trangThaiTongHopSiSo.cheDoLoc=this.value; veGiaoDienTongHopSiSo('${containerId}')" class="px-2.5 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded bg-white outline-none cursor-pointer">
                            <option value="TUAN" ${trangThaiTongHopSiSo.cheDoLoc === 'TUAN' ? 'selected' : ''}>Theo Tuần học</option>
                            <option value="KHOANG_NGAY" ${trangThaiTongHopSiSo.cheDoLoc === 'KHOANG_NGAY' ? 'selected' : ''}>Từ ngày - Đến ngày</option>
                        </select>
                    </div>
                    ${trangThaiTongHopSiSo.cheDoLoc === 'TUAN' ? `
                        <div class="flex items-center gap-1.5">
                            <label class="text-xs font-bold text-slate-700">Tuần:</label>
                            <select onchange="trangThaiTongHopSiSo.tuanChon=this.value; veGiaoDienTongHopSiSo('${containerId}')" class="px-2.5 py-1.5 text-xs font-extrabold text-blue-900 border border-blue-300 rounded bg-blue-50 outline-none cursor-pointer">
                                ${dsTuanInfo.length === 0 ? `<option value="">Chưa có dữ liệu</option>` : dsTuanInfo.map(info => {
                                    let nhanNgay = (info.minDate && info.maxDate) ? ` (${formatDateToVNTHSS(info.minDate)} - ${formatDateToVNTHSS(info.maxDate)})` : '';
                                    return `<option value="${info.tuan}" ${info.tuan === tuanSo ? 'selected' : ''}>Tuần ${info.tuan}${nhanNgay}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    ` : `
                        <div class="flex items-center gap-1.5">
                            <label class="text-xs font-bold text-slate-700">Từ ngày:</label>
                            <input type="date" value="${trangThaiTongHopSiSo.tuNgay}" onchange="trangThaiTongHopSiSo.tuNgay=this.value; veGiaoDienTongHopSiSo('${containerId}')" class="px-2 py-1 text-xs font-bold text-blue-900 border border-blue-300 rounded bg-blue-50 outline-none">
                            <label class="text-xs font-bold text-slate-700 ml-1">Đến ngày:</label>
                            <input type="date" value="${trangThaiTongHopSiSo.denNgay}" onchange="trangThaiTongHopSiSo.denNgay=this.value; veGiaoDienTongHopSiSo('${containerId}')" class="px-2 py-1 text-xs font-bold text-blue-900 border border-blue-300 rounded bg-blue-50 outline-none">
                        </div>
                    `}
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="khoiTaoTongHopSiSo('${containerId}', true)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 text-xs rounded border border-slate-300 cursor-pointer">🔄 Tải lại</button>
                    <button type="button" id="btnCopyNhacNhoZaloTHSS" onclick="copyNhacNhoChuyenCanZaloTHSS()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 text-xs rounded shadow cursor-pointer" title="Copy danh sách lớp và GVCN chưa báo chuyên cần để gửi Zalo">📋 Copy nhắc Zalo</button>
                    <button type="button" onclick="xuatExcelTongHopSiSo()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 text-xs rounded shadow cursor-pointer">📥 Xuất Excel</button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                <div class="flex items-center gap-1.5">
                    <label class="text-xs font-bold text-slate-700">Khối:</label>
                    <select onchange="trangThaiTongHopSiSo.khoiChon=this.value; trangThaiTongHopSiSo.lopChon='ALL'; veGiaoDienTongHopSiSo('${containerId}')" class="px-2.5 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded bg-white outline-none cursor-pointer">
                        <option value="ALL" ${trangThaiTongHopSiSo.khoiChon === 'ALL' ? 'selected' : ''}>Tất cả khối</option>
                        ${dsKhoi.map(k => `<option value="${k}" ${trangThaiTongHopSiSo.khoiChon === k ? 'selected' : ''}>Khối ${k}</option>`).join('')}
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    <label class="text-xs font-bold text-slate-700">Lớp:</label>
                    <select onchange="trangThaiTongHopSiSo.lopChon=this.value; veGiaoDienTongHopSiSo('${containerId}')" class="px-2.5 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded bg-white outline-none cursor-pointer">
                        <option value="ALL" ${trangThaiTongHopSiSo.lopChon === 'ALL' ? 'selected' : ''}>Tất cả lớp</option>
                        ${dsTatCaLop.map(l => `<option value="${l}" ${trangThaiTongHopSiSo.lopChon === l ? 'selected' : ''}>Lớp ${l}</option>`).join('')}
                    </select>
                </div>
                <div class="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-[300px]">
                    <input type="text" value="${trangThaiTongHopSiSo.tuKhoaHS.replace(/"/g, '&quot;')}" oninput="trangThaiTongHopSiSo.tuKhoaHS=this.value; veGiaoDienTongHopSiSo('${containerId}')" placeholder="Tìm nhanh tên học sinh nghỉ..." class="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded outline-none focus:border-blue-500">
                </div>
                <label class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 cursor-pointer select-none bg-rose-50 px-2.5 py-1.5 rounded border border-rose-200">
                    <input type="checkbox" ${trangThaiTongHopSiSo.chiHienCoVang ? 'checked' : ''} onchange="trangThaiTongHopSiSo.chiHienCoVang=this.checked; veGiaoDienTongHopSiSo('${containerId}')" class="accent-rose-600">
                    <span>Chỉ hiện lớp có HS nghỉ</span>
                </label>
            </div>
        </div>
    `;

    if (trangThaiTongHopSiSo.cheDoLoc === 'TUAN' && tuanSo === 0) {
        container.innerHTML = htmlBoLoc + `<div class="text-center py-12 text-slate-500 font-bold bg-slate-50 border border-slate-200 rounded-lg">Năm học ${namHocChon} chưa có dữ liệu tuần học trong DATA_TKB / Sổ đầu bài.</div>`;
        return;
    }

    let kq = window.tinhToanTongHopSiSoTuan({
        namHoc: namHocChon,
        cheDoLoc: trangThaiTongHopSiSo.cheDoLoc,
        tuanSo: tuanSo,
        tuNgay: trangThaiTongHopSiSo.tuNgay,
        denNgay: trangThaiTongHopSiSo.denNgay,
        khoiLoc: trangThaiTongHopSiSo.khoiChon,
        lopLoc: trangThaiTongHopSiSo.lopChon,
        tuKhoaHS: trangThaiTongHopSiSo.tuKhoaHS
    });
    trangThaiTongHopSiSo.ketQuaHienTai = kq;

    let dsLopHienThi = trangThaiTongHopSiSo.chiHienCoVang
        ? kq.ketQuaTheoLop.filter(x => x.coVang)
        : kq.ketQuaTheoLop;

    let htmlKPI = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div class="text-xs font-bold text-blue-800 uppercase">Tổng sĩ số (${kq.tongKet.soLop} lớp)</div>
                <div class="text-2xl font-black text-blue-900 mt-1">${kq.tongKet.tongSiSo} <span class="text-xs font-semibold">học sinh</span></div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div class="text-xs font-bold text-amber-800 uppercase">Lượt nghỉ có phép (P)</div>
                <div class="text-2xl font-black text-amber-700 mt-1">${kq.tongKet.tongVangP} <span class="text-xs font-semibold">(${kq.tongKet.tyLeVangP}%)</span></div>
            </div>
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <div class="text-xs font-bold text-rose-800 uppercase">Lượt nghỉ không phép (KP)</div>
                <div class="text-2xl font-black text-rose-700 mt-1">${kq.tongKet.tongVangKP} <span class="text-xs font-semibold">(${kq.tongKet.tyLeVangKP}%)</span></div>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div class="text-xs font-bold text-emerald-800 uppercase">Tỷ lệ chuyên cần toàn phạm vi</div>
                <div class="text-2xl font-black text-emerald-700 mt-1">${kq.tongKet.tyLeChuyenCan}%</div>
                <div class="text-[11px] font-semibold text-emerald-800 mt-0.5">${kq.tongKet.coMatToanTruong}/${kq.tongKet.mauSoToanTruong} lượt</div>
            </div>
        </div>
    `;

    let nhanThoiGian = (kq.cheDoLoc === 'TUAN')
        ? `Năm học ${namHocChon} — Tuần ${tuanSo}`
        : `Năm học ${namHocChon} — Từ ${formatDateToVNTHSS(parseNgayVNToDateTHSS(kq.tuNgay))} đến ${formatDateToVNTHSS(parseNgayVNToDateTHSS(kq.denNgay))}`;

    let htmlBangMaTran = `
        <div class="bg-white border border-slate-300 rounded-lg shadow-sm overflow-x-auto mb-6">
            <div class="px-4 py-2.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
                <span class="font-extrabold text-sm text-slate-800 uppercase">Bảng tổng hợp sĩ số — ${nhanThoiGian}</span>
                <span class="text-xs text-slate-500 italic">Tự động gom trùng tên học sinh nghỉ trong cùng một ngày</span>
            </div>
            <table class="w-full min-w-[820px] border-collapse text-xs">
                <thead class="bg-slate-50 text-slate-800 font-bold text-center">
                    <tr>
                        <th class="border border-slate-300 p-2 w-10">STT</th>
                        <th class="border border-slate-300 p-2 min-w-[140px]">LỚP (SĨ SỐ)</th>
                        ${kq.cheDoLoc === 'TUAN' ? kq.dsThu.map(thu => {
                            let ngay = kq.mapNgayTheoThu[thu] || '';
                            return `<th class="border border-slate-300 p-2 min-w-[130px]">${thu}${ngay ? `<br><span class="font-normal text-[11px] text-slate-500">${ngay}</span>` : ''}</th>`;
                        }).join('') : `<th class="border border-slate-300 p-2 w-28">VẮNG CÓ PHÉP</th><th class="border border-slate-300 p-2 w-28">VẮNG KHÔNG PHÉP</th>`}
                        <th class="border border-slate-300 p-2 min-w-[210px]">TỔNG HỢP &amp; TỶ LỆ (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${dsLopHienThi.length === 0 ? `<tr><td colspan="${kq.cheDoLoc === 'TUAN' ? kq.dsThu.length + 3 : 5}" class="text-center py-8 text-slate-500 italic font-semibold">Không có dữ liệu phù hợp với bộ lọc.</td></tr>` : dsLopHienThi.map((row, idx) => `
                        <tr class="hover:bg-slate-50">
                            <td class="border border-slate-300 p-2 text-center font-bold text-slate-500">${idx + 1}</td>
                            <td class="border border-slate-300 p-2 text-center font-extrabold text-blue-900">${row.maLop}<br><span class="text-[11px] font-semibold text-slate-500">(${row.siSoChuan || '--'} HS)</span>${row.gvcn ? `<br><span class="text-[11px] font-semibold text-slate-700">${row.gvcn}</span>` : ''}</td>
                            ${kq.cheDoLoc === 'TUAN' ? kq.dsThu.map(thu => {
                                let cell = row.ngayData[thu];
                                if (!cell || !cell.daDiemDanh) return `<td class="border border-slate-300 p-2 text-center text-slate-400">--</td>`;
                                if (cell.chuoiFallback && cell.tong === 0) return `<td class="border border-slate-300 p-2 text-center font-bold text-slate-700">${cell.chuoiFallback}</td>`;
                                if (cell.vangP === 0 && cell.vangKP === 0) {
                                    return `<td class="border border-slate-300 p-2 text-center bg-emerald-50/40"><span class="font-bold text-emerald-700">${cell.coMat}/${cell.tong}</span><span class="block text-[10.5px] font-semibold text-emerald-600">100%</span></td>`;
                                }
                                let dsTenHtml = [];
                                if (cell.dsTenP.length > 0) dsTenHtml.push(`<span class="text-amber-800"><b>P:</b> ${cell.dsTenP.join(', ')}</span>`);
                                if (cell.dsTenKP.length > 0) dsTenHtml.push(`<span class="text-rose-700"><b>KP:</b> ${cell.dsTenKP.join(', ')}</span>`);
                                return `<td class="border border-slate-300 p-1.5 text-center bg-rose-50/40 align-top">
                                    <div class="font-extrabold text-rose-700">${cell.coMat}/${cell.tong} <span class="text-[10.5px]">(${cell.tyLeNgay}%)</span></div>
                                    <div class="text-[10px] font-semibold text-slate-600">P:${cell.vangP}, KP:${cell.vangKP}</div>
                                    ${dsTenHtml.length > 0 ? `<div class="text-[11px] text-left mt-1 leading-snug">${dsTenHtml.join('<br>')}</div>` : ''}
                                </td>`;
                            }).join('') : `
                                <td class="border border-slate-300 p-2 text-center font-bold text-amber-800">${row.tongP}</td>
                                <td class="border border-slate-300 p-2 text-center font-bold text-rose-700">${row.tongKP}</td>
                            `}
                            <td class="border border-slate-300 p-2 text-left align-top">
                                <div class="font-bold ${row.coVang ? 'text-rose-700' : 'text-emerald-700'}">
                                    ${row.coVang ? `CC: ${row.tyLeCC}% (Nghỉ: ${row.tongP}P, ${row.tongKP}KP)` : 'Chuyên cần: 100%'}
                                </div>
                                ${row.tomTatHsLop.length > 0 ? `<div class="text-[11px] text-slate-700 mt-1 leading-snug">${row.tomTatHsLop.join('; ')}</div>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="bg-blue-50 font-extrabold text-blue-950">
                    <tr>
                        <td class="border border-slate-300 p-2 text-center" colspan="2">TOÀN TRƯỜNG<br><span class="text-[11px] font-bold">(${kq.tongKet.tongSiSo} HS)</span></td>
                        ${kq.cheDoLoc === 'TUAN' ? kq.dsThu.map(thu => {
                            let tt = kq.tongTruongTheoThu[thu];
                            if (!tt || tt.tongSiSo === 0) return `<td class="border border-slate-300 p-2 text-center text-slate-400">--</td>`;
                            return `<td class="border border-slate-300 p-2 text-center">
                                <div>${tt.coMat}/${tt.tongSiSo} <span class="text-emerald-700">(${tt.tyLe}%)</span></div>
                                <div class="text-[10.5px] font-semibold text-rose-700">P:${tt.vangP}, KP:${tt.vangKP}</div>
                            </td>`;
                        }).join('') : `
                            <td class="border border-slate-300 p-2 text-center text-amber-800">${kq.tongKet.tongVangP} (${kq.tongKet.tyLeVangP}%)</td>
                            <td class="border border-slate-300 p-2 text-center text-rose-700">${kq.tongKet.tongVangKP} (${kq.tongKet.tyLeVangKP}%)</td>
                        `}
                        <td class="border border-slate-300 p-2 text-left">
                            <div class="text-emerald-800">Tỷ lệ CC chung: ${kq.tongKet.tyLeChuyenCan}%</div>
                            <div class="text-[11px] font-semibold text-slate-700">Tổng vắng: ${kq.tongKet.tongVangP}P, ${kq.tongKet.tongVangKP}KP</div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    let htmlBangHocSinh = `
        <div class="bg-white border border-slate-300 rounded-lg shadow-sm overflow-x-auto">
            <div class="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                <span class="font-extrabold text-sm text-rose-900 uppercase">Danh sách học sinh nghỉ học — ${nhanThoiGian} (${kq.dsHocSinhNghi.length} em)</span>
            </div>
            <table class="w-full border-collapse text-xs">
                <thead class="bg-slate-50 text-slate-800 font-bold text-center">
                    <tr>
                        <th class="border border-slate-300 p-2 w-12">STT</th>
                        <th class="border border-slate-300 p-2 w-48 text-left">HỌ VÀ TÊN HỌC SINH</th>
                        <th class="border border-slate-300 p-2 w-20">LỚP</th>
                        <th class="border border-slate-300 p-2 w-24">SỐ NGÀY NGHỈ</th>
                        <th class="border border-slate-300 p-2 w-24">CÓ PHÉP / KP</th>
                        <th class="border border-slate-300 p-2 text-left">CHI TIẾT CÁC NGÀY NGHỈ</th>
                    </tr>
                </thead>
                <tbody>
                    ${kq.dsHocSinhNghi.length === 0 ? `<tr><td colspan="6" class="text-center py-6 text-emerald-700 font-bold italic">Không ghi nhận học sinh nào nghỉ học trong phạm vi lọc.</td></tr>` : kq.dsHocSinhNghi.map((hs, idx) => {
                        let chiTietTxt = hs.chiTietNgay.map(n => {
                            let bt = Array.from(new Set(n.buoiTiet)).join(', ');
                            let tag = n.loai === 'KP'
                                ? `<span class="text-rose-700 font-bold">[KP]</span>`
                                : `<span class="text-amber-800 font-bold">[P]</span>`;
                            return `T${n.tuan} - ${n.thu}${n.ngay ? ' (' + n.ngay + ')' : ''} ${tag} <span class="text-slate-500">(${bt})</span>`;
                        }).join(' • ');
                        return `<tr class="hover:bg-slate-50">
                            <td class="border border-slate-300 p-2 text-center font-bold text-slate-500">${idx + 1}</td>
                            <td class="border border-slate-300 p-2 font-bold text-slate-900">${hs.ten}</td>
                            <td class="border border-slate-300 p-2 text-center font-extrabold text-blue-900">${hs.lop}</td>
                            <td class="border border-slate-300 p-2 text-center font-extrabold text-rose-700">${hs.soNgayNghi}</td>
                            <td class="border border-slate-300 p-2 text-center font-semibold">${hs.soP}P / ${hs.soKP}KP</td>
                            <td class="border border-slate-300 p-2 leading-relaxed">${chiTietTxt}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = htmlBoLoc + htmlKPI + htmlBangMaTran + htmlBangHocSinh;
};

// 5. Xuất Excel Tổng hợp Sĩ số (kèm đầy đủ tỷ lệ % theo Lớp/Ngày, Lớp/Kỳ và Toàn trường)
window.xuatExcelTongHopSiSo = async function() {
    let kq = trangThaiTongHopSiSo.ketQuaHienTai;
    if (!kq) return alert("Chưa có dữ liệu tổng hợp để xuất!");

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
        let tenFile = (kq.cheDoLoc === 'TUAN') ? `TongHopSiSo_Tuan${kq.tuanSo}.xlsx` : `TongHopSiSo_${kq.tuNgay}_${kq.denNgay}.xlsx`;

        const ws1 = workbook.addWorksheet(`TongHop_SiSo`);
        let headers1 = ['STT', 'Lớp', 'Sĩ số chuẩn'];
        if (kq.cheDoLoc === 'TUAN') {
            kq.dsThu.forEach(thu => {
                let ngay = kq.mapNgayTheoThu[thu] || '';
                headers1.push(ngay ? `${thu}\n(${ngay})` : thu);
            });
        }
        headers1.push('Vắng P', 'Vắng KP', 'Tỷ lệ CC (%)', 'Học sinh nghỉ');

        let rTitle1 = ws1.addRow([`TỔNG HỢP SĨ SỐ HỌC SINH - NĂM HỌC ${kq.namHoc} ${kq.cheDoLoc === 'TUAN' ? '- TUẦN ' + kq.tuanSo : ''}`]);
        rTitle1.font = { name: 'Times New Roman', size: 14, bold: true };
        ws1.mergeCells(1, 1, 1, headers1.length);
        rTitle1.alignment = { horizontal: 'center', vertical: 'middle' };

        let rHead1 = ws1.addRow(headers1);
        rHead1.font = { name: 'Times New Roman', size: 12, bold: true };
        rHead1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        rHead1.eachCell(c => {
            c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        });

        kq.ketQuaTheoLop.forEach((row, idx) => {
            let lopExcel = row.gvcn ? `${row.maLop}\n(${row.gvcn})` : row.maLop;
            let arr = [idx + 1, lopExcel, row.siSoChuan || ''];
            if (kq.cheDoLoc === 'TUAN') {
                kq.dsThu.forEach(thu => {
                    let cell = row.ngayData[thu];
                    if (!cell || !cell.daDiemDanh) arr.push('--');
                    else if (cell.chuoiFallback && cell.tong === 0) arr.push(cell.chuoiFallback);
                    else if (cell.vangP === 0 && cell.vangKP === 0) arr.push(`${cell.coMat}/${cell.tong} (100%)`);
                    else {
                        let txt = `${cell.coMat}/${cell.tong} (${cell.tyLeNgay}%)\nP:${cell.vangP}, KP:${cell.vangKP}`;
                        if (cell.dsTenP.length > 0) txt += `\nP: ${cell.dsTenP.join(', ')}`;
                        if (cell.dsTenKP.length > 0) txt += `\nKP: ${cell.dsTenKP.join(', ')}`;
                        arr.push(txt);
                    }
                });
            }
            arr.push(row.tongP, row.tongKP, `${row.tyLeCC}%`, row.tomTatHsLop.join('; '));
            let r = ws1.addRow(arr);
            r.font = { name: 'Times New Roman', size: 12 };
            r.eachCell({ includeEmpty: true }, (c, colIdx) => {
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                c.alignment = { vertical: 'middle', horizontal: colIdx === headers1.length ? 'left' : 'center', wrapText: true };
                c.numFmt = '@';
            });
        });

        // Dòng Tổng cộng toàn trường
        let rowTotalArr = ['', 'TOÀN TRƯỜNG', kq.tongKet.tongSiSo];
        if (kq.cheDoLoc === 'TUAN') {
            kq.dsThu.forEach(thu => {
                let tt = kq.tongTruongTheoThu[thu];
                rowTotalArr.push((tt && tt.tongSiSo > 0) ? `${tt.coMat}/${tt.tongSiSo} (${tt.tyLe}%)\nP:${tt.vangP}, KP:${tt.vangKP}` : '--');
            });
        }
        rowTotalArr.push(kq.tongKet.tongVangP, kq.tongKet.tongVangKP, `${kq.tongKet.tyLeChuyenCan}%`, `Tổng vắng: ${kq.tongKet.tongVangP}P, ${kq.tongKet.tongVangKP}KP`);
        let rTotal = ws1.addRow(rowTotalArr);
        rTotal.font = { name: 'Times New Roman', size: 12, bold: true };
        rTotal.eachCell({ includeEmpty: true }, (c, colIdx) => {
            c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            c.alignment = { vertical: 'middle', horizontal: colIdx === headers1.length ? 'left' : 'center', wrapText: true };
            c.numFmt = '@';
        });

        ws1.getColumn(1).width = 6;
        ws1.getColumn(2).width = 24;
        ws1.getColumn(3).width = 12;
        if (kq.cheDoLoc === 'TUAN') {
            for (let i = 4; i <= 3 + kq.dsThu.length; i++) ws1.getColumn(i).width = 22;
        }
        ws1.getColumn(headers1.length - 3).width = 11;
        ws1.getColumn(headers1.length - 2).width = 11;
        ws1.getColumn(headers1.length - 1).width = 14;
        ws1.getColumn(headers1.length).width = 32;

        // Sheet 2: Danh sách học sinh nghỉ
        const ws2 = workbook.addWorksheet(`DS_HocSinh_Nghi`);
        let rTitle2 = ws2.addRow([`DANH SÁCH HỌC SINH NGHỈ HỌC - NĂM HỌC ${kq.namHoc}`]);
        rTitle2.font = { name: 'Times New Roman', size: 14, bold: true };
        ws2.mergeCells('A1:F1');
        rTitle2.alignment = { horizontal: 'center', vertical: 'middle' };

        let rHead2 = ws2.addRow(['STT', 'Họ và tên HS', 'Lớp', 'Số ngày nghỉ', 'Có phép / KP', 'Chi tiết các ngày nghỉ']);
        rHead2.font = { name: 'Times New Roman', size: 12, bold: true };
        rHead2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        rHead2.eachCell(c => {
            c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        });

        kq.dsHocSinhNghi.forEach((hs, idx) => {
            let chiTietStr = hs.chiTietNgay.map(n => {
                let bt = Array.from(new Set(n.buoiTiet)).join(', ');
                return `T${n.tuan} - ${n.thu}${n.ngay ? ' (' + n.ngay + ')' : ''} [${n.loai}] (${bt})`;
            }).join(' | ');
            let r = ws2.addRow([idx + 1, hs.ten, hs.lop, hs.soNgayNghi, `${hs.soP}P / ${hs.soKP}KP`, chiTietStr]);
            r.font = { name: 'Times New Roman', size: 12 };
            r.eachCell({ includeEmpty: true }, (c, colIdx) => {
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                c.alignment = { vertical: 'middle', horizontal: [1, 3, 4, 5].includes(colIdx) ? 'center' : 'left', wrapText: true };
            });
        });

        [6, 26, 10, 14, 15, 48].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = tenFile;
        link.click();
    } catch (loi) {
        alert("Lỗi khi xuất Excel tổng hợp sĩ số: " + loi.message);
    }
};

// 6. Copy danh sách lớp & GVCN chưa báo chuyên cần gửi Zalo
window.copyNhacNhoChuyenCanZaloTHSS = async function() {
    let kq = trangThaiTongHopSiSo.ketQuaHienTai;
    if (!kq || !Array.isArray(kq.ketQuaTheoLop) || kq.ketQuaTheoLop.length === 0) {
        return alert("⚠️ Chưa có dữ liệu tổng hợp để tạo danh sách nhắc nhở.");
    }

    let homNay = new Date();
    let mocHomNay = new Date(homNay.getFullYear(), homNay.getMonth(), homNay.getDate());
    let dsChuaBao = [];

    if (kq.cheDoLoc === 'TUAN') {
        let dsThuXet = (kq.dsThu || []).filter(thu => {
            let ngayStr = (kq.mapNgayTheoThu && kq.mapNgayTheoThu[thu]) ? kq.mapNgayTheoThu[thu] : '';
            if (!ngayStr) return true;
            let dt = parseNgayVNToDateTHSS(ngayStr);
            if (!dt) return true;
            return dt.getTime() <= mocHomNay.getTime();
        });

        kq.ketQuaTheoLop.forEach(lop => {
            let ngayThieu = [];
            dsThuXet.forEach(thu => {
                let cell = lop.ngayData ? lop.ngayData[thu] : null;
                if (!cell || !cell.daDiemDanh) {
                    let ngayStr = (kq.mapNgayTheoThu && kq.mapNgayTheoThu[thu]) ? kq.mapNgayTheoThu[thu] : '';
                    ngayThieu.push(ngayStr ? `${thu} (${ngayStr})` : thu);
                }
            });
            if (ngayThieu.length > 0) {
                let tenGv = lop.gvcn || layHoTenGvcnTongHopSS(lop.maLop) || 'Chưa gán GVCN';
                dsChuaBao.push({ maLop: lop.maLop, gvcn: tenGv, ngayThieu: ngayThieu });
            }
        });
    } else {
        let dTu = parseNgayVNToDateTHSS(kq.tuNgay);
        let dDen = parseNgayVNToDateTHSS(kq.denNgay);
        let dsNgayKhoang = [];
        if (dTu && dDen) {
            let cur = new Date(dTu.getFullYear(), dTu.getMonth(), dTu.getDate());
            let end = new Date(Math.min(dDen.getTime(), mocHomNay.getTime()));
            const tenThuArr = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            while (cur.getTime() <= end.getTime()) {
                let dayIdx = cur.getDay();
                if (dayIdx >= 1 && dayIdx <= 5) {
                    dsNgayKhoang.push({ thu: tenThuArr[dayIdx], ngay: formatDateToVNTHSS(cur) });
                }
                cur.setDate(cur.getDate() + 1);
            }
        }
        let nguon = layNguonHopNhatTHSS();
        let mapNgayTuan = xayDungBanDoNgayToanTuanTHSS(nguon.rows);
        let tapCoDiemDanh = new Set();
        Object.keys(nguon.ddMap || {}).forEach(kDD => {
            let parts = kDD.split('_');
            if (parts.length < 3) return;
            let tDD = parseInt(parts[0], 10) || 0;
            let lDD = String(parts[1] || '').trim().toUpperCase();
            let thuDD = parts[2];
            let ng = mapNgayTuan[`${tDD}_${thuDD}`] || '';
            if (lDD && ng) tapCoDiemDanh.add(`${lDD}_${ng}`);
        });
        kq.ketQuaTheoLop.forEach(lop => {
            let ngayThieu = dsNgayKhoang.filter(d => !tapCoDiemDanh.has(`${lop.maLop}_${d.ngay}`)).map(d => `${d.thu} (${d.ngay})`);
            if (ngayThieu.length > 0) {
                let tenGv = lop.gvcn || layHoTenGvcnTongHopSS(lop.maLop) || 'Chưa gán GVCN';
                dsChuaBao.push({ maLop: lop.maLop, gvcn: tenGv, ngayThieu: ngayThieu });
            }
        });
    }

    if (dsChuaBao.length === 0) {
        return alert("🎉 Tất cả các lớp trong phạm vi đang xem đã báo cáo chuyên cần đầy đủ!");
    }

    let tieuDe = kq.cheDoLoc === 'TUAN'
        ? `📢 NHẮC NHỞ BÁO CÁO CHUYÊN CẦN — TUẦN ${kq.tuanSo} (${kq.namHoc})`
        : `📢 NHẮC NHỞ BÁO CÁO CHUYÊN CẦN (${formatDateToVNTHSS(parseNgayVNToDateTHSS(kq.tuNgay))} - ${formatDateToVNTHSS(parseNgayVNToDateTHSS(kq.denNgay))})`;

    let dongNoiDung = dsChuaBao.map((item, idx) =>
        `${idx + 1}. Lớp ${item.maLop} (GVCN: ${item.gvcn}): ${item.ngayThieu.join(', ')}`
    );
    let vanBanZalo = `${tieuDe}\nCác lớp chưa cập nhật chuyên cần:\n${dongNoiDung.join('\n')}\nKính đề nghị các đồng chí bổ sung đầy đủ trên Sổ đầu bài điện tử. Xin cảm ơn!`;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(vanBanZalo);
        } else {
            throw new Error('Clipboard API unavailable');
        }
    } catch (e) {
        let ta = document.createElement('textarea');
        ta.value = vanBanZalo;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    let btn = document.getElementById('btnCopyNhacNhoZaloTHSS');
    if (btn) {
        let oldHtml = btn.innerHTML;
        btn.innerHTML = `✅ Đã copy (${dsChuaBao.length} lớp)`;
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-emerald-600');
        setTimeout(() => {
            btn.innerHTML = oldHtml;
            btn.classList.remove('bg-emerald-600');
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2500);
    }
};
