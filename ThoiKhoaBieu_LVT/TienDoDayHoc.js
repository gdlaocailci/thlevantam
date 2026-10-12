/**
 * =========================================================================
 * PHÂN HỆ: KIỂM TRA TIẾN ĐỘ DẠY HỌC (ĐỘC LẬP - MODULAR)
 * Tệp: TienDoDayHoc.js
 * Chức năng: Đối soát tiến độ giảng dạy chuẩn theo Khung chương trình
 *            với tiến độ thực tế (TKB & Sổ đầu bài) đến tuần hiện tại.
 * =========================================================================
 */

let duLieuTienDoToanTruong = [];
let boLocTienDoHienTai = {
    lop: '',
    mon: '',
    trangThai: '',
    tuKhoa: ''
};

// =========================================================================
// 1. KHỞI TẠO VÀ TỰ ĐỘNG CHÈN KHUNG MODAL VÀO DOM (PLUG & PLAY)
// =========================================================================
function khoiTaoModalTienDoDOM() {
    if (document.getElementById('modalKiemTraTienDo')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'modalKiemTraTienDo';
    modalDiv.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] font-sans p-2 md:p-4';
    modalDiv.innerHTML = `
        <div id="hopNoiDungModalTienDo" class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 animate-fadeIn transition-all duration-200">
            
            <!-- HEADER MODAL -->
            <div class="bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900 text-white px-5 py-3.5 flex justify-between items-center border-b shadow-md flex-none">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-cyan-200 shadow-inner">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 id="tieuDeModalTienDo" class="text-base md:text-lg font-extrabold uppercase tracking-wide text-white drop-shadow">
                            Báo Cáo Tiến Độ Dạy Học - Tuần Đang Xem
                        </h3>
                        <p class="text-xs text-cyan-200 font-medium">Đối chiếu định mức Khung chương trình với thực tế giảng dạy</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="xuatExcelTienDoDayHoc()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow flex items-center gap-1.5 transition-all cursor-pointer" title="Xuất báo cáo Excel">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span>Xuất Excel</span>
                    </button>
                    <!-- NÚT TOÀN MÀN HÌNH / CO LẠI -->
                    <button id="btnToggleFullscreenTienDo" onclick="toggleFullscreenTienDo()" class="bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer" title="Toàn màn hình">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                        </svg>
                        <span class="hidden sm:inline">Toàn màn hình</span>
                    </button>
                    <button onclick="dongModalKiemTraTienDo()" class="text-white/80 hover:text-white hover:bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-2xl font-bold transition-colors cursor-pointer" title="Đóng">&times;</button>
                </div>
            </div>

            <!-- THANH THỐNG KÊ NHANH (KPI CARDS) -->
            <div id="vungTheTienDoKPI" class="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-none">
                <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">📚</div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-500 uppercase">Tổng số môn/lớp</div>
                        <div id="kpiTongSo" class="text-base font-extrabold text-slate-800">--</div>
                    </div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">✔</div>
                    <div>
                        <div class="text-[11px] font-bold text-emerald-700 uppercase">Đúng tiến độ</div>
                        <div id="kpiDungTienDo" class="text-base font-extrabold text-emerald-700">--</div>
                    </div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-rose-200 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-lg">⚠</div>
                    <div>
                        <div class="text-[11px] font-bold text-rose-700 uppercase">Chậm tiến độ</div>
                        <div id="kpiChamTienDo" class="text-base font-extrabold text-rose-700">--</div>
                    </div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg">⏩</div>
                    <div>
                        <div class="text-[11px] font-bold text-indigo-700 uppercase">Nhanh tiến độ</div>
                        <div id="kpiNhanhTienDo" class="text-base font-extrabold text-indigo-700">--</div>
                    </div>
                </div>
            </div>

            <!-- BỘ LỌC TỨC THÌ (REAL-TIME FILTER BAR) -->
            <div class="bg-slate-100 px-5 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 flex-none text-xs">
                <div class="flex flex-wrap items-center gap-2 flex-1">
                    <!-- Lọc Lớp -->
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-600">Lớp:</span>
                        <select id="locTienDo_Lop" onchange="locBangTienDoDayHoc()" class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                            <option value="">-- Tất cả lớp --</option>
                        </select>
                    </div>

                    <!-- Lọc Môn -->
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-600">Môn:</span>
                        <select id="locTienDo_Mon" onchange="locBangTienDoDayHoc()" class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                            <option value="">-- Tất cả môn --</option>
                        </select>
                    </div>

                    <!-- Lọc Trạng thái -->
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-600">Trạng thái:</span>
                        <select id="locTienDo_TrangThai" onchange="locBangTienDoDayHoc()" class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                            <option value="">-- Tất cả trạng thái --</option>
                            <option value="cham" class="text-rose-700 font-bold">🔴 Chỉ xem lớp Chậm tiến độ</option>
                            <option value="dung" class="text-emerald-700 font-bold">🟢 Chỉ xem lớp Đúng tiến độ</option>
                            <option value="nhanh" class="text-indigo-700 font-bold">🔵 Chỉ xem lớp Nhanh tiến độ</option>
                        </select>
                    </div>
                </div>

                <!-- Tìm kiếm từ khóa -->
                <div class="relative w-full sm:w-56">
                    <input type="text" id="locTienDo_TuKhoa" oninput="locBangTienDoDayHoc()" placeholder="Tìm kiếm nhanh..." class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700">
                    <svg class="w-4 h-4 absolute left-2.5 top-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <!-- BẢNG DỮ LIỆU TIẾN ĐỘ -->
            <div class="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar">
                <table id="bangTienDoDayHoc" class="w-full text-center border-collapse text-xs md:text-sm" style="font-family:'Times New Roman',Times,serif;">
                    <thead class="sticky top-0 z-20 bg-slate-200 text-slate-900 font-extrabold shadow-sm">
                        <tr>
                            <th class="p-2.5 border border-slate-300 w-12">STT</th>
                            <th class="p-2.5 border border-slate-300 w-24">Lớp</th>
                            <th class="p-2.5 border border-slate-300 text-left pl-4 min-w-[140px]">Môn học</th>
                            <th class="p-2.5 border border-slate-300 w-28 bg-blue-50 text-blue-900">Định mức/Tuần</th>
                            <th class="p-2.5 border border-slate-300 w-32 bg-indigo-50 text-indigo-900">Tiết chuẩn lũy kế</th>
                            <th class="p-2.5 border border-slate-300 w-32 bg-amber-50 text-amber-900">Thực dạy tích lũy</th>
                            <th class="p-2.5 border border-slate-300 w-28">Chênh lệch</th>
                            <th class="p-2.5 border border-slate-300 min-w-[160px]">Đánh giá Tiến độ</th>
                            <th class="p-2.5 border border-slate-300 min-w-[140px] text-left pl-3">Đề xuất / Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody id="vungDuLieuTienDoDayHoc">
                        <tr><td colspan="9" class="py-12 text-center text-slate-500 font-bold">Đang tải và đối soát dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- FOOTER MODAL -->
            <div class="bg-slate-100 px-5 py-3 border-t border-slate-300 flex justify-between items-center flex-none">
                <div class="text-xs text-slate-500 italic">
                    * Tiết chuẩn = (Số tuần đang xem) × (Định mức môn/tuần trong Khung CT).
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="dongModalKiemTraTienDo()" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-5 py-1.5 rounded-lg text-xs shadow transition cursor-pointer">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

// =========================================================================
// 2. MỞ VÀ ĐÓNG MODAL
// =========================================================================
window.moModalKiemTraTienDo = async function() {
    khoiTaoModalTienDoDOM();
    const modal = document.getElementById('modalKiemTraTienDo');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const tieuDe = document.getElementById('tieuDeModalTienDo');
    let tuanHienTai = (typeof tuanDangXem !== 'undefined' && tuanDangXem) ? tuanDangXem : 1;
    let namHoc = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? thongSoHocVu.NAM_HOC : '';
    if (tieuDe) {
        tieuDe.innerText = `BÁO CÁO TIẾN ĐỘ DẠY HỌC - TUẦN ${tuanHienTai} ${namHoc ? '(' + namHoc + ')' : ''}`;
    }

    await napVaTinhToanTienDoDayHoc(tuanHienTai, namHoc);
};

let isTienDoFullscreen = false;

window.toggleFullscreenTienDo = function() {
    isTienDoFullscreen = !isTienDoFullscreen;
    const modalDiv = document.getElementById('modalKiemTraTienDo');
    const hopNoiDung = document.getElementById('hopNoiDungModalTienDo');
    const btn = document.getElementById('btnToggleFullscreenTienDo');
    if (!modalDiv || !hopNoiDung) return;

    if (isTienDoFullscreen) {
        // Phóng to toàn màn hình
        modalDiv.classList.remove('p-2', 'md:p-4');
        modalDiv.classList.add('p-0');

        hopNoiDung.classList.remove('max-w-6xl', 'max-h-[92vh]', 'rounded-2xl', 'border');
        hopNoiDung.classList.add('w-screen', 'h-screen', 'max-w-none', 'max-h-none', 'rounded-none', 'border-0');

        if (btn) {
            btn.title = "Co lại (Thu nhỏ màn hình)";
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 9L4 4m0 0h4m-4 0v4m11 0l5-5m0 0h-4m4 0v4M9 15l-5 5m0 0h4m-4 0v-4m11 0l5 5m0 0h-4m4 0v-4"></path>
                </svg>
                <span class="hidden sm:inline">Co lại</span>
            `;
        }
    } else {
        // Thu nhỏ lại cửa sổ chuẩn
        modalDiv.classList.remove('p-0');
        modalDiv.classList.add('p-2', 'md:p-4');

        hopNoiDung.classList.remove('w-screen', 'h-screen', 'max-w-none', 'max-h-none', 'rounded-none', 'border-0');
        hopNoiDung.classList.add('max-w-6xl', 'max-h-[92vh]', 'rounded-2xl', 'border');

        if (btn) {
            btn.title = "Toàn màn hình";
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
                <span class="hidden sm:inline">Toàn màn hình</span>
            `;
        }
    }
};

window.dongModalKiemTraTienDo = function() {
    const modal = document.getElementById('modalKiemTraTienDo');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (isTienDoFullscreen) {
        toggleFullscreenTienDo();
    }
};

// =========================================================================
// 3. THUẬT TOÁN TÍNH TOÁN TIẾN ĐỘ DẠY HỌC TOÀN TRƯỜNG
// =========================================================================
async function napVaTinhToanTienDoDayHoc(tuanHienTai, namHoc) {
    const tbody = document.getElementById('vungDuLieuTienDoDayHoc');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-slate-600 font-bold"><div class="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3"></div>Đang đối soát dữ liệu tiến độ từ Khung chương trình và TKB...</td></tr>`;
    }

    try {
        let tichLuyQuaKhu = {};
        if (tuanHienTai > 1 && typeof CAU_HINH_FRONTEND !== 'undefined') {
            try {
                let urlTichLuy = `${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layTienDoTichLuy&tuan=${tuanHienTai}&namHoc=${encodeURIComponent(namHoc || '')}`;
                let res = await fetch(urlTichLuy);
                tichLuyQuaKhu = await res.json();
            } catch(eTL) {
                console.warn("Không lấy được tích lũy quá khứ:", eTL);
            }
        }

        // Đếm số tiết thực dạy trong tuần hiện tại từ duLieuTkbHienTai
        let tietTuanNay = {};
        if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai)) {
            duLieuTkbHienTai.forEach(t => {
                let lop = String(t.maLop || '').trim();
                let mon = String(t.monHoc || '').trim();
                if (lop && mon && mon !== '---' && mon.toLowerCase() !== 'môn học') {
                    if (!tietTuanNay[lop]) tietTuanNay[lop] = {};
                    tietTuanNay[lop][mon] = (tietTuanNay[lop][mon] || 0) + 1;
                }
            });
        }

        const khungCT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.KHUNG_CHUONG_TRINH) ? thongSoHocVu.KHUNG_CHUONG_TRINH : {};
        const dsLop = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_LOP) ? thongSoHocVu.DANH_SACH_LOP : [];
        const dsMon = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_MON_HOC) ? thongSoHocVu.DANH_SACH_MON_HOC : [];

        duLieuTienDoToanTruong = [];

        dsLop.forEach(lop => {
            let dinhMucLop = khungCT[lop] || {};
            let cacMonCuaLop = new Set([...Object.keys(dinhMucLop), ...dsMon]);

            cacMonCuaLop.forEach(mon => {
                let dmTuan = parseInt(dinhMucLop[mon], 10) || 0;
                // Nếu môn học có định mức hoặc có tiết đã dạy
                let quaKhu = (tichLuyQuaKhu[lop] && tichLuyQuaKhu[lop][mon]) ? tichLuyQuaKhu[lop][mon] : 0;
                let tuanNay = (tietTuanNay[lop] && tietTuanNay[lop][mon]) ? tietTuanNay[lop][mon] : 0;
                let thucDay = quaKhu + tuanNay;

                if (dmTuan > 0 || thucDay > 0) {
                    let tietChuan = tuanHienTai * dmTuan;
                    let doLech = thucDay - tietChuan;
                    
                    let loaiTrangThai = 'dung'; // dung, cham, nhanh
                    let tenTrangThai = 'Đảm bảo tiến độ';
                    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let deXuat = 'Tiến độ giảng dạy đúng kế hoạch.';

                    if (doLech < 0) {
                        loaiTrangThai = 'cham';
                        tenTrangThai = `Chậm ${Math.abs(doLech)} tiết`;
                        badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
                        deXuat = `Cần bố trí dạy bù ${Math.abs(doLech)} tiết.`;
                    } else if (doLech > 0) {
                        loaiTrangThai = 'nhanh';
                        tenTrangThai = `Nhanh +${doLech} tiết`;
                        badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
                        deXuat = `Vượt ${doLech} tiết so với quy chuẩn.`;
                    }

                    duLieuTienDoToanTruong.push({
                        lop: lop,
                        mon: mon,
                        dinhMucTuan: dmTuan,
                        tietChuan: tietChuan,
                        thucDay: thucDay,
                        doLech: doLech,
                        loaiTrangThai: loaiTrangThai,
                        tenTrangThai: tenTrangThai,
                        badgeClass: badgeClass,
                        deXuat: deXuat
                    });
                }
            });
        });

        // Nạp các tùy chọn cho bộ lọc
        napTuyChonBoLocTienDo();
        
        // Vẽ bảng và cập nhật thẻ KPI
        veBangTienDo();

    } catch (loi) {
        console.error("Lỗi tính toán tiến độ:", loi);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-rose-600 font-bold">Đã xảy ra sự cố trong quá trình đối soát: ${loi.message}</td></tr>`;
        }
    }
}

// ==========================================
// 4. KẾT XUẤT BẢNG VÀ THỐNG KÊ KPI
// ==========================================
function napTuyChonBoLocTienDo() {
    const selLop = document.getElementById('locTienDo_Lop');
    const selMon = document.getElementById('locTienDo_Mon');
    if (!selLop || !selMon) return;

    let dsLopSet = new Set();
    let dsMonSet = new Set();

    duLieuTienDoToanTruong.forEach(item => {
        dsLopSet.add(item.lop);
        dsMonSet.add(item.mon);
    });

    let htmlLop = '<option value="">-- Tất cả lớp --</option>';
    Array.from(dsLopSet).sort().forEach(l => { htmlLop += `<option value="${l}">${l}</option>`; });
    selLop.innerHTML = htmlLop;

    let htmlMon = '<option value="">-- Tất cả môn --</option>';
    Array.from(dsMonSet).sort().forEach(m => { htmlMon += `<option value="${m}">${m}</option>`; });
    selMon.innerHTML = htmlMon;
}

window.locBangTienDoDayHoc = function() {
    const selLop = document.getElementById('locTienDo_Lop');
    const selMon = document.getElementById('locTienDo_Mon');
    const selTT = document.getElementById('locTienDo_TrangThai');
    const txtTK = document.getElementById('locTienDo_TuKhoa');

    boLocTienDoHienTai = {
        lop: selLop ? selLop.value : '',
        mon: selMon ? selMon.value : '',
        trangThai: selTT ? selTT.value : '',
        tuKhoa: txtTK ? txtTK.value.trim().toLowerCase() : ''
    };

    veBangTienDo();
};

function veBangTienDo() {
    const tbody = document.getElementById('vungDuLieuTienDoDayHoc');
    if (!tbody) return;

    // Lọc dữ liệu
    let danhSachHienThi = duLieuTienDoToanTruong.filter(item => {
        if (boLocTienDoHienTai.lop && item.lop !== boLocTienDoHienTai.lop) return false;
        if (boLocTienDoHienTai.mon && item.mon !== boLocTienDoHienTai.mon) return false;
        if (boLocTienDoHienTai.trangThai && item.loaiTrangThai !== boLocTienDoHienTai.trangThai) return false;
        if (boLocTienDoHienTai.tuKhoa) {
            let chuoiTim = `${item.lop} ${item.mon} ${item.tenTrangThai} ${item.deXuat}`.toLowerCase();
            if (!chuoiTim.includes(boLocTienDoHienTai.tuKhoa)) return false;
        }
        return true;
    });

    // Cập nhật KPI tổng quan
    let demTong = duLieuTienDoToanTruong.length;
    let demDung = duLieuTienDoToanTruong.filter(i => i.loaiTrangThai === 'dung').length;
    let demCham = duLieuTienDoToanTruong.filter(i => i.loaiTrangThai === 'cham').length;
    let demNhanh = duLieuTienDoToanTruong.filter(i => i.loaiTrangThai === 'nhanh').length;

    const elTong = document.getElementById('kpiTongSo');
    const elDung = document.getElementById('kpiDungTienDo');
    const elCham = document.getElementById('kpiChamTienDo');
    const elNhanh = document.getElementById('kpiNhanhTienDo');

    if (elTong) elTong.innerText = demTong;
    if (elDung) elDung.innerText = `${demDung} (${demTong > 0 ? Math.round(demDung / demTong * 100) : 0}%)`;
    if (elCham) elCham.innerText = `${demCham} (${demTong > 0 ? Math.round(demCham / demTong * 100) : 0}%)`;
    if (elNhanh) elNhanh.innerText = `${demNhanh} (${demTong > 0 ? Math.round(demNhanh / demTong * 100) : 0}%)`;

    if (danhSachHienThi.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-10 text-center text-slate-400 italic font-semibold">Không tìm thấy bản ghi nào khớp với bộ lọc.</td></tr>`;
        return;
    }

    let html = '';
    danhSachHienThi.forEach((row, idx) => {
        let bgRow = '';
        if (row.loaiTrangThai === 'cham') bgRow = 'bg-rose-50/60 hover:bg-rose-100/60';
        else if (row.loaiTrangThai === 'nhanh') bgRow = 'bg-indigo-50/50 hover:bg-indigo-100/50';
        else bgRow = 'hover:bg-slate-100/80';

        let dauLech = row.doLech > 0 ? `+${row.doLech}` : `${row.doLech}`;
        let mauLech = row.doLech === 0 ? 'text-slate-600 font-bold' : (row.doLech > 0 ? 'text-indigo-700 font-bold' : 'text-rose-700 font-extrabold');

        html += `
            <tr class="transition-colors border-b border-slate-200 ${bgRow}">
                <td class="p-2 border-r border-slate-200 text-slate-500 font-bold">${idx + 1}</td>
                <td class="p-2 border-r border-slate-200 font-extrabold text-blue-900">${row.lop}</td>
                <td class="p-2 border-r border-slate-200 text-left pl-4 font-bold text-slate-800">${row.mon}</td>
                <td class="p-2 border-r border-slate-200 font-semibold text-slate-700 bg-blue-50/30">${row.dinhMucTuan}</td>
                <td class="p-2 border-r border-slate-200 font-extrabold text-indigo-900 bg-indigo-50/30">${row.tietChuan}</td>
                <td class="p-2 border-r border-slate-200 font-extrabold text-amber-900 bg-amber-50/30">${row.thucDay}</td>
                <td class="p-2 border-r border-slate-200 ${mauLech}">${dauLech}</td>
                <td class="p-2 border-r border-slate-200">
                    <span class="inline-block px-2.5 py-1 rounded-full text-xs border shadow-sm ${row.badgeClass}">
                        ${row.tenTrangThai}
                    </span>
                </td>
                <td class="p-2 text-left pl-3 text-xs font-medium text-slate-600">${row.deXuat}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// 5. XUẤT BÁO CÁO EXCEL BẰNG SHEETJS
// ==========================================
window.xuatExcelTienDoDayHoc = function() {
    if (!duLieuTienDoToanTruong || duLieuTienDoToanTruong.length === 0) {
        alert("Chưa có dữ liệu tiến độ để xuất.");
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert("Thư viện Excel đang được nạp, vui lòng bấm lại sau 3 giây.");
        return;
    }

    let tuanHienTai = (typeof tuanDangXem !== 'undefined' && tuanDangXem) ? tuanDangXem : 1;
    let namHoc = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? thongSoHocVu.NAM_HOC : '';

    let headerTieuDe = [
        [`BÁO CÁO TIẾN ĐỘ DẠY HỌC - TUẦN ${tuanHienTai} ${namHoc ? '(' + namHoc + ')' : ''}`],
        [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`],
        []
    ];

    let headerBang = ['STT', 'Lớp', 'Môn học', 'Định mức/Tuần', 'Tiết chuẩn Tuần ' + tuanHienTai, 'Thực dạy tích lũy', 'Chênh lệch', 'Đánh giá tiến độ', 'Đề xuất'];
    let rowsData = [headerBang];

    duLieuTienDoToanTruong.forEach((row, idx) => {
        rowsData.push([
            idx + 1,
            row.lop,
            row.mon,
            row.dinhMucTuan,
            row.tietChuan,
            row.thucDay,
            row.doLech > 0 ? `+${row.doLech}` : row.doLech,
            row.tenTrangThai,
            row.deXuat
        ]);
    });

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(headerTieuDe.concat(rowsData));

    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 10 }, // Lớp
        { wch: 22 }, // Môn
        { wch: 15 }, // Định mức
        { wch: 18 }, // Tiết chuẩn
        { wch: 18 }, // Thực dạy
        { wch: 12 }, // Chênh lệch
        { wch: 20 }, // Đánh giá
        { wch: 30 }  // Đề xuất
    ];

    XLSX.utils.book_append_sheet(wb, ws, "TienDoDayHoc");
    XLSX.writeFile(wb, `BaoCao_TienDo_Tuan_${tuanHienTai}.xlsx`);
};
