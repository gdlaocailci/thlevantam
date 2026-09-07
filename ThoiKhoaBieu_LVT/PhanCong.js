let duLieuTongTien = {}; 
let danhSachGV = [];
let khungChuongTrinhToanTruong = {}; 
let gvDangDuocChon = null; 

// =========================================================================
// KHỐI 1: GIAO TIẾP MÁY CHỦ (API FETCH)
// =========================================================================
async function taiDuLieuPhanCongTuMayChu() {
    try {
        const tbody = document.getElementById('duLieuLopHoc');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="15" class="text-center py-10 text-slate-500 font-bold">
                <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                Đang kết nối Cổng API máy chủ để lấy Cấu hình Môn học...
            </td></tr>`;
        }

        const phanHoi = await fetch(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDuLieuKhoiTao`);
        const duLieuSever = await phanHoi.json();
        
        khoiTaoGiaoDienPhanCong(duLieuSever);
    } catch (loi) {
        console.error("Lỗi kết nối khi tải dữ liệu phân công:", loi);
        const tbody = document.getElementById('duLieuLopHoc');
        if (tbody) tbody.innerHTML = `<tr><td colspan="15" class="text-center py-10 text-red-600 font-bold text-lg">Lỗi kết nối hoặc máy chủ từ chối truy cập. Vui lòng thử lại.</td></tr>`;
    }
}

// =========================================================================
// KHỐI 2: KHỞI TẠO VÀ XỬ LÝ LƯỚI GIAO DIỆN PHÂN CÔNG
// =========================================================================
function khoiTaoGiaoDienPhanCong(duLieuSever) {
  danhSachGV = duLieuSever.giaoVien || [];
  khungChuongTrinhToanTruong = duLieuSever.khungChuongTrinh || {}; 
  
  let headerHtml = '<tr><th class="py-1 px-2 border border-gray-400 bg-slate-200 sticky left-0 z-30 min-w-[80px]">Mã Lớp</th>';
  if (duLieuSever.monHoc) {
      duLieuSever.monHoc.forEach(mon => {
        headerHtml += `<th class="py-1 px-2 border border-gray-400 min-w-[120px] relative group bg-slate-200">
                          <div class="flex items-center justify-between">
                              <span onclick="diChuyenCotMonHoc(this, -1)" class="cursor-pointer text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Di chuyển sang trái">
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                              </span>
                              <span class="px-1 text-center w-full">${mon}</span>
                              <span onclick="diChuyenCotMonHoc(this, 1)" class="cursor-pointer text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Di chuyển sang phải">
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                              </span>
                          </div>
                       </th>`;
      });
  }
  headerHtml += '</tr>';
  document.getElementById('tieuDeMonHoc').innerHTML = headerHtml;

  let bodyHtml = '';
  let datalistHtml = `<datalist id="danhSachGiaoVienPhanCong">`;
  danhSachGV.forEach(gv => {
    let ma = gv.maGv || gv.hoTen;
    datalistHtml += `<option value="${ma}"></option>`;
  });
  datalistHtml += `</datalist>`;

  let mapPhanCongDaLuu = {};
  if (duLieuSever.phanCong && duLieuSever.phanCong.length > 0) {
    for (let i = 1; i < duLieuSever.phanCong.length; i++) {
      let rowData = duLieuSever.phanCong[i];
      let tenLop = rowData[0];
      if(tenLop) {
         mapPhanCongDaLuu[tenLop] = rowData;
      }
    }
  }

  if (duLieuSever.maLop) {
      duLieuSever.maLop.forEach(maLop => {
        bodyHtml += `<tr class="hover:bg-slate-50 transition-colors duration-150 group">
                        <td class="py-1 px-2 border border-gray-400 font-extrabold text-slate-900 bg-white sticky left-0 z-10 group-hover:bg-slate-50">${maLop}</td>`;
        
        let duLieuCuCuaLop = mapPhanCongDaLuu[maLop] || [];
        let lopKey = Object.keys(khungChuongTrinhToanTruong).find(k => k.trim().toLowerCase() === String(maLop).trim().toLowerCase());

        for (let j = 0; j < duLieuSever.monHoc.length; j++) {
          let tenMon = duLieuSever.monHoc[j];
          let monHocHopLe = false;
          
          if (lopKey) {
              let monKey = Object.keys(khungChuongTrinhToanTruong[lopKey]).find(k => k.trim().toLowerCase() === String(tenMon).trim().toLowerCase());
              if (monKey && parseInt(khungChuongTrinhToanTruong[lopKey][monKey]) > 0) {
                  monHocHopLe = true;
              }
          }

          if (monHocHopLe) {
              let gvHienTai = duLieuCuCuaLop[j + 1] || ''; 
              bodyHtml += `<td class="p-0 border border-gray-400 transition-all duration-300 bg-white group-hover:bg-slate-50">
                              <input type="text" size="1" list="danhSachGiaoVienPhanCong" data-lop="${maLop}" data-mon="${tenMon}" value="${gvHienTai}" 
                              onchange="tinhToanTietDay(this.value); locDuLieuPhanCongThoiGianThuc();" 
                              placeholder="--" class="w-full h-full min-h-[26px] min-w-0 outline-none text-center bg-transparent focus:bg-blue-100 cursor-pointer font-semibold text-slate-800" 
                              autocomplete="off" 
                              onclick="if(this.showPicker) this.showPicker(); tinhToanTietDay(this.value);" 
                              onfocus="this.select(); tinhToanTietDay(this.value);">
                           </td>`;
          } else {
              bodyHtml += `<td class="p-0 border border-gray-300 bg-slate-200 opacity-70" title="Môn học không có trong Khung chương trình của lớp ${maLop}">
                              <input type="text" disabled data-lop="${maLop}" data-mon="${tenMon}" value="" 
                              class="w-full h-full min-h-[26px] min-w-0 outline-none text-center bg-transparent cursor-not-allowed text-slate-500 font-bold" 
                              placeholder="✖">
                           </td>`;
          }
        }
        bodyHtml += '</tr>';
      });
  }
  
  document.getElementById('duLieuLopHoc').innerHTML = bodyHtml + datalistHtml;
  tinhToanTietDay();

  const nutLuuPhanCong = document.querySelector('#khungPhanCong button[onclick="xuLyLuuTru()"]');
  let oLocLopPhanCong = document.getElementById('locLopPhanCong');
  
  if (nutLuuPhanCong && !oLocLopPhanCong) {
      const thanhCongCuTrai = nutLuuPhanCong.parentElement;
      thanhCongCuTrai.classList.add('flex', 'justify-start', 'items-center', 'w-full', 'mb-3', 'flex-wrap', 'gap-3');
      thanhCongCuTrai.classList.remove('justify-end', 'justify-between');

      const divBoLocTrai = document.createElement('div');
      divBoLocTrai.className = 'flex items-center gap-3'; 
      
      const htmlLocLop = `
          <div class="flex items-center bg-blue-50 border border-blue-400 rounded-md px-2 py-1.5 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all" title="Lọc hiển thị theo khu vực mã lớp (VD: A, B, 1A, 2B...)">
              <svg class="text-blue-600 mr-1.5" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              <input type="text" id="locLopPhanCong" oninput="locDuLieuPhanCongThoiGianThuc()" placeholder="Khu vực lớp (A, B...)" autocomplete="off" class="outline-none text-[13px] text-blue-900 bg-transparent font-semibold w-[130px] placeholder-blue-500/70">
          </div>
      `;

      const htmlLocGV = `
          <div class="flex items-center bg-amber-50 border border-amber-400 rounded-md px-2 py-1.5 shadow-sm focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-600 transition-all" title="Lọc các lớp mà giáo viên đang dạy">
              <svg class="text-amber-600 mr-1.5" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" id="locGiaoVienPhanCong" list="danhSachGiaoVienPhanCong" oninput="locDuLieuPhanCongThoiGianThuc()" onchange="locDuLieuPhanCongThoiGianThuc()" placeholder="Mã GV đang dạy..." autocomplete="off" class="outline-none text-[13px] text-amber-900 bg-transparent font-semibold w-[130px] placeholder-amber-500/70">
          </div>
      `;
      
      divBoLocTrai.innerHTML = htmlLocLop + htmlLocGV;
      thanhCongCuTrai.insertBefore(divBoLocTrai, nutLuuPhanCong);
  }
}

function locDuLieuPhanCongThoiGianThuc() {
    let oLocLop = document.getElementById('locLopPhanCong');
    let oLocGV = document.getElementById('locGiaoVienPhanCong');

    let tuKhoaLop = oLocLop ? oLocLop.value.trim().toLowerCase() : "";
    let tuKhoaGV = oLocGV ? oLocGV.value.trim().toLowerCase() : "";

    let cacDongLop = document.querySelectorAll('#duLieuLopHoc tr');

    cacDongLop.forEach(dong => {
        let tdLop = dong.querySelector('td:first-child');
        if (!tdLop) return;

        let tenLop = tdLop.innerText.toLowerCase();
        let thapLop = (tuKhoaLop === "") || tenLop.includes(tuKhoaLop);

        let thapGV = false;
        if (tuKhoaGV === "") {
            thapGV = true;
        } else {
            let cacSelect = dong.querySelectorAll('input[data-lop]');
            for (let i = 0; i < cacSelect.length; i++) {
                if (cacSelect[i].value.trim().toLowerCase().includes(tuKhoaGV)) {
                    thapGV = true;
                    break;
                }
            }
        }

        if (thapLop && thapGV) {
            dong.style.display = '';
        } else {
            dong.style.display = 'none';
        }
    });
}

function diChuyenCotMonHoc(element, huong) {
    const thHienTai = element.closest('th');
    const trTieuDe = thHienTai.parentElement;
    const danhSachCot = Array.from(trTieuDe.children);
    const viTriHienTai = danhSachCot.indexOf(thHienTai);
    
    const viTriDich = viTriHienTai + huong;
    if (viTriDich < 1 || viTriDich >= danhSachCot.length) return; 
    
    if (huong === -1) trTieuDe.insertBefore(danhSachCot[viTriHienTai], danhSachCot[viTriDich]);
    else trTieuDe.insertBefore(danhSachCot[viTriDich], danhSachCot[viTriHienTai]);
    
    const tbodyLopHoc = document.getElementById('duLieuLopHoc');
    if (tbodyLopHoc) {
        const danhSachDong = tbodyLopHoc.querySelectorAll('tr');
        danhSachDong.forEach(dong => {
            const cacO = Array.from(dong.children);
            if (cacO.length > Math.max(viTriHienTai, viTriDich)) {
                if (huong === -1) dong.insertBefore(cacO[viTriHienTai], cacO[viTriDich]);
                else dong.insertBefore(cacO[viTriDich], cacO[viTriHienTai]);
            }
        });
    }
}

// =========================================================================
// KHỐI 3: THỐNG KÊ ĐỊNH MỨC & PHÂN CÔNG NHANH (NÂNG CẤP LÕI)
// =========================================================================
function tinhToanTietDay(maGVVuaChon = null) {
  let thongKe = {};
  
  danhSachGV.forEach(gv => { 
      let ma = (gv.maGv || gv.hoTen).trim();
      let ten = gv.hoTen || ma;
      thongKe[ma] = { hoTen: ten, dinhMuc: gv.dinhMuc, thucTe: 0, chiTiet: [] }; 
  });

  if (maGVVuaChon !== null) {
      let idChon = maGVVuaChon.trim().toLowerCase();
      let idKhop = Object.keys(thongKe).find(k => k.toLowerCase() === idChon);
      gvDangDuocChon = idKhop ? idKhop : maGVVuaChon.trim();
  }

  const cacTheSelect = document.querySelectorAll('input[data-lop]');
  
  cacTheSelect.forEach(sl => {
    let maGV_nhap = sl.value.trim();
    if (!maGV_nhap) return;

    let maGVKhop = Object.keys(thongKe).find(k => k.toLowerCase() === maGV_nhap.toLowerCase());
    
    if (maGVKhop) {
      let tenLop = sl.getAttribute('data-lop').trim();
      let tenMon = sl.getAttribute('data-mon').trim();
      let soTiet = 0;
      
      let lopKey = Object.keys(khungChuongTrinhToanTruong).find(k => k.trim().toLowerCase() === tenLop.toLowerCase());
      if (lopKey) {
          let monKey = Object.keys(khungChuongTrinhToanTruong[lopKey]).find(k => k.trim().toLowerCase() === tenMon.toLowerCase());
          if (monKey) soTiet = parseInt(khungChuongTrinhToanTruong[lopKey][monKey]) || 0;
      }
      
      thongKe[maGVKhop].thucTe += soTiet; 
      if (soTiet > 0) {
          thongKe[maGVKhop].chiTiet.push(`<span class="inline-block bg-blue-50 text-blue-800 border border-blue-200 rounded px-1.5 py-0.5 m-0.5 text-[11px] whitespace-nowrap shadow-sm">${tenMon} ${tenLop} (${soTiet})</span>`);
      }
    }
  });

  const nutXuatExcel = document.querySelector('button[onclick="xuatExcelThongKePhanCong()"]');
  let oTimKiemGiaoVien = document.getElementById('locGiaoVienThongKe');
  
  if (nutXuatExcel && !oTimKiemGiaoVien) {
      nutXuatExcel.innerHTML = nutXuatExcel.innerHTML.replace(/Xuất Bảng Phân Công Chi Tiết/g, 'Xuất File');
      const thanhCongCu = nutXuatExcel.parentElement;
      
      thanhCongCu.classList.add('flex', 'justify-between', 'items-center', 'w-full', 'mb-3');
      thanhCongCu.classList.remove('justify-end'); 
      
      const divBoLoc = document.createElement('div');
      divBoLoc.className = 'flex items-center gap-2'; 
      
      const htmlKhuVuc = `
          <div class="flex items-center bg-emerald-50 border border-emerald-400 rounded-md px-2 py-1 shadow-sm focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all" title="Lọc toàn bộ giáo viên theo khu vực">
              <svg class="text-emerald-600 mr-1.5" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <input type="text" id="locKhuVucThongKe" oninput="locDuLieuThongKeThoiGianThuc()" placeholder="Khu (B, C)" autocomplete="off" class="outline-none text-[13px] text-emerald-900 bg-transparent font-semibold w-[90px] placeholder-emerald-500/70">
          </div>
      `;

      const htmlTimKiem = `
          <div class="flex items-center bg-white border border-blue-400 rounded-md px-2 py-1 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
              <svg class="text-blue-500 mr-1.5" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="locGiaoVienThongKe" list="danhSachGiaoVienPhanCong" oninput="locDuLieuThongKeThoiGianThuc()" onchange="locDuLieuThongKeThoiGianThuc()" placeholder="Tên/mã..." autocomplete="off" class="outline-none text-[13px] text-slate-800 bg-transparent w-[110px] min-w-[80px]">
          </div>
      `;
      
      divBoLoc.innerHTML = htmlKhuVuc + htmlTimKiem;
      thanhCongCu.insertBefore(divBoLoc, nutXuatExcel);
      oTimKiemGiaoVien = document.getElementById('locGiaoVienThongKe'); 
  }

  const theadThongKe = document.querySelector('#duLieuThongKe').previousElementSibling;
  if (theadThongKe) {
      theadThongKe.className = 'bg-purple-100 text-purple-900 shadow-sm';
      theadThongKe.innerHTML = `
        <tr>
            <th class="py-1 px-2 border border-gray-400 bg-purple-200 text-slate-900 font-bold sticky top-0 left-0 z-30 shadow-[1px_1px_0_0_#9ca3af]">Giáo viên</th>
            <th class="py-1 px-2 border border-gray-400 bg-purple-100 w-[12%] sticky top-0 z-20 shadow-[0_1px_0_0_#9ca3af]">Định mức</th>
            <th class="py-1 px-2 border border-gray-400 bg-purple-100 w-[12%] sticky top-0 z-20 shadow-[0_1px_0_0_#9ca3af]">Thực tế</th>
            <th class="py-1 px-2 border border-gray-400 bg-purple-100 text-left w-auto sticky top-0 z-20 shadow-[0_1px_0_0_#9ca3af]">Chi tiết giảng dạy</th>
        </tr>
      `;
  }

  let tbodyThongKe = '';
  for (const [ma, soLieu] of Object.entries(thongKe)) {
    let bgClass = 'bg-white';
    let textClass = 'text-blue-700 font-bold';

    if (soLieu.thucTe > soLieu.dinhMuc) {
        bgClass = 'bg-red-100'; textClass = 'text-red-600 font-extrabold';
    } else if (soLieu.thucTe === soLieu.dinhMuc && soLieu.dinhMuc > 0) {
        bgClass = 'bg-green-100'; textClass = 'text-green-700 font-extrabold';
    }
    
    if (gvDangDuocChon === ma) {
        bgClass = 'bg-yellow-200 border-yellow-400 shadow-inner'; 
    }

    // [NÂNG CẤP LÕI]: Biến ô Chi tiết thành nút bấm mở Modal Phân công nhanh
    let textChuaPhanCong = `<span class="text-slate-400 italic text-[11px] group-hover:text-blue-500 transition-colors">Bấm để gán môn học...</span>`;
    let chiTietHienThi = soLieu.chiTiet.length > 0 ? soLieu.chiTiet.join(' ') : textChuaPhanCong;
    let hienThiTen = (soLieu.hoTen && soLieu.hoTen !== ma) ? `${soLieu.hoTen} <br><span class="text-[13px] text-gray-500 font-bold italic">(${ma})</span>` : ma;
    let safeId = "tk_gv_" + encodeURIComponent(ma.trim()).replace(/%/g, '_');
    let chuoiTimKiem = `${soLieu.hoTen.toLowerCase()} ${ma.toLowerCase()}`;
    let tenAnToan = (soLieu.hoTen || ma).replace(/'/g, "\\'").replace(/"/g, "&quot;");

    tbodyThongKe += `
      <tr id="${safeId}" class="${bgClass} hover:bg-slate-50 transition-colors duration-300">
        <td class="py-1 px-2 font-semibold text-slate-800 text-left pl-3 border-b border-r border-gray-300 whitespace-nowrap sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_#d1d5db]" data-timkiem="${chuoiTimKiem}">${hienThiTen}</td>
        <td class="py-1 px-2 font-bold text-slate-600 border-b border-r border-gray-300 text-center">${soLieu.dinhMuc}</td>
        <td class="py-1 px-2 ${textClass} text-base border-b border-r border-gray-300 text-center">${soLieu.thucTe}</td>
        <td class="py-1 px-2 text-left leading-tight whitespace-normal border-b border-gray-300 cursor-pointer group hover:bg-blue-50 transition-colors" onclick="moKhungPhanCongNhanh('${ma}', '${tenAnToan}')" title="Nhấn để mở bảng gán môn học nhanh">
            <div class="flex items-start gap-1.5 min-h-[24px]">
                <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-none mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                <div class="flex-1 select-none">${chiTietHienThi}</div>
            </div>
        </td>
      </tr>
    `;
  }
  document.getElementById('duLieuThongKe').innerHTML = tbodyThongKe;
  locDuLieuThongKeThoiGianThuc();

  if (gvDangDuocChon) {
      setTimeout(() => {
          let idTimKiem = "tk_gv_" + encodeURIComponent(gvDangDuocChon).replace(/%/g, '_');
          let dongGiaoVien = document.getElementById(idTimKiem);
          if (dongGiaoVien) dongGiaoVien.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
  }
}

function locDuLieuThongKeThoiGianThuc() {
    let oTimKiem = document.getElementById('locGiaoVienThongKe');
    let oKhuVuc = document.getElementById('locKhuVucThongKe');
    
    let tuKhoa = oTimKiem ? oTimKiem.value.trim().toLowerCase() : "";
    let khuVuc = oKhuVuc ? oKhuVuc.value.trim().toLowerCase() : "";
    let cacDongThongKe = document.querySelectorAll('#duLieuThongKe tr');
    
    cacDongThongKe.forEach(dong => {
        let oGiaoVien = dong.querySelector('td:first-child');
        if (oGiaoVien) {
            let duLieuTimKiem = oGiaoVien.getAttribute('data-timkiem') || oGiaoVien.innerText.toLowerCase();
            let thapTuKhoa = (tuKhoa === "") || duLieuTimKiem.includes(tuKhoa);
            let thapKhuVuc = true;
            if (khuVuc !== "") {
                try {
                    let regexKhuVuc = new RegExp('(^|\\s)' + khuVuc + '\\d*($|\\s)', 'i');
                    thapKhuVuc = regexKhuVuc.test(duLieuTimKiem);
                } catch (e) { thapKhuVuc = duLieuTimKiem.includes(khuVuc); }
            }
            
            if (thapTuKhoa && thapKhuVuc) dong.style.display = '';
            else dong.style.display = 'none';
        }
    });
}

// =========================================================================
// KHỐI 3B: MODAL PHÂN CÔNG NHANH (ĐỘNG CƠ ĐỒNG BỘ 2 CHIỀU)
// =========================================================================
function chenHTMLModalPhanCongNhanh() {
    let html = `
    <div id="modalPhanCongNhanh" class="hidden fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] font-sans reactbits-fade-in backdrop-blur-sm transition-opacity">
        <div class="bg-slate-50 rounded-2xl shadow-2xl w-11/12 md:w-5/6 xl:w-[85%] h-[85vh] flex flex-col overflow-hidden border border-slate-300 transform scale-95 transition-transform duration-300">
            <div class="bg-blue-700 text-white px-5 py-3.5 flex justify-between items-center border-b shadow-md z-10">
                <h3 id="tieuDePhanCongNhanh" class="text-lg font-bold flex items-center gap-2 uppercase tracking-wide">
                    Phân công nhanh
                </h3>
                <button onclick="dongKhungPhanCongNhanh()" class="text-white hover:text-red-300 text-3xl leading-none transition-colors outline-none">&times;</button>
            </div>
            <div id="noiDungPhanCongNhanh" class="p-5 overflow-y-auto flex-1 custom-scrollbar">
                <!-- Nội dung checkbox render động -->
            </div>
            <div class="bg-white p-4 border-t flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <span class="text-sm text-slate-500 italic flex-1 flex items-center gap-2">
                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Thay đổi tự động lưu tạm trên lưới. Nhấn "Lưu Phân Công" ở bảng gốc để ghi vào CSDL.
                </span>
                <button onclick="dongKhungPhanCongNhanh()" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-lg shadow-md transition-colors">Hoàn tất</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.moKhungPhanCongNhanh = function(maGV, tenGV) {
    if (!document.getElementById('modalPhanCongNhanh')) chenHTMLModalPhanCongNhanh();
    
    let mapData = {};
    let cacSelect = document.querySelectorAll('#duLieuLopHoc input[data-lop]');
    
    cacSelect.forEach(sl => {
        if(sl.disabled) return; 
        let mon = sl.getAttribute('data-mon');
        let lop = sl.getAttribute('data-lop');
        let gvDangDay = sl.value.trim();
        
        if(!mapData[mon]) mapData[mon] = [];
        mapData[mon].push({ lop: lop, gvDangDay: gvDangDay });
    });
    
    let htmlNoidung = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">';
    
    Object.keys(mapData).sort().forEach(mon => {
        htmlNoidung += `<div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            <h4 class="font-bold text-blue-800 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                ${mon}
                <span class="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${mapData[mon].length} lớp</span>
            </h4>
            <div class="flex flex-wrap gap-2">`;
        
        mapData[mon].forEach(item => {
            let isChecked = (item.gvDangDay.toLowerCase() === maGV.toLowerCase());
            let isConflict = (!isChecked && item.gvDangDay !== ""); 
            
            let bgClass = "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200";
            let checkedClass = "peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-md";
            
            if (isConflict) bgClass = "bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100";
            
            htmlNoidung += `
                <label class="cursor-pointer relative group/item" title="${isConflict ? 'Đang được dạy bởi: ' + item.gvDangDay : 'Nhấn để gán môn học'}">
                    <input type="checkbox" class="peer hidden" ${isChecked ? 'checked' : ''} 
                           onchange="xuLyTichPhanCongNhanh(this, '${item.lop}', '${mon}', '${maGV}')">
                    <span class="px-2.5 py-1.5 rounded-lg border ${bgClass} ${checkedClass} text-[13px] font-bold transition-all duration-200 inline-block min-w-[45px] text-center select-none">
                        ${item.lop}
                    </span>
                </label>`;
        });
        
        htmlNoidung += `</div></div>`;
    });
    
    htmlNoidung += '</div>';
    
    document.getElementById('tieuDePhanCongNhanh').innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Phân công: ${tenGV}
    `;
    document.getElementById('noiDungPhanCongNhanh').innerHTML = htmlNoidung;
    
    let modal = document.getElementById('modalPhanCongNhanh');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
};

window.dongKhungPhanCongNhanh = function() {
    let modal = document.getElementById('modalPhanCongNhanh');
    if(modal) {
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
};

window.xuLyTichPhanCongNhanh = function(checkbox, maLop, mon, maGV) {
    let inputLoi = document.querySelector(`#duLieuLopHoc input[data-lop="${maLop}"][data-mon="${mon}"]`);
    if (inputLoi) {
        if (checkbox.checked) inputLoi.value = maGV;
        else inputLoi.value = "";
        
        let tdCha = inputLoi.closest('td');
        if (tdCha) {
            tdCha.classList.add('bg-green-200');
            setTimeout(() => tdCha.classList.remove('bg-green-200'), 500);
        }
        
        tinhToanTietDay(maGV);
    }
};

// =========================================================================
// KHỐI 4: LƯU TRỮ VÀ XỬ LÝ NHẬP/XUẤT EXCEL TỐC ĐỘ CAO
// =========================================================================
async function xuLyLuuTru() {
  const btnLuu = document.querySelector('#khungPhanCong button[onclick="xuLyLuuTru()"]');
  let textGoc = btnLuu ? btnLuu.innerHTML : 'Lưu Phân Công';
  
  if (btnLuu) {
      btnLuu.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xử lý...`;
      btnLuu.disabled = true;
  }
  
  try {
    let mangGhi = [];
    let thead = document.querySelectorAll('#tieuDeMonHoc th');
    let dongTieuDe = [];
    thead.forEach(th => dongTieuDe.push(th.innerText.trim()));
    mangGhi.push(dongTieuDe);
    
    let cacDongLop = document.querySelectorAll('#duLieuLopHoc tr');
    cacDongLop.forEach(tr => {
        let dongDuLieu = [];
        let tdLop = tr.querySelector('td:first-child');
        if (tdLop) {
            dongDuLieu.push(tdLop.innerText.trim());
            let cacSelect = tr.querySelectorAll('input[data-lop]');
            cacSelect.forEach(sl => dongDuLieu.push(sl.value.trim()));
            mangGhi.push(dongDuLieu);
        }
    });
    
    const payload = { thaoTac: 'luuDuLieuPhanCong', duLieu: mangGhi };
    const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, { method: 'POST', body: JSON.stringify(payload) });
    const ketQua = await phanHoi.json();
    
    if (ketQua.trangThai === 'Thành công') alert("Đã lưu bảng Phân công chuyên môn vào hệ thống thành công!");
    else alert("Lỗi từ máy chủ: " + ketQua.thongBao);
  } catch(loi) {
    console.error("Lỗi khi lưu phân công:", loi);
    alert("Lỗi kết nối mạng hoặc máy chủ không phản hồi.");
  } finally {
    if (btnLuu) { btnLuu.innerHTML = textGoc; btnLuu.disabled = false; }
  }
}

async function xuatExcelPhanCong() {
    const btn = document.querySelector('button[onclick="xuatExcelPhanCong()"]');
    let textGoc = btn ? btn.innerHTML : 'Xuất Excel';
    if (btn) btn.innerHTML = `Đang tạo file...`;
    
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
        const worksheet = workbook.addWorksheet('PHAN_CONG');
        const wsData = workbook.addWorksheet('DM_GV'); 
        
        let dsMaGV = danhSachGV.map(gv => gv.maGv || gv.hoTen).sort((a, b) => a.localeCompare(b, 'vi'));
        dsMaGV.forEach((ma, idx) => wsData.getCell(`A${idx + 1}`).value = ma);
        wsData.state = 'hidden'; 

        let thead = document.querySelectorAll('#tieuDeMonHoc th');
        let dongTieuDe = [];
        thead.forEach(th => dongTieuDe.push(th.innerText.trim()));
        worksheet.addRow(dongTieuDe);
        
        let cacDongLop = document.querySelectorAll('#duLieuLopHoc tr');
        let rowCount = 2;
        cacDongLop.forEach(tr => {
            let dong = [];
            let tdLop = tr.querySelector('td:first-child');
            if (tdLop) {
                dong.push(tdLop.innerText.trim());
                let cacSelect = tr.querySelectorAll('input[data-lop]');
                cacSelect.forEach(sl => dong.push(sl.value.trim()));
                worksheet.addRow(dong);

                for (let c = 2; c <= dongTieuDe.length; c++) {
                    worksheet.getCell(rowCount, c).dataValidation = {
                        type: 'list', allowBlank: true, showErrorMessage: true, 
                        errorStyle: 'error', errorTitle: 'Dữ liệu không hợp lệ',
                        error: 'Vui lòng chọn hoặc gõ chính xác mã giáo viên có trong danh sách!',
                        showInputMessage: true, promptTitle: 'Thao tác tìm kiếm',
                        prompt: 'Nhấn tổ hợp phím [Alt + ↓] để mở danh sách, sau đó gõ ký tự để lọc nhanh.',
                        formulae: [`'DM_GV'!$A$1:$A$${dsMaGV.length}`] 
                    };
                }
                rowCount++;
            }
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.columns.forEach((col, i) => { col.width = i === 0 ? 12 : 20; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'PhanCongChuyenMon.xlsx';
        link.click();
    } catch(loi) {
        console.error(loi);
        alert("Có lỗi xảy ra khi tạo file Excel!");
    } finally {
        if (btn) btn.innerHTML = textGoc;
    }
}

function xuLyTaiLenExcelPhanCong(e) {
    if (typeof XLSX === 'undefined') {
        alert("Thư viện hệ thống chưa sẵn sàng, vui lòng thử lại sau vài giây.");
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const duLieuExcel = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (duLieuExcel.length < 2) { alert("Tệp Excel không chứa dữ liệu phân công hợp lệ."); return; }

            let headerExcel = duLieuExcel[0];
            let mapExcel = {};

            for (let i = 1; i < duLieuExcel.length; i++) {
                let row = duLieuExcel[i];
                let tenLop = row[0] ? String(row[0]).trim() : '';
                if (tenLop) {
                    mapExcel[tenLop] = {};
                    for (let j = 1; j < headerExcel.length; j++) {
                        let tenMon = headerExcel[j] ? String(headerExcel[j]).trim() : '';
                        let maGV = row[j] ? String(row[j]).trim() : '';
                        if (tenMon) mapExcel[tenLop][tenMon] = maGV;
                    }
                }
            }

            let cacTheSelect = document.querySelectorAll('#duLieuLopHoc input[data-lop]');
            cacTheSelect.forEach(sl => {
                let lop = sl.getAttribute('data-lop');
                let mon = sl.getAttribute('data-mon');
                if (mapExcel[lop] && mapExcel[lop][mon] !== undefined) sl.value = mapExcel[lop][mon];
            });

            tinhToanTietDay();
            alert(`Đã nạp thành công dữ liệu từ file Excel! Vui lòng kiểm tra lại bảng và bấm "Lưu Phân Công".`);
        } catch (loiDoc) {
            console.error("Lỗi khi đọc file Excel:", loiDoc);
            alert("Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.");
        } finally {
            e.target.value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
}

async function xuatExcelThongKePhanCong() {
    const btn = document.querySelector('button[onclick="xuatExcelThongKePhanCong()"]');
    let textGoc = btn ? btn.innerHTML : 'Xuất File';
    
    if (btn) { btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`; btn.disabled = true; }
    
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
        const worksheet = workbook.addWorksheet('THONG_KE_CHI_TIET');
        
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Họ và tên Giáo viên', key: 'gv', width: 35 },
            { header: 'Định mức', key: 'dinhMuc', width: 12 },
            { header: 'Thực tế', key: 'thucTe', width: 12 },
            { header: 'Chi tiết phân công (Lớp - Số tiết)', key: 'chiTiet', width: 65 }
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Times New Roman', size: 12 };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B5394' } }; 
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        const cacDongThongKe = document.querySelectorAll('#duLieuThongKe tr');
        let stt = 1; 
        
        cacDongThongKe.forEach(tr => {
            if (tr.style.display !== 'none') {
                const cacCot = tr.querySelectorAll('td');
                if (cacCot.length >= 4) {
                    let tenGV = cacCot[0].innerText.replace(/\n/g, ' - ').replace(/[()]/g, '').replace(/\s+-\s+/g, ' - ').trim(); 
                    let dinhMuc = parseInt(cacCot[1].innerText) || 0;
                    let thucTe = parseInt(cacCot[2].innerText) || 0;
                    let chiTiet = cacCot[3].innerText.replace(/\n/g, ', ').trim();

                    const row = worksheet.addRow({ stt: stt, gv: tenGV, dinhMuc: dinhMuc, thucTe: thucTe, chiTiet: chiTiet });
                    row.font = { name: 'Times New Roman', size: 12 };
                    if (thucTe > dinhMuc) row.getCell('thucTe').font = { color: { argb: 'FFDC2626' }, bold: true, name: 'Times New Roman' }; 
                    else if (thucTe === dinhMuc && dinhMuc > 0) row.getCell('thucTe').font = { color: { argb: 'FF15803D' }, bold: true, name: 'Times New Roman' }; 
                    stt++; 
                }
            }
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' }; 
                row.getCell('dinhMuc').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('thucTe').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('chiTiet').alignment = { vertical: 'middle', wrapText: true };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const ngay = new Date();
        const chuoiNgay = `${String(ngay.getDate()).padStart(2, '0')}${String(ngay.getMonth() + 1).padStart(2, '0')}${ngay.getFullYear()}`;
        link.download = `PhanCongChiTiet_${chuoiNgay}.xlsx`;
        
        link.click();
    } catch(loi) {
        console.error("Lỗi khi kết xuất Excel:", loi);
        alert("Có lỗi khi tạo biểu mẫu Excel, vui lòng thử lại!");
    } finally {
        if (btn) { btn.innerHTML = textGoc; btn.disabled = false; }
    }
}

// =========================================================================
// KHỐI 5: ĐIỀU HƯỚNG MÀN HÌNH TỔNG LỰC
// =========================================================================
function moTabPhanCong() {
    thietLapMenuActive('menuPhanCong');
    setTimeout(() => {
        let thanhCongCu = document.getElementById('thanhCongCuTKB');
        if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }
        
        ['khungTKB', 'khungThongKe', 'khungKhungChuongTrinh', 'khungDanhMucGV', 'khungCaiDat'].forEach(id => {
            let el = document.getElementById(id);
            if (el) { el.classList.remove('block', 'flex'); el.classList.add('hidden'); }
        });
        
        let khungPC = document.getElementById('khungPhanCong');
        if (khungPC) { khungPC.classList.remove('hidden'); khungPC.classList.add('flex'); }

        if (danhSachGV.length === 0) taiDuLieuPhanCongTuMayChu();
    }, 15); 
}

function moTabTKB() {
    thietLapMenuActive('menuTKB');
    setTimeout(() => {
        let thanhCongCu = document.getElementById('thanhCongCuTKB');
        if (thanhCongCu) { thanhCongCu.classList.remove('hidden'); thanhCongCu.classList.add('flex'); }
        
        ['khungPhanCong', 'khungThongKe', 'khungKhungChuongTrinh', 'khungDanhMucGV', 'khungCaiDat'].forEach(id => {
            let el = document.getElementById(id);
            if (el) { el.classList.remove('block', 'flex'); el.classList.add('hidden'); }
        });
        
        let khungTKB = document.getElementById('khungTKB');
        if (khungTKB) { khungTKB.classList.remove('hidden'); khungTKB.classList.add('block'); }
    }, 15);
}

window.moTabThongKe = function() {
    thietLapMenuActive('menuThongKe');
    setTimeout(() => {
        let thanhCongCu = document.getElementById('thanhCongCuTKB');
        if (thanhCongCu) { thanhCongCu.classList.remove('flex'); thanhCongCu.classList.add('hidden'); }
        
        ['khungTKB', 'khungPhanCong', 'khungKhungChuongTrinh', 'khungDanhMucGV', 'khungCaiDat'].forEach(id => {
            let el = document.getElementById(id);
            if (el) { el.classList.remove('block', 'flex'); el.classList.add('hidden'); }
        });
        
        let khungTK = document.getElementById('khungThongKe');
        if (khungTK) { khungTK.classList.remove('hidden'); khungTK.classList.add('block'); }
    }, 15);
};

window.dongTabThongKe = moTabTKB;

function thietLapMenuActive(idKichHoat) {
    const cacMenu = ['menuTKB', 'menuThongKe', 'menuPhanCong', 'menuKhungChuongTrinh', 'menuDanhMucGV', 'menuCaiDat'];
    cacMenu.forEach(id => {
        let m = document.getElementById(id);
        if (m) {
            m.classList.remove('bg-menu-hover', 'border-menu-active');
            m.classList.add('border-transparent');
            let span = m.querySelector('span');
            if (span) {
                span.classList.remove('text-menu-active');
                span.classList.add('text-white');
            }
        }
    });
    
    let mActive = document.getElementById(idKichHoat);
    if (mActive) {
        mActive.classList.remove('border-transparent');
        mActive.classList.add('bg-menu-hover', 'border-menu-active');
        let spanActive = mActive.querySelector('span');
        if (spanActive) { 
            spanActive.classList.remove('text-white'); 
            spanActive.classList.add('text-menu-active'); 
        }
    }
}
