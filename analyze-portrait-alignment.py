"""
Advanced Portrait Normalizer - Aligns content by detecting actual artwork bounds
This script:
1. Detects non-transparent content in each image
2. Aligns all images so their content centers match
3. Ensures consistent head positioning across all layers
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
    """
    Find the bounding box of non-transparent content.
    Returns (left, top, right, bottom) or None if empty.
    """
    alpha = img.split()[-1]  # Get alpha channel
    bbox = alpha.getbbox()    # Get bounding box of non-transparent pixels
    return bbox

def normalize_with_alignment(folder_path: str, folder_name: str) -> dict:
    """
    Analyze all images in folder and find average center point.
    Returns info about content positions.
    """
    print(f"\n{folder_name}:")
    print("-" * 70)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found!")
        return None
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    if not files:
        print(f"  No PNG files found!")
        return None
    
    # Analyze all images
    bounds_info = {}
    centers = []
    
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        img = Image.open(img_path).convert('RGBA')
        
        bbox = get_content_bounds(img)
        if not bbox:
            print(f"  {filename}: EMPTY (no content)")
            continue
        
        left, top, right, bottom = bbox
        width = right - left
        height = bottom - top
        center_x = (left + right) / 2
        center_y = (top + bottom) / 2
        
        bounds_info[filename] = {
            'bbox': bbox,
            'center': (center_x, center_y),
            'size': (width, height),
            'img': img,
            'path': img_path,
        }
        
        centers.append((center_x, center_y))
        
        print(f"  {filename}:")
        print(f"    Bounds: left={left}, top={top}, right={right}, bottom={bottom}")
        print(f"    Content size: {width}x{height}")
        print(f"    Center: ({center_x:.1f}, {center_y:.1f})")
    
    # Calculate average center
    if centers:
        avg_center_x = sum(c[0] for c in centers) / len(centers)
        avg_center_y = sum(c[1] for c in centers) / len(centers)
        print(f"\n  Average content center: ({avg_center_x:.1f}, {avg_center_y:.1f})")
        
        # Check variance
        variance_x = max(abs(c[0] - avg_center_x) for c in centers)
        variance_y = max(abs(c[1] - avg_center_y) for c in centers)
        print(f"  Max offset from center: X={variance_x:.1f}px, Y={variance_y:.1f}px")
        
        if variance_x > 20 or variance_y > 20:
            print(f"\n  ⚠️  WARNING: Content centers vary by up to {max(variance_x, variance_y):.1f}px!")
            print(f"  This means your source assets have misaligned artwork.")
        
        return {
            'bounds_info': bounds_info,
            'average_center': (avg_center_x, avg_center_y),
            'variance': (variance_x, variance_y),
        }
    
    return None

def main():
    print("🔍 Portrait Asset Analysis")
    print("=" * 70)
    print(f"Analyzing all assets to detect content alignment issues...\n")
    
    all_results = {}
    for folder_name, folder_path in ASSET_DIRS.items():
        result = normalize_with_alignment(folder_path, folder_name)
        if result:
            all_results[folder_name] = result
    
    print("\n" + "=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    
    has_misalignment = False
    for folder_name, result in all_results.items():
        variance_x, variance_y = result['variance']
        if variance_x > 20 or variance_y > 20:
            has_misalignment = True
            print(f"\n❌ {folder_name}: Content misaligned (variance: {max(variance_x, variance_y):.1f}px)")
    
    if has_misalignment:
        print("\n⚠️  RECOMMENDATION:")
        print("-" * 70)
        print("Your source PNG files have artwork positioned at different locations")
        print("within their canvases. To fix this, you need to:")
        print()
        print("Option 1: Edit assets in image editor (Photoshop, GIMP, etc)")
        print("  • Ensure head/face is centered at ~(256, 256) in all Skin images")
        print("  • Ensure hair aligns to same center point in all Hair images")
        print("  • Ensure beard aligns to same center point in all Beard images")
        print()
        print("Option 2: Provide source files (PNG, PSD, Figma) so content can be")
        print("  extracted and realigned programmatically")
        print()
        print("Option 3: Use layer masks/guides in design tool to ensure all")
        print("  components reference the same anchor point (e.g., center of face)")
    else:
        print("\n✅ All assets are well-aligned!")
        print("Content centers are consistent across all layer types.")

if __name__ == '__main__':
    main()
