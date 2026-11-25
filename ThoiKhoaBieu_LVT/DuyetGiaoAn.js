// =========================================================================
// PHÂN HỆ: QUẢN LÝ & PHÊ DUYỆT GIÁO ÁN 1 CHẠM (DuyetGiaoAn.js)
// Đồng bộ 2 chiều: Tab Duyệt Giáo Án (BGH) <-> Sổ Đầu Bài Điện Tử
// =========================================================================

window.duLieuGiaoAnToanCuc = window.duLieuGiaoAnToanCuc || [];
window.daTaiDuLieuGiaoAn = window.daTaiDuLieuGiaoAn || false;
window.dangTaiDuLieuGiaoAn = false;

let _nguCanhTaiLenGA = null; // Lưu tạm { tuan, maGV, tenGV, fileIdCu } khi bấm chọn file
let _dangMoModalCheDoDuyet = false;

window.dinhDangThoiGianGA = function(val) {
    if (!val) return '';
    let s = String(val).trim();
    if (!s) return '';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
    let d = new Date(s);
    if (!isNaN(d.getTime())) {
        let dd = String(d.getDate()).padStart(2, '0');
        let mm = String(d.getMonth() + 1).padStart(2, '0');
        let yyyy = d.getFullYear();
        let hh = String(d.getHours()).padStart(2, '0');
        let min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
    return s;
};

// 1. Khởi tạo DOM Menu & Khung Duyệt Giáo Án (tự động chèn nếu HTML chưa có)
window.khoiTaoDOMDuyetGiaoAn = function() {
    const nav = document.querySelector('nav');
    const vungChinh = document.getElementById('vungHienThiChinh');

    if (nav && !document.getElementById('menuDuyetGiaoAn')) {
        const menuHtml = `
            <a id="menuDuyetGiaoAn" onclick="moTabDuyetGiaoAn()" style="display: none;" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group">
                <svg class="w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15l2 2 4-4"></path>
                </svg>
                <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px] whitespace-nowrap">10. Duyệt Giáo án</span>
            </a>`;
        nav.insertAdjacentHTML('beforeend', menuHtml);
    }

    if (vungChinh && !document.getElementById('khungDuyetGiaoAn')) {
        const khungHtml = `
            <div id="khungDuyetGiaoAn" class="hidden p-3 md:p-4 w-full max-w-full min-w-0 h-full flex-col font-sans overflow-hidden">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3 flex-none">
                    <div>
                        <h2 class="text-xl font-extrabold text-blue-900 uppercase">KIỂM TRA &amp; PHÊ DUYỆT GIÁO ÁN (BGH)</h2>
                        <p class="text-xs text-slate-500 font-semibold mt-0.5">Duyệt giáo án tập trung theo tuần và tích xác nhận chi tiết từng môn giảng dạy</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="taiDanhSachGiaoAnTuMayChu(true)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5 cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Làm mới</span>
                        </button>
                    </div>
                </div>

                <!-- Thanh bộ lọc -->
                <div class="bg-white border border-gray-300 shadow-sm p-3 mb-3 rounded flex flex-wrap items-center gap-3 flex-none">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700">Tuần:</span>
                        <select id="locTuanDuyetGA" onchange="ketXuatBangDuyetGiaoAn()" class="border border-blue-300 rounded px-2.5 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 outline-none cursor-pointer">
                            <option value="">Tất cả tuần</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700">Trạng thái:</span>
                        <select id="locTrangThaiDuyetGA" onchange="ketXuatBangDuyetGiaoAn()" class="border border-blue-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none cursor-pointer">
                            <option value="CAN_XU_LY">Cần xử lý (Chờ duyệt &amp; Đã sửa)</option>
                            <option value="">Tất cả trạng thái</option>
                            <option value="DA_SUA">Đã sửa - Chờ duyệt lại</option>
                            <option value="CHO_DUYET">Chờ duyệt</option>
                            <option value="DUYET_MOT_PHAN">Duyệt một phần</option>
                            <option value="CAN_SUA">Có môn cần sửa</option>
                            <option value="DA_DUYET">Đã duyệt đủ</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <input type="text" id="timKiemDuyetGA" oninput="ketXuatBangDuyetGiaoAn()" placeholder="Tìm tên giáo viên hoặc môn học..." class="w-full border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500">
                    </div>
                    <div id="thongKeNhanhDuyetGA" class="text-xs font-bold text-slate-600"></div>
                </div>

                <!-- Bảng danh sách giáo án -->
                <div class="flex-1 min-w-0 w-full overflow-auto border border-gray-400 shadow-sm bg-white relative">
                    <table class="bang-excel w-full text-center">
                        <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm text-xs md:text-sm">
                            <tr>
                                <th class="py-2 px-1.5 w-10">STT</th>
                                <th class="py-2 px-1.5 w-20">ID GV</th>
                                <th class="py-2 px-2 w-36">Tên Giáo viên</th>
                                <th class="py-2 px-1.5 w-16">Tuần</th>
                                <th class="py-2 px-2">Môn phân công &amp; Trạng thái từng môn</th>
                                <th class="py-2 px-2 w-44">Tên giáo án</th>
                                <th class="py-2 px-1.5 w-28">Trạng thái chung</th>
                                <th class="py-2 px-1.5 w-28">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="vungDuLieuDuyetGiaoAn">
                            <tr><td colspan="8" class="text-center py-10 text-slate-500 font-bold">Đang chuẩn bị dữ liệu giáo án...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        vungChinh.insertAdjacentHTML('beforeend', khungHtml);
    }

    if (!document.getElementById('inputFileGiaoAn1Cham')) {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.id = 'inputFileGiaoAn1Cham';
        inp.accept = '.pdf,.doc,.docx,.ppt,.pptx';
        inp.className = 'hidden';
        inp.addEventListener('change', xuLyChonFileGiaoAn1Cham);
        document.body.appendChild(inp);
    }
};

// 2. Các hàm kiểm tra quyền & định danh dùng chung
window.layThongTinNguoiDangNhapGA = function() {
    let theChot = document.getElementById('theChotQuyenSDB');
    let maGV = (typeof maGvDangNhapHeThong !== 'undefined' && maGvDangNhapHeThong) ? maGvDangNhapHeThong : (theChot ? (theChot.getAttribute('data-madinhdanh') || '') : '');
    let tenGV = (theChot && theChot.getAttribute('data-tendinhdanh')) ? theChot.getAttribute('data-tendinhdanh') : '';
    if (!tenGV && maGV && typeof window.layHoTenDayDuGiaoVienSDB === 'function') {
        tenGV = window.layHoTenDayDuGiaoVienSDB(maGV);
    }
    let email = (typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' && window.dinhDanhGiaoVienToanCuc) ? String(window.dinhDanhGiaoVienToanCuc).trim() : '';
    return { maGV: String(maGV || '').trim(), tenGV: String(tenGV || maGV || '').trim(), email: email };
};

window.coQuyenDuyetGiaoAn = function() {
    let coAdmin = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) || (typeof window.quyenSuaChua !== 'undefined' && window.quyenSuaChua) || (typeof coToanQuyenSDB !== 'undefined' && coToanQuyenSDB);
    if (coAdmin) return true;
    let qCK = (typeof window.layQuyenCongKhaiHienTai === 'function') ? window.layQuyenCongKhaiHienTai() : { menu: [], nut: [] };
    let menuCap = (typeof quyenChiTiet !== 'undefined' && quyenChiTiet && Array.isArray(quyenChiTiet.menu)) ? quyenChiTiet.menu : [];
    let menuCK = Array.isArray(qCK.menu) ? qCK.menu : [];
    return menuCap.includes('menuDuyetGiaoAn') || menuCK.includes('menuDuyetGiaoAn');
};

window.layNamHocHienTaiGA = function() {
    if (typeof namHocHeThongSDB !== 'undefined' && namHocHeThongSDB) return String(namHocHeThongSDB).trim();
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) return String(thongSoHocVu.NAM_HOC).trim();
    return '';
};

// 3. Trích xuất danh sách môn dạy theo phân công TKB của 1 giáo viên trong 1 tuần
window.layDanhSachMonPhanCongCuaGvTheoTuan = function(maGV, tuanSo) {
    let tTarget = parseInt(String(tuanSo || '').replace(/\D/g, ''), 10) || 0;
    let maNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(maGV) : String(maGV || '').trim().toLowerCase();
    if (!maNorm || !tTarget) return [];

    let nguon = [];
    if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap) && duLieuTKBGopDaMap.length > 0) {
        nguon = duLieuTKBGopDaMap;
    } else if (typeof mapTkbToanTapToanCuc !== 'undefined' && mapTkbToanTapToanCuc) {
        nguon = Object.values(mapTkbToanTapToanCuc);
    }

    let mapMonLop = {};
    nguon.forEach(d => {
        let t = d._tuanSo !== undefined ? d._tuanSo : (parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0);
        if (t !== tTarget) return;
        let mon = String(d['Môn Học'] || '').trim();
        let lop = String(d['Mã Lớp'] || '').trim().toUpperCase();
        let gvStr = String(d['Mã GV'] || '').trim();
        if (!mon || mon === '--' || mon === '---' || !gvStr) return;

        let tapGv = gvStr.split(/[,;&-]/).map(g => (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(g) : g.trim().toLowerCase()).filter(Boolean);
        let khop = tapGv.includes(maNorm) || tapGv.some(g => maNorm.includes(g) && g.length > 2);
        if (khop) {
            if (!mapMonLop[mon]) mapMonLop[mon] = new Set();
            if (lop) mapMonLop[mon].add(lop);
        }
    });

    return Object.keys(mapMonLop).sort((a, b) => a.localeCompare(b, 'vi')).map(mon => ({
        mon: mon,
        lopList: Array.from(mapMonLop[mon]).sort()
    }));
};

window.layChuoiLopDayCuaGvTheoTuanGA = function(maGV, tuanSo) {
    let dsMon = window.layDanhSachMonPhanCongCuaGvTheoTuan(maGV, tuanSo);
    let tapLop = new Set();
    dsMon.forEach(item => {
        (item.lopList || []).forEach(l => {
            let lopStr = String(l || "").trim();
            if (lopStr) tapLop.add(lopStr);
        });
    });
    let arrLop = Array.from(tapLop).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
    if (arrLop.length === 0) return "";
    if (arrLop.length <= 3) return arrLop.join("-");
    return arrLop.slice(0, 3).join("-") + "...";
};

// 4. Tìm giáo án của 1 giáo viên trong 1 tuần
window.timGiaoAnTheoGvVaTuan = function(maGV, tuanSo) {
    let tTarget = parseInt(String(tuanSo || '').replace(/\D/g, ''), 10) || 0;
    let maNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(maGV) : String(maGV || '').trim().toLowerCase();
    if (!maNorm || !tTarget || !Array.isArray(window.duLieuGiaoAnToanCuc)) return null;

    return window.duLieuGiaoAnToanCuc.find(ga => {
        let tGa = parseInt(String(ga.tuan || '').replace(/\D/g, ''), 10) || 0;
        if (tGa !== tTarget) return false;
        let gaMaNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(ga.maGV) : String(ga.maGV || '').trim().toLowerCase();
        let gaTenNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(ga.tenGV) : String(ga.tenGV || '').trim().toLowerCase();
        return gaMaNorm === maNorm || (gaTenNorm !== '' && gaTenNorm === maNorm) || (gaMaNorm.length > 2 && maNorm.includes(gaMaNorm)) || (gaTenNorm.length > 2 && maNorm.includes(gaTenNorm));
    }) || null;
};

// Lấy trạng thái của 1 môn cụ thể từ bản ghi giáo án
window.layTrangThaiMonTrongGiaoAn = function(giaoAn, tenMon) {
    if (!giaoAn) return { trangThai: 'CHUA_NOP', nhanXet: '' };
    let chiTiet = giaoAn.chiTietMon || {};
    let monNorm = String(tenMon || '').trim().toLowerCase().normalize('NFC');
    for (let k in chiTiet) {
        if (String(k).trim().toLowerCase().normalize('NFC') === monNorm) {
            return {
                trangThai: chiTiet[k].trangThai || 'CHO_DUYET',
                nhanXet: chiTiet[k].nhanXet || ''
            };
        }
    }
    return {
        trangThai: (giaoAn.trangThaiChung === 'DA_DUYET' || giaoAn.trangThaiChung === 'CAN_SUA' || giaoAn.trangThaiChung === 'DA_SUA')
            ? giaoAn.trangThaiChung : 'CHO_DUYET',
        nhanXet: giaoAn.nhanXetChung || ''
    };
};

// Trả về chuỗi "Môn (Lớp)" cho các môn có trạng thái CAN_SUA
window.layChuoiMonCanSuaGA = function(ga, maGV, tuanSo) {
    if (!ga || !ga.chiTietMon) return "";
    let dsPC = window.layDanhSachMonPhanCongCuaGvTheoTuan(maGV || ga.maGV, tuanSo || ga.tuan);
    let mapLop = {};
    dsPC.forEach(item => {
        mapLop[String(item.mon || "").trim().toLowerCase().normalize("NFC")] = item.lopList || [];
    });
    let ketQua = [];
    for (let mon in ga.chiTietMon) {
        let ct = ga.chiTietMon[mon];
        if (ct && ct.trangThai === "CAN_SUA") {
            let key = String(mon).trim().toLowerCase().normalize("NFC");
            let lops = mapLop[key] || [];
            ketQua.push(lops.length > 0 ? `${mon} (${lops.join(", ")})` : mon);
        }
    }
    return ketQua.join(", ");
};

// Helper render thông tin hiển thị của từng mã trạng thái
window.layThongTinHienThiTrangThaiGA = function(maTrangThai) {
    switch (maTrangThai) {
        case 'DA_DUYET':
            return { nhan: 'Đã duyệt', mauCham: 'bg-emerald-500', mauBadge: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100', nhapNhay: false };
        case 'CAN_SUA':
            return { nhan: 'Cần sửa', mauCham: 'bg-rose-600', mauBadge: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100', nhapNhay: true };
        case 'DA_SUA':
            return { nhan: 'Đã sửa', mauCham: 'bg-blue-600', mauBadge: 'bg-blue-50 text-blue-800 border-blue-400 hover:bg-blue-100', nhapNhay: true };
        case 'DUYET_MOT_PHAN':
            return { nhan: 'Duyệt 1 phần', mauCham: 'bg-teal-500', mauBadge: 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100', nhapNhay: false };
        default:
            return { nhan: 'Chờ duyệt', mauCham: 'bg-amber-400', mauBadge: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100', nhapNhay: false };
    }
};

// Tạo HTML nút 1 chạm cho ô MÔN trong SoDauBai.js
window.taoHtmlNutGiaoAnChoO = function(tuanSo, monHoc, maGvTiet, coQuyenTai) {
    if (!monHoc || String(monHoc).trim() === '') return '';
    let gvStr = String(maGvTiet || '').trim();
    if (!gvStr) return '';
    let gvDau = gvStr.split(/[,;&-]/)[0].trim();
    let ga = window.timGiaoAnTheoGvVaTuan(gvDau, tuanSo);

    if (ga) {
        let infoMon = window.layTrangThaiMonTrongGiaoAn(ga, monHoc);
        let ui = window.layThongTinHienThiTrangThaiGA(infoMon.trangThai);
        let tooltip = `${ga.tenFile} — ${ui.nhan}` + (infoMon.nhanXet ? `\nGóp ý BGH: ${infoMon.nhanXet}` : '');
        let gaIdSafe = String(ga.id || '').replace(/'/g, "\\'");
        let monSafe = String(monHoc || '').replace(/'/g, "\\'");
        return `<button type="button" onmouseenter="taiTruocNoiDungGiaoAnGA('${String(ga.fileId || '').replace(/'/g, "\\'")}')" onclick="event.stopPropagation(); moGiaoAnTuOSoDauBaiBtn(this, '${gaIdSafe}', '${monSafe}')" title="${tooltip.replace(/"/g, '&quot;')}" class="nut-giao-an-sdb hide-on-print mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold transition cursor-pointer ${ui.mauBadge} ${ui.nhapNhay ? 'animate-pulse' : ''}">
            <span class="w-2 h-2 rounded-full ${ui.mauCham} flex-none"></span>
            <span>${ui.nhan}</span>
        </button>`;
    } else if (coQuyenTai) {
        let tNum = parseInt(String(tuanSo || '').replace(/\D/g, ''), 10) || 0;
        let gvSafe = gvDau.replace(/'/g, "\\'");
        return `<button type="button" onclick="event.stopPropagation(); kichHoatTaiGiaoAn1Cham(${tNum}, '${gvSafe}', '')" title="Bấm chọn file để tải giáo án Tuần ${tNum} (chỉ tải 1 lần cho tất cả môn)" class="nut-giao-an-sdb hide-on-print mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer">
            <span>+ Tải GA</span>
        </button>`;
    }
    return '';
};

// 5. Tải danh sách giáo án từ Backend (có bộ nhớ đệm nhẹ)
window.taiDanhSachGiaoAnTuMayChu = async function(buocTaiMoi = false) {
    if (window.dangTaiDuLieuGiaoAn) return window.duLieuGiaoAnToanCuc;
    if (!buocTaiMoi && window.daTaiDuLieuGiaoAn) return window.duLieuGiaoAnToanCuc;
    if (typeof CAU_HINH_FRONTEND === 'undefined' || !CAU_HINH_FRONTEND.URL_API_MAY_CHU) return [];

    if (buocTaiMoi) {
        window.boNhoNoiDungGiaoAn = {};
        if (typeof window.xoaCacheNoiDungGA_IDB === 'function') window.xoaCacheNoiDungGA_IDB(null);
    }
    window.dangTaiDuLieuGiaoAn = true;
    try {
        let namHoc = window.layNamHocHienTaiGA();
        let url = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhSachGiaoAn&namHoc=${encodeURIComponent(namHoc)}`;
        const phanHoi = await fetchVoiCoCheThuLai(url, {}, 2, 25000);
        const kq = await phanHoi.json();
        if (kq && kq.trangThai === 'thanh_cong' && Array.isArray(kq.danhSach)) {
            window.duLieuGiaoAnToanCuc = kq.danhSach;
            window.daTaiDuLieuGiaoAn = true;
        }
    } catch (e) {
        console.warn("Không thể tải danh sách giáo án:", e);
    } finally {
        window.dangTaiDuLieuGiaoAn = false;
        let khungDuyet = document.getElementById('khungDuyetGiaoAn');
        if (khungDuyet && !khungDuyet.classList.contains('hidden')) {
            window.napBoLocTuanDuyetGA();
            window.ketXuatBangDuyetGiaoAn();
        }
        let khungSDB = document.getElementById('khungSoDauBai');
        if (khungSDB && !khungSDB.classList.contains('hidden') && typeof coThayDoiChuaLuu_SDB !== 'undefined' && !coThayDoiChuaLuu_SDB) {
            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function') thucThiKetXuatSoDauBaiLenLuoi();
        }
    }
    return window.duLieuGiaoAnToanCuc;
};

// 6. Tải lên / Thay file giáo án 1 CHẠM
window.kichHoatTaiGiaoAn1Cham = function(tuanSo, maGV, fileIdCu = '') {
    let infoUser = window.layThongTinNguoiDangNhapGA();
    if (!infoUser.email && !infoUser.maGV) {
        return alert("⚠️ Vui lòng đăng nhập tài khoản trước khi tải giáo án lên!");
    }
    let maDung = maGV || infoUser.maGV;
    let tenDayDu = (typeof window.layHoTenDayDuGiaoVienSDB === 'function') ? window.layHoTenDayDuGiaoVienSDB(maDung) : (infoUser.tenGV || maDung);
    if (!tenDayDu || tenDayDu.includes('@')) tenDayDu = infoUser.tenGV || maDung;

    _nguCanhTaiLenGA = {
        tuan: parseInt(String(tuanSo).replace(/\D/g, ''), 10) || 1,
        maGV: maDung,
        tenGV: tenDayDu,
        fileIdCu: fileIdCu || ''
    };

    let inp = document.getElementById('inputFileGiaoAn1Cham');
    if (!inp) {
        window.khoiTaoDOMDuyetGiaoAn();
        inp = document.getElementById('inputFileGiaoAn1Cham');
    }
    if (inp) {
        inp.value = '';
        inp.click();
    }
};

async function xuLyChonFileGiaoAn1Cham(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || !_nguCanhTaiLenGA) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
        alert(`⚠️ Tệp "${file.name}" có dung lượng ${(file.size / 1024 / 1024).toFixed(1)} MB vượt quá giới hạn 10 MB.\nVui lòng xuất sang PDF hoặc nén nhẹ lại trước khi tải lên.`);
        event.target.value = '';
        return;
    }

    const ctx = { ..._nguCanhTaiLenGA };
    _nguCanhTaiLenGA = null;

    let ext = '';
    let idxDot = file.name.lastIndexOf('.');
    if (idxDot !== -1) ext = file.name.substring(idxDot).toLowerCase();
    let chuoiLop = window.layChuoiLopDayCuaGvTheoTuanGA(ctx.maGV, ctx.tuan);
    let tenFileChuan = chuoiLop
        ? `${ctx.tenGV}_${chuoiLop}_Tuần ${ctx.tuan}${ext}`
        : `${ctx.tenGV}_Tuần ${ctx.tuan}${ext}`;

    let thongBaoTai = document.getElementById('thongBaoTaiGiaoAnDangChay');
    if (!thongBaoTai) {
        thongBaoTai = document.createElement('div');
        thongBaoTai.id = 'thongBaoTaiGiaoAnDangChay';
        thongBaoTai.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-blue-900 text-white px-5 py-3 rounded-xl shadow-2xl z-[10050] flex items-center gap-3 font-bold text-sm';
        document.body.appendChild(thongBaoTai);
    }
    thongBaoTai.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang tải "${tenFileChuan}" lên hệ thống...</span>`;
    thongBaoTai.classList.remove('hidden');

    try {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                let res = String(reader.result || '');
                let commaIdx = res.indexOf(',');
                resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
            };
            reader.onerror = () => reject(new Error('Không thể đọc tệp từ máy.'));
            reader.readAsDataURL(file);
        });

        let namHoc = window.layNamHocHienTaiGA();
        let dsMon = window.layDanhSachMonPhanCongCuaGvTheoTuan(ctx.maGV, ctx.tuan).map(x => x.mon);
        let laSua = !!ctx.fileIdCu;

        const payload = {
            thaoTac: laSua ? 'suaGiaoAn' : 'taiLenGiaoAn',
            namHoc: namHoc,
            tuan: ctx.tuan,
            maGV: ctx.maGV,
            tenGV: ctx.tenGV,
            tenFile: tenFileChuan,
            mimeType: file.type || 'application/octet-stream',
            duLieuBase64: base64Data,
            fileIdCu: ctx.fileIdCu,
            dsMonPhanCong: dsMon,
            emailTruyCap: window.layThongTinNguoiDangNhapGA().email || ctx.maGV
        };

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        }, 2, 60000);
        const kq = await phanHoi.json();

        if (kq && kq.trangThai === 'thanh_cong' && kq.giaoAn) {
            if (ctx.fileIdCu && window.boNhoNoiDungGiaoAn) {
                delete window.boNhoNoiDungGiaoAn[ctx.fileIdCu];
                if (typeof window.xoaCacheNoiDungGA_IDB === 'function') window.xoaCacheNoiDungGA_IDB(ctx.fileIdCu);
            }
            let idx = window.duLieuGiaoAnToanCuc.findIndex(g => g.id === kq.giaoAn.id);
            if (idx !== -1) window.duLieuGiaoAnToanCuc[idx] = kq.giaoAn;
            else window.duLieuGiaoAnToanCuc.push(kq.giaoAn);

            if (document.getElementById('modalXemDuyetGiaoAn')) {
                let ttCu = _trangThaiTimKiemGA ? _trangThaiTimKiemGA.thongTinBai : null;
                let monCu = ttCu ? ttCu.mon : '';
                window.moModalXemGiaoAnSDB(kq.giaoAn.id, monCu, _dangMoModalCheDoDuyet, ttCu);
            }
            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function' && !document.getElementById('khungSoDauBai')?.classList.contains('hidden')) {
                thucThiKetXuatSoDauBaiLenLuoi();
            }
            if (!document.getElementById('khungDuyetGiaoAn')?.classList.contains('hidden')) {
                window.ketXuatBangDuyetGiaoAn();
            }
        } else {
            throw new Error((kq && kq.thongBao) ? kq.thongBao : 'Tải lên thất bại.');
        }
    } catch (err) {
        alert('⚠️ Lỗi tải giáo án: ' + err.message);
    } finally {
        thongBaoTai.classList.add('hidden');
        event.target.value = '';
    }
}

// 7. Mở Tab Duyệt Giáo Án (BGH)
window.moTabDuyetGiaoAn = function() {
    window.khoiTaoDOMDuyetGiaoAn();
    if (typeof kichHoatTab === 'function') {
        kichHoatTab('menuDuyetGiaoAn', 'khungDuyetGiaoAn', false);
    }
    window.taiDanhSachGiaoAnTuMayChu(false).then(() => {
        window.napBoLocTuanDuyetGA();
        window.ketXuatBangDuyetGiaoAn();
    });
};

window.napBoLocTuanDuyetGA = function() {
    let sel = document.getElementById('locTuanDuyetGA');
    if (!sel) return;
    let valCu = sel.value;
    let tapTuan = new Set();
    (window.duLieuGiaoAnToanCuc || []).forEach(g => {
        if (g.tuan) tapTuan.add(parseInt(g.tuan, 10));
    });
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI) {
        tapTuan.add(parseInt(thongSoHocVu.TUAN_HIEN_TAI, 10));
    }
    let arrTuan = Array.from(tapTuan).filter(Boolean).sort((a, b) => b - a);
    sel.innerHTML = `<option value="">Tất cả tuần</option>` + arrTuan.map(t => `<option value="${t}">Tuần ${t}</option>`).join('');
    if (valCu && arrTuan.includes(parseInt(valCu, 10))) sel.value = valCu;
};

window.ketXuatBangDuyetGiaoAn = function() {
    let tbody = document.getElementById('vungDuLieuDuyetGiaoAn');
    if (!tbody) return;

    let tuanLoc = document.getElementById('locTuanDuyetGA')?.value || '';
    let trangThaiLoc = document.getElementById('locTrangThaiDuyetGA')?.value || '';
    let tuKhoa = (document.getElementById('timKiemDuyetGA')?.value || '').trim().toLowerCase().normalize('NFC');

    let ds = [...(window.duLieuGiaoAnToanCuc || [])];
    const thuTuUuTien = { 'DA_SUA': 1, 'CHO_DUYET': 2, 'CAN_SUA': 3, 'DUYET_MOT_PHAN': 4, 'DA_DUYET': 5 };
    ds.sort((a, b) => {
        let uA = thuTuUuTien[a.trangThaiChung] || 9;
        let uB = thuTuUuTien[b.trangThaiChung] || 9;
        if (uA !== uB) return uA - uB;
        return (parseInt(b.tuan, 10) || 0) - (parseInt(a.tuan, 10) || 0);
    });

    let dsLoc = ds.filter(g => {
        if (tuanLoc && String(g.tuan) !== String(tuanLoc)) return false;
        if (trangThaiLoc === 'CAN_XU_LY') {
            if (g.trangThaiChung !== 'CHO_DUYET' && g.trangThaiChung !== 'DA_SUA' && g.trangThaiChung !== 'DUYET_MOT_PHAN') return false;
        } else if (trangThaiLoc && g.trangThaiChung !== trangThaiLoc) {
            return false;
        }
        if (tuKhoa) {
            let monPC = window.layDanhSachMonPhanCongCuaGvTheoTuan(g.maGV, g.tuan).map(m => m.mon).join(' ');
            let chuoiTim = `${g.tenGV} ${g.maGV} ${g.tenFile} ${monPC}`.toLowerCase().normalize('NFC');
            if (!chuoiTim.includes(tuKhoa)) return false;
        }
        return true;
    });

    let thongKeEl = document.getElementById('thongKeNhanhDuyetGA');
    if (thongKeEl) {
        let choDuyet = ds.filter(g => g.trangThaiChung === 'CHO_DUYET' || g.trangThaiChung === 'DA_SUA').length;
        thongKeEl.innerHTML = `Hiển thị: <span class="text-blue-800">${dsLoc.length}</span> | Chờ xử lý: <span class="text-rose-700">${choDuyet}</span>`;
    }

    if (dsLoc.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-500 font-bold">Không có giáo án nào khớp điều kiện lọc.</td></tr>`;
        return;
    }

    let html = '';
    dsLoc.forEach((g, idx) => {
        let dsMon = window.layDanhSachMonPhanCongCuaGvTheoTuan(g.maGV, g.tuan);
        let pillsMon = dsMon.length > 0 ? dsMon.map(m => {
            let stMon = window.layTrangThaiMonTrongGiaoAn(g, m.mon);
            let uiM = window.layThongTinHienThiTrangThaiGA(stMon.trangThai);
            let iconM = stMon.trangThai === 'DA_DUYET' ? '✓' : (stMon.trangThai === 'CAN_SUA' ? '✕' : (stMon.trangThai === 'DA_SUA' ? '↻' : '○'));
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${uiM.mauBadge}" title="${stMon.nhanXet ? 'Góp ý: ' + stMon.nhanXet : uiM.nhan}">
                <span>${iconM}</span><span>${m.mon}</span>
            </span>`;
        }).join('') : `<span class="text-xs italic text-slate-400">Chưa có tiết TKB tuần ${g.tuan}</span>`;

        let uiChung = window.layThongTinHienThiTrangThaiGA(g.trangThaiChung);
        let idSafe = String(g.id || '').replace(/'/g, "\\'");

        html += `<tr class="hover:bg-slate-50 border-b border-gray-300">
            <td class="p-2 font-bold text-slate-700">${idx + 1}</td>
            <td class="p-2 font-bold text-slate-700">${g.maGV || ''}</td>
            <td class="p-2 text-left font-bold text-blue-900">${g.tenGV || g.maGV}</td>
            <td class="p-2 font-extrabold text-slate-800">Tuần ${g.tuan}</td>
            <td class="p-2 text-left"><div class="flex flex-wrap gap-1.5">${pillsMon}</div></td>
            <td class="p-2 text-left text-xs font-semibold text-slate-700 max-w-[190px] align-middle" style="white-space: normal !important;"><div class="whitespace-normal leading-snug" style="white-space: normal !important; overflow-wrap: anywhere; word-break: break-word;">${g.tenFile}</div></td>
            <td class="p-1.5 whitespace-nowrap"><span class="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-extrabold ${uiChung.mauBadge} ${uiChung.nhapNhay ? 'animate-pulse' : ''}"><span class="w-2 h-2 rounded-full ${uiChung.mauCham}"></span>${uiChung.nhan}</span></td>
            <td class="p-1.5 whitespace-nowrap">
                <button type="button" onmouseenter="taiTruocNoiDungGiaoAnGA('${String(g.fileId || '').replace(/'/g, "\\'")}')" onclick="moModalXemGiaoAnSDB('${idSafe}', '', true)" class="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow cursor-pointer transition whitespace-nowrap">Xem &amp; Duyệt</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

// 8. Modal Xem, Sửa, Xóa & Phê duyệt từng môn
window.taiXuongGiaoAnKhongMoTab = function(fileId) {
    if (!fileId) return;
    let url = `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`;
    let khungTai = document.getElementById('khungTaiXuongAnGA');
    if (!khungTai) {
        khungTai = document.createElement('iframe');
        khungTai.id = 'khungTaiXuongAnGA';
        khungTai.style.display = 'none';
        document.body.appendChild(khungTai);
    }
    khungTai.src = url;
};

window.chuyenDoiToanManHinhModalGA = function() {
    let modal = document.getElementById('modalXemDuyetGiaoAn');
    let box = document.getElementById('khungNoiDungModalGA');
    let btn = document.getElementById('btnToanManHinhGA');
    if (!modal || !box) return;
    box.style.transform = '';
    let dangFull = box.getAttribute('data-fullscreen') === 'true';
    if (dangFull) {
        box.setAttribute('data-fullscreen', 'false');
        modal.className = 'fixed inset-0 z-[10020] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-2 md:p-3 font-sans';
        box.className = 'bg-white w-full max-w-[96vw] h-[94vh] rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden';
        if (btn) btn.innerHTML = '⛶ Toàn màn hình';
    } else {
        box.setAttribute('data-fullscreen', 'true');
        modal.className = 'fixed inset-0 z-[10020] bg-black/80 flex items-center justify-center p-0 font-sans';
        box.className = 'bg-white w-screen max-w-none h-screen rounded-none shadow-2xl border-0 flex flex-col overflow-hidden';
        if (btn) btn.innerHTML = '🗗 Thu gọn';
    }
};

window.boNhoNoiDungGiaoAn = window.boNhoNoiDungGiaoAn || {};
let _trangThaiTimKiemGA = { ketQua: [], viTriHienTai: -1, cheDoHienTai: 'drive', thongTinBai: null, fileId: '', tuKhoaCu: '' };

window.layThongTinBaiTuDongSDB = function(el) {
    let tr = el ? el.closest('tr') : null;
    if (!tr) return { tenBai: '', tietPPCT: '', lop: '' };
    let tdTenBai = tr.querySelector('td[data-loai="tenBai"]');
    let tenBai = '';
    if (tdTenBai) {
        let inpTB = tdTenBai.querySelector('textarea, input');
        tenBai = inpTB ? String(inpTB.value || '').trim() : String(tdTenBai.innerText || '').trim();
    }
    let tdTiet = tr.querySelector('td[data-loai="tiet"]');
    let tietPPCT = '';
    if (tdTiet) {
        let inpT = tdTiet.querySelector('input, textarea');
        tietPPCT = inpT ? String(inpT.value || '').trim() : String(tdTiet.innerText || '').trim();
    }
    let lop = document.getElementById('chonLopSo')?.value || '';
    return { tenBai: tenBai, tietPPCT: tietPPCT, lop: lop };
};

window.moGiaoAnTuOSoDauBaiBtn = function(btnEl, giaoAnId, monHoc) {
    let info = window.layThongTinBaiTuDongSDB(btnEl);
    window.moModalXemGiaoAnSDB(giaoAnId, monHoc, false, info);
};

window.moGiaoAnTuOMonHocSDB = function(tdEl, tuanSo, monHoc, maGvTiet, lopChon) {
    if (!monHoc || String(monHoc).trim() === '') return;
    let gvStr = String(maGvTiet || '').trim();
    let gvDau = gvStr ? gvStr.split(/[,;&-]/)[0].trim() : '';
    let ga = (gvDau && typeof window.timGiaoAnTheoGvVaTuan === 'function')
        ? window.timGiaoAnTheoGvVaTuan(gvDau, tuanSo)
        : null;
    if (ga) {
        let info = window.layThongTinBaiTuDongSDB(tdEl);
        if (!info.lop && lopChon) info.lop = lopChon;
        window.moModalXemGiaoAnSDB(ga.id, monHoc, false, info);
    }
};

window.datTyLeXemGiaoAnGA = function(tyLe) {
    let s = parseFloat(tyLe) || 1;
    let iframe = document.getElementById('iframeXemGiaoAnGA');
    if (iframe) {
        if (s >= 1) {
            iframe.style.transform = '';
            iframe.style.transformOrigin = '';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        } else {
            let pct = (100 / s).toFixed(4) + '%';
            iframe.style.transform = `scale(${s})`;
            iframe.style.transformOrigin = '0 0';
            iframe.style.width = pct;
            iframe.style.height = pct;
        }
    }
    let noiDungWrap = document.getElementById('noiDungBaiHocZoomGA');
    if (noiDungWrap) {
        noiDungWrap.style.zoom = String(s);
    }
};

window.chuyenDoiAnHienCotDuyetGA = function() {
    let cotDuyet = document.getElementById('cotThongTinDuyetGA');
    let btn = document.getElementById('btnAnHienCotDuyetGA');
    if (!cotDuyet) return;
    let dangAn = cotDuyet.classList.contains('hidden');
    if (dangAn) {
        cotDuyet.classList.remove('hidden');
        cotDuyet.classList.add('flex');
        if (btn) btn.innerHTML = '⇥ Ẩn bảng duyệt';
    } else {
        cotDuyet.classList.add('hidden');
        cotDuyet.classList.remove('flex');
        if (btn) btn.innerHTML = '⇤ Hiện bảng duyệt';
    }
};

let _cleanupDragModalGA = null;

window.dongModalXemGiaoAnSDB = function() {
    if (typeof _cleanupDragModalGA === 'function') {
        _cleanupDragModalGA();
        _cleanupDragModalGA = null;
    }
    let m = document.getElementById('modalXemDuyetGiaoAn');
    if (m) m.remove();
};

window.moModalXemGiaoAnSDB = function(giaoAnId, monFocus, choPhepDuyet = false, thongTinBai = null) {
    let ga = (window.duLieuGiaoAnToanCuc || []).find(x => x.id === giaoAnId);
    if (!ga) return alert('Không tìm thấy dữ liệu giáo án!');

    window.dongModalXemGiaoAnSDB();

    let infoUser = window.layThongTinNguoiDangNhapGA();
    let maUserNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(infoUser.maGV) : infoUser.maGV.toLowerCase();
    let maGaNorm = (typeof window.chuanHoaDinhDanhGiaoVien === 'function') ? window.chuanHoaDinhDanhGiaoVien(ga.maGV) : String(ga.maGV || '').toLowerCase();
    let laNguoiTai = !!(maUserNorm && maGaNorm && maUserNorm === maGaNorm);
    _dangMoModalCheDoDuyet = (choPhepDuyet === true);
    let coQuyenDuyet = _dangMoModalCheDoDuyet && window.coQuyenDuyetGiaoAn();

    let dsMon = window.layDanhSachMonPhanCongCuaGvTheoTuan(ga.maGV, ga.tuan);
    let urlPreview = `https://drive.google.com/file/d/${ga.fileId}/preview`;
    let urlMoTab = `https://drive.google.com/file/d/${ga.fileId}/view`;
    let uiChung = window.layThongTinHienThiTrangThaiGA(ga.trangThaiChung);

    let htmlDanhSachMon = '';
    if (dsMon.length === 0) {
        htmlDanhSachMon = `<div class="text-xs italic text-slate-500 p-2 bg-slate-50 rounded border">Chưa tìm thấy môn phân công trên TKB Tuần ${ga.tuan}.</div>`;
    } else {
        htmlDanhSachMon = dsMon.map((item, idx) => {
            let st = window.layTrangThaiMonTrongGiaoAn(ga, item.mon);
            let isFocus = monFocus && item.mon.toLowerCase() === monFocus.toLowerCase();
            let uiM = window.layThongTinHienThiTrangThaiGA(st.trangThai);
            let monAttr = item.mon.replace(/"/g, '&quot;');

            if (coQuyenDuyet) {
                return `<div class="p-2.5 rounded-lg border ${isFocus ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white'} space-y-1.5" data-ga-mon-row="${monAttr}">
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-extrabold text-xs text-slate-900">${item.mon} <span class="font-normal text-slate-500">(${item.lopList.join(', ')})</span></span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <label class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer">
                            <input type="radio" name="ttMonGA_${idx}" value="DA_DUYET" ${st.trangThai === 'DA_DUYET' ? 'checked' : ''} class="accent-emerald-600"> Đã duyệt
                        </label>
                        <label class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 cursor-pointer">
                            <input type="radio" name="ttMonGA_${idx}" value="CHO_DUYET" ${(st.trangThai === 'CHO_DUYET' || st.trangThai === 'DA_SUA') ? 'checked' : ''} class="accent-amber-600"> Chưa duyệt
                        </label>
                        <label class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-800 cursor-pointer">
                            <input type="radio" name="ttMonGA_${idx}" value="CAN_SUA" ${st.trangThai === 'CAN_SUA' ? 'checked' : ''} class="accent-rose-600"> Cần sửa
                        </label>
                    </div>
                    <textarea rows="1" class="inp-nx-mon-ga w-full px-2 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 resize-none overflow-hidden leading-relaxed break-words" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" placeholder="Góp ý riêng cho môn ${item.mon} (nếu cần)...">${String(st.nhanXet || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>`;
            } else {
                return `<div class="p-2 rounded border ${isFocus ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-white'} flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-slate-800">${item.mon} <span class="font-normal text-slate-500">(${item.lopList.join(', ')})</span></span>
                        <span class="px-2 py-0.5 rounded-full border text-[11px] font-bold ${uiM.mauBadge}">${uiM.nhan}</span>
                    </div>
                    ${st.nhanXet ? `<div class="text-[11px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 whitespace-pre-wrap break-words"><b>Góp ý BGH:</b> ${st.nhanXet}</div>` : ''}
                </div>`;
            }
        }).join('');
    }

    let htmlNutNhanhBGH = coQuyenDuyet && dsMon.length > 0 ? `
        <div class="flex gap-2 mb-2">
            <button type="button" onclick="chonNhanhTrangThaiTatCaMonGA('DA_DUYET')" class="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer">✓ Tích duyệt tất cả</button>
            <button type="button" onclick="chonNhanhTrangThaiTatCaMonGA('CHO_DUYET')" class="flex-1 py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold rounded cursor-pointer">○ Chưa duyệt hết</button>
        </div>` : '';

    let htmlKhuVucDuyet = coQuyenDuyet ? `
        <div class="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <label class="block text-xs font-extrabold text-blue-900 uppercase">Nhận xét chung của BGH:</label>
            <textarea id="txtNhanXetChungGA" rows="2" class="w-full p-2 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 resize-y" placeholder="Nhập nhận xét tổng quát (nếu có)...">${ga.nhanXetChung || ''}</textarea>
            <button type="button" id="btnLuuPheDuyetGA" onclick="luuPheDuyetGiaoAn('${ga.id.replace(/'/g, "\\'")}')" class="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold rounded shadow cursor-pointer transition">Lưu Phê Duyệt</button>
        </div>` : (ga.nhanXetChung ? `<div class="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-slate-800"><b>Nhận xét chung của BGH:</b><br>${ga.nhanXetChung}</div>` : '');

    let dangCanSua = (ga.trangThaiChung === 'CAN_SUA') || Object.values(ga.chiTietMon || {}).some(ct => ct && ct.trangThai === 'CAN_SUA');
    let nutDaDieuChinh = dangCanSua ? `<button type="button" id="btnBaoDaSuaGA" onclick="baoDaDieuChinhGiaoAn('${ga.id.replace(/'/g, "\\'")}', '${String(monFocus || '').replace(/'/g, "\\'")}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded shadow cursor-pointer transition" title="Bấm sau khi đã sửa trực tiếp file trên Drive">✓ Đã điều chỉnh</button>` : '';
    let htmlNutNguoiTai = laNguoiTai ? `
        <div class="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
            ${nutDaDieuChinh}
            <button type="button" onclick="kichHoatTaiGiaoAn1Cham(${ga.tuan}, '${String(ga.maGV).replace(/'/g, "\\'")}', '${String(ga.fileId).replace(/'/g, "\\'")}')" class="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded shadow cursor-pointer transition">Sửa / Thay file</button>
            <button type="button" onclick="xoaGiaoAn1Cham('${ga.id.replace(/'/g, "\\'")}')" class="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded shadow cursor-pointer transition">Xóa</button>
        </div>` : '';

    let modal = document.createElement('div');
    modal.id = 'modalXemDuyetGiaoAn';
    modal.setAttribute('data-file-id', ga.fileId || '');
    modal.className = 'fixed inset-0 z-[10020] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-2 md:p-3 font-sans';
    modal.onclick = () => window.dongModalXemGiaoAnSDB();

    modal.innerHTML = `
        <div id="khungNoiDungModalGA" data-fullscreen="false" class="bg-white w-full max-w-[96vw] h-[94vh] rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden" onclick="event.stopPropagation()">
            <div id="tieuDeKeoModalGA" title="Giữ chuột trái để kéo di chuyển cửa sổ" class="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between flex-none cursor-move select-none">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="font-extrabold text-sm truncate">${ga.tenFile}</span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ${uiChung.mauBadge} flex-none">${uiChung.nhan}</span>
                </div>
                <div class="flex items-center gap-1.5 md:gap-2 flex-none flex-wrap justify-end">
                    <div class="inline-flex rounded overflow-hidden border border-white/25 bg-white/10">
                        <button type="button" id="btnCheDoXemBaiGA" onclick="chuyenCheDoXemGiaoAnGA('bai_hoc')" class="px-2.5 py-1 text-xs font-bold transition cursor-pointer bg-white text-blue-900" title="Hiển thị nội dung và tự động cuộn tới đúng bài học">📄 Xem đúng bài</button>
                        <button type="button" id="btnCheDoXemDriveGA" onclick="chuyenCheDoXemGiaoAnGA('drive')" class="px-2.5 py-1 text-xs font-bold transition cursor-pointer text-white hover:bg-white/15" title="Chuyển sang trình xem Google Drive">☁️ Xem trên Drive</button>
                    </div>
                    <select id="chonTyLeXemGA" onchange="datTyLeXemGiaoAnGA(this.value)" title="Thu nhỏ khung xem khi tài liệu hoặc trang ngang bị che mép phải" class="px-2 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded transition cursor-pointer outline-none">
                        <option value="1" class="text-slate-900">100%</option>
                        <option value="0.85" class="text-slate-900">85%</option>
                        <option value="0.75" class="text-slate-900">75%</option>
                        <option value="0.65" class="text-slate-900">65%</option>
                    </select>
                    <button type="button" id="btnAnHienCotDuyetGA" onclick="chuyenDoiAnHienCotDuyetGA()" class="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded transition cursor-pointer hidden lg:inline-flex items-center">⇥ Ẩn bảng duyệt</button>
                    <button type="button" id="btnToanManHinhGA" onclick="chuyenDoiToanManHinhModalGA()" class="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded transition cursor-pointer">⛶ Toàn màn hình</button>
                    <button type="button" onclick="taiXuongGiaoAnKhongMoTab('${String(ga.fileId || '').replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition inline-flex items-center gap-1 cursor-pointer">⬇ Tải xuống</button>
                    ${(laNguoiTai || coQuyenDuyet) ? `<a href="${urlMoTab}" target="_blank" rel="noopener" class="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded transition">Mở tab mới</a>` : ''}
                    <button type="button" onclick="dongModalXemGiaoAnSDB()" class="text-white/80 hover:text-white text-2xl font-bold leading-none px-1 cursor-pointer">&times;</button>
                </div>
            </div>
            <div class="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                <div class="flex-1 min-w-0 h-[48vh] lg:h-full bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-300 relative overflow-hidden">
                    <div id="vungXemDriveGA" class="w-full h-full relative">
                        ${(!laNguoiTai && !coQuyenDuyet) ? `<div class="absolute top-2.5 right-4 w-11 h-11 z-20 rounded-md select-none cursor-not-allowed" style="background-color: transparent;" title="Đã khóa mở cửa sổ ngoài ở chế độ chỉ xem"></div>` : ''}
                        <iframe id="iframeXemGiaoAnGA" src="${urlPreview}" class="w-full h-full border-0" allow="autoplay"></iframe>
                    </div>
                    <div id="vungXemBaiHocGA" class="hidden w-full h-full flex flex-col bg-slate-200/80">
                        <div id="thanhDinhViBaiGA" class="bg-white border-b border-slate-300 px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-none shadow-xs">
                            <div id="nhanDinhViBaiGA" class="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap"></div>
                            <div class="flex items-center gap-1.5 flex-none flex-wrap">
                                <div id="cumDieuHuongKetQuaGA" class="hidden items-center gap-1 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                                    <button type="button" onclick="nhayDenKetQuaTimKiemGA(-1)" class="px-1 hover:bg-amber-200 rounded cursor-pointer" title="Kết quả trước">↑</button>
                                    <span id="chiSoKetQuaGA">1/1</span>
                                    <button type="button" onclick="nhayDenKetQuaTimKiemGA(1)" class="px-1 hover:bg-amber-200 rounded cursor-pointer" title="Kết quả tiếp theo">↓</button>
                                </div>
                                <input type="text" id="inpTimTrongGiaoAnGA" placeholder="Tìm tên bài trong giáo án..." onkeydown="if(event.key==='Enter'){event.preventDefault(); timKiemThuCongTrongGiaoAnGA(true);}" class="border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-40 md:w-52">
                                <button type="button" onclick="timKiemThuCongTrongGiaoAnGA(false)" class="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded cursor-pointer">Tìm</button>
                                <button type="button" id="btnTimTiepGA" onclick="timTiepTrongGiaoAnGA()" class="hidden px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded cursor-pointer shadow-xs" title="Chuyển tới vị trí phù hợp tiếp theo">Tìm tiếp ↓</button>
                            </div>
                        </div>
                        <div id="khungCuonNoiDungGA" class="flex-1 overflow-y-auto p-3 md:p-5 scroll-smooth">
                            <div id="noiDungBaiHocZoomGA" class="mx-auto max-w-[850px]"></div>
                        </div>
                    </div>
                </div>
                <div id="cotThongTinDuyetGA" class="w-full lg:w-[320px] xl:w-[350px] flex-1 lg:flex-none h-full overflow-y-auto p-3.5 bg-slate-50 flex flex-col justify-between">
                    <div>
                        <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 mb-3">
                            <div><span class="font-bold text-slate-600">Giáo viên:</span> <span class="font-extrabold text-blue-900">${ga.tenGV || ga.maGV}</span></div>
                            <div><span class="font-bold text-slate-600">Tuần học:</span> <span class="font-bold">Tuần ${ga.tuan}</span></div>
                            <div><span class="font-bold text-slate-600">Cập nhật:</span> <span>${window.dinhDangThoiGianGA(ga.ngaySua || ga.ngayTai || '')}</span></div>
                            ${ga.nguoiDuyet ? `<div><span class="font-bold text-slate-600">Người duyệt:</span> <span>${ga.nguoiDuyet} (${window.dinhDangThoiGianGA(ga.ngayDuyet || '')})</span></div>` : ''}
                        </div>
                        <div class="text-xs font-extrabold text-slate-800 uppercase mb-2">Danh sách môn theo phân công:</div>
                        ${htmlNutNhanhBGH}
                        <div class="space-y-2">${htmlDanhSachMon}</div>
                        ${htmlKhuVucDuyet}
                    </div>
                    ${htmlNutNguoiTai}
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('textarea.inp-nx-mon-ga').forEach(el => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    });

    _trangThaiTimKiemGA = {
        ketQua: [],
        viTriHienTai: -1,
        cheDoHienTai: (monFocus || (thongTinBai && thongTinBai.tenBai)) ? 'bai_hoc' : 'drive',
        thongTinBai: {
            mon: monFocus || '',
            tenBai: (thongTinBai && thongTinBai.tenBai) ? String(thongTinBai.tenBai).trim() : '',
            tietPPCT: (thongTinBai && thongTinBai.tietPPCT) ? String(thongTinBai.tietPPCT).trim() : '',
            lop: (thongTinBai && thongTinBai.lop) ? String(thongTinBai.lop).trim() : ''
        },
        fileId: ga.fileId || ''
    };
    window.chuyenCheDoXemGiaoAnGA(_trangThaiTimKiemGA.cheDoHienTai);

    // Kích hoạt kéo di chuyển Modal bằng thanh tiêu đề
    const boxGA = document.getElementById('khungNoiDungModalGA');
    const headerGA = document.getElementById('tieuDeKeoModalGA');
    const iframeGA = modal.querySelector('iframe');
    if (boxGA && headerGA) {
        let dangKeo = false, startX = 0, startY = 0, offsetX = 0, offsetY = 0;

        headerGA.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || e.target.closest('button, a')) return;
            if (boxGA.getAttribute('data-fullscreen') === 'true') return;
            dangKeo = true;
            const match = boxGA.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
            offsetX = match ? parseFloat(match[1]) : 0;
            offsetY = match ? parseFloat(match[2]) : 0;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            if (iframeGA) iframeGA.style.pointerEvents = 'none';
        });

        const onMouseMove = (e) => {
            if (!dangKeo) return;
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            boxGA.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        };

        const onMouseUp = () => {
            if (!dangKeo) return;
            dangKeo = false;
            if (iframeGA) iframeGA.style.pointerEvents = '';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        _cleanupDragModalGA = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
};

window.chonNhanhTrangThaiTatCaMonGA = function(trangThai) {
    document.querySelectorAll('#modalXemDuyetGiaoAn [data-ga-mon-row]').forEach(row => {
        let radio = row.querySelector(`input[type="radio"][value="${trangThai}"]`);
        if (radio) radio.checked = true;
    });
};

window.luuPheDuyetGiaoAn = async function(giaoAnId) {
    if (typeof window.coQuyenDuyetGiaoAn !== 'function' || !window.coQuyenDuyetGiaoAn()) {
        alert('Bạn không có quyền phê duyệt giáo án!');
        return;
    }
    let chiTietMon = {};
    document.querySelectorAll('#modalXemDuyetGiaoAn [data-ga-mon-row]').forEach(row => {
        let mon = row.getAttribute('data-ga-mon-row');
        let checked = row.querySelector('input[type="radio"]:checked');
        let nxInp = row.querySelector('.inp-nx-mon-ga');
        if (mon) {
            chiTietMon[mon] = {
                trangThai: checked ? checked.value : 'CHO_DUYET',
                nhanXet: nxInp ? nxInp.value.trim() : ''
            };
        }
    });

    let nhanXetChung = document.getElementById('txtNhanXetChungGA')?.value.trim() || '';
    let infoUser = window.layThongTinNguoiDangNhapGA();
    let btn = document.getElementById('btnLuuPheDuyetGA');
    let txtGoc = btn ? btn.innerHTML : 'Lưu Phê Duyệt';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Đang lưu...'; }

    try {
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({
                thaoTac: 'duyetGiaoAn',
                id: giaoAnId,
                chiTietMon: chiTietMon,
                nhanXetChung: nhanXetChung,
                nguoiDuyet: infoUser.tenGV || infoUser.email || 'Ban Giám Hiệu',
                emailTruyCap: infoUser.email || infoUser.maGV
            })
        }, 2, 30000);
        const kq = await phanHoi.json();

        if (kq && kq.trangThai === 'thanh_cong' && kq.giaoAn) {
            let idx = window.duLieuGiaoAnToanCuc.findIndex(g => g.id === kq.giaoAn.id);
            if (idx !== -1) window.duLieuGiaoAnToanCuc[idx] = kq.giaoAn;
            window.dongModalXemGiaoAnSDB();
            if (!document.getElementById('khungDuyetGiaoAn')?.classList.contains('hidden')) {
                window.ketXuatBangDuyetGiaoAn();
            }
            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function' && !document.getElementById('khungSoDauBai')?.classList.contains('hidden')) {
                thucThiKetXuatSoDauBaiLenLuoi();
            }
        } else {
            throw new Error((kq && kq.thongBao) ? kq.thongBao : 'Lỗi lưu phê duyệt.');
        }
    } catch (err) {
        alert('⚠️ Lỗi phê duyệt: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = txtGoc; }
    }
};

window.baoDaDieuChinhGiaoAn = async function(giaoAnId, monFocus = '') {
    let infoUser = window.layThongTinNguoiDangNhapGA();
    let btn = document.getElementById('btnBaoDaSuaGA');
    let txtGoc = btn ? btn.innerHTML : '✓ Đã điều chỉnh';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Đang gửi...'; }

    try {
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({
                thaoTac: 'baoDaSuaGiaoAn',
                id: giaoAnId,
                emailTruyCap: infoUser.email || infoUser.maGV
            })
        }, 2, 30000);
        const kq = await phanHoi.json();
        if (kq && kq.trangThai === 'thanh_cong' && kq.giaoAn) {
            let idx = window.duLieuGiaoAnToanCuc.findIndex(g => g.id === kq.giaoAn.id);
            if (idx !== -1) window.duLieuGiaoAnToanCuc[idx] = kq.giaoAn;
            if (document.getElementById('modalXemDuyetGiaoAn')) {
                let ttCu = _trangThaiTimKiemGA ? _trangThaiTimKiemGA.thongTinBai : null;
                window.moModalXemGiaoAnSDB(kq.giaoAn.id, monFocus, _dangMoModalCheDoDuyet, ttCu);
            }
            if (!document.getElementById('khungDuyetGiaoAn')?.classList.contains('hidden')) {
                window.ketXuatBangDuyetGiaoAn();
            }
            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function' && !document.getElementById('khungSoDauBai')?.classList.contains('hidden')) {
                thucThiKetXuatSoDauBaiLenLuoi();
            }
        } else {
            throw new Error((kq && kq.thongBao) ? kq.thongBao : 'Không thể cập nhật trạng thái.');
        }
    } catch (err) {
        alert('⚠️ Lỗi báo đã điều chỉnh: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = txtGoc; }
    }
};

window.xoaGiaoAn1Cham = async function(giaoAnId) {
    if (!confirm('Bạn có chắc chắn muốn XÓA giáo án này? Tệp trên Google Drive cũng sẽ được chuyển vào thùng rác.')) return;
    let infoUser = window.layThongTinNguoiDangNhapGA();
    try {
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({
                thaoTac: 'xoaGiaoAn',
                id: giaoAnId,
                emailTruyCap: infoUser.email || infoUser.maGV
            })
        }, 2, 30000);
        const kq = await phanHoi.json();
        if (kq && kq.trangThai === 'thanh_cong') {
            let gaXoa = (window.duLieuGiaoAnToanCuc || []).find(g => g.id === giaoAnId);
            if (gaXoa && gaXoa.fileId && window.boNhoNoiDungGiaoAn) {
                delete window.boNhoNoiDungGiaoAn[gaXoa.fileId];
                if (typeof window.xoaCacheNoiDungGA_IDB === 'function') window.xoaCacheNoiDungGA_IDB(gaXoa.fileId);
            }
            window.duLieuGiaoAnToanCuc = (window.duLieuGiaoAnToanCuc || []).filter(g => g.id !== giaoAnId);
            window.dongModalXemGiaoAnSDB();
            if (!document.getElementById('khungDuyetGiaoAn')?.classList.contains('hidden')) {
                window.ketXuatBangDuyetGiaoAn();
            }
            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function' && !document.getElementById('khungSoDauBai')?.classList.contains('hidden')) {
                thucThiKetXuatSoDauBaiLenLuoi();
            }
        } else {
            throw new Error((kq && kq.thongBao) ? kq.thongBao : 'Không thể xóa giáo án.');
        }
    } catch (err) {
        alert('⚠️ Lỗi xóa giáo án: ' + err.message);
    }
};


// =========================================================================
// 9. TRÌNH XEM ĐÚNG BÀI HỌC & TỰ ĐỘNG ĐỊNH VỊ BÀI DẠY TRONG GIÁO ÁN
// =========================================================================
window.chuanHoaChuoiTimBaiGA = function(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFC')
        .toLowerCase()
        .replace(/[“”"'`’]/g, '')
        .replace(/[:;.,!?()\[\]\-–—\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

window.boDauTiengVietGA = function(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

window.tachTenBaiCotLoiGA = function(tenBai) {
    let s = window.chuanHoaChuoiTimBaiGA(tenBai);
    s = s.replace(/^bài\s*\d+[a-z]?\s*/i, '')
         .replace(/^tiết\s*\d+\s*/i, '')
         .replace(/^chủ\s*đề\s*\d+\s*/i, '')
         .replace(/tiết\s*\d+$/i, '')
         .replace(/t\d+$/i, '')
         .trim();
    return s;
};

window.chuyenCheDoXemGiaoAnGA = function(cheDo) {
    let vungDrive = document.getElementById('vungXemDriveGA');
    let vungBai = document.getElementById('vungXemBaiHocGA');
    let btnBai = document.getElementById('btnCheDoXemBaiGA');
    let btnDrive = document.getElementById('btnCheDoXemDriveGA');
    if (!vungDrive || !vungBai) return;

    _trangThaiTimKiemGA.cheDoHienTai = cheDo;

    if (cheDo === 'bai_hoc') {
        vungDrive.classList.add('hidden');
        vungBai.classList.remove('hidden');
        if (btnBai) btnBai.className = 'px-2.5 py-1 text-xs font-bold transition cursor-pointer bg-white text-blue-900';
        if (btnDrive) btnDrive.className = 'px-2.5 py-1 text-xs font-bold transition cursor-pointer text-white hover:bg-white/15';
        window.taiVaHienThiNoiDungBaiHocGA(_trangThaiTimKiemGA.fileId, _trangThaiTimKiemGA.thongTinBai);
    } else {
        vungBai.classList.add('hidden');
        vungDrive.classList.remove('hidden');
        if (btnDrive) btnDrive.className = 'px-2.5 py-1 text-xs font-bold transition cursor-pointer bg-white text-blue-900';
        if (btnBai) btnBai.className = 'px-2.5 py-1 text-xs font-bold transition cursor-pointer text-white hover:bg-white/15';
    }
    let selZoom = document.getElementById('chonTyLeXemGA');
    if (selZoom) window.datTyLeXemGiaoAnGA(selZoom.value);
};

window._dangTaiNoiDungGAPromises = window._dangTaiNoiDungGAPromises || {};

window.moDbNoiDungGA = function() {
    return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        try {
            const req = indexedDB.open('GiaoAnCacheDB_v1', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    });
};

window.docCacheNoiDungGA_IDB = async function(fileId) {
    const db = await window.moDbNoiDungGA();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(String(fileId));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    });
};

window.luuCacheNoiDungGA_IDB = async function(fileId, data) {
    const db = await window.moDbNoiDungGA();
    if (!db) return;
    try {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.put({ ...data, _cachedAt: Date.now() }, String(fileId));

        // Giữ tối đa 10 giáo án gần nhất để tránh đầy bộ nhớ khi sang nhiều tuần mới
        const keysReq = store.getAllKeys();
        keysReq.onsuccess = () => {
            const keys = keysReq.result || [];
            if (keys.length <= 10) return;
            const allReq = store.getAll();
            allReq.onsuccess = () => {
                const items = (allReq.result || []).map((val, idx) => ({
                    key: keys[idx],
                    ts: (val && val._cachedAt) ? val._cachedAt : 0
                })).sort((a, b) => b.ts - a.ts);
                items.slice(10).forEach(old => {
                    try { store.delete(old.key); } catch (eDel) {}
                });
            };
        };
    } catch (e) {}
};

window.xoaCacheNoiDungGA_IDB = async function(fileId) {
    const db = await window.moDbNoiDungGA();
    if (!db) return;
    try {
        const tx = db.transaction('files', 'readwrite');
        if (fileId) tx.objectStore('files').delete(String(fileId));
        else tx.objectStore('files').clear();
    } catch (e) {}
};

window.napThuVienPdfJsGA = function() {
    if (typeof pdfjsLib !== 'undefined') return Promise.resolve();
    if (window._promisePdfJsLibGA) return window._promisePdfJsLibGA;
    window._promisePdfJsLibGA = new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        sc.onload = () => {
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            resolve();
        };
        sc.onerror = reject;
        document.head.appendChild(sc);
    });
    return window._promisePdfJsLibGA;
};

window.taiTruocNoiDungGiaoAnGA = function(fileId) {
    if (!fileId || typeof CAU_HINH_FRONTEND === 'undefined' || !CAU_HINH_FRONTEND.URL_API_MAY_CHU) return Promise.resolve(null);
    if (window.boNhoNoiDungGiaoAn[fileId]) return Promise.resolve(window.boNhoNoiDungGiaoAn[fileId]);
    if (window._dangTaiNoiDungGAPromises[fileId]) return window._dangTaiNoiDungGAPromises[fileId];

    window._dangTaiNoiDungGAPromises[fileId] = (async () => {
        try {
            let cached = await window.docCacheNoiDungGA_IDB(fileId);
            if (cached && cached.trangThai === 'thanh_cong') {
                window.boNhoNoiDungGiaoAn[fileId] = cached;
                if (cached.loai === 'pdf_base64') window.napThuVienPdfJsGA();
                return cached;
            }
            let url = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layNoiDungGiaoAnChiTiet&fileId=${encodeURIComponent(fileId)}`;
            const phanHoi = await fetchVoiCoCheThuLai(url, {}, 2, 45000);
            const data = await phanHoi.json();
            if (data && data.trangThai === 'thanh_cong') {
                window.boNhoNoiDungGiaoAn[fileId] = data;
                window.luuCacheNoiDungGA_IDB(fileId, data);
                if (data.loai === 'pdf_base64') window.napThuVienPdfJsGA();
            }
            return data;
        } catch (e) {
            return { trangThai: 'loi', thongBao: e.message };
        } finally {
            delete window._dangTaiNoiDungGAPromises[fileId];
        }
    })();

    return window._dangTaiNoiDungGAPromises[fileId];
};

window.taiVaHienThiNoiDungBaiHocGA = async function(fileId, thongTinBai) {
    let noiDungWrap = document.getElementById('noiDungBaiHocZoomGA');
    let nhanEl = document.getElementById('nhanDinhViBaiGA');
    if (!noiDungWrap) return;

    let monTxt = thongTinBai && thongTinBai.mon ? thongTinBai.mon : '';
    let baiTxt = thongTinBai && thongTinBai.tenBai ? thongTinBai.tenBai : '';
    let tietTxt = thongTinBai && thongTinBai.tietPPCT ? thongTinBai.tietPPCT : '';

    if (nhanEl) {
        let moTa = [];
        if (monTxt) moTa.push(`<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-900">Môn: ${monTxt}</span>`);
        if (tietTxt) moTa.push(`<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800">PPCT: ${tietTxt}</span>`);
        if (baiTxt) moTa.push(`<span class="text-slate-900 truncate max-w-[320px]" title="${baiTxt.replace(/"/g, '&quot;')}">${baiTxt}</span>`);
        nhanEl.innerHTML = moTa.length > 0 ? moTa.join(' ') : '<span>Xem nội dung giáo án</span>';
    }

    let inpTim = document.getElementById('inpTimTrongGiaoAnGA');
    if (inpTim && !inpTim.value && (baiTxt || monTxt)) {
        inpTim.value = baiTxt || monTxt;
    }

    if (!fileId) {
        window.chuyenCheDoXemGiaoAnGA('drive');
        return;
    }

    if (noiDungWrap.getAttribute('data-loaded-file') === fileId) {
        if (noiDungWrap.getAttribute('data-loai') === 'pdf') {
            window.dinhViTrangPdfDaTaiGA(monTxt, baiTxt, tietTxt);
        } else {
            window.dinhViVaCuonDenBaiGA(monTxt, baiTxt, tietTxt);
        }
        return;
    }

    let data = window.boNhoNoiDungGiaoAn[fileId];
    if (!data) {
        noiDungWrap.innerHTML = `<div class="bg-white rounded-lg shadow p-10 text-center text-slate-600 font-bold">
            <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm text-blue-900">Đang trích xuất nội dung giáo án và định vị đúng bài dạy...</p>
            <p class="text-xs text-slate-400 font-normal mt-1">Lần mở tiếp theo cùng giáo án tuần sẽ hiển thị tức thì.</p>
        </div>`;
        data = await window.taiTruocNoiDungGiaoAnGA(fileId);
    }

    // Kiểm tra modal còn mở không
    if (!document.getElementById('modalXemDuyetGiaoAn')) return;

    if (!data || data.trangThai !== 'thanh_cong') {
        if (data && data.loai === 'drive_preview') {
            window.chuyenCheDoXemGiaoAnGA('drive');
            return;
        }
        noiDungWrap.innerHTML = `<div class="bg-white rounded-lg shadow p-6 text-center space-y-3">
            <p class="text-sm font-bold text-amber-800">⚠️ ${(data && data.thongBao) ? data.thongBao : 'Không thể trích xuất trực tiếp định dạng tệp này.'}</p>
            <button type="button" onclick="chuyenCheDoXemGiaoAnGA('drive')" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow cursor-pointer">Mở trình xem Google Drive</button>
        </div>`;
        return;
    }

    if (data.loai === 'html') {
        noiDungWrap.setAttribute('data-loaded-file', fileId);
        noiDungWrap.setAttribute('data-loai', 'html');
        noiDungWrap.innerHTML = `
            <style>
                .ga-paper { background: #fff; padding: 28px 34px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); font-family: "Times New Roman", Georgia, serif; font-size: 15px; line-height: 1.55; color: #1e293b; }
                .ga-paper .ga-h2 { font-size: 18px; font-weight: 800; color: #1e3a8a; margin: 14px 0 6px; text-transform: uppercase; }
                .ga-paper .ga-h3 { font-size: 16.5px; font-weight: 700; color: #1e40af; margin: 12px 0 5px; }
                .ga-paper .ga-h4 { font-size: 15.5px; font-weight: 700; color: #0f172a; margin: 10px 0 4px; }
                .ga-paper .ga-p { margin: 4px 0; }
                .ga-paper .ga-p-empty { margin: 2px 0; line-height: 0.7; }
                .ga-paper .ga-table-wrap { width: 100%; overflow-x: auto; margin: 10px 0; }
                .ga-paper .ga-doc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .ga-paper .ga-doc-table th, .ga-paper .ga-doc-table td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; text-align: left; }
                .ga-paper .ga-doc-table th { background: #f1f5f9; font-weight: 700; }
                .ga-match-active { background-color: #fef08a !important; outline: 2px solid #eab308; border-radius: 4px; padding: 2px 4px; scroll-margin-top: 18px; }
                .ga-match-other { background-color: #fef9c3 !important; border-left: 3px solid #f59e0b; padding-left: 4px; scroll-margin-top: 18px; }
            </style>
            <div id="gaHtmlDocumentBody" class="ga-paper">${data.noiDungHtml || '<p class="italic text-slate-500">Tệp giáo án trống.</p>'}</div>`;
        window.dinhViVaCuonDenBaiGA(monTxt, baiTxt, tietTxt);
    } else if (data.loai === 'pdf_base64') {
        noiDungWrap.setAttribute('data-loaded-file', fileId);
        noiDungWrap.setAttribute('data-loai', 'pdf');
        await window.hienThiVaDinhViPdfGA(noiDungWrap, data.base64, monTxt, baiTxt, tietTxt);
    }
};

window.laDongTieuDeBaiDayGA = function(el, rawText) {
    if (!el || !rawText) return false;
    let raw = String(rawText).trim();
    if (raw.length < 2 || raw.length > 180) return false;

    let low = raw.normalize('NFC').toLowerCase();
    // Loại trừ các dòng nội dung thân bài (hoạt động, lời thoại GV/HS, gạch đầu dòng...)
    if (/^(hoạt động|khởi động|khám phá|luyện tập|thực hành|vận dụng|củng cố|dặn dò|mục tiêu|yêu cầu cần đạt|đồ dùng|chuẩn bị|gv\s*:|hs\s*:|giáo viên\s*:|học sinh\s*:|[-+*•]\s)/i.test(low)) {
        if (!/^(bài|tên bài|chủ đề)\b/i.test(low)) return false;
    }

    let tag = el.tagName;
    if (tag === 'H2' || tag === 'H3' || tag === 'H4') return true;

    // Dòng có tiền tố đầu bài chuẩn (Bài X:, Tên bài:, Chủ đề:, Tiết X:, Môn:)
    if (/^(bài\s*\d*|tên bài|bài học|chủ đề|tiết\s*\d+|môn(\s+học)?\s*:)/i.test(low)) return true;

    // Dòng viết HOA toàn bộ (thường là tên bài hoặc tên môn trong giáo án)
    let lettersOnly = raw.replace(/[^\p{L}]/gu, '');
    if (lettersOnly.length >= 4 && raw === raw.toUpperCase() && raw !== raw.toLowerCase()) return true;

    // Thẻ <p> hoặc <th>/<td> in đậm phần lớn nội dung (tên đầu bài in đậm)
    let boldEls = el.querySelectorAll('strong, b');
    if (boldEls.length > 0) {
        let boldLen = 0;
        boldEls.forEach(b => { boldLen += (b.innerText || b.textContent || '').trim().length; });
        if (boldLen >= raw.length * 0.55) return true;
    }

    if (tag === 'TH') return true;
    return false;
};

window.dinhViVaCuonDenBaiGA = function(monTxt, baiTxt, tietTxt, chiTimTieuDe = true) {
    let bodyEl = document.getElementById('gaHtmlDocumentBody');
    if (!bodyEl) return;

    bodyEl.querySelectorAll('.ga-match-active, .ga-match-other').forEach(el => {
        el.classList.remove('ga-match-active', 'ga-match-other');
    });

    let blocks = Array.from(bodyEl.querySelectorAll('h2, h3, h4, p, td, th'));
    if (blocks.length === 0) return;

    let monChuan = window.chuanHoaChuoiTimBaiGA(monTxt);
    let monKhongDau = window.boDauTiengVietGA(monChuan);
    let monRutGon = monChuan.replace(/[0-9()]/g, '').trim();
    let baiChuan = window.chuanHoaChuoiTimBaiGA(baiTxt);
    let baiCotLoi = window.tachTenBaiCotLoiGA(baiTxt);
    let baiCotLoiKD = window.boDauTiengVietGA(baiCotLoi);
    let tuBai = baiCotLoi.split(' ').filter(w => w.length >= 2);
    let tietSo = String(tietTxt || '').replace(/\D/g, '');
    let mTietBai = String(baiTxt || '').match(/(?:\(\s*(?:tiết|t)\s*(\d+)(?:\s*[,\-&]\s*\d+)*\s*\)|(?:tiết|t)\s*(\d+)\s*$)/i);
    let tietTrongTenBai = mTietBai ? (mTietBai[1] || mTietBai[2] || '') : '';

    let normBlocks = blocks.map(el => {
        let raw = (el.innerText || el.textContent || '').trim();
        let chuan = window.chuanHoaChuoiTimBaiGA(raw);
        let laTieuDe = window.laDongTieuDeBaiDayGA(el, raw);
        return { el: el, raw: raw, chuan: chuan, kd: window.boDauTiengVietGA(chuan), laTieuDe: laTieuDe };
    });

    const chamDiem = (batBuocTieuDe) => {
        let ds = [];
        for (let i = 0; i < normBlocks.length; i++) {
            let b = normBlocks[i];
            if (!b.chuan || b.chuan.length < 2) continue;
            if (batBuocTieuDe && !b.laTieuDe) continue;

            // Ghép thêm 1-2 dòng tiêu đề kế tiếp phòng trường hợp tên bài bị xuống dòng (VD: TIẾT 56: BÀI 24: ... / CỦA PHÉP CỘNG (TIẾT 1))
            let gopChuan = b.chuan;
            let gopKD = b.kd;
            if (i + 1 < normBlocks.length && normBlocks[i + 1].laTieuDe && normBlocks[i + 1].raw.length <= 160) {
                gopChuan += ' ' + normBlocks[i + 1].chuan;
                gopKD += ' ' + normBlocks[i + 1].kd;
                if (i + 2 < normBlocks.length && normBlocks[i + 2].laTieuDe && normBlocks[i + 2].raw.length <= 120) {
                    gopChuan += ' ' + normBlocks[i + 2].chuan;
                    gopKD += ' ' + normBlocks[i + 2].kd;
                }
            }

            let diem = 0;
            if (baiChuan && b.chuan.includes(baiChuan)) {
                diem += 140;
            } else if (baiChuan && gopChuan.includes(baiChuan)) {
                diem += 130;
            } else if (baiCotLoi && baiCotLoi.length >= 5 && b.chuan.includes(baiCotLoi)) {
                diem += 100;
            } else if (baiCotLoi && baiCotLoi.length >= 5 && gopChuan.includes(baiCotLoi)) {
                diem += 95;
            } else if (baiCotLoiKD && baiCotLoiKD.length >= 5 && gopKD.includes(baiCotLoiKD)) {
                diem += 85;
            } else if (tuBai.length >= 2) {
                let soTuKhop = tuBai.filter(w => gopChuan.includes(w)).length;
                let tyLe = soTuKhop / tuBai.length;
                if (tyLe >= 0.75) diem += Math.round(tyLe * 70);
            }

            // Nếu khớp trực tiếp Tiết PPCT (VD: "Tiết 56: Bài 24: ...") ở ngay dòng đầu bài
            let khopTietPPCT = !!(tietSo && new RegExp('\\btiet\\s*' + tietSo + '\\b').test(b.kd));
            if (khopTietPPCT) {
                diem += (diem > 0 ? 90 : 75);
            }

            // Kiểm tra ngữ cảnh Môn học tại chính block hoặc 15 block liền trước
            let khopMonGan = false;
            if (monChuan) {
                let startCtx = Math.max(0, i - 15);
                for (let j = i; j >= startCtx; j--) {
                    let ctx = normBlocks[j];
                    if (ctx.chuan.includes(monChuan) || (monRutGon && ctx.chuan.includes(monRutGon)) || (monKhongDau && ctx.kd.includes(monKhongDau))) {
                        khopMonGan = true;
                        break;
                    }
                }
            }

            if (diem > 0 && khopMonGan) diem += 55;
            if (diem === 0 && !baiCotLoi && monChuan && (b.chuan.includes(monChuan) || (monRutGon && b.chuan.includes(monRutGon)))) {
                diem += 45;
            }

            if (diem > 0) {
                let tag = b.el.tagName;
                if (b.laTieuDe) diem += 30;
                if (tag === 'H2' || tag === 'H3' || tag === 'H4') diem += 25;
                if (b.el.querySelector('strong, b')) diem += 15;
                if (/^(tiet\s*\d+|bai\s*\d+)/i.test(b.kd)) diem += 20;

                // Phân biệt chính xác Tiết 1 / Tiết 2 / T1 / T2 / Tiết 1,2 (hoặc Tiết PPCT) trong vùng đầu bài
                let vungDau = normBlocks.slice(Math.max(0, i - 2), Math.min(normBlocks.length, i + 3)).map(x => x.kd).join(' ');
                if (tietTrongTenBai) {
                    let reTietBai = new RegExp('\\b(?:tiet|t)\\s*' + tietTrongTenBai + '\\b');
                    let reTietGop = new RegExp('\\b(?:tiet|t)\\s*\\d+(?:\\s+\\d+)*\\s+' + tietTrongTenBai + '\\b');
                    if (reTietBai.test(gopKD) || reTietGop.test(gopKD) || reTietBai.test(vungDau) || reTietGop.test(vungDau)) {
                        diem += 75;
                    } else if (/\b(?:tiet|t)\s*\d+\b/.test(gopKD) && !khopTietPPCT) {
                        diem -= 60;
                    }
                }
                if (tietSo) {
                    let rePPCT = new RegExp('\\b(?:tiet|ppct)\\s*' + tietSo + '\\b');
                    if (!khopTietPPCT && rePPCT.test(vungDau)) {
                        diem += 55;
                    } else if (!khopTietPPCT && /\btiet\s*\d{2,3}\b/.test(b.kd)) {
                        diem -= 45;
                    }
                }
                ds.push({ el: b.el, diem: diem, idx: i });
            }
        }
        return ds;
    };

    let ungVien = chamDiem(chiTimTieuDe);
    if (chiTimTieuDe && ungVien.length === 0) {
        // Dự phòng nhẹ nếu giáo án không in đậm/heading nhưng vẫn giới hạn chỉ xét dòng ngắn
        ungVien = chamDiem(false).filter(u => (u.el.innerText || '').trim().length <= 160);
    }

    // Sắp xếp ưu tiên điểm cao nhất (đúng môn + đúng tên đầu bài + đúng tiết) lên đầu để vị trí 1/N là chính xác nhất
    ungVien.sort((a, b) => b.diem - a.diem || a.idx - b.idx);
    let diemMax = ungVien.length > 0 ? ungVien[0].diem : 0;
    let ketQuaChon = ungVien.filter(u => u.diem >= Math.max(40, diemMax * 0.5)).slice(0, 20);
    let tapElChon = new Set(ketQuaChon.map(u => u.el));
    ketQuaChon = ketQuaChon.filter(u => {
        for (let other of tapElChon) {
            if (other !== u.el && u.el.contains(other)) return false;
        }
        return true;
    });

    _trangThaiTimKiemGA.ketQua = ketQuaChon.map(u => u.el);
    _trangThaiTimKiemGA.tuKhoaCu = baiTxt || monTxt || '';
    window.capNhatDieuHuongKetQuaGA();
    if (_trangThaiTimKiemGA.ketQua.length > 0) {
        window.nhayDenViTriCuTheGA(0);
    }
};

window.capNhatDieuHuongKetQuaGA = function() {
    let cum = document.getElementById('cumDieuHuongKetQuaGA');
    let chiSo = document.getElementById('chiSoKetQuaGA');
    let btnTimTiep = document.getElementById('btnTimTiepGA');
    let ds = _trangThaiTimKiemGA.ketQua || [];
    if (!cum || !chiSo) return;

    if (ds.length > 0) {
        cum.classList.remove('hidden');
        cum.classList.add('inline-flex');
        ds.forEach((el, i) => {
            if (el && el.classList) el.classList.add(i === 0 ? 'ga-match-active' : 'ga-match-other');
        });
        chiSo.innerText = `1/${ds.length}`;
        if (btnTimTiep) {
            if (ds.length > 1) btnTimTiep.classList.remove('hidden');
            else btnTimTiep.classList.add('hidden');
        }
    } else {
        cum.classList.add('hidden');
        cum.classList.remove('inline-flex');
        if (btnTimTiep) btnTimTiep.classList.add('hidden');
    }
};

window.nhayDenViTriCuTheGA = function(idx) {
    let ds = _trangThaiTimKiemGA.ketQua || [];
    if (ds.length === 0) return;
    let targetIdx = ((idx % ds.length) + ds.length) % ds.length;
    _trangThaiTimKiemGA.viTriHienTai = targetIdx;

    ds.forEach((el, i) => {
        if (!el || !el.classList) return;
        if (el.classList.contains('ga-pdf-highlight')) {
            el.style.backgroundColor = (i === targetIdx) ? 'rgba(250, 204, 21, 0.48)' : 'rgba(254, 240, 138, 0.35)';
            el.style.border = (i === targetIdx) ? '2px solid #eab308' : '1px dashed #f59e0b';
        } else {
            el.classList.remove('ga-match-active', 'ga-match-other');
            el.classList.add(i === targetIdx ? 'ga-match-active' : 'ga-match-other');
        }
    });

    let chiSo = document.getElementById('chiSoKetQuaGA');
    if (chiSo) chiSo.innerText = `${targetIdx + 1}/${ds.length}`;

    let targetEl = ds[targetIdx];
    if (targetEl) {
        window.cuonDenPhanTuTrongKhungGA(targetEl, true);
    }
};

window.cuonDenPhanTuTrongKhungGA = function(targetEl, smooth = true) {
    let khung = document.getElementById('khungCuonNoiDungGA');
    if (!khung || !targetEl) return;
    requestAnimationFrame(() => {
        let khungRect = khung.getBoundingClientRect();
        let elRect = targetEl.getBoundingClientRect();
        let offsetTrongKhung = (elRect.top - khungRect.top) + khung.scrollTop;
        let topDich = Math.max(0, offsetTrongKhung - Math.min(80, khung.clientHeight * 0.18));
        khung.scrollTo({ top: topDich, behavior: smooth ? 'smooth' : 'auto' });
    });
};

window.nhayDenKetQuaTimKiemGA = function(buoc) {
    let ds = _trangThaiTimKiemGA.ketQua || [];
    if (ds.length === 0) return;
    window.nhayDenViTriCuTheGA((_trangThaiTimKiemGA.viTriHienTai || 0) + buoc);
};

window.timKiemThuCongTrongGiaoAnGA = function(nhayTiepNeuTrung = false) {
    let tuKhoa = document.getElementById('inpTimTrongGiaoAnGA')?.value.trim() || '';
    if (!tuKhoa) return;
    let noiDungWrap = document.getElementById('noiDungBaiHocZoomGA');
    if (!noiDungWrap) return;

    if (nhayTiepNeuTrung && _trangThaiTimKiemGA.tuKhoaCu === tuKhoa && (_trangThaiTimKiemGA.ketQua || []).length > 1) {
        window.nhayDenKetQuaTimKiemGA(1);
        return;
    }

    _trangThaiTimKiemGA.tuKhoaCu = tuKhoa;

    if (noiDungWrap.getAttribute('data-loai') === 'pdf') {
        window.dinhViTrangPdfDaTaiGA('', tuKhoa, '', false);
        return;
    }

    window.dinhViVaCuonDenBaiGA('', tuKhoa, '', false);
};

window.timTiepTrongGiaoAnGA = function() {
    let tuKhoa = document.getElementById('inpTimTrongGiaoAnGA')?.value.trim() || '';
    let ds = _trangThaiTimKiemGA.ketQua || [];
    if (ds.length > 1 && (!tuKhoa || _trangThaiTimKiemGA.tuKhoaCu === tuKhoa)) {
        window.nhayDenKetQuaTimKiemGA(1);
    } else {
        window.timKiemThuCongTrongGiaoAnGA(true);
    }
};

window.trichXuatDongVanBanPdfGA = function(textContent, pageViewport) {
    let items = (textContent && textContent.items) ? textContent.items : [];
    if (items.length === 0) return [];

    // Chuyển từng item sang tọa độ viewport (top-down) và gom theo từng dòng ngang
    let mapped = [];
    for (let i = 0; i < items.length; i++) {
        let it = items[i];
        let str = String(it.str || '');
        if (!str) continue;
        let tx = pdfjsLib.Util.transform(pageViewport.transform, it.transform);
        let fontH = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 12;
        let x = tx[4];
        let yBaseline = tx[5];
        let yTop = yBaseline - fontH;
        let w = (it.width || 0) * pageViewport.scale;
        mapped.push({ str: str, x: x, yTop: yTop, yBase: yBaseline, w: w, h: fontH });
    }

    // Sắp xếp từ trên xuống dưới, trái sang phải
    mapped.sort((a, b) => {
        if (Math.abs(a.yBase - b.yBase) > 5) return a.yBase - b.yBase;
        return a.x - b.x;
    });

    let lines = [];
    let curLine = null;
    for (let it of mapped) {
        if (!curLine || Math.abs(it.yBase - curLine.yBase) > Math.max(5, curLine.h * 0.45)) {
            curLine = { yBase: it.yBase, yTop: it.yTop, h: it.h, xMin: it.x, xMax: it.x + it.w, text: it.str, items: [it] };
            lines.push(curLine);
        } else {
            let gap = it.x - curLine.xMax;
            let needSpace = gap > Math.max(1.5, curLine.h * 0.18) && !curLine.text.endsWith(' ') && !it.str.startsWith(' ');
            curLine.text += (needSpace ? ' ' : '') + it.str;
            curLine.xMin = Math.min(curLine.xMin, it.x);
            curLine.xMax = Math.max(curLine.xMax, it.x + it.w);
            curLine.yTop = Math.min(curLine.yTop, it.yTop);
            curLine.h = Math.max(curLine.h, it.h);
            curLine.items.push(it);
        }
    }

    return lines.map(ln => ({
        raw: ln.text.trim(),
        chuan: window.chuanHoaChuoiTimBaiGA(ln.text),
        kd: window.boDauTiengVietGA(window.chuanHoaChuoiTimBaiGA(ln.text)),
        topPct: Math.max(0, (ln.yTop / pageViewport.height) * 100),
        heightPct: Math.max(1.2, ((ln.h * 1.35) / pageViewport.height) * 100),
        leftPct: Math.max(0, ((ln.xMin - 4) / pageViewport.width) * 100),
        widthPct: Math.min(100, (((ln.xMax - ln.xMin) + 8) / pageViewport.width) * 100)
    })).filter(ln => ln.chuan.length > 0);
};

window.tinhDiemCacDongPdfGA = function(allPageLines, monTxt, baiTxt, tietTxt, chiTimTieuDe = true) {
    let monChuan = window.chuanHoaChuoiTimBaiGA(monTxt);
    let monKD = window.boDauTiengVietGA(monChuan);
    let monRutGon = monChuan.replace(/[0-9()]/g, '').trim();
    let baiChuan = window.chuanHoaChuoiTimBaiGA(baiTxt);
    let baiCotLoi = window.tachTenBaiCotLoiGA(baiTxt);
    let baiCotLoiKD = window.boDauTiengVietGA(baiCotLoi);
    let tuBai = baiCotLoi.split(' ').filter(w => w.length >= 2);
    let tietSo = String(tietTxt || '').replace(/\D/g, '');
    let mTietBai = String(baiTxt || '').match(/(?:\(\s*(?:tiết|t)\s*(\d+)(?:\s*[,\-&]\s*\d+)*\s*\)|(?:tiết|t)\s*(\d+)\s*$)/i);
    let tietTrongTenBai = mTietBai ? (mTietBai[1] || mTietBai[2] || '') : '';

    // Phẳng hóa toàn bộ các dòng kèm số trang để kiểm tra ngữ cảnh môn học xuyên trang
    let flat = [];
    allPageLines.forEach(pg => {
        pg.lines.forEach(ln => {
            let low = ln.raw.normalize('NFC').toLowerCase();
            let laThanBai = /^(hoạt động|khởi động|khám phá|luyện tập|thực hành|vận dụng|củng cố|dặn dò|mục tiêu|yêu cầu cần đạt|đồ dùng|chuẩn bị|gv\s*:|hs\s*:|giáo viên\s*:|học sinh\s*:|[-+*•]\s)/i.test(low) && !/^(bài|tên bài|chủ đề)\b/i.test(low);
            let laTieuDe = !laThanBai && ln.raw.length <= 180 && (
                /^(bài\s*\d*|tên bài|bài học|chủ đề|tiết\s*\d+|môn(\s+học)?\s*:)/i.test(low) ||
                (ln.raw.replace(/[^\p{L}]/gu, '').length >= 4 && ln.raw === ln.raw.toUpperCase() && ln.raw !== ln.raw.toLowerCase())
            );
            flat.push({ ...ln, pageNum: pg.pageNum, laTieuDe: laTieuDe });
        });
    });

    const cham = (batBuocTieuDe) => {
        let ds = [];
        for (let i = 0; i < flat.length; i++) {
            let b = flat[i];
            if (!b.chuan || b.chuan.length < 2) continue;
            if (batBuocTieuDe && !b.laTieuDe) continue;

            // Ghép thêm 1-2 dòng ngắn kế tiếp phòng tên bài xuống dòng trong PDF
            let gopChuan = b.chuan;
            let gopKD = b.kd;
            let gopSoDong = 1;
            if (i + 1 < flat.length && flat[i + 1].pageNum === b.pageNum && flat[i + 1].raw.length <= 140) {
                gopChuan += ' ' + flat[i + 1].chuan;
                gopKD += ' ' + flat[i + 1].kd;
                gopSoDong = 2;
                if (i + 2 < flat.length && flat[i + 2].pageNum === b.pageNum && flat[i + 2].raw.length <= 110) {
                    gopChuan += ' ' + flat[i + 2].chuan;
                    gopKD += ' ' + flat[i + 2].kd;
                }
            }

            let diem = 0;
            if (baiChuan && b.chuan.includes(baiChuan)) diem += 140;
            else if (baiChuan && gopChuan.includes(baiChuan)) diem += 130;
            else if (baiCotLoi && baiCotLoi.length >= 5 && b.chuan.includes(baiCotLoi)) diem += 100;
            else if (baiCotLoi && baiCotLoi.length >= 5 && gopChuan.includes(baiCotLoi)) diem += 95;
            else if (baiCotLoiKD && baiCotLoiKD.length >= 5 && gopKD.includes(baiCotLoiKD)) diem += 85;
            else if (tuBai.length >= 2) {
                let soTuKhop = tuBai.filter(w => gopChuan.includes(w)).length;
                let tyLe = soTuKhop / tuBai.length;
                if (tyLe >= 0.75) diem += Math.round(tyLe * 70);
            }

            let khopTietPPCT = !!(tietSo && new RegExp('\\b(?:tiet|ppct)\\s*' + tietSo + '\\b').test(b.kd));
            if (khopTietPPCT) diem += (diem > 0 ? 120 : 85);

            let khopMonGan = false;
            if (monChuan) {
                let startCtx = Math.max(0, i - 10);
                for (let j = i; j >= startCtx; j--) {
                    let ctx = flat[j];
                    if (ctx.chuan.includes(monChuan) || (monRutGon && ctx.chuan.includes(monRutGon)) || (monKD && ctx.kd.includes(monKD))) {
                        khopMonGan = true;
                        break;
                    }
                }
            }
            if (diem > 0 && khopMonGan) diem += 55;
            if (diem === 0 && !baiCotLoi && monChuan && (b.chuan.includes(monChuan) || (monRutGon && b.chuan.includes(monRutGon)))) {
                diem += 45;
            }

            if (diem > 0) {
                if (b.laTieuDe) diem += 30;
                if (/^(tiet\s*\d+|bai\s*\d+)/i.test(b.kd)) diem += 25;

                let vungDau = flat.slice(Math.max(0, i - 2), Math.min(flat.length, i + 3)).map(x => x.kd).join(' ');
                if (tietTrongTenBai) {
                    let reTietBai = new RegExp('\\b(?:tiet|t)\\s*' + tietTrongTenBai + '\\b');
                    let reTietGop = new RegExp('\\b(?:tiet|t)\\s*\\d+(?:\\s+\\d+)*\\s+' + tietTrongTenBai + '\\b');
                    if (reTietBai.test(gopKD) || reTietGop.test(gopKD) || reTietBai.test(vungDau) || reTietGop.test(vungDau)) {
                        diem += 80;
                    } else if (/\b(?:tiet|t)\s*\d+\b/.test(gopKD) && !khopTietPPCT) {
                        diem -= 65;
                    }
                }
                if (tietSo && !khopTietPPCT) {
                    let rePPCT = new RegExp('\\b(?:tiet|ppct)\\s*' + tietSo + '\\b');
                    if (rePPCT.test(vungDau)) diem += 55;
                    else if (/\btiet\s*\d{2,3}\b/.test(b.kd)) diem -= 50;
                }

                // Tính vùng bôi vàng (nếu tên bài xuống dòng thì gộp chiều cao tới dòng thứ 2)
                let boxTop = b.topPct;
                let boxBottom = b.topPct + b.heightPct;
                let boxLeft = b.leftPct;
                let boxRight = b.leftPct + b.widthPct;
                if (gopSoDong >= 2 && i + 1 < flat.length && flat[i + 1].pageNum === b.pageNum && !baiChuan.includes(b.chuan) && b.chuan.length < (baiCotLoi.length + 12)) {
                    let nextLn = flat[i + 1];
                    boxBottom = Math.max(boxBottom, nextLn.topPct + nextLn.heightPct);
                    boxLeft = Math.min(boxLeft, nextLn.leftPct);
                    boxRight = Math.max(boxRight, nextLn.leftPct + nextLn.widthPct);
                }

                ds.push({
                    pageNum: b.pageNum,
                    diem: diem,
                    idx: i,
                    topPct: boxTop,
                    heightPct: Math.max(1.5, boxBottom - boxTop),
                    leftPct: boxLeft,
                    widthPct: Math.min(100 - boxLeft, boxRight - boxLeft)
                });
            }
        }
        return ds;
    };

    let ungVien = cham(chiTimTieuDe);
    if (chiTimTieuDe && ungVien.length === 0) {
        ungVien = cham(false);
    }

    ungVien.sort((a, b) => b.diem - a.diem || a.idx - b.idx);
    let diemMax = ungVien.length > 0 ? ungVien[0].diem : 0;
    let ketQua = ungVien.filter(u => u.diem >= Math.max(45, diemMax * 0.55)).slice(0, 20);
    return ketQua;
};

window.dinhViTrangPdfDaTaiGA = function(monTxt, baiTxt, tietTxt, chiTimTieuDe = true) {
    let container = document.getElementById('pdfPagesContainerGA');
    if (!container || !window._duLieuDongPdfGA) return;

    // Xóa các lớp bôi vàng và badge cũ
    container.querySelectorAll('.ga-pdf-highlight').forEach(el => el.remove());
    container.querySelectorAll('.pdf-match-badge').forEach(el => el.remove());

    let matches = window.tinhDiemCacDongPdfGA(window._duLieuDongPdfGA, monTxt, baiTxt, tietTxt, chiTimTieuDe);
    let ketQuaEls = [];

    matches.forEach((m, idx) => {
        let pageDiv = container.querySelector(`[data-pdf-page="${m.pageNum}"]`);
        if (!pageDiv) return;
        let canvasWrap = pageDiv.querySelector('.pdf-canvas-wrap');
        if (!canvasWrap) return;

        let hl = document.createElement('div');
        hl.className = 'ga-pdf-highlight absolute pointer-events-none rounded transition-all';
        hl.style.top = m.topPct.toFixed(2) + '%';
        hl.style.left = m.leftPct.toFixed(2) + '%';
        hl.style.width = m.widthPct.toFixed(2) + '%';
        hl.style.height = m.heightPct.toFixed(2) + '%';
        hl.style.backgroundColor = idx === 0 ? 'rgba(250, 204, 21, 0.45)' : 'rgba(254, 240, 138, 0.38)';
        hl.style.border = idx === 0 ? '2px solid #eab308' : '1px dashed #f59e0b';
        hl.style.scrollMarginTop = '24px';
        canvasWrap.appendChild(hl);

        let headerRow = pageDiv.querySelector('.pdf-page-header');
        if (headerRow && !headerRow.querySelector('.pdf-match-badge')) {
            let span = document.createElement('span');
            span.className = 'pdf-match-badge text-amber-800 bg-amber-100 border border-amber-300 px-2 rounded';
            span.innerText = idx === 0 ? '🎯 Đúng bài cần xem' : '🎯 Khớp bài dạy';
            headerRow.appendChild(span);
        }

        ketQuaEls.push(hl);
    });

    _trangThaiTimKiemGA.ketQua = ketQuaEls;
    _trangThaiTimKiemGA.tuKhoaCu = baiTxt || monTxt || '';
    window.capNhatDieuHuongKetQuaGA();
    if (ketQuaEls.length > 0) {
        window.nhayDenViTriCuTheGA(0);
    }
};

window._boNhoPhanTichPdfGA = window._boNhoPhanTichPdfGA || {};

window.hienThiVaDinhViPdfGA = async function(noiDungWrap, base64Str, monTxt, baiTxt, tietTxt) {
    try {
        await window.napThuVienPdfJsGA();

        let fileId = noiDungWrap.getAttribute('data-loaded-file') || '';
        let cachedParsed = fileId ? window._boNhoPhanTichPdfGA[fileId] : null;
        let pdf = cachedParsed ? cachedParsed.pdf : null;
        let pageDataList = cachedParsed ? cachedParsed.pageDataList : null;

        if (!pdf) {
            const binStr = atob(base64Str);
            const len = binStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
            pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        }

        const numPages = pdf.numPages;
        if (!pageDataList) {
            // Trích xuất văn bản song song theo lô (10 trang/lượt) giúp tăng tốc gấp 6-8 lần
            pageDataList = new Array(numPages);
            const batchSize = 10;
            for (let start = 1; start <= numPages; start += batchSize) {
                let tasks = [];
                let end = Math.min(numPages, start + batchSize - 1);
                for (let p = start; p <= end; p++) {
                    tasks.push((async (pageNum) => {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const viewport = page.getViewport({ scale: 1.4 });
                        const lines = window.trichXuatDongVanBanPdfGA(textContent, viewport);
                        const pageText = lines.map(l => l.chuan).join(' ');
                        pageDataList[pageNum - 1] = { p: pageNum, page: page, viewport: viewport, lines: lines, pageText: pageText };
                    })(p));
                }
                await Promise.all(tasks);
            }
            if (fileId) window._boNhoPhanTichPdfGA[fileId] = { pdf: pdf, pageDataList: pageDataList };
        }

        if (!document.getElementById('modalXemDuyetGiaoAn')) return;

        noiDungWrap.innerHTML = `<div id="pdfPagesContainerGA" class="space-y-4"></div>`;
        let container = document.getElementById('pdfPagesContainerGA');
        window._duLieuDongPdfGA = [];

        let pageObjects = [];
        for (let item of pageDataList) {
            window._duLieuDongPdfGA.push({ pageNum: item.p, lines: item.lines });
            let pageDiv = document.createElement('div');
            pageDiv.className = 'bg-white rounded shadow-md p-2 relative';
            pageDiv.setAttribute('data-pdf-page', String(item.p));
            pageDiv.setAttribute('data-pdf-page-text', item.pageText);
            pageDiv.setAttribute('data-rendered', 'false');
            pageDiv.innerHTML = `<div class="pdf-page-header text-[11px] font-bold text-slate-500 mb-1 flex justify-between px-1"><span>Trang ${item.p} / ${numPages}</span></div><div class="pdf-canvas-wrap relative w-full"><canvas class="w-full h-auto block mx-auto"></canvas></div>`;
            const preCanvas = pageDiv.querySelector('canvas');
            if (preCanvas) {
                preCanvas.width = item.viewport.width;
                preCanvas.height = item.viewport.height;
            }
            container.appendChild(pageDiv);
            pageObjects.push({ ...item, pageDiv: pageDiv, rendering: false });
        }

        // Bước 2: Định vị đúng dòng đầu bài, bôi vàng và cuộn ngay tới vị trí đó
        window.dinhViTrangPdfDaTaiGA(monTxt, baiTxt, tietTxt, true);

        const renderMotTrang = async (item) => {
            if (!item || item.rendering || item.pageDiv.getAttribute('data-rendered') === 'true') return;
            if (!document.getElementById('pdfPagesContainerGA')) return;
            item.rendering = true;
            try {
                const canvas = item.pageDiv.querySelector('canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    await item.page.render({ canvasContext: ctx, viewport: item.viewport }).promise;
                    item.pageDiv.setAttribute('data-rendered', 'true');
                }
            } finally {
                item.rendering = false;
            }
        };

        // Bước 3: Chỉ vẽ ngay trang đích và 2 trang lân cận để hiển thị tức thì (< 150ms)
        let firstHl = (_trangThaiTimKiemGA.ketQua && _trangThaiTimKiemGA.ketQua[0]) ? _trangThaiTimKiemGA.ketQua[0] : null;
        let targetPageDiv = firstHl ? firstHl.closest('[data-pdf-page]') : null;
        let targetP = targetPageDiv ? parseInt(targetPageDiv.getAttribute('data-pdf-page') || '1', 10) : 1;

        let uuTien = [targetP, targetP - 1, targetP + 1].filter(p => p >= 1 && p <= numPages);
        await Promise.all(uuTien.map(p => renderMotTrang(pageObjects[p - 1])));
        if (firstHl) window.cuonDenPhanTuTrongKhungGA(firstHl, false);

        // Bước 4: Dùng IntersectionObserver để chỉ vẽ các trang khác khi người dùng cuộn tới
        let khungCuon = document.getElementById('khungCuonNoiDungGA');
        if (typeof IntersectionObserver !== 'undefined' && khungCuon) {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        let pNum = parseInt(entry.target.getAttribute('data-pdf-page') || '0', 10);
                        if (pNum >= 1 && pNum <= numPages) {
                            renderMotTrang(pageObjects[pNum - 1]);
                            obs.unobserve(entry.target);
                        }
                    }
                });
            }, { root: khungCuon, rootMargin: '700px 0px' });

            pageObjects.forEach(item => {
                if (item.pageDiv.getAttribute('data-rendered') !== 'true') {
                    obs.observe(item.pageDiv);
                }
            });
        }
    } catch (errPdf) {
        console.warn('Lỗi render PDF, chuyển về Drive:', errPdf);
        window.chuyenCheDoXemGiaoAnGA('drive');
    }
};

// Tự động khởi tạo DOM & nạp ngầm danh sách giáo án
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.khoiTaoDOMDuyetGiaoAn();
        setTimeout(() => window.taiDanhSachGiaoAnTuMayChu(false), 2500);
    });
} else {
    window.khoiTaoDOMDuyetGiaoAn();
    setTimeout(() => window.taiDanhSachGiaoAnTuMayChu(false), 2500);
}
