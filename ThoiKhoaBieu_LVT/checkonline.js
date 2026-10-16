/**
 * =========================================================================
 * FILE: checkonline.js (Phiên bản V4 - Cách ly tuyệt đối với TKB & Sổ Đầu Bài)
 * MÔ TẢ: Tính năng "Ai đang online?" hiển thị danh sách Tên và ID (Mã GV)
 *        những người đang trực tuyến theo thời gian thực.
 *
 * NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI CHO HỆ THỐNG:
 *  1. Không quét toàn bộ localStorage / sessionStorage (tránh chạm vào bộ nhớ
 *     đệm SDB_DATA_STATIC_ của Sổ đầu bài và dữ liệu TKB các tuần).
 *  2. Không bắn request khi hệ thống đang chuyển tuần TKB (#spinnerTaiTuan)
 *     hoặc đang tải/lưu Sổ đầu bài (dangTaiDuLieuSoDauBai).
 *  3. Không gắn sự kiện visibilitychange hay sendBeacon POST gây tranh chấp
 *     luồng doPost với nút "Tuần tiếp theo..." và "Lưu Sổ đầu bài".
 *  4. Phối hợp BroadcastChannel (hỏi-đáp trực tiếp giữa các tab đang mở) và
 *     RAM CacheService trên máy chủ (tự động xóa ngay khi thoát hoặc sau 45s).
 * =========================================================================
 */

(function () {
    'use strict';

    var CHU_KY_CAP_NHAT_MODAL_MS = 8000;   // Chỉ cập nhật mỗi 8s KHI ĐANG MỞ MODAL
    var CHU_KY_NHIP_TIM_NHE_MS = 30000;    // Nhịp tim nhẹ 30s/lần khi rảnh rỗi
    var CUA_SO_SONG_SERVER_MS = 45000;     // Tự động hết hạn sau 45s
    var TEN_KENH_BROADCAST = 'SmartTKB_CheckOnline_LiveChannel_V4';

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

    var maPhienTab = 'TAB_' + Math.random().toString(36).substring(2, 8).toUpperCase() + '_' + Date.now();
    var dinhDanhTruocDo = '';

    // Dọn dẹp các khóa localStorage cũ từ phiên bản trước
    try {
        localStorage.removeItem('SmartTKB_CheckOnline_Presence_V1');
        localStorage.removeItem('SmartTKB_CheckOnline_Presence_V2');
    } catch (eClean) {}

    // ---------------------------------------------------------------------
    // 1. HÀM TIỆN ÍCH AN TOÀN & KIỂM TRA TRẠNG THÁI BẬN CỦA TKB / SĐB
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

    // Kiểm tra xem TKB hoặc Sổ đầu bài có đang bận tải/lưu hay không
    function heThongDangBanTacVuChinh() {
        try {
            if (typeof dangTaiDuLieuSoDauBai !== 'undefined' && dangTaiDuLieuSoDauBai === true) return true;
            if (typeof khoaChuyenTuan !== 'undefined' && khoaChuyenTuan === true) return true;
            if (typeof khoaTaiTKB !== 'undefined' && khoaTaiTKB === true) return true;
            var spinnerTuan = document.getElementById('spinnerTaiTuan');
            if (spinnerTuan && !spinnerTuan.classList.contains('hidden')) return true;
            var cacNutTacVu = ['btnKhoiPhuc', 'btnLuuTuan', 'btnLuuCoDinh', 'btnLuuSua', 'btnLuuSoDauBai'];
            for (var i = 0; i < cacNutTacVu.length; i++) {
                var nut = document.getElementById(cacNutTacVu[i]);
                if (nut && nut.disabled && (nut.innerText || '').indexOf('Đang') !== -1) return true;
            }
        } catch (e) {}
        return false;
    }

    // ---------------------------------------------------------------------
    // 2. NHẬN DIỆN NGƯỜI DÙNG HIỆN TẠI (KHÔNG QUÉT STORAGE CỦA SĐB/TKB)
    // ---------------------------------------------------------------------
    function phatHienDinhDanhHienTai() {
        var emailHoacMa = '';
        var tenHienThi = '';

        try {
            var nutDangNhap = document.getElementById('nutDangNhapG');
            var textNut = nutDangNhap ? (nutDangNhap.innerText || nutDangNhap.textContent || '').trim() : '';
            var nutDangHienChuaDangNhap = textNut && (
                textNut.toLowerCase().indexOf('đăng nhập') !== -1 ||
                textNut.toLowerCase().indexOf('login') !== -1
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

            // Tầng 2: Thẻ chốt quyền Sổ đầu bài (nếu đã nạp SĐB)
            var theChotSDB = document.getElementById('theChotQuyenSDB');
            if (theChotSDB) {
                var maSDB = theChotSDB.getAttribute('data-madinhdanh') || '';
                var tenSDB = theChotSDB.getAttribute('data-tendinhdanh') || '';
                if (!emailHoacMa && maSDB) emailHoacMa = maSDB.trim();
                if (!tenHienThi && tenSDB) tenHienThi = tenSDB.trim();
            }

            // Tầng 3: Nhãn hiển thị trên nút #nutDangNhapG (khi đã đăng nhập)
            if (!nutDangHienChuaDangNhap && textNut) {
                var cacDong = textNut.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
                var nhanChinh = cacDong[0] || '';
                if (nhanChinh) {
                    if (!emailHoacMa) emailHoacMa = nhanChinh;
                    if (!tenHienThi) tenHienThi = nhanChinh;
                }
            }
        } catch (err) {}

        // Phát hiện nếu người dùng vừa bấm Đăng xuất
        if (dinhDanhTruocDo && !emailHoacMa) {
            guiTinHieuRoiTrangNgayLapTuc(dinhDanhTruocDo);
            dinhDanhTruocDo = '';
        } else if (emailHoacMa) {
            dinhDanhTruocDo = emailHoacMa;
        }

        return {
            dinhDanh: emailHoacMa,
            tenGoiY: tenHienThi
        };
    }

    // ---------------------------------------------------------------------
    // 3. ĐỐI CHIẾU VỚI DANH MỤC GIÁO VIÊN TRONG RAM
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
                        hopThu: String(item.hopThu || '').trim().toLowerCase()
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
                        hopThu: dong[5] !== undefined && dong[5] !== null ? String(dong[5]).trim().toLowerCase() : ''
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
        var goiYLC = chuanHoaChuoi(tenGoiY);

        if (Array.isArray(dsGiaoVien) && dsGiaoVien.length > 0) {
            for (var i = 0; i < dsGiaoVien.length; i++) {
                var gv = dsGiaoVien[i];
                var maLC = chuanHoaChuoi(gv.maGv);
                var tenLC = chuanHoaChuoi(gv.hoTen);
                var mailLC = chuanHoaChuoi(gv.hopThu);

                if (
                    (rawLC && (rawLC === mailLC || rawLC === maLC || rawLC === tenLC)) ||
                    (goiYLC && (goiYLC === maLC || goiYLC === tenLC))
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

        if (raw && raw.indexOf('TAB_') !== 0 && raw.indexOf('SES_') !== 0 && raw.indexOf('GUEST_') !== 0) {
            var maRutGon = raw.indexOf('@') !== -1 ? raw.split('@')[0].toUpperCase() : raw;
            return {
                maGv: maRutGon,
                hoTen: tenGoiY || raw,
                toChuyenMon: 'Tài khoản đăng nhập',
                hopThu: raw.indexOf('@') !== -1 ? raw : '',
                daXacThuc: true
            };
        }

        return {
            maGv: maPhienTab.substring(0, 9),
            hoTen: 'Khách đang xem (Chưa đăng nhập)',
            toChuyenMon: 'Chế độ xem công khai',
            hopThu: '',
            daXacThuc: false
        };
    }

    // ---------------------------------------------------------------------
    // 4. TÍN HIỆU ĐIỂM DANH NHẸ & THOÁT TỨC THÌ (KHÔNG DÙNG POST SENDBEACON)
    // ---------------------------------------------------------------------
    function layThongTinPhienHienTai() {
        var raw = phatHienDinhDanhHienTai();
        var dsGV = dongBoDanhMucGvTuRam();
        var daMap = doiChieuGiaoVien(raw.dinhDanh, raw.tenGoiY, dsGV);
        return {
            maPhienTab: maPhienTab,
            emailTruyCap: raw.dinhDanh || '',
            maGv: daMap.maGv,
            hoTen: daMap.hoTen,
            toChuyenMon: daMap.toChuyenMon,
            daXacThuc: daMap.daXacThuc,
            capNhatLuc: Date.now()
        };
    }

    function guiTinHieuRoiTrangNgayLapTuc(dinhDanhCu) {
        try {
            var dinhDanhCanXoa = dinhDanhCu || dinhDanhTruocDo || '';

            // 1. Báo ngay qua BroadcastChannel cho các tab khác trên cùng máy (0ms)
            if (kenhBroadcast) {
                try {
                    kenhBroadcast.postMessage({
                        loai: 'TAB_DA_THOAT',
                        maPhienTab: maPhienTab,
                        emailTruyCap: dinhDanhCanXoa
                    });
                } catch (eBc) {}
            }

            // 2. Gửi GET nhẹ với keepalive (tuyệt đối không gửi POST sendBeacon để tránh đụng doPost)
            var urlApi = layUrlApiMayChu();
            if (!urlApi || !dinhDanhCanXoa) return;

            var urlGetXoa = urlApi +
                '?thaoTac=roiTrangOnline' +
                '&emailTruyCap=' + encodeURIComponent(dinhDanhCanXoa) +
                '&maGv=' + encodeURIComponent(dinhDanhCanXoa) +
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
            if (!urlApi || !phien.emailTruyCap) return;

            var urlPing = urlApi +
                '?thaoTac=diemDanhOnline' +
                '&emailTruyCap=' + encodeURIComponent(phien.emailTruyCap) +
                '&maGv=' + encodeURIComponent(phien.maGv || '') +
                '&hoTen=' + encodeURIComponent(phien.hoTen || '') +
                '&toChuyenMon=' + encodeURIComponent(phien.toChuyenMon || '') +
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
    // 5. TỔNG HỢP DANH SÁCH ĐANG ONLINE KHI MỞ MODAL
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
            var maHienThi = (
                rawItem.maGv &&
                rawItem.maGv !== '---' &&
                rawItem.maGv.indexOf('@') === -1 &&
                rawItem.maGv.indexOf('TAB_') !== 0 &&
                rawItem.maGv.indexOf('SES_') !== 0
            )
                ? String(rawItem.maGv).trim()
                : thongTinChuan.maGv;

            var tenHienThi = (thongTinChuan.daXacThuc && thongTinChuan.hoTen)
                ? thongTinChuan.hoTen
                : (tenItem || maHienThi);

            var toCM = rawItem.toChuyenMon || thongTinChuan.toChuyenMon || '';
            var key = String(maHienThi).trim().toUpperCase();
            var capNhatLuc = Number(rawItem.capNhatLuc || rawItem.thoiGianCapNhat || bayGio);

            if (!laBanThan && (bayGio - capNhatLuc) > CUA_SO_SONG_SERVER_MS) {
                return;
            }

            if (!banDoTongHop[key] || laBanThan || capNhatLuc > banDoTongHop[key].capNhatLuc) {
                banDoTongHop[key] = {
                    maGv: maHienThi,
                    hoTen: tenHienThi,
                    toChuyenMon: toCM,
                    emailTruyCap: rawItem.emailTruyCap || '',
                    capNhatLuc: capNhatLuc,
                    laBanThan: Boolean(laBanThan || (banDoTongHop[key] && banDoTongHop[key].laBanThan))
                };
            }
        }

        gopNguoiDung(phienBanThan, true);

        for (var tabId in banDoTabCungTrinhDuyet) {
            if (Object.prototype.hasOwnProperty.call(banDoTabCungTrinhDuyet, tabId)) {
                var tabInfo = banDoTabCungTrinhDuyet[tabId];
                if (tabInfo && (bayGio - (tabInfo.capNhatLuc || 0)) <= 15000) {
                    var laToiTab = chuanHoaChuoi(tabInfo.maGv) === chuanHoaChuoi(phienBanThan.maGv);
                    gopNguoiDung(tabInfo, laToiTab);
                }
            }
        }

        for (var i = 0; i < duLieuServerGanNhat.length; i++) {
            var svItem = duLieuServerGanNhat[i];
            if (!svItem) continue;
            var laToiSv =
                (svItem.maGv && chuanHoaChuoi(svItem.maGv) === chuanHoaChuoi(phienBanThan.maGv)) ||
                (svItem.emailTruyCap && phienBanThan.emailTruyCap && chuanHoaChuoi(svItem.emailTruyCap) === chuanHoaChuoi(phienBanThan.emailTruyCap));
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
            return String(a.maGv).localeCompare(String(b.maGv), 'vi');
        });

        danhSachOnlineHienTai = ketQua;
        veBangDanhSachOnline();
    }

    async function thuThapDanhSachOnlineThoiGianThuc() {
        await layBanDoDanhMucGV();
        var phienBanThan = layThongTinPhienHienTai();
        var bayGio = Date.now();

        banDoTabCungTrinhDuyet = {};
        if (kenhBroadcast) {
            try {
                kenhBroadcast.postMessage({ loai: 'PING_AI_DANG_MO_TAB' });
            } catch (e) {}
        }

        var urlApi = layUrlApiMayChu();
        var coHoTroServer = false;

        if (urlApi && !heThongDangBanTacVuChinh()) {
            try {
                var thamSo = new URLSearchParams({
                    thaoTac: 'checkOnline',
                    emailTruyCap: phienBanThan.emailTruyCap || '',
                    maGv: phienBanThan.daXacThuc ? phienBanThan.maGv : '',
                    hoTen: phienBanThan.daXacThuc ? phienBanThan.hoTen : '',
                    toChuyenMon: phienBanThan.daXacThuc ? phienBanThan.toChuyenMon : '',
                    _t: String(bayGio)
                });
                var res = await fetch(urlApi + '?' + thamSo.toString(), { method: 'GET', cache: 'no-store' });
                var dataServer = await res.json();

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
    // 6. KẾT XUẤT NÚT "AI ĐANG ONLINE?" & CỬA SỔ MODAL
    // ---------------------------------------------------------------------
    function khoiTaoNutVaModal() {
        var header = document.querySelector('header');
        var nutHienCo = document.getElementById('btnAiDangOnline');

        if (header && !nutHienCo) {
            var khungBenTrong = header.querySelector('.flex.items-center.w-full') || header;

            var nutOnline = document.createElement('button');
            nutOnline.id = 'btnAiDangOnline';
            nutOnline.type = 'button';
            nutOnline.title = 'Xem danh sách tên và ID những người đang online theo thời gian thực';
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
                '<div id="khungNoiDungModalOnline" class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300 transition-all duration-200">',
                '  <div class="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3.5 flex justify-between items-center border-b shadow-md flex-none">',
                '    <div class="flex items-center gap-2.5 overflow-hidden">',
                '      <span class="relative flex h-3 w-3 flex-none">',
                '        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-90"></span>',
                '        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white"></span>',
                '      </span>',
                '      <h3 class="text-base md:text-lg font-extrabold uppercase tracking-wide truncate">Danh sách đang Online</h3>',
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
                '  <div class="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-none">',
                '    <div class="relative flex-1">',
                '      <input type="text" id="oTimKiemOnline" placeholder="Tìm nhanh theo Tên hoặc ID (Mã GV)..." autocomplete="off" class="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-800 bg-white shadow-inner">',
                '      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>',
                '    </div>',
                '    <div id="nhanThoiGianCapNhatOnline" class="text-xs font-semibold text-slate-500 text-right whitespace-nowrap">Chưa kích hoạt</div>',
                '  </div>',
                '',
                '  <div class="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-0">',
                '    <table class="w-full text-sm text-center border-collapse" style="font-family:\'Times New Roman\',Times,serif;">',
                '      <thead class="bg-slate-200 text-slate-800 font-bold sticky top-0 shadow-sm z-10 text-xs md:text-sm uppercase">',
                '        <tr>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-2 w-14">STT</th>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-3 w-36">ID (Mã GV)</th>',
                '          <th class="border-b border-r border-slate-300 py-2.5 px-3 text-left">Họ và Tên</th>',
                '          <th class="border-b border-slate-300 py-2.5 px-3 w-40">Trạng thái</th>',
                '        </tr>',
                '      </thead>',
                '      <tbody id="vungDanhSachOnlineTbody">',
                '        <tr><td colspan="4" class="py-10 text-center text-slate-500 font-bold">Ấn nút để tải danh sách trực tuyến...</td></tr>',
                '      </tbody>',
                '    </table>',
                '  </div>',
                '',
                '  <div class="bg-gray-100 px-4 py-2.5 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2 flex-none">',
                '    <span id="chuThichCheDoOnline" class="text-xs text-slate-500 italic">Chỉ kích hoạt khi mở bảng • Tự động gỡ ngay khi người dùng thoát</span>',
                '    <button type="button" id="btnDongModalOnlineDuoi" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-6 py-1.5 rounded-lg shadow transition-colors text-sm cursor-pointer">Đóng</button>',
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
    // 7. VẼ BẢNG DỮ LIỆU TÊN & ID NGƯỜI ĐANG ONLINE
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
                chuanHoaChuoi(item.toChuyenMon).indexOf(tuKhoa) !== -1
            );
        });

        if (badge) {
            badge.textContent = danhSachOnlineHienTai.length + ' người';
        }

        if (dsLoc.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-slate-500 font-bold italic">Không tìm thấy người dùng phù hợp với từ khóa.</td></tr>';
            return;
        }

        var bayGio = Date.now();
        var html = '';

        for (var i = 0; i < dsLoc.length; i++) {
            var ng = dsLoc[i];
            var soGiayTruoc = Math.max(0, Math.floor((bayGio - (ng.capNhatLuc || bayGio)) / 1000));
            var chuoiThoiGian = soGiayTruoc < 10 ? 'Đang hoạt động' : (soGiayTruoc + ' giây trước');

            var nhanBanThan = ng.laBanThan
                ? '<span class="ml-2 inline-block bg-blue-100 text-blue-800 text-[11px] font-sans font-extrabold px-2 py-0.5 rounded border border-blue-300">Bạn</span>'
                : '';

            var phuDeToCM = ng.toChuyenMon
                ? '<div class="text-xs text-slate-500 font-normal italic mt-0.5">' + maHoaHtml(ng.toChuyenMon) + '</div>'
                : '';

            html += [
                '<tr class="hover:bg-emerald-50/70 transition-colors border-b border-slate-200">',
                '  <td class="py-2.5 px-2 border-r border-slate-200 font-bold text-slate-600">' + (i + 1) + '</td>',
                '  <td class="py-2.5 px-3 border-r border-slate-200">',
                '    <span class="inline-block bg-blue-50 text-blue-900 font-extrabold px-2.5 py-1 rounded border border-blue-200 font-sans text-xs md:text-sm">' + maHoaHtml(ng.maGv) + '</span>',
                '  </td>',
                '  <td class="py-2.5 px-3 border-r border-slate-200 text-left font-bold text-slate-800 text-base">',
                '    <div>' + maHoaHtml(ng.hoTen) + nhanBanThan + '</div>',
                phuDeToCM,
                '  </td>',
                '  <td class="py-2.5 px-3 font-sans">',
                '    <div class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-300">',
                '      <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>',
                '      <span>Đang online</span>',
                '    </div>',
                '    <div class="text-[11px] text-slate-400 mt-0.5">' + maHoaHtml(chuoiThoiGian) + '</div>',
                '  </td>',
                '</tr>'
            ].join('');
        }

        tbody.innerHTML = html;
    }

    // ---------------------------------------------------------------------
    // 8. ĐIỀU KHIỂN MỞ / ĐÓNG MODAL
    // ---------------------------------------------------------------------
    async function lamMoiDanhSachOnline(hienHieuUngQuay) {
        if (!dangMoModal || dangTaiDuLieu) return;
        dangTaiDuLieu = true;

        var iconQuay = document.getElementById('iconQuayOnline');
        var tbody = document.getElementById('vungDanhSachOnlineTbody');
        var nhanThoiGian = document.getElementById('nhanThoiGianCapNhatOnline');

        if (hienHieuUngQuay && iconQuay) {
            iconQuay.classList.add('animate-spin');
        }

        if (danhSachOnlineHienTai.length === 0 && tbody) {
            tbody.innerHTML = [
                '<tr><td colspan="4" class="py-10 text-center text-slate-500 font-bold">',
                '  <div class="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2"></div>',
                '  Đang kiểm tra người dùng trực tuyến...',
                '</td></tr>'
            ].join('');
        }

        try {
            var ketQua = await thuThapDanhSachOnlineThoiGianThuc();
            if (nhanThoiGian && ketQua.thoiDiemCapNhat) {
                var d = ketQua.thoiDiemCapNhat;
                var hh = String(d.getHours()).padStart(2, '0');
                var mm = String(d.getMinutes()).padStart(2, '0');
                var ss = String(d.getSeconds()).padStart(2, '0');
                nhanThoiGian.textContent = 'Cập nhật lúc: ' + hh + ':' + mm + ':' + ss;
            }
        } catch (err) {
            if (tbody && danhSachOnlineHienTai.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-red-600 font-bold">Không thể kết nối máy chủ. Vui lòng bấm Làm mới để thử lại.</td></tr>';
            }
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
    // 9. KHỞI ĐỘNG AN TOÀN (KHÔNG CAN THIỆP LUỒNG TKB / SỔ ĐẦU BÀI)
    // ---------------------------------------------------------------------
    function khoiDongHeThongCheckOnline() {
        khoiTaoNutVaModal();
        khoiTaoKenhBroadcast();

        var xuLyThoatTrang = function () {
            if (daGuiTinHieuThoat) return;
            daGuiTinHieuThoat = true;
            guiTinHieuRoiTrangNgayLapTuc();
        };

        window.addEventListener('pagehide', xuLyThoatTrang);
        window.addEventListener('beforeunload', xuLyThoatTrang);

        // Chờ 8 giây sau khi trang khởi động hoàn tất mới điểm danh nhẹ (nhường 100% băng thông cho TKB & SĐB)
        setTimeout(function () {
            guiNhipTimHienDienMayChu();
        }, 8000);

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

    window.moModalCheckOnline = moModalCheckOnline;
    window.dongModalCheckOnline = dongModalCheckOnline;
    window.lamMoiDanhSachOnline = lamMoiDanhSachOnline;
})();
