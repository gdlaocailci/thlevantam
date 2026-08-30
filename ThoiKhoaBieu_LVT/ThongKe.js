let cayDanhMucThongKe = {};
let duLieuThongKeHienTai = [];

// =========================================================================
// KHỐI 1: KHỞI TẠO GIAO DIỆN VÀ GẮN VÀO KHUNG CÓ SẴN
// =========================================================================
function dungGiaoDienThongKe() {
    let container = document.getElementById('khungThongKe');
    if (!container) return;
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4 flex-none">
            <h2 class="text-xl font-extrabold text-blue-900 uppercase">Tra cứu Thống kê Giảng dạy</h2>
        </div>
        
        <div class="bg-white shadow-sm border border-gray-400 p-3 flex flex-wrap items-center gap-4 mb-3 flex-none">
            <div class="flex items-center font-bold text-blue-900">
                <span class="text-lg uppercase tracking-wide">Bộ Lọc Tra Cứu</span>
            </div>
            
            <div class="h-6 w-px bg-gray-300 hidden md:block"></div>

            <div class="flex flex-wrap items-center gap-3 w-full md:w-auto text-sm font-semibold text-slate-800">
                <div class="flex flex-col">
                    <label class="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">Năm học</label>
                    <input type="text" id="inputNamHocTk" list="dlNamHocTk" onchange="xuLyDoiNamHocTk()" class="w-32 px-2 py-1.5 border border-gray-400 rounded outline-none focus:border-blue-500 bg-slate-50">
                    <datalist id="dlNamHocTk"></datalist>
                </div>

                <div class="flex flex-col">
                    <label class="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">Tháng</label>
                    <input type="text" id="inputThangTk" list="dlThangTk" onchange="xuLyDoiThangTk()" class="w-32 px-2 py-1.5 border border-gray-400 rounded outline-none focus:border-blue-500 bg-slate-50">
                    <datalist id="dlThangTk"></datalist>
                </div>

                <div class="flex flex-col">
                    <label class="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">Tuần</label>
                    <input type="text" id="inputTuanTk" list="dlTuanTk" class="w-36 px-2 py-1.5 border border-gray-400 rounded outline-none focus:border-blue-500 bg-slate-50">
                    <datalist id="dlTuanTk"></datalist>
                </div>

                <div class="flex flex-col">
                    <label class="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">Giáo viên</label>
                    <input type="text" id="inputGiaoVienTk" list="dlGiaoVienTk" class="w-40 px-2 py-1.5 border border-gray-400 rounded outline-none focus:border-blue-500 bg-slate-50">
                    <datalist id="dlGiaoVienTk"></datalist>
                </div>
            </div>

            <div class="ml-auto flex items-center gap-2 mt-2 md:mt-0">
                <button onclick="goiTraCuuThongKe()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-sm shadow transition duration-200 rounded flex items-center gap-2">
                    Tra cứu
                </button>
            </div>
        </div>

        <div id="vungKetQuaThongKe" class="bg-white shadow-inner border border-gray-400 flex-1 overflow-auto flex flex-col relative">
            <div class="text-center text-slate-400 m-auto font-bold px-4 py-8">
                Vui lòng chọn bộ lọc và bấm "Tra cứu" để hiển thị dữ liệu thống kê.
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => { 
    dungGiaoDienThongKe();
});

// =========================================================================
// KHỐI 2: GIAO TIẾP MÁY CHỦ VÀ LOGIC DROPDOWN LIÊN HOÀN
// =========================================================================
async function taiCayDanhMucThongKe() {
    const btn = document.querySelector('button[onclick="goiTraCuuThongKe()"]');
    if (btn) btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang tải...`;
    
    try {
        // [NÂNG CẤP]: Áp dụng fetchVoiCoCheThuLai
        const fetchFunc = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;
        const phanHoi = await fetchFunc(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layCayQuanHeThongKe`);
        cayDanhMucThongKe = await phanHoi.json();
        
        let dsNam = Object.keys(cayDanhMucThongKe);
        if (dsNam.length > 0) {
            let htmlArr = [];
            dsNam.forEach(n => htmlArr.push(`<option value="${n}">`));
            document.getElementById('dlNamHocTk').innerHTML = htmlArr.join('');
            document.getElementById('inputNamHocTk').value = dsNam[dsNam.length - 1];
            xuLyDoiNamHocTk();
        }
    } catch (loi) {
        console.error("Lỗi tải cây danh mục:", loi);
    } finally {
        if (btn) btn.innerHTML = `Tra cứu`; 
    }
}

function xuLyDoiNamHocTk() {
    let nam = document.getElementById('inputNamHocTk').value.trim();
    let duLieuNam = cayDanhMucThongKe[nam];
    if (!duLieuNam) return;

    let htmlThang = `<option value="Cả năm">` + duLieuNam.danhSachThang.map(th => `<option value="Tháng ${th}">`).join('');
    document.getElementById('dlThangTk').innerHTML = htmlThang;
    document.getElementById('inputThangTk').value = "Cả năm";

    let htmlGv = `<option value="Toàn trường">` + duLieuNam.danhSachGiaoVien.map(gv => `<option value="${gv}">`).join('');
    document.getElementById('dlGiaoVienTk').innerHTML = htmlGv;
    document.getElementById('inputGiaoVienTk').value = "Toàn trường";

    xuLyDoiThangTk();
}

function xuLyDoiThangTk() {
    let nam = document.getElementById('inputNamHocTk').value.trim();
    let thangStr = document.getElementById('inputThangTk').value.trim();
    let duLieuNam = cayDanhMucThongKe[nam];
    if (!duLieuNam) return;

    let dsTuan = [];
    if (thangStr === "Cả năm" || thangStr === "") {
        for (let th in duLieuNam.soDoThoiGian) { dsTuan = dsTuan.concat(duLieuNam.soDoThoiGian[th]); }
        dsTuan = [...new Set(dsTuan)].sort((a, b) => a - b);
    } else {
        let thSo = thangStr.replace(/\D/g, '');
        dsTuan = duLieuNam.soDoThoiGian[thSo] || [];
    }

    let htmlTuan = `<option value="Tất cả các tuần">` + dsTuan.map(t => `<option value="Tuần ${t}">`).join('');
    document.getElementById('dlTuanTk').innerHTML = htmlTuan;
    document.getElementById('inputTuanTk').value = "Tất cả các tuần";
}

// =========================================================================
// KHỐI 3: GỌI TRA CỨU VÀ VẼ GIAO DIỆN KẾT QUẢ
// =========================================================================
async function goiTraCuuThongKe() {
    let namHoc = document.getElementById('inputNamHocTk').value.trim();
    let thang = document.getElementById('inputThangTk').value.replace('Tháng ', '').trim();
    let tuan = document.getElementById('inputTuanTk').value.replace('Tuần ', '').trim();
    let giaoVien = document.getElementById('inputGiaoVienTk').value.trim();

    let soTuanTraCuu = 1;
    let duLieuNam = cayDanhMucThongKe[namHoc];
    if (duLieuNam && (tuan === "Tất cả các tuần" || tuan === "")) {
        let dsTuan = [];
        if (thang === "Cả năm" || thang === "") {
            for (let th in duLieuNam.soDoThoiGian) { dsTuan = dsTuan.concat(duLieuNam.soDoThoiGian[th]); }
        } else {
            dsTuan = duLieuNam.soDoThoiGian[thang] || [];
        }
        dsTuan = [...new Set(dsTuan)];
        soTuanTraCuu = dsTuan.length > 0 ? dsTuan.length : 1;
    }

    if (thang === "Cả năm") thang = "";
    if (tuan === "Tất cả các tuần") tuan = "";
    if (giaoVien === "Toàn trường") giaoVien = ""; 

    const vungKetQua = document.getElementById('vungKetQuaThongKe');
    vungKetQua.classList.remove('p-4', 'overflow-auto');
    vungKetQua.classList.add('p-0', 'overflow-hidden');
    vungKetQua.innerHTML = `<div class="m-auto text-center text-blue-600 font-bold w-full"><div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>Đang truy xuất CSDL...</div>`;

    try {
        let mangDinhMucChuan = {};
        let mapTenGiaoVien = {}; 
        
        // [NÂNG CẤP]: Áp dụng fetchVoiCoCheThuLai để kết nối ổn định
        const fetchFunc = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;

        if (typeof duLieuDanhMucGV !== 'undefined' && duLieuDanhMucGV.length > 0) {
            duLieuDanhMucGV.forEach(g => {
                let ma = (g.maGv || g.hoTen || '').toString().trim();
                let maKey = ma.toLowerCase(); 
                mangDinhMucChuan[maKey] = parseInt(g.dinhMuc) || 0;
                mapTenGiaoVien[maKey] = (g.hoTen || ma).toString().trim();
            });
        } else {
            try {
                const resDM = await fetchFunc(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucGV`);
                const dataDM = await resDM.json();
                if (dataDM && dataDM.length > 1) {
                    for (let i = 1; i < dataDM.length; i++) {
                        let ma = (dataDM[i][0] || '').toString().trim();
                        let maKey = ma.toLowerCase();
                        let ten = (dataDM[i][1] || ma).toString().trim();
                        let dinhMuc = dataDM[i][3];
                        if (maKey !== '') {
                            mangDinhMucChuan[maKey] = parseInt(dinhMuc) || 0;
                            mapTenGiaoVien[maKey] = ten;
                        }
                    }
                }
            } catch(e) { console.warn("Lỗi tải định mức:", e); }
        }

        const phanHoi = await fetchFunc(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=traCuuThongKe&namHoc=${namHoc}&thang=${thang}&tuan=${tuan}&giaoVien=${giaoVien}`);
        duLieuThongKeHienTai = await phanHoi.json();
        
        let kieuGv = document.getElementById('inputGiaoVienTk').value.trim();
        
        // [NÂNG CẤP]: Sử dụng requestAnimationFrame để tránh nghẽn luồng render
        requestAnimationFrame(() => {
            if (kieuGv === "Toàn trường" || kieuGv === "") {
                veBangThongKeToanTruong(duLieuThongKeHienTai, namHoc, thang, tuan, soTuanTraCuu, mangDinhMucChuan, mapTenGiaoVien);
            } else {
                veMaTranThongKeCaNhan(duLieuThongKeHienTai, kieuGv, namHoc, thang, tuan);
            }
        });
        
        } catch (loi) {
        console.error("Lỗi Tra cứu:", loi);
        vungKetQua.innerHTML = `<div class="m-auto text-center text-red-500 font-bold w-full">Lỗi kết nối máy chủ dữ liệu.</div>`;
    }
}

function veBangThongKeToanTruong(duLieu, nam, thang, tuan, soTuanTraCuu, mangDinhMucChuan, mapTenGiaoVien) {
    let tDe = `Thống kê Toàn trường - Năm học ${nam}`;
    if (thang) tDe += ` | Tháng ${thang}`;
    if (tuan) tDe += ` | Tuần ${tuan}`;

    let tapHopNgay = new Set();
    duLieu.forEach(t => { 
        if (t.ngay && t.ngay.trim() !== "") {
            tapHopNgay.add(t.ngay.trim()); 
        }
    });
    
    let soNgayThucTe = 0;
    tapHopNgay.forEach(nStr => {
        let p = nStr.split('/');
        if (p.length === 3) {
            let ngay = parseInt(p[0], 10);
            let thg = parseInt(p[1], 10);
            let nm = parseInt(p[2], 10);
            let d = new Date(nm, thg - 1, ngay);
            if (!isNaN(d.getTime()) && d.getDay() !== 0) {
                soNgayThucTe++;
            }
        }
    });

    let hienThiGhiChuDm = "";
    if (soNgayThucTe > 0) {
        hienThiGhiChuDm = `Công thức: (${soNgayThucTe} ngày dạy / 5 ngày) × Định mức tuần`;
    } else {
        hienThiGhiChuDm = `Dựa trên mốc ${soTuanTraCuu} tuần giảng dạy`;
    }

    // [NÂNG CẤP]: Chuyển sang dùng Array.push để tối ưu bộ nhớ
    let htmlArr = [];
    htmlArr.push(`<div class="flex-none p-4 pb-2 bg-white z-30 relative shadow-sm border-b border-gray-300 text-center">
                    <h2 class="text-xl font-bold text-blue-900 uppercase tracking-wide">${tDe}</h2>
                    <p class="text-xs text-slate-500 font-semibold italic mt-0.5">${hienThiGhiChuDm}</p>
                </div>`);
    
    htmlArr.push(`<div class="flex-1 overflow-y-auto px-4 pb-4 pt-0 bg-gray-50 relative">
                <table class="w-full h-fit text-sm border-collapse border border-gray-400 bg-white">
                    <thead class="sticky top-0 z-20 shadow-sm ring-1 ring-gray-400">
                        <tr>
                            <th class="border border-gray-400 py-1.5 px-2 bg-slate-200 text-center w-[1%] whitespace-nowrap">STT</th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-slate-200 text-center">Giáo viên</th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-purple-100 text-purple-900 text-center w-[1%] whitespace-nowrap px-6">Định mức quy đổi <br><span class="text-xs font-normal">(Số thập phân)</span></th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-slate-200 text-center w-[1%] whitespace-nowrap px-6">Số tiết Sáng</th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-slate-200 text-center w-[1%] whitespace-nowrap px-6">Số tiết Chiều</th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-slate-200 text-slate-900 font-extrabold text-base text-center w-[1%] whitespace-nowrap px-8">Tổng đã dạy</th>
                            <th class="border border-gray-400 py-1.5 px-2 bg-yellow-100 text-yellow-900 font-extrabold text-base text-center w-[1%] whitespace-nowrap px-6">Thừa / Thiếu</th>
                        </tr>
                    </thead>
                    <tbody>`);
    
    let tongHopGv = {};
    duLieu.forEach(t => {
        if (!tongHopGv[t.maGv]) tongHopGv[t.maGv] = { sang: 0, chieu: 0, tong: 0 };
        if (t.buoi === "Sáng") tongHopGv[t.maGv].sang++;
        else tongHopGv[t.maGv].chieu++;
        tongHopGv[t.maGv].tong++;
    });

    let dsGv = Object.keys(tongHopGv).sort();
    dsGv.forEach((gv, index) => {
        let th = tongHopGv[gv];
        let gvKey = gv.toLowerCase(); 
        
        let dinhMuc1Tuan = mangDinhMucChuan[gvKey] || 0;
        let tenThuc = mapTenGiaoVien[gvKey] ? mapTenGiaoVien[gvKey] : gv;
        let tenHienThi = (tenThuc.toLowerCase() !== gv.toLowerCase()) 
                         ? `${tenThuc} <br><span class="text-[12px] text-gray-500 font-bold italic">(${gv})</span>` 
                         : tenThuc;
        
        let tongDinhMuc = 0;
        if (dinhMuc1Tuan > 0) {
            if (soNgayThucTe > 0) {
                tongDinhMuc = (soNgayThucTe / 5) * dinhMuc1Tuan;
            } else {
                tongDinhMuc = dinhMuc1Tuan * soTuanTraCuu;
            }
        }
        
        let bgClassTong = 'bg-white';
        let textClassTong = 'text-blue-700 font-bold';

        if (tongDinhMuc > 0) {
            if (th.tong > tongDinhMuc) { 
                bgClassTong = 'bg-red-100'; 
                textClassTong = 'text-red-600 font-extrabold'; 
            } else if (th.tong === tongDinhMuc) { 
                bgClassTong = 'bg-green-100'; 
                textClassTong = 'text-green-700 font-extrabold'; 
            } else { 
                bgClassTong = 'bg-white'; 
                textClassTong = 'text-blue-700 font-bold'; 
            }
        }

        let hiểnThịDinhMuc = tongDinhMuc > 0 ? (Number.isInteger(tongDinhMuc) ? tongDinhMuc : tongDinhMuc.toFixed(1)) : 0;

        let classChenhLech = "bg-white";
        let hienThiChenhLech = "";
        
        if (tongDinhMuc > 0) {
            let chenhLechRaw = th.tong - tongDinhMuc;
            let chenhLech = Math.round(chenhLechRaw * 10) / 10;
            
            if (chenhLech > 0) {
                classChenhLech = "text-red-600 font-extrabold bg-red-50";
                hienThiChenhLech = "+" + (Number.isInteger(chenhLech) ? chenhLech : chenhLech.toFixed(1));
            } else if (chenhLech < 0) {
                classChenhLech = "text-blue-600 font-extrabold bg-blue-50";
                hienThiChenhLech = (Number.isInteger(chenhLech) ? chenhLech : chenhLech.toFixed(1));
            } else {
                classChenhLech = "text-green-700 font-bold bg-green-50";
                hienThiChenhLech = "Đủ";
            }
        } else {
            classChenhLech = "text-gray-400 font-normal";
            hienThiChenhLech = "-";
        }

        htmlArr.push(`<tr class="hover:bg-slate-50 text-center transition-colors">
                    <td class="border border-gray-400 py-1.5 px-2 font-bold text-slate-500 leading-tight w-[1%] whitespace-nowrap">${index + 1}</td>
                    <td class="border border-gray-400 py-1.5 px-3 font-bold text-slate-800 leading-tight text-left">${tenHienThi}</td>
                    <td class="border border-gray-400 py-1.5 px-2 font-bold text-purple-700 bg-purple-50/30 w-[1%] whitespace-nowrap leading-tight text-base">${hiểnThịDinhMuc}</td>
                    <td class="border border-gray-400 py-1.5 px-2 w-[1%] whitespace-nowrap leading-tight">${th.sang}</td>
                    <td class="border border-gray-400 py-1.5 px-2 w-[1%] whitespace-nowrap leading-tight">${th.chieu}</td>
                    <td class="border border-gray-400 py-1.5 px-2 ${textClassTong} ${bgClassTong} text-base w-[1%] whitespace-nowrap leading-tight">${th.tong}</td>
                    <td class="border border-gray-400 py-1.5 px-2 ${classChenhLech} text-base w-[1%] whitespace-nowrap leading-tight">${hienThiChenhLech}</td>
                 </tr>`);
    });
    
    htmlArr.push(`</tbody></table></div>`);
    document.getElementById('vungKetQuaThongKe').innerHTML = htmlArr.join('');
}

function veMaTranThongKeCaNhan(duLieu, gv, nam, thang, tuan) {
    let tDe = `Lịch Trình Giảng Dạy: <span class="text-red-600">${gv}</span>`;
    
    let htmlArr = [];
    htmlArr.push(`<div class="flex-none py-1.5 px-4 bg-white z-30 relative shadow-sm border-b border-gray-300 text-center">
                    <h2 class="text-xl font-bold text-blue-900 mb-1.5 uppercase tracking-wide leading-tight">${tDe} <br><span class="text-sm text-slate-600 normal-case">(Năm học ${nam} ${thang ? '- Tháng ' + thang : ''} ${tuan ? '- Tuần ' + tuan : ''})</span></h2>
                    <div class="flex justify-center">
                        <div class="bg-blue-50 border border-blue-200 rounded shadow-sm px-6 py-1 text-center">
                            <p class="text-xs font-bold text-blue-700">TỔNG SỐ TIẾT ĐÃ DẠY</p>
                            <p class="text-2xl font-extrabold text-blue-900 leading-none">${duLieu.length}</p>
                        </div>
                    </div>
                </div>`);

    let luoi = {};
    let thuMacDinh = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    thuMacDinh.forEach(thu => { luoi[thu] = { "Sáng": {}, "Chiều": {} }; });

    duLieu.forEach(t => {
        let thu = t.thu; let buoi = t.buoi; let tiet = t.tiet;
        if (luoi[thu] && luoi[thu][buoi]) {
            if (!luoi[thu][buoi][tiet]) luoi[thu][buoi][tiet] = {};
            let khoa = `${t.monHoc} - ${t.maLop}`;
            luoi[thu][buoi][tiet][khoa] = (luoi[thu][buoi][tiet][khoa] || 0) + 1;
        }
    });

    htmlArr.push(`<div class="flex-1 overflow-y-auto px-4 pb-4 pt-0 bg-gray-50 relative">
                <table class="w-full text-center border-collapse border border-gray-400 bg-white">
                    <thead class="sticky top-0 z-20 shadow-sm ring-1 ring-gray-400">
                        <tr>
                            <th class="border border-gray-400 px-4 py-2 bg-slate-200 w-[1%] whitespace-nowrap">Thứ</th>
                            <th class="border border-gray-400 px-4 py-2 bg-slate-200 w-[1%] whitespace-nowrap">Buổi</th>
                            <th class="border border-gray-400 px-4 py-2 bg-slate-200 w-[1%] whitespace-nowrap">Tiết</th>
                            <th class="border border-gray-400 p-2 bg-slate-200 w-auto">Chi tiết Lên Lớp (Môn - Lớp)</th>
                        </tr>
                    </thead>
                    <tbody>`);

    thuMacDinh.forEach(thu => {
        // [SỬA LỖI UI QUAN TRỌNG]: Tính toán chính xác tổng số dòng của cả ngày trước khi vẽ HTML
        // Đảm bảo thuộc tính rowspan của cột "Thứ" không bị gãy cấu trúc khi có buổi học bị trống hoàn toàn
        let soDongThu = Object.keys(luoi[thu]["Sáng"]).length + Object.keys(luoi[thu]["Chiều"]).length;
        let daInCotThu = false;

        ["Sáng", "Chiều"].forEach(buoi => {
            let dsTiet = Object.keys(luoi[thu][buoi]).sort((a, b) => a - b);
            if (dsTiet.length > 0) {
                dsTiet.forEach((tiet, index) => {
                    htmlArr.push(`<tr class="hover:bg-slate-50 transition-colors">`);
                    
                    if (!daInCotThu) { 
                        htmlArr.push(`<td rowspan="${soDongThu}" class="border border-gray-400 font-extrabold bg-slate-50 w-[1%] whitespace-nowrap px-4">${thu}</td>`);
                        daInCotThu = true;
                    }
                    if (index === 0) {
                        htmlArr.push(`<td rowspan="${dsTiet.length}" class="border border-gray-400 font-bold w-[1%] whitespace-nowrap px-4">${buoi}</td>`);
                    }
                    
                    htmlArr.push(`<td class="border border-gray-400 py-1 px-4 font-bold text-slate-800 w-[1%] whitespace-nowrap">${tiet}</td>
                             <td class="border border-gray-400 py-1 px-2 text-left space-y-1">`);
                    
                    let thongTinTiet = luoi[thu][buoi][tiet];
                    for (let khoa in thongTinTiet) {
                        let soLan = thongTinTiet[khoa];
                        htmlArr.push(`<div class="inline-block bg-white border border-gray-300 rounded px-2 py-1 text-sm font-semibold shadow-sm mr-1 mb-1">
                                    <span class="text-blue-800">${khoa}</span> 
                                    <span class="text-xs bg-red-100 text-red-700 px-1 rounded ml-1" title="Số tiết dạy môn này tại tiết này">${soLan} tiết</span>
                                 </div>`);
                    }
                    htmlArr.push(`</td></tr>`);
                });
            }
        });
    });

    htmlArr.push(`</tbody></table></div>`);
    document.getElementById('vungKetQuaThongKe').innerHTML = htmlArr.join('');
}
