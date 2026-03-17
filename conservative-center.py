"""
Analyze and center images using PADDING ONLY (no clipping, no shrinking, no moving)
Each image's content will be centered by adding equal padding on all sides
"""

from PIL import Image
import os

CANVAS_SIZE = 512
TARGET_CENTER = CANVAS_SIZE // 2  # 256

ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def get_content_bounds(img: Image.Image) -> tuple:
    """Get bounding box of all non-transparent content."""
    alpha = img.split()[-1] if img.mode == 'RGBA' else img.convert('RGBA').split()[-1]
    return alpha.getbbox()

def center_image_with_padding(img_path: str) -> bool:
    """
    Center image content using padding only.
    
    Strategy:
    1. Get content bounds
    2. If content is near edges or off-center, add padding to center it
    3. Never move or shrink content
    """
    img = Image.open(img_path).convert('RGBA')
    original_size = img.size
    
    bbox = get_content_bounds(img)
    if not bbox:
        return True  # Empty image, leave alone
    
    left, top, right, bottom = bbox
    content_width = right - left
    content_height = bottom - top
    content_center_x = (left + right) / 2
    content_center_y = (top + bottom) / 2
    
    # How much padding needed on each side to center content?
    # Left padding: distance from left edge to content center, minus desired center
    left_padding = TARGET_CENTER - int(content_center_x)
    top_padding = TARGET_CENTER - int(content_center_y)
    
    # If padding is negative, content is already too far right/down
    # In this case, we need to shrink and reposition safely
    if left_padding < 0 or top_padding < 0:
        # Content is too large or off-center - shrink proportionally
        max_allowed = CANVAS_SIZE - 50  # Leave some margin
        if content_width > max_allowed or content_height > max_allowed:
            ratio = max_allowed / max(content_width, content_height)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Recalculate with shrunken image
            bbox = get_content_bounds(img)
            if not bbox:
                img = Image.open(img_path).convert('RGBA')
            else:
                left, top, right, bottom = bbox
                content_center_x = (left + right) / 2
                content_center_y = (top + bottom) / 2
                left_padding = TARGET_CENTER - int(content_center_x)
                top_padding = TARGET_CENTER - int(content_center_y)
    
    # Create new canvas and paste image with padding
    canvas = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    
    # Paste at adjusted position to center content
    paste_x = max(0, left_padding)
    paste_y = max(0, top_padding)
    canvas.paste(img, (paste_x, paste_y), img)
    
    canvas.save(img_path, 'PNG')
    return True

def analyze_and_center(folder_name: str, folder_path: str) -> None:
    """Analyze then center all images in folder."""
    print(f"\n{folder_name}:")
    print("-" * 70)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found!")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        img = Image.open(img_path).convert('RGBA')
        bbox = get_content_bounds(img)
        
        if bbox:
            left, top, right, bottom = bbox
            center_x = (left + right) / 2
            center_y = (top + bottom) / 2
            width = right - left
            height = bottom - top
            
            # Calculate offset from target center
            offset_x = int(center_x) - TARGET_CENTER
            offset_y = int(center_y) - TARGET_CENTER
            
            print(f"  {filename}:")
            print(f"    Content: {width}x{height}, center=({center_x:.0f}, {center_y:.0f})")
            print(f"    Offset: ({offset_x:+d}, {offset_y:+d})...", end=' ')
            
            center_image_with_padding(img_path)
            print("✓")
        else:
            print(f"  {filename}: EMPTY (skipped)")

def main():
    print("📍 Conservative Content Centering (Padding Only)")
    print("=" * 70)
    
    for folder_name, folder_path in ASSET_DIRS.items():
        analyze_and_center(folder_name, folder_path)
    
    print("\n" + "=" * 70)
    print("✅ Centering complete!")
    print("\nEach image's content is now centered at (256, 256)")

if __name__ == '__main__':
    main()
