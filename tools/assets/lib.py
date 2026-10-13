"""
Shared helpers for the Blender asset builds (run with Blender's Python: `python -I build_x.py`, needs the `bpy` module).
Blender is Z-up with the front facing -Y; the glTF exporter turns that into three.js Y-up with the front facing +Z.

  reset()                          empty scene
  source(rel)                      import a source glTF once, hidden, and return its mesh objects (cached by path)
  place(rel, parent, loc, rot, s)  a linked copy (shared mesh data) of a source under `parent`
  group(name, parent=None)         an empty that becomes one named node in the GLB
  bake_join(group_obj)             join every mesh under a group into one mesh per group (keeps materials as primitives)
  vcol(obj, fn)                    paint a COLOR_0 vertex-colour layer from fn(co, normal) -> (r, g, b)
  mat(name, color, rough, metal, vertex=False, image=None, alpha=None)   a Principled material the glTF exporter understands
  export(path, roots)              export only the given roots (and their children) as GLB
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '.sources')
OUT = os.path.join(HERE, '.out')
os.makedirs(OUT, exist_ok=True)

_cache = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _cache.clear()
    lib = bpy.data.collections.new('__sources'); bpy.context.scene.collection.children.link(lib)
    lib.hide_render = True


def _lib():
    return bpy.data.collections['__sources']


def source(rel):
    """Import a source glTF/GLB once (hidden, in the __sources collection) and return its mesh objects with transforms applied."""
    path = os.path.join(SRC, rel)
    if path in _cache:
        return _cache[path]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = []
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        _lib().objects.link(o)
    bpy.context.view_layer.update()
    for o in new:
        if o.type == 'MESH':
            mw = o.matrix_world.copy()
            o.parent = None
            o.data = o.data.copy()
            o.data.transform(mw)
            o.matrix_world = Matrix.Identity(4)
            meshes.append(o)
    for o in new:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    _cache[path] = meshes
    return meshes


def group(name, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    if parent is not None:
        e.parent = parent
    return e


def place(rel, parent, loc=(0, 0, 0), rot=0.0, s=1.0, rx=0.0, ry=0.0):
    """Linked copies of a source's meshes under `parent` at loc, turned `rot` degrees about Z, scaled s."""
    objs = []
    for m in source(rel):
        o = m.copy()  # shares mesh data → one mesh in the GLB, many nodes
        bpy.context.scene.collection.objects.link(o)
        o.parent = parent
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.location = Vector(loc)
        o.rotation_euler = Euler((math.radians(rx), math.radians(ry), math.radians(rot)))
        o.scale = (s, s, s) if not isinstance(s, (tuple, list)) else s
        objs.append(o)
    return objs


def descendants(o):
    out = []
    for c in o.children:
        out.append(c)
        out += descendants(c)
    return out


def bake_join(root, name=None):
    """Make every mesh under `root` real (single-user, transform applied relative to root) and join them into one mesh object."""
    bpy.context.view_layer.update()
    meshes = [o for o in descendants(root) if o.type == 'MESH']
    if not meshes:
        return None
    inv = root.matrix_world.inverted()
    for o in meshes:
        o.data = o.data.copy()
        o.data.transform(inv @ o.matrix_world)
        o.parent = root
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active
    j.name = name or (root.name + '_mesh')
    j.data.name = j.name
    for e in [o for o in descendants(root) if o.type == 'EMPTY']:
        bpy.data.objects.remove(e)
    return j


def mat(name, color=(1, 1, 1), rough=0.6, metal=0.0, vertex=False, image=None, alpha=None, emission=None, normal=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    col = None
    if image is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image
        col = t.outputs['Color']
        if alpha is not None:
            nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
            if hasattr(m, 'blend_method'):
                m.blend_method = 'CLIP'
    if vertex:
        a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
        if col is not None:
            mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
            nt.links.new(col, mix.inputs[6]); nt.links.new(a.outputs['Color'], mix.inputs[7]); col = mix.outputs[2]
        else:
            col = a.outputs['Color']
    if col is not None:
        nt.links.new(col, p.inputs['Base Color'])
    if normal is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normal; normal.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    if emission is not None:
        p.inputs['Emission Color'].default_value = (*emission, 1); p.inputs['Emission Strength'].default_value = 1.0
    return m


def vcol(obj, fn):
    """Paint a 'Col' corner colour attribute (exported as COLOR_0) from fn(world_co, normal, loop_index) → (r, g, b) in linear space."""
    me = obj.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    attr = me.color_attributes['Col']
    me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index]
            r, g, b = fn(v.co, v.normal, li)
            attr.data[li].color = (r, g, b, 1)


def srgb(h):
    """'#rrggbb' → linear rgb tuple (Blender colours are linear)."""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def lerp3(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def shade_smooth(obj, angle=60):
    me = obj.data
    for p in me.polygons:
        p.use_smooth = True
    if hasattr(me, 'set_sharp_from_angle'):
        me.set_sharp_from_angle(angle=math.radians(angle))


def apply_mods(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def dedup_materials():
    """Imports duplicate materials as 'Name.001'…; point every user at the original and merge equal slots on each mesh."""
    import re
    for m in list(bpy.data.materials):
        base = re.sub(r'\.\d{3}$', '', m.name)
        if base != m.name and base in bpy.data.materials:
            m.user_remap(bpy.data.materials[base])
    for o in bpy.data.objects:
        if o.type != 'MESH' or len(o.data.materials) < 2:
            continue
        me = o.data; first = {}
        remap = []
        for i, m in enumerate(me.materials):
            first.setdefault(m.name if m else None, i); remap.append(first[m.name if m else None])
        for p in me.polygons:
            p.material_index = remap[p.material_index]
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.material_slot_remove_unused()


def simplify_materials(rough=0.85):
    """Phones: keep only base-colour (+ alpha) textures — drop normal, roughness and ORM maps, use a constant roughness."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if p is None:
            continue
        for sock in ('Normal', 'Roughness', 'Metallic'):
            for l in list(p.inputs[sock].links):
                nt.links.remove(l)
        for n in list(nt.nodes):
            if n.type in ('NORMAL_MAP', 'SEPARATE_COLOR', 'SEPRGB'):
                nt.nodes.remove(n)
        if not m.name.startswith('fz_'):
            p.inputs['Roughness'].default_value = rough
            p.inputs['Metallic'].default_value = 0.0
        for n in list(nt.nodes):  # image nodes no longer feeding anything
            if n.type == 'TEX_IMAGE' and not any(l.to_node for o in n.outputs for l in o.links):
                nt.nodes.remove(n)


def clean_colors():
    """Vertex colours only where our own fz_ materials use them: other meshes lose every colour layer (three.js would multiply
    by it), and joined meshes (a tree carrying our fruit) keep one 'Col' layer, white on the parts that don't use it."""
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        fz = [i for i, m in enumerate(me.materials) if m and m.name.startswith('fz_')]
        if not fz:
            for a in list(me.color_attributes):
                me.color_attributes.remove(a)
            continue
        if 'Col' not in me.color_attributes:
            me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        col = me.color_attributes['Col']
        if col.domain != 'CORNER':
            continue
        fzs = set(fz)
        for p in me.polygons:
            if p.material_index not in fzs:
                for li in p.loop_indices:
                    col.data[li].color = (1, 1, 1, 1)
        for a in [a for a in me.color_attributes if a.name != 'Col']:
            me.color_attributes.remove(a)
        me.color_attributes.active_color = me.color_attributes['Col']


def export(path, roots):
    dedup_materials()
    simplify_materials()
    clean_colors()
    bpy.ops.object.select_all(action='DESELECT')
    for r in roots:
        r.select_set(True)
        for d in descendants(r):
            d.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=True, export_normals=True, export_vertex_color='ACTIVE',
                              export_animations=True, export_morph=True, export_morph_normal=False, export_skins=True,
                              export_image_format='AUTO', export_extras=True)
