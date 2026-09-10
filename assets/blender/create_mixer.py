"""Original editable Mixtape mixer. Run with Blender 5.2+ in background mode.

Blender is Z-up; glTF and the binding manifest are Y-up. The editable source
retains individual named parts. Only the browser export consolidates meshes.
"""
import argparse
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
base = Path(__file__).resolve().parent
parser.add_argument('--blend', type=Path, default=base / 'mixtape-mixer.blend')
parser.add_argument('--glb', type=Path, default=base / 'mixtape-mixer.glb')
parser.add_argument('--public-dir', type=Path, default=base.parent.parent / 'public/models')
parser.add_argument('--render', type=Path, help='Optional Blender studio render; browser review is still required.')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for destination in [args.blend.parent, args.glb.parent, args.public_dir]:
    destination.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
collection = bpy.data.collections.new('Mixtape Mixer · editable')
bpy.context.scene.collection.children.link(collection)
asset_parts = []
static_parts = []
moving_parts = {}
controls = []
meters = []


def material(name, color, metal=0.0, rough=0.5, vertex_color=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if vertex_color:
        color_node = m.node_tree.nodes.new('ShaderNodeVertexColor')
        color_node.layer_name = 'SurfaceColor'
        m.node_tree.links.new(color_node.outputs['Color'], shader.inputs['Base Color'])
    return m


# Linear colors: warm forest shell, ivory print, oxblood filter accent.
shell = material('Forest powder coat', (0.029, 0.057, 0.035), .25, .62)
face = material('Satin forest face', (0.042, 0.072, 0.043), .25, .54)
rubber = material('Dark recessed rubber', (.009, .013, .011), .05, .72)
cream = material('Warm ivory print', (.72, .67, .51), .0, .7)
metal = material('Brushed warm aluminum', (.39, .42, .38), .72, .35)
signal = material('Signal mint', (.12, .55, .29), .1, .5)
control_surface = material('Control surfaces · vertex colors', (1, 1, 1), .32, .45, True)
knob_color = (.036, .046, .038)
filter_color = (.38, .33, .24)
marker_color = (.82, .75, .56)
oxblood_color = (.26, .034, .028)


def attach(obj, name, parent=None):
    obj.name = name
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    asset_parts.append(obj)
    if parent:
        transform = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = transform
    return obj


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    asset_parts.append(obj)
    obj.location = location
    if parent:
        obj.parent = parent
    return obj


root = empty('mixtape.mixer')
root['asset_version'] = 2
root['authoring_up_axis'] = 'Z'
root['runtime_up_axis'] = 'Y'


def surface(obj, name, mat, moving=None, color=None):
    obj.data.materials.append(mat)
    attach(obj, name, moving or root)
    if moving:
        colors = obj.data.color_attributes.new(name='SurfaceColor', type='FLOAT_COLOR', domain='CORNER')
        for item in colors.data:
            item.color = (*(color or knob_color), 1)
        moving_parts.setdefault(moving.name, []).append(obj)
    else:
        static_parts.append(obj)
    return obj


def box(name, loc, size, mat, bevel=.012, moving=None, color=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Editable edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    return surface(obj, name, mat, moving, color)


def cylinder(name, loc, radius, depth, mat, moving=None, color=None, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    bevel = obj.modifiers.new('Editable soft edge', 'BEVEL')
    bevel.width = .008
    bevel.segments = 2
    obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    return surface(obj, name, mat, moving, color)


def label(name, text, x, y, size=.065):
    bpy.ops.object.text_add(location=(x, y, .298))
    obj = bpy.context.object
    obj.data.body = text
    obj.data.size = size
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.data.resolution_u = 3
    obj.data.materials.append(cream)
    attach(obj, name, root)
    static_parts.append(obj)
    return obj


def hit_region(control_id, location, blender_size):
    hit = empty('hit.' + control_id, location, root)
    hit.empty_display_type = 'CUBE'
    hit.empty_display_size = .2
    hit['hit_control_id'] = control_id
    hit['runtime_size'] = [blender_size[0], blender_size[2], blender_size[1]]
    hit['role'] = 'Explicit static pointer hit volume, separate from moving control'
    return {'node': hit.name, 'size': list(hit['runtime_size'])}


def binding(control_id, location, kind, axis, limits, input_range, hit_location, hit_size):
    control = empty(control_id, location, root)
    control.empty_display_type = 'PLAIN_AXES'
    control.empty_display_size = .16
    control['control_id'] = control_id
    control['runtime_property'] = kind
    control['runtime_axis'] = axis
    control['runtime_min'] = limits[0]
    control['runtime_max'] = limits[1]
    control['input_min'] = input_range[0]
    control['input_max'] = input_range[1]
    if kind == 'rotation':
        constraint = control.constraints.new('LIMIT_ROTATION')
        constraint.use_limit_z = True
        constraint.min_z, constraint.max_z = limits
        constraint.owner_space = 'LOCAL'
    else:
        constraint = control.constraints.new('LIMIT_LOCATION')
        if axis == 'x':
            constraint.use_min_x = constraint.use_max_x = True
            constraint.min_x, constraint.max_x = sorted(limits)
        else:
            constraint.use_min_y = constraint.use_max_y = True
            constraint.min_y, constraint.max_y = sorted([-v for v in limits])
        constraint.owner_space = 'LOCAL'
    controls.append({'id': control_id, 'node': control.name,
                     'transform': {'property': kind, 'axis': axis, 'min': limits[0], 'max': limits[1]},
                     'input': {'min': input_range[0], 'max': input_range[1]},
                     'hit': hit_region(control_id, hit_location, hit_size)})
    return control


box('mixer.body', (0, 0, 0), (2.55, 4.66, .5), shell, .07)
box('mixer.face', (0, 0, .267), (2.47, 4.57, .035), face, .018)
label('mixer.brand', 'MIXTAPE / FOUR CHANNEL', 0, 2.10, .114)
for x in [-1.14, 1.14]:
    for y in [-2.13, 2.13]:
        cylinder('mixer.fastener', (x, y, .292), .026, .013, metal, vertices=12)
    for y in [-1.88, 1.88]:
        cylinder('mixer.foot', (x * .85, y, -.275), .14, .15, rubber, vertices=16)

for index, channel in enumerate(['C', 'A', 'B', 'D']):
    x = -.90 + index * .60
    label(f'{channel}.label', channel, x, 1.81, .125)
    for index, band in enumerate(['high', 'mid', 'low', 'filter']):
        y = 1.47 - index * .49 if band != 'filter' else -.17
        is_filter = band == 'filter'
        radius = .14 if is_filter else .113
        # Washers and scale marks stay on the face; pointer marks move with the knob.
        cylinder(f'{channel}.{band}.washer', (x, y, .299), radius + .027, .014, metal)
        knob = binding(f'{channel}.{band}', (x, y, .385), 'rotation', 'y',
                       [-2.25, 2.25] if is_filter else [-2.2, 2.2],
                       [0, 1] if is_filter else [-12, 12], (x, y, .40), (.43, .41, .34))
        cylinder(f'{channel}.{band}.grip', (x, y, .385), radius, .175,
                 control_surface, knob, filter_color if is_filter else knob_color)
        box(f'{channel}.{band}.indicator', (x, y + .05, .478), (.019, .079, .009),
            control_surface, .002, knob, oxblood_color if is_filter else marker_color)
        label(f'{channel}.{band}.print', band.upper(), x, y - .21, .066)
    box(f'{channel}.gain.slot', (x, -1.025, .299), (.052, 1.00, .018), rubber, .012)
    for tick in range(9):
        box(f'{channel}.gain.scale.{tick}', (x - .15, -.56 - tick * .1175, .293), (.092, .011, .009), cream, 0)
    gain = binding(f'{channel}.gain', (x, -1.50, .375), 'position', 'z', [1.50, .56], [0, 1],
                   (x, -1.025, .39), (.40, 1.13, .28))
    box(f'{channel}.gain.cap', (x, -1.50, .375), (.31, .15, .105), control_surface, .018, gain, (.49, .49, .41))
    box(f'{channel}.gain.indicator', (x, -1.50, .433), (.25, .018, .008), control_surface, .002, gain, knob_color)
    label(f'{channel}.gain.print', 'LEVEL ' + channel, x, -1.69, .069)
    box(f'{channel}.meter.recess', (x + .23, -1.025, .295), (.044, .96, .014), rubber, .004)
    meter = empty(f'{channel}.meter', (x + .23, -1.495, .310), root)
    # Local meter Z after export grows away from the performer; real audio RMS drives scale.
    bar = box(f'{channel}.meter.signal', (x + .23, -1.025, .310), (.026, .94, .008), signal, 0)
    static_parts.remove(bar)
    world = bar.matrix_world.copy()
    bar.parent = meter
    bar.matrix_world = world
    meters.append({'deck': channel, 'node': meter.name, 'axis': 'z'})

box('crossfader.slot', (0, -1.97, .299), (1.70, .068, .020), rubber, .012)
cross = binding('crossfader', (-.70, -1.97, .375), 'position', 'x', [-.70, .70], [0, 1],
                (0, -1.97, .39), (1.85, .42, .28))
box('crossfader.cap', (-.70, -1.97, .375), (.19, .28, .105), control_surface, .018, cross, (.49, .49, .41))
box('crossfader.indicator', (-.70, -1.97, .433), (.018, .22, .008), control_surface, .002, cross, knob_color)
label('crossfader.print', 'A+C     /     B+D', 0, -2.235, .089)

# Studio objects are intentionally outside the asset collection.
bpy.ops.object.camera_add(location=(5.8, -8, 10))
cam = bpy.context.object
cam.name = 'Studio camera · not exported'
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 6.4
bpy.context.scene.camera = cam
for location, power in [((2, -3, 7), 1100), ((-4, 2, 5), 800)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = 'Studio softbox · not exported'
    light.data.energy = power
    light.data.size = 5
    light.rotation_euler = (-light.location).to_track_quat('-Z', 'Y').to_euler()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.world.color = (.18, .18, .18)
# Save the fully editable parts before export-only consolidation.
bpy.ops.wm.save_as_mainfile(filepath=str(args.blend.resolve()))
if args.render:
    args.render.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(args.render.resolve())
    bpy.ops.render.render(write_still=True)


def consolidate(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.convert(target='MESH')  # Applies editable bevel/text modifiers only for export.
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    # Joining leaves duplicate slots; one shared surface material = one glTF primitive.
    if name.startswith('surface.'):
        result.data.materials.clear()
        result.data.materials.append(control_surface)
        for polygon in result.data.polygons:
            polygon.material_index = 0
    return result


for parent_name, pieces in moving_parts.items():
    consolidate(pieces, 'surface.' + parent_name)
by_material = {}
for part in static_parts:
    by_material.setdefault(part.data.materials[0].name, []).append(part)
for name, pieces in by_material.items():
    consolidate(pieces, 'static.' + name)

bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.glb.resolve()), export_format='GLB',
                          use_selection=True, export_extras=True, export_yup=True,
                          export_animations=False, export_cameras=False, export_lights=False)
glb = args.glb.read_bytes()
length, kind = struct.unpack_from('<II', glb, 12)
assert kind == 0x4E4F534A
model = json.loads(glb[20:20 + length])
triangles = sum(model['accessors'][p['indices']]['count'] // 3
                for mesh in model.get('meshes', []) for p in mesh['primitives'])
metrics = {'bytes': len(glb), 'meshes': len(model.get('meshes', [])),
           'primitives': sum(len(m['primitives']) for m in model.get('meshes', [])),
           'triangles': triangles, 'controls': len(controls),
           'authoringBlender': bpy.app.version_string}
manifest = {'version': 2, 'asset': 'mixtape-mixer.glb', 'upAxis': 'Y',
            'authoringUpAxis': 'Z', 'channelOrder': ['C', 'A', 'B', 'D'],
            'controls': controls, 'meters': meters, 'metrics': metrics}
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
(args.public_dir / 'mixtape-mixer.glb').write_bytes(glb)
(args.public_dir / 'mixtape-mixer.bindings.json').write_bytes(manifest_bytes)
args.glb.with_suffix('.bindings.json').write_bytes(manifest_bytes)
print('MIXTAPE_MIXER_EXPORT ' + json.dumps(metrics))
