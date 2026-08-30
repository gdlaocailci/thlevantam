let duLieuDanhMucLop = [];
const TIEU_DE_DM_LOP = ['MaLop', 'TenLop'];

// Đã loại bỏ vòng lặp DOMContentLoaded kiểm tra menu thủ công. 
// Giao diện đã được quản lý chuẩn mực tại kiemSoatGiaoDien() trong app.js.

async function taiDuLieuDanhMucLop() {
    const tbody = document.getElementById('vungDuLieuDanhMucLop');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-slate-500 font-bold"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải Danh mục Lớp...</td></tr>`;
    
    try {
        const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucLop`;
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlAPI) : fetch(urlAPI));
        
        if (!phanHoi.ok) throw new Error("Từ chối kết nối");
        const duLieuS = await phanHoi.json();
        
        duLieuDanhMucLop = [];
        if (duLieuS && duLieuS.length > 1) {
            for (let i = 1; i < duLieuS.length; i++) {
                duLieuDanhMucLop.push({
                    maLop: duLieuS[i][0] !== undefined ? String(duLieuS[i][0]).trim() : '',
                    tenLop: duLieuS[i][1] !== undefined ? String(duLieuS[i][1]).trim() : ''
                });
            }
        }
        veBangDanhMucLop();
    } catch (loi) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-600 font-bold">
            ⚠️ Lỗi kết nối máy chủ dữ liệu.<br>
            <span class="text-sm font-normal text-slate-500">Hệ thống đang bận hoặc gián đoạn mạng. Vui lòng chuyển qua tab khác và quay lại để tải lại.</span>
        </td></tr>`;
    }
}

function veBangDanhMucLop() {
    const tbody = document.getElementById('vungDuLieuDanhMucLop');
    if (duLieuDanhMucLop.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-slate-500 font-bold italic">Danh sách đang trống. Hãy thêm lớp học mới.</td></tr>`;
        return;
    }

    let html = '';
    duLieuDanhMucLop.forEach((lop, index) => {
        html += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-1 px-2 border border-gray-300 font-bold text-slate-500">${index + 1}</td>
            <td class="p-0 border border-gray-300"><input type="text" value="${lop.maLop}" onchange="capNhatLop(${index}, 'maLop', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-extrabold text-blue-900 uppercase"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${lop.tenLop}" onchange="capNhatLop(${index}, 'tenLop', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-bold text-slate-800 uppercase"></td>
            <td class="py-1 px-2 border border-gray-300 space-x-1">
                <button onclick="diChuyenLop(${index}, -1)" title="Lên" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-1.5 rounded leading-none transition">▲</button>
                <button onclick="diChuyenLop(${index}, 1)" title="Xuống" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-1.5 rounded leading-none transition">▼</button>
                <button onclick="xoaLop(${index})" title="Xoá" class="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-3 py-1.5 rounded leading-none transition ml-1">✕</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// Logic thao tác dòng & Đồng bộ state từ DOM
function dongBoDomLopSangState() {
    duLieuDanhMucLop = [];
    document.querySelectorAll('#vungDuLieuDanhMucLop tr').forEach(tr => {
        let cacInput = tr.querySelectorAll('input');
        if (cacInput && cacInput.length === 2) {
            duLieuDanhMucLop.push({ 
                maLop: cacInput[0].value, 
                tenLop: cacInput[1].value 
            });
        }
    });
}

function capNhatLop(index, truong, giaTri) { 
    if (truong === 'maLop') {
        let maMoi = giaTri.trim().toUpperCase();
        if (maMoi !== '') {
            let biTrung = duLieuDanhMucLop.some((lop, idx) => idx !== index && lop.maLop.trim().toUpperCase() === maMoi);
            if (biTrung) {
                alert(`⚠️ LỖI DỮ LIỆU:\nMã lớp "${maMoi}" đã tồn tại. Vui lòng nhập mã khác!`);
                veBangDanhMucLop(); return; 
            }
        }
        duLieuDanhMucLop[index][truong] = maMoi;
        // Tự động điền Tên Lớp nếu đang trống
        if (duLieuDanhMucLop[index].tenLop.trim() === '') {
            duLieuDanhMucLop[index].tenLop = maMoi;
            veBangDanhMucLop();
        }
    } else {
        duLieuDanhMucLop[index][truong] = giaTri.trim().toUpperCase(); 
    }
}

function themDongLopMoi() { dongBoDomLopSangState(); duLieuDanhMucLop.push({ maLop: '', tenLop: '' }); veBangDanhMucLop(); }
function xoaLop(index) { if (confirm("Đồng chí chắc chắn muốn xoá lớp này khỏi hệ thống?")) { dongBoDomLopSangState(); duLieuDanhMucLop.splice(index, 1); veBangDanhMucLop(); } }
function diChuyenLop(index, huong) {
    if (index + huong < 0 || index + huong >= duLieuDanhMucLop.length) return;
    dongBoDomLopSangState();
    let tam = duLieuDanhMucLop[index];
    duLieuDanhMucLop[index] = duLieuDanhMucLop[index + huong];
    duLieuDanhMucLop[index + huong] = tam;
    veBangDanhMucLop();
}

async function luuDuLieuDanhMucLopSangMayChu() {
    const btn = document.querySelector('#khungDanhMucLop button[onclick="luuDuLieuDanhMucLopSangMayChu()"]');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang lưu...`; 
    btn.disabled = true;

    try {
        dongBoDomLopSangState();
        let mangGhi = [TIEU_DE_DM_LOP]; 
        duLieuDanhMucLop.forEach(lop => {
            if (lop.maLop.trim() !== '') {
                mangGhi.push([lop.maLop.trim(), lop.tenLop.trim()]);
            }
        });

        const payload = { thaoTac: 'luuDanhMucLop', duLieu: mangGhi };
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? 
            fetchVoiCoCheThuLai(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) }) : 
            fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) })
        );
        
        if (!phanHoi.ok) throw new Error("Từ chối kết nối");
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') { 
            alert("Đã lưu Danh mục Lớp lên hệ thống an toàn!"); 
            
            // [KHẮC PHỤC KẾ THỪA]: Bơm danh sách Lớp mới vào biến toàn cục
            if (typeof thongSoHocVu !== 'undefined') {
                thongSoHocVu.DANH_SACH_LOP = duLieuDanhMucLop.map(lop => lop.maLop.trim()).filter(String);
            }
            // Xóa Cache các phân hệ phụ thuộc để ép chúng tái tạo cấu trúc khi bấm sang
            if (typeof duLieuBangKCT !== 'undefined') duLieuBangKCT = []; 
            if (typeof danhSachGV !== 'undefined') danhSachGV = []; 
            if (typeof duLieuTkbHienTai !== 'undefined') duLieuTkbHienTai = []; 
            
        } else { 
            alert("Lỗi từ máy chủ: " + ketQua.thongBao); 
        }
    } catch(loi) { 
        alert("Lỗi kết nối mạng hoặc máy chủ. Vui lòng thử lưu lại."); 
    } finally { 
        btn.innerHTML = textGoc; 
        btn.disabled = false; 
    }
}

<!-- KHỐI NÚT THAO TÁC CỦA DANH MỤC LỚP -->
<div class="flex flex-wrap items-center gap-2 mb-4">
    <!-- Input ẩn để gọi hộp thoại tải file Excel -->
    <input type="file" id="fileNhapDMLop" accept=".xlsx, .xls" style="display: none;" onchange="nhapExcelDanhMucLop(event)">
    
    <!-- Nút Nhập Excel -->
    <button onclick="document.getElementById('fileNhapDMLop').click()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 flex items-center gap-1 text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
        </svg>
        Nhập Excel
    </button>
    
    <!-- Nút Xuất Excel -->
    <button onclick="xuatExcelDanhMucLop()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 flex items-center gap-1 text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Xuất Excel
    </button>

    <!-- Nút Thêm Lớp (Đã có sẵn, để nguyên) -->
    <button onclick="themDongLopMoi()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 text-sm">
        Thêm lớp
    </button>

    <!-- Nút Lưu Hệ Thống (Đã có sẵn, để nguyên) -->
    <button onclick="luuDuLieuDanhMucLopSangMayChu()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded shadow transition duration-200 text-sm">
        Lưu danh mục
    </button>
</div>
