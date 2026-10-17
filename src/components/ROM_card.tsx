import Link from "next/link";
import Image from "next/image";
import type { ROM } from "../types/rom";
import styles from "./ROM_card.module.css"

type ROM_card__props = 
{
    rom: ROM;
}

export default function ROM_card({ rom }: ROM_card__props)
{
    return(
        <article className = { styles.ROM_card }>
            <p className = { styles.game_number } >
                Game #{String(rom.order).padStart(2,"0")}
            </p>

            <h3>
                <Link href = {`../rom/${ rom.slug }`}>
                    {rom.title} { rom.version }
                </Link>
            </h3>
            <Image 
                         src     = {`/../ROMS/${ rom.slug }/${ rom.cover_image.src }`}
                         alt     = {rom.cover_image.alt}
                         width   = {rom.cover_image.width}
                         height  = {rom.cover_image.height}
                         loading = "eager"
            />                
            <p>status → {rom.status}</p>
            <p><Link href   = {`../ROMS/${ rom.rom.filename }`}>download </Link></p>
            <ul>
                {rom.genres.map((genre)=> (
                    <li className = {styles.genre} key = {genre}>{genre}</li>
                ))}
            </ul>
        </article>
    );
}