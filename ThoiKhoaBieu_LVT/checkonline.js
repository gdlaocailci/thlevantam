/**
 * =========================================================================
 * FILE: checkonline.js
 * MÔ TẢ: Tính năng "Ai đang online?" hiển thị danh sách Tên và ID (Mã GV)
 *        những người đang trực tuyến theo thời gian thực.
 * NGUYÊN TẮC AN TOÀN:
 *  1. Đóng gói hoàn toàn trong IIFE (Isolated Scope), tuyệt đối không ghi đè
 *     hay xung đột với bất kỳ biến/hàm toàn cục nào của hệ thống.
 *  2. KHÔNG gửi request ngầm khi tải trang. CHỈ kích hoạt kết nối và cập nhật
 *     thời gian thực khi người dùng ấn nút "Ai đang online?".
 *  3. Tự động ngắt bộ đếm thời gian thực (clearInterval) ngay khi đóng Modal.
 * =========================================================================
 */

(function () {
    'use strict';

    // ---------------------------------------------------------------------
    // 1. CẤU HÌNH & TRẠNG THÁI NỘI BỘ (CÁCH LY HOÀN TOÀN)
    // ---------------------------------------------------------------------
    var CHU_KY_CAP_NHAT_MS = 12000;      // Làm mới mỗi 12 giây KHI VÀ CHỈ KHI mở Modal
    var THOI_GIAN_SONG_ONLINE_MS = 120000; // Cửa sổ 2 phút xác nhận đang trực tuyến
    var KHOA_LOCAL_STORAGE = 'SmartTKB_CheckOnline_Presence_V1';
    var TEN_KENH_BROADCAST = 'SmartTKB_CheckOnline_Channel_V1';

    var boDemThoiGianThuc = null;
    var dangMoModal = false;
    var dangTaiDuLieu = false;
    var danhMucGiaoVienCache = null;     // Bộ nhớ đệm DM_GIAOVIEN (chỉ tải khi ấn nút)
    var danhSachOnlineHienTai = [];      // Danh sách đang hiển thị trong Modal
    var kenhBroadcast = null;
    var maPhienTamThoi = 'GUEST_' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // ---------------------------------------------------------------------
    // 2. HÀM TIỆN ÍCH CHUẨN HÓA & AN TOÀN XSS
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

    // ---------------------------------------------------------------------
    // 3. NHẬN DIỆN NGƯỜI DÙNG HIỆN TẠI TRÊN TRÌNH DUYỆT (CHỈ ĐỌC)
    // ---------------------------------------------------------------------
    function phatHienDinhDanhHienTai() {
        var dinhDanh = '';
        var tenHienThi = '';

        try {
            // Ưu tiên 1: Các biến định danh toàn cục có sẵn của hệ thống
            var cacBienToanCuc = [
                window.dinhDanhGiaoVienToanCuc,
                window.emailGiaoVienToanCuc,
                window.maGiaoVienHienTai,
                window.emailNguoiDungHienTai,
                window.userEmail
            ];
            for (var i = 0; i < cacBienToanCuc.length; i++) {
                if (cacBienToanCuc[i] && String(cacBienToanCuc[i]).trim() !== '') {
                    dinhDanh = String(cacBienToanCuc[i]).trim();
                    break;
                }
            }

            // Ưu tiên 2: Quét chỉ đọc từ localStorage / sessionStorage nếu biến toàn cục chưa gán
            if (!dinhDanh) {
                var khoLuuTru = [window.localStorage, window.sessionStorage];
                for (var s = 0; s < khoLuuTru.length; s++) {
                    var kho = khoLuuTru[s];
                    if (!kho) continue;
                    for (var k = 0; k < kho.length; k++) {
                        var key = kho.key(k);
                        if (!key || key === KHOA_LOCAL_STORAGE) continue;
                        var keyLC = key.toLowerCase();
                        if (
                            keyLC.indexOf('email') !== -1 ||
                            keyLC.indexOf('dinhdanh') !== -1 ||
                            keyLC.indexOf('taikhoan') !== -1 ||
                            keyLC.indexOf('dangnhap') !== -1 ||
                            keyLC.indexOf('user') !== -1 ||
                            keyLC.indexOf('giaovien') !== -1
                        ) {
                            var rawVal = kho.getItem(key);
                            if (!rawVal) continue;
                            var trimmed = rawVal.trim();
                            if (trimmed.indexOf('@') !== -1 && trimmed.length < 100 && trimmed.indexOf('{') === -1) {
                                dinhDanh = trimmed.replace(/^["']|["']$/g, '');
                                break;
                            }
                            if (trimmed.charAt(0) === '{') {
                                try {
                                    var obj = JSON.parse(trimmed);
                                    var emailObj = obj.email || obj.hopThu || obj.dinhDanh || obj.maGv || obj.MA_GIAO_VIEN;
                                    if (emailObj) {
                                        dinhDanh = String(emailObj).trim();
                                        tenHienThi = String(obj.hoTen || obj.name || obj.TEN_GIAO_VIEN || '').trim();
                                        break;
                                    }
                                } catch (eJson) {}
                            }
                        }
                    }
                    if (dinhDanh) break;
                }
            }

            // Ưu tiên 3: Kiểm tra nội dung nút Đăng nhập (#nutDangNhapG)
            var nutDangNhap = document.getElementById('nutDangNhapG');
            if (nutDangNhap) {
                var textNut = (nutDangNhap.innerText || nutDangNhap.textContent || '').trim();
                if (textNut && textNut.toLowerCase().indexOf('đăng nhập') === -1 && textNut.toLowerCase().indexOf('login') === -1) {
                    var dongText = textNut.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
                    var nhanNut = dongText[0] || '';
                    if (nhanNut) {
                        if (!dinhDanh) dinhDanh = nhanNut;
                        if (!tenHienThi) tenHienThi = nhanNut;
                    }
                }
            }
        } catch (err) {}

        return {
            dinhDanh: dinhDanh,
            tenGoiY: tenHienThi
        };
    }

    // ---------------------------------------------------------------------
    // 4. ĐỒNG BỘ DANH MỤC GIÁO VIÊN ĐỂ ÁNH XẠ CHÍNH XÁC [ID (Mã GV) - HỌ TÊN]
    // ---------------------------------------------------------------------
    async function layBanDoDanhMucGV() {
        // 1. Tận dụng ngay mảng duLieuDanhMucGV nếu phân hệ DanhMucGV đã tải sẵn trên RAM
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
                        trangThai: String(item.trangThai || 'Đang công tác').trim(),
                        hopThu: String(item.hopThu || '').trim().toLowerCase()
                    });
                }
                if (dsTuRam.length > 0) {
                    danhMucGiaoVienCache = dsTuRam;
                    return danhMucGiaoVienCache;
                }
            }
        } catch (e) {}

        // 2. Nếu đã có cache trong phiên mở Modal thì dùng lại ngay
        if (danhMucGiaoVienCache && danhMucGiaoVienCache.length > 0) {
            return danhMucGiaoVienCache;
        }

        // 3. Tải từ API layDanhMucGV (Chỉ gọi khi người dùng ấn nút "Ai đang online?")
        var urlApi = layUrlApiMayChu();
        if (!urlApi) return [];

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
                        trangThai: dong[4] ? String(dong[4]).trim() : 'Đang công tác',
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

    // Tra cứu thông tin { maGv, hoTen, toChuyenMon } từ bất kỳ định danh nào (Email, Mã GV, Họ tên)
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
                        hopThu: gv.hopThu || ''
                    };
                }
            }

            // Tìm gần đúng nếu chuỗi chứa Mã GV
            if (rawLC) {
                for (var j = 0; j < dsGiaoVien.length; j++) {
                    var gv2 = dsGiaoVien[j];
                    var maLC2 = chuanHoaChuoi(gv2.maGv);
                    if (maLC2 && (rawLC.indexOf(maLC2) !== -1 || maLC2.indexOf(rawLC) !== -1)) {
                        return {
                            maGv: gv2.maGv,
                            hoTen: gv2.hoTen || gv2.maGv,
                            toChuyenMon: gv2.toChuyenMon || 'Giáo viên',
                            hopThu: gv2.hopThu || ''
                        };
                    }
                }
            }
        }

        // Nếu người dùng đã đăng nhập bằng Email nhưng chưa khai báo trong DM_GIAOVIEN
        if (raw) {
            var maRutGon = raw.indexOf('@') !== -1 ? raw.split('@')[0].toUpperCase() : raw;
            return {
                maGv: maRutGon,
                hoTen: tenGoiY || raw,
                toChuyenMon: 'Tài khoản đăng nhập',
                hopThu: raw.indexOf('@') !== -1 ? raw : ''
            };
        }

        // Trường hợp khách xem TKB chưa bấm Đăng nhập
        return {
            maGv: maPhienTamThoi,
            hoTen: 'Người dùng đang xem (Chưa đăng nhập)',
            toChuyenMon: 'Khách truy cập',
            hopThu: ''
        };
    }

    // ---------------------------------------------------------------------
    // 5. ĐỒNG BỘ TRẠNG THÁI ONLINE (LOCAL + BROADCAST + SERVER API)
    // ---------------------------------------------------------------------
    function layDanhSachLocalPeers() {
        try {
            var raw = localStorage.getItem(KHOA_LOCAL_STORAGE);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function luuCapNhatLocalPeer(thongTinBanThan) {
        try {
            var peers = layDanhSachLocalPeers();
            var bayGio = Date.now();

            // Dọn dẹp các phiên đã quá hạn > 2 phút
            for (var k in peers) {
                if (Object.prototype.hasOwnProperty.call(peers, k)) {
                    if (!peers[k] || (bayGio - (peers[k].capNhatLuc || 0)) > THOI_GIAN_SONG_ONLINE_MS) {
                        delete peers[k];
                    }
                }
            }

            var khoa = String(thongTinBanThan.maGv || maPhienTamThoi).trim().toUpperCase();
            peers[khoa] = {
                maGv: thongTinBanThan.maGv,
                hoTen: thongTinBanThan.hoTen,
                toChuyenMon: thongTinBanThan.toChuyenMon || '',
                capNhatLuc: bayGio
            };

            localStorage.setItem(KHOA_LOCAL_STORAGE, JSON.stringify(peers));

            if (kenhBroadcast) {
                kenhBroadcast.postMessage({
                    loai: 'PING_ONLINE',
                    duLieu: peers[khoa]
                });
            }
        } catch (e) {}
    }

    async function thuThapDanhSachOnlineThoiGianThuc() {
        var dsGV = await layBanDoDanhMucGV();
        var thongTinRaw = phatHienDinhDanhHienTai();
        var banThan = doiChieuGiaoVien(thongTinRaw.dinhDanh, thongTinRaw.tenGoiY, dsGV);
        var bayGio = Date.now();

        // Cập nhật phiên hiện tại vào bộ nhớ đồng bộ
        luuCapNhatLocalPeer(banThan);

        var banDoTongHop = {};

        function themVaoBanDo(item, laBanThan) {
            if (!item) return;
            var ma = String(item.maGv || item.id || '').trim();
            var ten = String(item.hoTen || item.ten || '').trim();
            if (!ma && !ten) return;

            // Đối chiếu lại với DM_GIAOVIEN để luôn có đủ cả Tên và ID chuẩn
            var daChuanHoa = doiChieuGiaoVien(ma || ten, ten, dsGV);
            var maChuan = item.maGv && item.maGv !== '---' ? String(item.maGv).trim() : daChuanHoa.maGv;
            var tenChuan = (daChuanHoa.hoTen && daChuanHoa.hoTen.indexOf('Người dùng đang xem') === -1)
                ? daChuanHoa.hoTen
                : (ten || maChuan);
            var toCM = item.toChuyenMon || daChuanHoa.toChuyenMon || '';

            var key = maChuan.toUpperCase();
            var capNhatLuc = item.capNhatLuc || item.thoiGianCapNhat || bayGio;

            if (!banDoTongHop[key] || laBanThan) {
                banDoTongHop[key] = {
                    maGv: maChuan,
                    hoTen: tenChuan,
                    toChuyenMon: toCM,
                    capNhatLuc: capNhatLuc,
                    laBanThan: Boolean(laBanThan || (banDoTongHop[key] && banDoTongHop[key].laBanThan))
                };
            }
        }

        // 1. Luôn đưa người dùng hiện tại vào danh sách
        themVaoBanDo(banThan, true);

        // 2. Lấy các phiên đang hoạt động từ LocalStorage / BroadcastChannel
        var localPeers = layDanhSachLocalPeers();
        for (var k in localPeers) {
            if (Object.prototype.hasOwnProperty.call(localPeers, k)) {
                var p = localPeers[k];
                if (p && (bayGio - (p.capNhatLuc || 0)) <= THOI_GIAN_SONG_ONLINE_MS) {
                    var isMe = chuanHoaChuoi(p.maGv) === chuanHoaChuoi(banThan.maGv);
                    themVaoBanDo(p, isMe);
                }
            }
        }

        // 3. Thử đồng bộ với máy chủ Google Apps Script (nếu Backend hỗ trợ thaoTac=checkOnline)
        var urlApi = layUrlApiMayChu();
        var coHoTroServer = false;
        if (urlApi) {
            try {
                var thamSo = new URLSearchParams({
                    thaoTac: 'checkOnline',
                    maGv: banThan.maGv || '',
                    hoTen: banThan.hoTen || '',
                    toChuyenMon: banThan.toChuyenMon || '',
                    emailTruyCap: thongTinRaw.dinhDanh || '',
                    _t: String(bayGio)
                });
                var res = await fetch(urlApi + '?' + thamSo.toString(), { method: 'GET' });
                var dataServer = await res.json();

                if (dataServer && Array.isArray(dataServer.danhSachOnline)) {
                    coHoTroServer = true;
                    for (var s = 0; s < dataServer.danhSachOnline.length; s++) {
                        var svUser = dataServer.danhSachOnline[s];
                        var laToi = chuanHoaChuoi(svUser.maGv) === chuanHoaChuoi(banThan.maGv);
                        themVaoBanDo(svUser, laToi);
                    }
                }
            } catch (errServer) {
                // Bỏ qua êm ái nếu mạng chậm hoặc Backend chưa gắn hàm checkOnline
            }
        }

        // Chuyển bản đồ thành mảng và sắp xếp (Bản thân lên đầu, sau đó theo Mã GV)
        var ketQua = [];
        for (var maKey in banDoTongHop) {
            if (Object.prototype.hasOwnProperty.call(banDoTongHop, maKey)) {
                ketQua.push(banDoTongHop[maKey]);
            }
        }

        ketQua.sort(function (a, b) {
            if (a.laBanThan && !b.laBanThan) return -1;
            if (!a.laBanThan && b.laBanThan) return 1;
            return String(a.maGv).localeCompare(String(b.maGv), 'vi');
        });

        return {
            danhSach: ketQua,
            coHoTroServer: coHoTroServer,
            thoiDiemCapNhat: new Date()
        };
    }

    // ---------------------------------------------------------------------
    // 6. KẾT XUẤT GIAO DIỆN NÚT "AI ĐANG ONLINE?" VÀ MODAL
    // ---------------------------------------------------------------------
    function khoiTaoNutVaModal() {
        // 6.1. Chèn nút "Ai đang online?" vào bên phải khung <header> (như trong ảnh)
        var header = document.querySelector('header');
        if (header && !document.getElementById('btnAiDangOnline')) {
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
                '<span class="whitespace-nowrap tracking-wide">Ai đang online?</span>'
            ].join('');

            nutOnline.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                moModalCheckOnline();
            });

            khungBenTrong.appendChild(nutOnline);
        }

        // 6.2. Tạo Modal hiển thị danh sách Tên và ID đang online (Mặc định ẩn)
        if (!document.getElementById('modalCheckOnline')) {
            var modalWrapper = document.createElement('div');
            modalWrapper.id = 'modalCheckOnline';
            modalWrapper.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] font-sans p-2 md:p-4';

            modalWrapper.innerHTML = [
                '<div id="khungNoiDungModalOnline" class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300 transition-all duration-200">',
                '  <!-- Thanh tiêu đề Modal -->',
                '  <div class="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3.5 flex justify-between items-center border-b shadow-md flex-none">',
                '    <div class="flex items-center gap-2.5 overflow-hidden">',
                '      <span class="relative flex h-3 w-3 flex-none">',
                '        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-90"></span>',
                '        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white"></span>',
                '      </span>',
                '      <h3 class="text-base md:text-lg font-extrabold uppercase tracking-wide truncate">Danh sách đang Online (Thời gian thực)</h3>',
                '      <span id="badgeSoLuongOnline" class="bg-white/20 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-white/30 flex-none">0</span>',
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
                '  <!-- Thanh tìm kiếm nhanh theo Tên hoặc ID -->',
                '  <div class="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-none">',
                '    <div class="relative flex-1">',
                '      <input type="text" id="oTimKiemOnline" placeholder="Tìm nhanh theo Tên hoặc ID (Mã GV)..." autocomplete="off" class="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-800 bg-white shadow-inner">',
                '      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>',
                '    </div>',
                '    <div id="nhanThoiGianCapNhatOnline" class="text-xs font-semibold text-slate-500 text-right whitespace-nowrap">Chưa kích hoạt</div>',
                '  </div>',
                '',
                '  <!-- Bảng danh sách người đang online -->',
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
                '  <!-- Chân Modal -->',
                '  <div class="bg-gray-100 px-4 py-2.5 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2 flex-none">',
                '    <span id="chuThichCheDoOnline" class="text-xs text-slate-500 italic">Chỉ kích hoạt khi mở bảng • Tự động làm mới mỗi 12 giây</span>',
                '    <button type="button" id="btnDongModalOnlineDuoi" class="bg-slate-600 hover:bg-slate-700 text-white font-bold px-6 py-1.5 rounded-lg shadow transition-colors text-sm cursor-pointer">Đóng</button>',
                '  </div>',
                '</div>'
            ].join('');

            document.body.appendChild(modalWrapper);

            // Gắn sự kiện đóng Modal khi ấn nút hoặc click ra nền ngoài
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
                oTimKiem.addEventListener('input', function () {
                    veBangDanhSachOnline();
                });
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
    // 7. VẼ BẢNG DỮ LIỆU TÊN VÀ ID NGƯỜI ĐANG ONLINE
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
            var chuoiThoiGian = soGiayTruoc < 15 ? 'Vừa truy cập' : (soGiayTruoc + ' giây trước');

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
    // 8. ĐIỀU KHIỂN ĐỒNG BỘ KHI MỞ / ĐÓNG MODAL (CHỈ CHẠY KHI ẤN NÚT)
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
                '  Đang kiểm tra danh sách người dùng trực tuyến...',
                '</td></tr>'
            ].join('');
        }

        try {
            var ketQua = await thuThapDanhSachOnlineThoiGianThuc();
            danhSachOnlineHienTai = ketQua.danhSach || [];
            veBangDanhSachOnline();

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
        var modal = document.getElementById('modalCheckOnline');
        if (!modal) return;

        dangMoModal = true;
        modal.classList.remove('hidden');

        // Kích hoạt kênh BroadcastChannel nội bộ khi mở Modal
        if (!kenhBroadcast && typeof BroadcastChannel !== 'undefined') {
            try {
                kenhBroadcast = new BroadcastChannel(TEN_KENH_BROADCAST);
                kenhBroadcast.onmessage = function (ev) {
                    if (!dangMoModal || !ev || !ev.data) return;
                    if (ev.data.loai === 'PING_ONLINE') {
                        lamMoiDanhSachOnline(false);
                    }
                };
            } catch (e) {}
        }

        // Thực hiện tải ngay lập tức khi ấn nút
        lamMoiDanhSachOnline(true);

        // Bật bộ đếm cập nhật thời gian thực CHỈ trong lúc Modal đang mở
        if (boDemThoiGianThuc) {
            clearInterval(boDemThoiGianThuc);
        }
        boDemThoiGianThuc = setInterval(function () {
            if (dangMoModal) {
                lamMoiDanhSachOnline(false);
            }
        }, CHU_KY_CAP_NHAT_MS);
    }

    function dongModalCheckOnline() {
        dangMoModal = false;
        if (boDemThoiGianThuc) {
            clearInterval(boDemThoiGianThuc);
            boDemThoiGianThuc = null;
        }
        var modal = document.getElementById('modalCheckOnline');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------------------
    // 9. KHỞI TẠO NHẸ NHÀNG KHI DOM SẴN SÀNG (KHÔNG GỌI MẠNG, KHÔNG POLLING)
    // ---------------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiTaoNutVaModal);
    } else {
        khoiTaoNutVaModal();
    }

    // Xuất các hàm điều khiển an toàn ra phạm vi window
    window.moModalCheckOnline = moModalCheckOnline;
    window.dongModalCheckOnline = dongModalCheckOnline;
    window.lamMoiDanhSachOnline = lamMoiDanhSachOnline;
})();

/* =========================================================================
 * [TÙY CHỌN MỞ RỘNG CHO BACKEND GOOGLE APPS SCRIPT - codetp.text]
 * Nếu muốn đồng bộ danh sách Online giữa nhiều máy tính khác nhau qua RAM
 * của Google Apps Script (không tốn tài nguyên đọc/ghi Google Sheets):
 *
 * 1. Trong hàm doGet(e) của codetp.text, thêm 1 dòng:
 *    if (thaoTac === 'checkOnline') return xuatDuLieuJson(xuLyCheckOnlineMayChu(e.parameter));
 *
 * 2. Dán hàm dưới đây vào cuối file codetp.text:
 *
 * function xuLyCheckOnlineMayChu(params) {
 *   try {
 *     var cache = CacheService.getScriptCache();
 *     var cacheKey = 'CACHE_DANH_SACH_ONLINE_V1';
 *     var raw = cache.get(cacheKey);
 *     var mapOnline = raw ? JSON.parse(raw) : {};
 *     var now = new Date().getTime();
 *     var ttlMs = 120000; // 2 phút
 *
 *     var maGv = params && params.maGv ? String(params.maGv).trim() : '';
 *     var hoTen = params && params.hoTen ? String(params.hoTen).trim() : '';
 *     var toCM = params && params.toChuyenMon ? String(params.toChuyenMon).trim() : '';
 *
 *     if (maGv || hoTen) {
 *       var key = (maGv || hoTen).toUpperCase();
 *       mapOnline[key] = {
 *         maGv: maGv || key,
 *         hoTen: hoTen || maGv,
 *         toChuyenMon: toCM,
 *         capNhatLuc: now
 *       };
 *     }
 *
 *     var ds = [];
 *     var mapMoi = {};
 *     for (var k in mapOnline) {
 *       if (now - (mapOnline[k].capNhatLuc || 0) <= ttlMs) {
 *         mapMoi[k] = mapOnline[k];
 *         ds.push(mapOnline[k]);
 *       }
 *     }
 *     cache.put(cacheKey, JSON.stringify(mapMoi), 300);
 *     return { trangThai: 'thanh_cong', danhSachOnline: ds };
 *   } catch (e) {
 *     return { trangThai: 'thanh_cong', danhSachOnline: [] };
 *   }
 * }
 * ========================================================================= */