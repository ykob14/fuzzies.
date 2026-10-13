"""
Hand-built props for the Fuzzies Land kits (our own models — no licence needed): orchard fruit, a pinecone and a woven basket.
Each is real geometry (shaped profiles, seeds, scales, woven strands), smooth-shaded, with colour painted into vertex colours
and Cycles-baked ambient occlusion multiplied in, so they read as finished game props with a single cheap material.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, noise
from lib import srgb, lerp3, mat, shade_smooth

VMAT = {}


def vmat(name, rough=0.5, metal=0.0, emission=None):
    """One shared vertex-colour material per look (fruit skin, wicker, …)."""
    if name not in VMAT:
        VMAT[name] = mat('fz_' + name, rough=rough, metal=metal, vertex=True, emission=emission)
    return VMAT[name]


def _obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def _join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name; o.data.name = name
    return o


def paint(obj, fn):
    """Corner colours from fn(co, normal, part) where `part` is the integer vertex attribute 'part' (0 = body …)."""
    me = obj.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = me.color_attributes['Col']
    col = me.color_attributes['Col']
    part = me.attributes.get('part')
    for poly in me.polygons:
        pid = part.data[poly.vertices[0]].value if part else 0
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index]
            n = v.normal
            c = fn(v.co, n, pid)
            col.data[li].color = (*c, 1)


def bake_ao(obj, strength=0.85, samples=64, dist=0.2):
    """Bake ambient occlusion into a temporary colour layer and multiply it into 'Col' (cheap depth that survives any light)."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    me = obj.data
    ao = me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = ao
    if not me.materials:
        me.materials.append(vmat('tmp'))
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    sc.world = sc.world or bpy.data.worlds.new('w')
    sc.world.light_settings.distance = dist
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = me.color_attributes['Col']
    for i, d in enumerate(ao.data):
        a = d.color[0]; k = 1 - strength + strength * a
        c = col.data[i].color
        col.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1)
    me.color_attributes.remove(ao)
    me.color_attributes.active_color = me.color_attributes['Col']


def _part(bm, pid):
    lay = bm.verts.layers.int.get('part') or bm.verts.layers.int.new('part')
    for v in bm.verts:
        v[lay] = pid


def _tag(obj, pid):
    me = obj.data
    a = me.attributes.get('part') or me.attributes.new('part', 'INT', 'POINT')
    for d in a.data:
        d.value = pid


def _sphere(seg, rings, r=1.0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    return bm


def _tube(points, r0, r1, sides=8, name='tube', cap=True):
    """A tapered tube along points (list of Vector)."""
    bm = bmesh.new()
    rings = []
    n = len(points)
    for i, p in enumerate(points):
        t = (points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized()
        a = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(a).normalized(); w = t.cross(u).normalized()
        r = r0 + (r1 - r0) * i / (n - 1)
        rings.append([bm.verts.new(p + (u * math.cos(k / sides * 2 * math.pi) + w * math.sin(k / sides * 2 * math.pi)) * r) for k in range(sides)])
    for i in range(n - 1):
        for k in range(sides):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    return _obj(name, bm)


def _leaf(length=0.9, width=0.42, fold=0.18, curl=0.25, name='leaf'):
    """A pointed leaf with a folded midrib and a downward curl (x along the leaf, y across)."""
    bm = bmesh.new()
    nu, nv = 10, 5
    grid = []
    for i in range(nu + 1):
        t = i / nu
        hw = width * 0.5 * math.sin(math.pi * min(1, t * 1.05)) ** 0.8 * (1 - 0.15 * t)
        row = []
        for j in range(nv + 1):
            s = j / nv * 2 - 1
            x = t * length; y = s * hw
            z = abs(s) * fold * hw - curl * t * t
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    o = _obj(name, bm)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.02
    return o


def _apply(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def _finish(o, look, ao=True, rough=0.45, metal=0.0, emission=None, ao_strength=0.8):
    shade_smooth(o, 70)
    o.data.materials.clear(); o.data.materials.append(vmat(look, rough, metal, emission))
    if ao:
        bake_ao(o, ao_strength)
    return o


# ---------------------------------------------------------------- fruit

def apple(name='apple', lo=False, gold=False, seed=1):
    """An apple: a squat lathe-like body with a deep stem well, a dimpled base and five soft lobes; red over yellow-green with
    streaks and pale lenticels painted into the vertex colours; a curved stem and one leaf. `lo` = a light version for trees."""
    rnd = random.Random(seed)
    bm = _sphere(14 if lo else 40, 9 if lo else 26)
    for v in bm.verts:
        x, y, z = v.co
        rxy = math.hypot(x, y); phi = math.atan2(y, x)
        z *= 0.86
        z -= 0.42 * math.exp(-(rxy / 0.32) ** 2) * (1 if z > 0 else -0.55)  # stem well on top, smaller dimple below
        k = 1 + 0.09 * z + 0.035 * math.cos(5 * phi) * max(0, -z)            # wider shoulders, five lobes at the base
        v.co = Vector((x * k, y * k, z))
    _part(bm, 0)
    body = _obj(name + '_body', bm)
    stem = _tube([Vector((0, 0, 0.42)), Vector((0.02, 0, 0.62)), Vector((0.07, 0.01, 0.8))], 0.045, 0.03, 6, name + '_stem'); _tag(stem, 1)
    parts = [body, stem]
    if not lo or seed % 3 == 0:
        lf = _leaf(0.62, 0.3, name=name + '_leaf'); _apply(lf); _tag(lf, 2)
        lf.matrix_world = Matrix.Translation((0.06, 0.0, 0.74)) @ Matrix.Rotation(math.radians(30 + rnd.random() * 20), 4, 'Z') @ Matrix.Rotation(math.radians(-18), 4, 'Y')
        parts.append(lf)
    o = _join(parts, name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    red, deep, yel, grn = srgb('#e01a1e'), srgb('#8a0a12'), srgb('#f6cf3a'), srgb('#86b82a')
    gold_c, gold_d = srgb('#ffd24a'), srgb('#c98a1a')
    ph = rnd.random() * 10

    def col(co, n, part):
        if part == 1:
            return srgb('#6b4a2a')
        if part == 2:
            return lerp3(srgb('#3f8f2f'), srgb('#9fd35a'), max(0, min(1, co.x / 0.8 + 0.2)))
        if gold:
            return lerp3(gold_d, gold_c, 0.55 + 0.45 * n.z)
        a = math.atan2(co.y, co.x)
        streak = 0.5 + 0.5 * math.sin(a * 23 + noise.noise(co * 3 + Vector((ph, 0, 0))) * 4)
        blush = max(0, min(1, 0.8 + 0.5 * noise.noise(co * 1.4 + Vector((ph, 1, 2))) + 0.25 * co.x))
        c = lerp3(lerp3(yel, grn, 0.35), red, blush * (0.75 + 0.25 * streak))
        c = lerp3(c, deep, max(0, -co.z) * 0.35 * blush)
        if noise.noise(co * 26 + Vector((ph, 3, 1))) > 0.52:  # lenticels
            c = lerp3(c, srgb('#ffe9b0'), 0.55)
        if co.z > 0.25 and math.hypot(co.x, co.y) < 0.33:  # the stem well: green-yellow, darker
            c = lerp3(c, lerp3(grn, srgb('#5a6a1a'), 0.4), 0.6)
        return c
    paint(o, col)
    return _finish(o, 'gold' if gold else 'fruit', ao=not lo and not gold, rough=0.22 if gold else 0.38, metal=0.85 if gold else 0.0,
                   emission=srgb('#5a3a00') if gold else None)


def pear(name='pear', lo=False, seed=2):
    """A pear: a lathed profile with a round bottom and a narrow neck, green-yellow with a pink blush and russet freckles."""
    rnd = random.Random(seed)
    prof = [(0.0, -0.62), (0.42, -0.56), (0.62, -0.32), (0.64, -0.05), (0.52, 0.22), (0.36, 0.45), (0.28, 0.68), (0.2, 0.86), (0.09, 0.95), (0.0, 0.96)]
    bm = bmesh.new()
    seg = 12 if lo else 36
    from mathutils import geometry
    pts = []
    for i in range(len(prof) - 1):  # smooth the profile with Catmull-Rom-ish sampling
        for s in range(2 if lo else 5):
            t = s / (2 if lo else 5)
            p0 = prof[max(i - 1, 0)]; p1 = prof[i]; p2 = prof[i + 1]; p3 = prof[min(i + 2, len(prof) - 1)]
            q = [0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)]
            pts.append(q)
    pts.append(prof[-1])
    rings = []
    for (r, z) in pts:
        ring = []
        for k in range(seg):
            a = k / seg * 2 * math.pi
            rr = r * (1 + 0.025 * math.sin(a * 3 + z * 2))
            ring.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.004)
    bmesh.ops.holes_fill(bm, edges=bm.edges)
    _part(bm, 0)
    body = _obj(name + '_body', bm)
    stem = _tube([Vector((0, 0, 0.9)), Vector((0.03, 0, 1.08)), Vector((0.1, 0.02, 1.22))], 0.04, 0.026, 6, name + '_stem'); _tag(stem, 1)
    parts = [body, stem]
    if not lo:
        lf = _leaf(0.55, 0.26, name=name + '_leaf'); _apply(lf); _tag(lf, 2)
        lf.matrix_world = Matrix.Translation((0.06, 0, 1.12)) @ Matrix.Rotation(math.radians(-140), 4, 'Z') @ Matrix.Rotation(math.radians(-25), 4, 'Y')
        parts.append(lf)
    o = _join(parts, name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ph = rnd.random() * 10

    def col(co, n, part):
        if part == 1:
            return srgb('#6b4a2a')
        if part == 2:
            return lerp3(srgb('#3f8f2f'), srgb('#9fd35a'), 0.5)
        c = lerp3(srgb('#a9c43a'), srgb('#f0dc5a'), max(0, min(1, 0.5 + 0.6 * noise.noise(co * 1.2 + Vector((ph, 0, 0))))))
        c = lerp3(c, srgb('#f08a6a'), max(0, co.x * 0.6 + noise.noise(co * 2 + Vector((0, ph, 0))) * 0.4) * 0.5)
        if noise.noise(co * 30 + Vector((ph, 0, 2))) > 0.48:
            c = lerp3(c, srgb('#a2702a'), 0.55)  # russet freckles
        if co.z > 0.78:
            c = lerp3(c, srgb('#8a7a3a'), 0.5)
        return c
    paint(o, col)
    return _finish(o, 'fruit', ao=not lo)


def strawberry(name='strawberry', seed=3):
    """A strawberry: a heart-shaped cone with pitted golden seeds in a spiral, a green star of sepals and a short stem."""
    bm = _sphere(26, 16)
    for v in bm.verts:
        x, y, z = v.co
        t = (z + 1) / 2  # 0 tip … 1 top
        w = (0.25 + 0.75 * math.sin(math.pi * min(1, t * 0.92 + 0.08)) ** 0.7) * (0.92 + 0.08 * t)
        v.co = Vector((x * w * 0.78, y * w * 0.78, z * 0.92 - 0.1 * (1 - t) ** 2))
    _part(bm, 0)
    body = _obj(name + '_body', bm)
    parts = [body]
    # seeds: a golden-angle spiral over the surface, each a tiny ellipsoid set into the skin
    ga = math.pi * (3 - math.sqrt(5))
    me = body.data
    seeds = bmesh.new()
    for i in range(70):
        zf = 1 - (i + 0.5) / 70 * 1.75
        if zf < -0.9:
            continue
        a = i * ga
        best = None
        d = Vector((math.cos(a) * math.sqrt(max(0, 1 - zf * zf)), math.sin(a) * math.sqrt(max(0, 1 - zf * zf)), zf))
        for v in me.vertices:  # nearest surface point in that direction
            k = v.co.normalized().dot(d)
            if best is None or k > best[0]:
                best = (k, v)
        p = best[1].co; nrm = best[1].normal
        s = bmesh.ops.create_uvsphere(seeds, u_segments=5, v_segments=3, radius=0.035)
        q = nrm.to_track_quat('Z', 'Y')
        for v in s['verts']:
            v.co = q @ Vector((v.co.x, v.co.y * 0.7, v.co.z * 0.6)) + p - nrm * 0.006
    lay = seeds.verts.layers.int.new('part')
    for v in seeds.verts:
        v[lay] = 3
    parts.append(_obj(name + '_seeds', seeds))
    for k in range(7):
        lf = _leaf(0.42, 0.16, fold=0.1, curl=-0.12, name=name + f'_sepal{k}'); _apply(lf); _tag(lf, 2)
        lf.matrix_world = Matrix.Translation((0, 0, 0.78)) @ Matrix.Rotation(k / 7 * 2 * math.pi, 4, 'Z') @ Matrix.Rotation(math.radians(-20), 4, 'Y')
        parts.append(lf)
    stem = _tube([Vector((0, 0, 0.75)), Vector((0.02, 0, 0.95)), Vector((0.05, 0, 1.05))], 0.04, 0.03, 6, name + '_stem'); _tag(stem, 2)
    parts.append(stem)
    o = _join(parts, name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    def col(co, n, part):
        if part == 2:
            return lerp3(srgb('#2f7f2a'), srgb('#7fc84a'), 0.5 + 0.5 * n.z)
        if part == 3:
            return srgb('#f6d26a')
        t = (co.z + 1) / 2
        return lerp3(srgb('#c4102a'), srgb('#ff3a46'), 0.5 + 0.5 * noise.noise(co * 2)) if t < 0.86 else lerp3(srgb('#ff3a46'), srgb('#ffd6a0'), (t - 0.86) / 0.14)
    paint(o, col)
    return _finish(o, 'fruit', rough=0.32)


def pinecone(name='pinecone', seed=4):
    """A pinecone: about a hundred woody scales on a golden-angle spiral, open in the middle and tight at both ends."""
    parts = []
    core = _sphere(12, 8, 0.32)
    for v in core.verts:
        v.co.z *= 2.0
    _part(core, 0)
    parts.append(_obj(name + '_core', core))
    sc = bmesh.new()
    lay = sc.verts.layers.int.new('part')
    ga = math.pi * (3 - math.sqrt(5)); N = 78
    for i in range(N):
        t = i / (N - 1)  # 0 bottom … 1 top
        z = -0.72 + t * 1.5
        a = i * ga
        size = 0.13 + 0.16 * math.sin(math.pi * min(1, max(0, t * 1.1 - 0.05)))
        rad = 0.22 + 0.38 * math.sin(math.pi * t) ** 0.8
        tilt = math.radians(25 + 45 * (1 - abs(t - 0.45) * 1.6))
        s = bmesh.ops.create_cube(sc, size=1)
        for v in s['verts']:
            x, y, zz = v.co
            # a rounded wedge: thick at the root, wide and thin at the tip
            u = x + 0.5
            v.co = Vector((u * size * 1.4, y * size * (0.55 + 0.45 * u), zz * size * 0.42 * (1.2 - 0.6 * u)))
            v[lay] = 1
        m = Matrix.Translation((math.cos(a) * rad * 0.55, math.sin(a) * rad * 0.55, z)) @ Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(-tilt, 4, 'Y')
        for v in s['verts']:
            v.co = m @ v.co
    bmesh.ops.bevel(sc, geom=list(sc.edges), offset=0.02, segments=2, affect='EDGES')
    parts.append(_obj(name + '_scales', sc))
    o = _join(parts, name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    def col(co, n, part):
        rr = math.hypot(co.x, co.y)
        c = lerp3(srgb('#5a3418'), srgb('#b07a42'), max(0, min(1, (rr - 0.15) / 0.55)))
        return lerp3(c, srgb('#e0b47a'), max(0, n.z) * 0.25)
    paint(o, col)
    return _finish(o, 'wood', rough=0.75, ao_strength=0.9)


# ---------------------------------------------------------------- the basket

def basket(name='basket'):
    """A woven wicker basket: 26 upright staves following a flared bowl profile, eleven over-and-under weaver rows, a braided
    rim, a plaited base and two side loops. Wicker colour per strand with baked occlusion in the weave."""
    rnd = random.Random(7)
    R0, R1, H = 0.62, 1.0, 0.72          # base radius, rim radius, height
    radius = lambda h: R0 + (R1 - R0) * (h / H) ** 0.8
    parts = []
    NS = 26
    for k in range(NS):
        a = k / NS * 2 * math.pi
        pts = [Vector((math.cos(a) * radius(h), math.sin(a) * radius(h), h)) for h in [i / 8 * H for i in range(9)]]
        st = _tube(pts, 0.022, 0.02, 4, f'{name}_stave{k}', cap=False); _tag(st, 1); parts.append(st)
    NR = 11
    for j in range(NR):
        h = 0.05 + j / (NR - 1) * (H - 0.1)
        pts = []
        M = NS * 3
        for i in range(M + 1):
            a = i / M * 2 * math.pi
            weave = 0.028 * math.sin(a * NS / 2 + (j % 2) * math.pi)  # over and under the staves
            r = radius(h) + weave
            pts.append(Vector((math.cos(a) * r, math.sin(a) * r, h + 0.006 * math.sin(a * 3 + j))))
        w = _tube(pts, 0.034, 0.034, 4, f'{name}_row{j}', cap=False)
        for v in w.data.vertices:  # flatten the weaver into a ribbon
            c = Vector((v.co.x, v.co.y, 0)).normalized() * radius(h)
            d = v.co - Vector((c.x, c.y, h)); v.co = Vector((c.x, c.y, h)) + Vector((d.x * 0.6, d.y * 0.6, d.z * 1.25))
        _tag(w, 2 + (j % 3)); parts.append(w)
    # braided rim: three strands twisting round the rim
    for s in range(3):
        pts = []
        M = 108
        for i in range(M + 1):
            a = i / M * 2 * math.pi
            tw = a * 18 + s * 2 * math.pi / 3
            r = R1 + 0.045 * math.cos(tw)
            pts.append(Vector((math.cos(a) * r, math.sin(a) * r, H + 0.03 + 0.045 * math.sin(tw))))
        b = _tube(pts, 0.04, 0.04, 5, f'{name}_braid{s}', cap=False); _tag(b, 5); parts.append(b)
    # plaited base disc
    base = bmesh.new()
    bmesh.ops.create_circle(base, cap_ends=True, radius=R0 + 0.02, segments=NS * 2)
    for v in base.verts:
        v.co.z = 0.02
    sol = _obj(name + '_base', base); m = sol.modifiers.new('s', 'SOLIDIFY'); m.thickness = 0.05; _apply(sol); _tag(sol, 1); parts.append(sol)
    # side loops
    for sx in (-1, 1):
        pts = [Vector((sx * (R1 + 0.02 + 0.13 * math.sin(t * math.pi)), 0.18 * math.cos(t * math.pi), H - 0.05 + 0.12 * math.sin(t * math.pi))) for t in [i / 10 for i in range(11)]]
        lp = _tube(pts, 0.035, 0.035, 6, f'{name}_loop{sx}', cap=True); _tag(lp, 5); parts.append(lp)
    o = _join(parts, name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    tones = {1: srgb('#b98a4e'), 2: srgb('#d9ad6a'), 3: srgb('#cfa060'), 4: srgb('#e3b978'), 5: srgb('#a8773e')}

    def col(co, n, part):
        c = tones.get(part, srgb('#c99a5a'))
        c = lerp3(c, srgb('#f3d49a'), max(0, n.z) * 0.18)
        return lerp3(c, srgb('#8a5f2e'), max(0, noise.noise(co * 9)) * 0.35)
    paint(o, col)
    return _finish(o, 'wicker', rough=0.8, ao_strength=0.95)
