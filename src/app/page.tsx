import Link from "next/link"
import { roms } from "../lib/roms"
import ROM_card from "../components/ROM_card"

export default function HOME()
{
  const ordered_ROMs = [...roms].sort(
    (firstROM, secondROM) => firstROM.order - secondROM.order
  );

  // PAGE 
  // ----------------------------------------------->
  return (
    <>
    <main>
      <h1> SUPER ACTION 52</h1>
      <p> 52 (small) Super Nintendo games, project updated every week! </p>

      <p> 
        <Link href = "https://benjaminsantiago.com">from Benjamin Santiago</Link>
      </p> 
      <p>
          <Link href = "https://github.com/BenjaminSantiago/superaction52__games">
            follow on github!
          </Link>
      </p>

      <h2> ROMS </h2>
      {ordered_ROMs.map((rom) => (
        <ROM_card key = {rom.slug} rom= {rom} />
      ))}
      
      <h2>VIDEOS/UPDATES</h2>
      <div className = "w-full aspect-video">
        <iframe className = "w-full h-full rounded-lg"
        src="https://www.youtube.com/embed/4nx-mF4-m6o?si=VdlAHwDOhl3Jw2TG" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
      </div>

      <h2>TOOLS</h2>
      <p>
        <Link href="/tools/gif-to-snes">GIF to SNES</Link>
      </p>

    </main>
    </>
  );
}
