/**
 * 高级图像预处理与降采样工具
 */

export interface DominantColorOptions {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  startX: number;
  startY: number;
  sampleWidth: number;
  sampleHeight: number;
}

/**
 * 预处理图像：增强对比度、饱和度并执行锐化
 */
export function preprocessImageData(source: ImageData): ImageData {
  const buffer = new Uint8ClampedArray(source.data);
  const { width, height } = source;

  adjustContrastAndSaturation(buffer, 0.15, 0.12);
  const sharpened = applySharpen(buffer, width, height, 0.6);
  source.data.set(sharpened);

  return source;
}

/**
 * 在一个网格内寻找主导颜色（带权重的众数）
 */
export function getDominantColor(options: DominantColorOptions): { r: number; g: number; b: number } {
  const { data, width, height, startX, startY, sampleWidth, sampleHeight } = options;
  const histogram = new Map<number, { r: number; g: number; b: number; weight: number; count: number }>();

  const stepX = Math.max(1, Math.floor(sampleWidth / 6));
  const stepY = Math.max(1, Math.floor(sampleHeight / 6));

  for (let y = 0; y < sampleHeight; y += stepY) {
    const py = Math.min(height - 1, startY + y);
    for (let x = 0; x < sampleWidth; x += stepX) {
      const px = Math.min(width - 1, startX + x);
      const idx = (py * width + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const contrast = maxChannel - minChannel;

      let weight = 1 + (contrast / 255) * 0.6;
      if (brightness < 80) {
        weight += 0.6;
      } else if (brightness > 200) {
        weight -= 0.2;
      }

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const slot = histogram.get(key);
      if (slot) {
        slot.r += r * weight;
        slot.g += g * weight;
        slot.b += b * weight;
        slot.weight += weight;
        slot.count++;
      } else {
        histogram.set(key, {
          r: r * weight,
          g: g * weight,
          b: b * weight,
          weight,
          count: 1
        });
      }
    }
  }

  let best: { r: number; g: number; b: number; weight: number; count: number } | null = null;
  histogram.forEach(entry => {
    if (!best || entry.weight > best.weight) {
      best = entry;
    }
  });

  if (!best) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.min(255, Math.max(0, Math.round(best.r / best.weight))),
    g: Math.min(255, Math.max(0, Math.round(best.g / best.weight))),
    b: Math.min(255, Math.max(0, Math.round(best.b / best.weight)))
  };
}

function adjustContrastAndSaturation(buffer: Uint8ClampedArray, contrastGain = 0.15, saturationGain = 0.12) {
  const contrast = 1 + contrastGain;
  const saturation = 1 + saturationGain;

  for (let i = 0; i < buffer.length; i += 4) {
    let r = buffer[i] / 255;
    let g = buffer[i + 1] / 255;
    let b = buffer[i + 2] / 255;

    r = clamp01(((r - 0.5) * contrast) + 0.5);
    g = clamp01(((g - 0.5) * contrast) + 0.5);
    b = clamp01(((b - 0.5) * contrast) + 0.5);

    const { h, s, l } = rgbToHsl(r, g, b);
    const newRgb = hslToRgb(h, Math.min(1, s * saturation), l);

    buffer[i] = Math.round(newRgb.r * 255);
    buffer[i + 1] = Math.round(newRgb.g * 255);
    buffer[i + 2] = Math.round(newRgb.b * 255);
  }
}

function applySharpen(buffer: Uint8ClampedArray, width: number, height: number, strength = 0.5): Uint8ClampedArray {
  const output = new Uint8ClampedArray(buffer.length);
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const sampleX = clampInt(x + kx, 0, width - 1);
          const sampleY = clampInt(y + ky, 0, height - 1);
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          const idx = (sampleY * width + sampleX) * 4;
          r += buffer[idx] * weight;
          g += buffer[idx + 1] * weight;
          b += buffer[idx + 2] * weight;
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = clamp255(buffer[idx] * (1 - strength) + r * strength);
      output[idx + 1] = clamp255(buffer[idx + 1] * (1 - strength) + g * strength);
      output[idx + 2] = clamp255(buffer[idx + 2] * (1 - strength) + b * strength);
      output[idx + 3] = buffer[idx + 3];
    }
  }

  return output;
}

function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0));
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const gray = l;
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3)
  };
}

const clamp255 = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

