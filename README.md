# StreamForge

StreamForge là monorepo nền tảng xem phim, gồm viewer React, trang quản trị React, Express API và các shared packages.

## Cấu trúc

- `apps/frontend` — ứng dụng người xem (Vite + React), chạy ở cổng `5173`.
- `apps/admin` — trang quản trị (Vite + React), chạy ở cổng `5174`.
- `apps/backend` — Express API, mặc định cổng `4000`.
- `packages/shared-types` — kiểu dữ liệu dùng chung.
- `packages/ui` — UI primitives dùng chung.
- `packages/utils` — các hàm thuần dùng chung.
- `prisma` — schema và seed dữ liệu.

## Yêu cầu

- Node.js 22
- npm 10

```bash
npm install
```

## Chạy local

Viewer frontend:

```bash
npm run dev:frontend
```

Mở http://localhost:5173.

Admin:

```bash
npm run dev:admin
```

Mở http://localhost:5174.

Backend:

```bash
npm run dev
```

Backend cần các biến môi trường sau trong `.env`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` và `COOKIE_SECRET`. Có thể thiết lập thêm `PORT`, `REDIS_URL`, `FRONTEND_URL` và `ADMIN_URL` khi cần.

## Kiểm tra chất lượng

```bash
npm run typecheck
npm test
npm run build
```

## Kiến trúc

Xem [docs/architecture/README.md](docs/architecture/README.md) để biết các quyết định kiến trúc và quy ước phân tách module.
