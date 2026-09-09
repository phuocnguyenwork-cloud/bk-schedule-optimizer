# BK Schedule Optimizer (HCMUT)

> Công cụ hỗ trợ sinh viên Trường Đại học Bách Khoa - ĐHQG-HCM (HCMUT) phân tích, lọc và tối ưu hóa thời khóa biểu đăng ký môn học.

---

## 🚀 Tính Năng Nổi Bật

1. **Parser dữ liệu đăng ký môn học**:
   - Sao chép và dán trực tiếp dữ liệu từ trang `mybk.hcmut.edu.vn`.
   - Hỗ trợ chuẩn hóa Unicode (NFC/NFD), xử lý cả bảng phân tách bằng Tab hoặc khoảng trắng liên tiếp.
   - Bóc tách đầy đủ cấu trúc: Môn học $\to$ Nhóm lớp (LT & BT/TN) $\to$ Buổi học (Thứ, Tiết, Phòng, Cơ sở, Tuần học).

2. **Lọc nhóm lớp theo nhu cầu**:
   - Lọc nhanh các tiền tố nhóm lớp: Nhóm A (chính quy), Nhóm CC (chất lượng cao), Nhóm L (chương trình liên kết / Dĩ An), Nhóm TN (thí nghiệm).

3. **Mô hình hóa dữ liệu & Tối ưu hóa**:
   - Sử dụng **Bitmasking 12-bit cho Tiết học** và **32-bit cho Tuần học** giúp kiểm tra xung đột thời gian với độ phức tạp $O(1)$.
   - **Ràng buộc cứng (Hard Constraints)**:
     - Không trùng lịch học (cùng Thứ, Tiết, Tuần).
     - Ràng buộc di chuyển 2 cơ sở: Nếu 2 ca học liên tiếp trong cùng ngày diễn ra ở 2 cơ sở khác nhau (CS1 - Q.10 và CS2 - Dĩ An) thì khoảng cách tối thiểu phải từ 2 tiết trở lên (~2 giờ).
   - **Tiêu chí tối ưu mềm (Soft Constraints)**:
     - Số ngày học trong tuần ít nhất (gom ngày).
     - Số ngày học trong tuần nhiều nhất (dàn đều).
     - Ưu tiên các ngày đầu tuần / cuối tuần.
     - Ưu tiên học ca sáng (tiết 1-6) / ca chiều (tiết 7-12).
     - Gom các môn chuyên ngành hoặc đại cương gần nhau trong cùng 1 ngày để giảm tiết trống.

---

## 📁 Cấu Trúc Dự Án

```
project1/
├── index.html               # Giao diện web chính
├── style.css                # CSS thiết kế giao diện
├── src/
│   ├── parser.js            # Module bóc tách dữ liệu mybk
│   ├── optimizer_model.js   # Mô hình hóa toán học, ràng buộc & chấm điểm
│   └── app.js               # Logic điều khiển UI và luồng xử lý
├── test_parser_full.js      # Unit test bóc tách dữ liệu
├── test_parser_spaces.js    # Unit test xử lý dữ liệu khoảng trắng
└── README.md
```

---

## 🛠️ Hướng Dẫn Sử Dụng

1. Mở trực tiếp file `index.html` trong trình duyệt web bất kỳ.
2. Hoặc chạy máy chủ tĩnh (Static Server) cục bộ:
   ```bash
   npx http-server -p 3000
   ```
3. Truy cập `http://localhost:3000` trên trình duyệt.
4. Sao chép thông tin thời khóa biểu môn học từ MyBK, dán vào ô nhập liệu và nhấn **"Phân tích dữ liệu"**.
