/* ========================================================================== */
var ddungApi = "https://script.google.com/macros/s/AKfycbzpamXlYMj4jjw80iIFRFnk7Ct1Xi7dJDvcKa4_I3Y8Wq2SSa_5riYj9GDiR6dN63vT/exec"; 

// --- CÁC BIẾN CẤU HÌNH ĐỊNH DANH HỆ THỐNG ---
var PGV_LINK_LOGO = "https://i.postimg.cc/xjzpvXCm/Logo-HL.png"; 
var PGV_TEN_TRUONG = "Trường TH&THCS Tả Phời";
var PGV_TEN_TRUONG_UP = "TRƯỜNG TH&THCS TẢ PHỜI";
var PGV_TEN_PM = "Quản lý Nhiệm vụ";
var PGV_TEN_PM_UP = "QUẢN LÝ CÔNG VIỆC";
var PGV_PHIEN_BAN = "Phiên bản V2.0";
var PGV_TAC_GIA = "HOÀNG NGỌC LÂM";
var PGV_GOOGLE_CLIENT_ID = "1097384743947-1jdc5rhhmbu0s9jp5vgt814g4f4id7lu.apps.googleusercontent.com";
var PGV_MO_TA = "Hệ thống quản lý hiệu quả công việc nội bộ - " + PGV_TEN_TRUONG;

var DG_LINK_YOUTUBE = "https://www.youtube.com/playlist?list=PLbwoEbiWlf1A";

// ==================== BIẾN TOÀN CỤC HỆ THỐNG ====================
var PGV_TOKEN = "";
var PGV_ID_TC = "";

// ==================== KIỂM TRA CẤU HÌNH ====================
(function() {
    console.log("========================================");
    console.log("✅ ketnoi.js đã tải thành công");
    console.log("📡 API URL:", ddungApi);
    console.log("🏫 Trường:", PGV_TEN_TRUONG);
    console.log("📱 Ứng dụng:", PGV_TEN_PM_UP);
    console.log("🔑 Google Client ID:", PGV_GOOGLE_CLIENT_ID ? "Đã cấu hình ✓" : "CHƯA CẤU HÌNH ✗");
    console.log("🖼️ Logo URL:", PGV_LINK_LOGO);
    console.log("========================================");
    
    if (!PGV_GOOGLE_CLIENT_ID || PGV_GOOGLE_CLIENT_ID === "") {
        console.error("❌ LỖI NGHIÊM TRỌNG: PGV_GOOGLE_CLIENT_ID chưa được cấu hình!");
    }
    
    if (!ddungApi || ddungApi === "") {
        console.error("❌ LỖI NGHIÊM TRỌNG: ddungApi chưa được cấu hình!");
    }

    // Đồng bộ liên kết YouTube vào nút hướng dẫn (bổ sung độ trễ an toàn)
    if(typeof DG_LINK_YOUTUBE !== 'undefined') {
        setTimeout(function() {
            document.querySelectorAll('.app-link-hd').forEach(el => {
                if (el.tagName === 'A') el.href = DG_LINK_YOUTUBE;
            });
        }, 500); // Chờ 0.5 giây để đảm bảo giao diện đã load xong
    }
})();
