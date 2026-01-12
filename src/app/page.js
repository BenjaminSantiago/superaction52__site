import fs from "fs";
import path from "path";


export default function HOME()
{
  // build path
  const romDir = path.join(process.cwd(), "public", "ROMS");
  // get files in there
  const files = fs.readdirSync(romDir);

  //make JSON
  const roms = files 
    .filter(f => f.endsWith(".smc"))
    .sort()
    .map((filename, i) => (
      {
        filename, 
        url: `/ROMS/${filename}`,
        week: i + 1,
      }));

  // PAGE 
  // ----------------------------------------------->
  return (
    <>
    <main>
      <h1> SUPER ACTION 52</h1>
      <p> One (small, Super Nintendo) game per week! </p>

      <p> 
        <a href = "https://benjaminsantiago.com">from Benjamin Santiago</a>
      </p>

      <p> 
          <a href = "https://github.com/BenjaminSantiago/superaction52__games">
            follow on github!
          </a>
      </p>

      <h2> ROMS </h2>
      <ul>
        {roms.map(rom => (
          <li key = {rom.filename}>
            <a href = {rom.url}>
              Week {String(rom.week).padStart(2, "0")}. → {rom.filename.replace(".smc", "")}
            </a>
          </li>
        ))}
      </ul>
      
      <h2>VIDEOS/UPDATES</h2>
      <div>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/4nx-mF4-m6o?si=VdlAHwDOhl3Jw2TG" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
      </div>
    </main>
    </>
  );
}