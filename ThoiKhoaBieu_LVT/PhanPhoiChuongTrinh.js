// =========================================================================
// KHỐI 1: KHỞI TẠO BIẾN TOÀN CỤC VÀ GẮN GIAO DIỆN VÀO DOM
// =========================================================================
let duLieuPpctGoc = []; 
let duLieuTkbTuan = [];
let trangThaiDaTaiGiaoDienPPCT = false;
let trangThaiChoPhepSua = false; // [NÂNG CẤP]: Biến lưu trạng thái khoá/mở sửa bảng

document.addEventListener('DOMContentLoaded', () => {
    taoMenuPhanPhoiChuongTrinh();
    taoKhungGiaoDienPPCT();
    
    // Liên tục lắng nghe trạng thái đăng nhập để phân quyền Admin
    setInterval(() => {
        if (typeof quyenSuaChua !== 'undefined') {
            let nhomNut = document.getElementById('nhomNutCongCuPPCT');
            if (nhomNut) {
                nhomNut.style.display = quyenSuaChua ? 'flex' : 'none';
            }
        }
    }, 1000);
});

function taoMenuPhanPhoiChuongTrinh() {
    const menuThongKe = document.getElementById('menuThongKe');
    if (menuThongKe && !document.getElementById('menuPhanPhoiChuongTrinh')) {
        const menuPPCT = document.createElement('a');
        menuPPCT.id = 'menuPhanPhoiChuongTrinh';
        menuPPCT.onclick = moTabPhanPhoiChuongTrinh;
        menuPPCT.className = 'flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group';
        menuPPCT.innerHTML = `
            <svg class="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity flex-none text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                <line x1="10" y1="6" x2="16" y2="6"></line>
                <line x1="10" y1="10" x2="16" y2="10"></line>
            </svg>
            <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px]">Phân phối Chương trình</span>
        `;
        menuThongKe.insertAdjacentElement('afterend', menuPPCT);
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
                    
                    <!-- [NÂNG CẤP]: Nút bật/tắt trạng thái sửa (Nằm trái nút Xuất) -->
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
                    <input type="number" id="locTuanUI" min="1" max="52" value="1" class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-900 bg-blue-50 text-center">
                </div>
                <div class="flex flex-col w-32">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Lớp</label>
                    <input type="text" id="locLopPPCT" list="listLopPPCT" onchange="tuDongTinhKhoiLop()" class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-blue-50" placeholder="Chọn lớp">
                    <datalist id="listLopPPCT"></datalist>
                </div>
                <div class="flex flex-col w-24">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Khối Lớp</label>
                    <input type="text" id="locKhoiPPCT" readonly class="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-100 font-extrabold text-slate-700 text-center select-none" title="Tự động trích xuất từ Tên Lớp" placeholder="--">
                </div>
                <div class="flex flex-col w-48">
                    <label class="text-[11px] text-gray-500 uppercase font-bold mb-1">Môn học</label>
                    <input type="text" id="locMonPPCT" list="listMonPPCT" class="w-full px-2 py-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-blue-50" placeholder="Chọn môn">
                    <datalist id="listMonPPCT"></datalist>
                </div>
               <button onclick="taiDuLieuTkbVaPpct()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-6 rounded shadow transition duration-200 text-sm ml-auto flex items-center gap-2 h-[34px]">
                    Xác nhận
                </button>
            </div>

            <div class="flex-1 overflow-auto border border-gray-400 shadow-sm bg-white relative">
                <table class="bang-excel w-full text-center border-collapse">
                    <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm border-b-2 border-slate-400">
                        <tr>
                            <th class="py-2.5 px-2 border border-slate-400 w-28">Thứ / Ngày</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-20">Buổi</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-12">Tiết</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-24">Tiết PPC</th>
                            <th class="py-2.5 px-2 border border-slate-400 w-32">Môn</th>
                            <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[250px]">Tên bài học</th>
                            <th class="py-2.5 px-4 border border-slate-400 text-center min-w-[200px]">Điều chỉnh</th>
                        </tr>
                    </thead>
                    <tbody id="vungDuLieuLichPPCT">
                        <tr><td colspan="7" class="text-center py-10 text-slate-500 font-bold italic">Vui lòng chọn Tuần, Lớp, Môn và bấm "Xác nhận"</td></tr>
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
// KHỐI 2: ĐIỀU HƯỚNG TAB VÀ XỬ LÝ LAZY LOADING
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
    ['khungTKB', 'khungThongKe', 'khungPhanCong', 'khungKhungChuongTrinh', 'khungDanhMucGV', 'khungCaiDat', 'khungDanhMucLop'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('flex', 'block'); el.classList.add('hidden'); }
    });
    
    // [ĐÃ SỬA THEO YÊU CẦU]: Ẩn toàn bộ khu vực thanh công cụ TKB (Khu vực viền đỏ)
    const thanhCongCu = document.getElementById('thanhCongCuTKB');
    if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }

    // Ẩn Header hệ thống
    const headerHeThong = document.querySelector('header');
    if (headerHeThong) { headerHeThong.style.display = 'none'; }

    // 4. Hiện khung PPCT
    const khungPPCT = document.getElementById('khungPhanPhoiChuongTrinh');
    if (khungPPCT) { khungPPCT.classList.remove('hidden'); khungPPCT.classList.add('flex'); }

    // 5. Nạp dữ liệu vào ô lọc
    bomDuLieuVaoBoLoc();
    if (typeof tuanDangXem !== 'undefined') {
        let theTuanUI = document.getElementById('locTuanUI');
        if(theTuanUI) theTuanUI.value = tuanDangXem;
    }
}

function bomDuLieuVaoBoLoc() {
    if (typeof thongSoHocVu !== 'undefined') {
        const dsLop = thongSoHocVu.DANH_SACH_LOP || [];
        const dsMon = thongSoHocVu.DANH_SACH_MON_HOC || [];
        
        const listLop = document.getElementById('listLopPPCT');
        const listMon = document.getElementById('listMonPPCT');
        const inputLop = document.getElementById('locLopPPCT');
        const inputMon = document.getElementById('locMonPPCT');

        if (listLop) listLop.innerHTML = dsLop.map(lop => `<option value="${lop}">`).join('');
        if (listMon) listMon.innerHTML = dsMon.map(mon => `<option value="${mon}">`).join('');

        // Tự động gán giá trị mặc định đầu tiên để không bị trống ô
        if (inputLop && inputLop.value === '' && dsLop.length > 0) {
            inputLop.value = dsLop[0];
            tuDongTinhKhoiLop(); // Ép hệ thống tự tính Khối lớp ngay lập tức
        }
        if (inputMon && inputMon.value === '' && dsMon.length > 0) {
            inputMon.value = dsMon[0];
        }
    }
}

function tuDongTinhKhoiLop() {
    const inputLop = document.getElementById('locLopPPCT').value.trim();
    const inputKhoi = document.getElementById('locKhoiPPCT');
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
// KHỐI 3: GỌI API KÉP (TKB + PPCT) VÀ VẼ LƯỚI MA TRẬN
// =========================================================================
async function taiDuLieuTkbVaPpct() {
    const tuan = document.getElementById('locTuanUI').value.trim();
    const lop = document.getElementById('locLopPPCT').value.trim();
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tbody = document.getElementById('vungDuLieuLichPPCT');

    if (!tuan || !lop || !khoi || !mon || khoi === 'KX') {
        alert("Đồng chí vui lòng điền đầy đủ: Tuần, Lớp, Môn học để truy xuất dữ liệu.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-blue-600 font-bold">
        <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        Đang đồng bộ Lịch giảng dạy và Phân phối chương trình...
    </td></tr>`;

    try {
        const tuanHeThong = typeof tuanDangXem !== 'undefined' ? tuanDangXem : 1;
        const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTkbVaPpct&tuan=${tuan}&lop=${encodeURIComponent(lop)}&khoi=${khoi}&mon=${encodeURIComponent(mon)}&tuanHienTai=${tuanHeThong}`;
        
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlAPI) : fetch(urlAPI));
        
        if (!phanHoi.ok) throw new Error("Mất kết nối máy chủ");
        const ketQua = await phanHoi.json();
        
        duLieuTkbTuan = ketQua.duLieuTkb || [];
        duLieuPpctGoc = ketQua.duLieuPpct || [];
        
        veBangKhungLichPPCT(mon);
    } catch (loi) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-600 font-bold">Lỗi truy xuất dữ liệu từ máy chủ.</td></tr>`;
    }
}

function veBangKhungLichPPCT(monDangChon) {
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    let html = '';
    
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    const cauTrucTiet = { "Sáng": [1,2,3,4,5], "Chiều": [1,2,3,4] };
    
    let maTranTkb = {};
    let demTietTuanNay = 0; 
    
    const monChonChuan = monDangChon.trim().replace(/\s+/g, '').toLowerCase();
    
    duLieuTkbTuan.forEach(t => {
        if (!maTranTkb[t.thu]) maTranTkb[t.thu] = {};
        if (!maTranTkb[t.thu][t.buoi]) maTranTkb[t.thu][t.buoi] = {};
        maTranTkb[t.thu][t.buoi][t.tiet] = t;
        
        let monTkbChuan = t.monHoc.trim().replace(/\s+/g, '').toLowerCase();
        if (monTkbChuan === monChonChuan) demTietTuanNay++;
    });

    const tuan = parseInt(document.getElementById('locTuanUI').value.trim()) || 1;
    const lop = document.getElementById('locLopPPCT').value.trim();
    
    let ngayGocThu2 = null;
    const tuanHienTaiHeThong = (typeof tuanDangXem !== 'undefined') ? parseInt(tuanDangXem) : 1;
    const isTuongLai = tuan > tuanHienTaiHeThong;
    
    if (typeof ngayDauTuanUI !== 'undefined' && ngayDauTuanUI !== '') {
        let parts = ngayDauTuanUI.split('-');
        if (parts.length === 3) {
            let yy = parseInt(parts[0], 10);
            let mm = parseInt(parts[1], 10) - 1; 
            let dd = parseInt(parts[2], 10);
            ngayGocThu2 = new Date(yy, mm, dd);
            
            let lechTuan = tuan - tuanHienTaiHeThong;
            if (lechTuan !== 0) {
                ngayGocThu2.setDate(ngayGocThu2.getDate() + (lechTuan * 7));
            }
        }
    }

    // =========================================================================
    // [THUẬT TOÁN ĐỘT PHÁ]: NHẬN DIỆN VÀ TÍNH TOÁN THEO NHÓM MÔN CHIA NHỎ
    // =========================================================================
    let soTiet1Tuan = 0; 
    let tongSoTietNhom = 0; 
    let heSoTiet = 1; 
    let isSplitSubject = false;

    // Tách base name và suffix (Ví dụ: HĐTN 3 -> Gốc: hdtn, Đuôi: 3)
    const match = monChonChuan.match(/^(.*?)(\d+)$/);
    let baseName = monChonChuan;
    if (match) {
        baseName = match[1];
        heSoTiet = parseInt(match[2], 10);
    }

    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) {
        let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lop] || {};
        
        Object.keys(dmKhoi).forEach(m => {
            let tenM = m.trim().replace(/\s+/g, '').toLowerCase();
            
            // Tìm số tiết của đích danh môn đang chọn
            if (tenM === monChonChuan) {
                soTiet1Tuan = parseInt(dmKhoi[m]) || 0;
            }
            
            // Tính TỔNG số tiết của cả nhóm (HĐTN 1 + 2 + 3)
            let mMatch = tenM.match(/^(.*?)(\d+)$/);
            let mBase = mMatch ? mMatch[1] : tenM;
            
            if (mBase === baseName) {
                tongSoTietNhom += (parseInt(dmKhoi[m]) || 0);
            }
        });
    }

    if (!soTiet1Tuan || isNaN(soTiet1Tuan) || soTiet1Tuan === 0) soTiet1Tuan = demTietTuanNay;
    if (tongSoTietNhom === 0) tongSoTietNhom = soTiet1Tuan;

    // Xác nhận đây là môn chia nhỏ nếu Tổng nhóm > Tiết cá nhân
    if (tongSoTietNhom > soTiet1Tuan && match) {
        isSplitSubject = true;
    }

    let tietPpcAuto = 1;
    if (isSplitSubject) {
        // Công thức đặc biệt cho môn chia nhỏ (VD Tuần 2, HĐTN 3: (2-1)*3 + 3 = 6)
        tietPpcAuto = (tuan - 1) * tongSoTietNhom + heSoTiet;
    } else {
        // Công thức cho môn độc lập (Toán, Tiếng Việt)
        tietPpcAuto = (tuan - 1) * soTiet1Tuan + 1;
    }

    // =========================================================================

    let mangPpctGocDaSapXep = [...duLieuPpctGoc].filter(b => String(b.tiet).trim() !== '').sort((a, b) => parseInt(a.tiet) - parseInt(b.tiet));
    let chiSoPpctTuDong = (tuan - 1) * soTiet1Tuan;

    let tongSoDongMucTieu = 0;

    thuMacDinh.forEach(thu => {
        let dsTietCuaThu = []; 
        ["Sáng", "Chiều"].forEach(buoi => {
            cauTrucTiet[buoi].forEach(tiet => {
                let tietTkb = (maTranTkb[thu] && maTranTkb[thu][buoi] && maTranTkb[thu][buoi][tiet]) ? maTranTkb[thu][buoi][tiet] : null;
                let tenMonTkb = tietTkb ? tietTkb.monHoc.trim() : '';
                
                let monTkbChuan = tenMonTkb.replace(/\s+/g, '').toLowerCase();

                if (monTkbChuan === monChonChuan && tenMonTkb !== '') {
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

                        let valTietPPC = tietTkb.tietPpc || '';
                        
                        // Ghép nối tự động
                        if (valTietPPC === '') { 
                            if (chiSoPpctTuDong < mangPpctGocDaSapXep.length) {
                                valTietPPC = mangPpctGocDaSapXep[chiSoPpctTuDong].tiet;
                            } else {
                                valTietPPC = tietPpcAuto; // Phát huy tác dụng của toán học
                            }
                            chiSoPpctTuDong++;
                            tietPpcAuto++; 
                        }

                        let valTenBai = ''; let valDieuChinh = '';
                        if (valTietPPC !== '') {
                            let baiGoc = duLieuPpctGoc.find(b => String(b.tiet) === String(valTietPPC));
                            if (baiGoc) { valTenBai = baiGoc.tenBaiHoc || ''; valDieuChinh = baiGoc.dieuChinh || ''; }
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
                            <td class="border-r border-gray-300 align-middle text-center p-3 font-extrabold text-red-600 whitespace-normal" data-ppct-id="${idKhoa}" data-loai="tietPpc">${valTietPPC}</td>
                            <td class="border-r border-gray-300 align-middle text-center font-bold text-blue-800 whitespace-normal">${tenMonTkb}</td>

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
        html = `<tr><td colspan="7" class="text-center py-10 text-red-500 font-bold italic">Lịch giảng dạy tuần này không có môn "${monDangChon}".</td></tr>`;
    }
    tbody.innerHTML = html;
}

// =========================================================================
// KHỐI 4: GIAO TIẾP EXCEL BẰNG SHEETJS (XLSX)
// =========================================================================
function xuLyXuatExcelPPCT() {
    if (typeof XLSX === 'undefined') { alert("Thư viện Excel chưa tải xong."); return; }
    
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    if(!khoi || !mon || khoi === 'KX') { alert("Vui lòng chọn Khối và Môn trước khi xuất."); return; }
    
    const cacOInputTiet = document.querySelectorAll('[data-loai="tietPpc"]');
    cacOInputTiet.forEach(inp => {
        let valTiet = inp.innerText.trim();
        if (valTiet !== '') {
            let idKhoa = inp.getAttribute('data-ppct-id');
            let valTenBai = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`).innerText.trim();
            let valDieuChinh = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`).innerText.trim();
            
            let idx = duLieuPpctGoc.findIndex(b => String(b.tiet) === valTiet);
            if (idx !== -1) {
                duLieuPpctGoc[idx].tenBaiHoc = valTenBai;
                duLieuPpctGoc[idx].dieuChinh = valDieuChinh;
            } else {
                duLieuPpctGoc.push({ tiet: valTiet, tenBaiHoc: valTenBai, dieuChinh: valDieuChinh });
            }
        }
    });

    const header = ["Khối lớp", "Tiết PPCT", "Tên môn học", "Tên bài học", "Điều chỉnh"];
    let rowsArr = [header];
    
    duLieuPpctGoc.sort((a,b) => parseInt(a.tiet) - parseInt(b.tiet)).forEach(dong => {
        if(dong.tiet !== '') rowsArr.push([khoi, dong.tiet, mon, dong.tenBaiHoc || '', dong.dieuChinh || '']);
    });

    if (rowsArr.length === 1) { 
        for (let i = 1; i <= 35; i++) rowsArr.push([khoi, i, mon, "", ""]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rowsArr);
    ws['!cols'] = [{wch: 10}, {wch: 15}, {wch: 20}, {wch: 40}, {wch: 30}];
    XLSX.utils.book_append_sheet(wb, ws, "Lich_Bao_Giang");
    XLSX.writeFile(wb, `LichBaoGiang_Khoi${khoi}_${mon.replace(/\s+/g, '')}.xlsx`);
}

// =========================================================================
// THUẬT TOÁN NHẬP EXCEL ĐỒNG BỘ: HIỂN THỊ KÉP VÀ XEM TRƯỚC TOÀN BỘ FILE
// Thiết kế và phát triển: Hoàng Ngọc Lâm
// =========================================================================
function xuLyNhapExcelPPCT(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert("Cảnh báo: Thư viện Excel chưa được tải xong."); return; }
    
    const khoiUI = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const monUI = document.getElementById('locMonPPCT').value.trim();
    
    if (!khoiUI || !monUI || khoiUI === 'KX') {
        alert("⚠️ YÊU CẦU BẮT BUỘC: Đồng chí phải chọn 'Lớp' (để xác định Khối) và 'Môn học' trên giao diện trước khi tải file Excel lên.");
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rowsArr = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            
            if (rowsArr.length > 1) {
                // 1. LÀM SẠCH VÀ NẠP TOÀN BỘ FILE EXCEL VÀO BỘ NHỚ
                duLieuPpctGoc = []; 
                for (let i = 1; i < rowsArr.length; i++) {
                    let r = rowsArr[i];
                    if (r[1] !== undefined && r[1] !== "") {
                        duLieuPpctGoc.push({
                            tiet: r[1].toString().trim(),
                            tenBaiHoc: r[3] !== undefined ? r[3].toString().trim() : '',
                            dieuChinh: r[4] !== undefined ? r[4].toString().trim() : ''
                        });
                    }
                }

                // 2. VẼ LẠI LƯỚI CỦA TUẦN HIỆN TẠI 
                // Cập nhật dữ liệu Excel vào các tiết của tuần này để giữ liên kết TKB
                veBangKhungLichPPCT(monUI);

                // 3. MỞ RỘNG GIAO DIỆN: XUẤT TOÀN BỘ DỮ LIỆU EXCEL XUỐNG BÊN DƯỚI ĐỂ KIỂM TRA
                const tbody = document.getElementById('vungDuLieuLichPPCT');
                let htmlPreview = `
                    <tr>
                        <td colspan="7" class="bg-indigo-100 text-indigo-900 font-extrabold py-3 uppercase tracking-wide border-y-2 border-indigo-300 text-center shadow-inner">
                            🔍 BẢN XEM TRƯỚC TOÀN BỘ DỮ LIỆU EXCEL (SẼ ĐƯỢC LƯU VÀO HỆ THỐNG KHI BẤM "LƯU PPCT")
                        </td>
                    </tr>
                `;

                // Đổ toàn bộ dữ liệu ra lưới (Chủ đích KHÔNG gắn thuộc tính data-loai để bảo vệ thuật toán của nút Lưu)
                duLieuPpctGoc.forEach(row => {
                    htmlPreview += `
                    <tr class="bg-indigo-50/40 hover:bg-indigo-100 transition-colors border-b border-indigo-200">
                        <td colspan="3" class="text-center italic text-indigo-600/70 text-[13px] align-middle font-semibold border-r border-indigo-200">
                            ⚡ Chờ đồng bộ...
                        </td>
                        <td class="border-r border-indigo-200 align-middle text-center p-2 font-extrabold text-red-600">${row.tiet}</td>
                        <td class="border-r border-indigo-200 align-middle text-center font-bold text-indigo-800">${monUI}</td>
                        <td class="border-r border-indigo-200 align-middle text-left p-2 font-semibold text-slate-900">${row.tenBaiHoc}</td>
                        <td class="align-middle text-left p-2 italic text-gray-700">${row.dieuChinh}</td>
                    </tr>`;
                });

                // Chèn bảng xem trước vào ngay dưới lưới lịch tuần
                tbody.insertAdjacentHTML('beforeend', htmlPreview);

                alert(`✅ Đã nạp thành công toàn bộ ${duLieuPpctGoc.length} tiết từ file Excel!\n\n👉 Hướng dẫn: Toàn bộ nội dung file đã được hiển thị trên giao diện (Kéo xuống dưới để xem trước). Nếu dữ liệu đã chính xác, Đồng chí hãy nhấn nút "Lưu PPCT" để ghi đè vào hệ thống.`);
            } else {
                alert("Lỗi: File Excel trống hoặc không đúng biểu mẫu chuẩn.");
            }
        } catch (loi) { 
            alert("Sự cố đọc file Excel: " + loi.message); 
        } finally { 
            event.target.value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
}

// =========================================================================
// KHỐI 5: LƯU TRỮ KÉP (PPCT VÀ TKB) LÊN MÁY CHỦ
// =========================================================================
async function luuDuLieuPPCTLenMayChu(event) {
    const nutBam = event.currentTarget;
    const noiDungGoc = nutBam.innerHTML;
    
    const khoi = document.getElementById('locKhoiPPCT').getAttribute('data-khoi-so');
    const mon = document.getElementById('locMonPPCT').value.trim();
    const tuan = document.getElementById('locTuanUI').value.trim();
    const lop = document.getElementById('locLopPPCT').value.trim();
    
    if (!khoi || !mon || khoi === 'KX' || !tuan || !lop) {
        alert("Lỗi: Phải xác định rõ Tuần, Lớp, Khối, Môn học trên bộ lọc trước khi Lưu.");
        return;
    }
    
    let mangGhi = [];
    const cacOInputTiet = document.querySelectorAll('[data-loai="tietPpc"]');
    
    cacOInputTiet.forEach(inp => {
        let tr = inp.closest('tr');
        // [NÂNG CẤP]: Đọc trạng thái cờ từ giao diện
        let laDongDaSua = tr.getAttribute('data-da-sua') === 'true'; 
        
        let valTiet = inp.innerText.trim();
        if (valTiet !== '') {
            let idKhoa = inp.getAttribute('data-ppct-id');
            let parts = idKhoa.split('_'); 
            
            let valTenBai = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="tenBai"]`).innerText.trim();
            let valDieuChinh = document.querySelector(`[data-ppct-id="${idKhoa}"][data-loai="dieuChinh"]`).innerText.trim();
            
            mangGhi.push({
                khoi: khoi, 
                tietPpc: valTiet, 
                mon: mon, 
                tenBai: valTenBai, 
                dieuChinh: valDieuChinh,
                thongTinTkb: { tuan: tuan, lop: lop, thu: parts[0], buoi: parts[1], tietTkb: parts[2] },
                daSua: laDongDaSua // Truyền tín hiệu "Ghi đè" cho máy chủ
            });
            
            let idx = duLieuPpctGoc.findIndex(b => String(b.tiet) === valTiet);
            if (idx !== -1) {
                duLieuPpctGoc[idx].tenBaiHoc = valTenBai;
                duLieuPpctGoc[idx].dieuChinh = valDieuChinh;
            } else {
                duLieuPpctGoc.push({ tiet: valTiet, tenBaiHoc: valTenBai, dieuChinh: valDieuChinh });
            }
        }
    });
    
    duLieuPpctGoc.forEach(goc => {
        let daCoTrenLuoi = mangGhi.some(ghi => String(ghi.tietPpc) === String(goc.tiet));
        if (!daCoTrenLuoi && goc.tiet !== '') {
            mangGhi.push({
                khoi: khoi, tietPpc: goc.tiet, mon: mon, tenBai: goc.tenBaiHoc || '', dieuChinh: goc.dieuChinh || '',
                thongTinTkb: null,
                daSua: false // Dữ liệu gốc đang bị ẩn không bị tác động nên cờ là false
            });
        }
    });
    
    nutBam.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang lưu...</span></div>`;
    nutBam.disabled = true;

    try {
        const payload = { thaoTac: 'luuPPCT', duLieu: mangGhi };
        const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') {
            alert(`Đã lưu Phân phối chương trình Môn ${mon} - Khối ${khoi} lên hệ thống thành công!`);
            
            // [NÂNG CẤP]: Xóa bỏ cờ và trả lại giao diện sạch sẽ ngay sau khi Lưu thành công
            document.querySelectorAll('tr[data-da-sua="true"]').forEach(tr => {
                tr.removeAttribute('data-da-sua');
                tr.classList.remove('bg-amber-100', 'hover:bg-amber-200');
                tr.classList.add('bg-white', 'hover:bg-slate-50');
                let badge = tr.querySelector('.badge-sua');
                if (badge) badge.remove();
            });
            
        } else {
            alert(`Sự cố lưu trữ: ${ketQua.thongBao}`);
        }
    } catch (loi) {
        alert('Lỗi kết nối máy chủ.');
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
    
    // 4. Khôi phục lại datalist cho các ô input (nếu có)
    bomDuLieuVaoBoLoc();
}
