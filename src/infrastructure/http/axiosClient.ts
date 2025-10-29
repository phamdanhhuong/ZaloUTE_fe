import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  //withCredentials: true, // nếu dùng cookie-based auth
});

// Interceptor cho request
axiosClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    // Ensure headers object exists before setting Authorization
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor cho response
let isRedirectingUnauthorized = false;
axiosClient.interceptors.response.use(
  (response) => {
  // response interceptor - debug logs removed

    // Nếu server trả về cấu trúc { statusCode, message, data }
    // thì lấy data bên trong, otherwise return toàn bộ
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    // Xử lý lỗi chung (401, 500...)
    if (error.response?.status === 401) {
      try {
        // Đánh dấu đã xử lý để các nơi khác không hiển thị toast "Unauthorized"
        (error as any).__handled401 = true;

        if (typeof window !== "undefined") {
          // Xóa thông tin xác thực cục bộ
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Tránh redirect lặp lại
          if (!isRedirectingUnauthorized) {
            isRedirectingUnauthorized = true;
            const onLoginPage = window.location.pathname === "/login";
            if (!onLoginPage) {
              // Dùng replace để không cho phép quay lại trang lỗi
              window.location.replace("/login");
            }
          }
        }
      } catch (e) {
        // noop
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
