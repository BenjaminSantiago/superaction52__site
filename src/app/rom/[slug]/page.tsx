import Link from "next/link"
import Image from "next/image";
import {notFound} from "next/navigation";
import { get_ROM_by_slug, roms} from "../../../lib/roms";

type ROM_page__props = 
{
    params: Promise<{
        slug: string;
    }>;
};

export function generateStaticParams()
{
    return roms.map((rom) => (
        {
            slug: rom.slug,
        }
    ));
}

function format_bytes(bytes: number)
{
    return `${Math.round(bytes / 1024)} KB`;
}

export default async function ROM_page( { params } : ROM_page__props)
{
    /* need a back link */

    const { slug } = await params;
    const rom = get_ROM_by_slug(slug);

    if(!rom)
    {
        notFound();
    }

    return (
        <main>
            <p> Game #{rom.order}</p>

            <h1> { rom.title }</h1>

            <p>{rom.description }</p>

            <p>
                <Link href = "/">Back home</Link>
            </p>
            <Image
            
            src    = {`/../ROMS/${ rom.slug }/${ rom.cover_image.src }`}
            alt    = { rom.cover_image.alt }
            width  = { rom.cover_image.width }
            height = { rom.cover_image.height }
            />
            <dl>
                <dt>Version</dt>
                <dd>{rom.version}</dd>

                <dt>Size</dt>
                <dd>{format_bytes(rom.rom.size_bytes)}</dd>

                <dt>completed</dt>
                <dd> {rom.completion_date ?? "In Progress"}</dd>
            </dl>
        </main>
    );
}