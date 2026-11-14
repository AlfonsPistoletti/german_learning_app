# Writes icons/icon-{180,192,512}.png: German flag stripes. Stdlib only.
# Run from the repo root: python tools/make_icons.py
import struct, zlib, pathlib

STRIPES = [(0, 0, 0), (221, 0, 0), (255, 206, 0)]

def png(size):
    rows = b''.join(b'\x00' + bytes(STRIPES[min(2, y * 3 // size)]) * size for y in range(size))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))

out = pathlib.Path('public/icons'); out.mkdir(exist_ok=True)
for s in (180, 192, 512):
    (out / f'icon-{s}.png').write_bytes(png(s))
print('icons written')
