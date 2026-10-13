import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getSupabaseConfig,
  requireSupabaseConfig,
} from "../src/utils/supabase/config";
import { updateSession } from "../src/utils/supabase/middleware";
test("missing Supabase configuration is explicit and middleware remains optional", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    assert.equal(getSupabaseConfig(), null);
    assert.throws(requireSupabaseConfig, /ortam değişkenleri/);
    const response = await updateSession(
      new NextRequest("https://example.test/"),
    );
    assert.equal(response.status, 200);
    assert.equal(response.cookies.getAll().length, 0);
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
