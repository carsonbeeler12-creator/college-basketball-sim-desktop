#!/usr/bin/env python3
"""
Smart portrait component extractor using color-based masking.

Instead of simple pixel difference, this identifies hair/beard by:
1. Detecting skin-tone colors across all skin variants
2. Creating a "skin palette" of common skin tones
3. Removing skin tones and keeping non-skin colors (hair/beard)
4. Preserving transparency
"""

from PIL import Image, ImageDraw
from pathlib import Path
from collections import Counter
import sys


class SmartPortraitExtractor:
    def __init__(self, portraits_dir: str = "public/Portraits", skin_threshold: int = 30):
        """
        Args:
            portraits_dir: Path to Portraits directory
            skin_threshold: Color distance threshold for identifying skin tones (lower = stricter)
        """
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.backup_dir = self.portraits_dir / "backup"
        self.backup_dir.mkdir(exist_ok=True)
        self.skin_threshold = skin_threshold
        self.skin_palette = []

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

    def build_skin_palette(self) -> list:
        """
        Build palette of skin tones from all Skin images.
        Sample ~5% of non-transparent pixels from each skin image.
        """
        print("Building skin tone palette...")
        all_colors = []

        for img_path in sorted(self.skin_dir.glob("image_part_*.png")):
            img = self.load_image(img_path)
            pixels = img.getdata()
            
            # Collect all non-transparent pixels (with alpha > 128)
            for i, (r, g, b, a) in enumerate(pixels):
                if a > 128:  # Non-transparent
                    all_colors.append((r, g, b))
                    # Sample every Nth pixel to speed up
                    if len(all_colors) % 50 == 0:
                        if len(all_colors) > 5000:
                            break

        if not all_colors:
            print("❌ No skin tones found in Skin images!")
            return []

        print(f"   Found {len(all_colors)} skin tone samples")
        self.skin_palette = list(set(all_colors))  # Remove duplicates
        print(f"   Palette size: {len(self.skin_palette)} unique colors\n")
        return self.skin_palette

    def is_skin_tone(self, pixel: tuple) -> bool:
        """
        Check if pixel is a skin tone using palette.
        Returns True if pixel is close to any skin palette color.
        """
        r, g, b = pixel[:3]

        for pr, pg, pb in self.skin_palette:
            # Calculate color distance (Euclidean in RGB space)
            distance = ((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2) ** 0.5
            if distance < self.skin_threshold:
                return True

        return False

    def extract_component(self, composite_img: Image.Image) -> Image.Image:
        """
        Extract non-skin component (hair/beard) from composite image.
        Returns image with only hair/beard pixels, rest transparent.
        """
        pixels = composite_img.load()
        width, height = composite_img.size

        result = Image.new('RGBA', (width, height))
        result_pixels = result.load()

        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]

                # Keep pixel if:
                # 1. It's not very transparent (a > 128)
                # 2. It's NOT a skin tone
                if a > 128 and not self.is_skin_tone((r, g, b, a)):
                    result_pixels[x, y] = (r, g, b, a)
                else:
                    # Make transparent
                    result_pixels[x, y] = (0, 0, 0, 0)

        return result

    def extract_hair(self) -> int:
        """Extract hair components by removing skin tones"""
        if not self.hair_dir.exists():
            print(f"❌ Hair directory not found: {self.hair_dir}")
            return 0

        print("Extracting hair components...")
        count = 0

        for img_path in sorted(self.hair_dir.glob("image_part_*.png")):
            try:
                self.backup_file(img_path)
                hair_img = self.load_image(img_path)

                # Extract non-skin component
                hair_only = self.extract_component(hair_img)

                # Save back
                hair_only.save(img_path)
                print(f"✓ Hair {img_path.name}: Removed skin tones")
                count += 1
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")

        return count

    def extract_beards(self) -> int:
        """Extract beard components by removing skin tones and hair"""
        if not self.beard_dir.exists():
            print(f"❌ Beard directory not found: {self.beard_dir}")
            return 0

        print("Extracting beard components...")
        count = 0

        for img_path in sorted(self.beard_dir.glob("image_part_*.png")):
            try:
                self.backup_file(img_path)
                beard_img = self.load_image(img_path)

                # Extract non-skin component (removes skin, but may include hair)
                # This will have both hair and beard; we keep both since they overlap naturally
                beard_only = self.extract_component(beard_img)

                # Save back
                beard_only.save(img_path)
                print(f"✓ Beard {img_path.name}: Removed skin tones")
                count += 1
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")

        return count

    def run_all(self):
        """Extract all components"""
        print("=" * 70)
        print("SMART PORTRAIT COMPONENT EXTRACTOR")
        print("Remove skin tones, keep hair and beard components")
        print("=" * 70 + "\n")

        if not self.skin_dir.exists():
            print(f"❌ Skin directory not found: {self.skin_dir}")
            return

        # Build palette from all skin images
        self.build_skin_palette()

        if not self.skin_palette:
            print("❌ Failed to build skin tone palette. Aborting.")
            return

        # Extract components
        print("[1/2] Extracting hair...")
        hair_count = self.extract_hair()
        print(f"✅ Processed {hair_count} hair images\n")

        print("[2/2] Extracting beards...")
        beard_count = self.extract_beards()
        print(f"✅ Processed {beard_count} beard images\n")

        print("=" * 70)
        print(f"✅ COMPLETE: {hair_count} hair + {beard_count} beards")
        print(f"Skin threshold: {self.skin_threshold}")
        print(f"Backups in: {self.backup_dir}")
        print("=" * 70)


def main():
    """
    Usage:
        python extract_components_smart.py <portraits_dir> [skin_threshold]
    
    Example:
        python extract_components_smart.py public/Portraits 30
    """
    if len(sys.argv) < 2:
        print("Usage: python extract_components_smart.py <portraits_dir> [skin_threshold]")
        print("Example: python extract_components_smart.py public/Portraits 30")
        sys.exit(1)

    portraits_dir = Path(sys.argv[1])
    skin_threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    if not portraits_dir.exists():
        print(f"❌ Directory not found: {portraits_dir}")
        sys.exit(1)

    extractor = SmartPortraitExtractor(portraits_dir, skin_threshold=skin_threshold)
    extractor.run_all()


if __name__ == "__main__":
    main()
