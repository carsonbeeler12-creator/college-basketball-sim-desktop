#!/usr/bin/env python3
"""
Align portraits by detecting content bounding box.
Aligns all layers (skin, hair, beard) so facial features are in the same position.
"""

from PIL import Image
from pathlib import Path
import sys


class ContentBasedAligner:
    def __init__(self, portraits_dir: str = "public/Portraits", target_size: int = 512):
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.target_size = target_size
        
    def get_content_bbox(self, img: Image.Image, threshold: int = 50) -> tuple:
        """
        Get bounding box of visible content (non-transparent pixels).
        Returns (left, top, right, bottom) or None if empty.
        """
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        pixels = img.load()
        width, height = img.size
        
        # Find bounds of non-transparent content
        min_x, min_y = width, height
        max_x, max_y = 0, 0
        found_content = False
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a > threshold:  # Non-transparent
                    found_content = True
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
        
        if not found_content:
            return None
        
        return (min_x, min_y, max_x + 1, max_y + 1)
    
    def align_to_top(self, img: Image.Image, target_size: int, top_margin: int = 20) -> Image.Image:
        """
        Align sprite content to top of canvas with consistent positioning.
        Maintains aspect ratio and uses same scale for all sprites.
        """
        bbox = self.get_content_bbox(img)
        if bbox is None:
            # Empty image, return transparent canvas
            return Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        
        # Crop to content
        left, top, right, bottom = bbox
        content = img.crop(bbox)
        content_width = right - left
        content_height = bottom - top
        
        # Scale to fit width with some margin (e.g., 80% of target width)
        max_width = int(target_size * 0.8)
        scale = max_width / content_width
        
        new_width = int(content_width * scale)
        new_height = int(content_height * scale)
        
        # Resize content
        resized = content.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Create canvas
        canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        
        # Position: horizontally centered, vertically from top with margin
        x_pos = (target_size - new_width) // 2
        y_pos = top_margin
        
        canvas.paste(resized, (x_pos, y_pos), resized)
        
        return canvas
    
    def process_directory(self, directory: Path, name: str) -> int:
        """Process all images in directory"""
        if not directory.exists():
            print(f"❌ {name} directory not found")
            return 0
        
        print(f"\nProcessing {name}...")
        files = sorted(directory.glob("image_part_*.png"))
        count = 0
        
        for img_path in files:
            try:
                img = Image.open(img_path)
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Align to top with consistent positioning
                aligned = self.align_to_top(img, self.target_size, top_margin=40)
                aligned.save(img_path)
                
                print(f"✓ {img_path.name}: Aligned to top")
                count += 1
                
            except Exception as e:
                print(f"❌ Error: {img_path.name}: {e}")
        
        return count
    
    def run_all(self):
        """Process all directories"""
        print("=" * 70)
        print("CONTENT-BASED PORTRAIT ALIGNER")
        print(f"Target: {self.target_size}×{self.target_size}px, top-aligned")
        print("=" * 70)
        
        skin_count = self.process_directory(self.skin_dir, "Skin")
        hair_count = self.process_directory(self.hair_dir, "Hair")
        beard_count = self.process_directory(self.beard_dir, "Beard")
        
        print("\n" + "=" * 70)
        print(f"✅ COMPLETE: {skin_count} skin + {hair_count} hair + {beard_count} beard")
        print("=" * 70)


def main():
    portraits_dir = sys.argv[1] if len(sys.argv) > 1 else "public/Portraits"
    target_size = int(sys.argv[2]) if len(sys.argv) > 2 else 512
    
    aligner = ContentBasedAligner(portraits_dir, target_size)
    aligner.run_all()


if __name__ == "__main__":
    main()
