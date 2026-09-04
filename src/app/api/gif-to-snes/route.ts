export const runtime = "nodejs";


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

    return Response.json(
    {
        ok       : true,
        file_name: gif.name,
        size     : gif.size,
    });
}