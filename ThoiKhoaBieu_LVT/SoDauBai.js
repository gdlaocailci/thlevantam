// =========================================================================
// KHỐI 1: KIỂM SOÁT ĐĂNG NHẬP VÀ BỘ MÁY TỊNH TIẾN SỔ ĐẦU BÀI
// =========================================================================
let daTaiDuLieuSoDauBai = false;
let duLieuTKBGopDaMap = [];
let tuDienPPCTToanCuc = {}; 
let dinhMucKhungCT = {}; 
let tuDienQuyenPhanCong = {};
let coToanQuyenSDB = false;
let maGvDangNhapHeThong = '';

async function taiDuLieuSoDauBaiTuMayChu() {
    if (daTaiDuLieuSoDauBai) return;
    
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    
    // [NÂNG CẤP CỐT LÕI]: Kiểm tra trạng thái đăng nhập từ app.js
    // Dấu hiệu nhận biết: Nút đăng nhập gốc bị gỡ sự kiện onclick khi thành công
    const nutDangNhapGoc = document.getElementById('nutDangNhapG');
    const chuaDangNhap = nutDangNhapGoc && nutDangNhapGoc.onclick !== null;

    if (chuaDangNhap) {
        // Giao diện Khóa bảo mật: Yêu cầu định danh trực quan trên vùng hiển thị
        if (vungHienThi) {
            vungHienThi.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 animate-pulse-once">
                    <div class="bg-red-50 text-red-600 p-4 rounded-full mb-4 border border-red-200 shadow-sm">
                        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h3 class="text-xl font-extrabold text-slate-800 mb-2 uppercase tracking-wide">Yêu cầu định danh</h3>
                    <p class="text-sm text-slate-600 text-center max-w-md mb-6 font-semibold">Để đảm bảo bảo mật và phân quyền chính xác, hệ thống yêu cầu đồng chí đăng nhập tài khoản trước khi truy cập Sổ Đầu Bài.</p>
                    
                    <div class="flex gap-4">
                        <button onclick="document.getElementById('menuTKB').click()" class="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold rounded shadow-sm transition-colors border border-gray-400">
                            Quay lại TKB
                        </button>
                        <button onclick="khoiDongDangNhap(); kiemTraTrangThaiDangNhapSDB()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-colors flex items-center gap-2">
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5 bg-white rounded-full p-0.5" alt="G">
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>
            `;
        }
        return;
    }

    // Nếu đã đăng nhập, tiến hành gọi dữ liệu bình thường
    thucThiTaiDuLieuVaVeLuoi(vungHienThi);
}

// HÀM PHỤ TRỢ: Lắng nghe trạng thái đăng nhập để tự động mở Sổ đầu bài
function kiemTraTrangThaiDangNhapSDB() {
    let soLanKiemTra = 0;
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    
    // Chuyển nút sang trạng thái đang chờ
    if (vungHienThi) {
         let btnDangNhap = vungHienThi.querySelector('.bg-blue-600');
         if(btnDangNhap) btnDangNhap.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xác thực...`;
    }

    let vongLap = setInterval(() => {
        const nutDangNhapGoc = document.getElementById('nutDangNhapG');
        // Khi đăng nhập hoàn tất, app.js tự động gán onclick = null
        if (nutDangNhapGoc && nutDangNhapGoc.onclick === null) {
            clearInterval(vongLap);
            thucThiTaiDuLieuVaVeLuoi(vungHienThi);
        }
        soLanKiemTra++;
        // Hủy vòng lặp chờ sau 1 phút nếu người dùng tắt ngang cửa sổ popup
        if (soLanKiemTra > 120) {
            clearInterval(vongLap); 
            if (vungHienThi) taiDuLieuSoDauBaiTuMayChu(); 
        }
    }, 500);
}

// =========================================================================
// HÀM TẢI DỮ LIỆU TỐC ĐỘ CAO (ASYNCHRONOUS BACKGROUND THREAD)
// =========================================================================
async function thucThiTaiDuLieuVaVeLuoi(vungHienThi) {
    if (vungHienThi) {
        vungHienThi.innerHTML = `<div class="text-center py-12 text-slate-500 font-bold">
            <div class="w-9 h-9 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-base text-blue-900 font-extrabold">Đang tối ưu hóa phân quyền & trích xuất dữ liệu...</p>
            <span class="text-xs text-slate-400 font-normal mt-1 block">Tự động cấu hình theo thời gian thực</span>
        </div>`;
    }

    try {
        let emailGoiLen = typeof window.emailGiaoVienToanCuc !== 'undefined' ? window.emailGiaoVienToanCuc : '';
        
        // Gọi API nén dữ liệu
        const phanHoi = await fetchVoiCoCheThuLai(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDuLieuSoDauBai&emailTruyCap=${encodeURIComponent(emailGoiLen)}`);
        const phanHoiText = await phanHoi.text();
        
        let duLieuSever;
        try { 
            duLieuSever = JSON.parse(phanHoiText); 
        } catch (loiParse) { 
            throw new Error("Phản hồi máy chủ gặp sự cố định dạng. Vui lòng thử lại!"); 
        }

        if (duLieuSever.trangThai === 'loi_he_thong') throw new Error(duLieuSever.thongBao);

        // Tách luồng để trình duyệt không bị treo giao diện
        setTimeout(() => {
            khoiTaoDuLieuSoDauBai(duLieuSever);
            daTaiDuLieuSoDauBai = true;
        }, 10);

    } catch (loi) {
        console.error("Lỗi Sổ đầu bài:", loi);
        if (vungHienThi) {
            vungHienThi.innerHTML = `<div class="text-center py-10 text-red-600 font-bold text-lg">⚠️ Cảnh báo lỗi kết nối: <br><span class="text-base font-normal text-slate-700">${loi.message}</span></div>`;
        }
    }
}

function khoiTaoDuLieuSoDauBai(duLieuSever) {
    // [CỐT LÕI ĐÚNG Ý TƯỞNG]: Neo dữ liệu phân quyền trực tiếp vào UI để chống lệch pha
    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    if (!theChotQuyen) {
        theChotQuyen = document.createElement('div');
        theChotQuyen.id = 'theChotQuyenSDB';
        theChotQuyen.style.display = 'none';
        
        let vungChinh = document.getElementById('khungSoDauBai');
        if (vungChinh) vungChinh.appendChild(theChotQuyen);
        else document.body.appendChild(theChotQuyen);
    }
    
    // Gán dữ liệu vào thẻ HTML
    theChotQuyen.setAttribute('data-madinhdanh', duLieuSever.MA_GIAO_VIEN || '');
    theChotQuyen.setAttribute('data-quantri', duLieuSever.TOAN_QUYEN || false);
    theChotQuyen.setAttribute('data-matranquyen', JSON.stringify(duLieuSever.QUYEN_THEO_LOP || {}));

    let tkbLichSu = duLieuSever.DATA_TKB || [];
    let tkbHienTai = duLieuSever.TKB_HIEN_TAI || [];
    let tkbGop = [...tkbLichSu, ...tkbHienTai];

    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2, "tối": 3 };
    
    tkbGop.sort((a, b) => {
        let tuanA = parseInt(String(a['Tuần']).replace(/\D/g, '')) || 0; 
        let tuanB = parseInt(String(b['Tuần']).replace(/\D/g, '')) || 0;
        if (tuanA !== tuanB) return tuanA - tuanB;
        let thuA = thuTuThu[String(a['Thứ']).trim()] || 99; let thuB = thuTuThu[String(b['Thứ']).trim()] || 99;
        if (thuA !== thuB) return thuA - thuB;
        let buoiA = thuTuBuoi[String(a['Buổi']).trim().toLowerCase()] || 99; let buoiB = thuTuBuoi[String(b['Buổi']).trim().toLowerCase()] || 99;
        if (buoiA !== buoiB) return buoiA - buoiB;
        return (parseInt(a['Tiết']) || 0) - (parseInt(b['Tiết']) || 0);
    });

    dinhMucKhungCT = {};
    if (duLieuSever.KHUNG_CHUONG_TRINH) {
        duLieuSever.KHUNG_CHUONG_TRINH.forEach(dong => {
            let mon = String(dong['Môn học'] || dong['Tên môn học'] || dong['Môn Học'] || '').trim().toLowerCase();
            if (!mon) return;
            Object.keys(dong).forEach(key => {
                let matchKhoi = key.match(/\d+/);
                if (matchKhoi && key !== 'Môn học' && key !== 'Ưu tiên' && key !== 'Tên môn học') {
                    let khoi = matchKhoi[0];
                    if (!dinhMucKhungCT[khoi]) dinhMucKhungCT[khoi] = {};
                    let tiet = parseInt(dong[key]) || 0;
                    if (tiet > 0) dinhMucKhungCT[khoi][mon] = tiet;
                }
            });
        });
    }

    tuDienPPCTToanCuc = {}; 
    if (duLieuSever.PPCT) {
        let boNhoKhoi = ''; 
        let boNhoMon = ''; 
        
        duLieuSever.PPCT.forEach(dong => {
            let khoiGoc = String(dong['Khối lớp'] || dong['Khối'] || '').trim();
            if (khoiGoc !== '') boNhoKhoi = khoiGoc; else khoiGoc = boNhoKhoi; 
            let matchKhoi = khoiGoc.match(/\d+/);
            let khoi = matchKhoi ? matchKhoi[0] : khoiGoc; 
            let monGoc = String(dong['Tên môn học'] || dong['Môn học'] || dong['Môn Học'] || '').trim().toLowerCase();
            if (monGoc !== '') boNhoMon = monGoc; else monGoc = boNhoMon; 
            
            let monRutGon = monGoc.replace(/[0-9]/g, '').trim().replace(/\s+/g, ' ');
            let tietPPCT_Goc = String(dong['Tiết PPCT'] || dong['Tiết'] || '').trim();
            let baiDay = dong['Tên bài học'] || dong['Tên bài'] || dong['Tên bài dạy'] || dong['Nội dung'] || '';
            
            tuDienPPCTToanCuc[`${khoi}_${monGoc}_${tietPPCT_Goc}`] = baiDay;
            if (!tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`]) {
                tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`] = baiDay;
            }
        });
    }

    let soDauBaiDaLuu = {};
    if (duLieuSever.SO_DAU_BAI) {
        duLieuSever.SO_DAU_BAI.forEach(dong => {
            let tuan = String(dong['Tuần']).replace(/\D/g, '');
            let lop = String(dong['Mã Lớp']).trim().toLowerCase();
            let thu = String(dong['Thứ']).trim().toLowerCase();
            let buoi = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(dong['Tiết']).trim();
            
            let khoa = `${tuan}_${lop}_${thu}_${buoi}_${tiet}`;
            soDauBaiDaLuu[khoa] = {
                TietPPCT: dong['Tiết PPCT'] || '',
                TenBai: dong['Tên Bài Dạy'] || dong['Tên bài dạy'] || dong['Tên Bài'] || dong['Tên bài'] || '',
                NhanXet: dong['Nhận Xét'] || dong['Nhận xét'] || '',
                XepLoai: dong['Xếp Loại'] || dong['Xếp loại'] || '',
                ChuKy: dong['Chữ Ký GV'] || dong['Chữ ký GV'] || dong['Chữ ký'] || '',
                ChuyenCan: dong['Chuyên Cần'] || dong['Chuyên cần'] || ''
            };
        });
    }

    let boDemTietCuaLop = {}; 
    duLieuTKBGopDaMap = tkbGop.map(dong => {
        let tuan = String(dong['Tuần']).replace(/\D/g, '');
        let maLop = String(dong['Mã Lớp'] || '').trim();
        let thu = String(dong['Thứ']).trim().toLowerCase();
        let buoi = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
        let tiet = String(dong['Tiết']).trim();
        
        let mon = String(dong['Môn Học'] || '').trim(); 
        let khoaTKB = `${tuan}_${maLop.toLowerCase()}_${thu}_${buoi}_${tiet}`;
        let dongDaLuu = soDauBaiDaLuu[khoaTKB]; 
        
        let tietThucTe = ''; let tenBaiHoc = '';
        let nhanXetGv = ''; let xepLoaiGv = ''; let chuKyGV = ''; let chuyenCanHs = '';
        let isDaLuu = false;

        if (mon !== '') {
            let monDem = mon.replace(/[0-9]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
            let khoaDem = `${maLop.toUpperCase()}_${monDem}`;
            
            if (dongDaLuu) {
                isDaLuu = true;
                tietThucTe = dongDaLuu.TietPPCT;
                tenBaiHoc = dongDaLuu.TenBai;
                nhanXetGv = dongDaLuu.NhanXet;
                xepLoaiGv = dongDaLuu.XepLoai;
                chuKyGV = dongDaLuu.ChuKy;
                chuyenCanHs = dongDaLuu.ChuyenCan;
                
                let tietNum = parseInt(String(tietThucTe).replace(/\D/g, '')) || 0;
                if (tietNum > (boDemTietCuaLop[khoaDem] || 0)) boDemTietCuaLop[khoaDem] = tietNum; 
            } else {
                if (!boDemTietCuaLop[khoaDem]) boDemTietCuaLop[khoaDem] = 0;
                boDemTietCuaLop[khoaDem]++; 
                tietThucTe = boDemTietCuaLop[khoaDem];
            }
        }
        
        return { 
            ...dong, TietPPCT_Thuc: tietThucTe, TenBai_Thuc: tenBaiHoc, 
            NhanXet_Thuc: nhanXetGv, XepLoai_Thuc: xepLoaiGv, ChuKy_Thuc: chuKyGV, 
            ChuyenCan_Thuc: chuyenCanHs, DaLuu: isDaLuu 
        };
    });

    napDropdownSoDauBai();
}

// =========================================================================
// KHỐI 2: VẼ GIAO DIỆN (ĐÃ TỐI ƯU CĂN LỀ & LOGIC KHÓA INPUT BẰNG CHỮ KÝ)
// =========================================================================
function tinhNgayTuInputDate(ngayYMD, tenThu) {
    if (!ngayYMD) return '';
    let dateObj = new Date(ngayYMD);
    if (isNaN(dateObj.getTime())) return '';
    const doLech = { "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ nhật": 6 };
    dateObj.setDate(dateObj.getDate() + (doLech[tenThu] || 0));
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
}

// =========================================================================
// HÀM 1: KẾT XUẤT LƯỚI (PHỤC HỒI HIỂN THỊ THỨ 7, CHỦ NHẬT)
// =========================================================================
function ketXuatSoDauBaiLenLuoi() {
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    let inputNgay = document.getElementById('chonNgaySDB');
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');

    if (!tuanChon || !lopChon || !vungHienThi) return;

    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let maGvDangNhapHeThong = theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '';
    let chuoiQuyen = theChotQuyen ? theChotQuyen.getAttribute('data-matranquyen') : '{}';
    
    let tuDienQuyenPhanCong = {};
    try { tuDienQuyenPhanCong = JSON.parse(chuoiQuyen); } catch(e) {}

    let dsMonDuocSuaCuaLop = tuDienQuyenPhanCong[lopChon.toUpperCase()] || [];

    let maxTuanChon = parseInt(tuanChon.replace(/\D/g, '')) || 0;
    let demTietThucTe = {}; 
    
    let tkbDenTuanNay = duLieuTKBGopDaMap.filter(d => {
        let t = parseInt(String(d['Tuần']).replace(/\D/g, '')) || 0;
        return t <= maxTuanChon && String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase();
    });

    tkbDenTuanNay.forEach(d => {
        let monGoc = String(d['Môn Học']).trim().toLowerCase();
        if (!monGoc) return;
        demTietThucTe[monGoc] = (demTietThucTe[monGoc] || 0) + 1;
        let monRutGon = monGoc.replace(/[0-9]/g, '').trim();
        if (monGoc !== monRutGon && monRutGon !== '') demTietThucTe[monRutGon] = (demTietThucTe[monRutGon] || 0) + 1;
    });

    let matchKhoiChon = lopChon.match(/\d+/);
    let khoiChon = matchKhoiChon ? matchKhoiChon[0] : '';
    let dinhMucKhoiNay = dinhMucKhungCT[khoiChon] || {};
    
    let canhBaoHtml = ''; let hasCanhBao = false;

    for (let mon in dinhMucKhoiNay) {
        let dinhMuc = dinhMucKhoiNay[mon];
        let tietThucTe = demTietThucTe[mon] || 0; 
        let tietChuanDuKien = dinhMuc * maxTuanChon;
        let doLech = tietThucTe - tietChuanDuKien;
        let tenMonIn = mon.charAt(0).toUpperCase() + mon.slice(1);

        if (doLech < 0) { 
            canhBaoHtml += `<span class="bg-red-100 text-red-700 font-bold px-3 py-1 rounded border border-red-200 shadow-sm flex items-center gap-1 text-xs whitespace-nowrap"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>${tenMonIn}: Chậm ${Math.abs(doLech)}</span>`;
            hasCanhBao = true;
        } else if (doLech > 0) { 
            canhBaoHtml += `<span class="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded border border-orange-200 shadow-sm flex items-center gap-1 text-xs whitespace-nowrap"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>${tenMonIn}: Vượt ${doLech}</span>`;
            hasCanhBao = true;
        }
    }

    let thanhCanhBaoRender = hasCanhBao ? `<div class="mb-3 p-2 bg-white border-l-4 border-red-500 shadow-sm text-sm flex flex-col md:flex-row md:items-center gap-3 w-full"><div class="flex items-center gap-2 flex-none"><div class="p-1 bg-red-100 rounded-full"><svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><span class="font-extrabold text-red-700 uppercase tracking-wide text-xs">Cảnh báo Tiến độ:</span></div><div class="flex flex-wrap gap-2 flex-1">${canhBaoHtml}</div></div>` : '';

    let tkbTuanNay = duLieuTKBGopDaMap.filter(d => String(d['Tuần']).trim() === tuanChon && String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase());
    let soTietDaLuu = 0; let tongSoTietCoMon = 0;
    let dictTKB = {}; let mapNgayChinhXac = {}; 
    
    // [PHỤC HỒI]: Khởi tạo biến dò tìm Thứ 7, Chủ nhật
    let coDayBuThu7 = false; let coDayBuChuNhat = false;

    tkbTuanNay.forEach(dong => {
        let thuGoc = String(dong['Thứ']).trim();
        
        // [PHỤC HỒI]: Bắt tín hiệu nếu có dữ liệu vào Thứ 7 hoặc Chủ nhật
        if (thuGoc === 'Thứ 7') coDayBuThu7 = true;
        if (thuGoc === 'Chủ nhật') coDayBuChuNhat = true;

        if (dong['Ngày'] && dong['Ngày'] !== '' && dong['Ngày'] !== '...') mapNgayChinhXac[thuGoc] = dong['Ngày']; 
        let buoiKiemTra = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
        dictTKB[`${thuGoc}_${buoiKiemTra}_${dong['Tiết']}`] = dong;
        if (String(dong['Môn Học']).trim() !== '') {
            tongSoTietCoMon++;
            if (dong['DaLuu'] === true) soTietDaLuu++;
        }
    });

    let theTrangThaiHtml = '';
    if (tongSoTietCoMon > 0) {
        if (soTietDaLuu > 0) {
            theTrangThaiHtml = `
                <div class="mb-4 p-2 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-between rounded">
                    <div class="flex items-center gap-2">
                        <div class="bg-emerald-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>
                        <span class="text-sm font-extrabold text-emerald-800 tracking-wide uppercase">CÓ DỮ LIỆU ĐÃ ĐƯỢC CHỐT SỔ</span>
                    </div>
                    <span class="text-xs font-semibold text-emerald-700 italic hidden sm:block">Các tiết đã Ký Tên sẽ bị khóa cứng. Các tiết chưa ký vẫn tiếp tục mở để chỉnh sửa.</span>
                </div>`;
        } else {
            theTrangThaiHtml = `
                <div class="mb-4 p-2 bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded animate-pulse-once">
                    <div class="flex items-center gap-2">
                        <div class="bg-amber-500 rounded-full p-1"><svg class="w-3 h-3 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></div>
                        <span class="text-sm font-extrabold text-amber-800 tracking-wide uppercase">DỮ LIỆU MỚI TỊNH TIẾN (CHƯA LƯU)</span>
                    </div>
                    <span class="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full border border-amber-400">
                        ⚠️ Yêu cầu: Bấm "Đồng bộ Tên bài", Nhập Đánh giá, Ký tên và bấm "Lưu Sổ đầu bài" để lưu!
                    </span>
                </div>`;
        }
    }

    let danhSachMonUI = dsMonDuocSuaCuaLop.length > 0 ? dsMonDuocSuaCuaLop.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ') : '<span class="text-red-600 font-bold">Không dạy lớp này</span>';
    let theHienThiQuyen = `<div class="mb-4 p-2.5 bg-blue-50 border border-blue-300 shadow-sm text-sm rounded flex items-center justify-between animate-pulse-once">
        <div><span class="font-bold text-blue-800">Định danh:</span> <span class="text-blue-700 font-extrabold">${maGvDangNhapHeThong || 'Chưa nhận diện'}</span></div>
        <div><span class="font-bold text-blue-800">Quyền ký tại ${lopChon}:</span> <span class="text-blue-700 font-semibold">${danhSachMonUI}</span></div>
    </div>`;

    let danhSachThu = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
    
    // [PHỤC HỒI]: Chèn ngày cuối tuần vào danh sách in ra lưới nếu có dữ liệu học bù
    if (coDayBuThu7) danhSachThu.push("Thứ 7");
    if (coDayBuChuNhat) danhSachThu.push("Chủ nhật");

    let mienNgayHienTai = inputNgay ? inputNgay.value : '';
    if (!mienNgayHienTai && mapNgayChinhXac['Thứ 2']) {
        let p = mapNgayChinhXac['Thứ 2'].split('/');
        if (p.length === 3) {
            mienNgayHienTai = `${p[2]}-${p[1]}-${p[0]}`; 
            if (inputNgay) inputNgay.value = mienNgayHienTai;
        }
    }

    let ngayDauTieuDe = mapNgayChinhXac['Thứ 2'] || (mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, "Thứ 2") : '...');
    let ngayCuoiTieuDe = mapNgayChinhXac[danhSachThu[danhSachThu.length - 1]] || (mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, danhSachThu[danhSachThu.length - 1]) : '...');

    let htmlBang = `
        <div class="mb-8 bang-so-dau-bai-container overflow-x-auto">
            <div class="flex justify-between items-center mb-2 font-bold text-slate-800 uppercase">
                <span>LỚP: ${lopChon}</span>
                <span>TUẦN ${tuanChon.replace(/\D/g,'')}</span>
            </div>
            <div class="text-center italic mb-2 text-sm text-slate-600">
                (Từ ngày ${ngayDauTieuDe} đến ngày ${ngayCuoiTieuDe})
            </div>
            <table class="w-full min-w-[950px] border-collapse border border-gray-500 text-sm">
                <thead class="bg-slate-100 text-center font-bold">
                    <tr>
                        <th class="border border-gray-500 p-2 w-16">THỨ</th>
                        <th class="border border-gray-500 p-2 w-10">TIẾT</th>
                        <th class="border border-gray-500 p-2 w-12">C.CẦN</th>
                        <th class="border border-gray-500 p-2 w-20">MÔN</th>
                        <th class="border border-gray-500 p-2 w-12">TIẾT PPCT</th>
                        <th class="border border-gray-500 p-2 min-w-[200px] w-auto">TÊN BÀI DẠY</th>
                        <th class="border border-gray-500 p-2 min-w-[180px] w-auto">NHẬN XÉT CỦA GV</th>
                        <th class="border border-gray-500 p-2 w-16">XẾP LOẠI</th>
                        <th class="border border-gray-500 p-2 w-24">CHỮ KÝ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    danhSachThu.forEach(thu => {
        let ngayCuaThu = mapNgayChinhXac[thu] || (mienNgayHienTai ? tinhNgayTuInputDate(mienNgayHienTai, thu) : '');
        let hienThiThu = ngayCuaThu ? `${thu}<br><span class="text-[11px] font-normal tracking-tight normal-case">${ngayCuaThu}</span>` : thu;

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
                let isLocked = isDaLuu && chuKy.trim() !== '';

                let gvTkb = dongDuLieu ? String(dongDuLieu['Mã GV']).trim().toLowerCase() : '';
                let maGvDangNhapLC = maGvDangNhapHeThong.trim().toLowerCase();
                let monHocChuan = monHoc ? monHoc.trim().toLowerCase().replace(/\s+/g, ' ') : '';

                // Quyền ký sổ CHỈ CÒN ĐƯỢC CẤP NẾU: Dạy thay (GV TKB khớp ID) HOẶC Dạy chính (Môn có trong Phân công)
                let quyenNhapThuCong = (maGvDangNhapLC !== '' && gvTkb === maGvDangNhapLC) || 
                                       (monHocChuan !== '' && dsMonDuocSuaCuaLop.includes(monHocChuan));

                let isEmptyTenBai = tenBai.trim() === '' || tenBai.includes('Chưa có dữ liệu PPCT');
                let cssTenBai = ""; let theTenBai = "";
                let theNhanXet = ""; let theXepLoai = ""; let theChuKy = ""; let theChuyenCan = "";
                
                if (monHoc && monHoc !== "") {
                    if (isLocked) {
                        cssTenBai = "text-emerald-700 font-bold";
                        theTenBai = tenBai;
                        theChuyenCan = `<span class="font-bold text-slate-800 block text-center">${chuyenCan}</span>`;
                        theNhanXet = `<span class="font-normal text-slate-800 break-words block">${nhanXet}</span>`;
                        theXepLoai = `<span class="font-bold text-slate-800 block text-center">${xepLoai}</span>`;
                        theChuKy = `<span class="font-bold text-slate-800 uppercase block text-center">${chuKy}</span>`;
                    } else {
                        let trangThaiKhoa = !quyenNhapThuCong ? "disabled" : "";
                        let cssNenKhoa = !quyenNhapThuCong ? "bg-slate-100 cursor-not-allowed opacity-70" : "bg-transparent";
                        let placeholderText = !quyenNhapThuCong ? "Không có quyền" : "Nhập...";

                        if (isEmptyTenBai) {
                            theTenBai = `<input type="text" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-normal text-slate-800 placeholder-slate-400 px-1" placeholder="${placeholderText}" value="">`;
                        } else {
                            cssTenBai = !quyenNhapThuCong ? "text-slate-500 font-semibold" : "text-slate-800 font-semibold";
                            theTenBai = tenBai;
                        }

                        theChuyenCan = `<input type="text" ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-semibold text-slate-800 placeholder-slate-400" placeholder="..." value="${chuyenCan}">`;
                        theNhanXet = `<input type="text" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-normal text-slate-800 placeholder-slate-400 px-1" placeholder="Nhận xét..." value="${nhanXet}">`;
                        theXepLoai = `<input type="text" ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-bold text-slate-800 placeholder-slate-400" placeholder="XL" value="${xepLoai}">`;
                        theChuKy = `<input type="text" ${trangThaiKhoa} class="w-full text-center outline-none ${cssNenKhoa} font-semibold text-blue-700 placeholder-blue-300" placeholder="Ký..." value="${chuKy}">`;
                    }
                }

                let isRowDauChieu = (buoiObj.id === 'Chieu' && tiet === 1);
                let cssRow = isRowDauChieu ? "border-t-2 border-t-gray-400" : "";

                htmlBang += `<tr class="hover:bg-slate-50 transition-colors duration-150 group ${cssRow}" data-buoi="${buoiObj.dataBuoi}">`;
                if (!daInCotThu) {
                    htmlBang += `<td class="border border-gray-500 text-center font-bold uppercase leading-tight bg-white group-hover:bg-slate-50" rowspan="${tongDongTrongNgay}">${hienThiThu}</td>`;
                    daInCotThu = true;
                }

                htmlBang += `
                    <td class="border border-gray-500 text-center p-1 bg-white group-hover:bg-slate-50" title="Buổi ${buoiObj.dataBuoi}" data-loai="tietSDB">${tiet}</td>
                    <td class="border border-gray-500 text-center p-1 bg-white group-hover:bg-slate-50 align-middle" data-loai="chuyenCan">${theChuyenCan}</td>
                    <td class="border border-gray-500 p-1 font-bold text-center text-slate-900 bg-white group-hover:bg-slate-50" data-loai="mon">${monHoc}</td>
                    <td class="border border-gray-500 text-center p-1 font-extrabold text-blue-700 bg-white group-hover:bg-slate-50" data-loai="tiet">${tietPPCT}</td>
                    <td class="border border-gray-500 p-1 ${cssTenBai} bg-white group-hover:bg-slate-50" data-loai="tenBai" data-islocked="${isLocked}" data-coquyensua="${quyenNhapThuCong}">${theTenBai}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle" data-loai="nhanXet">${theNhanXet}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle text-center" data-loai="xepLoai">${theXepLoai}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle text-center" data-loai="chuKy">${theChuKy}</td>
                </tr>`;
            });
        });
    });

    htmlBang += `</tbody></table></div>`;
    vungHienThi.innerHTML = theTrangThaiHtml + thanhCanhBaoRender + theHienThiQuyen + htmlBang;
}

// =========================================================================
// HÀM 2: LƯU SỔ ĐẦU BÀI (Chống trượt index tuyệt đối)
// =========================================================================
async function luuSoDauBaiSangMayChu() {
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    if (!tuanChon || !lopChon) return alert("Vui lòng chọn Tuần và Lớp trước khi lưu!");

    if (!confirm(`Xác nhận chốt dữ liệu Sổ đầu bài Lớp ${lopChon} - ${tuanChon.replace(/\D/g,'')} vào Cơ sở dữ liệu?`)) return;

    const btn = document.getElementById('btnLuuSoDauBai');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="ml-1">Đang lưu...</span>`;
    btn.disabled = true;

    try {
        let duLieuQuetDuoc = [];
        let cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');

        cacBang.forEach(khungBang => {
            let thuHienTai = ''; let ngayHienTai = '';
            let cacDong = khungBang.querySelectorAll('table tbody tr');
            
            cacDong.forEach(dong => {
                // Rút trích Thứ và Ngày (chỉ có ở dòng đầu tiên của mỗi Thứ)
                let cellThu = dong.querySelector('td[rowspan]');
                if (cellThu) {
                    let textThuNgay = cellThu.innerText.split('\n');
                    thuHienTai = textThuNgay[0].trim();
                    ngayHienTai = textThuNgay.length > 1 ? textThuNgay[1].trim() : '';
                }

                let cellMon = dong.querySelector('td[data-loai="mon"]');
                let mon = cellMon ? cellMon.innerText.trim() : '';

                if (mon && mon !== '') {
                    // Cấu trúc hàm con quét thẳng vào lõi thẻ td, bắt input hoặc innerText an toàn
                    let getVal = (cell) => cell ? (cell.querySelector('input') ? cell.querySelector('input').value.trim() : cell.innerText.trim()) : '';

                    let tiet = getVal(dong.querySelector('td[data-loai="tietSDB"]'));
                    let chuyenCan = getVal(dong.querySelector('td[data-loai="chuyenCan"]'));
                    let tietPPCT = getVal(dong.querySelector('td[data-loai="tiet"]'));
                    let tenBai = getVal(dong.querySelector('td[data-loai="tenBai"]'));
                    let nhanXetGV = getVal(dong.querySelector('td[data-loai="nhanXet"]'));
                    let xepLoaiGV = getVal(dong.querySelector('td[data-loai="xepLoai"]'));
                    let chuKyGV = getVal(dong.querySelector('td[data-loai="chuKy"]'));
                    let buoi = dong.getAttribute('data-buoi') || 'Sáng';

                    let tuanSo = tuanChon.replace(/\D/g, '');
                    let maLuuTru = `${tuanSo}_${lopChon}_${thuHienTai}_${buoi}_${tiet}`;

                    duLieuQuetDuoc.push({
                        maLuuTru: maLuuTru, tuan: tuanSo, maLop: lopChon,
                        thu: thuHienTai, ngay: ngayHienTai, buoi: buoi, tiet: tiet,
                        mon: mon, tietPPCT: tietPPCT, tenBai: tenBai, 
                        nhanXet: nhanXetGV, xepLoai: xepLoaiGV, chuKy: chuKyGV,
                        chuyenCan: chuyenCan
                    });
                }
            });
        });

        if (duLieuQuetDuoc.length === 0) {
            btn.innerHTML = textGoc; btn.disabled = false;
            return alert("Sổ đầu bài đang trống, không có dữ liệu để lưu.");
        }

        const payload = { thaoTac: 'luuSoDauBaiDongBo', tuan: tuanChon.replace(/\D/g, ''), lop: lopChon, duLieu: duLieuQuetDuoc };
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
        const ketQua = await phanHoi.json();

        if (ketQua.trangThai === 'thanh_cong') {
            alert(`✅ Đã chốt thành công Sổ đầu bài Lớp ${lopChon} - Tuần ${tuanChon.replace(/\D/g, '')}!`);
            await taiDuLieuSoDauBaiTuMayChu();
            daTaiDuLieuSoDauBai = false; 
            taiDuLieuSoDauBaiTuMayChu();
        } else throw new Error(ketQua.thongBao);

    } catch (loi) { alert("Lưu thất bại: " + loi.message); } 
    finally { btn.innerHTML = textGoc; btn.disabled = false; }
}

// =========================================================================
// KHỐI 3: HÀM ĐỒNG BỘ TÊN BÀI THEO NÚT BẤM (BẢO TOÀN LỖI KHI ĐÃ KÝ VÀ QUYỀN)
// =========================================================================
function dongBoTenBaiHoc() {
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
        
        cacDong.forEach(dong => {
            let oMon = dong.querySelector('td[data-loai="mon"]');
            let oTiet = dong.querySelector('td[data-loai="tiet"]');
            let oTenBai = dong.querySelector('td[data-loai="tenBai"]');
            
            if (oMon && oTiet && oTenBai) {
                let isLocked = oTenBai.getAttribute('data-islocked') === 'true';
                let coQuyenSua = oTenBai.getAttribute('data-coquyensua') === 'true';
                
                if (isLocked) return;

                let mon = oMon.innerText.trim().toLowerCase();
                let tiet = oTiet.innerText.trim();
                
                if (mon !== '' && tiet !== '') {
                    let monRutGon = mon.replace(/[0-9]/g, '').trim().replace(/\s+/g, ' ');
                    
                    let khoaChinh = `${khoi}_${mon}_${tiet}`;
                    let khoaPhu = `${khoi}_${monRutGon}_${tiet}`;
                    
                    let baiDay = tuDienPPCTToanCuc[khoaChinh] || tuDienPPCTToanCuc[khoaPhu] || '';

                    if (baiDay !== '') {
                        oTenBai.innerText = baiDay;
                        oTenBai.className = "border border-gray-500 p-1 text-slate-800 font-semibold bg-white group-hover:bg-slate-50";
                    } else {
                        let trangThaiKhoa = !coQuyenSua ? "disabled" : "";
                        let cssNenKhoa = !coQuyenSua ? "bg-slate-100 cursor-not-allowed opacity-70" : "bg-transparent";
                        oTenBai.innerHTML = `<input type="text" ${trangThaiKhoa} class="w-full text-left outline-none ${cssNenKhoa} font-normal text-slate-800 placeholder-slate-400 px-1" placeholder="Nhập tên bài..." value="">`;
                        oTenBai.className = "border border-gray-500 p-1 bg-white group-hover:bg-slate-50";
                    }
                }
            }
        });
        
        if (btn) { 
            btn.innerHTML = textGoc; 
            btn.disabled = false; 
        }
    }, 100); 
}


function xuatWordSoDauBai() {
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (!vungHienThi || vungHienThi.innerText.includes('Vui lòng chọn')) return alert("Không có dữ liệu để xuất!");

    let tuanChon = document.getElementById('chonTuanSo').value;
    let lopChon = document.getElementById('chonLopSo').value;

    let preHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Sổ Đầu Bài</title>
        <style>
            @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 1.0in 1.0in 1.0in 1.0in; }
            div.WordSection1 { page: WordSection1; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: "Times New Roman", Times, serif; font-size: 13pt; }
            th, td { border: 1px solid black; padding: 5px; }
            th { text-align: center; font-weight: bold; }
            .text-center { text-align: center; }
            .italic { font-style: italic; }
            .flex { display: table; width: 100%; font-weight: bold; margin-bottom: 5px; }
            .justify-between span { display: table-cell; width: 50%; }
            .justify-between span:last-child { text-align: right; }
        </style>
        </head><body><div class='WordSection1'>
    `;
    
    let noiDungClone = vungHienThi.cloneNode(true);
    let canhBaoNode = noiDungClone.querySelector('.border-red-500');
    if (canhBaoNode) canhBaoNode.remove();

    let cacInputGoc = vungHienThi.querySelectorAll('input');
    let cacInputClone = noiDungClone.querySelectorAll('input');
    cacInputGoc.forEach((input, idx) => {
        if (cacInputClone[idx]) cacInputClone[idx].setAttribute('value', input.value);
    });

    let htmlContent = preHtml + noiDungClone.innerHTML + "</div></body></html>";
    let blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SoDauBai_Lop${lopChon}_Tuan${tuanChon.replace(/\D/g,'')}.doc`;
    link.click();
}

async function xuatExcelSoDauBai() {
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
        
        let tuanChon = document.getElementById('chonTuanSo').value;
        let lopChon = document.getElementById('chonLopSo').value;
        const cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');
        
        if(cacBang.length === 0) return alert("Không có dữ liệu để xuất!");
        let rowIndex = 1;

        cacBang.forEach(khungBang => {
            let rowHeader1 = worksheet.getRow(rowIndex);
            rowHeader1.getCell(1).value = khungBang.querySelector('.flex').innerText.replace(/\n/g, '                ');
            rowHeader1.font = { name: 'Times New Roman', size: 14, bold: true };
            worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
            rowIndex++;

            let rowHeader2 = worksheet.getRow(rowIndex);
            rowHeader2.getCell(1).value = khungBang.querySelector('.italic').innerText;
            rowHeader2.font = { name: 'Times New Roman', size: 12, italic: true };
            rowHeader2.getCell(1).alignment = { horizontal: 'center' };
            worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
            rowIndex++;

            const rows = khungBang.querySelectorAll('table tr');
            rows.forEach((tr, idx) => {
                let rData = [];
                tr.querySelectorAll('th, td').forEach(cell => {
                    let input = cell.querySelector('input');
                    rData.push(input ? input.value : cell.innerText);
                });

                if(idx > 0 && rData.length < 9) rData.unshift(''); 

                let row = worksheet.addRow(rData);
                row.font = { name: 'Times New Roman', size: 12 };
                
                if (idx === 0) {
                    row.font = { bold: true, name: 'Times New Roman' };
                    row.alignment = { vertical: 'middle', horizontal: 'center' };
                }

                row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    if([1, 2, 3, 4, 5, 8, 9].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    else cell.alignment = { vertical: 'middle', wrapText: true };
                    if (colNumber === 2) cell.numFmt = '@'; // Ép file Excel định dạng Text cho Cột C.Cần
                });
                rowIndex++;
            });

            rowIndex += 2;
        });

        worksheet.eachRow((row, rowNumber) => {
            let val = row.getCell(1).value;
            if (val && typeof val === 'string' && val.startsWith('THỨ ') && val !== 'THỨ') {
                let rowsToMerge = 0;
                while(worksheet.getCell(rowNumber + rowsToMerge + 1, 1).value === '') {
                    if(worksheet.getCell(rowNumber + rowsToMerge + 1, 2).value === null) break;
                    rowsToMerge++;
                }
                if (rowsToMerge > 0) worksheet.mergeCells(`A${rowNumber}:A${rowNumber + rowsToMerge}`);
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
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

    let mangTuan = Array.from(tapHopTuan).sort((a, b) => parseInt(a.replace(/\D/g,'')) - parseInt(b.replace(/\D/g,'')));
    let mangLop = Array.from(tapHopLop).sort();

    let chonTuanHtml = `<option value="" disabled selected>-- Chọn Tuần --</option>` + mangTuan.map(t => `<option value="${t}">Tuần ${t.replace(/\D/g,'')}</option>`).join('');
    let chonLopHtml = `<option value="" disabled selected>-- Chọn Lớp --</option>` + mangLop.map(l => `<option value="${l}">Lớp ${l}</option>`).join('');

    let elementTuan = document.getElementById('chonTuanSo');
    let elementLop = document.getElementById('chonLopSo');
    
    if(elementTuan) elementTuan.innerHTML = chonTuanHtml;
    if(elementLop) elementLop.innerHTML = chonLopHtml;

    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (vungHienThi) {
        vungHienThi.innerHTML = `<div class="p-4"><p class="text-center py-10 text-slate-500 font-bold">Vui lòng chọn Tuần và Lớp để xem Sổ đầu bài.</p></div>`;
    }
}
