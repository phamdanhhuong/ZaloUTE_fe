import React, { createContext, useContext } from 'react';
import { useCall } from '@/hooks/useCall';
import { CallWindow, IncomingCallModal } from '@/components/call';
import { UseCallReturn } from '@/types/call';

const CallContext = createContext<UseCallReturn | null>(null);

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: React.ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const callState = useCall({ autoConnect: true });

  const { currentCall, incomingCall } = callState;

  const handleAcceptCall = async () => {
    if (incomingCall) {
      try {
        await callState.acceptCall(incomingCall.callId);
      } catch (error) {
        console.error('Failed to accept call:', error);
      }
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      try {
        await callState.rejectCall(incomingCall.callId, 'user_rejected');
      } catch (error) {
        console.error('Failed to reject call:', error);
      }
    }
  };

  const handleCloseCallWindow = async () => {
    if (currentCall) {
      try {
        await callState.endCall(currentCall.callId, 'user_ended');
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
  };

  return (
    <CallContext.Provider value={callState}>
      {children}
      
      {/* Global Call Window */}
      {currentCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.9)'
        }}>
          <CallWindow
            callId={currentCall.callId}
            onClose={handleCloseCallWindow}
          />
        </div>
      )}
      
      {/* Global Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </CallContext.Provider>
  );
};