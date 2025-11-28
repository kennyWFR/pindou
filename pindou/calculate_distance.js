// 计算 rgb(251,192,224) 在 Mard 品牌中的最接近颜色
const targetRgb = [251, 192, 224];

// Mard 品牌的粉色系颜色数据
const mardColors = [
  { name: "E1", hex: "ffd1cc", rgb: [255, 209, 204] },
  { name: "E2", hex: "ffcaea", rgb: [255, 202, 234] },
  { name: "E3", hex: "fb8dc5", rgb: [251, 141, 197] },
  { name: "E4", hex: "ee78ac", rgb: [238, 120, 172] },
  { name: "E5", hex: "f653a6", rgb: [246, 83, 166] },
  { name: "E6", hex: "fd2f81", rgb: [253, 47, 129] },
  { name: "E7", hex: "a2176a", rgb: [162, 23, 106] },
  { name: "E8", hex: "ffd8e8", rgb: [255, 216, 232] },
  { name: "E9", hex: "ea8cda", rgb: [234, 140, 218] },
  { name: "E10", hex: "bf3974", rgb: [191, 57, 116] },
  { name: "E11", hex: "fee7e2", rgb: [254, 231, 226] },
  { name: "E12", hex: "fcafdd", rgb: [252, 175, 221] },
  { name: "E13", hex: "a61284", rgb: [166, 18, 132] },
  { name: "E14", hex: "fdd2bf", rgb: [253, 210, 191] },
  { name: "E15", hex: "f3d1d7", rgb: [243, 209, 215] },
  { name: "E16", hex: "fff3eb", rgb: [255, 243, 235] },
  { name: "E17", hex: "fae8f8", rgb: [250, 232, 248] },
  { name: "E18", hex: "fdd1ea", rgb: [253, 209, 234] },
  { name: "E19", hex: "f6d3f3", rgb: [246, 211, 243] },
  { name: "E20", hex: "f4d7e9", rgb: [244, 215, 233] },
  { name: "E21", hex: "d6b3b9", rgb: [214, 179, 185] },
  { name: "E22", hex: "c685b0", rgb: [198, 133, 176] },
  { name: "E23", hex: "a089a3", rgb: [160, 137, 163] }
];

// 计算欧几里得距离
function calculateDistance(rgb1, rgb2) {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

// 查找最接近的颜色
let closestColor = null;
let minDistance = Infinity;

mardColors.forEach(color => {
  const distance = calculateDistance(targetRgb, color.rgb);
  console.log(`${color.name}: ${color.hex} -> 距离: ${distance.toFixed(2)}`);

  if (distance < minDistance) {
    minDistance = distance;
    closestColor = color;
  }
});

console.log(`\n目标颜色: rgb(${targetRgb.join(',')})`);
console.log(`最接近的 Mard 色号: ${closestColor.name}`);
console.log(`十六进制: ${closestColor.hex}`);
console.log(`RGB: [${closestColor.rgb.join(',')}]`);
console.log(`距离: ${minDistance.toFixed(2)}`);
