import { auth } from "../../../lib/auth";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ request }) => auth.handler(request);
export const POST: APIRoute = ({ request }) => auth.handler(request);
