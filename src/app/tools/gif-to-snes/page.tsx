"use client";

import { useState } from "react";
import Link from "next/link";

type status = 
| { kind: "idle" }
| { kind: "uploading" }
| { kind: "success"; message: string }
| { kind: "error"; message: string };

type api_response = 
| { ok: true; file_name: string; size: number }
| { ok: false; error: string };

export default function gif_to_snes__page()
{
    const [ status, setStatus] = useState<status>({ kind: "idle"});

    async function handle_submit(event: React.FormEvent<HTMLFormELement>)
    {
        event.preventDefault();

        setStatus({kind: "uploading" });

        const form_data = new FormData(event.currentTarget);

        const response = await fetch("/api/gif-to-snes", 
        {
            method: "POST",
            body: form_data, 
        });

        const data: api_response = await response.json();

        if(!data.ok)
        {
            setStatus({ kind: "error", message: data.error });
            return;
        }

        setStatus(
        {
            kind: "success",
            message:   `The server received ${ data.file_name } (${data.size} bytes).`,
        });
        }

        return (
            <main>
                <h1> GIF → SNES Graphics</h1>

                <Link href = "/">Back Home </Link>
                <form onSubmit = {handle_submit}>
                    <label htmlFor = "gif">Choose a static GIF</label>
                    <input
                        id     = "gif"
                        name   = "gif"
                        type   = "file"
                        accept = "image/gif"
                        required
                    />

                    <button type = "submit" disabled={status.kind === "uploading"}>
                        {status.kind === "uploading" ? "Checking GIF..." : "Send GIF" }
                    </button>
                </form>

                {status.kind === "success" && <p>{ status.message }</p>}
                {status.kind === "error" && <p role = "alert"> {status.message}</p>}
            </main>
        )
}

