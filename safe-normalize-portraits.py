"""
Safe Portrait Normalizer - Padding-based centering (no content clipping)
This script ensures all images are 512x512 without moving content outside bounds.
"""

from PIL import Image
import os

CANVAS_SIZE = 512
ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def get_content_bounds(img: Image.Image) -> tuple:
    """Get bounding box of non-transparent content (or None if empty)."""
    alpha = img.split()[-1]
    return alpha.getbbox()

def safe_normalize_image(img_path: str, canvas_size: int = CANVAS_SIZE) -> bool:
    """
    Safely normalize image to canvas_size x canvas_size.
    - If smaller: pad with transparent background
    - If larger: shrink proportionally to fit, then pad
    Never clips content.
    """
    try:
        img = Image.open(img_path).convert('RGBA')
        current_w, current_h = img.size
        
        # Already correct size? Just verify content is visible
        if current_w == canvas_size and current_h == canvas_size:
            bbox = get_content_bounds(img)
            if bbox and (bbox[2] - bbox[0]) > 10 and (bbox[3] - bbox[1]) > 10:
                return True  # Valid already
        
        # Shrink if too large (maintain aspect ratio)
        if current_w > canvas_size or current_h > canvas_size:
            max_dim = max(current_w, current_h)
            ratio = canvas_size / max_dim
            new_w = int(current_w * ratio)
            new_h = int(current_h * ratio)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            new_w, new_h = current_w, current_h
        
        # Create canvas and pad image to center
        canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        offset_x = (canvas_size - new_w) // 2
        offset_y = (canvas_size - new_h) // 2
        canvas.paste(img, (offset_x, offset_y), img)
        
        # Save
        canvas.save(img_path, 'PNG')
        return True
        
    except Exception as e:
        print(f"    ERROR: {e}")
        return False

def normalize_folder(folder_name: str, folder_path: str) -> None:
    """Normalize all PNG files in folder."""
    print(f"\n{folder_name}:")
    print("-" * 70)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found!")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    if not files:
        print(f"  No PNG files!")
        return
    
    success = 0
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        print(f"  {filename}...", end=' ')
        if safe_normalize_image(img_path):
            success += 1
            print("✓")
        else:
            print("✗")
    
    print(f"\n  Result: {success}/{len(files)} images normalized")

def main():
    print("🔧 Safe Portrait Normalizer (Padding-based)")
    print("=" * 70)
    print(f"Canvas: {CANVAS_SIZE}x{CANVAS_SIZE}px")
    print("Method: Shrink if needed, pad to center (NO CLIPPING)\n")
    
    for folder_name, folder_path in ASSET_DIRS.items():
        normalize_folder(folder_name, folder_path)
    
    print("\n" + "=" * 70)
    print("✅ Normalization complete!")
    print("\nAll images are now:")
    print(f"  • {CANVAS_SIZE}x{CANVAS_SIZE}px")
    print("  • Content preserved (no clipping)")
    print("  • Centered by padding")

if __name__ == '__main__':
    main()
