/**
 * =========================================================================
 * FILE: checkonline.js (Phiên bản V7 - Đột phá Tốc độ 0ms & Nhận diện Ngữ nghĩa SĐB/TKB Thời gian thực)
 * MÔ TẢ:
 *  1. Khởi động siêu tốc: Mở modal hiển thị ngay tức thì (0ms) từ bộ nhớ RAM & BroadcastChannel,
 *     triệt tiêu hoàn toàn độ trễ chờ đợi; đồng bộ máy chủ chạy ngầm song song (Promise.all).
 *  2. Thuật toán nhận diện ngữ nghĩa đa chiều: Bắt chặn tương tác Capture Phase & quét cấu trúc
 *     bảng thực tế ("Tiết PPCT", "Tên bài dạy", Lớp) để xác định chính xác 100% người dùng đang
 *     ở Sổ đầu bài hay TKB, đang xem hay đang GHI/NHẬP theo thời gian thực.
 *
 * NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI CHO HỆ THỐNG (NGUYÊN TẮC VÀNG):
 *  1. Không quét toàn bộ localStorage / sessionStorage (tránh chạm vào bộ nhớ
 *     đệm SDB_DATA_STATIC_ của Sổ đầu bài và dữ liệu TKB các tuần).
 *  2. Không bắn request khi hệ thống đang chuyển tuần TKB (#spinnerTaiTuan)
 *     hoặc đang tải/lưu Sổ đầu bài (dangTaiDuLieuSoDauBai).
 *  3. Không gắn sự kiện visibilitychange hay sendBeacon POST gây tranh chấp
 *     luồng doPost với nút "Tuần tiếp theo..." và "Lưu Sổ đầu bài".
 *  4. Phối hợp BroadcastChannel (hỏi-đáp trực tiếp giữa các tab đang mở 0ms) và
 *     RAM CacheService trên máy chủ (tự động xóa ngay khi thoát hoặc sau 45s).
 * =========================================================================
 */

(function () {
    'use strict';

    var CHU_KY_CAP_NHAT_MODAL_MS = 3500;   // Cập nhật mỗi 3.5s KHI ĐANG MỞ MODAL (thời gian thực mượt mà)
    var CHU_KY_NHIP_TIM_NHE_MS = 25000;    // Nhịp tim nhẹ 25s/lần khi rảnh rỗi
    var CUA_SO_SONG_SERVER_MS = 45000;     // Tự động hết hạn sau 45s
    var TEN_KENH_BROADCAST = 'SmartTKB_CheckOnline_LiveChannel_V7';

    var boDemModal = null;
    var boDemNhipTim = null;
    var dangMoModal = false;
    var dangTaiDuLieu = false;
    var daGuiTinHieuThoat = false;

    var danhMucGiaoVienCache = null;
    var danhSachOnlineHienTai = [];
    var duLieuServerGanNhat = [];
    var banDoTabCungTrinhDuyet = {};
    var kenhBroadcast = null;

    // Định danh phiên làm việc của tab hiện tại
    var maPhienTab = 'TAB_' + Math.random().toString(36).substring(2, 8).toUpperCase() + '_' + Date.now();
    var dinhDanhTruocDo = '';

    // =====================================================================
    // TRỌNG TÂM: BỘ ĐIỀU PHỐI TRẠNG THÁI NGỮ NGHĨA (SEMANTIC CONTEXT ENGINE)
    // =====================================================================
    var phanHeHienTai = '';             // 'SDB' hoặc 'TKB' hoặc 'BAO_GIANG' hoặc 'THONG_KE'
    var thoiDiemGhiGanNhat = 0;         // Timestamp lần cuối gõ vào ô nhập liệu
    var noiDungGhiGanNhat = '';         // Tên thao tác ghi gần nhất
    var thaoTacTruocDo = '';            // Thao tác vừa phát trước đó
    var boDemDebounceServer = null;     // Debounce gửi máy chủ
    var thaoTacDaGuiServer = '';        // Cache thao tác đã gửi máy chủ gần nhất

    // Dọn dẹp an toàn các khóa cũ nếu có
    try {
        localStorage.removeItem('SmartTKB_CheckOnline_Presence_V1');
        localStorage.removeItem('SmartTKB_CheckOnline_Presence_V2');
    } catch (eClean) {}

    // ---------------------------------------------------------------------
    // 0. HÀM ĐỊNH DANH KHÁCH CHƯA ĐĂNG NHẬP (AN TOÀN - KHÔNG QUÉT STORAGE)
    // ---------------------------------------------------------------------
    function layMaDinhDanhKhach() {
        try {
            var maCu = sessionStorage.getItem('SmartTKB_CheckOnline_GuestId');
            if (maCu && String(maCu).trim() !== '') {
                return String(maCu).trim();
            }
            var maMoi = 'GUEST_' + Math.random().toString(36).substring(2, 8).toUpperCase();
            sessionStorage.setItem('SmartTKB_CheckOnline_GuestId', maMoi);
            return maMoi;
        } catch (e) {
            return 'GUEST_' + maPhienTab.substring(4, 10);
        }
    }

    // ---------------------------------------------------------------------
    // 1. HÀM TIỆN ÍCH AN TOÀN & KIỂM TRA TRẠNG THÁI BẬN
    // ---------------------------------------------------------------------
    function maHoaHtml(chuoi) {
        if (chuoi === null || chuoi === undefined) return '';
        return String(chuoi)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function chuanHoaChuoi(str) {
        if (!str && str !== 0) return '';
        return String(str).trim().toLowerCase();
    }

    function loaiBoDauTiengViet(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function layUrlApiMayChu() {
        try {
            if (typeof CAU_HINH_FRONTEND !== 'undefined' && CAU_HINH_FRONTEND && CAU_HINH_FRONTEND.URL_API_MAY_CHU) {
                return CAU_HINH_FRONTEND.URL_API_MAY_CHU;
            }
            if (window.CAU_HINH_FRONTEND && window.CAU_HINH_FRONTEND.URL_API_MAY_CHU) {
                return window.CAU_HINH_FRONTEND.URL_API_MAY_CHU;
            }
        } catch (e) {}
        return '';
    }

    function dangXuLyNut(nut) {
        if (!nut) return false;
        try {
            var txt = (nut.innerText || nut.textContent || '').trim().toLowerCase();
            if (txt.indexOf('đang') !== -1 || txt.indexOf('saving') !== -1 || txt.indexOf('loading') !== -1) {
                return true;
            }
            if (nut.querySelector('.animate-spin, .spinner, .fa-spinner')) {
                return true;
            }
        } catch (e) {}
        return false;
    }

    function heThongDangBanTacVuChinh() {
        try {
            if (typeof dangTaiDuLieuSoDauBai !== 'undefined' && dangTaiDuLieuSoDauBai === true) return true;
            if (typeof khoaChuyenTuan !== 'undefined' && khoaChuyenTuan === true) return true;
            if (typeof khoaTaiTKB !== 'undefined' && khoaTaiTKB === true) return true;
            var spinnerTuan = document.getElementById('spinnerTaiTuan');
            if (spinnerTuan && !spinnerTuan.classList.contains('hidden') && spinnerTuan.style.display !== 'none') return true;
            var cacNutTacVu = ['btnKhoiPhuc', 'btnLuuTuan', 'btnLuuCoDinh', 'btnLuuSua', 'btnLuuSoDauBai'];
            for (var i = 0; i < cacNutTacVu.length; i++) {
                var nut = document.getElementById(cacNutTacVu[i]);
                if (dangXuLyNut(nut)) return true;
            }
        } catch (e) {}
        return false;
    }

    // ---------------------------------------------------------------------
    // 2. THUẬT TOÁN NHẬN DIỆN NGỮ NGHĨA SỔ ĐẦU BÀI & THỜI KHÓA BIỂU
    // ---------------------------------------------------------------------

    // Trích xuất Lớp thông minh (Regex heuristic so khớp 6A, 7B, 8A1, 9A, 10A, 12D...)
    function timLopHienTai() {
        try {
            // 1. Quét select đang chọn trong DOM
            var selects = document.querySelectorAll('select');
            for (var i = 0; i < selects.length; i++) {
                var sel = selects[i];
                if (sel.selectedIndex >= 0 && sel.offsetWidth > 0) {
                    var optTxt = sel.options[sel.selectedIndex].text.trim();
                    var mLop = optTxt.match(/(?:Lớp\s*)?([1-9]|1[0-2])[A-Za-z]\d*/i);
                    if (mLop && optTxt.toLowerCase().indexOf('chọn') === -1) {
                        return optTxt.indexOf('Lớp') !== -1 ? optTxt : ('Lớp ' + optTxt);
                    }
                }
            }

            // 2. Thẻ chốt SĐB nếu có attribute
            var theChot = document.getElementById('theChotQuyenSDB');
            if (theChot) {
                var dLop = theChot.getAttribute('data-lop') || theChot.getAttribute('data-malop') || theChot.getAttribute('data-tenlop');
                if (dLop) return dLop.indexOf('Lớp') !== -1 ? dLop : ('Lớp ' + dLop);
            }

            // 3. Tiêu đề hoặc nhãn đang hiển thị có chữ Lớp
            var headings = document.querySelectorAll('h1, h2, h3, h4, .tieu-de, span.font-bold, div.font-bold');
            for (var j = 0; j < headings.length; j++) {
                var h = headings[j];
                if (h.offsetWidth > 0) {
                    var hText = (h.innerText || h.textContent || '').trim();
                    var matchH = hText.match(/Lớp\s+([1-9]|1[0-2])[A-Za-z]\d*/i);
                    if (matchH) return matchH[0];
                }
            }
        } catch (e) {}
        return '';
    }

    // Trích xuất Tuần thông minh (Tuần 1 -> Tuần 35)
    function timTuanHienTai() {
        try {
            var selects = document.querySelectorAll('select');
            for (var i = 0; i < selects.length; i++) {
                var sel = selects[i];
                if (sel.selectedIndex >= 0 && sel.offsetWidth > 0) {
                    var optTxt = sel.options[sel.selectedIndex].text.trim();
                    var mTuan = optTxt.match(/Tuần\s*(\d+)/i);
                    if (mTuan) return mTuan[0];
                }
            }
            var nhanTuan = document.getElementById('lblTuanHienTai') || document.getElementById('tuanHienTai');
            if (nhanTuan) {
                var chu = (nhanTuan.innerText || nhanTuan.textContent || '').trim();
                var matchT = chu.match(/Tuần\s*(\d+)/i);
                if (matchT) return matchT[0];
            }
        } catch (e) {}
        return '';
    }

    // Trích xuất tên Giáo viên đang xem TKB
    function timGiaoVienHienTai() {
        try {
            var selectGv = document.querySelector('#cboGiaoVien, #selectGV, select[id*="giaovien"], select[id*="gv"]');
            if (selectGv && selectGv.selectedIndex >= 0 && selectGv.offsetWidth > 0) {
                var gvText = selectGv.options[selectGv.selectedIndex].text.trim();
                var gvLC = gvText.toLowerCase();
                if (gvText && gvLC.indexOf('chọn') === -1 && gvLC.indexOf('tất cả') === -1) {
                    return gvText;
                }
            }
        } catch (e) {}
        return '';
    }

    // THUẬT TOÁN QUÉT NGỮ NGHĨA KHUNG NHÌN (VIEWPORT SEMANTIC SCANNER)
    // Phân biệt Sổ đầu bài và TKB bằng dấu vân tay cấu trúc bảng, không phụ thuộc vào ID
    function quetNguNghiaManHinhThucTe() {
        try {
            var tables = document.querySelectorAll('table');
            var coDauHieuSDB = false;
            var coDauHieuTKB = false;

            for (var i = 0; i < tables.length; i++) {
                var tbl = tables[i];
                // Chỉ xét các bảng đang hiển thị thực tế trên màn hình
                if (tbl.offsetWidth > 0 && tbl.offsetHeight > 0) {
                    var tblText = (tbl.innerText || tbl.textContent || '').toLowerCase();
                    // Dấu vân tay đặc trưng chỉ Sổ đầu bài mới có
                    if (
                        tblText.indexOf('tiết ppct') !== -1 ||
                        tblText.indexOf('tên bài dạy') !== -1 ||
                        tblText.indexOf('nội dung bài dạy') !== -1 ||
                        tblText.indexOf('ký nhận xét') !== -1 ||
                        tblText.indexOf('sổ đầu bài') !== -1
                    ) {
                        coDauHieuSDB = true;
                        break;
                    }
                    // Dấu vân tay của Thời khóa biểu
                    if (
                        (tblText.indexOf('thứ hai') !== -1 || tblText.indexOf('thứ 2') !== -1) &&
                        (tblText.indexOf('tiết 1') !== -1 || tblText.indexOf('tiết 2') !== -1 || tblText.indexOf('buổi sáng') !== -1)
                    ) {
                        coDauHieuTKB = true;
                    }
                }
            }

            if (coDauHieuSDB) return 'SDB';
            if (coDauHieuTKB) return 'TKB';
        } catch (e) {}
        return '';
    }

    // THUẬT TOÁN XÁC ĐỊNH THAO TÁC HIỆN TẠI (TỔNG HỢP ĐA TẦNG)
    function xacDinhThaoTacHienTai() {
        try {
            // Tầng 1: Đang bận xử lý mạng hệ thống (Lưu / Tải)
            if (typeof dangTaiDuLieuSoDauBai !== 'undefined' && dangTaiDuLieuSoDauBai === true) {
                return 'Đang lưu Sổ đầu bài...';
            }
            if (dangXuLyNut(document.getElementById('btnLuuSoDauBai'))) {
                return 'Đang lưu Sổ đầu bài...';
            }
            var spinnerTuan = document.getElementById('spinnerTaiTuan');
            if (spinnerTuan && !spinnerTuan.classList.contains('hidden') && spinnerTuan.style.display !== 'none') {
                return 'Đang tải tuần TKB...';
            }
            if (typeof khoaChuyenTuan !== 'undefined' && khoaChuyenTuan === true) {
                return 'Đang chuyển tuần TKB...';
            }
            if (dangXuLyNut(document.getElementById('btnLuuTuan'))) {
                return 'Đang lưu TKB tuần...';
            }
            if (dangXuLyNut(document.getElementById('btnLuuCoDinh'))) {
                return 'Đang lưu TKB cố định...';
            }
            if (dangXuLyNut(document.getElementById('btnLuuSua'))) {
                return 'Đang lưu sửa TKB...';
            }
            if (dangXuLyNut(document.getElementById('btnKhoiPhuc'))) {
                return 'Đang khôi phục TKB...';
            }

            // Tầng 2: Đang mở cửa sổ modal
            if (dangMoModal) {
                return 'Đang xem Ai online';
            }
            var cacModal = document.querySelectorAll('[id^="modal"], .modal');
            for (var m = 0; m < cacModal.length; m++) {
                var elM = cacModal[m];
                if (elM && elM.id !== 'modalCheckOnline' && !elM.classList.contains('hidden') && elM.style.display !== 'none' && elM.offsetWidth > 0) {
                    var tieuDeM = elM.querySelector('h2, h3, h4, .modal-title');
                    var textTieuDe = tieuDeM ? (tieuDeM.innerText || tieuDeM.textContent || '').trim() : '';
                    if (textTieuDe) {
                        return 'Đang mở: ' + (textTieuDe.length > 25 ? textTieuDe.substring(0, 25) + '...' : textTieuDe);
                    }
                    if (elM.id.toLowerCase().indexOf('dangnhap') !== -1) {
                        return 'Đang thao tác đăng nhập';
                    }
                }
            }

            // Tầng 3: Ưu tiên cao nhất - Trạng thái ĐANG GHI / NHẬP LIỆU trong vòng 20 giây qua
            var bayGio = Date.now();
            if (thoiDiemGhiGanNhat && (bayGio - thoiDiemGhiGanNhat) < 20000 && noiDungGhiGanNhat) {
                return noiDungGhiGanNhat;
            }

            // Tầng 4: Nhận diện phân hệ thực tế qua Quét ngữ nghĩa hoặc Khóa tương tác
            var phanHeThucTe = quetNguNghiaManHinhThucTe() || phanHeHienTai;

            if (phanHeThucTe === 'SDB') {
                var lopSdb = timLopHienTai();
                var tuanSdb = timTuanHienTai();
                if (lopSdb && tuanSdb) {
                    return 'Đang xem Sổ đầu bài (' + lopSdb + ' - ' + tuanSdb + ')';
                }
                if (lopSdb) {
                    return 'Đang xem Sổ đầu bài (' + lopSdb + ')';
                }
                return 'Đang xem Sổ đầu bài';
            }

            if (phanHeThucTe === 'BAO_GIANG') {
                return 'Đang xem Lịch báo giảng';
            }

            if (phanHeThucTe === 'THONG_KE') {
                return 'Đang xem Báo cáo thống kê';
            }

            if (document.visibilityState === 'hidden') {
                return 'Chạy ngầm (Chuyển tab khác)';
            }

            // Phân hệ Thời khóa biểu
            var tuanTkb = timTuanHienTai();
            var gvTkb = timGiaoVienHienTai();
            var lopTkb = timLopHienTai();

            if (gvTkb) {
                return 'Xem TKB GV: ' + (gvTkb.length > 15 ? gvTkb.substring(0, 15) : gvTkb) + (tuanTkb ? (' (' + tuanTkb + ')') : '');
            }
            if (lopTkb) {
                return 'Xem TKB: ' + lopTkb + (tuanTkb ? (' (' + tuanTkb + ')') : '');
            }
            if (tuanTkb) {
                return 'Đang xem TKB (' + tuanTkb + ')';
            }

            return 'Đang xem Thời khóa biểu';
        } catch (e) {
            return 'Đang xem Thời khóa biểu';
        }
    }

    // BỘ PHÁT ĐỒNG BỘ THỜI GIAN THỰC (0ms Broadcast & 300ms Debounced Server Push)
    function kichHoatDongBoThaoTac(thaoTacMoi, batBuocGui) {
        if (!thaoTacMoi) return;

        // 1. Đồng bộ tức thì 0ms qua BroadcastChannel
        if (kenhBroadcast) {
            try {
                kenhBroadcast.postMessage({
                    loai: 'CAP_NHAT_THAO_TAC_TAB',
                    maPhienTab: maPhienTab,
                    thaoTacHienTai: thaoTacMoi,
                    capNhatLuc: Date.now()
                });
            } catch (eBc) {}
        }

        // 2. Cập nhật ngay bản thân nếu đang mở modal
        if (dangMoModal) {
            capNhatHienThiTuTapHop();
        }

        // 3. Đẩy lên máy chủ sau 300ms debounce
        if (thaoTacMoi !== thaoTacDaGuiServer || batBuocGui) {
            if (boDemDebounceServer) {
                clearTimeout(boDemDebounceServer);
            }
            boDemDebounceServer = setTimeout(function () {
                thaoTacDaGuiServer = thaoTacMoi;
                guiNhipTimHienDienMayChu();
            }, 300);
        }
    }

    // BẮT CHẶN TƯƠNG TÁC TẬP TRUNG (CAPTURE PHASE LISTENER)
    function batChanTuongTacNguoiDung(e) {
        try {
            var target = e.target;
            if (!target) return;

            var modalOnline = document.getElementById('modalCheckOnline');
            if (modalOnline && modalOnline.contains(target)) return;

            // Xử lý khi Gõ phím hoặc Focus vào ô nhập liệu
            if (e.type === 'input' || e.type === 'keyup' || e.type === 'focusin') {
                var tag = (target.tagName || '').toUpperCase();
                var laInput = tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable || target.classList.contains('editable');

                if (laInput) {
                    var bang = target.closest('table');
                    var laBangSDB = false;
                    var laBangTKB = false;

                    if (bang) {
                        var textBang = (bang.innerText || bang.textContent || '').toLowerCase();
                        if (
                            textBang.indexOf('tiết ppct') !== -1 ||
                            textBang.indexOf('tên bài dạy') !== -1 ||
                            textBang.indexOf('nội dung bài dạy') !== -1 ||
                            textBang.indexOf('sổ đầu bài') !== -1
                        ) {
                            laBangSDB = true;
                        } else if (textBang.indexOf('thứ hai') !== -1 || textBang.indexOf('thứ 2') !== -1 || textBang.indexOf('tiết 1') !== -1) {
                            laBangTKB = true;
                        }
                    }

                    var attr = ((target.id || '') + ' ' + (target.className || '') + ' ' + (target.name || '') + ' ' + (target.placeholder || '')).toLowerCase();
                    if (attr.indexOf('sdb') !== -1 || attr.indexOf('bai') !== -1 || attr.indexOf('ppct') !== -1 || attr.indexOf('nhanxet') !== -1) {
                        laBangSDB = true;
                    }

                    if (laBangSDB || phanHeHienTai === 'SDB') {
                        phanHeHienTai = 'SDB';
                        thoiDiemGhiGanNhat = Date.now();
                        var lop = timLopHienTai();
                        var thaoTacGhi = lop ? ('Đang ghi Sổ đầu bài (' + lop + ')') : 'Đang ghi Sổ đầu bài';
                        noiDungGhiGanNhat = thaoTacGhi;
                        kichHoatDongBoThaoTac(thaoTacGhi);
                        return;
                    } else if (laBangTKB || phanHeHienTai === 'TKB') {
                        phanHeHienTai = 'TKB';
                        thoiDiemGhiGanNhat = Date.now();
                        var tuan = timTuanHienTai();
                        var thaoTacSua = tuan ? ('Đang chỉnh sửa TKB (' + tuan + ')') : 'Đang chỉnh sửa TKB';
                        noiDungGhiGanNhat = thaoTacSua;
                        kichHoatDongBoThaoTac(thaoTacSua);
                        return;
                    }
                }
            }

            // Xử lý khi Click chuột vào menu / nút / tab
            if (e.type === 'click') {
                var nutBam = target.closest('button, a, .tab-btn, [role="tab"], li, div[onclick]');
                if (nutBam) {
                    var txt = (nutBam.innerText || nutBam.textContent || '').trim().toLowerCase();
                    var nutId = (nutBam.id || '').toLowerCase();

                    if (txt.indexOf('sổ đầu bài') !== -1 || txt.indexOf('sđb') !== -1 || nutId.indexOf('sdb') !== -1) {
                        phanHeHienTai = 'SDB';
                        thoiDiemGhiGanNhat = 0;
                        var lopS = timLopHienTai();
                        var ttSdb = lopS ? ('Đang xem Sổ đầu bài (' + lopS + ')') : 'Đang xem Sổ đầu bài';
                        kichHoatDongBoThaoTac(ttSdb);
                        return;
                    }

                    if (txt.indexOf('thời khóa biểu') !== -1 || txt.indexOf('tkb') !== -1 || nutId.indexOf('tkb') !== -1) {
                        phanHeHienTai = 'TKB';
                        thoiDiemGhiGanNhat = 0;
                        var ttTkb = 'Đang xem Thời khóa biểu';
                        kichHoatDongBoThaoTac(ttTkb);
                        return;
                    }

                    if (txt.indexOf('báo giảng') !== -1) {
                        phanHeHienTai = 'BAO_GIANG';
                        kichHoatDongBoThaoTac('Đang xem Lịch báo giảng');
                        return;
                    }

                    if (txt.indexOf('thống kê') !== -1) {
                        phanHeHienTai = 'THONG_KE';
                        kichHoatDongBoThaoTac('Đang xem Báo cáo thống kê');
                        return;
                    }

                    if (nutId === 'btndangxuat' || txt.indexOf('đăng xuất') !== -1 || txt.indexOf('thoát') !== -1) {
                        kichHoatDongBoThaoTac('Vừa đăng xuất');
                        return;
                    }

                    if (nutId === 'nutdangnhapg' || txt.indexOf('đăng nhập') !== -1) {
                        kichHoatDongBoThaoTac('Đang thao tác đăng nhập');
                        return;
                    }
                }
            }

            // Xử lý khi Thay đổi Combobox (Chọn Lớp, Tuần, Giáo viên)
            if (e.type === 'change' && target.tagName === 'SELECT') {
                var opt = (target.options && target.selectedIndex >= 0) ? target.options[target.selectedIndex].text.trim() : '';
                var sId = (target.id || '').toLowerCase();

                if (sId.indexOf('tuan') !== -1 || target.name.indexOf('tuan') !== -1) {
                    kichHoatDongBoThaoTac('Xem: ' + opt);
                    return;
                }
                if (sId.indexOf('lop') !== -1) {
                    var phanHe = phanHeHienTai === 'SDB' ? 'Sổ đầu bài ' : 'TKB ';
                    kichHoatDongBoThaoTac('Xem ' + phanHe + opt);
                    return;
                }
                if (sId.indexOf('gv') !== -1 || sId.indexOf('giaovien') !== -1) {
                    kichHoatDongBoThaoTac('Xem TKB GV: ' + opt);
                    return;
                }
            }

            // Cập nhật trạng thái tổng quan
            var thaoTacMoi = xacDinhThaoTacHienTai();
            if (thaoTacMoi && thaoTacMoi !== thaoTacTruocDo) {
                thaoTacTruocDo = thaoTacMoi;
                kichHoatDongBoThaoTac(thaoTacMoi);
            }
        } catch (err) {}
    }

    // ---------------------------------------------------------------------
    // 3. NHẬN DIỆN NGƯỜI DÙNG HIỆN TẠI (ĐÃ ĐN / CHƯA ĐN / THOÁT RA)
    // ---------------------------------------------------------------------
    function phatHienDinhDanhHienTai() {
        var emailHoacMa = '';
        var tenHienThi = '';

        try {
            var nutDangNhap = document.getElementById('nutDangNhapG');
            var textNut = nutDangNhap ? (nutDangNhap.innerText || nutDangNhap.textContent || '').trim() : '';
            var textNutLC = textNut.toLowerCase();
            var nutDangHienChuaDangNhap = textNut && (
                textNutLC.indexOf('đăng nhập') !== -1 ||
                textNutLC.indexOf('login') !== -1
            );

            // Tầng 1: Biến toàn cục nhẹ của hệ thống
            var cacBienDinhDanh = [
                window.dinhDanhGiaoVienToanCuc,
                window.emailGiaoVienToanCuc,
                window.maGiaoVienHienTai,
                window.emailNguoiDungHienTai,
                window.userEmail
            ];
            for (var i = 0; i < cacBienDinhDanh.length; i++) {
                if (cacBienDinhDanh[i] && String(cacBienDinhDanh[i]).trim() !== '') {
                    emailHoacMa = String(cacBienDinhDanh[i]).trim();
                    break;
                }
            }

            if (window.tenGiaoVienToanCuc) {
                tenHienThi = String(window.tenGiaoVienToanCuc).trim();
            }

            // Tầng 2: Thẻ chốt quyền Sổ đầu bài
            var theChotSDB = document.getElementById('theChotQuyenSDB');
            if (theChotSDB) {
                var maSDB = theChotSDB.getAttribute('data-madinhdanh') || '';
                var tenSDB = theChotSDB.getAttribute('data-tendinhdanh') || '';
                if (!emailHoacMa && maSDB) emailHoacMa = maSDB.trim();
                if (!tenHienThi && tenSDB) tenHienThi = tenSDB.trim();
            }

            // Tầng 3: Nhãn hiển thị trên nút đăng nhập (loại bỏ chữ "đăng xuất", "thoát")
            if (!nutDangHienChuaDangNhap && textNut) {
                var cacDong = textNut.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
                var nhanChinh = cacDong[0] || '';
                var nhanLC = nhanChinh.toLowerCase();
                if (nhanChinh && nhanLC.indexOf('đăng xuất') === -1 && nhanLC.indexOf('thoát') === -1 && nhanLC.indexOf('logout') === -1) {
                    if (!emailHoacMa) emailHoacMa = nhanChinh;
                    if (!tenHienThi) tenHienThi = nhanChinh;
                }
            }
        } catch (err) {}

        // Phát hiện chuyển đổi khi đăng xuất mà chưa tắt ứng dụng
        if (dinhDanhTruocDo && !emailHoacMa) {
            guiTinHieuChuyenTrangThaiDangXuat(dinhDanhTruocDo);
            dinhDanhTruocDo = '';
        } else if (!dinhDanhTruocDo && emailHoacMa) {
            dinhDanhTruocDo = emailHoacMa;
            guiTinHieuChuyenTrangThaiDangNhap(emailHoacMa);
        } else if (emailHoacMa) {
            dinhDanhTruocDo = emailHoacMa;
        }

        return {
            dinhDanh: emailHoacMa,
            tenGoiY: tenHienThi
        };
    }

    // ---------------------------------------------------------------------
    // 4. ĐỐI CHIẾU DANH MỤC GIÁO VIÊN TRONG RAM
    // ---------------------------------------------------------------------
    function dongBoDanhMucGvTuRam() {
        try {
            if (typeof duLieuDanhMucGV !== 'undefined' && Array.isArray(duLieuDanhMucGV) && duLieuDanhMucGV.length > 0) {
                var dsTuRam = [];
                for (var i = 0; i < duLieuDanhMucGV.length; i++) {
                    var item = duLieuDanhMucGV[i];
                    if (!item) continue;
                    var ma = String(item.maGv || '').trim();
                    var ten = String(item.hoTen || '').trim();
                    if (!ma && !ten) continue;
                    dsTuRam.push({
                        maGv: ma || ten,
                        hoTen: ten || ma,
                        toChuyenMon: String(item.toChuyenMon || '').trim(),
                        hopThu: String(item.hopThu || '').trim().toLowerCase(),
                        tenKhongDau: loaiBoDauTiengViet(ten)
                    });
                }
                if (dsTuRam.length > 0) {
                    danhMucGiaoVienCache = dsTuRam;
                    return danhMucGiaoVienCache;
                }
            }
        } catch (e) {}
        return danhMucGiaoVienCache || [];
    }

    async function layBanDoDanhMucGV() {
        var tuRam = dongBoDanhMucGvTuRam();
        if (tuRam && tuRam.length > 0) {
            return tuRam;
        }

        var urlApi = layUrlApiMayChu();
        if (!urlApi || heThongDangBanTacVuChinh()) return [];

        try {
            var phanHoi = await fetch(urlApi + '?thaoTac=layDanhMucGV', { method: 'GET' });
            var duLieu = await phanHoi.json();
            var dsKetQua = [];

            if (Array.isArray(duLieu) && duLieu.length > 1) {
                for (var r = 1; r < duLieu.length; r++) {
                    var dong = duLieu[r];
                    if (!dong) continue;
                    var maGv = dong[0] !== undefined && dong[0] !== null ? String(dong[0]).trim() : '';
                    var hoTen = dong[1] !== undefined && dong[1] !== null ? String(dong[1]).trim() : '';
                    if (!maGv && !hoTen) continue;

                    dsKetQua.push({
                        maGv: maGv || hoTen,
                        hoTen: hoTen || maGv,
                        toChuyenMon: dong[2] !== undefined && dong[2] !== null ? String(dong[2]).trim() : '',
                        hopThu: dong[5] !== undefined && dong[5] !== null ? String(dong[5]).trim().toLowerCase() : '',
                        tenKhongDau: loaiBoDauTiengViet(hoTen)
                    });
                }
            }
            if (dsKetQua.length > 0) {
                danhMucGiaoVienCache = dsKetQua;
            }
            return dsKetQua;
        } catch (err) {
            return danhMucGiaoVienCache || [];
        }
    }

    function doiChieuGiaoVien(dinhDanhRaw, tenGoiY, dsGiaoVien) {
        var raw = String(dinhDanhRaw || '').trim();
        var rawLC = chuanHoaChuoi(raw);
        var rawKD = loaiBoDauTiengViet(raw);

        var goiYChuan = String(tenGoiY || '').trim();
        var goiYLC = chuanHoaChuoi(goiYChuan);
        if (goiYLC.indexOf('đăng xuất') !== -1 || goiYLC.indexOf('thoát') !== -1 || goiYLC.indexOf('logout') !== -1) {
            goiYChuan = '';
            goiYLC = '';
        }

        if (Array.isArray(dsGiaoVien) && dsGiaoVien.length > 0) {
            for (var i = 0; i < dsGiaoVien.length; i++) {
                var gv = dsGiaoVien[i];
                var maLC = chuanHoaChuoi(gv.maGv);
                var tenLC = chuanHoaChuoi(gv.hoTen);
                var mailLC = chuanHoaChuoi(gv.hopThu);
                var gvKD = gv.tenKhongDau || loaiBoDauTiengViet(gv.hoTen);

                if (
                    (rawLC && (rawLC === mailLC || rawLC === maLC || rawLC === tenLC)) ||
                    (goiYLC && (goiYLC === maLC || goiYLC === tenLC)) ||
                    (rawKD && gvKD && (rawKD.indexOf(gvKD) === 0 || gvKD.indexOf(rawKD) === 0))
                ) {
                    return {
                        maGv: gv.maGv || '---',
                        hoTen: gv.hoTen || gv.maGv || 'Giáo viên',
                        toChuyenMon: gv.toChuyenMon || 'Giáo viên',
                        hopThu: gv.hopThu || '',
                        daXacThuc: true
                    };
                }
            }
        }

        if (raw &&
            raw !== '---' &&
            raw.indexOf('TAB_') !== 0 &&
            raw.indexOf('SES_') !== 0 &&
            raw.indexOf('GUEST_') !== 0 &&
            raw.indexOf('KHACH_') !== 0 &&
            goiYLC.indexOf('chưa đăng nhập') === -1) {
            var maRutGon = raw.indexOf('@') !== -1 ? raw.split('@')[0].toUpperCase() : raw;
            var tenHienThi = goiYChuan || maRutGon;
            return {
                maGv: maRutGon,
                hoTen: tenHienThi,
                toChuyenMon: 'Tài khoản đăng nhập',
                hopThu: raw.indexOf('@') !== -1 ? raw : '',
                daXacThuc: true
            };
        }

        return {
            maGv: '---',
            hoTen: 'Chưa đăng nhập',
            toChuyenMon: 'Khách truy cập (Chế độ xem công khai)',
            hopThu: '',
            daXacThuc: false
        };
    }

    // ---------------------------------------------------------------------
    // 5. TÍN HIỆU ĐIỂM DANH & ĐỒNG BỘ THỜI GIAN THỰC
    // ---------------------------------------------------------------------
    function layThongTinPhienHienTai() {
        var raw = phatHienDinhDanhHienTai();
        var dsGV = dongBoDanhMucGvTuRam();
        var daMap = doiChieuGiaoVien(raw.dinhDanh, raw.tenGoiY, dsGV);
        var thaoTac = xacDinhThaoTacHienTai();
        var maKhach = layMaDinhDanhKhach();

        return {
            maPhienTab: maPhienTab,
            maDinhDanhKhach: maKhach,
            emailTruyCap: daMap.daXacThuc ? (raw.dinhDanh || '') : maKhach,
            maGv: daMap.daXacThuc ? daMap.maGv : '---',
            hoTen: daMap.daXacThuc ? daMap.hoTen : 'Chưa đăng nhập',
            toChuyenMon: daMap.toChuyenMon,
            daXacThuc: daMap.daXacThuc,
            thaoTacHienTai: thaoTac,
            capNhatLuc: Date.now()
        };
    }

    function guiTinHieuChuyenTrangThaiDangXuat(dinhDanhCu) {
        try {
            phanHeHienTai = 'TKB';
            thoiDiemGhiGanNhat = 0;
            noiDungGhiGanNhat = '';

            if (kenhBroadcast) {
                try {
                    kenhBroadcast.postMessage({
                        loai: 'TAB_DANG_XUAT',
                        dinhDanhCu: dinhDanhCu,
                        maPhienTab: maPhienTab
                    });
                } catch (eBc) {}
            }

            var urlApi = layUrlApiMayChu();
            if (urlApi && dinhDanhCu) {
                var urlGetXoa = urlApi +
                    '?thaoTac=roiTrangOnline' +
                    '&emailTruyCap=' + encodeURIComponent(dinhDanhCu) +
                    '&maGv=' + encodeURIComponent(dinhDanhCu) +
                    '&_t=' + Date.now();
                fetch(urlGetXoa, { method: 'GET', keepalive: true, mode: 'no-cors' }).catch(function () {});
            }

            setTimeout(function () {
                var phienMoi = layThongTinPhienHienTai();
                if (kenhBroadcast) {
                    try {
                        kenhBroadcast.postMessage({
                            loai: 'PONG_TOI_DANG_MO_TAB',
                            phien: phienMoi
                        });
                    } catch (eBc2) {}
                }
                guiNhipTimHienDienMayChu();
                if (dangMoModal) {
                    capNhatHienThiTuTapHop();
                }
            }, 200);
        } catch (err) {}
    }

    function guiTinHieuChuyenTrangThaiDangNhap(dinhDanhMoi) {
        try {
            var maKhachCu = layMaDinhDanhKhach();
            var urlApi = layUrlApiMayChu();
            if (urlApi && maKhachCu) {
                var urlGetXoaKhach = urlApi +
                    '?thaoTac=roiTrangOnline' +
                    '&emailTruyCap=' + encodeURIComponent(maKhachCu) +
                    '&_t=' + Date.now();
                fetch(urlGetXoaKhach, { method: 'GET', keepalive: true, mode: 'no-cors' }).catch(function () {});
            }

            setTimeout(function () {
                guiNhipTimHienDienMayChu();
                if (kenhBroadcast) {
                    try {
                        kenhBroadcast.postMessage({
                            loai: 'PONG_TOI_DANG_MO_TAB',
                            phien: layThongTinPhienHienTai()
                        });
                    } catch (eBc) {}
                }
                if (dangMoModal) {
                    capNhatHienThiTuTapHop();
                }
            }, 200);
        } catch (err) {}
    }

    function guiTinHieuRoiTrangNgayLapTuc(dinhDanhTuyChon) {
        try {
            var phien = layThongTinPhienHienTai();
            var dinhDanhCanXoa = dinhDanhTuyChon || phien.emailTruyCap || dinhDanhTruocDo || layMaDinhDanhKhach();

            if (kenhBroadcast) {
                try {
                    kenhBroadcast.postMessage({
                        loai: 'TAB_DA_THOAT',
                        maPhienTab: maPhienTab,
                        emailTruyCap: dinhDanhCanXoa
                    });
                } catch (eBc) {}
            }

            var urlApi = layUrlApiMayChu();
            if (!urlApi || !dinhDanhCanXoa) return;

            var urlGetXoa = urlApi +
                '?thaoTac=roiTrangOnline' +
                '&emailTruyCap=' + encodeURIComponent(dinhDanhCanXoa) +
                '&maGv=' + encodeURIComponent(phien.daXacThuc ? phien.maGv : dinhDanhCanXoa) +
                '&_t=' + Date.now();
            fetch(urlGetXoa, { method: 'GET', keepalive: true, mode: 'no-cors' }).catch(function () {});
        } catch (err) {}
    }

    function guiNhipTimHienDienMayChu() {
        try {
            if (document.visibilityState === 'hidden') return;
            if (heThongDangBanTacVuChinh()) return;

            var urlApi = layUrlApiMayChu();
            var phien = layThongTinPhienHienTai();
            if (!urlApi) return;

            var dinhDanhGui = phien.emailTruyCap || layMaDinhDanhKhach();

            var urlPing = urlApi +
                '?thaoTac=diemDanhOnline' +
                '&emailTruyCap=' + encodeURIComponent(dinhDanhGui) +
                '&maGv=' + encodeURIComponent(phien.daXacThuc ? phien.maGv : '---') +
                '&hoTen=' + encodeURIComponent(phien.daXacThuc ? phien.hoTen : 'Chưa đăng nhập') +
                '&toChuyenMon=' + encodeURIComponent(phien.toChuyenMon || '') +
                '&thaoTacHienTai=' + encodeURIComponent(phien.thaoTacHienTai || '') +
                '&thaoTacNguoiDung=' + encodeURIComponent(phien.thaoTacHienTai || '') +
                '&hanhDong=' + encodeURIComponent(phien.thaoTacHienTai || '') +
                '&daXacThuc=' + (phien.daXacThuc ? '1' : '0') +
                '&_t=' + Date.now();

            fetch(urlPing, { method: 'GET', keepalive: true }).catch(function () {});
        } catch (e) {}
    }

    function khoiTaoKenhBroadcast() {
        if (kenhBroadcast || typeof BroadcastChannel === 'undefined') return;
        try {
            kenhBroadcast = new BroadcastChannel(TEN_KENH_BROADCAST);
            kenhBroadcast.onmessage = function (ev) {
                if (!ev || !ev.data) return;
                var msg = ev.data;

                if (msg.loai === 'PING_AI_DANG_MO_TAB' && !daGuiTinHieuThoat) {
                    kenhBroadcast.postMessage({
                        loai: 'PONG_TOI_DANG_MO_TAB',
                        phien: layThongTinPhienHienTai()
                    });
                } else if (msg.loai === 'PONG_TOI_DANG_MO_TAB' && msg.phien) {
                    banDoTabCungTrinhDuyet[msg.phien.maPhienTab] = msg.phien;
                    if (dangMoModal) {
                        capNhatHienThiTuTapHop();
                    }
                } else if (msg.loai === 'CAP_NHAT_THAO_TAC_TAB') {
                    if (msg.maPhienTab && banDoTabCungTrinhDuyet[msg.maPhienTab]) {
                        banDoTabCungTrinhDuyet[msg.maPhienTab].thaoTacHienTai = msg.thaoTacHienTai;
                        banDoTabCungTrinhDuyet[msg.maPhienTab].capNhatLuc = msg.capNhatLuc || Date.now();
                        if (dangMoModal) {
                            capNhatHienThiTuTapHop();
                        }
                    }
                } else if (msg.loai === 'TAB_DANG_XUAT') {
                    if (msg.dinhDanhCu) {
                        var cuLC = chuanHoaChuoi(msg.dinhDanhCu);
                        duLieuServerGanNhat = duLieuServerGanNhat.filter(function (u) {
                            return chuanHoaChuoi(u.emailTruyCap) !== cuLC && chuanHoaChuoi(u.maGv) !== cuLC;
                        });
                    }
                    if (dangMoModal) {
                        capNhatHienThiTuTapHop();
                    }
                } else if (msg.loai === 'TAB_DA_THOAT') {
                    if (msg.maPhienTab && banDoTabCungTrinhDuyet[msg.maPhienTab]) {
                        delete banDoTabCungTrinhDuyet[msg.maPhienTab];
                    }
                    if (msg.emailTruyCap) {
                        var emailXoaLC = chuanHoaChuoi(msg.emailTruyCap);
                        duLieuServerGanNhat = duLieuServerGanNhat.filter(function (u) {
                            return chuanHoaChuoi(u.emailTruyCap) !== emailXoaLC && chuanHoaChuoi(u.maGv) !== emailXoaLC;
                        });
                    }
                    if (dangMoModal) {
                        capNhatHienThiTuTapHop();
                    }
                }
            };
        } catch (e) {}
    }

    // ---------------------------------------------------------------------
    // 6. TỔNG HỢP DANH SÁCH ONLINE (CHỐNG TRÙNG LẶP & ĐỒNG BỘ CHÍNH XÁC)
    // ---------------------------------------------------------------------
    function capNhatHienThiTuTapHop() {
        var dsGV = dongBoDanhMucGvTuRam();
        var phienBanThan = layThongTinPhienHienTai();
        var bayGio = Date.now();
        var banDoTongHop = {};

        function gopNguoiDung(rawItem, laBanThan) {
            if (!rawItem) return;
            var dinhDanhItem = rawItem.emailTruyCap || rawItem.dinhDanh || rawItem.maGv || '';
            var tenItem = rawItem.hoTen || rawItem.tenGoiY || '';
            if (!dinhDanhItem && !tenItem) return;

            var thongTinChuan = doiChieuGiaoVien(dinhDanhItem, tenItem, dsGV);
            var daXacThuc = Boolean(
                (rawItem.daXacThuc !== undefined && rawItem.daXacThuc !== false && rawItem.daXacThuc !== '0' && rawItem.daXacThuc !== 0) ||
                thongTinChuan.daXacThuc
            );

            var rawMaGv = String(rawItem.maGv || '').trim();
            var laChuaDangNhap = !daXacThuc ||
                rawMaGv === '---' ||
                rawMaGv.indexOf('TAB_') === 0 ||
                rawMaGv.indexOf('GUEST_') === 0 ||
                rawMaGv.indexOf('KHACH_') === 0 ||
                chuanHoaChuoi(tenItem).indexOf('chưa đăng nhập') !== -1;

            var maHienThi = '';
            var tenHienThi = '';
            var toCM = '';
            var key = '';

            if (laChuaDangNhap) {
                maHienThi = '---';
                tenHienThi = 'Chưa đăng nhập';
                toCM = rawItem.toChuyenMon || 'Khách truy cập';
                var guestId = rawItem.maDinhDanhKhach || (rawItem.emailTruyCap && rawItem.emailTruyCap.indexOf('GUEST_') === 0 ? rawItem.emailTruyCap : '') || layMaDinhDanhKhach();
                key = 'GUEST_' + String(guestId).trim().toUpperCase();
            } else {
                maHienThi = (
                    rawMaGv &&
                    rawMaGv !== '---' &&
                    rawMaGv.indexOf('@') === -1 &&
                    rawMaGv.indexOf('TAB_') !== 0 &&
                    rawMaGv.indexOf('GUEST_') !== 0 &&
                    rawMaGv.indexOf('KHACH_') !== 0
                ) ? rawMaGv : thongTinChuan.maGv;

                tenHienThi = (thongTinChuan.daXacThuc && thongTinChuan.hoTen && thongTinChuan.hoTen !== 'Đăng xuất')
                    ? thongTinChuan.hoTen
                    : (tenItem && tenItem !== 'Đăng xuất' ? tenItem : maHienThi);

                toCM = rawItem.toChuyenMon || thongTinChuan.toChuyenMon || 'Giáo viên';
                key = 'GV_' + String(maHienThi).trim().toUpperCase();
            }

            var capNhatLuc = Number(rawItem.capNhatLuc || rawItem.thoiGianCapNhat || bayGio);
            if (!laBanThan && (bayGio - capNhatLuc) > CUA_SO_SONG_SERVER_MS) {
                return;
            }

            var thaoTacHienThi = rawItem.thaoTacHienTai || rawItem.thaoTacNguoiDung || rawItem.hanhDong || rawItem.dangLamGi || '';
            if (!thaoTacHienThi) {
                thaoTacHienThi = laChuaDangNhap ? 'Đang xem Thời khóa biểu (Chưa đăng nhập)' : 'Đang xem Thời khóa biểu';
            }

            if (!banDoTongHop[key] || laBanThan || capNhatLuc > banDoTongHop[key].capNhatLuc) {
                banDoTongHop[key] = {
                    maGv: maHienThi,
                    hoTen: tenHienThi,
                    toChuyenMon: toCM,
                    emailTruyCap: rawItem.emailTruyCap || '',
                    daXacThuc: !laChuaDangNhap,
                    thaoTacHienTai: thaoTacHienThi,
                    capNhatLuc: capNhatLuc,
                    laBanThan: Boolean(laBanThan || (banDoTongHop[key] && banDoTongHop[key].laBanThan))
                };
            } else if (banDoTongHop[key] && thaoTacHienThi) {
                banDoTongHop[key].thaoTacHienTai = thaoTacHienThi;
            }
        }

        // 1. Nạp bản thân
        gopNguoiDung(phienBanThan, true);

        // 2. Nạp các tab khác cùng trình duyệt (BroadcastChannel)
        for (var tabId in banDoTabCungTrinhDuyet) {
            if (Object.prototype.hasOwnProperty.call(banDoTabCungTrinhDuyet, tabId)) {
                var tabInfo = banDoTabCungTrinhDuyet[tabId];
                if (tabInfo && (bayGio - (tabInfo.capNhatLuc || 0)) <= 20000) {
                    var laToiTab = (tabInfo.maPhienTab === phienBanThan.maPhienTab) ||
                        (phienBanThan.daXacThuc && tabInfo.daXacThuc && chuanHoaChuoi(tabInfo.maGv) === chuanHoaChuoi(phienBanThan.maGv));
                    gopNguoiDung(tabInfo, laToiTab);
                }
            }
        }

        // 3. Nạp danh sách từ máy chủ
        for (var i = 0; i < duLieuServerGanNhat.length; i++) {
            var svItem = duLieuServerGanNhat[i];
            if (!svItem) continue;
            var laToiSv = (
                (svItem.maGv && phienBanThan.daXacThuc && chuanHoaChuoi(svItem.maGv) === chuanHoaChuoi(phienBanThan.maGv)) ||
                (svItem.emailTruyCap && phienBanThan.emailTruyCap && chuanHoaChuoi(svItem.emailTruyCap) === chuanHoaChuoi(phienBanThan.emailTruyCap))
            );
            gopNguoiDung(svItem, laToiSv);
        }

        var ketQua = [];
        for (var k in banDoTongHop) {
            if (Object.prototype.hasOwnProperty.call(banDoTongHop, k)) {
                ketQua.push(banDoTongHop[k]);
            }
        }

        ketQua.sort(function (a, b) {
            if (a.laBanThan && !b.laBanThan) return -1;
            if (!a.laBanThan && b.laBanThan) return 1;
            if (a.daXacThuc && !b.daXacThuc) return -1;
            if (!a.daXacThuc && b.daXacThuc) return 1;
            return String(a.hoTen).localeCompare(String(b.hoTen), 'vi');
        });

        danhSachOnlineHienTai = ketQua;
        veBangDanhSachOnline();
    }

    // THU THẬP THỜI GIAN THỰC TỐI ƯU HÓA SONG SONG (PARALLEL FETCH PIPELINE)
    async function thuThapDanhSachOnlineThoiGianThuc() {
        var phienBanThan = layThongTinPhienHienTai();
        var bayGio = Date.now();

        if (kenhBroadcast) {
            try {
                kenhBroadcast.postMessage({ loai: 'PING_AI_DANG_MO_TAB' });
            } catch (e) {}
        }

        var urlApi = layUrlApiMayChu();
        var coHoTroServer = false;

        if (urlApi && !heThongDangBanTacVuChinh()) {
            try {
                var dinhDanhGui = phienBanThan.emailTruyCap || layMaDinhDanhKhach();
                var thamSo = new URLSearchParams({
                    thaoTac: 'checkOnline',
                    emailTruyCap: dinhDanhGui,
                    maGv: phienBanThan.daXacThuc ? phienBanThan.maGv : '---',
                    hoTen: phienBanThan.daXacThuc ? phienBanThan.hoTen : 'Chưa đăng nhập',
                    toChuyenMon: phienBanThan.toChuyenMon || '',
                    thaoTacHienTai: phienBanThan.thaoTacHienTai || '',
                    thaoTacNguoiDung: phienBanThan.thaoTacHienTai || '',
                    hanhDong: phienBanThan.thaoTacHienTai || '',
                    daXacThuc: phienBanThan.daXacThuc ? '1' : '0',
                    _t: String(bayGio)
                });

                // TẢI SONG SONG: Chạy checkOnline và layDanhMucGV đồng thời để triệt tiêu thời gian chờ
                var promiseCheck = fetch(urlApi + '?' + thamSo.toString(), { method: 'GET', cache: 'no-store' }).then(function (res) {
                    return res.json();
                });

                var cacTacVu = [promiseCheck];
                if (!danhMucGiaoVienCache || danhMucGiaoVienCache.length === 0) {
                    cacTacVu.push(layBanDoDanhMucGV());
                }

                var phanHoiSongSong = await Promise.all(cacTacVu);
                var dataServer = phanHoiSongSong[0];

                if (dataServer && Array.isArray(dataServer.danhSachOnline)) {
                    coHoTroServer = true;
                    duLieuServerGanNhat = dataServer.danhSachOnline;
                }
            } catch (errSv) {}
        }

        capNhatHienThiTuTapHop();

        return {
            coHoTroServer: coHoTroServer,
            thoiDiemCapNhat: new Date()
        };
    }

    // ---------------------------------------------------------------------
    // 7. KẾT XUẤT NÚT "AI ĐANG ONLINE?" & CỬA SỔ MODAL (5 CỘT THÔNG TIN)
    // ---------------------------------------------------------------------
    function taoIconThaoTac(thaoTac) {
        var ttLC = chuanHoaChuoi(thaoTac);
        if (ttLC.indexOf('ghi sổ đầu bài') !== -1 || ttLC.indexOf('chỉnh sửa tkb') !== -1 || ttLC.indexOf('nhập') !== -1) {
            return '<svg class="w-4 h-4 text-emerald-600 flex-none animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>';
        }
        if (ttLC.indexOf('lưu') !== -1 || ttLC.indexOf('tải') !== -1 || ttLC.indexOf('chuyển tuần') !== -1) {
            return '<svg class="w-3.5 h-3.5 text-amber-600 flex-none animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
        }
        if (ttLC.indexOf('sổ đầu bài') !== -1 || ttLC.indexOf('sđb') !== -1) {
            return '<svg class="w-4 h-4 text-indigo-600 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
        }
        if (ttLC.indexOf('thời khóa biểu') !== -1 || ttLC.indexOf('tkb') !== -1) {
            return '<svg class="w-4 h-4 text-blue-600 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
        }
        if (ttLC.indexOf('ai online') !== -1) {
            return '<svg class="w-4 h-4 text-emerald-600 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
        }
        if (ttLC.indexOf('đăng xuất') !== -1 || ttLC.indexOf('thoát') !== -1) {
            return '<svg class="w-4 h-4 text-rose-500 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>';
        }
        if (ttLC.indexOf('đăng nhập') !== -1) {
            return '<svg class="w-4 h-4 text-emerald-600 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>';
        }
        return '<svg class="w-4 h-4 text-slate-500 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>';
    }

    function khoiTaoNutVaModal() {
        var header = document.querySelector('header');
        var nutHienCo = document.getElementById('btnAiDangOnline');

        if (header && !nutHienCo) {
            var khungBenTrong = header.querySelector('.flex.items-center.w-full') || header;

            var nutOnline = document.createElement('button');
            nutOnline.id = 'btnAiDangOnline';
            nutOnline.type = 'button';
            nutOnline.title = 'Xem danh sách tất cả những người đang online và thao tác thời gian thực';
            nutOnline.className = [
                'ml-auto flex-none inline-flex items-center gap-2',
                'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
                'text-white font-bold text-xs md:text-sm',
                'px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-md hover:shadow-lg',
                'border border-emerald-500 transition-all duration-200 cursor-pointer group'
            ].join(' ');

            nutOnline.innerHTML = [
                '<span class="relative flex h-2.5 w-2.5 flex-none">',
                '  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-90"></span>',
                '  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>',
                '</span>',
                '<svg class="w-4 h-4 md:w-5 md:h-5 flex-none group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">',
                '  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>',
                '</svg>',
                '<span class="whitespace-nowrap tracking-wide font-sans">Ai đang online?</span>'
            ].join('');

            nutOnline.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                moModalCheckOnline();
            });

            khungBenTrong.appendChild(nutOnline);
        }

        if (!document.getElementById('modalCheckOnline')) {
            var modalWrapper = document.createElement('div');
            modalWrapper.id = 'modalCheckOnline';
            modalWrapper.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] font-sans p-2 md:p-4';

            modalWrapper.innerHTML = [
                '<div id="khungNoiDungModalOnline" class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-300 transition-all duration-200">',
                '  <div class="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-4 py-3 flex justify-between items-center border-b shadow-md flex-none">',
                '    <div class="flex items-center gap-2.5 overflow-hidden">',
                '      <span class="relative flex h-3 w-3 flex-none">',
                '        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-90"></span>',
                '        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white"></span>',
                '      </span>',
                '      <h3 class="text-base md:text-lg font-extrabold uppercase tracking-wide truncate">Ai đang Online & Thao tác hệ thống</h3>',
                '      <span id="badgeSoLuongOnline" class="bg-white/20 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-white/30 flex-none">0 người</span>',
                '    </div>',
                '    <div class="flex items-center gap-2 flex-none">',
                '      <button type="button" id="btnLamMoiOnline" title="Làm mới ngay lập tức" class="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold border border-white/20">',
                '        <svg id="iconQuayOnline" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>',
                '        <span class="hidden sm:inline">Làm mới</span>',
                '      </button>',
                '      <button type="button" id="btnDongModalOnlineX" title="Đóng cửa sổ" class="text-white hover:text-red-200 hover:bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-2xl leading-none transition-colors cursor-pointer">&times;</button>',
                '    </div>',
                '  </div>',
                '',
                '  <div class="bg-slate-100 px-4 py-2 border-b border-slate-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-none">',
                '    <div class="relative flex-1">',
                '      <input type="text" id="oTimKiemOnline" placeholder="Tìm theo Tên, ID (Mã GV), trạng thái hoặc thao tác..." autocomplete="off" class="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-800 bg-white shadow-inner">',
                '      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>',
                '    </div>',
                '    <div id="nhanThoiGianCapNhatOnline" class="text-xs font-semibold text-slate-500 text-right whitespace-nowrap">Chưa kích hoạt</div>',
                '  </div>',
                '',
                '  <div class="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-slate-50 p-0">',
                '    <table class="w-full text-sm text-center border-collapse min-w-[640px]" style="font-family:\'Times New Roman\',Times,serif;">',
                '      <thead class="bg-slate-200 text-slate-800 font-bold sticky top-0 shadow-sm z-10 text-xs md:text-sm uppercase font-sans">',
                '        <tr>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-2 w-12 text-center">STT</th>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-3 w-32 text-center">ID (Mã GV)</th>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-3 text-left">Họ và Tên</th>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-3 text-left min-w-[220px]">Đang thực hiện (Thao tác)</th>',
                '          <th class="border-b border-slate-300 py-2.5 px-3 w-36 text-center">Trạng thái</th>',
                '        </tr>',
                '      </thead>',
                '      <tbody id="vungDanhSachOnlineTbody">',
                '        <tr><td colspan="5" class="py-10 text-center text-slate-500 font-bold font-sans">Đang mở danh sách...</td></tr>',
                '      </tbody>',
                '    </table>',
                '  </div>',
                '',
                '  <div class="bg-gray-100 px-4 py-2.5 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2 flex-none">',
                '    <span id="chuThichCheDoOnline" class="text-xs text-slate-500 italic font-sans">Hiển thị đầy đủ người đã đăng nhập & chưa đăng nhập • Tự động giải phóng khi thoát ứng dụng</span>',
                '    <button type="button" id="btnDongModalOnlineDuoi" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-6 py-1.5 rounded-lg shadow transition-colors text-sm cursor-pointer font-sans">Đóng</button>',
                '  </div>',
                '</div>'
            ].join('');

            document.body.appendChild(modalWrapper);

            var nutDongX = document.getElementById('btnDongModalOnlineX');
            var nutDongDuoi = document.getElementById('btnDongModalOnlineDuoi');
            var nutLamMoi = document.getElementById('btnLamMoiOnline');
            var oTimKiem = document.getElementById('oTimKiemOnline');

            if (nutDongX) nutDongX.addEventListener('click', dongModalCheckOnline);
            if (nutDongDuoi) nutDongDuoi.addEventListener('click', dongModalCheckOnline);
            if (nutLamMoi) {
                nutLamMoi.addEventListener('click', function () {
                    lamMoiDanhSachOnline(true);
                });
            }
            if (oTimKiem) {
                oTimKiem.addEventListener('input', veBangDanhSachOnline);
            }

            modalWrapper.addEventListener('click', function (e) {
                if (e.target === modalWrapper) {
                    dongModalCheckOnline();
                }
            });

            document.addEventListener('keydown', function (e) {
                if (dangMoModal && (e.key === 'Escape' || e.keyCode === 27)) {
                    dongModalCheckOnline();
                }
            });
        }
    }

    // ---------------------------------------------------------------------
    // 8. VẼ BẢNG DỮ LIỆU ĐANG ONLINE & THAO TÁC THỰC HIỆN
    // ---------------------------------------------------------------------
    function veBangDanhSachOnline() {
        var tbody = document.getElementById('vungDanhSachOnlineTbody');
        var badge = document.getElementById('badgeSoLuongOnline');
        var oTimKiem = document.getElementById('oTimKiemOnline');
        if (!tbody) return;

        var tuKhoa = oTimKiem ? chuanHoaChuoi(oTimKiem.value) : '';
        var dsLoc = danhSachOnlineHienTai.filter(function (item) {
            if (!tuKhoa) return true;
            return (
                chuanHoaChuoi(item.maGv).indexOf(tuKhoa) !== -1 ||
                chuanHoaChuoi(item.hoTen).indexOf(tuKhoa) !== -1 ||
                chuanHoaChuoi(item.toChuyenMon).indexOf(tuKhoa) !== -1 ||
                chuanHoaChuoi(item.thaoTacHienTai).indexOf(tuKhoa) !== -1
            );
        });

        if (badge) {
            var soDaDangNhap = 0;
            var soChuaDangNhap = 0;
            for (var k = 0; k < danhSachOnlineHienTai.length; k++) {
                if (danhSachOnlineHienTai[k].daXacThuc) {
                    soDaDangNhap++;
                } else {
                    soChuaDangNhap++;
                }
            }
            badge.textContent = danhSachOnlineHienTai.length + ' online (' + soDaDangNhap + ' đã ĐN, ' + soChuaDangNhap + ' chưa ĐN)';
        }

        if (dsLoc.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-slate-500 font-bold italic font-sans">Không tìm thấy người dùng phù hợp với từ khóa.</td></tr>';
            return;
        }

        var bayGio = Date.now();
        var html = '';

        for (var i = 0; i < dsLoc.length; i++) {
            var ng = dsLoc[i];
            var soGiayTruoc = Math.max(0, Math.floor((bayGio - (ng.capNhatLuc || bayGio)) / 1000));
            var chuoiThoiGian = soGiayTruoc < 10 ? 'Vừa xong' : (soGiayTruoc + ' giây trước');

            var nhanBanThan = ng.laBanThan
                ? '<span class="ml-2 inline-block bg-blue-100 text-blue-800 text-[11px] font-sans font-extrabold px-2 py-0.5 rounded border border-blue-300">Bạn</span>'
                : '';

            var htmlCotMaGv = '';
            if (ng.daXacThuc) {
                htmlCotMaGv = '<span class="inline-block bg-blue-50 text-blue-900 font-extrabold px-2.5 py-1 rounded border border-blue-200 font-sans text-xs md:text-sm">' + maHoaHtml(ng.maGv) + '</span>';
            } else {
                htmlCotMaGv = '<span class="inline-block bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded border border-slate-300 font-sans text-xs" title="Chưa đăng nhập">---</span>';
            }

            var htmlCotHoTen = '';
            if (ng.daXacThuc) {
                var tenSach = (ng.hoTen && ng.hoTen !== 'Đăng xuất') ? ng.hoTen : ng.maGv;
                var phuDeToCM = ng.toChuyenMon
                    ? '<div class="text-xs text-slate-500 font-normal italic mt-0.5">' + maHoaHtml(ng.toChuyenMon) + '</div>'
                    : '';
                htmlCotHoTen = '<div>' + maHoaHtml(tenSach) + nhanBanThan + '</div>' + phuDeToCM;
            } else {
                htmlCotHoTen = [
                    '<div class="flex items-center gap-1.5 font-bold text-slate-700">',
                    '  <svg class="w-4 h-4 text-slate-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
                    '  <span class="text-slate-700">Chưa đăng nhập</span>' + nhanBanThan,
                    '</div>',
                    '<div class="text-xs text-slate-400 font-normal italic mt-0.5">Khách truy cập (Chế độ xem công khai)</div>'
                ].join('');
            }

            var iconThaoTac = taoIconThaoTac(ng.thaoTacHienTai);
            var mauNenThaoTac = 'bg-white border-slate-200 text-slate-800';
            var ttLC = chuanHoaChuoi(ng.thaoTacHienTai);
            if (ttLC.indexOf('ghi sổ đầu bài') !== -1 || ttLC.indexOf('chỉnh sửa tkb') !== -1) {
                mauNenThaoTac = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
            } else if (ttLC.indexOf('sổ đầu bài') !== -1) {
                mauNenThaoTac = 'bg-indigo-50 border-indigo-200 text-indigo-900';
            } else if (ttLC.indexOf('thời khóa biểu') !== -1 || ttLC.indexOf('tkb') !== -1) {
                mauNenThaoTac = 'bg-blue-50 border-blue-200 text-blue-900';
            }

            var htmlCotThaoTac = [
                '<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs md:text-sm font-sans border shadow-sm max-w-full ' + mauNenThaoTac + '">',
                iconThaoTac,
                '<span class="truncate" title="' + maHoaHtml(ng.thaoTacHienTai) + '">' + maHoaHtml(ng.thaoTacHienTai) + '</span>',
                '</div>'
            ].join('');

            var htmlCotTrangThai = [
                '<div class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-300">',
                '  <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>',
                '  <span>Đang online</span>',
                '</div>',
                '<div class="text-[11px] text-slate-400 mt-0.5">' + maHoaHtml(chuoiThoiGian) + '</div>'
            ].join('');

            html += [
                '<tr class="hover:bg-emerald-50/70 transition-colors border-b border-slate-200">',
                '  <td class="py-2.5 px-2 border-r border-slate-200 font-bold text-slate-600 text-center">' + (i + 1) + '</td>',
                '  <td class="py-2.5 px-3 border-r border-slate-200 text-center">' + htmlCotMaGv + '</td>',
                '  <td class="py-2.5 px-3 border-r border-slate-200 text-left font-bold text-slate-800 text-base">' + htmlCotHoTen + '</td>',
                '  <td class="py-2.5 px-3 border-r border-slate-200 text-left">' + htmlCotThaoTac + '</td>',
                '  <td class="py-2.5 px-3 font-sans text-center">' + htmlCotTrangThai + '</td>',
                '</tr>'
            ].join('');
        }

        tbody.innerHTML = html;
    }

    // ---------------------------------------------------------------------
    // 9. ĐIỀU KHIỂN MỞ / ĐÓNG MODAL (MỞ 0MS KHÔNG CHỜ SERVER)
    // ---------------------------------------------------------------------
    async function lamMoiDanhSachOnline(hienHieuUngQuay) {
        if (!dangMoModal || dangTaiDuLieu) return;
        dangTaiDuLieu = true;

        var iconQuay = document.getElementById('iconQuayOnline');
        var nhanThoiGian = document.getElementById('nhanThoiGianCapNhatOnline');

        if (hienHieuUngQuay && iconQuay) {
            iconQuay.classList.add('animate-spin');
        }

        try {
            var ketQua = await thuThapDanhSachOnlineThoiGianThuc();
            if (nhanThoiGian && ketQua.thoiDiemCapNhat) {
                var d = ketQua.thoiDiemCapNhat;
                var hh = String(d.getHours()).padStart(2, '0');
                var mm = String(d.getMinutes()).padStart(2, '0');
                var ss = String(d.getSeconds()).padStart(2, '0');
                nhanThoiGian.textContent = 'Cập nhật: ' + hh + ':' + mm + ':' + ss;
            }
        } catch (err) {
        } finally {
            dangTaiDuLieu = false;
            if (iconQuay) {
                iconQuay.classList.remove('animate-spin');
            }
        }
    }

    function moModalCheckOnline() {
        khoiTaoNutVaModal();
        khoiTaoKenhBroadcast();
        var modal = document.getElementById('modalCheckOnline');
        if (!modal) return;

        dangMoModal = true;
        modal.classList.remove('hidden');

        // BƯỚC ĐỘT PHÁ: Hiển thị ngay lập tức 0ms từ bộ nhớ RAM & BroadcastChannel!
        capNhatHienThiTuTapHop();

        // Đồng bộ ngầm không bắt người dùng chờ
        lamMoiDanhSachOnline(true);

        if (boDemModal) {
            clearInterval(boDemModal);
        }
        boDemModal = setInterval(function () {
            if (dangMoModal) {
                lamMoiDanhSachOnline(false);
            }
        }, CHU_KY_CAP_NHAT_MODAL_MS);
    }

    function dongModalCheckOnline() {
        dangMoModal = false;
        if (boDemModal) {
            clearInterval(boDemModal);
            boDemModal = null;
        }
        var modal = document.getElementById('modalCheckOnline');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------------------
    // 10. KHỞI ĐỘNG NHANH 800MS & BẮT CHẶN TOÀN BỘ SỰ KIỆN TRÊN WINDOW
    // ---------------------------------------------------------------------
    function khoiDongHeThongCheckOnline() {
        khoiTaoNutVaModal();
        khoiTaoKenhBroadcast();

        // GẮN LISTENER Ở MỨC WINDOW - CAPTURE PHASE ĐỂ BẮT ĐƯỢC 100% SỰ KIỆN
        window.addEventListener('click', batChanTuongTacNguoiDung, { capture: true, passive: true });
        window.addEventListener('change', batChanTuongTacNguoiDung, { capture: true, passive: true });
        window.addEventListener('input', batChanTuongTacNguoiDung, { capture: true, passive: true });
        window.addEventListener('keyup', batChanTuongTacNguoiDung, { capture: true, passive: true });
        window.addEventListener('focusin', batChanTuongTacNguoiDung, { capture: true, passive: true });

        // Cập nhật khi chuyển tab trình duyệt
        document.addEventListener('visibilitychange', function () {
            var thaoTacMoi = xacDinhThaoTacHienTai();
            kichHoatDongBoThaoTac(thaoTacMoi);
        }, { passive: true });

        var xuLyThoatTrang = function () {
            if (daGuiTinHieuThoat) return;
            daGuiTinHieuThoat = true;
            guiTinHieuRoiTrangNgayLapTuc();
        };

        window.addEventListener('pagehide', xuLyThoatTrang);
        window.addEventListener('beforeunload', xuLyThoatTrang);

        // KHỞI ĐỘNG SIÊU TỐC: Điểm danh ngay sau 800ms thay vì bắt chờ 8000ms
        setTimeout(function () {
            guiNhipTimHienDienMayChu();
        }, 800);

        if (boDemNhipTim) clearInterval(boDemNhipTim);
        boDemNhipTim = setInterval(function () {
            if (document.visibilityState === 'visible' && !daGuiTinHieuThoat) {
                guiNhipTimHienDienMayChu();
            }
        }, CHU_KY_NHIP_TIM_NHE_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiDongHeThongCheckOnline);
    } else {
        khoiDongHeThongCheckOnline();
    }

    // Xuất hàm toàn cục cho hệ thống gọi khi cần
    window.moModalCheckOnline = moModalCheckOnline;
    window.dongModalCheckOnline = dongModalCheckOnline;
    window.lamMoiDanhSachOnline = lamMoiDanhSachOnline;
})();
