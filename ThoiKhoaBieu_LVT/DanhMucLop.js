let duLieuDanhMucLop = [];
const TIEU_DE_DM_LOP = ['MaLop', 'TenLop', 'GVCN', 'SiSo'];

// Giao diện đã được quản lý chuẩn mực tại kiemSoatGiaoDien() trong app.js.

async function taiDuLieuDanhMucLop() {
    const tbody = document.getElementById('vungDuLieuDanhMucLop');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-500 font-bold"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang tải Danh mục Lớp...</td></tr>`;
    
    try {
        const urlAPI = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucLop`;
        const phanHoi = await (typeof fetchVoiCoCheThuLai === 'function' ? fetchVoiCoCheThuLai(urlAPI) : fetch(urlAPI));
        
        if (!phanHoi.ok) throw new Error("Từ chối kết nối");
        const duLieuS = await phanHoi.json();
        
        duLieuDanhMucLop = [];
        if (duLieuS && duLieuS.length > 1) {
            for (let i = 1; i < duLieuS.length; i++) {
                let rawSiSo = duLieuS[i][3] !== undefined && duLieuS[i][3] !== null ? String(duLieuS[i][3]).replace(/\D/g, '') : '';
                duLieuDanhMucLop.push({
                    maLop: duLieuS[i][0] !== undefined ? String(duLieuS[i][0]).trim() : '',
                    tenLop: duLieuS[i][1] !== undefined ? String(duLieuS[i][1]).trim() : '',
                    gvcn: duLieuS[i][2] !== undefined ? String(duLieuS[i][2]).trim() : '',
                    siSo: rawSiSo ? String(parseInt(rawSiSo, 10)) : ''
                });
            }
        }
        veBangDanhMucLop();
    } catch (loi) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-red-600 font-bold">
            ⚠️ Lỗi kết nối máy chủ dữ liệu.<br>
            <span class="text-sm font-normal text-slate-500">Hệ thống đang bận hoặc gián đoạn mạng. Vui lòng chuyển qua tab khác và quay lại để tải lại.</span>
        </td></tr>`;
    }
}

function veBangDanhMucLop() {
    const tbody = document.getElementById('vungDuLieuDanhMucLop');
    // Mở rộng toàn bộ #khungDanhMucLop, khung cuộn và bảng ra 100% chiều ngang màn hình
    const khungDMLop = document.getElementById('khungDanhMucLop');
    if (khungDMLop) {
        Array.from(khungDMLop.classList).forEach(cls => {
            if (cls.startsWith('max-w-') || /^w-(\d+|1\/\d+|2\/\d+|3\/\d+|4\/\d+|5\/\d+)$/.test(cls)) {
                khungDMLop.classList.remove(cls);
            }
        });
        khungDMLop.classList.add('w-full');
        khungDMLop.style.maxWidth = '100%';
        khungDMLop.style.width = '100%';
    }
    const table = tbody ? tbody.closest('table') : document.querySelector('#khungDanhMucLop table');
    if (table) {
        table.classList.remove('table-fixed');
        table.classList.add('w-full');
        table.style.width = '100%';
        let wrap = table.parentElement;
        while (wrap && wrap !== khungDMLop && wrap !== document.body) {
            Array.from(wrap.classList).forEach(cls => {
                if (cls.startsWith('max-w-') || /^w-(\d+|1\/\d+|2\/\d+|3\/\d+|4\/\d+|5\/\d+)$/.test(cls)) {
                    wrap.classList.remove(cls);
                }
            });
            wrap.classList.add('w-full');
            wrap.style.maxWidth = '100%';
            wrap.style.width = '100%';
            wrap = wrap.parentElement;
        }
    }
    const thead = document.querySelector('#khungDanhMucLop thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="py-2.5 px-2 text-center whitespace-nowrap" style="width: 7%; min-width: 55px;">STT</th>
            <th class="py-2.5 px-2 text-center" style="width: 17%;">Mã Lớp</th>
            <th class="py-2.5 px-2 text-center" style="width: 17%;">Tên Lớp</th>
            <th class="py-2.5 px-2 text-center" style="width: 27%;">GV Chủ Nhiệm</th>
            <th class="py-2.5 px-2 text-center" style="width: 16%;">Sĩ Số</th>
            <th class="py-2.5 px-2 text-center whitespace-nowrap" style="width: 16%; min-width: 140px;">Điều Chỉnh</th>`;
    }

    if (duLieuDanhMucLop.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-500 font-bold italic">Danh sách đang trống. Hãy thêm lớp học mới.</td></tr>`;
        return;
    }

    let html = '';
    duLieuDanhMucLop.forEach((lop, index) => {
        let siSoVal = (lop.siSo !== undefined && lop.siSo !== null) ? String(lop.siSo).trim() : '';
        html += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-1 px-2 border border-gray-300 font-bold text-slate-500">${index + 1}</td>
            <td class="p-0 border border-gray-300"><input type="text" value="${lop.maLop}" onchange="capNhatLop(${index}, 'maLop', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-extrabold text-blue-900 uppercase"></td>
            <td class="p-0 border border-gray-300"><input type="text" value="${lop.tenLop}" onchange="capNhatLop(${index}, 'tenLop', this.value)" class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-bold text-slate-800 uppercase"></td>
            <td class="p-0 border border-gray-300"><input type="text" list="datalistChung_GV" value="${lop.gvcn}" onchange="capNhatLop(${index}, 'gvcn', this.value)" placeholder="Chọn/Nhập mã GV..." class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-bold text-slate-800"></td>
            <td class="p-0 border border-gray-300"><input type="number" min="0" value="${siSoVal}" onchange="capNhatLop(${index}, 'siSo', this.value)" placeholder="..." class="w-full h-full min-h-[35px] px-2 outline-none bg-transparent text-center font-bold text-emerald-700"></td>
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
        if (cacInput && cacInput.length >= 4) {
            let rawSiSo = String(cacInput[3].value || '').replace(/\D/g, '');
            duLieuDanhMucLop.push({ 
                maLop: cacInput[0].value, 
                tenLop: cacInput[1].value,
                gvcn: cacInput[2].value,
                siSo: rawSiSo ? String(parseInt(rawSiSo, 10)) : ''
            });
        } else if (cacInput && cacInput.length === 3) {
            duLieuDanhMucLop.push({ 
                maLop: cacInput[0].value, 
                tenLop: cacInput[1].value,
                gvcn: cacInput[2].value,
                siSo: ''
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
    } else if (truong === 'gvcn') {
        duLieuDanhMucLop[index][truong] = giaTri.trim(); 
    } else if (truong === 'siSo') {
        let rawSiSo = String(giaTri || '').replace(/\D/g, '');
        duLieuDanhMucLop[index].siSo = rawSiSo ? String(parseInt(rawSiSo, 10)) : '';
    } else {
        duLieuDanhMucLop[index][truong] = giaTri.trim().toUpperCase(); 
    }
}

function themDongLopMoi() { 
    dongBoDomLopSangState(); 
    duLieuDanhMucLop.push({ maLop: '', tenLop: '', gvcn: '', siSo: '' }); 
    veBangDanhMucLop(); 
}

function xoaLop(index) { 
    if (confirm("Đồng chí chắc chắn muốn xoá lớp này khỏi hệ thống?")) { 
        dongBoDomLopSangState(); 
        duLieuDanhMucLop.splice(index, 1); 
        veBangDanhMucLop(); 
    } 
}

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
                let siSoNum = lop.siSo && String(lop.siSo).trim() !== '' ? (parseInt(String(lop.siSo).replace(/\D/g, ''), 10) || '') : '';
                mangGhi.push([lop.maLop.trim(), lop.tenLop.trim(), lop.gvcn.trim(), siSoNum]);
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
            alert("Đã lưu Danh mục Lớp (bao gồm phân công GVCN và Sĩ số) lên hệ thống an toàn!"); 
            
            // Bơm danh sách Lớp, GVCN và Sĩ số mới vào biến toàn cục của Frontend
            let capNhatSiSo = (targetObj) => {
                if (!targetObj) return;
                targetObj.DANH_SACH_LOP = duLieuDanhMucLop.map(lop => lop.maLop.trim()).filter(String);
                if (!targetObj.GVCN_THEO_LOP) targetObj.GVCN_THEO_LOP = {};
                if (!targetObj.SI_SO_THEO_LOP) targetObj.SI_SO_THEO_LOP = {};
                duLieuDanhMucLop.forEach(lop => {
                    let mLop = lop.maLop.trim();
                    if (mLop !== '') {
                        targetObj.GVCN_THEO_LOP[mLop] = lop.gvcn.trim();
                        if (lop.siSo && String(lop.siSo).trim() !== '') {
                            targetObj.SI_SO_THEO_LOP[mLop.toUpperCase()] = parseInt(String(lop.siSo).replace(/\D/g, ''), 10) || 0;
                        } else {
                            delete targetObj.SI_SO_THEO_LOP[mLop.toUpperCase()];
                        }
                    }
                });
            };
            if (typeof thongSoHocVu !== 'undefined') capNhatSiSo(thongSoHocVu);
            if (typeof window.thongSoHocVu !== 'undefined') capNhatSiSo(window.thongSoHocVu);
            if (typeof window.dongBoSiSoTuDanhMucLopSDB === 'function') window.dongBoSiSoTuDanhMucLopSDB();

            // Cập nhật lại các datalist và giao diện lưới
            if (typeof window.capNhatDatalistTKB === 'function') window.capNhatDatalistTKB();
            
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

// =========================================================================
function xuatExcelDanhMucLop() {
    if (typeof XLSX === 'undefined') { 
        alert("Thư viện giải mã Excel chưa sẵn sàng. Vui lòng chờ trong giây lát."); 
        return; 
    }
    
    // Cập nhật trạng thái mới nhất từ các ô nhập liệu trên giao diện vào mảng
    dongBoDomLopSangState();
    
    let mangXuat = [TIEU_DE_DM_LOP];
    duLieuDanhMucLop.forEach(lop => { 
        let siSoNum = lop.siSo && String(lop.siSo).trim() !== '' ? (parseInt(String(lop.siSo).replace(/\D/g, ''), 10) || '') : '';
        mangXuat.push([lop.maLop, lop.tenLop, lop.gvcn, siSoNum]); 
    });
    
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(mangXuat);
    
    // Tinh chỉnh độ rộng các cột hiển thị
    ws['!cols'] = [{wch: 15}, {wch: 25}, {wch: 25}, {wch: 12}];
    XLSX.utils.book_append_sheet(wb, ws, "DM_LOP");
    XLSX.writeFile(wb, "DanhMucLop.xlsx");
}

function nhapExcelDanhMucLop(event) {
    if (typeof XLSX === 'undefined') {
        alert("Thư viện Excel chưa phản hồi."); 
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Ép cấu trúc mảng, điền chuỗi rỗng để ngăn chặn lỗi undefined
            const duLieuExcel = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (duLieuExcel.length < 2) {
                alert("Tệp Excel tải lên trống hoặc định dạng thiếu dòng tiêu đề.");
                return;
            }
            
            let xoaTrang = confirm("Đồng chí muốn XÓA TRẮNG danh sách lớp hiện tại để nạp mới (OK), hay THÊM NỐI TIẾP vào danh sách cũ (Cancel)?");
            if (xoaTrang) duLieuDanhMucLop = [];
            
            let soLopBiTrung = 0;

            for (let i = 1; i < duLieuExcel.length; i++) {
                let row = duLieuExcel[i];
                let maLopMoi = row[0] ? String(row[0]).trim().toUpperCase() : '';
                let tenLopMoi = row[1] ? String(row[1]).trim().toUpperCase() : '';
                let gvcnMoi = row[2] ? String(row[2]).trim() : '';
                let rawSiSo = (row.length > 3 && row[3] !== undefined && row[3] !== null) ? String(row[3]).replace(/\D/g, '') : '';
                let siSoMoi = rawSiSo ? String(parseInt(rawSiSo, 10)) : '';
                
                if (maLopMoi !== '') {
                    // Thuật toán kiểm tra và chặn trùng lặp mã lớp nếu chọn chế độ nối tiếp
                    let biTrung = duLieuDanhMucLop.some(lop => lop.maLop === maLopMoi);
                    if (biTrung && !xoaTrang) {
                        soLopBiTrung++;
                        continue; 
                    }

                    // Tự động sử dụng Mã lớp làm Tên lớp nếu cột Tên lớp bị bỏ trống
                    if (tenLopMoi === '') tenLopMoi = maLopMoi;
                    
                    duLieuDanhMucLop.push({
                        maLop: maLopMoi,
                        tenLop: tenLopMoi,
                        gvcn: gvcnMoi,
                        siSo: siSoMoi
                    });
                }
            }
            
            // Xóa lưới cũ và kết xuất toàn bộ dữ liệu mới lên UI
            veBangDanhMucLop();
            
            let thongBao = "Đã nạp dữ liệu lớp học từ Excel lên giao diện thành công!";
            if (soLopBiTrung > 0) {
                thongBao += `\nĐã tự động loại bỏ ${soLopBiTrung} lớp bị trùng mã.`;
            }
            thongBao += "\nĐồng chí hãy kiểm tra bảng và nhấn nút 'Lưu...' để đồng bộ danh sách lên máy chủ.";
            alert(thongBao);
            
        } catch (loi) { 
            alert("Lỗi trong quá trình giải mã tệp Excel: " + loi.message); 
        } finally { 
            event.target.value = ''; // Giải phóng bộ đệm của thẻ input
        }
    };
    reader.readAsArrayBuffer(file);
}
