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
        
        // [NÂNG CẤP]: Đưa tùy chọn "Tất cả" lên đỉnh danh sách đổ xuống
        if (listMon) {
            listMon.innerHTML = `<option value="Tất cả"></option>` + dsMon.map(mon => `<option value="${mon}">`).join('');
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

    if (!tuan || !lop || !khoi || khoi === 'KX') {
        alert("Đồng chí vui lòng điền đầy đủ: Tuần, Lớp để truy xuất dữ liệu.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-blue-600 font-bold">
        <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        Đang đồng bộ Lịch giảng dạy và Phân phối chương trình...
    </td></tr>`;

    try {
        const tuanHeThong = typeof tuanDangXem !== 'undefined' ? tuanDangXem : 1;
        // [NÂNG CẤP]: Nếu là Tất cả, gửi tham số rỗng để Backend hiểu là truy xuất toàn khối/lớp
        const monGoi = (mon === 'Tất cả') ? '' : mon;
        const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTkbVaPpct&tuan=${tuan}&lop=${encodeURIComponent(lop)}&khoi=${khoi}&mon=${encodeURIComponent(monGoi)}&tuanHienTai=${tuanHeThong}`;
        
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlAPI) : fetch(urlAPI));
        
        if (!phanHoi.ok) throw new Error("Mất kết nối máy chủ");
        const ketQua = await phanHoi.json();
        
        duLieuTkbTuan = ketQua.duLieuTkb || [];
        duLieuPpctGoc = ketQua.duLieuPpct || []; 
        
        veBangKhungLichPPCT(mon);
    } catch (loi) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-600 font-bold">Lỗi truy xuất dữ liệu từ máy chủ. Đảm bảo file CODE.gs hỗ trợ truy xuất khi tham số mon bị rỗng.</td></tr>`;
    }
}

function veBangKhungLichPPCT(monDangChon) {
    const tbody = document.getElementById('vungDuLieuLichPPCT');
    let html = '';
    
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    const cauTrucTiet = { "Sáng": [1,2,3,4,5], "Chiều": [1,2,3,4] };
    
    let maTranTkb = {};
    const monChonChuan = monDangChon.trim().normalize('NFC').replace(/\s+/g, '').toLowerCase();
    
    duLieuTkbTuan.forEach(t => {
        if (!maTranTkb[t.thu]) maTranTkb[t.thu] = {};
        if (!maTranTkb[t.thu][t.buoi]) maTranTkb[t.thu][t.buoi] = {};
        maTranTkb[t.thu][t.buoi][t.tiet] = t;
    });

    const tuan = parseInt(document.getElementById('locTuanUI').value.trim()) || 1;
    const lop = document.getElementById('locLopPPCT').value.trim();
    const isXemTatCa = (monChonChuan === 'tấtcả' || monChonChuan === '');
    
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
            if (lechTuan !== 0) ngayGocThu2.setDate(ngayGocThu2.getDate() + (lechTuan * 7));
        }
    }

    let trackerPpct = {};
    if (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) {
        let dmKhoi = thongSoHocVu.KHUNG_CHUONG_TRINH[lop] || {};
        Object.keys(dmKhoi).forEach(m => {
            let tenM = m.trim().normalize('NFC').replace(/\s+/g, '').toLowerCase();
            let match = tenM.match(/^(.*?)(\d+)$/);
            let baseName = match ? match[1] : tenM;
            let heSoTiet = match ? parseInt(match[2], 10) : 1;

            let soTiet1Tuan = parseInt(dmKhoi[m]) || 0;
            let tongSoTietNhom = 0;

            Object.keys(dmKhoi).forEach(sub => {
                let subChuan = sub.trim().normalize('NFC').replace(/\s+/g, '').toLowerCase();
                let subMatch = subChuan.match(/^(.*?)(\d+)$/);
                let subBase = subMatch ? subMatch[1] : subChuan;
                if(subBase === baseName) tongSoTietNhom += (parseInt(dmKhoi[sub]) || 0);
            });

            let isSplitSubject = (tongSoTietNhom > soTiet1Tuan && match);
            let tietPpcAuto = isSplitSubject ? ((tuan - 1) * tongSoTietNhom + heSoTiet) : ((tuan - 1) * soTiet1Tuan + 1);

            trackerPpct[tenM] = {
                tietPpcAuto: tietPpcAuto,
                chiSoPpctTuDong: (tuan - 1) * soTiet1Tuan,
                tongSoTietNhom: tongSoTietNhom
            };
        });
    }

    // [ĐIỂM NGHẼN ĐÃ ĐƯỢC GIẢI QUYẾT]: Hàm tách riêng mảng PPCT cho từng môn dựa vào CỘT MÔN HỌC
    let getPpctGocChoMon = (monGrid) => {
        let monGridChuan = String(monGrid).normalize('NFC').replace(/\s+/g, '').toLowerCase();
        let monGridGoc = monGridChuan.replace(/\d+$/, '');
        
        return duLieuPpctGoc.filter(b => {
            let m = String(b.mon || b.monHoc || b.tenMon || b["Môn học"] || b["Môn"] || "").normalize('NFC').replace(/\s+/g, '').toLowerCase();
            // Nếu CSDL bị trống tên môn, chỉ chấp nhận lấy nếu đang ở chế độ xem 1 môn
            if (m === "") return !isXemTatCa;
            return m === monGridChuan || m === monGridGoc;
        }).sort((a, b) => parseInt(a.tietPpc || a.tiet || 0) - parseInt(b.tietPpc || b.tiet || 0));
    };

    let tongSoDongMucTieu = 0;

    thuMacDinh.forEach(thu => {
        let dsTietCuaThu = []; 
        ["Sáng", "Chiều"].forEach(buoi => {
            cauTrucTiet[buoi].forEach(tiet => {
                let tietTkb = (maTranTkb[thu] && maTranTkb[thu][buoi] && maTranTkb[thu][buoi][tiet]) ? maTranTkb[thu][buoi][tiet] : null;
                let tenMonTkb = tietTkb ? tietTkb.monHoc.trim() : '';
                let monTkbChuan = tenMonTkb.normalize('NFC').replace(/\s+/g, '').toLowerCase();

                if ((isXemTatCa || monTkbChuan === monChonChuan) && tenMonTkb !== '') {
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
                        let monTkbChuan = tenMonTkb.normalize('NFC').replace(/\s+/g, '').toLowerCase();

                        // Lấy riêng mảng PPCT của đúng môn học trên cột này
                        let ppctCuaMon = getPpctGocChoMon(tenMonTkb);
                        let valTietPPC = tietTkb.tietPpc || '';
                        
                        if (valTietPPC === '') {
                            let track = trackerPpct[monTkbChuan];
                            if (track) {
                                // Ánh xạ từ mảng mini của riêng môn đó
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

                    htmlPreview += `
                    <tr class="dong-xem-truoc-excel bg-indigo-50/40 hover:bg-indigo-100 transition-colors border-b border-indigo-200">
                        <td colspan="3" class="text-center italic text-indigo-600/70 text-[13px] align-middle font-semibold border-r border-indigo-200">
                            ⚡ Chờ đồng bộ...
                        </td>
                        <td class="border-r border-indigo-200 align-middle text-center p-2 font-extrabold text-red-600">${row.tiet}</td>
                        <td class="border-r border-indigo-200 align-middle text-center font-bold text-indigo-800" data-loai="mon">${tenMonHienThi}</td>
                        <td class="border-r border-indigo-200 align-middle text-left p-2 font-semibold text-slate-900">${row.tenBaiHoc}</td>
                        <td class="align-middle text-left p-2 italic text-gray-700">${row.dieuChinh}</td>
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
    
    // 4. Khôi phục lại datalist cho các ô input (nếu có)
    bomDuLieuVaoBoLoc();
}
