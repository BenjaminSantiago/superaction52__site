import Link from "next/link"
import { roms } from "../lib/roms"
import ROM_card from "../components/ROM_card"

type PlaylistItem = 
{
    id: string;
    snippet: 
    {
        title: string;
        resourceId:
        {
            videoId: string;
        };
    };
    contentDetails: 
    {
        videoPublishedAt: string;
    }
};

export default async function HOME()
{
    const api_key     = process.env.YOUTUBE_API_KEY;
    const playlist_ID = process.env.YOUTUBE_PLAYLIST_ID;
    
    const url = "https://www.googleapis.com/youtube/v3/playlistItems" + `?part=snippet,contentDetails&playlistId=${playlist_ID}&maxResults=50&key=${api_key}`;

    const response = await fetch(url, {cache: "no-store"});

    if(!response.ok)
    {
        throw new Error(`YouTube returned error ${response.status}`);
    }

    const data   = await response.json();
    const videos: PlaylistItem[] = data.items;

    if(!videos)
    {
        throw new Error("The playlist returned no video.");
    }


    const ordered_ROMs = [...roms].sort(
    (firstROM, secondROM) => firstROM.order - secondROM.order
  );

  // PAGE 
  // ----------------------------------------------->
  return (
    <>
    <main>
		<header>
			<h1> SUPER ACTION 52</h1>
				<p> 52 (small) Super Nintendo games, project updated every week! </p>
				<p> 
					<Link href = "https://benjaminsantiago.com">from Benjamin Santiago</Link>
				</p> 
                <ul className = "flex flex-row mx-auto gap-2 max-w-fit">
                    <li className = "border-2 rounded-[0.4rem] px-2 py-1">
                        <Link href = "https://github.com/BenjaminSantiago/superaction52__games">
                            follow on github!
                        </Link>
                    </li >

                    <li className = "border-2 rounded-[0.4rem] px-2 py-1">
                        follow on itch.io!
                    </li>

                    <li className = "border-2 rounded-[0.4rem] px-2 py-1">
                        follow on instagram!
                    </li>
                </ul>
		</header>

        {/* the ARCADE */}
        <section>
            <h2> ARCADE </h2> 
            <iframe
            src       = "/emulator/index.html"
            title     = "Play a game"
            className = "w-full aspect-4/3 items-center mx-auto h-[480px]"
            allowFullScreen
            />
            <p>in-browser emulation provided by <Link href = "https://emulatorjs.org/">emulatorJS</Link> and uses the <Link href = "https://bsnes.org/">bsnes</Link> core</p>
        </section>

      <section className = "columns">
        <section>
            <h2>UPDATES</h2>
            {videos.map((video)=>
                {
                    const formatted_date = new Date(video.contentDetails.videoPublishedAt)
                    .toLocaleDateString("en-US", 
                    {
                        month   : "2-digit",
                        day     : "2-digit",
                        year    : "numeric",
                        timeZone: "UTC"
                    });
            
                    return(
                        <div key = {video.id} className = "w-full aspect-video">
                            <Link href = {`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`}><h3>{video.snippet.title}</h3></Link>
                            <p>{formatted_date}</p>
                            <iframe className = "w-full h-full rounded-lg"
                            src={`https://www.youtube.com/embed/${video.snippet.resourceId.videoId}`} title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                        </div> 
                    ); 
                }
            )};

        </section>

        <section>
          <h2> GAMES </h2>
          {/* selector for display type */}
          <div>
            <ul className = "flex flex-row gap-1 max-w-fit mx-auto">
              <li> list | </li>
              <li> cards (compact) | </li>
              <li> cards (normal) |</li>
              <li> cards (verbose) </li> 
            </ul>
          </div>
          {/* container for ROM cards*/}
          <div className = "grid grid-cols-1 md:grid-cols-2 gap-1"> 
          {ordered_ROMs.map((rom) => (
            <ROM_card key = {rom.slug} rom= {rom} />
          ))}
          </div>
        </section>
        
        {/*

        //don't show this for now, until things are a little more robust

        <section>
          <h2>TOOLS</h2>
            <p><Link href="/tools/gif-to-snes">GIF to SNES</Link></p>
            <p> A tool to convert a gif to SNES color and image format. This produces a .pic file with image data, and a .clr file with palette information.</p>

        </section>
        */} 
      </section>
    </main>
    </>
  );
}
