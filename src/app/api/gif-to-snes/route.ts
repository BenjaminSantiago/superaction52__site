import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";

const run_program = promisify(execFile);

export async function POST(request: Request)
{
    const form_data = await request.formData();

    const gif = form_data.get("gif");

    if(!(gif instanceof File))
    {
        return Response.json(
            {
                ok   : false,
                error: "Not a GIF!"
            },
            { status: 400 },
        );
    }

    if(gif.type !== "image/gif")
    {
        return Response.json(
        {
            ok   : false,
            error: "Not a GIF!",
        },
        { status: 400 },
        );
    }

    const gif_buffer = await gif.arrayBuffer();
    console.log("GIF contents:", gif_buffer.byteLength, "bytes");

    const temp_directory = await mkdtemp(join(tmpdir(), "gif-to-snes"));
    const input_path = join (temp_directory, "input.gif");

    await writeFile(input_path, new Uint8Array(gif_buffer));
    console.log("Saved GIF:", input_path);

    const script_path = join(
        process.cwd(),
        "scripts", 
        "gif_to_snes.py"
    );

    try
    {
        const result = await run_program(
            "python", 
            [script_path, input_path],
            { windowsHide: true, timeout: 30000 }
        );

        console.log(result.stdout);

        const zip_path = join(temp_directory, "snes-graphics.zip");

        await run_program(
            "python",
            ["-m", "zipfile", "-c", zip_path, "input.pic","input.clr"],
            {
                cwd: temp_directory,
                windowsHide: true,
                timeout: 30000
            }
        );

        console.log("Created ZIP:", zip_path);

        const zip_bytes = await readFile(zip_path);

        return new Response(zip_bytes, 
            {
                headers: 
                {
                    "Content-Type": "application/zip",
                    "Content-Disposition": 'attachment; filename="snes-graphics.zip"',
                }
            }
        )
    }
    catch(error)
    {
        console.error("Python conversion failed:", error);

        return Response.json(
            { ok: false, error: "GIF conversion failed." },
            { status: 500 }
        );
    }

}