"""Gameplay packing preserves rendered body geometry and the original artwork."""
import base64
import io
import sys
import unittest
from pathlib import Path
from PIL import Image

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from build import game_atlas

class RuntimeAtlasTest(unittest.TestCase):
    def test_world_size_anchor_and_palette_survive_packing(self):
        source=Image.new('RGBA',(1800,1200),(0,0,0,0))
        source.paste((201,110,145,255),(10,10,610,1010))
        source.paste((96,142,103,255),(800,30,1700,630))
        frames=[dict(name='standing',x=10,y=10,w=600,h=1000,ax=320,ay=1000,height=235),
                dict(name='crouching',x=800,y=30,w=900,h=600,ax=280,ay=600,height=150)]
        before=source.tobytes();packed=game_atlas(source,frames,2)
        self.assertEqual(source.tobytes(),before)
        atlas=Image.open(io.BytesIO(base64.b64decode(packed['atlas'].split(',')[1]))).convert('RGBA')
        for original,current,color in zip(frames,packed['frames'],[(201,110,145,255),(96,142,103,255)]):
            a,b=original['height']/original['h'],current['height']/current['h']
            for field in ['w','ax','ay']:
                self.assertAlmostEqual(original[field]*a,current[field]*b,delta=.02)
            self.assertEqual(current['name'],original['name'])
            self.assertEqual(atlas.getpixel((current['x']+current['w']//2,current['y']+current['h']//2)),color)
            self.assertEqual(atlas.getpixel((current['x']-3,current['y'])),(0,0,0,0))

    def test_small_art_is_never_upscaled(self):
        source=Image.new('RGBA',(80,100),(40,80,120,255))
        frame=dict(x=0,y=0,w=80,h=100,ax=40,ay=100,height=72)
        current=game_atlas(source,[frame],1)['frames'][0]
        self.assertEqual((current['w'],current['h'],current['ax'],current['ay']),(80,100,40,100))

if __name__=='__main__':unittest.main()
