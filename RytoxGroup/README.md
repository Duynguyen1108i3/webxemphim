# 🎬 RytoxGroup iOS — Native Apple Streaming Application

Ứng dụng xem phim và anime streaming cao cấp dành cho **iOS 16.0 – iOS 18.0**, được phát triển 100% bằng **SwiftUI** & **Swift 5.9+**, chuyển đổi toàn diện từ nền tảng web full-stack **RytoxGroup** (`webxemphim`).

Dự án sở hữu trọn vẹn ngôn ngữ thiết kế **Liquid Glass (Apple WWDC25)**, hệ thống **Media Aggregator 4 nguồn**, cơ chế phát **Direct HLS Native + Fallback Matrix**, và hỗ trợ xuất **File IPA cài trực tiếp qua TrollStore** (không cần chứng chỉ/revoke).

---

## 🌟 TÍNH NĂNG CỐT LÕI

### 1. Hệ Thống Giao Diện Pure Liquid Glass (Design System)
- **Kính lỏng Apple WWDC25**: Sử dụng công thức tính toán khúc xạ quang học chuyển đổi trực tiếp từ web `styles.css`:
  - Độ mờ kính (Blur): `round(val * 32 + 6)px`
  - Nền mờ kính: `0.92 - (val * 0.70)`
  - Viền phản chiếu (Border Highlight): `0.08 + (val * 0.22)`
  - Ánh sáng phản xạ (Specular Glare): `0.04 + (val * 0.20)`
- **Ambient Fluid Drift Background**: 3 cụm gradient lơ lửng chuyển động mượt mà (60fps) trên nền cinema pitch-black `#0e0f14`.
- **Thanh Điều Hướng Kính Lỏng**: Thanh dock điều hướng nổi dạng pill với phản hồi xúc giác (Haptic Feedback).
- **Trình Tùy Chỉnh Kính Lỏng (Settings)**: Thanh trượt cho phép người dùng tự điều chỉnh độ trong suốt và ánh sáng môi trường theo sở thích theo thời gian thực.

### 2. Bộ Tổng Hợp Nguồn Phim (Media Aggregator Engine - 4 Nguồn)
- **TMDB Adapter**: Dữ liệu phim thịnh hành, diễn viên, poster và thông tin phim quốc tế chuẩn 4K.
- **Phim4K (PhimAPI) Adapter**: Kho phim Vietsub, Thuyết minh, phim bộ, phim lẻ, truyền hình cập nhật liên tục.
- **AniMapper Adapter**: Danh mục Anime Nhật Bản với metadata Romaji và tập mới nhất.
- **Cinemeta Adapter**: Tích hợp danh mục Stremio cho việc đối soát mã IMDB.

### 3. Trình Phát Video HLS & Dynamic Fallback Matrix
- **Native HLS Player (`AVPlayer`)**: Phát trực tiếp các luồng `.m3u8` chất lượng 1080p/4K mượt mà, hỗ trợ AirPlay, Picture-in-Picture (PiP).
- **Cơ chế Fallback Tự Động**: Khi không có luồng HLS trực tiếp, app tự động chuyển đổi sang nguồn Embed Player an toàn với bộ chặn quảng cáo tích hợp (`Vidsrc.cc`, `SuperEmbed`, `PhimAPI Embed`).
- **Phụ Đề Đa Ngôn Ngữ**: Tự động kết nối Stremio Subtitles Addon để tải và hiển thị phụ đề WebVTT/SRT.
- **Heartbeat Theo Dõi Tiến Trình**: Tự động gửi tín hiệu lưu tiến độ xem (từng giây) về tài khoản mỗi 10 giây một lần. Tự động đánh dấu hoàn thành khi xem trên 90%.

### 4. Tìm Kiếm Thông Minh & Telex Safe
- Bộ gõ tìm kiếm tích hợp cơ chế **Debounce 400ms**, chống triệt để tình trạng nhân đôi ký tự khi gõ tiếng Việt có dấu (Telex/VNI) trên bàn phím iOS.
- Hiển thị kết quả tìm kiếm dạng lưới thời gian thực.

### 5. Quản Lý Tài Khoản & Danh Sách Yêu Thích
- Đăng nhập, Đăng ký (tuân thủ tiêu chuẩn mật khẩu mạnh NIST CSF 2.0).
- Lưu trữ Token bảo mật tuyệt đối qua **Apple Keychain** (thay thế HTTP-Only Cookies trên web).
- Hỗ trợ đa hồ sơ (Multi-profile: Người lớn & Trẻ em).
- Mục **Danh sách của tôi (My List)** và **Lịch sử xem dở** cho phép tiếp tục phát phim tại điểm dừng trước đó.

---

## 📂 CẤU TRÚC THƯ MỤC XCODE

```
RytoxGroup/
├── RytoxGroup.xcodeproj/       # Xcode Project File (mở trực tiếp bằng Xcode 15+)
│   └── project.pbxproj
├── RytoxGroup/
│   ├── App/
│   │   ├── RytoxGroupApp.swift # Entry Point (@main) + AVAudioSession
│   │   ├── ContentView.swift   # Root View & Tab Coordinator
│   │   └── Info.plist          # Config bảo mật ATS & Audio Background
│   ├── Config/
│   │   └── AppConfig.swift     # Domain endpoints & API keys
│   ├── DesignSystem/           # Ngôn ngữ thiết kế Pure Liquid Glass
│   │   ├── LiquidGlassTheme.swift
│   │   ├── LiquidGlassModifier.swift
│   │   ├── GlassButtonStyle.swift
│   │   ├── Typography.swift
│   │   ├── ColorTokens.swift
│   │   ├── AmbientBackgroundView.swift
│   │   └── SpringAnimations.swift
│   ├── Models/                 # DTOs & Codable Data Models
│   │   ├── MovieModels.swift
│   │   ├── AuthModels.swift
│   │   └── UserModels.swift
│   ├── State/                  # State Managers (@Observable / ObservableObject)
│   │   ├── AuthManager.swift
│   │   ├── PlaybackManager.swift
│   │   └── FavoritesManager.swift
│   ├── Networking/             # API Client & Adapters
│   │   ├── APIEndpoint.swift
│   │   ├── NetworkClient.swift
│   │   ├── ImageProxy.swift
│   │   ├── SubtitleService.swift
│   │   ├── MovieService.swift  # ⭐ Unified Facade
│   │   ├── AuthService.swift
│   │   └── Adapters/
│   │       ├── TMDBAdapter.swift
│   │       ├── Phim4KAdapter.swift
│   │       ├── AniMapperAdapter.swift
│   │       └── CinemetaAdapter.swift
│   ├── Views/
│   │   ├── Navigation/         # Top Bar, Bottom Dock, Search, Settings
│   │   ├── Home/               # Hero Banner, Movie Rows, Cards
│   │   ├── Detail/             # Movie Detail Sheet, Episode Picker
│   │   ├── Player/             # Native HLS + Embed Player + Controls
│   │   ├── Auth/               # Login, Register, Forgot Password
│   │   ├── Profile/            # Watch History & My List
│   │   └── Shared/             # Async Image, Badges, Glass Card, Shimmer
│   ├── Utils/                  # Keychain, Cache, Formatters, Validators
│   └── Assets.xcassets/        # AppIcon, AccentColor, BackgroundDark
├── build_ipa.sh                # Script xuất file IPA tự động cho TrollStore
├── ExportOptions.plist          # Cấu hình đóng gói IPA
└── README.md
```

---

## 🚀 HƯỚNG DẪN BUILD & XUẤT FILE IPA CHO TROLLSTORE

### Cách 1: Xuất IPA Tự Động Bằng Terminal (Khuyên dùng)

1. Mở Terminal trên macOS.
2. Di chuyển vào thư mục `RytoxGroup`:
   ```bash
   cd /Users/tx/Documents/RytoxGroup/webxemphim/RytoxGroup
   ```
3. Chạy lệnh build:
   ```bash
   ./build_ipa.sh
   ```
4. Sau khi quá trình hoàn tất, file `RytoxGroup.ipa` sẽ được tạo ngay tại thư mục gốc:
   ```
   RytoxGroup/RytoxGroup.ipa
   ```

---

### Cách 2: Mở và Build Trực Tiếp Trong Xcode

1. Mở file `RytoxGroup.xcodeproj` bằng **Xcode 15** trở lên:
   ```bash
   open RytoxGroup.xcodeproj
   ```
2. Chọn thiết bị đích là **Any iOS Device (arm64)** hoặc **iPhone Simulator** (ví dụ: iPhone 15 Pro / iPhone 16 Pro).
3. Nhấn tổ hợp phím **⌘ + R** để chạy trực tiếp trên Simulator / Máy thật.
4. Để xuất file cài đặt thủ công:
   - Vào thanh Menu: **Product -> Archive**.
   - Khi cửa sổ Organizer mở ra, chọn **Distribute App** -> **Development** -> **Export**.
   - Đặt tên file là `RytoxGroup.ipa`.

---

## 📲 CÁCH CÀI ĐẶT QUA TROLLSTORE (TRÊN IPHONE / IPAD)

1. Chuyển file `RytoxGroup.ipa` từ máy Mac sang iPhone/iPad thông qua một trong các cách:
   - **AirDrop**: Gửi trực tiếp từ Mac sang iPhone.
   - **iCloud Drive**: Lưu file vào iCloud Drive, trên iPhone mở app **Tệp (Files)**.
   - **Local Web Server**: Dùng lệnh `python3 -m http.server 8000` và tải file qua Safari.
2. Nhấn vào file `RytoxGroup.ipa` trên iPhone.
3. Chọn biểu tượng **Chia sẻ (Share)** -> Chọn **TrollStore** (hoặc mở app TrollStore -> nhấn dấu **+** ở góc trên -> chọn file `RytoxGroup.ipa`).
4. Nhấn **Install**. Ứng dụng RytoxGroup sẽ xuất hiện ngay trên Màn hình chính và có thể sử dụng vĩnh viễn không sợ bị thu hồi chứng chỉ (Revoke)!

---

## ⚙️ CẤU HÌNH TUỲ CHỌN NÂNG CAO

- **Địa chỉ Backend API**: Mặc định trỏ về `http://localhost:4000/api` hoặc domain server production. Bạn có thể cấu hình nhanh tại `AppConfig.swift` (`backendBaseURL`).
- **Khóa TMDB API**: Để kích hoạt dữ liệu mở rộng từ The Movie Database, bạn có thể điền API Key vào trường `tmdbApiKey` trong `AppConfig.swift`. Nếu không có key, app vẫn hoạt động 100% bình thường thông qua nguồn dự phòng Phim4K và AniMapper.
