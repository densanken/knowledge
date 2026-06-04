import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react()],
  adapter: cloudflare(),
  env: {
    schema: {
      BETTER_AUTH_SECRET: envField.string({
        access: "secret",
        context: "server",
        min: 32,
      }),
      BETTER_AUTH_URL: envField.string({
        access: "secret",
        context: "server",
        url: true,
      }),
      DISCORD_CLIENT_ID: envField.string({
        access: "secret",
        context: "server",
        min: 17,
        max: 19,
      }),
      DISCORD_CLIENT_SECRET: envField.string({
        access: "secret",
        context: "server",
        length: 32,
      }),
      DISCORD_ALLOWED_GUILD_ID: envField.string({
        access: "secret",
        context: "server",
        min: 17,
        max: 20,
      }),
    },
    validateSecrets: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
