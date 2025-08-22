# Auth Feature

Chức năng xác thực người dùng được tổ chức theo cấu trúc feature-based architecture.

## Cấu trúc thư mục

```
src/features/auth/
├── components/           # React components
│   ├── StepIndicator.tsx     # Chỉ thị bước
│   ├── EmailStep.tsx         # Bước nhập email
│   ├── PersonalStep.tsx      # Bước nhập thông tin cá nhân
│   ├── OTPStep.tsx           # Bước xác thực OTP
│   ├── SuccessStep.tsx       # Bước hoàn thành
│   ├── RegisterForm.tsx      # Form đăng ký chính
│   └── index.ts             # Export tất cả components
├── hooks/               # Custom React hooks
│   ├── useRegister.ts       # Hook quản lý trạng thái đăng ký
│   └── index.ts            # Export tất cả hooks
├── service.ts           # API services sử dụng axiosClient
└── index.ts            # Export tổng thể của feature
```

## Sử dụng

### Trong page component:

```tsx
import { RegisterForm, SuccessStep } from "@/features/auth/components";
import { CurrentStep } from "@/features/auth/hooks";
```

### API Services:

```tsx
import {
  validateEmail,
  sendOTP,
  resendOTP,
  verifyOTPAndRegister,
} from "@/features/auth/service";
```

## Các API endpoints:

- `POST /auth/validate-email` - Kiểm tra email hợp lệ
- `POST /auth/send-otp` - Gửi mã OTP
- `POST /auth/resend-otp` - Gửi lại mã OTP
- `POST /auth/verify-otp` - Xác thực OTP và hoàn thành đăng ký

## Features:

- ✅ Tách biệt logic và UI
- ✅ Tái sử dụng components
- ✅ Type-safe với TypeScript
- ✅ Tích hợp với axiosClient
- ✅ Xử lý loading states
- ✅ Validation form
- ✅ Responsive design
