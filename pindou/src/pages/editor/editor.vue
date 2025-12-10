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
        <view class="nav-left nav-action" @tap="handleBack">
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

      <!-- 图纸说明 -->
      <view class="canvas-tip">
        <text class="canvas-tip-text">💡 点击图纸，可改色号和一键高亮</text>
      </view>

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
            :x="movableX"
            :y="movableY"
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
        </view>
        <view class="tool-row">
          <view class="tool-btn" @tap="toggleColorCodes">
            <text class="tool-icon">{{ showCodes ? '🚫' : '🔠' }}</text>
            <text class="tool-label">{{ showCodes ? '隐藏色号' : '显示色号' }}</text>
          </view>
          <view class="tool-btn" @tap="toggleColorMerge">
            <text class="tool-icon">{{ colorMerged ? '🔓' : '🔗' }}</text>
            <text class="tool-label">{{ colorMerged ? '解除合并' : '颜色合并' }}</text>
          </view>
          <view class="tool-btn" @tap="toggleDenseLayout">
            <text class="tool-icon">{{ denseLayoutIcon }}</text>
            <text class="tool-label">{{ denseLayoutLabel }}</text>
          </view>
          <view v-if="imageType === 'standard'" class="tool-btn" @tap="toggleAlgorithm">
            <text class="tool-icon">{{ colorAlgorithm === 'enhanced' ? '✨' : '🧠' }}</text>
            <text class="tool-label">{{ algorithmLabel }}</text>
          </view>
          <view v-if="imageType === 'pixel'" class="tool-btn" @tap="toggleBeadShape">
            <text class="tool-icon">{{ beadShapeIcon }}</text>
            <text class="tool-label">{{ beadShapeLabel }}</text>
          </view>
        </view>
      </view>

      <!-- 高级设置板块 -->
      <view class="advanced-settings-section">
        <view class="section-title">
          <text class="section-label">高级设置</text>
        </view>
        <view class="settings-content">
          <view class="setting-item">
            <view class="setting-row">
              <text class="setting-label">颜色合并阈值</text>
              <view class="setting-input-wrapper">
                <input
                  v-model.number="colorMergeThreshold"
                  type="number"
                  class="setting-input"
                  placeholder="5"
                  min="1"
                  max="20"
                />
                <text class="setting-unit">颗</text>
              </view>
            </view>
            <text class="setting-hint">用量小于等于此值的色号将被合并</text>
          </view>
        </view>
      </view>

      <!-- 作品信息 -->
      <view class="work-info-section">
        <view class="work-info-header">
          <text class="work-info-title">作品信息</text>
          <text class="work-info-tip">导出长图时添加署名标记</text>
        </view>
        <view class="work-info-inputs">
          <view class="work-info-item">
            <text class="work-info-label">水印内容</text>
            <input
              v-model="watermarkText"
              class="work-info-input"
              placeholder="请输入水印内容（可选）"
              maxlength="30"
            />
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
              <text class="position-value">({{ selectedCell.x }}, {{ gridHeight - 1 - selectedCell.y }})</text>
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
          <!-- 橡皮擦和上次选择 -->
          <view class="eraser-last-row">
            <view class="color-item eraser-compact" @tap="selectColor(null)">
              <view class="color-preview eraser-preview-compact">
                <text class="eraser-icon">🧹</text>
              </view>
              <view class="color-info-compact">
                <text class="color-item-name-compact">橡皮擦</text>
              </view>
              <text v-if="!selectedCell?.color" class="check-icon-compact">✓</text>
            </view>
            <view 
              v-if="lastSelectedColor" 
              class="color-item last-select-compact" 
              @tap="selectLastUsedColor"
            >
              <view class="color-preview last-select-preview-compact" :style="{ backgroundColor: lastSelectedColor.hex }">
                <text v-if="selectedCell?.color?.name === lastSelectedColor.name" class="check-icon-compact">✓</text>
              </view>
              <view class="color-info-compact">
                <text class="last-select-label">上次选择</text>
                <text class="color-item-name-compact">{{ lastSelectedColor.name }}</text>
              </view>
            </view>
          </view>

          <!-- 品牌颜色列表 -->
          <view class="color-grid">
            <view 
              v-for="color in brandColors" 
              :key="color.name"
              class="color-item-grid"
              :class="{ 'color-item-selected': selectedCell?.color?.name === color.name }"
              @tap="selectColor(color)"
            >
              <view 
                class="color-preview-grid" 
                :style="{ backgroundColor: color.hex }"
              >
                <text v-if="selectedCell?.color?.name === color.name" class="check-icon-grid">✓</text>
              </view>
              <view class="color-info-grid">
                <text class="color-item-name-grid">{{ color.name }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { BrandKey, PaletteColor, ColorAlgorithm } from '../types/index';
import { findClosestColorLab } from '@/utils/colorMatcher';
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
  workInfoY: number;
  image: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  bomStartY: number;
  bomRowHeight: number;
  qrCodeY: number;
  qrCodeSize: number;
  qrCodeX?: number; // 二维码X位置
  labelAreaSize?: number; // 坐标格子区域大小
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
const imageType = ref<'standard' | 'pixel'>('standard');

// 像素图片模式参数
const pixelBlockSizeRatio = ref<number>(0.01); // 网格宽度相对于图片宽度的比例，默认1%
const pixelOffsetX = ref<number>(0);
const pixelOffsetY = ref<number>(0);
const pixelScale = ref<number>(1);
const pixelImageWidth = ref<number>(0);
const pixelImageHeight = ref<number>(0);

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
const colorPickerHeight = ref<number>(1200);
const movableKey = ref<number>(0);
const movableX = ref<number>(0); // movable-view的初始X位置（用于居中）
const movableY = ref<number>(0); // movable-view的初始Y位置（用于居中）
const showColorPicker = ref<boolean>(false);
const selectedCell = ref<GridCell | null>(null);
const isZooming = ref<boolean>(false);
const activeTouchCount = ref<number>(0);
let zoomCooldownUntil = 0;
const colorAlgorithm = ref<ColorAlgorithm>('standard');
const beadShape = ref<'circle' | 'square'>('square');
const denseLayout = ref<boolean>(true); // true = 无间隙（密集排列，默认），false = 有间隙
const colorMerged = ref<boolean>(false); // 颜色合并状态

// 保存原始数据，用于解除合并
const originalGridData = ref<GridCell[][]>([]);
const originalBomData = ref<BOMItem[]>([]);


// 上次选择的颜色
const lastSelectedColor = ref<PaletteColor | null>(null);

// 作品信息
const workName = ref<string>('');
const authorName = ref<string>('');
const watermarkText = ref<string>(''); // 水印内容

// 颜色合并阈值
const colorMergeThreshold = ref<number>(5); // 默认值为5

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
  colorAlgorithm.value === 'enhanced' ? '众数取色' : '均值取色'
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
const denseLayoutLabel = computed(() => denseLayout.value ? '稀疏排列' : '密集排列');
const denseLayoutIcon = computed(() => denseLayout.value ? '📏' : '🔗');

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
  if (options.type) {
    imageType.value = options.type as 'standard' | 'pixel';
  }
  if (options.pixelBlockSizeRatio) {
    pixelBlockSizeRatio.value = parseFloat(options.pixelBlockSizeRatio);
  }
  if (options.pixelOffsetX) {
    pixelOffsetX.value = parseFloat(options.pixelOffsetX);
  }
  if (options.pixelOffsetY) {
    pixelOffsetY.value = parseFloat(options.pixelOffsetY);
  }
  if (options.pixelScale) {
    pixelScale.value = parseFloat(options.pixelScale);
  }
  if (options.pixelImageWidth) {
    pixelImageWidth.value = parseInt(options.pixelImageWidth);
  }
  if (options.pixelImageHeight) {
    pixelImageHeight.value = parseInt(options.pixelImageHeight);
  }
  
  console.log('编辑器参数:', {
    brandKey: brandKey.value,
    imageType: imageType.value,
    gridWidth: gridWidth.value,
    imagePath: imagePath.value,
    pixelBlockSizeRatio: pixelBlockSizeRatio.value
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
    
    // 图片处理完成后，重置合并状态和原始数据
    colorMerged.value = false;
    originalGridData.value = [];
    originalBomData.value = [];
    
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

        const axisWidth = 0; // 不再预留坐标轴空间
        canvasViewWidth.value = gridWidth.value * beadSize.value + axisWidth;
        canvasViewHeight.value = gridHeight.value * beadSize.value + axisWidth;

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
  
  if (imageType.value === 'pixel') {
    // 像素图片模式：使用基于正方形网格的切割
    await loadAndProcessPixelImage(imageInfo);
  } else {
    // 标准图片模式：原有逻辑
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
}

// 像素图片模式：基于正方形网格切割
async function loadAndProcessPixelImage(imageInfo: UniApp.GetImageInfoSuccessData): Promise<void> {
  console.log('开始像素图片处理...');
  progressText.value = '0%';
  
  // 将图片绘制到canvas上（使用原始尺寸）
  processCanvas.width = imageInfo.width * dpr;
  processCanvas.height = imageInfo.height * dpr;
  processCtx.scale(dpr, dpr);
  
  const img = typeof processCanvas.createImage === 'function'
    ? processCanvas.createImage()
    : new Image();
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      console.log('像素图片加载成功');
      
      // 绘制完整图片
      processCtx.drawImage(img, 0, 0, imageInfo.width, imageInfo.height);
      
      // 获取完整图片数据（注意：getImageData 返回的是实际 canvas 尺寸的数据）
      // 但我们需要按原始图片尺寸处理，所以先重置 scale，然后获取数据
      processCtx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换
      const fullImageData = processCtx.getImageData(
        0,
        0,
        imageInfo.width * dpr,
        imageInfo.height * dpr
      );
      // 恢复 scale
      processCtx.scale(dpr, dpr);
      
      // 计算网格原点在原始图片中的坐标
      // 需要根据首页的图片偏移和缩放，将显示坐标转换为原始图片坐标
      const systemInfo = uni.getSystemInfoSync();
      const rpxToPx = systemInfo.windowWidth / 750;
      const editorContainerHeight = 500 * rpxToPx;
      const editorContainerWidth = systemInfo.windowWidth - 64 * rpxToPx;
      
      // 计算图片在编辑器首页中的实际显示尺寸（未缩放前）
      const displayImageWidth = pixelImageWidth.value || Math.min(editorContainerWidth, imageInfo.width);
      const displayImageHeight = (displayImageWidth / imageInfo.width) * imageInfo.height;
      
      // 计算图片在容器中的实际位置（考虑偏移和缩放）
      const imageDisplayWidth = displayImageWidth * pixelScale.value;
      const imageDisplayHeight = displayImageHeight * pixelScale.value;
      const imageLeft = (editorContainerWidth - imageDisplayWidth) / 2 + pixelOffsetX.value;
      const imageTop = (editorContainerHeight - imageDisplayHeight) / 2 + pixelOffsetY.value;
      
      // 图片中心在显示容器中的位置
      const imageCenterXInDisplay = imageLeft + imageDisplayWidth / 2;
      const imageCenterYInDisplay = imageTop + imageDisplayHeight / 2;
      
      // 计算网格原点在显示容器中的位置（图片中心对齐到网格中心）
      // 这与首页的计算方式完全一致：gridOriginX = imageCenterX - (imageCenterX % blockSize)
      const blockSizeInDisplay = imageDisplayWidth * pixelBlockSizeRatio.value;
      const gridOriginXInDisplay = blockSizeInDisplay > 0 
        ? imageCenterXInDisplay - (imageCenterXInDisplay % blockSizeInDisplay)
        : imageCenterXInDisplay;
      const gridOriginYInDisplay = blockSizeInDisplay > 0
        ? imageCenterYInDisplay - (imageCenterYInDisplay % blockSizeInDisplay)
        : imageCenterYInDisplay;
      
      // 将显示坐标转换为原始图片坐标
      // 网格原点相对于图片左上角的位置
      const gridOriginXRelativeToImage = gridOriginXInDisplay - imageLeft;
      const gridOriginYRelativeToImage = gridOriginYInDisplay - imageTop;
      
      // 转换为原始图片坐标（网格原点在原始图片中的位置）
      const gridOriginXInOriginal = (gridOriginXRelativeToImage / imageDisplayWidth) * imageInfo.width;
      const gridOriginYInOriginal = (gridOriginYRelativeToImage / imageDisplayHeight) * imageInfo.height;
      
      // centerX 和 centerY 应该是网格原点，而不是图片中心
      // 在 pixelateAndMatchPixelImage 中，会使用 centerX - (blockSize / 2) 作为 centerStartX
      // 所以这里直接传递网格原点
      const centerXInOriginal = gridOriginXInOriginal;
      const centerYInOriginal = gridOriginYInOriginal;
      
      // 计算色块大小在原始图片中的像素数
      // pixelBlockSizeRatio 是相对于图片宽度的比例，直接乘以原始图片宽度即可
      const blockSizeInOriginal = imageInfo.width * pixelBlockSizeRatio.value;
      
      console.log('坐标转换详情:', {
        pixelBlockSizeRatio: pixelBlockSizeRatio.value,
        imageInfoWidth: imageInfo.width,
        blockSizeInOriginal: blockSizeInOriginal,
        scale: pixelScale.value,
        offsetX: pixelOffsetX.value,
        offsetY: pixelOffsetY.value,
        gridOriginXInDisplay: gridOriginXInDisplay,
        gridOriginYInDisplay: gridOriginYInDisplay,
        gridOriginXInOriginal: gridOriginXInOriginal,
        gridOriginYInOriginal: gridOriginYInOriginal,
        centerXInOriginal: centerXInOriginal,
        centerYInOriginal: centerYInOriginal
      });
      
      // 验证：如果 blockSizeInOriginal 太小或太大，说明转换有问题
      if (blockSizeInOriginal < 1 || blockSizeInOriginal > imageInfo.width) {
        console.warn('警告：blockSizeInOriginal 值异常:', blockSizeInOriginal);
      }
      
      console.log('像素图片处理参数:', {
        centerXInOriginal,
        centerYInOriginal,
        blockSizeInOriginal,
        imageWidth: imageInfo.width,
        imageHeight: imageInfo.height,
        expectedGridCols: Math.ceil(imageInfo.width / blockSizeInOriginal),
        expectedGridRows: Math.ceil(imageInfo.height / blockSizeInOriginal)
      });
      
      // 基于正方形网格切割（使用众数取色）
      pixelateAndMatchPixelImage(fullImageData, {
        centerX: centerXInOriginal,
        centerY: centerYInOriginal,
        blockSize: blockSizeInOriginal,
        imageWidth: imageInfo.width,
        imageHeight: imageInfo.height
      });
      
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
  // 标准与锐化均使用 LAB 欧氏距离匹配
  const matchFn = findClosestColorLab;

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

// 获取色块内所有像素的RGB众数
function getModeColorFromBlock(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  blockStartX: number,
  blockStartY: number,
  blockSize: number,
  dpr: number = 1
): { r: number; g: number; b: number } {
  const colorMap = new Map<string, number>();
  const blockEndX = blockStartX + blockSize;
  const blockEndY = blockStartY + blockSize;
  // 计算实际取色区域（与图片的交集）
  // 使用精确的边界，确保与首页网格完全一致
  // blockStartX/Y 可能是负数（网格块超出图片边界），需要正确处理
  const actualStartX = Math.max(0, Math.floor(blockStartX));
  const actualStartY = Math.max(0, Math.floor(blockStartY));
  // blockEndX/Y 是开区间，使用 Math.ceil 确保包含边界像素
  const actualEndX = Math.min(imageWidth, Math.ceil(blockEndX));
  const actualEndY = Math.min(imageHeight, Math.ceil(blockEndY));
  
  // 计算实际数据宽度（考虑 DPR）
  const dataWidth = imageWidth * dpr;
  
  // 遍历色块内所有像素
  // 注意：actualStartX/Y 和 actualEndX/Y 是整数边界，但我们需要确保覆盖整个 blockStartX/Y 到 blockEndX/Y 的范围
  // 对于部分超出边界的网格块，只取图片内的部分
  for (let y = actualStartY; y < actualEndY; y++) {
    for (let x = actualStartX; x < actualEndX; x++) {
      // 确保坐标在图片范围内
      if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) {
        continue;
      }
      
      // 在 DPR 缩放的 canvas 中，每个原始像素对应 dpr*dpr 个数据像素
      // 我们采样中心点或平均采样
      const dataX = Math.floor(x * dpr + dpr / 2);
      const dataY = Math.floor(y * dpr + dpr / 2);
      const index = (dataY * dataWidth + dataX) * 4;
      
      if (index + 2 < data.length) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        // 使用原始RGB值进行精准的众数计算
        const colorKey = `${r},${g},${b}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
    }
  }
  
  // 找到出现次数最多的颜色
  let maxCount = 0;
  let modeColor = { r: 128, g: 128, b: 128 }; // 默认灰色
  
  for (const [colorKey, count] of colorMap.entries()) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = colorKey.split(',').map(Number);
      modeColor = { r, g, b };
    }
  }
  
  // 只在第一个网格块时输出详细日志
  if (actualStartX === 0 && actualStartY === 0) {
    console.log(`网格块 [${actualStartX},${actualStartY}]-[${actualEndX},${actualEndY}] 众数颜色:`, modeColor, '出现次数:', maxCount, '总像素数:', (actualEndX - actualStartX) * (actualEndY - actualStartY));
  }
  
  return modeColor;
}

// 像素图片模式：基于正方形网格切割，使用众数取色
function pixelateAndMatchPixelImage(
  sourceImage: ImageData,
  params: {
    centerX: number;
    centerY: number;
    blockSize: number;
    imageWidth: number;
    imageHeight: number;
  }
) {
  const { centerX, centerY, blockSize, imageWidth, imageHeight } = params;
  const { data } = sourceImage;
  
  console.log('开始像素图片网格切割（众数取色）...', { 
    centerX, 
    centerY, 
    blockSize,
    imageWidth,
    imageHeight
  });
  
  // 计算中心正方形的起始位置
  const centerStartX = centerX - (blockSize / 2);
  const centerStartY = centerY - (blockSize / 2);
  
  // 计算网格范围：覆盖整个图片
  const minGridX = Math.floor(-centerStartX / blockSize) - 1;
  const maxGridX = Math.ceil((imageWidth - centerStartX) / blockSize) + 1;
  const minGridY = Math.floor(-centerStartY / blockSize) - 1;
  const maxGridY = Math.ceil((imageHeight - centerStartY) / blockSize) + 1;
  
  const gridCols = maxGridX - minGridX;
  const gridRows = maxGridY - minGridY;
  
  console.log('网格计算:', {
    centerStartX,
    centerStartY,
    minGridX,
    maxGridX,
    minGridY,
    maxGridY,
    gridCols,
    gridRows,
    blockSize,
    expectedCols: Math.ceil(imageWidth / blockSize),
    expectedRows: Math.ceil(imageHeight / blockSize)
  });
  
  const grid: GridCell[][] = [];
  const colorCountMap = new Map<string, { color: PaletteColor; count: number }>();
  // 像素模式也统一使用 LAB 欧氏距离匹配
  const matchFn = findClosestColorLab;
  
  for (let gridY = 0; gridY < gridRows; gridY++) {
    const row: GridCell[] = [];
    
    for (let gridX = 0; gridX < gridCols; gridX++) {
      // 计算当前网格在原始图片中的位置
      const blockStartX = centerStartX + (gridX + minGridX) * blockSize;
      const blockStartY = centerStartY + (gridY + minGridY) * blockSize;
      const blockEndX = blockStartX + blockSize;
      const blockEndY = blockStartY + blockSize;
      
      // 计算实际取色区域（与图片的交集）
      // 使用 Math.floor 和 Math.ceil 确保边界精确，与首页网格完全一致
      // blockStartX/Y 可能是负数（网格块超出图片边界），需要正确处理
      const actualStartX = Math.max(0, Math.floor(blockStartX));
      const actualStartY = Math.max(0, Math.floor(blockStartY));
      // blockEndX/Y 是开区间，使用 Math.ceil 确保包含边界像素
      const actualEndX = Math.min(imageWidth, Math.ceil(blockEndX));
      const actualEndY = Math.min(imageHeight, Math.ceil(blockEndY));
      
      // 如果网格完全超出图片范围，创建空单元格
      if (actualEndX <= actualStartX || actualEndY <= actualStartY) {
        row.push({ x: gridX, y: gridY, color: null });
        continue;
      }
      
      // 使用众数取色（即使部分超出，也处理该网格）
      const modeColor = getModeColorFromBlock(
        data,
        imageWidth,
        imageHeight,
        blockStartX,
        blockStartY,
        blockSize,
        dpr
      );
      
      // 调试日志：记录关键网格块的位置和颜色
      if ((gridX === 0 && gridY === 0) || 
          (gridX === Math.floor(gridCols / 2) && gridY === Math.floor(gridRows / 2)) ||
          (gridX < 3 && gridY < 3)) {
        console.log(`网格块 [${gridX}, ${gridY}]:`, {
          blockStartX: blockStartX.toFixed(2),
          blockStartY: blockStartY.toFixed(2),
          blockEndX: blockEndX.toFixed(2),
          blockEndY: blockEndY.toFixed(2),
          actualStartX,
          actualStartY,
          actualEndX,
          actualEndY,
          modeColor,
          pixelCount: (actualEndX - actualStartX) * (actualEndY - actualStartY)
        });
      }
      
      // 匹配颜色
      const matchResult = matchFn([modeColor.r, modeColor.g, modeColor.b], brandKey.value);
      
      const cell: GridCell = {
        x: gridX,
        y: gridY,
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
    
    const progress = Math.round(((gridY + 1) / gridRows) * 100);
    progressText.value = `${progress}%`;
  }
  
  gridData.value = grid;
  gridWidth.value = gridCols;
  gridHeight.value = gridRows;
  
  bomData.value = Array.from(colorCountMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.color.name.localeCompare(b.color.name);
    });
  
  console.log('像素图片处理完成！');
  console.log('网格数据:', gridRows, 'x', gridCols);
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
    const axisWidth = 0; // 不再预留坐标轴空间
    canvasViewWidth.value = Math.round(gridWidth.value * beadSize.value + axisWidth);
    canvasViewHeight.value = Math.round(gridHeight.value * beadSize.value + axisWidth);

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
      const axisWidth = 0; // 不再预留坐标轴空间
      const sizeByWidth = (maxCanvasWidth - axisWidth) / gridWidth.value;
      const sizeByHeight = (maxCanvasHeight - axisWidth) / gridHeight.value;
      const optimalSize = Math.max(8, Math.min(sizeByWidth, sizeByHeight, 28));
      beadSize.value = Number(optimalSize.toFixed(2));
      canvasViewWidth.value = Math.round(beadSize.value * gridWidth.value + axisWidth);
      canvasViewHeight.value = Math.round(beadSize.value * gridHeight.value + axisWidth);
    displayScale.value = 1;
  }

  const scaledHeight = isH5.value
    ? canvasViewHeight.value * displayScale.value
    : canvasViewHeight.value;
  const minPanel = Math.max(280, Math.round(viewportHeight * 0.25));
  const maxPanel = Math.max(minPanel, Math.round(viewportHeight * 0.48));
  const paddedHeight = Math.round(scaledHeight + 30);
  canvasPanelHeight.value = Math.min(Math.max(paddedHeight, minPanel), maxPanel);

  // 计算movable-view的居中位置（非H5平台）
  if (!isH5.value) {
    // movable-area的宽度是100%，所以可用宽度是viewportWidth（px单位）
    // 计算canvas在容器中的居中位置
    const areaWidth = viewportWidth;
    const areaHeight = canvasPanelHeight.value;
    // movable-view默认从(0,0)开始，需要计算居中偏移
    // 居中位置 = (容器宽度 - canvas宽度) / 2
    // 注意：movable-view的x和y使用px单位
    const newX = Math.max(0, (areaWidth - canvasViewWidth.value) / 2);
    const newY = Math.max(0, (areaHeight - canvasViewHeight.value) / 2);
    
    // 如果位置发生变化，更新并触发movable-view重新定位
    if (Math.abs(movableX.value - newX) > 1 || Math.abs(movableY.value - newY) > 1) {
      movableX.value = newX;
      movableY.value = newY;
      // 更新movableKey以触发movable-view重新定位
      nextTick(() => {
        movableKey.value += 1;
      });
    }
  }

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
            // 不再自动计算高度，使用固定的1200px
            // const systemInfo = uni.getSystemInfoSync();
            // const available = Math.max(320, systemInfo.windowHeight - rect.top - 24);
            // colorPickerHeight.value = available;
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
          const isDimmed = highlightColor.value !== null && !isHighlighted;
          drawBead(x, y, cell.color, isHighlighted, isDimmed);
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

// 绘制编辑器画布的坐标轴
// 坐标轴已取消，不再绘制

function drawBead(x: number, y: number, color: PaletteColor, isHighlighted: boolean, isDimmed: boolean = false) {
  if (!displayCtx) return;
  
  // 根据密集排列状态调整绘制参数
  const padding = denseLayout.value ? 0 : beadSize.value * 0.08; // 密集排列时无间隙
  const size = beadSize.value - padding * 2;
  const baseX = x * beadSize.value + padding;
  const baseY = y * beadSize.value + padding;
  const centerX = baseX + size / 2;
  const centerY = baseY + size / 2;
  const radius = size * 0.45;
  
  if (beadShape.value === 'square') {

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
      const holeRadius = size * 0.12;
      displayCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      displayCtx.beginPath();
      displayCtx.arc(centerX, centerY, holeRadius, 0, Math.PI * 2);
      displayCtx.fill();
    }
  }
  
  // 非高亮色块变暗（添加透明层）
  if (isDimmed) {
    displayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    if (beadShape.value === 'square') {
      displayCtx.fillRect(baseX, baseY, size, size);
    } else {
      displayCtx.beginPath();
      displayCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      displayCtx.fill();
    }
  }
  
  if (isHighlighted) {
    displayCtx.save();
    displayCtx.strokeStyle = '#FF4D4F';
    displayCtx.lineWidth = Math.max(2, size * 0.18);
    displayCtx.shadowColor = 'rgba(255, 77, 79, 0.45)';
    displayCtx.shadowBlur = size * 0.45;
    if (beadShape.value === 'square') {
      const strokeInset = denseLayout.value ? 0 : size * 0.04;
      const strokeSize = size - strokeInset * 2;
      displayCtx.strokeRect(
        baseX + strokeInset,
        baseY + strokeInset,
        strokeSize,
        strokeSize
      );
    } else {
      displayCtx.beginPath();
      displayCtx.arc(centerX, centerY, radius + size * 0.08, 0, Math.PI * 2);
      displayCtx.stroke();
    }
    displayCtx.restore();
  }

  drawColorCode(centerX, centerY, color);
}

function drawColorCode(centerX: number, centerY: number, color: PaletteColor) {
  if (!displayCtx || !showCodes.value) return;
  
  // 稍微缩小字体（从0.24改为0.20）
  const fontSize = Math.max(4, Math.min(beadSize.value * 0.20, 8));
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
  
  // 绘制垂直线
  for (let x = 0; x <= gridWidth.value; x++) {
    displayCtx.beginPath();
    displayCtx.moveTo(x * beadSize.value, 0);
    displayCtx.lineTo(x * beadSize.value, canvasViewHeight.value);
    displayCtx.stroke();
  }
  
  // 绘制水平线
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
  const adjustedX = canvasX;
  const gridX = Math.floor(adjustedX / beadSize.value);
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
  
  // 保存上次选择的颜色（如果不是橡皮擦）
  if (color) {
    lastSelectedColor.value = color;
  }
  
  updateBOMData(oldColor, color);
  
  drawBeads();
  
  closeColorPicker();
  
  uni.vibrateShort({
    type: 'success'
  });
  
  console.log('颜色已更改:', oldColor?.name, '→', color?.name || '空');
}

function selectLastUsedColor() {
  if (lastSelectedColor.value) {
    selectColor(lastSelectedColor.value);
  } else {
    uni.showToast({
      title: '暂无上次选择的颜色',
      icon: 'none'
    });
  }
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
    title: colorAlgorithm.value === 'enhanced' ? '已切换到众数取色' : '已切换到均值取色',
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

function toggleDenseLayout() {
  denseLayout.value = !denseLayout.value;
  drawBeads();
  uni.vibrateShort({
    type: 'light'
  });
}

// 计算两个RGB颜色之间的欧几里得距离
function calculateColorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

// 从hex颜色转换为RGB
function hexToRgb(hex: string): [number, number, number] | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  return [rgb.r, rgb.g, rgb.b];
}

// 颜色合并功能
function mergeColors() {
  // 保存原始数据（只在第一次合并时保存）
  if (originalGridData.value.length === 0) {
    originalGridData.value = JSON.parse(JSON.stringify(gridData.value));
    originalBomData.value = JSON.parse(JSON.stringify(bomData.value));
  }
  
  let totalMerged = 0;
  let iteration = 0;
  const maxIterations = 10; // 防止无限循环
  
  // 迭代合并，直到所有颜色用量都大于阈值
  while (iteration < maxIterations) {
    // 重新计算当前bomData
    const currentColorCountMap = new Map<string, { color: PaletteColor; count: number }>();
    
    for (let y = 0; y < gridData.value.length; y++) {
      for (let x = 0; x < gridData.value[y].length; x++) {
        const cell = gridData.value[y][x];
        if (cell && cell.color) {
          const colorName = cell.color.name;
          if (currentColorCountMap.has(colorName)) {
            currentColorCountMap.get(colorName)!.count++;
          } else {
            currentColorCountMap.set(colorName, {
              color: cell.color,
              count: 1
            });
          }
        }
      }
    }
    
    const currentBomData = Array.from(currentColorCountMap.values());
    
    // 找出所有用量 > 阈值 的颜色（候选颜色，用于匹配）
    const candidateColors: PaletteColor[] = [];
    currentBomData.forEach(item => {
      if (item.count > colorMergeThreshold.value && item.color) {
        candidateColors.push(item.color);
      }
    });
    
    // 找出所有用量 <= 阈值 的颜色
    const smallCountColors: Array<{ color: PaletteColor; count: number }> = [];
    currentBomData.forEach(item => {
      if (item.count <= colorMergeThreshold.value && item.color) {
        smallCountColors.push({ color: item.color, count: item.count });
      }
    });
    
    // 如果没有需要合并的颜色，退出循环
    if (smallCountColors.length === 0) {
      break;
    }
    
    // 如果没有候选颜色，无法继续合并
    if (candidateColors.length === 0) {
      uni.showToast({
        title: `无法继续合并：所有颜色用量都 <= ${colorMergeThreshold.value}`,
        icon: 'none'
      });
      return;
    }
    
    // 创建颜色映射表：用量 <= 3 的颜色 -> 最相近的用量 > 3 的颜色
    const colorMap = new Map<string, PaletteColor>();
    
    // 为每个用量 <= 3 的颜色找到最相近的候选颜色
    smallCountColors.forEach(({ color: smallColor }) => {
      const smallRgb = hexToRgb(smallColor.hex);
      if (!smallRgb) return;
      
      let closestColor: PaletteColor | null = null;
      let minDistance = Infinity;
      
      candidateColors.forEach(candidateColor => {
        // 跳过自己
        if (candidateColor.name === smallColor.name) return;
        
        const candidateRgb = hexToRgb(candidateColor.hex);
        if (!candidateRgb) return;
        
        const distance = calculateColorDistance(smallRgb, candidateRgb);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = candidateColor;
        }
      });
      
      if (closestColor) {
        colorMap.set(smallColor.name, closestColor);
      }
    });
    
    if (colorMap.size === 0) {
      break;
    }
    
    totalMerged += colorMap.size;
    
    // 应用颜色映射到gridData
    for (let y = 0; y < gridData.value.length; y++) {
      for (let x = 0; x < gridData.value[y].length; x++) {
        const cell = gridData.value[y][x];
        if (cell && cell.color && colorMap.has(cell.color.name)) {
          cell.color = colorMap.get(cell.color.name)!;
        }
      }
    }
    
    iteration++;
  }
  
  // 重新计算最终的bomData
  const finalColorCountMap = new Map<string, { color: PaletteColor; count: number }>();
  
  for (let y = 0; y < gridData.value.length; y++) {
    for (let x = 0; x < gridData.value[y].length; x++) {
      const cell = gridData.value[y][x];
      if (cell && cell.color) {
        const colorName = cell.color.name;
        if (finalColorCountMap.has(colorName)) {
          finalColorCountMap.get(colorName)!.count++;
        } else {
          finalColorCountMap.set(colorName, {
            color: cell.color,
            count: 1
          });
        }
      }
    }
  }
  
  bomData.value = Array.from(finalColorCountMap.values())
    .sort((a, b) => b.count - a.count);
  
  drawBeads();
  
  if (totalMerged > 0) {
    uni.showToast({
      title: `已合并 ${totalMerged} 种颜色`,
      icon: 'success',
      duration: 1500
    });
  } else {
    uni.showToast({
      title: '没有需要合并的颜色',
      icon: 'none'
    });
  }
}

// 解除颜色合并
function unmergeColors() {
  if (originalGridData.value.length === 0 || originalBomData.value.length === 0) {
    uni.showToast({
      title: '没有可恢复的数据',
      icon: 'none'
    });
    return;
  }
  
  // 恢复原始数据
  gridData.value = JSON.parse(JSON.stringify(originalGridData.value));
  bomData.value = JSON.parse(JSON.stringify(originalBomData.value));
  
  // 注意：不清空originalGridData和originalBomData，以便用户再次合并时可以使用
  // 但如果用户重新处理图片，这些数据会被新的数据覆盖
  
  drawBeads();
  
  uni.showToast({
    title: '已解除合并',
    icon: 'success',
    duration: 1500
  });
}

// 切换颜色合并状态
function toggleColorMerge() {
  if (colorMerged.value) {
    // 当前是合并状态，解除合并
    unmergeColors();
    colorMerged.value = false;
  } else {
    // 当前是未合并状态，执行合并
    // 注意：合并操作不会影响图像增强状态
    mergeColors();
    colorMerged.value = true;
  }
  
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
    // 导出高清图片（带水印）
    const tempFilePath = await canvasToTempFilePathWithWatermark();
    
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
    const bomItems = bomData.value; // 展示所有颜色
    const layout = await computePosterLayout(bomItems);
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

/**
 * Canvas 转临时文件（带水印）
 * 注意：使用processCanvas添加水印，不影响displayCanvas
 */
async function canvasToTempFilePathWithWatermark(): Promise<string> {
  if (!watermarkText.value) {
    // 如果没有水印，直接导出
    return await canvasToTempFilePath();
  }
  
  // 使用processCanvas添加水印，不影响displayCanvas
  return new Promise((resolve, reject) => {
    const query = uni.createSelectorQuery();
    
    query
      .select('#displayCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res || !res[0] || !res[0].node) {
          resolve(await canvasToTempFilePath());
          return;
        }
        
        const sourceCanvas = res[0].node;
        const width = canvasViewWidth.value * dpr * 2;
        const height = canvasViewHeight.value * dpr * 2;
        
        // 使用processCanvas作为临时canvas
        if (!processCanvas || !processCtx) {
          resolve(await canvasToTempFilePath());
          return;
        }
        
        // 设置processCanvas尺寸
        processCanvas.width = width;
        processCanvas.height = height;
        
        // 将原图绘制到processCanvas
        processCtx.drawImage(sourceCanvas, 0, 0, width, height);
        
        // 添加稀疏水印
        processCtx.save();
        processCtx.globalAlpha = 0.15; // 更透明
        processCtx.fillStyle = '#000000';
        const fontSize = Math.floor(width / 40); // 更小的字体
        processCtx.font = `${fontSize}px Arial`;
        processCtx.textAlign = 'left';
        processCtx.textBaseline = 'middle';
        
        // 计算倾斜角度和间距（更大的间距，稀疏分布）
        const angle = -30 * Math.PI / 180; // -30度倾斜
        const textSpacing = fontSize * 8; // 更大的文字间距（稀疏）
        const rowSpacing = fontSize * 6; // 更大的行间距（稀疏）
        
        // 计算需要绘制的行数和列数
        const diagonal = Math.sqrt(width * width + height * height);
        const rows = Math.ceil(diagonal / rowSpacing) + 2;
        const cols = Math.ceil(diagonal / textSpacing) + 2;
        
        // 绘制重复水印（稀疏分布）
        for (let row = -1; row < rows; row++) {
          for (let col = -1; col < cols; col++) {
            const x = col * textSpacing;
            const y = row * rowSpacing;
            
            processCtx.save();
            processCtx.translate(x, y);
            processCtx.rotate(angle);
            processCtx.fillText(watermarkText.value, 0, 0);
            processCtx.restore();
          }
        }
        
        processCtx.restore();
        
        // 从processCanvas导出带水印的图片
        uni.canvasToTempFilePath({
          canvas: processCanvas,
          x: 0,
          y: 0,
          width: width,
          height: height,
          destWidth: width,
          destHeight: height,
          fileType: 'png',
          quality: 1,
          success: (res) => {
            resolve(res.tempFilePath);
          },
          fail: async (err) => {
            console.error('带水印导出失败，使用原图:', err);
            resolve(await canvasToTempFilePath());
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

async function computePosterLayout(items: BOMItem[]): Promise<PosterLayout> {
  const width = POSTER_WIDTH;
  const padding = 0; // 左右不留空隙，坐标格子紧贴屏幕边缘
  
  // 顶部区域：二维码 + 标题信息
  const topBarHeight = 100; // 顶部标题栏高度
  const qrCodeSize = 80; // 左上角二维码尺寸
  const qrCodePadding = 20; // 二维码内边距
  
  // 图纸区域（需要居中，并考虑坐标格子）
  const imagePadding = 20; // 图纸周围的小间距（仅上下）
  const aspectRatio = canvasViewHeight.value > 0 ? (canvasViewHeight.value / canvasViewWidth.value) : 1;
  
  // 可用空间（考虑坐标格子）
  const availableWidth = width; // 全屏宽度，坐标格子紧贴左右边缘
  
  // 迭代计算合适的尺寸，确保图纸和坐标格子都在屏幕内
  // 坐标格子大小取决于图纸尺寸，需要迭代求解
  let imageWidth = availableWidth;
  let imageHeight = Math.round(imageWidth * aspectRatio);
  let cellWidth = imageWidth / gridWidth.value;
  let cellHeight = imageHeight / gridHeight.value;
  let labelAreaSize = Math.max(cellWidth, cellHeight);
  let totalWidth = imageWidth + labelAreaSize * 2;
  
  // 如果超出宽度，需要缩小
  if (totalWidth > availableWidth) {
    // 解方程：imageWidth + labelAreaSize * 2 = availableWidth
    // labelAreaSize = max(imageWidth/gridWidth, imageHeight/gridHeight)
    // 需要迭代求解
    for (let i = 0; i < 10; i++) { // 最多迭代10次
      const prevLabelSize = labelAreaSize;
      imageWidth = availableWidth - labelAreaSize * 2;
      imageHeight = Math.round(imageWidth * aspectRatio);
      cellWidth = imageWidth / gridWidth.value;
      cellHeight = imageHeight / gridHeight.value;
      labelAreaSize = Math.max(cellWidth, cellHeight);
      totalWidth = imageWidth + labelAreaSize * 2;
      
      // 如果收敛或满足条件，退出
      if (Math.abs(labelAreaSize - prevLabelSize) < 0.1 || totalWidth <= availableWidth) {
        break;
      }
    }
    
    // 确保不超过可用宽度
    if (totalWidth > availableWidth) {
      const scale = availableWidth / totalWidth;
      imageWidth = Math.floor(imageWidth * scale);
      imageHeight = Math.round(imageWidth * aspectRatio);
      cellWidth = imageWidth / gridWidth.value;
      cellHeight = imageHeight / gridHeight.value;
      labelAreaSize = Math.max(cellWidth, cellHeight);
      totalWidth = imageWidth + labelAreaSize * 2;
    }
  }
  
  const totalHeight = imageHeight + labelAreaSize * 2;
  
  // 计算居中位置（坐标格子紧贴左右边缘）
  const imageX = labelAreaSize; // 左侧坐标格子紧贴屏幕左边缘
  const imageY = padding + topBarHeight + imagePadding + labelAreaSize;
  
  // 底部色号清单（使用圆角矩形，移除标题，只保留内容）
  const bomItemHeight = 50; // 每个色号项的高度
  const bomItemGap = 12; // 色号项之间的间距
  // 估算每个色号项的宽度（实际会在drawPosterBOM中动态计算）
  const estimatedItemWidth = 150; // 估算宽度，用于计算每行能放多少个
  const bomMaxItemsPerRow = Math.floor(width / (estimatedItemWidth + bomItemGap)); // 根据宽度计算每行能放多少个
  const bomRows = Math.ceil(items.length / bomMaxItemsPerRow);
  const bomHeight = bomRows * bomItemHeight + (bomRows > 0 ? (bomRows - 1) * bomItemGap : 0) + 20; // 内容+底部间距（移除标题高度）
  
  // 计算总高度：顶部栏 + 图纸（含上下坐标格子）+ 底部清单
  const height = padding + topBarHeight + imagePadding + totalHeight + imagePadding + bomHeight + padding;

  return {
    width,
    height,
    padding,
    titleY: padding + topBarHeight / 2, // 标题垂直居中在顶部栏
    metaStartY: 0, // 不再使用
    workInfoY: 0, // 不再使用
    image: {
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight
    },
    bomStartY: padding + topBarHeight + imagePadding + totalHeight + imagePadding,
    bomRowHeight: bomItemHeight,
    qrCodeY: padding + qrCodePadding, // 二维码在左上角
    qrCodeSize: qrCodeSize,
    qrCodeX: padding + qrCodePadding, // 二维码X位置（左上角）
    labelAreaSize // 添加标号区域大小，供绘制函数使用
  };
}

async function drawPoster(snapshotPath: string, layout: PosterLayout, items: BOMItem[]) {
  if (!posterCtx || !posterCanvas) {
    throw new Error('长图画布未初始化');
  }

  posterCtx.clearRect(0, 0, layout.width, layout.height);

  // 直接使用白色背景，简洁美观
  posterCtx.fillStyle = '#FFFFFF';
  posterCtx.fillRect(0, 0, layout.width, layout.height);

  // 绘制顺序：顶部信息（二维码+标题）、图纸、色号清单
  await drawPosterQRCode(layout); // 二维码在左上角
  drawPosterHeader(layout); // 标题信息（拼豆魔法工坊、品牌、数量）
  await drawPosterImage(snapshotPath, layout);
  drawPosterBOM(layout, items); // 密集排列的色号清单
  
  // 添加稀疏倾斜重复水印（如果有）
  if (watermarkText.value && posterCtx) {
    posterCtx.save();
    posterCtx.globalAlpha = 0.15; // 更透明
    posterCtx.fillStyle = '#000000';
    const fontSize = 18; // 更小的字体
    posterCtx.font = `${fontSize}px Arial`;
    posterCtx.textAlign = 'left';
    posterCtx.textBaseline = 'middle';
    
    // 计算倾斜角度和间距（更大的间距，稀疏分布）
    const angle = -30 * Math.PI / 180; // -30度倾斜
    const textSpacing = fontSize * 8; // 更大的文字间距（稀疏）
    const rowSpacing = fontSize * 6; // 更大的行间距（稀疏）
    
    // 计算需要绘制的行数和列数
    const diagonal = Math.sqrt(layout.width * layout.width + layout.height * layout.height);
    const rows = Math.ceil(diagonal / rowSpacing) + 2;
    const cols = Math.ceil(diagonal / textSpacing) + 2;
    
    // 绘制重复水印（稀疏分布）
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * textSpacing;
        const y = row * rowSpacing;
        
        posterCtx.save();
        posterCtx.translate(x, y);
        posterCtx.rotate(angle);
        posterCtx.fillText(watermarkText.value, 0, 0);
        posterCtx.restore();
      }
    }
    
    posterCtx.restore();
  }
}

function drawPosterHeader(layout: PosterLayout) {
  if (!posterCtx) return;
  posterCtx.save();
  
  // 二维码在左上角，标题信息在二维码右侧
  const qrCodeRight = (layout.qrCodeX || 0) + layout.qrCodeSize;
  const textStartX = qrCodeRight + 20; // 二维码右侧20px开始
  
  // 计算二维码的中心Y坐标，使文字与二维码垂直居中对齐
  const qrCodeCenterY = layout.qrCodeY + layout.qrCodeSize / 2;
  const textY = qrCodeCenterY; // 文字Y坐标与二维码中心对齐
  
  // 绘制"拼豆魔法工坊"
  posterCtx.fillStyle = '#6C5CE7';
  posterCtx.font = '700 36px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.textAlign = 'left';
  posterCtx.textBaseline = 'middle';
  posterCtx.fillText('拼豆魔法工坊', textStartX, textY);
  
  // 测量"拼豆魔法工坊"的宽度
  const titleWidth = posterCtx.measureText('拼豆魔法工坊').width;
  
  // 绘制品牌和数量（例如：Mard（1642））
  const brandText = `${brandInfo.value?.displayName || 'Mard'}（${totalBeads.value}）`;
  posterCtx.fillStyle = '#636E72';
  posterCtx.font = '500 28px "PingFang SC","Helvetica Neue",sans-serif';
  posterCtx.fillText(brandText, textStartX + titleWidth + 12, textY);
  
  posterCtx.restore();
}

function drawPosterWorkInfo(layout: PosterLayout) {
  if (!posterCtx) return;
  posterCtx.save();
  
  const infoItems: Array<{ label: string; value: string }> = [];
  
  // 移除作品名称和作者名称，只保留品牌和尺寸
  infoItems.push({ label: '品牌', value: brandInfo.value?.displayName || '--' });
  infoItems.push({ label: '尺寸', value: `${gridWidth.value}×${gridHeight.value}` });
  
  // 卡片式布局：每行2个，使用圆角卡片背景
  const cardWidth = (layout.width - layout.padding * 2 - 24) / 2; // 每张卡片宽度，减去间距
  const cardHeight = 56; // 增加卡片高度
  const cardGap = 24; // 卡片之间的间距（增加间距）
  const cardRadius = 14; // 增加圆角半径
  const cardRowGap = 16; // 卡片行间距
  const startX = layout.padding;
  const startY = layout.workInfoY;
  
  infoItems.forEach((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const cardX = startX + col * (cardWidth + cardGap);
    const cardY = startY + row * (cardHeight + cardRowGap);
    
    // 绘制卡片背景（浅灰色，带圆角）
    drawRoundedRect(posterCtx, cardX, cardY, cardWidth, cardHeight, cardRadius, '#F8F9FA');
    
    // 绘制左侧标签背景（紫色渐变，只覆盖左侧部分）
    const labelBgWidth = 56; // 增加标签宽度
    const labelBgHeight = cardHeight;
    
    // 绘制左侧圆角矩形（带渐变效果）
    posterCtx.save();
    const gradient = posterCtx.createLinearGradient(cardX, cardY, cardX + labelBgWidth, cardY + cardHeight);
    gradient.addColorStop(0, '#6C5CE7');
    gradient.addColorStop(1, '#8B7ED8');
    posterCtx.fillStyle = gradient;
    posterCtx.beginPath();
    posterCtx.moveTo(cardX + cardRadius, cardY);
    posterCtx.lineTo(cardX + labelBgWidth, cardY);
    posterCtx.lineTo(cardX + labelBgWidth, cardY + cardHeight);
    posterCtx.lineTo(cardX + cardRadius, cardY + cardHeight);
    posterCtx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cardRadius);
    posterCtx.lineTo(cardX, cardY + cardRadius);
    posterCtx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
    posterCtx.closePath();
    posterCtx.fill();
    posterCtx.restore();
    
    // 绘制标签文字（白色，加粗）
    posterCtx.font = '600 24px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.fillStyle = '#FFFFFF';
    posterCtx.textAlign = 'center';
    posterCtx.textBaseline = 'middle';
    posterCtx.fillText(item.label, cardX + labelBgWidth / 2, cardY + cardHeight / 2);
    
    // 绘制值文字（深色，优化字体大小）
    const valueX = cardX + labelBgWidth + 16; // 增加左边距
    const maxValueWidth = cardWidth - labelBgWidth - 32; // 增加右边距
    let displayValue = item.value;
    
    // 测量并截断文字
    posterCtx.font = '500 26px "PingFang SC","Helvetica Neue",sans-serif';
    posterCtx.textAlign = 'left';
    const valueMetrics = posterCtx.measureText(displayValue);
    if (valueMetrics.width > maxValueWidth) {
      while (posterCtx.measureText(displayValue + '...').width > maxValueWidth && displayValue.length > 0) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += '...';
    }
    
    posterCtx.fillStyle = '#2d3436';
    posterCtx.fillText(displayValue, valueX, cardY + cardHeight / 2);
  });
  
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
  
  // 计算每个格子的尺寸（基于实际图纸尺寸和网格尺寸）
  const cellWidth = layout.image.width / gridWidth.value;
  const cellHeight = layout.image.height / gridHeight.value;
  
  // 坐标格子尺寸（与格子大小一致）
  const labelCellSize = layout.labelAreaSize || Math.max(cellWidth, cellHeight); // 坐标格子大小
  const labelFontSize = Math.min(cellWidth, cellHeight) * 0.5; // 字体大小，约为格子大小的50%
  
  // 绘制图纸背景（扩展到包含坐标格子区域）
  const bgPadding = 6;
  const bgX = layout.image.x - labelCellSize - bgPadding;
  const bgY = layout.image.y - labelCellSize - bgPadding;
  const bgWidth = layout.image.width + labelCellSize * 2 + bgPadding * 2;
  const bgHeight = layout.image.height + labelCellSize * 2 + bgPadding * 2;
  drawRoundedRect(posterCtx, bgX, bgY, bgWidth, bgHeight, 28, '#f5f7f7');
  
  // 绘制图纸
  posterCtx.drawImage(image, layout.image.x, layout.image.y, layout.image.width, layout.image.height);
  
  // 先绘制坐标格子（紫色背景白色字体），网格线会绘制在上面
  posterCtx.save();
  const labelBgColor = '#6C5CE7'; // 紫色背景
  const labelTextColor = '#FFFFFF'; // 白色字体
  
  // 上方列号坐标格子（从左到右：1, 2, 3...）
  for (let col = 0; col < gridWidth.value; col++) {
    const cellX = layout.image.x + col * cellWidth;
    const cellY = layout.image.y - labelCellSize;
    
    // 绘制紫色背景方格
    posterCtx.fillStyle = labelBgColor;
    posterCtx.fillRect(cellX, cellY, cellWidth, labelCellSize);
    
    // 绘制白色数字（粗体）
    posterCtx.fillStyle = labelTextColor;
    posterCtx.font = `700 ${labelFontSize}px "PingFang SC","Helvetica Neue",sans-serif`;
    posterCtx.textAlign = 'center';
    posterCtx.textBaseline = 'middle';
    posterCtx.fillText((col + 1).toString(), cellX + cellWidth / 2, cellY + labelCellSize / 2);
  }
  
  // 下方列号坐标格子（从左到右：1, 2, 3...）
  for (let col = 0; col < gridWidth.value; col++) {
    const cellX = layout.image.x + col * cellWidth;
    const cellY = layout.image.y + layout.image.height;
    
    // 绘制紫色背景方格
    posterCtx.fillStyle = labelBgColor;
    posterCtx.fillRect(cellX, cellY, cellWidth, labelCellSize);
    
    // 绘制白色数字（粗体）
    posterCtx.fillStyle = labelTextColor;
    posterCtx.font = `700 ${labelFontSize}px "PingFang SC","Helvetica Neue",sans-serif`;
    posterCtx.fillText((col + 1).toString(), cellX + cellWidth / 2, cellY + labelCellSize / 2);
  }
  
  // 左侧行号坐标格子（从上到下：1, 2, 3...）
  for (let row = 0; row < gridHeight.value; row++) {
    const cellX = layout.image.x - labelCellSize;
    const cellY = layout.image.y + row * cellHeight;
    
    // 绘制紫色背景方格
    posterCtx.fillStyle = labelBgColor;
    posterCtx.fillRect(cellX, cellY, labelCellSize, cellHeight);
    
    // 绘制白色数字（粗体）
    posterCtx.fillStyle = labelTextColor;
    posterCtx.font = `700 ${labelFontSize}px "PingFang SC","Helvetica Neue",sans-serif`;
    posterCtx.fillText((row + 1).toString(), cellX + labelCellSize / 2, cellY + cellHeight / 2);
  }
  
  // 右侧行号坐标格子（从上到下：1, 2, 3...）
  for (let row = 0; row < gridHeight.value; row++) {
    const cellX = layout.image.x + layout.image.width;
    const cellY = layout.image.y + row * cellHeight;
    
    // 绘制紫色背景方格
    posterCtx.fillStyle = labelBgColor;
    posterCtx.fillRect(cellX, cellY, labelCellSize, cellHeight);
    
    // 绘制白色数字（粗体）
    posterCtx.fillStyle = labelTextColor;
    posterCtx.font = `700 ${labelFontSize}px "PingFang SC","Helvetica Neue",sans-serif`;
    posterCtx.fillText((row + 1).toString(), cellX + labelCellSize / 2, cellY + cellHeight / 2);
  }
  
  // 绘制四个角的格子（不写数字）
  // 左上角
  posterCtx.fillStyle = labelBgColor;
  posterCtx.fillRect(
    layout.image.x - labelCellSize,
    layout.image.y - labelCellSize,
    labelCellSize,
    labelCellSize
  );
  
  // 右上角
  posterCtx.fillRect(
    layout.image.x + layout.image.width,
    layout.image.y - labelCellSize,
    labelCellSize,
    labelCellSize
  );
  
  // 左下角
  posterCtx.fillRect(
    layout.image.x - labelCellSize,
    layout.image.y + layout.image.height,
    labelCellSize,
    labelCellSize
  );
  
  // 右下角
  posterCtx.fillRect(
    layout.image.x + layout.image.width,
    layout.image.y + layout.image.height,
    labelCellSize,
    labelCellSize
  );
  
  posterCtx.restore();
  
  // 绘制网格线（深灰色细线，每隔5格粗黑线）
  // 网格线覆盖整个区域：图纸 + 坐标格子
  const gridStartX = layout.image.x - labelCellSize; // 包含左侧坐标格子
  const gridStartY = layout.image.y - labelCellSize; // 包含上方坐标格子
  const gridEndX = layout.image.x + layout.image.width + labelCellSize; // 包含右侧坐标格子
  const gridEndY = layout.image.y + layout.image.height + labelCellSize; // 包含下方坐标格子
  
  posterCtx.save();
  
  // 绘制垂直线（列线）
  for (let col = 0; col <= gridWidth.value; col++) {
    const lineX = layout.image.x + col * cellWidth;
    const isThickLine = col % 5 === 0; // 每隔5格使用粗线
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72'; // 粗线黑色，细线深灰色
    posterCtx.lineWidth = isThickLine ? 2 : 1; // 粗线2px，细线1px
    posterCtx.beginPath();
    posterCtx.moveTo(lineX, gridStartY);
    posterCtx.lineTo(lineX, gridEndY);
    posterCtx.stroke();
  }
  
  // 绘制水平线（行线）
  for (let row = 0; row <= gridHeight.value; row++) {
    const lineY = layout.image.y + row * cellHeight;
    const isThickLine = row % 5 === 0; // 每隔5格使用粗线
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72'; // 粗线黑色，细线深灰色
    posterCtx.lineWidth = isThickLine ? 2 : 1; // 粗线2px，细线1px
    posterCtx.beginPath();
    posterCtx.moveTo(gridStartX, lineY);
    posterCtx.lineTo(gridEndX, lineY);
    posterCtx.stroke();
  }
  
  // 绘制坐标格子区域的网格线
  // 上方坐标格子的垂直线
  for (let col = 0; col <= gridWidth.value; col++) {
    const lineX = layout.image.x + col * cellWidth;
    const isThickLine = col % 5 === 0;
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72';
    posterCtx.lineWidth = isThickLine ? 2 : 1;
    posterCtx.beginPath();
    posterCtx.moveTo(lineX, layout.image.y - labelCellSize);
    posterCtx.lineTo(lineX, layout.image.y);
    posterCtx.stroke();
  }
  
  // 下方坐标格子的垂直线
  for (let col = 0; col <= gridWidth.value; col++) {
    const lineX = layout.image.x + col * cellWidth;
    const isThickLine = col % 5 === 0;
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72';
    posterCtx.lineWidth = isThickLine ? 2 : 1;
    posterCtx.beginPath();
    posterCtx.moveTo(lineX, layout.image.y + layout.image.height);
    posterCtx.lineTo(lineX, layout.image.y + layout.image.height + labelCellSize);
    posterCtx.stroke();
  }
  
  // 左侧坐标格子的水平线
  for (let row = 0; row <= gridHeight.value; row++) {
    const lineY = layout.image.y + row * cellHeight;
    const isThickLine = row % 5 === 0;
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72';
    posterCtx.lineWidth = isThickLine ? 2 : 1;
    posterCtx.beginPath();
    posterCtx.moveTo(layout.image.x - labelCellSize, lineY);
    posterCtx.lineTo(layout.image.x, lineY);
    posterCtx.stroke();
  }
  
  // 右侧坐标格子的水平线
  for (let row = 0; row <= gridHeight.value; row++) {
    const lineY = layout.image.y + row * cellHeight;
    const isThickLine = row % 5 === 0;
    
    posterCtx.strokeStyle = isThickLine ? '#000000' : '#636E72';
    posterCtx.lineWidth = isThickLine ? 2 : 1;
    posterCtx.beginPath();
    posterCtx.moveTo(layout.image.x + layout.image.width, lineY);
    posterCtx.lineTo(layout.image.x + layout.image.width + labelCellSize, lineY);
    posterCtx.stroke();
  }
  
  posterCtx.restore();
}

function drawPosterBOM(layout: PosterLayout, items: BOMItem[]) {
  if (!posterCtx) return;
  const cardWidth = layout.width; // 全屏宽度，不留左右边距
  let currentY = layout.bomStartY;
  posterCtx.save();
  
  // 使用圆角矩形显示色号和数量
  const itemHeight = 50; // 每个色号项的高度
  const itemGap = 12; // 色号项之间的间距
  const borderRadius = 8; // 圆角半径
  
  // 计算每个色号项的宽度（根据文字内容动态计算）
  posterCtx.font = '500 22px "PingFang SC","Helvetica Neue",sans-serif';
  let maxItemWidth = 0;
  items.forEach(item => {
    const text = `${item.color.name}(${item.count})`;
    const textWidth = posterCtx.measureText(text).width;
    const itemWidth = textWidth + 32; // 文字宽度 + 左右内边距（各16px）
    maxItemWidth = Math.max(maxItemWidth, itemWidth);
  });
  
  // 限制最大和最小宽度，确保美观
  const minItemWidth = 100;
  const maxItemWidthLimit = 180;
  const itemWidth = Math.max(minItemWidth, Math.min(maxItemWidth, maxItemWidthLimit));
  
  const maxItemsPerRow = Math.floor(cardWidth / (itemWidth + itemGap)); // 计算每行能放多少个
  
  for (let row = 0; row < Math.ceil(items.length / maxItemsPerRow); row++) {
    const rowY = currentY + row * (itemHeight + itemGap);
    
    for (let col = 0; col < maxItemsPerRow; col++) {
      const idx = row * maxItemsPerRow + col;
      if (idx >= items.length) break;
      
      const item = items[idx];
      // 居中排列：计算起始位置使内容居中
      const totalContentWidth = maxItemsPerRow * itemWidth + (maxItemsPerRow - 1) * itemGap;
      const startX = (layout.width - totalContentWidth) / 2;
      const itemX = startX + col * (itemWidth + itemGap);
      const itemY = rowY;
      
      // 绘制圆角矩形背景（使用对应颜色）
      drawRoundedRect(posterCtx, itemX, itemY, itemWidth, itemHeight, borderRadius, item.color.hex);
      
      // 使用对比色（深色背景配白字，浅色背景配黑字）
      const textColor = getContrastColor(item.color.hex);
      posterCtx.fillStyle = textColor;
      posterCtx.textBaseline = 'middle';
      posterCtx.font = '500 22px "PingFang SC","Helvetica Neue",sans-serif';
      
      // 绘制色号和数量，中间保持一点距离
      const centerX = itemX + itemWidth / 2;
      const centerY = itemY + itemHeight / 2;
      const spacing = 6; // 色号和数量之间的间距
      
      // 测量文字宽度
      const nameText = item.color.name;
      const countText = `(${item.count})`;
      const nameWidth = posterCtx.measureText(nameText).width;
      const countWidth = posterCtx.measureText(countText).width;
      
      // 计算起始位置，使整体居中
      const totalTextWidth = nameWidth + spacing + countWidth;
      const textStartX = centerX - totalTextWidth / 2;
      
      // 绘制色号
      posterCtx.textAlign = 'left';
      posterCtx.fillText(nameText, textStartX, centerY);
      
      // 绘制数量（在色号右侧，保持间距）
      posterCtx.fillText(countText, textStartX + nameWidth + spacing, centerY);
    }
  }

  posterCtx.restore();
}

async function drawPosterQRCode(layout: PosterLayout) {
  if (!posterCtx) return;
  
  try {
    // 使用uni.getImageInfo获取图片信息，这样可以兼容不同平台
    // 在微信小程序中，static目录下的资源需要使用相对路径或绝对路径
    let successfulPath = ''; // 保存成功加载的路径
    const imageInfo = await new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
      // 尝试多个可能的路径
      // 在微信小程序中，static目录会被复制到编译后的根目录
      // 路径应该相对于小程序根目录
      // 注意：如果直接在微信开发者工具中上传，路径应该是 /static/qrcode.png 或 /static/qrcode.jpg
      const paths = [
        '/static/qrcode.png',           // H5平台和微信小程序（绝对路径，推荐）
        '/static/qrcode.jpg',           // 支持 jpg 格式
        'static/qrcode.png',            // 相对路径（微信小程序）
        'static/qrcode.jpg',            // 相对路径（jpg）
        './static/qrcode.png',          // 相对路径（带./）
        './static/qrcode.jpg',          // 相对路径（带./，jpg）
        'pages/editor/static/qrcode.png', // 页面相对路径
        'pages/editor/static/qrcode.jpg', // 页面相对路径（jpg）
        '../static/qrcode.png',         // 相对路径（上一级）
        '../static/qrcode.jpg',         // 相对路径（上一级，jpg）
        '../../static/qrcode.png',      // 相对路径（上两级）
        '../../static/qrcode.jpg',      // 相对路径（上两级，jpg）
      ];
      
      let currentIndex = 0;
      
      const tryNextPath = () => {
        if (currentIndex >= paths.length) {
          reject(new Error('所有路径都尝试失败'));
          return;
        }
        
        const currentPath = paths[currentIndex];
        console.log(`尝试加载二维码路径: ${currentPath}`);
        
        uni.getImageInfo({
          src: currentPath,
          success: (res) => {
            console.log(`二维码加载成功，路径: ${currentPath}`, res);
            successfulPath = currentPath; // 保存成功加载的路径
            resolve(res);
          },
          fail: (err) => {
            console.warn(`路径 ${currentPath} 加载失败:`, err);
            currentIndex++;
            tryNextPath();
          }
        });
      };
      
      tryNextPath();
    });
    
    console.log('二维码图片信息获取成功:', imageInfo);
    console.log('成功加载的路径:', successfulPath);
    console.log('imageInfo.path:', imageInfo.path);
    
    // 在微信小程序中，canvas 的 createImage 可能需要绝对路径
    // 尝试多个路径格式，确保能找到图片
    const possiblePaths: string[] = [];
    
    // 1. 使用 imageInfo.path（getImageInfo 返回的路径）
    if (imageInfo.path) {
      possiblePaths.push(imageInfo.path);
      // 如果是相对路径，尝试添加前导斜杠
      if (!imageInfo.path.startsWith('/')) {
        possiblePaths.push('/' + imageInfo.path);
      }
    }
    
    // 2. 使用成功加载的原始路径
    if (successfulPath) {
      possiblePaths.push(successfulPath);
      // 如果是相对路径，尝试添加前导斜杠
      if (!successfulPath.startsWith('/')) {
        possiblePaths.push('/' + successfulPath);
      }
    }
    
    // 3. 添加默认路径（支持 png 和 jpg）
    possiblePaths.push('/static/qrcode.png', '/static/qrcode.jpg', 'static/qrcode.png', 'static/qrcode.jpg');
    
    // 去重
    const uniquePaths = [...new Set(possiblePaths)];
    console.log('尝试的二维码路径列表:', uniquePaths);
    
    // 尝试加载图片，使用第一个成功的路径
    let qrImage: any = null;
    let lastError: Error | null = null;
    
    for (const path of uniquePaths) {
      try {
        console.log(`尝试加载二维码路径: ${path}`);
        qrImage = await createPosterImage(path);
        console.log(`二维码加载成功，使用路径: ${path}`);
        break; // 成功则跳出循环
      } catch (error) {
        console.warn(`路径 ${path} 加载失败:`, error);
        lastError = error as Error;
        continue; // 继续尝试下一个路径
      }
    }
    
    if (!qrImage) {
      throw lastError || new Error('所有二维码路径都加载失败');
    }
    
    // 根据图片原始尺寸计算显示尺寸，保持宽高比
    // 二维码在左上角，尺寸固定为 layout.qrCodeSize
    const qrSize = layout.qrCodeSize;
    const imageAspectRatio = imageInfo.width / imageInfo.height;
    let displayWidth = qrSize;
    let displayHeight = qrSize / imageAspectRatio;
    
    // 如果高度超过宽度，则以高度为准
    if (displayHeight > qrSize) {
      displayHeight = qrSize;
      displayWidth = qrSize * imageAspectRatio;
    }
    
    // 计算左上角位置
    const qrX = layout.qrCodeX || 0;
    const qrY = layout.qrCodeY;
    
    // 直接绘制图片，无边框和阴影，融入整体设计
    posterCtx.drawImage(qrImage, qrX, qrY, displayWidth, displayHeight);
    
    console.log('二维码绘制成功，尺寸:', { width: displayWidth, height: displayHeight, aspectRatio: imageAspectRatio });
  } catch (error) {
    // 如果图片加载失败，不绘制占位符，直接跳过
    // 让长图自然结束，不显示错误信息，保持整体美观
    console.warn('底部图片加载失败:', error);
  }
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
    console.log('createPosterImage 开始加载图片，路径:', src);
    const image = posterCanvas.createImage ? posterCanvas.createImage() : new Image();
    
    // 设置超时，避免无限等待
    const timeout = setTimeout(() => {
      reject(new Error(`图片加载超时: ${src}`));
    }, 10000); // 10秒超时
    
    image.onload = () => {
      clearTimeout(timeout);
      console.log('createPosterImage 图片加载成功:', src);
      resolve(image);
    };
    
    image.onerror = (err: any) => {
      clearTimeout(timeout);
      console.error('createPosterImage 图片加载失败:', src, err);
      reject(new Error(`图片加载失败: ${src}, 错误: ${err?.message || '未知错误'}`));
    };
    
    // @ts-ignore
    if (typeof image.setAttribute === 'function') {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    
    try {
      image.src = src;
      console.log('createPosterImage 已设置图片路径:', src);
    } catch (error) {
      clearTimeout(timeout);
      console.error('createPosterImage 设置图片路径失败:', error);
      reject(error);
    }
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

.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-left .nav-text {
  font-size: 28rpx;
  color: #6C5CE7;
  font-weight: 500;
}

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
  border-radius: 24rpx;
  background: linear-gradient(135deg, #F8F9FF 0%, #F1EDFF 100%);
  box-shadow: 0 6rpx 18rpx rgba(108, 92, 231, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.nav-action:active {
  transform: translateY(4rpx);
  box-shadow: 0 2rpx 10rpx rgba(108, 92, 231, 0.2);
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

.canvas-tip {
  padding: 24rpx 32rpx;
  background-color: #F0EEFF;
  border-radius: 16rpx;
  margin: 0 32rpx 24rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-tip-text {
  font-size: 28rpx;
  color: #6C5CE7;
  font-weight: 500;
}

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
   作品信息
   ============================================ */

.work-info-section {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.08);
}

.work-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.work-info-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D3436;
}

.work-info-tip {
  font-size: 24rpx;
  color: #636E72;
  font-weight: 500;
}

.work-info-inputs {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.work-info-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.work-info-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.work-info-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #E5E5E5;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2D3436;
  background-color: #F8F9FA;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.work-info-input:focus {
  border-color: #6C5CE7;
  background-color: #FFFFFF;
}

/* ============================================
   高级设置板块
   ============================================ */

.advanced-settings-section {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.08);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D3436;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  flex-shrink: 0;
}

.setting-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.setting-input {
  width: 120rpx;
  height: 80rpx;
  padding: 0 16rpx;
  border: 2rpx solid #E5E5E5;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2D3436;
  background-color: #F8F9FA;
  transition: all 0.3s ease;
  box-sizing: border-box;
  text-align: center;
}

.setting-input:focus {
  border-color: #6C5CE7;
  background-color: #FFFFFF;
}

.setting-unit {
  font-size: 28rpx;
  color: #636E72;
  flex-shrink: 0;
}

.setting-hint {
  font-size: 24rpx;
  color: #B2BEC3;
  margin-top: 4rpx;
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
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.color-picker-modal {
  max-height: 90vh !important;
  height: auto !important;
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
  padding: 16rpx;
  min-height: 0;
  max-height: 100%;
}

.eraser-last-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

.color-item.eraser-compact {
  flex: 0 0 auto;
  width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx;
  border-radius: 16rpx;
  background-color: #F8F9FA;
  transition: all 0.3s ease;
}

.color-item.eraser-compact:active {
  background-color: #E5E5E5;
  transform: scale(0.98);
}

.color-preview.eraser-preview-compact {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #FFE5E5 0%, #FFCCCC 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.eraser-icon {
  font-size: 32rpx;
}

.color-info-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.color-item-name-compact {
  font-size: 24rpx;
  font-weight: 600;
  color: #2D3436;
  text-align: center;
}

.check-icon-compact {
  position: absolute;
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: bold;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
  z-index: 10;
}

/* 上次选择按钮 - 与橡皮擦按钮样式完全一致 */
.color-item.last-select-compact {
  flex: 0 0 auto;
  width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx;
  border-radius: 16rpx;
  background-color: #F8F9FA;
  transition: all 0.3s ease;
}

.color-item.last-select-compact:active {
  background-color: #E5E5E5;
  transform: scale(0.98);
}

.color-preview.last-select-preview-compact {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  border: 3rpx solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  position: relative;
}

.last-select-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #6C5CE7;
  text-align: center;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-item-grid {
  flex: 0 0 calc(20% - 13rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #F0F0F0;
  transition: all 0.3s ease;
  position: relative;
}

.color-item-grid:active {
  transform: scale(0.95);
  background-color: #F8F9FA;
}

.color-item-grid.color-item-selected {
  background-color: #F0EEFF;
  border-color: #6C5CE7;
}

.color-preview-grid {
  width: 80rpx;
  height: 80rpx;
  border-radius: 10rpx;
  margin-bottom: 8rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.color-info-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-item-name-grid {
  font-size: 22rpx;
  font-weight: 600;
  color: #2D3436;
  text-align: center;
}

.check-icon-grid {
  font-size: 48rpx;
  color: #FFFFFF;
  font-weight: 700;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
  position: absolute;
  z-index: 1;
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

/* 网格布局颜色项（5个一行） - 样式已在上面定义 */

.color-info-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-item-name-grid {
  font-size: 22rpx;
  font-weight: 600;
  color: #2D3436;
  text-align: center;
}

.check-icon-grid {
  font-size: 48rpx;
  color: #FFFFFF;
  font-weight: 700;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
  position: absolute;
  z-index: 1;
}
</style>
