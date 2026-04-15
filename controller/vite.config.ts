import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true,  // expose on LAN so phones can connect
    port: 5173,
    https: true, // required for DeviceOrientationEvent on Android Chrome
    proxy: {
      // Proxy /socket.io/* → the bridge server so the phone never hits plain HTTP
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
