"""Build web subsets from the already licensed Noto Sans SC source.

One-off authoring tool: python with fonttools and brotli; no app dependency.
Include GB2312 characters, Latin, and punctuation. Other glyphs use system fallback.
"""
from pathlib import Path
import argparse
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1]
source = root / "assets/fonts/NotoSansSC-VF.ttf"
target = root / "assets/fonts/web"
target.mkdir(exist_ok=True)
unicodes = set(range(0x20, 0x250)) | set(range(0x2000, 0x2070)) | set(range(0x3000, 0x3040)) | {0x20AC, 0xFFE5}
for high in range(0xA1, 0xF8):
    for low in range(0xA1, 0xFF):
        try:
            unicodes.update(map(ord, bytes([high, low]).decode("gb2312")))
        except UnicodeDecodeError:
            pass
parser = argparse.ArgumentParser()
parser.add_argument("--weights", nargs="+", type=int, default=[400, 500, 700])
for weight in parser.parse_args().weights:
    font = TTFont(source)
    instantiateVariableFont(font, {"wght": weight}, inplace=True)
    options = subset.Options()
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.flavor = "woff2"
    destination = target / f"noto-sans-sc-{weight}.woff2"
    font.save(destination)
    print(destination.name, destination.stat().st_size)
