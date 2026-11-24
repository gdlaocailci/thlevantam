(function () {
    let dangTraLoi = false;
    let tepDangChon = null; // { tenFile, mimeType, base64, noiDungText }

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
            <button id="btnMoTroLyAI" type="button"
                class="flex items-center gap-2 bg-[#0b5394] hover:bg-[#1e70b8] text-white font-bold px-4 py-2.5 rounded-full shadow-xl border border-blue-300 transition-all cursor-pointer">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"/>
                </svg>
                <span class="text-sm">Trợ lý Gemini</span>
            </button>

            <div id="hopChatTroLyAI" class="hidden w-[380px] max-w-[94vw] h-[500px] bg-white border border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div class="bg-[#0b5394] text-white px-4 py-3 flex items-center justify-between">
                    <div>
                        <div class="font-bold text-sm">Trợ lý Gemini Nhà trường</div>
                        <div class="text-[11px] text-blue-200">Đọc màn hình &amp; phân tích tệp đính kèm</div>
                    </div>
                    <button id="btnDongTroLyAI" type="button" class="text-white hover:text-red-200 text-2xl leading-none px-1 cursor-pointer">&times;</button>
                </div>

                <div id="noiDungChatAI" class="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50 text-sm">
                    <div class="bg-blue-50 border border-blue-200 text-slate-700 p-2.5 rounded-xl text-xs leading-relaxed">
                        Xin chào! Tôi có thể đọc dữ liệu trên màn hình đang mở, hoặc bạn bấm biểu tượng kẹp ghim để tải lên file <b>Excel, PDF, Ảnh, TXT/CSV</b> cùng đối chiếu nhé.
                    </div>
                </div>

                <div id="vungTepDinhKemAI" class="hidden px-3 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs text-blue-900">
                    <span id="tenTepDinhKemAI" class="truncate font-semibold"></span>
                    <button id="btnXoaTepAI" type="button" class="ml-2 text-red-600 hover:text-red-800 font-bold cursor-pointer">&times;</button>
                </div>

                <form id="formGuiCauHoiAI" class="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
                    <input id="inputFileAI" type="file" accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp" class="hidden">
                    <button id="btnChonFileAI" type="button" title="Đính kèm tệp (Excel, PDF, Ảnh, TXT)"
                        class="p-2 text-slate-600 hover:text-[#0b5394] hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                        </svg>
                    </button>
                    <input id="inputCauHoiAI" type="text" placeholder="Nhập câu hỏi..." autocomplete="off"
                        class="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="btnGuiAI" type="submit"
                        class="bg-[#0b5394] hover:bg-[#1e70b8] text-white font-bold px-3.5 py-1.5 rounded-lg text-sm cursor-pointer disabled:opacity-50">
                        Gửi
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(wrapper);

        const btnMo = document.getElementById('btnMoTroLyAI');
        const btnDong = document.getElementById('btnDongTroLyAI');
        const hopChat = document.getElementById('hopChatTroLyAI');
        const form = document.getElementById('formGuiCauHoiAI');
        const input = document.getElementById('inputCauHoiAI');
        const khungTin = document.getElementById('noiDungChatAI');
        const inputFile = document.getElementById('inputFileAI');
        const btnChonFile = document.getElementById('btnChonFileAI');
        const vungTep = document.getElementById('vungTepDinhKemAI');
        const tenTep = document.getElementById('tenTepDinhKemAI');
        const btnXoaTep = document.getElementById('btnXoaTepAI');

        btnMo.addEventListener('click', () => {
            btnMo.classList.add('hidden');
            hopChat.classList.remove('hidden');
            input.focus();
        });

        btnDong.addEventListener('click', () => {
            hopChat.classList.add('hidden');
            btnMo.classList.remove('hidden');
        });

        btnChonFile.addEventListener('click', () => inputFile.click());

        btnXoaTep.addEventListener('click', () => {
            tepDangChon = null;
            inputFile.value = '';
            vungTep.classList.add('hidden');
        });

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

        function themTinNhan(vaiTro, noiDung) {
            const div = document.createElement('div');
            div.className = vaiTro === 'user'
                ? 'ml-8 bg-[#0b5394] text-white p-2.5 rounded-xl text-xs whitespace-pre-wrap'
                : 'mr-4 bg-white border border-slate-200 text-slate-800 p-2.5 rounded-xl text-xs leading-relaxed space-y-0.5 shadow-sm';
            if (vaiTro === 'user') {
                div.textContent = noiDung;
            } else {
                div.innerHTML = dinhDangTraLoiDep(noiDung);
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
                const phanHoi = await fetch(CAU_HINH_FRONTEND.URL_API_MAY_CHU, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        thaoTac: 'hoiTroLyAI',
                        cauHoi: cauHoi,
                        nguCanh: layNguCanhTrangHienTai(),
                        tepDinhKem: tepGui,
                        fileIdGiaoAn: layFileIdModalDangMo()
                    })
                });

                const ketQua = await phanHoi.json();
                if (ketQua.trangThai === 'thanh_cong') {
                    oTraLoi.innerHTML = dinhDangTraLoiDep(ketQua.traLoi);
                } else {
                    oTraLoi.textContent = 'Lỗi: ' + (ketQua.thongBao || 'Không nhận được phản hồi.');
                }
            } catch (err) {
                oTraLoi.textContent = 'Lỗi kết nối: ' + (err.message || 'Vui lòng thử lại.');
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
