"use client";
import React from 'react';
import VideoCall from '../../components/VideoCall';
import socketService from '@/infrastructure/socket/socketService';

export default function CallPage() {
  const room = 'global-call-room';

  const handleExitCall = async () => {
    try {
      // notify peers / server that we hang up and leave the room
      await socketService.sendCallHangup(undefined, room);
      await socketService.leaveCall(room);
    } catch (e) {
      console.error('Exit call error', e);
    }
    // try to close the tab, fallback to history.back()
    try {
      window.close();
    } catch (e) {
      // ignore
    }
    try {
      history.back();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Call Demo</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleExitCall} style={{ padding: '8px 12px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: 4 }}>
          Thoát cuộc gọi
        </button>
      </div>
      <VideoCall room={room} />
    </div>
  );
}
