#!/usr/bin/env python3
"""
Portrait Component Extractor

Extracts individual portrait components (skin, hair, beard) from full-face portrait images
using image difference detection.

Works with existing Portraits/ structure:
  public/Portraits/
    Skin/    (6 base faces - different skin tones, same hair, no beard)
    Hair/    (16 faces - different hairstyles, same skin tone as Skin/001, no beard)
    Beard/   (25 faces - different beards, same skin tone as Skin/001)

This script:
- Uses Skin/001.png as the base face
- Subtracts base from each Hair image to isolate HAIR ONLY
- Subtracts base from each Beard image to isolate BEARD ONLY

Output: Cleaned images in the same folders (overwrites)
"""

from PIL import Image, ImageChops
import os
from pathlib import Path
from typing import Tuple

class PortraitExtractor:
    def __init__(self, portraits_dir: str = "public/Portraits", threshold: int = 25):
        """
        Args:
            portraits_dir: Path to Portraits directory containing Skin/, Hair/, Beard/ folders
            threshold: Pixel difference threshold for component extraction (0-255)
        """
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.threshold = threshold
        
        # Backup original files
        self.backup_dir = self.portraits_dir / "backup"
        self.backup_dir.mkdir(exist_ok=True)
    
    def load_image(self, path: Path) -> Image.Image:
        """Load image and convert to RGBA"""
        img = Image.open(path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        return img
    
    def backup_file(self, path: Path) -> Path:
        """Backup original file"""
        backup_path = self.backup_dir / path.name
        if not backup_path.exists():
            import shutil
            shutil.copy2(path, backup_path)
        return backup_path
    
    def extract_difference(self, img1: Image.Image, img2: Image.Image, 
                          threshold: int = 30) -> Image.Image:
        """
        Extract pixels that differ between two images.
        Returns new image with only different pixels, rest transparent.
        
        Uses img1 - img2 to identify the "added" component.
        
        Args:
            img1: Image with feature (e.g., face with hair)
            img2: Base image (e.g., face without hair)
            threshold: Minimum color difference to keep (0-255)
        """
        diff = ImageChops.difference(img1, img2)
        diff_data = diff.getdata()
        
        # Keep pixels with significant difference, make rest transparent
        new_data = []
        for r, g, b, a in diff_data:
            # Max color difference in this pixel
            max_diff = max(r, g, b)
            
            if max_diff > threshold:
                # This pixel changed significantly - keep it (use original colors from img1)
                new_data.append((r, g, b, 255))
            else:
                # No significant change - make transparent
                new_data.append((r, g, b, 0))
        
        result = Image.new('RGBA', diff.size)
        result.putdata(new_data)
        return result
    
    def extract_hair(self) -> int:
        """
        Extract hair layer by subtracting base skin (Skin/001) from hair variants.
        Uses Skin/image_part_001.png as the base face.
        """
        if not self.hair_dir.exists():
            print(f"❌ Hair directory not found: {self.hair_dir}")
            return 0
        
        # Load base face
        base_path = self.skin_dir / "image_part_001.png"
        if not base_path.exists():
            print(f"❌ Base face not found: {base_path}")
            return 0
        
        base_face = self.load_image(base_path)
        print(f"Using base face: {base_path.name} ({base_face.size})")
        
        count = 0
        for img_path in sorted(self.hair_dir.glob("image_part_*.png")):
            try:
                self.backup_file(img_path)
                hair_face = self.load_image(img_path)
                
                # Ensure same size
                if hair_face.size != base_face.size:
                    print(f"⚠ Resizing {img_path.name} from {hair_face.size} to {base_face.size}")
                    hair_face = hair_face.resize(base_face.size, Image.Resampling.LANCZOS)
                
                # Extract difference (the hair)
                hair_only = self.extract_difference(hair_face, base_face, threshold=self.threshold)
                
                hair_face.save(img_path)  # Overwrite with cleaned version
                print(f"✓ Hair {img_path.name}: Extracted component")
                count += 1
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")
        
        return count
    
    def extract_beards(self) -> int:
        """
        Extract beard layer by subtracting base skin (Skin/001) from beard variants.
        Uses Skin/image_part_001.png as the base face.
        """
        if not self.beard_dir.exists():
            print(f"❌ Beard directory not found: {self.beard_dir}")
            return 0
        
        # Load base face
        base_path = self.skin_dir / "image_part_001.png"
        if not base_path.exists():
            print(f"❌ Base face not found: {base_path}")
            return 0
        
        base_face = self.load_image(base_path)
        print(f"Using base face: {base_path.name} ({base_face.size})")
        
        count = 0
        for img_path in sorted(self.beard_dir.glob("image_part_*.png")):
            try:
                self.backup_file(img_path)
                beard_face = self.load_image(img_path)
                
                # Ensure same size
                if beard_face.size != base_face.size:
                    print(f"⚠ Resizing {img_path.name} from {beard_face.size} to {base_face.size}")
                    beard_face = beard_face.resize(base_face.size, Image.Resampling.LANCZOS)
                
                # Extract difference (the beard)
                beard_only = self.extract_difference(beard_face, base_face, threshold=self.threshold)
                
                beard_face.save(img_path)  # Overwrite with cleaned version
                print(f"✓ Beard {img_path.name}: Extracted component")
                count += 1
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")
        
        return count
    
    def run_all(self):
        """Extract all components in-place"""
        print("=" * 70)
        print("PORTRAIT COMPONENT EXTRACTOR")
        print("Extracting hair and beard components from existing portraits")
        print("=" * 70)
        
        if not self.skin_dir.exists():
            print(f"❌ Skin directory not found: {self.skin_dir}")
            return
        
        print(f"\nBase directory: {self.portraits_dir}")
        print(f"Backups saved to: {self.backup_dir}\n")
        
        print("[1/2] Extracting hair components...")
        hair_count = self.extract_hair()
        print(f"✅ Processed {hair_count} hair images\n")
        
        print("[2/2] Extracting beard components...")
        beard_count = self.extract_beards()
        print(f"✅ Processed {beard_count} beard images\n")
        
        print("=" * 70)
        print(f"✅ COMPLETE: {hair_count} hair + {beard_count} beards")
        print(f"Files modified in-place. Originals backed up to: {self.backup_dir}")
        print("=" * 70)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python extract_portrait_components.py <portraits_dir> [threshold]")
        print("Example: python extract_portrait_components.py public/Portraits 25")
        sys.exit(1)
    
    portraits_dir = Path(sys.argv[1])
    threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 25
    
    if not portraits_dir.exists():
        print(f"❌ Directory not found: {portraits_dir}")
        sys.exit(1)
    
    extractor = PortraitExtractor(portraits_dir, threshold=threshold)
    extractor.run_all()
