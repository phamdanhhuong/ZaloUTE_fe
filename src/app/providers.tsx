"use client";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { initializeFromStorage } from "@/store/slices/userSlice";
import { CallProvider } from "@/components/call";
import "@ant-design/v5-patch-for-react-19";

function ReduxInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize user state from localStorage on app start
    store.dispatch(initializeFromStorage());
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ReduxInitializer>
        <CallProvider>
          {children}
        </CallProvider>
      </ReduxInitializer>
    </Provider>
  );
}
