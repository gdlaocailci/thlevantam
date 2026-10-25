let duLieuKhoaSoToanCuc = {}; // Lưu map { 1: { daKhoa: true, nguoiThucHien: '...', thoiGian: '...' } }
window.kiemTraTuanDaKhoa = function(tuan) {
    if (!tuan) return false;
    let t = parseInt(String(tuan).replace(/\D/g, ''), 10);
    return !!(duLieuKhoaSoToanCuc[t] && duLieuKhoaSoToanCuc[t].daKhoa);
};

// =========================================================================
// [QUAN TRỌNG]: HÀM CHUẨN HÓA ĐỒNG NHẤT DẤU TIẾNG VIỆT (PHỤC HỒI LẠI)
// =========================================================================
window.chuanHoaDinhDanhGiaoVien = function(tenGV) {
    if (!tenGV) return '';
    let tenChuan = String(tenGV).trim().toLowerCase().normalize('NFC');
    const tuDienDau = {
        'òa': 'oà', 'óa': 'oá', 'ỏa': 'oả', 'õa': 'oã', 'ọa': 'oạ',
        'òe': 'oè', 'óe': 'oé', 'ỏe': 'oẻ', 'õe': 'oẽ', 'ọe': 'oẹ',
        'ùy': 'uỳ', 'úy': 'uý', 'ủy': 'uỷ', 'ũy': 'uỹ', 'ụy': 'uỵ'
    };
    for (let [kieuCu, kieuMoi] of Object.entries(tuDienDau)) {
        tenChuan = tenChuan.replace(new RegExp(kieuCu, 'g'), kieuMoi);
    }
    return tenChuan;
};
// =========================================================================
// KHỐI 1: KIỂM SOÁT ĐĂNG NHẬP VÀ BỘ MÁY TỊNH TIẾN SỔ ĐẦU BÀI
// =========================================================================
let daTaiDuLieuSoDauBai = false;
let dangTaiDuLieuSoDauBai = false;
let duLieuTKBGopDaMap = [];
let tuDienPPCTToanCuc = {}; 
let dinhMucKhungCT = {}; 
let tuDienQuyenPhanCong = {};
let coToanQuyenSDB = false;
let maGvDangNhapHeThong = '';
let danhSachGiaoVienToanCuc = []; // [NÂNG CẤP]: Mảng lưu danh sách giáo viên toàn cục
let mapTkbToanTapToanCuc = {}; // [NÂNG CẤP]: Mảng lưu TKB toàn tập để đối chiếu sự khác biệt
let tuDienGvcnTheoLopToanCuc = {}; // [NÂNG CẤP]: Map Mã Lớp -> Mã GVCN (từ cột C sheet DM_LOP)
let tuDienHoTenGVToanCuc = {}; // [NÂNG CẤP]: Map Mã GV chuẩn hóa -> Họ Tên đầy đủ (từ cột B sheet DM_GIAOVIEN)
let quyenKhoaSdbServer = false; // [NÂNG CẤP]: Quyền khóa Sổ đầu bài (BGH) từ ma trận phân quyền máy chủ
let namHocHeThongSDB = ''; // Lưu năm học hiện tại từ máy chủ để đồng nhất khóa lưu trữ
window.duLieuTongHopSDB = {}; // [NÂNG CẤP]: Bộ nhớ cục bộ lưu nhận xét & chữ ký GVCN, BGH theo { "tuan_LOP": { nxGVCN, kyGVCN, nxBGH, kyBGH, daLuu } }
let boNhoTamTongHopVuaLuu = {}; // Bảo vệ dữ liệu nhận xét vừa lưu khỏi bị ghi đè bởi tiến trình đồng bộ ngầm

// Các biến toàn cục hỗ trợ kiểm soát trạng thái chưa lưu (Chống mất dữ liệu)
let tuanTruocDo_SDB = '';
let lopTruocDo_SDB = '';
let coThayDoiChuaLuu_SDB = false;
let dinhDanhDaNapSDB = null; // Lưu lại tài khoản đã nạp SĐB để tự động ánh xạ quyền ngay khi đăng nhập / đăng xuất
let chiMucTuanLopSDB = {}; // Chỉ mục O(1) tra cứu nhanh danh sách tiết theo "tuanSo_LOP"
let chiMucLopSDB = {}; // Chỉ mục O(1) tra cứu nhanh danh sách tiết theo "LOP"
let tapTuanChuaLuuTheoLopSDB = {}; // Chỉ mục O(1) kiểm tra nhanh các tuần có môn nhưng chưa lưu của từng lớp

// Hàm xây dựng chỉ mục O(1) giúp mở Sổ đầu bài, chuyển Tuần/Lớp và mở danh sách Tuần trong < 1ms
window.xayDungChiMucNhanhSDB = function() {
    chiMucTuanLopSDB = {};
    chiMucLopSDB = {};
    tapTuanChuaLuuTheoLopSDB = {};

    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2, "tối": 3 };
    let thongKeLuuTuanLop = {};

    for (let i = 0; i < duLieuTKBGopDaMap.length; i++) {
        let d = duLieuTKBGopDaMap[i];
        let t = d._tuanSo !== undefined ? d._tuanSo : (parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0);
        let l = d._lopUpper !== undefined ? d._lopUpper : String(d['Mã Lớp'] || '').trim().toUpperCase();
        let thuRaw = String(d['Thứ'] || '').trim().toLowerCase();
        let thuChuan = thuRaw ? (thuRaw.charAt(0).toUpperCase() + thuRaw.slice(1)) : '';
        let buoiChuan = String(d['Buổi'] || '').trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
        let tietSo = d._tietSo !== undefined ? d._tietSo : (parseInt(String(d['Tiết'] || '').replace(/\D/g, ''), 10) || 0);

        d._tuanSo = t;
        d._lopUpper = l;
        d._thuChuan = thuChuan;
        d._buoiChuan = buoiChuan;
        d._thuOrder = thuTuThu[thuChuan] || 99;
        d._buoiOrder = thuTuBuoi[buoiChuan] || 99;
        d._tietSo = tietSo;

        if (!t || !l) continue;
        let kTL = `${t}_${l}`;
        if (!chiMucTuanLopSDB[kTL]) chiMucTuanLopSDB[kTL] = [];
        chiMucTuanLopSDB[kTL].push(d);

        if (!chiMucLopSDB[l]) chiMucLopSDB[l] = [];
        chiMucLopSDB[l].push(d);

        let mon = String(d['Môn Học'] || '').trim();
        if (mon !== '') {
            if (!thongKeLuuTuanLop[kTL]) thongKeLuuTuanLop[kTL] = { t: t, l: l, coMon: 0, daLuu: 0 };
            thongKeLuuTuanLop[kTL].coMon++;
            if (d.DaLuu === true) thongKeLuuTuanLop[kTL].daLuu++;
        }
    }

    Object.keys(chiMucTuanLopSDB).forEach(kTL => {
        chiMucTuanLopSDB[kTL].sort((a, b) => {
            if (a._thuOrder !== b._thuOrder) return a._thuOrder - b._thuOrder;
            if (a._buoiOrder !== b._buoiOrder) return a._buoiOrder - b._buoiOrder;
            return a._tietSo - b._tietSo;
        });
    });

    Object.values(thongKeLuuTuanLop).forEach(tk => {
        if (tk.coMon > 0 && tk.daLuu === 0) {
            if (!tapTuanChuaLuuTheoLopSDB[tk.l]) tapTuanChuaLuuTheoLopSDB[tk.l] = new Set();
            tapTuanChuaLuuTheoLopSDB[tk.l].add(tk.t);
        }
    });
};

window.layDsTietTheoTuanLopSDB = function(tuanSo, lopUpper) {
    let kTL = `${tuanSo}_${lopUpper}`;
    if (chiMucTuanLopSDB && chiMucTuanLopSDB[kTL]) {
        return chiMucTuanLopSDB[kTL];
    }
    return duLieuTKBGopDaMap.filter(d =>
        (d._tuanSo || parseInt(String(d['Tuần']).replace(/\D/g, ''), 10)) === tuanSo &&
        (d._lopUpper || String(d['Mã Lớp']).trim().toUpperCase()) === lopUpper
    );
};

window.timTuanTruocChuaLuuSDB = function(tuanMucTieu, lopUpper) {
    if (!tuanMucTieu || tuanMucTieu <= 1 || !lopUpper) return 0;
    let tapChuaLuu = tapTuanChuaLuuTheoLopSDB && tapTuanChuaLuuTheoLopSDB[lopUpper];
    if (tapChuaLuu) {
        for (let w = 1; w < tuanMucTieu; w++) {
            if (tapChuaLuu.has(w)) return w;
        }
        return 0;
    }
    for (let w = 1; w < tuanMucTieu; w++) {
        let dsTietTuanW = window.layDsTietTheoTuanLopSDB(w, lopUpper).filter(d => String(d['Môn Học'] || '').trim() !== '');
        if (dsTietTuanW.length > 0 && dsTietTuanW.filter(d => d.DaLuu === true).length === 0) {
            return w;
        }
    }
    return 0;
};

let danhSachTatCaGiaoVienTruong = []; // Lưu danh sách toàn bộ GV toàn trường để tái sử dụng khi Admin đăng nhập mà không cần tải lại
let tuDienEmailSangGiaoVienSDB = {}; // Lưu map Email -> { maGV, tenGV } đã có để đối chiếu tức thì
let boNhoQuyenTaiKhoanDaXacThuc = {}; // Lưu kết quả đối chiếu quyền theo từng tài khoản đã xác thực để không tải lại
let dangDoiChieuQuyenNgamSDB = false;

// Hàm kế thừa dữ liệu đã có sẵn từ trang chính (window.thongSoHocVu) sang Sổ đầu bài mà không cần tải lại
window.keThuaDuLieuDaCoTuHeThong = function() {
    let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
        ? window.thongSoHocVu
        : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);
    if (!nguonHV) return;

    if (!namHocHeThongSDB && nguonHV.NAM_HOC) {
        namHocHeThongSDB = String(nguonHV.NAM_HOC).trim();
    }

    // 1. Kế thừa GVCN_THEO_LOP nếu đã có
    if (nguonHV.GVCN_THEO_LOP && typeof nguonHV.GVCN_THEO_LOP === 'object') {
        Object.keys(nguonHV.GVCN_THEO_LOP).forEach(kLop => {
            let lopUp = String(kLop).trim().toUpperCase();
            if (lopUp && !tuDienGvcnTheoLopToanCuc[lopUp]) {
                tuDienGvcnTheoLopToanCuc[lopUp] = String(nguonHV.GVCN_THEO_LOP[kLop] || '').trim();
            }
        });
    }

    // 2. Kế thừa TU_DIEN_HO_TEN_GV nếu đã có
    if (nguonHV.TU_DIEN_HO_TEN_GV && typeof nguonHV.TU_DIEN_HO_TEN_GV === 'object') {
        Object.keys(nguonHV.TU_DIEN_HO_TEN_GV).forEach(kMa => {
            let maNorm = window.chuanHoaDinhDanhGiaoVien(kMa);
            let hoTenDayDu = String(nguonHV.TU_DIEN_HO_TEN_GV[kMa] || '').trim();
            if (maNorm && hoTenDayDu) {
                if (!tuDienHoTenGVToanCuc[maNorm]) tuDienHoTenGVToanCuc[maNorm] = hoTenDayDu;
                let tenNorm = window.chuanHoaDinhDanhGiaoVien(hoTenDayDu);
                if (tenNorm && !tuDienHoTenGVToanCuc[tenNorm]) tuDienHoTenGVToanCuc[tenNorm] = hoTenDayDu;
            }
        });
    }

    // 3. Kế thừa KHUNG_CHUONG_TRINH nếu chưa có trong SĐB
    if (Object.keys(dinhMucKhungCT).length === 0 && nguonHV.KHUNG_CHUONG_TRINH && typeof nguonHV.KHUNG_CHUONG_TRINH === 'object' && !Array.isArray(nguonHV.KHUNG_CHUONG_TRINH)) {
        Object.keys(nguonHV.KHUNG_CHUONG_TRINH).forEach(tenKhoi => {
            let mKhoi = String(tenKhoi).match(/\d+/);
            if (mKhoi) {
                let khoi = mKhoi[0];
                if (!dinhMucKhungCT[khoi]) dinhMucKhungCT[khoi] = {};
                let mapMon = nguonHV.KHUNG_CHUONG_TRINH[tenKhoi] || {};
                Object.keys(mapMon).forEach(mon => {
                    let tiet = parseInt(mapMon[mon], 10) || 0;
                    if (tiet > 0) dinhMucKhungCT[khoi][String(mon).trim().toLowerCase()] = tiet;
                });
            }
        });
    }
};

// Hàm tự tính toán phân công theo lớp từ dữ liệu TKB đã có sẵn trong bộ nhớ RAM (không cần tải lại TKB từ Server)
window.tinhPhanCongTuTkbDaCoSDB = function(maDinhDanh) {
    let ketQuaPhanCong = {};
    if (!maDinhDanh) return ketQuaPhanCong;
    let maDinhDanhLC = window.chuanHoaDinhDanhGiaoVien(maDinhDanh);
    if (!maDinhDanhLC) return ketQuaPhanCong;

    let nguonQuet = Object.keys(mapTkbToanTapToanCuc).length > 0
        ? Object.values(mapTkbToanTapToanCuc)
        : duLieuTKBGopDaMap;

    for (let i = 0; i < nguonQuet.length; i++) {
        let dong = nguonQuet[i];
        let maLop = String(dong['Mã Lớp'] || '').trim().toUpperCase();
        let gv = window.chuanHoaDinhDanhGiaoVien(dong['Mã GV'] || '');
        let mon = String(dong['Môn Học'] || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (maLop && mon !== '' && gv.indexOf(maDinhDanhLC) !== -1) {
            if (!ketQuaPhanCong[maLop]) ketQuaPhanCong[maLop] = [];
            if (ketQuaPhanCong[maLop].indexOf(mon) === -1) {
                ketQuaPhanCong[maLop].push(mon);
            }
        }
    }
    return ketQuaPhanCong;
};

// Hàm kiểm tra và đối chiếu xác định quyền trực tiếp từ dữ liệu đã có;
// Trả về { daDuThongTinDoiChieu: boolean } để biết có cần tải bổ sung thông tin chưa có hay không
window.anhXaQuyenNhanhKhiDoiTaiKhoan = function(dinhDanhMoi) {
    window.keThuaDuLieuDaCoTuHeThong();
    let tkRaw = String(dinhDanhMoi || '').trim();
    let tkLC = tkRaw.toLowerCase();
    let tkNorm = window.chuanHoaDinhDanhGiaoVien(tkRaw);

    if (!tkRaw) {
        maGvDangNhapHeThong = '';
        coToanQuyenSDB = false;
        quyenKhoaSdbServer = false;
        tuDienQuyenPhanCong = {};
        danhSachGiaoVienToanCuc = [];
        let theChotQuyen = document.getElementById('theChotQuyenSDB');
        if (theChotQuyen) {
            theChotQuyen.setAttribute('data-madinhdanh', '');
            theChotQuyen.setAttribute('data-tendinhdanh', '');
            theChotQuyen.setAttribute('data-quantri', 'false');
            theChotQuyen.setAttribute('data-quyenkhoasdb', 'false');
            theChotQuyen.setAttribute('data-matranquyen', '{}');
        }
        return { daDuThongTinDoiChieu: true };
    }

    // 1. Nếu tài khoản này đã từng được đối chiếu xác thực và lưu trong bộ nhớ phiên -> Dùng lại ngay (0ms)
    if (boNhoQuyenTaiKhoanDaXacThuc[tkLC]) {
        let cachedQ = boNhoQuyenTaiKhoanDaXacThuc[tkLC];
        maGvDangNhapHeThong = cachedQ.maGV || tkRaw;
        let tenGvCached = cachedQ.tenGV || window.layHoTenDayDuGiaoVienSDB(maGvDangNhapHeThong) || maGvDangNhapHeThong;
        coToanQuyenSDB = !!cachedQ.toanQuyen;
        quyenKhoaSdbServer = !!(cachedQ.quyenKhoaSdb || cachedQ.toanQuyen);
        tuDienQuyenPhanCong = (cachedQ.quyenTheoLop && Object.keys(cachedQ.quyenTheoLop).length > 0)
            ? cachedQ.quyenTheoLop
            : window.tinhPhanCongTuTkbDaCoSDB(maGvDangNhapHeThong);

        if (tenGvCached && tenGvCached.trim() !== '') {
            danhSachGiaoVienToanCuc = [tenGvCached.trim()];
        } else if (coToanQuyenSDB && danhSachTatCaGiaoVienTruong.length > 0) {
            danhSachGiaoVienToanCuc = danhSachTatCaGiaoVienTruong;
        }

        let theChotQuyen = document.getElementById('theChotQuyenSDB');
        if (theChotQuyen) {
            theChotQuyen.setAttribute('data-madinhdanh', maGvDangNhapHeThong);
            theChotQuyen.setAttribute('data-tendinhdanh', tenGvCached);
            theChotQuyen.setAttribute('data-quantri', coToanQuyenSDB);
            theChotQuyen.setAttribute('data-quyenkhoasdb', quyenKhoaSdbServer);
            theChotQuyen.setAttribute('data-matranquyen', JSON.stringify(tuDienQuyenPhanCong));
        }
        return { daDuThongTinDoiChieu: true };
    }

    // 2. Đối chiếu xác định Mã GV & Họ tên GV từ dữ liệu danh mục đã có sẵn trong RAM
    let maGvXacDinh = '';
    let tenGvXacDinh = '';
    let daTimThayDanhTinh = false;

    if (tuDienEmailSangGiaoVienSDB[tkLC]) {
        maGvXacDinh = tuDienEmailSangGiaoVienSDB[tkLC].maGV || tkRaw;
        tenGvXacDinh = tuDienEmailSangGiaoVienSDB[tkLC].tenGV || maGvXacDinh;
        daTimThayDanhTinh = true;
    } else if (tuDienHoTenGVToanCuc[tkNorm]) {
        maGvXacDinh = tkRaw;
        tenGvXacDinh = tuDienHoTenGVToanCuc[tkNorm];
        daTimThayDanhTinh = true;
    } else {
        let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
            ? window.thongSoHocVu
            : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);
        if (nguonHV && Array.isArray(nguonHV.DANH_SACH_GIAO_VIEN)) {
            let foundMa = nguonHV.DANH_SACH_GIAO_VIEN.find(m => window.chuanHoaDinhDanhGiaoVien(m) === tkNorm);
            if (foundMa) {
                maGvXacDinh = foundMa;
                tenGvXacDinh = window.layHoTenDayDuGiaoVienSDB(foundMa) || foundMa;
                daTimThayDanhTinh = true;
            }
        }
    }

    if (!maGvXacDinh) {
        maGvXacDinh = tkRaw;
        tenGvXacDinh = window.layHoTenDayDuGiaoVienSDB(tkRaw) || tkRaw;
    }

    // 3. Đối chiếu quyền Admin / Khóa SĐB từ cấu hình đã có sẵn trên trang chính (thongSoHocVu, quyenSuaChua, quyenChiTiet)
    let nguonHV = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu)
        ? window.thongSoHocVu
        : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu) ? thongSoHocVu : null);

    let laAdminClient = !!(
        (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) ||
        (typeof window.quyenSuaChua !== 'undefined' && window.quyenSuaChua)
    );
    if (!laAdminClient && nguonHV && Array.isArray(nguonHV.DANH_SACH_QUAN_TRI)) {
        laAdminClient = nguonHV.DANH_SACH_QUAN_TRI.some(ad => {
            let adLC = String(ad || '').trim().toLowerCase();
            return adLC !== '' && (adLC === tkLC || adLC === maGvXacDinh.toLowerCase());
        });
        if (laAdminClient) daTimThayDanhTinh = true;
    }

    let coNutKhoaClient = !!(
        laAdminClient ||
        (typeof quyenChiTiet !== 'undefined' && quyenChiTiet && Array.isArray(quyenChiTiet.nut) && quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
        (typeof window.quyenChiTiet !== 'undefined' && window.quyenChiTiet && Array.isArray(window.quyenChiTiet.nut) && window.quyenChiTiet.nut.includes('btnKhoaSoDauBai'))
    );
    if (!coNutKhoaClient && nguonHV && nguonHV.MA_TRAN_PHAN_QUYEN) {
        let maTranPQ = nguonHV.MA_TRAN_PHAN_QUYEN;
        Object.keys(maTranPQ).forEach(kPQ => {
            let kLC = String(kPQ || '').trim().toLowerCase();
            if (kLC && (kLC === tkLC || kLC === maGvXacDinh.toLowerCase())) {
                let qObj = maTranPQ[kPQ];
                if (qObj && Array.isArray(qObj.nut) && qObj.nut.includes('btnKhoaSoDauBai')) {
                    coNutKhoaClient = true;
                }
            }
        });
    }

    maGvDangNhapHeThong = maGvXacDinh;
    coToanQuyenSDB = laAdminClient;
    quyenKhoaSdbServer = coNutKhoaClient;
    tuDienQuyenPhanCong = window.tinhPhanCongTuTkbDaCoSDB(maGvDangNhapHeThong);

    if (tenGvXacDinh && tenGvXacDinh.trim() !== '') {
        danhSachGiaoVienToanCuc = [tenGvXacDinh.trim()];
    } else if (coToanQuyenSDB && danhSachTatCaGiaoVienTruong.length > 0) {
        danhSachGiaoVienToanCuc = danhSachTatCaGiaoVienTruong;
    }

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    if (theChotQuyen) {
        theChotQuyen.setAttribute('data-madinhdanh', maGvDangNhapHeThong);
        theChotQuyen.setAttribute('data-tendinhdanh', tenGvXacDinh);
        theChotQuyen.setAttribute('data-quantri', coToanQuyenSDB);
        theChotQuyen.setAttribute('data-quyenkhoasdb', quyenKhoaSdbServer);
        theChotQuyen.setAttribute('data-matranquyen', JSON.stringify(tuDienQuyenPhanCong));
    }

    // Kiểm tra xem thông tin đối chiếu đã có đầy đủ trên Client chưa:
    // Nếu đã nhận diện được danh tính GV (không phải email lạ chưa có trong từ điển) và đã có bảng phân quyền của hệ thống -> Đầy đủ 100%, không cần tải lại!
    let daCoMaTranQuyenHeThong = !!(
        (nguonHV && nguonHV.MA_TRAN_PHAN_QUYEN && Array.isArray(nguonHV.DANH_SACH_QUAN_TRI)) ||
        (typeof window.quyenChiTiet !== 'undefined') ||
        (typeof quyenChiTiet !== 'undefined')
    );
    let laEmailChuaAnhXa = tkRaw.includes('@') && !daTimThayDanhTinh;
    let daDuThongTinDoiChieu = daTimThayDanhTinh && daCoMaTranQuyenHeThong && !laEmailChuaAnhXa;

    if (daDuThongTinDoiChieu) {
        boNhoQuyenTaiKhoanDaXacThuc[tkLC] = {
            maGV: maGvDangNhapHeThong,
            tenGV: tenGvXacDinh,
            toanQuyen: coToanQuyenSDB,
            quyenKhoaSdb: quyenKhoaSdbServer,
            quyenTheoLop: tuDienQuyenPhanCong
        };
    }

    return { daDuThongTinDoiChieu: daDuThongTinDoiChieu };
};

// Hàm chỉ tải bổ sung thông tin đối chiếu tài khoản khi thông tin đó chưa có trong bộ nhớ (không nạp lại TKB/SĐB/PPCT đã có)
async function taiBoSungThongTinDoiChieuChuaCoSDB(dinhDanhCanDoiChieu) {
    if (!dinhDanhCanDoiChieu || dangDoiChieuQuyenNgamSDB) return;
    let tkLC = String(dinhDanhCanDoiChieu).trim().toLowerCase();
    if (boNhoQuyenTaiKhoanDaXacThuc[tkLC]) return;

    dangDoiChieuQuyenNgamSDB = true;
    try {
        let thongSoURL = `thaoTac=layDuLieuSoDauBai&emailTruyCap=${encodeURIComponent(dinhDanhCanDoiChieu)}&taiToanBo=false&chiLayQuyen=true`;
        const phanHoi = await fetchVoiCoCheThuLai(
            `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?${thongSoURL}`,
            {}, 2, 30000
        );
        const duLieuQuyen = await phanHoi.json();
        if (duLieuQuyen && duLieuQuyen.trangThai !== 'loi_he_thong') {
            let maGV = duLieuQuyen.MA_GIAO_VIEN || dinhDanhCanDoiChieu;
            let tenGV = duLieuQuyen.TEN_GIAO_VIEN || window.layHoTenDayDuGiaoVienSDB(maGV) || maGV;
            let toanQuyen = !!duLieuQuyen.TOAN_QUYEN;
            let quyenKhoa = !!(duLieuQuyen.QUYEN_KHOA_SDB || duLieuQuyen.TOAN_QUYEN);
            let quyenLop = duLieuQuyen.QUYEN_THEO_LOP || window.tinhPhanCongTuTkbDaCoSDB(maGV);

            if (maGV && tenGV) {
                tuDienHoTenGVToanCuc[window.chuanHoaDinhDanhGiaoVien(maGV)] = tenGV;
                tuDienEmailSangGiaoVienSDB[tkLC] = { maGV: maGV, tenGV: tenGV };
            }

            boNhoQuyenTaiKhoanDaXacThuc[tkLC] = {
                maGV: maGV,
                tenGV: tenGV,
                toanQuyen: toanQuyen,
                quyenKhoaSdb: quyenKhoa,
                quyenTheoLop: quyenLop
            };

            // Nếu người dùng vẫn đang ở tài khoản này, chỉ cập nhật đúng thuộc tính quyền vừa đối chiếu mà không nạp lại dữ liệu bảng
            let dinhDanhHienTai = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
                ? String(window.dinhDanhGiaoVienToanCuc).trim()
                : ((typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') ? String(window.emailGiaoVienToanCuc).trim() : '');
            if (dinhDanhHienTai.toLowerCase() === tkLC) {
                window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhHienTai);
                let khungSDB = document.getElementById('khungSoDauBai');
                let elTuan = document.getElementById('chonTuanSo');
                let elLop = document.getElementById('chonLopSo');
                if (khungSDB && !khungSDB.classList.contains('hidden') && elTuan && elTuan.value && elLop && elLop.value && !coThayDoiChuaLuu_SDB) {
                    thucThiKetXuatSoDauBaiLenLuoi();
                }
            }
        }
    } catch (e) {
        // Giữ nguyên quyền đã đối chiếu cục bộ nếu mạng gián đoạn
    } finally {
        dangDoiChieuQuyenNgamSDB = false;
    }
}

window.lamSachBoNhoSoDauBai = function(buocXoaToanBo = false) {
    if (dangTaiDuLieuSoDauBai) return;

    let dinhDanhHienTai = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
        ? String(window.dinhDanhGiaoVienToanCuc).trim()
        : ((typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') ? String(window.emailGiaoVienToanCuc).trim() : '');

    // [TỐI ƯU ĐĂNG NHẬP TỨC THÌ]: Khi đăng nhập/đăng xuất (buocXoaToanBo = false),
    // những dữ liệu gì đã có sẵn (Sổ đầu bài, Thời khóa biểu, PPCT, Khung CT, Từ điển GV/Lớp) thì GIỮ NGUYÊN không tải lại!
    // Chỉ đối chiếu lại quyền của tài khoản mới và tải bổ sung thông tin chưa có (nếu thiếu).
    if (!buocXoaToanBo && duLieuTKBGopDaMap.length > 0) {
        coThayDoiChuaLuu_SDB = false;
        dinhDanhDaNapSDB = dinhDanhHienTai;
        daTaiDuLieuSoDauBai = true;

        let ketQuaDoiChieu = window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhHienTai);

        let khungSDB = document.getElementById('khungSoDauBai');
        let elementTuan = document.getElementById('chonTuanSo');
        let elementLop = document.getElementById('chonLopSo');
        if (khungSDB && !khungSDB.classList.contains('hidden')) {
            if (elementTuan && elementTuan.value && elementLop && elementLop.value) {
                thucThiKetXuatSoDauBaiLenLuoi();
            } else {
                napDropdownSoDauBai();
            }
        }

        // Chỉ tải bổ sung thông tin đối chiếu nếu tài khoản này chưa có đủ thông tin trong bộ nhớ
        if (dinhDanhHienTai !== '' && (!ketQuaDoiChieu || !ketQuaDoiChieu.daDuThongTinDoiChieu)) {
            taiBoSungThongTinDoiChieuChuaCoSDB(dinhDanhHienTai);
        }
        return;
    }

    // Trường hợp chưa có dữ liệu SĐB trong RAM: chỉ đặt lại biến quyền, giữ nguyên Cache tĩnh & Snapshot đã có để nạp nhanh
    daTaiDuLieuSoDauBai = false;
    dinhDanhDaNapSDB = null;
    tuDienQuyenPhanCong = {};
    coToanQuyenSDB = false;
    quyenKhoaSdbServer = false;
    maGvDangNhapHeThong = '';
    coThayDoiChuaLuu_SDB = false;

    if (buocXoaToanBo === true) {
        duLieuTKBGopDaMap = [];
        tuDienPPCTToanCuc = {}; 
        dinhMucKhungCT = {}; 
        danhSachGiaoVienToanCuc = [];
        danhSachTatCaGiaoVienTruong = [];
        mapTkbToanTapToanCuc = {};
        window.mapTkbToanTap = {};
        tuDienGvcnTheoLopToanCuc = {};
        tuDienHoTenGVToanCuc = {};
        tuDienEmailSangGiaoVienSDB = {};
        boNhoQuyenTaiKhoanDaXacThuc = {};
        window.duLieuTongHopSDB = {};
        chiMucTuanLopSDB = {};
        chiMucLopSDB = {};
        tapTuanChuaLuuTheoLopSDB = {};
        let emailGoiLen = typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' ? window.dinhDanhGiaoVienToanCuc : '';
        try { 
            let kStatic = window.layKhoaCachLy(`SDB_DATA_STATIC_${emailGoiLen}`);
            let kShared = window.layKhoaCachLy('SDB_DATA_STATIC_SHARED_V2');
            let kSnap = window.layKhoaCachLy('SDB_SNAPSHOT_FAST_V2');
            sessionStorage.removeItem(kStatic);
            localStorage.removeItem(kStatic);
            sessionStorage.removeItem(kShared);
            localStorage.removeItem(kShared);
            sessionStorage.removeItem(kSnap);
            localStorage.removeItem(kSnap);
        } catch(e) {}
    }

    let khungSDB = document.getElementById('khungSoDauBai');
    if (khungSDB && !khungSDB.classList.contains('hidden')) {
        taiDuLieuSoDauBaiTuMayChu();
    }
};

// Tự động theo dõi trạng thái đăng nhập qua nút Đăng nhập để đối chiếu quyền tức thì (0ms) mà không tải lại dữ liệu đã có
setInterval(() => {
    if (dangTaiDuLieuSoDauBai) return;
    let dinhDanhHienTai = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
        ? String(window.dinhDanhGiaoVienToanCuc).trim()
        : ((typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') ? String(window.emailGiaoVienToanCuc).trim() : '');
    if (daTaiDuLieuSoDauBai && dinhDanhDaNapSDB !== null && dinhDanhHienTai !== dinhDanhDaNapSDB) {
        dinhDanhDaNapSDB = dinhDanhHienTai;
        if (duLieuTKBGopDaMap.length > 0) {
            // Dữ liệu SĐB, TKB, PPCT đã có sẵn -> Đối chiếu quyền trực tiếp trên RAM (0ms), không tải lại dữ liệu đã có!
            let ketQuaDoiChieu = window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhHienTai);
            let khungSDB = document.getElementById('khungSoDauBai');
            let elTuan = document.getElementById('chonTuanSo');
            let elLop = document.getElementById('chonLopSo');
            if (khungSDB && !khungSDB.classList.contains('hidden') && elTuan && elTuan.value && elLop && elLop.value && !coThayDoiChuaLuu_SDB) {
                thucThiKetXuatSoDauBaiLenLuoi();
            }
            // Chỉ tải bổ sung thông tin đối chiếu nếu tài khoản chưa có đủ thông tin trong bộ nhớ
            if (dinhDanhHienTai !== '' && (!ketQuaDoiChieu || !ketQuaDoiChieu.daDuThongTinDoiChieu)) {
                taiBoSungThongTinDoiChieuChuaCoSDB(dinhDanhHienTai);
            }
        } else {
            const vungHienThi = document.getElementById('vungHienThiSoDauBai');
            thucThiTaiDuLieuVaVeLuoi(vungHienThi, false);
        }
    }
}, 250);

async function taiDuLieuSoDauBaiTuMayChu() {
    let dinhDanhHienTai = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
        ? String(window.dinhDanhGiaoVienToanCuc).trim()
        : ((typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') ? String(window.emailGiaoVienToanCuc).trim() : '');

    // Nếu dữ liệu Sổ đầu bài & TKB đã có sẵn trong RAM -> Không bao giờ tải lại toàn bộ!
    // Chỉ đối chiếu quyền nếu tài khoản thay đổi và tải bổ sung thông tin đối chiếu chưa có (nếu thiếu).
    if (duLieuTKBGopDaMap.length > 0) {
        daTaiDuLieuSoDauBai = true;
        if (dinhDanhDaNapSDB !== dinhDanhHienTai) {
            dinhDanhDaNapSDB = dinhDanhHienTai;
            let ketQuaDoiChieu = window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhHienTai);
            if (dinhDanhHienTai !== '' && (!ketQuaDoiChieu || !ketQuaDoiChieu.daDuThongTinDoiChieu)) {
                taiBoSungThongTinDoiChieuChuaCoSDB(dinhDanhHienTai);
            }
        }
        let elTuan = document.getElementById('chonTuanSo');
        let elLop = document.getElementById('chonLopSo');
        if (elTuan && elTuan.options.length <= 1) {
            napDropdownSoDauBai();
        } else if (elTuan && elTuan.value && elLop && elLop.value && !coThayDoiChuaLuu_SDB) {
            thucThiKetXuatSoDauBaiLenLuoi();
        }
        return;
    }
    
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    // Cho phép mọi người mở xem Sổ đầu bài ngay cả khi chưa đăng nhập (chế độ xem công khai);
    // Khi đăng nhập qua nút Đăng nhập, hệ thống tự động nạp và ánh xạ quyền chỉnh sửa.
    thucThiTaiDuLieuVaVeLuoi(vungHienThi, false);
}

// Tự động tải ngầm (Prefetch) dữ liệu Sổ đầu bài ngay sau khi trang chính khởi chạy xong
// giúp khi người dùng bấm vào tab "Sổ đầu bài" sẽ mở ngay tức thì (0ms chờ mạng)
function khoiDongTaiNgamSoDauBai() {
    let batDauPrefetch = () => {
        setTimeout(() => {
            if (!daTaiDuLieuSoDauBai && !dangTaiDuLieuSoDauBai) {
                let vungHienThi = document.getElementById('vungHienThiSoDauBai');
                thucThiTaiDuLieuVaVeLuoi(vungHienThi, true);
            }
        }, 1200);
    };
    if (document.readyState === 'complete') {
        batDauPrefetch();
    } else {
        window.addEventListener('load', batDauPrefetch, { once: true });
    }
}
khoiDongTaiNgamSoDauBai();
// =========================================================================
// [NÂNG CẤP]: HÀM GẮN CỜ VÀ BIỂU TƯỢNG CÂY BÚT VÀO DÒNG CÓ THAY ĐỔI
// =========================================================================
function danhDauDongThayDoi(tr) {
    if (!tr) return;
    
    // Nếu dòng chưa được đánh dấu thay đổi thì tiến hành đánh dấu
    if (tr.getAttribute('data-thaydoi') !== 'true') {
        tr.setAttribute('data-thaydoi', 'true');
        
        let tdMon = tr.querySelector('td[data-loai="mon"]');
        if (tdMon && !tdMon.querySelector('.icon-sua-chua')) {
            // Chèn SVG cây bút (Màu hổ phách, có hiệu ứng nhấp nháy nhẹ) bên cạnh tên môn
            tdMon.innerHTML += `<svg class="icon-sua-chua w-4 h-4 inline-block ml-1 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Dòng dữ liệu này đang được chỉnh sửa"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
        }
    }
}

// =========================================================================
// [NÂNG CẤP]: THUẬT TOÁN ĐỔ MÀU ĐEN RÕ NÉT CHO TẤT CẢ CÁC TIẾT ĐÃ KÝ TÊN
// =========================================================================
window.capNhatMauChuDongDaKy = function(tr) {
    if (!tr) return;
    let cellChuKy = tr.querySelector('td[data-loai="chuKy"]');
    if (!cellChuKy) return;

    let inpChuKy = cellChuKy.querySelector('input, textarea');
    let giaTriChuKy = inpChuKy ? String(inpChuKy.value || '').trim() : String(cellChuKy.innerText || '').trim();
    let daKyTen = giaTriChuKy !== '';
    let daKyTruocDo = tr.getAttribute('data-daky') === 'true';

    // Tối ưu tốc độ kết xuất: Nếu dòng chưa ký và trước đó cũng chưa từng ở trạng thái đã ký thì bỏ qua quét DOM
    if (!daKyTen && !daKyTruocDo) {
        tr.setAttribute('data-daky', 'false');
        return;
    }

    tr.setAttribute('data-daky', daKyTen ? 'true' : 'false');
    let cacCellTiet = tr.querySelectorAll('td[data-loai]');

    if (daKyTen) {
        cacCellTiet.forEach(td => {
            td.classList.remove('text-emerald-700', 'text-blue-700', 'text-slate-700', 'text-slate-800', 'text-slate-900');
            td.classList.add('text-black');
            td.style.setProperty('color', '#000000', 'important');

            let cacPhanTuCon = td.querySelectorAll('input, textarea, select, span');
            cacPhanTuCon.forEach(el => {
                el.classList.remove('bg-slate-100', 'opacity-70', 'opacity-60', 'text-blue-700', 'text-emerald-700', 'text-slate-400', 'text-slate-700', 'text-slate-800', 'text-slate-900');
                el.classList.add('text-black', 'bg-transparent');
                el.style.setProperty('color', '#000000', 'important');
                el.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('opacity', '1', 'important');
            });
        });
    } else {
        cacCellTiet.forEach(td => {
            let loai = td.getAttribute('data-loai') || '';
            td.classList.remove('text-black');
            td.style.removeProperty('color');
            if (loai === 'mon') {
                td.classList.add('text-slate-900');
            } else if (loai === 'tenBai' && td.getAttribute('data-islocked') === 'true') {
                td.classList.add('text-emerald-700');
            }

            let cacPhanTuCon = td.querySelectorAll('input, textarea, select, span');
            cacPhanTuCon.forEach(el => {
                el.classList.remove('text-black', 'bg-slate-100');
                el.classList.add('bg-transparent');
                el.style.removeProperty('color');
                el.style.removeProperty('-webkit-text-fill-color');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.removeProperty('opacity');

                if (el.disabled) {
                    el.classList.add('opacity-70');
                }
                if (loai === 'tiet' || loai === 'chuKy') {
                    el.classList.add('text-blue-700');
                } else {
                    el.classList.add('text-slate-800');
                }
            });
        });
    }
};
// Lắng nghe trạng thái đăng nhập để tự động mở Sổ đầu bài
function kiemTraTrangThaiDangNhapSDB() {
    let soLanKiemTra = 0;
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    
    if (vungHienThi) {
         let btnDangNhap = vungHienThi.querySelector('.bg-blue-600');
         if(btnDangNhap) btnDangNhap.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xác thực...`;
    }

    let vongLap = setInterval(() => {
        if (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') {
            clearInterval(vongLap);
            taiDuLieuSoDauBaiTuMayChu();
        }
        soLanKiemTra++;
        if (soLanKiemTra > 120) {
            clearInterval(vongLap); 
            if (vungHienThi) taiDuLieuSoDauBaiTuMayChu(); 
        }
    }, 200);
}

async function thucThiTaiDuLieuVaVeLuoi(vungHienThi, cheDoTaiNgam = false) {
    if (dangTaiDuLieuSoDauBai) return;
    dangTaiDuLieuSoDauBai = true;

    let selTuan = document.getElementById('chonTuanSo');
    let selLop = document.getElementById('chonLopSo');
    let inTuan = document.getElementById('input_chonTuanSo');
    let inLop = document.getElementById('input_chonLopSo');

    let dinhDanhGoiLen = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
        ? String(window.dinhDanhGiaoVienToanCuc).trim()
        : ((typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') ? String(window.emailGiaoVienToanCuc).trim() : '');

    let layKhoaAnToan = (tenKhoa) => (typeof window.layKhoaCachLy === 'function') ? window.layKhoaCachLy(tenKhoa) : tenKhoa;
    let cacheKeyShared = layKhoaAnToan('SDB_DATA_STATIC_SHARED_V2');
    let cacheKeyUser = layKhoaAnToan(`SDB_DATA_STATIC_${dinhDanhGoiLen}`);
    let snapshotKey = layKhoaAnToan('SDB_SNAPSHOT_FAST_V2');

    // 1. KIỂM TRA CACHE TĨNH DÙNG CHUNG TOÀN TRƯỜNG (Tránh tải lại PPCT & Khung CT khi đăng nhập/đăng xuất)
    let cacheParsed = null;
    try {
        let rawStatic = sessionStorage.getItem(cacheKeyShared) || localStorage.getItem(cacheKeyShared) ||
                        sessionStorage.getItem(cacheKeyUser) || localStorage.getItem(cacheKeyUser);
        if (rawStatic) {
            cacheParsed = JSON.parse(rawStatic);
            if (!cacheParsed || !Array.isArray(cacheParsed.PPCT) || cacheParsed.PPCT.length === 0) {
                cacheParsed = null;
            }
        }
    } catch (e) {
        cacheParsed = null;
    }

    // 2. KIỂM TRA SNAPSHOT ĐỘNG (Stale-While-Revalidate: Hiển thị tức thì 0ms từ bộ nhớ đệm nếu có)
    let snapshotParsed = null;
    try {
        let rawSnap = sessionStorage.getItem(snapshotKey) || localStorage.getItem(snapshotKey);
        if (rawSnap) {
            snapshotParsed = JSON.parse(rawSnap);
            if (!snapshotParsed || (!Array.isArray(snapshotParsed.TKB_HIEN_TAI) && !Array.isArray(snapshotParsed.DATA_TKB))) {
                snapshotParsed = null;
            }
        }
    } catch (e) {
        snapshotParsed = null;
    }

    let daHienThiTuCache = false;
    if (duLieuTKBGopDaMap.length > 0) {
        // Dữ liệu SĐB, TKB, PPCT đã có sẵn trong RAM -> Không tải lại, chỉ đối chiếu xác định quyền và tải bổ sung thông tin chưa có (nếu thiếu)
        dinhDanhDaNapSDB = dinhDanhGoiLen;
        daTaiDuLieuSoDauBai = true;
        dangTaiDuLieuSoDauBai = false;
        let ketQuaDoiChieu = window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhGoiLen);
        if (selTuan) selTuan.disabled = false;
        if (selLop) selLop.disabled = false;
        if (inTuan) { inTuan.disabled = false; inTuan.classList.remove('cursor-wait'); }
        if (inLop) { inLop.disabled = false; inLop.classList.remove('cursor-wait'); }
        if (selTuan && selTuan.options.length <= 1) {
            napDropdownSoDauBai();
        } else if (selTuan && selTuan.value && selLop && selLop.value && !coThayDoiChuaLuu_SDB) {
            thucThiKetXuatSoDauBaiLenLuoi();
        }
        if (dinhDanhGoiLen !== '' && (!ketQuaDoiChieu || !ketQuaDoiChieu.daDuThongTinDoiChieu)) {
            taiBoSungThongTinDoiChieuChuaCoSDB(dinhDanhGoiLen);
        }
        return;
    } else if (cacheParsed && snapshotParsed) {
        try {
            let duLieuTamCache = {
                ...snapshotParsed,
                NAM_HOC: snapshotParsed.NAM_HOC || cacheParsed.NAM_HOC || '',
                KHUNG_CHUONG_TRINH: cacheParsed.KHUNG_CHUONG_TRINH || [],
                PPCT: cacheParsed.PPCT || [],
                GVCN_THEO_LOP: cacheParsed.GVCN_THEO_LOP || {},
                TU_DIEN_HO_TEN_GV: cacheParsed.TU_DIEN_HO_TEN_GV || {},
                DANH_SACH_GIAO_VIEN: cacheParsed.DANH_SACH_GIAO_VIEN || []
            };
            if (duLieuTamCache.TRANG_THAI_KHOA) {
                duLieuKhoaSoToanCuc = duLieuTamCache.TRANG_THAI_KHOA;
            }
            dinhDanhDaNapSDB = dinhDanhGoiLen;
            khoiTaoDuLieuSoDauBai(duLieuTamCache);
            if (typeof window.anhXaQuyenNhanhKhiDoiTaiKhoan === 'function') {
                window.anhXaQuyenNhanhKhiDoiTaiKhoan(dinhDanhGoiLen);
            }
            daTaiDuLieuSoDauBai = true;
            daHienThiTuCache = true;
        } catch (eHydrate) {
            daHienThiTuCache = false;
        }
    }

    // Chỉ khóa ô chọn và hiện vòng xoay chờ nếu CHƯA có dữ liệu hiển thị tức thì và KHÔNG phải đang tải ngầm
    if (!daHienThiTuCache && !cheDoTaiNgam) {
        if (selTuan) { 
            selTuan.disabled = true; 
            if (!inTuan) selTuan.innerHTML = '<option value="" disabled selected>⏳ Đang tải...</option>'; 
        }
        if (selLop) { 
            selLop.disabled = true; 
            if (!inLop) selLop.innerHTML = '<option value="" disabled selected>⏳ Đang tải...</option>'; 
        }
        
        if (inTuan) { inTuan.dataset.oldValue = inTuan.value; inTuan.value = '⏳ Đang tải...'; inTuan.disabled = true; inTuan.classList.add('cursor-wait'); }
        if (inLop) { inLop.dataset.oldValue = inLop.value; inLop.value = '⏳ Đang tải...'; inLop.disabled = true; inLop.classList.add('cursor-wait'); }

        if (vungHienThi) {
            vungHienThi.innerHTML = `<div class="text-center py-12 text-slate-500 font-bold">
                <div class="w-9 h-9 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-base text-blue-900 font-extrabold">Đang kết nối kho dữ liệu Sổ Đầu Bài...</p>
                <span class="text-xs text-slate-500 font-normal mt-1 block">Hệ thống đang tối ưu bộ nhớ đệm để tăng tốc. Vui lòng không chuyển trang...</span>
            </div>`;
        }
    }

    try {
        let yeuCauTaiToanBo = cacheParsed ? false : true;
        let thongSoURL = `thaoTac=layDuLieuSoDauBai&emailTruyCap=${encodeURIComponent(dinhDanhGoiLen)}&taiToanBo=${yeuCauTaiToanBo}`;
        
        const phanHoi = await fetchVoiCoCheThuLai(
            `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?${thongSoURL}`,
            {}, 3, 60000
        );
        
        const phanHoiText = await phanHoi.text();
        
        let duLieuMoi;
        try { duLieuMoi = JSON.parse(phanHoiText); } 
        catch (loiParse) { throw new Error("Phản hồi máy chủ gặp sự cố định dạng. Vui lòng thử lại!"); }

        if (duLieuMoi.trangThai === 'loi_he_thong') throw new Error(duLieuMoi.thongBao);

        let duLieuSever = {};
        if (yeuCauTaiToanBo) {
            duLieuSever = duLieuMoi;
            let duLieuTinh = {
                NAM_HOC: duLieuMoi.NAM_HOC || '',
                KHUNG_CHUONG_TRINH: duLieuMoi.KHUNG_CHUONG_TRINH,
                PPCT: duLieuMoi.PPCT,
                GVCN_THEO_LOP: duLieuMoi.GVCN_THEO_LOP || {},
                TU_DIEN_HO_TEN_GV: duLieuMoi.TU_DIEN_HO_TEN_GV || {},
                DANH_SACH_GIAO_VIEN: duLieuMoi.DANH_SACH_GIAO_VIEN || []
            };
            let strTinh = JSON.stringify(duLieuTinh);
            try { sessionStorage.setItem(cacheKeyShared, strTinh); } catch (e) {}
            try { localStorage.setItem(cacheKeyShared, strTinh); } catch (e) {}
            try { sessionStorage.setItem(cacheKeyUser, strTinh); } catch (e) {}
        } else {
            duLieuSever = {
                ...duLieuMoi,
                NAM_HOC: duLieuMoi.NAM_HOC || cacheParsed.NAM_HOC || '',
                KHUNG_CHUONG_TRINH: (duLieuMoi.KHUNG_CHUONG_TRINH && duLieuMoi.KHUNG_CHUONG_TRINH.length > 0) ? duLieuMoi.KHUNG_CHUONG_TRINH : cacheParsed.KHUNG_CHUONG_TRINH,
                PPCT: (duLieuMoi.PPCT && duLieuMoi.PPCT.length > 0) ? duLieuMoi.PPCT : cacheParsed.PPCT,
                GVCN_THEO_LOP: duLieuMoi.GVCN_THEO_LOP || cacheParsed.GVCN_THEO_LOP || {},
                TU_DIEN_HO_TEN_GV: duLieuMoi.TU_DIEN_HO_TEN_GV || cacheParsed.TU_DIEN_HO_TEN_GV || {},
                DANH_SACH_GIAO_VIEN: (duLieuMoi.DANH_SACH_GIAO_VIEN && duLieuMoi.DANH_SACH_GIAO_VIEN.length > 0) ? duLieuMoi.DANH_SACH_GIAO_VIEN : (cacheParsed.DANH_SACH_GIAO_VIEN || [])
            };
        }

        // Lưu Snapshot động vào bộ nhớ đệm để lần mở tiếp theo hiển thị tức thì (0ms)
        try {
            let snapData = {
                NAM_HOC: duLieuSever.NAM_HOC || '',
                SO_DAU_BAI: duLieuSever.SO_DAU_BAI || [],
                DATA_TKB: duLieuSever.DATA_TKB || [],
                TKB_HIEN_TAI: duLieuSever.TKB_HIEN_TAI || [],
                TRANG_THAI_KHOA: duLieuSever.TRANG_THAI_KHOA || {},
                thoiDiemLuu: Date.now()
            };
            let strSnap = JSON.stringify(snapData);
            try { sessionStorage.setItem(snapshotKey, strSnap); } catch (e) {}
            try { localStorage.setItem(snapshotKey, strSnap); } catch (e) {}
        } catch (eSnap) {}

        dinhDanhDaNapSDB = dinhDanhGoiLen;
        if (duLieuSever.TRANG_THAI_KHOA) { duLieuKhoaSoToanCuc = duLieuSever.TRANG_THAI_KHOA; }

        // Nếu người dùng đang gõ dở trên lưới thì chỉ cập nhật quyền mà không ghi đè mất chữ đang gõ
        if (daHienThiTuCache && coThayDoiChuaLuu_SDB) {
            maGvDangNhapHeThong = duLieuSever.MA_GIAO_VIEN || '';
            coToanQuyenSDB = duLieuSever.TOAN_QUYEN || false;
            quyenKhoaSdbServer = !!(duLieuSever.QUYEN_KHOA_SDB || duLieuSever.TOAN_QUYEN);
            tuDienQuyenPhanCong = duLieuSever.QUYEN_THEO_LOP || {};
        } else {
            khoiTaoDuLieuSoDauBai(duLieuSever);
        }

        daTaiDuLieuSoDauBai = true;
        dangTaiDuLieuSoDauBai = false;

        let inTuanReset = document.getElementById('input_chonTuanSo');
        let inLopReset = document.getElementById('input_chonLopSo');
        let selTuanReset = document.getElementById('chonTuanSo');
        let selLopReset = document.getElementById('chonLopSo');

        if (selTuanReset) selTuanReset.disabled = false;
        if (selLopReset) selLopReset.disabled = false;
        if (inTuanReset) { inTuanReset.disabled = false; inTuanReset.classList.remove('cursor-wait'); }
        if (inLopReset) { inLopReset.disabled = false; inLopReset.classList.remove('cursor-wait'); }

    } catch (loi) {
        dangTaiDuLieuSoDauBai = false; 
        console.error("Lỗi Sổ đầu bài:", loi);
        if (!daHienThiTuCache && !cheDoTaiNgam) {
            if (vungHienThi) {
                vungHienThi.innerHTML = `<div class="text-center py-10 text-red-600 font-bold text-lg">⚠️ Cảnh báo lỗi kết nối: <br><span class="text-base font-normal text-slate-700">${loi.message}</span></div>`;
            }
            if (selTuan) selTuan.disabled = false;
            if (selLop) selLop.disabled = false;
            if (inTuan) { inTuan.disabled = false; inTuan.classList.remove('cursor-wait'); inTuan.value = inTuan.dataset.oldValue || ''; }
            if (inLop) { inLop.disabled = false; inLop.classList.remove('cursor-wait'); inLop.value = inLop.dataset.oldValue || ''; }
        }
    }
}

// =========================================================================
// KHỐI 2: VẼ GIAO DIỆN VÀ KHỞI TẠO DỮ LIỆU
// =========================================================================
function tinhNgayTuInputDate(ngayYMD, tenThu) {
    if (!ngayYMD) return '';
    let dateObj = new Date(ngayYMD);
    if (isNaN(dateObj.getTime())) return '';
    const doLech = { "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ nhật": 6 };
    dateObj.setDate(dateObj.getDate() + (doLech[tenThu] || 0));
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
}

// Hàm tra cứu Họ tên đầy đủ (Cột B sheet DM_GIAOVIEN) từ Mã GV (Cột A sheet DM_GIAOVIEN / Cột C sheet DM_LOP)
window.layHoTenDayDuGiaoVienSDB = function(maHoacTenGV) {
    if (!maHoacTenGV) return '';
    let raw = String(maHoacTenGV).trim();
    if (!raw) return '';
    let khoaChuan = window.chuanHoaDinhDanhGiaoVien(raw);
    if (tuDienHoTenGVToanCuc && tuDienHoTenGVToanCuc[khoaChuan]) {
        return tuDienHoTenGVToanCuc[khoaChuan];
    }
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TU_DIEN_HO_TEN_GV && thongSoHocVu.TU_DIEN_HO_TEN_GV[khoaChuan]) {
        return thongSoHocVu.TU_DIEN_HO_TEN_GV[khoaChuan];
    }
    if (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.TU_DIEN_HO_TEN_GV && window.thongSoHocVu.TU_DIEN_HO_TEN_GV[khoaChuan]) {
        return window.thongSoHocVu.TU_DIEN_HO_TEN_GV[khoaChuan];
    }
    return raw;
};

function khoiTaoDuLieuSoDauBai(duLieuSever) {
    maGvDangNhapHeThong = duLieuSever.MA_GIAO_VIEN || '';
    let tenGvDangNhapHeThong = duLieuSever.TEN_GIAO_VIEN || duLieuSever.MA_GIAO_VIEN || '';
    coToanQuyenSDB = duLieuSever.TOAN_QUYEN || false;
    quyenKhoaSdbServer = !!(duLieuSever.QUYEN_KHOA_SDB || duLieuSever.TOAN_QUYEN);
    tuDienQuyenPhanCong = duLieuSever.QUYEN_THEO_LOP || {};

    // Kế thừa dữ liệu đã có sẵn trên hệ thống (không xóa dữ liệu từ điển đã nạp)
    window.keThuaDuLieuDaCoTuHeThong();
    let nguonGvcn = duLieuSever.GVCN_THEO_LOP || (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.GVCN_THEO_LOP) || (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.GVCN_THEO_LOP) || {};
    Object.keys(nguonGvcn).forEach(kLop => {
        let valGvcn = String(nguonGvcn[kLop] || '').trim();
        if (valGvcn) tuDienGvcnTheoLopToanCuc[String(kLop).trim().toUpperCase()] = valGvcn;
    });

    let nguonHoTen = duLieuSever.TU_DIEN_HO_TEN_GV || (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TU_DIEN_HO_TEN_GV) || (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.TU_DIEN_HO_TEN_GV) || {};
    Object.keys(nguonHoTen).forEach(kMa => {
        let maNorm = window.chuanHoaDinhDanhGiaoVien(kMa);
        let hoTenDayDu = String(nguonHoTen[kMa] || '').trim();
        if (maNorm && hoTenDayDu) {
            tuDienHoTenGVToanCuc[maNorm] = hoTenDayDu;
            tuDienHoTenGVToanCuc[window.chuanHoaDinhDanhGiaoVien(hoTenDayDu)] = hoTenDayDu;
        }
    });
    if (duLieuSever.MAP_EMAIL_GV && typeof duLieuSever.MAP_EMAIL_GV === 'object') {
        Object.keys(duLieuSever.MAP_EMAIL_GV).forEach(em => {
            tuDienEmailSangGiaoVienSDB[String(em).trim().toLowerCase()] = duLieuSever.MAP_EMAIL_GV[em];
        });
    }
    if (Array.isArray(duLieuSever.DANH_SACH_GIAO_VIEN) && duLieuSever.DANH_SACH_GIAO_VIEN.length > 0) {
        danhSachTatCaGiaoVienTruong = duLieuSever.DANH_SACH_GIAO_VIEN;
    }
    if (maGvDangNhapHeThong && tenGvDangNhapHeThong) {
        tuDienHoTenGVToanCuc[window.chuanHoaDinhDanhGiaoVien(maGvDangNhapHeThong)] = tenGvDangNhapHeThong;
        let dinhDanhHT = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
            ? String(window.dinhDanhGiaoVienToanCuc).trim().toLowerCase()
            : '';
        if (dinhDanhHT) {
            boNhoQuyenTaiKhoanDaXacThuc[dinhDanhHT] = {
                maGV: maGvDangNhapHeThong,
                tenGV: tenGvDangNhapHeThong,
                toanQuyen: coToanQuyenSDB,
                quyenKhoaSdb: quyenKhoaSdbServer,
                quyenTheoLop: tuDienQuyenPhanCong
            };
        }
    }

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    if (!theChotQuyen) {
        theChotQuyen = document.createElement('div');
        theChotQuyen.id = 'theChotQuyenSDB';
        theChotQuyen.style.display = 'none';
        
        let vungChinh = document.getElementById('khungSoDauBai');
        if (vungChinh) vungChinh.appendChild(theChotQuyen);
        else document.body.appendChild(theChotQuyen);
    }
    
    theChotQuyen.setAttribute('data-madinhdanh', maGvDangNhapHeThong);
    theChotQuyen.setAttribute('data-tendinhdanh', tenGvDangNhapHeThong);
    theChotQuyen.setAttribute('data-quantri', coToanQuyenSDB);
    theChotQuyen.setAttribute('data-quyenkhoasdb', quyenKhoaSdbServer);
    theChotQuyen.setAttribute('data-matranquyen', JSON.stringify(tuDienQuyenPhanCong));

    let mapDuiLieuHopNhat = {};
    window.duLieuTongHopSDB = {}; // Khởi tạo bộ nhớ cục bộ cho khối nhận xét & chữ ký cuối tuần

    const chuanHoaThu = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    // 1. XỬ LÝ SỔ ĐẦU BÀI (Chỉ đọc cột vật lý)
    namHocHeThongSDB = duLieuSever.NAM_HOC || namHocHeThongSDB || (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) || (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) || '';
    if (duLieuSever.SO_DAU_BAI) {
        let namHocHienTai = namHocHeThongSDB;

        duLieuSever.SO_DAU_BAI.forEach(dong => {
            let maLuuTru = String(dong['A'] || '').trim();
            let tuan = String(dong['B'] || '').replace(/\D/g, '');
            let lop = String(dong['C'] || '').trim().toUpperCase();
            let thuGocUpper = String(dong['D'] || '').trim().toUpperCase();
            let ngay = String(dong['E'] || '').trim();

            if (namHocHienTai) {
                if (maLuuTru.startsWith(namHocHienTai + '_')) {
                    // Thuộc đúng năm học hiện tại -> Chấp nhận nạp
                } else if (/^\d{4}-\d{4}_/.test(maLuuTru)) {
                    return;
                } else if (ngay) {
                    let matchNgay = ngay.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                    if (matchNgay) {
                        let thang = parseInt(matchNgay[2], 10);
                        let nam = parseInt(matchNgay[3], 10);
                        let nhTuNgay = (thang >= 8) ? `${nam}-${nam+1}` : `${nam-1}-${nam}`;
                        if (nhTuNgay !== namHocHienTai) {
                            return;
                        }
                    }
                }
            }

            // Tách riêng dòng TONGHOP (Nhận xét & Chữ ký của GVCN và BGH) để không trộn vào các tiết học
            if (thuGocUpper === 'TONGHOP' || thuGocUpper === 'TỔNG HỢP') {
                if (tuan && lop) {
                    window.duLieuTongHopSDB[`${tuan}_${lop}`] = {
                        nxGVCN: String(dong['I'] || ''),
                        kyGVCN: String(dong['J'] || ''),
                        nxBGH: String(dong['K'] || ''),
                        kyBGH: String(dong['L'] || ''),
                        maLuuTru: maLuuTru,
                        daLuu: true
                    };
                }
                return;
            }

            let thuChuan = chuanHoaThu(dong['D'] || ''); 
            let buoi = String(dong['F'] || '').trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(dong['G'] || '').trim();
            
            let khoa = `${tuan}_${lop}_${thuChuan}_${buoi}_${tiet}`;
            
            mapDuiLieuHopNhat[khoa] = {
                'Tuần': tuan, 'Mã Lớp': lop, 'Thứ': thuChuan, 'Buổi': buoi, 'Tiết': tiet,
                'Môn Học': dong['H'] || '',
                'MonHoc_GocSDB': dong['H'] || '',
                'Mã GV': '', 
                'Ngày': ngay,
                'TietPPCT_Thuc': dong['I'] || '',
                'TenBai_Thuc': dong['J'] || '',
                'NhanXet_Thuc': dong['K'] || '',
                'XepLoai_Thuc': dong['L'] || '',
                'ChuKy_Thuc': dong['M'] || '',
                'ChuyenCan_Thuc': dong['N'] || '',
                'DaLuu': true 
            };
        });
    }

    // Bảo toàn các bản ghi nhận xét tổng hợp vừa lưu tức thì trên Client (tránh độ trễ đồng bộ ngầm)
    if (boNhoTamTongHopVuaLuu) {
        Object.keys(boNhoTamTongHopVuaLuu).forEach(kTH => {
            let itemTam = boNhoTamTongHopVuaLuu[kTH];
            if (itemTam && (Date.now() - (itemTam.thoiDiemLuu || 0) < 30000)) {
                let hienCo = window.duLieuTongHopSDB[kTH] || { nxGVCN: '', kyGVCN: '', nxBGH: '', kyBGH: '', daLuu: true };
                window.duLieuTongHopSDB[kTH] = {
                    nxGVCN: itemTam.nxGVCN !== undefined && itemTam.nxGVCN !== '' ? itemTam.nxGVCN : hienCo.nxGVCN,
                    kyGVCN: itemTam.kyGVCN !== undefined && itemTam.kyGVCN !== '' ? itemTam.kyGVCN : hienCo.kyGVCN,
                    nxBGH: itemTam.nxBGH !== undefined && itemTam.nxBGH !== '' ? itemTam.nxBGH : hienCo.nxBGH,
                    kyBGH: itemTam.kyBGH !== undefined && itemTam.kyBGH !== '' ? itemTam.kyBGH : hienCo.kyBGH,
                    maLuuTru: itemTam.maLuuTru || hienCo.maLuuTru || '',
                    daLuu: true
                };
            }
        });
    }

    let mapTkbToanTap = {};
    // Ưu tiên xác định tuần hiện tại trực tiếp từ dữ liệu TKB_HIEN_TAI của máy chủ trả về
    let tuanHeThong = 0;
    if (duLieuSever.TKB_HIEN_TAI && duLieuSever.TKB_HIEN_TAI.length > 0) {
        duLieuSever.TKB_HIEN_TAI.forEach(dong => {
            let t = parseInt(String(dong['C'] || '').replace(/\D/g, ''), 10) || 0;
            if (t > tuanHeThong) tuanHeThong = t;
        });
    }
    if (tuanHeThong === 0) {
        tuanHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI) ? parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10) : 999;
    }

    // 2. XỬ LÝ THỜI KHÓA BIỂU (Nạp đầy đủ DATA_TKB và ưu tiên ghi đè TKB_HIEN_TAI nếu trùng tuần)
    const quyTrinhXuLyTKB = (dong) => {
        let tuanDong = parseInt(String(dong['C'] || '').replace(/\D/g, ''), 10) || 0;
        if (tuanDong <= 0) return;
        let lop = String(dong['G'] || '').trim().toUpperCase();
        let thu = chuanHoaThu(dong['D'] || '');
        let buoi = String(dong['E'] || '').trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
        let tiet = String(dong['F'] || '').trim();
        
        let khoa = `${tuanDong}_${lop}_${thu}_${buoi}_${tiet}`;
        mapTkbToanTap[khoa] = {
            'Tuần': tuanDong, 'Mã Lớp': lop, 'Thứ': thu, 'Buổi': buoi, 'Tiết': tiet,
            'Môn Học': dong['H'] || '',
            'Mã GV': dong['I'] || '',
            'Ngày': dong['K'] || ''
        };
    };

    if (duLieuSever.DATA_TKB) {
        duLieuSever.DATA_TKB.forEach(dong => {
            quyTrinhXuLyTKB(dong);
        });
    }
    
    if (duLieuSever.TKB_HIEN_TAI) {
        duLieuSever.TKB_HIEN_TAI.forEach(dong => {
            quyTrinhXuLyTKB(dong);
        });
    }

    mapTkbToanTapToanCuc = mapTkbToanTap;
    window.mapTkbToanTap = mapTkbToanTap;

    // Xác định các cặp (Tuần_Lớp) đã có dữ liệu Sổ đầu bài lưu trên hệ thống
    let tapHopTuanLopDaLuu = new Set();
    Object.values(mapDuiLieuHopNhat).forEach(d => {
        if (d.DaLuu === true) {
            tapHopTuanLopDaLuu.add(`${d['Tuần']}_${d['Mã Lớp']}`);
        }
    });

    Object.keys(mapTkbToanTap).forEach(khoa => {
        let dongTkb = mapTkbToanTap[khoa];
        let tuanStr = String(dongTkb['Tuần']).replace(/\D/g, '');
        let lopStr = String(dongTkb['Mã Lớp']).trim().toUpperCase();
        let khoaTuanLop = `${tuanStr}_${lopStr}`;

        if (!mapDuiLieuHopNhat[khoa]) {
            // Chỉ tự động điền tiết từ TKB vào nếu tuần đó của lớp đó CHƯA TỪNG LƯU Sổ đầu bài.
            // Nếu tuần đó đã lưu SĐB mà ở tiết này SĐB trống còn TKB có môn, giữ nguyên trạng thái trống của SĐB để đối chiếu phát hiện thay đổi!
            if (!tapHopTuanLopDaLuu.has(khoaTuanLop)) {
                mapDuiLieuHopNhat[khoa] = {
                    'Tuần': tuanStr,
                    'Mã Lớp': lopStr,
                    'Thứ': chuanHoaThu(dongTkb['Thứ']),
                    'Buổi': String(dongTkb['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều',
                    'Tiết': String(dongTkb['Tiết']).trim(),
                    'Môn Học': dongTkb['Môn Học'] || '',
                    'MonHoc_GocSDB': '',
                    'Mã GV': dongTkb['Mã GV'] || '',
                    'Ngày': dongTkb['Ngày'] || '',
                    'TietPPCT_Thuc': '', 'TenBai_Thuc': '', 'NhanXet_Thuc': '', 
                    'XepLoai_Thuc': '', 'ChuKy_Thuc': '', 'ChuyenCan_Thuc': '',
                    'DaLuu': false 
                };
            }
        } else {
            // Chỉ gán Mã GV từ TKB nếu đúng cùng môn học
            let monSdbHienTai = String(mapDuiLieuHopNhat[khoa]['Môn Học'] || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
            let monTkbHienTai = String(dongTkb['Môn Học'] || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
            if (monSdbHienTai === monTkbHienTai) {
                if (!mapDuiLieuHopNhat[khoa]['Mã GV'] || mapDuiLieuHopNhat[khoa]['Mã GV'].trim() === '') {
                    mapDuiLieuHopNhat[khoa]['Mã GV'] = dongTkb['Mã GV'] || '';
                }
            }
        }
    });

    let tkbGop = Object.values(mapDuiLieuHopNhat);
    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2, "tối": 3 };

    // Tiền tính toán khóa số học 1 lần duy nhất (O(N)) giúp tăng tốc sắp xếp O(N log N) gấp 8 lần
    for (let i = 0; i < tkbGop.length; i++) {
        let item = tkbGop[i];
        item._tuanSo = parseInt(item['Tuần'], 10) || 0;
        item._lopUpper = String(item['Mã Lớp'] || '').trim().toUpperCase();
        item._thuOrder = thuTuThu[item['Thứ']] || 99;
        item._buoiOrder = thuTuBuoi[item['Buổi']] || 99;
        item._tietSo = parseInt(item['Tiết'], 10) || 0;
    }

    tkbGop.sort((a, b) => {
        if (a._tuanSo !== b._tuanSo) return a._tuanSo - b._tuanSo;
        if (a._thuOrder !== b._thuOrder) return a._thuOrder - b._thuOrder;
        if (a._buoiOrder !== b._buoiOrder) return a._buoiOrder - b._buoiOrder;
        return a._tietSo - b._tietSo;
    });

    // 3. XỬ LÝ KHUNG CHƯƠNG TRÌNH (Nếu đã có sẵn trong bộ nhớ và gói tin không gửi mới thì giữ nguyên, không xử lý lại)
    if (duLieuSever.KHUNG_CHUONG_TRINH && Array.isArray(duLieuSever.KHUNG_CHUONG_TRINH) && duLieuSever.KHUNG_CHUONG_TRINH.length > 0) {
        dinhMucKhungCT = {};
        let dongTieuDe = duLieuSever.KHUNG_CHUONG_TRINH[0];
        
        for (let i = 1; i < duLieuSever.KHUNG_CHUONG_TRINH.length; i++) {
            let dong = duLieuSever.KHUNG_CHUONG_TRINH[i];
            let mon = String(dong['A'] || '').trim().toLowerCase();
            if (!mon || mon === 'môn học') continue;
            
            Object.keys(dong).forEach(colKey => {
                if (colKey !== 'A' && colKey !== 'B') { 
                    let tenLopKhoi = String(dongTieuDe[colKey] || '').trim();
                    let matchKhoi = tenLopKhoi.match(/\d+/);
                    if (matchKhoi) {
                        let khoi = matchKhoi[0];
                        if (!dinhMucKhungCT[khoi]) dinhMucKhungCT[khoi] = {};
                        let tiet = parseInt(dong[colKey]) || 0;
                        if (tiet > 0) dinhMucKhungCT[khoi][mon] = tiet;
                    }
                }
            });
        }
    }

    // 4. XỬ LÝ PPCT (Nếu đã có sẵn trong tuDienPPCTToanCuc thì giữ nguyên, không xóa và không quét lại)
    if (Object.keys(tuDienPPCTToanCuc).length === 0 && duLieuSever.PPCT && Array.isArray(duLieuSever.PPCT) && duLieuSever.PPCT.length > 0) {
        let boNhoKhoi = ''; let boNhoMon = ''; 
        duLieuSever.PPCT.forEach(dong => {
            let khoiGoc = String(dong['A'] || '').trim();
            if (khoiGoc !== '') boNhoKhoi = khoiGoc; else khoiGoc = boNhoKhoi; 
            let matchKhoi = khoiGoc.match(/\d+/);
            let khoi = matchKhoi ? matchKhoi[0] : khoiGoc; 
            
            let tietPPCT_Goc = String(dong['B'] || '').trim();
            let monGoc = String(dong['C'] || '').trim().toLowerCase();
            if (monGoc !== '') boNhoMon = monGoc; else monGoc = boNhoMon; 
            let monRutGon = monGoc.replace(/[0-9\(\)]/g, '').trim().replace(/\s+/g, ' ');
            let baiDay = dong['D'] || '';
            
            tuDienPPCTToanCuc[`${khoi}_${monGoc}_${tietPPCT_Goc}`] = baiDay;
            if (!tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`]) {
                tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`] = baiDay;
            }
        });
    }

    // 5. Gán danh sách giáo viên ký tên (hỗ trợ cả GV thường và Admin toàn quyền)
    if (tenGvDangNhapHeThong && tenGvDangNhapHeThong.trim() !== '') {
        danhSachGiaoVienToanCuc = [tenGvDangNhapHeThong.trim()];
    } else if (coToanQuyenSDB && Array.isArray(duLieuSever.DANH_SACH_GIAO_VIEN) && duLieuSever.DANH_SACH_GIAO_VIEN.length > 0) {
        danhSachGiaoVienToanCuc = duLieuSever.DANH_SACH_GIAO_VIEN;
    } else {
        danhSachGiaoVienToanCuc = [];
    }

    duLieuTKBGopDaMap = tkbGop; 
    if (typeof window.xayDungChiMucNhanhSDB === 'function') {
        window.xayDungChiMucNhanhSDB();
    }
    napDropdownSoDauBai();
}

let khoaDoubleKetXuat = false;

function ketXuatSoDauBaiLenLuoi() {
    if (khoaDoubleKetXuat) return;
    khoaDoubleKetXuat = true;
    setTimeout(() => { khoaDoubleKetXuat = false; }, 50);

    let theSelectTuan = document.getElementById('chonTuanSo');
    let theSelectLop = document.getElementById('chonLopSo');
    let tuanChon = theSelectTuan?.value;
    let lopChon = theSelectLop?.value;

    if (!tuanChon || !lopChon) return; 

    // 1. Chốt chặn bảo vệ nếu có thay đổi nháp chưa lưu
    if (coThayDoiChuaLuu_SDB) {
        let xacNhan = confirm("⚠️ Đồng chí có dữ liệu chưa lưu trên màn hình! Bấm [Hủy] để ở lại lưu, bấm [OK] để chuyển tuần (dữ liệu chưa lưu sẽ mất).");
        if (!xacNhan) {
            if (theSelectTuan && tuanTruocDo_SDB) theSelectTuan.value = tuanTruocDo_SDB;
            if (theSelectLop && lopTruocDo_SDB) theSelectLop.value = lopTruocDo_SDB;
            if (typeof dongBoHienThiTuSelect === 'function') {
                dongBoHienThiTuSelect('chonTuanSo');
                dongBoHienThiTuSelect('chonLopSo');
            }
            return;
        } else {
            coThayDoiChuaLuu_SDB = false;
        }
    }

    // 2. [QUY TẮC RÀNG BUỘC CHẶN TUẦN]: NẾU CHƯA LƯU TUẦN 1 THÌ KHÔNG CHO CHỌN TUẦN 2 (VÀ CÁC TUẦN TIẾP THEO)
    // (Khi chưa đăng nhập: ai cũng được mở xem tự do các tuần mà không cần kiểm tra quyền)
    let daDangNhapChonTuan = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
    let tuanSo = parseInt(String(tuanChon).replace(/\D/g, ''), 10) || 0;
    if (daDangNhapChonTuan && tuanSo > 1) {
        let lopNorm = String(lopChon).trim().toUpperCase();
        let wChuaLuu = (typeof window.timTuanTruocChuaLuuSDB === 'function') ? window.timTuanTruocChuaLuuSDB(tuanSo, lopNorm) : 0;
        if (wChuaLuu > 0) {
            alert(`⛔ CHƯA LƯU SỔ ĐẦU BÀI TUẦN TRƯỚC:\n\nSổ đầu bài Tuần ${wChuaLuu} của Lớp ${lopChon} chưa được lưu dữ liệu lên hệ thống!\n\nĐồng chí vui lòng hoàn thành và bấm "Lưu Sổ đầu bài" Tuần ${wChuaLuu} trước khi chuyển sang Tuần ${tuanSo}.`);
            
            // Phục hồi lại tuần wChuaLuu chưa lưu hoặc tuần trước đó
            let optW = Array.from(theSelectTuan.options).find(o => parseInt(String(o.value).replace(/\D/g, ''), 10) === wChuaLuu);
            let giaTriPhucHoi = optW ? optW.value : (tuanTruocDo_SDB || '');
            
            if (giaTriPhucHoi) {
                theSelectTuan.value = giaTriPhucHoi;
            }
            if (typeof dongBoHienThiTuSelect === 'function') {
                dongBoHienThiTuSelect('chonTuanSo');
            }
            
            // Kết xuất tuần wChuaLuu để người dùng thao tác trực tiếp trên tuần cần lưu
            thucThiKetXuatSoDauBaiLenLuoi();
            tuanTruocDo_SDB = theSelectTuan?.value || '';
            lopTruocDo_SDB = theSelectLop?.value || '';
            coThayDoiChuaLuu_SDB = false;
            return;
        }
    }

    // 3. Kết xuất lưới Sổ đầu bài tuần hợp lệ
    thucThiKetXuatSoDauBaiLenLuoi();

    tuanTruocDo_SDB = theSelectTuan?.value || '';
    lopTruocDo_SDB = theSelectLop?.value || '';
    coThayDoiChuaLuu_SDB = false; 
}

// =========================================================================
// =========================================================================
// [HÀM DÙNG CHUNG]: TRA CỨU TÊN BÀI HỌC CHUẨN TỪ PHÂN PHỐI CHƯƠNG TRÌNH (PPCT)
// =========================================================================
function timTenBaiChuanSDB(khoi, monHoc, tietPPCT) {
    if (!monHoc || !tietPPCT || !tuDienPPCTToanCuc) return '';
    let khoiStr = String(khoi || '').trim();
    let monGoc = String(monHoc).trim().toLowerCase().replace(/\s+/g, ' ');
    let monKhongSoCuoi = monGoc.replace(/\s*\d+$/, '').trim();
    let monRutGon = monGoc.replace(/[0-9\(\)]/g, '').trim().replace(/\s+/g, ' ');
    let tietStr = String(tietPPCT).trim();

    let khoaChinhXac = `${khoiStr}_${monGoc}_${tietStr}`;
    if (tuDienPPCTToanCuc[khoaChinhXac]) return tuDienPPCTToanCuc[khoaChinhXac];

    let khoaPhu = `${khoiStr}_${monRutGon}_${tietStr}`;
    if (tuDienPPCTToanCuc[khoaPhu]) return tuDienPPCTToanCuc[khoaPhu];

    let khoaDuPhong = `${khoiStr}_${monKhongSoCuoi}_${tietStr}`;
    if (tuDienPPCTToanCuc[khoaDuPhong]) return tuDienPPCTToanCuc[khoaDuPhong];

    let keys = Object.keys(tuDienPPCTToanCuc);
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        let parts = k.split('_');
        if (parts.length === 3 && parts[0] === khoiStr && parts[2] === tietStr) {
            if (parts[1] === monGoc || parts[1] === monRutGon || parts[1] === monKhongSoCuoi) {
                return tuDienPPCTToanCuc[k];
            }
        }
    }
    return '';
}
window.timTenBaiChuanSDB = timTenBaiChuanSDB;

// [THUẬT TOÁN ĐỐI CHIẾU]: PHÁT HIỆN SỰ KHÁC NHAU GIỮA SỔ ĐẦU BÀI ĐÃ LƯU VÀ TKB
// =========================================================================
function kiemTraKhacBietTkbVaSoDauBai(tuanChon, lopChon) {
    if (!tuanChon || !lopChon || !mapTkbToanTapToanCuc) return [];
    let tuanSo = parseInt(String(tuanChon).replace(/\D/g, ''), 10);
    let lopChuan = String(lopChon).trim().toUpperCase();

    let tkbTuanNay = duLieuTKBGopDaMap.filter(d => 
        parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === tuanSo && 
        String(d['Mã Lớp']).trim().toUpperCase() === lopChuan
    );

    let soTietDaLuu = tkbTuanNay.filter(d => d.DaLuu === true).length;
    // Nếu chưa từng lưu sổ tuần này (chưa có sổ đầu bài đã lưu để đối chiếu), trả về rỗng
    if (soTietDaLuu === 0) return [];

    let dsKhacBiet = [];
    const chuanHoaMon = (mon) => String(mon || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
    const chuanHoaGv = (gv) => String(gv || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
    const chuanHoaThu = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    let tapHopSlot = new Map();

    // 1. Quét từ SĐB hiện tại
    tkbTuanNay.forEach(d => {
        let thu = chuanHoaThu(d['Thứ']);
        let buoi = String(d['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
        let tiet = String(d['Tiết']).trim();
        let khoa = `${tuanSo}_${lopChuan}_${thu}_${buoi}_${tiet}`;
        tapHopSlot.set(khoa, { thu: thu, buoi: buoi === 'sáng' ? 'Sáng' : 'Chiều', dataBuoi: buoi, tiet: tiet });
    });

    // 2. Quét từ TKB tương ứng của đúng tuần đang chọn
    Object.keys(mapTkbToanTapToanCuc).forEach(khoa => {
        let itemTKB = mapTkbToanTapToanCuc[khoa];
        if (parseInt(String(itemTKB['Tuần']).replace(/\D/g, ''), 10) === tuanSo && 
            String(itemTKB['Mã Lớp']).trim().toUpperCase() === lopChuan) {
            let thu = chuanHoaThu(itemTKB['Thứ']);
            let buoi = String(itemTKB['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(itemTKB['Tiết']).trim();
            let k = `${tuanSo}_${lopChuan}_${thu}_${buoi}_${tiet}`;
            if (!tapHopSlot.has(k)) {
                tapHopSlot.set(k, { thu: thu, buoi: buoi === 'sáng' ? 'Sáng' : 'Chiều', dataBuoi: buoi, tiet: tiet });
            }
        }
    });

    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2 };

    let dsSortedSlot = Array.from(tapHopSlot.entries()).sort((a, b) => {
        let sA = a[1], sB = b[1];
        let tA = thuTuThu[sA.thu] || 99, tB = thuTuThu[sB.thu] || 99;
        if (tA !== tB) return tA - tB;
        let bA = thuTuBuoi[sA.dataBuoi] || 99, bB = thuTuBuoi[sB.dataBuoi] || 99;
        if (bA !== bB) return bA - bB;
        return (parseInt(sA.tiet) || 0) - (parseInt(sB.tiet) || 0);
    });

    // 3. Đối sánh CHÍNH XÁC TUYỆT ĐỐI tên môn thay thế giữa Thời khóa biểu và Sổ đầu bài
    dsSortedSlot.forEach(([khoa, slot]) => {
        let sdbItem = tkbTuanNay.find(d => 
            chuanHoaThu(d['Thứ']) === slot.thu && 
            (String(d['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều') === slot.dataBuoi && 
            String(d['Tiết']).trim() === String(slot.tiet)
        );

        let tkbItem = mapTkbToanTapToanCuc[khoa];

        // Chỉ lấy môn của Sổ đầu bài nếu tiết đó đã được lưu trong SĐB hoặc vừa đồng bộ
        let monSDB = '';
        let gvSDB = '';
        if (sdbItem && (sdbItem.DaLuu === true || sdbItem.DaDongBoTKB === true)) {
            monSDB = String(sdbItem['Môn Học'] || '').trim();
            gvSDB = String(sdbItem['Mã GV'] || '').trim();
        }

        let monTKB = String(tkbItem ? (tkbItem['Môn Học'] || '') : '').trim();
        let gvTKB = String(tkbItem ? (tkbItem['Mã GV'] || '') : '').trim();
        let ngayTKB = tkbItem ? (tkbItem['Ngày'] || '') : (sdbItem ? (sdbItem['Ngày'] || '') : '');

        if (chuanHoaMon(monSDB) !== chuanHoaMon(monTKB)) {
            let moTaNgan = '';
            let moTaChiTiet = '';
            if (monSDB && monTKB) {
                moTaNgan = `SĐB [${monSDB}] ➔ TKB [${monTKB}]`;
                moTaChiTiet = `${slot.thu} (${slot.buoi} - Tiết ${slot.tiet}): Sổ đầu bài [${monSDB}] ➔ Thời khóa biểu [${monTKB}]` + (gvTKB ? ` (GV: ${gvTKB})` : '');
            } else if (monSDB && !monTKB) {
                moTaNgan = `SĐB [${monSDB}] ➔ TKB [Trống]`;
                moTaChiTiet = `${slot.thu} (${slot.buoi} - Tiết ${slot.tiet}): Sổ đầu bài [${monSDB}] ➔ Thời khóa biểu [Trống / Nghỉ]`;
            } else if (!monSDB && monTKB) {
                moTaNgan = `SĐB [Trống] ➔ TKB [${monTKB}]`;
                moTaChiTiet = `${slot.thu} (${slot.buoi} - Tiết ${slot.tiet}): Sổ đầu bài [Trống] ➔ Thời khóa biểu [${monTKB}]` + (gvTKB ? ` (GV: ${gvTKB})` : '');
            }

            dsKhacBiet.push({
                khoa: khoa,
                thu: slot.thu,
                buoi: slot.buoi,
                dataBuoi: slot.dataBuoi,
                tiet: slot.tiet,
                monCu: monSDB,
                monMoi: monTKB,
                gvMoi: gvTKB,
                ngay: ngayTKB,
                loaiKhacBiet: 'MON',
                moTaNgan: moTaNgan,
                moTaChiTiet: moTaChiTiet
            });
        } else if (monTKB !== '' && gvTKB !== '' && gvSDB !== '' && chuanHoaGv(gvSDB) !== chuanHoaGv(gvTKB)) {
            dsKhacBiet.push({
                khoa: khoa,
                thu: slot.thu,
                buoi: slot.buoi,
                dataBuoi: slot.dataBuoi,
                tiet: slot.tiet,
                monCu: monSDB,
                monMoi: monTKB,
                gvMoi: gvTKB,
                ngay: ngayTKB,
                loaiKhacBiet: 'GV',
                moTaNgan: `Môn [${monTKB}]: GV [${gvSDB}] ➔ [${gvTKB}]`,
                moTaChiTiet: `${slot.thu} (${slot.buoi} - Tiết ${slot.tiet}): Môn [${monTKB}] đổi GV [${gvSDB}] ➔ [${gvTKB}]`
            });
        }
    });

    return dsKhacBiet;
}
window.kiemTraKhacBietTkbVaSoDauBai = kiemTraKhacBietTkbVaSoDauBai;

// =========================================================================
// [HÀM ĐỒNG BỘ TKB VÀO SĐB]: CẬP NHẬT MÔN, PPCT, TÊN BÀI VÀ PHÂN CÔNG KÝ TÊN
// =========================================================================
function thucThiDongBoTkbVaoSoDauBai() {
    let daDangNhap = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
    if (!daDangNhap) {
        return alert("⚠️ Vui lòng đăng nhập qua nút Đăng nhập để thực hiện thao tác đồng bộ và chỉnh sửa trên Sổ đầu bài!");
    }
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    if (!tuanChon || !lopChon) return;
    
    if (window.kiemTraTuanDaKhoa(tuanChon)) {
        return alert(`⛔ Sổ đầu bài Tuần này đã bị khóa toàn trường. Không thể đồng bộ!`);
    }

    let dsKhacBiet = kiemTraKhacBietTkbVaSoDauBai(tuanChon, lopChon);
    if (!dsKhacBiet || dsKhacBiet.length === 0) {
        return alert("Thời khóa biểu và Sổ đầu bài hiện tại đã hoàn toàn trùng khớp!");
    }

    let chiTietXacNhan = dsKhacBiet.map(k => `- ${k.moTaChiTiet}`).join('\n');
    let hoiXacNhan = `🔄 XÁC NHẬN ĐỒNG BỘ THỜI KHÓA BIỂU VÀO SỔ ĐẦU BÀI:\n\n` +
        `Phát hiện ${dsKhacBiet.length} tiết học có sự thay đổi giữa Thời khóa biểu và Sổ đầu bài:\n\n` +
        chiTietXacNhan + `\n\n` +
        `Hệ thống sẽ:\n` +
        `1. Cập nhật chính xác Môn học thay thế và Giáo viên dạy theo Thời khóa biểu.\n` +
        `2. Tự động tính toán lại và đồng bộ liên hoàn Tiết PPCT chuẩn cho các môn có thay đổi.\n` +
        `3. Tự động gán Tên bài học chuẩn từ Phân phối chương trình tương ứng.\n` +
        `4. Cập nhật phân công để giáo viên phụ trách mới có quyền ký tên.\n\n` +
        `Đồng chí có chắc chắn muốn thực hiện đồng bộ?`;

    if (!confirm(hoiXacNhan)) return;

    let maxTuanChon = parseInt(tuanChon.replace(/\D/g, '')) || 0;
    let matchKhoiChon = lopChon.match(/\d+/);
    let khoiChon = matchKhoiChon ? matchKhoiChon[0] : '';
    let chuanHoaThu = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    // 1. Thu thập các môn bị ảnh hưởng trực tiếp từ sự thay đổi môn học
    let cacMonBiAnhHuong = new Set();
    dsKhacBiet.forEach(k => {
        if (k.monCu) cacMonBiAnhHuong.add(k.monCu.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' '));
        if (k.monMoi) cacMonBiAnhHuong.add(k.monMoi.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' '));
    });

    // 2. Tính cơ sở Tiết PPCT chuẩn của các môn trong tuần này trước khi thay đổi (ưu tiên lấy từ chính SĐB đã lưu của tuần này để không bị lệch do tuần nghỉ lễ)
    let boDemTietPPCT = {};
    duLieuTKBGopDaMap.forEach(d => {
        let t = parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) || 0;
        let maLop = String(d['Mã Lớp']).trim().toUpperCase();
        if (maLop === lopChon.toUpperCase() && t < maxTuanChon && d.DaLuu === true) {
            let mon = String(d['Môn Học']).trim();
            if (mon !== '') {
                let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                let tietLuu = parseInt(String(d['TietPPCT_Thuc']).replace(/\D/g, ''), 10) || 0;
                if (tietLuu > 0) {
                    boDemTietPPCT[monPPCT] = Math.max(boDemTietPPCT[monPPCT] || 0, tietLuu);
                } else {
                    boDemTietPPCT[monPPCT] = (boDemTietPPCT[monPPCT] || 0) + 1;
                }
            }
        }
    });

    // Nếu trong tuần hiện tại đã có tiết lưu của môn đó với Tiết PPCT hợp lệ, lấy (Tiết PPCT đầu tiên của tuần - 1) làm mốc chuẩn
    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2 };

    let tkbTuanNayTruoc = duLieuTKBGopDaMap.filter(d => 
        parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === maxTuanChon && 
        String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase()
    ).sort((a, b) => {
        let thuA = thuTuThu[chuanHoaThu(a['Thứ'])] || 99, thuB = thuTuThu[chuanHoaThu(b['Thứ'])] || 99;
        if (thuA !== thuB) return thuA - thuB;
        let bA = thuTuBuoi[String(a['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        let bB = thuTuBuoi[String(b['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        if (bA !== bB) return bA - bB;
        return (parseInt(String(a['Tiết']).replace(/\D/g, ''), 10) || 0) - (parseInt(String(b['Tiết']).replace(/\D/g, ''), 10) || 0);
    });

    let daGhiNhanMocTuanNay = new Set();
    let demTamTruoc = {};
    tkbTuanNayTruoc.forEach(d => {
        let mon = String(d['Môn Học'] || '').trim();
        if (mon !== '' && d.DaLuu === true) {
            let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
            demTamTruoc[monPPCT] = (demTamTruoc[monPPCT] || 0) + 1;
            let tietLuu = parseInt(String(d['TietPPCT_Thuc']).replace(/\D/g, ''), 10) || 0;
            if (tietLuu > 0 && !daGhiNhanMocTuanNay.has(monPPCT)) {
                let mocSuyRa = tietLuu - demTamTruoc[monPPCT];
                if (mocSuyRa >= 0) {
                    boDemTietPPCT[monPPCT] = mocSuyRa;
                    daGhiNhanMocTuanNay.add(monPPCT);
                }
            }
        }
    });

    // 3. Cập nhật môn và GV từ TKB vào duLieuTKBGopDaMap
    dsKhacBiet.forEach(k => {
        let index = duLieuTKBGopDaMap.findIndex(d => 
            parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === maxTuanChon &&
            String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase() &&
            chuanHoaThu(d['Thứ']) === k.thu &&
            (String(d['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều') === k.dataBuoi &&
            String(d['Tiết']).trim() === String(k.tiet)
        );

        if (index !== -1) {
            duLieuTKBGopDaMap[index]['Môn Học'] = k.monMoi;
            duLieuTKBGopDaMap[index]['Mã GV'] = k.gvMoi;
            duLieuTKBGopDaMap[index].TrangThaiThayDoi = true;
            duLieuTKBGopDaMap[index].DaDongBoTKB = true;
            if (k.monCu !== k.monMoi) {
                duLieuTKBGopDaMap[index]['ChuKy_Thuc'] = '';
                duLieuTKBGopDaMap[index]['NhanXet_Thuc'] = '';
                duLieuTKBGopDaMap[index]['XepLoai_Thuc'] = '';
                duLieuTKBGopDaMap[index]['TietPPCT_Thuc'] = '';
                duLieuTKBGopDaMap[index]['TenBai_Thuc'] = '';
            }
        } else if (k.monMoi) {
            // Tiết mới thêm từ TKB
            duLieuTKBGopDaMap.push({
                'Tuần': String(maxTuanChon),
                'Mã Lớp': lopChon.toUpperCase(),
                'Thứ': k.thu,
                'Buổi': k.dataBuoi,
                'Tiết': String(k.tiet),
                'Môn Học': k.monMoi,
                'MonHoc_GocSDB': '',
                'Mã GV': k.gvMoi,
                'Ngày': k.ngay || '',
                'TietPPCT_Thuc': '',
                'TenBai_Thuc': '',
                'NhanXet_Thuc': '',
                'XepLoai_Thuc': '',
                'ChuKy_Thuc': '',
                'ChuyenCan_Thuc': '',
                'DaLuu': false,
                'TrangThaiThayDoi': true,
                'DaDongBoTKB': true
            });
        }
    });

    // 4. Sắp xếp các tiết của tuần này theo thứ tự thời gian chuẩn xác
    let tkbTuanNay = duLieuTKBGopDaMap.filter(d => 
        parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === maxTuanChon && 
        String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase()
    ).sort((a, b) => {
        let thuA = thuTuThu[chuanHoaThu(a['Thứ'])] || 99, thuB = thuTuThu[chuanHoaThu(b['Thứ'])] || 99;
        if (thuA !== thuB) return thuA - thuB;
        let bA = thuTuBuoi[String(a['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        let bB = thuTuBuoi[String(b['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        if (bA !== bB) return bA - bB;
        return (parseInt(String(a['Tiết']).replace(/\D/g, ''), 10) || 0) - (parseInt(String(b['Tiết']).replace(/\D/g, ''), 10) || 0);
    });

    // 5. Đồng bộ liên hoàn Tiết PPCT và Tên bài chỉ cho những môn bị ảnh hưởng bởi sự thay đổi TKB
    let demTietMonTrongTuan = {};
    let soTietDongBoLienHoan = 0;

    tkbTuanNay.forEach(dong => {
        let mon = String(dong['Môn Học']).trim();
        if (mon !== '') {
            let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
            demTietMonTrongTuan[monPPCT] = (demTietMonTrongTuan[monPPCT] || 0) + 1;
            let tietPPCTChuan = (boDemTietPPCT[monPPCT] || 0) + demTietMonTrongTuan[monPPCT];

            let laMonBiAnhHuong = cacMonBiAnhHuong.has(monPPCT);
            let tietHienTai = dong['TietPPCT_Thuc'] ? parseInt(String(dong['TietPPCT_Thuc']).replace(/\D/g, ''), 10) : null;
            let canCapNhatPPCT = dong.DaDongBoTKB || !dong['TietPPCT_Thuc'] || (laMonBiAnhHuong && tietHienTai !== tietPPCTChuan);

            if (canCapNhatPPCT) {
                let tietCu = dong['TietPPCT_Thuc'];
                dong['TietPPCT_Thuc'] = tietPPCTChuan;
                let baiDay = timTenBaiChuanSDB(khoiChon, mon, tietPPCTChuan);
                dong['TenBai_Thuc'] = baiDay;
                dong.TrangThaiThayDoi = true;
                if (!dong.DaDongBoTKB && String(tietCu) !== String(tietPPCTChuan)) {
                    soTietDongBoLienHoan++;
                }
            } else if (!dong['TenBai_Thuc'] || dong['TenBai_Thuc'].trim() === '') {
                dong['TenBai_Thuc'] = timTenBaiChuanSDB(khoiChon, mon, tietHienTai || tietPPCTChuan);
                dong.TrangThaiThayDoi = true;
            }
        }
    });

    // 6. Cập nhật lại chỉ mục tra cứu nhanh và đánh dấu cờ chưa lưu toàn cục
    if (typeof window.xayDungChiMucNhanhSDB === 'function') {
        window.xayDungChiMucNhanhSDB();
    }
    coThayDoiChuaLuu_SDB = true;

    // 7. Kết xuất lại lưới giao diện
    thucThiKetXuatSoDauBaiLenLuoi();

// 8. Gắn icon cây bút và đánh dấu thay đổi trên tất cả các dòng vừa cập nhật
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (vungHienThi) {
        let cacDongTR = vungHienThi.querySelectorAll('tbody tr');
        cacDongTR.forEach(tr => {
            let oTiet = tr.querySelector('td[data-loai="tietSDB"]');
            let tietText = oTiet ? oTiet.innerText.trim() : '';
            let buoiAttr = tr.getAttribute('data-buoi') || '';
            let buoiNorm = buoiAttr.toLowerCase() === 'sáng' ? 'sáng' : 'chiều';

            let tdThu = tr.querySelector('td[rowspan]');
            let thuText = '';
            if (tdThu) {
                thuText = chuanHoaThu(tdThu.innerText.split('\n')[0].trim());
            } else {
                let prev = tr.previousElementSibling;
                while (prev) {
                    let pThu = prev.querySelector('td[rowspan]');
                    if (pThu) { thuText = chuanHoaThu(pThu.innerText.split('\n')[0].trim()); break; }
                    prev = prev.previousElementSibling;
                }
            }

            let dongTrongRam = tkbTuanNay.find(d => 
                chuanHoaThu(d['Thứ']) === thuText && 
                (String(d['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều') === buoiNorm && 
                String(d['Tiết']).trim() === tietText
            );

            if (dongTrongRam && (dongTrongRam.TrangThaiThayDoi === true || dongTrongRam.DaDongBoTKB === true)) {
                danhDauDongThayDoi(tr);
            }
        });
    }

    let thongBaoChiTietLienHoan = soTietDongBoLienHoan > 0 ? `\n- Hệ thống đã tự động đồng bộ liên hoàn Tiết PPCT và Tên bài cho ${soTietDongBoLienHoan} tiết khác trong tuần để loại bỏ hoàn toàn trùng bài dạy.` : '';
    alert(`✅ Đã đồng bộ thành công ${dsKhacBiet.length} tiết học từ Thời khóa biểu vào Sổ đầu bài!\n\n` +
          `- Môn học, Giáo viên phân công, Tiết PPCT và Tên bài học đã được cập nhật chuẩn xác.${thongBaoChiTietLienHoan}\n` +
          `- Các dòng thay đổi đã được gắn icon cây bút màu cam.\n` +
          `- Đồng chí vui lòng kiểm tra lại trên lưới và bấm "Lưu Sổ đầu bài" để chốt dữ liệu vĩnh viễn lên máy chủ.`);
}
window.thucThiDongBoTkbVaoSoDauBai = thucThiDongBoTkbVaoSoDauBai;

function thucThiKetXuatSoDauBaiLenLuoi() {
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    let inputNgay = document.getElementById('chonNgaySDB');
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');

    if (!tuanChon || !lopChon || !vungHienThi) return;
    if (inputNgay) {
        inputNgay.readOnly = true;
        inputNgay.classList.add('bg-slate-100', 'cursor-not-allowed');
    }

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);

    let maxTuanChon = parseInt(tuanChon.replace(/\D/g, '')) || 0;
    
    let boDemTietPPCT = {}; 
    let demTietTienDo = {}; 
    let lopChonUpper = lopChon.toUpperCase();
    let dsTietCuaLop = (chiMucLopSDB && chiMucLopSDB[lopChonUpper]) ? chiMucLopSDB[lopChonUpper] : duLieuTKBGopDaMap;
    
    dsTietCuaLop.forEach(d => {
        let t = d._tuanSo !== undefined ? d._tuanSo : (parseInt(String(d['Tuần']).replace(/\D/g, '')) || 0);
        let maLop = d._lopUpper !== undefined ? d._lopUpper : String(d['Mã Lớp']).trim().toUpperCase();

        if (maLop === lopChonUpper && t <= maxTuanChon) {
            let mon = String(d['Môn Học']).trim();
            if (mon !== '') {
                let monGocChuan = mon.toLowerCase().replace(/\s+/g, ' ');
                let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

                if (t < maxTuanChon) {
                    if (d.DaLuu === true) {
                        demTietTienDo[monGocChuan] = (demTietTienDo[monGocChuan] || 0) + 1;
                        let tietLuu = parseInt(String(d['TietPPCT_Thuc']).replace(/\D/g, ''), 10) || 0;
                        if (tietLuu > 0) {
                            boDemTietPPCT[monPPCT] = Math.max(boDemTietPPCT[monPPCT] || 0, tietLuu);
                        } else {
                            boDemTietPPCT[monPPCT] = (boDemTietPPCT[monPPCT] || 0) + 1;
                        }
                    }
                } else if (t === maxTuanChon) {
                    demTietTienDo[monGocChuan] = (demTietTienDo[monGocChuan] || 0) + 1;
                }
            }
        }
    });

    let matchKhoiChon = lopChon.match(/\d+/);
    let khoiChon = matchKhoiChon ? matchKhoiChon[0] : '';
    let dinhMucKhoiNay = dinhMucKhungCT[khoiChon] || {};
    let canhBaoHtml = ''; let hasCanhBao = false;

    if (maxTuanChon > 0) {
        for (let mon in dinhMucKhoiNay) {
            let dinhMuc = dinhMucKhoiNay[mon];
            let tietThucTe = demTietTienDo[mon] || 0; 
            let tietChuanDuKien = dinhMuc * maxTuanChon; 
            
            let doLech = tietThucTe - tietChuanDuKien;
            let tenMonIn = mon.charAt(0).toUpperCase() + mon.slice(1);

            if (doLech < 0) { 
                canhBaoHtml += `<span class="bg-red-100 text-red-700 font-bold px-3 py-1 rounded border border-red-200 shadow-sm flex items-center gap-1 text-xs whitespace-nowrap"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>${tenMonIn}: Thiếu ${Math.abs(doLech)} (tính đến hết tuần ${maxTuanChon})</span>`;
                hasCanhBao = true;
            } else if (doLech > 0) { 
                canhBaoHtml += `<span class="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded border border-orange-200 shadow-sm flex items-center gap-1 text-xs whitespace-nowrap"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>${tenMonIn}: Thừa ${doLech} (tính đến hết tuần ${maxTuanChon})</span>`;
                hasCanhBao = true;
            }
        }
    }

    let thanhCanhBaoRender = hasCanhBao ? `<div class="mb-3 p-2 bg-white border-l-4 border-red-500 shadow-sm text-sm flex flex-col md:flex-row md:items-center gap-3 w-full"><div class="flex items-center gap-2 flex-none"><div class="p-1 bg-red-100 rounded-full"><svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><span class="font-extrabold text-red-700 uppercase tracking-wide text-xs">Cảnh báo Tiến độ:</span></div><div class="flex flex-wrap gap-2 flex-1">${canhBaoHtml}</div></div>` : '';

    const thuTuThuKetXuat = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoiKetXuat = { "sáng": 1, "chiều": 2 };
    const chuanHoaThuKetXuat = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    let tkbTuanNay = (typeof window.layDsTietTheoTuanLopSDB === 'function')
        ? window.layDsTietTheoTuanLopSDB(maxTuanChon, lopChonUpper)
        : duLieuTKBGopDaMap.filter(d => 
            parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === maxTuanChon && 
            String(d['Mã Lớp']).trim().toUpperCase() === lopChonUpper
        );

    let soTietDaLuu = 0; let tongSoTietCoMon = 0;
    let dictTKB = {}; let mapNgayChinhXac = {}; 
    let coDayBuThu7 = false; let coDayBuChuNhat = false;
    let demTietMonTrongTuan = {};

    tkbTuanNay.forEach(dong => {
        let thuGoc = chuanHoaThuKetXuat(dong['Thứ']);
        if (thuGoc === 'Thứ 7') coDayBuThu7 = true;
        if (thuGoc === 'Chủ nhật') coDayBuChuNhat = true;
        if (dong['Ngày'] && dong['Ngày'] !== '' && dong['Ngày'] !== '...') mapNgayChinhXac[thuGoc] = dong['Ngày']; 
        let buoiKiemTra = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
        
        let mon = String(dong['Môn Học']).trim();
        if (mon !== '') {
            tongSoTietCoMon++;
            let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

            if (dong['DaLuu'] === true && !dong.DaDongBoTKB) {
                soTietDaLuu++;
            }

            demTietMonTrongTuan[monPPCT] = (demTietMonTrongTuan[monPPCT] || 0) + 1;
            let tietPPCTChuan = (boDemTietPPCT[monPPCT] || 0) + demTietMonTrongTuan[monPPCT];

            if (!dong['TietPPCT_Thuc'] || dong.DaDongBoTKB || dong['DaLuu'] !== true) {
                dong['TietPPCT_Thuc'] = tietPPCTChuan;
                if (!dong['TenBai_Thuc'] || dong['TenBai_Thuc'].trim() === '' || dong.DaDongBoTKB) {
                    dong['TenBai_Thuc'] = timTenBaiChuanSDB(khoiChon, mon, tietPPCTChuan);
                }
            } else {
                if (!dong['TenBai_Thuc'] || dong['TenBai_Thuc'].trim() === '') {
                    dong['TenBai_Thuc'] = timTenBaiChuanSDB(khoiChon, mon, dong['TietPPCT_Thuc']);
                }
            }
        }
        
        dictTKB[`${thuGoc}_${buoiKiemTra}_${dong['Tiết']}`] = dong;
    });

    // =========================================================================
    // [KHỐI MỚI 1]: KIỂM TRA TRẠNG THÁI KHÓA TUẦN & CẬP NHẬT BANNER / NÚT BẤM
    // =========================================================================
    let soBiKhoa = window.kiemTraTuanDaKhoa(tuanChon);
    let thongTinKhoa = duLieuKhoaSoToanCuc[maxTuanChon] || {};

    let btnKhoa = document.getElementById('btnKhoaSoDauBai');
    if (btnKhoa) {
        if (soBiKhoa) {
            btnKhoa.className = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs shadow transition duration-200 rounded flex items-center gap-1.5";
            btnKhoa.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg><span>Mở khóa Tuần ${maxTuanChon}</span>`;
        } else {
            btnKhoa.className = "bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 text-xs shadow transition duration-200 rounded flex items-center gap-1.5";
            btnKhoa.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Khóa Sổ Tuần ${maxTuanChon}</span>`;
        }
    }

    let theTrangThaiHtml = '';
    if (soBiKhoa) {
        let namHocHienThi = thongTinKhoa.namHoc ? ` (NĂM HỌC ${thongTinKhoa.namHoc})` : '';
        theTrangThaiHtml = `
            <div class="mb-4 p-3 bg-red-50 border-2 border-red-500 shadow-sm flex items-center justify-between rounded animate-pulse-once">
                <div class="flex items-center gap-3">
                    <div class="bg-red-600 text-white rounded-full p-1.5 shadow flex-none">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <div>
                        <span class="text-sm font-black text-red-900 tracking-wide uppercase block">SỔ ĐẦU BÀI TUẦN ${maxTuanChon}${namHocHienThi} TOÀN TRƯỜNG ĐÃ ĐƯỢC KHÓA (CHẾ ĐỘ CHỈ XEM)</span>
                        <span class="text-xs text-red-700 font-semibold">Người khóa: <b>${thongTinKhoa.nguoiThucHien || 'Ban Giám Hiệu'}</b> lúc ${thongTinKhoa.thoiGian || 'Gần đây'}. Toàn bộ các lớp đã được niêm phong, không thể chỉnh sửa.</span>
                    </div>
                </div>
                <span class="text-xs font-extrabold bg-red-200 text-red-900 border border-red-400 px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">Chỉ Xem</span>
            </div>`;
    } else if (tongSoTietCoMon > 0) {
        // [NÂNG CẤP ĐỐI CHIẾU SỰ KHÁC NHAU GIỮA SỔ ĐẦU BÀI ĐÃ LƯU VÀ THỜI KHÓA BIỂU]
        let dsKhacBiet = kiemTraKhacBietTkbVaSoDauBai(tuanChon, lopChon);

        if (soTietDaLuu > 0 && dsKhacBiet && dsKhacBiet.length > 0) {
            let chiTietTooltip = dsKhacBiet.map(k => k.moTaChiTiet).join('\n');
            let dsPillHtml = dsKhacBiet.map(k => `
                <span class="inline-flex items-center gap-1 bg-white text-amber-900 border border-amber-300 px-2 py-0.5 rounded shadow-xs text-xs font-semibold" title="${k.moTaChiTiet}">
                    <span class="font-bold text-blue-900">${k.thu} (${k.buoi} - T${k.tiet}):</span>
                    <span>${k.moTaNgan}</span>
                </span>
            `).join('');

            theTrangThaiHtml = `
                <div class="mb-4 p-3 bg-amber-50 border-2 border-amber-500 shadow-md rounded flex flex-col gap-2.5 animate-pulse-once">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5">
                            <div class="bg-amber-500 text-white rounded-full p-1.5 shadow flex-none animate-bounce-once">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <div>
                                <span class="text-sm font-black text-amber-900 tracking-wide uppercase block">PHÁT HIỆN ${dsKhacBiet.length} TIẾT THỜI KHÓA BIỂU CÓ THAY ĐỔI SO VỚI SỔ ĐẦU BÀI ĐÃ LƯU</span>
                                <span class="text-xs text-amber-800 font-semibold">Cần đồng bộ để giáo viên được phân công đúng môn và có quyền ký tên, đồng thời cập nhật tiết PPCT và tên bài.</span>
                            </div>
                        </div>
                        <button id="btnDongBoTkbVaoSdb" onclick="thucThiDongBoTkbVaoSoDauBai()" 
                                class="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2 text-xs shadow-md transition-all rounded-lg flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto cursor-pointer border border-amber-700 hover:scale-102"
                                title="${chiTietTooltip}">
                            <svg class="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Đồng bộ Thời khoá biểu (${dsKhacBiet.length} tiết thay đổi)</span>
                        </button>
                    </div>
                    <div class="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-1.5">
                        <span class="font-bold text-amber-900 text-xs flex-none">Chi tiết ${dsKhacBiet.length} tiết thay đổi:</span>
                        <div class="flex flex-wrap gap-1.5">${dsPillHtml}</div>
                    </div>
                </div>`;
        } else if (coThayDoiChuaLuu_SDB) {
            theTrangThaiHtml = `<div class="mb-4 p-2 bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded animate-pulse-once"><div class="flex items-center gap-2"><div class="bg-amber-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><span class="text-sm font-extrabold text-amber-800 tracking-wide uppercase">ĐÃ ĐỒNG BỘ THỜI KHÓA BIỂU (CÓ THAY ĐỔI CHƯA LƯU)</span></div><span class="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full border border-amber-400">⚠️ Vui lòng kiểm tra lại và bấm "Lưu Sổ đầu bài" để cập nhật vĩnh viễn lên máy chủ!</span></div>`;
        } else if (soTietDaLuu > 0) {
            theTrangThaiHtml = `<div class="mb-4 p-2 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-between rounded"><div class="flex items-center gap-2"><div class="bg-emerald-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><span class="text-sm font-extrabold text-emerald-800 tracking-wide uppercase">CÓ DỮ LIỆU ĐÃ ĐƯỢC CHỐT SỔ (ĐÃ TRÙNG KHỚP THỜI KHÓA BIỂU)</span></div><span class="text-xs font-semibold text-emerald-700 italic hidden sm:block">Các tiết đã Ký Tên sẽ bị khóa cứng. Các tiết chưa ký vẫn tiếp tục mở để chỉnh sửa.</span></div>`;
        } else {
            theTrangThaiHtml = `<div class="mb-4 p-2 bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded animate-pulse-once"><div class="flex items-center gap-2"><div class="bg-amber-500 rounded-full p-1"><svg class="w-3 h-3 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></div><span class="text-sm font-extrabold text-amber-800 tracking-wide uppercase">DỮ LIỆU MỚI TỊNH TIẾN (CHƯA LƯU)</span></div><span class="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full border border-amber-400">⚠️ Yêu cầu: Bấm "Đồng bộ Tên bài", Nhập Đánh giá, Ký tên và bấm "Lưu Sổ đầu bài" để lưu!</span></div>`;
        }
    }

    let tapHopMonDay = new Set();
    let maGvDangNhapLC = window.chuanHoaDinhDanhGiaoVien(madinhdanhGV);
    
    tkbTuanNay.forEach(dong => {
        let gvTkb = window.chuanHoaDinhDanhGiaoVien(dong['Mã GV']);
        let monHoc = String(dong['Môn Học']).trim();
        if (monHoc !== '') {
            let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
            if (quyenQuanTri || tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2)) {
                tapHopMonDay.add(monHoc);
            }
        }
    });

    let chuoiMonDay = tapHopMonDay.size > 0 ? Array.from(tapHopMonDay).join(', ') : '<span class="text-red-500 font-normal">Không có tiết dạy tại lớp này</span>';
    let theHienThiQuyen = `<div class="mb-4 p-2.5 bg-blue-50 border border-blue-300 shadow-sm text-sm rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-pulse-once"><div><span class="font-bold text-blue-800">Giáo viên:</span> <span class="text-blue-700 font-extrabold">${madinhdanhGV || 'Chưa nhận diện'}</span></div><div class="text-left sm:text-right sm:max-w-[70%]"><span class="font-bold text-blue-800">Được phân công dạy:</span> <span class="text-blue-700 font-semibold italic">${chuoiMonDay}</span></div></div>`;

    let danhSachThu = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    if (coDayBuThu7) danhSachThu.push("Thứ 7");
    if (coDayBuChuNhat) danhSachThu.push("Chủ nhật");

    let mienNgayHienTai = '';
    if (mapNgayChinhXac['Thứ 2']) {
        let p = mapNgayChinhXac['Thứ 2'].split('/');
        if (p.length === 3) mienNgayHienTai = `${p[2]}-${p[1]}-${p[0]}`; 
    } else {
        let keys = Object.keys(mapNgayChinhXac);
        if (keys.length > 0) {
            let thuBatKy = keys[0];
            let p = mapNgayChinhXac[thuBatKy].split('/');
            if (p.length === 3) {
                let d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
                let mapThuToDay = {"Thứ 2": 1, "Thứ 3": 2, "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6, "Chủ nhật": 0};
                let khoangCach = mapThuToDay[thuBatKy] - 1; 
                d.setDate(d.getDate() - khoangCach);
                mienNgayHienTai = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            }
        }
    }

    if (inputNgay && mienNgayHienTai) {
        inputNgay.value = mienNgayHienTai;
    }

    let ngayDauTieuDe = mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, "Thứ 2") : '...';
    let ngayCuoiTieuDe = mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, danhSachThu[danhSachThu.length - 1]) : '...';

    let htmlBang = `
        <div class="mb-8 bang-so-dau-bai-container overflow-x-auto">
            <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-slate-800 uppercase text-base header-lop">LỚP: ${lopChon}</span>
                <span class="text-center italic text-sm text-slate-600 flex-1 header-ngay">(Từ ngày ${ngayDauTieuDe} đến ngày ${ngayCuoiTieuDe})</span>
                <span class="font-bold text-slate-800 uppercase text-base header-tuan">TUẦN ${tuanChon.replace(/\D/g,'')}</span>
            </div>
            <table class="w-full min-w-[950px] border-collapse border border-gray-500 text-sm">
                <thead class="bg-slate-100 text-center font-bold">
                <tr>
                        <th class="border border-gray-500 p-2 w-20">THỨ</th>
                        <th class="border border-gray-500 p-2 w-10">TIẾT</th>
                        <th class="border border-gray-500 p-2 min-w-[80px] w-20">C.CẦN</th>
                        <th class="border border-gray-500 p-2 min-w-[140px] w-40">MÔN</th>
                        <th class="border border-gray-500 p-2 w-12">TIẾT PPCT</th>
                        <th class="border border-gray-500 p-2 min-w-[240px] w-1/2">TÊN BÀI DẠY</th>
                        <th class="border border-gray-500 p-2 min-w-[240px] w-1/2">NHẬN XÉT CỦA GV</th>
                        <th class="border border-gray-500 p-2 min-w-[85px] w-20">XẾP LOẠI</th>
                        <th class="border border-gray-500 p-2 min-w-[200px]">GIÁO VIÊN DẠY</th>
                    </tr>
                </thead>
                <tbody>
    `;

    danhSachThu.forEach(thu => {
        let ngayCuaThu = mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, thu) : '';
        let hienThiThu = ngayCuaThu ? `<span style="display: block;">${thu}</span><span style="display: block; font-size: 11pt; font-weight: normal;">${ngayCuaThu}</span>` : `<span style="display: block;">${thu}</span>`;
        let danhSachBuoi = [{ id: 'Sang', dataBuoi: 'Sáng', dsTiet: [1, 2, 3, 4, 5] }, { id: 'Chieu', dataBuoi: 'Chiều', dsTiet: [1, 2, 3, 4] }];
        let tongDongTrongNgay = 9; let daInCotThu = false;

        danhSachBuoi.forEach(buoiObj => {
            buoiObj.dsTiet.forEach(tiet => {
                let dongDuLieu = dictTKB[`${thu}_${buoiObj.id}_${tiet}`]; 
                let monHoc = dongDuLieu ? dongDuLieu['Môn Học'] : '';
                let tietPPCT = dongDuLieu ? dongDuLieu['TietPPCT_Thuc'] : '';
                let isDaLuu = dongDuLieu ? dongDuLieu['DaLuu'] : false;
                let tenBai = dongDuLieu ? dongDuLieu['TenBai_Thuc'] : '';
                let nhanXet = dongDuLieu ? dongDuLieu['NhanXet_Thuc'] : '';
                let xepLoai = dongDuLieu ? dongDuLieu['XepLoai_Thuc'] : '';
                let chuKy = dongDuLieu ? dongDuLieu['ChuKy_Thuc'] : '';
                let chuyenCan = dongDuLieu ? (dongDuLieu['ChuyenCan_Thuc'] || '') : '';
                
                // =========================================================================
                // [KHỐI MỚI 2]: KHÓA CỨNG Ô NẾU TUẦN ĐÃ KHÓA
                // =========================================================================
                let isLocked = soBiKhoa; 

                let gvTkb = dongDuLieu ? window.chuanHoaDinhDanhGiaoVien(dongDuLieu['Mã GV']) : '';
                let quyenNhapThuCong = false;
                
                if (quyenQuanTri) {
                    quyenNhapThuCong = true;
                } else if (monHoc !== '' && maGvDangNhapLC !== '') {
                    let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                    if (tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2)) {
                        quyenNhapThuCong = true;
                    }
                }
                
                let thuocVeGvHienTai = quyenNhapThuCong && !quyenQuanTri;
                let cssTenBai = ""; let theTenBai = "";
                let theNhanXet = ""; let theXepLoai = ""; let theChuKy = ""; let theChuyenCan = ""; 
                let theTietPPCT = ""; 
                
                if (monHoc && monHoc !== "") {
                    let monPPCT = monHoc.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

                    if (isLocked) {
                        cssTenBai = "text-emerald-700 font-bold";
                        theTenBai = `<span class="font-semibold text-slate-800">${tenBai}</span>`;
                        theChuyenCan = `<span class="font-bold text-slate-800 block text-center">${chuyenCan}</span>`;
                        theNhanXet = `<span class="font-normal text-slate-800 block">${nhanXet}</span>`;
                        theXepLoai = `<span class="font-bold text-slate-800 block text-center">${xepLoai}</span>`;
                        theChuKy = `<span class="font-bold text-slate-800 uppercase block text-center">${chuKy}</span>`;
                        theTietPPCT = `<span class="font-extrabold text-blue-700 block text-center">${tietPPCT}</span>`; 
                    } else {
                        let trangThaiKhoa = !quyenNhapThuCong ? "disabled" : "";
                        let cssNenKhoa = !quyenNhapThuCong ? "bg-transparent cursor-not-allowed opacity-70" : "bg-transparent";
                        let placeholderText = !quyenNhapThuCong ? "Không có quyền" : "Nhập...";

                        theTenBai = `<textarea rows="1" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-semibold text-slate-800 placeholder-slate-400 px-1 resize-none overflow-hidden align-middle" placeholder="${placeholderText}">${tenBai}</textarea>`;
                        theChuyenCan = `<input type="text" ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-semibold text-slate-800 placeholder-slate-400" placeholder="..." value="${chuyenCan}">`;
                        theNhanXet = `<textarea rows="1" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-normal text-slate-800 placeholder-slate-400 px-1 resize-none overflow-hidden align-middle" placeholder="Nhận xét...">${nhanXet}</textarea>`;
                        
                        let monHocAnToan = monHoc.replace(/'/g, "\\'"); 
                        let onfocusLogic = `moKhungTruotPPCT(event, this, '${khoiChon}', '${monHocAnToan}', this.value || ${parseInt(tietPPCT) || (boDemTietPPCT[monPPCT] || 1)})`;
                        
                        theTietPPCT = `<input type="text" onclick="${onfocusLogic}" readonly ${trangThaiKhoa} 
                                        class="w-full text-center outline-none ${cssNenKhoa} font-extrabold text-blue-700 placeholder-blue-300 transition-all cursor-pointer hover:bg-blue-50" 
                                        placeholder="..." value="${tietPPCT}">`;
                                              
                        let optTot = (xepLoai === 'Tốt') ? 'selected' : '';
                        let optKha = (xepLoai === 'Khá') ? 'selected' : '';
                        let optTB = (xepLoai === 'TB') ? 'selected' : '';
                        let optYeu = (xepLoai === 'Yếu') ? 'selected' : '';
                        
                        theXepLoai = `<select ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-bold text-slate-800 cursor-pointer appearance-none"><option value="" ${!xepLoai ? 'selected' : ''}>-Chọn-</option><option value="Tốt" ${optTot}>Tốt</option><option value="Khá" ${optKha}>Khá</option><option value="TB" ${optTB}>TB</option><option value="Yếu" ${optYeu}>Yếu</option></select>`;
                        
                        let onfocusChuKy = `moKhungTruotChuKy(event, this)`;
                        theChuKy = `<div class="relative flex items-center justify-center w-full h-full">
                                        <input type="text" autocomplete="off" ${trangThaiKhoa} data-thuocve="${thuocVeGvHienTai}" 
                                            class="w-full text-center outline-none transition-colors duration-300 rounded ${cssNenKhoa} font-semibold text-blue-700 placeholder-blue-300 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 pr-5" 
                                            placeholder="${!quyenNhapThuCong ? 'Không có quyền' : 'Ghi rõ họ tên...'}" value="${chuKy}" 
                                            onclick="${onfocusChuKy}" 
                                            oninput="locDanhSachChuKy(this)">
                                        ${!quyenNhapThuCong ? '' : `<svg class="w-4 h-4 absolute right-1 text-blue-400 pointer-events-none opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`}
                                    </div>`;
                    }
                }

                let isCuoiBuoi = (tiet === buoiObj.dsTiet[buoiObj.dsTiet.length - 1]);
                let kieuVienNgang = isCuoiBuoi ? "solid" : "dashed";
                let doDayVienNgang = isCuoiBuoi ? "2px" : "1px";
                let styleVien = `border-left: 1px solid #6b7280 !important; border-right: 1px solid #6b7280 !important; border-bottom: ${doDayVienNgang} ${kieuVienNgang} #6b7280 !important; border-top: none !important;`;
                
                let isThayDoiRow = dongDuLieu ? (dongDuLieu.TrangThaiThayDoi === true || dongDuLieu.DaDongBoTKB === true) : false;
                let strThayDoi = isThayDoiRow ? "true" : "false";
                let iconSuaChua = isThayDoiRow ? `<svg class="icon-sua-chua w-4 h-4 inline-block ml-1 text-amber-600 animate-pulse pointer-events-none drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Dòng dữ liệu này đang được chỉnh sửa hoặc vừa đồng bộ TKB"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>` : '';

                htmlBang += `<tr class="hover:bg-slate-50 transition-colors duration-150 group" data-buoi="${buoiObj.dataBuoi}" data-daluu="${isDaLuu}" data-thaydoi="${strThayDoi}">`;
                
                if (!daInCotThu) {
                    htmlBang += `<td class="text-center font-bold uppercase leading-tight bg-white group-hover:bg-slate-50" style="border: 1px solid #6b7280 !important; border-bottom: 2px solid #6b7280 !important;" rowspan="${tongDongTrongNgay}">${hienThiThu}</td>`;
                    daInCotThu = true;
                }

                htmlBang += `
                    <td class="text-center p-1 bg-white group-hover:bg-slate-50" style="${styleVien}" title="Buổi ${buoiObj.dataBuoi}" data-loai="tietSDB">${tiet}</td>
                    <td class="text-center p-1 bg-white group-hover:bg-slate-50 align-middle" style="${styleVien}" data-loai="chuyenCan">${theChuyenCan}</td>
                    <td class="p-1 font-bold text-center text-slate-900 bg-white group-hover:bg-slate-50" style="${styleVien}" data-loai="mon">${monHoc}${iconSuaChua}</td>
                    <td class="p-1 bg-white group-hover:bg-slate-50 align-middle" style="${styleVien}" data-loai="tiet">${theTietPPCT}</td>
                    <td class="p-1 ${cssTenBai} bg-white group-hover:bg-slate-50 align-middle" style="white-space: normal; word-wrap: break-word; ${styleVien}" data-loai="tenBai" data-islocked="${isLocked}" data-coquyensua="${quyenNhapThuCong}">${theTenBai}</td>
                    <td class="p-1 bg-white group-hover:bg-slate-50 align-middle" style="white-space: normal; word-wrap: break-word; ${styleVien}" data-loai="nhanXet">${theNhanXet}</td>
                    <td class="p-1 bg-white group-hover:bg-slate-50 align-middle text-center" style="${styleVien}" data-loai="xepLoai">${theXepLoai}</td>
                    <td class="p-1 bg-white group-hover:bg-slate-50 align-middle text-center" style="${styleVien}" data-loai="chuKy">${theChuKy}</td>
                </tr>`;
            });
        });
    });

    htmlBang += `</tbody></table></div>`;

    // =========================================================================
    // [KHỐI MỚI]: TỔNG HỢP TỰ ĐỘNG & CHỮ KÝ GVCN (SH DM_LOP -> CỘT B DM_GV) / BGH (QUYỀN KHÓA SỔ)
    // =========================================================================
    let demTot = 0, demKha = 0, demTB = 0, demYeu = 0, tongSoTietThucHien = 0;
    let khongThucHienSang = 0, khongThucHienChieu = 0;
    tkbTuanNay.forEach(d => {
        if (String(d['Môn Học'] || '').trim() !== '') {
            tongSoTietThucHien++;
            let tenBai = String(d['TenBai_Thuc'] || '').trim();
            let xl = String(d['XepLoai_Thuc'] || '').trim();
            let chuKy = String(d['ChuKy_Thuc'] || '').trim();
            if (xl === 'Tốt') demTot++;
            else if (xl === 'Khá') demKha++;
            else if (xl === 'TB') demTB++;
            else if (xl === 'Yếu') demYeu++;

            // Số tiết không thực hiện: tiết thiếu tên bài HOẶC thiếu xếp loại HOẶC thiếu ký tên (tương ứng Sáng / Chiều)
            if (tenBai === '' || xl === '' || xl === '-Chọn-' || chuKy === '') {
                let buoiNorm = String(d['Buổi'] || '').trim().toLowerCase();
                if (buoiNorm === 'sáng') khongThucHienSang++;
                else khongThucHienChieu++;
            }
        }
    });
    let tongGioXepLoai = demTot + demKha + demTB + demYeu;
    let tongTietKhongThucHien = khongThucHienSang + khongThucHienChieu;

    let khoaTongHop = `${maxTuanChon}_${lopChon.toUpperCase()}`;
    let tongHopData = (window.duLieuTongHopSDB && window.duLieuTongHopSDB[khoaTongHop])
        ? window.duLieuTongHopSDB[khoaTongHop]
        : { nxGVCN: '', kyGVCN: '', nxBGH: '', kyBGH: '', daLuu: false };

    // 1. Tra cứu GVCN của lớp từ DM_LOP (Cột C) và quy đổi sang Họ tên đầy đủ ở Cột B sheet DM_GIAOVIEN
    let maGvcnCuaLop = tuDienGvcnTheoLopToanCuc[lopChon.toUpperCase()] ||
                       ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu.GVCN_THEO_LOP && thongSoHocVu.GVCN_THEO_LOP[lopChon]) ? thongSoHocVu.GVCN_THEO_LOP[lopChon] : '') ||
                       ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.GVCN_THEO_LOP && window.thongSoHocVu.GVCN_THEO_LOP[lopChon]) ? window.thongSoHocVu.GVCN_THEO_LOP[lopChon] : '');
    let tenDayDuGvcnCuaLop = window.layHoTenDayDuGiaoVienSDB(maGvcnCuaLop);
    let tenDayDuNguoiDangNhap = window.layHoTenDayDuGiaoVienSDB(theChotQuyen?.getAttribute('data-tendinhdanh') || madinhdanhGV);

    let maGvDangNhapLC_Ky = window.chuanHoaDinhDanhGiaoVien(madinhdanhGV);
    let tenGvDangNhapLC_Ky = window.chuanHoaDinhDanhGiaoVien(tenDayDuNguoiDangNhap);
    let isGVCN = quyenQuanTri;
    if (!isGVCN && maGvcnCuaLop !== '' && (maGvDangNhapLC_Ky !== '' || tenGvDangNhapLC_Ky !== '')) {
        let tapHopGvcn = window.chuanHoaDinhDanhGiaoVien(maGvcnCuaLop).split(/[,;&-]/).map(g => g.trim()).filter(Boolean);
        let hoTenGvcnNorm = window.chuanHoaDinhDanhGiaoVien(tenDayDuGvcnCuaLop);
        if (hoTenGvcnNorm) tapHopGvcn.push(hoTenGvcnNorm);
        isGVCN = tapHopGvcn.includes(maGvDangNhapLC_Ky) ||
                 tapHopGvcn.includes(tenGvDangNhapLC_Ky) ||
                 tapHopGvcn.some(g => (maGvDangNhapLC_Ky.includes(g) || tenGvDangNhapLC_Ky.includes(g)) && g.length > 2);
    }

    // Tên đầy đủ để gán khi ấn icon bút ở cột GVCN: ưu tiên Họ tên đầy đủ của GVCN lớp đó từ cột B DM_GIAOVIEN
    let tenKyGvcnTuDong = (tenDayDuGvcnCuaLop || tenDayDuNguoiDangNhap || '').replace(/'/g, "\\'");

    // 2. Kiểm tra quyền BGH: là người được phân quyền Khóa Sổ đầu bài (btnKhoaSoDauBai) trong ma trận phân quyền hoặc Quản trị viên
    let isBGH = quyenQuanTri ||
                quyenKhoaSdbServer ||
                (theChotQuyen && theChotQuyen.getAttribute('data-quyenkhoasdb') === 'true') ||
                (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) ||
                (typeof window.quyenSuaChua !== 'undefined' && window.quyenSuaChua) ||
                (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut && quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                (typeof window.quyenChiTiet !== 'undefined' && window.quyenChiTiet.nut && window.quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                (typeof layQuyenCongKhaiHienTai === 'function' && layQuyenCongKhaiHienTai().nut && layQuyenCongKhaiHienTai().nut.includes('btnKhoaSoDauBai')) ||
                (typeof window.layQuyenCongKhaiHienTai === 'function' && window.layQuyenCongKhaiHienTai().nut && window.layQuyenCongKhaiHienTai().nut.includes('btnKhoaSoDauBai'));

    let tenKyBghTuDong = (tenDayDuNguoiDangNhap || '').replace(/'/g, "\\'");

    let htmlChuKy = `
    <div id="khuVucChuKySDB" class="mt-4 text-[16px] text-black w-full" style="font-family: 'Times New Roman', Times, serif; page-break-inside: avoid;">
        <table class="w-full border-none" style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
                <td style="width: 50%; vertical-align: top; border: none; padding-right: 15px; text-align: left;">
                    <div class="font-bold mb-1">Ý kiến nhận xét của giáo viên chủ nhiệm lớp:</div>
                    <textarea id="txtNxGVCN" class="w-full bg-transparent outline-none resize-none overflow-hidden mb-1 ${!isGVCN || soBiKhoa ? 'pointer-events-none' : ''}" placeholder="${!isGVCN ? '' : 'Nhập nhận xét...'}" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px'; coThayDoiChuaLuu_SDB=true;" ${!isGVCN || soBiKhoa ? 'readonly' : ''} style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${tongHopData.nxGVCN}</textarea>
                    
                    <div class="font-bold whitespace-nowrap mt-1">
                        Người ký: <input type="text" id="txtKyGVCN" class="bg-transparent outline-none inline-block ${!isGVCN || soBiKhoa ? 'pointer-events-none' : ''}" value="${tongHopData.kyGVCN}" oninput="coThayDoiChuaLuu_SDB=true;" ${!isGVCN || soBiKhoa ? 'readonly' : ''} style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 16px; width: calc(100% - 90px);">
                    </div>
                    
                    ${!soBiKhoa && isGVCN ? `<button type="button" onclick="kichHoatGhiNhanXet('GVCN', '${tenKyGvcnTuDong}')" class="mt-2 p-1 hover:bg-slate-200 rounded transition-colors cursor-pointer hide-on-print inline-block" title="Ghi nhận xét và ký tên tự động (GVCN: ${tenDayDuGvcnCuaLop || tenDayDuNguoiDangNhap})"><img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='22' height='22'><rect x='2' y='2' width='12' height='13' fill='%23e2f0fe' stroke='%235b8bcf' stroke-width='1'/><line x1='4' y1='4' x2='12' y2='4' stroke='%234db34d' stroke-width='1.5'/><line x1='4' y1='7' x2='8' y2='7' stroke='%23ffffff' stroke-width='1.5'/><line x1='4' y1='10' x2='7' y2='10' stroke='%23ffffff' stroke-width='1.5'/><path d='M14 5 L15 6 L8 13 L6 13 L6 11 Z' fill='%23ffce44' stroke='%23d49e1e' stroke-width='0.5'/><polygon points='14,5 15,6 13,8 12,7' fill='%23ffb429'/><path d='M6 13 L4 14 L6 11 Z' fill='%23e0c7a3'/><circle cx='4.5' cy='13.5' r='0.5' fill='%23333'/></svg>" alt="Ký"></button>` : ''}
                </td>
                <td style="width: 50%; vertical-align: top; border: none; padding-left: 15px; text-align: left;">
                    <div class="font-bold mb-1">Ý kiến nhận xét của BGH:</div>
                    <textarea id="txtNxBGH" class="w-full bg-transparent outline-none resize-none overflow-hidden mb-1 ${!isBGH || soBiKhoa ? 'pointer-events-none' : ''}" placeholder="${!isBGH ? '' : 'Nhập nhận xét...'}" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px'; coThayDoiChuaLuu_SDB=true;" ${!isBGH || soBiKhoa ? 'readonly' : ''} style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${tongHopData.nxBGH}</textarea>
                    
                    <div class="font-bold whitespace-nowrap mt-1">
                        Người ký: <input type="text" id="txtKyBGH" class="bg-transparent outline-none inline-block ${!isBGH || soBiKhoa ? 'pointer-events-none' : ''}" value="${tongHopData.kyBGH}" oninput="coThayDoiChuaLuu_SDB=true;" ${!isBGH || soBiKhoa ? 'readonly' : ''} style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 16px; width: calc(100% - 90px);">
                    </div>
                    
                    ${!soBiKhoa && isBGH ? `<button type="button" onclick="kichHoatGhiNhanXet('BGH', '${tenKyBghTuDong}')" class="mt-2 p-1 hover:bg-slate-200 rounded transition-colors cursor-pointer hide-on-print inline-block" title="Ghi nhận xét và ký tên tự động (BGH: ${tenDayDuNguoiDangNhap})"><img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='22' height='22'><rect x='2' y='2' width='12' height='13' fill='%23e2f0fe' stroke='%235b8bcf' stroke-width='1'/><line x1='4' y1='4' x2='12' y2='4' stroke='%234db34d' stroke-width='1.5'/><line x1='4' y1='7' x2='8' y2='7' stroke='%23ffffff' stroke-width='1.5'/><line x1='4' y1='10' x2='7' y2='10' stroke='%23ffffff' stroke-width='1.5'/><path d='M14 5 L15 6 L8 13 L6 13 L6 11 Z' fill='%23ffce44' stroke='%23d49e1e' stroke-width='0.5'/><polygon points='14,5 15,6 13,8 12,7' fill='%23ffb429'/><path d='M6 13 L4 14 L6 11 Z' fill='%23e0c7a3'/><circle cx='4.5' cy='13.5' r='0.5' fill='%23333'/></svg>" alt="Ký"></button>` : ''}
                </td>
            </tr>
        </table>

        <div class="font-bold mt-2 text-[16px]" style="line-height: 1.6;" id="khuVucThongKeSDB">
            <div>- Tổng số tiết học trong tuần: <span class="font-normal italic">${tongSoTietThucHien} .</span></div>
            <div>- Tổng số tiết không thực hiện: <span class="font-normal italic">${tongTietKhongThucHien} . (Sáng: ${khongThucHienSang}, Chiều: ${khongThucHienChieu})</span></div>
            <div>- Tổng số giờ xếp loại: <span class="font-normal italic">${tongGioXepLoai}/${tongSoTietThucHien} [${demTot} Tốt; ${demKha} Khá ; ${demTB} Đạt/TB; ${demYeu} Yếu]</span></div>
        </div>
    </div>`;

    vungHienThi.innerHTML = theTrangThaiHtml + thanhCanhBaoRender + theHienThiQuyen + htmlBang + htmlChuKy;
    vungHienThi.querySelectorAll('.bang-so-dau-bai-container table tbody tr').forEach(tr => {
        if (typeof window.capNhatMauChuDongDaKy === 'function') window.capNhatMauChuDongDaKy(tr);
    });
    
    // =========================================================================
    // [KHỐI MỚI 3]: KHÓA NÚT LƯU VÀ ĐỒNG BỘ NẾU TUẦN ĐÃ KHÓA
    // =========================================================================
    let btnLuu = document.getElementById('btnLuuSoDauBai');
    let btnDongBo = document.getElementById('btnDongBoTenBai');
    if (btnLuu) {
        btnLuu.disabled = soBiKhoa;
        if (soBiKhoa) {
            btnLuu.classList.add('opacity-40', 'cursor-not-allowed');
            btnLuu.title = "Sổ đầu bài tuần này đã bị khóa chuyên môn toàn trường, không thể lưu";
        } else {
            btnLuu.classList.remove('opacity-40', 'cursor-not-allowed');
            btnLuu.title = "Chốt dữ liệu Sổ đầu bài này lưu vĩnh viễn vào CSDL";
        }
    }
    if (btnDongBo) {
        btnDongBo.disabled = soBiKhoa;
        if (soBiKhoa) {
            btnDongBo.classList.add('opacity-40', 'cursor-not-allowed');
            btnDongBo.title = "Sổ đầu bài tuần này đã bị khóa chuyên môn toàn trường, không thể đồng bộ";
        } else {
            btnDongBo.classList.remove('opacity-40', 'cursor-not-allowed');
            btnDongBo.title = "Kéo Tên bài học từ PPCT dựa trên Tiết trên màn hình";
        }
    }

    setTimeout(() => {
        let cacOVanBan = vungHienThi.querySelectorAll('textarea');
        // Tối ưu hóa: Loại bỏ Layout Thrashing bằng cách tách pha style reset và đọc scrollHeight
        cacOVanBan.forEach(ta => {
            ta.style.height = 'auto';
        });
        requestAnimationFrame(() => {
            cacOVanBan.forEach(ta => {
                ta.style.height = (ta.scrollHeight) + 'px';
            });
        });

        // Tối ưu hiệu năng: Sử dụng Ủy quyền sự kiện (Event Delegation) duy nhất trên vungHienThi thay vì gắn 600 listener rời rạc
        if (!vungHienThi.getAttribute('data-sdb-delegated')) {
            vungHienThi.setAttribute('data-sdb-delegated', 'true');
            const xuLySuKienTrenLuoi = (e) => {
                let target = e.target;
                if (!target || !target.matches('textarea, input, select')) return;
                let tChon = document.getElementById('chonTuanSo')?.value;
                if (window.kiemTraTuanDaKhoa(tChon)) return;
                coThayDoiChuaLuu_SDB = true;
                if (target.id !== 'txtNxGVCN' && target.id !== 'txtKyGVCN' && target.id !== 'txtNxBGH' && target.id !== 'txtKyBGH') {
                    let dongTr = target.closest('tr');
                    danhDauDongThayDoi(dongTr);
                    if (typeof window.capNhatMauChuDongDaKy === 'function') window.capNhatMauChuDongDaKy(dongTr);
                    if (typeof capNhatThongKeSDBTrenLuoi === 'function') {
                        capNhatThongKeSDBTrenLuoi();
                    }
                }
            };
            vungHienThi.addEventListener('input', xuLySuKienTrenLuoi);
            vungHienThi.addEventListener('change', xuLySuKienTrenLuoi);
        }
    }, 50);
}

async function luuSoDauBaiSangMayChu() {
    let daDangNhap = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
    if (!daDangNhap) {
        return alert("⚠️ Vui lòng đăng nhập qua nút Đăng nhập để thực hiện thao tác chỉnh sửa và lưu Sổ đầu bài!");
    }
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    if (!tuanChon || !lopChon) return alert("Vui lòng chọn Tuần và Lớp trước khi lưu!");
    if (window.kiemTraTuanDaKhoa(tuanChon)) {
        return alert(`⛔ TỪ CHỐI THAO TÁC:\n\nSổ đầu bài TUẦN ${tuanChon.replace(/\D/g, '')} của toàn trường ĐÃ BỊ KHÓA bởi Quản lý chuyên môn.\n\nĐồng chí không thể sửa đổi hoặc lưu đè dữ liệu!`);
    }

    let tuanSo = parseInt(tuanChon.replace(/\D/g, ''));
    let tuanHeThong = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.TUAN_HIEN_TAI) ? parseInt(window.thongSoHocVu.TUAN_HIEN_TAI) : 999;
    
    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);
    let maGvDangNhapLC = window.chuanHoaDinhDanhGiaoVien(madinhdanhGV);

    let duLieuQuetDuoc = [];
    let danhSachThongBao = []; 
    let soDongCoThayDoi = 0; 
    let canThiTietThieuTenBai = false; 
    let loiPhanQuyen = false;

    // BƯỚC 1: QUÉT UI (DOM) VÀ ĐÓNG GÓI CHỈ NHỮNG DÒNG CÓ THAY ĐỔI
    let cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');
    cacBang.forEach(khungBang => {
        let thuHienTai = ''; let ngayHienTai = '';
        let cacDong = khungBang.querySelectorAll('table tbody tr');
        
        cacDong.forEach(dong => {
            let cellThu = dong.querySelector('td[rowspan]');
            if (cellThu) {
                let textThuNgay = cellThu.innerText.split('\n');
                let thuGoc = textThuNgay[0].trim().toLowerCase();
                thuHienTai = thuGoc.charAt(0).toUpperCase() + thuGoc.slice(1);
                ngayHienTai = textThuNgay.length > 1 ? textThuNgay[1].trim() : '';
            }

            let cellMon = dong.querySelector('td[data-loai="mon"]');
            let mon = '';
            if (cellMon) {
                for (let node of cellMon.childNodes) {
                    if (node.nodeType === 3) mon += node.textContent;
                }
                mon = mon.trim();
            }

            let isDaLuu = dong.getAttribute('data-daluu') === 'true';
            let isThayDoi = dong.getAttribute('data-thaydoi') === 'true';

            if (mon !== '' || (isDaLuu && isThayDoi)) {

                let getVal = (cell) => {
                    if (!cell) return '';
                    let theNhap = cell.querySelector('input, select, textarea');
                    let rawVal = theNhap ? theNhap.value : cell.innerText;
                    return rawVal.replace(/\n/g, ' ').trim(); 
                };

                let tiet = getVal(dong.querySelector('td[data-loai="tietSDB"]'));
                let chuyenCan = getVal(dong.querySelector('td[data-loai="chuyenCan"]'));
                let tietPPCT = getVal(dong.querySelector('td[data-loai="tiet"]'));
                let tenBai = getVal(dong.querySelector('td[data-loai="tenBai"]'));
                let nhanXetGV = getVal(dong.querySelector('td[data-loai="nhanXet"]'));
                let xepLoaiGV = getVal(dong.querySelector('td[data-loai="xepLoai"]'));
                let chuKyGV = getVal(dong.querySelector('td[data-loai="chuKy"]'));
                let buoi = dong.getAttribute('data-buoi') || 'Sáng';

                let chuanHoaThu = String(thuHienTai).trim().toLowerCase();
                let chuanHoaBuoi = String(buoi).trim().toLowerCase();
                let chuanHoaLop = String(lopChon).trim().toUpperCase();

                let indexTrongRam = duLieuTKBGopDaMap.findIndex(d => 
                    parseInt(String(d['Tuần']).replace(/\D/g, '')) === tuanSo && 
                    String(d['Mã Lớp']).trim().toUpperCase() === chuanHoaLop && 
                    String(d['Thứ']).trim().toLowerCase() === chuanHoaThu && 
                    String(d['Buổi']).trim().toLowerCase() === chuanHoaBuoi && 
                    String(d['Tiết']).trim() === String(tiet).trim()
                );

                // Kiểm tra quyền chữ ký (đồng bộ chuẩn hóa dấu tiếng Việt)
                if (chuKyGV !== '' && (isThayDoi || !isDaLuu)) {
                    if (!quyenQuanTri && indexTrongRam !== -1) {
                        let gvTkb = window.chuanHoaDinhDanhGiaoVien(duLieuTKBGopDaMap[indexTrongRam]['Mã GV']);
                        let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                        let coQuyen = tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2);
                        if (!coQuyen) {
                            loiPhanQuyen = true;
                            dong.classList.add('bg-red-100'); 
                        }
                    }
                }

                // Điền tên bài tự động nếu thiếu
                if (chuKyGV !== '' && tuanSo < tuanHeThong && tenBai === '') {
                    canThiTietThieuTenBai = true;
                    let matchKhoi = lopChon.match(/\d+/);
                    let khoi = matchKhoi ? matchKhoi[0] : '';
                    let baiDayChuan = timTenBaiChuanSDB(khoi, mon, tietPPCT);
                    
                    if (baiDayChuan !== '') {
                        let theTextarea = dong.querySelector('td[data-loai="tenBai"] textarea');
                        if (theTextarea) {
                            theTextarea.value = baiDayChuan;
                            theTextarea.style.height = 'auto';
                            theTextarea.style.height = (theTextarea.scrollHeight) + 'px';
                        }
                        tenBai = baiDayChuan.replace(/\n/g, ' ').trim(); 
                        isThayDoi = true;
                        if (typeof danhDauDongThayDoi === 'function') danhDauDongThayDoi(dong);
                    }
                }

                if (isThayDoi || !isDaLuu) {
                    soDongCoThayDoi++;
                    danhSachThongBao.push(`- ${thuHienTai} (${buoi}), Tiết ${tiet}: ${mon}`);
                    
                    let namHocHienTai = namHocHeThongSDB || ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) ? window.thongSoHocVu.NAM_HOC : (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC ? thongSoHocVu.NAM_HOC : ''));
                    let chuCaiDauThu = chuanHoaThu.charAt(0).toUpperCase() + chuanHoaThu.slice(1);
                    let chuCaiDauBuoi = chuanHoaBuoi.charAt(0).toUpperCase() + chuanHoaBuoi.slice(1);
                    let maLuuTruDinhDanh = `${namHocHienTai ? namHocHienTai + '_' : ''}${tuanSo}_${chuanHoaLop}_${chuCaiDauThu}_${chuCaiDauBuoi}_${tiet}`;
                    
                    duLieuQuetDuoc.push({
                        maLuuTru: maLuuTruDinhDanh, 
                        namHoc: namHocHienTai,
                        tuan: tuanSo, 
                        maLop: chuanHoaLop,
                        thu: chuCaiDauThu, 
                        ngay: ngayHienTai, 
                        buoi: chuCaiDauBuoi, 
                        tiet: tiet,
                        mon: mon, 
                        tietPPCT: tietPPCT, 
                        tenBai: tenBai, 
                        nhanXet: nhanXetGV, 
                        xepLoai: xepLoaiGV, 
                        chuKy: chuKyGV,
                        chuyenCan: chuyenCan
                    });

                    if (indexTrongRam !== -1) {
                        duLieuTKBGopDaMap[indexTrongRam]['Mã Lưu Trữ'] = maLuuTruDinhDanh; 
                        duLieuTKBGopDaMap[indexTrongRam]['Ngày'] = ngayHienTai;
                        duLieuTKBGopDaMap[indexTrongRam]['ChuyenCan_Thuc'] = chuyenCan;
                        duLieuTKBGopDaMap[indexTrongRam]['TietPPCT_Thuc'] = tietPPCT;
                        duLieuTKBGopDaMap[indexTrongRam]['TenBai_Thuc'] = tenBai;
                        duLieuTKBGopDaMap[indexTrongRam]['NhanXet_Thuc'] = nhanXetGV;
                        duLieuTKBGopDaMap[indexTrongRam]['XepLoai_Thuc'] = xepLoaiGV;
                        duLieuTKBGopDaMap[indexTrongRam]['ChuKy_Thuc'] = chuKyGV;
                        duLieuTKBGopDaMap[indexTrongRam]['TrangThaiThayDoi'] = true;
                    }
                }
            }
        });
    });

    // ----------------------------------------------------
    // BƯỚC 2: KIỂM TRA & ĐÓNG GÓI KHỐI NHẬN XÉT - CHỮ KÝ TỔNG HỢP CUỐI TUẦN (CHƯA CÓ GHI MỚI, ĐÃ CÓ GHI ĐÈ)
    // ----------------------------------------------------
    let txtNxGVCN = document.getElementById('txtNxGVCN');
    let txtKyGVCN = document.getElementById('txtKyGVCN');
    let txtNxBGH = document.getElementById('txtNxBGH');
    let txtKyBGH = document.getElementById('txtKyBGH');
    let duLieuTongHopMoi = null;
    let khoaTongHopLuu = `${tuanSo}_${String(lopChon).trim().toUpperCase()}`;

    if (txtNxGVCN || txtKyGVCN || txtNxBGH || txtKyBGH) {
        let valNxGVCN = txtNxGVCN ? txtNxGVCN.value.trim() : '';
        let valKyGVCN = txtKyGVCN ? txtKyGVCN.value.trim() : '';
        let valNxBGH = txtNxBGH ? txtNxBGH.value.trim() : '';
        let valKyBGH = txtKyBGH ? txtKyBGH.value.trim() : '';

        let currentTongHop = (window.duLieuTongHopSDB && window.duLieuTongHopSDB[khoaTongHopLuu])
            ? window.duLieuTongHopSDB[khoaTongHopLuu]
            : null;

        let daCoBanGhiTongHop = !!(currentTongHop && currentTongHop.daLuu);
        let coNoiDungTongHop = (valNxGVCN !== '' || valKyGVCN !== '' || valNxBGH !== '' || valKyBGH !== '');
        let coThayDoiTongHop = false;

        if (!daCoBanGhiTongHop) {
            // Chưa có bản ghi lưu trước đó: nếu có nhập nội dung nhận xét hoặc ký tên thì ghi mới
            if (coNoiDungTongHop) coThayDoiTongHop = true;
        } else {
            // Đã có bản ghi lưu trước đó: nếu bất kỳ trường nào thay đổi thì ghi đè
            if (valNxGVCN !== String(currentTongHop.nxGVCN || '').trim() ||
                valKyGVCN !== String(currentTongHop.kyGVCN || '').trim() ||
                valNxBGH !== String(currentTongHop.nxBGH || '').trim() ||
                valKyBGH !== String(currentTongHop.kyBGH || '').trim()) {
                coThayDoiTongHop = true;
            }
        }

        if (coThayDoiTongHop) {
            let namHocHienTai = namHocHeThongSDB || ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) ? window.thongSoHocVu.NAM_HOC : (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC ? thongSoHocVu.NAM_HOC : ''));
            let maLopUpper = String(lopChon).trim().toUpperCase();
            let maLuuTruTH = `${namHocHienTai ? namHocHienTai + '_' : ''}${tuanSo}_${maLopUpper}_TONGHOP`;

            duLieuQuetDuoc.push({
                maLuuTru: maLuuTruTH,
                namHoc: namHocHienTai,
                tuan: tuanSo,
                maLop: maLopUpper,
                thu: 'TONGHOP',
                ngay: '',
                buoi: 'TONGHOP',
                tiet: 'TONGHOP',
                mon: 'Tổng hợp đánh giá tuần',
                tietPPCT: valNxGVCN,
                tenBai: valKyGVCN,
                nhanXet: valNxBGH,
                xepLoai: valKyBGH,
                chuKy: '',
                chuyenCan: ''
            });

            duLieuTongHopMoi = {
                nxGVCN: valNxGVCN,
                kyGVCN: valKyGVCN,
                nxBGH: valNxBGH,
                kyBGH: valKyBGH,
                maLuuTru: maLuuTruTH,
                daLuu: true
            };

            soDongCoThayDoi++;
            danhSachThongBao.push(`- Nhận xét & Chữ ký tổng hợp tuần (${daCoBanGhiTongHop ? 'Ghi đè cập nhật' : 'Ghi mới'})`);
        }
    }

    if (loiPhanQuyen) return alert("Cảnh báo nghiệp vụ: Phát hiện Chữ ký tại Tiết học không thuộc quyền phân công. Vui lòng kiểm tra lại!");
    if (canThiTietThieuTenBai) return alert("Phát hiện sổ tuần bị bỏ trống Tên bài. Hệ thống đã điền tự động. Vui lòng kiểm tra lại trên lưới và bấm Lưu lần nữa để xác nhận!");
    if (soDongCoThayDoi === 0) return alert("Sổ đầu bài chưa có thay đổi nào để lưu.");

    let thongBaoGiaoDien = `Hệ thống ghi nhận ${soDongCoThayDoi} mục có sự thay đổi/cập nhật dữ liệu:\n\n` + 
                          danhSachThongBao.slice(0, 15).join('\n') + 
                          (danhSachThongBao.length > 15 ? `\n... và ${danhSachThongBao.length - 15} thay đổi khác.` : "") + 
                          `\n\nĐồng chí có chắc chắn muốn chốt ghi đè dữ liệu này lên Server?`;
                          
    if (!confirm(thongBaoGiaoDien)) return;

    const btn = document.getElementById('btnLuuSoDauBai');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="ml-1">Đang lưu...</span>`;
    btn.disabled = true;

    try {
        let namHocLuu = namHocHeThongSDB || ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) ? window.thongSoHocVu.NAM_HOC : (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC ? thongSoHocVu.NAM_HOC : ''));
        const payload = { 
            thaoTac: 'luuSoDauBaiDongBo', 
            tuan: tuanChon.replace(/\D/g, ''), 
            namHoc: namHocLuu,
            lop: lopChon, 
            duLieu: duLieuQuetDuoc,
            emailTruyCap: (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') ? window.dinhDanhGiaoVienToanCuc : madinhdanhGV
        };
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
        const ketQua = await phanHoi.json();

        if (ketQua.trangThai === 'thanh_cong') {
            coThayDoiChuaLuu_SDB = false; 

            // Cập nhật chính xác bộ nhớ cục bộ của khối nhận xét (chưa có thì ghi mới, đã có thì ghi đè)
            if (duLieuTongHopMoi) {
                if (!window.duLieuTongHopSDB) window.duLieuTongHopSDB = {};
                window.duLieuTongHopSDB[khoaTongHopLuu] = duLieuTongHopMoi;
            }
            
            duLieuTKBGopDaMap.forEach(d => { 
                let t = parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) || 0;
                let maLop = String(d['Mã Lớp']).trim().toUpperCase();
                if (t === tuanSo && maLop === lopChon.toUpperCase()) {
                    d.DaLuu = true;
                    delete d.TrangThaiThayDoi;
                    delete d.DaDongBoTKB;
                } else if (d.TrangThaiThayDoi || d.DaDongBoTKB) { 
                    d.DaLuu = true; 
                    delete d.TrangThaiThayDoi; 
                    delete d.DaDongBoTKB;
                } 
            });
            
            if (typeof window.xayDungChiMucNhanhSDB === 'function') {
                window.xayDungChiMucNhanhSDB();
            }
            if (typeof capNhatSoDauBaiNgamLenLuoi === 'function') {
                capNhatSoDauBaiNgamLenLuoi(tuanChon, lopChon);
            }
        } else throw new Error(ketQua.thongBao);
    } catch (loi) { 
        alert("Lưu thất bại: " + loi.message); 
    } finally { 
        btn.innerHTML = textGoc; btn.disabled = false; 
    }
}

function dongBoTenBaiHoc() {
    let daDangNhap = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
    if (!daDangNhap) {
        return alert("⚠️ Vui lòng đăng nhập qua nút Đăng nhập để thực hiện thao tác đồng bộ tên bài trên Sổ đầu bài!");
    }
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    if (window.kiemTraTuanDaKhoa(tuanChon)) {
        return alert(`⛔ Sổ đầu bài Tuần này đã bị khóa toàn trường. Không thể đồng bộ tên bài!`);
    }
    const btn = document.getElementById('btnDongBoTenBai');
    let textGoc = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="ml-1">Đang xử lý...</span>`;
        btn.disabled = true;
    }

    setTimeout(() => {
        let lopChon = document.getElementById('chonLopSo')?.value;
        if (!lopChon) {
            if (btn) { btn.innerHTML = textGoc; btn.disabled = false; }
            return;
        }
        
        let matchKhoi = lopChon.match(/\d+/);
        let khoi = matchKhoi ? matchKhoi[0] : '';
        let cacDong = document.querySelectorAll('#vungHienThiSoDauBai tbody tr');
        
        const timTenBaiChuan = (monHoc, tietPPCT) => {
            let monGoc = monHoc.trim().toLowerCase().replace(/\s+/g, ' ');
            let monKhongSoCuoi = monGoc.replace(/\s*\d+$/, '').trim();
            let keys = Object.keys(tuDienPPCTToanCuc);

            let khoaChinhXac = `${khoi}_${monGoc}_${tietPPCT}`;
            if (tuDienPPCTToanCuc[khoaChinhXac]) return tuDienPPCTToanCuc[khoaChinhXac];
            
            for (let i = 0; i < keys.length; i++) {
                let k = keys[i];
                let parts = k.split('_');
                if (parts.length === 3 && parts[0] === khoi && parts[2] === String(tietPPCT)) {
                    if (parts[1] === monGoc) return tuDienPPCTToanCuc[k];
                }
            }

            if (monGoc !== monKhongSoCuoi) { 
                let khoaDuPhong = `${khoi}_${monKhongSoCuoi}_${tietPPCT}`;
                if (tuDienPPCTToanCuc[khoaDuPhong]) return tuDienPPCTToanCuc[khoaDuPhong];
                
                for (let i = 0; i < keys.length; i++) {
                    let k = keys[i];
                    let parts = k.split('_');
                    if (parts.length === 3 && parts[0] === khoi && parts[2] === String(tietPPCT)) {
                        if (parts[1] === monKhongSoCuoi) return tuDienPPCTToanCuc[k];
                    }
                }
            }
            return '';
        };
        
        cacDong.forEach(dong => {
            let oMon = dong.querySelector('td[data-loai="mon"]');
            let oTiet = dong.querySelector('td[data-loai="tiet"]');
            let oTenBai = dong.querySelector('td[data-loai="tenBai"]');
            
            if (oMon && oTiet && oTenBai) {
                let mon = oMon.innerText.trim();
                let theNhapTiet = oTiet.querySelector('input, select, textarea');
                let tiet = theNhapTiet ? theNhapTiet.value.trim() : oTiet.innerText.trim();
                
                if (mon !== '' && tiet !== '') {
                    let baiDayChuan = timTenBaiChuan(mon, tiet);

                    if (baiDayChuan !== '') {
                        let isLocked = oTenBai.getAttribute('data-islocked') === 'true';
                        let theTextarea = oTenBai.querySelector('textarea');
                        
                        if (isLocked) {
                            if (oTenBai.innerText.trim() === '') {
                                oTenBai.innerText = baiDayChuan;
                                oTenBai.classList.add('text-emerald-700', 'font-bold');
                            }
                        } else {
                            if (theTextarea && theTextarea.value.trim() === '' && !theTextarea.disabled) {
                                theTextarea.value = baiDayChuan;
                                document.activeElement.blur(); 
                                theTextarea.style.height = 'auto';
                                theTextarea.style.height = (theTextarea.scrollHeight) + 'px';
                                coThayDoiChuaLuu_SDB = true; 
                                // [NÂNG CẤP]: Gọi cây bút hiển thị trên dòng
                                danhDauDongThayDoi(dong);
                            }
                        }
                    }
                }
            } 
        }); 
        
        if (typeof capNhatThongKeSDBTrenLuoi === 'function') {
            capNhatThongKeSDBTrenLuoi();
        }
        if (btn) { 
            btn.innerHTML = textGoc; 
            btn.disabled = false; 
        }
    }, 150); 
}

function chonMucPPCT(soTiet, tenBai, event) {
    if (event) event.stopPropagation(); 
    let daThayDoi = false;
    if (trangThaiKhungPPCT.inputTiet) {
        trangThaiKhungPPCT.inputTiet.value = soTiet;
        coThayDoiChuaLuu_SDB = true; 
        daThayDoi = true;
    }
    if (trangThaiKhungPPCT.inputTenBai && tenBai !== 'Chưa có dữ liệu bài dạy') {
        trangThaiKhungPPCT.inputTenBai.value = tenBai;
        trangThaiKhungPPCT.inputTenBai.style.height = 'auto';
        trangThaiKhungPPCT.inputTenBai.style.height = (trangThaiKhungPPCT.inputTenBai.scrollHeight) + 'px';
        coThayDoiChuaLuu_SDB = true; 
        daThayDoi = true;
    }
    
    // [NÂNG CẤP]: Gắn cờ và biểu tượng khi chọn từ menu thả
    if (daThayDoi && trangThaiKhungPPCT.inputTiet) {
        danhDauDongThayDoi(trangThaiKhungPPCT.inputTiet.closest('tr'));
        if (typeof capNhatThongKeSDBTrenLuoi === 'function') {
            capNhatThongKeSDBTrenLuoi();
        }
    }
    
    dongKhungTruotPPCT(); 
}

function chonMucChuKy(tenGv, event) {
    if (event) {
        event.preventDefault(); 
        event.stopPropagation();
    }
    if (trangThaiKhungChuKy.inputChuKy) {
        trangThaiKhungChuKy.inputChuKy.value = tenGv;
        coThayDoiChuaLuu_SDB = true; 
        
        // [NÂNG CẤP]: Gắn cờ và biểu tượng khi chọn chữ ký
        danhDauDongThayDoi(trangThaiKhungChuKy.inputChuKy.closest('tr'));
        
        let ev = new Event('input', { bubbles: true});
        trangThaiKhungChuKy.inputChuKy.dispatchEvent(ev);
        
        // Hủy mờ sau khi chọn xong và cập nhật màu đen rõ nét cho dòng đã ký
        trangThaiKhungChuKy.inputChuKy.classList.remove('text-slate-400', 'opacity-60');
        if (typeof window.capNhatMauChuDongDaKy === 'function') {
            window.capNhatMauChuDongDaKy(trangThaiKhungChuKy.inputChuKy.closest('tr'));
        }
    }
    dongKhungTruotChuKy();
}

function xuatWordSoDauBai() {
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (!vungHienThi || vungHienThi.innerText.includes('Vui lòng chọn')) return alert("Không có dữ liệu để xuất!");

    let tuanChon = document.getElementById('chonTuanSo').value;
    let lopChon = document.getElementById('chonLopSo').value;

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);
    
    let coQuyenTaiXuong = quyenQuanTri;
    if (!coQuyenTaiXuong && madinhdanhGV) {
        let maGvDangNhapLC = madinhdanhGV.trim().toLowerCase().normalize('NFC');
        let tkbTuanNay = duLieuTKBGopDaMap.filter(d => String(d['Tuần']).trim() === tuanChon && String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase());
        
        coQuyenTaiXuong = tkbTuanNay.some(dong => {
            let monHoc = String(dong['Môn Học']).trim();
            if (monHoc === '') return false;
            let gvTkb = String(dong['Mã GV']).trim().toLowerCase().normalize('NFC');
            let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
            return tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2);
        });
    }

    if (!coQuyenTaiXuong) {
        return alert("Từ chối truy cập: Đồng chí không có tiết dạy tại lớp này nên không được cấp quyền xuất Sổ đầu bài!");
    }

    let preHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Sổ Đầu Bài</title>
        <style>
            @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 0.8in 0.8in 0.8in 0.8in; }
            div.WordSection1 { page: WordSection1; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: "Times New Roman", Times, serif; font-size: 12pt; }
            th, td { border: 1px solid black; padding: 6px; }
            th { text-align: center; font-weight: bold; background-color: #f1f5f9; }
            .text-center { text-align: center; }
            
            /* Bố cục CSS phân chia làm 3 cột bằng nhau để dàn đều trên Word */
            .flex { display: table; width: 100%; margin-bottom: 15px; font-family: "Times New Roman", Times, serif; }
            .justify-between span { display: table-cell; vertical-align: middle; width: 33.33%; }
            .justify-between span:nth-child(1) { text-align: left; font-weight: bold; font-size: 14pt; text-transform: uppercase; }
            .justify-between span:nth-child(2) { text-align: center; font-style: italic; font-size: 12pt; }
            .justify-between span:last-child { text-align: right; font-weight: bold; font-size: 14pt; text-transform: uppercase; }
        </style>
        </head><body><div class='WordSection1'>
    `;
    
    let noiDungClone = vungHienThi.cloneNode(true);
    let canhBaoNode = noiDungClone.querySelector('.border-red-500');
    if (canhBaoNode) canhBaoNode.remove();

    // 1. Quét và ép toàn bộ các ô Nhập liệu (input, select, textarea) thành Văn bản Word
    let cacTagGoc = vungHienThi.querySelectorAll('input, textarea, select');
    let cacTagClone = noiDungClone.querySelectorAll('input, textarea, select');
    cacTagGoc.forEach((tag, idx) => {
        if (cacTagClone[idx]) {
            let val = tag.value ? tag.value.trim() : "";
            // Xóa sạch rác hệ thống
            if (val === "" || val === "-Chọn-" || val === "--") {
                val = "";
            }
            // Chuyển ký tự Enter (\n) trong Textarea thành thẻ <br> để Word hiển thị đúng nhiều dòng
            val = val.replace(/\n/g, "<br>");
            cacTagClone[idx].outerHTML = `<span style="font-family: 'Times New Roman', serif;">${val}</span>`;
        }
    });

    // 2. Can thiệp sâu vào Cột THỨ để ép thẻ <br> chuẩn xác cho MS Word
    let cacCellThu = noiDungClone.querySelectorAll('td[rowspan]');
    cacCellThu.forEach(cell => {
        // Lấy chữ thuần túy trong ô (VD: THỨ 228/09/2026)
        let textTrongCell = cell.innerText || cell.textContent;
        
        // Dùng Regex tách chuẩn xác [2-7] và chèn thẻ <br> của HTML
        let fixText = textTrongCell.replace(/(THỨ\s*[2-7]|CHỦ NHẬT)\s*(\d{2}\/\d{2}\/\d{4})/gi, "$1<br><span style='font-size: 11pt; font-weight: normal;'>$2</span>");
        
        cell.innerHTML = fixText;
        cell.style.textAlign = "center";
        cell.style.verticalAlign = "middle";
    });

    // 3. Dọn dẹp DOM cho Word
    // Xóa các nút bấm (Cái bút) để tránh lỗi hình ảnh trên Word
    noiDungClone.querySelectorAll('button').forEach(btn => btn.remove());
    
    // Xóa các class Tailwind CSS dư thừa để bảng Word sạch sẽ và không bị loạn định dạng
    noiDungClone.querySelectorAll('table:not([style*="border: none"]), th, td:not([style*="border: none"]), tr').forEach(el => {
        el.removeAttribute('class');
    });

    let htmlContent = preHtml + noiDungClone.innerHTML + "</div></body></html>";
    let blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SoDauBai_Lop${lopChon}_Tuan${tuanChon.replace(/\D/g,'')}.doc`;
    link.click();
}

async function xuatExcelSoDauBai() {
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (!vungHienThi || vungHienThi.innerText.includes('Vui lòng chọn')) return alert("Không có dữ liệu để xuất!");

    let tuanChon = document.getElementById('chonTuanSo').value;
    let lopChon = document.getElementById('chonLopSo').value;

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);
    
    let coQuyenTaiXuong = quyenQuanTri;
    if (!coQuyenTaiXuong && madinhdanhGV) {
        let maGvDangNhapLC = madinhdanhGV.trim().toLowerCase().normalize('NFC');
        let tkbTuanNay = duLieuTKBGopDaMap.filter(d => String(d['Tuần']).trim() === tuanChon && String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase());
        
        coQuyenTaiXuong = tkbTuanNay.some(dong => {
            let monHoc = String(dong['Môn Học']).trim();
            if (monHoc === '') return false;
            let gvTkb = String(dong['Mã GV']).trim().toLowerCase().normalize('NFC');
            let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
            return tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2);
        });
    }

    if (!coQuyenTaiXuong) {
        return alert("Từ chối truy cập: Đồng chí không có tiết dạy tại lớp này nên không được cấp quyền xuất Sổ đầu bài!");
    }

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
        const worksheet = workbook.addWorksheet('SO_DAU_BAI');
        
        const cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');
        
        if(cacBang.length === 0) return alert("Không có dữ liệu để xuất!");
        let rowIndex = 1;

        cacBang.forEach(khungBang => {
            let rowHeader1 = worksheet.getRow(rowIndex);
            
            let txtLop = khungBang.querySelector('.header-lop') ? khungBang.querySelector('.header-lop').innerText : '';
            let txtTuan = khungBang.querySelector('.header-tuan') ? khungBang.querySelector('.header-tuan').innerText : '';
            
            rowHeader1.getCell(1).value = txtLop + '                ' + txtTuan;
            rowHeader1.font = { name: 'Times New Roman', size: 14, bold: true };
            worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
            rowIndex++;

            let rowHeader2 = worksheet.getRow(rowIndex);
            let txtNgay = khungBang.querySelector('.header-ngay') ? khungBang.querySelector('.header-ngay').innerText : '';
            
            rowHeader2.getCell(1).value = txtNgay;
            rowHeader2.font = { name: 'Times New Roman', size: 12, italic: true };
            rowHeader2.getCell(1).alignment = { horizontal: 'center' };
            worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
            rowIndex++;

            const rows = khungBang.querySelectorAll('table tr');
            rows.forEach((tr, idx) => {
                let rData = [];
                tr.querySelectorAll('th, td').forEach(cell => {
                    let theNhap = cell.querySelector('input, select, textarea');
                    let giaTriCell = "";
                    
                    // Ưu tiên đọc dữ liệu người dùng gõ
                    if (theNhap) {
                        giaTriCell = theNhap.value;
                    } else {
                        giaTriCell = cell.innerText;
                    }
                    
                    // Xử lý và làm sạch dữ liệu
                    if (giaTriCell && typeof giaTriCell === 'string') {
                        giaTriCell = giaTriCell.trim();
                        // 1. Xóa rác hệ thống (Chữ "-Chọn-")
                        if (giaTriCell === "-Chọn-" || giaTriCell === "--") {
                            giaTriCell = "";
                        }
                        
                        // 2. Ép Regex tách riêng chữ Thứ và Ngày xuống dòng an toàn
                        giaTriCell = giaTriCell.replace(/(THỨ\s*[2-7]|CHỦ NHẬT)\s*(\d{2}\/\d{2}\/\d{4})/gi, "$1\n$2");
                        
                        // 3. Chống Crash Excel do nhận diện nhầm dấu (+, -, =) thành công thức toán học
                        if (/^[=+\-@]/.test(giaTriCell)) {
                            giaTriCell = "'" + giaTriCell;
                        }
                    }
                    
                    rData.push(giaTriCell || "");
                });

                if(idx > 0 && rData.length < 9) rData.unshift(''); 

                let row = worksheet.addRow(rData);
                row.font = { name: 'Times New Roman', size: 12 };
                
                if (idx === 0) {
                    row.font = { bold: true, name: 'Times New Roman' };
                    row.alignment = { vertical: 'middle', horizontal: 'center' };
                }

               // NÂNG CẤP: ĐỊNH DẠNG NÉT KẺ BẢNG EXCEL (Nét đứt ngang giữa các tiết, nét liền dọc)
                let thuocBuoi = tr.getAttribute('data-buoi') || '';
                let tietHienTai = parseInt(rData[1]); // rData[1] luôn là số tiết học

                row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                    if (idx === 0) {
                        // Dòng tiêu đề bảng (THỨ, TIẾT, MÔN...) luôn kẻ nét liền 4 cạnh
                        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    } else {
                        // Xét viền ngang cho các dòng nội dung tiết học
                        let kieuVienTren = (tietHienTai === 1) ? 'thin' : 'dashed'; // Bắt đầu buổi -> nét liền
                        let kieuVienDuoi = 'dashed'; // Mặc định giữa các tiết -> nét đứt
                        
                        // Xác định tiết cuối cùng của mỗi buổi để đóng nét liền
                        if ((thuocBuoi === 'Sáng' && tietHienTai === 5) || (thuocBuoi === 'Chiều' && tietHienTai === 4)) {
                            kieuVienDuoi = 'thin'; 
                        }
                        
                        if (colNumber === 1) {
                            // Cột THỨ sẽ gộp ô (Merge Cells) nên thiết lập nét liền
                            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                        } else {
                            // Các cột còn lại: Nét dọc luôn liền ('thin'), nét ngang đứt ('dashed') hoặc liền tùy vị trí
                            cell.border = { 
                                top: {style: kieuVienTren}, 
                                left: {style:'thin'}, 
                                bottom: {style: kieuVienDuoi}, 
                                right: {style:'thin'} 
                            };
                        }
                    }

                    if([1, 2, 3, 4, 5, 8, 9].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    else cell.alignment = { vertical: 'middle', wrapText: true };
                    if (colNumber === 2) cell.numFmt = '@'; 
                });
                rowIndex++;
            });

            // =========================================================================
            // NÂNG CẤP: BỔ SUNG CHÂN CHỮ KÝ VÀ THỐNG KÊ VÀO EXCEL (Căn chỉnh BGH cột G)
            // =========================================================================
            let nxGVCN = document.getElementById('txtNxGVCN') ? document.getElementById('txtNxGVCN').value : '';
            let kyGVCN = document.getElementById('txtKyGVCN') ? document.getElementById('txtKyGVCN').value : '';
            let nxBGH = document.getElementById('txtNxBGH') ? document.getElementById('txtNxBGH').value : '';
            let kyBGH = document.getElementById('txtKyBGH') ? document.getElementById('txtKyBGH').value : '';

            rowIndex++; 
            
            // Dòng 1: Tiêu đề
            let rowTieuDeKy = worksheet.getRow(rowIndex);
            rowTieuDeKy.getCell(1).value = "Ý kiến nhận xét của giáo viên chủ nhiệm lớp:";
            rowTieuDeKy.getCell(7).value = "Ý kiến nhận xét của BGH:";
            rowTieuDeKy.font = { name: 'Times New Roman', size: 14, bold: true };
            worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
            worksheet.mergeCells(`G${rowIndex}:I${rowIndex}`);
            rowIndex++;

            // Dòng 2: Nội dung nhận xét
            let rowNhanXet = worksheet.getRow(rowIndex);
            rowNhanXet.getCell(1).value = nxGVCN;
            rowNhanXet.getCell(7).value = nxBGH;
            rowNhanXet.font = { name: 'Times New Roman', size: 13 };
            rowNhanXet.alignment = { wrapText: true, vertical: 'top' };
            rowNhanXet.height = 40;
            worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
            worksheet.mergeCells(`G${rowIndex}:I${rowIndex}`);
            rowIndex++;

            // Dòng 3: Người ký
            let rowNguoiKy = worksheet.getRow(rowIndex);
            rowNguoiKy.getCell(1).value = "Người ký: " + kyGVCN;
            rowNguoiKy.getCell(7).value = "Người ký: " + kyBGH;
            rowNguoiKy.font = { name: 'Times New Roman', size: 14, bold: true };
            worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
            worksheet.mergeCells(`G${rowIndex}:I${rowIndex}`);
            rowIndex += 2; 

            // Khối Thống kê dưới cùng
            let vungThongKe = document.getElementById('khuVucThongKeSDB');
            if (vungThongKe) {
                let divsThongKe = vungThongKe.querySelectorAll('div');
                divsThongKe.forEach(div => {
                    let rawText = div.innerText.trim();
                    let rowStat = worksheet.getRow(rowIndex);
                    
                    let parts = rawText.split(': ');
                    if (parts.length > 1) {
                        rowStat.getCell(1).value = {
                            'richText': [
                                {'font': {'bold': true, 'name': 'Times New Roman', 'size': 13}, 'text': parts[0] + ': '},
                                {'font': {'italic': true, 'name': 'Times New Roman', 'size': 13}, 'text': parts.slice(1).join(': ')}
                            ]
                        };
                    } else {
                        rowStat.getCell(1).value = rawText;
                        rowStat.font = { name: 'Times New Roman', size: 13, bold: true };
                    }
                    
                    worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
                    rowIndex++;
                });
            }
            rowIndex += 2;
        });

        worksheet.eachRow((row, rowNumber) => {
            let val = row.getCell(1).value;
            let valUpper = (val && typeof val === 'string') ? val.toUpperCase() : '';
            // Gộp ô (Merge Cells) cho cột THỨ
            if (valUpper && (valUpper.startsWith('THỨ ') || valUpper.startsWith('CHỦ NHẬT')) && valUpper !== 'THỨ') {
                let rowsToMerge = 0;
                while(worksheet.getCell(rowNumber + rowsToMerge + 1, 1).value === '') {
                    if(worksheet.getCell(rowNumber + rowsToMerge + 1, 2).value === null) break;
                    rowsToMerge++;
                }
                if (rowsToMerge > 0) worksheet.mergeCells(`A${rowNumber}:A${rowNumber + rowsToMerge}`);
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
        });

        worksheet.getColumn(1).width = 10;
        worksheet.getColumn(2).width = 6;
        worksheet.getColumn(3).width = 8;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 10;
        worksheet.getColumn(6).width = 40; 
        worksheet.getColumn(7).width = 25; 
        worksheet.getColumn(8).width = 10; 
        worksheet.getColumn(9).width = 15; 

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SoDauBai_Lop${lopChon}_Tuan${tuanChon.replace(/\D/g,'')}.xlsx`;
        link.click();

    } catch (loi) {
        console.error(loi);
        alert("Có lỗi khi tạo tệp Excel!");
    }
}

function napDropdownSoDauBai() {
    let tapHopTuan = new Set(); let tapHopLop = new Set();
    duLieuTKBGopDaMap.forEach(dong => {
        if (dong['Tuần']) tapHopTuan.add(String(dong['Tuần']).trim());
        if (dong['Mã Lớp']) tapHopLop.add(String(dong['Mã Lớp']).trim());
    });

    // [NÂNG CẤP]: Thuật toán sắp xếp tuần giảm dần (từ tuần lớn nhất đến tuần nhỏ nhất)
    let mangTuan = Array.from(tapHopTuan).sort((a, b) => parseInt(b.replace(/\D/g,'')) - parseInt(a.replace(/\D/g,'')));
    let mangLop = Array.from(tapHopLop).sort();

    let chonTuanHtml = `<option value="" disabled selected>-- Chọn Tuần --</option>` + mangTuan.map(t => `<option value="${t}">Tuần ${t.replace(/\D/g,'')}</option>`).join('');
    let chonLopHtml = `<option value="" disabled selected>-- Chọn Lớp --</option>` + mangLop.map(l => `<option value="${l}">Lớp ${l}</option>`).join('');

    let elementTuan = document.getElementById('chonTuanSo');
    let elementLop = document.getElementById('chonLopSo');
    
    // BẢO VỆ GIÁ TRỊ: Lưu lại giá trị đang chọn trước khi làm mới danh sách HTML
    let giaTriTuanCu = elementTuan ? elementTuan.value : null;
    let giaTriLopCu = elementLop ? elementLop.value : null;

    if(elementTuan) {
        elementTuan.disabled = false;
        elementTuan.innerHTML = chonTuanHtml;
        // Phục hồi lại giá trị cũ nếu danh sách mới vẫn chứa giá trị đó
        if (giaTriTuanCu && mangTuan.includes(giaTriTuanCu)) {
            elementTuan.value = giaTriTuanCu;
        }
    }
    if(elementLop) {
        elementLop.disabled = false;
        elementLop.innerHTML = chonLopHtml;
        // Phục hồi lại giá trị cũ
        if (giaTriLopCu && mangLop.includes(giaTriLopCu)) {
            elementLop.value = giaTriLopCu;
        }
    }

    let inTuan = document.getElementById('input_chonTuanSo');
    let inLop = document.getElementById('input_chonLopSo');
    if (inTuan) { inTuan.disabled = false; inTuan.classList.remove('cursor-wait'); }
    if (inLop) { inLop.disabled = false; inLop.classList.remove('cursor-wait'); }

    nangCapSelectThanhInput('chonTuanSo', 'Chọn Tuần...');
    nangCapSelectThanhInput('chonLopSo', 'Chọn Lớp...');

    // ĐỒNG BỘ GIAO DIỆN: Ép thẻ Input hiển thị lại đúng chữ dựa trên value vừa phục hồi
    if (typeof dongBoHienThiTuSelect === 'function') {
        dongBoHienThiTuSelect('chonTuanSo');
        dongBoHienThiTuSelect('chonLopSo');
    }

    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    // Chỉ báo "Vui lòng chọn" nếu thực sự ô chọn đang trống; nếu đã chọn Tuần & Lớp thì tự động kết xuất lại lưới để ánh xạ quyền ngay lập tức
    if (vungHienThi && (!elementTuan || !elementTuan.value || !elementLop || !elementLop.value)) {
        vungHienThi.innerHTML = `<div class="p-4"><p class="text-center py-10 text-slate-500 font-bold">Vui lòng chọn Tuần và Lớp để xem Sổ đầu bài.</p></div>`;
    } else if (elementTuan && elementTuan.value && elementLop && elementLop.value) {
        thucThiKetXuatSoDauBaiLenLuoi();
    }
}

// =========================================================================
// [NÂNG CẤP]: KHỐI THUẬT TOÁN ĐỒNG BỘ GIAO DIỆN SELECT VÀ INPUT (UI ĐÃ TINH CHỈNH)
// =========================================================================
window.nangCapSelectThanhInput = function(selectId, placeholderText) {
    let selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    // Ngăn chặn việc nhãn (label) bị xuống dòng bằng cách ép phần tử cha không bẻ dòng
    let theCha = selectEl.parentElement;
    if (theCha) theCha.style.whiteSpace = 'nowrap';

    let wrapperId = 'wrapper_' + selectId;
    let wrapper = document.getElementById(wrapperId);
    let inputEl, listEl;

    if (!wrapper) {
        // Tạo vỏ bọc bao quanh - Đã thu hẹp kích thước cố định w-32 (khoảng 128px) để nhường chỗ cho text Tên tuần
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'relative inline-block w-32 align-middle ml-1';
        
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        wrapper.appendChild(selectEl);
        selectEl.style.display = 'none'; // Giấu select hệ thống

        // Khởi tạo khung nhập liệu
        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = 'input_' + selectId;
        inputEl.className = 'w-full px-2 py-1.5 pr-7 text-xs border border-slate-400 rounded shadow-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors bg-white font-bold text-slate-800 placeholder-slate-400 cursor-pointer text-center';
        inputEl.placeholder = placeholderText;
        inputEl.autocomplete = 'off';

        // Gắn biểu tượng mũi tên nhận diện bằng mã SVG trực tiếp (Khắc phục lỗi hiển thị ảnh icon)
        let iconEl = document.createElement('div');
        iconEl.className = 'absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500';
        iconEl.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;

        // Khởi tạo danh sách kết quả lọc
        listEl = document.createElement('ul');
        listEl.id = 'list_' + selectId;
        listEl.className = 'absolute z-[999] w-[150px] mt-1 max-h-56 overflow-y-auto overscroll-contain bg-white border border-blue-400 rounded shadow-xl hidden divide-y divide-slate-100 left-0 text-left';

        wrapper.appendChild(inputEl);
        wrapper.appendChild(iconEl);
        wrapper.appendChild(listEl);

        // Lắng nghe thao tác
        inputEl.addEventListener('focus', () => {
            // Khi bấm vào thì trả lại màu đen để gõ tìm kiếm
            inputEl.classList.remove('text-blue-900', 'font-extrabold');
            inputEl.classList.add('text-slate-800', 'font-bold');
            inputEl.value = ''; 
            renderDanhSach(selectEl, listEl, inputEl, '');
            listEl.classList.remove('hidden');
        });

        inputEl.addEventListener('input', (e) => {
            renderDanhSach(selectEl, listEl, inputEl, e.target.value);
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                listEl.classList.add('hidden');
                dongBoHienThiTuSelect(selectId);
            }
        });
        
        selectEl.addEventListener('change', () => {
            dongBoHienThiTuSelect(selectId);
        });
    } else {
        inputEl = document.getElementById('input_' + selectId);
        listEl = document.getElementById('list_' + selectId);
    }

    dongBoHienThiTuSelect(selectId);
};

window.renderDanhSach = function(selectEl, listEl, inputEl, searchTerm) {
    listEl.innerHTML = '';
    let term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let hasMatch = false;

    let lopChon = selectEl.id === 'chonTuanSo' ? document.getElementById('chonLopSo')?.value : null;
    let lopNorm = lopChon ? String(lopChon).trim().toUpperCase() : '';

    Array.from(selectEl.options).forEach((opt, index) => {
        if (index === 0 && opt.disabled) return; 
        
        let text = opt.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(term) || searchTerm === '') {
            hasMatch = true;
            let li = document.createElement('li');
            li.className = 'px-3 py-2 cursor-pointer transition-colors text-sm font-bold flex justify-between items-center';

            let wOpt = selectEl.id === 'chonTuanSo' ? (parseInt(String(opt.value).replace(/\D/g, ''), 10) || 0) : 0;
            let daDangNhapLoc = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
            let tuanChuaLuuTruoc = 0;
            if (daDangNhapLoc && wOpt > 1 && lopNorm) {
                tuanChuaLuuTruoc = (typeof window.timTuanTruocChuaLuuSDB === 'function') ? window.timTuanTruocChuaLuuSDB(wOpt, lopNorm) : 0;
            }
            
            // Dòng đang được chọn trong danh sách thả xuống
            if (tuanChuaLuuTruoc > 0) {
                li.classList.add('text-slate-400', 'bg-slate-50', 'hover:bg-amber-50');
                li.innerHTML = `<span>${opt.text}</span><span class="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-normal flex items-center gap-0.5">🔒 Chưa lưu T${tuanChuaLuuTruoc}</span>`;
            } else if (opt.value === selectEl.value) {
                li.classList.add('bg-blue-50', 'text-blue-600', 'italic'); 
                li.innerHTML = `<span>${opt.text}</span><svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            } else {
                li.classList.add('text-slate-700', 'hover:bg-blue-100');
                li.innerText = opt.text;
            }

            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectEl.value = opt.value;
                listEl.classList.add('hidden');
                
                // [NÂNG CẤP]: Tự động nhả con trỏ chuột ra khỏi ô nhập liệu sau khi chọn
                inputEl.blur();
                
                // Đồng bộ thay đổi
                if (typeof selectEl.onchange === 'function') selectEl.onchange();
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            });
            listEl.appendChild(li);
        }
    });

    if (!hasMatch) {
        let li = document.createElement('li');
        li.className = 'px-3 py-2 text-sm text-red-500 italic text-center font-medium';
        li.innerText = 'Không tìm thấy...';
        listEl.appendChild(li);
    }
};
window.dongBoHienThiTuSelect = function(selectId) {
    let selectEl = document.getElementById(selectId);
    let inputEl = document.getElementById('input_' + selectId);
    if (!selectEl || !inputEl) return;

    // [NÂNG CẤP UX]: Ngăn chặn việc tự động xóa chữ nếu ô chọn đang bị khóa chờ mạng
    if (selectEl.disabled) return;

    if (selectEl.value) {
        let opt = Array.from(selectEl.options).find(o => o.value === selectEl.value);
        if(opt) {
            inputEl.value = opt.text;
            inputEl.classList.remove('text-slate-800', 'text-slate-500', 'opacity-80', 'font-bold');
            inputEl.classList.add('text-blue-900', 'font-extrabold'); 
        }
    } else {
        inputEl.value = '';
        inputEl.classList.remove('text-blue-900', 'font-extrabold', 'text-slate-500', 'opacity-80', 'italic');
        inputEl.classList.add('text-slate-800', 'font-bold');
    }
};

// =========================================================================
// THUẬT TOÁN CỬA SỔ TRƯỢT HIỂN THỊ TIẾT PPCT
// =========================================================================
let trangThaiKhungPPCT = { dangMo: false, inputTiet: null, inputTenBai: null };

function moKhungTruotPPCT(event, theInputTiet, khoi, mon, tietHienTai) {
    if (event) event.stopPropagation(); 
    dongKhungTruotPPCT(); 
    trangThaiKhungPPCT.inputTiet = theInputTiet;
    let tr = theInputTiet.closest('tr');
    trangThaiKhungPPCT.inputTenBai = tr ? tr.querySelector('td[data-loai="tenBai"] textarea') : null;
    
    let intTiet = parseInt(tietHienTai) || 1;
    let tietBatDau = Math.max(1, intTiet - 10);
    let tietKetThuc = intTiet + 10;
    veGiaoDienKhungTruot(theInputTiet, khoi, mon, intTiet, tietBatDau, tietKetThuc);
}

function veGiaoDienKhungTruot(theInputTiet, khoi, mon, tietTrungTam, tietBatDau, tietKetThuc) {
    let monGocChuan = mon.toLowerCase().replace(/\s+/g, ' ');
    let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
    
    let htmlDanhSach = `<ul class="max-h-64 overflow-y-auto bg-white border border-blue-300 shadow-lg rounded text-sm w-80 text-left relative z-50">`;
    
    if (tietBatDau > 1) {
        let tietMoi = Math.max(1, tietBatDau - 10);
        htmlDanhSach += `<li class="p-2 text-center text-blue-600 font-bold bg-blue-50 cursor-pointer hover:bg-blue-100" 
                             onclick="veGiaoDienKhungTruot(trangThaiKhungPPCT.inputTiet, '${khoi}', '${mon}', ${tietTrungTam}, ${tietMoi}, ${tietBatDau - 1}); event.stopPropagation();">
                             ↑ Tải các tiết trước...
                         </li>`;
    }

    for (let i = tietBatDau; i <= tietKetThuc; i++) {
        let baiDay = tuDienPPCTToanCuc[`${khoi}_${monGocChuan}_${i}`] || tuDienPPCTToanCuc[`${khoi}_${monPPCT}_${i}`] || 'Chưa có dữ liệu bài dạy';
        let baiDayAnToan = baiDay.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        let cssDangChon = (i === tietTrungTam) ? "bg-blue-100 border-l-4 border-blue-600 font-bold" : "hover:bg-slate-100 border-l-4 border-transparent";
        htmlDanhSach += `<li class="p-2 cursor-pointer border-b border-slate-100 ${cssDangChon}" 
                             onclick="chonMucPPCT(${i}, '${baiDayAnToan}', event)">
                             <span class="text-blue-700 font-extrabold">Tiết ${i}:</span> <span class="text-slate-700">${baiDay}</span>
                         </li>`;
    }

    htmlDanhSach += `<li class="p-2 text-center text-blue-600 font-bold bg-blue-50 cursor-pointer hover:bg-blue-100" 
                         onclick="veGiaoDienKhungTruot(trangThaiKhungPPCT.inputTiet, '${khoi}', '${mon}', ${tietTrungTam}, ${tietKetThuc + 1}, ${tietKetThuc + 11}); event.stopPropagation();">
                         ↓ Tải các tiết sau...
                     </li></ul>`;

    let divKhung = document.createElement('div');
    divKhung.id = 'khungHienThiPPCT_Dong';
    divKhung.className = 'absolute mt-1 z-50';
    divKhung.innerHTML = htmlDanhSach;

    let tdContainer = theInputTiet.parentNode;
    if (window.getComputedStyle(tdContainer).position === 'static') {
        tdContainer.style.position = 'relative';
    }
    
    divKhung.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    tdContainer.appendChild(divKhung);
    trangThaiKhungPPCT.dangMo = true;
}


function dongKhungTruotPPCT() {
    let khungOld = document.getElementById('khungHienThiPPCT_Dong');
    if (khungOld) khungOld.remove();
    trangThaiKhungPPCT.dangMo = false;
}

document.addEventListener('mousedown', function(event) {
    if (trangThaiKhungPPCT.dangMo) {
        let khungDong = document.getElementById('khungHienThiPPCT_Dong');
        let oTietDangKichHoat = trangThaiKhungPPCT.inputTiet;
        if (khungDong && event.target !== oTietDangKichHoat && !khungDong.contains(event.target)) {
            dongKhungTruotPPCT();
        }
    }
});

// =========================================================================
// KHỐI MỚI: THUẬT TOÁN CỬA SỔ TRƯỢT DANH SÁCH GIÁO VIÊN (COMBO BOX KÝ TÊN)
// =========================================================================
let trangThaiKhungChuKy = { dangMo: false, inputChuKy: null, dangHover: false };

function moKhungTruotChuKy(event, theInputChuKy) {
    if (event) event.stopPropagation();
    
    // Nếu click lại vào chính ô đang mở thì bỏ qua
    if (trangThaiKhungChuKy.dangMo && trangThaiKhungChuKy.inputChuKy === theInputChuKy) return;
    
    if (typeof dongKhungTruotPPCT === 'function') dongKhungTruotPPCT(); 
    dongKhungTruotChuKy(); 
    
    trangThaiKhungChuKy.inputChuKy = theInputChuKy;
    trangThaiKhungChuKy.dangHover = false; 

    // Mờ chữ khi mở khung chọn (nhưng sẽ đậm lại khi gõ)
    theInputChuKy.classList.remove('text-blue-700');
    theInputChuKy.classList.add('text-slate-400', 'opacity-60');

    if (theInputChuKy.disabled || !danhSachGiaoVienToanCuc || danhSachGiaoVienToanCuc.length === 0) return;

    let divKhung = document.createElement('div');
    divKhung.id = 'khungHienThiChuKy_Dong';
    divKhung.className = 'fixed z-[9999] mt-1'; 
    
    // Khởi tạo HTML toàn bộ danh sách (Truyền rỗng = Không lọc)
    divKhung.innerHTML = taoHtmlDanhSachChuKy('');

    // Bắt sự kiện chuột ra/vào để chống lỗi văng khung khi lăn bi
    divKhung.addEventListener('mouseenter', () => { trangThaiKhungChuKy.dangHover = true; });
    divKhung.addEventListener('mouseleave', () => { trangThaiKhungChuKy.dangHover = false; });

    document.body.appendChild(divKhung);
    
    let rect = theInputChuKy.getBoundingClientRect();
    divKhung.style.top = (rect.bottom + 2) + 'px';
    divKhung.style.left = (rect.right - 192) + 'px'; 
    
    trangThaiKhungChuKy.dangMo = true;
}

// [THUẬT TOÁN MỚI]: Lọc và xây dựng HTML dựa theo từ khóa
function taoHtmlDanhSachChuKy(tuKhoa) {
    let tk = String(tuKhoa).trim().toLowerCase();
    let danhSachLoc = danhSachGiaoVienToanCuc;
    
    // Lọc thông minh: Không phân biệt dấu tiếng Việt
    if (tk !== '') {
        let locKhongDau = tk.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        danhSachLoc = danhSachGiaoVienToanCuc.filter(gv => {
            let gvKhongDau = gv.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return gv.toLowerCase().includes(tk) || gvKhongDau.includes(locKhongDau);
        });
    }

    let htmlDanhSach = `<ul class="max-h-56 overflow-y-auto overscroll-contain bg-white border border-blue-400 shadow-2xl rounded text-sm w-48 text-left divide-y divide-slate-100">`;
    htmlDanhSach += `<li class="p-2.5 cursor-pointer hover:bg-red-50 text-red-600 transition-colors italic text-center font-semibold" onmousedown="chonMucChuKy('', event)">-- Xóa chữ ký --</li>`;

    if (danhSachLoc.length === 0) {
        htmlDanhSach += `<li class="p-2.5 text-slate-500 italic text-center bg-slate-50">Không tìm thấy giáo viên...</li>`;
    } else {
        danhSachLoc.forEach(gv => {
            let gvAnToan = gv.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            htmlDanhSach += `<li class="p-2.5 cursor-pointer hover:bg-blue-50 transition-colors" onmousedown="chonMucChuKy('${gvAnToan}', event)">
                                 <span class="text-blue-800 font-bold block">${gv}</span>
                             </li>`;
        });
    }
    htmlDanhSach += `</ul>`;
    return htmlDanhSach;
}

// [THUẬT TOÁN MỚI]: Kích hoạt khi người dùng gõ phím trực tiếp
function locDanhSachChuKy(theInput) {
    coThayDoiChuaLuu_SDB = true;
    
    // Khi tự gõ phím thì chữ phải rõ ràng, cập nhật màu đen rõ nét nếu có chữ ký
    theInput.classList.remove('text-slate-400', 'opacity-60');
    if (typeof window.capNhatMauChuDongDaKy === 'function') {
        window.capNhatMauChuDongDaKy(theInput.closest('tr'));
    } else {
        theInput.classList.add('text-blue-700');
    }

    // Nếu người dùng bắt đầu gõ mà khung chưa mở -> Mở khung
    if (!trangThaiKhungChuKy.dangMo || trangThaiKhungChuKy.inputChuKy !== theInput) {
        moKhungTruotChuKy(null, theInput);
    }
    
    // Tiêm từ khóa đang gõ vào hàm lọc và cập nhật ngay lập tức giao diện khung thả xuống
    let khungDong = document.getElementById('khungHienThiChuKy_Dong');
    if (khungDong) {
        khungDong.innerHTML = taoHtmlDanhSachChuKy(theInput.value);
        khungDong.addEventListener('mouseenter', () => { trangThaiKhungChuKy.dangHover = true; });
        khungDong.addEventListener('mouseleave', () => { trangThaiKhungChuKy.dangHover = false; });
    }
}

function dongKhungTruotChuKy() {
    let khungOld = document.getElementById('khungHienThiChuKy_Dong');
    if (khungOld) khungOld.remove();
    if (trangThaiKhungChuKy.inputChuKy) {
        trangThaiKhungChuKy.inputChuKy.classList.remove('text-slate-400', 'opacity-60');
        if (typeof window.capNhatMauChuDongDaKy === 'function') {
            window.capNhatMauChuDongDaKy(trangThaiKhungChuKy.inputChuKy.closest('tr'));
        } else {
            trangThaiKhungChuKy.inputChuKy.classList.add('text-blue-700');
        }
    }
    trangThaiKhungChuKy.dangMo = false;
    trangThaiKhungChuKy.dangHover = false;
}

document.addEventListener('mousedown', function(event) {
    if (trangThaiKhungChuKy.dangMo) {
        let khungDong = document.getElementById('khungHienThiChuKy_Dong');
        if (khungDong && event.target !== trangThaiKhungChuKy.inputChuKy && !khungDong.contains(event.target)) {
            dongKhungTruotChuKy();
        }
    }
});

document.addEventListener('scroll', function(event) {
    if (trangThaiKhungChuKy.dangMo) {
        // Tối ưu: Lăn bi chuột trong danh sách sẽ không làm văng khung
        if (trangThaiKhungChuKy.dangHover) return;
        
        let khungDong = document.getElementById('khungHienThiChuKy_Dong');
        if (khungDong && (event.target === khungDong || khungDong.contains(event.target))) {
            return;
        }
        dongKhungTruotChuKy();
    }
}, true);
// =========================================================================
// HÀM MỚI: CẬP NHẬT DỮ LIỆU NGẦM LÊN LƯỚI MÀ KHÔNG VẼ LẠI UI (CHỐNG GIẬT)
// =========================================================================
window.capNhatSoDauBaiNgamLenLuoi = function(tuanChon, lopChon) {
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (!vungHienThi || !tuanChon || !lopChon) return;

    let maxTuanChon = parseInt(tuanChon.replace(/\D/g, '')) || 0;
    let matchKhoiChon = lopChon.match(/\d+/);
    let khoiChon = matchKhoiChon ? matchKhoiChon[0] : '';
    
    let boDemTietPPCT = {}; 
    
    // 1. Quét tiến độ PPCT các tuần trước
    duLieuTKBGopDaMap.forEach(d => {
        let t = parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) || 0;
        let maLop = String(d['Mã Lớp']).trim().toUpperCase();

        if (maLop === lopChon.toUpperCase() && t < maxTuanChon) {
            let mon = String(d['Môn Học']).trim();
            if (mon !== '') {
                let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                if (d.DaLuu === true) {
                    let tietLuu = parseInt(String(d['TietPPCT_Thuc']).replace(/\D/g, ''), 10) || 0;
                    if (tietLuu > 0) {
                        boDemTietPPCT[monPPCT] = Math.max(boDemTietPPCT[monPPCT] || 0, tietLuu);
                    } else {
                        boDemTietPPCT[monPPCT] = (boDemTietPPCT[monPPCT] || 0) + 1;
                    }
                }
            }
        }
    });

    const thuTuThuNgam = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoiNgam = { "sáng": 1, "chiều": 2 };
    const chuanHoaThuNgam = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    // 2. Sắp xếp các tiết theo thứ tự thời gian chuẩn xác
    let tkbTuanNay = duLieuTKBGopDaMap.filter(d => 
        parseInt(String(d['Tuần']).replace(/\D/g, ''), 10) === maxTuanChon && 
        String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase()
    ).sort((a, b) => {
        let thuA = thuTuThuNgam[chuanHoaThuNgam(a['Thứ'])] || 99, thuB = thuTuThuNgam[chuanHoaThuNgam(b['Thứ'])] || 99;
        if (thuA !== thuB) return thuA - thuB;
        let bA = thuTuBuoiNgam[String(a['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        let bB = thuTuBuoiNgam[String(b['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'] || 99;
        if (bA !== bB) return bA - bB;
        return (parseInt(String(a['Tiết']).replace(/\D/g, ''), 10) || 0) - (parseInt(String(b['Tiết']).replace(/\D/g, ''), 10) || 0);
    });

    let dictTKBMoi = {};
    let demTietMonTrongTuan = {};
    tkbTuanNay.forEach(dong => {
        let thuGoc = chuanHoaThuNgam(dong['Thứ']).toLowerCase();
        let buoiKiemTra = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
        
        let mon = String(dong['Môn Học']).trim();
        if (mon !== '') {
            let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
            demTietMonTrongTuan[monPPCT] = (demTietMonTrongTuan[monPPCT] || 0) + 1;
            let tietPPCTChuan = (boDemTietPPCT[monPPCT] || 0) + demTietMonTrongTuan[monPPCT];

            if (!dong['TietPPCT_Thuc'] || dong.DaDongBoTKB || dong['DaLuu'] !== true) {
                dong['TietPPCT_Thuc'] = tietPPCTChuan;
                if (!dong['TenBai_Thuc'] || dong['TenBai_Thuc'].trim() === '' || dong.DaDongBoTKB) {
                    dong['TenBai_Thuc'] = timTenBaiChuanSDB(khoiChon, mon, tietPPCTChuan);
                }
            } else {
                if (!dong['TenBai_Thuc'] || dong['TenBai_Thuc'].trim() === '') {
                    dong['TenBai_Thuc'] = timTenBaiChuanSDB(khoiChon, mon, dong['TietPPCT_Thuc']);
                }
            }
        }
        dictTKBMoi[`${thuGoc}_${buoiKiemTra}_${dong['Tiết']}`] = dong;
    });

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);
    let maGvDangNhapLC = madinhdanhGV.trim().toLowerCase().normalize('NFC');

    // 3. Cập nhật DOM cục bộ
    let cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');
    
    cacBang.forEach(khungBang => {
        let thuHienTai = '';
        let cacDong = khungBang.querySelectorAll('table tbody tr');
        
        cacDong.forEach(dong => {
            let cellThu = dong.querySelector('td[rowspan]');
            if (cellThu) {
                let textThuNgay = cellThu.innerText.split('\n');
                thuHienTai = textThuNgay[0].trim().toLowerCase();
            }

            let buoiThuocDong = dong.getAttribute('data-buoi') || 'Sáng';
            let buoiKiemTra = buoiThuocDong.toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
            
            let oTiet = dong.querySelector('td[data-loai="tietSDB"]');
            let tiet = oTiet ? oTiet.innerText.trim() : '';

            if (thuHienTai !== '' && tiet !== '') {
                let dongDuLieuMoi = dictTKBMoi[`${thuHienTai}_${buoiKiemTra}_${tiet}`];
                
                if (dongDuLieuMoi) {
                    let monHocMoi = dongDuLieuMoi['Môn Học'] || '';
                    let isDaLuuMoi = dongDuLieuMoi['DaLuu'] || false;
                    
                    let tenBaiMoi = String(dongDuLieuMoi['TenBai_Thuc'] || '');
                    let nhanXetMoi = String(dongDuLieuMoi['NhanXet_Thuc'] || '');
                    let xepLoaiMoi = String(dongDuLieuMoi['XepLoai_Thuc'] || '');
                    let chuKyMoi = String(dongDuLieuMoi['ChuKy_Thuc'] || '');
                    let chuyenCanMoi = String(dongDuLieuMoi['ChuyenCan_Thuc'] || '');
                    let tietPPCTMoi = String(dongDuLieuMoi['TietPPCT_Thuc'] || '');
                    // [TÙY CHỈNH]: Tạm thời tắt tính năng khóa cứng khi đã ký.
                    // let isLockedMoi = isDaLuuMoi && chuKyMoi.trim() !== '';
                    let isLockedMoi = window.kiemTraTuanDaKhoa(tuanChon);

                    let gvTkb = String(dongDuLieuMoi['Mã GV']).trim().toLowerCase().normalize('NFC');
                    let quyenNhapThuCong = false;
                    if (quyenQuanTri) {
                        quyenNhapThuCong = true;
                    } else if (monHocMoi !== '' && maGvDangNhapLC !== '') {
                        let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                        if (tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2)) {
                            quyenNhapThuCong = true;
                        }
                    }

                    let tdMon = dong.querySelector('td[data-loai="mon"]');
                    if (tdMon && tdMon.innerText.trim() !== monHocMoi) {
                        tdMon.innerText = monHocMoi;
                    }

                    let tdTenBai = dong.querySelector('td[data-loai="tenBai"]');
                    if (tdTenBai) tdTenBai.setAttribute('data-islocked', isLockedMoi);
                    dong.setAttribute('data-daluu', isDaLuuMoi);

                    const capNhatO = (loai, giaTriMoi) => {
                        let td = dong.querySelector(`td[data-loai="${loai}"]`);
                        if (!td) return;
                        
                        if (isLockedMoi) {
                            let theSpan = td.querySelector('span');
                            let canDoi = !theSpan || theSpan.innerText.trim() !== giaTriMoi;
                            
                            if (loai === 'tenBai') {
                                canDoi = !td.querySelector('span') && td.innerText.trim() !== giaTriMoi;
                                if (td.querySelector('textarea')) canDoi = true; 
                            }

                            if (canDoi) {
                                if (loai === 'tenBai') {
                                    td.innerHTML = giaTriMoi; 
                                    td.className = "border border-gray-500 p-1 text-emerald-700 font-bold bg-white group-hover:bg-slate-50 align-middle";
                                } else if (loai === 'chuyenCan') {
                                    td.innerHTML = `<span class="font-bold text-slate-800 block text-center">${giaTriMoi}</span>`;
                                } else if (loai === 'nhanXet') {
                                    td.innerHTML = `<span class="font-normal text-slate-800 block">${giaTriMoi}</span>`;
                                } else if (loai === 'xepLoai') {
                                    td.innerHTML = `<span class="font-bold text-slate-800 block text-center">${giaTriMoi}</span>`;
                                } else if (loai === 'chuKy') {
                                    td.innerHTML = `<span class="font-bold text-slate-800 uppercase block text-center">${giaTriMoi}</span>`;
                                } else if (loai === 'tiet') {
                                    td.innerHTML = `<span class="font-extrabold text-blue-700 block text-center">${giaTriMoi}</span>`;
                                }
                            }
                        } else {
                            let tagNhap = td.querySelector('input, select, textarea');
                            let trangThaiKhoa = !quyenNhapThuCong ? "disabled" : "";
                            let cssNenKhoa = !quyenNhapThuCong ? "bg-transparent cursor-not-allowed opacity-70" : "bg-transparent";

                            if (!tagNhap) {
                                if (loai === 'tenBai') {
                                    let placeholderText = !quyenNhapThuCong ? "Không có quyền" : "Nhập...";
                                    td.innerHTML = `<textarea rows="1" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-semibold text-slate-800 placeholder-slate-400 px-1 resize-none overflow-hidden align-middle" placeholder="${placeholderText}">${giaTriMoi}</textarea>`;
                                    td.className = "border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle";
                                } else if (loai === 'chuyenCan') {
                                    td.innerHTML = `<input type="text" ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-semibold text-slate-800 placeholder-slate-400" placeholder="..." value="${giaTriMoi}">`;
                                } else if (loai === 'nhanXet') {
                                    td.innerHTML = `<textarea rows="1" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-normal text-slate-800 placeholder-slate-400 px-1 resize-none overflow-hidden align-middle" placeholder="Nhận xét...">${giaTriMoi}</textarea>`;
                                } else if (loai === 'xepLoai') {
                                    let optTot = (giaTriMoi === 'Tốt') ? 'selected' : '';
                                    let optKha = (giaTriMoi === 'Khá') ? 'selected' : '';
                                    let optTB = (giaTriMoi === 'TB') ? 'selected' : '';
                                    let optYeu = (giaTriMoi === 'Yếu') ? 'selected' : '';
                                    td.innerHTML = `<select ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-bold text-slate-800 cursor-pointer appearance-none"><option value="" ${!giaTriMoi ? 'selected' : ''}>-Chọn-</option><option value="Tốt" ${optTot}>Tốt</option><option value="Khá" ${optKha}>Khá</option><option value="TB" ${optTB}>TB</option><option value="Yếu" ${optYeu}>Yếu</option></select>`;
                                } else if (loai === 'chuKy') {
                                    let thuocVeGvHienTai = quyenNhapThuCong && !quyenQuanTri;
                                    td.innerHTML = `<div class="relative flex items-center justify-center w-full h-full"><input type="text" autocomplete="off" ${trangThaiKhoa} data-thuocve="${thuocVeGvHienTai}" class="w-full text-center outline-none transition-colors duration-300 rounded ${cssNenKhoa} font-semibold text-blue-700 placeholder-blue-300 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 pr-5" placeholder="${!quyenNhapThuCong ? 'Không có quyền' : 'Ghi rõ họ tên...'}" value="${giaTriMoi}" onclick="moKhungTruotChuKy(event, this)" oninput="locDanhSachChuKy(this)">${!quyenNhapThuCong ? '' : `<svg class="w-4 h-4 absolute right-1 text-blue-400 pointer-events-none opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`}</div>`;
                                } else if (loai === 'tiet') {
                                    let monHocAnToan = monHocMoi.replace(/'/g, "\\'"); 
                                    let onfocusLogic = `moKhungTruotPPCT(event, this, '${khoiChon}', '${monHocAnToan}', this.value || 1)`;
                                    td.innerHTML = `<input type="text" onclick="${onfocusLogic}" readonly ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-extrabold text-blue-700 placeholder-blue-300 transition-all cursor-pointer hover:bg-blue-50" placeholder="..." value="${giaTriMoi}">`;
                                }
                                
                                let tagMoi = td.querySelector('input, select, textarea');
                                if(tagMoi) {
                                    tagMoi.addEventListener('input', (e) => { coThayDoiChuaLuu_SDB = true; danhDauDongThayDoi(e.target.closest('tr')); if (typeof capNhatThongKeSDBTrenLuoi === 'function') capNhatThongKeSDBTrenLuoi(); });
                                    tagMoi.addEventListener('change', (e) => { coThayDoiChuaLuu_SDB = true; danhDauDongThayDoi(e.target.closest('tr')); if (typeof capNhatThongKeSDBTrenLuoi === 'function') capNhatThongKeSDBTrenLuoi(); });
                                    if (tagMoi.tagName === 'TEXTAREA') {
                                        tagMoi.style.height = 'auto';
                                        tagMoi.style.height = (tagMoi.scrollHeight) + 'px';
                                    }
                                }
                            } else {
                                if (tagNhap.value !== giaTriMoi) {
                                    tagNhap.value = giaTriMoi;
                                    if (tagNhap.tagName === 'TEXTAREA') {
                                        tagNhap.style.height = 'auto';
                                        tagNhap.style.height = (tagNhap.scrollHeight) + 'px';
                                    }
                                }
                                
                                if (quyenNhapThuCong) {
                                    tagNhap.removeAttribute('disabled');
                                    tagNhap.classList.remove('bg-slate-100', 'cursor-not-allowed', 'opacity-70');
                                    tagNhap.classList.add('bg-transparent');
                                } else {
                                    tagNhap.setAttribute('disabled', 'disabled');
                                    tagNhap.classList.remove('bg-slate-100');
                                    tagNhap.classList.add('bg-transparent', 'cursor-not-allowed', 'opacity-70');
                                }
                            }
                        }
                    };

                    capNhatO('chuyenCan', chuyenCanMoi);
                    capNhatO('tiet', tietPPCTMoi);
                    capNhatO('tenBai', tenBaiMoi);
                    capNhatO('nhanXet', nhanXetMoi);
                    capNhatO('xepLoai', xepLoaiMoi);
                    capNhatO('chuKy', chuKyMoi);
                    
                    dong.setAttribute('data-thaydoi', 'false');
                    let iconSua = dong.querySelector('.icon-sua-chua');
                    if(iconSua) iconSua.remove();
                    if (typeof window.capNhatMauChuDongDaKy === 'function') {
                        window.capNhatMauChuDongDaKy(dong);
                    }
                }
            }
        });
    });

    // 4. Thanh trạng thái tổng quát
    let soTietDaLuu = tkbTuanNay.filter(d => d.DaLuu === true).length;
    let tongSoTietCoMon = tkbTuanNay.filter(d => String(d['Môn Học']).trim() !== '').length;

    if (tongSoTietCoMon > 0) {
        let containerDiv = vungHienThi.querySelector('div.mb-4.p-2, div.mb-4.p-3');
        if (containerDiv) {
            let dsKhacBiet = kiemTraKhacBietTkbVaSoDauBai(tuanChon, lopChon);
            if (soTietDaLuu > 0 && dsKhacBiet && dsKhacBiet.length > 0) {
                let chiTietTooltip = dsKhacBiet.map(k => k.moTaChiTiet).join('\n');
                let dsPillHtml = dsKhacBiet.map(k => `
                    <span class="inline-flex items-center gap-1 bg-white text-amber-900 border border-amber-300 px-2 py-0.5 rounded shadow-xs text-xs font-semibold" title="${k.moTaChiTiet}">
                        <span class="font-bold text-blue-900">${k.thu} (${k.buoi} - T${k.tiet}):</span>
                        <span>${k.moTaNgan}</span>
                    </span>
                `).join('');

                containerDiv.className = "mb-4 p-3 bg-amber-50 border-2 border-amber-500 shadow-md rounded flex flex-col gap-2.5 animate-pulse-once";
                containerDiv.innerHTML = `
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5">
                            <div class="bg-amber-500 text-white rounded-full p-1.5 shadow flex-none animate-bounce-once">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <div>
                                <span class="text-sm font-black text-amber-900 tracking-wide uppercase block">PHÁT HIỆN ${dsKhacBiet.length} TIẾT THỜI KHÓA BIỂU CÓ THAY ĐỔI SO VỚI SỔ ĐẦU BÀI ĐÃ LƯU</span>
                                <span class="text-xs text-amber-800 font-semibold">Cần đồng bộ để giáo viên được phân công đúng môn và có quyền ký tên, đồng thời cập nhật tiết PPCT và tên bài.</span>
                            </div>
                        </div>
                        <button id="btnDongBoTkbVaoSdb" onclick="thucThiDongBoTkbVaoSoDauBai()" 
                                class="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2 text-xs shadow-md transition-all rounded-lg flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto cursor-pointer border border-amber-700 hover:scale-102"
                                title="${chiTietTooltip}">
                            <svg class="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Đồng bộ Thời khoá biểu (${dsKhacBiet.length} tiết thay đổi)</span>
                        </button>
                    </div>
                    <div class="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-1.5">
                        <span class="font-bold text-amber-900 text-xs flex-none">Chi tiết ${dsKhacBiet.length} tiết thay đổi:</span>
                        <div class="flex flex-wrap gap-1.5">${dsPillHtml}</div>
                    </div>`;
            } else if (soTietDaLuu > 0) {
                containerDiv.className = "mb-4 p-2 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-between rounded";
                containerDiv.innerHTML = `<div class="flex items-center gap-2"><div class="bg-emerald-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><span class="text-sm font-extrabold text-emerald-800 tracking-wide uppercase">CÓ DỮ LIỆU ĐÃ ĐƯỢC CHỐT SỔ (ĐÃ TRÙNG KHỚP THỜI KHÓA BIỂU)</span></div><span class="text-xs font-semibold text-emerald-700 italic hidden sm:block">Các tiết đã Ký Tên sẽ bị khóa cứng. Các tiết chưa ký vẫn tiếp tục mở để chỉnh sửa.</span></div>`;
            } else {
                containerDiv.className = "mb-4 p-2 bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded animate-pulse-once";
                containerDiv.innerHTML = `<div class="flex items-center gap-2"><div class="bg-amber-500 rounded-full p-1"><svg class="w-3 h-3 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></div><span class="text-sm font-extrabold text-amber-800 tracking-wide uppercase">DỮ LIỆU MỚI TỊNH TIẾN (CHƯA LƯU)</span></div><span class="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full border border-amber-400">⚠️ Yêu cầu: Bấm "Đồng bộ Tên bài", Nhập Đánh giá, Ký tên và bấm "Lưu Sổ đầu bài" để lưu!</span></div>`;
            }
        }
    }

    // 5. Đồng bộ ngầm khối Nhận xét & Chữ ký tổng hợp cuối trang và thống kê tuần
    let khoaTongHopNgam = `${maxTuanChon}_${lopChon.toUpperCase()}`;
    if (window.duLieuTongHopSDB && window.duLieuTongHopSDB[khoaTongHopNgam]) {
        let th = window.duLieuTongHopSDB[khoaTongHopNgam];
        let elNxGVCN = document.getElementById('txtNxGVCN');
        let elKyGVCN = document.getElementById('txtKyGVCN');
        let elNxBGH = document.getElementById('txtNxBGH');
        let elKyBGH = document.getElementById('txtKyBGH');
        if (elNxGVCN && elNxGVCN.value !== th.nxGVCN) {
            elNxGVCN.value = th.nxGVCN || '';
            elNxGVCN.style.height = 'auto';
            elNxGVCN.style.height = elNxGVCN.scrollHeight + 'px';
        }
        if (elKyGVCN && elKyGVCN.value !== th.kyGVCN) elKyGVCN.value = th.kyGVCN || '';
        if (elNxBGH && elNxBGH.value !== th.nxBGH) {
            elNxBGH.value = th.nxBGH || '';
            elNxBGH.style.height = 'auto';
            elNxBGH.style.height = elNxBGH.scrollHeight + 'px';
        }
        if (elKyBGH && elKyBGH.value !== th.kyBGH) elKyBGH.value = th.kyBGH || '';
    }
    if (typeof capNhatThongKeSDBTrenLuoi === 'function') {
        capNhatThongKeSDBTrenLuoi();
    }
};
// =========================================================================
// THAO TÁC KHÓA / MỞ KHÓA SỔ ĐẦU BÀI THEO TUẦN (TOÀN TRƯỜNG)
// =========================================================================
async function thaoTacKhoaMoSoDauBai() {
    let theSelectTuan = document.getElementById('chonTuanSo');
    let tuanChon = theSelectTuan ? theSelectTuan.value : '';

    if (!tuanChon) {
        return alert("Vui lòng chọn Tuần học trước khi thực hiện thao tác Khóa/Mở sổ!");
    }

    // =========================================================================
    // [CHẶN TỨC THÌ 0ms]: Kiểm tra quyền trực tiếp tại Client, chặn ngay nếu không có quyền
    // Tuyệt đối không bật icon xoay spinner, không hỏi confirm, không gửi yêu cầu lên máy chủ
    // =========================================================================
    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let quyenQuanTriSDB = coToanQuyenSDB || (theChotQuyen && typeof theChotQuyen.getAttribute === 'function' ? (theChotQuyen.getAttribute('data-quantri') === 'true' || theChotQuyen.getAttribute('data-quantri') === true) : false);

    let coQuyenKhoaSo = quyenQuanTriSDB ||
                        quyenKhoaSdbServer ||
                        (theChotQuyen && theChotQuyen.getAttribute('data-quyenkhoasdb') === 'true') ||
                        (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) ||
                        (typeof window.quyenSuaChua !== 'undefined' && window.quyenSuaChua) ||
                        (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut && quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                        (typeof window.quyenChiTiet !== 'undefined' && window.quyenChiTiet.nut && window.quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                        (typeof layQuyenCongKhaiHienTai === 'function' && layQuyenCongKhaiHienTai().nut && layQuyenCongKhaiHienTai().nut.includes('btnKhoaSoDauBai')) ||
                        (typeof window.layQuyenCongKhaiHienTai === 'function' && window.layQuyenCongKhaiHienTai().nut && window.layQuyenCongKhaiHienTai().nut.includes('btnKhoaSoDauBai'));

    if (!coQuyenKhoaSo) {
        alert("⛔ TỪ CHỐI TRUY CẬP:\nTài khoản của đồng chí chưa được cấp quyền Khóa / Mở khóa Sổ đầu bài trong Ma trận phân quyền!");
        return;
    }

    let emailNguoiDung = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') 
        ? window.dinhDanhGiaoVienToanCuc 
        : (typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '' 
            ? window.emailGiaoVienToanCuc 
            : (typeof maGvDangNhapHeThong !== 'undefined' ? maGvDangNhapHeThong : ''));

    if (!emailNguoiDung) {
        alert("⚠️ Vui lòng đăng nhập tài khoản trước khi thực hiện thao tác Khóa / Mở khóa Sổ đầu bài!");
        return;
    }

    let tuanSo = parseInt(String(tuanChon).replace(/\D/g, ''), 10);
    let daBiKhoa = window.kiemTraTuanDaKhoa(tuanChon);
    let hanhDongMoi = !daBiKhoa; // true: Khóa, false: Mở

    let namHocHienTai = namHocHeThongSDB || ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) ? window.thongSoHocVu.NAM_HOC : (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC ? thongSoHocVu.NAM_HOC : ''));
    let chuoiNamHoc = namHocHienTai ? ` (Năm học ${namHocHienTai})` : '';

    let thongBao = hanhDongMoi 
        ? `🔒 XÁC NHẬN KHÓA SỔ ĐẦU BÀI TOÀN TRƯỜNG:\n\nĐồng chí có chắc chắn muốn KHÓA Sổ đầu bài TUẦN ${tuanSo}${chuoiNamHoc} của TẤT CẢ CÁC LỚP TRONG TOÀN TRƯỜNG?\n\n- Sau khi khóa, giáo viên toàn trường chỉ có quyền XEM, không thể sửa đổi hay lưu đè dữ liệu ở bất kỳ lớp nào.\n- Dữ liệu tuần này được niêm phong để BGH kiểm tra, đánh giá chuyên môn.`
        : `🔓 XÁC NHẬN MỞ KHÓA SỔ TOÀN TRƯỜNG:\n\nĐồng chí có chắc chắn muốn MỞ KHÓA Sổ đầu bài TUẦN ${tuanSo}${chuoiNamHoc} cho toàn trường?\n\n- Toàn bộ các lớp trong Tuần ${tuanSo} sẽ được mở lại để giáo viên tiếp tục cập nhật, bổ sung bài dạy.`;

    if (!confirm(thongBao)) return;

    let btn = document.getElementById('btnKhoaSoDauBai');
    let textGoc = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xử lý...`;
        btn.disabled = true;
    }

    try {
        let payload = {
            thaoTac: 'khoaMoSoDauBai',
            tuan: tuanSo,
            namHoc: namHocHienTai,
            khoa: hanhDongMoi,
            emailTruyCap: emailNguoiDung
        };

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        }, 2, 15000); // Giới hạn tối đa 2 lần thử, timeout 15s chống treo đợi lâu

        const ketQua = await phanHoi.json();

        if (ketQua.trangThai === 'thanh_cong') {
            alert("✅ " + ketQua.thongBao);
            
            // Cập nhật ngay RAM
            duLieuKhoaSoToanCuc[tuanSo] = {
                daKhoa: hanhDongMoi,
                tuan: tuanSo,
                namHoc: namHocHienTai,
                maTuan: ketQua.maTuan || ((namHocHienTai ? namHocHienTai + '_' : '') + 'Tuần ' + tuanSo),
                nguoiThucHien: emailNguoiDung,
                thoiGian: 'Vừa xong'
            };

            // Vẽ lại giao diện ngay tức thì
            thucThiKetXuatSoDauBaiLenLuoi();
        } else {
            alert("⛔ Thao tác thất bại: " + (ketQua.thongBao || "Lỗi không xác định từ máy chủ."));
        }
    } catch (loi) {
        alert("⚠️ Lỗi kết nối máy chủ: " + loi.message);
    } finally {
        if (btn) {
            btn.innerHTML = textGoc;
            btn.disabled = false;
        }
    }
}

// =========================================================================
// HÀM CẬP NHẬT TỰ ĐỘNG THỐNG KÊ CUỐI TRANG SỔ ĐẦU BÀI TRÊN LƯỚI
// =========================================================================
window.capNhatThongKeSDBTrenLuoi = function() {
    let vungThongKe = document.getElementById('khuVucThongKeSDB');
    if (!vungThongKe) return;

    let cacDong = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container table tbody tr');
    let tongSoTietThucHien = 0;
    let demTot = 0, demKha = 0, demTB = 0, demYeu = 0;
    let khongThucHienSang = 0, khongThucHienChieu = 0;

    cacDong.forEach(dong => {
        let cellMon = dong.querySelector('td[data-loai="mon"]');
        let mon = '';
        if (cellMon) {
            for (let node of cellMon.childNodes) {
                if (node.nodeType === 3) mon += node.textContent;
            }
            mon = mon.trim();
        }
        if (mon !== '') {
            tongSoTietThucHien++;

            let cellTenBai = dong.querySelector('td[data-loai="tenBai"]');
            let tenBai = '';
            if (cellTenBai) {
                let inpTenBai = cellTenBai.querySelector('textarea, input');
                tenBai = inpTenBai ? inpTenBai.value.trim() : cellTenBai.innerText.trim();
            }

            let cellXL = dong.querySelector('td[data-loai="xepLoai"]');
            let xl = '';
            if (cellXL) {
                let sel = cellXL.querySelector('select, input');
                xl = sel ? sel.value.trim() : cellXL.innerText.trim();
            }

            let cellChuKy = dong.querySelector('td[data-loai="chuKy"]');
            let chuKy = '';
            if (cellChuKy) {
                let inpChuKy = cellChuKy.querySelector('input, textarea');
                chuKy = inpChuKy ? inpChuKy.value.trim() : cellChuKy.innerText.trim();
            }

            if (xl === 'Tốt') demTot++;
            else if (xl === 'Khá') demKha++;
            else if (xl === 'TB') demTB++;
            else if (xl === 'Yếu') demYeu++;

            // Số tiết không thực hiện: tiết thiếu tên bài HOẶC thiếu xếp loại HOẶC thiếu ký tên (tương ứng Sáng / Chiều)
            if (tenBai === '' || xl === '' || xl === '-Chọn-' || chuKy === '') {
                let buoiNorm = String(dong.getAttribute('data-buoi') || '').trim().toLowerCase();
                if (buoiNorm === 'sáng') khongThucHienSang++;
                else khongThucHienChieu++;
            }
        }
    });

    let tongGioXepLoai = demTot + demKha + demTB + demYeu;
    let tongTietKhongThucHien = khongThucHienSang + khongThucHienChieu;
    vungThongKe.innerHTML = `
        <div>- Tổng số tiết học trong tuần: <span class="font-normal italic">${tongSoTietThucHien} .</span></div>
        <div>- Tổng số tiết không thực hiện: <span class="font-normal italic">${tongTietKhongThucHien} . (Sáng: ${khongThucHienSang}, Chiều: ${khongThucHienChieu})</span></div>
        <div>- Tổng số giờ xếp loại: <span class="font-normal italic">${tongGioXepLoai}/${tongSoTietThucHien} [${demTot} Tốt; ${demKha} Khá ; ${demTB} Đạt/TB; ${demYeu} Yếu]</span></div>
    `;
};

// =========================================================================
// HỘP THOẠI CẬP NHẬT Ý KIẾN & KÝ TÊN CỦA GVCN / BGH (HỖ TRỢ ÁP DỤNG HÀNG LOẠT CHO BGH)
// - GVCN: Mở hộp thoại "Thêm - Sửa ý kiến giáo viên chủ nhiệm", lưu và ký tên đầy đủ (Cột B sheet DM_GIAOVIEN).
// - BGH: Mở hộp thoại "Cập nhật ý kiến của BGH" (đã loại bỏ ô Phân hiệu/Điểm trường):
//   + Tích "Áp dụng chung cho các lớp còn lại": gán cho tất cả các lớp của tuần đó nhưng chưa ký.
//   + Chọn "Khối học": áp dụng cho tất cả các lớp thuộc khối đó trong tuần đó nhưng chưa ký.
//   + Chọn "Lớp": chọn lớp nào thì bổ sung thêm lớp đó (chỉ áp dụng cho những lớp chưa ký, đã ký rồi thì bỏ qua).
//   + Lưu trực tiếp lên máy chủ và đồng bộ bộ nhớ cục bộ để khi mở lại bất kỳ lớp nào đều có đầy đủ giá trị.
// =========================================================================
let tapHopLopBoSungModalBGH = new Set();

function layDanhSachTatCaLopTheoTuanSDB(tuanSo) {
    let tapLop = new Set();
    let selLop = document.getElementById('chonLopSo');
    if (selLop && selLop.options) {
        Array.from(selLop.options).forEach(opt => {
            let v = String(opt.value || '').trim().toUpperCase();
            if (v && !opt.disabled) tapLop.add(v);
        });
    }
    if (Array.isArray(duLieuTKBGopDaMap)) {
        duLieuTKBGopDaMap.forEach(d => {
            let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
            let l = String(d['Mã Lớp'] || '').trim().toUpperCase();
            if (l && (!tuanSo || t === tuanSo)) tapLop.add(l);
        });
    }
    if (tuDienGvcnTheoLopToanCuc) {
        Object.keys(tuDienGvcnTheoLopToanCuc).forEach(l => {
            let v = String(l || '').trim().toUpperCase();
            if (v) tapLop.add(v);
        });
    }
    return Array.from(tapLop).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function kiemTraLopDaKyBghTheoTuan(tuanSo, maLop, lopHienTai) {
    let lopUp = String(maLop || '').trim().toUpperCase();
    let khoa = `${tuanSo}_${lopUp}`;
    let rec = window.duLieuTongHopSDB && window.duLieuTongHopSDB[khoa];
    if (rec && String(rec.kyBGH || '').trim() !== '') return true;
    if (lopUp === String(lopHienTai || '').trim().toUpperCase()) {
        let elKy = document.getElementById('txtKyBGH');
        if (elKy && elKy.value.trim() !== '') return true;
    }
    return false;
}

window.dongModalCapNhatYKienSDB = function() {
    let modal = document.getElementById('modalCapNhatYKienSDB');
    if (modal) modal.remove();
    tapHopLopBoSungModalBGH.clear();
};

window.xoaLopBoSungModalBGH = function(maLop) {
    let lopUp = String(maLop || '').trim().toUpperCase();
    tapHopLopBoSungModalBGH.delete(lopUp);
    let selLop = document.getElementById('selLopApDungBGH');
    if (selLop && selLop.value.toUpperCase() === lopUp) {
        selLop.value = '';
    }
    window.capNhatTrangThaiPhamViModalBGH();
};

window.xuLyThayDoiCheckboxTatCaBGH = function() {
    let chk = document.getElementById('chkApDungTatCaBGH');
    let selKhoi = document.getElementById('selKhoiApDungBGH');
    let selLop = document.getElementById('selLopApDungBGH');
    // Khi bật hoặc tắt "Áp dụng chung cho các lớp còn lại", đặt lại Khối = --- và Lớp = --- để chuyển về Toàn trường (khi bật) hoặc Lớp hiện tại (khi tắt)
    if (selKhoi) selKhoi.value = '';
    if (selLop) selLop.value = '';
    tapHopLopBoSungModalBGH.clear();
    window.capNhatTrangThaiPhamViModalBGH();
};

window.xuLyThayDoiKhoiModalBGH = function() {
    window.capNhatTrangThaiPhamViModalBGH();
};

window.xuLyChonThemLopModalBGH = function(selectEl) {
    if (!selectEl) return;
    let lopVal = String(selectEl.value || '').trim().toUpperCase();
    if (lopVal) {
        tapHopLopBoSungModalBGH.add(lopVal);
    }
    window.capNhatTrangThaiPhamViModalBGH();
};

window.tinhToanPhamViLopApDungBGH = function(tuanSo, lopHienTai) {
    let mangLopTatCa = layDanhSachTatCaLopTheoTuanSDB(tuanSo);
    let chkTatCa = document.getElementById('chkApDungTatCaBGH');
    let selKhoi = document.getElementById('selKhoiApDungBGH');
    let selLop = document.getElementById('selLopApDungBGH');

    let isTatCa = !!(chkTatCa && chkTatCa.checked);
    let khoiChon = selKhoi ? String(selKhoi.value || '').trim() : '';
    let lopDangChonDropdown = selLop ? String(selLop.value || '').trim().toUpperCase() : '';

    let dsBoSung = new Set(tapHopLopBoSungModalBGH);
    if (lopDangChonDropdown) dsBoSung.add(lopDangChonDropdown);

    let tapLopUngVien = new Set();
    let cheDoHangLoat = false;

    if (khoiChon !== '') {
        // Khi chọn Khối học: áp dụng cho tất cả các lớp thuộc khối đó trong tuần + các lớp chọn bổ sung ở ô Lớp
        cheDoHangLoat = true;
        mangLopTatCa.forEach(lop => {
            let m = lop.match(/^\d+/) || lop.match(/\d+/);
            let k = m ? m[0] : '';
            if (k === khoiChon) tapLopUngVien.add(lop);
        });
        dsBoSung.forEach(l => tapLopUngVien.add(l));
    } else if (dsBoSung.size > 0) {
        // Khi không chọn Khối mà chọn Lớp: áp dụng cho lớp hiện tại + bổ sung thêm các lớp đã chọn
        cheDoHangLoat = true;
        if (lopHienTai) tapLopUngVien.add(String(lopHienTai).trim().toUpperCase());
        dsBoSung.forEach(l => tapLopUngVien.add(l));
    } else if (isTatCa) {
        // Khi tích "Áp dụng chung cho các lớp còn lại" (Khối = ---, Lớp = ---): áp dụng cho tất cả các lớp trong tuần
        cheDoHangLoat = true;
        mangLopTatCa.forEach(lop => tapLopUngVien.add(lop));
    } else {
        // Mặc định: chỉ lớp hiện tại đang mở
        if (lopHienTai) tapLopUngVien.add(String(lopHienTai).trim().toUpperCase());
    }

    let dsUngVien = Array.from(tapLopUngVien);
    let dsChuaKy = [];
    let dsDaKyBoQua = [];

    dsUngVien.forEach(lop => {
        if (kiemTraLopDaKyBghTheoTuan(tuanSo, lop, lopHienTai)) {
            dsDaKyBoQua.push(lop);
        } else {
            dsChuaKy.push(lop);
        }
    });

    return {
        cheDoHangLoat: cheDoHangLoat,
        dsUngVien: dsUngVien,
        dsChuaKy: dsChuaKy,
        dsDaKyBoQua: dsDaKyBoQua,
        dsBoSung: Array.from(dsBoSung)
    };
};

window.capNhatTrangThaiPhamViModalBGH = function() {
    let modal = document.getElementById('modalCapNhatYKienSDB');
    if (!modal) return;
    let tuanSo = parseInt(modal.getAttribute('data-tuan') || '0', 10);
    let lopHienTai = modal.getAttribute('data-lop') || '';

    let vungTag = document.getElementById('vungTheLopBoSungBGH');
    let vungTomTat = document.getElementById('vungTomTatPhamViBGH');
    let kq = window.tinhToanPhamViLopApDungBGH(tuanSo, lopHienTai);

    if (vungTag) {
        if (kq.dsBoSung.length > 0) {
            let htmlTags = kq.dsBoSung.map(l => {
                let daKy = kiemTraLopDaKyBghTheoTuan(tuanSo, l, lopHienTai);
                return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${daKy ? 'bg-slate-100 text-slate-500 border-slate-300 line-through' : 'bg-blue-100 text-blue-900 border-blue-300'}">
                    <span>Lớp ${l}${daKy ? ' (Đã ký - bỏ qua)' : ''}</span>
                    <button type="button" onclick="xoaLopBoSungModalBGH('${l}')" class="text-red-600 hover:text-red-800 font-extrabold ml-0.5 leading-none" title="Bỏ lớp này">&times;</button>
                </span>`;
            }).join('');
            vungTag.innerHTML = `<div class="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-[#b8cfee]">
                <span class="text-xs font-bold text-[#15428b]">Lớp bổ sung đã chọn:</span>
                ${htmlTags}
            </div>`;
            vungTag.classList.remove('hidden');
        } else {
            vungTag.innerHTML = '';
            vungTag.classList.add('hidden');
        }
    }

    if (vungTomTat) {
        if (!kq.cheDoHangLoat) {
            let daKyHT = kiemTraLopDaKyBghTheoTuan(tuanSo, lopHienTai, lopHienTai);
            vungTomTat.innerHTML = `<span class="text-xs text-slate-700">📌 Phạm vi: <b>Lớp ${lopHienTai}</b> (Tuần ${tuanSo})${daKyHT ? ' — <i>Lớp này đã có chữ ký BGH (bấm Lưu nếu muốn cập nhật lại ý kiến của lớp này)</i>' : ' — <span class="text-emerald-700 font-semibold">Chưa ký (sẽ gán chữ ký)</span>'}.</span>`;
        } else {
            let chuoiChuaKy = kq.dsChuaKy.length > 0 ? kq.dsChuaKy.join(', ') : 'Không có';
            let chuoiDaKy = kq.dsDaKyBoQua.length > 0 ? ` (Bỏ qua ${kq.dsDaKyBoQua.length} lớp đã ký: ${kq.dsDaKyBoQua.join(', ')})` : '';
            vungTomTat.innerHTML = `<span class="text-xs text-[#15428b]">📌 Sẽ gán nhận xét & chữ ký cho <b>${kq.dsChuaKy.length} lớp chưa ký</b> của Tuần ${tuanSo}: <b>${chuoiChuaKy}</b><span class="text-slate-600">${chuoiDaKy}</span>.</span>`;
        }
    }
};

window.luuYKienNhanXetTuModal = async function() {
    let modal = document.getElementById('modalCapNhatYKienSDB');
    if (!modal) return;

    let loai = modal.getAttribute('data-loai') || 'GVCN';
    let tenDayDu = modal.getAttribute('data-tendaydu') || '';
    let tuanSo = parseInt(modal.getAttribute('data-tuan') || '0', 10);
    let lopHienTai = String(modal.getAttribute('data-lop') || '').trim().toUpperCase();

    let txtModal = document.getElementById('modalTxtYKienSDB');
    let valNxMoi = txtModal ? txtModal.value.trim() : '';

    if (!tuanSo || !lopHienTai) {
        alert("Không xác định được Tuần hoặc Lớp hiện tại!");
        return;
    }
    if (window.kiemTraTuanDaKhoa(tuanSo)) {
        alert(`⛔ Sổ đầu bài Tuần ${tuanSo} đã bị khóa toàn trường. Không thể chỉnh sửa!`);
        return;
    }

    let namHocHienTai = namHocHeThongSDB ||
        ((typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.NAM_HOC) ? window.thongSoHocVu.NAM_HOC : '') ||
        ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? thongSoHocVu.NAM_HOC : '');

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let emailNguoiLuu = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '')
        ? window.dinhDanhGiaoVienToanCuc
        : madinhdanhGV;

    let dsLopMucTieu = [];
    if (loai === 'GVCN') {
        dsLopMucTieu = [lopHienTai];
    } else {
        let phamVi = window.tinhToanPhamViLopApDungBGH(tuanSo, lopHienTai);
        if (!phamVi.cheDoHangLoat) {
            // Chế độ chỉ thao tác trên 1 lớp đang mở: nếu chưa ký thì gán mới, nếu đã ký thì cho phép cập nhật ý kiến của lớp đang mở
            dsLopMucTieu = [lopHienTai];
        } else {
            // Chế độ áp dụng hàng loạt (Tất cả / Khối / Lớp bổ sung): chỉ áp dụng cho những lớp chưa ký, đã ký rồi thì bỏ qua
            dsLopMucTieu = phamVi.dsChuaKy;
            if (dsLopMucTieu.length === 0) {
                alert(`ℹ️ Tất cả các lớp trong phạm vi đã chọn của Tuần ${tuanSo} đều đã có chữ ký BGH từ trước (Hệ thống tự động bỏ qua các lớp đã ký).`);
                return;
            }
        }
    }

    let duLieuGuiServer = [];
    let mapCapNhatRam = {};

    dsLopMucTieu.forEach(maLop => {
        let lopUp = String(maLop).trim().toUpperCase();
        let khoaTH = `${tuanSo}_${lopUp}`;
        let hienCo = (window.duLieuTongHopSDB && window.duLieuTongHopSDB[khoaTH])
            ? window.duLieuTongHopSDB[khoaTH]
            : { nxGVCN: '', kyGVCN: '', nxBGH: '', kyBGH: '', daLuu: false };

        let nxGVCN_Luu = String(hienCo.nxGVCN || '').trim();
        let kyGVCN_Luu = String(hienCo.kyGVCN || '').trim();
        let nxBGH_Luu = String(hienCo.nxBGH || '').trim();
        let kyBGH_Luu = String(hienCo.kyBGH || '').trim();

        // Nếu là lớp đang hiển thị trên lưới, lấy giá trị hiện tại trên ô nhập của phần còn lại (nếu có) để không làm mất chữ
        if (lopUp === lopHienTai) {
            let domNxGVCN = document.getElementById('txtNxGVCN');
            let domKyGVCN = document.getElementById('txtKyGVCN');
            let domNxBGH = document.getElementById('txtNxBGH');
            let domKyBGH = document.getElementById('txtKyBGH');
            if (loai === 'BGH') {
                if (domNxGVCN && domNxGVCN.value.trim() !== '') nxGVCN_Luu = domNxGVCN.value.trim();
                if (domKyGVCN && domKyGVCN.value.trim() !== '') kyGVCN_Luu = domKyGVCN.value.trim();
            } else {
                if (domNxBGH && domNxBGH.value.trim() !== '') nxBGH_Luu = domNxBGH.value.trim();
                if (domKyBGH && domKyBGH.value.trim() !== '') kyBGH_Luu = domKyBGH.value.trim();
            }
        }

        if (loai === 'GVCN') {
            nxGVCN_Luu = valNxMoi;
            if (tenDayDu) kyGVCN_Luu = tenDayDu;
        } else {
            nxBGH_Luu = valNxMoi;
            if (tenDayDu) kyBGH_Luu = tenDayDu;
        }

        let maLuuTruTH = `${namHocHienTai ? namHocHienTai + '_' : ''}${tuanSo}_${lopUp}_TONGHOP`;

        duLieuGuiServer.push({
            maLuuTru: maLuuTruTH,
            namHoc: namHocHienTai,
            tuan: tuanSo,
            maLop: lopUp,
            thu: 'TONGHOP',
            ngay: '',
            buoi: 'TONGHOP',
            tiet: 'TONGHOP',
            mon: 'Tổng hợp đánh giá tuần',
            tietPPCT: nxGVCN_Luu,
            tenBai: kyGVCN_Luu,
            nhanXet: nxBGH_Luu,
            xepLoai: kyBGH_Luu,
            chuKy: '',
            chuyenCan: ''
        });

        mapCapNhatRam[khoaTH] = {
            nxGVCN: nxGVCN_Luu,
            kyGVCN: kyGVCN_Luu,
            nxBGH: nxBGH_Luu,
            kyBGH: kyBGH_Luu,
            maLuuTru: maLuuTruTH,
            daLuu: true,
            thoiDiemLuu: Date.now()
        };
    });

    let btnLuuModal = document.getElementById('btnLuuModalYKienSDB');
    let btnDongModal = document.getElementById('btnDongModalYKienSDB');
    let textGoc = btnLuuModal ? btnLuuModal.innerHTML : 'Lưu';
    if (btnLuuModal) {
        btnLuuModal.disabled = true;
        btnLuuModal.innerHTML = `⏳ Đang lưu...`;
    }
    if (btnDongModal) btnDongModal.disabled = true;

    dangTaiDuLieuSoDauBai = true;

    try {
        const payload = {
            thaoTac: 'luuSoDauBaiDongBo',
            tuan: String(tuanSo),
            namHoc: namHocHienTai,
            lop: lopHienTai,
            duLieu: duLieuGuiServer,
            emailTruyCap: emailNguoiLuu
        };

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const ketQua = await phanHoi.json();

        if (ketQua && ketQua.trangThai === 'thanh_cong') {
            if (!window.duLieuTongHopSDB) window.duLieuTongHopSDB = {};
            Object.keys(mapCapNhatRam).forEach(kTH => {
                window.duLieuTongHopSDB[kTH] = mapCapNhatRam[kTH];
                boNhoTamTongHopVuaLuu[kTH] = mapCapNhatRam[kTH];
            });

            // Nếu lớp đang mở nằm trong danh sách được cập nhật thì hiển thị ngay lên giao diện hiện tại
            let khoaHienTai = `${tuanSo}_${lopHienTai}`;
            if (mapCapNhatRam[khoaHienTai]) {
                let daCapNhat = mapCapNhatRam[khoaHienTai];
                if (loai === 'GVCN') {
                    let elNx = document.getElementById('txtNxGVCN');
                    let elKy = document.getElementById('txtKyGVCN');
                    if (elNx) {
                        elNx.value = daCapNhat.nxGVCN;
                        elNx.style.height = 'auto';
                        elNx.style.height = elNx.scrollHeight + 'px';
                    }
                    if (elKy) elKy.value = daCapNhat.kyGVCN;
                } else {
                    let elNx = document.getElementById('txtNxBGH');
                    let elKy = document.getElementById('txtKyBGH');
                    if (elNx) {
                        elNx.value = daCapNhat.nxBGH;
                        elNx.style.height = 'auto';
                        elNx.style.height = elNx.scrollHeight + 'px';
                    }
                    if (elKy) elKy.value = daCapNhat.kyBGH;
                }
            }

            // Nếu trên lưới không có dòng tiết học nào đang sửa dở thì tắt cờ chưa lưu để chuyển lớp không bị hỏi
            let coDongTietDangSua = document.querySelector('#vungHienThiSoDauBai .bang-so-dau-bai-container tbody tr[data-thaydoi="true"]');
            if (!coDongTietDangSua) {
                coThayDoiChuaLuu_SDB = false;
            }

            window.dongModalCapNhatYKienSDB();

            if (loai === 'BGH' && dsLopMucTieu.length > 1) {
                alert(`✅ Đã lưu ý kiến và chữ ký BGH thành công cho ${dsLopMucTieu.length} lớp (Tuần ${tuanSo}):\n${dsLopMucTieu.join(', ')}`);
            }
        } else {
            throw new Error((ketQua && ketQua.thongBao) ? ketQua.thongBao : 'Phản hồi máy chủ không thành công.');
        }
    } catch (loi) {
        alert('⚠️ Lưu ý kiến nhận xét lên máy chủ thất bại: ' + loi.message);
        if (btnLuuModal) {
            btnLuuModal.disabled = false;
            btnLuuModal.innerHTML = textGoc;
        }
        if (btnDongModal) btnDongModal.disabled = false;
    } finally {
        dangTaiDuLieuSoDauBai = false;
    }
};

window.kichHoatGhiNhanXet = function(loai, tenNguoiDung) {
    let daDangNhap = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc !== '') || (maGvDangNhapHeThong !== '');
    if (!daDangNhap) {
        return alert("⚠️ Vui lòng đăng nhập qua nút Đăng nhập để thực hiện thao tác ghi nhận xét và ký tên!");
    }

    let tuanChon = document.getElementById('chonTuanSo')?.value || '';
    let lopChon = document.getElementById('chonLopSo')?.value || '';
    if (!tuanChon || !lopChon) {
        return alert("Vui lòng chọn Tuần và Lớp trước khi thực hiện!");
    }
    if (window.kiemTraTuanDaKhoa(tuanChon)) {
        return alert(`⛔ Sổ đầu bài Tuần này đã bị khóa toàn trường. Không thể chỉnh sửa!`);
    }

    let tuanSo = parseInt(String(tuanChon).replace(/\D/g, ''), 10) || 0;
    let lopHienTai = String(lopChon).trim().toUpperCase();
    let tenDayDu = window.layHoTenDayDuGiaoVienSDB(tenNguoiDung);

    let txtNx = document.getElementById(`txtNx${loai}`);
    let cauMau = loai === 'GVCN'
        ? "Học sinh tích cực học. Tỷ lệ chuyên cần tương đối đảm bảo"
        : "Thực hiện đúng kế hoạch";
    let giaTriHienTai = (txtNx && txtNx.value.trim() !== '') ? txtNx.value.trim() : cauMau;

    window.dongModalCapNhatYKienSDB();
    tapHopLopBoSungModalBGH.clear();

    let tieuDeModal = loai === 'GVCN'
        ? 'Thêm - Sửa ý kiến giáo viên chủ nhiệm'
        : 'Cập nhật ý kiến của BGH';
    let nhanYKien = loai === 'GVCN' ? 'Ý kiến GVCN:' : 'Ý kiến BGH:';

    let htmlKhoiMoRongBGH = '';
    if (loai === 'BGH') {
        let mangLopTatCa = layDanhSachTatCaLopTheoTuanSDB(tuanSo);
        let tapKhoi = new Set();
        mangLopTatCa.forEach(lop => {
            let m = lop.match(/^\d+/) || lop.match(/\d+/);
            if (m) tapKhoi.add(m[0]);
        });
        let mangKhoi = Array.from(tapKhoi).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

        let optionsKhoi = `<option value="">---</option>` + mangKhoi.map(k => `<option value="${k}">Khối ${k}</option>`).join('');
        let optionsLop = `<option value="">---</option>` + mangLopTatCa.map(l => {
            let daKy = kiemTraLopDaKyBghTheoTuan(tuanSo, l, lopHienTai);
            return `<option value="${l}">${l}${daKy ? ' (Đã ký)' : ''}</option>`;
        }).join('');

        htmlKhoiMoRongBGH = `
            <div class="mt-4 flex items-center gap-2">
                <input type="checkbox" id="chkApDungTatCaBGH" onchange="xuLyThayDoiCheckboxTatCaBGH()" class="w-4 h-4 cursor-pointer accent-blue-700">
                <label for="chkApDungTatCaBGH" class="text-[13.5px] text-slate-900 cursor-pointer select-none font-medium">Áp dụng chung cho các lớp còn lại</label>
            </div>
            <div class="mt-3.5 flex flex-wrap items-center gap-6">
                <div class="flex items-center gap-2">
                    <label for="selKhoiApDungBGH" class="text-[13.5px] text-slate-800 whitespace-nowrap">Khối học:</label>
                    <select id="selKhoiApDungBGH" onchange="xuLyThayDoiKhoiModalBGH()" class="bg-white border border-[#9cb2ce] rounded-sm px-2.5 py-1 text-[13.5px] text-slate-900 outline-none focus:border-blue-600 min-w-[130px] cursor-pointer shadow-inner">
                        ${optionsKhoi}
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label for="selLopApDungBGH" class="text-[13.5px] text-slate-800 whitespace-nowrap">Lớp:</label>
                    <select id="selLopApDungBGH" onchange="xuLyChonThemLopModalBGH(this)" class="bg-white border border-[#9cb2ce] rounded-sm px-2.5 py-1 text-[13.5px] text-slate-900 outline-none focus:border-blue-600 min-w-[130px] cursor-pointer shadow-inner">
                        ${optionsLop}
                    </select>
                </div>
            </div>
            <div id="vungTheLopBoSungBGH" class="hidden"></div>
            <div id="vungTomTatPhamViBGH" class="mt-2.5 pt-2 border-t border-[#c4d8f2]"></div>
        `;
    }

    let modalDiv = document.createElement('div');
    modalDiv.id = 'modalCapNhatYKienSDB';
    modalDiv.setAttribute('data-loai', loai);
    modalDiv.setAttribute('data-tendaydu', tenDayDu);
    modalDiv.setAttribute('data-tuan', String(tuanSo));
    modalDiv.setAttribute('data-lop', lopHienTai);
    modalDiv.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-3';
    modalDiv.style.fontFamily = 'Tahoma, Arial, sans-serif';

    modalDiv.innerHTML = `
        <div class="w-full max-w-[660px] rounded-[6px] border border-[#8ba7cf] bg-[#cedff5] shadow-2xl overflow-hidden select-none" onclick="event.stopPropagation()">
            <!-- Thanh tiêu đề hộp thoại -->
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-[#99bbe8]" style="background: linear-gradient(180deg, #e4effc 0%, #bdd3f2 100%);">
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-[#15428b] flex-none" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="2" width="14" height="12" rx="1" fill="#ffffff" stroke="#3b6ea5" stroke-width="1.2"/>
                        <rect x="1" y="2" width="14" height="3.2" fill="#4b83c3"/>
                        <line x1="3.5" y1="7.5" x2="6" y2="7.5" stroke="#4b83c3" stroke-width="1.2"/>
                        <line x1="7.5" y1="7.5" x2="12.5" y2="7.5" stroke="#9ab4d6" stroke-width="1.2"/>
                        <line x1="3.5" y1="10.5" x2="6" y2="10.5" stroke="#4b83c3" stroke-width="1.2"/>
                        <line x1="7.5" y1="10.5" x2="12.5" y2="10.5" stroke="#9ab4d6" stroke-width="1.2"/>
                    </svg>
                    <span class="font-bold text-[13.5px] text-[#15428b] tracking-tight">${tieuDeModal}</span>
                </div>
                <button type="button" onclick="dongModalCapNhatYKienSDB()" class="w-5 h-5 flex items-center justify-center rounded-[2px] border border-[#8ba7cf] text-[#3b5a82] hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors font-bold text-xs leading-none cursor-pointer" style="background: linear-gradient(180deg, #ffffff 0%, #d4e3f7 100%);" title="Đóng">&times;</button>
            </div>

            <!-- Khung nội dung chính -->
            <div class="p-2.5">
                <div class="rounded-[5px] border border-[#99bbe8] bg-[#dfe9f6] p-4">
                    <div class="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                        <label for="modalTxtYKienSDB" class="text-[13.5px] text-slate-900 sm:w-[95px] flex-none pt-1">${nhanYKien}</label>
                        <textarea id="modalTxtYKienSDB" rows="3" class="flex-1 w-full bg-white border border-[#b5b8c8] focus:border-blue-600 rounded-[2px] p-2 text-[14px] text-slate-900 outline-none resize-y min-h-[78px] shadow-inner"></textarea>
                    </div>
                    ${htmlKhoiMoRongBGH}
                </div>
            </div>

            <!-- Thanh nút bấm dưới cùng -->
            <div class="px-3 pb-2.5 pt-0.5 flex items-center justify-end gap-2">
                <button type="button" id="btnLuuModalYKienSDB" onclick="luuYKienNhanXetTuModal()" class="min-w-[78px] px-4 py-1 text-[13px] text-slate-900 border border-[#8a9ba8] rounded-[3px] hover:border-[#4b83c3] active:translate-y-[0.5px] cursor-pointer shadow-xs font-medium" style="background: linear-gradient(180deg, #ffffff 0%, #e1e6eb 100%);">
                    Lưu
                </button>
                <button type="button" id="btnDongModalYKienSDB" onclick="dongModalCapNhatYKienSDB()" class="min-w-[78px] px-4 py-1 text-[13px] text-slate-900 border border-[#8a9ba8] rounded-[3px] hover:border-[#4b83c3] active:translate-y-[0.5px] cursor-pointer shadow-xs font-medium" style="background: linear-gradient(180deg, #ffffff 0%, #e1e6eb 100%);">
                    Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    let ta = document.getElementById('modalTxtYKienSDB');
    if (ta) {
        ta.value = giaTriHienTai;
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    if (loai === 'BGH') {
        window.capNhatTrangThaiPhamViModalBGH();
    }
};
