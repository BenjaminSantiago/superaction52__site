export type screenshot = 
{
    src   : string;
    alt   : string;
    width : number;
    height: number;
};

export type ROM_file = 
{
    format       : string;
    filename     : string;
    size_bytes   : number;
    download_path: string | null;
};

export type cover_image = 
{
    src   : string;
    alt   : string;
    width : number;
    height: number;
};

export type ROM = 
{
    slug           : string;
    title          : string;
    cover_image    : cover_image;
    description    : string;
    language       : string;
    version        : string;
    order          : number;
    status         : string;
    completion_date: string | null;
    genres         : string[];
    rom            : ROM_file;
    screenshots    : screenshot[];
}