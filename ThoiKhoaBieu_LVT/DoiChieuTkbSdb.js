// =========================================================================
// TỆP ĐỘC LẬP: DoiChieuTkbSdb.js (PHIÊN BẢN 3.0 - ĐỒNG BỘ SÂU RAM & CACHE 2 CHIỀU)
// TÍNH NĂNG: ĐỐI CHIẾU & TỰ ĐỘNG SỬA LỆCH GIỮA SỔ ĐẦU BÀI VÀ THỜI KHÓA BIỂU
// Nguyên tắc:
// 1. Chạy 100% trên RAM/Cache đã nạp sẵn (0ms), không làm chậm hệ thống.
// 2. Tự động hợp nhất TKB mới nhất từ lưới UI TKB và boNhoTkbTheoTuan (mọi tuần) sang RAM SĐB.
// 3. Tự động đồng bộ ngược vào RAM + Snapshot Cache (SDB_SNAPSHOT_FAST_V2) ngay khi Lưu SĐB hoặc Lưu TKB.
// 4. Sửa triệt để lỗi ghi đè lại Tiết PPCT cũ của hàm thucThiKetXuatSoDauBaiLenLuoi() trong SoDauBai.js.
// Thiết kế và phát triển Hoàng Ngọc Lâm
// =========================================================================

(function() {
    'use strict';

    let ketQuaDoiChieuToanCuc = [];
    let danhSachTuanCoDuLieu = [];
    let danhSachLopCoDuLieu = [];
    let _daGanHookDongBoSauKhiLuu = false;

    // -------------------------------------------------------------------------
    // 1. TỰ ĐỘNG GẮN NÚT CÔNG CỤ VÀ KHỞI TẠO MODAL TRÊN DOM
    // -------------------------------------------------------------------------
    function khoiTaoGiaoDienDoiChieu() {
        const btnDongBoTenBai = document.getElementById('btnDongBoTenBai');
        if (btnDongBoTenBai && btnDongBoTenBai.parentElement && !document.getElementById('btnMoDoiChieuSDB')) {
            const btnSDB = document.createElement('button');
            btnSDB.id = 'btnMoDoiChieuSDB';
            btnSDB.type = 'button';
            btnSDB.onclick = function() { window.moModalDoiChieuTkbSdb('SDB'); };
            btnSDB.className = 'bg-teal-600 hover:bg-teal-700 text-white font-bold px-3.5 py-2 text-xs shadow transition duration-200 rounded flex items-center gap-1.5 cursor-pointer';
            btnSDB.title = 'Kiểm tra và tự động khắc phục chênh lệch giữa Sổ đầu bài và Thời khóa biểu (0ms)';
            btnSDB.innerHTML = `
                <svg class="w-4 h-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 3h5v5"></path><path d="M8 3H3v5"></path>
                    <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"></path>
                    <path d="m15 9 6-6"></path>
                </svg>
                <span>Đối chiếu TKB - SĐB</span>
            `;
            btnDongBoTenBai.parentElement.insertBefore(btnSDB, btnDongBoTenBai);
        }

        const btnKiemTraTienDo = document.getElementById('btnKiemTraTienDo');
        if (btnKiemTraTienDo && btnKiemTraTienDo.parentElement && !document.getElementById('btnMoDoiChieuTKB')) {
            const btnTKB = document.createElement('button');
            btnTKB.id = 'btnMoDoiChieuTKB';
            btnTKB.type = 'button';
            btnTKB.onclick = function() { window.moModalDoiChieuTkbSdb('TKB'); };
            btnTKB.className = 'bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 text-sm shadow transition duration-200 items-center gap-1.5 rounded flex whitespace-nowrap flex-none group cursor-pointer';
            btnTKB.title = 'Kiểm tra sự khớp nhau giữa Thời khóa biểu và Sổ đầu bài các lớp';
            btnTKB.innerHTML = `
                <svg class="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span>Đối chiếu SĐB</span>
            `;
            btnKiemTraTienDo.parentElement.insertBefore(btnTKB, btnKiemTraTienDo.nextSibling);
        }

        if (!document.getElementById('modalDoiChieuTkbSdb')) {
            const modalHTML = `
            <div id="modalDoiChieuTkbSdb" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] font-sans reactbits-fade-in p-2 md:p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-[1360px] h-[90vh] flex flex-col overflow-hidden border border-slate-300">
                    <!-- HEADER -->
                    <div class="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white px-4 py-3 flex justify-between items-center border-b shadow-md flex-none">
                        <div class="flex items-center gap-2.5">
                            <div class="p-1.5 bg-white/15 rounded-lg">
                                <svg class="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-base md:text-lg font-extrabold uppercase tracking-wide leading-tight">Trung tâm Đối chiếu & Tự động Khắc phục Chênh lệch TKB - Sổ Đầu Bài</h3>
                                <p class="text-[11px] text-teal-100 font-medium">Quét 6 trục tọa độ trên RAM (0ms) • Tự động đồng bộ sâu RAM + Snapshot Cache ngay sau khi Lưu</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="xuatExcelBaoCaoDoiChieu()" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow flex items-center gap-1.5 transition cursor-pointer" title="Xuất danh sách chênh lệch ra file Excel">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                <span>Xuất Excel</span>
                            </button>
                            <button onclick="dongModalDoiChieuTkbSdb()" class="text-white hover:text-red-200 text-3xl leading-none px-2 transition-colors cursor-pointer" title="Đóng">&times;</button>
                        </div>
                    </div>

                    <!-- BỘ LỌC & THỐNG KÊ NHANH -->
                    <div class="bg-slate-100 p-3 border-b border-slate-300 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 flex-none">
                        <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                            <div class="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                                <span class="text-xs font-bold text-slate-600">Tuần:</span>
                                <select id="locTuanDoiChieu" onchange="thucThiQuetDoiChieuTrenRAM()" class="text-xs font-extrabold text-teal-900 bg-transparent outline-none cursor-pointer">
                                    <option value="ALL">Tất cả các tuần</option>
                                </select>
                            </div>

                            <div class="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                                <span class="text-xs font-bold text-slate-600">Lớp:</span>
                                <select id="locLopDoiChieu" onchange="ketXuatBangDoiChieu()" class="text-xs font-extrabold text-blue-900 bg-transparent outline-none cursor-pointer">
                                    <option value="ALL">Toàn trường</option>
                                </select>
                            </div>

                            <div class="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                                <span class="text-xs font-bold text-slate-600">Loại lệch:</span>
                                <select id="locLoaiLoiDoiChieu" onchange="ketXuatBangDoiChieu()" class="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer">
                                    <option value="ALL">Tất cả chênh lệch</option>
                                    <option value="LECH_MON">1. Lệch Môn học (Đổi môn)</option>
                                    <option value="THIEU_TRONG_SDB">2. Có trên TKB nhưng SĐB trống</option>
                                    <option value="DU_TRONG_SDB">3. Có trong SĐB nhưng TKB trống</option>
                                    <option value="LECH_GV">4. Lệch Giáo viên / Chữ ký cũ</option>
                                    <option value="LECH_PPCT">5. Sai lệch Tiết PPCT / Tên bài</option>
                                    <option value="CHUA_LUU_SDB">6. Lớp chưa lưu Sổ đầu bài tuần</option>
                                </select>
                            </div>

                            <div class="relative flex-1 min-w-[180px]">
                                <input type="text" id="timKiemDoiChieu" oninput="ketXuatBangDoiChieu()" placeholder="Tìm môn, tên GV, bài dạy..." class="w-full pl-7 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>

                        <div id="vungThongKeNhanhDoiChieu" class="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end"></div>
                    </div>

                    <!-- BẢNG KẾT QUẢ CHI TIẾT -->
                    <div class="flex-1 overflow-auto bg-slate-50 p-3 custom-scrollbar">
                        <table class="w-full border-collapse bg-white shadow-xs rounded-lg overflow-hidden text-xs" style="font-family: 'Times New Roman', Times, serif;">
                            <thead class="bg-slate-200 text-slate-900 font-bold sticky top-0 z-20 shadow-xs text-[13px]">
                                <tr>
                                    <th class="border border-slate-300 p-2 w-10 text-center">STT</th>
                                    <th class="border border-slate-300 p-2 w-28 text-center">Tọa độ Tiết</th>
                                    <th class="border border-slate-300 p-2 w-44 text-center">Loại chênh lệch & Mức độ</th>
                                    <th class="border border-slate-300 p-2 min-w-[180px]">Trên Thời khóa biểu (Chuẩn)</th>
                                    <th class="border border-slate-300 p-2 min-w-[200px]">Trong Sổ đầu bài (Đang lệch)</th>
                                    <th class="border border-slate-300 p-2 min-w-[220px]">Thông tin cần biết & Hướng khắc phục</th>
                                    <th class="border border-slate-300 p-2 w-44 text-center">Thao tác khắc phục</th>
                                </tr>
                            </thead>
                            <tbody id="tbodyKetQuaDoiChieu" class="divide-y divide-slate-200 text-[13.5px]">
                                <tr><td colspan="7" class="p-8 text-center text-slate-500 font-bold">Đang phân tích dữ liệu...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- FOOTER -->
                    <div class="bg-slate-100 px-4 py-2.5 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2 flex-none text-xs">
                        <div class="text-slate-600 font-medium">
                            💡 <b>Đồng bộ 2 chiều:</b> Mọi thao tác Lưu Sổ đầu bài hoặc Lưu Thời khóa biểu đều tự động cập nhật ngay vào RAM và bộ nhớ đệm Snapshot để đối chiếu chính xác 100%.
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="thucThiQuetDoiChieuTrenRAM(true)" class="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-1.5 rounded-lg shadow transition cursor-pointer">
                                🔄 Quét làm mới (0ms)
                            </button>
                            <button onclick="dongModalDoiChieuTkbSdb()" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-5 py-1.5 rounded-lg shadow transition cursor-pointer">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        caiDatHookDongBoSauKhiLuu();
    }

    // -------------------------------------------------------------------------
    // 2. HÀM CHUẨN HÓA DỮ LIỆU ĐỂ ĐỐI SÁNH CHÍNH XÁC 100%
    // -------------------------------------------------------------------------
    function chuanHoaChuoi(str) {
        if (!str) return '';
        return String(str).trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
    }

    function chuanHoaThu(thuStr) {
        if (!thuStr) return '';
        let s = String(thuStr).trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
        if (s.match(/^[2-7]$/)) return 'Thứ ' + s;
        if (s === 'cn' || s === 'chủ nhật' || s === 'chu nhat') return 'Chủ nhật';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function chuanHoaBuoi(buoiStr) {
        let s = chuanHoaChuoi(buoiStr);
        return (s === 'sáng' || s === 'sang' || s === 's') ? 'sáng' : 'chiều';
    }

    function layHoTenGV(maGV) {
        if (!maGV) return '';
        if (typeof window.layHoTenDayDuGiaoVienSDB === 'function') {
            return String(maGV).split(/[,;&-]/).map(m => window.layHoTenDayDuGiaoVienSDB(m.trim()) || m.trim()).filter(Boolean).join(', ');
        }
        return String(maGV).trim();
    }

    // -------------------------------------------------------------------------
    // 3. CƠ CHẾ ĐỒNG BỘ SÂU RAM + SNAPSHOT CACHE SAU KHI LƯU (SĐB & TKB)
    // Đảm bảo sau khi Lưu, RAM và Storage luôn khớp 100% với Server mà không cần tải lại
    // -------------------------------------------------------------------------
    function capNhatSnapshotCacheSoDauBai() {
        try {
            let layKhoa = (typeof window.layKhoaCachLy === 'function') ? window.layKhoaCachLy : (k => k);
            let snapshotKey = layKhoa('SDB_SNAPSHOT_FAST_V2');
            let rawSnap = sessionStorage.getItem(snapshotKey) || localStorage.getItem(snapshotKey);
            let snapData = rawSnap ? JSON.parse(rawSnap) : {};

            let namHoc = (typeof namHocHeThongSDB !== 'undefined' && namHocHeThongSDB)
                ? namHocHeThongSDB
                : ((typeof thongSoHocVu !== 'undefined' && thongSoHocVu.NAM_HOC) ? thongSoHocVu.NAM_HOC : '');

            // Tái tạo mảng SO_DAU_BAI nén từ duLieuTKBGopDaMap đã lưu trên RAM
            if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
                let dsSdbNen = [];
                duLieuTKBGopDaMap.forEach(d => {
                    if (d.DaLuu === true) {
                        let tuan = String(d['Tuần'] || '').replace(/\D/g, '');
                        let lop = String(d['Mã Lớp'] || '').trim().toUpperCase();
                        let thu = chuanHoaThu(d['Thứ']);
                        let buoi = chuanHoaBuoi(d['Buổi']) === 'sáng' ? 'Sáng' : 'Chiều';
                        let tiet = String(d['Tiết'] || '').trim();
                        let maLuuTru = d['Mã Lưu Trữ'] || `${namHoc ? namHoc + '_' : ''}${tuan}_${lop}_${thu}_${buoi}_${tiet}`;
                        dsSdbNen.push({
                            A: maLuuTru,
                            B: tuan,
                            C: lop,
                            D: thu,
                            E: String(d['Ngày'] || ''),
                            F: buoi,
                            G: tiet,
                            H: String(d['Môn Học'] || ''),
                            I: String(d['TietPPCT_Thuc'] || ''),
                            J: String(d['TenBai_Thuc'] || ''),
                            K: String(d['NhanXet_Thuc'] || ''),
                            L: String(d['XepLoai_Thuc'] || ''),
                            M: String(d['ChuKy_Thuc'] || ''),
                            N: String(d['ChuyenCan_Thuc'] || '')
                        });
                    }
                });

                // Giữ lại các dòng TONGHOP (Nhận xét GVCN/BGH)
                if (window.duLieuTongHopSDB) {
                    Object.keys(window.duLieuTongHopSDB).forEach(kTH => {
                        let th = window.duLieuTongHopSDB[kTH];
                        if (th && th.daLuu) {
                            let parts = kTH.split('_');
                            let t = parts[0], l = parts.slice(1).join('_');
                            dsSdbNen.push({
                                A: th.maLuuTru || `${namHoc ? namHoc + '_' : ''}${t}_${l}_TONGHOP`,
                                B: t,
                                C: l,
                                D: 'TONGHOP',
                                E: '',
                                F: 'TONGHOP',
                                G: 'TONGHOP',
                                H: 'Tổng hợp đánh giá tuần',
                                I: th.nxGVCN || '',
                                J: th.kyGVCN || '',
                                K: th.nxBGH || '',
                                L: th.kyBGH || ''
                            });
                        }
                    });
                }
                snapData.SO_DAU_BAI = dsSdbNen;
                snapData.thoiDiemLuu = Date.now();
                let strSnap = JSON.stringify(snapData);
                try { sessionStorage.setItem(snapshotKey, strSnap); } catch (e) {}
                try { localStorage.setItem(snapshotKey, strSnap); } catch (e) {}
            }
        } catch (err) {
            console.warn('Không thể cập nhật Snapshot SĐB:', err);
        }
    }

    function caiDatHookDongBoSauKhiLuu() {
        if (_daGanHookDongBoSauKhiLuu) return;
        _daGanHookDongBoSauKhiLuu = true;

        // 1. Bọc hàm luuSoDauBaiSangMayChu để đảm bảo Môn học & Mã GV trên DOM luôn được ghi vào duLieuTKBGopDaMap + Snapshot Cache
        if (typeof window.luuSoDauBaiSangMayChu === 'function') {
            const hamLuuSdbGoc = window.luuSoDauBaiSangMayChu;
            window.luuSoDauBaiSangMayChu = async function(...args) {
                // Trước khi lưu: đồng bộ Môn học từ DOM vào duLieuTKBGopDaMap (vì hàm gốc chỉ gán TietPPCT/TenBai mà quên gán lại cột 'Môn Học' nếu dòng đó đã có sẵn)
                try {
                    let tuanChon = document.getElementById('chonTuanSo')?.value;
                    let lopChon = document.getElementById('chonLopSo')?.value;
                    if (tuanChon && lopChon && typeof duLieuTKBGopDaMap !== 'undefined') {
                        let tuanSo = parseInt(String(tuanChon).replace(/\D/g, ''), 10);
                        let lopUpper = String(lopChon).trim().toUpperCase();
                        let mapTkb = dongBoTkbMoiNhatSangBoNhoSDB();

                        let cacDong = document.querySelectorAll('#vungHienThiSoDauBai .bang-so-dau-bai-container table tbody tr');
                        let thuHienTai = '';
                        cacDong.forEach(dong => {
                            let cellThu = dong.querySelector('td[rowspan]');
                            if (cellThu) {
                                thuHienTai = chuanHoaThu(cellThu.innerText.split('\n')[0].trim());
                            }
                            let cellMon = dong.querySelector('td[data-loai="mon"]');
                            let mon = '';
                            if (cellMon) {
                                for (let node of cellMon.childNodes) {
                                    if (node.nodeType === 3) mon += node.textContent;
                                }
                                mon = mon.trim();
                            }
                            let oTiet = dong.querySelector('td[data-loai="tietSDB"]');
                            let tiet = oTiet ? oTiet.innerText.trim() : '';
                            let buoiNorm = chuanHoaBuoi(dong.getAttribute('data-buoi') || 'Sáng');

                            if (thuHienTai && tiet) {
                                let idxRam = duLieuTKBGopDaMap.findIndex(d =>
                                    parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) === tuanSo &&
                                    String(d['Mã Lớp'] || '').trim().toUpperCase() === lopUpper &&
                                    chuanHoaThu(d['Thứ']) === thuHienTai &&
                                    chuanHoaBuoi(d['Buổi']) === buoiNorm &&
                                    String(d['Tiết'] || '').trim() === tiet
                                );
                                let tkbSlot = mapTkb[`${tuanSo}_${lopUpper}_${thuHienTai}_${buoiNorm}_${tiet}`];
                                if (idxRam !== -1) {
                                    duLieuTKBGopDaMap[idxRam]['Môn Học'] = mon;
                                    if (tkbSlot && tkbSlot['Mã GV']) {
                                        duLieuTKBGopDaMap[idxRam]['Mã GV'] = tkbSlot['Mã GV'];
                                    }
                                }
                            }
                        });
                    }
                } catch (ePre) {}

                const ketQua = await hamLuuSdbGoc.apply(this, args);

                // Sau khi lưu thành công: xóa các bản ghi rỗng (tiết đã bị xóa môn) khỏi trạng thái DaLuu và cập nhật chỉ mục + Snapshot Cache
                try {
                    if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
                        duLieuTKBGopDaMap.forEach(d => {
                            if (String(d['Môn Học'] || '').trim() === '') {
                                d.DaLuu = false;
                            }
                        });
                    }
                    if (typeof window.xayDungChiMucNhanhSDB === 'function') {
                        window.xayDungChiMucNhanhSDB();
                    }
                    capNhatSnapshotCacheSoDauBai();
                } catch (ePost) {}

                return ketQua;
            };
        }

        // 2. Bọc hàm luuSuaCucBoTKB và luuDuLieu của app.js để khi Lưu TKB ở bất kỳ tuần nào, mapTkbToanTap cập nhật ngay lập tức
        if (typeof window.luuSuaCucBoTKB === 'function') {
            const hamLuuSuaTkbGoc = window.luuSuaCucBoTKB;
            window.luuSuaCucBoTKB = async function(...args) {
                const kq = await hamLuuSuaTkbGoc.apply(this, args);
                dongBoTkbMoiNhatSangBoNhoSDB();
                return kq;
            };
        }
        if (typeof window.luuDuLieu === 'function') {
            const hamLuuTkbGoc = window.luuDuLieu;
            window.luuDuLieu = async function(...args) {
                const kq = await hamLuuTkbGoc.apply(this, args);
                dongBoTkbMoiNhatSangBoNhoSDB();
                return kq;
            };
        }
    }

    // -------------------------------------------------------------------------
    // 4. ĐỒNG BỘ TKB MỚI NHẤT TỪ LƯỚI UI & CACHE ĐA TUẦN SANG RAM SỔ ĐẦU BÀI
    // (Đảm bảo sửa TKB ở Tuần hiện tại hay Tuần quá khứ đều cập nhật vào mapTkbToanTap)
    // -------------------------------------------------------------------------
    function dongBoTkbMoiNhatSangBoNhoSDB() {
        let mapTkb = window.mapTkbToanTap || (typeof mapTkbToanTapToanCuc !== 'undefined' ? mapTkbToanTapToanCuc : {});

        const ghiMangTietVaoMap = (dsTiet, tuanMacDinh) => {
            if (!Array.isArray(dsTiet) || dsTiet.length === 0) return;
            let tXem = parseInt(String(dsTiet[0].tuan || tuanMacDinh || 0).replace(/\D/g, ''), 10);
            if (tXem > 0) {
                Object.keys(mapTkb).forEach(k => {
                    if (k.startsWith(tXem + '_')) delete mapTkb[k];
                });
                dsTiet.forEach(item => {
                    let t = parseInt(String(item.tuan || tXem).replace(/\D/g, ''), 10);
                    let lop = String(item.maLop || '').trim().toUpperCase();
                    let thu = chuanHoaThu(item.thu);
                    let buoi = chuanHoaBuoi(item.buoi);
                    let tiet = String(item.tiet || '').trim();
                    let mon = String(item.monHoc || '').trim();
                    if (t > 0 && lop && thu && tiet && mon !== '' && mon !== '--' && mon !== '---') {
                        let k = `${t}_${lop}_${thu}_${buoi}_${tiet}`;
                        mapTkb[k] = {
                            'Tuần': t,
                            'Mã Lớp': lop,
                            'Thứ': thu,
                            'Buổi': buoi,
                            'Tiết': tiet,
                            'Môn Học': mon,
                            'Mã GV': String(item.maGv || '').trim(),
                            'Ngày': String(item.ngay || '').trim()
                        };
                    }
                });
            }
        };

        // 1. Đồng bộ từ tất cả các tuần đã được lưu trong bộ nhớ đệm đa tuần (window.boNhoTkbTheoTuan) của app.js
        if (window.boNhoTkbTheoTuan && typeof window.boNhoTkbTheoTuan === 'object') {
            Object.keys(window.boNhoTkbTheoTuan).forEach(khoaCache => {
                if (khoaCache.includes('_TEMPLATE')) return;
                let dsTuan = window.boNhoTkbTheoTuan[khoaCache];
                if (Array.isArray(dsTuan) && dsTuan.length > 0) {
                    ghiMangTietVaoMap(dsTuan);
                }
            });
        }

        // 2. Đồng bộ từ mảng duLieuTkbHienTai (tuần đang mở trên tab TKB)
        if (typeof duLieuTkbHienTai !== 'undefined' && Array.isArray(duLieuTkbHienTai) && duLieuTkbHienTai.length > 0) {
            ghiMangTietVaoMap(duLieuTkbHienTai, typeof tuanDangXem !== 'undefined' ? tuanDangXem : 0);
        }

        // 3. Nếu người dùng đang gõ sửa trực tiếp trên ô input của lưới TKB (#khungTKB)
        const khungTKB = document.getElementById('khungTKB');
        if (khungTKB && typeof tuanDangXem !== 'undefined') {
            let tDom = parseInt(tuanDangXem, 10) || 0;
            let cacOMonChanged = khungTKB.querySelectorAll('td[data-thaydoi="true"] input[id^="mon_"], td[data-thaydoi="true"] input[id^="gv_"]');
            if (tDom > 0 && cacOMonChanged.length > 0) {
                let cacOMon = khungTKB.querySelectorAll('input[id^="mon_"]');
                cacOMon.forEach(oMon => {
                    let parts = oMon.id.split('_');
                    if (parts.length >= 5) {
                        let thu = chuanHoaThu(parts[1]);
                        let buoi = chuanHoaBuoi(parts[2]);
                        let tiet = String(parts[3]).trim();
                        let lop = parts.slice(4).join('_').trim().toUpperCase();
                        let oGv = document.getElementById(`gv_${parts[1]}_${parts[2]}_${parts[3]}_${parts.slice(4).join('_')}`);
                        let valMon = oMon.value.trim();
                        if (valMon === '--' || valMon === '---') valMon = '';
                        let valGv = oGv ? oGv.value.trim() : '';
                        if (valGv === '--' || valGv === '---') valGv = '';
                        let k = `${tDom}_${lop}_${thu}_${buoi}_${tiet}`;
                        if (valMon !== '') {
                            mapTkb[k] = {
                                'Tuần': tDom,
                                'Mã Lớp': lop,
                                'Thứ': thu,
                                'Buổi': buoi,
                                'Tiết': tiet,
                                'Môn Học': valMon,
                                'Mã GV': valGv,
                                'Ngày': (mapTkb[k] && mapTkb[k]['Ngày']) ? mapTkb[k]['Ngày'] : ''
                            };
                        } else {
                            delete mapTkb[k];
                        }
                    }
                });
            }
        }

        window.mapTkbToanTap = mapTkb;
        if (typeof mapTkbToanTapToanCuc !== 'undefined') {
            mapTkbToanTapToanCuc = mapTkb;
        }
        return mapTkb;
    }

    // -------------------------------------------------------------------------
    // 5. MỞ MODAL & NẠP BỘ LỌC
    // -------------------------------------------------------------------------
    window.moModalDoiChieuTkbSdb = async function(nguonMo) {
        khoiTaoGiaoDienDoiChieu();
        const modal = document.getElementById('modalDoiChieuTkbSdb');
        if (modal) modal.classList.remove('hidden');

        const coDuLieuSdbRAM = (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap) && duLieuTKBGopDaMap.length > 0);
        if (!coDuLieuSdbRAM && typeof taiDuLieuSoDauBaiTuMayChu === 'function') {
            const tbody = document.getElementById('tbodyKetQuaDoiChieu');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-10 text-center text-teal-700 font-bold">
                    <div class="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2"></div>
                    Đang đồng bộ kho dữ liệu Sổ đầu bài lần đầu...
                </td></tr>`;
            }
            await taiDuLieuSoDauBaiTuMayChu();
        }

        dongBoTkbMoiNhatSangBoNhoSDB();
        napBoLocTuanVaLop(nguonMo);
        thucThiQuetDoiChieuTrenRAM();
    };

    window.dongModalDoiChieuTkbSdb = function() {
        const modal = document.getElementById('modalDoiChieuTkbSdb');
        if (modal) modal.classList.add('hidden');
    };

    function napBoLocTuanVaLop(nguonMo) {
        let tapTuan = new Set();
        let tapLop = new Set();

        const mapTkb = window.mapTkbToanTap || {};
        Object.values(mapTkb).forEach(d => {
            let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10);
            let l = String(d['Mã Lớp'] || '').trim().toUpperCase();
            if (t > 0) tapTuan.add(t);
            if (l) tapLop.add(l);
        });

        if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
            duLieuTKBGopDaMap.forEach(d => {
                let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10);
                let l = String(d['Mã Lớp'] || '').trim().toUpperCase();
                if (t > 0) tapTuan.add(t);
                if (l) tapLop.add(l);
            });
        }

        if (typeof tuanDangXem !== 'undefined' && parseInt(tuanDangXem, 10) > 0) {
            tapTuan.add(parseInt(tuanDangXem, 10));
        }

        danhSachTuanCoDuLieu = Array.from(tapTuan).sort((a, b) => b - a);
        danhSachLopCoDuLieu = Array.from(tapLop).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const selTuan = document.getElementById('locTuanDoiChieu');
        const selLop = document.getElementById('locLopDoiChieu');

        let tuanMacDinh = 'ALL';
        if (nguonMo === 'SDB') {
            let tSdb = document.getElementById('chonTuanSo')?.value;
            if (tSdb) tuanMacDinh = String(parseInt(String(tSdb).replace(/\D/g, ''), 10));
        } else if (nguonMo === 'TKB') {
            if (typeof tuanDangXem !== 'undefined' && tuanDangXem) tuanMacDinh = String(tuanDangXem);
        }

        if (selTuan) {
            let htmlTuan = `<option value="ALL">Tất cả các tuần (${danhSachTuanCoDuLieu.length} tuần)</option>`;
            danhSachTuanCoDuLieu.forEach(t => {
                let isKhoaSDB = (typeof window.kiemTraTuanDaKhoa === 'function' && window.kiemTraTuanDaKhoa(t));
                htmlTuan += `<option value="${t}">Tuần ${t} ${isKhoaSDB ? '🔒' : ''}</option>`;
            });
            selTuan.innerHTML = htmlTuan;
            if (tuanMacDinh !== 'ALL' && danhSachTuanCoDuLieu.includes(parseInt(tuanMacDinh, 10))) {
                selTuan.value = tuanMacDinh;
            }
        }

        if (selLop) {
            let lopMacDinh = 'ALL';
            if (nguonMo === 'SDB') {
                let lSdb = document.getElementById('chonLopSo')?.value;
                if (lSdb) lopMacDinh = String(lSdb).trim().toUpperCase();
            }
            let htmlLop = `<option value="ALL">Toàn trường (${danhSachLopCoDuLieu.length} lớp)</option>`;
            danhSachLopCoDuLieu.forEach(l => {
                htmlLop += `<option value="${l}">Lớp ${l}</option>`;
            });
            selLop.innerHTML = htmlLop;
            if (lopMacDinh !== 'ALL' && danhSachLopCoDuLieu.includes(lopMacDinh)) {
                selLop.value = lopMacDinh;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 6. THUẬT TOÁN QUÉT CHÊNH LỆCH TOÀN DIỆN (6 LOẠI SAI LỆCH)
    // -------------------------------------------------------------------------
    window.thucThiQuetDoiChieuTrenRAM = function() {
        ketQuaDoiChieuToanCuc = [];
        const mapTkbChuan = dongBoTkbMoiNhatSangBoNhoSDB();

        const selTuan = document.getElementById('locTuanDoiChieu');
        const tuanLoc = selTuan ? selTuan.value : 'ALL';
        const dsTuanQuet = (tuanLoc === 'ALL') ? danhSachTuanCoDuLieu : [parseInt(tuanLoc, 10)];

        const mapSdbThucTe = {};
        const thongKeLuuTheoTuanLop = {};

        if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
            duLieuTKBGopDaMap.forEach(d => {
                let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10);
                let lop = String(d['Mã Lớp'] || '').trim().toUpperCase();
                let thu = chuanHoaThu(d['Thứ']);
                let buoi = chuanHoaBuoi(d['Buổi']);
                let tiet = String(d['Tiết'] || '').trim();
                if (!t || !lop) return;

                let k = `${t}_${lop}_${thu}_${buoi}_${tiet}`;
                mapSdbThucTe[k] = d;

                let kTL = `${t}_${lop}`;
                if (!thongKeLuuTheoTuanLop[kTL]) thongKeLuuTheoTuanLop[kTL] = { tuan: t, lop: lop, coMonTKB: 0, daLuuSDB: 0 };
                if ((d.DaLuu === true || d.DaDongBoTKB === true || d.TrangThaiThayDoi === true) && String(d['Môn Học'] || '').trim() !== '') {
                    thongKeLuuTheoTuanLop[kTL].daLuuSDB++;
                }
            });
        }

        Object.values(mapTkbChuan).forEach(tkb => {
            let t = parseInt(String(tkb['Tuần'] || '').replace(/\D/g, ''), 10);
            let lop = String(tkb['Mã Lớp'] || '').trim().toUpperCase();
            if (!t || !lop) return;
            let kTL = `${t}_${lop}`;
            if (!thongKeLuuTheoTuanLop[kTL]) thongKeLuuTheoTuanLop[kTL] = { tuan: t, lop: lop, coMonTKB: 0, daLuuSDB: 0 };
            if (String(tkb['Môn Học'] || '').trim() !== '') {
                thongKeLuuTheoTuanLop[kTL].coMonTKB++;
            }
        });

        const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
        const thuTuBuoi = { "sáng": 1, "chiều": 2 };

        dsTuanQuet.forEach(tuan => {
            danhSachLopCoDuLieu.forEach(lop => {
                let kTL = `${tuan}_${lop}`;
                let tk = thongKeLuuTheoTuanLop[kTL];
                if (!tk) return;

                let matchKhoi = lop.match(/\d+/);
                let khoi = matchKhoi ? matchKhoi[0] : '';

                // TRƯỜNG HỢP 6: Có TKB nhưng cả lớp chưa lưu Sổ đầu bài tuần này
                if (tk.coMonTKB > 0 && tk.daLuuSDB === 0) {
                    ketQuaDoiChieuToanCuc.push({
                        tuan: tuan,
                        lop: lop,
                        thu: 'Cả tuần',
                        buoi: '--',
                        tiet: '--',
                        ngay: '',
                        loaiLoi: 'CHUA_LUU_SDB',
                        tenLoaiLoi: 'Chưa khởi tạo / lưu SĐB',
                        mucDo: 'TRUNG_BINH',
                        tkbMon: `${tk.coMonTKB} tiết trên TKB`,
                        tkbGV: 'Theo phân công TKB',
                        sdbMon: 'Chưa lưu vào sheet SoDauBai',
                        sdbGV: 'Chưa ký',
                        sdbTietPPCT: '--',
                        sdbTenBai: '--',
                        nguyenNhan: `Lớp ${lop} (Tuần ${tuan}) đã có TKB (${tk.coMonTKB} tiết) nhưng chưa lưu Sổ đầu bài lần nào.`,
                        huongKhacPhuc: `Bấm "⚡ Tự động khắc phục" để điền tự động toàn bộ Tiết PPCT, Tên bài dạy và mở Sổ đầu bài lớp ${lop}.`,
                        coDuLieuKyCu: false
                    });
                    return;
                }

                let tapKhoaSlot = new Set();
                Object.keys(mapTkbChuan).forEach(k => { if (k.startsWith(`${tuan}_${lop}_`)) tapKhoaSlot.add(k); });
                Object.keys(mapSdbThucTe).forEach(k => { if (k.startsWith(`${tuan}_${lop}_`)) tapKhoaSlot.add(k); });

                let dsKhoaSorted = Array.from(tapKhoaSlot).sort((a, b) => {
                    let pA = a.split('_'), pB = b.split('_');
                    let tA = thuTuThu[pA[2]] || 99, tB = thuTuThu[pB[2]] || 99;
                    if (tA !== tB) return tA - tB;
                    let bA = thuTuBuoi[pA[3]] || 99, bB = thuTuBuoi[pB[3]] || 99;
                    if (bA !== bB) return bA - bB;
                    return (parseInt(pA[4], 10) || 0) - (parseInt(pB[4], 10) || 0);
                });

                let boDemPPCT = {};
                if (typeof duLieuTKBGopDaMap !== 'undefined') {
                    duLieuTKBGopDaMap.forEach(d => {
                        let tTruoc = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
                        let lTruoc = String(d['Mã Lớp'] || '').trim().toUpperCase();
                        if (lTruoc === lop && tTruoc < tuan && d.DaLuu === true) {
                            let m = String(d['Môn Học'] || '').trim();
                            if (m !== '') {
                                let mNorm = m.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                                let tietLuu = parseInt(String(d['TietPPCT_Thuc'] || '').replace(/\D/g, ''), 10) || 0;
                                if (tietLuu > 0) boDemPPCT[mNorm] = Math.max(boDemPPCT[mNorm] || 0, tietLuu);
                                else boDemPPCT[mNorm] = (boDemPPCT[mNorm] || 0) + 1;
                            }
                        }
                    });
                }

                let demMonTrongTuanTKB = {};

                dsKhoaSorted.forEach(khoa => {
                    let parts = khoa.split('_');
                    let thu = parts[2];
                    let buoi = parts[3] === 'sáng' ? 'Sáng' : 'Chiều';
                    let tiet = parts[4];

                    let tkbItem = mapTkbChuan[khoa];
                    let sdbItem = mapSdbThucTe[khoa];

                    let monTKB = tkbItem ? String(tkbItem['Môn Học'] || '').trim() : '';
                    let gvTKB = tkbItem ? String(tkbItem['Mã GV'] || '').trim() : '';
                    let ngayTiet = (tkbItem && tkbItem['Ngày']) ? tkbItem['Ngày'] : (sdbItem ? (sdbItem['Ngày'] || '') : '');

                    let monSDB = (sdbItem && (sdbItem.DaLuu === true || sdbItem.DaDongBoTKB === true || sdbItem.TrangThaiThayDoi === true)) ? String(sdbItem['Môn Học'] || '').trim() : '';
                    let gvSDB = sdbItem ? String(sdbItem['Mã GV'] || '').trim() : '';
                    let chuKySDB = sdbItem ? String(sdbItem['ChuKy_Thuc'] || '').trim() : '';
                    let nhanXetSDB = sdbItem ? String(sdbItem['NhanXet_Thuc'] || '').trim() : '';
                    let xepLoaiSDB = sdbItem ? String(sdbItem['XepLoai_Thuc'] || '').trim() : '';
                    let tietPpctSDB = sdbItem ? String(sdbItem['TietPPCT_Thuc'] || '').trim() : '';
                    let tenBaiSDB = sdbItem ? String(sdbItem['TenBai_Thuc'] || '').trim() : '';

                    let tietPpctKyVong = '';
                    let tenBaiKyVong = '';
                    if (monTKB !== '') {
                        let mNorm = monTKB.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                        demMonTrongTuanTKB[mNorm] = (demMonTrongTuanTKB[mNorm] || 0) + 1;
                        tietPpctKyVong = String((boDemPPCT[mNorm] || 0) + demMonTrongTuanTKB[mNorm]);
                        if (typeof window.timTenBaiChuanSDB === 'function') {
                            tenBaiKyVong = window.timTenBaiChuanSDB(khoi, monTKB, tietPpctKyVong) || '';
                        }
                    }

                    let coKyCu = (chuKySDB !== '' || nhanXetSDB !== '' || xepLoaiSDB !== '');

                    // PHÂN LOẠI 1, 2, 3: LỆCH MÔN HỌC / THIẾU TIẾT / DƯ TIẾT
                    if (chuanHoaChuoi(monTKB) !== chuanHoaChuoi(monSDB)) {
                        let loai = 'LECH_MON';
                        let tenLoai = 'Lệch Môn học';
                        let nguyenNhan = '';
                        let huongXuLy = '';

                        if (monTKB && monSDB) {
                            loai = 'LECH_MON';
                            tenLoai = 'Đổi Môn học trên TKB';
                            nguyenNhan = `TKB đã đổi từ môn [${monSDB}] sang môn [${monTKB}] (GV: ${layHoTenGV(gvTKB) || gvTKB}), nhưng Sổ đầu bài vẫn lưu môn cũ [${monSDB}].`;
                            huongXuLy = `Tự động đổi sang môn [${monTKB}], gán Tiết PPCT số ${tietPpctKyVong}${tenBaiKyVong ? ` ("${tenBaiKyVong}")` : ''} và cấp quyền ký cho ${layHoTenGV(gvTKB) || 'GV mới'}.`;
                        } else if (monTKB && !monSDB) {
                            loai = 'THIEU_TRONG_SDB';
                            tenLoai = 'Thiếu tiết trong SĐB';
                            nguyenNhan = `Trên TKB xếp môn [${monTKB}] (GV: ${layHoTenGV(gvTKB) || gvTKB}) nhưng trong Sổ đầu bài đang bị trống.`;
                            huongXuLy = `Tự động bổ sung môn [${monTKB}] (Tiết PPCT ${tietPpctKyVong}) kèm tên bài vào Sổ đầu bài.`;
                        } else if (!monTKB && monSDB) {
                            loai = 'DU_TRONG_SDB';
                            tenLoai = 'Dư tiết trong SĐB (TKB trống)';
                            nguyenNhan = `Trên TKB tiết này đã chuyển sang Nghỉ/Trống, nhưng Sổ đầu bài vẫn còn lưu môn [${monSDB}].`;
                            huongXuLy = `Tự động xóa tiết [${monSDB}] dư thừa và dồn lại thứ tự Tiết PPCT của môn [${monSDB}] trong tuần.`;
                        }

                        ketQuaDoiChieuToanCuc.push({
                            khoa: khoa,
                            tuan: tuan,
                            lop: lop,
                            thu: thu,
                            buoi: buoi,
                            tiet: tiet,
                            ngay: ngayTiet,
                            loaiLoi: loai,
                            tenLoaiLoi: tenLoai,
                            mucDo: 'CAO',
                            tkbMon: monTKB || '(Trống / Nghỉ)',
                            tkbGV: layHoTenGV(gvTKB) || gvTKB || '--',
                            tkbMaGV: gvTKB,
                            tkbTietPPCT: tietPpctKyVong,
                            tkbTenBai: tenBaiKyVong,
                            sdbMon: monSDB || '(Trống)',
                            sdbGV: chuKySDB ? `Đã ký: ${chuKySDB}` : (layHoTenGV(gvSDB) || 'Chưa ký'),
                            sdbTietPPCT: tietPpctSDB || '--',
                            sdbTenBai: tenBaiSDB || '--',
                            nguyenNhan: nguyenNhan,
                            huongKhacPhuc: huongXuLy,
                            coDuLieuKyCu: coKyCu
                        });
                        return;
                    }

                    // PHÂN LOẠI 4: CÙNG MÔN HỌC NHƯNG ĐỔI GIÁO VIÊN DẠY TRÊN TKB
                    if (monTKB !== '' && gvTKB !== '') {
                        let dsMaGvTKB = gvTKB.split(/[,;&-]/).map(g => g.trim()).filter(Boolean);
                        let tapTenVaMaGvMoi = [];
                        dsMaGvTKB.forEach(m => {
                            tapTenVaMaGvMoi.push(chuanHoaChuoi(m));
                            let tenDayDu = layHoTenGV(m);
                            if (tenDayDu) tapTenVaMaGvMoi.push(chuanHoaChuoi(tenDayDu));
                        });

                        let chuKyNorm = chuanHoaChuoi(chuKySDB);
                        let khacMaGv = (gvSDB !== '' && chuanHoaChuoi(gvSDB) !== chuanHoaChuoi(gvTKB));
                        let daKyBoiNguoiCu = (chuKyNorm !== '' && !tapTenVaMaGvMoi.some(g => g === chuKyNorm || (g.length > 2 && chuKyNorm.includes(g))));

                        if (khacMaGv || daKyBoiNguoiCu) {
                            let tenGvCu = chuKySDB || layHoTenGV(gvSDB) || gvSDB || 'Chưa rõ';
                            let tenGvMoi = layHoTenGV(gvTKB) || gvTKB;
                            ketQuaDoiChieuToanCuc.push({
                                khoa: khoa,
                                tuan: tuan,
                                lop: lop,
                                thu: thu,
                                buoi: buoi,
                                tiet: tiet,
                                ngay: ngayTiet,
                                loaiLoi: 'LECH_GV',
                                tenLoaiLoi: 'Đổi Giáo viên phụ trách',
                                mucDo: daKyBoiNguoiCu ? 'CAO' : 'TRUNG_BINH',
                                tkbMon: monTKB,
                                tkbGV: tenGvMoi,
                                tkbMaGV: gvTKB,
                                tkbTietPPCT: tietPpctKyVong,
                                tkbTenBai: tenBaiKyVong,
                                sdbMon: monSDB,
                                sdbGV: chuKySDB ? `Đã ký: ${chuKySDB}` : `Phân công cũ: ${tenGvCu}`,
                                sdbTietPPCT: tietPpctSDB || '--',
                                sdbTenBai: tenBaiSDB || '--',
                                nguyenNhan: daKyBoiNguoiCu
                                    ? `Môn [${monTKB}] trên TKB đã đổi sang GV [${tenGvMoi}], nhưng trong SĐB vẫn còn chữ ký của GV cũ [${chuKySDB}].`
                                    : `Môn [${monTKB}] đã thay đổi phân công GV trên TKB từ [${tenGvCu}] sang [${tenGvMoi}].`,
                                huongKhacPhuc: `Tự động cập nhật phân công sang [${tenGvMoi}], cập nhật lại PPCT/Tên bài và làm sạch chữ ký cũ.`,
                                coDuLieuKyCu: coKyCu
                            });
                            return;
                        }
                    }

                    // PHÂN LOẠI 5: KHỚP MÔN & GV NHƯNG LỆCH TIẾT PPCT HOẶC SAI/TRỐNG TÊN BÀI DẠY
                    if (monTKB !== '' && monSDB !== '') {
                        let lechSoTietPPCT = (tietPpctKyVong !== '' && String(tietPpctKyVong) !== String(tietPpctSDB));
                        let thieuTenBai = (tenBaiSDB === '' && tenBaiKyVong !== '');
                        let lechTenBaiDoLechTiet = (lechSoTietPPCT && tenBaiKyVong !== '' && chuanHoaChuoi(tenBaiSDB) !== chuanHoaChuoi(tenBaiKyVong));

                        if (lechSoTietPPCT || thieuTenBai || lechTenBaiDoLechTiet) {
                            ketQuaDoiChieuToanCuc.push({
                                khoa: khoa,
                                tuan: tuan,
                                lop: lop,
                                thu: thu,
                                buoi: buoi,
                                tiet: tiet,
                                ngay: ngayTiet,
                                loaiLoi: 'LECH_PPCT',
                                tenLoaiLoi: lechSoTietPPCT ? 'Lệch Tiết PPCT & Tên bài' : 'Thiếu Tên bài dạy',
                                mucDo: 'THAP',
                                tkbMon: monTKB,
                                tkbGV: layHoTenGV(gvTKB) || gvTKB,
                                tkbMaGV: gvTKB,
                                tkbTietPPCT: tietPpctKyVong,
                                tkbTenBai: tenBaiKyVong,
                                sdbMon: monSDB,
                                sdbGV: chuKySDB ? `Đã ký: ${chuKySDB}` : (layHoTenGV(gvSDB) || 'Chưa ký'),
                                sdbTietPPCT: tietPpctSDB || '(Trống)',
                                sdbTenBai: tenBaiSDB || '(Trống tên bài)',
                                nguyenNhan: lechSoTietPPCT
                                    ? `Theo chuẩn tích lũy, tiết này phải là Tiết PPCT ${tietPpctKyVong}, nhưng SĐB đang ghi Tiết PPCT ${tietPpctSDB || 'Trống'}.`
                                    : `Tiết ${tietPpctSDB || tietPpctKyVong} môn [${monSDB}] chưa có Tên bài dạy chuẩn từ PPCT.`,
                                huongKhacPhuc: `Tự động gán lại Tiết PPCT = ${tietPpctKyVong} và điền tên bài chuẩn: "${tenBaiKyVong || 'Theo PPCT'}".`,
                                coDuLieuKyCu: coKyCu
                            });
                        }
                    }
                });
            });
        });

        ketXuatBangDoiChieu();
    };

    // -------------------------------------------------------------------------
    // 7. KẾT XUẤT BẢNG BÁO CÁO & THỐNG KÊ TRỰC QUAN
    // -------------------------------------------------------------------------
    window.ketXuatBangDoiChieu = function() {
        const tbody = document.getElementById('tbodyKetQuaDoiChieu');
        const vungThongKe = document.getElementById('vungThongKeNhanhDoiChieu');
        if (!tbody) return;

        const lopLoc = document.getElementById('locLopDoiChieu')?.value || 'ALL';
        const loaiLoc = document.getElementById('locLoaiLoiDoiChieu')?.value || 'ALL';
        const tuKhoa = chuanHoaChuoi(document.getElementById('timKiemDoiChieu')?.value || '');

        let dsHienThi = ketQuaDoiChieuToanCuc.filter(item => {
            if (lopLoc !== 'ALL' && item.lop !== lopLoc) return false;
            if (loaiLoc !== 'ALL' && item.loaiLoi !== loaiLoc) return false;
            if (tuKhoa !== '') {
                let chuoiTim = chuanHoaChuoi(`${item.lop} ${item.thu} ${item.tkbMon} ${item.sdbMon} ${item.tkbGV} ${item.sdbGV} ${item.nguyenNhan}`);
                if (!chuoiTim.includes(tuKhoa)) return false;
            }
            return true;
        });

        let demCao = dsHienThi.filter(x => x.mucDo === 'CAO').length;
        let demTB = dsHienThi.filter(x => x.mucDo === 'TRUNG_BINH').length;
        let demThap = dsHienThi.filter(x => x.mucDo === 'THAP').length;

        if (vungThongKe) {
            vungThongKe.innerHTML = `
                <span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-200 text-slate-800 border border-slate-300">
                    Tổng phát hiện: ${dsHienThi.length}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300">
                    🔴 Lệch Môn/Tiết: ${demCao}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                    🟠 Lệch GV/Chưa lưu: ${demTB}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                    🔵 Lệch PPCT/Tên bài: ${demThap}
                </span>
            `;
        }

        if (dsHienThi.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-12 text-center">
                        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <p class="text-base font-extrabold text-emerald-800 uppercase tracking-wide">Tuyệt vời! Thời khóa biểu và Sổ đầu bài hoàn toàn khớp nhau</p>
                        <p class="text-xs text-slate-500 mt-1">Không phát hiện bất kỳ sự chênh lệch nào trong phạm vi bộ lọc hiện tại.</p>
                    </td>
                </tr>`;
            return;
        }

        let htmlRows = '';
        dsHienThi.forEach((item, idx) => {
            let badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
            if (item.mucDo === 'CAO') badgeClass = 'bg-red-100 text-red-800 border-red-300';
            else if (item.mucDo === 'TRUNG_BINH') badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';

            let canhBaoKyCu = item.coDuLieuKyCu
                ? `<div class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                       ⚠️ Đã có dữ liệu/chữ ký cũ
                   </div>`
                : '';

            htmlRows += `
                <tr class="hover:bg-teal-50/40 transition-colors">
                    <td class="border border-slate-300 p-2 text-center font-bold text-slate-600">${idx + 1}</td>
                    <td class="border border-slate-300 p-2 text-center">
                        <div class="font-extrabold text-blue-900 text-sm">Lớp ${item.lop} • Tuần ${item.tuan}</div>
                        <div class="text-xs font-bold text-slate-700">${item.thu} ${item.buoi !== '--' ? `(${item.buoi} - T${item.tiet})` : ''}</div>
                        ${item.ngay ? `<div class="text-[11px] text-slate-500 italic">${item.ngay}</div>` : ''}
                    </td>
                    <td class="border border-slate-300 p-2 text-center align-middle">
                        <span class="inline-block px-2 py-1 rounded border font-extrabold text-xs ${badgeClass}">
                            ${item.tenLoaiLoi}
                        </span>
                        ${canhBaoKyCu}
                    </td>
                    <td class="border border-slate-300 p-2 align-top bg-emerald-50/30">
                        <div class="font-extrabold text-emerald-900">${item.tkbMon}</div>
                        <div class="text-xs text-slate-700 mt-0.5"><b>GV TKB:</b> ${item.tkbGV}</div>
                        ${item.tkbTietPPCT ? `<div class="text-xs text-teal-800 mt-0.5"><b>PPCT chuẩn:</b> Tiết ${item.tkbTietPPCT} ${item.tkbTenBai ? `- <i>${item.tkbTenBai}</i>` : ''}</div>` : ''}
                    </td>
                    <td class="border border-slate-300 p-2 align-top bg-rose-50/30">
                        <div class="font-extrabold text-rose-900">${item.sdbMon}</div>
                        <div class="text-xs text-slate-700 mt-0.5"><b>Trạng thái SĐB:</b> ${item.sdbGV}</div>
                        ${item.sdbTietPPCT && item.sdbTietPPCT !== '--' ? `<div class="text-xs text-slate-600 mt-0.5"><b>PPCT đang lưu:</b> Tiết ${item.sdbTietPPCT} (${item.sdbTenBai})</div>` : ''}
                    </td>
                    <td class="border border-slate-300 p-2 align-top">
                        <div class="text-slate-800 font-semibold leading-snug">${item.nguyenNhan}</div>
                        <div class="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded p-1.5 mt-1 leading-snug">
                            <b>Khắc phục:</b> ${item.huongKhacPhuc}
                        </div>
                    </td>
                    <td class="border border-slate-300 p-2 text-center align-middle">
                        <div class="flex flex-col gap-1.5">
                            <button onclick="tuDongKhacPhucToanDienLop(${item.tuan}, '${item.lop}', true)" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1.5 rounded shadow-xs text-xs flex items-center justify-center gap-1 transition cursor-pointer" title="Tự động sửa ngay Môn, GV, Tiết PPCT, Tên bài của Lớp ${item.lop} Tuần ${item.tuan}">
                                ⚡ Tự động khắc phục
                            </button>
                            <button onclick="tuDongKhacPhucToanDienLop(${item.tuan}, '${item.lop}', false)" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2.5 py-1 rounded text-xs transition cursor-pointer" title="Chỉ mở xem Sổ đầu bài Lớp ${item.lop} Tuần ${item.tuan}">
                                👁️ Mở xem SĐB
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = htmlRows;
    };

    // -------------------------------------------------------------------------
    // 8. ĐỘNG CƠ TỰ ĐỘNG KHẮC PHỤC TRIỆT ĐỂ (CẬP NHẬT TRỰC TIẾP RAM + DOM SĐB)
    // -------------------------------------------------------------------------
    window.tuDongKhacPhucToanDienLop = function(tuanMucTieu, lopMucTieu, thucThiSuaTuDong) {
        const tuanSo = parseInt(String(tuanMucTieu).replace(/\D/g, ''), 10);
        const lopUpper = String(lopMucTieu || '').trim().toUpperCase();

        if (!tuanSo || !lopUpper) return;

        if (!thucThiSuaTuDong) {
            dongModalDoiChieuTkbSdb();
            dieuHuongMoTabSoDauBai(tuanSo, lopUpper);
            return;
        }

        if (typeof window.kiemTraTuanDaKhoa === 'function' && window.kiemTraTuanDaKhoa(tuanSo)) {
            return alert(`⛔ Sổ đầu bài Tuần ${tuanSo} đã bị khóa toàn trường. Vui lòng mở khóa trước khi khắc phục!`);
        }

        // 1. Đồng bộ TKB mới nhất từ lưới UI & Cache đa tuần vào mapTkbToanTap
        const mapTkbChuan = dongBoTkbMoiNhatSangBoNhoSDB();

        // 2. Tính mốc Tiết PPCT tích lũy của các tuần trước (< tuanSo) cho lớp này
        const matchKhoi = lopUpper.match(/\d+/);
        const khoiChon = matchKhoi ? matchKhoi[0] : '';
        const boDemPPCT = {};

        if (typeof duLieuTKBGopDaMap !== 'undefined' && Array.isArray(duLieuTKBGopDaMap)) {
            duLieuTKBGopDaMap.forEach(d => {
                let tTruoc = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) || 0;
                let lTruoc = String(d['Mã Lớp'] || '').trim().toUpperCase();
                if (lTruoc === lopUpper && tTruoc < tuanSo && d.DaLuu === true) {
                    let m = String(d['Môn Học'] || '').trim();
                    if (m !== '') {
                        let mNorm = m.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                        let tietLuu = parseInt(String(d['TietPPCT_Thuc'] || '').replace(/\D/g, ''), 10) || 0;
                        if (tietLuu > 0) boDemPPCT[mNorm] = Math.max(boDemPPCT[mNorm] || 0, tietLuu);
                        else boDemPPCT[mNorm] = (boDemPPCT[mNorm] || 0) + 1;
                    }
                }
            });
        }

        // 3. Quét toàn bộ các slot của Lớp trong Tuần mục tiêu để đối chiếu và sửa trực tiếp trên duLieuTKBGopDaMap
        const thuTuThu = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ nhật": 8 };
        const thuTuBuoi = { "sáng": 1, "chiều": 2 };

        let tapKhoaSlot = new Set();
        Object.keys(mapTkbChuan).forEach(k => { if (k.startsWith(`${tuanSo}_${lopUpper}_`)) tapKhoaSlot.add(k); });
        if (typeof duLieuTKBGopDaMap !== 'undefined') {
            duLieuTKBGopDaMap.forEach(d => {
                let t = parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10);
                let l = String(d['Mã Lớp'] || '').trim().toUpperCase();
                if (t === tuanSo && l === lopUpper) {
                    let thu = chuanHoaThu(d['Thứ']);
                    let buoi = chuanHoaBuoi(d['Buổi']);
                    let tiet = String(d['Tiết'] || '').trim();
                    tapKhoaSlot.add(`${tuanSo}_${lopUpper}_${thu}_${buoi}_${tiet}`);
                }
            });
        }

        let dsKhoaSorted = Array.from(tapKhoaSlot).sort((a, b) => {
            let pA = a.split('_'), pB = b.split('_');
            let tA = thuTuThu[pA[2]] || 99, tB = thuTuThu[pB[2]] || 99;
            if (tA !== tB) return tA - tB;
            let bA = thuTuBuoi[pA[3]] || 99, bB = thuTuBuoi[pB[3]] || 99;
            if (bA !== bB) return bA - bB;
            return (parseInt(pA[4], 10) || 0) - (parseInt(pB[4], 10) || 0);
        });

        let demMonTrongTuan = {};
        let soTietDaSua = 0;
        let chiTietDaSua = [];

        dsKhoaSorted.forEach(khoa => {
            let parts = khoa.split('_');
            let thu = parts[2];
            let buoiNorm = parts[3]; // 'sáng' hoặc 'chiều'
            let tiet = parts[4];

            let tkbItem = mapTkbChuan[khoa];
            let monTKB = tkbItem ? String(tkbItem['Môn Học'] || '').trim() : '';
            let gvTKB = tkbItem ? String(tkbItem['Mã GV'] || '').trim() : '';
            let ngayTKB = tkbItem ? String(tkbItem['Ngày'] || '').trim() : '';

            let tietPpctChuan = '';
            let tenBaiChuan = '';
            if (monTKB !== '') {
                let mNorm = monTKB.replace(/[0-9\(\)]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
                demMonTrongTuan[mNorm] = (demMonTrongTuan[mNorm] || 0) + 1;
                tietPpctChuan = String((boDemPPCT[mNorm] || 0) + demMonTrongTuan[mNorm]);
                if (typeof window.timTenBaiChuanSDB === 'function') {
                    tenBaiChuan = window.timTenBaiChuanSDB(khoiChon, monTKB, tietPpctChuan) || '';
                }
            }

            let idxSDB = -1;
            if (typeof duLieuTKBGopDaMap !== 'undefined') {
                idxSDB = duLieuTKBGopDaMap.findIndex(d =>
                    parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) === tuanSo &&
                    String(d['Mã Lớp'] || '').trim().toUpperCase() === lopUpper &&
                    chuanHoaThu(d['Thứ']) === thu &&
                    chuanHoaBuoi(d['Buổi']) === buoiNorm &&
                    String(d['Tiết'] || '').trim() === tiet
                );
            }

            if (idxSDB !== -1) {
                let sdbObj = duLieuTKBGopDaMap[idxSDB];
                let monCu = String(sdbObj['Môn Học'] || '').trim();
                let gvCu = String(sdbObj['Mã GV'] || '').trim();
                let chuKyCu = String(sdbObj['ChuKy_Thuc'] || '').trim();
                let ppctCu = String(sdbObj['TietPPCT_Thuc'] || '').trim();
                let tenBaiCu = String(sdbObj['TenBai_Thuc'] || '').trim();

                let doiMon = (chuanHoaChuoi(monCu) !== chuanHoaChuoi(monTKB));
                let doiGV = false;
                if (!doiMon && monTKB !== '' && gvTKB !== '') {
                    let dsMaGvMoi = gvTKB.split(/[,;&-]/).map(g => g.trim()).filter(Boolean);
                    let tapTenVaMaGvMoi = [];
                    dsMaGvMoi.forEach(m => {
                        tapTenVaMaGvMoi.push(chuanHoaChuoi(m));
                        let tenDayDu = layHoTenGV(m);
                        if (tenDayDu) tapTenVaMaGvMoi.push(chuanHoaChuoi(tenDayDu));
                    });
                    let chuKyNorm = chuanHoaChuoi(chuKyCu);
                    let khacMaGv = (gvCu !== '' && chuanHoaChuoi(gvCu) !== chuanHoaChuoi(gvTKB));
                    let daKyBoiNguoiCu = (chuKyNorm !== '' && !tapTenVaMaGvMoi.some(g => g === chuKyNorm || (g.length > 2 && chuKyNorm.includes(g))));
                    doiGV = (khacMaGv || daKyBoiNguoiCu);
                }

                let lechPPCT = (monTKB !== '' && String(ppctCu) !== String(tietPpctChuan));
                let lechTenBai = (monTKB !== '' && tenBaiChuan !== '' && (tenBaiCu === '' || lechPPCT || doiMon));
                let chuaLuu = (monTKB !== '' && sdbObj.DaLuu !== true);

                if (doiMon || doiGV || lechPPCT || lechTenBai || chuaLuu) {
                    sdbObj['Môn Học'] = monTKB;
                    sdbObj['Mã GV'] = gvTKB;
                    if (ngayTKB) sdbObj['Ngày'] = ngayTKB;

                    if (monTKB === '') {
                        sdbObj['TietPPCT_Thuc'] = '';
                        sdbObj['TenBai_Thuc'] = '';
                        sdbObj['NhanXet_Thuc'] = '';
                        sdbObj['XepLoai_Thuc'] = '';
                        sdbObj['ChuKy_Thuc'] = '';
                    } else {
                        sdbObj['TietPPCT_Thuc'] = tietPpctChuan;
                        if (tenBaiChuan !== '' && (doiMon || lechPPCT || tenBaiCu === '' || chuaLuu)) {
                            sdbObj['TenBai_Thuc'] = tenBaiChuan;
                        }
                        if (doiMon || doiGV) {
                            sdbObj['ChuKy_Thuc'] = '';
                            sdbObj['NhanXet_Thuc'] = '';
                            sdbObj['XepLoai_Thuc'] = '';
                        }
                    }

                    sdbObj.TrangThaiThayDoi = true;
                    sdbObj.DaDongBoTKB = true;
                    soTietDaSua++;
                    chiTietDaSua.push(`${thu} (${buoiNorm === 'sáng' ? 'Sáng' : 'Chiều'} - T${tiet}): ${monTKB || 'Xóa tiết trống'} ${tietPpctChuan ? `[PPCT: ${tietPpctChuan}]` : ''}`);
                }
            } else if (monTKB !== '') {
                duLieuTKBGopDaMap.push({
                    'Tuần': String(tuanSo),
                    'Mã Lớp': lopUpper,
                    'Thứ': thu,
                    'Buổi': buoiNorm,
                    'Tiết': String(tiet),
                    'Môn Học': monTKB,
                    'MonHoc_GocSDB': '',
                    'Mã GV': gvTKB,
                    'Ngày': ngayTKB,
                    'TietPPCT_Thuc': tietPpctChuan,
                    'TenBai_Thuc': tenBaiChuan,
                    'NhanXet_Thuc': '',
                    'XepLoai_Thuc': '',
                    'ChuKy_Thuc': '',
                    'ChuyenCan_Thuc': '',
                    'DaLuu': false,
                    'TrangThaiThayDoi': true,
                    'DaDongBoTKB': true
                });
                soTietDaSua++;
                chiTietDaSua.push(`${thu} (${buoiNorm === 'sáng' ? 'Sáng' : 'Chiều'} - T${tiet}): Thêm mới [${monTKB} - PPCT ${tietPpctChuan}]`);
            }
        });

        // 4. Xây dựng lại chỉ mục O(1) và bật cờ thay đổi của Sổ đầu bài
        if (typeof window.xayDungChiMucNhanhSDB === 'function') {
            window.xayDungChiMucNhanhSDB();
        }
        if (typeof coThayDoiChuaLuu_SDB !== 'undefined') {
            coThayDoiChuaLuu_SDB = true;
        }

        // 5. Đóng Modal đối chiếu, chuyển sang Tab Sổ đầu bài của đúng Tuần & Lớp đó và vẽ lại lưới kèm icon cây bút
        dongModalDoiChieuTkbSdb();
        dieuHuongMoTabSoDauBai(tuanSo, lopUpper, true, soTietDaSua, chiTietDaSua);
    };

    function dieuHuongMoTabSoDauBai(tuanSo, lopUpper, daSuaTuDong = false, soTietDaSua = 0, chiTietDaSua = []) {
        let khungSDB = document.getElementById('khungSoDauBai');
        if (khungSDB && khungSDB.classList.contains('hidden')) {
            if (typeof window.kichHoatTab === 'function') {
                window.kichHoatTab('menuSoDauBai', 'khungSoDauBai', false);
            }
        }

        setTimeout(() => {
            const selTuan = document.getElementById('chonTuanSo');
            const selLop = document.getElementById('chonLopSo');
            if (!selTuan || !selLop) return;

            let coThayDoiTam = (typeof coThayDoiChuaLuu_SDB !== 'undefined') ? coThayDoiChuaLuu_SDB : false;
            if (typeof coThayDoiChuaLuu_SDB !== 'undefined') coThayDoiChuaLuu_SDB = false;

            let optLop = Array.from(selLop.options).find(o => String(o.value).trim().toUpperCase() === lopUpper);
            if (optLop) selLop.value = optLop.value;

            let optTuan = Array.from(selTuan.options).find(o => parseInt(String(o.value).replace(/\D/g, ''), 10) === tuanSo);
            if (optTuan) selTuan.value = optTuan.value;

            if (typeof window.dongBoHienThiTuSelect === 'function') {
                window.dongBoHienThiTuSelect('chonLopSo');
                window.dongBoHienThiTuSelect('chonTuanSo');
            }

            if (typeof thucThiKetXuatSoDauBaiLenLuoi === 'function') {
                thucThiKetXuatSoDauBaiLenLuoi();
            } else if (typeof ketXuatSoDauBaiLenLuoi === 'function') {
                ketXuatSoDauBaiLenLuoi();
            }

            if (typeof tuanTruocDo_SDB !== 'undefined') tuanTruocDo_SDB = selTuan.value;
            if (typeof lopTruocDo_SDB !== 'undefined') lopTruocDo_SDB = selLop.value;

            if (daSuaTuDong) {
                if (typeof coThayDoiChuaLuu_SDB !== 'undefined') coThayDoiChuaLuu_SDB = true;

                // Gắn cờ data-thaydoi="true" và biểu tượng cây bút cho tất cả các dòng vừa được tự động khắc phục trên DOM
                const vungHienThi = document.getElementById('vungHienThiSoDauBai');
                if (vungHienThi) {
                    const cacDongTR = vungHienThi.querySelectorAll('.bang-so-dau-bai-container table tbody tr');
                    cacDongTR.forEach(tr => {
                        let oTiet = tr.querySelector('td[data-loai="tietSDB"]');
                        let tietText = oTiet ? oTiet.innerText.trim() : '';
                        let buoiAttr = tr.getAttribute('data-buoi') || '';
                        let buoiNorm = chuanHoaBuoi(buoiAttr);

                        let tdThu = tr.querySelector('td[rowspan]');
                        let thuText = '';
                        if (tdThu) {
                            thuText = chuanHoaThu(tdThu.innerText.split('\n')[0].trim());
                        } else {
                            let prev = tr.previousElementSibling;
                            while (prev) {
                                let pThu = prev.querySelector('td[rowspan]');
                                if (pThu) { thuText = chuanHoaThu(pThu.innerText.split('\n')[0].trim()); break; }
                                prev = prev.previousElementSibling;
                            }
                        }

                        let dongRam = (typeof duLieuTKBGopDaMap !== 'undefined') ? duLieuTKBGopDaMap.find(d =>
                            parseInt(String(d['Tuần'] || '').replace(/\D/g, ''), 10) === tuanSo &&
                            String(d['Mã Lớp'] || '').trim().toUpperCase() === lopUpper &&
                            chuanHoaThu(d['Thứ']) === thuText &&
                            chuanHoaBuoi(d['Buổi']) === buoiNorm &&
                            String(d['Tiết'] || '').trim() === tietText
                        ) : null;

                        if (dongRam && (dongRam.TrangThaiThayDoi === true || dongRam.DaDongBoTKB === true)) {
                            // Đảm bảo giá trị Tiết PPCT và Tên bài trên DOM khớp tuyệt đối với dongRam vừa tính
                            let inpTiet = tr.querySelector('td[data-loai="tiet"] input');
                            if (inpTiet && dongRam['TietPPCT_Thuc'] !== undefined) {
                                inpTiet.value = dongRam['TietPPCT_Thuc'];
                            }
                            let taTenBai = tr.querySelector('td[data-loai="tenBai"] textarea');
                            if (taTenBai && dongRam['TenBai_Thuc'] !== undefined) {
                                taTenBai.value = dongRam['TenBai_Thuc'];
                                taTenBai.style.height = 'auto';
                                taTenBai.style.height = (taTenBai.scrollHeight) + 'px';
                            }

                            if (typeof danhDauDongThayDoi === 'function') {
                                danhDauDongThayDoi(tr);
                            } else {
                                tr.setAttribute('data-thaydoi', 'true');
                            }
                            tr.classList.add('bg-amber-50/70');
                        }
                    });
                }

                setTimeout(() => {
                    let tomTat = chiTietDaSua.slice(0, 10).join('\n- ');
                    if (chiTietDaSua.length > 10) tomTat += `\n... và ${chiTietDaSua.length - 10} tiết khác.`;

                    let hoiLuuNgay = confirm(
                        `✅ ĐÃ TỰ ĐỘNG KHẮC PHỤC THÀNH CÔNG ${soTietDaSua} TIẾT CỦA LỚP ${lopUpper} (TUẦN ${tuanSo}):\n\n` +
                        `- ${tomTat}\n\n` +
                        `Toàn bộ Môn học, Giáo viên, Tiết PPCT và Tên bài dạy đã được điền chuẩn lên lưới Sổ đầu bài & cập nhật vào RAM.\n\n` +
                        `👉 Đồng chí có muốn LƯU NGAY Sổ đầu bài lớp ${lopUpper} lên máy chủ không?\n` +
                        `(Bấm [OK] để Lưu ngay, hoặc bấm [Hủy] để xem lại trên màn hình trước khi lưu)`
                    );

                    if (hoiLuuNgay && typeof window.luuSoDauBaiSangMayChu === 'function') {
                        window.luuSoDauBaiSangMayChu();
                    }
                }, 150);
            } else {
                if (typeof coThayDoiChuaLuu_SDB !== 'undefined') coThayDoiChuaLuu_SDB = coThayDoiTam;
            }
        }, 120);
    }

    // -------------------------------------------------------------------------
    // 9. XUẤT BÁO CÁO CHÊNH LỆCH RA EXCEL (.XLSX)
    // -------------------------------------------------------------------------
    window.xuatExcelBaoCaoDoiChieu = function() {
        if (typeof XLSX === 'undefined') {
            return alert('Thư viện xuất Excel chưa sẵn sàng!');
        }
        if (!ketQuaDoiChieuToanCuc || ketQuaDoiChieuToanCuc.length === 0) {
            return alert('Không có dữ liệu chênh lệch nào để xuất!');
        }

        const rows = ketQuaDoiChieuToanCuc.map((item, idx) => ({
            'STT': idx + 1,
            'Tuần': item.tuan,
            'Lớp': item.lop,
            'Thứ': item.thu,
            'Buổi': item.buoi,
            'Tiết': item.tiet,
            'Ngày': item.ngay || '',
            'Loại chênh lệch': item.tenLoaiLoi,
            'Môn trên TKB': item.tkbMon,
            'GV trên TKB': item.tkbGV,
            'PPCT chuẩn': item.tkbTietPPCT || '',
            'Tên bài chuẩn': item.tkbTenBai || '',
            'Môn trong SĐB': item.sdbMon,
            'Trạng thái SĐB': item.sdbGV,
            'PPCT đang lưu': item.sdbTietPPCT || '',
            'Nguyên nhân chi tiết': item.nguyenNhan,
            'Hướng khắc phục': item.huongKhacPhuc
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DoiChieu_TKB_SDB');
        XLSX.writeFile(wb, `BaoCao_DoiChieu_TKB_SoDauBai_Tuan_${document.getElementById('locTuanDoiChieu')?.value || 'All'}.xlsx`);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(khoiTaoGiaoDienDoiChieu, 400));
    } else {
        setTimeout(khoiTaoGiaoDienDoiChieu, 400);
    }
})();
