# Zalo UTE - Trang Chủ với Giao Diện Chat và Quản Lý Bạn Bè

## Tổng quan

Dự án này đã được triển khai với giao diện trang chủ mô phỏng Zalo, bao gồm hai chức năng chính:

1. **Quản lý bạn bè**: Tìm kiếm người dùng, gửi lời mời kết bạn, chấp nhận/từ chối lời mời, xem danh sách bạn bè
2. **Chat và trò chuyện**: Hiển thị cuộc trò chuyện gần đây, gửi tin nhắn, reactions

## Cấu trúc Features

### 1. Friend Feature (`src/features/friend/`)

#### Components:
- `UserSearch.tsx`: Tìm kiếm người dùng bằng email/username
- `FriendsList.tsx`: Hiển thị danh sách bạn bè với khả năng sắp xếp và tìm kiếm
- `FriendRequests.tsx`: Quản lý lời mời kết bạn (nhận và gửi)
- `UserProfile.tsx`: Hiển thị hồ sơ chi tiết người dùng

#### Hooks:
- `useFriendSearch()`: Tìm kiếm người dùng
- `useFriendRequest()`: Quản lý lời mời kết bạn
- `useFriends()`: Quản lý danh sách bạn bè
- `useUserProfile()`: Quản lý hồ sơ người dùng

#### Service:
- API calls cho tất cả chức năng bạn bè
- Types: `User`, `Friend`, `FriendRequest`

### 2. Chat Feature (`src/features/chat/`)

#### Components:
- `ConversationList.tsx`: Danh sách cuộc trò chuyện với search và filter
- `ChatArea.tsx`: Khu vực chat chính với gửi tin nhắn và reactions

#### Hooks:
- `useConversations()`: Quản lý danh sách cuộc trò chuyện
- `useMessages()`: Quản lý tin nhắn trong cuộc trò chuyện
- `useMessageReactions()`: Quản lý reactions
- `useMessageSearch()`: Tìm kiếm tin nhắn

#### Service:
- API calls cho chức năng chat
- Types: `Conversation`, `Message`, `MessageReaction`

### 3. Layout Components (`src/components/layout/`)

#### ZaloLayout.tsx:
- Layout chính của ứng dụng
- Quản lý state cho active view và selected items
- Tích hợp tất cả components từ các features

## Styling

### CSS tùy chỉnh (`src/app/styles/zalo-layout.css`):
- Thay thế hoàn toàn Tailwind CSS
- Responsive design
- Màu sắc và styling giống Zalo
- Các class utilities cho layout và components

## Cách sử dụng

### 1. Navigation
- Click vào các icon bên trái để chuyển đổi giữa:
  - 💬 Chat
  - 👥 Bạn bè
  - ➕ Lời mời kết bạn

### 2. Tìm kiếm và kết bạn
- Trong tab "Bạn bè", sử dụng ô tìm kiếm để tìm người dùng
- Click "Kết bạn" để gửi lời mời
- Chuyển sang tab "Lời mời kết bạn" để quản lý requests

### 3. Chat
- Click vào cuộc trò chuyện trong danh sách để mở
- Gõ tin nhắn và nhấn Enter để gửi
- Click vào emoji để thêm reaction

### 4. Profile
- Click "Xem hồ sơ" để xem thông tin chi tiết người dùng
- Có thể bắt đầu chat từ profile

## API Integration

Tất cả services đã được setup với `axiosClient` và sẵn sàng kết nối với backend. Các endpoints mong đợi:

### Friend API:
- `GET /user/search` - Tìm kiếm người dùng
- `POST /friend/request` - Gửi lời mời kết bạn
- `GET /friend/requests` - Lấy danh sách lời mời
- `PUT /friend/request/:id/accept` - Chấp nhận lời mời
- `PUT /friend/request/:id/reject` - Từ chối lời mời
- `GET /friend/list` - Lấy danh sách bạn bè
- `DELETE /friend/:id` - Hủy kết bạn
- `GET /user/profile/:id` - Lấy hồ sơ người dùng

### Chat API:
- `GET /conversation/list` - Lấy danh sách cuộc trò chuyện
- `POST /conversation` - Tạo cuộc trò chuyện mới
- `GET /conversation/:id/messages` - Lấy tin nhắn
- `POST /message` - Gửi tin nhắn
- `PUT /conversation/:id/read` - Đánh dấu đã đọc
- `POST /message/:id/reaction` - Thêm reaction
- `DELETE /message/reaction/:id` - Xóa reaction

## Redux Integration

State management sử dụng Redux Toolkit:
- User state từ `store/slices/userSlice.ts`
- Selectors trong `store/selectors.ts`
- Hooks trong `store/hooks.ts`

## Responsive Design

Giao diện được thiết kế responsive:
- Desktop: Layout 3 cột (sidebar trái + danh sách + chat area)
- Tablet: Layout thu gọn
- Mobile: Layout stack vertical

## Deployment

Để chạy ứng dụng:

```bash
npm install
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000` với giao diện hoàn chỉnh.

## Notes

1. **Authentication**: Cần đăng nhập để hiển thị thông tin user trong layout
2. **Real-time**: Có thể tích hợp WebSocket cho real-time chat
3. **File upload**: Đã có sẵn UI cho đính kèm file (cần implement logic)
4. **Push notifications**: Có thể thêm cho tin nhắn mới và friend requests

Giao diện đã hoàn toàn thay thế Tailwind CSS bằng CSS tùy chỉnh và tuân theo đúng pattern của dự án hiện tại.




