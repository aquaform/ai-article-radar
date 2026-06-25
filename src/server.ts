/** Точка входа: поднимает HTTP-сервер на 0.0.0.0:$PORT. */
import { createApp } from "./app.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const HOST = "0.0.0.0"; // обязательно для Traefik/Dokploy, иначе 404.

const app = createApp();
app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Article Radar listening on http://${HOST}:${PORT}`);
});
