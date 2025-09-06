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

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <div>Đang chuyển hướng...</div>;
  }
  return <ZaloLayout />;
}
