#!/usr/bin/env bash
set -euo pipefail

# process.sh — FFmpeg pipeline orchestrator
# Translates manifest.json into ordered FFmpeg commands
# Usage: bash process.sh path/to/manifest.json

MANIFEST_FILE="${1:-manifest.json}"

if [ ! -f "$MANIFEST_FILE" ]; then
  echo "Error: manifest file not found: $MANIFEST_FILE"
  exit 1
fi

MANIFEST=$(cat "$MANIFEST_FILE")

echo "=== Video Pipeline ==="
echo "Manifest: $MANIFEST_FILE"

# Extract output config
OUTPUT_FILENAME=$(echo "$MANIFEST" | python3 -c "
import sys, json
m = json.load(sys.stdin)
print(m.get('output', {}).get('filename', 'output.mp4'))
")

echo "Output: $OUTPUT_FILENAME"
echo ""

# Parse operations and build FFmpeg commands
# Uses python3 to safely generate ffmpeg command lines from the manifest
python3 <<'PYEOF'
import json, subprocess, sys, os

with open(os.environ.get('MANIFEST_FILE', 'manifest.json')) as f:
    manifest = json.load(f)

operations = manifest.get('operations', [])
output = manifest.get('output', {})
final_output = output.get('filename', 'output.mp4')

intermediate = []
segment_index = 0

def escape_path(p):
    return p.replace(':', '\\:')

def run_ffmpeg(args, description):
    cmd = ['ffmpeg', '-y'] + args
    print(f"\n--- {description} ---")
    print(f"Running: {' '.join(cmd[:8])}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FFmpeg error: {result.stderr[:500]}")
        sys.exit(1)
    print("Done.")

for op in operations:
    t = op['type']

    if t == 'trim':
        inp = escape_path(op['source'])
        args = ['-ss', op['start']]
        if 'end' in op:
            args += ['-to', op['end']]
        if 'duration' in op:
            args += ['-t', op['duration']]
        args += ['-i', inp, '-c', 'copy']
        out = f'trimmed_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, f'Trim {op["source"]}')
        intermediate.append(out)

    elif t == 'scale':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        w = op['width']
        h = op.get('height', -2)
        args = ['-i', inp, '-vf', f'scale={w}:{h}']
        out = f'filtered_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Scale')
        intermediate.append(out)

    elif t == 'crop':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        args = ['-i', inp, '-vf', f'crop={op["width"]}:{op["height"]}:{op["x"]}:{op["y"]}']
        out = f'filtered_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Crop')
        intermediate.append(out)

    elif t == 'speed':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        factor = op['factor']
        args = ['-i', inp, '-vf', f'setpts={1/factor}*PTS', '-af', f'atempo={factor}']
        out = f'speed_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, f'Speed {factor}x')
        intermediate.append(out)

    elif t == 'overlay':
        main = intermediate[-1] if intermediate else 'source.mp4'
        overlay = escape_path(op['source'])
        args = ['-i', main, '-i', overlay]
        if 'scale' in op:
            args += ['-filter_complex', f'[1:v]scale={op["scale"]}:-2[ovr];[0:v][ovr]overlay={op["x"]}:{op["y"]}']
        else:
            args += ['-filter_complex', f'[0:v][1:v]overlay={op["x"]}:{op["y"]}']
        out = f'overlay_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Overlay')
        intermediate.append(out)

    elif t == 'drawtext':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        parts = [f"text='{op['text']}'"]
        if 'font' in op:
            parts.append(f"font={op['font']}")
        if 'fontSize' in op:
            parts.append(f"fontsize={op['fontSize']}")
        if 'color' in op:
            parts.append(f"fontcolor={op['color']}")
        if 'x' in op:
            parts.append(f"x={op['x']}")
        if 'y' in op:
            parts.append(f"y={op['y']}")
        args = ['-i', inp, '-vf', f"drawtext={':'.join(parts)}"]
        out = f'filtered_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Draw text')
        intermediate.append(out)

    elif t == 'color':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        eq_parts = []
        for k in ['brightness', 'contrast', 'saturation', 'gamma']:
            if k in op:
                eq_parts.append(f'{k}={op[k]}')
        args = ['-i', inp]
        if eq_parts:
            args += ['-vf', f"eq={':'.join(eq_parts)}"]
        out = f'filtered_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Color correction')
        intermediate.append(out)

    elif t == 'concat':
        sources = op['sources']
        args = []
        for src in sources:
            args += ['-i', escape_path(src)]
        inputs = ''.join(f'[{i}:v][{i}:a]' for i in range(len(sources)))
        args += ['-filter_complex', f'{inputs}concat=n={len(sources)}:v=1:a=1[outv][outa]']
        args += ['-map', '[outv]', '-map', '[outa]']
        if not op.get('reencode'):
            args += ['-c', 'copy']
        out = f'concat_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Concatenate')
        intermediate.append(out)

    elif t == 'audiomix':
        main = intermediate[-1] if intermediate else 'source.mp4'
        audio_src = escape_path(op['source'])
        vol = op.get('volume', 1)
        args = ['-i', main, '-i', audio_src,
                '-filter_complex', f'[1:a]volume={vol}[a1];[0:a][a1]amix=inputs=2:duration=first[outa]',
                '-map', '0:v', '-map', '[outa]']
        out = f'mix_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Mix audio')
        intermediate.append(out)

    elif t == 'normalizeaudio':
        inp = intermediate[-1] if intermediate else 'source.mp4'
        lufs = op.get('targetLUFS', -14)
        args = ['-i', inp, '-af', f'loudnorm=I={lufs}:LRA=11:TP=-1.5', '-c:v', 'copy']
        out = f'normalized_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Normalize audio')
        intermediate.append(out)

    elif t == 'subtitles':
        inp = intermediate[-1] if intermediate else op.get('source', 'source.mp4')
        sub_file = escape_path(op['file'])
        args = ['-i', inp, '-vf', f'subtitles={sub_file}']
        out = f'subs_{segment_index}.mp4'
        segment_index += 1
        args.append(out)
        run_ffmpeg(args, 'Burn subtitles')
        intermediate.append(out)

    elif t == 'gif':
        inp = escape_path(op['source'])
        pal_file = f'palette_{segment_index}.png'
        w = op.get('width', 640)
        fps = op.get('fps', 12)

        palette_args = ['-i', inp]
        if 'maxDuration' in op:
            palette_args += ['-t', str(op['maxDuration'])]
        palette_args += ['-vf', f'fps={fps},scale={w}:-1:flags=lanczos,palettegen=stats_mode=diff', pal_file]
        run_ffmpeg(palette_args, 'Generate palette')

        gif_args = ['-i', inp, '-i', pal_file]
        if 'maxDuration' in op:
            gif_args += ['-t', str(op['maxDuration'])]
        gif_args += ['-lavfi', f'fps={fps},scale={w}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer']
        out = f'output_{segment_index}.gif'
        segment_index += 1
        gif_args.append(out)
        run_ffmpeg(gif_args, 'Render GIF')
        intermediate.append(out)

    elif t == 'thumbnail':
        inp = escape_path(op['source'])
        w = op.get('width', 320)
        at = op.get('at', '00:00:05')
        out = op.get('outputName', f'thumb_{segment_index}.jpg')
        segment_index += 1
        args = ['-ss', at, '-i', inp, '-vframes', '1', '-vf', f'scale={w}:-2', out]
        run_ffmpeg(args, f'Thumbnail at {at}')

    elif t == 'preview':
        inp = escape_path(op['source'])
        duration = op.get('duration', 15)
        w = op.get('width', 640)
        start = op.get('start', '00:00:00')
        crf = op.get('crf', 35)
        out = f'preview_{segment_index}.mp4'
        segment_index += 1
        args = ['-ss', start, '-i', inp, '-t', str(duration),
                '-vf', f'scale={w}:-2', '-c:v', 'libx264', '-crf', str(crf),
                '-preset', 'ultrafast', '-an', out]
        run_ffmpeg(args, f'Preview {duration}s at {w}w')

# Cleanup: delete intermediate files if configured
cleanup = manifest.get('cleanup', {})
if cleanup.get('deleteIntermediateFiles'):
    import os, glob as g
    for f in g.glob('trimmed_*.mp4') + g.glob('filtered_*.mp4') + g.glob('speed_*.mp4') + \
               g.glob('overlay_*.mp4') + g.glob('subs_*.mp4') + g.glob('concat_*.mp4') + \
               g.glob('mix_*.mp4') + g.glob('normalized_*.mp4') + g.glob('palette_*.png'):
        try:
            os.remove(f)
            print(f"Cleaned up: {f}")
        except OSError:
            pass

# Copy final intermediate to output
if intermediate:
    last = intermediate[-1]
    if last != final_output:
        subprocess.run(['ffmpeg', '-y', '-i', last, '-c', 'copy', final_output],
                      capture_output=True)
        print(f"\nFinal output: {final_output}")
else:
    print("\nNo operations to process. Copying source to output.")
    subprocess.run(['ffmpeg', '-y', '-i', 'source.mp4', '-c', 'copy', final_output],
                  capture_output=True)

print("\n=== Pipeline complete ===")
PYEOF
