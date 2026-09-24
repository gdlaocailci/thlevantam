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
let danhSachGiaoVienToanCuc = []; // [NÂNG CẤP]: Mảng lưu danh sách giáo viên toàn cục

// Các biến toàn cục hỗ trợ kiểm soát trạng thái chưa lưu (Chống mất dữ liệu)
let tuanTruocDo_SDB = '';
let lopTruocDo_SDB = '';
let coThayDoiChuaLuu_SDB = false;

// Hàm dọn dẹp bộ nhớ đệm khi có sự kiện đổi tài khoản hoặc TKB
window.lamSachBoNhoSoDauBai = function() {
    daTaiDuLieuSoDauBai = false;
    duLieuTKBGopDaMap = [];
    tuDienPPCTToanCuc = {}; 
    dinhMucKhungCT = {}; 
    tuDienQuyenPhanCong = {};
    coToanQuyenSDB = false;
    danhSachGiaoVienToanCuc = [];
    
    // Reset cờ bảo vệ dữ liệu
    tuanTruocDo_SDB = '';
    lopTruocDo_SDB = '';
    coThayDoiChuaLuu_SDB = false;
    
    // Xóa triệt để Cache tĩnh của user hiện hành
    let emailGoiLen = typeof window.emailGiaoVienToanCuc !== 'undefined' ? window.emailGiaoVienToanCuc : '';
    try { sessionStorage.removeItem(`SDB_CACHE_${emailGoiLen}`); } catch(e) {}
    
    maGvDangNhapHeThong = '';
    
    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (vungHienThi) vungHienThi.innerHTML = '';
    
    let elementTuan = document.getElementById('chonTuanSo');
    let elementLop = document.getElementById('chonLopSo');

    // [NÂNG CẤP]: Khôi phục hiển thị và dọn dẹp các lớp bọc UI khi hệ thống reset
    let wTuan = document.getElementById('wrapper_chonTuanSo'); if (wTuan) wTuan.remove();
    let wLop = document.getElementById('wrapper_chonLopSo'); if (wLop) wLop.remove();

    if(elementTuan) { elementTuan.style.display = ''; elementTuan.innerHTML = '<option value="" disabled selected>-- Chọn Tuần --</option>'; }
    if(elementLop) { elementLop.style.display = ''; elementLop.innerHTML = '<option value="" disabled selected>-- Chọn Lớp --</option>'; }
};

async function taiDuLieuSoDauBaiTuMayChu() {
    if (daTaiDuLieuSoDauBai) return;
    
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    
    // Kiểm tra trực tiếp biến toàn cục thay vì check sự kiện onclick để chống lỗi Race Condition
    const chuaDangNhap = typeof window.emailGiaoVienToanCuc === 'undefined' || window.emailGiaoVienToanCuc === '';

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

    thucThiTaiDuLieuVaVeLuoi(vungHienThi);
}
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
// Lắng nghe trạng thái đăng nhập để tự động mở Sổ đầu bài
function kiemTraTrangThaiDangNhapSDB() {
    let soLanKiemTra = 0;
    const vungHienThi = document.getElementById('vungHienThiSoDauBai');
    
    if (vungHienThi) {
         let btnDangNhap = vungHienThi.querySelector('.bg-blue-600');
         if(btnDangNhap) btnDangNhap.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xác thực...`;
    }

    let vongLap = setInterval(() => {
        if (typeof window.emailGiaoVienToanCuc !== 'undefined' && window.emailGiaoVienToanCuc !== '') {
            clearInterval(vongLap);
            thucThiTaiDuLieuVaVeLuoi(vungHienThi);
        }
        soLanKiemTra++;
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
            <p class="text-base text-blue-900 font-extrabold">Đang kết nối kho dữ liệu Sổ Đầu Bài...</p>
            <span class="text-xs text-slate-500 font-normal mt-1 block">Khối lượng dữ liệu lớn đang được đồng bộ, quá trình này có thể mất khoảng 30 - 45 giây. Đồng chí vui lòng không chuyển trang...</span>
        </div>`;
    }

    try {
        let emailGoiLen = typeof window.emailGiaoVienToanCuc !== 'undefined' ? window.emailGiaoVienToanCuc : '';
        
        const phanHoi = await fetchVoiCoCheThuLai(
            `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDuLieuSoDauBai&emailTruyCap=${encodeURIComponent(emailGoiLen)}`,
            {},
            3,
            60000
        );
        
        const phanHoiText = await phanHoi.text();
        
        let duLieuSever;
        try { 
            duLieuSever = JSON.parse(phanHoiText); 
        } catch (loiParse) { 
            throw new Error("Phản hồi máy chủ gặp sự cố định dạng. Vui lòng thử lại!"); 
        }

        if (duLieuSever.trangThai === 'loi_he_thong') throw new Error(duLieuSever.thongBao);

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

function khoiTaoDuLieuSoDauBai(duLieuSever) {
    maGvDangNhapHeThong = duLieuSever.MA_GIAO_VIEN || '';
    coToanQuyenSDB = duLieuSever.TOAN_QUYEN || false;
    tuDienQuyenPhanCong = duLieuSever.QUYEN_THEO_LOP || {};

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
    theChotQuyen.setAttribute('data-quantri', coToanQuyenSDB);
    theChotQuyen.setAttribute('data-matranquyen', JSON.stringify(tuDienQuyenPhanCong));

    let mapDuiLieuHopNhat = {};

    const chuanHoaThu = (thuStr) => {
        if (!thuStr) return '';
        let raw = String(thuStr).trim().toLowerCase();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    if (duLieuSever.SO_DAU_BAI) {
        duLieuSever.SO_DAU_BAI.forEach(dong => {
            let tuan = String(dong['Tuần']).replace(/\D/g, '');
            let lop = String(dong['Mã Lớp']).trim().toUpperCase();
            let thuChuan = chuanHoaThu(dong['Thứ']); 
            let buoi = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều';
            let tiet = String(dong['Tiết']).trim();
            
            let khoa = `${tuan}_${lop}_${thuChuan}_${buoi}_${tiet}`;
            
            mapDuiLieuHopNhat[khoa] = {
                'Tuần': tuan, 'Mã Lớp': lop, 'Thứ': thuChuan, 'Buổi': buoi, 'Tiết': tiet,
                'Môn Học': dong['Môn Học'] || dong['Môn học'] || dong['Môn'] || '',
                'Mã GV': dong['Giáo viên'] || dong['Mã GV'] || dong['Giáo Viên'] || dong['GV'] || '',
                'Ngày': dong['Ngày'] || '',
                'TietPPCT_Thuc': dong['Tiết PPCT'] || '',
                'TenBai_Thuc': dong['Tên Bài Dạy'] || dong['Tên bài dạy'] || dong['Tên Bài'] || dong['Tên bài'] || '',
                'NhanXet_Thuc': dong['Nhận Xét'] || dong['Nhận xét'] || '',
                'XepLoai_Thuc': dong['Xếp Loại'] || dong['Xếp loại'] || '',
                'ChuKy_Thuc': dong['Chữ Ký GV'] || dong['Chữ ký GV'] || dong['Chữ ký'] || '',
                'ChuyenCan_Thuc': dong['Chuyên Cần'] || dong['Chuyên cần'] || '',
                'DaLuu': true 
            };
        });
    }

    let mapTkbToanTap = {};
    let tuanHeThong = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.TUAN_HIEN_TAI) ? parseInt(thongSoHocVu.TUAN_HIEN_TAI) : 999;

    if (duLieuSever.DATA_TKB) {
        duLieuSever.DATA_TKB.forEach(dong => {
            let tuanDong = parseInt(String(dong['Tuần']).replace(/\D/g, '')) || 0;
            if (tuanDong < tuanHeThong) {
                let khoa = `${tuanDong}_${String(dong['Mã Lớp']).trim().toUpperCase()}_${chuanHoaThu(dong['Thứ'])}_${String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'}_${String(dong['Tiết']).trim()}`;
                mapTkbToanTap[khoa] = dong;
            }
        });
    }
    
    if (duLieuSever.TKB_HIEN_TAI) {
        duLieuSever.TKB_HIEN_TAI.forEach(dong => {
            let tuanDong = parseInt(String(dong['Tuần']).replace(/\D/g, '')) || 0;
            if (tuanDong >= tuanHeThong) {
                let khoa = `${tuanDong}_${String(dong['Mã Lớp']).trim().toUpperCase()}_${chuanHoaThu(dong['Thứ'])}_${String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều'}_${String(dong['Tiết']).trim()}`;
                mapTkbToanTap[khoa] = dong;
            }
        });
    }

    Object.keys(mapTkbToanTap).forEach(khoa => {
        let dongTkb = mapTkbToanTap[khoa];
        if (!mapDuiLieuHopNhat[khoa]) {
            mapDuiLieuHopNhat[khoa] = {
                'Tuần': String(dongTkb['Tuần']).replace(/\D/g, ''),
                'Mã Lớp': String(dongTkb['Mã Lớp']).trim().toUpperCase(),
                'Thứ': chuanHoaThu(dongTkb['Thứ']),
                'Buổi': String(dongTkb['Buổi']).trim().toLowerCase() === 'sáng' ? 'sáng' : 'chiều',
                'Tiết': String(dongTkb['Tiết']).trim(),
                'Môn Học': dongTkb['Môn Học'] || '',
                'Mã GV': dongTkb['Mã GV'] || dongTkb['Giáo viên'] || '',
                'Ngày': dongTkb['Ngày'] || '',
                'TietPPCT_Thuc': '', 'TenBai_Thuc': '', 'NhanXet_Thuc': '', 
                'XepLoai_Thuc': '', 'ChuKy_Thuc': '', 'ChuyenCan_Thuc': '',
                'DaLuu': false 
            };
        } else {
            if (!mapDuiLieuHopNhat[khoa]['Mã GV'] || mapDuiLieuHopNhat[khoa]['Mã GV'].trim() === '') {
                mapDuiLieuHopNhat[khoa]['Mã GV'] = dongTkb['Mã GV'] || dongTkb['Giáo viên'] || '';
            }
        }
    });

    let tkbGop = Object.values(mapDuiLieuHopNhat);
    const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
    const thuTuBuoi = { "sáng": 1, "chiều": 2, "tối": 3 };
    
    tkbGop.sort((a, b) => {
        let tuanA = parseInt(a['Tuần']) || 0; let tuanB = parseInt(b['Tuần']) || 0;
        if (tuanA !== tuanB) return tuanA - tuanB;
        let thuA = thuTuThu[a['Thứ']] || 99; let thuB = thuTuThu[b['Thứ']] || 99;
        if (thuA !== thuB) return thuA - thuB;
        let buoiA = thuTuBuoi[a['Buổi']] || 99; let buoiB = thuTuBuoi[b['Buổi']] || 99;
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
        let boNhoKhoi = ''; let boNhoMon = ''; 
        duLieuSever.PPCT.forEach(dong => {
            let khoiGoc = String(dong['Khối lớp'] || dong['Khối'] || '').trim();
            if (khoiGoc !== '') boNhoKhoi = khoiGoc; else khoiGoc = boNhoKhoi; 
            let matchKhoi = khoiGoc.match(/\d+/);
            let khoi = matchKhoi ? matchKhoi[0] : khoiGoc; 
            
            let monGoc = String(dong['Tên môn học'] || dong['Môn học'] || dong['Môn Học'] || '').trim().toLowerCase();
            if (monGoc !== '') boNhoMon = monGoc; else monGoc = boNhoMon; 
            let monRutGon = monGoc.replace(/[0-9\(\)]/g, '').trim().replace(/\s+/g, ' ');
            let tietPPCT_Goc = String(dong['Tiết PPCT'] || dong['Tiết'] || '').trim();
            let baiDay = dong['Tên bài học'] || dong['Tên bài'] || dong['Tên bài dạy'] || dong['Nội dung'] || '';
            
            tuDienPPCTToanCuc[`${khoi}_${monGoc}_${tietPPCT_Goc}`] = baiDay;
            if (!tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`]) {
                tuDienPPCTToanCuc[`${khoi}_${monRutGon}_${tietPPCT_Goc}`] = baiDay;
            }
        });
    }

    // [THUẬT TOÁN ĐẢM BẢO DỮ LIỆU GỐC]: Lọc dự phòng danh sách giáo viên từ TKB nếu Server bị lỗi
    if (duLieuSever.DANH_SACH_GIAO_VIEN && duLieuSever.DANH_SACH_GIAO_VIEN.length > 0) {
        danhSachGiaoVienToanCuc = duLieuSever.DANH_SACH_GIAO_VIEN;
    } else {
        let tapHopGV = new Set();
        tkbGop.forEach(d => { 
            if(d['Mã GV'] && d['Mã GV'].trim() !== '') {
                d['Mã GV'].split(/[,;&-]/).forEach(g => {
                    if(g.trim().length > 2) tapHopGV.add(g.trim());
                });
            }
        });
        danhSachGiaoVienToanCuc = Array.from(tapHopGV).sort();
    }

    duLieuTKBGopDaMap = tkbGop; 
    napDropdownSoDauBai();
}

// =========================================================================
// HÀM 2: KẾT XUẤT SỔ ĐẦU BÀI LÊN LƯỚI
// =========================================================================
function ketXuatSoDauBaiLenLuoi() {
    let theSelectTuan = document.getElementById('chonTuanSo');
    let theSelectLop = document.getElementById('chonLopSo');
    let tuanChon = theSelectTuan?.value;
    let lopChon = theSelectLop?.value;

    if (!tuanChon || !lopChon) return; 

    let tuanSoChon = parseInt(tuanChon.replace(/\D/g, ''));
    let trangThaiCacTuan = {};
    let tuanChuaLuuNhoNhat = null;

    duLieuTKBGopDaMap.forEach(d => {
        let maLop = String(d['Mã Lớp']).trim().toUpperCase();
        if (maLop === lopChon.toUpperCase()) {
            let t = parseInt(String(d['Tuần']).replace(/\D/g, '')) || 0;
            if (t > 0) {
                if (!trangThaiCacTuan[t]) {
                    trangThaiCacTuan[t] = { tongTietCoMon: 0, tongTietChuaLuu: 0 };
                }
                if (String(d['Môn Học']).trim() !== '') {
                    trangThaiCacTuan[t].tongTietCoMon++;
                    if (d.DaLuu !== true) {
                        trangThaiCacTuan[t].tongTietChuaLuu++;
                    }
                }
            }
        }
    });

    let cacTuanCoDuLieu = Object.keys(trangThaiCacTuan).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < cacTuanCoDuLieu.length; i++) {
        let t = cacTuanCoDuLieu[i];
        if (trangThaiCacTuan[t].tongTietCoMon > 0 && trangThaiCacTuan[t].tongTietChuaLuu > 0) {
            tuanChuaLuuNhoNhat = t;
            break;
        }
    }

    if (tuanChuaLuuNhoNhat !== null && tuanSoChon > tuanChuaLuuNhoNhat) {
        alert(`⛔ CẢNH BÁO TRÌNH TỰ SỔ ĐẦU BÀI:\n\nĐồng chí không thể lập sổ Tuần ${tuanSoChon} vì Tuần ${tuanChuaLuuNhoNhat} của lớp này chưa được chốt sổ!\n\nNguyên tắc hệ thống: Bắt buộc phải lưu Sổ đầu bài theo đúng trình tự thời gian để Phân phối chương trình (PPCT) tự động tịnh tiến chính xác.\n\nHệ thống sẽ tự động quay trở về Tuần ${tuanChuaLuuNhoNhat}.`);
        
        let optionToSelect = Array.from(theSelectTuan.options).find(opt => parseInt(opt.value.replace(/\D/g, '')) === tuanChuaLuuNhoNhat);
        if (optionToSelect) {
            theSelectTuan.value = optionToSelect.value;
            // [NÂNG CẤP]: Kích hoạt đồng bộ UI Input
            if (typeof dongBoHienThiTuSelect === 'function') dongBoHienThiTuSelect('chonTuanSo');
            setTimeout(ketXuatSoDauBaiLenLuoi, 100); 
            return; 
        }
    }

    if (coThayDoiChuaLuu_SDB && (tuanChon !== tuanTruocDo_SDB || lopChon !== lopTruocDo_SDB)) {
        alert("Cảnh báo: Đồng chí đang có dữ liệu chưa lưu trên màn hình! Vui lòng bấm 'Lưu Sổ đầu bài' để chốt dữ liệu trước khi chuyển sang Tuần hoặc Lớp khác.");
        if (theSelectTuan && tuanTruocDo_SDB) {
            theSelectTuan.value = tuanTruocDo_SDB;
            if (typeof dongBoHienThiTuSelect === 'function') dongBoHienThiTuSelect('chonTuanSo');
        }
        if (theSelectLop && lopTruocDo_SDB) {
            theSelectLop.value = lopTruocDo_SDB;
            if (typeof dongBoHienThiTuSelect === 'function') dongBoHienThiTuSelect('chonLopSo');
        }
        return; 
    }

    thucThiKetXuatSoDauBaiLenLuoi();

    tuanTruocDo_SDB = theSelectTuan?.value || '';
    lopTruocDo_SDB = theSelectLop?.value || '';
    coThayDoiChuaLuu_SDB = false; 
}

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
    
    duLieuTKBGopDaMap.forEach(d => {
        let t = parseInt(String(d['Tuần']).replace(/\D/g, '')) || 0;
        let maLop = String(d['Mã Lớp']).trim().toUpperCase();

        if (maLop === lopChon.toUpperCase() && t <= maxTuanChon) {
            let mon = String(d['Môn Học']).trim();
            if (mon !== '') {
                let monGocChuan = mon.toLowerCase().replace(/\s+/g, ' ');
                let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

                if (t < maxTuanChon) {
                    if (d.DaLuu === true) {
                        demTietTienDo[monGocChuan] = (demTietTienDo[monGocChuan] || 0) + 1;
                        boDemTietPPCT[monPPCT] = (boDemTietPPCT[monPPCT] || 0) + 1; 
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

    let tkbTuanNay = duLieuTKBGopDaMap.filter(d => String(d['Tuần']).trim() === tuanChon && String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase());
    let soTietDaLuu = 0; let tongSoTietCoMon = 0;
    let dictTKB = {}; let mapNgayChinhXac = {}; 
    let coDayBuThu7 = false; let coDayBuChuNhat = false;

    tkbTuanNay.forEach(dong => {
        let thuGoc = String(dong['Thứ']).trim();
        if (thuGoc === 'Thứ 7') coDayBuThu7 = true;
        if (thuGoc === 'Chủ nhật') coDayBuChuNhat = true;
        if (dong['Ngày'] && dong['Ngày'] !== '' && dong['Ngày'] !== '...') mapNgayChinhXac[thuGoc] = dong['Ngày']; 
        let buoiKiemTra = String(dong['Buổi']).trim().toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
        
        let mon = String(dong['Môn Học']).trim();
        if (mon !== '') {
            tongSoTietCoMon++;
            let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

            if (dong['DaLuu'] === true) {
                soTietDaLuu++;
                let tietLuu = parseInt(String(dong['TietPPCT_Thuc']).replace(/\D/g, '')) || 0;
                if (tietLuu > (boDemTietPPCT[monPPCT] || 0)) boDemTietPPCT[monPPCT] = tietLuu;
            } else {
                boDemTietPPCT[monPPCT] = (boDemTietPPCT[monPPCT] || 0) + 1;
                dong['TietPPCT_Thuc'] = boDemTietPPCT[monPPCT];

                let khoaChinh = `${khoiChon}_${mon.toLowerCase().replace(/\s+/g, ' ')}_${dong['TietPPCT_Thuc']}`;
                let khoaPhu = `${khoiChon}_${monPPCT}_${dong['TietPPCT_Thuc']}`;
                dong['TenBai_Thuc'] = tuDienPPCTToanCuc[khoaChinh] || tuDienPPCTToanCuc[khoaPhu] || '';
            }
        }
        
        dictTKB[`${thuGoc}_${buoiKiemTra}_${dong['Tiết']}`] = dong;
    });

    let theTrangThaiHtml = '';
    if (tongSoTietCoMon > 0) {
        if (soTietDaLuu > 0) {
            theTrangThaiHtml = `<div class="mb-4 p-2 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-between rounded"><div class="flex items-center gap-2"><div class="bg-emerald-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><span class="text-sm font-extrabold text-emerald-800 tracking-wide uppercase">CÓ DỮ LIỆU ĐÃ ĐƯỢC CHỐT SỔ</span></div><span class="text-xs font-semibold text-emerald-700 italic hidden sm:block">Các tiết đã Ký Tên sẽ bị khóa cứng. Các tiết chưa ký vẫn tiếp tục mở để chỉnh sửa.</span></div>`;
        } else {
            theTrangThaiHtml = `<div class="mb-4 p-2 bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded animate-pulse-once"><div class="flex items-center gap-2"><div class="bg-amber-500 rounded-full p-1"><svg class="w-3 h-3 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></div><span class="text-sm font-extrabold text-amber-800 tracking-wide uppercase">DỮ LIỆU MỚI TỊNH TIẾN (CHƯA LƯU)</span></div><span class="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full border border-amber-400">⚠️ Yêu cầu: Bấm "Đồng bộ Tên bài", Nhập Đánh giá, Ký tên và bấm "Lưu Sổ đầu bài" để lưu!</span></div>`;
        }
    }

    let tapHopMonDay = new Set();
    let maGvDangNhapLC = madinhdanhGV.trim().toLowerCase().normalize('NFC');
    
    tkbTuanNay.forEach(dong => {
        let gvTkb = String(dong['Mã GV']).trim().toLowerCase().normalize('NFC');
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

                let gvTkb = dongDuLieu ? String(dongDuLieu['Mã GV']).trim().toLowerCase().normalize('NFC') : '';
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
                        theTenBai = tenBai;
                        theChuyenCan = `<span class="font-bold text-slate-800 block text-center">${chuyenCan}</span>`;
                        theNhanXet = `<span class="font-normal text-slate-800 block">${nhanXet}</span>`;
                        theXepLoai = `<span class="font-bold text-slate-800 block text-center">${xepLoai}</span>`;
                        theChuKy = `<span class="font-bold text-slate-800 uppercase block text-center">${chuKy}</span>`;
                        theTietPPCT = `<span class="font-extrabold text-blue-700 block text-center">${tietPPCT}</span>`; 
                    } else {
                        let trangThaiKhoa = !quyenNhapThuCong ? "disabled" : "";
                        let cssNenKhoa = !quyenNhapThuCong ? "bg-slate-100 cursor-not-allowed opacity-70" : "bg-transparent";
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

                let isRowDauChieu = (buoiObj.id === 'Chieu' && tiet === 1);
                let cssRow = isRowDauChieu ? "border-t-2 border-t-gray-400" : "";

                htmlBang += `<tr class="hover:bg-slate-50 transition-colors duration-150 group ${cssRow}" data-buoi="${buoiObj.dataBuoi}" data-daluu="${isDaLuu}" data-thaydoi="false">`;
                if (!daInCotThu) {
                    htmlBang += `<td class="border border-gray-500 text-center font-bold uppercase leading-tight bg-white group-hover:bg-slate-50" rowspan="${tongDongTrongNgay}">${hienThiThu}</td>`;
                    daInCotThu = true;
                }

                htmlBang += `
                    <td class="border border-gray-500 text-center p-1 bg-white group-hover:bg-slate-50" title="Buổi ${buoiObj.dataBuoi}" data-loai="tietSDB">${tiet}</td>
                    <td class="border border-gray-500 text-center p-1 bg-white group-hover:bg-slate-50 align-middle" data-loai="chuyenCan">${theChuyenCan}</td>
                    <td class="border border-gray-500 p-1 font-bold text-center text-slate-900 bg-white group-hover:bg-slate-50" data-loai="mon">${monHoc}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle" data-loai="tiet">${theTietPPCT}</td>
                    <td class="border border-gray-500 p-1 ${cssTenBai} bg-white group-hover:bg-slate-50 align-middle" style="white-space: normal; word-wrap: break-word;" data-loai="tenBai" data-islocked="${isLocked}" data-coquyensua="${quyenNhapThuCong}">${theTenBai}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle" style="white-space: normal; word-wrap: break-word;" data-loai="nhanXet">${theNhanXet}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle text-center" data-loai="xepLoai">${theXepLoai}</td>
                    <td class="border border-gray-500 p-1 bg-white group-hover:bg-slate-50 align-middle text-center" data-loai="chuKy">${theChuKy}</td>
                </tr>`;
            });
        });
    });

    htmlBang += `</tbody></table></div>`;
    vungHienThi.innerHTML = theTrangThaiHtml + thanhCanhBaoRender + theHienThiQuyen + htmlBang;
    
    // [NÂNG CẤP LẮNG NGHE DOM]: Khi user chỉnh sửa, gắn cờ và icon cây bút
    setTimeout(() => {
        let cacOVanBan = vungHienThi.querySelectorAll('textarea');
        cacOVanBan.forEach(ta => {
            ta.style.height = 'auto';
            ta.style.height = (ta.scrollHeight) + 'px';
        });

        let tatCaOVanBan = vungHienThi.querySelectorAll('textarea, input, select');
        tatCaOVanBan.forEach(oNhap => {
            oNhap.addEventListener('input', (e) => { 
                coThayDoiChuaLuu_SDB = true; 
                danhDauDongThayDoi(e.target.closest('tr'));
            });
            oNhap.addEventListener('change', (e) => { 
                coThayDoiChuaLuu_SDB = true; 
                danhDauDongThayDoi(e.target.closest('tr'));
            });
        });
    }, 50);
}

async function luuSoDauBaiSangMayChu() {
    let tuanChon = document.getElementById('chonTuanSo')?.value;
    let lopChon = document.getElementById('chonLopSo')?.value;
    if (!tuanChon || !lopChon) return alert("Vui lòng chọn Tuần và Lớp trước khi lưu!");

    let tuanSo = parseInt(tuanChon.replace(/\D/g, ''));
    let tuanHeThong = (typeof window.thongSoHocVu !== 'undefined' && window.thongSoHocVu.TUAN_HIEN_TAI) ? parseInt(window.thongSoHocVu.TUAN_HIEN_TAI) : 999;
    
    let theChotQuyen = document.getElementById('theChotQuyenSDB');
    let madinhdanhGV = maGvDangNhapHeThong || (theChotQuyen ? theChotQuyen.getAttribute('data-madinhdanh') || '' : '');
    let quyenQuanTri = coToanQuyenSDB || (theChotQuyen ? (theChotQuyen.getAttribute('data-quantri') === 'true') : false);
    let maGvDangNhapLC = madinhdanhGV.trim().toLowerCase().normalize('NFC');

    let duLieuQuetDuoc = [];
    let danhSachThongBao = []; // [NÂNG CẤP]: Mảng thu thập log để báo cáo trước khi lưu
    let cacBang = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container');
    let canThiTietThieuTenBai = false; 
    let loiPhanQuyen = false;

    cacBang.forEach(khungBang => {
        let thuHienTai = ''; let ngayHienTai = '';
        let cacDong = khungBang.querySelectorAll('table tbody tr');
        
        cacDong.forEach(dong => {
            let cellThu = dong.querySelector('td[rowspan]');
            if (cellThu) {
                let textThuNgay = cellThu.innerText.split('\n');
                thuHienTai = textThuNgay[0].trim();
                ngayHienTai = textThuNgay.length > 1 ? textThuNgay[1].trim() : '';
            }

            let cellMon = dong.querySelector('td[data-loai="mon"]');
            let mon = cellMon ? cellMon.innerText.trim() : '';

            if (mon && mon !== '') {
                let isDaLuu = dong.getAttribute('data-daluu') === 'true';
                let isThayDoi = dong.getAttribute('data-thaydoi') === 'true';

                let getVal = (cell) => {
                    if (!cell) return '';
                    let theNhap = cell.querySelector('input, select, textarea');
                    return theNhap ? theNhap.value.trim() : cell.innerText.trim();
                };

                let tiet = getVal(dong.querySelector('td[data-loai="tietSDB"]'));
                let chuyenCan = getVal(dong.querySelector('td[data-loai="chuyenCan"]'));
                let tietPPCT = getVal(dong.querySelector('td[data-loai="tiet"]'));
                let tenBai = getVal(dong.querySelector('td[data-loai="tenBai"]'));
                let nhanXetGV = getVal(dong.querySelector('td[data-loai="nhanXet"]'));
                let xepLoaiGV = getVal(dong.querySelector('td[data-loai="xepLoai"]'));
                let chuKyGV = getVal(dong.querySelector('td[data-loai="chuKy"]'));
                let buoi = dong.getAttribute('data-buoi') || 'Sáng';

                let buoiKiemTra = buoi.toLowerCase() === 'sáng' ? 'Sang' : 'Chieu';
                let tkbDoiChieu = duLieuTKBGopDaMap.find(d => 
                    String(d['Tuần']).trim() == tuanSo && 
                    String(d['Mã Lớp']).trim().toUpperCase() === lopChon.toUpperCase() && 
                    String(d['Thứ']).trim() === thuHienTai && 
                    String(d['Tiết']).trim() == tiet &&
                    String(d['Buổi']).trim().toLowerCase() === buoi.toLowerCase()
                );

                if (chuKyGV !== '') {
                    if (!quyenQuanTri && tkbDoiChieu) {
                        let gvTkb = String(tkbDoiChieu['Mã GV']).trim().toLowerCase().normalize('NFC');
                        let tapHopGvTkb = gvTkb.split(/[,;&-]/).map(g => g.trim());
                        let coQuyen = tapHopGvTkb.includes(maGvDangNhapLC) || tapHopGvTkb.some(g => maGvDangNhapLC.includes(g) && g.length > 2);
                        if (!coQuyen) {
                            loiPhanQuyen = true;
                            dong.classList.add('bg-red-100'); 
                        }
                    }
                }

                if (chuKyGV !== '' && tuanSo < tuanHeThong && tenBai === '') {
                    canThiTietThieuTenBai = true;
                    let matchKhoi = lopChon.match(/\d+/);
                    let khoi = matchKhoi ? matchKhoi[0] : '';
                    let monPPCT = mon.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                    let monGocChuan = mon.toLowerCase().replace(/\s+/g, ' ');
                    
                    let baiDayChuan = tuDienPPCTToanCuc[`${khoi}_${monGocChuan}_${tietPPCT}`] || tuDienPPCTToanCuc[`${khoi}_${monPPCT}_${tietPPCT}`] || '';
                    
                    if (baiDayChuan !== '') {
                        let theTextarea = dong.querySelector('td[data-loai="tenBai"] textarea');
                        if (theTextarea) {
                            theTextarea.value = baiDayChuan;
                            theTextarea.style.height = 'auto';
                            theTextarea.style.height = (theTextarea.scrollHeight) + 'px';
                        }
                        tenBai = baiDayChuan; 
                        isThayDoi = true;
                        danhDauDongThayDoi(dong); // Gắn cờ tự động
                    }
                }

                // [NÂNG CẤP]: Thu thập thông tin cho thông báo hộp thoại
                if (isThayDoi || !isDaLuu) {
                    let maLuuTru = `${tuanSo}_${lopChon}_${thuHienTai}_${buoi}_${tiet}`;

                    duLieuQuetDuoc.push({
                        maLuuTru: maLuuTru, tuan: tuanSo, maLop: lopChon,
                        thu: thuHienTai, ngay: ngayHienTai, buoi: buoi, tiet: tiet,
                        mon: mon, tietPPCT: tietPPCT, tenBai: tenBai, 
                        nhanXet: nhanXetGV, xepLoai: xepLoaiGV, chuKy: chuKyGV,
                        chuyenCan: chuyenCan
                    });
                    
                    // Thêm dòng thay đổi vào danh sách để người dùng đọc trước khi xác nhận
                    danhSachThongBao.push(`- ${thuHienTai} (${buoi}), Tiết ${tiet}: ${mon}`);
                }
            }
        });
    });

    if (loiPhanQuyen) {
        return alert("Cảnh báo nghiệp vụ: Phát hiện Chữ ký tại Tiết học không thuộc quyền phân công của đồng chí. Các dòng vi phạm đã bị bôi đỏ. Vui lòng xóa chữ ký và thử lại!");
    }

    if (canThiTietThieuTenBai) {
        alert("Hệ thống phát hiện sổ tuần quá khứ bị bỏ trống Tên bài. Đã tự động đối chiếu Khung PPCT và điền bù Tên bài chuẩn. Vui lòng kiểm tra lại trên lưới và bấm Lưu lần nữa để xác nhận!");
        return; 
    }

    if (duLieuQuetDuoc.length === 0) return alert("Sổ đầu bài chưa có thay đổi nào để lưu.");
    
    // [NÂNG CẤP]: Bật hộp thoại thông báo chi tiết
    let thongBaoHienThi = `Hệ thống ghi nhận ${duLieuQuetDuoc.length} tiết học có sự thay đổi/cập nhật dữ liệu:\n\n` + 
                          danhSachThongBao.join('\n') + 
                          `\n\nĐồng chí có chắc chắn muốn chốt lưu các thay đổi này vào Cơ sở dữ liệu?`;
                          
    if (!confirm(thongBaoHienThi)) return;

    const btn = document.getElementById('btnLuuSoDauBai');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span class="ml-1">Đang lưu...</span>`;
    btn.disabled = true;

    try {
        const payload = { thaoTac: 'luuSoDauBaiDongBo', tuan: tuanChon.replace(/\D/g, ''), lop: lopChon, duLieu: duLieuQuetDuoc };
        const phanHoi = await fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
        const ketQua = await phanHoi.json();

        if (ketQua.trangThai === 'thanh_cong') {
            alert(`✅ Đã chốt thành công các cập nhật của Sổ đầu bài Lớp ${lopChon} - Tuần ${tuanSo}!`);
            coThayDoiChuaLuu_SDB = false; 
            await taiDuLieuSoDauBaiTuMayChu();
            daTaiDuLieuSoDauBai = false; 
            taiDuLieuSoDauBaiTuMayChu();
        } else throw new Error(ketQua.thongBao);
    } catch (loi) { 
        alert("Lưu thất bại: " + loi.message); 
    } finally { 
        btn.innerHTML = textGoc; btn.disabled = false; 
    }
}

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
                            if (theTextarea && theTextarea.value.trim() === '') {
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
        
        // Hủy mờ sau khi chọn xong
        trangThaiKhungChuKy.inputChuKy.classList.remove('text-slate-400', 'opacity-60');
        trangThaiKhungChuKy.inputChuKy.classList.add('text-blue-700');
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
                    if (colNumber === 2) cell.numFmt = '@'; 
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

    // [NÂNG CẤP]: Khởi tạo giao diện nhập liệu tìm kiếm
    nangCapSelectThanhInput('chonTuanSo', 'Tìm/Nhập Tuần...');
    nangCapSelectThanhInput('chonLopSo', 'Tìm/Nhập Lớp...');

    let vungHienThi = document.getElementById('vungHienThiSoDauBai');
    if (vungHienThi) {
        vungHienThi.innerHTML = `<div class="p-4"><p class="text-center py-10 text-slate-500 font-bold">Vui lòng chọn Tuần và Lớp để xem Sổ đầu bài.</p></div>`;
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
        // Thêm pr-7 để chữ không đè vào icon mũi tên, text-center để đẹp mắt hơn
        inputEl.className = 'w-full px-3 py-1.5 pr-7 border border-slate-400 rounded shadow-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors bg-white font-bold text-slate-800 placeholder-slate-400 cursor-pointer text-center';
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

    Array.from(selectEl.options).forEach((opt, index) => {
        if (index === 0 && opt.disabled) return; 
        
        let text = opt.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(term) || searchTerm === '') {
            hasMatch = true;
            let li = document.createElement('li');
            li.className = 'px-3 py-2 cursor-pointer transition-colors text-sm font-bold flex justify-between items-center';
            li.innerText = opt.text;
            
            // Dòng đang được chọn trong danh sách thả xuống
            if (opt.value === selectEl.value) {
                li.classList.add('bg-blue-50', 'text-blue-600', 'italic'); 
                li.innerHTML += `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            } else {
                li.classList.add('text-slate-700', 'hover:bg-blue-100');
            }

            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectEl.value = opt.value;
                listEl.classList.add('hidden');
                
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

    if (selectEl.value) {
        let opt = Array.from(selectEl.options).find(o => o.value === selectEl.value);
        if(opt) {
            inputEl.value = opt.text;
            // Áp dụng chữ xanh đậm khi đã được chọn
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
    
    // Khi tự gõ phím thì chữ phải rõ ràng, không bị mờ
    theInput.classList.remove('text-slate-400', 'opacity-60');
    theInput.classList.add('text-blue-700');

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
        trangThaiKhungChuKy.inputChuKy.classList.add('text-blue-700');
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
