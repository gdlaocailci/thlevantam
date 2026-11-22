(function () {
    const SSO_MARKER_TOKEN = '__HT_SSO_BRIDGE__';
    const SKIP_SSO_KEY = 'SDB_BO_QUA_SSO';

    // Kiểm tra xem email SSO có được cấp quyền trong Sổ đầu bài không
    function kiemTraQuyenTrongSDB(email) {
        const emailChuan = String(email || '').trim().toLowerCase();
        if (!emailChuan) return false;

        // 1. Tài khoản gốc hoặc Admin trong Cài đặt
        if (emailChuan === 'tulieuhopthanh@gmail.com') return true;
        const dsQT = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.DANH_SACH_QUAN_TRI) || [];
        if (dsQT.some(q => String(q).trim().toLowerCase() === emailChuan)) return true;

        // 2. Có trong Ma trận phân quyền
        const maTran = (typeof thongSoHocVu !== 'undefined' && thongSoHocVu.MA_TRAN_PHAN_QUYEN) || {};
        for (let k in maTran) {
            if (String(k).trim().toLowerCase() === emailChuan) return true;
        }

        // LƯU Ý: Nếu bạn muốn MỌI giáo viên của trường (dù không có trong ma trận TKB)
        // vẫn tự nhận diện SSO để ký Sổ đầu bài, hãy đổi "return false;" thành "return true;"
        return false;
    }

    function kichHoatSSOChoSDB() {
        if (sessionStorage.getItem(SKIP_SSO_KEY) === '1') return;
        if (window.dinhDanhGiaoVienToanCuc) return; // Đã đăng nhập rồi thì bỏ qua
        if (!window.HT_SSO) return;

        const ssoUser = HT_SSO.getUser();
        if (!ssoUser) return;

        // Đợi thongSoHocVu nạp xong từ localStorage hoặc server
        if (typeof thongSoHocVu === 'undefined' || !thongSoHocVu || Object.keys(thongSoHocVu).length === 0) {
            setTimeout(kichHoatSSOChoSDB, 250);
            return;
        }

        // Nếu token SSO không được cấp quyền ở Sổ đầu bài -> giữ nguyên nút Đăng nhập sẵn có
        if (!kiemTraQuyenTrongSDB(ssoUser.email)) {
            return;
        }

        // Bọc nhẹ fetchVoiCoCheThuLai chỉ riêng cho lời gọi userinfo của SSO
        const fetchThuLaiGoc = window.fetchVoiCoCheThuLai;
        window.fetchVoiCoCheThuLai = async function (url, tuyChon, ...rest) {
            if (
                typeof url === 'string' &&
                url.includes('googleapis.com/oauth2/v3/userinfo') &&
                tuyChon && tuyChon.headers &&
                tuyChon.headers.Authorization === `Bearer ${SSO_MARKER_TOKEN}`
            ) {
                return new Response(JSON.stringify({
                    email: ssoUser.email,
                    name: ssoUser.name,
                    picture: ssoUser.picture
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return fetchThuLaiGoc.call(this, url, tuyChon, ...rest);
        };

        // Gọi thẳng vào hàm đăng nhập sẵn có của app.js
        if (typeof window.xuLyLayThongTin === 'function') {
            window.xuLyLayThongTin(SSO_MARKER_TOKEN).then(() => {
                // Nếu người dùng chủ động bấm "Đăng xuất" ở SĐB -> không tự SSO lại ở tab này
                const nut = document.getElementById('nutDangNhapG');
                if (nut) {
                    const onclickGoc = nut.onclick;
                    nut.onclick = function () {
                        sessionStorage.setItem(SKIP_SSO_KEY, '1');
                        if (typeof onclickGoc === 'function') onclickGoc.call(this);
                    };
                }
            });
        }

        // Nếu người dùng bấm nút Đăng nhập thủ công ở SĐB -> gỡ cờ bỏ qua SSO
        const nut = document.getElementById('nutDangNhapG');
        if (nut) {
            nut.addEventListener('click', () => sessionStorage.removeItem(SKIP_SSO_KEY), { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(kichHoatSSOChoSDB, 300));
    } else {
        setTimeout(kichHoatSSOChoSDB, 300);
    }
})();
