"use client";
import React, { useEffect, useRef, useState } from "react";
import socketService from "../infrastructure/socket/socketService";

interface Props {
  room?: string;
}

export default function VideoCall({ room = "global-call-room" }: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const peersRef = useRef<Set<string>>(new Set());
  const [joined, setJoined] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [outgoingTo, setOutgoingTo] = useState<string | null>(null);
  const [isRingingOutgoing, setIsRingingOutgoing] = useState(false);

  useEffect(() => {
    let unsubOffer: (() => void) | null = null;
    let unsubAnswer: (() => void) | null = null;
    let unsubIce: (() => void) | null = null;
    let unsubJoined: (() => void) | null = null;
    let unsubLeft: (() => void) | null = null;

    const setupMediaAndPeer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteRef.current) remoteRef.current.srcObject = ev.streams[0];
        };

        pc.onicecandidate = (ev) => {
          // send candidate to all peers
          const targets = Array.from(peersRef.current);
          if (ev.candidate && targets.length > 0) {
            const cand = ev.candidate.toJSON();
            targets.forEach((t) => socketService.sendCallIceCandidate(t, cand as RTCIceCandidateInit).catch(console.error));
          }
        };

        pcRef.current = pc;
      } catch (err) {
        console.error("Media error", err);
      }
    };

    setupMediaAndPeer();

    // socket listeners
    unsubOffer = socketService.onCallOffer((data) => {
      console.log("Received offer", data);
      // add the offerer to peers list
      if (!peersRef.current.has(data.from)) {
        peersRef.current.add(data.from);
        setPeers(Array.from(peersRef.current));
      }
      // set incoming offer state and wait for user to accept/decline
      setIncomingOffer(data.offer);
      setIncomingFrom(data.from);
    });

    unsubAnswer = socketService.onCallAnswer(async (data) => {
      console.log("Received answer", data);
      // remote accepted our offer
      setIsRingingOutgoing(false);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    unsubIce = socketService.onCallIceCandidate(async (data) => {
      console.log("Received ICE", data);
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Failed to add remote ICE candidate", e);
        }
      }
    });

    unsubJoined = socketService.onCallUserJoined((data) => {
      console.log("User joined call room:", data);
      if (!peersRef.current.has(data.socketId)) {
        peersRef.current.add(data.socketId);
        setPeers(Array.from(peersRef.current));
      }
    });

    unsubLeft = socketService.onCallUserLeft((data) => {
      console.log("User left call room:", data);
      // remove from peers
      if (peersRef.current.has(data.socketId)) {
        peersRef.current.delete(data.socketId);
        setPeers(Array.from(peersRef.current));
      }
      if (remoteRef.current) remoteRef.current.srcObject = null;
    });

    // join room
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
      socketService.leaveCall(room).catch(() => {});
    };
  }, []);

  const handleCall = async () => {
    if (!pcRef.current) return;
    if (peers.length === 0) {
      alert("No other user in room to call");
      return;
    }
    // pick the first peer as target
    const target = peers[0];
    setOutgoingTo(target);
    setIsRingingOutgoing(true);
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    await socketService.sendCallOffer(target, offer);
  };

  const handleAcceptIncoming = async () => {
    if (!incomingOffer || !incomingFrom) return;
    if (!pcRef.current) {
      console.error('PeerConnection not ready');
      return;
    }
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      await socketService.sendCallAnswer(incomingFrom, answer);
    } catch (e) {
      console.error('Accept incoming failed', e);
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
      console.error('Decline send hangup failed', e);
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
    await socketService.sendCallHangup(outgoingTo ?? undefined, room);
    await socketService.leaveCall(room);
  };

  return (
    <div>
      <h3>Video Call (room: {room})</h3>
      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <div>Local</div>
          <video ref={localRef} autoPlay muted playsInline style={{ width: 320, height: 240, background: '#000' }} />
        </div>
        <div>
          <div>Remote</div>
          <video ref={remoteRef} autoPlay playsInline style={{ width: 320, height: 240, background: '#000' }} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={handleCall} disabled={peers.length === 0}>Call</button>
        <button onClick={handleHangup}>Hangup</button>
        <div>{joined ? 'Joined call room' : 'Joining...'}</div>
        <div>Peers: {peers.length ? peers.join(', ') : 'none'}</div>
      </div>
      {/* Incoming call modal */}
      {incomingFrom && (
        <div style={{ position: 'fixed', left: 20, bottom: 20, padding: 12, background: '#fff', border: '1px solid #ccc' }}>
          <div>Incoming call from {incomingFrom}</div>
          <button onClick={handleAcceptIncoming}>Accept</button>
          <button onClick={handleDeclineIncoming}>Decline</button>
        </div>
      )}

      {/* Outgoing ringing indicator */}
      {isRingingOutgoing && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, padding: 12, background: '#fff', border: '1px solid #ccc' }}>
          <div>Ringing {outgoingTo}</div>
          <button onClick={handleHangup}>Cancel</button>
        </div>
      )}
    </div>
  );
}
