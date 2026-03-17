#!/usr/bin/env python3
"""
Spritesheet splitter for portrait components.
Detects grid layout and crops individual sprites from spritesheets.
"""

from PIL import Image
from pathlib import Path
import sys


class SpritesheetSplitter:
    def __init__(self, spritesheet_dir: str = "assets/spritesheets", output_dir: str = "public/Portraits"):
        """
        Args:
            spritesheet_dir: Directory containing spritesheets (faces.png, hairs.png, beards.png)
            output_dir: Directory to write {Skin,Hair,Beard}/ folders to
        """
        self.spritesheet_dir = Path(spritesheet_dir)
        self.output_dir = Path(output_dir)
        self.skin_dir = self.output_dir / "Skin"
        self.hair_dir = self.output_dir / "Hair"
        self.beard_dir = self.output_dir / "Beard"
        
        # Create output directories
        self.skin_dir.mkdir(parents=True, exist_ok=True)
        self.hair_dir.mkdir(parents=True, exist_ok=True)
        self.beard_dir.mkdir(parents=True, exist_ok=True)

    def detect_grid(self, img: Image.Image, expected_columns: int) -> tuple:
        """
        Detect sprite grid automatically by looking for empty space/margin.
        Returns (cell_width, cell_height, rows, cols)
        """
        width, height = img.size
        
        # Estimate cell dimensions based on expected columns
        cell_width = width // expected_columns
        cell_height = height // (height // cell_width)  # Assume roughly square cells
        
        # Refine by detecting actual row count
        rows = height // cell_height
        
        return cell_width, cell_height, rows, expected_columns

    def split_spritesheet(self, spritesheet_path: Path, output_folder: Path, 
                         columns: int, name_prefix: str = "image_part", target_size: int = 512) -> int:
        """
        Split a spritesheet into individual sprites.
        All sprites resized to target_size canvas while preserving exact positioning.
        
        Args:
            spritesheet_path: Path to spritesheet PNG
            output_folder: Folder to save individual sprites
            columns: Number of columns in the grid
            name_prefix: Prefix for output files
            target_size: Target canvas size (all sprites will be this size)
        
        Returns: Number of sprites extracted
        """
        if not spritesheet_path.exists():
            print(f"❌ Spritesheet not found: {spritesheet_path}")
            return 0

        print(f"Loading: {spritesheet_path.name}")
        img = Image.open(spritesheet_path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        cell_width, cell_height, rows, cols = self.detect_grid(img, columns)
        
        print(f"   Grid detected: {rows}×{cols} = {rows*cols} sprites")
        print(f"   Cell size: {cell_width}×{cell_height}px → {target_size}×{target_size}px\n")

        count = 0
        for row in range(rows):
            for col in range(cols):
                # Calculate crop box
                left = col * cell_width
                top = row * cell_height
                right = left + cell_width
                bottom = top + cell_height
                
                # Crop sprite
                sprite = img.crop((left, top, right, bottom))
                
                # Resize to target size (preserves relative positioning)
                sprite_resized = sprite.resize((target_size, target_size), Image.Resampling.LANCZOS)
                
                # Save with sequential numbering
                num = row * cols + col + 1
                sprite_path = output_folder / f"{name_prefix}_{num:03d}.png"
                sprite_resized.save(sprite_path)
                
                print(f"✓ {sprite_path.name}")
                count += 1

        return count

    def split_all(self):
        """Split all spritesheets"""
        print("=" * 70)
        print("SPRITESHEET SPLITTER")
        print("=" * 70 + "\n")

        if not self.spritesheet_dir.exists():
            print(f"❌ Spritesheet directory not found: {self.spritesheet_dir}")
            print(f"   Create it and place spritesheets:")
            print(f"   - {self.spritesheet_dir}/faces.png (3×2 grid)")
            print(f"   - {self.spritesheet_dir}/hairs.png (4×4 or 5×4 grid)")
            print(f"   - {self.spritesheet_dir}/beards.png (5×5 grid)")
            return

        print(f"Splitting spritesheets from: {self.spritesheet_dir}\n")

        # Split faces (3 columns x 2 rows = 6 sprites)
        faces_path = self.spritesheet_dir / "Headshots.png"
        if faces_path.exists():
            print("[1/3] Splitting faces (Headshots.png)...")
            face_count = self.split_spritesheet(faces_path, self.skin_dir, columns=3, 
                                               name_prefix="image_part", target_size=512)
            print(f"✅ Extracted {face_count} face sprites\n")
        else:
            print("⊘ Headshots.png not found, skipping...\n")
            face_count = 0

        # Split hair (4-5 columns x 4 rows = 16 sprites)
        hairs_path = self.spritesheet_dir / "Hair.png"
        if hairs_path.exists():
            print("[2/3] Splitting hairs (Hair.png)...")
            # Try to detect: if more square, use 4 cols; if wider, use 5 cols
            test_img = Image.open(hairs_path)
            cols = 5 if test_img.width > test_img.height else 4
            hair_count = self.split_spritesheet(hairs_path, self.hair_dir, columns=cols, 
                                               name_prefix="image_part", target_size=512)
            print(f"✅ Extracted {hair_count} hair sprites\n")
        else:
            print("⊘ Hair.png not found, skipping...\n")
            hair_count = 0

        # Split beards (5 columns x 5 rows = 25 sprites)
        beards_path = self.spritesheet_dir / "Beard.png"
        if beards_path.exists():
            print("[3/3] Splitting beards (Beard.png)...")
            beard_count = self.split_spritesheet(beards_path, self.beard_dir, columns=5, 
                                                name_prefix="image_part", target_size=512)
            print(f"✅ Extracted {beard_count} beard sprites\n")
        else:
            print("⊘ Beard.png not found, skipping...\n")
            beard_count = 0

        print("=" * 70)
        print(f"✅ COMPLETE: {face_count} faces + {hair_count} hairs + {beard_count} beards")
        print(f"Output: {self.output_dir}")
        print("=" * 70)


def main():
    """
    Usage:
        python split_spritesheets.py [spritesheet_dir] [output_dir]
    
    Example:
        python split_spritesheets.py assets/spritesheets public/Portraits
    """
    spritesheet_dir = sys.argv[1] if len(sys.argv) > 1 else "assets/spritesheets"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "public/Portraits"

    splitter = SpritesheetSplitter(spritesheet_dir, output_dir)
    splitter.split_all()


if __name__ == "__main__":
    main()
