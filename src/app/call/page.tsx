"use client";
import React from 'react';
import VideoCall from '../../components/VideoCall';

export default function CallPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Call Demo</h1>
      <VideoCall room={'global-call-room'} />
    </div>
  );
}
