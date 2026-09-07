// =========================================================================
// KHỐI QUẢN LÝ MA TRẬN PHÂN QUYỀN (TẠO ĐỘNG GIAO DIỆN & LOGIC)
// File: PhanQuyenAdmin.js
// =========================================================================
let duLieuBangPhanQuyen = [];

const DANH_SACH_MENU_HE_THONG = [
    {id: 'menuCaiDat', ten: '1. Cài đặt'}, {id: 'menuDanhMucGV', ten: '2. DM Giáo viên'},
    {id: 'menuDanhMucLop', ten: '3. DM Lớp'}, {id: 'menuKhungChuongTrinh', ten: '4. Khung CT'},
    {id: 'menuPhanCong', ten: '5. Phân công'}, {id: 'menuDanhMucSGK', ten: '6. DM SGK'},
    {id: 'menuPhanQuyen', ten: '7. Phân quyền'}
];

const DANH_SACH_NUT_CHUC_NANG = [
    {id: 'btnLuuTuan', ten: 'Lưu TKB Tuần'}, {id: 'btnLuuCoDinh', ten: 'Lưu TKB Cố Định'},
    {id: 'btnKhoiPhuc', ten: 'Khôi phục/Tuần mới'}, {id: 'btnXepTuDong', ten: 'Xếp tự động'},
    {id: 'btnKiemTra', ten: 'Kiểm tra chuẩn'}
];

// Khởi tạo và Bơm Giao diện vào index.html lúc tải trang
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    const vungChinh = document.getElementById('vungHienThiChinh');
    
    // 1. Chèn Menu
    if (nav && !document.getElementById('menuPhanQuyen')) {
        const menuHtml = `
            <a id="menuPhanQuyen" onclick="moTabPhanQuyenChuyenDung()" style="display: none;" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/10 transition-all duration-150 cursor-pointer group">
                <svg class="w-5 h-5 flex-none opacity-70 group-hover:opacity-100 transition-opacity text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M8 11l3 3 5-5"></path></svg>
                <span class="font-bold text-white/80 group-hover:text-white transition-colors text-[14px] whitespace-nowrap">7. Phân quyền Hệ thống</span>
            </a>`;
        nav.insertAdjacentHTML('beforeend', menuHtml);
    }

    // 2. Chèn Khung hiển thị
    if (vungChinh && !document.getElementById('khungPhanQuyen')) {
        const khungHtml = `
            <div id="khungPhanQuyen" class="hidden p-4 w-full h-full flex-col font-sans">
                <div class="flex justify-between items-center mb-4 flex-none">
                    <h2 class="text-xl font-extrabold text-blue-900 uppercase">MA TRẬN PHÂN QUYỀN HỆ THỐNG</h2>
                    <div class="flex items-center gap-2">
                        <button onclick="taiDuLieuPhanQuyenTuMayChu()" class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 text-sm shadow transition duration-200 rounded flex items-center gap-1.5">
                            Tải lại
                        </button>
                        <button onclick="themDongPhanQuyenMoi()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-sm shadow transition duration-200 rounded flex items-center gap-1.5">
                            + Cấp quyền mới
                        </button>
                        <button onclick="luuDuLieuPhanQuyenSangMayChu()" class="bg-blue-700 hover:bg-blue-800 text-white font-bold px-5 py-2 text-sm shadow transition duration-200 rounded flex items-center gap-1.5">
                            Lưu Hệ Thống
                        </button>
                    </div>
                </div>
                <div class="overflow-auto border border-gray-400 shadow-sm bg-white relative flex-1">
                    <table class="bang-excel w-full min-w-[1000px]">
                        <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 shadow-sm text-center">
                            <tr>
                                <th class="py-2 w-56">Tài khoản (Định danh)</th>
                                <th class="py-2">Phân quyền Lớp học</th>
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
    
    // 3. Gắn nối vào hệ thống phân quyền của app.js
    if (typeof kiemSoatGiaoDien === 'function') {
        const kiemSoatGoc = kiemSoatGiaoDien;
        window.kiemSoatGiaoDien = function() {
            kiemSoatGoc();
            let menuPQ = document.getElementById('menuPhanQuyen');
            if (menuPQ) {
                let duocXem = (typeof quyenSuaChua !== 'undefined' && quyenSuaChua) || (typeof quyenChiTiet !== 'undefined' && quyenChiTiet.menuDuocXem.includes('menuPhanQuyen'));
                menuPQ.style.display = duocXem ? 'flex' : 'none';
            }
        };
    }
});

// Hàm gọi độc lập không can thiệp vào kichHoatTab gốc
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
        duLieuBangPhanQuyen = await phanHoi.json();
        if (duLieuBangPhanQuyen.trangThai === 'loi_he_thong') throw new Error(duLieuBangPhanQuyen.thongBao);
        
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

            html += `<tr class="dong-phan-quyen bg-white hover:bg-slate-50 transition-colors" data-index="${index}">
                <td class="p-2 align-top">
                    <input type="text" value="${taiKhoan}" placeholder="Nhập định danh truy cập..." class="input-tai-khoan w-full border border-blue-400 rounded px-2 py-1.5 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500">
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
        if(khung) khung.scrollTop = khung.scrollHeight;
    }, 50);
}

function xoaDongPhanQuyen(btn) {
    if(!confirm("Đồng chí chắc chắn muốn thu hồi phân quyền của định danh này?")) return;
    let tr = btn.closest('tr');
    let index = parseInt(tr.getAttribute('data-index'));
    if(!isNaN(index)) {
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
    let textGoc = btnLuu.innerHTML;
    btnLuu.innerHTML = "Đang xử lý..."; btnLuu.disabled = true;

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
        alert("Có sự cố kết nối máy chủ.");
    } finally {
        btnLuu.innerHTML = textGoc; btnLuu.disabled = false;
    }
}