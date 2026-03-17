#!/usr/bin/env python3
"""
Resize portraits to same canvas WITHOUT moving content position.
Preserves original positioning so layers stack correctly.
"""

from PIL import Image
from pathlib import Path
import sys


class PositionPreservingResizer:
    def __init__(self, portraits_dir: str = "public/Portraits", target_size: int = 512):
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.target_size = target_size
        
    def resize_preserve_position(self, img: Image.Image, target_size: int) -> Image.Image:
        """
        Resize image to target_size canvas, preserving content position.
        Content stays in the same relative position in original and new canvas.
        """
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        original_size = img.size[0]  # Assuming square input
        
        # If already target size, return as-is
        if original_size == target_size:
            return img.copy()
        
        # Create transparent canvas at target size
        canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        
        # Calculate scale factor
        scale = target_size / original_size
        
        # Resize the image
        resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
        
        # Paste directly - content position preserved by resize
        canvas.paste(resized, (0, 0), resized)
        
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
                
                # Resize to target, preserving position
                resized = self.resize_preserve_position(img, self.target_size)
                resized.save(img_path)
                
                print(f"✓ {img_path.name}: {img.size} → {resized.size}")
                count += 1
                
            except Exception as e:
                print(f"❌ {img_path.name}: {e}")
        
        return count
    
    def run_all(self):
        """Process all directories"""
        print("=" * 70)
        print("POSITION-PRESERVING PORTRAIT RESIZER")
        print(f"Target: {self.target_size}×{self.target_size}px")
        print("Content positions preserved from original sprites")
        print("=" * 70)
        
        skin_count = self.process_directory(self.skin_dir, "Skin")
        hair_count = self.process_directory(self.hair_dir, "Hair")
        beard_count = self.process_directory(self.beard_dir, "Beard")
        
        print("\n" + "=" * 70)
        print(f"✅ COMPLETE: {skin_count} faces + {hair_count} hair + {beard_count} beards")
        print("All sprites resized with original positioning preserved")
        print("=" * 70)


def main():
    portraits_dir = sys.argv[1] if len(sys.argv) > 1 else "public/Portraits"
    target_size = int(sys.argv[2]) if len(sys.argv) > 2 else 512
    
    resizer = PositionPreservingResizer(portraits_dir, target_size)
    resizer.run_all()


if __name__ == "__main__":
    main()
