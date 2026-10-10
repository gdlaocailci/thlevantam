// =========================================================================
// KHỐI QUẢN LÝ MA TRẬN PHÂN QUYỀN HỆ THỐNG (BẢN CHUẨN ĐỒNG BỘ)
// Chỉ tập trung: Quản lý Menu Hệ thống, Nút TKB và Khóa Sổ Đầu Bài Tuần
// Đã loại bỏ hoàn toàn tính năng Khóa TKB theo yêu cầu
// =========================================================================

let duLieuBangPhanQuyen = [];

const DANH_SACH_MENU_HE_THONG = [
    { id: 'menuCaiDat', ten: '1. Cài đặt' },
    { id: 'menuDanhMucGV', ten: '2. DM Giáo viên' },
    { id: 'menuDanhMucLop', ten: '3. DM Lớp' },
    { id: 'menuKhungChuongTrinh', ten: '4. Khung CT' },
    { id: 'menuPhanCong', ten: '5. Phân công' },
    { id: 'menuDanhMucSGK', ten: '6. DM SGK' },
    { id: 'menuPhanPhoiChuongTrinh', ten: '7. PP Chương trình' },
    { id: 'menuPhanQuyen', ten: '8. Phân quyền' },
    { id: 'menuKiemTraSoDauBai', ten: '9. Kiểm tra SĐB' }
];

const DANH_SACH_NUT_CHUC_NANG = [
    { id: 'btnNhapExcelTKB', ten: 'Nhập Excel' },
    { id: 'btnKhoiPhuc', ten: 'Tuần mới' },
    { id: 'btnLuuTuan', ten: 'Lưu TKB Tuần' },
    { id: 'btnLuuCoDinh', ten: 'TKB Cố Định' },
    { id: 'btnXepTuDong', ten: 'Xếp Tự Động' },
    { id: 'btnKiemTra', ten: 'Định Mức tiết' },
    { id: 'btnChuyenTuan', ten: 'Mũi tên Chuyển tuần' },
    { id: 'btnLuuSua', ten: 'Lưu Sửa' },
    { id: 'btnKhoaSoDauBai', ten: 'Khóa Sổ đầu bài Tuần' }
];

// =========================================================================
// HÀM KIỂM SOÁT HIỂN THỊ MENU 7, 8 VÀ NÚT KHÓA SỔ ĐẦU BÀI (CHỐNG ĐỆ QUY TUYỆT ĐỐI)
// =========================================================================
let _dangCapNhatPhanQuyen = false;

function capNhatHienThiPhanQuyen() {
    if (_dangCapNhatPhanQuyen) return;
    _dangCapNhatPhanQuyen = true;
    try {
        let coQuyenQuanTri = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua);
        let quyenCongKhai = (typeof layQuyenCongKhaiHienTai === 'function') ? layQuyenCongKhaiHienTai() : { menu: [], nut: [], lop: [] };
        let menuCongKhai = quyenCongKhai.menu || [];
        let nutCongKhai = quyenCongKhai.nut || [];

        // 1. Kiểm soát hiển thị Menu 8: Phân quyền Hệ thống
        let menuPQ = document.getElementById('menuPhanQuyen');
        let duocXemMenu = false;
        if (menuPQ) {
            duocXemMenu = coQuyenQuanTri || 
                          (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.menu && quyenChiTiet.menu.includes('menuPhanQuyen')) ||
                          menuCongKhai.includes('menuPhanQuyen');
            menuPQ.style.display = duocXemMenu ? 'flex' : 'none';
        }

        // 2. Kiểm soát hiển thị Menu 7: Phân phối Chương trình (Hỗ trợ mở công khai 1-click)
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

        // 3. Kiểm soát hiển thị Nút Khóa Sổ Đầu Bài Tuần
        let btnKhoaSo = document.getElementById('btnKhoaSoDauBai');
        if (btnKhoaSo) {
            let duocBamKhoaSo = coQuyenQuanTri || 
                                (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.nut && quyenChiTiet.nut.includes('btnKhoaSoDauBai')) ||
                                nutCongKhai.includes('btnKhoaSoDauBai');
            btnKhoaSo.style.display = duocBamKhoaSo ? 'inline-flex' : 'none';
        }

        // 4. Đồng bộ giao diện thanh công cụ 1-click nếu đang mở Ma trận phân quyền
        capNhatTrangThaiNutCongKhaiNhanhUI();
    } finally {
        _dangCapNhatPhanQuyen = false;
    }
}

// Cập nhật trạng thái hiển thị của các nút chuyển đổi công khai 1-click
function capNhatTrangThaiNutCongKhaiNhanhUI() {
    let quyenCK = (typeof layQuyenCongKhaiHienTai === 'function') ? layQuyenCongKhaiHienTai() : { menu: [], nut: [], lop: [] };
    let menuCK = quyenCK.menu || [];
    let nutCK = quyenCK.nut || [];

    let btnTogglePPCT = document.getElementById('btnToggleCongKhai_PPCT');
    if (btnTogglePPCT) {
        let daMo = menuCK.includes('menuPhanPhoiChuongTrinh');
        if (daMo) {
            btnTogglePPCT.className = 'px-3 py-1.5 text-xs font-bold rounded shadow transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white';
            btnTogglePPCT.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> 🌐 PPCT: ĐANG CÔNG KHAI (1-Click để Tắt)`;
        } else {
            btnTogglePPCT.className = 'px-3 py-1.5 text-xs font-bold rounded shadow transition-colors flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800';
            btnTogglePPCT.innerHTML = `<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg> 🔒 PPCT: ĐANG KHÓA (1-Click để Mở công khai)`;
        }
    }
}

// =========================================================================
// HÀM CHUYỂN ĐỔI CÔNG KHAI 1-CLICK (ÁP DỤNG CHO MENU PPCT VÀ MỌI NÚT/MENU)
// =========================================================================
async function chuyenDoiCongKhai1ClickUI(loai, id, tenHienThi) {
    if (typeof quyenSuaChua === 'undefined' || !quyenSuaChua) {
        alert("⚠️ Chỉ tài khoản Quản trị (Admin) mới có quyền Bật/Tắt hiển thị công khai!");
        return;
    }

    let quyenCK = (typeof layQuyenCongKhaiHienTai === 'function') ? layQuyenCongKhaiHienTai() : { menu: [], nut: [], lop: [] };
    let mangLoai = quyenCK[loai] || [];
    let dangCongKhai = mangLoai.includes(id);
    let trangThaiMoi = !dangCongKhai;

    let tieuDe = tenHienThi || id;
    let xacNhan = confirm(`Đồng chí có chắc chắn muốn ${trangThaiMoi ? 'BẬT' : 'TẮT'} hiển thị CÔNG KHAI cho [${tieuDe}]?

- BẬT: Tất cả giáo viên & khách (kể cả chưa đăng nhập) đều được xem.
- TẮT: Chỉ những ai được cấp quyền cụ thể trong Ma trận phân quyền mới được xem.`);
    if (!xacNhan) return;

    let idGiaoVienGoiLen = typeof window.dinhDanhGiaoVienToanCuc !== 'undefined' ? window.dinhDanhGiaoVienToanCuc : (typeof window.emailGiaoVienToanCuc !== 'undefined' ? window.emailGiaoVienToanCuc : '');

    try {
        let btnToggle = document.getElementById('btnToggleCongKhai_PPCT');
        let textGoc = btnToggle ? btnToggle.innerHTML : '';
        if (btnToggle) { btnToggle.innerHTML = "Đang xử lý..."; btnToggle.disabled = true; }

        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify({
                thaoTac: 'chuyenDoiCongKhai',
                loai: loai,
                id: id,
                congKhai: trangThaiMoi,
                emailTruyCap: idGiaoVienGoiLen
            })
        });

        const ketQua = await phanHoi.json();
        if (btnToggle) { btnToggle.innerHTML = textGoc; btnToggle.disabled = false; }

        if (ketQua.trangThai === 'Thành công') {
            alert(ketQua.thongBao);
            
            // Cập nhật bộ nhớ cấu hình Frontend
            if (typeof thongSoHocVu !== 'undefined') {
                if (!thongSoHocVu.QUYEN_CONG_KHAI) thongSoHocVu.QUYEN_CONG_KHAI = { menu: [], nut: [], lop: [] };
                if (ketQua.quyenCongKhai) {
                    thongSoHocVu.QUYEN_CONG_KHAI = ketQua.quyenCongKhai;
                } else {
                    if (trangThaiMoi && !mangLoai.includes(id)) mangLoai.push(id);
                    if (!trangThaiMoi && mangLoai.includes(id)) mangLoai.splice(mangLoai.indexOf(id), 1);
                    thongSoHocVu.QUYEN_CONG_KHAI[loai] = mangLoai;
                }

                // Cập nhật luôn vào MA_TRAN_PHAN_QUYEN nếu có dòng * (Công khai)
                if (thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
                    for (let k in thongSoHocVu.MA_TRAN_PHAN_QUYEN) {
                        let kLC = k.toLowerCase();
                        if (kLC === '*' || kLC.includes('công khai') || kLC.includes('congkhai')) {
                            thongSoHocVu.MA_TRAN_PHAN_QUYEN[k] = thongSoHocVu.QUYEN_CONG_KHAI;
                            break;
                        }
                    }
                }

                if (typeof layKhoaCachLy === 'function') {
                    let KEY_CH = layKhoaCachLy('SmartTKB_CauHinh');
                    localStorage.setItem(KEY_CH, JSON.stringify(thongSoHocVu));
                }
            }

            // Kích hoạt cập nhật giao diện an toàn không đệ quy
            capNhatHienThiPhanQuyen();
            if (typeof window.kiemSoatGiaoDien === 'function') window.kiemSoatGiaoDien();

            // Nếu đang mở bảng ma trận phân quyền thì nạp lại bảng
            let khungPQ = document.getElementById('khungPhanQuyen');
            if (khungPQ && !khungPQ.classList.contains('hidden')) {
                taiDuLieuPhanQuyenTuMayChu();
            }
        } else {
            alert("Thao tác thất bại: " + (ketQua.thongBao || 'Lỗi không xác định'));
        }
    } catch (loi) {
        alert("Có sự cố kết nối máy chủ: " + loi.message);
    }
}
window.chuyenDoiCongKhai1ClickUI = chuyenDoiCongKhai1ClickUI;

// =========================================================================
// CƠ CHẾ BẢO ĐẢM KHỞI TẠO DOM (CHỐNG MẤT MENU 7 DÙ HTML CÓ HAY CHƯA)
// =========================================================================
function khoiTaoDOMPhanQuyen() {
    const nav = document.querySelector('nav');
    const vungChinh = document.getElementById('vungHienThiChinh');

    // 1. Chèn Menu 8 vào thanh Sidebar nếu trong index.html chưa có
    if (nav && !document.getElementById('menuPhanQuyen')) {
        const menuHtml = `
            <a id="menuPhanQuyen" onclick="moTabPhanQuyenChuyenDung()" style="display: none;" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group">
                <svg class="w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M8 11l3 3 5-5"></path></svg>
                <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px] whitespace-nowrap">8. Phân quyền Hệ thống</span>
            </a>`;
        nav.insertAdjacentHTML('beforeend', menuHtml);
    }

    // 2. Chèn Khung ma trận nếu trong index.html chưa có
    if (vungChinh && !document.getElementById('khungPhanQuyen')) {
        const khungHtml = `
            <div id="khungPhanQuyen" class="hidden p-4 w-full h-full flex-col font-sans">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 flex-none">
                    <div>
                        <h2 class="text-xl font-extrabold text-blue-900 uppercase">MA TRẬN PHÂN QUYỀN HỆ THỐNG</h2>
                        <p class="text-xs text-slate-500 font-semibold mt-0.5">Quản lý quyền Menu, Nút chức năng TKB và chế độ Công khai (Toàn trường)</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Nút 1-Click chuyển đổi công khai nhanh cho Menu PPCT -->
                        <button id="btnToggleCongKhai_PPCT" onclick="chuyenDoiCongKhai1ClickUI('menu', 'menuPhanPhoiChuongTrinh', 'Menu 7. Phân phối chương trình')" class="px-3 py-1.5 text-xs font-bold rounded shadow transition-colors flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800" title="Bật/Tắt hiển thị công khai Menu Phân phối chương trình">
                            🌐 PPCT: Đang nạp...
                        </button>
                        <button onclick="taiDuLieuPhanQuyenTuMayChu()" class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
                            Tải lại
                        </button>
                        <button onclick="themDongPhanQuyenMoi()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
                            + Cấp quyền mới
                        </button>
                        <button onclick="luuDuLieuPhanQuyenSangMayChu()" class="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-1.5 text-xs shadow transition duration-200 rounded flex items-center gap-1.5">
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

    // 3. Kích hoạt cập nhật hiển thị ngay
    capNhatHienThiPhanQuyen();
}

// Hook an toàn vào hàm kiemSoatGiaoDien của app.js (CHỐNG LẶP ĐỆ QUY)
function ganKetHeThongKiemSoat() {
    if (typeof window.kiemSoatGiaoDien === 'function' && !window.kiemSoatGiaoDien._daHookPhanQuyen) {
        const kiemSoatGoc = window.kiemSoatGiaoDien;
        const hamBaoVe = function() {
            try {
                kiemSoatGoc.apply(this, arguments);
            } finally {
                if (typeof capNhatHienThiPhanQuyen === 'function') {
                    capNhatHienThiPhanQuyen();
                }
            }
        };
        hamBaoVe._daHookPhanQuyen = true;
        window.kiemSoatGiaoDien = hamBaoVe;
    }
}

// Khởi tạo đa tầng để chống trễ nhịp sự kiện DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        khoiTaoDOMPhanQuyen();
        ganKetHeThongKiemSoat();
        setTimeout(capNhatHienThiPhanQuyen, 200);
        setTimeout(capNhatHienThiPhanQuyen, 800);
    });
} else {
    khoiTaoDOMPhanQuyen();
    ganKetHeThongKiemSoat();
    setTimeout(capNhatHienThiPhanQuyen, 200);
    setTimeout(capNhatHienThiPhanQuyen, 800);
}

// =========================================================================
// CÁC HÀM XỬ LÝ NGHIỆP VỤ BẢNG MA TRẬN PHÂN QUYỀN
// =========================================================================

function moTabPhanQuyenChuyenDung() {
    if (typeof kichHoatTab === 'function') {
        kichHoatTab('menuPhanQuyen', 'khungPhanQuyen', false);
        taiDuLieuPhanQuyenTuMayChu();
    }
}

async function taiDuLieuPhanQuyenTuMayChu() {
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
            duLieuBangPhanQuyen = ketQua;
        } else if (ketQua && ketQua.trangThai === 'thanh_cong') {
            throw new Error("Mã máy chủ chưa được đồng bộ. Đồng chí vui lòng chọn Manage Deployments -> New version trên Google Apps Script.");
        } else {
            duLieuBangPhanQuyen = [];
        }
        
        hienThiBangPhanQuyen();
    } catch (loi) {
        vungDuLieu.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 font-bold py-10">Lỗi kết nối: ${loi.message}</td></tr>`;
    }
}

function taoNhomCheckbox(danhSachGoc, danhSachDaChon, kieuPhanLoai) {
    let html = `<div class="flex flex-wrap gap-2 justify-start max-h-32 overflow-y-auto p-1 custom-scrollbar">`;
    danhSachGoc.forEach(item => {
        let idItem = typeof item === 'object' ? item.id : item;
        let tenItem = typeof item === 'object' ? item.ten : item;
        let daChon = danhSachDaChon.includes(idItem) ? 'checked' : '';
        html += `<label class="flex items-center gap-1 bg-slate-50 border border-gray-300 px-2 py-1 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors">
            <input type="checkbox" value="${idItem}" data-loai="${kieuPhanLoai}" ${daChon} class="cursor-pointer">
            <span class="font-semibold text-slate-700 whitespace-nowrap">${tenItem}</span>
        </label>`;
    });
    html += `</div>`;
    return html;
}

function hienThiBangPhanQuyen() {
    const vungDuLieu = document.getElementById('vungDuLieuPhanQuyen');
    let html = '';
    let dsLop = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP) ? thongSoHocVu.DANH_SACH_LOP : [];

    if (duLieuBangPhanQuyen.length === 0) {
        html = '<tr><td colspan="5" class="text-center py-10 font-bold text-slate-500">Chưa có dữ liệu cấp quyền nào. Bấm "Cấp quyền mới" để tạo.</td></tr>';
    } else {
        duLieuBangPhanQuyen.forEach((dong, index) => {
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
                <td class="p-2 align-top border-l border-gray-300 bg-gray-50/50">${taoNhomCheckbox(dsLop, lopChon, 'lop')}</td>
                <td class="p-2 align-top border-l border-gray-300">${taoNhomCheckbox(DANH_SACH_MENU_HE_THONG, menuChon, 'menu')}</td>
                <td class="p-2 align-top border-l border-gray-300 bg-gray-50/50">${taoNhomCheckbox(DANH_SACH_NUT_CHUC_NANG, nutChon, 'nut')}</td>
                <td class="p-2 text-center align-middle border-l border-gray-300">
                    <button onclick="xoaDongPhanQuyen(this)" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors" title="Xóa quyền">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>`;
        });
    }
    vungDuLieu.innerHTML = html;
}

function themDongPhanQuyenMoi() {
    duLieuBangPhanQuyen.push(['', '', '', '']);
    hienThiBangPhanQuyen();
    setTimeout(() => {
        let khung = document.querySelector('#khungPhanQuyen .overflow-auto');
        if (khung) khung.scrollTop = khung.scrollHeight;
    }, 50);
}

function xoaDongPhanQuyen(btn) {
    if (!confirm("Đồng chí chắc chắn muốn thu hồi phân quyền của định danh này?")) return;
    let tr = btn.closest('tr');
    let index = parseInt(tr.getAttribute('data-index'), 10);
    if (!isNaN(index)) {
        duLieuBangPhanQuyen.splice(index, 1);
        hienThiBangPhanQuyen();
    }
}

async function luuDuLieuPhanQuyenSangMayChu() {
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

    let btnLuu = document.querySelector('button[onclick="luuDuLieuPhanQuyenSangMayChu()"]');
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
            duLieuBangPhanQuyen = mangGhi; 
            hienThiBangPhanQuyen();
        } else {
            alert("Lưu thất bại: " + kq.thongBao);
        }
    } catch (loi) {
        alert("Có sự cố kết nối máy chủ: " + loi.message);
    } finally {
        if (btnLuu) { btnLuu.innerHTML = textGoc; btnLuu.disabled = false; }
    }
}
