# Redux Setup cho ZaloUTE Frontend

## Cấu trúc Redux Store

```
src/store/
├── index.ts          # Cấu hình store chính
├── hooks.ts          # Typed hooks và useAuth
├── selectors.ts      # Selectors để truy cập state
├── slices/
│   ├── index.ts      # Export tất cả slices
│   └── userSlice.ts  # User state management
└── hooks/
    └── useAuth.ts    # Custom hook cho authentication
```

## Cách sử dụng

### 1. Truy cập thông tin user

```typescript
import { useAuth } from "@/store/hooks";

const MyComponent = () => {
  const { user, userFullName, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Chưa đăng nhập</div>;
  }

  return (
    <div>
      <h1>Xin chào, {userFullName}!</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
};
```

### 2. Sử dụng trong Login component

```typescript
import { useLogin } from "@/features/auth/login/hooks/useLogin";

const LoginForm = () => {
  const { loading, handleLogin } = useLogin();

  const onSubmit = async (values) => {
    try {
      await handleLogin(values);
      // User sẽ được lưu tự động vào Redux store
      router.push("/dashboard");
    } catch (error) {
      // Error đã được handle trong useLogin
    }
  };

  // ...
};
```

### 3. Đăng xuất

```typescript
import { useAuth } from "@/store/hooks";

const Header = () => {
  const { logout } = useAuth();

  return <button onClick={logout}>Đăng xuất</button>;
};
```

### 4. Protect routes

```typescript
import { useAuth } from "@/store/hooks";

const ProtectedPage = () => {
  const { requireAuth } = useAuth();

  useEffect(() => {
    requireAuth(); // Sẽ redirect về login nếu chưa authenticate
  }, [requireAuth]);

  // ...
};
```

## Actions có sẵn

- `loginSuccess`: Lưu user và token sau khi đăng nhập thành công
- `logout`: Xóa user và token, redirect về login
- `updateUser`: Cập nhật thông tin user
- `setLoading`: Set trạng thái loading
- `initializeFromStorage`: Khôi phục state từ localStorage

## Selectors có sẵn

- `selectUser`: Thông tin user hiện tại
- `selectToken`: Access token
- `selectIsAuthenticated`: Trạng thái đăng nhập
- `selectUserLoading`: Trạng thái loading
- `selectUserFullName`: Tên đầy đủ của user
- `selectUserInitials`: Chữ cái đầu của tên

## Tính năng

✅ Tự động lưu user vào localStorage  
✅ Khôi phục state từ localStorage khi reload page  
✅ Type-safe với TypeScript  
✅ Custom hooks dễ sử dụng  
✅ Tự động handle loading states  
✅ Tích hợp với Ant Design messages

## Component Demo

Đã tạo sẵn component `UserProfile` để demo việc sử dụng Redux state. Import và sử dụng:

```typescript
import { UserProfile } from "@/components";

// Trong component của bạn
<UserProfile />;
```
