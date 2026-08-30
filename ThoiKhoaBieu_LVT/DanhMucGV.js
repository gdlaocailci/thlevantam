let duLieuDanhMucGV = [];
const TIEU_DE_DM_GV = ['MaGV', 'HoTen', 'ToChuyenMon', 'DinhMucTuan', 'TrangThai'];

// Kích hoạt menu khi kiểm soát giao diện
document.addEventListener('DOMContentLoaded', () => {
      let checkQuyen = setInterval(() => {
        if (typeof quyenSuaChua !== 'undefined') {
            let menuDM = document.getElementById('menuDanhMucGV');
            // Thay đổi 'block' thành 'flex'
            if (menuDM) {
                menuDM.style.display = quyenSuaChua ? 'flex' : 'none';
            }
        }
    }, 1000);
});

async function taiDuLieuDanhMucGV() {
    const tbody = document.getElementById('vungDuLieuDanhMucGV');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-500 font-bold"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải Danh mục Giáo viên...</td></tr>`;
    
    try {
        const phanHoi = await fetch(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucGV`);
        const duLieuS = await phanHoi.json();
        
        duLieuDanhMucGV = [];
        if (duLieuS && duLieuS.length > 1) {
            // Cắt bỏ dòng tiêu đề, chỉ lấy thân dữ liệu
            for (let i = 1; i < duLieuS.length; i++) {
                duLieuDanhMucGV.push({
                    maGv: duLieuS[i][0] || '',
                    hoTen: duLieuS[i][1] || '',
                    toChuyenMon: duLieuS[i][2] || '',
                    dinhMuc: duLieuS[i][3] || '',
                    trangThai: duLieuS[i][4] || 'Đang công tác'
                });
            }
        }
        veBangDanhMucGV();
    } catch (loi) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-600 font-bold">Lỗi kết nối máy chủ dữ liệu.</td></tr>`;
    }
}

function veBangDanhMucGV() {
    const tbody = document.getElementById('vungDuLieuDanhMucGV');
    if (duLieuDanhMucGV.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-500 font-bold italic">Danh sách đang trống. Hãy thêm giáo viên mới hoặc Nhập từ Excel.</td></tr>`;
        return;
    }

    let html = '';
    duLieuDanhMucGV.forEach((gv, index) => {
        let optionsTrangThai = `
            <option value="Đang công tác" ${gv.trangThai === 'Đang công tác' ? 'selected' : ''}>Đang công tác</option>
            <option value="Nghỉ chế độ" ${gv.trangThai === 'Nghỉ chế độ' ? 'selected' : ''}>Nghỉ chế độ</option>
            <option value="Đã chuyển công tác" ${gv.trangThai === 'Đã chuyển công tác' ? 'selected' : ''}>Đã chuyển công tác</option>
        `;

        html += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-1 px-2 border border-gray-300 font-bold text-slate-500">${index + 1}</td>
            <td class="p-0 border border-gray-300"><input type="text" value="${gv.maGv}" onchange="capNhatGv(${index}, 'maGv', this.value)" class="w-full h-full min-h-[30px] px-2 outline-none bg-transparent text-center font-bold text-blue-900"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${gv.hoTen}" onchange="capNhatGv(${index}, 'hoTen', this.value)" class="w-full h-full min-h-[30px] px-2 outline-none bg-transparent text-left font-semibold text-slate-800"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${gv.toChuyenMon}" onchange="capNhatGv(${index}, 'toChuyenMon', this.value)" class="w-full h-full min-h-[30px] px-2 outline-none bg-transparent text-center"></td>
            <td class="p-0 border border-gray-300"><input type="number" value="${gv.dinhMuc}" onchange="capNhatGv(${index}, 'dinhMuc', this.value)" class="w-full h-full min-h-[30px] px-2 outline-none bg-transparent text-center font-bold text-purple-700"></td>
            <td class="p-0 border border-gray-300">
                <select onchange="capNhatGv(${index}, 'trangThai', this.value)" class="w-full h-full min-h-[30px] outline-none bg-transparent text-center cursor-pointer ${gv.trangThai === 'Đang công tác' ? 'text-green-700 font-bold' : 'text-gray-500 italic'}">
                    ${optionsTrangThai}
                </select>
            </td>
            <td class="py-1 px-2 border border-gray-300 space-x-1">
                <button onclick="dichChuyenGv(${index}, -1)" title="Lên" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-1 rounded leading-none transition">▲</button>
                <button onclick="dichChuyenGv(${index}, 1)" title="Xuống" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-1 rounded leading-none transition">▼</button>
                <button onclick="xoaGv(${index})" title="Xoá" class="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded leading-none transition ml-1">✕</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// Logic thao tác dòng (Đã tích hợp kiểm soát chống trùng Mã GV)
function capNhatGv(index, truong, giaTri) { 
    if (truong === 'maGv') {
        let maMoi = giaTri.trim();
        
        if (maMoi !== '') {
            // Kiểm tra xem mã mới có trùng với bất kỳ giáo viên nào khác trong danh sách không
            let biTrung = duLieuDanhMucGV.some((gv, idx) => idx !== index && gv.maGv.trim().toLowerCase() === maMoi.toLowerCase());
            
            if (biTrung) {
                alert(`⚠️ LỖI DỮ LIỆU:\nMã giáo viên "${maMoi}" đã tồn tại trong hệ thống. Vui lòng nhập một mã khác để tránh xung đột thuật toán xếp lịch!`);
                veBangDanhMucGV(); // Cập nhật lại giao diện để khôi phục giá trị cũ hợp lệ
                return; // Ngừng thực thi, không cho phép ghi đè
            }
        }
        
        // Nếu không trùng thì mới cho phép cập nhật vào bộ nhớ
        duLieuDanhMucGV[index][truong] = maMoi; 
    } else {
        duLieuDanhMucGV[index][truong] = giaTri; 
    }
}
function themDongGiaoVienMoi() { duLieuDanhMucGV.push({ maGv: '', hoTen: '', toChuyenMon: 'Tiểu học', dinhMuc: '', trangThai: 'Đang công tác' }); veBangDanhMucGV(); }
function xoaGv(index) { if (confirm("Đồng chí có chắc chắn muốn xoá giáo viên này khỏi danh mục?")) { duLieuDanhMucGV.splice(index, 1); veBangDanhMucGV(); } }
function dichChuyenGv(index, huong) {
    if (index + huong < 0 || index + huong >= duLieuDanhMucGV.length) return;
    let tam = duLieuDanhMucGV[index];
    duLieuDanhMucGV[index] = duLieuDanhMucGV[index + huong];
    duLieuDanhMucGV[index + huong] = tam;
    veBangDanhMucGV();
}

// Đồng bộ lưu trữ
async function luuDuLieuDanhMucGVSangMayChu() {
    const btn = document.querySelector('#khungDanhMucGV button[onclick="luuDuLieuDanhMucGVSangMayChu()"]');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `Đang lưu...`; btn.disabled = true;

    try {
        let mangGhi = [TIEU_DE_DM_GV]; // Đẩy dòng tiêu đề lên đầu
        duLieuDanhMucGV.forEach(gv => {
            if (gv.maGv.trim() !== '') {
                mangGhi.push([gv.maGv, gv.hoTen, gv.toChuyenMon, gv.dinhMuc, gv.trangThai]);
            }
        });

        const payload = { thaoTac: 'luuDanhMucGV', duLieu: mangGhi };
        const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') { alert("Đã đồng bộ Danh mục Giáo viên lên hệ thống an toàn!"); } 
        else { alert("Lỗi từ máy chủ: " + ketQua.thongBao); }
    } catch(loi) { alert("Lỗi kết nối mạng hoặc máy chủ."); } 
    finally { btn.innerHTML = textGoc; btn.disabled = false; }
}

// Xuất Nhập Excel bằng SheetJS
function xuatExcelDanhMucGV() {
    if (typeof XLSX === 'undefined') { alert("Thư viện Excel chưa sẵn sàng."); return; }
    let mangXuat = [TIEU_DE_DM_GV];
    duLieuDanhMucGV.forEach(gv => { mangXuat.push([gv.maGv, gv.hoTen, gv.toChuyenMon, gv.dinhMuc, gv.trangThai]); });
    
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(mangXuat);
    
    // Căn chỉnh độ rộng cột
    ws['!cols'] = [{wch: 10}, {wch: 25}, {wch: 20}, {wch: 15}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, ws, "DM_GIAOVIEN");
    XLSX.writeFile(wb, "DanhMucGiaoVien.xlsx");
}

// =========================================================================
// NÂNG CẤP: NHẬP EXCEL DANH MỤC GIÁO VIÊN LÊN GIAO DIỆN (UI)
// =========================================================================
function nhapExcelDanhMucGV(e) {
    if (typeof XLSX === 'undefined') { 
        alert("Thư viện Excel chưa sẵn sàng. Đồng chí vui lòng thử lại sau vài giây."); 
        return; 
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Ép defval: '' để không bị lỗi undefined khi ô Excel bị bỏ trống
            const duLieuExcel = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (duLieuExcel.length < 2) {
                alert("Bảng Excel trống hoặc thiếu dòng tiêu đề.");
                return;
            }
            
            let ghiDe = confirm("Đồng chí muốn XÓA TRẮNG danh sách hiện tại để nạp mới (OK), hay THÊM NỐI TIẾP vào danh sách cũ (Cancel)?");
            if (ghiDe) duLieuDanhMucGV = []; // Xóa trắng mảng UI

            let soGvBiTrung = 0;

            for (let i = 1; i < duLieuExcel.length; i++) {
                let row = duLieuExcel[i];
                let maGvMoi = row[0] ? String(row[0]).trim() : '';
                
                if (maGvMoi !== '') {
                    // Chặn trùng mã GV nếu chọn chế độ nối tiếp
                    let biTrung = duLieuDanhMucGV.some(gv => gv.maGv.trim().toLowerCase() === maGvMoi.toLowerCase());
                    if (biTrung && !ghiDe) {
                        soGvBiTrung++;
                        continue; // Bỏ qua dòng này, chuyển sang dòng tiếp theo
                    }

                    // Ép kiểu định mức về số nguyên, tránh lỗi logic xếp lịch sau này
                    let dinhMuc = row[3] !== '' && !isNaN(row[3]) ? parseInt(row[3], 10) : '';

                    duLieuDanhMucGV.push({
                        maGv: maGvMoi,
                        hoTen: row[1] ? String(row[1]).trim() : '',
                        toChuyenMon: row[2] ? String(row[2]).trim() : 'Tiểu học',
                        dinhMuc: dinhMuc,
                        trangThai: row[4] ? String(row[4]).trim() : 'Đang công tác'
                    });
                }
            }
            
            // Render dữ liệu mới lên UI ngay lập tức
            veBangDanhMucGV();
            
            let thongBao = "Nạp dữ liệu từ Excel lên giao diện thành công!";
            if (soGvBiTrung > 0) {
                thongBao += `\nĐã tự động bỏ qua ${soGvBiTrung} giáo viên bị trùng mã.`;
            }
            thongBao += "\nĐồng chí vui lòng kiểm tra lại bảng và bấm 'Lưu...' để đưa lên hệ thống.";
            
            alert(thongBao);
        } catch (loi) { 
            alert("Lỗi khi đọc file Excel: " + loi.message); 
        } finally { 
            e.target.value = ''; // Giải phóng input để tải lại được file cùng tên
        }
    };
    reader.readAsArrayBuffer(file);
}

// BỘ ĐIỀU HƯỚNG TAB CHUYÊN DỤNG (Chống kẹt UI)
function moTabDanhMucGV() {
    // 1. Tắt active các menu cũ
    const cacMenu = ['menuTKB', 'menuThongKe', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucGV'];
    cacMenu.forEach(id => {
        let m = document.getElementById(id);
        if (m) {
            m.classList.remove('bg-menu-hover', 'border-menu-active');
            m.classList.add('border-transparent');
            let span = m.querySelector('span');
            if (span) { span.classList.remove('text-menu-active'); span.classList.add('text-white'); }
        }
    });
    
    // 2. Bật active menu Danh mục
    let mActive = document.getElementById('menuDanhMucGV');
    if (mActive) {
        mActive.classList.remove('border-transparent');
        mActive.classList.add('bg-menu-hover', 'border-menu-active');
        let spanActive = mActive.querySelector('span');
        if (spanActive) { spanActive.classList.remove('text-white'); spanActive.classList.add('text-menu-active'); }
    }

    // 3. Ẩn tất cả các khung khác
    ['khungTKB', 'khungThongKe', 'khungPhanCong', 'khungKhungChuongTrinh'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { el.classList.remove('block', 'flex'); el.classList.add('hidden'); }
    });
    
    // Ẩn thanh công cụ TKB
    let thanhCongCu = document.getElementById('thanhCongCuTKB');
    if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }

    // 4. Hiện khung Danh mục
    let khungDmgv = document.getElementById('khungDanhMucGV');
    if (khungDmgv) { khungDmgv.classList.remove('hidden'); khungDmgv.classList.add('flex'); }

    // Tải dữ liệu ngay khi mở tab
    taiDuLieuDanhMucGV();
}

/**
 * ⚠️ LƯU Ý KẾT NỐI HỆ THỐNG GỐC: 
 * Để hệ thống có thể chuyển từ Danh Mục GV về lại các tab khác (TKB, Phân Công, v.v.),
 * đồng chí cần thêm chuỗi: 
 * let kDM = document.getElementById('khungDanhMucGV'); if (kDM) { kDM.classList.remove('flex', 'block'); kDM.classList.add('hidden'); }
 * vào các hàm moTabTKB(), moTabPhanCong(), moTabThongKe() trong các file js cũ.
 */
