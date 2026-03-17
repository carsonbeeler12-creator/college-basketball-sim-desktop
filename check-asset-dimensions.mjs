import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function checkDimensions(folderPath, folderName) {
  console.log(`\n${folderName}:`)
  console.log('-'.repeat(60))
  
  if (!fs.existsSync(folderPath)) {
    console.log(`  Folder not found: ${folderPath}`)
    return
  }
  
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png')).sort()
  
  if (files.length === 0) {
    console.log(`  No PNG files found`)
    return
  }
  
  const dimensions = {}
  
  for (const filename of files) {
    try {
      const imgPath = path.join(folderPath, filename)
      const metadata = await sharp(imgPath).metadata()
      const size = `${metadata.width}x${metadata.height}`
      
      if (!dimensions[size]) {
        dimensions[size] = []
      }
      dimensions[size].push(filename)
      
      console.log(`  ${filename}: ${metadata.width}x${metadata.height}`)
    } catch (e) {
      console.log(`  ${filename}: ERROR - ${e.message}`)
    }
  }
  
  console.log(`\nSummary for ${folderName}:`)
  for (const [size, files] of Object.entries(dimensions)) {
    console.log(`  ${size}: ${files.length} file(s)`)
  }
}

async function main() {
  await checkDimensions('public/Portraits/Skin', 'Skin Tones')
  await checkDimensions('public/Portraits/Hair', 'Hairstyles')
  await checkDimensions('public/Portraits/Beard', 'Beards')
}

main().catch(console.error)
