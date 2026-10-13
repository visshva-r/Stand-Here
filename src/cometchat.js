import { CometChat } from "@cometchat/chat-sdk-javascript";
import { DEMO_USERS, ROOMS } from "./rooms";

const appId = import.meta.env.VITE_COMETCHAT_APP_ID;
const region = import.meta.env.VITE_COMETCHAT_REGION;
const authKey = import.meta.env.VITE_COMETCHAT_AUTH_KEY;

let initPromise = null;
let roomsReady = false;

export function getCredentials() {
  if (!appId || !region || !authKey) {
    throw new Error(
      "Missing VITE_COMETCHAT_* env vars. Copy .env.example to .env and provision credentials.",
    );
  }
  return { appId, region, authKey };
}

export async function initCometChat() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    getCredentials();
    const settings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(region)
      .build();
    await CometChat.init(appId, settings);
    await bootstrapUsers();
  })();

  return initPromise;
}

/** createUser accepts the dev Auth Key; createGroup requires a logged-in authToken. */
async function bootstrapUsers() {
  const { authKey: key } = getCredentials();

  for (const { uid, name } of DEMO_USERS) {
    const user = new CometChat.User(uid);
    user.setName(name);
    try {
      await CometChat.createUser(user, key);
    } catch {
      /* already exists */
    }
  }
}

function isMissingGroupError(err) {
  const code = err?.code ?? err?.name ?? "";
  const msg = (err?.message ?? String(err)).toLowerCase();
  return (
    code === "ERR_GUID_NOT_FOUND" ||
    code === "ERR_GROUP_NOT_FOUND" ||
    msg.includes("not found") ||
    msg.includes("does not exist")
  );
}

/** Run once after login so createGroup has an authToken. */
async function ensureRoomGroups() {
  if (roomsReady) return;

  for (const room of ROOMS) {
    let exists = false;
    try {
      await CometChat.getGroup(room.guid);
      exists = true;
    } catch (err) {
      if (!isMissingGroupError(err)) throw err;
    }

    if (!exists) {
      const group = new CometChat.Group(
        room.guid,
        room.name,
        CometChat.GROUP_TYPE.PUBLIC,
        "",
        "",
        room.blurb,
      );
      await CometChat.createGroup(group);
    }
  }

  roomsReady = true;
}

export async function loginUser(uid) {
  await initCometChat();
  const { authKey: key } = getCredentials();
  const existing = await CometChat.getLoggedinUser();
  if (existing?.getUid() === uid) {
    await ensureRoomGroups();
    return existing;
  }
  if (existing) await CometChat.logout();
  const user = await CometChat.login(uid, key);
  await ensureRoomGroups();
  return user;
}

export async function enterRoom(previousGuid, nextGuid) {
  if (previousGuid && previousGuid !== nextGuid) {
    try {
      await CometChat.leaveGroup(previousGuid);
    } catch {
      /* not a member */
    }
  }
  if (nextGuid) {
    try {
      await CometChat.joinGroup(
        nextGuid,
        CometChat.GROUP_TYPE.PUBLIC,
      );
    } catch (e) {
      const msg = e?.message ?? String(e);
      if (!msg.toLowerCase().includes("already")) throw e;
    }
  }
}

export async function refreshOnlineSet() {
  const online = new Set();
  for (const { uid } of DEMO_USERS) {
    try {
      const user = await CometChat.getUser(uid);
      if (user.getStatus() === "online") online.add(uid);
    } catch {
      /* ignore */
    }
  }
  return online;
}
