// Biến toàn cục lưu trữ dữ liệu Khung chương trình
let danhSachLopKCT = [];
let duLieuBangKCT = [];

// ==========================================
// 1. KHỞI TẠO VÀ CHÈN GIAO DIỆN LÊN DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    khoiTaoMenuKhungChuongTrinh();
    khoiTaoGiaoDienKhungChuongTrinh();
});

function khoiTaoMenuKhungChuongTrinh() {
    const nav = document.querySelector('nav');
    if (nav && !document.getElementById('menuKhungChuongTrinh')) {
        const menuKCT = document.createElement('a');
        menuKCT.id = 'menuKhungChuongTrinh';
        menuKCT.href = 'javascript:void(0)';
        menuKCT.onclick = moTabKhungChuongTrinh;
        menuKCT.style.display = 'none'; // Ẩn mặc định, chờ cấp quyền từ app.js
        menuKCT.className = 'block px-6 py-4 hover:bg-menu-hover border-l-[5px] border-transparent transition-all cursor-pointer border-b border-white/10 group';
        menuKCT.innerHTML = `<span class="font-bold text-white group-hover:text-menu-active transition-colors text-[15px]">Khung chương trình (PA)</span>`;
        nav.appendChild(menuKCT);
    }
}

function capNhatQuyenMenuKhungChuongTrinh(coQuyen) {
    const menuKCT = document.getElementById('menuKhungChuongTrinh');
    if (menuKCT) {
        menuKCT.style.display = coQuyen ? 'block' : 'none';
    }
}

function khoiTaoGiaoDienKhungChuongTrinh() {
    const vungHienThiChinh = document.getElementById('vungHienThiChinh');
    if (vungHienThiChinh) {
        const khungKCT = document.createElement('div');
        khungKCT.id = 'khungKhungChuongTrinh';
        khungKCT.className = 'hidden p-4 w-full h-full flex-col font-sans bg-white reactbits-fade-in';
        khungKCT.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                <h2 class="text-xl font-extrabold text-blue-900 uppercase">Khung Chương Trình Môn Học</h2>
                <div class="flex flex-wrap gap-2">
                    <input type="file" id="fileNhapKCT" accept=".xlsx, .xls" style="display: none;" onchange="nhapExcelKCT(event)">
                    <button onclick="document.getElementById('fileNhapKCT').click()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 flex items-center gap-1 text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Nhập Excel
                    </button>
                    <button onclick="xuatExcelKCT()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 flex items-center gap-1 text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Xuất Excel
                    </button>
                    <button onclick="themDongKhungChuongTrinh()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 text-sm">
                        Thêm dòng
                    </button>
                    <button onclick="luuDuLieuKhungChuongTrinh(event)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 text-sm">
                        Lưu Khung CT
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-auto border border-gray-400 shadow-sm bg-white relative">
                <table id="bangKhungChuongTrinh" class="bang-excel w-full text-center">
                    <thead class="sticky top-0 z-40 bg-slate-200 text-slate-900 shadow-sm" id="tieuDeBangKCT">
                        <tr><th class="py-2">Đang thiết lập bảng dữ liệu...</th></tr>
                    </thead>
                    <tbody id="duLieuBangKCT">
                        <tr><td class="text-center py-10 text-slate-500 font-bold">Chưa tải dữ liệu...</td></tr>
                    </tbody>
                    <tfoot id="tongCongBangKCT" class="sticky bottom-0 z-40 shadow-[0_-2px_4px_rgba(0,0,0,0.1)]">
                    </tfoot>
                </table>
            </div>
        `;
        vungHienThiChinh.appendChild(khungKCT);
    }
}

function moTabKhungChuongTrinh() {
    // ĐIỀU CHỈNH: Bổ sung 'khungDanhMucGV' và 'khungCaiDat' vào mảng để hệ thống dọn dẹp màn hình
    const cacKhung = ['khungTKB', 'khungPhanCong', 'khungThongKe', 'khungKhungChuongTrinh', 'khungDanhMucGV', 'khungCaiDat'];
    cacKhung.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex', 'block'); }
    });

    let thanhCongCu = document.getElementById('thanhCongCuTKB');
    if (thanhCongCu) { 
        thanhCongCu.classList.remove('flex'); 
        thanhCongCu.classList.add('hidden'); 
    }

    const khungKCT = document.getElementById('khungKhungChuongTrinh');
    if (khungKCT) { khungKCT.classList.remove('hidden'); khungKCT.classList.add('flex'); }

    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('border-menu-active', 'bg-menu-hover');
        a.classList.add('border-transparent');
        const span = a.querySelector('span');
        if(span) { span.classList.remove('text-menu-active'); span.classList.add('text-white'); }
    });
    
    const menuKCT = document.getElementById('menuKhungChuongTrinh');
    if (menuKCT) {
        menuKCT.classList.add('border-menu-active', 'bg-menu-hover');
        menuKCT.classList.remove('border-transparent');
        const span = menuKCT.querySelector('span');
        if(span) { span.classList.add('text-menu-active'); span.classList.remove('text-white'); }
    }

    taiDuLieuKhungChuongTrinhTuMayChu();
}

async function taiDuLieuKhungChuongTrinhTuMayChu() {
    const tbody = document.getElementById('duLieuBangKCT');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="100%" class="text-center py-10 text-slate-500 font-bold"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải dữ liệu Khung chương trình...</td></tr>';
    }

    try {
        const phanHoi = await fetch(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layBanGhiKhungChuongTrinh`);
        const response = await phanHoi.json();
        
        const classTuDM = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP && thongSoHocVu.DANH_SACH_LOP.length > 0) 
                          ? thongSoHocVu.DANH_SACH_LOP 
                          : (response.classes || []);
        
        const classMap = response.classes || [];
        duLieuBangKCT = (response.data || []).map(row => {
            const newSoTiet = classTuDM.map(lop => {
                const oldIndex = classMap.indexOf(lop);
                return oldIndex !== -1 ? row.soTiet[oldIndex] : '';
            });
            return { monHoc: row.monHoc, uuTien: row.uuTien, soTiet: newSoTiet };
        });
        
        danhSachLopKCT = classTuDM;
        veBangKhungChuongTrinh();
    } catch (loi) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="100%" class="text-center py-10 text-red-500 font-bold">Đã xảy ra lỗi kết nối: ${loi}</td></tr>`;
    }
}

// ==========================================
// 3. VẼ BẢNG VÀ XỬ LÝ SỰ KIỆN GIAO DIỆN
// ==========================================
function veBangKhungChuongTrinh() {
    const thead = document.getElementById('tieuDeBangKCT');
    const tbody = document.getElementById('duLieuBangKCT');
    const tfoot = document.getElementById('tongCongBangKCT');
    if (!thead || !tbody) return;

    let chuoiThead = '<tr>';
    
    // Khai báo CSS chốt viền dưới sắc nét cho tiêu đề
    const cssChotVien = "p-2 border border-gray-400 !border-b-[2px] !border-b-slate-600";
    const shadowBottom = "!shadow-[0_2px_0_0_#475569]"; 
    const shadowBottomRight = "!shadow-[1px_2px_0_0_#475569]"; 
    
    // Cố định dọc bên trái đến hết cột Ưu tiên. Đã thu hẹp cột Ưu tiên thành w-20 min-w-[80px]
    chuoiThead += `<th class="w-28 min-w-[112px] ${cssChotVien} ${shadowBottom} bg-slate-200 sticky left-0 z-30">Điều chỉnh</th>`;
    chuoiThead += `<th class="w-48 min-w-[192px] ${cssChotVien} ${shadowBottom} bg-slate-200 sticky left-[112px] z-30">Môn học</th>`;
    chuoiThead += `<th class="w-20 min-w-[80px] ${cssChotVien} ${shadowBottomRight} bg-slate-200 sticky left-[304px] z-30">Ưu tiên</th>`;
    
    danhSachLopKCT.forEach(lop => {
        chuoiThead += `<th class="w-16 min-w-[64px] ${cssChotVien} ${shadowBottom} bg-blue-100">${lop}</th>`;
    });
    chuoiThead += '</tr>';
    thead.innerHTML = chuoiThead;

    // NÂNG CẤP: Dựng dòng tổng tiết cố định khớp chuẩn tọa độ sticky với tbody
    if (tfoot) {
        const cssChotVienTfoot = "p-2 border border-gray-400 !border-t-[2px] !border-t-slate-600";
        let chuoiTfoot = `<tr>`;
        chuoiTfoot += `<td class="w-28 min-w-[112px] ${cssChotVienTfoot} sticky left-0 z-30 bg-yellow-200"></td>`;
        chuoiTfoot += `<td class="w-48 min-w-[192px] ${cssChotVienTfoot} sticky left-[112px] z-30 bg-yellow-200 text-right uppercase text-blue-900 font-extrabold pr-4 text-xs">Tổng tiết / tuần:</td>`;
        chuoiTfoot += `<td class="w-20 min-w-[80px] ${cssChotVienTfoot} !shadow-[1px_0_0_0_#9ca3af] sticky left-[304px] z-30 bg-yellow-200"></td>`;
        
        danhSachLopKCT.forEach((lop, indexCot) => {
            chuoiTfoot += `<td id="tongTiet_KCT_${indexCot}" class="w-16 min-w-[64px] ${cssChotVienTfoot} text-center text-red-600 text-sm font-extrabold bg-yellow-50">0</td>`;
        });
        chuoiTfoot += `</tr>`;
        tfoot.innerHTML = chuoiTfoot;
    }

    tbody.innerHTML = '';
    if (duLieuBangKCT.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + danhSachLopKCT.length}" class="text-center py-6 text-slate-500">Chưa có dữ liệu. Vui lòng thêm dòng hoặc tải lên từ Excel.</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    duLieuBangKCT.forEach((dong, indexDong) => {
        let tr = document.createElement('tr');
        tr.className = 'hover:bg-yellow-50 transition-colors group';
        
        let cotThaoTac = `
            <td class="p-1.5 border border-gray-400 text-center bg-white sticky left-0 z-10 group-hover:bg-yellow-50">
                <div class="flex justify-center items-center gap-1.5">
                    <button onclick="diChuyenDongKCT(${indexDong}, -1)" class="p-1 bg-slate-100 hover:bg-blue-200 rounded border border-gray-300 shadow-sm text-slate-700" title="Lên trên">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                    </button>
                    <button onclick="diChuyenDongKCT(${indexDong}, 1)" class="p-1 bg-slate-100 hover:bg-blue-200 rounded border border-gray-300 shadow-sm text-slate-700" title="Xuống dưới">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </button>
                    <button onclick="xoaDongKhungChuongTrinh(${indexDong})" class="p-1 bg-slate-100 hover:bg-red-200 rounded border border-gray-300 shadow-sm text-red-600" title="Xóa môn">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </td>
        `;

        let cotMonHoc = `<td class="p-0 border border-gray-400 bg-white sticky left-[112px] z-10 group-hover:bg-yellow-50"><input type="text" class="w-full h-full px-3 py-2 outline-none focus:bg-blue-50 text-left font-semibold text-slate-800 bg-transparent" value="${dong.monHoc || ''}" onchange="capNhatGiaTriKCT(${indexDong}, 'monHoc', this.value)"></td>`;
        let cotUuTien = `<td class="p-0 border border-gray-400 bg-white sticky left-[304px] z-10 group-hover:bg-yellow-50 shadow-[1px_0_0_0_#9ca3af]"><input type="number" class="w-full h-full px-2 py-2 outline-none text-center focus:bg-blue-50 font-semibold text-slate-800 bg-transparent" value="${dong.uuTien || ''}" onchange="capNhatGiaTriKCT(${indexDong}, 'uuTien', this.value)"></td>`;

        let cotCacLop = '';
        danhSachLopKCT.forEach((lop, indexCot) => {
            let giaTriTiet = dong.soTiet[indexCot] !== undefined ? dong.soTiet[indexCot] : '';
            cotCacLop += `<td class="p-0 border border-gray-400"><input type="number" class="w-full h-full px-1 py-2 outline-none text-center focus:bg-blue-50 text-slate-700 bg-transparent" value="${giaTriTiet}" onchange="capNhatSoTietKCT(${indexDong}, ${indexCot}, this.value)"></td>`;
        });

        tr.innerHTML = cotThaoTac + cotMonHoc + cotUuTien + cotCacLop;
        tbody.appendChild(tr);
    });

    tinhTongTietKCT(); // Tự động tính tổng tiết ngay sau khi nạp cấu trúc lưới
}

// ==========================================
// 4. CÁC HÀM XỬ LÝ LOGIC DỮ LIỆU
// ==========================================
function capNhatGiaTriKCT(indexDong, truong, giaTri) { duLieuBangKCT[indexDong][truong] = giaTri; }

function capNhatSoTietKCT(indexDong, indexCot, giaTri) {
    let soTiet = parseInt(giaTri, 10);
    duLieuBangKCT[indexDong].soTiet[indexCot] = isNaN(soTiet) ? '' : soTiet;
    tinhTongTietKCT(); // Tính lại tổng tiết thời gian thực khi ô số liệu thay đổi
}

function tinhTongTietKCT() {
    if (danhSachLopKCT.length === 0 || duLieuBangKCT.length === 0) return;
    
    let tongCot = new Array(danhSachLopKCT.length).fill(0);
    
    duLieuBangKCT.forEach(dong => {
        dong.soTiet.forEach((tiet, idx) => {
            let gt = parseInt(tiet, 10);
            if (!isNaN(gt)) {
                tongCot[idx] += gt;
            }
        });
    });
    
    danhSachLopKCT.forEach((lop, idx) => {
        let cell = document.getElementById(`tongTiet_KCT_${idx}`);
        if (cell) {
            cell.innerText = tongCot[idx];
        }
    });
}

function themDongKhungChuongTrinh() {
    if (danhSachLopKCT.length === 0) {
        danhSachLopKCT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP) ? thongSoHocVu.DANH_SACH_LOP : ['1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C','5A','5B','5C'];
    }
    duLieuBangKCT.push({ monHoc: '', uuTien: '', soTiet: new Array(danhSachLopKCT.length).fill('') });
    veBangKhungChuongTrinh();
    
    setTimeout(() => {
        const tbody = document.getElementById('duLieuBangKCT');
        if (tbody && tbody.lastElementChild) {
            tbody.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const inputDauTien = tbody.lastElementChild.querySelector('input');
            if (inputDauTien) inputDauTien.focus();
        }
    }, 150);
}

function xoaDongKhungChuongTrinh(indexDong) {
    if(confirm('Đồng chí có chắc chắn muốn xóa môn học này khỏi khung chương trình không?')) {
        duLieuBangKCT.splice(indexDong, 1);
        veBangKhungChuongTrinh();
    }
}

function diChuyenDongKCT(indexDong, huong) {
    if (huong === -1 && indexDong > 0) {
        let tam = duLieuBangKCT[indexDong];
        duLieuBangKCT[indexDong] = duLieuBangKCT[indexDong - 1];
        duLieuBangKCT[indexDong - 1] = tam;
        veBangKhungChuongTrinh();
    } else if (huong === 1 && indexDong < duLieuBangKCT.length - 1) {
        let tam = duLieuBangKCT[indexDong];
        duLieuBangKCT[indexDong] = duLieuBangKCT[indexDong + 1];
        duLieuBangKCT[indexDong + 1] = tam;
        veBangKhungChuongTrinh();
    }
}

// ==========================================
// 5. CHỨC NĂNG TẢI EXCEL (.XLSX) QUA SHEETJS
// ==========================================
function xuatExcelKCT() {
    if (duLieuBangKCT.length === 0) { alert("Không có dữ liệu để xuất."); return; }
    if (typeof XLSX === 'undefined') { alert("Hệ thống chưa nạp xong thư viện Excel, vui lòng đợi vài giây."); return; }
    
    let header = ["Môn học", "Ưu tiên"].concat(danhSachLopKCT);
    let rowsArr = [header];
    
    duLieuBangKCT.forEach(dong => {
        let row = [dong.monHoc || '', dong.uuTien || ''];
        danhSachLopKCT.forEach((lop, idx) => {
            row.push(dong.soTiet[idx] !== undefined ? dong.soTiet[idx] : '');
        });
        rowsArr.push(row);
    });
    
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(rowsArr);
    XLSX.utils.book_append_sheet(wb, ws, "KhungChuongTrinh");
    XLSX.writeFile(wb, `KhungChuongTrinh_KCT.xlsx`);
}

function nhapExcelKCT(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert("Thư viện giải mã Excel chưa sẵn sàng."); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const rowsArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (rowsArr.length < 2) { alert("Bảng Excel trống hoặc thiếu dữ liệu tiêu đề."); return; }
            
            let fileClasses = [];
            let firstRow = rowsArr[0];
            for (let i = 2; i < firstRow.length; i++) {
                if (firstRow[i]) fileClasses.push(firstRow[i].toString().trim());
            }
            
            let newData = [];
            for (let i = 1; i < rowsArr.length; i++) {
                let cells = rowsArr[i];
                if (!cells || cells.length < 1) continue;
                
                let monHoc = cells[0] !== undefined ? cells[0].toString().trim() : '';
                let uuTien = cells[1] !== undefined ? cells[1].toString().trim() : '';
                if (!monHoc) continue;
                
                let soTietFile = fileClasses.map((lop, index) => {
                    return cells[index + 2] !== undefined ? cells[index + 2].toString().trim() : '';
                });
                
                let mappedSoTiet = danhSachLopKCT.map(lop => {
                    let idx = fileClasses.indexOf(lop);
                    return idx !== -1 ? soTietFile[idx] : '';
                });
                
                newData.push({ monHoc: monHoc, uuTien: uuTien, soTiet: mappedSoTiet });
            }
            
            duLieuBangKCT = newData;
            veBangKhungChuongTrinh();
            alert("Đã phân tích cấu trúc file .xlsx thành công! Vui lòng kiểm tra lại dữ liệu và nhấn nút 'Lưu Khung CT' để gửi lên máy chủ.");
        } catch (loi) {
            alert("Lỗi đọc dữ liệu tệp XLSX: " + loi.message);
        } finally {
            event.target.value = ''; // Xóa trạng thái input file
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
// 6. ĐỒNG BỘ DỮ LIỆU LÊN MÁY CHỦ BẰNG POST FETCH
// ==========================================
async function luuDuLieuKhungChuongTrinh(event) {
    const nutBam = event.currentTarget;
    const noiDungGoc = nutBam.innerHTML;
    
    nutBam.innerHTML = `<div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Đang đồng bộ...</span>
                        </div>`;
    nutBam.disabled = true;
    nutBam.classList.replace('bg-blue-600', 'bg-slate-500');

    const duLieuDongBo = {
        classes: danhSachLopKCT,
        data: duLieuBangKCT
    };

    try {
        const payload = { thaoTac: 'luuBanGhiKhungChuongTrinh', duLieu: duLieuDongBo };
        const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') {
            alert('Đã đồng bộ Khung chương trình lên máy chủ thành công!');
        } else {
            alert('Lỗi từ máy chủ: ' + (ketQua.thongBao || 'Không xác định.'));
        }
    } catch (loi) {
        alert('Lỗi kết nối mạng trong quá trình đồng bộ: ' + loi);
    } finally {
        nutBam.innerHTML = noiDungGoc;
        nutBam.disabled = false;
        nutBam.classList.replace('bg-slate-500', 'bg-blue-600');
    }
}
