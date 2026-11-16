/* ========================================================================== */
/* MODULE: KẾT QUẢ KIỂM TRA NỘI BỘ (KetQuaKiemTra.js)                        */
/* Phụ thuộc có sẵn từ index.html: google.script.run.skt_timbg_kq, chuyentth  */
/* ========================================================================== */
(function () {
  const KQKT_CONTAINER_ID = "TabKetQuaKT";
  let kqktDaKhoiTao = false;
  let kqktDangTai = false;
  let kqktDuLieuHienTai = [];
  let kqktNguoiDangChon = null;

  // 0. TỰ ĐỘNG ĐẢM BẢO KHUNG TAB TỒN TẠI TRONG #so_wrapper (CHỐNG LỖI NULL)
  function kqkt_damBaoKhungTab() {
    let container = document.getElementById(KQKT_CONTAINER_ID);
    if (!container) {
      const wrapper = document.getElementById("so_wrapper");
      if (wrapper) {
        container = document.createElement("div");
        container.id = KQKT_CONTAINER_ID;
        container.className = "tab-content";
        wrapper.appendChild(container);
      }
    }
    return container;
  }

  // 1. NẠP CSS RIÊNG CHO MODULE
  function kqkt_napCSS() {
    if (document.getElementById("kqkt-style")) return;
    const style = document.createElement("style");
    style.id = "kqkt-style";
    style.textContent = `
      .kqkt-layout {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
        box-sizing: border-box;
        font-family: "Times New Roman", serif;
      }
      .kqkt-header {
        background: #ffffff;
        padding: 10px 14px;
        border-radius: 6px;
        border-top: 3px solid #b91c1c;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        margin-bottom: 8px;
        flex-shrink: 0;
        text-align: center;
      }
      .kqkt-title {
        font-size: 22px;
        font-weight: 900;
        color: #b91c1c;
        text-transform: uppercase;
        margin: 0 0 6px 0;
        letter-spacing: 0.8px;
      }
      .kqkt-subtitle-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 15px;
        color: #1e3a8a;
        font-weight: bold;
      }

      /* KHUNG NHẬP NGÀY SỬA TỪNG THÀNH PHẦN (NGÀY / THÁNG / NĂM) */
      .kqkt-date-box {
        display: inline-flex;
        align-items: center;
        height: 30px;
        padding: 0 6px;
        border: 1px solid #64748b;
        border-radius: 4px;
        background: #ffffff;
        box-sizing: border-box;
      }
      .kqkt-date-box:focus-within {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
      }
      .kqkt-date-part {
        border: none;
        outline: none;
        background: transparent;
        text-align: center;
        font-family: "Times New Roman", serif;
        font-size: 14px;
        font-weight: bold;
        color: #0f172a;
        padding: 0;
      }
      .kqkt-date-dd,
      .kqkt-date-mm {
        width: 22px;
      }
      .kqkt-date-yyyy {
        width: 38px;
      }
      .kqkt-date-sep {
        color: #475569;
        font-weight: bold;
        padding: 0 2px;
        user-select: none;
      }

      .kqkt-btn {
        height: 30px;
        padding: 0 14px;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: 0.2s;
      }
      .kqkt-btn:hover { opacity: 0.92; transform: translateY(-1px); }
      .kqkt-btn:disabled { background: #9ca3af; cursor: wait; transform: none; }
      .kqkt-btn-reset {
        background: linear-gradient(135deg, #b91c1c, #dc2626);
        padding: 0 10px;
      }

      /* VÙNG CHỨA BẢNG: ÔM SÁT KHI ÍT DÒNG, TỰ CUỘN KHI NHIỀU DÒNG */
      .kqkt-body-area {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .kqkt-table-wrap {
        flex: 0 1 auto;
        max-height: 100%;
        width: 100%;
        overflow-x: auto;
        overflow-y: auto;
        border: 1px solid #475569;
        background: #ffffff;
        position: relative;
      }
      .kqkt-table {
        width: 100%;
        min-width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: auto;
        font-family: "Times New Roman", serif;
      }
      .kqkt-table th,
      .kqkt-table td {
        border-right: 1px solid #94a3b8 !important;
        border-bottom: 1px solid #94a3b8 !important;
        border-top: none !important;
        border-left: none !important;
        padding: 6px 6px;
        font-size: 14px;
        box-sizing: border-box;
      }

      /* ĐƯỜNG KẺ TIÊU ĐỀ 2 TẦNG RÕ NÉT */
      .kqkt-table thead th {
        border-right: 1px solid #475569 !important;
        border-bottom: 1px solid #475569 !important;
      }
      .kqkt-table thead tr:first-child th {
        position: sticky;
        top: 0;
        height: 34px;
        z-index: 20;
        background: #dbeafe;
        color: #0c4a6e;
        font-weight: bold;
        text-align: center;
        border-top: 1px solid #475569 !important;
      }
      .kqkt-table thead tr:nth-child(2) th {
        position: sticky;
        top: 34px;
        min-height: 34px;
        height: auto;
        z-index: 20;
        background: #eff6ff;
        color: #1e3a8a;
        font-weight: bold;
        text-align: center;
        min-width: 95px;
        white-space: nowrap;
        padding: 5px 8px;
        border-bottom: 2px solid #475569 !important;
      }
      .kqkt-loai-kt {
        font-size: 12px;
        font-weight: bold;
        color: #b91c1c;
        margin-top: 2px;
        white-space: nowrap;
      }

      /* CỐ ĐỊNH 2 CỘT ĐẦU (STT & HỌ VÀ TÊN) KHI CUỘN NGANG */
      .kqkt-col-stt {
        width: 52px;
        min-width: 52px;
        max-width: 52px;
        text-align: center;
        position: sticky;
        left: 0;
        z-index: 15;
        background: #ffffff;
        border-left: 1px solid #475569 !important;
      }
      .kqkt-col-gv {
        width: 210px;
        min-width: 190px;
        max-width: 240px;
        text-align: left;
        font-weight: bold;
        color: #0f172a;
        position: sticky;
        left: 52px;
        z-index: 15;
        background: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-right: 2px solid #475569 !important;
      }
      tbody td.kqkt-col-gv {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      tbody td.kqkt-col-gv:hover {
        background: #eff6ff;
        color: #1d4ed8;
      }
      tbody td.kqkt-col-gv.kqkt-gv-selected {
        background: #fef08a !important;
        color: #991b1b !important;
      }
      .kqkt-table thead tr:first-child th.kqkt-col-stt {
        z-index: 30;
        left: 0;
        background: #dbeafe;
        border-left: 1px solid #475569 !important;
        border-bottom: 2px solid #475569 !important;
      }
      .kqkt-table thead tr:first-child th.kqkt-col-gv {
        z-index: 30;
        left: 52px;
        background: #dbeafe;
        border-right: 2px solid #475569 !important;
        border-bottom: 2px solid #475569 !important;
      }

      /* Ô KẾT QUẢ XẾP LOẠI */
      .kqkt-cell-xl {
        min-width: 95px;
        text-align: center;
        vertical-align: middle;
        font-weight: bold;
        line-height: 1.3;
        white-space: nowrap;
      }
      .kqkt-xl-tot { color: #15803d; background: #f0fdf4 !important; }
      .kqkt-xl-kha { color: #1d4ed8; background: #eff6ff !important; }
      .kqkt-xl-tb  { color: #b45309; background: #fffbeb !important; }
      .kqkt-xl-yeu { color: #b91c1c; background: #fef2f2 !important; }
      .kqkt-empty  { text-align: center; padding: 18px !important; font-style: italic; color: #64748b; }
    `;
    document.head.appendChild(style);
  }

  // 2. HÀM TIỆN ÍCH NGÀY THÁNG (SỬA TỪNG THÀNH PHẦN dd / mm / yyyy)
  function kqkt_taoHtmlO_Ngay(prefix) {
    return `
      <div class="kqkt-date-box">
        <input type="text" id="${prefix}_dd" class="kqkt-date-part kqkt-date-dd" maxlength="2" placeholder="dd" inputmode="numeric" autocomplete="off">
        <span class="kqkt-date-sep">/</span>
        <input type="text" id="${prefix}_mm" class="kqkt-date-part kqkt-date-mm" maxlength="2" placeholder="mm" inputmode="numeric" autocomplete="off">
        <span class="kqkt-date-sep">/</span>
        <input type="text" id="${prefix}_yyyy" class="kqkt-date-part kqkt-date-yyyy" maxlength="4" placeholder="yyyy" inputmode="numeric" autocomplete="off">
      </div>
    `;
  }

  function kqkt_ganSuKienO_Ngay(prefix) {
    const ddEl = document.getElementById(`${prefix}_dd`);
    const mmEl = document.getElementById(`${prefix}_mm`);
    const yyEl = document.getElementById(`${prefix}_yyyy`);
    const parts = [
      { el: ddEl, max: 2, next: mmEl, prev: null, pad: 2 },
      { el: mmEl, max: 2, next: yyEl, prev: ddEl, pad: 2 },
      { el: yyEl, max: 4, next: null, prev: mmEl, pad: 4 }
    ];

    parts.forEach((p) => {
      if (!p.el) return;
      p.el.addEventListener("focus", function () {
        this.select();
      });
      p.el.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "").slice(0, p.max);
        if (this.value.length === p.max && p.next) {
          p.next.focus();
          p.next.select();
        }
      });
      p.el.addEventListener("blur", function () {
        if (this.value !== "" && p.pad === 2 && this.value.length === 1) {
          this.value = this.value.padStart(2, "0");
        }
      });
      p.el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          kqkt_taiDuLieu();
        } else if (e.key === "Backspace" && this.value === "" && p.prev) {
          p.prev.focus();
        } else if (e.key === "ArrowRight" && this.selectionStart === this.value.length && p.next) {
          e.preventDefault();
          p.next.focus();
          p.next.select();
        } else if (e.key === "ArrowLeft" && this.selectionStart === 0 && p.prev) {
          e.preventDefault();
          p.prev.focus();
          p.prev.select();
        }
      });
    });
  }

  function kqkt_layChuoiNgay(prefix) {
    const dd = (document.getElementById(`${prefix}_dd`)?.value || "").trim();
    const mm = (document.getElementById(`${prefix}_mm`)?.value || "").trim();
    const yy = (document.getElementById(`${prefix}_yyyy`)?.value || "").trim();
    if (!dd || !mm || !yy) return "";
    return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yy}`;
  }

  function kqkt_setChuoiNgay(prefix, dd, mm, yyyy) {
    const ddEl = document.getElementById(`${prefix}_dd`);
    const mmEl = document.getElementById(`${prefix}_mm`);
    const yyEl = document.getElementById(`${prefix}_yyyy`);
    if (ddEl) ddEl.value = String(dd).padStart(2, "0");
    if (mmEl) mmEl.value = String(mm).padStart(2, "0");
    if (yyEl) yyEl.value = String(yyyy);
  }

  function kqkt_parseNgay(str) {
    if (!str) return 0;
    const p = String(str).trim().split("/");
    if (p.length !== 3) return 0;
    const d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function kqkt_setNgayMacDinh() {
    const homNay = new Date();
    const namNay = homNay.getFullYear();
    const dd = homNay.getDate();
    const mm = homNay.getMonth() + 1;
    kqkt_setChuoiNgay("kqkt_tu", dd, mm, namNay - 1);
    kqkt_setChuoiNgay("kqkt_den", dd, mm, namNay);
  }

  // 3. DỰNG KHUNG GIAO DIỆN VÀO #TabKetQuaKT
  function kqkt_dungGiaoDien() {
    const container = kqkt_damBaoKhungTab();
    if (!container) return;

    kqkt_napCSS();
    container.innerHTML = `
      <div class="kqkt-layout">
        <div class="kqkt-header">
          <div class="kqkt-title">KẾT QUẢ KIỂM TRA NỘI BỘ</div>
          <div class="kqkt-subtitle-row">
            <span>Từ ngày</span>
            ${kqkt_taoHtmlO_Ngay("kqkt_tu")}
            <span>đến ngày</span>
            ${kqkt_taoHtmlO_Ngay("kqkt_den")}
            <button id="kqkt_btn_xem" class="kqkt-btn" onclick="kqkt_taiDuLieu()">🔍 Xem kết quả</button>
            <button class="kqkt-btn kqkt-btn-reset" onclick="kqkt_datLai()" title="Đặt lại 1 năm gần nhất">↻</button>
          </div>
        </div>

        <div class="kqkt-body-area">
          <div class="kqkt-table-wrap">
            <table class="kqkt-table" id="kqkt_table">
              <thead id="kqkt_thead">
                <tr>
                  <th rowspan="2" class="kqkt-col-stt">STT</th>
                  <th rowspan="2" class="kqkt-col-gv">Họ và tên</th>
                  <th colspan="1">Kết quả</th>
                </tr>
                <tr>
                  <th>Ngày kiểm tra</th>
                </tr>
              </thead>
              <tbody id="kqkt_tbody">
                <tr><td colspan="3" class="kqkt-empty">Đang chuẩn bị dữ liệu...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    kqkt_ganSuKienO_Ngay("kqkt_tu");
    kqkt_ganSuKienO_Ngay("kqkt_den");
    kqkt_setNgayMacDinh();

    const tbody = document.getElementById("kqkt_tbody");
    if (tbody) {
      tbody.addEventListener("click", function (e) {
        const cell = e.target.closest("td.kqkt-col-gv");
        if (!cell) return;
        e.stopPropagation();
        const tenGV = cell.getAttribute("data-gv");
        if (!tenGV) return;
        kqktNguoiDangChon = tenGV;
        kqkt_renderBang(kqktDuLieuHienTai);
      });
    }

    kqktDaKhoiTao = true;
  }

  // Bấm ra ngoài cột tên -> Hiện lại đầy đủ danh sách
  document.addEventListener("click", function (e) {
    if (kqktNguoiDangChon === null) return;
    const tab = document.getElementById(KQKT_CONTAINER_ID);
    if (!tab || !tab.classList.contains("active")) return;
    if (e.target.closest("#kqkt_table td.kqkt-col-gv")) return;

    kqktNguoiDangChon = null;
    kqkt_renderBang(kqktDuLieuHienTai);
  });

  // 4. RÚT TRÍCH GIÁ TRỊ XẾP LOẠI & LOẠI HÌNH KIỂM TRA TỪ 1 BẢN GHI DATAKT
  function kqkt_layXepLoai(row) {
    const cacLoai = [
      { nhan: "HS", gt: String(row[9] || "").trim() },
      { nhan: "GD", gt: String(row[10] || "").trim() },
      { nhan: "KS", gt: String(row[11] || "").trim() },
      { nhan: "Khác", gt: String(row[12] || "").trim() }
    ].filter((m) => m.gt !== "");

    if (cacLoai.length === 0) return "";
    if (cacLoai.length === 1) return cacLoai[0].gt;
    return cacLoai.map((m) => `${m.nhan}: ${m.gt}`).join("<br>");
  }

  function kqkt_layTenLoaiKT(row) {
    const ds = [];
    if (String(row[9] || "").trim() !== "") ds.push("Hồ sơ");
    if (String(row[10] || "").trim() !== "") ds.push("Dự giờ");
    if (String(row[11] || "").trim() !== "") ds.push("Khảo sát");
    if (String(row[12] || "").trim() !== "") ds.push("Khác");
    return ds;
  }

  function kqkt_classMauXL(text) {
    const t = String(text || "").toLowerCase();
    if (!t) return "";
    if (t.includes("yếu") || t.includes("chưa đạt")) return "kqkt-xl-yeu";
    if (t.includes("trung bình") || t === "tb" || t.includes("đạt")) return "kqkt-xl-tb";
    if (t.includes("khá")) return "kqkt-xl-kha";
    if (t.includes("tốt") || t.includes("giỏi")) return "kqkt-xl-tot";
    return "";
  }

  // 5. DỰNG BẢNG MA TRẬN (GIÁO VIÊN × NGÀY KIỂM TRA)
  function kqkt_renderBang(dsBanGhi) {
    const thead = document.getElementById("kqkt_thead");
    const tbody = document.getElementById("kqkt_tbody");
    if (!thead || !tbody) return;

    if (!Array.isArray(dsBanGhi) || dsBanGhi.length === 0) {
      thead.innerHTML = `
        <tr>
          <th rowspan="2" class="kqkt-col-stt">STT</th>
          <th rowspan="2" class="kqkt-col-gv">Họ và tên</th>
          <th colspan="1">Kết quả</th>
        </tr>
        <tr><th>Ngày kiểm tra</th></tr>
      `;
      tbody.innerHTML = `<tr><td colspan="3" class="kqkt-empty">Không có dữ liệu kiểm tra trong khoảng thời gian đã chọn.</td></tr>`;
      return;
    }

    const tapNgay = new Set();
    const mapKetQua = new Map();
    const tapGiaoVienCoKQ = new Set();

    dsBanGhi.forEach((row) => {
      const gv = String(row[0] || "").trim();
      const ngay = String(row[4] || "").trim();
      if (!gv || !ngay) return;

      tapNgay.add(ngay);
      tapGiaoVienCoKQ.add(gv);

      const xl = kqkt_layXepLoai(row);
      const loaiTen = kqkt_layTenLoaiKT(row);
      const noiDung = String(row[5] || "").trim();
      const nguoiKT = String(row[1] || "").trim();
      const tip = [
        `Ngày: ${ngay}`,
        loaiTen.length ? `Hình thức: ${loaiTen.join(", ")}` : "",
        nguoiKT ? `Người KT: ${nguoiKT}` : "",
        noiDung ? `Nội dung: ${noiDung}` : ""
      ].filter(Boolean).join(" | ");

      const key = `${gv}|||${ngay}`;
      if (!mapKetQua.has(key)) mapKetQua.set(key, []);
      mapKetQua.get(key).push({ text: xl || "—", tooltip: tip, loaiTen: loaiTen });
    });

    let dsNgay = Array.from(tapNgay).sort((a, b) => kqkt_parseNgay(a) - kqkt_parseNgay(b));

    let dsGiaoVien = [];
    if (window.ruongbac && Array.isArray(window.ruongbac.conmeo) && window.ruongbac.conmeo.length > 0) {
      dsGiaoVien = window.ruongbac.conmeo.map((gv) => String(gv.tenn || "").trim()).filter(Boolean);
      tapGiaoVienCoKQ.forEach((gv) => {
        if (!dsGiaoVien.includes(gv)) dsGiaoVien.push(gv);
      });
    } else {
      dsGiaoVien = Array.from(tapGiaoVienCoKQ).sort((a, b) => a.localeCompare(b, "vi"));
    }

    if (kqktNguoiDangChon !== null) {
      dsGiaoVien = [kqktNguoiDangChon];
      dsNgay = dsNgay.filter((ngay) => mapKetQua.has(`${kqktNguoiDangChon}|||${ngay}`));
    }

    if (dsNgay.length === 0) {
      thead.innerHTML = `
        <tr>
          <th rowspan="2" class="kqkt-col-stt">STT</th>
          <th rowspan="2" class="kqkt-col-gv">Họ và tên</th>
          <th colspan="1">Kết quả</th>
        </tr>
        <tr><th>Ngày kiểm tra</th></tr>
      `;
      const tenAnToan = (kqktNguoiDangChon || "").replace(/"/g, "&quot;");
      tbody.innerHTML = `
        <tr>
          <td class="kqkt-col-stt">1</td>
          <td class="kqkt-col-gv kqkt-gv-selected" data-gv="${tenAnToan}" title="${tenAnToan}">${kqktNguoiDangChon}</td>
          <td class="kqkt-empty">Chưa có kết quả kiểm tra trong khoảng thời gian này (bấm ra ngoài để xem lại tất cả).</td>
        </tr>
      `;
      return;
    }

    // Dựng tiêu đề cột ngày: Nếu đang lọc 1 người thì kèm loại hình kiểm tra (Hồ sơ / Dự giờ / Khảo sát / Khác)
    const htmlCotNgay = dsNgay.map((ngay) => {
      if (kqktNguoiDangChon !== null) {
        const items = mapKetQua.get(`${kqktNguoiDangChon}|||${ngay}`) || [];
        const tapLoai = new Set();
        items.forEach((i) => i.loaiTen.forEach((l) => tapLoai.add(l)));
        const chuoiLoai = Array.from(tapLoai).join(", ");
        if (chuoiLoai) {
          return `<th><div>${ngay}</div><div class="kqkt-loai-kt">${chuoiLoai}</div></th>`;
        }
      }
      return `<th>${ngay}</th>`;
    }).join("");

    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="kqkt-col-stt">STT</th>
        <th rowspan="2" class="kqkt-col-gv">Họ và tên</th>
        <th colspan="${dsNgay.length}">Kết quả</th>
      </tr>
      <tr>${htmlCotNgay}</tr>
    `;

    const htmlRows = dsGiaoVien.map((gv, idx) => {
      const cells = dsNgay.map((ngay) => {
        const items = mapKetQua.get(`${gv}|||${ngay}`);
        if (!items || items.length === 0) {
          return `<td class="kqkt-cell-xl"></td>`;
        }
        const noiDungO = items.map((i) => i.text).join("<br>");
        const titleO = items.map((i) => i.tooltip).join("\n").replace(/"/g, "&quot;");
        const clsMau = kqkt_classMauXL(items[0].text);
        return `<td class="kqkt-cell-xl ${clsMau}" title="${titleO}">${noiDungO}</td>`;
      }).join("");

      const tenAnToan = gv.replace(/"/g, "&quot;");
      const clsSelected = (kqktNguoiDangChon === gv) ? " kqkt-gv-selected" : "";
      const tipGV = (kqktNguoiDangChon === gv)
        ? "Đang lọc theo giáo viên này (bấm ra ngoài cột tên để xem tất cả)"
        : `Bấm để lọc kết quả của ${gv}`;

      return `
        <tr>
          <td class="kqkt-col-stt">${idx + 1}</td>
          <td class="kqkt-col-gv${clsSelected}" data-gv="${tenAnToan}" title="${tipGV.replace(/"/g, "&quot;")}">${gv}</td>
          ${cells}
        </tr>
      `;
    }).join("");

    tbody.innerHTML = htmlRows;
  }

  // 6. GỌI API BACKEND (DÙNG CHUNG skt_timbg_kq TRONG code.gs)
  window.kqkt_taiDuLieu = function () {
    if (kqktDangTai) return;
    const tuNgay = kqkt_layChuoiNgay("kqkt_tu");
    const denNgay = kqkt_layChuoiNgay("kqkt_den");

    const btn = document.getElementById("kqkt_btn_xem");
    const thead = document.getElementById("kqkt_thead");
    const tbody = document.getElementById("kqkt_tbody");
    kqktDangTai = true;
    kqktNguoiDangChon = null;

    if (btn) {
      btn.disabled = true;
      btn.innerText = "⏳ Đang tải...";
    }
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th rowspan="2" class="kqkt-col-stt">STT</th>
          <th rowspan="2" class="kqkt-col-gv">Họ và tên</th>
          <th colspan="1">Kết quả</th>
        </tr>
        <tr><th>Ngày kiểm tra</th></tr>
      `;
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="3" class="kqkt-empty">Đang tổng hợp kết quả kiểm tra...</td></tr>`;
    }

    google.script.run
      .withSuccessHandler((kq) => {
        kqktDangTai = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "🔍 Xem kết quả";
        }
        kqktDuLieuHienTai = Array.isArray(kq) ? kq : [];
        kqkt_renderBang(kqktDuLieuHienTai);
      })
      .withFailureHandler((err) => {
        kqktDangTai = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "🔍 Xem kết quả";
        }
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="3" class="kqkt-empty" style="color:#dc2626;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
        }
      })
      .skt_timbg_kq({ gkiem: "", nkiem: "", bkiem: "", tkiem: tuNgay, dkiem: denNgay });
  };

  window.kqkt_datLai = function () {
    kqktNguoiDangChon = null;
    kqkt_setNgayMacDinh();
    kqkt_taiDuLieu();
  };

  // HÀM MỞ TAB (GỌI TỪ MENU DỌC)
  window.kqkt_moTab = function (nutMenu) {
    kqkt_damBaoKhungTab();
    if (typeof chuyentth === "function") {
      chuyentth(KQKT_CONTAINER_ID, nutMenu);
    }
    if (nutMenu) {
      nutMenu.classList.add("active");
    }
    if (!kqktDaKhoiTao) {
      kqkt_dungGiaoDien();
      kqkt_taiDuLieu();
    }
  };
})();
