let boNhoHocLieuSGK = {}; 
let theHienPdfHienTai = null;
let trangHienTaiPDF = 1;
let heSoThuPhong = 1.2;
let idTepHienTai = '';

let boNhoTrangPdfGiaiMa = {}; // RAM đệm giúp lật trang đã xem siêu mượt
let thongTinBaiHocHienTai = { khoi: '', mon: '', bai: '', idKy1: '', idKy2: '', kyDangXem: 1 };

document.addEventListener('DOMContentLoaded', () => {
    xayDungKhungGiaoDienXemTruoc();
 khoiTaoBoNhoHocLieu().catch(loi => console.warn("Chưa tải được danh mục SGK:", loi));   
});

// =========================================================================
// KHỐI 1: CƠ SỞ DỮ LIỆU INDEXEDDB (THUẬT TOÁN ĐỒNG BỘ PROMISE CHỐNG VƯỢT MẶT)
// =========================================================================
// Ép hệ thống khởi tạo DB xong mới được làm việc khác
const dbHocLieuPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("KhoHocLieuSoDB", 11);
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("BangTepPDF")) {
            db.createObjectStore("BangTepPDF", { keyPath: "idPdf" });
        }
    };
    request.onsuccess = function(event) { resolve(event.target.result); };
    request.onerror = function(event) { console.warn("Lỗi IndexedDB"); resolve(null); };
});

async function luuTepVaoBoNhoCucBo(idPdf, mangByte, laLoi = false) {
    const db = await dbHocLieuPromise;
    if (!db) return;
    try {
        const transaction = db.transaction(["BangTepPDF"], "readwrite");
        const store = transaction.objectStore("BangTepPDF");
        // Lưu kèm cờ 'loi' để biết file này có bị quá tải mạng hay không
        store.put({ idPdf: idPdf, duLieu: mangByte, loi: laLoi, thoiGian: new Date().getTime() });
    } catch (e) { console.warn("Đầy bộ nhớ cục bộ:", e); }
}

async function docTepTuBoNhoCucBo(idPdf) {
    const db = await dbHocLieuPromise;
    if (!db) return null;
    return new Promise((resolve) => {
        const transaction = db.transaction(["BangTepPDF"], "readonly");
        const store = transaction.objectStore("BangTepPDF");
        const request = store.get(idPdf);
        request.onsuccess = function(event) { resolve(request.result || null); };
        request.onerror = function() { resolve(null); };
    });
}

async function xoaBoNhoDemCu(idPdfMoi) {
    const db = await dbHocLieuPromise;
    if (!db) return;
    return new Promise((resolve) => {
        const transaction = db.transaction(["BangTepPDF"], "readwrite");
        const store = transaction.objectStore("BangTepPDF");
        const request = store.getAllKeys();
        
        request.onsuccess = function(event) {
            const danhSachIdCu = event.target.result;
            danhSachIdCu.forEach(idCu => {
                if (idCu !== idPdfMoi) { store.delete(idCu); }
            });
            resolve();
        };
        request.onerror = () => resolve();
    });
}

async function lamMoiBoNhoDemPdf() {
    if (!idTepHienTai) return;
    const db = await dbHocLieuPromise;
    if (db) {
        const transaction = db.transaction(["BangTepPDF"], "readwrite");
        transaction.objectStore("BangTepPDF").delete(idTepHienTai);
    }
    
    boNhoTrangPdfGiaiMa = {}; // Dọn RAM
    hienThiKhoiChoTai(`Đang tải lại bản gốc sách mới nhất...`);
    xuLyDocPDF(idTepHienTai);
}

// =========================================================================
// KHỐI 2: ĐỌC DỮ LIỆU TỪ MÁY CHỦ (BỘ LỌC CHỐNG LỖI TỐI ĐA)
// =========================================================================
async function khoiTaoBoNhoHocLieu() {
    try {
        const fetchFunc = (typeof fetchVoiCoCheThuLai === 'function') ? fetchVoiCoCheThuLai : fetch;
        const phanHoi = await fetchFunc(`${CAU_HINH_FRONTEND.URL_API_MAY_CHU}?thaoTac=layDanhMucSGK`);
        if (!phanHoi.ok) throw new Error(`Lỗi HTTP: ${phanHoi.status}`);
        
        const duLieu = await phanHoi.json();
        let mangDuLieu = [];
        if (Array.isArray(duLieu)) mangDuLieu = duLieu;
        else if (duLieu && Array.isArray(duLieu.data)) mangDuLieu = duLieu.data;
        else throw new Error("Dữ liệu trả về không đúng cấu trúc mảng.");

        let dongBatDau = (mangDuLieu.length > 0 && String(mangDuLieu[0][0]).toLowerCase().includes('khối')) ? 1 : 0;

        for (let i = dongBatDau; i < mangDuLieu.length; i++) {
            let dong = mangDuLieu[i];
            let tenKhoi = dong[0] ? String(dong[0]).trim().toUpperCase() : '';
            let tenMon = dong[1] ? String(dong[1]).trim().toLowerCase() : '';
            
            let linkKy1 = (dong.length > 2 && dong[2]) ? String(dong[2]).trim() : ''; // Cột C
            let linkKy2 = (dong.length > 3 && dong[3]) ? String(dong[3]).trim() : ''; // Cột D
            
            if (tenKhoi && tenMon && (linkKy1 || linkKy2)) {
                let khoaTruyXuat = `${tenKhoi}_${tenMon}`;
                boNhoHocLieuSGK[khoaTruyXuat] = {
                    linkKy1: linkKy1,
                    // [LOGIC CHỐT]: Nếu Cột D có link thì lấy Cột D, nếu Cột D để trống thì lấy Cột C xài chung
                    linkKy2: linkKy2 !== '' ? linkKy2 : linkKy1 
                };
            }
        }
    } catch (loi) { 
        console.error("Chi tiết lỗi tải Danh mục SGK:", loi);
        throw loi; 
    }
}

function trichXuatIdTuLink(url) {
    let ketQua = url.match(/[-\w]{25,}/);
    return ketQua ? ketQua[0] : null;
}

// =========================================================================
// KHỐI 3: THUẬT TOÁN ĐIỀU HƯỚNG VÀ KIỂM SOÁT KỲ HỌC (CHUẨN V20)
// =========================================================================
window.kichHoatXemTruocSGK = async function(tenKhoiGoc, tenMonGoc, tenBaiHoc, thamSoTuan) {
    const tenKhoiChuan = String(tenKhoiGoc).trim().toUpperCase();
    const tenMonChuan = String(tenMonGoc).trim().toLowerCase();
    const khoaTimKiem = `${tenKhoiChuan}_${tenMonChuan}`;

    // 1. Phân tích tuần học từ giao diện
    let tuanHienTai = 1; 
    if (thamSoTuan != null && typeof thamSoTuan !== 'object') {
        let match = String(thamSoTuan).match(/\d+/);
        if (match) tuanHienTai = parseInt(match[0], 10);
    } else {
        // [SỬA LỖI QUAN TRỌNG]: Bổ sung 'locTuanUI' vào danh sách tìm kiếm để hệ thống đọc được chính xác ô Tuần trên bảng PPCT
        let dsIdChuan = ['locTuanUI', 'tuan', 'cboTuan', 'tuanHoc', 'chonTuan', 'Tuan', 'TuanHoc'];
        let oNhapTuan = null;
        for (let id of dsIdChuan) {
            oNhapTuan = document.getElementById(id);
            if (oNhapTuan) break;
        }
        if (oNhapTuan) {
            let giaTriChu = (oNhapTuan.tagName === 'SELECT') ? oNhapTuan.options[oNhapTuan.selectedIndex].text : oNhapTuan.value;
            let match = String(giaTriChu).match(/\d+/);
            if (match) tuanHienTai = parseInt(match[0], 10);
        }
    }
    
    if (tuanHienTai < 1) tuanHienTai = 1;

    // 2. Nạp dữ liệu
    if (Object.keys(boNhoHocLieuSGK).length === 0) {
        console.log("Đang kết nối thư viện Sách giáo khoa...");
        try {
            await khoiTaoBoNhoHocLieu();
        } catch (loi) {
            alert(`Sự cố mạng hoặc cấu hình API: ${loi.message}`);
            return;
        }
    }

    const duLieuMonHoc = boNhoHocLieuSGK[khoaTimKiem];
    if (!duLieuMonHoc || (!duLieuMonHoc.linkKy1 && !duLieuMonHoc.linkKy2)) {
        alert(`Chưa thiết lập Link SGK cho Khối ${tenKhoiGoc} - Môn ${tenMonGoc} trong bảng tính.`);
        return;
    }

    // 3. Logic chuyển đổi Kỳ theo số Tuần (>18)
    let kyHocPhanDong = (tuanHienTai > 18) ? 2 : 1;
    let linkTepHienTai = (kyHocPhanDong === 2) ? duLieuMonHoc.linkKy2 : duLieuMonHoc.linkKy1;
    
    if (!linkTepHienTai) {
        alert(`Tài liệu Tập ${kyHocPhanDong} của môn này chưa được cấu hình Link.`);
        return;
    }

    // 4. Mở thẳng URL (Drive, SpeakerDeck, Web...) sang tab mới
    window.open(linkTepHienTai, '_blank', 'noopener,noreferrer');
};

window.chuyenKyHocThuCong = async function(kyMoi) {
    if (thongTinBaiHocHienTai.kyDangXem === kyMoi) return; 

    let idMoi = (kyMoi === 1) ? thongTinBaiHocHienTai.idKy1 : thongTinBaiHocHienTai.idKy2;
    if (!idMoi) {
        alert(`Tài liệu Tập ${kyMoi} của môn này chưa được cấu hình Link.`);
        return;
    }

    thongTinBaiHocHienTai.kyDangXem = kyMoi;
    idTepHienTai = idMoi;

    document.getElementById('btnChuyenKy1').className = (kyMoi === 1) ? "px-3 py-1 rounded-md text-xs font-extrabold transition bg-white text-blue-900 shadow" : "px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10";
    document.getElementById('btnChuyenKy2').className = (kyMoi === 2) ? "px-3 py-1 rounded-md text-xs font-extrabold transition bg-white text-blue-900 shadow" : "px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10";

    let nhanKyHoc = (kyMoi === 1) ? "[Tập 1 / Kỳ 1]" : "[Tập 2 / Kỳ 2]";
    document.getElementById('tieuDeMonSgk').innerText = `Khối ${thongTinBaiHocHienTai.khoi} - Môn ${thongTinBaiHocHienTai.mon} ${nhanKyHoc}`;

    await xoaBoNhoDemCu(idTepHienTai);
    hienThiKhoiChoTai(`Đang truy xuất dữ liệu sách Tập ${kyMoi}...`);
    await xuLyDocPDF(idTepHienTai);
};

// =========================================================================
// KHỐI 4: GIAO DIỆN HTML (GIỮ NGUYÊN BẢN CHUẨN)
// =========================================================================
function xayDungKhungGiaoDienXemTruoc() {
    const modalHTML = `
    <div id="modalXemTruocSGK" class="hidden fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center font-sans transition-opacity reactbits-fade-in">
        <div class="bg-white w-11/12 md:w-5/6 lg:w-3/4 h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 transform scale-95 transition-transform duration-300" id="khungNoiDungModal">
            
            <div class="bg-gradient-to-r from-blue-800 to-indigo-900 px-5 py-3 flex justify-between items-center shadow-md z-10 flex-none border-b border-indigo-700">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="bg-white/20 p-1.5 rounded-lg">
                        <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <div class="truncate">
                        <h3 id="tieuDeMonSgk" class="text-white font-extrabold text-lg leading-tight truncate">Đang tải...</h3>
                        <p id="tieuDeBaiSgk" class="text-blue-100 text-sm font-semibold truncate">Vui lòng chờ...</p>
                    </div>
                    
                    <div class="hidden sm:flex bg-blue-900/50 p-1 rounded-lg ml-2 border border-blue-700/50" id="congTacKyHoc">
                        <button id="btnChuyenKy1" onclick="chuyenKyHocThuCong(1)" class="px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10">Kỳ 1</button>
                        <button id="btnChuyenKy2" onclick="chuyenKyHocThuCong(2)" class="px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10">Kỳ 2</button>
                    </div>
                </div>
                
                <div class="flex items-center gap-2 flex-none">
                    <div id="cumNutTaiXuong" class="hidden flex items-center bg-white/10 p-1 rounded-lg mr-1 border border-white/20">
                        <button onclick="taiToanBoSGK()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded shadow transition text-sm flex items-center gap-1.5" title="Tải toàn bộ cuốn sách">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span class="hidden sm:inline">Tải SGK</span>
                        </button>
                    </div>

                    <button onclick="lamMoiBoNhoDemPdf()" class="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-md text-yellow-300 transition border border-yellow-500/30" title="Làm mới sách / Xóa Cache">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>

                    <div id="nhomCongCuCanvas" class="hidden items-center">
                        <div class="h-6 w-px bg-white/30 mx-1"></div>
                        <button onclick="dieuChinhThuPhong(0.2)" class="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition" title="Phóng to"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg></button>
                        <button onclick="dieuChinhThuPhong(-0.2)" class="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition mr-2" title="Thu nhỏ"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path></svg></button>
                    </div>

                    <button onclick="dongModalXemTruoc()" class="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white shadow-sm transition ml-1" title="Đóng">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>

            <div class="flex-1 bg-slate-300 overflow-y-auto overflow-x-auto relative block text-center p-4 border-t border-slate-400" id="vungVeTaiLieu">
                
                <div id="bangDieuKhienTrang" class="hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-2xl flex-col items-center gap-2 z-20 border border-slate-600 min-w-[320px] transition-all">
                    <div class="flex items-center gap-4 w-full justify-center">
                        <button onclick="chuyenTrangPdf(-1)" class="hover:text-blue-400 font-extrabold px-3 transition text-xl">◀</button>
                        <div class="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                            Trang 
                            <input type="number" id="nhapSoTrangNhanh" value="1" min="1" onchange="nhayDenTrangHoc(this.value)" class="w-14 text-center text-blue-900 font-extrabold rounded outline-none py-0.5 focus:ring-2 focus:ring-blue-400 bg-white shadow-inner">
                            / <span id="tongSoTrang">--</span>
                        </div>
                        <button onclick="chuyenTrangPdf(1)" class="hover:text-blue-400 font-extrabold px-3 transition text-xl">▶</button>
                    </div>
                    <input type="range" id="thanhTruotTrang" min="1" max="1" value="1" oninput="nhayDenTrangHoc(this.value)" class="w-full h-1.5 bg-slate-500 rounded-lg appearance-none cursor-pointer accent-blue-400 mt-1">
                </div>

                <div id="khoiTrangThaiSgk" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
                    <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p id="vanBanTrangThaiSgk" class="text-slate-700 font-bold text-lg">Đang kết nối thư viện...</p>
                </div>

                <canvas id="canvasHienThiPdf" class="shadow-2xl bg-white hidden mx-auto max-w-full h-auto mb-10"></canvas>
                
                <div id="vungIframeDuPhong" class="hidden absolute inset-0 z-[100] bg-[#131313]">
                    <div class="absolute top-0 right-4 w-[45px] h-[55px] bg-[#131313] z-[110] flex items-center justify-center cursor-not-allowed border-b border-l border-r border-slate-700/50" title="Tính năng mở tab mới bị khóa">
                        <svg class="w-5 h-5 text-gray-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <iframe id="iframeTaiLieuGoc" src="" class="w-full h-full border-0" allow="autoplay"></iframe>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function hienThiKhoiChoTai(vanBanThongBao) {
    document.getElementById('khoiTrangThaiSgk').classList.remove('hidden');
    document.getElementById('canvasHienThiPdf').classList.add('hidden');
    document.getElementById('vungIframeDuPhong').classList.add('hidden');
    document.getElementById('nhomCongCuCanvas').classList.remove('flex');
    document.getElementById('nhomCongCuCanvas').classList.add('hidden');
    document.getElementById('bangDieuKhienTrang').classList.remove('flex');
    document.getElementById('bangDieuKhienTrang').classList.add('hidden');
    document.getElementById('iframeTaiLieuGoc').src = '';
    document.getElementById('vanBanTrangThaiSgk').innerText = vanBanThongBao;
}

function hienThiModalXemTruoc(tenKhoi, tenMon, tenBaiGoc, kyHoc) {
    let nhanKyHoc = (kyHoc === 2) ? "[Tập 2 / Kỳ 2]" : "[Tập 1 / Kỳ 1]";
    
    document.getElementById('tieuDeMonSgk').innerText = `Khối ${tenKhoi} - Môn ${tenMon} ${nhanKyHoc}`;
    document.getElementById('tieuDeBaiSgk').innerText = tenBaiGoc;
    
    document.getElementById('btnChuyenKy1').className = (kyHoc === 1) ? "px-3 py-1 rounded-md text-xs font-extrabold transition bg-white text-blue-900 shadow" : "px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10";
    document.getElementById('btnChuyenKy2').className = (kyHoc === 2) ? "px-3 py-1 rounded-md text-xs font-extrabold transition bg-white text-blue-900 shadow" : "px-3 py-1 rounded-md text-xs font-bold transition text-blue-200 hover:text-white hover:bg-white/10";
    
    hienThiKhoiChoTai("Đang kiểm tra ổ cứng tốc độ cao...");
    document.getElementById('cumNutTaiXuong').classList.add('hidden'); 

    const modal = document.getElementById('modalXemTruocSGK');
    modal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('khungNoiDungModal').classList.remove('scale-95');
        document.getElementById('khungNoiDungModal').classList.add('scale-100');
    }, 10);
}

function dongModalXemTruoc() {
    const modal = document.getElementById('modalXemTruocSGK');
    document.getElementById('khungNoiDungModal').classList.remove('scale-100');
    document.getElementById('khungNoiDungModal').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

// =========================================================================
// KHỐI 5: ĐỘNG CƠ TẢI SIÊU TỐC (MẠNG + CACHE + RENDER LÕI)
// =========================================================================
// Thuật toán: Bấm giờ mạng. Nếu proxy quá 20s không trả file, ngắt lập tức để khỏi treo máy.
async function fetchVoiTimeout(url, thoiGianMax = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), thoiGianMax);
    try {
        const phanHoi = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return phanHoi;
    } catch (loi) {
        clearTimeout(timeoutId);
        throw loi;
    }
}

async function taiDuLieuPdfAnToan(idPdf) {
    // Bước 1: Đọc DB an toàn nhờ luồng Promise (Không bao giờ bị lỗi vượt mặt)
    let banGhiCache = await docTepTuBoNhoCucBo(idPdf);
    if (banGhiCache) {
        // [CƠ CHẾ DANH SÁCH ĐEN]: Nếu lần trước file này đã thất bại (mạng yếu/file quá to)
        // Hệ thống sẽ NHỚ LỖI và đẩy ngay sang Iframe trong 0.1s, không bắt chờ 20s nữa.
        if (banGhiCache.loi) {
            throw new Error("Tệp lớn, chuyển thẳng lưới an toàn Iframe.");
        }
        document.getElementById('vanBanTrangThaiSgk').innerText = "Truy xuất tức thì từ ổ cứng (Không cần mạng)...";
        return banGhiCache.duLieu;
    }

    document.getElementById('vanBanTrangThaiSgk').innerText = "Đang tải Sách nguyên bản từ máy chủ (Chỉ đợi 1 lần duy nhất)...";
    const dsProxy = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    const linkGoc = encodeURIComponent(`https://drive.google.com/uc?export=download&confirm=t&id=${idPdf}`);
    
    for (let proxy of dsProxy) {
        try {
            let phanHoi = await fetchVoiTimeout(proxy + linkGoc, 20000); 
            if (!phanHoi.ok) continue;
            
            let boDem = await phanHoi.arrayBuffer();
            let kiemTra = new Uint8Array(boDem.slice(0, 5));
            if (kiemTra[0]===37 && kiemTra[1]===80 && kiemTra[2]===68 && kiemTra[3]===70 && kiemTra[4]===45) {
                // Tải thành công -> Lưu vào ổ cứng với cờ loi = false
                await luuTepVaoBoNhoCucBo(idPdf, boDem, false);
                return boDem;
            }
        } catch (loi) {
            console.warn("Proxy quá tải / Timeout:", proxy);
        }
    }
    
    // Nếu cả 3 proxy đều treo -> Lưu trạng thái LỖI vào ổ cứng để lần sau bypass thẳng proxy
    await luuTepVaoBoNhoCucBo(idPdf, null, true);
    throw new Error("Vượt quá giới hạn Proxy, tự động nhảy Iframe.");
}

async function xuLyDocPDF(idPdf) {
    if (typeof pdfjsLib === 'undefined') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    try {
        const duLieuPdf = await taiDuLieuPdfAnToan(idPdf);
        
        boNhoTrangPdfGiaiMa = {}; // Dọn RAM trước khi nạp
        
        const loadingTask = pdfjsLib.getDocument({ 
            data: duLieuPdf,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
            cMapPacked: true,
            disableStream: true,    // Tắt luồng ảo (Tăng tốc vì file đã trong máy)
            disableAutoFetch: true,
            disableRange: true
        });
        
        theHienPdfHienTai = await loadingTask.promise;
        
        document.getElementById('tongSoTrang').innerText = theHienPdfHienTai.numPages;
        trangHienTaiPDF = 1;
        
        document.getElementById('nhapSoTrangNhanh').max = theHienPdfHienTai.numPages;
        document.getElementById('thanhTruotTrang').max = theHienPdfHienTai.numPages;

        document.getElementById('khoiTrangThaiSgk').classList.add('hidden');
        document.getElementById('canvasHienThiPdf').classList.remove('hidden');
        
        document.getElementById('nhomCongCuCanvas').classList.remove('hidden');
        document.getElementById('nhomCongCuCanvas').classList.add('flex');
        
        document.getElementById('bangDieuKhienTrang').classList.remove('hidden');
        document.getElementById('bangDieuKhienTrang').classList.add('flex');
        
        document.getElementById('cumNutTaiXuong').classList.remove('hidden');
        
        veTrangCanVasPdf(trangHienTaiPDF);

    } catch (loi) {
        console.warn("Chuyển Lưới an toàn Iframe:", loi);
        kichHoatLuoiAnToanIframe(idPdf);
    }
}

async function veTrangCanVasPdf(soTrang) {
    if (!theHienPdfHienTai) return;
    
    document.getElementById('nhapSoTrangNhanh').value = soTrang;
    document.getElementById('thanhTruotTrang').value = soTrang;
    
    // THUẬT TOÁN ĐỆM LÕI (Không giải mã lại trang đã xem)
    let trang = boNhoTrangPdfGiaiMa[soTrang];
    if (!trang) {
        trang = await theHienPdfHienTai.getPage(soTrang);
        boNhoTrangPdfGiaiMa[soTrang] = trang;
    }
    
    const canvas = document.getElementById('canvasHienThiPdf');
    const ctx = canvas.getContext('2d');
    
    const viewport = trang.getViewport({ scale: heSoThuPhong });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = { canvasContext: ctx, viewport: viewport };
    await trang.render(renderContext).promise;
}

function chuyenTrangPdf(buocNhay) {
    if (!theHienPdfHienTai) return;
    let trangMoi = trangHienTaiPDF + buocNhay;
    if (trangMoi >= 1 && trangMoi <= theHienPdfHienTai.numPages) {
        trangHienTaiPDF = trangMoi;
        veTrangCanVasPdf(trangHienTaiPDF);
    }
}

function nhayDenTrangHoc(giaTriTrang) {
    if (!theHienPdfHienTai) return;
    let trangMoi = parseInt(giaTriTrang, 10);
    if (isNaN(trangMoi)) return;
    if (trangMoi < 1) trangMoi = 1;
    if (trangMoi > theHienPdfHienTai.numPages) trangMoi = theHienPdfHienTai.numPages;
    
    trangHienTaiPDF = trangMoi;
    veTrangCanVasPdf(trangHienTaiPDF);
}

function dieuChinhThuPhong(heSoThuThayDoi) {
    if (!theHienPdfHienTai) return;
    heSoThuPhong += heSoThuThayDoi;
    if (heSoThuPhong < 0.6) heSoThuPhong = 0.6;
    if (heSoThuPhong > 3.0) heSoThuPhong = 3.0;
    veTrangCanVasPdf(trangHienTaiPDF);
}

function kichHoatLuoiAnToanIframe(idPdf) {
    document.getElementById('khoiTrangThaiSgk').classList.add('hidden');
    document.getElementById('canvasHienThiPdf').classList.add('hidden');
    
    document.getElementById('nhomCongCuCanvas').classList.remove('flex');
    document.getElementById('nhomCongCuCanvas').classList.add('hidden');
    
    document.getElementById('bangDieuKhienTrang').classList.remove('flex');
    document.getElementById('bangDieuKhienTrang').classList.add('hidden');
    
    const vungIframe = document.getElementById('vungIframeDuPhong');
    vungIframe.classList.remove('hidden');
    document.getElementById('iframeTaiLieuGoc').src = `https://drive.google.com/file/d/${idPdf}/preview`;

    document.getElementById('cumNutTaiXuong').classList.remove('hidden');
}

function taiToanBoSGK() {
    if (!idTepHienTai) {
        alert("Sự cố: Không định vị được ID của tài liệu Sách giáo khoa.");
        return;
    }
    window.open(`https://drive.google.com/uc?export=download&id=${idTepHienTai}`, '_blank');
}
