# Pattern Studio

Dựng rập may (sewing pattern) từ số đo cơ thể của một người, in 1:1 để cắt vải, và dựng
thân người 3D theo cùng bộ số đo để kiểm chứng.

## Số đo và thân

**Số đo**:
Một kích thước cơ thể đo bằng thước dây, đơn vị mm (riêng độ dốc vai tính bằng độ), định nghĩa
theo freesewing.
_Avoid_: thông số, size

**Số đo ước lượng**:
Số đo người dùng chưa nhập, được suy ra từ các số đo khác bằng dữ liệu mẫu; luôn hiện kèm nhãn
"ước lượng".
_Avoid_: số đo mặc định, giá trị đoán

**Thân**:
Mesh người 3D dựng theo bộ số đo của người dùng, dùng để kiểm chứng rập.
_Avoid_: mannequin, avatar, model, nhân vật

**Bảng lệch**:
Bảng so từng số đo: người dùng nhập, thân dựng được, chênh lệch. Thân không bao giờ được giấu
phần lệch.
_Avoid_: bảng sai số, báo cáo fit

**Tầng đo**:
Độ cao cố định trên thân nơi một số đo vòng được đo, tìm theo giải phẫu rồi khoá lại.
_Avoid_: lát cắt, level

**Nguồn thân**:
Nơi tính ra thân: **Browser** (mặc định, dữ liệu bake sẵn) hoặc **Service** (Python, dự phòng
để so sánh).
_Avoid_: backend, chế độ

**Gói dữ liệu thân**:
Dữ liệu Anny tính sẵn một lần cho mỗi giới, đủ để browser tự dựng thân mà không cần Python.
_Avoid_: model file, cache

## Rập

**Block**:
Rập nền thân áo không có kiểu dáng (Bella cho nữ, Brian cho nam); block quyết định giới của thân.
_Avoid_: mẫu, template, sloper

**Design**:
Một kiểu trang phục cụ thể dựng từ số đo, thường kế thừa một block (Teagan, Shale, váy ôm Bella).
_Avoid_: pattern, mẫu, trang phục

**Mảnh rập**:
Một mảnh vải cần cắt; luôn mang tên, canh sợi, số lượng cắt, dấu bấm, cờ lật đối xứng.
_Avoid_: panel, part, chi tiết

**Đường may**:
Đường hai mảnh rập được may vào nhau; là hình học gốc của mảnh rập.
_Avoid_: seamline

**Đường cắt**:
Đường kéo đi qua khi cắt vải, bằng đường may cộng phần chừa đường may; lưu tách khỏi đường may.
_Avoid_: cutline, viền

**Cử động**:
Lượng vải dư cộng vào số đo để mặc vào còn cử động được (wearing ease) hoặc để tạo dáng (design
ease); luôn là input tường minh.
_Avoid_: ease, độ rộng, dư

**Toile**:
Bản may thử bằng vải mộc từ rập in ra, để mặc thử và sửa rập trước khi cắt vải thật.
_Avoid_: bản mẫu, mock-up

**Bản ghi rập**:
File lưu cùng một rập gồm số đo, spec và phiên bản drafter, đủ để tái tạo đúng rập đó.
_Avoid_: export, snapshot

## Quan hệ

- Một **Block** quyết định giới của **Thân** và là gốc của nhiều **Design**.
- Một **Design** sinh ra nhiều **Mảnh rập**; mỗi mảnh có một **Đường may** và một **Đường cắt**.
- **Thân** và **Mảnh rập** dùng chung một bộ **Số đo**; **Thân** không bao giờ sinh ra **Mảnh rập**.
