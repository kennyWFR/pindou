/**
 * PixelBead 项目类型定义
 * @description 拼豆图纸生成器的核心类型定义
 */

/**
 * 色卡颜色定义
 */
export interface PaletteColor {
  /** 颜色名称/编号 (如 "A1", "H01") */
  name: string;
  /** 原始色号 (如 "fff5ca") */
  code: string;
  /** 十六进制颜色值 (带 # 前缀，如 "#fff5ca") */
  hex: string;
  /** RGB 数组 [R, G, B]，范围 0-255 */
  rgb: [number, number, number];
  /** CIELAB 数组 [L, a, b] */
  lab: [number, number, number];
}

/**
 * 品牌键名联合类型
 */
export type BrandKey = 
  | 'mard'
  | 'artkal'
  | 'hama'
  | 'perler'
  | 'perler-mini'
  | 'nabbi';

/**
 * 品牌色卡数据结构
 */
export type BrandPalettes = Record<BrandKey, PaletteColor[]>;
export type BrandPaletteLabs = Record<BrandKey, [number, number, number][]>;

/**
 * 品牌显示信息
 */
export interface BrandInfo {
  key: BrandKey;
  name: string;
  displayName: string;
}

/**
 * 图片转换配置
 */
export interface ConversionConfig {
  /** 选择的品牌 */
  brand: BrandKey;
  /** 拼豆宽度（颗数） */
  width: number;
  /** 原始图片路径 */
  imagePath: string;
}

/**
 * 颜色匹配结果
 */
export interface ColorMatchResult {
  /** 匹配到的色卡颜色 */
  color: PaletteColor;
  /** 欧几里得距离 */
  distance: number;
}

/**
 * 颜色算法模式
 */
export type ColorAlgorithm = 'standard' | 'enhanced';

