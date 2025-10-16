"use client";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { initializeFromStorage } from "@/store/slices/userSlice";
import "@ant-design/v5-patch-for-react-19";
import socketService from "@/infrastructure/socket/socketService";

function ReduxInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize user state from localStorage on app start
    store.dispatch(initializeFromStorage());
    // If token exists in localStorage, connect socket automatically so call page works
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        socketService.connect(token).catch((err) => console.error("Socket connect failed", err));
      }
    }
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ReduxInitializer>{children}</ReduxInitializer>
    </Provider>
  );
}
