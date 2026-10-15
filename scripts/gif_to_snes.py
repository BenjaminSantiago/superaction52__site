"""Convert one non-animated GIF directly to SNES .pic and .clr assets.

The picture is written as row-major 8x8 SNES planar tiles.  The palette is
written as little-endian BGR555 words.  Oversized images are proportionally
reduced to fit the requested screen bounds, then padded to whole 8x8 tiles.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import struct

from PIL import Image


PALETTE_SIZES = (4, 16, 128, 256)
QUANTIZE_METHODS = {
    "median-cut": Image.Quantize.MEDIANCUT,
    "maximum-coverage": Image.Quantize.MAXCOVERAGE,
    "fast-octree": Image.Quantize.FASTOCTREE,
    "libimagequant": Image.Quantize.LIBIMAGEQUANT,
}
RESAMPLING_METHODS = {
    "nearest": Image.Resampling.NEAREST,
    "bilinear": Image.Resampling.BILINEAR,
    "bicubic": Image.Resampling.BICUBIC,
    "lanczos": Image.Resampling.LANCZOS,
}
DITHER_METHODS = {
    "none": Image.Dither.NONE,
    "floyd-steinberg": Image.Dither.FLOYDSTEINBERG,
}


def parse_hex_color(value: str) -> tuple[int, int, int]:
    """Parse RRGGBB or #RRGGBB into an RGB tuple."""
    text = value.removeprefix("#")
    if len(text) != 6:
        raise argparse.ArgumentTypeError("colors must be written as RRGGBB")
    try:
        return tuple(int(text[offset : offset + 2], 16) for offset in (0, 2, 4))
    except ValueError as error:
        raise argparse.ArgumentTypeError("colors must be written as RRGGBB") from error


def parse_size(value: str) -> tuple[int, int]:
    """Parse WIDTHxHEIGHT."""
    parts = value.lower().split("x")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError("sizes must be written as WIDTHxHEIGHT")
    try:
        width, height = (int(part) for part in parts)
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "sizes must be written as WIDTHxHEIGHT"
        ) from error
    if width < 1 or height < 1:
        raise argparse.ArgumentTypeError("width and height must be positive")
    return width, height


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert one non-animated GIF directly to row-major SNES planar "
            ".pic tiles and a little-endian BGR555 .clr palette."
        )
    )
    parser.add_argument("input", type=Path, help="single-frame input GIF")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="output basename (default: input basename)",
    )
    parser.add_argument(
        "-c",
        "--colors",
        type=int,
        choices=PALETTE_SIZES,
        help=(
            "palette capacity: 4 (2bpp), 16 (4bpp), or 128/256 (8bpp); "
            "default: smallest capacity that preserves the SNES-rounded colors"
        ),
    )
    parser.add_argument(
        "--method",
        choices=tuple(QUANTIZE_METHODS),
        default="median-cut",
        help=(
            "palette reduction method (default: median-cut); these are Pillow "
            "methods, not exact Photoshop Perceptual/Selective replicas"
        ),
    )
    parser.add_argument(
        "--dither",
        choices=tuple(DITHER_METHODS),
        default="floyd-steinberg",
        help="color dithering method (default: floyd-steinberg)",
    )
    parser.add_argument(
        "--kmeans",
        type=int,
        default=0,
        help="extra k-means refinement passes supported by Pillow (default: 0)",
    )
    parser.add_argument(
        "--max-size",
        type=parse_size,
        default=(256, 224),
        metavar="WIDTHxHEIGHT",
        help="proportional fit bounds (default: 256x224)",
    )
    parser.add_argument(
        "--resample",
        choices=tuple(RESAMPLING_METHODS),
        default="lanczos",
        help="downscaling filter (default: lanczos; use nearest for pixel art)",
    )
    parser.add_argument(
        "--transparent-color",
        type=parse_hex_color,
        metavar="RRGGBB",
        help="make this exact source color transparent and reserve palette index 0",
    )
    parser.add_argument(
        "--no-transparency",
        action="store_true",
        help="flatten GIF transparency against --matte instead of reserving index 0",
    )
    parser.add_argument(
        "--alpha-threshold",
        type=int,
        choices=range(256),
        default=128,
        metavar="0-255",
        help="alpha values below this become transparent (default: 128)",
    )
    parser.add_argument(
        "--matte",
        type=parse_hex_color,
        default=(0, 0, 0),
        metavar="RRGGBB",
        help="RGB matte/padding color (default: 000000)",
    )
    parser.add_argument(
        "--preview",
        type=Path,
        help="also write an indexed GIF preview of the exact converted pixels",
    )
    args = parser.parse_args()
    if args.kmeans < 0:
        parser.error("--kmeans cannot be negative")
    if args.no_transparency and args.transparent_color is not None:
        parser.error("--no-transparency and --transparent-color cannot be combined")
    return args


def fit_size(
    size: tuple[int, int], maximum: tuple[int, int]
) -> tuple[int, int]:
    """Fit size within maximum without enlarging it."""
    width, height = size
    max_width, max_height = maximum
    scale = min(1.0, max_width / width, max_height / height)
    return max(1, round(width * scale)), max(1, round(height * scale))


def snes_rgb(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    """Round RGB888 to BGR555 and expand it back to its displayed RGB888 value."""
    result = []
    for component in rgb:
        component5 = component >> 3
        result.append((component5 << 3) | (component5 >> 2))
    return tuple(result)


def source_transparent_rgb(source: Image.Image) -> tuple[int, int, int] | None:
    """Return the RGB value of a GIF palette transparency entry, if present."""
    transparent_index = source.info.get("transparency")
    palette = source.getpalette()
    if not isinstance(transparent_index, int) or palette is None:
        return None
    offset = transparent_index * 3
    if offset + 2 >= len(palette):
        return None
    return tuple(palette[offset : offset + 3])


def apply_transparent_color(
    image: Image.Image, transparent_rgb: tuple[int, int, int]
) -> Image.Image:
    """Set alpha to zero wherever an RGBA image exactly matches an RGB color."""
    pixels = [
        (red, green, blue, 0)
        if (red, green, blue) == transparent_rgb
        else (red, green, blue, alpha)
        for red, green, blue, alpha in image.getdata()
    ]
    result = Image.new("RGBA", image.size)
    result.putdata(pixels)
    return result


def composite_rgb(image: Image.Image, matte: tuple[int, int, int]) -> Image.Image:
    """Composite RGBA pixels against a solid matte and return RGB."""
    background = Image.new("RGBA", image.size, (*matte, 255))
    return Image.alpha_composite(background, image).convert("RGB")


def choose_palette_size(
    rgb: Image.Image,
    transparency_mask: list[bool],
    requested: int | None,
) -> tuple[int, int]:
    """Choose a PCX2SNES-style palette capacity and report unique colors."""
    visible_colors = {
        snes_rgb(pixel)
        for pixel, transparent in zip(rgb.getdata(), transparency_mask)
        if not transparent
    }
    required = len(visible_colors) + (1 if any(transparency_mask) else 0)
    required = max(1, required)
    palette_size = requested or next(
        (size for size in PALETTE_SIZES if required <= size), 256
    )
    return palette_size, required


def quantize_for_snes(
    rgb: Image.Image,
    transparency_mask: list[bool],
    transparent_rgb: tuple[int, int, int],
    color_count: int,
    method: int,
    dither: int,
    kmeans: int,
) -> tuple[list[int], list[tuple[int, int, int]], int]:
    """Quantize pixels, reserve transparent index 0, and compact BGR555 colors."""
    has_transparency = any(transparency_mask)
    opaque_capacity = color_count - int(has_transparency)
    if opaque_capacity < 1 and not all(transparency_mask):
        raise SystemExit("The selected palette leaves no entry for opaque pixels")

    rgb_pixels = list(rgb.getdata())
    visible_pixels = [
        pixel
        for pixel, transparent in zip(rgb_pixels, transparency_mask)
        if not transparent
    ]
    if not visible_pixels:
        return [0] * len(rgb_pixels), [snes_rgb(transparent_rgb)], 1

    rounded_pixels = [snes_rgb(pixel) for pixel in rgb_pixels]
    ordered_visible_colors = list(
        dict.fromkeys(
            pixel
            for pixel, transparent in zip(rounded_pixels, transparency_mask)
            if not transparent
        )
    )
    if len(ordered_visible_colors) <= opaque_capacity:
        palette = [snes_rgb(transparent_rgb)] if has_transparency else []
        color_to_index = {
            color: index + len(palette)
            for index, color in enumerate(ordered_visible_colors)
        }
        palette.extend(ordered_visible_colors)
        indices = [
            0 if transparent else color_to_index[pixel]
            for pixel, transparent in zip(rounded_pixels, transparency_mask)
        ]
        return indices, palette, len(set(indices))

    # Hidden RGB values should not influence palette selection.  Giving them an
    # existing visible color keeps Pillow's rectangular quantizer unbiased.
    quantizer_pixels = [
        visible_pixels[0] if transparent else pixel
        for pixel, transparent in zip(rgb_pixels, transparency_mask)
    ]
    quantizer_source = Image.new("RGB", rgb.size)
    quantizer_source.putdata(quantizer_pixels)
    try:
        quantized = quantizer_source.quantize(
            colors=opaque_capacity,
            method=method,
            kmeans=kmeans,
            dither=dither,
        )
    except ValueError as error:
        if method == Image.Quantize.LIBIMAGEQUANT:
            raise SystemExit(
                "This Pillow installation was built without libimagequant; "
                "choose another --method"
            ) from error
        raise

    old_indices = list(quantized.getdata())
    old_palette = quantized.getpalette()
    if old_palette is None:
        raise SystemExit("Pillow did not return an indexed palette")

    palette: list[tuple[int, int, int]] = []
    if has_transparency:
        palette.append(snes_rgb(transparent_rgb))

    # Compact unused entries and colors that become identical after conversion
    # from RGB888 to the SNES's 5-bit channels.
    remap: dict[int, int] = {}
    rounded_to_index: dict[tuple[int, int, int], int] = {}
    for old_index in sorted(set(old_indices)):
        offset = old_index * 3
        rounded = snes_rgb(tuple(old_palette[offset : offset + 3]))
        if rounded not in rounded_to_index:
            rounded_to_index[rounded] = len(palette)
            palette.append(rounded)
        remap[old_index] = rounded_to_index[rounded]

    indices = [
        0 if transparent else remap[old_index]
        for old_index, transparent in zip(old_indices, transparency_mask)
    ]
    used_count = len(set(indices))
    return indices, palette, used_count


def pad_indices(
    indices: list[int], size: tuple[int, int], fill_index: int = 0
) -> tuple[list[int], tuple[int, int]]:
    """Pad row-major indices on the right/bottom to complete 8x8 tiles."""
    width, height = size
    padded_width = math.ceil(width / 8) * 8
    padded_height = math.ceil(height / 8) * 8
    if (padded_width, padded_height) == size:
        return indices, size
    padded = [fill_index] * (padded_width * padded_height)
    for row in range(height):
        source_start = row * width
        target_start = row * padded_width
        padded[target_start : target_start + width] = indices[
            source_start : source_start + width
        ]
    return padded, (padded_width, padded_height)


def encode_snes_tile(tile: list[int], bpp: int) -> bytes:
    """Encode 64 row-major indices as one SNES planar 8x8 tile."""
    encoded = bytearray()
    for plane_pair in range(0, bpp, 2):
        for row_start in range(0, 64, 8):
            low_plane = 0
            high_plane = 0
            for x, value in enumerate(tile[row_start : row_start + 8]):
                bit = 7 - x
                low_plane |= ((value >> plane_pair) & 1) << bit
                high_plane |= ((value >> (plane_pair + 1)) & 1) << bit
            encoded.extend((low_plane, high_plane))
    return bytes(encoded)


def write_picture(
    path: Path, indices: list[int], size: tuple[int, int], bpp: int
) -> int:
    """Write row-major 8x8 tiles and return the tile count."""
    width, height = size
    tile_count = (width // 8) * (height // 8)
    with path.open("wb") as output:
        for top in range(0, height, 8):
            for left in range(0, width, 8):
                tile = []
                for row in range(8):
                    start = (top + row) * width + left
                    tile.extend(indices[start : start + 8])
                output.write(encode_snes_tile(tile, bpp))
    return tile_count


def write_palette(
    path: Path, palette: list[tuple[int, int, int]], color_count: int
) -> None:
    """Write an exact-size, black-padded, little-endian BGR555 palette."""
    with path.open("wb") as output:
        for index in range(color_count):
            red, green, blue = palette[index] if index < len(palette) else (0, 0, 0)
            word = (red >> 3) | ((green >> 3) << 5) | ((blue >> 3) << 10)
            output.write(struct.pack("<H", word))


def save_preview(
    path: Path,
    indices: list[int],
    size: tuple[int, int],
    palette: list[tuple[int, int, int]],
    has_transparency: bool,
) -> None:
    """Save an indexed GIF showing the exact padded, SNES-rounded result."""
    preview = Image.frombytes("P", size, bytes(indices))
    flat_palette = [component for color in palette for component in color]
    flat_palette.extend([0] * (768 - len(flat_palette)))
    preview.putpalette(flat_palette)
    options = {"transparency": 0} if has_transparency else {}
    preview.save(path, format="GIF", **options)


def output_base(input_path: Path, requested: Path | None) -> Path:
    path = requested or input_path.with_suffix("")
    if path.suffix.lower() in (".pic", ".clr"):
        path = path.with_suffix("")
    return path


def asset_path(base: Path, extension: str) -> Path:
    """Append an asset extension without discarding dots in the basename."""
    return base.parent / f"{base.name}{extension}"


def main() -> None:
    args = parse_args()
    with Image.open(args.input) as source:
        if source.format != "GIF":
            raise SystemExit(f"Expected a GIF input, got {source.format or 'unknown'}")
        if getattr(source, "n_frames", 1) != 1:
            raise SystemExit(
                "Animated GIFs are not supported; use gif_to_snes_strip.py first"
            )

        source.load()
        original_size = source.size
        gif_transparent_rgb = source_transparent_rgb(source)
        rgba = source.convert("RGBA")

    if args.transparent_color is not None:
        rgba = apply_transparent_color(rgba, args.transparent_color)

    converted_size = fit_size(rgba.size, args.max_size)
    if converted_size != rgba.size:
        rgba = rgba.resize(converted_size, RESAMPLING_METHODS[args.resample])

    if args.no_transparency:
        has_transparency = False
        transparency_mask = [False] * (rgba.width * rgba.height)
    else:
        alpha = list(rgba.getchannel("A").getdata())
        transparency_mask = [value < args.alpha_threshold for value in alpha]
        has_transparency = any(transparency_mask)

    transparent_rgb = (
        args.transparent_color or gif_transparent_rgb or args.matte
    )
    rgb = composite_rgb(rgba, args.matte)
    palette_size, unique_color_count = choose_palette_size(
        rgb, transparency_mask, args.colors
    )
    colors_were_reduced = unique_color_count > palette_size
    if colors_were_reduced:
        reduction_note = f"reduced from {unique_color_count} SNES-rounded colors"
    else:
        reduction_note = f"preserved {unique_color_count} SNES-rounded colors exactly"

    bpp = 2 if palette_size == 4 else 4 if palette_size == 16 else 8
    indices, palette, used_color_count = quantize_for_snes(
        rgb,
        transparency_mask,
        transparent_rgb,
        palette_size,
        QUANTIZE_METHODS[args.method],
        DITHER_METHODS[args.dither],
        args.kmeans,
    )
    indices, padded_size = pad_indices(indices, converted_size)
    if max(indices, default=0) >= 1 << bpp:
        raise SystemExit("Internal error: a palette index does not fit the output bpp")

    base = output_base(args.input, args.output)
    base.parent.mkdir(parents=True, exist_ok=True)
    picture_path = asset_path(base, ".pic")
    palette_path = asset_path(base, ".clr")
    tile_count = write_picture(picture_path, indices, padded_size, bpp)
    write_palette(palette_path, palette, palette_size)

    if args.preview is not None:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        save_preview(
            args.preview, indices, padded_size, palette, has_transparency
        )

    print(f"Wrote tiles:   {picture_path}")
    print(f"Wrote palette: {palette_path}")
    if args.preview is not None:
        print(f"Wrote preview: {args.preview}")
    print(
        f"Image: {original_size[0]}x{original_size[1]} -> "
        f"{converted_size[0]}x{converted_size[1]} content -> "
        f"{padded_size[0]}x{padded_size[1]} tiled"
    )
    print(
        f"Tiles: {tile_count} row-major 8x8 tiles; {bpp}bpp "
        f"({8 * bpp} bytes/tile)"
    )
    palette_process = (
        f"method={args.method}, dither={args.dither}"
        if colors_were_reduced
        else "no reduction needed"
    )
    print(
        f"Palette: {palette_size} entries ({used_color_count} used), "
        f"{reduction_note}; {palette_process}"
    )
    if has_transparency:
        print("Transparency: palette index 0")


if __name__ == "__main__":
    main()
