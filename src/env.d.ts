/// <reference types="astro/client" />

import type { ServerAuthState } from "./lib/auth-session";

declare global {
  namespace App {
    interface Locals {
      auth: ServerAuthState;
    }
  }
}
