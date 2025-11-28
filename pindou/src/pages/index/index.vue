<template>
  <view class="container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">🎨 拼豆魔法工坊</text>
      <text class="subtitle">将你的图片变成拼豆魔法</text>
    </view>

    <!-- 核心卡片区 -->
    <view class="main-card">
      <!-- 品牌选择器 -->
      <view class="section">
        <view class="section-title">
          <text class="label">选择品牌</text>
          <text class="badge">{{ selectedBrandInfo?.displayName }}</text>
        </view>

        <scroll-view
          class="brand-chips"
          scroll-x
          show-scrollbar="false"
        >
          <view
            v-for="brand in brandList"
            :key="brand.key"
            class="chip"
            :class="{ 'chip-active': selectedBrand === brand.key }"
            @tap="handleBrandSelect(brand.key)"
          >
            <text class="chip-text">{{ brand.displayName }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 图片上传区 -->
      <view class="section">
        <view class="section-title">
          <text class="label">上传图片</text>
        </view>

        <view class="upload-area" @tap="handleChooseImage">
          <image
            v-if="imagePath"
            :src="imagePath"
            class="preview-image"
            mode="aspectFit"
          />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">点击上传图片</text>
          </view>
        </view>

        <view class="tip">
          <text class="tip-icon">💡</text>
          <text class="tip-text">图片主体占比越大，效果越好哦</text>
        </view>
      </view>

      <!-- 尺寸设置 -->
      <view class="section">
        <view class="section-title">
          <text class="label">拼豆宽度</text>
          <text class="value">{{ beadWidth }} 颗</text>
        </view>

        <view class="slider-container">
          <slider
            :value="beadWidth"
            :min="10"
            :max="100"
            :step="1"
            activeColor="#6C5CE7"
            backgroundColor="#E5E5E5"
            block-size="24"
            @change="handleSliderChange"
            @changing="handleSliderChanging"
          />
          <view class="slider-labels">
            <text class="slider-label">10</text>
            <text class="slider-label">100</text>
          </view>
        </view>
        <view class="tip tip-secondary">
          <text class="tip-icon">✨</text>
          <text class="tip-text">拼豆宽度越大，图纸越精美哦</text>
        </view>
      </view>
    </view>

    <!-- 底部生成按钮 -->
    <view class="footer">
      <button
        class="generate-btn"
        :class="{ 'generate-btn-disabled': !canGenerate }"
        :disabled="!canGenerate"
        @tap="handleGenerate"
      >
        <text class="btn-text">✨ 生成魔法图纸</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BrandKey } from '@/types/index';
import { BRAND_LIST } from '@/utils/paletteData';

const brandList = BRAND_LIST;

const selectedBrand = ref<BrandKey>('mard');
const imagePath = ref('');
const beadWidth = ref(60);

const selectedBrandInfo = computed(() => {
  return brandList.find(brand => brand.key === selectedBrand.value);
});

const canGenerate = computed(() => {
  return Boolean(imagePath.value) && beadWidth.value >= 10 && beadWidth.value <= 100;
});

const handleBrandSelect = (brandKey: BrandKey) => {
  selectedBrand.value = brandKey;
  if (typeof uni.vibrateShort === 'function') {
    uni.vibrateShort({
      type: 'light'
    });
  }
};

const handleChooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      imagePath.value = res.tempFilePaths[0];
      if (typeof uni.vibrateShort === 'function') {
        uni.vibrateShort({
          type: 'medium'
        });
      }
    },
    fail: (err) => {
      console.error('选择图片失败:', err);
      uni.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  });
};

const handleSliderChange = (e: any) => {
  beadWidth.value = e.detail.value;
};

const handleSliderChanging = (e: any) => {
  beadWidth.value = e.detail.value;
};

const handleGenerate = () => {
  if (!canGenerate.value) {
    uni.showToast({
      title: '请先上传图片',
      icon: 'none'
    });
    return;
  }

  if (typeof uni.vibrateShort === 'function') {
    uni.vibrateShort({
      type: 'heavy'
    });
  }

  uni.navigateTo({
    url: `/pages/editor/editor?brand=${selectedBrand.value}&width=${beadWidth.value}&image=${encodeURIComponent(imagePath.value)}`
  });
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.header {
  text-align: center;
  margin-bottom: 48rpx;
  padding-top: 20rpx;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 16rpx;
  letter-spacing: 2rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #636E72;
  font-weight: 400;
}

.main-card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.section {
  margin-bottom: 56rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.label {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
}

.badge {
  font-size: 24rpx;
  color: #6C5CE7;
  background-color: #F0EEFF;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-weight: 500;
}

.value {
  font-size: 32rpx;
  font-weight: 700;
  color: #6C5CE7;
}

.brand-chips {
  white-space: nowrap;
  display: flex;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 32rpx;
  margin-right: 16rpx;
  border-radius: 48rpx;
  background-color: #F5F5F5;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.chip-active {
  background-color: #6C5CE7;
  border-color: #6C5CE7;
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.3);
  transform: scale(1.05);
}

.chip-text {
  font-size: 28rpx;
  color: #636E72;
  font-weight: 500;
}

.chip-active .chip-text {
  color: #FFFFFF;
  font-weight: 600;
}

.upload-area {
  width: 100%;
  height: 400rpx;
  border-radius: 16rpx;
  border: 3rpx dashed #DFE6E9;
  background-color: #FAFBFC;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.3s ease;

  &:active {
    background-color: #F0F3F5;
    border-color: #6C5CE7;
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 80rpx;
  color: #B2BEC3;
  margin-bottom: 16rpx;
  font-weight: 300;
}

.upload-text {
  font-size: 28rpx;
  color: #636E72;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.tip {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background-color: #FFF9E6;
  border-radius: 12rpx;
}

.tip-secondary {
  background-color: #F2EEFF;
  margin-top: 16rpx;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #F39C12;
  font-weight: 500;
}

.slider-container {
  padding: 0 8rpx;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}

.slider-label {
  font-size: 24rpx;
  color: #B2BEC3;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  background: linear-gradient(to top, #FFFFFF 80%, transparent);
}

.generate-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(108, 92, 231, 0.4);
  transition: all 0.3s ease;

  &::after {
    border: none;
  }
}

.generate-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.3);
}

.generate-btn-disabled {
  background: linear-gradient(135deg, #DFE6E9 0%, #B2BEC3 100%);
  box-shadow: none;
  opacity: 0.6;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
</style>

