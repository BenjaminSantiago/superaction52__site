"use client";

import { useState, useRef, useEffect, type SubmitEvent } from "react";
import Link from "next/link";

type status = 
| { kind: "idle" }
| { kind: "uploading" }
| { kind: "success"; message: string; zip_blob: Blob }
| { kind: "error"; message: string };

type api_error = {ok: false; error: string };

export default function gif_to_snes__page()
{
    const [ status, setStatus]    = useState<status>({ kind: "idle"});
    const download_link           = useRef<HTMLAnchorElement>(null);
    const auto_download_attempted = useRef(false);
    const zip_blob                = status.kind === "success" ? status.zip_blob : null;

    useEffect(()=>
    {
        const link = download_link.current;

        if (zip_blob === null || link === null)
        {
            return;
        }

        const download_url = URL.createObjectURL(zip_blob);
              link.href    = download_url;

        if(!auto_download_attempted.current)
        {
            auto_download_attempted.current = true;
            link.click();
        }

        return () =>
        {
            URL.revokeObjectURL(download_url);
            console.log("Released ZIP URL:", download_url);
        };

    }, [zip_blob]);

    async function handle_submit(event: SubmitEvent<HTMLFormElement>)
    {
        event.preventDefault();

        auto_download_attempted.current = false;

        setStatus({kind: "uploading" });

        const form_data = new FormData(event.currentTarget);

        const response = await fetch("/api/gif-to-snes", 
        {
            method: "POST",
            body  : form_data,
        });

        if(!response.ok)
        {
            const data: api_error = await response.json();

            setStatus({ kind: "error", message: data.error });
            return;
        }

        const zip_blob = await response.blob();

        setStatus(
            {
                kind    : "success",
                message : "Your ZIP file is ready! If the download doesn't start use the link below.",
                zip_blob: zip_blob,
            }
        )
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

            {status.kind === "success" && (
                <div> 
                    <p>{status.message}</p>
                    
                    <a  
                        ref      = {download_link}
                        download = "snes-graphics.zip"
                    >
                        Download ZIP
                    </a>
                </div>
            )}
            {status.kind === "error" && <p role = "alert"> {status.message}</p>}
        </main>
    )
}

