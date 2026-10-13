"""Render a quick Cycles preview of the current scene's visible meshes (or a GLB): preview.py -- out.png [file.glb] [azimuth_deg] [elev_deg]"""
import bpy, sys, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

def frame_and_render(out, az=-35.0, el=22.0, res=(720, 480), samples=20):
    sc = bpy.context.scene
    mn = Vector((1e9,) * 3); mx = -mn
    for o in sc.objects:
        if o.type == 'MESH' and o.visible_get():
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    ctr = (mn + mx) / 2; size = (mx - mn).length
    cam = bpy.data.objects.new('pcam', bpy.data.cameras.new('pcam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    d = size * 1.25
    a, e = math.radians(az), math.radians(el)
    cam.location = ctr + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * d
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun = bpy.data.objects.new('psun', bpy.data.lights.new('psun', 'SUN')); sun.data.energy = 3.2; sun.data.angle = 0.2
    sun.rotation_euler = (math.radians(48), math.radians(12), math.radians(-35)); sc.collection.objects.link(sun)
    w = bpy.data.worlds.new('pw'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.78, 1.0, 1); bg.inputs[1].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=size * 6, location=(ctr.x, ctr.y, mn.z))
    fm = bpy.data.materials.new('pfloor'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.42, 0.6, 0.28, 1)
    bpy.context.object.data.materials.append(fm)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res; sc.view_settings.view_transform = 'AgX'
    sc.render.filepath = out; bpy.ops.render.render(write_still=True)

if __name__ == '__main__' and args:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if len(args) > 1 and args[1].endswith(('.glb', '.gltf')):
        bpy.ops.import_scene.gltf(filepath=args[1])
    az = float(args[2]) if len(args) > 2 else -35; el = float(args[3]) if len(args) > 3 else 22
    frame_and_render(args[0], az, el)
