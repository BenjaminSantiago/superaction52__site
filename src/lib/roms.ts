import ROMS_from_JSON from "../data/roms.json";
import type { ROM } from "../types/rom";

export const roms: ROM[] = ROMS_from_JSON;

export function get_ROM_by_slug(slug:string):ROM | undefined
{
    return roms.find((rom)=>rom.slug === slug);
}