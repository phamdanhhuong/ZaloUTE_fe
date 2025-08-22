import { useState } from "react";
import { message } from "antd";
import { login, type LoginRequest, type LoginResponse } from "../service";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const data: LoginResponse = await login(values);
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.accessToken);
      }
      message.success("Đăng nhập thành công!");
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Đăng nhập thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleLogin };
};


