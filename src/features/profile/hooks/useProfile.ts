import { useState } from "react";
import { message } from "antd";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/slices/userSlice";
import { getUserProfile } from "../service";

export const useProfile = () => {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      const updatedUser = await getUserProfile();

      // Cập nhật user trong Redux store
      dispatch(updateUser(updatedUser));

      // Cập nhật localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      message.success("Làm mới thông tin thành công!");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Không thể làm mới thông tin";
      message.error(msg);
      console.error("Refresh profile failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    refreshProfile,
  };
};
