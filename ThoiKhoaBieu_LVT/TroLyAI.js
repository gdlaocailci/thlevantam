(function () {
    let dangTraLoi = false;
    let tepDangChon = null; // { tenFile, mimeType, base64, noiDungText }
    let lichSuHoiThoai = []; // Lưu lịch sử hội thoại nối tiếp trong phiên

    // =========================================================================
    // THUẬT TOÁN TRÍCH XUẤT DỮ LIỆU THÔNG MINH TRÊN MÀN HÌNH
    // =========================================================================
    function layGiaTriO(cell) {
        if (!cell) return '';
        const inputs = cell.querySelectorAll('input, select, textarea');
        if (inputs.length > 0) {
            return Array.from(inputs)
                .map(el => (el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || el.value) : el.value) || '')
                .join(' ')
                .trim();
        }
        return (cell.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function laPhanTuDangHien(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    // 1. Bộ đọc chuyên sâu cho Lưới TKB Toàn trường (#khungTKB)
    function trichXuatTKBToanTruong() {
        const tuan = document.getElementById('hienThiTuanHienTai')?.value || '';
        const ngayBatDau = document.getElementById('chonNgayDauTuan')?.value || '';
        const locGV = document.getElementById('locGiaoVien')?.value?.trim() || '';
        const locLop = document.getElementById('locLopHoc')?.value?.trim() || '';

        // Tự động tìm đúng hàng <tr> trong #tieuDeBang chứa tên các lớp (có colspan="2" hoặc nhiều cột lớp nhất)
        const theadRows = Array.from(document.querySelectorAll('#tieuDeBang tr'));
        let rowLop = theadRows.find(tr => tr.querySelector('th[colspan="2"], td[colspan="2"]')) || theadRows[0];
        if (!rowLop && theadRows.length > 0) rowLop = theadRows[0];

        const dsLop = [];
        const canhBaoLop = [];

        if (rowLop) {
            const headerCells = Array.from(rowLop.querySelectorAll('th, td'));
            headerCells.forEach((th) => {
                const txtFull = (th.innerText || '').trim();
                const txtDong1 = txtFull.split('\n')[0].replace(/\s+/g, ' ').trim();
                const colSpan = parseInt(th.getAttribute('colspan') || '1', 10);

                // Bỏ qua 3 cột cố định đầu tiên: Thứ/Ngày, Buổi, Tiết
                if (/^(thứ|buổi|tiết)/i.test(txtDong1) && colSpan === 1) return;

                if (!laPhanTuDangHien(th)) {
                    dsLop.push(null);
                    return;
                }

                dsLop.push(txtDong1 || `Lớp_${dsLop.length + 1}`);

                // Tách dòng trạng thái đủ/thiếu tiết nằm bên dưới tên lớp (nếu có)
                const dongPhu = txtFull.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim();
                if (dongPhu) {
                    canhBaoLop.push(`${txtDong1}: ${dongPhu}`);
                }
            });
        }

        const rows = Array.from(document.querySelectorAll('#vungHienThiDuLieu tr'));
        let curThu = '';
        let curBuoi = '';
        const thongKeGV = {};
        const chiTietTheoTiet = [];

        rows.forEach(tr => {
            if (!laPhanTuDangHien(tr)) return;
            const cells = Array.from(tr.querySelectorAll('td'));
            if (cells.length === 0) return;

            let idxTiet = cells.findIndex(td => td.id && td.id.startsWith('oTiet_'));
            if (idxTiet === -1) {
                if (cells.length >= 3 && /^(thứ|chủ nhật)/i.test(layGiaTriO(cells[0]))) idxTiet = 2;
                else if (cells.length >= 2 && /^(sáng|chiều)/i.test(layGiaTriO(cells[0]))) idxTiet = 1;
                else idxTiet = 0;
            }

            if (idxTiet === 2) {
                curThu = layGiaTriO(cells[0]);
                curBuoi = layGiaTriO(cells[1]);
            } else if (idxTiet === 1) {
                curBuoi = layGiaTriO(cells[0]);
            }
            const curTiet = layGiaTriO(cells[idxTiet]);

            const dsMonTrongTiet = [];
            let lopIndex = 0;

            for (let c = idxTiet + 1; c < cells.length; c += 2) {
                const cellMon = cells[c];
                const cellGV = cells[c + 1];
                if (!cellMon || !cellGV) break;

                while (lopIndex < dsLop.length && dsLop[lopIndex] === null) {
                    lopIndex++;
                }
                const tenLop = dsLop[lopIndex] || `Lớp_${lopIndex + 1}`;
                lopIndex++;

                if (!laPhanTuDangHien(cellMon) && !laPhanTuDangHien(cellGV)) continue;

                const mon = layGiaTriO(cellMon);
                const gv = layGiaTriO(cellGV);

                if ((mon && mon !== '--' && mon !== '---') || (gv && gv !== '--' && gv !== '---')) {
                    dsMonTrongTiet.push(`${tenLop}(${mon || '?'} - ${gv || '?'})`);
                    if (gv && gv !== '--' && gv !== '---') {
                        if (!thongKeGV[gv]) thongKeGV[gv] = { soTiet: 0, lop: new Set() };
                        thongKeGV[gv].soTiet += 1;
                        thongKeGV[gv].lop.add(tenLop);
                    }
                }
            }

            if (dsMonTrongTiet.length > 0) {
                chiTietTheoTiet.push(`${curThu} | ${curBuoi} | Tiết ${curTiet}: ${dsMonTrongTiet.join('; ')}`);
            }
        });

        const tomTatGV = Object.entries(thongKeGV)
            .sort((a, b) => b[1].soTiet - a[1].soTiet)
            .map(([gv, info]) => `- ${gv}: ${info.soTiet} tiết (Lớp: ${Array.from(info.lop).join(', ')})`)
            .join('\n');

        let ketQua = `MÀN HÌNH: Thời khóa biểu Tuần ${tuan}` + (ngayBatDau ? ` (Từ ngày ${ngayBatDau})` : '');
        if (locGV) ketQua += ` | Đang lọc GV: ${locGV}`;
        if (locLop) ketQua += ` | Đang lọc Lớp: ${locLop}`;
        ketQua += '\n';

        if (canhBaoLop.length > 0) ketQua += `\n[Tình trạng số tiết các lớp]\n${canhBaoLop.join('\n')}\n`;
        if (tomTatGV) ketQua += `\n[Tổng hợp số tiết theo Giáo viên đang hiển thị]\n${tomTatGV}\n`;
        if (chiTietTheoTiet.length > 0) ketQua += `\n[Chi tiết từng tiết học]\n${chiTietTheoTiet.join('\n')}`;

        return ketQua.slice(0, 30000);
    }

    // 2. Bộ đọc tổng quát cho Sổ đầu bài, Thống kê, Chuyên cần và các Modal đang mở
    function trichXuatBangTongQuat(container, tieuDe) {
        const blocks = [];
        const tables = Array.from(container.querySelectorAll('table'));

        if (tables.length > 0) {
            tables.forEach((tbl, idx) => {
                if (!laPhanTuDangHien(tbl)) return;
                const prevText = (tbl.previousElementSibling?.innerText || '').replace(/\s+/g, ' ').trim();
                const rows = Array.from(tbl.querySelectorAll('tr')).filter(laPhanTuDangHien);
                const lines = rows.map(tr => {
                    const cells = Array.from(tr.querySelectorAll('th, td')).filter(laPhanTuDangHien);
                    const vals = cells.map(c => layGiaTriO(c) || '-');
                    return vals.some(v => v !== '-') ? vals.join(' | ') : '';
                }).filter(Boolean);

                if (lines.length > 0) {
                    const nhanBang = prevText ? `[Bảng ${idx + 1}: ${prevText}]` : `[Bảng ${idx + 1}]`;
                    blocks.push(`${nhanBang}\n${lines.join('\n')}`);
                }
            });
        }

        const noiDungBang = blocks.join('\n\n');
        const vanBanBoSung = noiDungBang || (container.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
        return `MÀN HÌNH: ${tieuDe}\n${vanBanBoSung}`.slice(0, 30000);
    }

    function layFileIdModalDangMo() {
        const modalGA = document.getElementById('modalXemDuyetGiaoAn');
        if (modalGA && laPhanTuDangHien(modalGA)) {
            return modalGA.getAttribute('data-file-id') || '';
        }
        return '';
    }

    function layNguCanhTrangHienTai() {
        const modalGA = document.getElementById('modalXemDuyetGiaoAn');
        if (modalGA && laPhanTuDangHien(modalGA)) {
            return trichXuatBangTongQuat(modalGA, 'Đang mở cửa sổ Xem & Duyệt Giáo án');
        }

        const dsModal = [
            { id: 'modalThongKeGV', ten: 'Bảng thống kê số tiết dạy thực tế của Giáo viên' },
            { id: 'modalKiemTraTienDo', ten: 'Báo cáo kiểm tra tiến độ dạy học' },
            { id: 'modalKiemTra', ten: 'Báo cáo đối chiếu định mức khung chương trình' }
        ];
        for (const m of dsModal) {
            const el = document.getElementById(m.id);
            if (el && !el.classList.contains('hidden') && laPhanTuDangHien(el)) {
                return trichXuatBangTongQuat(el, m.ten);
            }
        }

        const khungTKB = document.getElementById('khungTKB');
        if (khungTKB && !khungTKB.classList.contains('hidden') && laPhanTuDangHien(khungTKB)) {
            return trichXuatTKBToanTruong();
        }

        const khungSDB = document.getElementById('khungSoDauBai');
        if (khungSDB && !khungSDB.classList.contains('hidden') && laPhanTuDangHien(khungSDB)) {
            const lop = document.getElementById('chonLopSo')?.value || '';
            const tuan = document.getElementById('chonTuanSo')?.value || '';
            return trichXuatBangTongQuat(khungSDB, `Sổ đầu bài điện tử - Lớp ${lop}, Tuần ${tuan}`);
        }

        const vungChinh = document.getElementById('vungHienThiChinh');
        if (vungChinh) {
            const khungDangMo = Array.from(vungChinh.children).find(el => !el.classList.contains('hidden') && laPhanTuDangHien(el));
            if (khungDangMo) {
                const tieuDe = khungDangMo.querySelector('h2')?.innerText?.trim() || khungDangMo.id;
                return trichXuatBangTongQuat(khungDangMo, tieuDe);
            }
        }

        return 'MÀN HÌNH: Hệ thống Quản lý Chương trình Dạy - Học.';
    }

    // =========================================================================
    // XỬ LÝ ĐỌC TỆP ĐÍNH KÈM (PDF, ẢNH, EXCEL, CSV, TXT)
    // =========================================================================
    async function docTepDinhKem(file) {
        const gioiHanMB = 4;
        if (file.size > gioiHanMB * 1024 * 1024) {
            throw new Error(`Tệp vượt quá ${gioiHanMB}MB. Vui lòng chọn tệp nhỏ hơn.`);
        }

        const tenLower = file.name.toLowerCase();

        if (tenLower.endsWith('.xlsx') || tenLower.endsWith('.xls')) {
            if (typeof XLSX === 'undefined') {
                throw new Error('Thư viện đọc Excel chưa sẵn sàng.');
            }
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ketQuaSheet = wb.SheetNames.map(tenSheet => {
                const csv = XLSX.utils.sheet_to_csv(wb.Sheets[tenSheet]);
                return `[Sheet: ${tenSheet}]\n${csv}`;
            }).join('\n\n');
            return { tenFile: file.name, noiDungText: ketQuaSheet.slice(0, 25000) };
        }

        if (tenLower.endsWith('.txt') || tenLower.endsWith('.csv') || tenLower.endsWith('.json')) {
            const text = await file.text();
            return { tenFile: file.name, noiDungText: text.slice(0, 25000) };
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = String(reader.result || '').split(',')[1] || '';
                const mimeType = file.type || (tenLower.endsWith('.pdf') ? 'application/pdf' : 'image/png');
                resolve({ tenFile: file.name, mimeType, base64 });
            };
            reader.onerror = () => reject(new Error('Không đọc được tệp đã chọn.'));
            reader.readAsDataURL(file);
        });
    }

    // =========================================================================
    // GIAO DIỆN HỘP THOẠI CHAT AI
    // =========================================================================
    function taoGiaoDienTroLyAI() {
        if (document.getElementById('cumTroLyAINoiBo')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'cumTroLyAINoiBo';
        wrapper.className = 'fixed bottom-10 right-4 z-[10060] font-sans';
        wrapper.innerHTML = `
            <button id="btnMoTroLyAI" type="button" title="Bấm để mở hoặc kéo thả để di chuyển"
                style="touch-action: none; user-select: none;"
                class="flex items-center gap-2 bg-[#0b5394] hover:bg-[#1e70b8] text-white font-bold px-4 py-2.5 rounded-full shadow-xl border border-blue-300 transition-colors cursor-move select-none">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"/>
                </svg>
                <span class="text-sm">Trợ lý Gemini</span>
            </button>

            <div id="hopChatTroLyAI" class="hidden w-[380px] max-w-[94vw] h-[500px] bg-white border border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div id="headerHopChatAI" title="Kéo để di chuyển khung"
                    style="touch-action: none; user-select: none; cursor: move;"
                    class="bg-[#0b5394] text-white px-4 py-3 flex items-center justify-between select-none">
                    <div class="min-w-0 pr-2">
                        <div class="font-bold text-sm truncate">Trợ lý Gemini Nhà trường</div>
                        <div class="text-[11px] text-blue-200 truncate">Hội thoại nối tiếp &amp; phân tích tệp đính kèm</div>
                    </div>
                    <div class="flex items-center gap-1 flex-none">
                        <button id="btnMoiHoiThoaiAI" type="button" title="Cuộc trò chuyện mới"
                            class="text-blue-100 hover:text-white hover:bg-white/15 rounded-lg p-1.5 cursor-pointer transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                        <button id="btnToanManHinhAI" type="button" title="Giãn toàn màn hình"
                            class="text-blue-100 hover:text-white hover:bg-white/15 rounded-lg p-1.5 cursor-pointer transition-colors">
                            <svg id="iconToanManHinhAI" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"></path>
                            </svg>
                        </button>
                        <button id="btnDongTroLyAI" type="button" title="Đóng khung chat" class="text-white hover:text-red-200 text-2xl leading-none px-1 cursor-pointer">&times;</button>
                    </div>
                </div>

                <div id="noiDungChatAI" class="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50 text-sm">
                    <div class="bg-blue-50 border border-blue-200 text-slate-700 p-2.5 rounded-xl text-xs leading-relaxed">
                        Xin chào! Tôi có thể đọc dữ liệu trên màn hình đang mở, ghi nhớ mạch trò chuyện nối tiếp, hoặc bạn bấm biểu tượng <b>ghim đính kèm</b> để tải lên file <b>Excel, PDF, Ảnh, TXT/CSV</b> cùng đối chiếu nhé.
                    </div>
                </div>

                <div id="vungTepDinhKemAI" class="hidden px-3 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs text-blue-900">
                    <span id="tenTepDinhKemAI" class="truncate font-semibold"></span>
                    <button id="btnXoaTepAI" type="button" class="ml-2 text-red-600 hover:text-red-800 font-bold cursor-pointer">&times;</button>
                </div>

                <form id="formGuiCauHoiAI" class="p-2.5 bg-white border-t border-slate-200">
                    <input id="inputFileAI" type="file" accept=".pdf,.xlsx,.docx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp" class="hidden">
                    <div class="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-full px-2 py-1 shadow-inner focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                        <button id="btnChonFileAI" type="button" title="Đính kèm tệp (Excel, PDF, Ảnh, TXT)"
                            class="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-[#0b5394] hover:bg-slate-200/70 rounded-full cursor-pointer transition-colors flex-none">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                            </svg>
                        </button>
                        <input id="inputCauHoiAI" type="text" placeholder="Đặt câu hỏi nối tiếp" autocomplete="off"
                            class="flex-1 min-w-0 bg-transparent px-1 py-1 text-sm text-slate-800 placeholder-slate-500 focus:outline-none">
                        <button id="btnGuiAI" type="submit" title="Gửi câu hỏi"
                            class="w-8 h-8 flex items-center justify-center bg-[#0b5394] hover:bg-[#1e70b8] text-white rounded-full cursor-pointer disabled:opacity-50 flex-none transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(wrapper);

        const btnMo = document.getElementById('btnMoTroLyAI');
        const btnDong = document.getElementById('btnDongTroLyAI');
        const hopChat = document.getElementById('hopChatTroLyAI');
        const headerHopChat = document.getElementById('headerHopChatAI');
        const btnToanManHinh = document.getElementById('btnToanManHinhAI');
        const iconToanManHinh = document.getElementById('iconToanManHinhAI');
        const form = document.getElementById('formGuiCauHoiAI');
        const input = document.getElementById('inputCauHoiAI');
        const khungTin = document.getElementById('noiDungChatAI');
        const inputFile = document.getElementById('inputFileAI');
        const btnChonFile = document.getElementById('btnChonFileAI');
        const vungTep = document.getElementById('vungTepDinhKemAI');
        const tenTep = document.getElementById('tenTepDinhKemAI');
        const btnXoaTep = document.getElementById('btnXoaTepAI');
        const btnMoiHoiThoai = document.getElementById('btnMoiHoiThoaiAI');

        const KHOA_VI_TRI_AI = 'TRO_LY_AI_VI_TRI_NUT';
        const KHOA_VI_TRI_KHUNG_AI = 'TRO_LY_AI_VI_TRI_KHUNG';
        let viTriNutDaLuu = null;
        let viTriKhungDaLuu = null;
        let vuaKeoXong = false;
        let dangToanManHinh = false;

        function kepViTriTrongManHinh(left, top, el) {
            const rect = el.getBoundingClientRect();
            const w = rect.width || 150;
            const h = rect.height || 44;
            const maxLeft = Math.max(8, window.innerWidth - w - 8);
            const maxTop = Math.max(8, window.innerHeight - h - 8);
            return {
                left: Math.min(Math.max(8, left), maxLeft),
                top: Math.min(Math.max(8, top), maxTop)
            };
        }

        function apDungViTriWrapper(left, top) {
            wrapper.style.right = 'auto';
            wrapper.style.bottom = 'auto';
            wrapper.style.left = `${left}px`;
            wrapper.style.top = `${top}px`;
        }

        function datLaiViTriMacDinhWrapper() {
            wrapper.style.left = '';
            wrapper.style.top = '';
            wrapper.style.right = '';
            wrapper.style.bottom = '';
        }

        function capNhatCheDoToanManHinh(bat) {
            dangToanManHinh = !!bat;
            if (dangToanManHinh) {
                hopChat.style.position = 'fixed';
                hopChat.style.top = '0';
                hopChat.style.left = '0';
                hopChat.style.right = '0';
                hopChat.style.bottom = '0';
                hopChat.style.width = '100vw';
                hopChat.style.height = '100vh';
                hopChat.style.maxWidth = '100vw';
                hopChat.style.maxHeight = '100vh';
                hopChat.style.borderRadius = '0';
                hopChat.style.borderWidth = '0';
                hopChat.style.zIndex = '10061';

                headerHopChat.style.cursor = 'default';
                headerHopChat.title = '';
                btnToanManHinh.title = 'Thu nhỏ khung chat';
                iconToanManHinh.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4"></path>';
            } else {
                hopChat.style.position = '';
                hopChat.style.top = '';
                hopChat.style.left = '';
                hopChat.style.right = '';
                hopChat.style.bottom = '';
                hopChat.style.width = '';
                hopChat.style.height = '';
                hopChat.style.maxWidth = '';
                hopChat.style.maxHeight = '';
                hopChat.style.borderRadius = '';
                hopChat.style.borderWidth = '';
                hopChat.style.zIndex = '';

                headerHopChat.style.cursor = 'move';
                headerHopChat.title = 'Kéo để di chuyển khung';
                btnToanManHinh.title = 'Giãn toàn màn hình';
                iconToanManHinh.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"></path>';

                if (viTriKhungDaLuu) {
                    const pos = kepViTriTrongManHinh(viTriKhungDaLuu.left, viTriKhungDaLuu.top, wrapper);
                    apDungViTriWrapper(pos.left, pos.top);
                } else if (wrapper.style.left && wrapper.style.top) {
                    const pos = kepViTriTrongManHinh(
                        parseFloat(wrapper.style.left) || 8,
                        parseFloat(wrapper.style.top) || 8,
                        wrapper
                    );
                    apDungViTriWrapper(pos.left, pos.top);
                }
            }
        }

        // Khôi phục vị trí nút & khung đã lưu (nếu có)
        try {
            const rawViTri = localStorage.getItem(KHOA_VI_TRI_AI);
            if (rawViTri) {
                const parsed = JSON.parse(rawViTri);
                if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
                    const pos = kepViTriTrongManHinh(parsed.left, parsed.top, wrapper);
                    viTriNutDaLuu = pos;
                    apDungViTriWrapper(pos.left, pos.top);
                }
            }
            const rawViTriKhung = localStorage.getItem(KHOA_VI_TRI_KHUNG_AI);
            if (rawViTriKhung) {
                const parsedKhung = JSON.parse(rawViTriKhung);
                if (typeof parsedKhung?.left === 'number' && typeof parsedKhung?.top === 'number') {
                    viTriKhungDaLuu = parsedKhung;
                }
            }
        } catch (_) {}

        // Kéo thả nút Trợ lý Gemini (hỗ trợ cả chuột & cảm ứng)
        (function kichHoatKeoThaNut() {
            let dangNhan = false;
            let daKeo = false;
            let startX = 0;
            let startY = 0;
            let startLeft = 0;
            let startTop = 0;
            let activePointerId = null;

            btnMo.addEventListener('pointerdown', (e) => {
                if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
                const rect = wrapper.getBoundingClientRect();
                dangNhan = true;
                daKeo = false;
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                try { btnMo.setPointerCapture(e.pointerId); } catch (_) {}
            });

            btnMo.addEventListener('pointermove', (e) => {
                if (!dangNhan || e.pointerId !== activePointerId) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (!daKeo && Math.hypot(dx, dy) > 5) {
                    daKeo = true;
                }
                if (!daKeo) return;
                const pos = kepViTriTrongManHinh(startLeft + dx, startTop + dy, wrapper);
                apDungViTriWrapper(pos.left, pos.top);
            });

            function ketThucKeo(e) {
                if (!dangNhan || e.pointerId !== activePointerId) return;
                dangNhan = false;
                try { btnMo.releasePointerCapture(e.pointerId); } catch (_) {}
                if (daKeo) {
                    vuaKeoXong = true;
                    setTimeout(() => { vuaKeoXong = false; }, 120);
                    const rect = wrapper.getBoundingClientRect();
                    const pos = kepViTriTrongManHinh(rect.left, rect.top, wrapper);
                    apDungViTriWrapper(pos.left, pos.top);
                    viTriNutDaLuu = pos;
                    try { localStorage.setItem(KHOA_VI_TRI_AI, JSON.stringify(pos)); } catch (_) {}
                }
                activePointerId = null;
            }

            btnMo.addEventListener('pointerup', ketThucKeo);
            btnMo.addEventListener('pointercancel', ketThucKeo);
        })();

        // Kéo thả khung chat Trợ lý Gemini qua thanh tiêu đề (hỗ trợ cả chuột & cảm ứng)
        (function kichHoatKeoThaKhungChat() {
            let dangNhan = false;
            let daKeo = false;
            let startX = 0;
            let startY = 0;
            let startLeft = 0;
            let startTop = 0;
            let activePointerId = null;

            headerHopChat.addEventListener('pointerdown', (e) => {
                if (dangToanManHinh) return;
                if (e.target.closest('button')) return;
                if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
                const rect = wrapper.getBoundingClientRect();
                dangNhan = true;
                daKeo = false;
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                try { headerHopChat.setPointerCapture(e.pointerId); } catch (_) {}
            });

            headerHopChat.addEventListener('pointermove', (e) => {
                if (!dangNhan || e.pointerId !== activePointerId || dangToanManHinh) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (!daKeo && Math.hypot(dx, dy) > 4) {
                    daKeo = true;
                }
                if (!daKeo) return;
                const pos = kepViTriTrongManHinh(startLeft + dx, startTop + dy, wrapper);
                apDungViTriWrapper(pos.left, pos.top);
            });

            function ketThucKeoKhung(e) {
                if (!dangNhan || e.pointerId !== activePointerId) return;
                dangNhan = false;
                try { headerHopChat.releasePointerCapture(e.pointerId); } catch (_) {}
                if (daKeo && !dangToanManHinh) {
                    const rect = wrapper.getBoundingClientRect();
                    const pos = kepViTriTrongManHinh(rect.left, rect.top, wrapper);
                    apDungViTriWrapper(pos.left, pos.top);
                    viTriKhungDaLuu = pos;
                    try { localStorage.setItem(KHOA_VI_TRI_KHUNG_AI, JSON.stringify(pos)); } catch (_) {}
                }
                activePointerId = null;
            }

            headerHopChat.addEventListener('pointerup', ketThucKeoKhung);
            headerHopChat.addEventListener('pointercancel', ketThucKeoKhung);
        })();

        window.addEventListener('resize', () => {
            if (dangToanManHinh) return;
            if (!wrapper.style.left || !wrapper.style.top) return;
            const left = parseFloat(wrapper.style.left);
            const top = parseFloat(wrapper.style.top);
            if (!isNaN(left) && !isNaN(top)) {
                const pos = kepViTriTrongManHinh(left, top, wrapper);
                apDungViTriWrapper(pos.left, pos.top);
            }
        });

        btnToanManHinh.addEventListener('click', () => {
            capNhatCheDoToanManHinh(!dangToanManHinh);
            khungTin.scrollTop = khungTin.scrollHeight;
            input.focus();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dangToanManHinh && !hopChat.classList.contains('hidden')) {
                capNhatCheDoToanManHinh(false);
            }
        });

        btnMo.addEventListener('click', () => {
            if (vuaKeoXong) return;
            btnMo.classList.add('hidden');
            hopChat.classList.remove('hidden');
            if (!dangToanManHinh) {
                if (viTriKhungDaLuu) {
                    const pos = kepViTriTrongManHinh(viTriKhungDaLuu.left, viTriKhungDaLuu.top, wrapper);
                    apDungViTriWrapper(pos.left, pos.top);
                } else if (wrapper.style.left && wrapper.style.top) {
                    const pos = kepViTriTrongManHinh(
                        parseFloat(wrapper.style.left) || 8,
                        parseFloat(wrapper.style.top) || 8,
                        wrapper
                    );
                    apDungViTriWrapper(pos.left, pos.top);
                }
            }
            input.focus();
        });

        btnDong.addEventListener('click', () => {
            if (dangToanManHinh) {
                capNhatCheDoToanManHinh(false);
            }
            hopChat.classList.add('hidden');
            btnMo.classList.remove('hidden');
            if (viTriNutDaLuu) {
                const pos = kepViTriTrongManHinh(viTriNutDaLuu.left, viTriNutDaLuu.top, wrapper);
                apDungViTriWrapper(pos.left, pos.top);
            } else {
                datLaiViTriMacDinhWrapper();
            }
        });

        btnChonFile.addEventListener('click', () => inputFile.click());

        btnXoaTep.addEventListener('click', () => {
            tepDangChon = null;
            inputFile.value = '';
            vungTep.classList.add('hidden');
        });

        if (btnMoiHoiThoai) {
            btnMoiHoiThoai.addEventListener('click', () => {
                if (dangTraLoi) return;
                lichSuHoiThoai = [];
                tepDangChon = null;
                inputFile.value = '';
                vungTep.classList.add('hidden');
                khungTin.innerHTML = `
                    <div class="bg-blue-50 border border-blue-200 text-slate-700 p-2.5 rounded-xl text-xs leading-relaxed">
                        Đã bắt đầu cuộc trò chuyện mới! Hãy đặt câu hỏi hoặc bấm biểu tượng <b>ghim</b> để đính kèm tệp nhé.
                    </div>
                `;
                input.focus();
            });
        }

        inputFile.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                tepDangChon = await docTepDinhKem(file);
                tenTep.textContent = `📎 ${tepDangChon.tenFile}`;
                vungTep.classList.remove('hidden');
                input.focus();
            } catch (err) {
                alert(err.message || 'Không thể đọc tệp này.');
                inputFile.value = '';
            }
        });

        function dinhDangTraLoiDep(vanBan) {
            let safe = String(vanBan || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const dong = safe.split('\n').map(line => {
                let s = line.trim();
                if (!s) return '<div class="h-1.5"></div>';

                if (/^#{1,6}\s+/.test(s)) {
                    s = s.replace(/^#{1,6}\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
                    return `<div class="font-bold text-[#0b5394] text-[13px] mt-1.5 mb-0.5">${s}</div>`;
                }

                const formatInline = (txt) => txt
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                    .replace(/(^|[^\*])\*([^\*\n]+?)\*(?!\*)/g, '$1<em class="italic text-slate-500">$2</em>');

                if (/^[\*\-]\s+/.test(s)) {
                    const noiDungDong = formatInline(s.replace(/^[\*\-]\s+/, ''));
                    return `<div class="flex items-start gap-1.5 pl-1"><span class="text-[#0b5394] font-bold leading-tight">•</span><span class="flex-1">${noiDungDong}</span></div>`;
                }

                return `<div>${formatInline(s)}</div>`;
            });

            return dong.join('');
        }

        async function saoChepVanBan(vanBan) {
            const text = String(vanBan || '');
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(text);
                    return true;
                } catch (_) {}
            }
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (_) {
                ok = false;
            }
            document.body.removeChild(ta);
            return ok;
        }

        function capNhatTraLoiAssistant(oTraLoi, noiDung, choPhepCopy, laDangDinhDang) {
            const noiDungEl = oTraLoi._noiDungEl;
            const footerEl = oTraLoi._footerCopyEl;
            if (!noiDungEl) {
                oTraLoi.textContent = String(noiDung || '');
                return;
            }
            if (laDangDinhDang) {
                noiDungEl.innerHTML = dinhDangTraLoiDep(noiDung);
            } else {
                noiDungEl.textContent = String(noiDung || '');
            }
            oTraLoi._rawText = String(noiDung || '');
            if (footerEl) {
                if (choPhepCopy && oTraLoi._rawText.trim()) {
                    footerEl.classList.remove('hidden');
                } else {
                    footerEl.classList.add('hidden');
                }
            }
        }

        function themTinNhan(vaiTro, noiDung) {
            const div = document.createElement('div');
            div.className = vaiTro === 'user'
                ? 'ml-8 bg-[#0b5394] text-white p-2.5 rounded-xl text-xs whitespace-pre-wrap'
                : 'mr-4 bg-white border border-slate-200 text-slate-800 p-2.5 rounded-xl text-xs leading-relaxed shadow-sm';
            if (vaiTro === 'user') {
                div.textContent = noiDung;
            } else {
                const noiDungEl = document.createElement('div');
                noiDungEl.className = 'space-y-0.5';
                noiDungEl.innerHTML = dinhDangTraLoiDep(noiDung);

                const footerEl = document.createElement('div');
                footerEl.className = 'hidden mt-2 pt-1.5 border-t border-slate-100 flex justify-end';

                const btnCopy = document.createElement('button');
                btnCopy.type = 'button';
                btnCopy.title = 'Sao chép câu trả lời';
                btnCopy.className = 'inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0b5394] hover:bg-slate-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors';
                const iconCopyHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg><span>Sao chép</span>';
                const iconDaCopyHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg><span>Đã sao chép</span>';
                btnCopy.innerHTML = iconCopyHTML;

                let timerResetCopy = null;
                btnCopy.addEventListener('click', async () => {
                    const textCanCopy = div._rawText || noiDungEl.innerText || '';
                    const thanhCong = await saoChepVanBan(textCanCopy);
                    if (!thanhCong) return;
                    if (timerResetCopy) clearTimeout(timerResetCopy);
                    btnCopy.innerHTML = iconDaCopyHTML;
                    btnCopy.classList.remove('text-slate-500', 'hover:text-[#0b5394]', 'hover:bg-slate-100');
                    btnCopy.classList.add('text-emerald-600', 'bg-emerald-50');
                    timerResetCopy = setTimeout(() => {
                        btnCopy.innerHTML = iconCopyHTML;
                        btnCopy.classList.remove('text-emerald-600', 'bg-emerald-50');
                        btnCopy.classList.add('text-slate-500', 'hover:text-[#0b5394]', 'hover:bg-slate-100');
                    }, 1800);
                });

                footerEl.appendChild(btnCopy);
                div.appendChild(noiDungEl);
                div.appendChild(footerEl);
                div._noiDungEl = noiDungEl;
                div._footerCopyEl = footerEl;
                div._rawText = String(noiDung || '');
            }
            khungTin.appendChild(div);
            khungTin.scrollTop = khungTin.scrollHeight;
            return div;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const cauHoi = input.value.trim();
            if ((!cauHoi && !tepDangChon) || dangTraLoi) return;

            if (typeof CAU_HINH_FRONTEND === 'undefined' || !CAU_HINH_FRONTEND.URL_API_MAY_CHU) {
                themTinNhan('assistant', 'Chưa tìm thấy đường dẫn máy chủ trong KetNoi.js.');
                return;
            }

            const tepGui = tepDangChon;
            const nhanUser = tepGui
                ? `${cauHoi || 'Phân tích tệp đính kèm'}\n[📎 ${tepGui.tenFile}]`
                : cauHoi;

            input.value = '';
            tepDangChon = null;
            inputFile.value = '';
            vungTep.classList.add('hidden');

            themTinNhan('user', nhanUser);
            const oTraLoi = themTinNhan('assistant', 'Đang đọc dữ liệu và phân tích...');
            dangTraLoi = true;
            document.getElementById('btnGuiAI').disabled = true;

            try {
                const lichSuGanDay = lichSuHoiThoai.slice(-10);
                const lichSuText = lichSuGanDay.length > 0
                    ? `[Lịch sử hội thoại nối tiếp gần đây]\n` + lichSuGanDay
                        .map(m => `${m.vaiTro === 'user' ? 'Người dùng' : 'Trợ lý'}: ${m.noiDung}`)
                        .join('\n')
                        .slice(-10000)
                    : '';
                const nguCanhManHinh = layNguCanhTrangHienTai();
                const nguCanhGui = lichSuText
                    ? `${lichSuText}\n\n${nguCanhManHinh}`.slice(0, 35000)
                    : nguCanhManHinh;

                const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        thaoTac: 'hoiTroLyAI',
                        cauHoi: cauHoi,
                        nguCanh: nguCanhGui,
                        lichSuHoiThoai: lichSuGanDay,
                        tepDinhKem: tepGui,
                        fileIdGiaoAn: layFileIdModalDangMo()
                    })
                });

                const ketQua = await phanHoi.json();
                if (ketQua.trangThai === 'thanh_cong') {
                    capNhatTraLoiAssistant(oTraLoi, ketQua.traLoi, true, true);
                    lichSuHoiThoai.push({ vaiTro: 'user', noiDung: nhanUser });
                    lichSuHoiThoai.push({ vaiTro: 'assistant', noiDung: String(ketQua.traLoi || '') });
                    if (lichSuHoiThoai.length > 20) {
                        lichSuHoiThoai = lichSuHoiThoai.slice(-20);
                    }
                } else {
                    capNhatTraLoiAssistant(oTraLoi, 'Lỗi: ' + (ketQua.thongBao || 'Không nhận được phản hồi.'), false, false);
                }
            } catch (err) {
                capNhatTraLoiAssistant(oTraLoi, 'Lỗi kết nối: ' + (err.message || 'Vui lòng thử lại.'), false, false);
            } finally {
                dangTraLoi = false;
                document.getElementById('btnGuiAI').disabled = false;
                khungTin.scrollTop = khungTin.scrollHeight;
                input.focus();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', taoGiaoDienTroLyAI);
})();
