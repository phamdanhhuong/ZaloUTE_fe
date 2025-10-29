import { useState } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginSuccess, setLoading } from "@/store/slices/userSlice";
import { selectUserLoading } from "@/store/selectors";
import { login, type LoginRequest, type LoginResponse } from "../service";

export const useLogin = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const loading = useAppSelector(selectUserLoading);

  const handleLogin = async (values: LoginRequest) => {
    dispatch(setLoading(true));
    try {
      const data: LoginResponse = await login(values);
      if (!data.user.isActive) {
        message.error("Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt hoặc liên hệ hỗ trợ.");
        throw new Error("ACCOUNT_NOT_ACTIVE");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      dispatch(
        loginSuccess({
          user: data.user,
          token: data.accessToken,
        })
      );

      message.success("Đăng nhập thành công!");
      
      router.push('/');
      
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Đăng nhập thất bại";
      message.error(msg);
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  return { loading, handleLogin };
};
