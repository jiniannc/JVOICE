const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // SVG 파일이 존재하는지 확인
    if (!fs.existsSync(inputSvg)) {
      console.error('SVG 파일을 찾을 수 없습니다:', inputSvg);
      return;
    }

    // 출력 디렉토리가 존재하는지 확인
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('아이콘 생성 중...');

    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✓ ${size}x${size} 아이콘 생성 완료`);
    }

    console.log('모든 아이콘 생성이 완료되었습니다!');
  } catch (error) {
    console.error('아이콘 생성 중 오류 발생:', error);
  }
}

generateIcons();


