import { NextRequest, NextResponse } from "next/server";

interface RoomState {
  roomId: string;
  mediaId: string;
  title: string;
  streamUrl: string;
  currentTime: number;
  paused: boolean;
  updatedAt: number;
  viewers: Record<string, { name: string; lastSeen: number }>;
  messages: Array<{ id: string; user: string; text: string; timestamp: number }>;
}

// In-memory global rooms store
declare global {
  // eslint-disable-next-line no-var
  var __mv_rooms: Record<string, RoomState> | undefined;
}

if (!globalThis.__mv_rooms) {
  globalThis.__mv_rooms = {};
}

const rooms = globalThis.__mv_rooms;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const room = rooms[roomId];

  if (!room) {
    return NextResponse.json({
      roomId,
      mediaId: "sample-stream",
      title: "MovieVault Party Room",
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      currentTime: 0,
      paused: true,
      updatedAt: Date.now(),
      viewers: {},
      messages: [
        {
          id: "welcome",
          user: "System",
          text: "Welcome to Watch Together! Share this room link with your friends to watch simultaneously.",
          timestamp: Date.now(),
        },
      ],
    });
  }

  // Purge viewers inactive for > 60s
  const now = Date.now();
  for (const [id, v] of Object.entries(room.viewers)) {
    if (now - v.lastSeen > 60_000) {
      delete room.viewers[id];
    }
  }

  return NextResponse.json(room);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const body = (await req.json()) as {
    action: "sync" | "chat" | "join";
    viewerId?: string;
    viewerName?: string;
    currentTime?: number;
    paused?: boolean;
    mediaId?: string;
    title?: string;
    streamUrl?: string;
    message?: string;
  };

  if (!rooms[roomId]) {
    rooms[roomId] = {
      roomId,
      mediaId: body.mediaId || "sample-stream",
      title: body.title || "MovieVault Party Room",
      streamUrl: body.streamUrl || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      currentTime: 0,
      paused: true,
      updatedAt: Date.now(),
      viewers: {},
      messages: [],
    };
  }

  const room = rooms[roomId];
  const now = Date.now();

  // Register / update viewer heartbeat
  if (body.viewerId) {
    room.viewers[body.viewerId] = {
      name: body.viewerName || "Vault Member",
      lastSeen: now,
    };
  }

  if (body.action === "sync") {
    if (typeof body.currentTime === "number") {
      room.currentTime = body.currentTime;
    }
    if (typeof body.paused === "boolean") {
      room.paused = body.paused;
    }
    room.updatedAt = now;
  } else if (body.action === "chat" && body.message) {
    room.messages.push({
      id: Math.random().toString(36).slice(2, 9),
      user: body.viewerName || "Anonymous",
      text: body.message.trim().slice(0, 200),
      timestamp: now,
    });
    if (room.messages.length > 50) {
      room.messages.shift();
    }
  }

  return NextResponse.json(room);
}
