// =========================================================================
// LÕI THUẬT TOÁN QUẢN LÝ DANH MỤC SGK 
// Thiết kế và phát triển Hoàng Ngọc Lâm
// [Nâng cấp]: Bổ sung tính năng di chuyển (Lên/Xuống) để sắp xếp trật tự Môn học
// [Nâng cấp mới]: Tự động sinh thẻ datalist để hiển thị danh sách chọn môn học đồng bộ từ KHUNG_CHUONG_TRINH
// =========================================================================

let dangTaiDuLieuSGK = false; 
let dangLuuDuLieuSGK = false; 
let DANH_SACH_MON_CHUAN = []; // [NÂNG CẤP]: Mảng lưu dữ liệu đối chiếu từ máy chủ

async function taiLaiDuLieuDanhMucSGK() {
    if (dangTaiDuLieuSGK) return; 
    dangTaiDuLieuSGK = true;

    const nutTai = document.getElementById('btnTaiLaiDanhMuc');
    const htmlGoc = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Tải lại`;
    
    if (nutTai) {
        nutTai.innerHTML = `<div class="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div> Đang tải...`;
    }
    
    try {
        const fetchFunc = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;
        const phanHoi = await fetchFunc(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucSGKToanBo`);
        
        if (!phanHoi.ok) throw new Error("Máy chủ từ chối kết nối.");
        
        const duLieu = await phanHoi.json();
        
        // [NÂNG CẤP QUAN TRỌNG]: Tự động tạo thẻ datalist nếu giao diện HTML chưa có
        let datalist = document.getElementById('danhSachMonHocSGK');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'danhSachMonHocSGK';
            document.body.appendChild(datalist);
        }
        
        if (datalist) {
            datalist.innerHTML = ''; 
            if (duLieu.monHoc && Array.isArray(duLieu.monHoc) && duLieu.monHoc.length > 0) {
                // Lưu lại mảng chuẩn để kiểm tra tính hợp lệ khi người dùng gõ tay
                DANH_SACH_MON_CHUAN = duLieu.monHoc.map(m => String(m).trim()).filter(Boolean);
                
                // Đẩy dữ liệu vào danh sách xổ xuống
                DANH_SACH_MON_CHUAN.forEach(mon => {
                    datalist.insertAdjacentHTML('beforeend', `<option value="${mon}">`);
                });
            }
        }

        const tbody = document.getElementById('danhSachDongDuLieuSGK');
        if (tbody) {
            tbody.innerHTML = '';
            const mangSGK = duLieu.sgk || [];
            if (Array.isArray(mangSGK) && mangSGK.length > 1) {
                for (let i = 1; i < mangSGK.length; i++) {
                    let khoi = mangSGK[i][0] ? String(mangSGK[i][0]).trim() : '';
                    let mon = mangSGK[i][1] ? String(mangSGK[i][1]).trim() : '';
                    let link1 = mangSGK[i][2] ? String(mangSGK[i][2]).trim() : '';
                    let link2 = mangSGK[i][3] ? String(mangSGK[i][3]).trim() : '';
                    taoDongGiaoDienDuLieu(khoi, mon, link1, link2);
                }
            } else {
                themDongMoiDanhMucSGK(); 
            }
        }
    } catch (loi) {
        console.error("Lỗi lấy danh mục SGK:", loi);
        if (nutTai) nutTai.innerHTML = `<span class="text-red-600 font-bold">Lỗi mạng!</span>`;
        await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
        if (nutTai && nutTai.innerHTML.includes("Đang tải")) {
            nutTai.innerHTML = htmlGoc;
        }
        dangTaiDuLieuSGK = false; 
    }
}

// [NÂNG CẤP]: Hàm tự động so khớp, chuyển định dạng và cảnh báo theo Khung chương trình
function dongBoVoiKhungChuongTrinh(input) {
    let giaTri = input.value.trim();
    if (!giaTri) {
        input.classList.remove('text-red-500');
        input.classList.add('text-slate-800');
        return;
    }
    
    let giaTriThuong = giaTri.toLowerCase();
    let monChuan = DANH_SACH_MON_CHUAN.find(m => m.toLowerCase() === giaTriThuong);
    
    if (monChuan) {
        input.value = monChuan; 
        input.classList.remove('text-red-500');
        input.classList.add('text-slate-800');
        input.title = "Đã đồng bộ Khung chương trình";
    } else {
        input.classList.remove('text-slate-800');
        input.classList.add('text-red-500');
        input.title = "Cảnh báo: Môn học chưa khớp với cột A2:A sheet KHUNG_CHUONG_TRINH";
    }
}

function taoDongGiaoDienDuLieu(khoi = '', mon = '', link1 = '', link2 = '') {
    const tbody = document.getElementById('danhSachDongDuLieuSGK');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = "hover:bg-blue-50/60 transition-colors dong-nhap-lieu-sgk";
    
    // [CẬP NHẬT GIAO DIỆN]: Bổ sung onblur="dongBoVoiKhungChuongTrinh(this)" vào thanh nhập môn
    tr.innerHTML = `
        <td class="px-2 py-2 text-center"><input type="text" class="w-full text-center bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white outline-none py-1 font-bold text-slate-700" value="${khoi}" placeholder="VD: 3"></td>
        <td class="px-2 py-2"><input type="text" list="danhSachMonHocSGK" class="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white outline-none py-1 font-semibold text-slate-800 cursor-pointer transition-colors duration-300" value="${mon}" placeholder="Nhấp đúp chọn môn..." onfocus="this.select()" onblur="dongBoVoiKhungChuongTrinh(this)"></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white outline-none py-1 text-blue-600 font-mono text-xs" value="${link1}" placeholder="Link Google Drive Kỳ 1..."></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white outline-none py-1 text-blue-600 font-mono text-xs" value="${link2}" placeholder="Link Google Drive Kỳ 2..."></td>
        <td class="px-2 py-2">
            <div class="flex items-center justify-center gap-1">
                <button onclick="diChuyenDong(this, -1)" class="text-blue-500 hover:text-blue-700 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition" title="Di chuyển lên"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg></button>
                <button onclick="diChuyenDong(this, 1)" class="text-blue-500 hover:text-blue-700 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition" title="Di chuyển xuống"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg></button>
                <button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600 p-1.5 bg-red-50 hover:bg-red-100 rounded transition" title="Xóa dòng này"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
        </td>
    `;
    tbody.appendChild(tr);
}

// [TÍNH NĂNG MỚI]: Thuật toán đảo vị trí các dòng HTML DOM
function diChuyenDong(btn, huong) {
    const dongHienTai = btn.closest('tr');
    const tbody = dongHienTai.parentNode;
    
    if (huong === -1 && dongHienTai.previousElementSibling) {
        // Đưa lên trên (Chèn dòng hiện tại lên trước dòng nằm phía trên nó)
        tbody.insertBefore(dongHienTai, dongHienTai.previousElementSibling);
    } else if (huong === 1 && dongHienTai.nextElementSibling) {
        // Đưa xuống dưới (Chèn dòng bên dưới lên trước dòng hiện tại)
        tbody.insertBefore(dongHienTai.nextElementSibling, dongHienTai);
    }
}

function themDongMoiDanhMucSGK() {
    taoDongGiaoDienDuLieu('', '', '', '');
    const khungChua = document.getElementById('danhSachDongDuLieuSGK').parentElement.parentElement;
    setTimeout(() => { khungChua.scrollTop = khungChua.scrollHeight; }, 50);
}

async function luuDongBoDanhMucSGK() {
    if (dangLuuDuLieuSGK) return; 
    dangLuuDuLieuSGK = true;

    const nutLuu = document.getElementById('btnLuuDanhMuc');
    const htmlGoc = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Lưu Hệ Thống`;
    
    if (nutLuu) {
        nutLuu.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang lưu...`;
        nutLuu.disabled = true;
    }

    let mangDuLieuGoiDi = [];
    document.querySelectorAll('.dong-nhap-lieu-sgk').forEach(dong => {
        const cacOInput = dong.querySelectorAll('input');
        let khoi = cacOInput[0].value.trim();
        let mon = cacOInput[1].value.trim();
        let link1 = cacOInput[2].value.trim();
        let link2 = cacOInput[3].value.trim();
        if (khoi !== '' && mon !== '') mangDuLieuGoiDi.push([khoi, mon, link1, link2]);
    });

    try {
        const fetchFunc = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;
        const phanHoi = await fetchFunc(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ thaoTac: 'luuCapNhatDanhMucSGK', duLieuBang: mangDuLieuGoiDi })
        });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'thanh_cong') {
            alert("THÔNG BÁO: Đã đồng bộ thành công!");
            if (typeof boNhoHocLieuSGK !== 'undefined') boNhoHocLieuSGK = {}; 
        } else {
            alert("Lưu thất bại: " + ketQua.thongBao);
        }
    } catch (loi) {
        console.error(loi);
        alert("Sự cố đường truyền: Không thể gửi lệnh lưu lên máy chủ. Bạn hãy tải lại trang và thử lại.");
    } finally {
        if (nutLuu) {
            nutLuu.innerHTML = htmlGoc;
            nutLuu.disabled = false;
        }
        dangLuuDuLieuSGK = false; 
    }
}
