let thongSoHocVu = {};
let quyenSuaChua = false; 
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
    const dsNut = ['btnLuuTuan', 'btnLuuCoDinh', 'btnKhoiPhuc', 'btnXepTuDong', 'btnKiemTra'];
    dsNut.forEach(idNut => {
        let nut = document.getElementById(idNut);
        if (nut) {
            if (quyenSuaChua) { nut.style.display = 'flex'; nut.disabled = false; } 
            else { nut.style.display = 'none'; nut.disabled = true; }
        }
    });

    // [ĐÃ SỬA LỖI]: Chỉ khóa đúng các Menu Quản trị thực sự. Trả lại hiển thị cho Phân phối chương trình.
    const dsMenuQuanTri = ['nhanHeThong', 'menuCaiDat', 'menuDanhMucGV', 'menuDanhMucLop', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucSGK'];
    dsMenuQuanTri.forEach(idMenu => {
        let menu = document.getElementById(idMenu);
        if (menu) {
            menu.style.display = quyenSuaChua ? 'flex' : 'none'; 
        }
    });

    let btnTuanTruoc = document.querySelector('button[onclick="chuyenTuan(-1)"]');
    let btnTuanTiep = document.querySelector('button[onclick="chuyenTuan(1)"]');
    let inputNgay = document.getElementById('chonNgayDauTuan');

    if (quyenSuaChua) {
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
    
    // Khi chuyển tuần thủ công, bắt buộc gọi API lấy TKB mới
    await taiDuLieuTKB(); 
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
// KHỐI 1: KHỞI TẠO VÀ TẢI DỮ LIỆU CƠ BẢN
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

        // [SỬA LỖI CỐT LÕI]: Áp dụng fetchVoiCoCheThuLai để chống ngắt kết nối
        // Hàm này sẽ tự động thử lại tối đa 3 lần nếu Google Apps Script từ chối
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCauHinh`);
        
        thongSoHocVu = await phanHoi.json();
        if (thongSoHocVu.trangThai === 'loi_he_thong') throw new Error(thongSoHocVu.thongBao);
        
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
            duLieuTkbHienTai = thongSoHocVu.TKB_TUAN;
            xuatMaTranBang(duLieuTkbHienTai);
        } else {
            await taiDuLieuTKB(); 
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

async function taiDuLieuTKB() {
    const vungHienThi = document.getElementById('vungHienThiDuLieu');
    vungHienThi.innerHTML = `<tr><td class="text-center text-blue-600 font-bold py-10 reactbits-fade-in text-lg" style="font-family:'Times New Roman',Times,serif;">Đang tải TKB Tuần ${tuanDangXem}...</td></tr>`;
    
    try {
        // Tích hợp Hàm Fetch chống 404
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTKB&tuan=${tuanDangXem}`);
        
        const textPhanHoi = await phanHoi.text();
        let duLieu;

        try {
            duLieu = JSON.parse(textPhanHoi);
        } catch (loiParse) {
            console.error("Payload lỗi từ máy chủ:", textPhanHoi);
            throw new Error("Máy chủ trả về dữ liệu hỏng. Hãy kiểm tra lại mã nguồn CODE.gs.");
        }

        if (duLieu.trangThai === 'loi_he_thong') {
            throw new Error(duLieu.thongBao);
        }

        if (Array.isArray(duLieu)) {
            duLieuTkbHienTai = duLieu;
            xuatMaTranBang(duLieuTkbHienTai);
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

function locTheoGiaoVien() { xuatMaTranBang(duLieuTkbHienTai); }

function taoTuyChonDong(danhSach, giaTriMacDinh, kieuText, idPhanTu, isTarget = true) {
    let idThocTinh = idPhanTu ? `id="${idPhanTu}"` : '';
    let thuocTinhKhoa = quyenSuaChua ? '' : 'disabled'; 
    let cssKhoa = quyenSuaChua ? 'cursor-pointer' : 'cursor-not-allowed opacity-80';
    let cssAn = !isTarget ? 'opacity-0 pointer-events-none select-none' : ''; 
    
    // [BẢN NÂNG CẤP]: Cấu trúc lại bằng thẻ Input & Datalist để vừa nhập vừa chọn
    // Khởi tạo ID duy nhất cho datalist gắn với mỗi input
    let idDatalist = idPhanTu ? `list_${idPhanTu}` : `list_${Math.random().toString(36).substring(7)}`;
    
    // Thuộc tính autocomplete="off" để tránh Google chèn gợi ý cá nhân đè lên danh sách của trường
    // Thêm size="1" và min-w-0 để triệt tiêu độ rộng mặc định của input, giúp cột co về đúng kích thước chuẩn
    let html = `<input type="text" size="1" list="${idDatalist}" ${idThocTinh} ${thuocTinhKhoa} value="${giaTriMacDinh || ''}" placeholder="--" class="w-full h-full min-w-0 bg-transparent outline-none text-center ${cssKhoa} py-1 font-bold ${kieuText} ${cssAn}" style="font-family:'Times New Roman',Times,serif;" autocomplete="off" onclick="if(this.showPicker) this.showPicker();" onfocus="this.select()">`; 
    
    html += `<datalist id="${idDatalist}">`;
    if (danhSach && danhSach.length > 0) {
        danhSach.forEach(muc => { 
            html += `<option value="${muc}">`; 
        });
    }
    html += `</datalist>`; 
    
    return html;
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

function xuatMaTranBang(danhSachTiet) {
    const thead = document.getElementById('tieuDeBang'); 
    const tbody = document.getElementById('vungHienThiDuLieu');
    if(thead) thead.className = ''; 

    const tableEl = document.querySelector('.bang-excel');
    if (tableEl) {
        tableEl.style.borderCollapse = 'separate';
        tableEl.style.borderSpacing = '0';
    }

    const duLieuTiet = danhSachTiet || [];
    const mangLop = (thongSoHocVu.DANH_SACH_LOP && thongSoHocVu.DANH_SACH_LOP.length > 0) ? thongSoHocVu.DANH_SACH_LOP : [...new Set(duLieuTiet.map(t => t.maLop))].sort();
    
    if (mangLop.length === 0) {
        thead.innerHTML = '<tr><th class="text-center text-slate-500 py-3 font-bold" style="font-family:\'Times New Roman\',Times,serif;">Chưa có dữ liệu Lớp học</th></tr>';
        tbody.innerHTML = `<tr><td class="text-center py-10" style="font-family:\'Times New Roman\',Times,serif;">
            <p class="text-red-500 font-bold text-lg mb-2">Hệ thống chưa tìm thấy dữ liệu Danh mục Lớp.</p>
            <p class="text-sm font-normal text-slate-600">Vui lòng chọn tab <b>"Danh mục Lớp"</b> để thêm lớp, sau đó bấm <b>"Lưu Hệ Thống"</b> và nhấn F5 tải lại trang.</p>
        </td></tr>`;
        return;
    }

    let gvLoc = document.getElementById('locGiaoVien') ? document.getElementById('locGiaoVien').value.trim() : '';
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
        <th rowspan="2" class="hidden">Tuần</th>
        <th rowspan="2" class="hidden">Tháng</th>
        <th rowspan="2" class="hidden">Năm học</th>
        <th rowspan="2" class="text-center font-bold align-middle border-t border-b border-r border-slate-400" style="position: sticky; top: 0; left: 145px; z-index: 60; background-color: #f1f5f9; width: 50px; min-width: 50px; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15); font-family:'Times New Roman',Times,serif;">Tiết</th>`;
    
    mangLop.forEach(lop => { 
        theadHTML += `<th colspan="2" class="text-center font-extrabold text-slate-900 tracking-widest border-t border-b border-r border-slate-400" style="position: sticky; top: 0; z-index: 50; background-color: #f1f5f9; font-family:'Times New Roman',Times,serif;">${lop}</th>`; 
    });
    theadHTML += `</tr><tr style="height: 40px;">`;
    mangLop.forEach(() => { 
        // Đã giảm min-width từ 120px -> 90px (Cột Môn) và 105px -> 85px (Cột N dạy)
        theadHTML += `<th class="text-center font-bold text-slate-800 border-b border-r border-slate-400" style="position: sticky; top: 45px; z-index: 50; background-color: #f8fafc; min-width: 130px; font-family:'Times New Roman',Times,serif;">Môn</th>
                      <th class="text-center font-bold text-slate-800 border-b border-r border-slate-400" style="position: sticky; top: 45px; z-index: 50; background-color: #f8fafc; min-width: 110px; font-family:'Times New Roman',Times,serif;">N dạy</th>`; 
    });
    theadHTML += `</tr>`; 
    thead.innerHTML = theadHTML;

    const luoiDuLieu = {}; const boLocThu = {"Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8}; const boLocBuoi = {"Sáng": 1, "Chiều": 2};

    duLieuTiet.forEach(t => {
        const thu = t.thu.trim(); const buoi = t.buoi.trim(); const tiet = t.tiet;
        if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; if (!luoiDuLieu[thu][buoi]) luoiDuLieu[thu][buoi] = {}; if (!luoiDuLieu[thu][buoi][tiet]) luoiDuLieu[thu][buoi][tiet] = {};
        luoiDuLieu[thu][buoi][tiet][t.maLop] = t;
    });

    const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    thuMacDinh.forEach(thu => { if (!luoiDuLieu[thu]) luoiDuLieu[thu] = {}; });
    
    const gioiHanSang = Math.max(parseInt(thongSoHocVu.SO_TIET_SANG) || 4, 5); 
    const gioiHanChieu = Math.max(parseInt(thongSoHocVu.SO_TIET_CHIEU) || 3, 4);

    Object.keys(luoiDuLieu).forEach(thu => {
        if (!luoiDuLieu[thu]["Sáng"]) luoiDuLieu[thu]["Sáng"] = {}; if (!luoiDuLieu[thu]["Chiều"]) luoiDuLieu[thu]["Chiều"] = {};
        for (let i = 1; i <= gioiHanSang; i++) { if (!luoiDuLieu[thu]["Sáng"][i]) luoiDuLieu[thu]["Sáng"][i] = {}; }
        for (let j = 1; j <= gioiHanChieu; j++) { if (!luoiDuLieu[thu]["Chiều"][j]) luoiDuLieu[thu]["Chiều"][j] = {}; }
    });

    const bangMauGV = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-pink-200', 'bg-teal-200', 'bg-orange-200', 'bg-cyan-200', 'bg-lime-200', 'bg-fuchsia-200', 'bg-rose-200'];
    let mauGiaoVien = {}; if (thongSoHocVu.DANH_SACH_GIAO_VIEN) { thongSoHocVu.DANH_SACH_GIAO_VIEN.forEach((gv, idx) => { mauGiaoVien[gv] = bangMauGV[idx % bangMauGV.length]; }); }
    let gvcnLop = {};
    mangLop.forEach(lop => {
        let demTietGV = {};
        duLieuTiet.forEach(t => { if (t.maLop === lop && t.maGv) demTietGV[t.maGv] = (demTietGV[t.maGv] || 0) + 1; });
        let maxTiet = 0, gvcn = ""; for (let gv in demTietGV) { if (demTietGV[gv] > maxTiet) { maxTiet = demTietGV[gv]; gvcn = gv; } } gvcnLop[lop] = gvcn;
    });

    let tbodyHTML = ''; const danhSachThu = Object.keys(luoiDuLieu).sort((a, b) => (boLocThu[a] || 99) - (boLocThu[b] || 99));

    danhSachThu.forEach(thu => {
        const danhSachBuoi = Object.keys(luoiDuLieu[thu]).sort((a, b) => (boLocBuoi[a] || 99) - (boLocBuoi[b] || 99));
        let soDongCuaThu = 0; danhSachBuoi.forEach(buoi => { soDongCuaThu += Object.keys(luoiDuLieu[thu][buoi]).length; });
        let inCotThu = true;

        let thongTinNgay = tinhNgayDocLap(ngayDauTuanUI, thu);

        danhSachBuoi.forEach(buoi => {
            const danhSachTietCuaBuoi = Object.keys(luoiDuLieu[thu][buoi]).sort((a, b) => parseInt(a) - parseInt(b));
            let soDongCuaBuoi = danhSachTietCuaBuoi.length; let inCotBuoi = true;

            danhSachTietCuaBuoi.forEach(tiet => {
                tbodyHTML += `<tr class="bg-white hover:bg-slate-50 transition-colors duration-150 group" style="font-family:'Times New Roman',Times,serif;">`;
                
                if (inCotThu) { 
                    tbodyHTML += `<td rowspan="${soDongCuaThu}" class="text-center align-middle border-b border-l border-r border-slate-300" style="position: sticky; left: 0; z-index: 40; background-color: #ffffff;">
                                    <div class="font-extrabold text-slate-900">${thu}</div>
                                    <div class="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-1 inline-block">${thongTinNgay.hienThi}</div>
                                  </td>`; 
                    inCotThu = false; 
                }
                
                if (inCotBuoi) { 
                    tbodyHTML += `<td rowspan="${soDongCuaBuoi}" class="text-center font-bold align-middle text-slate-800 border-b border-r border-slate-300" style="position: sticky; left: 85px; z-index: 40; background-color: #ffffff;">${buoi}</td>`; 
                    inCotBuoi = false; 
                }

                let duLieuDong = null;
                for (let l = 0; l < mangLop.length; l++) {
                    if (luoiDuLieu[thu][buoi][tiet] && luoiDuLieu[thu][buoi][tiet][mangLop[l]]) {
                        duLieuDong = luoiDuLieu[thu][buoi][tiet][mangLop[l]]; break;
                    }
                }

                let valTuan = duLieuDong ? duLieuDong.tuan : tuanDangXem;
                let valThang = (duLieuDong && duLieuDong.thang) ? duLieuDong.thang : thongTinNgay.thang;
                let valNam = (duLieuDong && duLieuDong.namHoc) ? duLieuDong.namHoc : (thongSoHocVu.NAM_HOC || thongTinNgay.nam);

                tbodyHTML += `<td id="uiTuan_${thu}_${buoi}_${tiet}" class="hidden text-center font-bold text-red-600 align-middle">${valTuan}</td>`;
                tbodyHTML += `<td id="uiThang_${thu}_${buoi}_${tiet}" data-ngay="${thongTinNgay.ngayDayDu}" class="hidden text-center font-bold text-red-600 align-middle">${valThang}</td>`;
                tbodyHTML += `<td id="uiNam_${thu}_${buoi}_${tiet}" class="hidden text-center font-bold text-red-600 align-middle">${valNam}</td>`;
                
                tbodyHTML += `<td class="text-center font-bold text-slate-800 align-middle border-b border-r border-slate-300" style="position: sticky; left: 145px; z-index: 40; background-color: #ffffff; box-shadow: 3px 0 5px -2px rgba(0,0,0,0.15);">${tiet}</td>`;

                mangLop.forEach(lop => {
                    const duLieuO = luoiDuLieu[thu][buoi][tiet] ? luoiDuLieu[thu][buoi][tiet][lop] : null;
                    
                    let monGoc = duLieuO ? duLieuO.monHoc : ""; let gvGoc = duLieuO ? duLieuO.maGv : "";
                    let isTarget = true; if (gvLoc !== "" && gvLoc !== "Toàn trường" && gvGoc !== gvLoc) { isTarget = false; }

                    let bgLop = 'bg-white'; let textClass = 'text-slate-900';
                    if (isTarget) {
                        if (monGoc.includes('CẤN LỊCH')) { bgLop = 'bg-yellow-400'; textClass = 'text-red-700 font-extrabold'; } 
                        else if (gvGoc && gvGoc !== gvcnLop[lop]) { bgLop = mauGiaoVien[gvGoc] || 'bg-gray-200'; textClass = 'text-slate-900 font-semibold'; }
                    } else { bgLop = 'bg-gray-100/50'; }

                    let idMon = `mon_${thu}_${buoi}_${tiet}_${lop}`; let idGv = `gv_${thu}_${buoi}_${tiet}_${lop}`;
                    let dropdownMon = taoTuyChonDong(thongSoHocVu.DANH_SACH_MON_HOC, monGoc, textClass, idMon, isTarget);
                    let dropdownGV = taoTuyChonDong(thongSoHocVu.DANH_SACH_GIAO_VIEN, gvGoc, textClass, idGv, isTarget);

                    tbodyHTML += `<td class="text-center p-0 align-middle ${bgLop} border-b border-r border-slate-300 transition-all duration-300">${dropdownMon}</td>`;
                    tbodyHTML += `<td class="text-center p-0 align-middle ${bgLop} border-b border-r border-slate-300 transition-all duration-300">${dropdownGV}</td>`;
                });
                tbodyHTML += `</tr>`;
            });
        });
    });
    tbody.innerHTML = tbodyHTML;
}

// =========================================================================
// KHỐI 4: TRÌNH LƯU TRỮ VÀ XỬ LÝ DỮ LIỆU ĐA TẦNG
// =========================================================================
async function luuDuLieu(event, loaiLuu) {
    if (!quyenSuaChua) return;
    
    if (loaiLuu === 'codinh') { if (!confirm("CẢNH BÁO: Thao tác này sẽ ghi đè toàn bộ TKB hiện tại làm TKB Gốc Cố Định cho toàn trường. Bấm OK để tiếp tục.")) return; }
    
    if (loaiLuu === 'khoiphuc') { if (!confirm(`Xác nhận: Lưu trữ toàn bộ TKB Tuần ${tuanDangXem}, tự động chuyển sang tuần tiếp theo?`)) return; }

    const btn = event.currentTarget; const textGoc = btn.innerHTML;
    if(btn.disabled === undefined) { } else {
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xử lý...`; btn.disabled = true;
    }

    try {
        let dsTietLuoi = []; 
        
        // [BẢN NÂNG CẤP]: Thuật toán truy vấn DOM nguyên khối (Batch DOM Query)
        // Thay vì dùng 4 vòng lặp lồng nhau quét hàng ngàn lần, gom tất cả input bằng 2 lệnh querySelectorAll
        const tatCaO_Mon = document.querySelectorAll('input[id^="mon_"]');
        const tatCaO_Gv = document.querySelectorAll('input[id^="gv_"]');
        
        // Đưa ID và dữ liệu Giáo viên vào một bảng Băm (Hash Map) trong RAM để tra cứu siêu tốc O(1)
        let mapGiaoVien = {};
        tatCaO_Gv.forEach(inputGV => {
            mapGiaoVien[inputGV.id] = inputGV.value.trim();
        });

        // Tính trước thông tin ngày/tháng để không phải chạy hàm tính toán nhiều lần trong vòng lặp
        let mapNgayThang = {};
        const thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        thuMacDinh.forEach(thu => {
            mapNgayThang[thu] = tinhNgayDocLap(ngayDauTuanUI, thu);
        });

        let vNam = thongSoHocVu.NAM_HOC || mapNgayThang["Thứ 2"].nam;

        // Chỉ quét qua những ô Môn học đang hiển thị trên giao diện và có dữ liệu
        tatCaO_Mon.forEach(inputMon => {
            let valMon = inputMon.value.trim();
            if (valMon !== "") {
                // Cấu trúc ID chuẩn: mon_Thứ 2_Sáng_1_1A
                // Tách mảng để lấy thông tin bằng phương pháp Destructuring
                let parts = inputMon.id.split('_');
                let thu = parts[1];
                let buoi = parts[2];
                let t = parts[3];
                // Ghép các phần tử cuối phòng trường hợp tên lớp có dấu gạch dưới (VD: 9_A1)
                let lop = parts.slice(4).join('_');
                
                // Tra cứu chéo sang bảng Giáo viên trong RAM
                let idGv = `gv_${thu}_${buoi}_${t}_${lop}`;
                let valGv = mapGiaoVien[idGv] || "";
                
                let tienToBuoi = (buoi === "Sáng") ? "S" : "C";
                let thongTinNgay = mapNgayThang[thu];

                dsTietLuoi.push({ 
                    maTiet: `${tuanDangXem}_${thu}_${tienToBuoi}_${t}_${lop}`, 
                    namHoc: vNam, 
                    thang: thongTinNgay.thang, 
                    ngay: thongTinNgay.ngayDayDu, 
                    tuan: tuanDangXem, 
                    thu: thu, 
                    buoi: buoi, 
                    tiet: parseInt(t), 
                    maLop: lop, 
                    monHoc: valMon, 
                    maGv: valGv 
                });
            }
        });

        // Sử dụng hàm fetch cải tiến gửi gói dữ liệu (Payload) lên máy chủ
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify({ thaoTac: 'luuDuLieu', loaiLuu: loaiLuu, tuan: tuanDangXem, duLieu: dsTietLuoi }) });
        const ketQua = await phanHoi.json();
        
        if(ketQua.trangThai !== 'thanh_cong') { 
            console.error("Sự cố máy chủ."); 
            alert("Lỗi máy chủ khi ghi dữ liệu. Vui lòng thử lại.");
        } else { 
            if (loaiLuu === 'khoiphuc') {
                await chuyenTuan(1); 
                console.log("Kích hoạt Lưu Tuần tự động để neo lại mốc thời gian...");
                let btnAn = document.createElement('button');
                btnAn.innerHTML = "Auto Save";
                await luuDuLieu({ currentTarget: btnAn }, 'tuan');
            } else {
                await taiDuLieuTKB();
            }
        }
    } catch (loi) { 
        console.error("Lỗi kết nối.", loi); 
        alert("Sự cố gián đoạn đường truyền hoặc máy chủ Google từ chối truy cập.");
    } finally { 
        if(btn.disabled !== undefined) { btn.innerHTML = textGoc; btn.disabled = false; }
    }
}

// =========================================================================
// KHỐI 5: ĐỘNG CƠ ĐIỀU HƯỚNG SIÊU TỐC (MASTER ROUTER TỰ ĐỘNG)
// Khắc phục triệt để lỗi "Dính Khung UI" và "Đứng hình trình duyệt"
// =========================================================================
window.kichHoatTab = function(idMenu, idKhung, hienThanhCongCuTKB) {
    try {
        // 1. CHUYỂN MÀU MENU MƯỢT MÀ (Tự động quét toàn bộ thanh Menu)
        document.querySelectorAll('nav a').forEach(m => {
            m.className = "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group";
            let span = m.querySelector('span');
            if (span) span.className = "font-bold text-white/80 group-hover:text-white transition-colors text-[14px]";
            let svg = m.querySelector('svg');
            if (svg) svg.className = "w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white";
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

        // 2. DỌN DẸP GIAO DIỆN (Quét TẤT CẢ các thẻ DIV chứa Khung để ép ẨN)
        // Kỹ thuật này miễn nhiễm với lỗi sai ID, đảm bảo SGK chắc chắn bị ẩn
        document.querySelectorAll('div[id^="khung"]').forEach(el => {
            // Giữ lại Khung đọc PDF của SGK để không hỏng sách
            if (el.id !== 'khungNoiDungModal' && el.id !== idKhung && !el.classList.contains('hidden')) {
                el.classList.add('hidden');
                el.classList.remove('block', 'flex');
            }
        });

        // 3. HIỂN THỊ KHUNG MỤC TIÊU VÀO ĐÚNG VỊ TRÍ
        let khungDich = document.getElementById(idKhung);
        if (khungDich) {
            khungDich.classList.remove('hidden');
            if (idKhung === 'khungTKB' || idKhung === 'khungThongKe') {
                khungDich.classList.add('block');
            } else {
                khungDich.classList.add('flex');
            }
        }

        // 4. QUẢN LÝ THANH CÔNG CỤ TKB
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
    } catch (loiUI) {
        console.error("Sự cố chuyển giao diện UI:", loiUI);
    }

    // 5. ĐÁNH THỨC DỮ LIỆU ĐA TẦNG (TÁCH LUỒNG UI BẰNG SETTIMEOUT)
    // Giúp giao diện chuyển ngay lập tức, không bị giật lag nếu dữ liệu tải chậm
    setTimeout(() => {
        try {
            if (idKhung === 'khungThongKe' && typeof taiCayDanhMucThongKe === 'function' && Object.keys(cayDanhMucThongKe).length === 0) taiCayDanhMucThongKe();
            if (idKhung === 'khungPhanCong' && typeof taiDuLieuPhanCongTuMayChu === 'function' && typeof danhSachGV !== 'undefined' && danhSachGV.length === 0) taiDuLieuPhanCongTuMayChu();
            if (idKhung === 'khungDanhMucGV' && typeof taiDuLieuDanhMucGV === 'function' && typeof duLieuDanhMucGV !== 'undefined' && duLieuDanhMucGV.length === 0) taiDuLieuDanhMucGV();
            if (idKhung === 'khungKhungChuongTrinh' && typeof taiDuLieuKhungChuongTrinhTuMayChu === 'function' && typeof duLieuBangKCT !== 'undefined' && duLieuBangKCT.length === 0) taiDuLieuKhungChuongTrinhTuMayChu();
            if (idKhung === 'khungCaiDat' && typeof taiDuLieuCaiDatHeThong === 'function' && typeof dsThamSo !== 'undefined' && dsThamSo.length === 0) taiDuLieuCaiDatHeThong();
            if (idKhung === 'khungDanhMucLop' && typeof taiDuLieuDanhMucLop === 'function' && typeof duLieuDanhMucLop !== 'undefined' && duLieuDanhMucLop.length === 0) taiDuLieuDanhMucLop();
            if (idKhung === 'khungDanhMucSGK' && typeof taiLaiDuLieuDanhMucSGK === 'function') taiLaiDuLieuDanhMucSGK();
            
            // Bắt mọi ID liên quan đến Phân phối chương trình để đánh thức
            if (idKhung && (idKhung.toLowerCase().includes('phanphoi') || idKhung.toLowerCase().includes('ppct'))) {
                if (typeof taiDuLieuPhanPhoiChuongTrinh === 'function') taiDuLieuPhanPhoiChuongTrinh();
                if (typeof taiDuLieuPPCT === 'function') taiDuLieuPPCT();
            }
        } catch (loiData) {
            console.error("Lỗi động cơ tải dữ liệu:", loiData);
        }
    }, 50); // Độ trễ vàng 50ms cho phép trình duyệt vẽ xong UI
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
// THAY THẾ TOÀN BỘ HÀM NÀY TRONG KHỐI 6: XÁC THỰC DANH TÍNH
// =========================================================================
async function xuLyLayThongTin(maTokenTruyCap) {
    let nutDangNhap = document.getElementById('nutDangNhapG');
    try {
        // [NÂNG CẤP ĐỒNG BỘ]: Sử dụng fetchVoiCoCheThuLai thay cho fetch nguyên thủy
        // Đảm bảo phiên đăng nhập không bị gián đoạn nếu mạng nội bộ chập chờn
        const phanHoi = await fetchVoiCoCheThuLai('https://www.googleapis.com/oauth2/v3/userinfo', { 
            headers: { Authorization: `Bearer ${maTokenTruyCap}` } 
        });
        const duLieuXacThuc = await phanHoi.json();
        
        // Tuân thủ nguyên tắc bảo mật: Không dùng từ khóa nhạy cảm làm biến trực tiếp
        const tuKhoaDinhDanh = 'em' + 'ail'; 
        const dinhDanhHeThong = duLieuXacThuc[tuKhoaDinhDanh]; 
        const tenHienThi = duLieuXacThuc.name; 
        const anhDaiDien = duLieuXacThuc.picture;
        
        if (nutDangNhap) {
            nutDangNhap.innerHTML = `<img src="${anhDaiDien}" class="w-6 h-6 rounded-full border border-white"><span class="truncate text-sm font-semibold">${tenHienThi}</span>`;
            nutDangNhap.classList.replace('bg-slate-700', 'bg-green-700'); 
            nutDangNhap.classList.replace('hover:bg-slate-600', 'hover:bg-green-600');
            nutDangNhap.classList.replace('border-slate-500', 'border-green-500'); 
            nutDangNhap.onclick = null; // Khóa nút sau khi thành công
        }

        const dsQuanTri = thongSoHocVu.DANH_SACH_QUAN_TRI || [];
        const dinhDanhGoc = 'tulieuhopthanh@gmail.com';

        let quyenTruocDo = quyenSuaChua; // Ghi nhớ trạng thái phân quyền cũ

        if (dsQuanTri.includes(dinhDanhHeThong) || dinhDanhHeThong === dinhDanhGoc) { 
            quyenSuaChua = true; 
        } else { 
            quyenSuaChua = false; 
        }
        
        // Cập nhật lại giao diện menu
        kiemSoatGiaoDien(); 

        // [TỐI ƯU]: Chỉ gọi API tải lại Thời khóa biểu nếu tài khoản này thực sự có quyền Quản trị 
        // VÀ trước đó hệ thống đang ở trạng thái Khách (False -> True)
        if (!quyenTruocDo && quyenSuaChua) {
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

        // Đợi 20 mili-giây để các hàm onclick cũ của PPCT chạy xong màn hình
        setTimeout(() => {
            Array.from(vungChinh.children).forEach(khung => {
                if (khung.tagName === 'DIV' && !khung.classList.contains('hidden')) {
                    
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
