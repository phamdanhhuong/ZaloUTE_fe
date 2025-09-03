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

      // Save to localStorage and Redux
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Update Redux state
      dispatch(
        loginSuccess({
          user: data.user,
          token: data.accessToken,
        })
      );

      message.success("Đăng nhập thành công!");
      
      // Navigate to home page after successful login
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
