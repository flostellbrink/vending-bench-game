import { crc32, deflateSync } from "node:zlib";

function chunk(name, data) {
  const type = Buffer.from(name);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length);
  type.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

// Red and green encode horizontal and vertical sampling offsets.
// Each centreline stays straight. Deflection increases near the glass corners.
export function glassMap() {
  const size = 128,
    stride = 1 + size * 3;
  const pixels = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    const v = (2 * y) / (size - 1) - 1;
    for (let x = 0; x < size; x++) {
      const u = (2 * x) / (size - 1) - 1,
        offset = y * stride + 1 + x * 3;
      pixels[offset] = Math.round(127.5 * (1 + u * v * v));
      pixels[offset + 1] = Math.round(127.5 * (1 + v * u * u));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
