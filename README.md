# 🌌 Cosmic Ball Blast (WebXR)

**Cosmic Ball Blast** là một tựa game giải đố tương tác vật lý nền tảng Thực tế ảo (VR) được phát triển hoàn toàn bằng thư viện Three.js và Cannon-es. Trò chơi kết hợp giữa lối chơi ngắm ném (shooting/tossing) nhịp độ nhanh và tư duy nhận diện, pha trộn màu sắc, mang đến trải nghiệm không gian 3D sống động và đầy thử thách.

## 📖 Tổng quan & Mục tiêu trò chơi
Đóng vai một phi hành gia trôi nổi trong không gian không trọng lực, nhiệm vụ của bạn là thu thập các viên bi năng lượng (Cosmic Balls) và sắp xếp chúng vào đúng các lỗ hổng trên vành đai thiên thạch xung quanh bạn.
*   **Chế độ Thường (Normal):** Thư giãn, không giới hạn thời gian, thích hợp để làm quen với cảm giác ném bi Zero-G và học cách pha màu.
*   **Chế độ Khó (Hard):** Cuộc đua với thời gian (Time Attack). Vòng xoay thay đổi liên tục và thử thách trí nhớ, yêu cầu sự chính xác và phản xạ nhanh nhạy.

---

## ⚙️ Các Cơ chế Gameplay (Mechanics)

Trò chơi xoay quanh các cơ chế tương tác vật lý trực tiếp thay vì bấm nút đơn thuần:
*   **Vật lý Không trọng lực (Zero-G):** Các viên bi bị ném đi sẽ bay theo đường thẳng, nảy bật khi va đập vào hệ thống "tường tàng hình" ở ranh giới khu vực chơi (phía sau, sàn, trần, trái, phải).
*   **Pha màu bằng Lực (Action-based Mixing):** Để tạo ra màu mới (Cam, Xanh Lá, Tím) phục vụ cho Level 2, người chơi không thể chỉ để 2 viên bi chạm nhẹ vào nhau. Bạn phải dùng lực ném chọi chúng vào nhau (vận tốc > 0.5m/s), hoặc cầm 2 tay đập mạnh chúng lại. Quá trình này sẽ phát ra tiếng "Ting" và tiếng nổ báo hiệu thành công.
*   **Bi Đổi Màu (Cycle Ball):** Đây là viên bi đặc biệt xuất hiện ngay từ đầu game. Nó được bao bọc bởi một lớp hào quang (Aura) phát sáng và **tự động chuyển đổi màu sắc liên tục mỗi 4 giây** qua tất cả các màu có trong game. Thay vì phải tự tay pha màu, người chơi có thể chờ viên bi này chuyển sang đúng màu mình cần và nhanh tay ném nó vào vành đai để nhận lượng điểm thưởng rất lớn (`+400` điểm).
*   **Hệ thống Bơm bi (Auto-Spawner):** Hoạt động độc quyền ở Level 2. Nếu số lượng bi Đỏ, Vàng, Xanh dương tụt xuống dưới 1, hệ thống sẽ tự động sinh thêm bi mới sau 2 giây để người chơi không bao giờ bị kẹt.
*   **Tinh thể Không gian (Crystals):** Trôi lơ lửng ngẫu nhiên quanh người chơi và dừng lại ở khoảng cách cố định trước mặt. Tinh thể phát sáng có thể ném vỡ để lấy điểm thưởng, trong khi tinh thể tối màu hoạt động như những "bức tường nảy" gây cản trở.
*   **Chướng ngại vật Hard Mode:**
    *   **Bi Bom (Bomb):** Viên bi với màu ngẫu nhiên nằm trong level hiện tại chớp trắng cảnh báo và nổ tung sau 4 giây, tạo ra sóng xung kích đẩy văng mọi viên bi xung quanh.
    *   **Bảng màu ẩn:** Vành đai mục tiêu sẽ nhấp nháy tàng hình định kỳ và thay đổi tốc độ xoay khiến việc nhắm ném khó khăn hơn.
    *   **Hiệu ứng Báo động đỏ (Death Countdown):** Khi thời gian đếm ngược chỉ còn 10 giây cuối cùng, hệ thống sẽ phát âm thanh báo động dồn dập (`countdown.mp3`), đồng thời đồng hồ hiển thị sẽ liên tục nhấp nháy Đỏ - Vàng để tạo áp lực kịch tính cho người chơi.

---

## 🏆 Hệ thống Điểm số & Combo (Scoring)

Mọi hành động chuẩn xác trong game đều được ghi nhận để tạo nên hệ thống điểm số cạnh tranh:
*   **Ghi bàn cơ bản:** `+100` điểm khi ném/đặt bi vào đúng vành đai màu.
*   **Phá tinh thể bí mật:** `+400` điểm khi đập vỡ thành công các tinh thể phát sáng.
*   **Xử lý Bi Đổi Màu (Cycle Ball):** `+400` điểm khi ném trúng đích.
*   **Xử lý Bom:** `+250` điểm.
*   **Hệ thống Combo (Chuỗi ghi bàn):** Từ lần ném trúng đích thứ 2 liên tiếp, bạn sẽ nhận được điểm thưởng Combo (`+120` điểm cho x2, và cộng dồn thêm `10` điểm cho mỗi mốc tiếp theo). Ném sai màu hoặc ném hụt ra ngoài vũ trụ sẽ lập tức **Reset Combo về 0**.
*   **Hình phạt (Chế độ Khó):** Mỗi lần ném sai màu hoặc ném hụt, bạn sẽ bị trừ `1` giây thời gian đếm ngược.

---

## 🖥️ Hệ thống Giao diện (UI/HUD)

Giao diện được thiết kế theo phong cách Cyber/Sci-fi với font chữ Montserrat mạnh mẽ:
*   **Menu & Overlays HTML:** Các màn hình phủ 2D tinh tế cho phép chọn Chế độ chơi, hiển thị Màn hình Chiến thắng (Kèm tổng điểm & Thời gian), và màn hình Game Over.
*   **Bảng HUD 3D (Không gian VR):** Bảng thông tin điện tử lơ lửng trong vũ trụ, tự động phóng to/thu nhỏ (Scale) dựa theo góc nhìn và khoảng cách của người chơi để luôn đảm bảo độ sắc nét. Hiển thị thông tin trực tiếp về: LEVEL, THỜI GIAN, ĐIỂM SỐ và Chuỗi COMBO.
*   **Nhận diện tay cầm (Ball Color Name):** Thông báo thời gian thực trên HUD cho biết bạn đang cầm viên bi màu gì (Kèm mã màu Hex phát sáng). Nếu đang cầm Bi Đổi Màu, tên màu hiển thị cũng sẽ nhảy liên tục theo màu hiện tại của viên bi.
*   **Toast Notification:** Thông báo nổi 3D xuất hiện chớp nhoáng giữa màn hình khi bạn Pha màu thành công hoặc Phá vỡ tinh thể.
*   **Audio Controls:** Thanh trượt (Slider) ở góc màn hình giúp điều chỉnh độc lập Âm lượng Nhạc nền và Âm lượng Hiệu ứng.

---

## 🎵 Hệ thống Âm thanh (Audio Assets)

Game tích hợp âm thanh đa không gian (Positional Audio) để mang lại cảm giác chân thực:
1.  **`bgm.mp3`**: Nhạc nền không gian sâu thẳm, lặp lại liên tục.
2.  **`snap.mp3`**: Âm thanh "tách" giòn giã phát ra ngay tại vị trí lỗ khi bi khớp đúng vành đai.
3.  **`explosion.mp3`**: Tiếng nổ lớn (Phát ra khi Bi Bom nổ hoặc khi 2 viên bi va đập để pha màu).
4.  **`ting.mp3`**: Âm thanh trong trẻo báo hiệu bạn vừa đập vỡ Tinh thể hoặc Pha màu thành công.
5.  **`error.mp3`**: Tiếng còi báo lỗi khi bạn ném sai màu vào lỗ hoặc ném bi bay đi mất hút.
6.  **`countdown.mp3`**: Âm thanh báo động dồn dập trong 10 giây cuối cùng của Chế độ Khó.
7.  **`levelup.mp3` / `victory.mp3` / `gameover.mp3`**: Nhạc hiệu cho các sự kiện trạng thái của màn chơi.

---

## 🎮 Cơ chế Điều khiển (Controls)

**Chơi trên Kính VR (Meta Quest, Pico...):**
*   Truy cập bằng trình duyệt WebXR và click vào nút **"ENTER VR"**.
*   **Tương tác nhập vai:** Sử dụng mô hình bàn tay thực tế ảo (specialized hand prefabs) để tăng tính chân thực và đắm chìm trong không gian vũ trụ.
*   **Gắp bi & Ném bi:** Tương tác trực tiếp, bấm giữ nút **Trigger** (Cò súng) để cầm bi. Vung tay vật lý và thả **Trigger** để ném bi vào không gian. 

**Chơi trên PC (Chuột & Bàn phím):**
*   **Gắp bi:** Bấm và giữ **Chuột trái** vào viên bi đang lơ lửng.
*   **Quan sát không gian:** Click giữ Chuột trái vào vùng không gian trống và rê chuột để xoay camera 360 độ (OrbitControls).
*   **Ném bi:** Trong lúc đang giữ viên bi, rê chuột mạnh về hướng mục tiêu để lấy đà và **thả chuột** để phóng (Lực ném: 22.0). Khám phá các hành tinh nền bằng cách click chuột trái để nhận thông báo trinh sát.

---

## 🛠️ Công nghệ & Cấu trúc thư mục

*   **Core:** `HTML5`, `CSS3`, `JavaScript (ES6 Modules)`.
*   **Đồ họa 3D:** Thư viện `Three.js` (WebXR API, Raycaster, OrbitControls).
*   **Vật lý:** Thư viện `Cannon-es` (Kinematic/Dynamic bodies, Collision, Velocity).
```text
├── index.html               # Cấu trúc UI, Overlays, WebXR Button, Load Fonts
├── index.js                 # Khởi tạo Scene, Camera, Light, Audio Listener, Render Loop
├── textures/                # Chứa hình ảnh (vũ trụ, các hành tinh...)
├── src/
│   ├── core/
│   │   ├── GameManager.js   # Quản lý Logic game, HUD, Spawner, Scoring, Mix màu
│   │   ├── Physics.js       # Không trọng lực, ma sát, tường tàng hình
│   │   └── VRManager.js     # Xử lý tương tác Chuột PC & VR Controller
│   ├── data/
│   │   └── LevelData.js     # Config mảng màu cho 3 Level
│   └── sounds/              # Chứa toàn bộ hiệu ứng âm thanh (.mp3)
