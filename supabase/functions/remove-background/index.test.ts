/**
 * Unit tests for the remove-background handler.
 * Run: deno test --allow-env supabase/functions/remove-background/index.test.ts
 *
 * These tests cover request validation without needing real credentials or
 * network access. Full pipeline tests live in scripts/test-remove-bg.mjs.
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handler } from "./handler.ts";

const BASE = "https://edge.test";

function makeReq(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(BASE, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── CORS preflight ─────────────────────────────────────────────────────────────

Deno.test("OPTIONS returns 200 with CORS headers", async () => {
  const res = await handler(makeReq("OPTIONS"));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

// ── Method guard ───────────────────────────────────────────────────────────────

Deno.test("GET returns 405", async () => {
  const res = await handler(makeReq("GET"));
  assertEquals(res.status, 405);
  const body = await res.json();
  assertEquals(body.error, "Method not allowed");
});

Deno.test("PUT returns 405", async () => {
  const res = await handler(makeReq("PUT"));
  assertEquals(res.status, 405);
});

// ── Auth guard ─────────────────────────────────────────────────────────────────

Deno.test("POST without Authorization returns 401", async () => {
  const res = await handler(makeReq("POST", { imageBase64: "abc" }));
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Missing Authorization");
});

// ── Body validation (requires auth — we mock the Supabase getUser call) ────────

async function withMockedAuth(fn: () => Promise<void>) {
  // Stub Deno.env so createClient doesn't crash on missing vars
  const envStub = stub(Deno.env, "get", (key: string) => {
    const map: Record<string, string> = {
      SUPABASE_URL: "https://fake.supabase.co",
      SUPABASE_ANON_KEY: "fake-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-key",
      // deliberately omit REMOVE_BG_API_KEY in most tests
    };
    return map[key];
  });

  // Stub global fetch so auth.getUser() returns a fake user
  const fetchStub = stub(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Supabase auth.getUser call
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123", email: "test@test.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fallback — should not be reached in these tests
    return new Response(JSON.stringify({ error: "unexpected fetch" }), { status: 500 });
  });

  try {
    await fn();
  } finally {
    envStub.restore();
    fetchStub.restore();
  }
}

Deno.test("POST with invalid JSON body returns 400", async () => {
  await withMockedAuth(async () => {
    const req = new Request(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer fake-token",
      },
      body: "not-json{{{",
    });
    const res = await handler(req);
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Invalid JSON");
  });
});

Deno.test("POST without imageBase64 returns 400", async () => {
  await withMockedAuth(async () => {
    const res = await handler(makeReq("POST", {}, { Authorization: "Bearer fake-token" }));
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "imageBase64 required");
  });
});

Deno.test("POST returns 500 when REMOVE_BG_API_KEY is not set", async () => {
  await withMockedAuth(async () => {
    const res = await handler(
      makeReq("POST", { imageBase64: "dGVzdA==" }, { Authorization: "Bearer fake-token" })
    );
    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, "REMOVE_BG_API_KEY not configured");
  });
});

Deno.test("POST returns 502 when remove.bg is unreachable", async () => {
  const envStub = stub(Deno.env, "get", (key: string) => {
    const map: Record<string, string> = {
      SUPABASE_URL: "https://fake.supabase.co",
      SUPABASE_ANON_KEY: "fake-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-key",
      REMOVE_BG_API_KEY: "fake-remove-bg-key",
    };
    return map[key];
  });

  const fetchStub = stub(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    if (url.includes("remove.bg")) {
      throw new Error("Network timeout");
    }
    return new Response("unexpected", { status: 500 });
  });

  try {
    const res = await handler(
      makeReq("POST", { imageBase64: "dGVzdA==" }, { Authorization: "Bearer fake-token" })
    );
    assertEquals(res.status, 502);
    const body = await res.json();
    assertStringIncludes(body.error, "remove.bg unreachable");
  } finally {
    envStub.restore();
    fetchStub.restore();
  }
});

Deno.test("POST returns 502 when remove.bg returns non-200", async () => {
  const envStub = stub(Deno.env, "get", (key: string) => {
    const map: Record<string, string> = {
      SUPABASE_URL: "https://fake.supabase.co",
      SUPABASE_ANON_KEY: "fake-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-key",
      REMOVE_BG_API_KEY: "fake-remove-bg-key",
    };
    return map[key];
  });

  const fetchStub = stub(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    if (url.includes("remove.bg")) {
      return new Response(JSON.stringify({ errors: [{ title: "Invalid API key" }] }), {
        status: 403,
      });
    }
    return new Response("unexpected", { status: 500 });
  });

  try {
    const res = await handler(
      makeReq("POST", { imageBase64: "dGVzdA==" }, { Authorization: "Bearer fake-token" })
    );
    assertEquals(res.status, 502);
    const body = await res.json();
    assertStringIncludes(body.error, "remove.bg error 403");
  } finally {
    envStub.restore();
    fetchStub.restore();
  }
});
