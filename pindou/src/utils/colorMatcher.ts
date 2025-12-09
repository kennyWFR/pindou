/**
 * 颜色匹配工具函数
 * @description 使用欧几里得距离算法在指定品牌色卡中查找最接近的颜色
 */

import type { BrandKey, PaletteColor, ColorMatchResult } from '../types/index';
import { BRAND_PALETTES, BRAND_PALETTES_LAB } from './paletteData';

type LabTuple = [number, number, number];

/**
 * 计算两个 RGB 颜色之间的欧几里得距离
 * @param rgb1 - 第一个颜色的 RGB 数组 [R, G, B]
 * @param rgb2 - 第二个颜色的 RGB 数组 [R, G, B]
 * @returns 欧几里得距离值
 */
function calculateEuclideanDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  
  // 欧几里得距离公式: √[(r2-r1)² + (g2-g1)² + (b2-b1)²]
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

/**
 * 在指定品牌色卡中查找最接近目标颜色的拼豆颜色
 * @param targetRgb - 目标颜色的 RGB 数组 [R, G, B]，范围 0-255
 * @param brandKey - 品牌键名（如 'mard', 'hama', 'perler' 等）
 * @returns 最接近的色卡颜色及其距离
 * @throws 如果品牌不存在或色卡为空
 * 
 * @example
 * ```typescript
 * // 查找 Mard 品牌中最接近红色的颜色
 * const result = findClosestColor([255, 0, 0], 'mard');
 * console.log(result.color.name); // 输出最接近的色号名称
 * console.log(result.distance);   // 输出距离值
 * ```
 */
export function findClosestColor(
  targetRgb: [number, number, number],
  brandKey: BrandKey
): ColorMatchResult {
  // 获取指定品牌的色卡数据
  const palette = BRAND_PALETTES[brandKey];
  
  // 验证色卡是否存在
  if (!palette || palette.length === 0) {
    throw new Error(`品牌 "${brandKey}" 的色卡数据不存在或为空`);
  }
  
  // 验证 RGB 值范围
  const [r, g, b] = targetRgb;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error(`RGB 值必须在 0-255 范围内，当前值: [${r}, ${g}, ${b}]`);
  }
  
  // 初始化最佳匹配
  let closestColor: PaletteColor = palette[0];
  let minDistance = calculateEuclideanDistance(targetRgb, palette[0].rgb);
  
  // 遍历色卡查找最接近的颜色
  for (let i = 1; i < palette.length; i++) {
    const currentColor = palette[i];
    const distance = calculateEuclideanDistance(targetRgb, currentColor.rgb);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = currentColor;
      
      // 如果找到完全匹配的颜色，直接返回
      if (distance === 0) {
        break;
      }
    }
  }
  
  return {
    color: closestColor,
    distance: minDistance
  };
}

export function findClosestColorLab(
  targetRgb: [number, number, number],
  brandKey: BrandKey
): ColorMatchResult {
  const palette = BRAND_PALETTES[brandKey];
  if (!palette || palette.length === 0) {
    throw new Error(`品牌 "${brandKey}" 的色卡数据不存在或为空`);
  }

  const targetLab = rgbToLab(targetRgb);
  const labPalette = BRAND_PALETTES_LAB[brandKey];
  if (!labPalette || labPalette.length === 0) {
    throw new Error(`品牌 "${brandKey}" 的 LAB 色卡数据不存在或为空`);
  }

  let closestColor: PaletteColor = palette[0];
  let minDistance = deltaE(targetLab, labPalette[0]);

  for (let i = 1; i < palette.length; i++) {
    const distance = deltaE(targetLab, labPalette[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = palette[i];
      if (distance === 0) break;
    }
  }

  return {
    color: closestColor,
    distance: minDistance
  };
}

/**
 * 批量查找最接近的颜色（用于图片转换）
 * @param rgbArray - RGB 颜色数组
 * @param brandKey - 品牌键名
 * @returns 匹配结果数组
 */
export function findClosestColors(
  rgbArray: Array<[number, number, number]>,
  brandKey: BrandKey
): ColorMatchResult[] {
  return rgbArray.map(rgb => findClosestColor(rgb, brandKey));
}

/**
 * 将十六进制颜色转换为 RGB 数组
 * @param hex - 十六进制颜色值（带或不带 # 前缀）
 * @returns RGB 数组 [R, G, B]
 */
export function hexToRgb(hex: string): [number, number, number] {
  // 移除可能存在的 # 前缀
  const cleanHex = hex.replace('#', '');
  
  // 验证十六进制格式
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error(`无效的十六进制颜色值: ${hex}`);
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return [r, g, b];
}

/**
 * 将 RGB 数组转换为十六进制颜色
 * @param rgb - RGB 数组 [R, G, B]
 * @returns 十六进制颜色值（带 # 前缀）
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  
  // 验证 RGB 值范围
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error(`RGB 值必须在 0-255 范围内，当前值: [${r}, ${g}, ${b}]`);
  }
  
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 查找最接近的颜色（支持十六进制输入）
 * @param hexColor - 十六进制颜色值
 * @param brandKey - 品牌键名
 * @returns 最接近的色卡颜色及其距离
 */
export function findClosestColorByHex(
  hexColor: string,
  brandKey: BrandKey
): ColorMatchResult {
  const rgb = hexToRgb(hexColor);
  return findClosestColor(rgb, brandKey);
}

function rgbToLab(rgb: [number, number, number]): LabTuple {
  const [r, g, b] = rgb.map(value => {
    let channel = value / 255;
    channel = channel > 0.04045 ? Math.pow((channel + 0.055) / 1.055, 2.4) : channel / 12.92;
    return channel * 100;
  }) as [number, number, number];

  let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  const pivot = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : (7.787 * value) + (16 / 116);

  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);

  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [L, a, bVal];
}

function deltaE(lab1: LabTuple, lab2: LabTuple): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  return Math.sqrt(
    Math.pow(L1 - L2, 2) +
    Math.pow(a1 - a2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

