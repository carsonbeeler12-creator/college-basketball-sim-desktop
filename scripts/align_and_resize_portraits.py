#!/usr/bin/env python3
"""
Align and resize portrait sprites to consistent dimensions.
Ensures all layers (skin, hair, beard) are the same size and properly centered.
Also removes empty/transparent beard sprites.
"""

from PIL import Image
from pathlib import Path
import sys


class PortraitAligner:
    def __init__(self, portraits_dir: str = "public/Portraits", target_size: int = 512):
        """
        Args:
            portraits_dir: Path to Portraits directory
            target_size: Target size for all sprites (square)
        """
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.target_size = target_size

    def is_empty_sprite(self, img: Image.Image, threshold: int = 10) -> bool:
        """Check if sprite is mostly transparent or empty"""
        if img.mode != 'RGBA':
            return False
        
        # Count non-transparent pixels
        pixels = img.getdata()
        non_transparent = sum(1 for r, g, b, a in pixels if a > 50)
        total = img.width * img.height
        
        # If less than threshold% is visible, consider it empty
        return (non_transparent / total * 100) < threshold

    def resize_and_center(self, img: Image.Image, target_size: int) -> Image.Image:
        """
        Resize image to fit within target_size while maintaining aspect ratio.
        Center it on a transparent canvas of target_size.
        """
        # Calculate scale to fit within target size
        scale = min(target_size / img.width, target_size / img.height)
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)
        
        # Resize with high quality
        resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Create transparent canvas
        canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        
        # Center the resized image
        x_offset = (target_size - new_width) // 2
        y_offset = (target_size - new_height) // 2
        canvas.paste(resized, (x_offset, y_offset), resized if resized.mode == 'RGBA' else None)
        
        return canvas

    def process_directory(self, directory: Path, name: str) -> tuple:
        """
        Process all sprites in a directory.
        Returns (processed_count, removed_count)
        """
        if not directory.exists():
            print(f"❌ Directory not found: {directory}")
            return 0, 0

        print(f"\nProcessing {name}...")
        files = sorted(directory.glob("image_part_*.png"))
        processed = 0
        removed = 0
        
        for img_path in files:
            try:
                img = Image.open(img_path)
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Check if sprite is empty (for beards especially)
                if self.is_empty_sprite(img):
                    print(f"⊘ {img_path.name}: Empty sprite, removing...")
                    img_path.unlink()  # Delete the file
                    removed += 1
                    continue
                
                # Resize and center
                aligned = self.resize_and_center(img, self.target_size)
                aligned.save(img_path)
                
                print(f"✓ {img_path.name}: {img.size} → {aligned.size}")
                processed += 1
                
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")
        
        return processed, removed

    def renumber_files(self, directory: Path, name: str):
        """Renumber files sequentially after removals"""
        files = sorted(directory.glob("image_part_*.png"))
        
        if not files:
            return
        
        print(f"\nRenumbering {name} files...")
        for i, file_path in enumerate(files, 1):
            new_name = f"image_part_{i:03d}.png"
            new_path = directory / new_name
            
            if file_path.name != new_name:
                file_path.rename(new_path)
                print(f"  {file_path.name} → {new_name}")

    def run_all(self):
        """Process all portrait directories"""
        print("=" * 70)
        print("PORTRAIT ALIGNER & RESIZER")
        print(f"Target size: {self.target_size}×{self.target_size}px")
        print("=" * 70)

        # Process each directory
        skin_processed, skin_removed = self.process_directory(self.skin_dir, "Skin")
        hair_processed, hair_removed = self.process_directory(self.hair_dir, "Hair")
        beard_processed, beard_removed = self.process_directory(self.beard_dir, "Beard")

        # Renumber beards if any were removed
        if beard_removed > 0:
            self.renumber_files(self.beard_dir, "Beard")

        print("\n" + "=" * 70)
        print("SUMMARY")
        print(f"  Skin:  {skin_processed} aligned, {skin_removed} removed")
        print(f"  Hair:  {hair_processed} aligned, {hair_removed} removed")
        print(f"  Beard: {beard_processed} aligned, {beard_removed} removed")
        print(f"\nFinal counts:")
        print(f"  Skin tones: {skin_processed}")
        print(f"  Hair styles: {hair_processed}")
        print(f"  Beard styles: {beard_processed}")
        print("=" * 70)


def main():
    """
    Usage:
        python align_and_resize_portraits.py [portraits_dir] [target_size]
    
    Example:
        python align_and_resize_portraits.py public/Portraits 512
    """
    portraits_dir = sys.argv[1] if len(sys.argv) > 1 else "public/Portraits"
    target_size = int(sys.argv[2]) if len(sys.argv) > 2 else 512

    aligner = PortraitAligner(portraits_dir, target_size)
    aligner.run_all()


if __name__ == "__main__":
    main()
