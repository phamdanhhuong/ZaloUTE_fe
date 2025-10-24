"use client";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { initializeFromStorage } from "@/store/slices/userSlice";
import "@ant-design/v5-patch-for-react-19";
import socketService from "@/infrastructure/socket/socketService";
import SocketProvider from "./SocketProvider";

function ReduxInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize user state from localStorage on app start
    store.dispatch(initializeFromStorage());
    // socket connection is handled by SocketProvider now
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ReduxInitializer>
        <SocketProvider>{children}</SocketProvider>
      </ReduxInitializer>
    </Provider>
  );
}
