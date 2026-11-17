/* ========================================================================== */
/* MODULE: HỒ SƠ CHƯA HOÀN THÀNH (HoSoChuaHoanThanh.js)                       */
/* Nguồn dữ liệu: Sheet NHATKY qua skt_layds_mhs_cn() có sẵn                  */
/* ========================================================================== */
(function () {
  const HSHT_CONTAINER_ID = "TabHoSoChuaHoanThanh";
  let hshtDaKhoiTao = false;
  let hshtDangTai = false;
  let hshtDanhSach = [];

  const HSHT_SPINNER_HTML = `
    <span class="hsht-loading-wrap">
      <svg class="hsht-spin-red" viewBox="0 0 16 16" width="22" height="22" fill="#dc2626" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
      </svg>
      <span>Đang đọc danh sách hồ sơ chưa hoàn thành...</span>
    </span>
  `;

  // 0. TỰ ĐỘNG ĐẢM BẢO KHUNG TAB TỒN TẠI TRONG #so_wrapper
  function hsht_damBaoKhungTab() {
    let container = document.getElementById(HSHT_CONTAINER_ID);
    if (!container) {
      const wrapper = document.getElementById("so_wrapper");
      if (wrapper) {
        container = document.createElement("div");
        container.id = HSHT_CONTAINER_ID;
        container.className = "tab-content";
        wrapper.appendChild(container);
      }
    }
    return container;
  }

  // 1. NẠP CSS RIÊNG CHO MODULE
  function hsht_napCSS() {
    if (document.getElementById("hsht-style")) return;
    const style = document.createElement("style");
    style.id = "hsht-style";
    style.textContent = `
      @keyframes hsht-spin-cw {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .hsht-loading-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #dc2626;
        font-weight: bold;
        font-style: normal;
      }
      .hsht-spin-red {
        animation: hsht-spin-cw 0.85s linear infinite;
        flex-shrink: 0;
      }

      .hsht-layout {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
        box-sizing: border-box;
        font-family: "Times New Roman", serif;
      }
      .hsht-header {
        background: #ffffff;
        padding: 10px 14px;
        border-radius: 6px;
        border-top: 3px solid #b91c1c;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        margin-bottom: 8px;
        flex-shrink: 0;
        text-align: center;
      }
      .hsht-title {
        font-size: 22px;
        font-weight: 900;
        color: #b91c1c;
        text-transform: uppercase;
        margin: 0 0 6px 0;
        letter-spacing: 0.8px;
      }
      .hsht-subtitle-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 15px;
        color: #1e3a8a;
        font-weight: bold;
      }

      /* KHUNG NHẬP NGÀY SỬA TỪNG THÀNH PHẦN */
      .hsht-date-box {
        display: inline-flex;
        align-items: center;
        height: 30px;
        padding: 0 6px;
        border: 1px solid #64748b;
        border-radius: 4px;
        background: #ffffff;
        box-sizing: border-box;
      }
      .hsht-date-box:focus-within {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
      }
      .hsht-date-part {
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
      .hsht-date-dd,
      .hsht-date-mm { width: 22px; }
      .hsht-date-yyyy { width: 38px; }
      .hsht-date-sep {
        color: #475569;
        font-weight: bold;
        padding: 0 2px;
        user-select: none;
      }

      .hsht-btn {
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
      .hsht-btn:hover { opacity: 0.92; transform: translateY(-1px); }
      .hsht-btn:disabled { background: #9ca3af; cursor: wait; transform: none; }
      .hsht-btn-reset {
        background: linear-gradient(135deg, #b91c1c, #dc2626);
        padding: 0 10px;
      }
      .hsht-btn-zalo {
        background: linear-gradient(135deg, #0068ff, #0284c7);
      }
      .hsht-btn-zalo.copied {
        background: linear-gradient(135deg, #059669, #10b981);
      }
      .hsht-count-badge {
        font-size: 13px;
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fecaca;
        padding: 3px 10px;
        border-radius: 20px;
        font-weight: bold;
      }

      /* VÙNG CHỨA BẢNG */
      .hsht-body-area {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .hsht-table-wrap {
        flex: 0 1 auto;
        max-height: 100%;
        width: 100%;
        overflow-x: auto;
        overflow-y: auto;
        border: 1px solid #475569;
        background: #ffffff;
        position: relative;
      }
      .hsht-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-family: "Times New Roman", serif;
      }
      .hsht-table thead th {
        position: sticky;
        top: 0;
        z-index: 20;
        background: #dbeafe;
        color: #0c4a6e;
        font-weight: bold;
        text-align: center;
        padding: 8px 6px;
        font-size: 14px;
        border: 1px solid #475569 !important;
      }
      .hsht-table td {
        border: 1px solid #94a3b8 !important;
        padding: 7px 8px;
        font-size: 14px;
        vertical-align: middle;
        word-wrap: break-word;
        overflow-wrap: anywhere;
      }
      .hsht-col-stt { width: 55px; text-align: center; font-weight: bold; }
      .hsht-col-gv  { width: 220px; font-weight: bold; color: #0f172a; text-align: left; }
      .hsht-col-nd  { text-align: left; color: #1e293b; line-height: 1.4; }
      .hsht-col-tt  { width: 175px; text-align: center; }

      .hsht-sub-meta {
        display: block;
        font-size: 12px;
        color: #64748b;
        font-style: italic;
        margin-top: 2px;
      }
      .hsht-status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fecaca;
        cursor: pointer;
        transition: all 0.18s ease;
        user-select: none;
      }
      .hsht-status-badge:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(185, 28, 28, 0.22);
        text-decoration: underline;
      }
      .hsht-status-warn {
        color: #b45309;
        background: #fffbeb;
        border: 1px solid #fde68a;
      }
      .hsht-status-warn:hover {
        box-shadow: 0 2px 6px rgba(180, 83, 9, 0.22);
      }
      .hsht-empty {
        text-align: center;
        padding: 20px !important;
        font-style: italic;
        color: #64748b;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. HÀM TIỆN ÍCH NGÀY THÁNG & CHUẨN HÓA CHỮ
  function hsht_chuanHoaChu(ch) {
    if (!ch) return "";
    return String(ch).normalize("NFC").toLowerCase().replace(/[\s\uFEFF\xA0]+/g, "");
  }

  function hsht_thongBaoTaiCho(tieuDe, noiDung, loai) {
    if (typeof hienThongBaoUI === "function") {
      hienThongBaoUI(tieuDe, noiDung, loai || "warning");
    } else {
      alert(tieuDe + ": " + noiDung);
    }
  }

  function hsht_taoHtmlO_Ngay(prefix) {
    return `
      <div class="hsht-date-box">
        <input type="text" id="${prefix}_dd" class="hsht-date-part hsht-date-dd" maxlength="2" placeholder="dd" inputmode="numeric" autocomplete="off">
        <span class="hsht-date-sep">/</span>
        <input type="text" id="${prefix}_mm" class="hsht-date-part hsht-date-mm" maxlength="2" placeholder="mm" inputmode="numeric" autocomplete="off">
        <span class="hsht-date-sep">/</span>
        <input type="text" id="${prefix}_yyyy" class="hsht-date-part hsht-date-yyyy" maxlength="4" placeholder="yyyy" inputmode="numeric" autocomplete="off">
      </div>
    `;
  }

  function hsht_ganSuKienO_Ngay(prefix) {
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
      p.el.addEventListener("focus", function () { this.select(); });
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
          hsht_taiDuLieu();
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

  function hsht_layChuoiNgay(prefix) {
    const dd = (document.getElementById(`${prefix}_dd`)?.value || "").trim();
    const mm = (document.getElementById(`${prefix}_mm`)?.value || "").trim();
    const yy = (document.getElementById(`${prefix}_yyyy`)?.value || "").trim();
    if (!dd || !mm || !yy) return "";
    return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yy}`;
  }

  function hsht_setChuoiNgay(prefix, dd, mm, yyyy) {
    const ddEl = document.getElementById(`${prefix}_dd`);
    const mmEl = document.getElementById(`${prefix}_mm`);
    const yyEl = document.getElementById(`${prefix}_yyyy`);
    if (ddEl) ddEl.value = String(dd).padStart(2, "0");
    if (mmEl) mmEl.value = String(mm).padStart(2, "0");
    if (yyEl) yyEl.value = String(yyyy);
  }

  function hsht_parseNgay(str) {
    if (!str) return 0;
    const p = String(str).trim().split("/");
    if (p.length !== 3) return 0;
    const d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function hsht_setNgayMacDinh() {
    const homNay = new Date();
    const namNay = homNay.getFullYear();
    const dd = homNay.getDate();
    const mm = homNay.getMonth() + 1;
    hsht_setChuoiNgay("hsht_tu", dd, mm, namNay - 1);
    hsht_setChuoiNgay("hsht_den", dd, mm, namNay);
  }

  // 3. DỰNG KHUNG GIAO DIỆN
  function hsht_dungGiaoDien() {
    const container = hsht_damBaoKhungTab();
    if (!container) return;

    hsht_napCSS();
    container.innerHTML = `
      <div class="hsht-layout">
        <div class="hsht-header">
          <div class="hsht-title">HỒ SƠ CHƯA HOÀN THÀNH</div>
          <div class="hsht-subtitle-row">
            <span>Từ ngày</span>
            ${hsht_taoHtmlO_Ngay("hsht_tu")}
            <span>đến ngày</span>
            ${hsht_taoHtmlO_Ngay("hsht_den")}
            <button id="hsht_btn_xem" class="hsht-btn" onclick="hsht_taiDuLieu()">🔍 Kiểm tra</button>
            <button class="hsht-btn hsht-btn-reset" onclick="hsht_datLai()" title="Đặt lại 1 năm gần nhất">↻</button>
            <button id="hsht_btn_zalo" class="hsht-btn hsht-btn-zalo" onclick="hsht_copyZalo()" title="Sao chép danh sách gửi nhóm Zalo">📋 Copy gửi Zalo</button>
            <span id="hsht_badge_count" class="hsht-count-badge" style="display:none;">0 hồ sơ</span>
          </div>
        </div>

        <div class="hsht-body-area">
          <div class="hsht-table-wrap">
            <table class="hsht-table">
              <thead>
                <tr>
                  <th class="hsht-col-stt">STT</th>
                  <th class="hsht-col-gv">Họ tên</th>
                  <th>Nội dung kiểm tra</th>
                  <th class="hsht-col-tt">Tình trạng</th>
                </tr>
              </thead>
              <tbody id="hsht_tbody">
                <tr><td colspan="4" class="hsht-empty">${HSHT_SPINNER_HTML}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    hsht_ganSuKienO_Ngay("hsht_tu");
    hsht_ganSuKienO_Ngay("hsht_den");
    hsht_setNgayMacDinh();
    hshtDaKhoiTao = true;
  }

  // 4. LỌC TỪ SHEET NHATKY & PHÂN LOẠI TRẠNG THÁI
  function hsht_renderBang(dsNhatKy) {
    const tbody = document.getElementById("hsht_tbody");
    const badge = document.getElementById("hsht_badge_count");
    if (!tbody) return;

    const tuMs = hsht_parseNgay(hsht_layChuoiNgay("hsht_tu"));
    const denMs = hsht_parseNgay(hsht_layChuoiNgay("hsht_den"));

    hshtDanhSach = (Array.isArray(dsNhatKy) ? dsNhatKy : [])
      .filter((row) => {
        const hoTen = String(row[0] || "").trim();
        if (!hoTen) return false;

        const ngayMs = hsht_parseNgay(row[4]);
        if (ngayMs > 0 && (tuMs > 0 || denMs > 0)) {
          if (tuMs > 0 && ngayMs < tuMs) return false;
          if (denMs > 0 && ngayMs > denMs) return false;
        }
        return true;
      })
      .map((row) => {
        const kyTen = String(row[14] || "").trim();
        const daKy = kyTen !== "";
        return {
          hoTen: String(row[0] || "").trim(),
          nguoiKT: String(row[1] || "").trim(),
          boPhan: String(row[2] || "").trim(),
          ngayKT: String(row[4] || "").trim(),
          noiDung: String(row[5] || "").trim() || "(Chưa ghi nội dung)",
          maHS: String(row[16] || "").trim(),
          daKy: daKy,
          tinhTrang: daKy ? "Chưa nộp hồ sơ" : "Chưa ký xác nhận"
        };
      })
      .sort((a, b) => hsht_parseNgay(b.ngayKT) - hsht_parseNgay(a.ngayKT));

    if (badge) {
      const soChuaKy = hshtDanhSach.filter((i) => !i.daKy).length;
      const soChuaNop = hshtDanhSach.length - soChuaKy;
      badge.style.display = "inline-block";
      badge.innerText = `${hshtDanhSach.length} hồ sơ (${soChuaKy} chưa ký, ${soChuaNop} chưa nộp)`;
    }

    if (hshtDanhSach.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="hsht-empty" style="color:#059669; font-weight:bold;">✅ Tất cả hồ sơ trong khoảng thời gian này đã hoàn thành và nộp đầy đủ.</td></tr>`;
      return;
    }

    tbody.innerHTML = hshtDanhSach.map((item, idx) => {
      const metaPhu = [
        item.ngayKT ? `Ngày KT: ${item.ngayKT}` : "",
        item.nguoiKT ? `Người KT: ${item.nguoiKT}` : "",
        item.boPhan ? `Bộ phận: ${item.boPhan}` : "",
        item.maHS ? `Mã HS: ${item.maHS}` : ""
      ].filter(Boolean).join(" • ");

      const clsTrangThai = item.daKy ? "hsht-status-badge hsht-status-warn" : "hsht-status-badge";

      return `
        <tr>
          <td class="hsht-col-stt">${idx + 1}</td>
          <td class="hsht-col-gv">${item.hoTen}</td>
          <td class="hsht-col-nd">
            ${item.noiDung}
            ${metaPhu ? `<span class="hsht-sub-meta">${metaPhu}</span>` : ""}
          </td>
          <td class="hsht-col-tt">
            <span class="${clsTrangThai}" onclick="hsht_moHoSoGhiSo(${idx})" title="Bấm để mở hồ sơ này lên giao diện Ghi sổ kiểm tra">${item.tinhTrang}</span>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 4.5 MỞ CUỘC KIỂM TRA LÊN UI GHI SỔ (CHỈ MỞ ĐÚNG NGƯỜI KIỂM TRA HOẶC NGƯỜI ĐƯỢC KIỂM TRA)
  window.hsht_moHoSoGhiSo = function (idx) {
    const item = hshtDanhSach[idx];
    if (!item) return;

    if (!item.maHS) {
      hsht_thongBaoTaiCho(
        "⚠️ THIẾU MÃ HỒ SƠ",
        "Hồ sơ này chưa có Mã HS hợp lệ nên không thể nạp lên giao diện Ghi sổ.",
        "warning"
      );
      return;
    }

    // Lấy tài khoản đang đăng nhập & đối chiếu tên GV / Người KT từ window.ruongbac
    const emailHienTai = hsht_chuanHoaChu(
      window.skttktoanc || sessionStorage.getItem("SKT_DINHDANH_TAIK") || sessionStorage.getItem("SKT_USER_TAIK") || ""
    );

    const dsGV = (window.ruongbac && Array.isArray(window.ruongbac.conmeo)) ? window.ruongbac.conmeo : [];
    const dsNKT = (window.ruongbac && Array.isArray(window.ruongbac.chocon)) ? window.ruongbac.chocon : [];

    const tenGV_User = dsGV.find((u) => hsht_chuanHoaChu(u.taik) === emailHienTai)?.tenn || "";
    const tenNKT_User = dsNKT.find((u) => hsht_chuanHoaChu(u.taik) === emailHienTai)?.tenn || "";

    const laGVcuaHoSo = tenGV_User !== "" && hsht_chuanHoaChu(item.hoTen) === hsht_chuanHoaChu(tenGV_User);
    const laNKTcuaHoSo = tenNKT_User !== "" && hsht_chuanHoaChu(item.nguoiKT) === hsht_chuanHoaChu(tenNKT_User);

    // Chặn ngay tại UI Hồ sơ chưa hoàn thành nếu không phải người kiểm tra hoặc người được kiểm tra
    if (!laGVcuaHoSo && !laNKTcuaHoSo) {
      hsht_thongBaoTaiCho(
        "⛔ KHÔNG ĐÚNG ĐỐI TƯỢNG",
        `Bạn chỉ được phép mở hồ sơ do chính mình kiểm tra hoặc được kiểm tra.\n\nHồ sơ này thuộc về:\n• Người được kiểm tra: ${item.hoTen}\n• Người kiểm tra: ${item.nguoiKT || "(Chưa rõ)"}\n\nVui lòng chọn đúng hồ sơ của bạn.`,
        "warning"
      );
      return;
    }

    // Đúng đối tượng -> Chuyển sang UI Ghi sổ và gọi hồ sơ lên bảng
    const nutMenuGhiSo = document.querySelector('.menu-btn[onclick*="TabNhapLieu"]');
    if (typeof chuyentth === "function") {
      chuyentth("TabNhapLieu", nutMenuGhiSo);
    }

    const cbMa = document.getElementById("cbMaHoSo");
    if (cbMa) {
      delete cbMa.dataset.oldValue;
      cbMa.classList.remove("input-dim-value");
      cbMa.value = item.maHS;
    }

    if (typeof khindthd === "function") {
      khindthd("MAHS");
    }
  };

  // 5. COPY NỘI DUNG GỬI NHÓM ZALO
  window.hsht_copyZalo = function () {
    if (!hshtDanhSach || hshtDanhSach.length === 0) {
      hsht_thongBaoTaiCho("THÔNG BÁO", "Hiện không có hồ sơ nào chưa hoàn thành để sao chép.", "info");
      return;
    }

    const tuNgay = hsht_layChuoiNgay("hsht_tu") || "...";
    const denNgay = hsht_layChuoiNgay("hsht_den") || "...";

    const dongChiTiet = hshtDanhSach.map((item, idx) => {
      const ngayStr = item.ngayKT ? ` (${item.ngayKT})` : "";
      const nktStr = item.daKy && item.nguoiKT ? ` [Người KT: ${item.nguoiKT}]` : "";
      return `${idx + 1}. ${item.hoTen}${ngayStr} — Nội dung: ${item.noiDung} — Tình trạng: ${item.tinhTrang}${nktStr}`;
    }).join("\n");

    const noiDungZalo =
      `📢 THÔNG BÁO HỒ SƠ KIỂM TRA NỘI BỘ CHƯA HOÀN THÀNH\n` +
      `(Từ ngày ${tuNgay} đến ngày ${denNgay})\n\n` +
      `Hiện còn ${hshtDanhSach.length} hồ sơ chưa hoàn thành:\n` +
      `${dongChiTiet}\n\n` +
      `Kính đề nghị các đồng chí có tên trên truy cập hệ thống để kiểm tra, ký xác nhận và nộp hoàn thành hồ sơ. Trân trọng!`;

    const baoThanhCong = () => {
      const btn = document.getElementById("hsht_btn_zalo");
      if (btn) {
        const oldHtml = "📋 Copy gửi Zalo";
        btn.classList.add("copied");
        btn.innerHTML = "✅ Đã copy! Dán vào Zalo";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = oldHtml;
        }, 3000);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(noiDungZalo).then(baoThanhCong).catch(() => {
        hsht_copyFallback(noiDungZalo, baoThanhCong);
      });
    } else {
      hsht_copyFallback(noiDungZalo, baoThanhCong);
    }
  };

  function hsht_copyFallback(text, onDone) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      if (onDone) onDone();
    } catch (e) {
      alert("Không thể tự động copy, vui lòng thử lại.");
    }
    document.body.removeChild(ta);
  }

  // 6. ĐỒNG BỘ MỚI NHẤT TỪ SHEET NHATKY QUA skt_layds_mhs_cn() CÓ SẴN
  window.hsht_taiDuLieu = function () {
    if (hshtDangTai) return;

    const btn = document.getElementById("hsht_btn_xem");
    const tbody = document.getElementById("hsht_tbody");
    const badge = document.getElementById("hsht_badge_count");
    hshtDangTai = true;

    if (btn) {
      btn.disabled = true;
      btn.innerText = "Đang tải...";
    }
    if (badge) badge.style.display = "none";
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="hsht-empty">${HSHT_SPINNER_HTML}</td></tr>`;
    }

    google.script.run
      .withSuccessHandler((kq) => {
        hshtDangTai = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "🔍 Kiểm tra";
        }
        if (kq && kq.tcon && Array.isArray(kq.dlnhatky_san)) {
          window.skt_kho_nhatky = kq.dlnhatky_san;
          hsht_renderBang(kq.dlnhatky_san);
        } else {
          hsht_renderBang(window.skt_kho_nhatky || []);
        }
      })
      .withFailureHandler((err) => {
        hshtDangTai = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "🔍 Kiểm tra";
        }
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="4" class="hsht-empty" style="color:#dc2626;">Lỗi tải dữ liệu lưu nhật ký: ${err.message}</td></tr>`;
        }
      })
      .skt_layds_mhs_cn();
  };

  window.hsht_datLai = function () {
    hsht_setNgayMacDinh();
    hsht_taiDuLieu();
  };

  // HÀM MỞ TAB (GỌI TỪ MENU DỌC)
  window.hsht_moTab = function (nutMenu) {
    hsht_damBaoKhungTab();
    if (typeof chuyentth === "function") {
      chuyentth(HSHT_CONTAINER_ID, nutMenu);
    }
    if (nutMenu) {
      nutMenu.classList.add("active");
    }
    if (!hshtDaKhoiTao) {
      hsht_dungGiaoDien();
      hsht_taiDuLieu();
    }
  };
})();
