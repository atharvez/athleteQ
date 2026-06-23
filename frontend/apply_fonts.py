import os
import re

font_map = {
    '400': 'regular',
    '500': 'medium',
    '600': 'semibold',
    '700': 'bold',
    '800': 'extrabold',
    '900': 'extrabold'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # We only want to add fontFamily if it's not already there. 
    # But since we're injecting it right before fontWeight, we just do a replace.
    # Actually, a simpler way is to replace fontWeight: '700' with fontFamily: FONTS.bold, fontWeight: '700'
    
    def replacer(m):
        weight = m.group(2)
        if weight in ('bold', 'semibold'):
            font_key = weight
        else:
            font_key = font_map.get(weight, 'bold')
        
        return f"fontFamily: FONTS.{font_key}, {m.group(0)}"

    # Find fontWeight declarations
    # Match: fontWeight: '700' or fontWeight: "bold"
    content = re.sub(r'(fontWeight:\s*[\'\"](\d+|bold|semibold)[\'\"])', replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')

for root, _, files in os.walk('d:/goat/frontend/app'):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
