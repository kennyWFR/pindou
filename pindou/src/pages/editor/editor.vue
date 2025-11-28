<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="isProcessing" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
        <text class="loading-progress">{{ progressText }}</text>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="main-content" :class="{ 'main-content-disabled': isProcessing }">
      <!-- 顶部导航栏 -->
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="nav-text">返回</text>
        </view>
        <view class="nav-center"></view>
        <view class="nav-right">
          <view class="nav-action" @tap="handleSaveImage">
            <text class="nav-icon">💾</text>
            <text class="nav-text">导出图片</text>
          </view>
          <view class="nav-action" @tap="handleExportPoster">
            <text class="nav-icon">🖼️</text>
            <text class="nav-text">导出长图</text>
          </view>
        </view>
      </view>

      <!-- 信息栏 -->
      <view class="info-bar">
        <view class="info-item">
          <text class="info-label">品牌</text>
          <text class="info-value">{{ brandInfo?.displayName }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">尺寸</text>
          <text class="info-value">{{ gridWidth }}×{{ gridHeight }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">色数</text>
          <text class="info-value">{{ uniqueColorCount }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">缩放</text>
          <text class="info-value">{{ Math.round(canvasScale * 100) }}%</text>
        </view>
      </view>

      <!-- Canvas 画布（隐藏，用于图片处理） -->
      <canvas 
        id="processCanvas" 
        type="2d" 
        class="hidden-canvas"
      ></canvas>
      <canvas
        id="posterCanvas"
        type="2d"
        class="hidden-canvas"
      ></canvas>

      <!-- 画布容器 -->
      <view
        class="canvas-wrapper"
        :style="{
          minHeight: canvasPanelHeight + 'px'
        }"
      >
        <view
          v-if="isH5"
          class="canvas-scroll"
          :style="{
            maxHeight: canvasPanelHeight + 'px'
          }"
        >
          <view class="canvas-sizer" :style="{ transform: `scale(${displayScale})` }">
            <canvas
              id="displayCanvas"
              type="2d"
              class="display-canvas"
              :style="{
                width: canvasViewWidth + 'px',
                height: canvasViewHeight + 'px'
              }"
              @tap="handleCanvasTap"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            ></canvas>
          </view>
        </view>
        <movable-area
          v-else
          class="canvas-area"
          :style="{
            height: canvasPanelHeight + 'px'
          }"
        >
          <movable-view
            :key="movableKey"
            class="canvas-movable"
            direction="all"
            :scale="true"
            :scale-min="0.5"
            :scale-max="3"
            :scale-animation="false"
            :inertia="false"
            @scale="handleScale"
            :style="{
              width: canvasViewWidth + 'px',
              height: canvasViewHeight + 'px'
            }"
          >
            <canvas
              id="displayCanvas"
              type="2d"
              class="display-canvas"
              :style="{
                width: canvasViewWidth + 'px',
                height: canvasViewHeight + 'px'
              }"
              @tap="handleCanvasTap"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            ></canvas>
          </movable-view>
        </movable-area>
      </view>

      <!-- 工具栏 -->
      <view class="canvas-actions">
        <view class="actions-title">
          <text class="actions-label">画布工具</text>
          <text class="actions-tip">快速切换查看模式</text>
        </view>
        <view class="tool-row">
          <view class="tool-btn" @tap="toggleColorCodes">
            <text class="tool-icon">{{ showCodes ? '🚫' : '🔠' }}</text>
            <text class="tool-label">{{ showCodes ? '隐藏色号' : '显示色号' }}</text>
          </view>
          <view class="tool-btn" @tap="toggleAlgorithm">
            <text class="tool-icon">{{ colorAlgorithm === 'enhanced' ? '✨' : '🧠' }}</text>
            <text class="tool-label">{{ algorithmLabel }}</text>
          </view>
          <view class="tool-btn" @tap="toggleBeadShape">
            <text class="tool-icon">{{ beadShapeIcon }}</text>
            <text class="tool-label">{{ beadShapeLabel }}</text>
          </view>
          <view class="tool-btn" @tap="toggleStyle">
            <text class="tool-icon">{{ styleIcon }}</text>
            <text class="tool-label">{{ styleLabel }}</text>
          </view>
        </view>
      </view>

      <!-- 用量清单 -->
      <view class="bom-section">
        <view class="bom-header">
          <view class="bom-header-title">
            <text class="bom-title">📋 用量清单</text>
            <text class="bom-subtitle">{{ uniqueColorCount }} 种颜色 · {{ totalBeads }} 颗</text>
          </view>
          <view class="copy-action">
            <button class="nav-action" @tap="exportBOMList">
              <text class="action-icon">📤</text>
              <text class="action-btn-text">复制清单</text>
            </button>
          </view>
        </view>

        <view
          v-if="topBomItem"
          :key="topBomItem.color.name"
          class="bom-list-item bom-item-first"
          :class="{ 'bom-item-highlight': highlightColor === topBomItem.color.name }"
          @tap="handleBomHighlight(topBomItem.color.name)"
        >
          <view
            class="bom-color-dot"
            :style="{ backgroundColor: topBomItem.color.hex }"
          ></view>

          <view class="bom-item-info">
            <text class="bom-item-code">{{ topBomItem.color.name }}</text>
          </view>

          <view class="bom-item-count-group">
            <text class="bom-item-count">{{ topBomItem.count }}</text>
            <text class="bom-item-unit">颗</text>
          </view>
        </view>

        <view
          v-for="item in restBomItems"
          :key="item.color.name"
          class="bom-list-item"
          :class="{ 'bom-item-highlight': highlightColor === item.color.name }"
          @tap="handleBomHighlight(item.color.name)"
        >
          <view
            class="bom-color-dot"
            :style="{ backgroundColor: item.color.hex }"
          ></view>

          <view class="bom-item-info">
            <text class="bom-item-code">{{ item.color.name }}</text>
          </view>

          <view class="bom-item-count-group">
            <text class="bom-item-count">{{ item.count }}</text>
            <text class="bom-item-unit">颗</text>
          </view>
        </view>

        <view v-if="bomData.length === 0" class="bom-empty">
          <text class="empty-icon">📦</text>
          <text class="empty-text">暂无数据</text>
        </view>
      </view>
    </view>

    <!-- 颜色选择器弹窗 -->
    <view v-if="showColorPicker" class="modal-overlay" @tap="handleOverlayTap">
      <view class="modal-content color-picker-modal" :style="colorPickerStyle" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">🎨 选择颜色</text>
          <text class="modal-close" @tap="closeColorPicker">✕</text>
        </view>
        
        <!-- 当前选中格子信息 -->
        <view v-if="selectedCell" class="selected-cell-info">
          <view class="cell-info-details">
            <view class="cell-position">
              <text class="position-label">位置:</text>
              <text class="position-value">({{ selectedCell.x }}, {{ selectedCell.y }})</text>
            </view>
            <view class="cell-current-color">
              <text class="color-label">当前:</text>
              <view 
                class="color-preview-small" 
                :style="{ backgroundColor: selectedCell.color?.hex || '#FFFFFF' }"
              ></view>
              <text class="color-name">{{ selectedCell.color?.name || '空' }}</text>
            </view>
          </view>
          <view
            v-if="selectedCell?.color"
            class="highlight-inline"
          >
            <view class="highlight-btn" @tap="toggleHighlightForSelected">
              <text class="highlight-icon">🎯</text>
              <text class="highlight-text">
                {{
                  highlightColor === selectedCell?.color?.name
                    ? '取消同色高亮'
                    : '同色高亮'
                }}
              </text>
            </view>
          </view>
        </view>

        <!-- 颜色列表 -->
        <scroll-view class="color-list" scroll-y>
          <!-- 橡皮擦选项 -->
          <view class="color-item eraser" @tap="selectColor(null)">
            <view class="color-preview eraser-preview">
              <text class="eraser-icon">🧹</text>
            </view>
            <view class="color-info">
              <text class="color-item-name">橡皮擦</text>
              <text class="color-item-hex">清除颜色</text>
            </view>
          </view>

          <!-- 品牌颜色列表 -->
          <view 
            v-for="color in brandColors" 
            :key="color.name"
            class="color-item"
            :class="{ 'color-item-selected': selectedCell?.color?.name === color.name }"
            @tap="selectColor(color)"
          >
            <view 
              class="color-preview" 
              :style="{ backgroundColor: color.hex }"
            ></view>
            <view class="color-info">
              <text class="color-item-name">{{ color.name }}</text>
              <text class="color-item-code">{{ color.code }}</text>
            </view>
            <text v-if="selectedCell?.color?.name === color.name" class="check-icon">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { BrandKey, PaletteColor, ColorAlgorithm } from '../types/index';
import { findClosestColor, findClosestColorLab } from '@/utils/colorMatcher';
import { BRAND_LIST, getBrandPalette } from '@/utils/paletteData';
import { preprocessImageData, getDominantColor } from '@/utils/imageProcessor';

// ============================================
// 类型定义
// ============================================

interface GridCell {
  x: number;
  y: number;
  color: PaletteColor | null;
}

interface BOMItem {
  color: PaletteColor;
  count: number;
}

interface PosterLayout {
  width: number;
  height: number;
  padding: number;
  titleY: number;
  metaStartY: number;
  image: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  bomStartY: number;
  bomRowHeight: number;
}

// ============================================
// 响应式数据
// ============================================

const isH5 = ref(false);
// #ifdef H5
isH5.value = true;
// #endif

// 页面参数
const brandKey = ref<BrandKey>('mard');
const imagePath = ref<string>('');
const gridWidth = ref<number>(40);
const gridHeight = ref<number>(0);

// 处理状态
const isProcessing = ref<boolean>(true);
const loadingText = ref<string>('正在加载...');
const progressText = ref<string>('');

// 网格数据
const gridData = ref<GridCell[][]>([]);
const bomData = ref<BOMItem[]>([]);

// Canvas 相关
let processCanvas: any = null;
let processCtx: any = null;
let displayCanvas: any = null;
let displayCtx: any = null;
let posterCanvas: any = null;
let posterCtx: any = null;
let dpr = 1;
let posterDpr = 1;
let posterScale = 1;
let originalImageData: ImageData | null = null;

// 画布尺寸
const beadSize = ref<number>(20);
const canvasViewWidth = ref<number>(800);
const canvasViewHeight = ref<number>(600);
const canvasScale = ref<number>(1);
const displayScale = ref<number>(1);

// UI 状态
const POSTER_WIDTH = 1080;
const POSTER_MAX_SCALE = 1.5;
const canvasPanelHeight = ref<number>(520);
const showGrid = ref<boolean>(false);
const showCodes = ref<boolean>(true);
const showShading = ref<boolean>(false);
const highlightColor = ref<string | null>(null);
const toolsOffsetTop = ref<number>(0);
const colorPickerHeight = ref<number>(480);
const movableKey = ref<number>(0);
const showColorPicker = ref<boolean>(false);
const selectedCell = ref<GridCell | null>(null);
const isZooming = ref<boolean>(false);
const activeTouchCount = ref<number>(0);
let zoomCooldownUntil = 0;
const colorAlgorithm = ref<ColorAlgorithm>('standard');
const beadShape = ref<'circle' | 'square'>('square');

// ============================================
// 计算属性
// ============================================

const brandInfo = computed(() => {
  return BRAND_LIST.find(b => b.key === brandKey.value);
});

const uniqueColorCount = computed(() => {
  return bomData.value.length;
});

const totalBeads = computed(() => {
  return bomData.value.reduce((sum, item) => sum + item.count, 0);
});

const brandColors = computed(() => {
  return getBrandPalette(brandKey.value);
});
const topBomItem = computed(() => bomData.value[0] || null);
const restBomItems = computed(() => bomData.value.slice(1));

const algorithmLabel = computed(() =>
  colorAlgorithm.value === 'enhanced' ? '标准图像' : '图像增强'
);
const beadShapeLabel = computed(() =>
  beadShape.value === 'circle' ? '方形拼豆' : '圆形色块'
);
const beadShapeIcon = computed(() =>
  beadShape.value === 'circle' ? '🟦' : '🔵'
);
const styleEnhanced = computed(() => showGrid.value && showShading.value);
const styleLabel = computed(() => (styleEnhanced.value ? '纯色豆子' : '精细网格'));
const styleIcon = computed(() => (styleEnhanced.value ? '✔️' : '🔲'));

const colorPickerStyle = computed(() => {
  return {
    height: `${colorPickerHeight.value}px`,
    maxHeight: `${colorPickerHeight.value}px`
  };
});

// ============================================
// 生命周期
// ============================================

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as any;
  const options = currentPage.options || {};
  
  if (options.brand) {
    brandKey.value = options.brand as BrandKey;
  }
  if (options.width) {
    gridWidth.value = parseInt(options.width);
  }
  if (options.image) {
    imagePath.value = decodeURIComponent(options.image);
  }
  
  console.log('编辑器参数:', {
    brandKey: brandKey.value,
    gridWidth: gridWidth.value,
    imagePath: imagePath.value
  });
  
  initializeEditor();
});

// ============================================
// 核心处理函数
// ============================================

async function initializeEditor() {
  try {
    loadingText.value = '初始化 Canvas...';
    await initCanvas();
    
    loadingText.value = '加载图片...';
    await loadAndProcessImage();
    updateCanvasLayout();
    
    loadingText.value = '绘制拼豆...';
    await initDisplayCanvas();
    drawBeads();
    
    loadingText.value = '完成！';
    isProcessing.value = false;
    
    uni.showToast({
      title: '处理完成',
      icon: 'success'
    });
  } catch (error) {
    console.error('初始化失败:', error);
    isProcessing.value = false;
    
    uni.showModal({
      title: '处理失败',
      content: (error as Error).message || '图片处理失败，请返回重试',
      showCancel: false,
      success: () => {
        uni.navigateBack();
      }
    });
  }
}

async function initCanvas(): Promise<void> {
  return new Promise((resolve, reject) => {
    const systemInfo = uni.getSystemInfoSync();
    dpr = systemInfo.pixelRatio || 1;

    if (isH5.value) {
      processCanvas = document.createElement('canvas');
      processCtx = processCanvas.getContext('2d');
      if (!processCtx) {
        reject(new Error('无法获取 Canvas 上下文'));
        return;
      }
      console.log('Process Canvas 初始化成功 (H5 DOM), DPR:', dpr);
      resolve();
      return;
    }

    const query = uni.createSelectorQuery();

    query
      .select('#processCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          reject(new Error('无法获取 Canvas 节点'));
          return;
        }

        const canvasNode = res[0].node;
        if (!canvasNode) {
          reject(new Error('Canvas 节点为空'));
          return;
        }

        processCanvas = canvasNode;
        processCtx = processCanvas.getContext('2d');

        if (!processCtx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        console.log('Process Canvas 初始化成功, DPR:', dpr);
        resolve();
      });
  });
}

async function initDisplayCanvas(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isH5.value) {
      displayCanvas = document.getElementById('displayCanvas') as HTMLCanvasElement | null;
      if (!displayCanvas) {
        reject(new Error('无法获取 Display Canvas 节点'));
        return;
      }
      displayCtx = displayCanvas.getContext('2d');
      if (!displayCtx) {
        reject(new Error('无法获取 Display Canvas 上下文'));
        return;
      }

      canvasViewWidth.value = gridWidth.value * beadSize.value;
      canvasViewHeight.value = gridHeight.value * beadSize.value;

      displayCanvas.width = canvasViewWidth.value * dpr;
      displayCanvas.height = canvasViewHeight.value * dpr;
      displayCtx.setTransform(1, 0, 0, 1, 0, 0);
      displayCtx.scale(dpr, dpr);

      console.log('Display Canvas 初始化成功 (H5 DOM)');
      console.log('画布尺寸:', canvasViewWidth.value, 'x', canvasViewHeight.value);
      resolve();
      return;
    }

    const query = uni.createSelectorQuery();

    query
      .select('#displayCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          reject(new Error('无法获取 Display Canvas 节点'));
          return;
        }

        const canvasNode = res[0].node;
        if (!canvasNode) {
          reject(new Error('Display Canvas 节点为空'));
          return;
        }

        displayCanvas = canvasNode;
        displayCtx = displayCanvas.getContext('2d');

        if (!displayCtx) {
          reject(new Error('无法获取 Display Canvas 上下文'));
          return;
        }

        canvasViewWidth.value = gridWidth.value * beadSize.value;
        canvasViewHeight.value = gridHeight.value * beadSize.value;

        displayCanvas.width = canvasViewWidth.value * dpr;
        displayCanvas.height = canvasViewHeight.value * dpr;
        displayCtx.scale(dpr, dpr);

        console.log('Display Canvas 初始化成功 (App/MP)');
        console.log('画布尺寸:', canvasViewWidth.value, 'x', canvasViewHeight.value);
        resolve();
      });
  });
}

async function loadAndProcessImage(): Promise<void> {
  const imageInfo = await getImageInfo(imagePath.value);
  console.log('图片信息:', imageInfo);
  
  const aspectRatio = imageInfo.height / imageInfo.width;
  gridHeight.value = Math.round(gridWidth.value * aspectRatio);
  
  console.log('网格尺寸:', gridWidth.value, 'x', gridHeight.value);
  
  processCanvas.width = gridWidth.value * dpr;
  processCanvas.height = gridHeight.value * dpr;
  processCtx.scale(dpr, dpr);
  
  const img = typeof processCanvas.createImage === 'function'
    ? processCanvas.createImage()
    : new Image();
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      console.log('图片加载成功');
      
      processCtx.drawImage(img, 0, 0, gridWidth.value, gridHeight.value);
      
      const imageData = processCtx.getImageData(
        0, 
        0, 
        gridWidth.value * dpr, 
        gridHeight.value * dpr
      );
      
      console.log('开始像素化处理...');
      progressText.value = '0%';
      
      originalImageData = cloneImageData(imageData);
      pixelateAndMatch(cloneImageData(imageData));
      
      resolve();
    };
    
    img.onerror = (err: any) => {
      console.error('图片加载失败:', err);
      reject(new Error('图片加载失败'));
    };
    
    img.src = imagePath.value;
  });
}

function getImageInfo(path: string): Promise<UniApp.GetImageInfoSuccessData> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: resolve,
      fail: reject
    });
  });
}

function pixelateAndMatch(sourceImage: ImageData) {
  const useEnhanced = colorAlgorithm.value === 'enhanced';
  const workingImage = useEnhanced ? preprocessImageData(cloneImageData(sourceImage)) : sourceImage;
  const { width, height, data } = workingImage;
  const pixelsPerCellX = width / gridWidth.value;
  const pixelsPerCellY = height / gridHeight.value;

  const grid: GridCell[][] = [];
  const colorCountMap = new Map<string, { color: PaletteColor; count: number }>();
  const matchFn = useEnhanced ? findClosestColorLab : findClosestColor;

  for (let y = 0; y < gridHeight.value; y++) {
    const row: GridCell[] = [];

    for (let x = 0; x < gridWidth.value; x++) {
      const pixelX = Math.floor(x * pixelsPerCellX);
      const pixelY = Math.floor(y * pixelsPerCellY);
      const sampleWidth = Math.max(1, Math.round(pixelsPerCellX));
      const sampleHeight = Math.max(1, Math.round(pixelsPerCellY));

      const sampled = useEnhanced
        ? getDominantColor({
            data,
            width,
            height,
            startX: pixelX,
            startY: pixelY,
            sampleWidth,
            sampleHeight
          })
        : sampleCellColor(
            data,
            width,
            height,
            pixelX,
            pixelY,
            pixelsPerCellX,
            pixelsPerCellY
          );

      const matchResult = matchFn(
        [sampled.r, sampled.g, sampled.b],
        brandKey.value
      );

      const cell: GridCell = {
        x,
        y,
        color: matchResult.color
      };

      row.push(cell);

      const colorKey = matchResult.color.name;
      if (colorCountMap.has(colorKey)) {
        colorCountMap.get(colorKey)!.count++;
      } else {
        colorCountMap.set(colorKey, {
          color: matchResult.color,
          count: 1
        });
      }
    }

    grid.push(row);

    const progress = Math.round(((y + 1) / gridHeight.value) * 100);
    progressText.value = `${progress}%`;
  }

  gridData.value = grid;

  bomData.value = Array.from(colorCountMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.color.name.localeCompare(b.color.name);
    });

  console.log('处理完成！');
  console.log('网格数据:', grid.length, 'x', grid[0]?.length);
  console.log('BOM 清单:', bomData.value.length, '种颜色');
  console.log('总拼豆数:', totalBeads.value);
}

function updateCanvasLayout() {
  const systemInfo = uni.getSystemInfoSync();
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : systemInfo.windowWidth;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : systemInfo.windowHeight;

  if (isH5.value) {
    const baseBeadSize = 24;
    beadSize.value = baseBeadSize;
    canvasViewWidth.value = Math.round(gridWidth.value * beadSize.value);
    canvasViewHeight.value = Math.round(gridHeight.value * beadSize.value);

    const horizontalPadding = 120;
    const verticalPadding = 280;
    const fitWidth = Math.max(200, viewportWidth - horizontalPadding);
    const fitHeight = Math.max(200, viewportHeight - verticalPadding);
    const scale = Math.min(fitWidth / canvasViewWidth.value, fitHeight / canvasViewHeight.value, 1);
    displayScale.value = Number(scale.toFixed(4));
  } else {
    const horizontalPadding = viewportWidth >= 768 ? 200 : 48;
    const verticalReserved = viewportWidth >= 768 ? 320 : 420;
    const maxCanvasWidth = Math.max(320, viewportWidth - horizontalPadding);
    const maxCanvasHeight = Math.max(320, viewportHeight - verticalReserved);
    const sizeByWidth = maxCanvasWidth / gridWidth.value;
    const sizeByHeight = maxCanvasHeight / gridHeight.value;
    const optimalSize = Math.max(8, Math.min(sizeByWidth, sizeByHeight, 28));
    beadSize.value = Number(optimalSize.toFixed(2));
    canvasViewWidth.value = Math.round(beadSize.value * gridWidth.value);
    canvasViewHeight.value = Math.round(beadSize.value * gridHeight.value);
    displayScale.value = 1;
  }

  const scaledHeight = isH5.value
    ? canvasViewHeight.value * displayScale.value
    : canvasViewHeight.value;
  const minPanel = Math.max(280, Math.round(viewportHeight * 0.25));
  const maxPanel = Math.max(minPanel, Math.round(viewportHeight * 0.48));
  const paddedHeight = Math.round(scaledHeight + 30);
  canvasPanelHeight.value = Math.min(Math.max(paddedHeight, minPanel), maxPanel);

  measureToolsOffset();

  console.log('画布布局更新:', {
    beadSize: beadSize.value,
    canvasWidth: canvasViewWidth.value,
    canvasHeight: canvasViewHeight.value,
    displayScale: displayScale.value
  });
}

function measureToolsOffset() {
  nextTick(() => {
    try {
      uni.createSelectorQuery()
        .select('.canvas-actions')
        .boundingClientRect((rect: any) => {
          if (rect && rect.top !== undefined) {
            toolsOffsetTop.value = rect.top;
            const systemInfo = uni.getSystemInfoSync();
            const available = Math.max(320, systemInfo.windowHeight - rect.top - 24);
            colorPickerHeight.value = available;
          }
        })
        .exec();
    } catch (error) {
      console.warn('measureToolsOffset failed', error);
    }
  });
}

function sampleCellColor(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  startX: number,
  startY: number,
  cellWidth: number,
  cellHeight: number
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, count = 0;
  
  const sampleWidth = Math.max(1, Math.round(cellWidth));
  const sampleHeight = Math.max(1, Math.round(cellHeight));
  
  for (let dy = 0; dy < sampleHeight; dy++) {
    for (let dx = 0; dx < sampleWidth; dx++) {
      const x = startX + dx;
      const y = startY + dy;
      
      if (x >= imageWidth || y >= imageHeight) {
        continue;
      }
      
      const index = (y * imageWidth + x) * 4;
      
      if (index + 2 < data.length) {
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
        count++;
      }
    }
  }
  
  if (count === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

function cloneImageData(imageData: ImageData): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }
  if (processCtx && typeof processCtx.createImageData === 'function') {
    const clone = processCtx.createImageData(imageData.width, imageData.height);
    clone.data.set(new Uint8ClampedArray(imageData.data));
    return clone as ImageData;
  }
  return {
    data: new Uint8ClampedArray(imageData.data),
    width: imageData.width,
    height: imageData.height
  } as ImageData;
}

async function regenerateFromOriginal() {
  if (!originalImageData) return;
  const copy = cloneImageData(originalImageData);
  progressText.value = '0%';
  pixelateAndMatch(copy);
  drawBeads();
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) {
    return null;
  }
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return { r, g, b };
}

function getContrastColor(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return '#1A1A1A';
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? '#2D3436' : '#FFFFFF';
}

// ============================================
// 绘制函数
// ============================================

function drawBeads() {
  if (!displayCtx) return;
  
  const dpr = uni.getSystemInfoSync().pixelRatio || 1;
  displayCtx.save();
  displayCtx.setTransform(1, 0, 0, 1, 0, 0);
  displayCtx.clearRect(0, 0, canvasViewWidth.value * dpr, canvasViewHeight.value * dpr);
  displayCtx.restore();
  
  displayCtx.fillStyle = '#F8F9FA';
  displayCtx.fillRect(0, 0, canvasViewWidth.value, canvasViewHeight.value);
  
  for (let y = 0; y < gridHeight.value; y++) {
    for (let x = 0; x < gridWidth.value; x++) {
        const cell = gridData.value[y]?.[x];
        if (cell && cell.color) {
          const isHighlighted =
            highlightColor.value !== null && cell.color.name === highlightColor.value;
          drawBead(x, y, cell.color, isHighlighted);
        }
    }
  }
  
  if (showGrid.value) {
    drawGridLines();
  }
  
  if (selectedCell.value) {
    drawSelectionBox(selectedCell.value.x, selectedCell.value.y);
  }
}

function drawBead(x: number, y: number, color: PaletteColor, isHighlighted: boolean) {
  if (!displayCtx) return;
  
  const centerX = x * beadSize.value + beadSize.value / 2;
  const centerY = y * beadSize.value + beadSize.value / 2;
  const radius = beadSize.value * 0.45;
  
  if (beadShape.value === 'square') {
    const padding = beadSize.value * 0.08;
    const size = beadSize.value - padding * 2;
    const baseX = x * beadSize.value + padding;
    const baseY = y * beadSize.value + padding;

    displayCtx.fillStyle = color.hex;
    displayCtx.fillRect(baseX, baseY, size, size);

    if (showShading.value) {
      displayCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      displayCtx.fillRect(baseX, baseY + size * 0.55, size, size * 0.25);
      displayCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      displayCtx.fillRect(baseX + size * 0.15, baseY + size * 0.15, size * 0.4, size * 0.12);
    }
  } else {
    displayCtx.fillStyle = color.hex;
    displayCtx.beginPath();
    displayCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    displayCtx.fill();
    
    if (showShading.value) {
      const holeRadius = beadSize.value * 0.12;
      displayCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      displayCtx.beginPath();
      displayCtx.arc(centerX, centerY, holeRadius, 0, Math.PI * 2);
      displayCtx.fill();
    }
  }
  
  if (isHighlighted) {
    displayCtx.save();
    displayCtx.strokeStyle = '#FF4D4F';
    displayCtx.lineWidth = Math.max(2, beadSize.value * 0.18);
    displayCtx.shadowColor = 'rgba(255, 77, 79, 0.45)';
    displayCtx.shadowBlur = beadSize.value * 0.45;
    if (beadShape.value === 'square') {
      const strokeInset = beadSize.value * 0.04;
      const strokeSize = beadSize.value - strokeInset * 2;
      displayCtx.strokeRect(
        x * beadSize.value + strokeInset,
        y * beadSize.value + strokeInset,
        strokeSize,
        strokeSize
      );
    } else {
      displayCtx.beginPath();
      displayCtx.arc(centerX, centerY, radius + beadSize.value * 0.08, 0, Math.PI * 2);
      displayCtx.stroke();
    }
    displayCtx.restore();
  }

  drawColorCode(centerX, centerY, color);
}

function drawColorCode(centerX: number, centerY: number, color: PaletteColor) {
  if (!displayCtx || !showCodes.value) return;
  
  const fontSize = Math.max(4, Math.min(beadSize.value * 0.24, 9));
  const text = color.name;
  
  displayCtx.save();
  displayCtx.font = `600 ${fontSize}px 'DIN Alternate','Segoe UI',sans-serif`;
  displayCtx.textAlign = 'center';
  displayCtx.textBaseline = 'middle';
  displayCtx.fillStyle = getContrastColor(color.hex);
  displayCtx.fillText(text, centerX, centerY);
  displayCtx.restore();
}

function toggleHighlightColor(colorName: string) {
  if (!colorName) return;
  highlightColor.value = highlightColor.value === colorName ? null : colorName;
  drawBeads();
  uni.vibrateShort({
    type: 'light'
  });
}

function toggleHighlightForSelected() {
  if (!selectedCell.value || !selectedCell.value.color) return;
  toggleHighlightColor(selectedCell.value.color.name);
}

function handleBomHighlight(colorName: string) {
  toggleHighlightColor(colorName);
}

function drawGridLines() {
  if (!displayCtx) return;
  
  displayCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  displayCtx.lineWidth = 0.5;
  
  for (let x = 0; x <= gridWidth.value; x++) {
    displayCtx.beginPath();
    displayCtx.moveTo(x * beadSize.value, 0);
    displayCtx.lineTo(x * beadSize.value, canvasViewHeight.value);
    displayCtx.stroke();
  }
  
  for (let y = 0; y <= gridHeight.value; y++) {
    displayCtx.beginPath();
    displayCtx.moveTo(0, y * beadSize.value);
    displayCtx.lineTo(canvasViewWidth.value, y * beadSize.value);
    displayCtx.stroke();
  }
}

function drawSelectionBox(x: number, y: number) {
  if (!displayCtx) return;
  
  const boxX = x * beadSize.value;
  const boxY = y * beadSize.value;
  
  displayCtx.strokeStyle = '#FF0000';
  displayCtx.lineWidth = 3;
  displayCtx.strokeRect(boxX, boxY, beadSize.value, beadSize.value);
  
  displayCtx.fillStyle = 'rgba(255, 0, 0, 0.1)';
  displayCtx.fillRect(boxX, boxY, beadSize.value, beadSize.value);
}

// ============================================
// 交互处理函数
// ============================================

function handleCanvasTap(e: any) {
  const now = Date.now();
  if (!displayCanvas) return;
  if (activeTouchCount.value > 1) return;
  if (isZooming.value && now < zoomCooldownUntil) return;
  
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch) return;
  
  const rect = e.currentTarget.getBoundingClientRect?.() || { left: 0, top: 0 };
  const effectiveScale = isH5.value ? displayScale.value : canvasScale.value;
  const relativeX = typeof touch.x === 'number' ? touch.x : touch.clientX - rect.left;
  const relativeY = typeof touch.y === 'number' ? touch.y : touch.clientY - rect.top;
  const canvasX = relativeX / effectiveScale;
  const canvasY = relativeY / effectiveScale;
  
  focusCellAt(canvasX, canvasY);
}

function focusCellAt(canvasX: number, canvasY: number) {
  const gridX = Math.floor(canvasX / beadSize.value);
  const gridY = Math.floor(canvasY / beadSize.value);

  if (gridX < 0 || gridX >= gridWidth.value || gridY < 0 || gridY >= gridHeight.value) {
    return;
  }

  const cell = gridData.value[gridY]?.[gridX];
  if (!cell) return;

  selectedCell.value = cell;

  drawBeads();
  measureToolsOffset();

  showColorPicker.value = true;

  uni.vibrateShort({
    type: 'medium'
  });

  console.log('点击格子:', gridX, gridY, cell.color?.name);
}

function selectColor(color: PaletteColor | null) {
  if (!selectedCell.value) return;
  
  const { x, y } = selectedCell.value;
  const oldColor = selectedCell.value.color;
  
  gridData.value[y][x].color = color;
  
  updateBOMData(oldColor, color);
  
  drawBeads();
  
  closeColorPicker();
  
  uni.vibrateShort({
    type: 'success'
  });
  
  console.log('颜色已更改:', oldColor?.name, '→', color?.name || '空');
}

function updateBOMData(oldColor: PaletteColor | null, newColor: PaletteColor | null) {
  if (oldColor) {
    const oldItem = bomData.value.find(item => item.color.name === oldColor.name);
    if (oldItem) {
      oldItem.count--;
      if (oldItem.count <= 0) {
        bomData.value = bomData.value.filter(item => item.color.name !== oldColor.name);
      }
    }
  }
  
  if (newColor) {
    const newItem = bomData.value.find(item => item.color.name === newColor.name);
    if (newItem) {
      newItem.count++;
    } else {
      bomData.value.push({
        color: newColor,
        count: 1
      });
    }
  }
  
  bomData.value.sort((a, b) => {
    // 首先按数量倒序
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    // 数量相同时按色号ID顺序（字母顺序）
    return a.color.name.localeCompare(b.color.name);
  });
}

function closeColorPicker() {
  showColorPicker.value = false;
  selectedCell.value = null;
  drawBeads();
}

function handleOverlayTap(e: any) {
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch) return;

  const pointX = touch.clientX ?? touch.pageX ?? touch.x;
  const pointY = touch.clientY ?? touch.pageY ?? touch.y;

  if (typeof pointX !== 'number' || typeof pointY !== 'number') return;

  selectCellByScreenPoint(pointX, pointY);
}

function selectCellByScreenPoint(pointX: number, pointY: number) {
  if (!displayCanvas) return;

  const processRect = (rect: any) => {
    if (!rect) return;
    const relativeX = pointX - rect.left;
    const relativeY = pointY - rect.top;
    const effectiveScale = isH5.value ? displayScale.value : canvasScale.value;
    const canvasX = relativeX / effectiveScale;
    const canvasY = relativeY / effectiveScale;
    focusCellAt(canvasX, canvasY);
  };

  if (isH5.value && typeof (displayCanvas as any).getBoundingClientRect === 'function') {
    const rect = (displayCanvas as any).getBoundingClientRect();
    processRect(rect);
    return;
  }

  uni.createSelectorQuery()
    .select('#displayCanvas')
    .boundingClientRect((rect: any) => {
      processRect(rect);
    })
    .exec();
}

function toggleColorCodes() {
  showCodes.value = !showCodes.value;
  if (showCodes.value) {
    showShading.value = false;
  }
  drawBeads();
  
  uni.vibrateShort({
    type: 'light'
  });
}

async function toggleAlgorithm() {
  colorAlgorithm.value = colorAlgorithm.value === 'enhanced' ? 'standard' : 'enhanced';
  uni.showToast({
    title: colorAlgorithm.value === 'enhanced' ? '已启用图像增强' : '切换到标准图像',
    icon: 'none',
    duration: 1200
  });
  await regenerateFromOriginal();
}

function toggleBeadShape() {
  beadShape.value = beadShape.value === 'circle' ? 'square' : 'circle';
  drawBeads();
  uni.vibrateShort({
    type: 'light'
  });
}

function toggleStyle() {
  const next = !(showGrid.value && showShading.value);
  showGrid.value = next;
  showShading.value = next;
  drawBeads();
  uni.vibrateShort({
    type: 'light'
  });
}

function resetView() {
  if (isH5.value) {
    updateCanvasLayout();
  } else {
    canvasScale.value = 1;
    movableKey.value += 1;
  }
  isZooming.value = false;
  zoomCooldownUntil = Date.now() + 200;
  
  uni.vibrateShort({
    type: 'medium'
  });
}

function handleScale(e: any) {
  canvasScale.value = e.detail.scale;
}

function handleTouchStart(e: any) {
  const touches = e.touches || [];
  activeTouchCount.value = touches.length;
  if (touches.length >= 2) {
    isZooming.value = true;
  }
}

function handleTouchEnd(e: any) {
  const touches = e.touches || [];
  activeTouchCount.value = touches.length;
  if (touches.length < 2) {
    if (touches.length === 0) {
      isZooming.value = false;
      zoomCooldownUntil = Date.now() + 280;
    } else if (touches.length === 1) {
      isZooming.value = false;
      zoomCooldownUntil = Date.now() + 200;
    }
  }
}

function handleTouchCancel(e: any) {
  activeTouchCount.value = 0;
  isZooming.value = false;
  zoomCooldownUntil = Date.now() + 280;
}

function handleBack() {
  uni.navigateBack();
}

// ============================================
// 导出功能
// ============================================

/**
 * 保存图片到相册
 */
async function handleSaveImage() {
  if (!displayCanvas) {
    uni.showToast({
      title: '画布未初始化',
      icon: 'none'
    });
    return;
  }
  
  uni.showLoading({
    title: '正在保存...',
    mask: true
  });
  
  try {
    // 导出高清图片
    const tempFilePath = await canvasToTempFilePath();
    
    // 保存到相册
    await saveImageToPhotosAlbum(tempFilePath);
    
    uni.hideLoading();
    
    // 显示成功提示
    uni.showToast({
      title: '保存成功！快去打印吧 🖨️',
      icon: 'success',
      duration: 2000
    });
    
    // 触觉反馈
    uni.vibrateShort({
      type: 'success'
    });
    
    console.log('图片已保存:', tempFilePath);
  } catch (error) {
    uni.hideLoading();
    
    console.error('保存失败:', error);
    
    uni.showModal({
      title: '保存失败',
      content: (error as Error).message || '无法保存图片，请重试',
      showCancel: false
    });
  }
}

async function handleExportPoster() {
  if (!displayCanvas) {
    uni.showToast({
      title: '画布未初始化',
      icon: 'none'
    });
    return;
  }

  uni.showLoading({
    title: '生成长图...',
    mask: true
  });

  try {
    const snapshotPath = await canvasToTempFilePath();
    const bomItems = bomData.value.slice(0, 30);
    const layout = computePosterLayout(bomItems);
    await ensurePosterCanvas(layout.height);
    await drawPoster(snapshotPath, layout, bomItems);
    const posterPath = await posterCanvasToTempFile(layout.height);
    await saveImageToPhotosAlbum(posterPath);

    uni.hideLoading();
    uni.showToast({
      title: '长图已保存 📱',
      icon: 'success',
      duration: 2000
    });
  } catch (error) {
    uni.hideLoading();
    console.error('导出长图失败:', error);
    uni.showModal({
      title: '导出失败',
      content: (error as Error).message || '无法导出长图，请重试',
      showCancel: false
    });
  }
}

/**
 * Canvas 转临时文件
 */
function canvasToTempFilePath(): Promise<string> {
  return new Promise((resolve, reject) => {
    const query = uni.createSelectorQuery();
    
    query
      .select('#displayCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('无法获取 Canvas 节点'));
          return;
        }
        
        const canvas = res[0].node;
        
        // 导出高清图片（使用原始尺寸）
        uni.canvasToTempFilePath({
          canvas: canvas,
          x: 0,
          y: 0,
          width: canvasViewWidth.value,
          height: canvasViewHeight.value,
          destWidth: canvasViewWidth.value * dpr * 2, // 2倍高清
          destHeight: canvasViewHeight.value * dpr * 2,
          fileType: 'png',
          quality: 1,
          success: (res) => {
            resolve(res.tempFilePath);
          },
          fail: (err) => {
            console.error('canvasToTempFilePath 失败:', err);
            reject(new Error('导出图片失败'));
          }
        });
      });
  });
}

function ensurePosterCanvas(targetHeight: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const setup = () => {
      posterDpr = uni.getSystemInfoSync().pixelRatio || 1;
      posterScale = Math.min(posterDpr, POSTER_MAX_SCALE);
      resizePosterCanvas(targetHeight);
      resolve();
    };

    if (posterCanvas && posterCtx) {
      setup();
      return;
    }

    uni.createSelectorQuery()
      .select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('无法获取长图画布'));
          return;
        }
        posterCanvas = res[0].node;
        setup();
      });
  });
}

function resizePosterCanvas(targetHeight: number) {
  if (!posterCanvas) return;
  posterCanvas.width = POSTER_WIDTH * posterScale;
  posterCanvas.height = targetHeight * posterScale;
  posterCtx = posterCanvas.getContext('2d');
  if (!posterCtx) {
    throw new Error('无法获取长图画布上下文');
  }
  posterCtx.setTransform(1, 0, 0, 1, 0, 0);
  posterCtx.scale(posterScale, posterScale);
}

function computePosterLayout(items: BOMItem[]): PosterLayout {
  const padding = 72;
  const width = POSTER_WIDTH;
  const titleHeight = 120;
  const metaHeight = 120;
  const gap = 48;
  const imageWidth = width - padding * 2;
  const aspectRatio = canvasViewHeight.value > 0 ? (canvasViewHeight.value / canvasViewWidth.value) : 1;
  const imageHeight = Math.round(imageWidth * aspectRatio);
  const rowHeight = 70;
  const bomHeight = items.length * rowHeight + 140;
  const height = padding + titleHeight + metaHeight + gap + imageHeight + gap + bomHeight + padding;

  return {
    width,
    height,
    padding,
    titleY: padding + 40,
    metaStartY: padding + titleHeight,
    image: {
      x: padding,
      y: padding + titleHeight + metaHeight,
      width: imageWidth,
      height: imageHeight
    },
    bomStartY: padding + titleHeight + metaHeight + gap + imageHeight + gap,
    bomRowHeight: rowHeight
  };
}

async function drawPoster(snapshotPath: string, layout: PosterLayout, items: BOMItem[]) {
  if (!posterCtx || !posterCanvas) {
    throw new Error('长图画布未初始化');
  }

  posterCtx.clearRect(0, 0, layout.width, layout.height);

  const gradient = posterCtx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, '#0a1f1a');
  gradient.addColorStop(1, '#0d2820');
  posterCtx.fillStyle = gradient;
  posterCtx.fillRect(0, 0, layout.width, layout.height);

  drawRoundedRect(posterCtx, 36, 40, layout.width - 72, layout.height - 80, 32, 'rgba(255,255,255,0.95)');

  drawPosterHeader(layout);
  drawPosterMeta(layout);
  await drawPosterImage(snapshotPath, layout);
  drawPosterBOM(layout, items);
}

function drawPosterHeader(layout: PosterLayout) {
  if (!posterCtx) return;
  posterCtx.save();
  posterCtx.fillStyle = '#0a1f1a';
  posterCtx.font = '700 60px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.textAlign = 'center';
  posterCtx.textBaseline = 'top';
  posterCtx.fillText('拼豆魔法工坊', layout.width / 2, layout.padding + 20);
  posterCtx.font = '400 30px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.fillStyle = '#5f7a76';
  posterCtx.fillText('Pixel Bead Poster', layout.width / 2, layout.padding + 90);
  posterCtx.restore();
}

function drawPosterMeta(layout: PosterLayout) {
  if (!posterCtx) return;
  const metaItems = [
    { label: '品牌', value: brandInfo.value?.displayName || '--' },
    { label: '尺寸', value: `${gridWidth.value}×${gridHeight.value}` },
    { label: '色数', value: `${uniqueColorCount.value}` },
    { label: '拼豆数量', value: `${totalBeads.value}` }
  ];
  const chipWidth = 220;
  const chipHeight = 64;
  const gap = 16;
  let startX = layout.padding;
  const startY = layout.metaStartY;
  posterCtx.save();
  posterCtx.font = '500 26px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.textBaseline = 'middle';
  metaItems.forEach((item) => {
    drawRoundedRect(posterCtx, startX, startY, chipWidth, chipHeight, 18, '#f2f5f4');
    posterCtx.fillStyle = '#7b8c85';
    posterCtx.textAlign = 'left';
    posterCtx.fillText(item.label, startX + 20, startY + chipHeight / 2 - 12);
    posterCtx.fillStyle = '#2d3436';
    posterCtx.fillText(item.value, startX + 20, startY + chipHeight / 2 + 16);
    startX += chipWidth + gap;
  });
  posterCtx.restore();
}

async function drawPosterImage(snapshotPath: string, layout: PosterLayout) {
  if (!posterCtx || !posterCanvas) return;
  const image = await createPosterImage(snapshotPath);
  drawRoundedRect(posterCtx, layout.image.x - 6, layout.image.y - 6, layout.image.width + 12, layout.image.height + 12, 28, '#f5f7f7');
  posterCtx.drawImage(image, layout.image.x, layout.image.y, layout.image.width, layout.image.height);
}

function drawPosterBOM(layout: PosterLayout, items: BOMItem[]) {
  if (!posterCtx) return;
  const cardWidth = layout.width - layout.padding * 2;
  let currentY = layout.bomStartY;
  posterCtx.save();
  posterCtx.font = '600 34px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.fillStyle = '#2d3436';
  posterCtx.textAlign = 'left';
  posterCtx.fillText('材料清单', layout.padding, currentY);
  posterCtx.font = '400 26px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.fillStyle = '#6C5CE7';
  posterCtx.textAlign = 'right';
  posterCtx.fillText(`共 ${totalBeads.value} 颗 / ${uniqueColorCount.value} 色`, layout.width - layout.padding, currentY);
  currentY += 52;

  items.forEach((item, idx) => {
    const rowY = currentY + idx * layout.bomRowHeight;
    posterCtx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f7f8fa';
    posterCtx.fillRect(layout.padding, rowY, cardWidth, layout.bomRowHeight - 12);

    const circleX = layout.padding + 36;
    const circleY = rowY + (layout.bomRowHeight - 12) / 2;
    posterCtx.fillStyle = item.color.hex;
    posterCtx.beginPath();
    posterCtx.arc(circleX, circleY, 26, 0, Math.PI * 2);
    posterCtx.fill();

    posterCtx.fillStyle = '#2d3436';
    posterCtx.textAlign = 'left';
    posterCtx.font = '600 30px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.fillText(item.color.name, circleX + 40, circleY);

    posterCtx.fillStyle = '#7f8c8d';
    posterCtx.font = '400 24px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.fillText(item.color.code || '', circleX + 40, circleY + 26);

    posterCtx.textAlign = 'right';
    posterCtx.fillStyle = '#6C5CE7';
    posterCtx.font = '600 30px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.fillText(`${item.count} 颗`, layout.width - layout.padding - 20, circleY + 6);
  });

  if (bomData.value.length > items.length) {
    posterCtx.textAlign = 'left';
    posterCtx.fillStyle = '#7f8c8d';
    posterCtx.font = '400 22px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.fillText('* 仅展示前 30 种颜色，完整清单请在小程序查看', layout.padding, layout.bomStartY + items.length * layout.bomRowHeight + 20);
  }

  posterCtx.restore();
}

function posterCanvasToTempFile(height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!posterCanvas) {
      reject(new Error('长图画布未准备好'));
      return;
    }
    uni.canvasToTempFilePath({
      canvas: posterCanvas,
      x: 0,
      y: 0,
      width: POSTER_WIDTH,
      height,
      destWidth: POSTER_WIDTH * posterScale,
      destHeight: height * posterScale,
      fileType: 'png',
      quality: 1,
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => {
        console.error('posterCanvasToTempFile 失败:', err);
        reject(new Error('导出长图失败'));
      }
    });
  });
}

function createPosterImage(src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!posterCanvas) {
      reject(new Error('长图画布未就绪'));
      return;
    }
    const image = posterCanvas.createImage ? posterCanvas.createImage() : new Image();
    image.onload = () => resolve(image);
    image.onerror = (err: any) => reject(err);
    // @ts-ignore
    if (typeof image.setAttribute === 'function') {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string
) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 保存图片到相册
 */
function saveImageToPhotosAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        resolve();
      },
      fail: (err) => {
        console.error('saveImageToPhotosAlbum 失败:', err);
        
        // 检查是否是权限问题
        if (err.errMsg && err.errMsg.includes('auth')) {
          reject(new Error('需要相册权限，请在设置中开启'));
        } else {
          reject(new Error('保存到相册失败'));
        }
      }
    });
  });
}

/**
 * 导出 BOM 清单
 */
function exportBOMList() {
  // 生成文本格式的 BOM 清单
  let bomText = `📋 拼豆图纸材料清单\n\n`;
  bomText += `品牌: ${brandInfo.value?.displayName}\n`;
  bomText += `尺寸: ${gridWidth.value}×${gridHeight.value}\n`;
  bomText += `总计: ${totalBeads.value} 颗\n`;
  bomText += `色数: ${uniqueColorCount.value} 种\n\n`;
  bomText += `详细清单:\n`;
  bomText += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  bomData.value.forEach((item, index) => {
    bomText += `${index + 1}. ${item.color.name} - ${item.count} 颗\n`;
  });
  
  // 复制到剪贴板
  uni.setClipboardData({
    data: bomText,
    success: () => {
      uni.showToast({
        title: '清单已复制到剪贴板',
        icon: 'success'
      });
    },
    fail: () => {
      uni.showToast({
        title: '复制失败',
        icon: 'none'
      });
    }
  });
}
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  min-height: 100vh;
  background-color: #F8F9FA;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
}

/* ============================================
   加载状态
   ============================================ */

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 400rpx;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #E5E5E5;
  border-top-color: #6C5CE7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 32rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 16rpx;
}

.loading-progress {
  font-size: 28rpx;
  color: #6C5CE7;
  font-weight: 500;
}

/* ============================================
   主内容区
   ============================================ */

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding-bottom: 48rpx;
}

.main-content-disabled {
  pointer-events: none;
  filter: blur(4px);
  opacity: 0.6;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #F0F0F0;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.15);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
}

.nav-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.nav-text {
  font-size: 28rpx;
  color: #6C5CE7;
  font-weight: 500;
}

.nav-center {
  flex: 1;
  text-align: center;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D3436;
}

/* 信息栏 */
.info-bar {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 32rpx;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #F0F0F0;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-label {
  font-size: 22rpx;
  color: #B2BEC3;
  margin-bottom: 6rpx;
}

.info-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #6C5CE7;
}

/* 隐藏的处理 Canvas */
.hidden-canvas {
  position: fixed;
  top: -9999rpx;
  left: -9999rpx;
  width: 1rpx;
  height: 1rpx;
}

/* ============================================
   画布区域
   ============================================ */

.canvas-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 32rpx 32rpx 16rpx;
  margin: 0 0 24rpx;
  box-sizing: border-box;
}

.canvas-area {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #F0F4F5;
  border-radius: 24rpx;
  overflow: hidden;
}

.canvas-scroll {
  width: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 16rpx;
  box-sizing: border-box;
  background-color: #F0F4F5;
  border-radius: 24rpx;
}

.canvas-sizer {
  transform-origin: center;
}

.canvas-movable {
  display: flex;
  align-items: center;
  justify-content: center;
}

.display-canvas {
  display: block;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

/* ============================================
   用量清单
   ============================================ */

.bom-section {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  margin: 32rpx 32rpx 48rpx;
  padding: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.08);
}

.bom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.bom-header-title {
  flex: 1;
  min-width: 0;
}

.bom-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #2D3436;
}

.bom-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #B2BEC3;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background-color: #F8F9FA;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &::after {
    border: none;
  }

  &:active {
    background-color: #E5E5E5;
  }
}

.copy-action {
  margin-left: auto;
  display: flex;
  justify-content: flex-end;
}

.action-icon {
  font-size: 32rpx;
}

.bom-list-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #F3F4F6;
  transition: background-color 0.3s ease;

  &:active {
    background-color: #F8F9FA;
  }
}

.bom-item-highlight {
  box-shadow: inset 0 0 0 3rpx rgba(255, 77, 79, 0.5);
  border-radius: 20rpx;
}

.bom-item-first {
  background-color: #FFF9E6;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
}

.bom-color-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  border: 3rpx solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.bom-item-info {
  flex: 1;
}

.bom-item-code {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
}

.bom-item-count-group {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
}

.bom-item-count {
  font-size: 36rpx;
  font-weight: 700;
  color: #6C5CE7;
  margin-right: 6rpx;
}

.bom-item-unit {
  font-size: 24rpx;
  color: #B2BEC3;
}

.bom-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #B2BEC3;
}

/* ============================================
   浮动工具栏
   ============================================ */

.canvas-actions {
  margin: 0 32rpx 32rpx;
  padding: 28rpx 32rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.08);
}

.actions-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.actions-label {
  font-size: 30rpx;
  font-weight: 700;
  color: #2D3436;
}

.actions-tip {
  font-size: 24rpx;
  color: #9EA4B1;
}

.tool-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.tool-btn {
  flex: 1 1 calc(25% - 12rpx);
  min-width: 220rpx;
  min-height: 120rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #F8F9FF 0%, #F1EDFF 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(108, 92, 231, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 12rpx;
}

.tool-btn:active {
  transform: translateY(4rpx);
  box-shadow: 0 2rpx 10rpx rgba(108, 92, 231, 0.2);
}

.tool-icon {
  font-size: 40rpx;
  margin-bottom: 10rpx;
}

.tool-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #5F4FD1;
  text-align: center;
}

.action-btn-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.action-btn-text {
  font-size: 26rpx;
  color: #6C5CE7;
  font-weight: 500;
}

/* ============================================
   颜色选择器弹窗
   ============================================ */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2D3436;
}

.modal-close {
  font-size: 48rpx;
  color: #B2BEC3;
  line-height: 1;
  padding: 8rpx;
}

.selected-cell-info {
  padding: 24rpx 32rpx;
  background-color: #F8F9FA;
  border-bottom: 2rpx solid #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  flex-wrap: nowrap;
}

.cell-info-details {
  display: flex;
  flex: 1;
  min-width: 60%;
  flex-direction: column;
  gap: 16rpx;
}

.cell-position {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.position-label {
  font-size: 24rpx;
  color: #B2BEC3;
  margin-right: 12rpx;
}

.position-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  font-family: monospace;
}

.cell-current-color {
  display: flex;
  align-items: center;
}

.color-label {
  font-size: 24rpx;
  color: #B2BEC3;
  margin-right: 12rpx;
}

.color-preview-small {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
  margin-right: 12rpx;
}

.color-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.color-list {
  flex: 1;
  overflow-y: auto;
}

.highlight-inline {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 240rpx;
}

.highlight-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 220rpx;
  padding: 18rpx 20rpx;
  border-radius: 999rpx;
  background: linear-gradient(120deg, #FF8A8A 0%, #FFB199 100%);
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 8rpx 18rpx rgba(255, 138, 138, 0.35);
  white-space: nowrap;
}

.highlight-icon {
  font-size: 32rpx;
}

.highlight-text {
  font-size: 28rpx;
}


.color-item {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  border-bottom: 2rpx solid #F0F0F0;
  transition: all 0.3s ease;
  position: relative;
  
  &:active {
    background-color: #F8F9FA;
  }
}

.color-item-selected {
  background-color: #F0EEFF;
}

.color-item.eraser {
  background-color: #FFF5F5;
  
  &:active {
    background-color: #FFE5E5;
  }
}

.color-preview {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.eraser-preview {
  background: repeating-linear-gradient(
    45deg,
    #FFE5E5,
    #FFE5E5 10rpx,
    #FFFFFF 10rpx,
    #FFFFFF 20rpx
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.eraser-icon {
  font-size: 40rpx;
}

.color-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.color-item-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 8rpx;
}

.color-item-hex,
.color-item-code {
  font-size: 24rpx;
  color: #B2BEC3;
  font-family: monospace;
}

.check-icon {
  font-size: 40rpx;
  color: #6C5CE7;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
