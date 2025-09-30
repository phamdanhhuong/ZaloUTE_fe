import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  CallState, 
  Call, 
  IncomingCall, 
  ActiveCall, 
  CallType, 
  CallStatus,
  CallUser,
  ApiResponse,
  CallHistoryResponse
} from '@/types/call';
import axios from 'axios';

// Initial state
const initialState: CallState = {
  currentCall: null,
  incomingCall: null,
  callHistory: [],
  isConnected: false,
  localStream: null,
  remoteStream: null,
  isLoading: false,
  error: null,
  callWindow: {
    isOpen: false,
    callId: null,
  },
};

// Async thunks for API calls

// Initiate call via REST API
export const initiateCallAsync = createAsyncThunk(
  'call/initiateCall',
  async (payload: { receiverId: string; callType: CallType; token: string }) => {
    const response = await axios.post<ApiResponse<Call>>(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/initiate`,
      {
        receiverId: payload.receiverId,
        callType: payload.callType,
      },
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );
    return response.data;
  }
);

// Accept call via REST API
export const acceptCallAsync = createAsyncThunk(
  'call/acceptCall',
  async (payload: { callId: string; token: string }) => {
    const response = await axios.put<ApiResponse<Call>>(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/${payload.callId}/accept`,
      {},
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );
    return response.data;
  }
);

// Reject call via REST API
export const rejectCallAsync = createAsyncThunk(
  'call/rejectCall',
  async (payload: { callId: string; reason?: string; token: string }) => {
    const response = await axios.put<ApiResponse<Call>>(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/${payload.callId}/reject`,
      { reason: payload.reason },
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );
    return response.data;
  }
);

// End call via REST API
export const endCallAsync = createAsyncThunk(
  'call/endCall',
  async (payload: { callId: string; reason?: string; token: string }) => {
    const response = await axios.put<ApiResponse<Call>>(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/${payload.callId}/end`,
      { reason: payload.reason },
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );
    return response.data;
  }
);

// Get call history
export const getCallHistoryAsync = createAsyncThunk(
  'call/getCallHistory',
  async (payload: { limit?: number; offset?: number; token: string }) => {
    const params = new URLSearchParams();
    if (payload.limit) params.append('limit', payload.limit.toString());
    if (payload.offset) params.append('offset', payload.offset.toString());
    
    const response = await axios.get<CallHistoryResponse>(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/history?${params}`,
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );
    return response.data;
  }
);

// Call slice
const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Connection state management
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    // Stream management
    setLocalStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.localStream = action.payload;
    },

    setRemoteStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.remoteStream = action.payload;
    },

    // Current call management
    setCurrentCall: (state, action: PayloadAction<ActiveCall | null>) => {
      state.currentCall = action.payload;
      
      // If setting a call, open call window
      if (action.payload) {
        state.callWindow.isOpen = true;
        state.callWindow.callId = action.payload.callId;
      }
    },

    updateCurrentCall: (state, action: PayloadAction<Partial<ActiveCall>>) => {
      if (state.currentCall) {
        state.currentCall = { ...state.currentCall, ...action.payload };
      }
    },

    clearCurrentCall: (state) => {
      state.currentCall = null;
      state.localStream = null;
      state.remoteStream = null;
      state.callWindow.isOpen = false;
      state.callWindow.callId = null;
    },

    // Incoming call management
    setIncomingCall: (state, action: PayloadAction<IncomingCall | null>) => {
      state.incomingCall = action.payload;
    },

    clearIncomingCall: (state) => {
      state.incomingCall = null;
    },

    // Call window management
    openCallWindow: (state, action: PayloadAction<string>) => {
      state.callWindow.isOpen = true;
      state.callWindow.callId = action.payload;
    },

    closeCallWindow: (state) => {
      state.callWindow.isOpen = false;
      state.callWindow.callId = null;
    },

    // Error management
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Call history management
    addCallToHistory: (state, action: PayloadAction<Call>) => {
      // Add to beginning of history
      state.callHistory.unshift(action.payload);
      
      // Keep only last 100 calls in state
      if (state.callHistory.length > 100) {
        state.callHistory = state.callHistory.slice(0, 100);
      }
    },

    updateCallInHistory: (state, action: PayloadAction<Call>) => {
      const index = state.callHistory.findIndex(call => call._id === action.payload._id);
      if (index !== -1) {
        state.callHistory[index] = action.payload;
      }
    },

    // Socket event handlers (used by middleware/effects)
    handleCallInitiated: (state, action: PayloadAction<{ call: Call; callId: string }>) => {
      // Handle successful call initiation
      const { call, callId } = action.payload;
      
      const activeCall: ActiveCall = {
        callId,
        participants: [
          // Will be populated by socket events
        ],
        callType: call.callType,
        status: call.status,
        startTime: new Date(),
        duration: 0,
        isConnected: false,
      };
      
      state.currentCall = activeCall;
      state.callWindow.isOpen = true;
      state.callWindow.callId = callId;
      
      // Add to history
      state.callHistory.unshift(call);
    },

    handleIncomingCall: (state, action: PayloadAction<{ call: Call; caller: CallUser; callId: string }>) => {
      const { call, caller, callId } = action.payload;
      
      const incomingCall: IncomingCall = {
        callId,
        call,
        caller,
        timestamp: new Date(),
      };
      
      state.incomingCall = incomingCall;
    },

    handleCallAccepted: (state, action: PayloadAction<{ call: Call; acceptedBy: string }>) => {
      const { call } = action.payload;
      
      if (state.currentCall) {
        state.currentCall.status = CallStatus.ACCEPTED;
        state.currentCall.isConnected = true;
      }
      
      // Clear incoming call if it was accepted by current user
      if (state.incomingCall && state.incomingCall.callId === call._id) {
        const activeCall: ActiveCall = {
          callId: call._id!,
          participants: [],
          callType: call.callType,
          status: CallStatus.ACCEPTED,
          startTime: new Date(),
          duration: 0,
          isConnected: true,
        };
        
        state.currentCall = activeCall;
        state.incomingCall = null;
        state.callWindow.isOpen = true;
        state.callWindow.callId = call._id!;
      }
      
      // Update call in history
      const historyIndex = state.callHistory.findIndex(c => c._id === call._id);
      if (historyIndex !== -1) {
        state.callHistory[historyIndex] = call;
      }
    },

    handleCallRejected: (state, action: PayloadAction<{ call: Call; rejectedBy: string; reason?: string }>) => {
      const { call } = action.payload;
      
      // Clear current call if it was rejected
      if (state.currentCall && state.currentCall.callId === call._id) {
        state.currentCall = null;
        state.callWindow.isOpen = false;
        state.callWindow.callId = null;
      }
      
      // Clear incoming call
      if (state.incomingCall && state.incomingCall.callId === call._id) {
        state.incomingCall = null;
      }
      
      // Update call in history
      const historyIndex = state.callHistory.findIndex(c => c._id === call._id);
      if (historyIndex !== -1) {
        state.callHistory[historyIndex] = call;
      }
    },

    handleCallEnded: (state, action: PayloadAction<{ call: Call; endedBy: string; reason?: string }>) => {
      const { call } = action.payload;
      
      // Clear current call
      if (state.currentCall && state.currentCall.callId === call._id) {
        state.currentCall = null;
        state.localStream = null;
        state.remoteStream = null;
        state.callWindow.isOpen = false;
        state.callWindow.callId = null;
      }
      
      // Clear incoming call
      if (state.incomingCall && state.incomingCall.callId === call._id) {
        state.incomingCall = null;
      }
      
      // Update call in history
      const historyIndex = state.callHistory.findIndex(c => c._id === call._id);
      if (historyIndex !== -1) {
        state.callHistory[historyIndex] = call;
      }
    },

    handleCallError: (state, action: PayloadAction<{ message: string; event?: string }>) => {
      state.error = action.payload.message;
      state.isLoading = false;
    },

    // Media status updates
    updateParticipantMediaStatus: (state, action: PayloadAction<{ 
      callId: string; 
      userId: string; 
      audio?: boolean; 
      video?: boolean 
    }>) => {
      const { callId, userId, audio, video } = action.payload;
      
      if (state.currentCall && state.currentCall.callId === callId) {
        const participant = state.currentCall.participants.find(p => p.userId === userId);
        if (participant) {
          if (audio !== undefined) participant.mediaStatus.audio = audio;
          if (video !== undefined) participant.mediaStatus.video = video;
        }
      }
    },

    // Reset entire call state
    resetCallState: () => initialState,
  },

  extraReducers: (builder) => {
    // Initiate call
    builder
      .addCase(initiateCallAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initiateCallAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.success && action.payload.data) {
          // Call will be handled by socket events
        } else {
          state.error = action.payload.message;
        }
      })
      .addCase(initiateCallAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initiate call';
      });

    // Accept call
    builder
      .addCase(acceptCallAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(acceptCallAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload.success) {
          state.error = action.payload.message;
        }
      })
      .addCase(acceptCallAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to accept call';
      });

    // Reject call
    builder
      .addCase(rejectCallAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectCallAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload.success) {
          state.error = action.payload.message;
        }
      })
      .addCase(rejectCallAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to reject call';
      });

    // End call
    builder
      .addCase(endCallAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(endCallAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload.success) {
          state.error = action.payload.message;
        }
      })
      .addCase(endCallAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to end call';
      });

    // Get call history
    builder
      .addCase(getCallHistoryAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCallHistoryAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.success && action.payload.data) {
          state.callHistory = action.payload.data;
        } else {
          state.error = action.payload.message;
        }
      })
      .addCase(getCallHistoryAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get call history';
      });
  },
});

// Export actions
export const {
  setConnected,
  setLocalStream,
  setRemoteStream,
  setCurrentCall,
  updateCurrentCall,
  clearCurrentCall,
  setIncomingCall,
  clearIncomingCall,
  openCallWindow,
  closeCallWindow,
  setError,
  clearError,
  setLoading,
  addCallToHistory,
  updateCallInHistory,
  handleCallInitiated,
  handleIncomingCall,
  handleCallAccepted,
  handleCallRejected,
  handleCallEnded,
  handleCallError,
  updateParticipantMediaStatus,
  resetCallState,
} = callSlice.actions;

// Export reducer
export default callSlice.reducer;

// Selectors
export const selectCallState = (state: { call: CallState }) => state.call;
export const selectCurrentCall = (state: { call: CallState }) => state.call.currentCall;
export const selectIncomingCall = (state: { call: CallState }) => state.call.incomingCall;
export const selectCallHistory = (state: { call: CallState }) => state.call.callHistory;
export const selectIsConnected = (state: { call: CallState }) => state.call.isConnected;
export const selectLocalStream = (state: { call: CallState }) => state.call.localStream;
export const selectRemoteStream = (state: { call: CallState }) => state.call.remoteStream;
export const selectCallWindow = (state: { call: CallState }) => state.call.callWindow;
export const selectCallError = (state: { call: CallState }) => state.call.error;
export const selectCallLoading = (state: { call: CallState }) => state.call.isLoading;