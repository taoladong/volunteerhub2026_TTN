# Playwright E2E Tests · VolunteerHub WebClient

End-to-end tests cho toàn bộ frontend, dùng Playwright + Chromium.

## Coverage hiện tại (58 test)

| Spec | Số test | Mô tả |
| --- | ---: | --- |
| `smoke.spec.js` | 6 | Landing render, events page, storageState đã login đủ 4 role |
| `routes-load.spec.js` | 33 | Load **mọi route** (6 public + 27 role-protected) — kiểm tra HTTP OK, không console error, không mojibake |
| `role-access.spec.js` | 6 | RBAC: deny route khác role + allow route đúng role |
| `public-flow.spec.js` | 5 | Click flow (landing → events), filter kỹ năng, map, redirect anon |
| `layout.spec.js` | 6 | Footer thống nhất, tên trường "Học viện Kỹ thuật Quân sự", không mojibake |
| `cancel-event.spec.js` | 1 | Bấm nút Hủy sự kiện trong ManageEvent → modal mở |

Toàn bộ test chạy **~1.6 phút** trên 1 worker.

## Yêu cầu trước khi chạy

5 services phải đang chạy:

| Service | Port |
| --- | --- |
| ApiGateway | 5000 |
| AuthService | 5002 |
| EventService | 5003 |
| FinanceService | 5004 |
| Vite dev server | 3000 |

Mở 5 terminal hoặc tự động hóa:

```powershell
dotnet run --project BaseCore.ApiGateway
dotnet run --project BaseCore.AuthService
dotnet run --project BaseCore.EventService
dotnet run --project BaseCore.FinanceService
cd BaseCore.WebClient ; npm run dev
```

## Chạy test

```powershell
cd BaseCore.WebClient

npm run test:e2e          # headless
npm run test:e2e:headed   # mở browser nhìn
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # xem report HTML
```

Chạy 1 spec:

```powershell
npx playwright test routes-load
```

## Cấu trúc

```
tests/e2e/
├── helpers/
│   ├── auth.js          # ACCOUNTS + storageStateFor(role)
│   ├── routes.js        # Liệt kê tất cả route theo role
│   └── page-utils.js    # detectMojibake, collectConsoleErrors
├── global-setup.js      # Login mỗi role 1 lần qua API → cache storageState
├── smoke.spec.js
├── routes-load.spec.js
├── role-access.spec.js
├── public-flow.spec.js
├── layout.spec.js
├── cancel-event.spec.js
└── README.md
```

## Pattern dùng auth

`global-setup.js` login 1 lần cho mỗi role qua API và lưu localStorage state vào
`tests/.auth/<role>.json`. Test sau dùng:

```js
import { storageStateFor } from './helpers/auth.js';
test.use({ storageState: storageStateFor('organizer') });
```

→ Tránh rate-limit `auth-sensitive` (8 login/phút/IP).

## Tài khoản demo

- `admin / admin123`
- `organizer / organizer123`
- `volunteer / volunteer123`
- `sponsor / sponsor123`

## Mojibake detection

Helper `detectMojibake()` quét `document.body.innerText` để tìm các pattern UTF-8
bị decode sai (`Ã`, `á»`, `Ä‘`, `â€™`, ...). Test fail kèm sample dòng dính lỗi
để dễ debug.

## Biến môi trường

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:3000` | URL frontend |
