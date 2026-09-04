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

            <h2>
                <Link href = {`../rom/${ rom.slug }`}>
                    {rom.title} { rom.version }
                </Link>
            </h2>
            <Image 
                         src    = {`/../ROMS/${ rom.slug }/${ rom.cover_image.src }`}
                         alt    = {rom.cover_image.alt}
                         width  = {rom.cover_image.width}
                         height = {rom.cover_image.height}
            />
                <p><Link href   = {`../ROMS/${ rom.rom.filename }`}>download </Link></p>
            <p> completed on: {rom.completion_date}</p>
            <p>{rom.description}</p>

            <ul>
                {rom.genres.map((genre)=> (
                    <li className = {styles.genre} key = {genre}>{genre}</li>
                ))}
            </ul>
        </article>
    );
}