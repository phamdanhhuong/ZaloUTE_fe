"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ZaloLayout } from "@/components/layout";
import { RootState } from "@/store";

export default function Home() {
  const router = useRouter();
  const isLoggedIn = useSelector(
    (state: RootState) => state.user.isAuthenticated
  );
  const isInitialized = useSelector(
    (state: RootState) => state.user.isInitialized
  );

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, isInitialized, router]);

  // Show loading while initializing
  if (!isInitialized) {
    return <div>Đang tải...</div>;
  }

  // Show loading while redirecting
  if (!isLoggedIn) {
    return <div>Đang chuyển hướng...</div>;
  }

  return <ZaloLayout />;
}
