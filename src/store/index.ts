import { configureStore } from "@reduxjs/toolkit";
import { userReducer } from "./slices";
import chatReducer from "./slices/chatSlice";
import callReducer from "./slices/callSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    call: callReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
        ignoredPaths: ["call.localStream", "call.remoteStream"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
