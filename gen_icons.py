#!/usr/bin/env python3
import base64, os

svg_192 = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="36" fill="#0a0a0f"/>
  <rect x="16" y="16" width="160" height="160" rx="28" fill="#111118"/>
  <text x="96" y="76" font-family="monospace" font-size="44" font-weight="700" text-anchor="middle" fill="#c9a84c">SNR</text>
  <text x="96" y="116" font-family="monospace" font-size="22" font-weight="400" text-anchor="middle" fill="#888">SCANNER</text>
  <circle cx="60" cy="148" r="6" fill="#22c55e"/>
  <circle cx="96" cy="148" r="6" fill="#c9a84c"/>
  <circle cx="132" cy="148" r="6" fill="#ef4444"/>
</svg>'''

svg_512 = svg_192.replace('192', '512').replace('36', '96').replace('160', '448').replace('28', '72').replace('76', '204').replace('44', '120').replace('116', '310').replace('22', '60').replace('148', '400').replace('60', '158').replace('96', '256').replace('132', '354').replace('6', '16')

with open('icons/icon-192.svg', 'w') as f:
    f.write(svg_192)
with open('icons/icon-512.svg', 'w') as f:
    f.write(svg_512)

print("Icons generated")
