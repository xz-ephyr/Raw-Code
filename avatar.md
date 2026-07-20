**Yes**, here's the **exact technique** to recreate **this specific boy avatar** using **TypeScript + Canvas**.

### 1. Full TypeScript Code (Copy-Paste Ready)

```typescript
const canvas = document.createElement('canvas');
canvas.width = 32 * 16;   // 32 pixels wide × 16px scale
canvas.height = 48 * 16;  // 48 pixels tall
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;

// Scale factor
const S = 16;

// Black pixel helper
function p(x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(x * S, y * S, w * S, h * S);
}

// White background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// ==================== DRAW THE BOY ====================

// Hair (top outline)
p(8, 6, 15, 3);      // main hair top
p(9, 5, 13, 1);      // higher hair

// Head / Face
p(10, 9, 11, 11);    // face area

// Hair sides
p(8, 9, 2, 6);
p(21, 9, 2, 6);

// Eyes
p(13, 12, 1, 1);
p(17, 12, 1, 1);

// Nose / Mouth area
p(15, 15, 1, 1);     // nose
p(13, 17, 5, 1);     // mouth smile

// Neck
p(13, 20, 5, 2);

// T-shirt
p(10, 22, 11, 12);   // main body

// Shirt sleeves
p(8, 23, 2, 7);      // left sleeve
p(21, 23, 2, 7);     // right sleeve

// Shorts
p(11, 34, 9, 8);

// Legs
p(12, 42, 3, 6);     // left leg
p(17, 42, 3, 6);     // right leg

// Shoes
p(11, 47, 4, 2);
p(17, 47, 4, 2);

// Arms (lower part)
p(8, 29, 2, 4);      // left arm lower
p(21, 29, 2, 4);     // right arm lower
```

### Exact Technique Explained

1. **Canvas Setup**
   - Create a canvas and multiply pixel size by a **scale** (`S = 16`) so the art looks big and crisp.

2. **Pixel Function `p(x, y, w=1, h=1)`**
   - This is the core of pixel art in code.
   - `x, y` = position in the 32×48 grid.
   - `w, h` = width and height in grid units (makes drawing faster).

3. **Drawing Order**
   - Always draw **background first**, then **hair → head → body → clothes → legs**.
   - Later drawings overwrite earlier ones (important for overlapping parts).

4. **Styling Tips for Exact Look**
   - Use only pure black `#000000` and white `#ffffff`.
   - Keep `imageSmoothingEnabled = false` — this prevents blurring.
   - Work on a small grid (32×48 is perfect for this style).
   - You can export the result as PNG: `canvas.toDataURL('image/png')`.