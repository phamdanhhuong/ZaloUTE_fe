import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout as logoutAction } from "@/store/slices/userSlice";
import {
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectUserLoading,
  selectUserFullName,
} from "@/store/selectors";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectUserLoading);
  const userFullName = useAppSelector(selectUserFullName);

  const logout = useCallback(() => {
    dispatch(logoutAction());
    message.success("Đăng xuất thành công!");
    router.push("/login");
  }, [dispatch, router]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      message.warning("Vui lòng đăng nhập để tiếp tục");
      router.push("/login");
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    userFullName,
    logout,
    requireAuth,
  };
};
