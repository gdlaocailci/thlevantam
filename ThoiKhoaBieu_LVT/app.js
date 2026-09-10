let thongSoHocVu = {};
let quyenSuaChua = false; 
let quyenChiTiet = { menu: [], nut: [], lop: [] }; 
let duLieuTkbHienTai = []; 
let tuanDangXem = 1; 
let ngayDauTuanUI = '';

document.addEventListener('DOMContentLoaded', () => { khoiTaoGiaoDien(); });


async function fetchVoiCoCheThuLai(url, tuyChon = {}, soLanThu = 3) {
    for (let i = 0; i < soLanThu; i++) {
        try {
            const phanHoi = await fetch(url, tuyChon);
            
            if (!phanHoi.ok) {
                throw new Error(`Máy chủ từ chối kết nối (Mã lỗi HTTP: ${phanHoi.status})`);
            }

            // [LÕI NÂNG CẤP]: Đọc thẳng văn bản 1 lần duy nhất, KHÔNG dùng clone()
            const noiDungText = await phanHoi.text();

            // Kiểm tra tính hợp lệ của dữ liệu (Chống HTML ảo từ Google)
            try {
                JSON.parse(noiDungText);
            } catch (loiCuPhap) {
                throw new Error("Dữ liệu trả về bị nhiễu định dạng (Google Apps Script đang bận).");
            }

            // Đóng gói lại thành đối tượng Response chuẩn để các hàm khác gọi .json() mượt mà
            return new Response(noiDungText, {
                status: phanHoi.status,
                statusText: phanHoi.statusText,
                headers: phanHoi.headers
            });

        } catch (loi) {
            if (i === soLanThu - 1) throw loi; // Văng lỗi ra giao diện nếu đã thử hết giới hạn
            console.warn(`Đường truyền bị nghẽn, tự động kết nối lại lần ${i + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Lùi bước 1s, 2s
        }
    }
}

// =========================================================================
// KHỐI QUẢN LÝ GIAO DIỆN & PHÂN QUYỀN TRUNG TÂM
// =========================================================================
function kiemSoatGiaoDien() {
    // 1. Bọc thép dữ liệu: Đảm bảo luôn trả về mảng dù lỗi mạng
    const menuDuocCap = (quyenChiTiet && quyenChiTiet.menu) ? quyenChiTiet.menu : [];
    const nutDuocCap = (quyenChiTiet && quyenChiTiet.nut) ? quyenChiTiet.nut : [];

    // 2. Mở khóa Nút Bấm
    const dsNut = ['btnLuuTuan', 'btnLuuCoDinh', 'btnKhoiPhuc', 'btnXepTuDong', 'btnKiemTra', 'btnNhapExcelTKB'];
    dsNut.forEach(idNut => {
        let nut = document.getElementById(idNut);
        if (nut) {
            // [LOGIC CỐT LÕI]: Hoặc là Admin, Hoặc là được cấp phép nút này
            let duocPhep = quyenSuaChua || nutDuocCap.includes(idNut);
            if (duocPhep) { nut.style.display = 'flex'; nut.disabled = false; } 
            else { nut.style.display = 'none'; nut.disabled = true; }
        }
    });

    // 3. Mở khóa Menu (Đã tách 'nhanHeThong' ra ngoài để xử lý riêng)
    const dsMenuQuanTri = ['menuCaiDat', 'menuDanhMucGV', 'menuDanhMucLop', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucSGK'];
    let coMenuQuanTriDuocMo = false;

    dsMenuQuanTri.forEach(idMenu => {
        let menu = document.getElementById(idMenu);
        if (menu) {
            // [LOGIC CỐT LÕI]: Hoặc là Admin, Hoặc là được cấp phép Menu này
            let duocXem = quyenSuaChua || menuDuocCap.includes(idMenu);
            menu.style.display = duocXem ? 'flex' : 'none'; 
            if (duocXem) coMenuQuanTriDuocMo = true;
        }
    });

    // 4. Nếu có bất kỳ Menu quản trị nào được mở, thì mới hiện chữ "Hệ thống"
    let nhanHT = document.getElementById('nhanHeThong');
    if (nhanHT) {
        nhanHT.style.display = coMenuQuanTriDuocMo ? 'flex' : 'none';
    }

    // 5. Mở khóa tương tác Ngày/Tuần
    let btnTuanTruoc = document.querySelector('button[onclick="chuyenTuan(-1)"]');
    let btnTuanTiep = document.querySelector('button[onclick="chuyenTuan(1)"]');
    let inputNgay = document.getElementById('chonNgayDauTuan');

    let coQuyenThaoTac = quyenSuaChua || nutDuocCap.length > 0 || menuDuocCap.length > 0;

    if (coQuyenThaoTac) {
        if (btnTuanTruoc) { btnTuanTruoc.disabled = false; btnTuanTruoc.classList.remove('opacity-50', 'cursor-not-allowed'); }
        if (btnTuanTiep) { btnTuanTiep.disabled = false; btnTuanTiep.classList.remove('opacity-50', 'cursor-not-allowed'); }
        if (inputNgay) { inputNgay.disabled = false; inputNgay.classList.remove('cursor-not-allowed', 'opacity-80'); }
    } else {
        if (btnTuanTruoc) { btnTuanTruoc.disabled = true; btnTuanTruoc.classList.add('opacity-50', 'cursor-not-allowed'); }
        if (btnTuanTiep) { btnTuanTiep.disabled = true; btnTuanTiep.classList.add('opacity-50', 'cursor-not-allowed'); }
        if (inputNgay) { inputNgay.disabled = true; inputNgay.classList.add('cursor-not-allowed', 'opacity-80'); }
    }
}

// =========================================================================
// KHỐI XỬ LÝ CHUYỂN TUẦN VÀ NGÀY THÁNG
// =========================================================================
async function chuyenTuan(buocNhay) {
    let tuanMoi = parseInt(tuanDangXem) + buocNhay;
    if (tuanMoi < 1) tuanMoi = 1; 
    if (tuanMoi > 52) tuanMoi = 52;
    
    if (ngayDauTuanUI && tuanMoi !== tuanDangXem) {
        let parts = ngayDauTuanUI.split('-');
        if (parts.length === 3) {
            let yy = parseInt(parts[0], 10);
            let mm = parseInt(parts[1], 10);
            let dd = parseInt(parts[2], 10);
            
            let d = new Date(yy, mm - 1, dd);
            d.setDate(d.getDate() + (buocNhay * 7));
            
            let newYy = d.getFullYear();
            let newMm = (d.getMonth() + 1).toString().padStart(2, '0');
            let newDd = d.getDate().toString().padStart(2, '0');
            
            ngayDauTuanUI = `${newYy}-${newMm}-${newDd}`;
            let dateInput = document.getElementById('chonNgayDauTuan');
            if (dateInput) dateInput.value = ngayDauTuanUI;
        }
    }
    
    tuanDangXem = tuanMoi;
    document.getElementById('hienThiTuanHienTai').innerText = `Tuần ${tuanDangXem}`;
    
    if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) { duLieuTkbHienTai = []; }
    
    // TRUYỀN THAM SỐ FALSE ĐỂ HIỂN THỊ VÒNG XOAY KHI BẤM CHUYỂN TUẦN
    await taiDuLieuTKB(false); 
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
// KHỐI 1: KHỞI TẠO VÀ TẢI DỮ LIỆU CƠ BẢN (NÂNG CẤP CACHE LOCALSTORAGE)
// =========================================================================
async function khoiTaoGiaoDien() {
    try {
        if(typeof CAU_HINH_FRONTEND !== 'undefined') {
            let tieuDeHeThong = document.getElementById('tenHeThong'); 
            if (tieuDeHeThong) tieuDeHeThong.innerText = CAU_HINH_FRONTEND.TEN_DU_AN;
            let logoHT = document.getElementById('logoHeThong'); 
            if (logoHT) logoHT.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
            let logoMenu = document.getElementById('logoMenuDoc'); 
            if (logoMenu) logoMenu.src = CAU_HINH_FRONTEND.LINK_LOGO_TRANG_CHU;
        }

        // --- BƯỚC 1: RENDER SIÊU TỐC TỪ BỘ NHỚ ĐỆM (CACHE) ---
        let coCache = false;
        try {
            let cacheCauHinh = localStorage.getItem('SmartTKB_CauHinh');
            let cacheTkb = localStorage.getItem('SmartTKB_DuLieuTuan');
            
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
                let hienThiTuan = document.getElementById('hienThiTuanHienTai');
                if (hienThiTuan) hienThiTuan.innerText = `Tuần ${tuanDangXem}`;

                // Vẽ ngay lập tức dữ liệu cũ, không để màn hình trắng chờ đợi
                xuatMaTranBang(duLieuTkbHienTai);
                coCache = true;
            }
        } catch(e) { console.warn("Cache hỏng, tải lại từ đầu."); }

        // --- BƯỚC 2: GỌI API NGẦM ĐỂ LẤY DỮ LIỆU MỚI NHẤT ĐỒNG BỘ LẠI ---
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCauHinh`);
        const thongSoMoi = await phanHoi.json();
        
        if (thongSoMoi.trangThai === 'loi_he_thong') throw new Error(thongSoMoi.thongBao);
        
        thongSoHocVu = thongSoMoi;
        localStorage.setItem('SmartTKB_CauHinh', JSON.stringify(thongSoHocVu)); 
        
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
        let hienThiTuan = document.getElementById('hienThiTuanHienTai');
        if (hienThiTuan) hienThiTuan.innerText = `Tuần ${tuanDangXem}`;
        
        if (thongSoHocVu.TKB_TUAN && thongSoHocVu.TKB_TUAN.length > 0) {
            let chuoiTkbMoi = JSON.stringify(thongSoHocVu.TKB_TUAN);
            let chuoiTkbCu = localStorage.getItem('SmartTKB_DuLieuTuan');
            
            // Chỉ cập nhật và render lại UI nếu TKB ngầm trả về có sự thay đổi
            if (chuoiTkbMoi !== chuoiTkbCu) {
                duLieuTkbHienTai = thongSoHocVu.TKB_TUAN;
                localStorage.setItem('SmartTKB_DuLieuTuan', chuoiTkbMoi);
                xuatMaTranBang(duLieuTkbHienTai);
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

// =========================================================================
// HÀM BỔ SUNG: NẠP DỮ LIỆU BỘ LỌC THEO ĐÚNG ID TRONG INDEX.HTML
// =========================================================================
function napDuLieuBoLocGiaoVien() {
    // Trỏ chính xác vào ID datalist đang có sẵn trong file index.html
    let dtList = document.getElementById('danhSachGvList');
    if (!dtList) return;
    
    // Xóa bộ đệm cũ
    dtList.innerHTML = '';
    
    // Nạp tùy chọn khôi phục lưới TKB toàn trường
    dtList.innerHTML += `<option value="Toàn trường"></option>`;

    // Quét và đổ dữ liệu từ biến toàn cục thongSoHocVu
    if (thongSoHocVu.DANH_SACH_GIAO_VIEN && thongSoHocVu.DANH_SACH_GIAO_VIEN.length > 0) {
        thongSoHocVu.DANH_SACH_GIAO_VIEN.forEach(gv => {
            dtList.innerHTML += `<option value="${gv}"></option>`;
        });
    }
}

async function taiDuLieuTKB(coCache = false) {
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    
    // Nếu chưa có bộ nhớ đệm, hiện UI loading vòng xoay
    if (!coCache) {
        vungHienThi.innerHTML = `<tr><td class="text-center text-blue-600 font-bold py-10 reactbits-fade-in text-lg" style="font-family:'Times New Roman',Times,serif;"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải TKB Tuần ${tuanDangXem}...</td></tr>`;
    }
    
    try {
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTKB&tuan=${tuanDangXem}`);
        const textPhanHoi = await phanHoi.text();
        let duLieu;

        try {
            duLieu = JSON.parse(textPhanHoi);
        } catch (loiParse) {
            throw new Error("Máy chủ trả về dữ liệu hỏng. Hãy kiểm tra lại mã nguồn CODE.gs.");
        }

        if (duLieu.trangThai === 'loi_he_thong') {
            throw new Error(duLieu.thongBao);
        }

        if (Array.isArray(duLieu)) {
            let chuoiTkbMoi = JSON.stringify(duLieu);
            let chuoiTkbCu = localStorage.getItem('SmartTKB_DuLieuTuan');
            
            // Cập nhật ngầm: Chỉ render lưới nếu bản vẽ mới khác bản vẽ đệm
            if (!coCache || chuoiTkbMoi !== chuoiTkbCu) {
                duLieuTkbHienTai = duLieu;
                localStorage.setItem('SmartTKB_DuLieuTuan', chuoiTkbMoi);
                xuatMaTranBang(duLieuTkbHienTai);
            }
        } else {
            throw new Error("Dữ liệu nhận được không đúng cấu trúc mảng.");
        }

    } catch (loi) {
        vungHienThi.innerHTML = `<tr><td class="text-center text-red-500 font-bold py-10 text-lg" style="font-family:'Times New Roman',Times,serif;">
            ⚠️ Lỗi nạp dữ liệu TKB:<br><span class="text-base text-slate-700 font-normal mt-2 inline-block">${loi.message}</span>
        </td></tr>`;
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
// THUẬT TOÁN LỌC GIÁO VIÊN SIÊU TỐC (CẬP NHẬT TÌM KIẾM THÔNG MINH V2.5)
// =========================================================================
function locTheoGiaoVien() {
    let gvLoc = document.getElementById('locGiaoVien') ? document.getElementById('locGiaoVien').value.trim() : '';
    let gvLocLC = gvLoc.toLowerCase(); 

    let tapHopLopCuaGV = new Set();
    let coTietNaoKhong = false;

    // 1. Quét tìm lớp của giáo viên với thuật toán bóc tách mảng (hỗ trợ dạy ghép)
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
    
    // 2. Khôi phục lại trạng thái bảng nếu đang bị cảnh báo trống lịch trước đó
    if (tbody && tbody.querySelector('.canh-bao-trong-lich')) {
        let cacDong = tbody.querySelectorAll('tr:not(.canh-bao-trong-lich)');
        cacDong.forEach(dong => dong.style.display = '');
        let dongCanhBao = tbody.querySelector('.canh-bao-trong-lich');
        if (dongCanhBao) dongCanhBao.remove();
        if (thead) thead.style.display = '';
    }

    // 3. Xử lý UI báo trống lịch nếu giáo viên hoàn toàn không có tiết
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

    // 4. Quét DOM ẩn/hiện Cột Lớp theo danh sách đã tìm được
    let tatCaCacCot = document.querySelectorAll('[data-cotlop]');
    tatCaCacCot.forEach(cot => {
        let lopCuaCot = cot.getAttribute('data-cotlop');
        if (gvLoc === "" || gvLoc === "Toàn trường" || tapHopLopCuaGV.has(lopCuaCot)) {
            cot.classList.remove('hidden'); 
        } else {
            cot.classList.add('hidden'); 
        }
    });

    // 5. Làm mờ các ô không phải của GV này để làm nổi bật lịch dạy
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

function taoTuyChonDong(danhSach, giaTriMacDinh, kieuText, idPhanTu, isTarget = true, loaiDanhSach = '', duocSuaLop = false) {
    let idThocTinh = idPhanTu ? `id="${idPhanTu}"` : '';
    
    // [THUẬT TOÁN]: Quyền đã được tính toán 1 lần duy nhất ở vòng ngoài, chỉ việc nhận biến duocSuaLop
    let thuocTinhKhoa = duocSuaLop ? '' : 'disabled'; 
    let cssKhoa = duocSuaLop ? 'cursor-pointer' : 'cursor-not-allowed opacity-80';
    let cssAn = !isTarget ? 'opacity-0 pointer-events-none select-none' : ''; 
    
    let idDatalist = loaiDanhSach === 'mon' ? 'datalistChung_Mon' : 'datalistChung_GV';
    let suKienKiemTra = (idPhanTu && idPhanTu.startsWith('gv_')) ? `oninput="if(typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang()" onchange="if(typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang()" onblur="if(typeof kiemTraTrungGiaoVienToanBang === 'function') kiemTraTrungGiaoVienToanBang()"` : '';

    return `<input type="text" size="1" list="${idDatalist}" ${idThocTinh} ${thuocTinhKhoa} value="${giaTriMacDinh || ''}" placeholder="--" class="w-full h-full min-w-0 bg-transparent outline-none text-center ${cssKhoa} py-1 font-bold ${kieuText} ${cssAn}" style="font-family:'Times New Roman',Times,serif;" autocomplete="off" onclick="if(this.showPicker) this.showPicker();" onfocus="this.select()" ${suKienKiemTra}>`; 
}

// =========================================================================
// KHỐI 2: ĐỐI CHIẾU ĐỊNH MỨC VÀ KIỂM TRA
// =========================================================================
function kiemTraDinhMuc() {
    let mangLop = [];
    const mangLopGoc = thongSoHocVu.DANH_SACH_LOP || [];
    
    mangLopGoc.forEach(lop => {
        // [CẬP NHẬT]: Dùng CSS Selector linh hoạt, không khóa cứng tên thẻ (select -> mọi thẻ)
        if (document.querySelector(`[id$="_${lop}"]`)) {
            mangLop.push(lop);
        }
    });

    if (mangLop.length === 0) {
        // [CẬP NHẬT]: Truy vấn thẻ input thay vì select
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
// KHỐI 3: ENGINE VẼ LƯỚI MA TRẬN (ALGORITHM V2.4 - HOÀN THIỆN PHÂN QUYỀN)
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
    
    // -------------------------------------------------------------------------
    // [PHỤC HỒI LÕI]: THUẬT TOÁN VẼ CỘT THEO ĐÚNG PHÂN QUYỀN
    // -------------------------------------------------------------------------
    const dsLopDuocQuyen = (quyenChiTiet && quyenChiTiet.lop) ? quyenChiTiet.lop : [];
    const tapLopDuocQuyen = new Set(dsLopDuocQuyen);
    
    let mangLopHienThi = mangLopGoc;
    // Nếu KHÔNG phải Admin VÀ có danh sách lớp được phân quyền -> Chỉ vẽ các lớp được cấp quyền
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
    
    // Gọi hàm lọc DOM để áp dụng ẩn cột dựa theo ô tìm kiếm
    if (typeof locTheoGiaoVien === 'function') locTheoGiaoVien();
}

// =========================================================================
// KHỐI 4: TRÌNH LƯU TRỮ VÀ XỬ LÝ DỮ LIỆU ĐA TẦNG (BẢO TOÀN LỚP ẨN)
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
        
        // 1. Quét thu thập dữ liệu của các lớp ĐANG ĐƯỢC HIỂN THỊ trên DOM
        cacOMon.forEach(oMon => {
            let valMon = oMon.value.trim();
            if (valMon !== "") {
                let parts = oMon.id.split('_'); 
                let thu = parts[1];
                let buoi = parts[2];
                let tiet = parts[3];
                let lop = parts.slice(4).join('_'); 
                
                setLopDangHienThi.add(lop); // Ghi nhận danh sách lớp đang có mặt trên lưới
                
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

        // 2. [LÕI NÂNG CẤP BẢO TOÀN]: Bù đắp dữ liệu của các lớp BỊ ẨN
        let mangLopDangHienThi = Array.from(setLopDangHienThi);
        if (duLieuTkbHienTai && duLieuTkbHienTai.length > 0) {
            duLieuTkbHienTai.forEach(tietGoc => {
                // Nếu tiết này thuộc về lớp không hiển thị trên DOM, giữ nguyên trạng đẩy vào Payload
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
                // Cập nhật lại bộ nhớ đệm nội bộ để đảm bảo đồng bộ mới nhất sau khi lưu
                duLieuTkbHienTai = dsTietLuoi;
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
// KHỐI 5: ĐỘNG CƠ ĐIỀU HƯỚNG SIÊU TỐC (ÉP ĐỔI MÀU MENU DỨT KHOÁT)
// =========================================================================
window.kichHoatTab = function(idMenu, idKhung, hienThanhCongCuTKB) {
    try {
        // 1. CHUYỂN MÀU MENU NGAY LẬP TỨC 
        // LÕI FIX LỖI: Xóa bỏ các class 'transition-all duration-150' để không bị đóng băng hiệu ứng
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

        // 2. TÁCH LUỒNG HIỂN THỊ NẶNG 
        // Nới rộng lên 50ms để trình duyệt kịp phủ màu Menu dứt khoát trước khi bị khóa luồng
        setTimeout(() => {
            // A. DỌN DẸP GIAO DIỆN CŨ
            let vungChinh = document.getElementById('vungHienThiChinh');
            if (vungChinh) {
                Array.from(vungChinh.children).forEach(el => {
                    if (el.tagName === 'DIV' && el.id !== 'khungNoiDungModal' && el.id !== idKhung) {
                        el.classList.add('hidden');
                        el.classList.remove('block', 'flex');
                    }
                });
            }

            // B. HIỂN THỊ KHUNG MỤC TIÊU MỚI
            let khungDich = document.getElementById(idKhung);
            if (khungDich) {
                khungDich.classList.remove('hidden');
                if (idKhung === 'khungTKB' || idKhung === 'khungThongKe') {
                    khungDich.classList.add('block');
                } else {
                    khungDich.classList.add('flex');
                }
            }

            // C. QUẢN LÝ THANH CÔNG CỤ
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

            // D. ĐÁNH THỨC DỮ LIỆU ĐA TẦNG
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
// KHỐI 6: XÁC THỰC DANH TÍNH (BẢN NÂNG CẤP XỬ LÝ BẤT ĐỒNG BỘ)
// =========================================================================
let clientDangNhapG;
let dangXuLyDangNhap = false; // Biến cờ khóa luồng, chống bấm liên tục (Spam click)

function khoiDongDangNhap() {
    if (dangXuLyDangNhap) return;

    let nutDangNhap = document.getElementById('nutDangNhapG');
    let htmlGoc = nutDangNhap ? nutDangNhap.innerHTML : '';

    // 1. Kiểm tra an toàn: Thư viện Google và Cấu hình ID đã sẵn sàng chưa?
    if (typeof google === 'undefined' || typeof SKT_GOOGLE_CLIENT_ID === 'undefined') {
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-semibold ml-2">Đang nạp thư viện...</span>`;
            nutDangNhap.classList.add('cursor-wait', 'opacity-80');
        }
        
        // Tự động lùi bước (Polling) chờ 1 giây rồi thử lại
        setTimeout(() => {
            if (nutDangNhap) {
                nutDangNhap.innerHTML = htmlGoc;
                nutDangNhap.classList.remove('cursor-wait', 'opacity-80');
            }
            khoiDongDangNhap();
        }, 1000);
        return;
    }

    // 2. Kích hoạt khóa luồng và hiển thị trạng thái chờ
    dangXuLyDangNhap = true;
    if (nutDangNhap) {
         nutDangNhap.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="text-sm font-semibold ml-2">Đang kết nối...</span>`;
    }

    // 3. Khởi tạo Token Client nếu chưa có
    if (!clientDangNhapG) {
        clientDangNhapG = google.accounts.oauth2.initTokenClient({
            client_id: SKT_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (phanHoiToken) => {
                dangXuLyDangNhap = false; // Mở khóa luồng
                if (phanHoiToken && phanHoiToken.access_token) {
                    xuLyLayThongTin(phanHoiToken.access_token);
                } else if (nutDangNhap) {
                    nutDangNhap.innerHTML = htmlGoc; // Hoàn trả giao diện nếu người dùng hủy
                }
            },
            error_callback: (loi) => {
                dangXuLyDangNhap = false;
                if (nutDangNhap) nutDangNhap.innerHTML = htmlGoc;
                console.error("Lỗi gián đoạn từ hệ thống Google:", loi);
            }
        });
    }
    
    // 4. Gọi cửa sổ đăng nhập
    clientDangNhapG.requestAccessToken();
}

// =========================================================================
// THAY THẾ TOÀN BỘ HÀM NÀY TRONG KHỐI 6: XÁC THỰC DANH TÍNH (FILE app.js)
// =========================================================================
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
        
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<img src="${anhDaiDien}" class="w-6 h-6 rounded-full border border-white"><span class="truncate text-sm font-semibold">${tenHienThi}</span>`;
            nutDangNhap.classList.replace('bg-slate-700', 'bg-green-700'); 
            nutDangNhap.classList.replace('hover:bg-slate-600', 'hover:bg-green-600');
            nutDangNhap.classList.replace('border-slate-500', 'border-green-500'); 
            nutDangNhap.onclick = null; 
        }

        const dsQuanTri = thongSoHocVu.DANH_SACH_QUAN_TRI || [];
        const dinhDanhGoc = 'tulieuhopthanh@gmail.com';

        // 1. KIỂM TRA QUYỀN ADMIN TOÀN NĂNG
        if (dsQuanTri.includes(dinhDanhHeThong) || dinhDanhHeThong === dinhDanhGoc) { 
            quyenSuaChua = true; 
        } else { 
            quyenSuaChua = false; 
        }
        
        // 2. KIỂM TRA VÀ GÁN ĐẶC QUYỀN CHI TIẾT TỪ MA TRẬN
        quyenChiTiet = { menu: [], nut: [], lop: [] }; 
        if (thongSoHocVu.MA_TRAN_PHAN_QUYEN && thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong]) {
            quyenChiTiet.menu = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].menu || [];
            quyenChiTiet.nut = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].nut || [];
            quyenChiTiet.lop = thongSoHocVu.MA_TRAN_PHAN_QUYEN[dinhDanhHeThong].lop || [];
        }
        
        // 3. Tiến hành kiểm soát Menu và Nút bấm dựa trên quyền
        kiemSoatGiaoDien(); 

        // [LÕI KHẮC PHỤC]: Không gọi API máy chủ nếu dữ liệu TKB đã có trong RAM
        // Trình duyệt sẽ tái tạo lại lưới tức thời bằng động cơ O(1)
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
// HÀM BỔ SUNG: XUẤT DỮ LIỆU EXCEL TỪ GIAO DIỆN HIỂN THỊ THỰC TẾ
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
    
    // Nếu phát hiện người dùng vừa bấm vào một Menu bất kỳ
    if (menuDuocBam) {
        let vungChinh = document.getElementById('vungHienThiChinh');
        if (!vungChinh) return;

        // Đợi 20 mili-giây để các hàm onclick riêng lẻ chạy xong
        setTimeout(() => {
            Array.from(vungChinh.children).forEach(khung => {
                if (khung.tagName === 'DIV' && !khung.classList.contains('hidden')) {
                    
                    // [BỔ SUNG QUAN TRỌNG]: Nếu đang kẹt Khung Sổ đầu bài mà người dùng KHÔNG bấm Menu Sổ đầu bài -> ÉP ẨN NGAY
                    if (khung.id === 'khungSoDauBai' && menuDuocBam.id !== 'menuSoDauBai') {
                        khung.classList.add('hidden');
                        khung.classList.remove('flex', 'block');
                    }

                    // XỬ LÝ 1: Nếu đang kẹt Khung SGK mà người dùng KHÔNG bấm Menu SGK -> Ép Ẩn
                    if (khung.id === 'khungDanhMucSGK' && menuDuocBam.id !== 'menuDanhMucSGK') {
                        khung.classList.add('hidden');
                        khung.classList.remove('flex', 'block');
                    }
                    
                    // XỬ LÝ 2: Nếu đang kẹt Khung PPCT mà người dùng KHÔNG bấm Menu PPCT -> Ép Ẩn
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
// [NÂNG CẤP UI]: Thuật toán quét và cảnh báo giáo viên trùng lịch (Real-time)
// Đã nâng cấp: Lờ đi cảnh báo trùng lịch đối với Ưu tiên 1 và Ưu tiên 6
// =========================================================================
window.kiemTraTrungGiaoVienToanBang = function() {
    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const buoiMacDinh = ["Sáng", "Chiều"];
    
    // Khởi tạo bảng tra cứu uuTien từ khung chương trình (bộ nhớ tạm)
    const khung = thongSoHocVu.KHUNG_CHUONG_TRINH || {};
    let keyUuTien = "";
    for (let k in khung) {
        if (k.toLowerCase().replace(/\s+/g, '').indexOf("ưutiên") !== -1 || k.toLowerCase().replace(/\s+/g, '').indexOf("uutien") !== -1) {
            keyUuTien = k; break;
        }
    }
    const uuTienMon = keyUuTien ? khung[keyUuTien] : {};
    
    thuMacDinh.forEach(thu => {
        buoiMacDinh.forEach(buoi => {
            for(let tiet = 1; tiet <= 5; tiet++) {
                let oTiet = document.getElementById(`oTiet_${thu}_${buoi}_${tiet}`);
                if (!oTiet) continue; 
                
                let cacOGiaoVien = document.querySelectorAll(`input[id^="gv_${thu}_${buoi}_${tiet}_"]`);
                let demGv = {};
                
                cacOGiaoVien.forEach(oGv => {
                    let tenGv = oGv.value.trim();
                    if (tenGv !== "" && tenGv !== "--") {
                        // Tách id "gv_Thứ 2_Sáng_1_1A1" để lấy id "mon_Thứ 2_Sáng_1_1A1"
                        let parts = oGv.id.split('_'); 
                        let lop = parts.slice(4).join('_'); 
                        let idMon = `mon_${thu}_${buoi}_${tiet}_${lop}`;
                        let theMon = document.getElementById(idMon);
                        
                        let monHoc = theMon ? theMon.value.trim() : "";
                        let ut = parseInt(uuTienMon[monHoc]) || 99;

                        // [CHỐT CHẶN]: Nếu KHÔNG phải là Ưu tiên 1 và KHÔNG phải là Ưu tiên 6, mới được đưa vào danh sách kiểm đếm trùng lịch
                        if (ut !== 1 && ut !== 6) {
                            demGv[tenGv] = (demGv[tenGv] || 0) + 1;
                        }
                    }
                });
                
                let mangTrung = [];
                for (let gv in demGv) {
                    if (demGv[gv] > 1) mangTrung.push(gv);
                }
                
                let vungCanhBao = oTiet.querySelector('.vung-canh-bao-gv');
                if (vungCanhBao) {
                    if (mangTrung.length > 0) {
                        vungCanhBao.innerHTML = `<div class="text-[10px] text-red-600 font-extrabold leading-tight max-w-[45px] mx-auto truncate cursor-help" title="Lỗi trùng lịch: ${mangTrung.join(', ')}">${mangTrung.join('<br>')}</div>`;
                    } else {
                        vungCanhBao.innerHTML = '';
                    }
                }
            }
        });
    });
};
// =========================================================================
// KHỐI TIỆN ÍCH: ĐỌC DỮ LIỆU TỪ TỆP EXCEL VÀ ÁNH XẠ LÊN GIAO DIỆN UI
// =========================================================================
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

                // Dòng 0 chứa tiêu đề các Lớp
                const headerLop = jsonData[0];
                const danhSachLopCol = [];
                
                // Thu thập cấu trúc lớp từ cột 3 trở đi
                for (let i = 3; i < headerLop.length; i += 2) {
                    if (headerLop[i] && headerLop[i].toString().trim() !== "") {
                        danhSachLopCol.push({ tenLop: headerLop[i].toString().trim(), colIndex: i });
                    }
                }

                let thuHienTai = "";
                let buoiHienTai = "";

                // Đọc dữ liệu từ dòng 2
                for (let r = 2; r < jsonData.length; r++) {
                    const row = jsonData[r];
                    if (!row || row.length === 0) continue;

                    // Lọc dữ liệu định vị dòng (Bảo toàn trạng thái do ô gộp trong Excel)
                    if (row[0] && row[0].toString().trim() !== "") {
                        thuHienTai = row[0].toString().split('\n')[0].trim();
                    }
                    if (row[1] && row[1].toString().trim() !== "") {
                        buoiHienTai = row[1].toString().trim();
                    }
                    
                    let tiet = row[2] ? row[2].toString().trim() : "";
                    if (!thuHienTai || !buoiHienTai || !tiet) continue;

                    // Ánh xạ dữ liệu lên các ô Input UI
                    danhSachLopCol.forEach(lopInfo => {
                        let monVal = row[lopInfo.colIndex] ? row[lopInfo.colIndex].toString().trim() : "";
                        let gvVal = row[lopInfo.colIndex + 1] ? row[lopInfo.colIndex + 1].toString().trim() : "";

                        let theMon = document.getElementById(`mon_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);
                        let theGv = document.getElementById(`gv_${thuHienTai}_${buoiHienTai}_${tiet}_${lopInfo.tenLop}`);

                        if (theMon) theMon.value = monVal;
                        if (theGv) theGv.value = gvVal;
                    });
                }
                
                // Kích hoạt bộ engine báo lỗi trùng lịch sau khi dữ liệu đã lên lưới
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
        // Reset bộ đệm input để cho phép tải lại cùng một tệp
        event.target.value = "";
    }
}
// =========================================================================
// [NÂNG CẤP TỐC ĐỘ CAO]: ĐỘNG CƠ ĐỒNG BỘ VÀ NẮN CHỈNH DỮ LIỆU TỰ ĐỘNG (AUTO-CORRECT)
// Chức năng: Quét toàn bộ lưới TKB, tự động sửa lỗi chính tả, khoảng trắng, 
// hoa/thường để ép khớp 100% với danh mục DM_GIAOVIEN và KHUNG_CHUONG_TRINH.
// =========================================================================
window.dongBoChuanHoaDuLieuUI = function() {
    const dsMonGoc = thongSoHocVu.DANH_SACH_MON_HOC || [];
    const dsGvGoc = thongSoHocVu.DANH_SACH_GIAO_VIEN || [];

    // Hàm hỗ trợ: Chuẩn hóa chuỗi (Chuyển chữ thường, cắt khoảng trắng thừa 2 đầu và ở giữa)
    const chuanHoaChuoi = (chuoi) => {
        if (!chuoi) return '';
        return String(chuoi).toLowerCase().replace(/\s+/g, ' ').trim();
    };

    // Tạo Từ điển đối chiếu (Map) tốc độ cao O(1)
    const tuDienMon = {};
    dsMonGoc.forEach(mon => { tuDienMon[chuanHoaChuoi(mon)] = mon; });

    const tuDienGV = {};
    dsGvGoc.forEach(gv => { tuDienGV[chuanHoaChuoi(gv)] = gv; });

    let demSuaLoi = 0;
    let demLoiRac = 0;

    // Kỹ thuật quét lưới tốc độ cao
    const cacOMon = document.querySelectorAll('input[id^="mon_"]');
    const cacOGv = document.querySelectorAll('input[id^="gv_"]');

    // 1. Xử lý cột Môn học
    cacOMon.forEach(oMon => {
        let giaTriUI = oMon.value;
        if (giaTriUI !== "" && giaTriUI !== "--") {
            let keyTruyVan = chuanHoaChuoi(giaTriUI);
            let giaTriChuan = tuDienMon[keyTruyVan];

            if (giaTriChuan) {
                // Nếu khớp từ điển nhưng sai định dạng in hoa/thường -> Ép chuẩn lại
                if (giaTriUI !== giaTriChuan) {
                    oMon.value = giaTriChuan;
                    oMon.classList.add('bg-teal-100', 'text-teal-900', 'transition-colors');
                    demSuaLoi++;
                } else {
                    oMon.classList.remove('bg-teal-100', 'text-teal-900', 'bg-red-200', 'text-red-900');
                }
            } else {
                // Rác dữ liệu (Không tồn tại trong Khung chương trình) -> Báo đỏ
                oMon.classList.add('bg-red-200', 'text-red-900', 'font-extrabold', 'transition-colors');
                demLoiRac++;
            }
        }
    });

    // 2. Xử lý cột Giáo viên
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
                demLoiRac++;
            }
        }
    });
    
    // Đánh thức lại hàm kiểm tra trùng giáo viên sau khi đã nắn dữ liệu
    if (typeof kiemTraTrungGiaoVienToanBang === 'function') {
        kiemTraTrungGiaoVienToanBang();
    }

    // Phản hồi trực quan
    if (demSuaLoi > 0 || demLoiRac > 0) {
        alert(`Báo cáo Đồng bộ:\n- Đã nắn chỉnh thành công: ${demSuaLoi} ô (Màu xanh).\n- Cảnh báo dữ liệu rác/sai tên: ${demLoiRac} ô (Màu đỏ).`);
    } else {
        alert("Tuyệt vời! Toàn bộ dữ liệu trên lưới Thời khóa biểu đã khớp chuẩn 100% với danh mục máy chủ.");
    }
};
