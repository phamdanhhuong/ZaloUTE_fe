"use client";
import React, { useEffect, useRef, useState } from "react";
import socketService from "../infrastructure/socket/socketService";
import { notification } from 'antd';

interface Props {
  room?: string;
}

export default function VideoCall({ room = "global-call-room" }: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Set<string>>(new Set());

  const [peers, setPeers] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [outgoingTo, setOutgoingTo] = useState<string | null>(null);
  const [isRingingOutgoing, setIsRingingOutgoing] = useState(false);

  // UI states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    let unsubOffer: (() => void) | null = null;
    let unsubAnswer: (() => void) | null = null;
    let unsubIce: (() => void) | null = null;
    let unsubJoined: (() => void) | null = null;
    let unsubLeft: (() => void) | null = null;

    const setupMediaAndPeer = async (deviceId?: string) => {
      try {
        setMediaError(null);
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // send local tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteRef.current) remoteRef.current.srcObject = ev.streams[0];
        };

        pc.onicecandidate = (ev) => {
          if (!ev.candidate) return;
          const cand = ev.candidate.toJSON();
          const targets = Array.from(peersRef.current);
          targets.forEach((t) => socketService.sendCallIceCandidate(t, cand as RTCIceCandidateInit).catch(console.error));
        };

        pcRef.current = pc;
      } catch (err: any) {
        console.error("Media error", err);
        // surface a user-friendly message
        if (err && err.name === 'NotAllowedError') {
          setMediaError('Permission denied. Allow camera/microphone access in your browser.');
        } else if (err && err.name === 'NotReadableError') {
          setMediaError('Could not start video source. Another application may be using the camera. Close other apps and try again.');
        } else {
          setMediaError(err && err.message ? String(err.message) : 'Unknown media error');
        }
      }
    };

    // enumerate devices
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(vids);
        if (vids.length && !selectedVideoDeviceId) setSelectedVideoDeviceId(vids[0].deviceId);
      } catch (e) {
        console.warn("Could not enumerate devices", e);
      }
    };

    // register socket listeners
    unsubOffer = socketService.onCallOffer((data) => {
      console.log("Received offer", data);
      if (!peersRef.current.has(data.from)) {
        peersRef.current.add(data.from);
        setPeers(Array.from(peersRef.current));
      }
      setIncomingOffer(data.offer);
      setIncomingFrom(data.from);
    });

    unsubAnswer = socketService.onCallAnswer(async (data) => {
      console.log("Received answer", data);
      setIsRingingOutgoing(false);
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.warn("Failed to set remote description from answer", e);
        }
      }
    });

    unsubIce = socketService.onCallIceCandidate(async (data) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Failed to add remote ICE candidate", e);
        }
      }
    });

    unsubJoined = socketService.onCallUserJoined((data) => {
      if (!peersRef.current.has(data.socketId)) {
        peersRef.current.add(data.socketId);
        setPeers(Array.from(peersRef.current));
      }
    });

    unsubLeft = socketService.onCallUserLeft((data: any) => {
      const id = data.socketId;
      const username = data.username || data.userId || id;
      if (peersRef.current.has(id)) {
        peersRef.current.delete(id);
        setPeers(Array.from(peersRef.current));
      }
      if (remoteRef.current) remoteRef.current.srcObject = null;
      // show notification to remaining participants with username
      try {
        notification.info({
          message: 'Thành viên rời cuộc gọi',
          description: `Người dùng ${username} đã rời cuộc gọi`,
          placement: 'bottomRight',
        });
      } catch (e) {
        console.log('Notification failed', e);
      }
    });

    // init media + peer
    enumerate();
    setupMediaAndPeer(selectedVideoDeviceId ?? undefined).catch((e) => {
      // errors are handled inside setupMediaAndPeer; still log for debugging
      console.error('setupMediaAndPeer failed', e);
    });

    // join
    socketService.joinCall(room).then(() => setJoined(true)).catch(console.error);

    return () => {
      unsubOffer?.();
      unsubAnswer?.();
      unsubIce?.();
      unsubJoined?.();
      unsubLeft?.();

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {
          /* ignore */
        }
        localStreamRef.current = null;
      }
      socketService.leaveCall(room).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    // when selected video device changes, replace track
    const switchCamera = async () => {
      if (!selectedVideoDeviceId) return;
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedVideoDeviceId } }, audio: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const pc = pcRef.current;
        const oldStream = localStreamRef.current;
        if (pc && newVideoTrack) {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, newStream);
          }
        }
        if (oldStream) oldStream.getVideoTracks().forEach((t) => t.stop());
        localStreamRef.current = newStream;
        if (localRef.current) localRef.current.srcObject = newStream;
      } catch (e) {
        console.error("Switch camera failed", e);
        // surface friendly message to UI
        const err: any = e;
        if (err && err.name === 'NotAllowedError') {
          setMediaError('Permission denied when switching camera. Allow camera access and try again.');
        } else if (err && err.name === 'NotReadableError') {
          setMediaError('Could not start video source when switching camera. Another app may be using the camera. Close other apps and try again.');
        } else {
          setMediaError(err && err.message ? String(err.message) : 'Switch camera failed');
        }
      }
    };
    switchCamera();
  }, [selectedVideoDeviceId]);

  const handleCall = async () => {
    if (!pcRef.current) return;
    if (peers.length === 0) {
      alert("No other user in room to call");
      return;
    }
    const target = peers[0];
    setOutgoingTo(target);
    setIsRingingOutgoing(true);
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      await socketService.sendCallOffer(target, offer);
    } catch (e) {
      console.error("Failed to create/send offer", e);
      setIsRingingOutgoing(false);
    }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingOffer || !incomingFrom) return;
    if (!pcRef.current) return console.error("PeerConnection not ready");
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      await socketService.sendCallAnswer(incomingFrom, answer);
    } catch (e) {
      console.error("Accept incoming failed", e);
    } finally {
      setIncomingOffer(null);
      setIncomingFrom(null);
    }
  };

  const handleDeclineIncoming = async () => {
    if (!incomingFrom) return;
    try {
      await socketService.sendCallHangup(incomingFrom, room);
    } catch (e) {
      console.error("Decline send hangup failed", e);
    } finally {
      setIncomingOffer(null);
      setIncomingFrom(null);
    }
  };

  const handleHangup = async () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsRingingOutgoing(false);
    setOutgoingTo(null);
    try {
      await socketService.sendCallHangup(outgoingTo ?? undefined, room);
      await socketService.leaveCall(room);
    } catch (e) {
      console.error("Hangup failed", e);
    }
  };

  const toggleMute = () => {
    try {
      const s = localStreamRef.current;
      if (!s) return;
      s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMicMuted((v) => !v);
    } catch (e) {
      console.error("Toggle mute failed", e);
    }
  };

  const handleVideoDeviceChange = (deviceId: string) => {
    if (deviceId === selectedVideoDeviceId) return;
    setSelectedVideoDeviceId(deviceId);
  };

  const retryGetMedia = async () => {
    setMediaError(null);
    try {
      // re-run setup; use currently selected device
      await (async () => {
        const deviceId = selectedVideoDeviceId ?? undefined;
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // stop previous
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        // attach tracks to existing peer connection
        const pc = pcRef.current;
        if (pc) {
          // replace or add tracks
          const senders = pc.getSenders();
          stream.getTracks().forEach((t) => {
            const sender = senders.find((s) => s.track && s.track.kind === t.kind);
            if (sender) {
              // @ts-ignore - replaceTrack exists on RTCRtpSender
              try { sender.replaceTrack(t); } catch (e) { console.warn('replaceTrack failed', e); }
            } else {
              pc.addTrack(t, stream);
            }
          });
        }
      })();
    } catch (err: any) {
      console.error('Retry getUserMedia failed', err);
      if (err && err.name === 'NotAllowedError') {
        setMediaError('Permission denied. Allow camera/microphone access in your browser.');
      } else if (err && err.name === 'NotReadableError') {
        setMediaError('Could not start video source. Another application may be using the camera. Close other apps and try again.');
      } else {
        setMediaError(err && err.message ? String(err.message) : 'Unknown media error');
      }
    }
  };

  return (
    <div>
      <h3>Video Call (room: {room})</h3>
      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <div>Local</div>
          <video ref={localRef} autoPlay muted playsInline style={{ width: 320, height: 240, background: "#000" }} />
        </div>
        <div>
          <div>Remote</div>
          <video ref={remoteRef} autoPlay playsInline style={{ width: 320, height: 240, background: "#000" }} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={handleCall} disabled={peers.length === 0}>Call</button>
        <button onClick={handleHangup}>Hangup</button>
        <button onClick={toggleMute}>{isMicMuted ? "Unmute" : "Mute"}</button>
        <label style={{ marginLeft: 8 }}>
          Camera:
          <select value={selectedVideoDeviceId ?? ""} onChange={(e) => handleVideoDeviceChange(e.target.value)} style={{ marginLeft: 8 }}>
            {videoDevices.length === 0 && <option value="">Default</option>}
            {videoDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
            ))}
          </select>
        </label>
        <div>{joined ? "Joined call room" : "Joining..."}</div>
        <div>Peers: {peers.length ? peers.join(", ") : "none"}</div>
      </div>

      {/* Media error UI */}
      {mediaError && (
        <div style={{ marginTop: 12, padding: 12, background: '#ffecec', border: '1px solid #f5c2c2' }}>
          <div style={{ fontWeight: 600 }}>Camera / microphone error</div>
          <div style={{ marginTop: 6 }}>{mediaError}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={retryGetMedia}>Retry</button>
            <span style={{ marginLeft: 12, color: '#666' }}>If problem persists: close other apps using camera, check browser permissions, or try a different browser.</span>
          </div>
        </div>
      )}

      {/* Incoming call modal */}
      {incomingFrom && (
        <div style={{ position: "fixed", left: 20, bottom: 20, padding: 12, background: "#fff", border: "1px solid #ccc" }}>
          <div>Incoming call from {incomingFrom}</div>
          <button onClick={handleAcceptIncoming}>Accept</button>
          <button onClick={handleDeclineIncoming}>Decline</button>
        </div>
      )}

      {/* Outgoing ringing indicator */}
      {isRingingOutgoing && (
        <div style={{ position: "fixed", right: 20, bottom: 20, padding: 12, background: "#fff", border: "1px solid #ccc" }}>
          <div>Ringing {outgoingTo}</div>
          <button onClick={handleHangup}>Cancel</button>
        </div>
      )}
    </div>
  );
}
