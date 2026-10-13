import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  enterRoom,
  initCometChat,
  loginUser,
  refreshOnlineSet,
} from "./cometchat";
import { DEMO_USERS, ROOMS } from "./rooms";
import "./App.css";

const LISTENER_ID = "stand-here-floor";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [phase, setPhase] = useState("pick");
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  const [roomId, setRoomId] = useState("help");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingFrom, setTypingFrom] = useState(null);
  const [online, setOnline] = useState(() => new Set());
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const joinedGuidRef = useRef(null);

  const room = useMemo(
    () => ROOMS.find((r) => r.id === roomId) ?? ROOMS[1],
    [roomId],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadHistory = useCallback(async (guid) => {
    const request = new CometChat.MessagesRequestBuilder()
      .setGUID(guid)
      .setLimit(40)
      .build();
    const list = await request.fetchPrevious();
    setMessages(list.filter((m) => m.getCategory() === "message").reverse());
    setTimeout(scrollToBottom, 50);
  }, []);

  const switchRoom = useCallback(
    async (nextId) => {
      const next = ROOMS.find((r) => r.id === nextId);
      if (!next) return;
      setTypingFrom(null);
      setMessages([]);
      const prev = joinedGuidRef.current;
      await enterRoom(prev, next.guid);
      joinedGuidRef.current = next.guid;
      setRoomId(nextId);
      await loadHistory(next.guid);
    },
    [loadHistory],
  );

  const pickUser = async (uid) => {
    setError("");
    setPhase("loading");
    try {
      await loginUser(uid);
      const user = DEMO_USERS.find((u) => u.uid === uid);
      setMe(user);
      setPhase("floor");
      setOnline(await refreshOnlineSet());
      await switchRoom("help");
    } catch (e) {
      setError(e?.message ?? "Login failed");
      setPhase("pick");
    }
  };

  useEffect(() => {
    if (phase !== "floor" || !room) return;

    CometChat.addMessageListener(
      LISTENER_ID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message) => {
          if (message.getReceiverId() !== room.guid) return;
          setMessages((prev) => [...prev, message]);
          setTypingFrom(null);
          setTimeout(scrollToBottom, 30);
        },
        onTypingStarted: (typing) => {
          if (typing.getReceiverId() !== room.guid) return;
          const sender = typing.getSender()?.getUid();
          if (sender === me?.uid) return;
          setTypingFrom(typing.getSender()?.getName() ?? sender);
        },
        onTypingEnded: (typing) => {
          if (typing.getReceiverId() !== room.guid) return;
          const sender = typing.getSender()?.getUid();
          if (sender === me?.uid) return;
          setTypingFrom(null);
        },
      }),
    );

    CometChat.addUserListener(
      `${LISTENER_ID}-users`,
      new CometChat.UserListener({
        onUserOnline: (user) => {
          setOnline((prev) => new Set(prev).add(user.getUid()));
        },
        onUserOffline: (user) => {
          setOnline((prev) => {
            const next = new Set(prev);
            next.delete(user.getUid());
            return next;
          });
        },
      }),
    );

    return () => {
      CometChat.removeMessageListener(LISTENER_ID);
      CometChat.removeUserListener(`${LISTENER_ID}-users`);
    };
  }, [phase, room.guid, me?.uid]);

  useEffect(() => {
    initCometChat().catch(() => {});
  }, []);

  const notifyTyping = (text) => {
    if (!room?.guid || !me) return;
    const indicator = new CometChat.TypingIndicator(
      room.guid,
      CometChat.RECEIVER_TYPE.GROUP,
    );
    if (text.trim()) {
      CometChat.startTyping(indicator);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        CometChat.endTyping(indicator);
      }, 2000);
    } else {
      CometChat.endTyping(indicator);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !room?.guid) return;
    const message = new CometChat.TextMessage(
      room.guid,
      text,
      CometChat.RECEIVER_TYPE.GROUP,
    );
    setDraft("");
    notifyTyping("");
    try {
      const sent = await CometChat.sendMessage(message);
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();
    } catch (err) {
      setError(err?.message ?? "Could not send message");
    }
  };

  if (phase === "pick" || phase === "loading") {
    return (
      <div className="shell pick-screen">
        <header className="brand">
          <h1>Stand Here</h1>
          <p>Walk into a room. Only people standing there can hear you.</p>
        </header>
        {error && <p className="error">{error}</p>}
        <div className="user-grid">
          {DEMO_USERS.map((u) => (
            <button
              key={u.uid}
              type="button"
              className="user-card"
              disabled={phase === "loading"}
              onClick={() => pickUser(u.uid)}
            >
              <span
                className="avatar"
                style={{ background: u.color }}
                aria-hidden
              >
                {u.name[0]}
              </span>
              <span className="user-name">{u.name}</span>
              <span className="user-hint">demo login</span>
            </button>
          ))}
        </div>
        {phase === "loading" && <p className="muted">Connecting…</p>}
      </div>
    );
  }

  return (
      <div className="shell floor-layout">
        <header className="top-bar">
          <div>
            <h1>Stand Here</h1>
            <p className="muted">
              You are <strong>{me?.name}</strong> — click a room to move
            </p>
          </div>
          <div className="presence-row">
            {DEMO_USERS.map((u) => (
              <span key={u.uid} className="presence-chip">
                <span
                  className={`dot ${online.has(u.uid) ? "on" : ""}`}
                  title={online.has(u.uid) ? "Online" : "Offline"}
                />
                {u.name}
              </span>
            ))}
          </div>
        </header>

        <div className="main-panels">
          <section className="floor-map" aria-label="Event floor">
            <div className="floor-grid">
              {ROOMS.map((r) => {
                const active = r.id === roomId;
                const youAreHere = active;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`room-tile ${active ? "active" : ""}`}
                    style={{
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      width: `${r.w}%`,
                      height: `${r.h}%`,
                      borderColor: r.accent,
                    }}
                    onClick={() => switchRoom(r.id)}
                  >
                    <span className="room-name">{r.name}</span>
                    <span className="room-blurb">{r.blurb}</span>
                    {youAreHere && (
                      <span
                        className="you-pin"
                        style={{ background: me?.color }}
                      >
                        {me?.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="room-chat" aria-label={`Chat in ${room.name}`}>
            <header
              className="chat-header"
              style={{ borderBottomColor: room.accent }}
            >
              <h2>{room.name}</h2>
              <p>{room.blurb}</p>
            </header>
            <ul className="message-list">
              {messages.map((m) => {
                const mine = m.getSender()?.getUid() === me?.uid;
                return (
                  <li
                    key={m.getId()}
                    className={`bubble-row ${mine ? "mine" : "theirs"}`}
                  >
                    <div className="bubble-meta">
                      {!mine && (
                        <span className="sender">
                          {m.getSender()?.getName()}
                        </span>
                      )}
                      <time>{formatTime(m.getSentAt())}</time>
                    </div>
                    <div
                      className="bubble"
                      style={
                        mine ? { background: me?.color } : undefined
                      }
                    >
                      {m.getText()}
                    </div>
                  </li>
                );
              })}
              {typingFrom && (
                <li className="typing-line">
                  <span className="typing-avatar">{typingFrom[0]}</span>
                  {typingFrom} is typing…
                </li>
              )}
              <li ref={messagesEndRef} />
            </ul>
            <form className="composer" onSubmit={sendMessage}>
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  notifyTyping(e.target.value);
                }}
                placeholder={`Message ${room.name}…`}
                autoComplete="off"
              />
              <button type="submit">Send</button>
            </form>
          </section>
        </div>
      </div>
  );
}
