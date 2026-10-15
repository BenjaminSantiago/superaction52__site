import test from "node:test";
import assert from "node:assert/strict";

test("missing GIF returns a useful error", async()=>
{
    const response = await fetch(
        "http://localhost:3000/api/gif-to-snes",
        {
            method: "POST",
            body  : new FormData(),
            signal: AbortSignal.timeout(10000),
        }
    );

    assert.equal(response.status, 400);

    const result = await response.json();
    assert.equal(result.ok, false);
    assert.equal(typeof result.error, "string");
    assert.ok(result.error.trim().length > 0);
});