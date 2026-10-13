# Stand Here

Spatial event floor chat for the [Zero to Chat](https://www.cometchat.com/hackathon) hackathon. Walk into a room on the floor — only people in that CometChat group see the conversation.

## Setup

```bash
cd Project
npm install
npx @cometchat/skills add --family react --ide cursor
npx @cometchat/skills-cli@3 auth login
# create app if needed:
npx @cometchat/skills-cli@3 provision create --name "YourApp"
cp .env.example .env   # or let provision write .cometchat/config.json and copy values into .env
```

Required env (Vite):

- `VITE_COMETCHAT_APP_ID`
- `VITE_COMETCHAT_REGION`
- `VITE_COMETCHAT_AUTH_KEY`

## Run

```bash
npm run dev
```

Open **two separate browsers** (e.g. Chrome + Edge), not two tabs on the same profile — CometChat stores one session in `localStorage` per origin. Pick **Alex** in one and **Riley** in the other, join the same room, and send messages. Typing indicators and presence use CometChat groups + listeners.

## Demo users

| UID    | Name  |
|--------|-------|
| `alex` | Alex  |
| `riley`| Riley |

Groups are created on first launch: `standhere-stage`, `standhere-help`, `standhere-judges`, `standhere-quiet`.

## Stack

- Vite + React
- `@cometchat/chat-sdk-javascript` (messaging, groups, typing, presence)
- CometChat skills + docs MCP in `.cometchat/` and `.cursor/mcp.json`
