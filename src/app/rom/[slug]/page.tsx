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
    const { slug } = await params;
    const rom = get_ROM_by_slug(slug);

    if(!rom)
    {
        notFound();
    }

    const ordered_ROMS = [...roms].sort(
        (firstROM, secondROM) => firstROM.order - secondROM.order
    );
    
    const current_index = ordered_ROMS.findIndex(
        (item) => item.slug === slug
    );

    const previous_ROM = ordered_ROMS[current_index - 1];
    const next_ROM = ordered_ROMS[current_index + 1];

    return (
        <>
        <nav>
             <p>
                {previous_ROM && (<Link href={`/rom/${previous_ROM.slug}`}>← Previous </Link>)}
                <Link href = "/">↑ Back home ↑ </Link>
                {next_ROM && (<Link href = {`/rom/${next_ROM.slug}`}>Next Game → </Link>)}
            </p>
        </nav>
        <main>
            <p> Game no.{String(rom.order).padStart(2,"0")}</p>

            <h1 className = "mb-4"> { rom.title }</h1>
           
            <Image
            
            src    = {`/../ROMS/${ rom.slug }/${ rom.cover_image.src }`}
            alt    = { rom.cover_image.alt }
            width  = { rom.cover_image.width  * 1.5 }
            height = { rom.cover_image.height * 1.5 }
            />

            <p className = "max-w-2xl mx-auto my-4">{rom.description}</p>

            <dl className = "flex flex-col md:flex-row mx-auto max-w-fit border-2 md:px-2 my-4 rounded-[0.4rem]">
                <dt className = "px-2">version  → </dt>
                <dd className = "border-y-2 md:border-y-0 md:border-r-2 px-0 md:px-2">{rom.version}</dd>

                <dt className = "px-2">status → </dt>
                <dd className = "border-y-2 md:border-y-0 md:border-r-2 px-0 md:px-2">{rom.status}</dd>

                <dt className = "px-2">size → </dt>
                <dd className = "border-y-2 md:border-y-0 md:border-r-2 px-0 md:px-2">{format_bytes(rom.rom.size_bytes)}</dd>
                
                <dt className = "px-2" >completed →</dt>
                <dd > {rom.completion_date ?? "n/a"}</dd>
            </dl>
        </main>
        </>
    );
}