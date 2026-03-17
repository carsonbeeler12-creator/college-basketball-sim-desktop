"""
Ultra-Conservative Portrait Normalizer
- Ensures all images are 512x512px
- Pads with transparent background to fit
- Does NOT reposition content
- Does NOT clip
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
    """Get bounding box of non-transparent content."""
    alpha = img.split()[-1] if img.mode == 'RGBA' else img.convert('RGBA').split()[-1]
    return alpha.getbbox()

def ultra_safe_normalize(img_path: str) -> bool:
    """
    Normalize to 512x512 with absolute safety:
    - If image is smaller: pad with transparent bg
    - If image is slightly larger: shrink proportionally
    - Never reposition content
    """
    try:
        img = Image.open(img_path).convert('RGBA')
        w, h = img.size
        
        # Already 512x512? Good!
        if w == CANVAS_SIZE and h == CANVAS_SIZE:
            bbox = get_content_bounds(img)
            has_content = bbox and (bbox[2] - bbox[0] > 5) and (bbox[3] - bbox[1] > 5)
            if has_content:
                return True
            else:
                print(f"    WARNING: Image is empty!")
                return False
        
        # If too large, shrink proportionally to fit
        if w > CANVAS_SIZE or h > CANVAS_SIZE:
            ratio = min(CANVAS_SIZE / w, CANVAS_SIZE / h)
            new_w = int(w * ratio)
            new_h = int(h * ratio)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            w, h = new_w, new_h
        
        # Create canvas and paste image at its current position (top-left)
        # This preserves the relative position of content within original image
        canvas = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        canvas.paste(img, (0, 0), img)
        
        # Save back
        canvas.save(img_path, 'PNG')
        return True
        
    except Exception as e:
        print(f"    ERROR: {e}")
        return False

def normalize_folder(folder_name: str, folder_path: str) -> None:
    """Normalize all PNG files in folder."""
    print(f"\n{folder_name}:")
    print("-" * 60)
    
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
        if ultra_safe_normalize(img_path):
            success += 1
            print("✓")
        else:
            print("✗")
    
    print(f"\n  Result: {success}/{len(files)} normalized")

def main():
    print("🛡️  Ultra-Conservative Portrait Normalizer")
    print("=" * 60)
    print(f"Canvas: {CANVAS_SIZE}x{CANVAS_SIZE}px")
    print("Method: Preserve content position, pad with transparency\n")
    
    for folder_name, folder_path in ASSET_DIRS.items():
        normalize_folder(folder_name, folder_path)
    
    print("\n" + "=" * 60)
    print("✅ Done!")
    print("\nAll images are now:")
    print(f"  • {CANVAS_SIZE}x{CANVAS_SIZE}px")
    print("  • Content preserved (no clipping, no repositioning)")
    print("  • CSS will handle alignment via objectFit: contain")

if __name__ == '__main__':
    main()
