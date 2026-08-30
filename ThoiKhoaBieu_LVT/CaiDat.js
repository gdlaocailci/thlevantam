let dsThamSo = [];
let dsQuanTri = [];
const TIEU_DE_CAI_DAT = ['MaThamSo', 'GiaTri', 'GhiChu', '', 'Quyền Admin'];

document.addEventListener('DOMContentLoaded', () => {
    let checkQuyenCD = setInterval(() => {
        if (typeof quyenSuaChua !== 'undefined') {
            let menuCD = document.getElementById('menuCaiDat');
            // Đã sửa 'block' thành 'flex' để chống vỡ cấu trúc giao diện
            if (menuCD) { menuCD.style.display = quyenSuaChua ? 'flex' : 'none'; }
        }
    }, 1000);
});

async function taiDuLieuCaiDatHeThong() {
    const tbThamSo = document.getElementById('vungThamSo');
    const tbQuanTri = document.getElementById('vungQuanTri');
    
    tbThamSo.innerHTML = `<tr><td colspan="4" class="text-center py-10 font-bold text-slate-500">Đang tải cấu hình...</td></tr>`;
    tbQuanTri.innerHTML = `<tr><td colspan="2" class="text-center py-10 font-bold text-slate-500">Đang tải cấu hình...</td></tr>`;

    try {
        const phanHoi = await fetch(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCaiDat`);
        const duLieu = await phanHoi.json();
        
        dsThamSo = []; dsQuanTri = [];
        
        if (duLieu && duLieu.length > 1) {
            for (let i = 1; i < duLieu.length; i++) {
                let r = duLieu[i];
                if (r[0] && String(r[0]).trim() !== '') {
                    dsThamSo.push({ maThamSo: String(r[0]).trim(), giaTri: r[1] !== undefined ? String(r[1]).trim() : '', ghiChu: r[2] !== undefined ? String(r[2]).trim() : '' });
                }
                if (r[4] && String(r[4]).trim() !== '') {
                    dsQuanTri.push(String(r[4]).trim());
                }
            }
        }
        veGiaoDienThamSo(); veGiaoDienQuanTri();
    } catch (loi) { console.error("Lỗi tải cài đặt:", loi); }
}

function veGiaoDienThamSo() {
    const tbody = document.getElementById('vungThamSo');
    let html = '';
    dsThamSo.forEach((ts, idx) => {
        html += `<tr class="hover:bg-slate-50">
            <td class="p-0 border border-gray-300"><input type="text" value="${ts.maThamSo}" onchange="capNhatThamSo(${idx}, 'maThamSo', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent font-extrabold text-blue-900 text-left uppercase"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${ts.giaTri}" onchange="capNhatThamSo(${idx}, 'giaTri', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-bold text-slate-800"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${ts.ghiChu}" onchange="capNhatThamSo(${idx}, 'ghiChu', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-left italic text-gray-600"></td>
            <td class="p-1 border border-gray-300">
                <button onclick="xoaThamSo(${idx})" title="Xoá" class="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2 py-1.5 rounded transition shadow-sm">✕</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function veGiaoDienQuanTri() {
    const tbody = document.getElementById('vungQuanTri');
    let html = '';
    dsQuanTri.forEach((qt, idx) => {
        html += `<tr class="hover:bg-slate-50">
            <td class="p-0 border border-gray-300"><input type="text" value="${qt}" onchange="capNhatQuanTri(${idx}, this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-left font-bold text-purple-800"></td>
            <td class="p-1 border border-gray-300">
                <button onclick="xoaQuanTri(${idx})" title="Xoá" class="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2 py-1.5 rounded transition shadow-sm">✕</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// =========================================================================
// KHỐI ĐỒNG BỘ & THAO TÁC CÀI ĐẶT (ĐÃ NÂNG CẤP KIÊN CỐ)
// =========================================================================

// Quét trực tiếp dữ liệu từ DOM (Giao diện) để đảm bảo không thất thoát dữ liệu 
// do trạng thái (State) bất đồng bộ (Ví dụ: sự kiện onchange không kịp kích hoạt khi ấn lưu ngay).
function dongBoDomSangState() {
    dsThamSo = [];
    document.querySelectorAll('#vungThamSo tr').forEach(tr => {
        let cacInput = tr.querySelectorAll('input');
        if (cacInput && cacInput.length === 3) {
            dsThamSo.push({ 
                maThamSo: cacInput[0].value, 
                giaTri: cacInput[1].value, 
                ghiChu: cacInput[2].value 
            });
        }
    });
    
    dsQuanTri = [];
    document.querySelectorAll('#vungQuanTri tr').forEach(tr => {
        let input = tr.querySelector('input');
        if (input) {
            dsQuanTri.push(input.value);
        }
    });
}

function capNhatThamSo(idx, truong, giaTri) { dsThamSo[idx][truong] = giaTri; }
function themDongThamSo() { dongBoDomSangState(); dsThamSo.push({ maThamSo: '', giaTri: '', ghiChu: '' }); veGiaoDienThamSo(); }
function xoaThamSo(idx) { if(confirm("Đồng chí chắc chắn muốn xoá Tham số này?")) { dongBoDomSangState(); dsThamSo.splice(idx, 1); veGiaoDienThamSo(); } }

function capNhatQuanTri(idx, giaTri) { dsQuanTri[idx] = giaTri; }
function themDongQuanTri() { dongBoDomSangState(); dsQuanTri.push(''); veGiaoDienQuanTri(); }
function xoaQuanTri(idx) { if(confirm("Hủy quyền Admin của tài khoản này?")) { dongBoDomSangState(); dsQuanTri.splice(idx, 1); veGiaoDienQuanTri(); } }

async function luuCaiDatSangMayChu() {
    const btn = document.querySelector('#khungCaiDat button[onclick="luuCaiDatSangMayChu()"]');
    let textGoc = btn.innerHTML;
    btn.innerHTML = `Đang lưu...`; btn.disabled = true;

    try {
        // Chốt hạ dữ liệu từ giao diện vào mảng trước khi chuẩn bị Payload gửi đi
        dongBoDomSangState();

        let mangGhi = [TIEU_DE_CAI_DAT]; // ['MaThamSo', 'GiaTri', 'GhiChu', '', 'Quyền Admin']
        let soDongMax = Math.max(dsThamSo.length, dsQuanTri.length);

        for (let i = 0; i < soDongMax; i++) {
            let ts = dsThamSo[i] || { maThamSo: '', giaTri: '', ghiChu: '' };
            let qt = dsQuanTri[i] || '';
            
            // Ép kiểu trim() làm sạch khoảng trắng thừa
            if(ts.maThamSo.trim() !== '' || qt.trim() !== '') {
                mangGhi.push([ts.maThamSo.trim(), ts.giaTri.trim(), ts.ghiChu.trim(), '', qt.trim()]);
            }
        }

        const payload = { thaoTac: 'luuCaiDat', duLieu: mangGhi };
        const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
        const ketQua = await phanHoi.json();
        
        if (ketQua.trangThai === 'Thành công') { 
            alert("Đã lưu Cấu hình hệ thống thành công! Vui lòng tải lại trang (F5) để các thông số mới có hiệu lực."); 
        } else { alert("Lỗi từ máy chủ: " + ketQua.thongBao); }
    } catch(loi) { alert("Lỗi kết nối mạng."); } 
    finally { btn.innerHTML = textGoc; btn.disabled = false; }
}

function moTabCaiDat() {
    const cacMenu = ['menuTKB', 'menuThongKe', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucGV', 'menuCaiDat'];
    cacMenu.forEach(id => {
        let m = document.getElementById(id);
        if (m) {
            m.classList.remove('bg-menu-hover', 'border-menu-active');
            m.classList.add('border-transparent');
            let span = m.querySelector('span');
            if (span) { span.classList.remove('text-menu-active'); span.classList.add('text-white'); }
        }
    });
    
    let mActive = document.getElementById('menuCaiDat');
    if (mActive) {
        mActive.classList.remove('border-transparent');
        mActive.classList.add('bg-menu-hover', 'border-menu-active');
        let spanActive = mActive.querySelector('span');
        if (spanActive) { spanActive.classList.remove('text-white'); spanActive.classList.add('text-menu-active'); }
    }

    ['khungTKB', 'khungThongKe', 'khungPhanCong', 'khungKhungChuongTrinh', 'khungDanhMucGV'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { el.classList.remove('block', 'flex'); el.classList.add('hidden'); }
    });
    
    let thanhCongCu = document.getElementById('thanhCongCuTKB');
    if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }

    let khungCD = document.getElementById('khungCaiDat');
    if (khungCD) { khungCD.classList.remove('hidden'); khungCD.classList.add('flex'); }

    taiDuLieuCaiDatHeThong();
}
