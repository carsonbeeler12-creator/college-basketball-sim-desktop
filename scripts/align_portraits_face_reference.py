#!/usr/bin/env python3
"""
Align portraits using face sprites as reference.
All sprites scaled and positioned so facial features overlap perfectly.
"""

from PIL import Image
from pathlib import Path
import sys


class FaceBasedAligner:
    def __init__(self, portraits_dir: str = "public/Portraits", target_size: int = 512):
        self.portraits_dir = Path(portraits_dir)
        self.skin_dir = self.portraits_dir / "Skin"
        self.hair_dir = self.portraits_dir / "Hair"
        self.beard_dir = self.portraits_dir / "Beard"
        self.target_size = target_size
        
        # Reference measurements from face sprites
        self.reference_face_height = None
        self.reference_face_center_y = None
        
    def get_content_bbox(self, img: Image.Image) -> tuple:
        """Get bounding box of visible content"""
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        pixels = img.load()
        width, height = img.size
        
        min_x, min_y = width, height
        max_x, max_y = 0, 0
        found = False
        
        for y in range(height):
            for x in range(width):
                if pixels[x, y][3] > 50:  # Alpha > 50
                    found = True
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
        
        return (min_x, min_y, max_x + 1, max_y + 1) if found else None
    
    def analyze_faces(self):
        """Analyze face sprites to determine reference positioning"""
        print("Analyzing face sprites for reference...")
        
        face_heights = []
        face_center_ys = []
        
        for img_path in sorted(self.skin_dir.glob("image_part_*.png")):
            img = Image.open(img_path)
            bbox = self.get_content_bbox(img)
            
            if bbox:
                left, top, right, bottom = bbox
                height = bottom - top
                center_y = (top + bottom) / 2
                
                face_heights.append(height)
                face_center_ys.append(center_y)
        
        # Use average
        self.reference_face_height = sum(face_heights) / len(face_heights)
        self.reference_face_center_y = sum(face_center_ys) / len(face_center_ys)
        
        print(f"  Reference face height: {self.reference_face_height:.1f}px")
        print(f"  Reference face center Y: {self.reference_face_center_y:.1f}px")
    
    def align_sprite(self, img: Image.Image, sprite_type: str) -> Image.Image:
        """
        Align sprite based on face reference.
        - Faces: Keep at reference position
        - Hair: Position so it sits on top of face
        - Beards: Position so they sit at bottom of face
        """
        bbox = self.get_content_bbox(img)
        if not bbox:
            return Image.new('RGBA', (self.target_size, self.target_size), (0, 0, 0, 0))
        
        # Crop to content
        left, top, right, bottom = bbox
        content = img.crop(bbox)
        content_width = right - left
        content_height = bottom - top
        
        # Target face size in final canvas (60% of canvas)
        target_face_size = int(self.target_size * 0.6)
        
        # Scale based on face reference height
        scale = target_face_size / self.reference_face_height
        new_width = int(content_width * scale)
        new_height = int(content_height * scale)
        
        resized = content.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Create canvas
        canvas = Image.new('RGBA', (self.target_size, self.target_size), (0, 0, 0, 0))
        
        # Position: horizontally centered always
        x_pos = (self.target_size - new_width) // 2
        
        # Vertical positioning depends on sprite type
        if sprite_type == "face":
            # Face: center it in canvas
            y_pos = (self.target_size - new_height) // 2
        elif sprite_type == "hair":
            # Hair: position so bottom aligns with top of face area
            # Hair should extend above face
            face_top_y = (self.target_size - target_face_size) // 2
            # Position hair so it slightly overlaps face top
            y_pos = face_top_y - new_height + int(target_face_size * 0.35)
        else:  # beard
            # Beard: position at bottom of face
            face_bottom_y = (self.target_size + target_face_size) // 2
            # Position beard so top overlaps with lower face
            y_pos = face_bottom_y - int(target_face_size * 0.4)
        
        canvas.paste(resized, (x_pos, y_pos), resized)
        
        return canvas
    
    def process_directory(self, directory: Path, name: str, sprite_type: str) -> int:
        """Process all images in directory"""
        if not directory.exists():
            print(f"❌ {name} directory not found")
            return 0
        
        print(f"\nProcessing {name} ({sprite_type})...")
        files = sorted(directory.glob("image_part_*.png"))
        count = 0
        
        for img_path in files:
            try:
                img = Image.open(img_path)
                aligned = self.align_sprite(img, sprite_type)
                aligned.save(img_path)
                
                print(f"✓ {img_path.name}")
                count += 1
                
            except Exception as e:
                print(f"❌ {img_path.name}: {e}")
        
        return count
    
    def run_all(self):
        """Process all directories"""
        print("=" * 70)
        print("FACE-BASED PORTRAIT ALIGNER")
        print(f"Target: {self.target_size}×{self.target_size}px")
        print("=" * 70 + "\n")
        
        # First analyze faces to get reference
        self.analyze_faces()
        
        # Process all sprites with face as reference
        skin_count = self.process_directory(self.skin_dir, "Skin (Faces)", "face")
        hair_count = self.process_directory(self.hair_dir, "Hair", "hair")
        beard_count = self.process_directory(self.beard_dir, "Beard", "beard")
        
        print("\n" + "=" * 70)
        print(f"✅ COMPLETE: {skin_count} faces + {hair_count} hair + {beard_count} beards")
        print("All sprites aligned to face reference position")
        print("=" * 70)


def main():
    portraits_dir = sys.argv[1] if len(sys.argv) > 1 else "public/Portraits"
    target_size = int(sys.argv[2]) if len(sys.argv) > 2 else 512
    
    aligner = FaceBasedAligner(portraits_dir, target_size)
    aligner.run_all()


if __name__ == "__main__":
    main()
