"""
Builds public/models/kits/orchard.glb — the Fruit Catcher's art kit (and the start of the shared Fuzzies Land library):

  fruit_apple / fruit_pear / fruit_berry / fruit_gold / fruit_cone   hand-built props (props.py), ~2–5k triangles each
  basket                                                              hand-built woven basket
  tree_apple_1..3, tree_pear_1                                        Quaternius CommonTrees carrying our light fruit
  tree_1..3, pine_1, pine_2                                           Quaternius trees for the tree line
  bush, bush_flowers, fern, flowers_a, flowers_b, grass_short, grass_tall, grass_wispy, clover, plant, mushroom,
  rock_1, rock_2, pebble                                              Quaternius ground cover
  farmhouse                                                           assembled from the Quaternius Medieval Village modules
  fence, wagon, crate_apples, crate_pears                             village props (+ our fruit)

Run:  tools/assets/fetch_sources.sh && <blender-python> -I tools/assets/build_orchard.py && tools/assets/optimize.sh orchard
Every node is a root of the GLB scene, named as above; each is one mesh (one draw call per material) with its pivot on the ground.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
from lib import reset, source, group, place, bake_join, export, OUT, descendants
import props

N = 'quaternius-nature/glTF/'
V = 'quaternius-village/glTF/'
reset()
roots = []


def one(name, rel, s=1.0, rot=0.0):
    g = group(name)
    place(rel, g, s=s, rot=rot)
    bake_join(g, name + '_mesh')
    roots.append(g)
    return g


def keep(obj, name):
    """A single built object as its own root node."""
    obj.name = name + '_mesh'
    g = group(name)
    obj.parent = g
    roots.append(g)
    return g


# ---- fruit (hi detail, for falling) and the basket ----
for nm, o in [('fruit_apple', props.apple('apple')), ('fruit_pear', props.pear('pear')), ('fruit_berry', props.strawberry('berry')),
              ('fruit_gold', props.apple('gold', gold=True, seed=5)), ('fruit_cone', props.pinecone('cone'))]:
    keep(o, nm)
keep(props.basket('basket'), 'basket')

# light fruit for trees and crates (hidden templates, copied by data)
lo = {'apple': [props.apple(f'lo_apple{i}', lo=True, seed=10 + i) for i in range(3)], 'pear': [props.pear(f'lo_pear{i}', lo=True, seed=20 + i) for i in range(2)]}
for lst in lo.values():
    for o in lst:
        o.hide_set(True); o.hide_render = True


def stamp(target, tmpl, m):
    """Copy a template mesh into `target` (an object) with matrix m (in the target's space)."""
    me = tmpl.data.copy(); me.transform(m)
    o = bpy.data.objects.new('tmp', me); bpy.context.scene.collection.objects.link(o)
    for mt in tmpl.data.materials:
        pass
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()


def fruit_tree(name, rel, kinds, n, seed, s=1.0):
    g = group(name); place(rel, g, s=s); tree = bake_join(g, name + '_mesh')
    rnd = random.Random(seed)
    me = tree.data
    leaf_ids = {i for i, m in enumerate(me.materials) if m and 'Leaves' in m.name}
    polys = [p for p in me.polygons if p.material_index in leaf_ids]
    zs = [p.center.z for p in polys]; zmin, zmax = min(zs), max(zs)
    rmax = max(math.hypot(p.center.x, p.center.y) for p in polys)
    cand = [p for p in polys if zmin + (zmax - zmin) * 0.12 < p.center.z < zmin + (zmax - zmin) * 0.62 and math.hypot(p.center.x, p.center.y) > rmax * 0.5]
    rnd.shuffle(cand)
    chosen = []
    for p in cand:
        c = p.center.copy()
        if all((c - q).length > 0.95 * s for q in chosen):
            chosen.append(c)
        if len(chosen) >= n:
            break
    for i, c in enumerate(chosen):
        kind = kinds[i % len(kinds)]
        tmpl = lo[kind][i % len(lo[kind])]
        out = Vector((c.x, c.y, 0)).normalized() * 0.18
        m = Matrix.Translation(c + out - Vector((0, 0, 0.32 * s))) @ Matrix.Rotation(rnd.random() * 6.28, 4, 'Z') @ Matrix.Rotation(rnd.uniform(-0.25, 0.25), 4, 'X') @ Matrix.Scale(0.4 * s, 4)
        stamp(tree, tmpl, m)
    tree.name = name + '_mesh'
    roots.append(g)
    return g


fruit_tree('tree_apple_1', N + 'CommonTree_1.gltf', ['apple'], 16, 1)
fruit_tree('tree_apple_2', N + 'CommonTree_2.gltf', ['apple'], 16, 2)
fruit_tree('tree_apple_3', N + 'CommonTree_5.gltf', ['apple', 'apple', 'pear'], 14, 3)
fruit_tree('tree_pear_1', N + 'CommonTree_1.gltf', ['pear'], 14, 4)

for nm, rel in [('tree_1', 'CommonTree_3'), ('tree_2', 'CommonTree_4'), ('tree_3', 'CommonTree_5'), ('pine_1', 'Pine_1'), ('pine_2', 'Pine_3'),
                ('bush', 'Bush_Common'), ('bush_flowers', 'Bush_Common_Flowers'), ('fern', 'Fern_1'), ('flowers_a', 'Flower_3_Group'),
                ('flowers_b', 'Flower_4_Group'), ('grass_short', 'Grass_Common_Short'), ('grass_tall', 'Grass_Common_Tall'),
                ('grass_wispy', 'Grass_Wispy_Short'), ('clover', 'Clover_1'), ('plant', 'Plant_1'), ('mushroom', 'Mushroom_Common'),
                ('rock_1', 'Rock_Medium_1'), ('rock_2', 'Rock_Medium_2'), ('pebble', 'Pebble_Round_2')]:
    one(nm, N + rel + '.gltf')

# ---- the farmhouse: a 6 × 6 m timber-framed cottage with a tiled roof, arched windows with open shutters and a plank door ----
h = group('farmhouse')
for x in (-2, 0, 2):
    place(V + ('Wall_Plaster_Door_Round.gltf' if x == 0 else 'Wall_Plaster_Window_Wide_Round.gltf'), h, (x, -3, 0))
place(V + 'Door_1_Round.gltf', h, (-0.53, -3, 0))
for x in (-2, 2):
    place(V + 'Window_Wide_Round1.gltf', h, (x, -3, 0)); place(V + 'WindowShutters_Wide_Round_Open.gltf', h, (x, -3, 0))
for x in (-2, 0, 2):
    place(V + 'Wall_Plaster_Straight_Base.gltf', h, (x, 3, 0), 180)
for y in (-2, 0, 2):
    for sx, r in ((-3, -90), (3, 90)):
        place(V + ('Wall_Plaster_Window_Wide_Round.gltf' if y == 0 else 'Wall_Plaster_Straight_Base.gltf'), h, (sx, y, 0), r)
        if y == 0:
            place(V + 'Window_Wide_Round1.gltf', h, (sx, y, 0), r); place(V + 'WindowShutters_Wide_Round_Open.gltf', h, (sx, y, 0), r)
for cx in (-3, 3):
    for cy in (-3, 3):
        place(V + 'Corner_Exterior_Wood.gltf', h, (cx, cy, 0))
place(V + 'Roof_RoundTiles_6x6.gltf', h, (0, 0, 3.12))
place(V + 'Roof_Front_Brick6.gltf', h, (0, -3, 3.12)); place(V + 'Roof_Front_Brick6.gltf', h, (0, 3, 3.12), 180)
place(V + 'Prop_Chimney.gltf', h, (2.0, 1.4, 3.6))
place(V + 'Prop_Vine2.gltf', h, (2.9, -3.05, 0.2))
place(N + 'Bush_Common_Flowers.gltf', h, (-2.0, -3.9, 0), s=0.75); place(N + 'Bush_Common_Flowers.gltf', h, (2.2, -3.9, 0), 70, s=0.7)
bake_join(h, 'farmhouse_mesh'); roots.append(h)

# ---- fence segment (2 m), wagon with a crate of apples, crates of fruit ----
one('fence', V + 'Prop_WoodenFence_Single.gltf')


def crate_of(name, kind, seed):
    g = group(name); place(V + 'Prop_Crate.gltf', g); c = bake_join(g, name + '_mesh')
    rnd = random.Random(seed); t = lo[kind]
    for i in range(3):
        for j in range(3):
            m = Matrix.Translation(((i - 1) * 0.3 + rnd.uniform(-0.04, 0.04), (j - 1) * 0.3 + rnd.uniform(-0.04, 0.04), 0.98)) @ Matrix.Rotation(rnd.random() * 6.28, 4, 'Z') @ Matrix.Rotation(rnd.uniform(-0.5, 0.5), 4, 'X') @ Matrix.Scale(0.17, 4)
            stamp(c, t[(i + j) % len(t)], m)
    for k in range(3):
        m = Matrix.Translation((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 1.18)) @ Matrix.Rotation(rnd.random() * 6.28, 4, 'Z') @ Matrix.Scale(0.17, 4)
        stamp(c, t[k % len(t)], m)
    c.name = name + '_mesh'; roots.append(g)
    return g


crate_of('crate_apples', 'apple', 1)
crate_of('crate_pears', 'pear', 2)
w = group('wagon'); place(V + 'Prop_Wagon.gltf', w); wm = bake_join(w, 'wagon_mesh')
rnd = random.Random(9)
for i in range(14):  # a heap of apples in the wagon bed
    m = Matrix.Translation((rnd.uniform(-0.55, 0.55), rnd.uniform(0.2, 2.2), 0.78 + rnd.random() * 0.12)) @ Matrix.Rotation(rnd.random() * 6.28, 4, 'Z') @ Matrix.Scale(0.17, 4)
    stamp(wm, lo['apple'][i % 3], m)
roots.append(w)

for lst in lo.values():
    for o in lst:
        bpy.data.objects.remove(o)
out = os.path.join(OUT, 'orchard.glb')
export(out, roots)
for r in roots:
    ms = [o for o in descendants(r) if o.type == 'MESH']
    print('NODE', r.name, sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms), 'tris', [m.name for o in ms for m in o.data.materials])
print('WROTE', out, os.path.getsize(out))
