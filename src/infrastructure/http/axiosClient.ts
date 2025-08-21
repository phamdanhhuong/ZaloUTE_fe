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
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor cho response
axiosClient.interceptors.response.use(
  (response) => {
    // Log để debug
    console.log("Full response:", response.data);

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
      console.error("Unauthorized! Redirect to login...");
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
