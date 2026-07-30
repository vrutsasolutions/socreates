import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = "http://localhost:8081/ws";
const realToken = process.argv[2];

function runCase(label, connectHeaders, { expectSuccess }) {
  return new Promise((resolve) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders,
      reconnectDelay: 0,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
    });

    const timeout = setTimeout(() => {
      console.log(`[${label}] TIMEOUT - no CONNECT or ERROR frame within 5s`);
      client.deactivate();
      resolve();
    }, 5000);

    client.onConnect = () => {
      clearTimeout(timeout);
      const verdict = expectSuccess ? "PASS" : "FAIL (should have been rejected)";
      console.log(`[${label}] CONNECTED - ${verdict}`);
      client.deactivate();
      resolve();
    };

    client.onStompError = (frame) => {
      clearTimeout(timeout);
      const verdict = expectSuccess ? "FAIL (should have connected)" : "PASS (rejected as expected)";
      console.log(`[${label}] REJECTED - ${verdict} - message: "${frame.headers["message"]}"`);
      client.deactivate();
      resolve();
    };

    client.onWebSocketError = (event) => {
      clearTimeout(timeout);
      console.log(`[${label}] WebSocket-level error - is the backend running on ${WS_URL}?`);
      resolve();
    };

    client.activate();
  });
}

async function main() {
  console.log(`Testing against ${WS_URL}\n`);
  await runCase("no-token", {}, { expectSuccess: false });
  await runCase("bad-token", { Authorization: "Bearer not-a-real-token" }, { expectSuccess: false });
  if (realToken) {
    await runCase("valid-token", { Authorization: `Bearer ${realToken}` }, { expectSuccess: true });
  } else {
    console.log("\n(Skipped valid-token case - pass a real JWT as an argument to test it too.)");
  }
}

main();
