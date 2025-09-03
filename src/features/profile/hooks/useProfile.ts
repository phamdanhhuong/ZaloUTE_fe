import { useState } from "react";
import { message } from "antd";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/slices/userSlice";
import { getUserProfile, updateUserProfile, UpdateProfileRequest } from "../service";

export const useProfile = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
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

  const updateProfile = async (data: UpdateProfileRequest) => {
    setUpdating(true);
    try {
      const updatedUser = await updateUserProfile(data);

      // Cập nhật user trong Redux store
      dispatch(updateUser(updatedUser));

      // Cập nhật localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      message.success("Cập nhật thông tin thành công!");
      return updatedUser;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Không thể cập nhật thông tin";
      message.error(msg);
      console.error("Update profile failed:", error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  return {
    refreshing,
    refreshProfile,
    updating,
    updateProfile,
  };
};
