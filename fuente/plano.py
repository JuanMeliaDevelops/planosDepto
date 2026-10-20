"""Plano living-comedor a escala 1:50 (PDF A3) + DXF 1:1 en metros.
Origen (0,0) = esquina interior superior izquierda del living-comedor (frente de mesada).
x hacia la derecha, y hacia abajo (hacia el contrafrente). Unidades: metros.
"""
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Arc, Circle, Ellipse, Polygon
import ezdxf

ESCALA = 50          # 1:50
MM = 1 / 25.4        # mm -> pulgadas

# ---------- Arquitectura ----------
# muros como rectángulos (x0, y0, x1, y1)
WALLS = [
    (-0.20, -2.98, 0.00, 6.00),    # medianera izquierda
    (1.31, -2.98, 1.43, -0.55),    # muro pasillo de entrada
    (-0.20, -2.98, 0.23, -2.83),   # muro entrada (izq de la puerta)
    (1.13, -2.98, 1.43, -2.83),    # muro entrada (der de la puerta)
    (1.31, -0.69, 5.60, -0.55),    # muro superior cocina/baño
    (2.80, 1.20, 4.00, 1.30),      # muro inferior cocina
    (3.89, -0.55, 4.00, 1.30),     # muro cocina/baño
    (3.89, 2.17, 5.45, 2.27),      # muro dormitorio/placard (superior)
    (2.80, 2.17, 2.90, 6.00),      # tabique living/dormitorio
    (5.45, -0.69, 5.60, 6.10),     # muro exterior derecho
]
KITCHEN = [  # mesada, bacha y heladera
    ("Mesada / anafe", (1.43, -0.55, 3.29, 0.00)),
    ("Bacha", (3.29, -0.55, 3.89, 0.51)),
    ("Heladera", (3.34, 0.51, 3.89, 1.14)),
]
ROOM_LABELS = [
    ("COCINA", 2.35, -0.25),
    ("BAÑO\n1,50 × 2,74", 4.72, 0.80),
    ("DORMITORIO\n2,55 × 3,55", 4.17, 4.30),
    ("BALCÓN 5,00 × 1,13", 2.50, 6.65),
    ("PASILLO", 3.35, 1.72),
    ("ENTRADA", 0.65, -1.70),
]
# puertas: (bisagra x, y, ancho, ángulo inicio, ángulo fin) arcos de 90°
DOORS = [
    (0.23, -2.83, 0.90, 0, 90),     # puerta de entrada (abre hacia adentro)
    (3.89, 1.30, 0.80, 270, 360),    # baño — abre hacia el baño (aprox.)
    (2.90, 2.27, 0.85, 0, 90),      # dormitorio (aprox.)
]

# ---------- Muebles ----------
# (nombre, x, y, ancho_x, prof_y, etiqueta medida)
LAYOUTS = {
    "A": {
        "titulo": "OPCIÓN A — Comedor junto a la cocina · Living al centro · Oficina junto al ventanal",
        "muebles": [
            ("Mesa Oliva", 1.00, 0.90, 0.80, 1.20, "120 × 80 oval"),
            ("Sillón a medida", 0.00, 2.50, 1.00, 1.80, "180\n90×100 + 90×130"),
            ("Ratona", 0.05, 2.04, 0.70, 0.45, "45 × 70"),
            ("Rack TV", 2.46, 2.70, 0.34, 1.60, "160 × 34"),
            ("Escritorio", 0.00, 4.80, 0.60, 1.20, "120 × 60"),
            ("Mueble impresora 3D", 2.40, 4.60, 0.40, 1.30, "130 × 40"),
        ],
        "chaise": (1.00, 3.40, 1.30, 4.30),
        "brazos": [(0.00, 2.50, 0.80, 2.65), (0.00, 4.15, 0.80, 4.30)],
        "divisiones": [(0.00, 3.40, 1.00, 3.40)],
        "modtext": [(0.50, 2.98, "Sillón 180\nmódulo 90×100"), (0.62, 3.88, "módulo\n90×130")],
        "sillas": [(0.72, 1.50), (2.08, 1.50), (0.95, 5.40)],
        "tv": (2.80, 3.50, "v"),
        "notas": [
            "• Paso cocina ↔ pasillo: 0,90 m frente a la mesada",
            "• Paso al balcón: ~1,20 m entre silla de escritorio y mueble impresora",
            "• Paso frente al sillón: ~1,46 m · frente al módulo de 130: ~1,16 m",
            "• Escritorio con luz lateral del ventanal (sin reflejos en monitores)",
        ],
    },
    "A2": {
        "titulo": "OPCIÓN A AJUSTADA — Sillón 180 × 100 sin chaise · Mesa redonda Ø100 · Rack flotante · Ratona Ø55",
        "muebles": [
            ("Sillón Nube", 0.00, 2.60, 1.00, 1.80, "180 × 100"),
            ("Rack flotante", 2.50, 2.80, 0.30, 1.60, "160 × 30"),
            ("Escritorio", 0.00, 4.80, 0.60, 1.20, "120 × 60"),
            ("Mueble impresora 3D", 2.40, 4.60, 0.40, 1.30, "130 × 40"),
        ],
        "redondos": [
            ("Mesa redonda", 1.40, 1.65, 1.00, "Ø100"),
            ("Ratona", 0.35, 2.30, 0.55, "Ø55"),
        ],
        "sillas": [(0.78, 1.65), (2.02, 1.65), (0.95, 5.40)],
        "tv": (2.80, 3.60, "v"),
        "notas": [
            "• Paso libre frente al sillón: ~1,50 m (ratona al costado)",
            "• Paso al balcón: ~1,20 m entre silla de escritorio y mueble impresora",
            "• ~0,9 m² más de piso libre que la opción A",
            "• Rack colgado a 30–40 cm del piso: se ve el piso debajo",
        ],
    },
    "B": {
        "titulo": "OPCIÓN B — Living al ventanal · Escritorio en el medio · Comedor junto a la cocina",
        "muebles": [
            ("Mesa Oliva", 1.00, 0.90, 0.80, 1.20, "120 × 80 oval"),
            ("Escritorio", 2.20, 2.30, 0.60, 1.20, "120 × 60"),
            ("Mueble impresora 3D", 0.00, 2.10, 0.40, 1.30, "130 × 40"),
            ("Sillón a medida", 0.00, 3.90, 1.00, 1.80, "180\n90×100 + 90×130"),
            ("Ratona", 0.05, 3.43, 0.70, 0.45, "45 × 70"),
            ("Rack TV", 2.46, 4.10, 0.34, 1.60, "160 × 34"),
        ],
        "chaise": (1.00, 4.80, 1.30, 5.70),
        "brazos": [(0.00, 3.90, 0.80, 4.05), (0.00, 5.55, 0.80, 5.70)],
        "divisiones": [(0.00, 4.80, 1.00, 4.80)],
        "modtext": [(0.50, 4.38, "Sillón 180\nmódulo 90×100"), (0.62, 5.28, "módulo\n90×130")],
        "sillas": [(0.72, 1.50), (2.08, 1.50), (1.88, 2.75)],
        "tv": (2.80, 4.90, "v"),
        "notas": [
            "• Paso central entre impresora y silla de escritorio: ~1,20 m",
            "• Living con la mejor luz y vista al balcón",
            "• Paso al balcón frente al módulo de 130: ~1,16 m",
            "• Escritorio contra el tabique: el cableado queda junto al rack",
        ],
    },
}

LAYOUTS["C"] = {
    "titulo": "OPCIÓN 4 — Escritorio en el rincón del ventanal, mirando al balcón · Living corrido hacia la cocina",
    "muebles": [
        ("Mesa Oliva", 1.00, 0.90, 0.80, 1.20, "120 × 80 oval"),
        ("Sillón a medida", 0.00, 2.35, 1.00, 1.80, "180\n90×100 + 90×130"),
        ("Ratona", 0.05, 1.89, 0.70, 0.45, "45 × 70"),
        ("Rack TV", 2.46, 2.45, 0.34, 1.60, "160 × 34"),
        ("Escritorio", 0.00, 5.35, 1.20, 0.60, "120 × 60"),
        ("Mueble impresora 3D", 2.40, 4.60, 0.40, 1.30, "130 × 40"),
    ],
    "chaise": (1.00, 3.25, 1.30, 4.15),
    "brazos": [(0.00, 2.35, 0.80, 2.50), (0.00, 4.00, 0.80, 4.15)],
    "divisiones": [(0.00, 3.25, 1.00, 3.25)],
    "modtext": [(0.50, 2.83, "Sillón 180\nmódulo 90×100"), (0.62, 3.73, "módulo\n90×130")],
    "sillas": [(0.72, 1.50), (2.08, 1.50), (0.60, 5.00)],
    "tv": (2.80, 3.25, "v"),
    "notas": [
        "• Escritorio mirando al balcón: sin reflejos en los monitores",
        "• Paso al balcón entre escritorio e impresora: ~1,20 m",
        "• Silla de escritorio a sillón: ~0,63 m",
        "• Paso frente al sillón: ~1,46 m · frente al módulo de 130: ~1,16 m",
    ],
}

# Variantes con el sillón 180 × 100 parejo + camastro suelto de 90 × 40 del lado del ventanal
import copy
def _variante_camastro(key, z0):
    L = copy.deepcopy(LAYOUTS[key])
    L["titulo"] = L["titulo"] + " · Sillón 180 × 100 + camastro 90 × 40"
    L["muebles"] = [m for m in L["muebles"] if not m[0].startswith("Sillón")]
    L["muebles"].append(("Sillón a medida", 0.00, z0, 1.00, 1.80, "180 × 100"))
    L["muebles"].append(("Camastro", 1.02, z0 + 0.90, 0.38, 0.90, "90 × 40"))
    L.pop("chaise", None)
    L["modtext"] = [(0.50, z0 + 0.45, "Sillón a medida\n180 × 100"), (0.50, z0 + 1.35, "2 módulos\nde 90")]
    L["divisiones"] = [(0.00, z0 + 0.90, 1.00, z0 + 0.90)]
    L["notas"] = [n.replace("módulo de 130: ~1,16 m", "camastro: ~1,06 m") for n in L["notas"]]
    return L
LAYOUTS["A_cam"] = _variante_camastro("A", 2.50)
LAYOUTS["B_cam"] = _variante_camastro("B", 3.90)
LAYOUTS["C_cam"] = _variante_camastro("C", 2.35)

COL_WALL = "#2b2b2b"
COL_FURN = "#e8eef5"
COL_EDGE = "#3b5b80"


def chair(ax, cx, cy, s=0.45):
    ax.add_patch(Rectangle((cx - s / 2, cy - s / 2), s, s, fc="white", ec=COL_EDGE, lw=0.6, zorder=4))


def draw_layout(ax, key):
    L = LAYOUTS[key]
    for x0, y0, x1, y1 in WALLS:
        ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc=COL_WALL, ec=COL_WALL, lw=0, zorder=5))
    # ventanal contrafrente
    ax.plot([0, 2.80], [6.0, 6.0], color=COL_WALL, lw=0.5)
    ax.plot([0, 2.80], [6.05, 6.05], color=COL_WALL, lw=0.5)
    ax.plot([2.90, 5.45], [6.0, 6.0], color=COL_WALL, lw=0.5)
    ax.plot([2.90, 5.45], [6.05, 6.05], color=COL_WALL, lw=0.5)
    # balcón
    ax.plot([0, 0, 5.0, 5.0], [6.05, 7.18, 7.18, 6.10], color="#777", lw=0.8)
    # cocina
    for n, (x0, y0, x1, y1) in KITCHEN:
        ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc="#f2f2f2", ec="#888", lw=0.6, zorder=3))
    ax.add_patch(Circle((3.59, -0.12), 0.18, fc="none", ec="#888", lw=0.6))
    # puertas
    for hx, hy, w, a0, a1 in DOORS:
        ax.add_patch(Arc((hx, hy), 2 * w, 2 * w, theta1=a0, theta2=a1, color="#666", lw=0.5, ls="--"))
        a = math.radians(a1 if a0 in (0, 270) else a0)
        ax.plot([hx, hx + w * math.cos(math.radians(a1))], [hy, hy + w * math.sin(math.radians(a1))], color="#666", lw=0.7)
    for t, x, y in ROOM_LABELS:
        ax.text(x, y, t, ha="center", va="center", fontsize=5.5, color="#888")
    ax.text(1.40, 0.45, "LIVING-COMEDOR 2,80 × 6,00", ha="center", fontsize=5.5, color="#888")

    # muebles
    for n, x, y, w, d, med in L["muebles"]:
        if n.startswith("Sillón") and "chaise" in L:  # sillón con chaise en L
            cx0, cy0, cx1, cy1 = L["chaise"]
            pts = [(x, y), (x + w, y), (x + w, cy0), (cx1, cy0), (cx1, cy1), (x, cy1)] if cy1 >= y + d - 1e-6 else \
                  [(x, y), (cx1, y), (cx1, cy1), (x + w, cy1), (x + w, y + d), (x, y + d)]
            ax.add_patch(Polygon(pts, closed=True, fc=COL_FURN, ec=COL_EDGE, lw=0.9, zorder=4))
        elif n.startswith("Mesa Oliva"):  # mesa ovalada
            ax.add_patch(Ellipse((x + w / 2, y + d / 2), w, d, fc=COL_FURN, ec=COL_EDGE, lw=0.9, zorder=4))
        else:
            ax.add_patch(Rectangle((x, y), w, d, fc=COL_FURN, ec=COL_EDGE, lw=0.9, zorder=4))
        rot = 90 if d > w * 1.6 and w < 0.7 else 0
        if n.startswith("Sillón") and "modtext" in L:
            for tx, ty, tt in L["modtext"]:
                ax.text(tx, ty, tt, ha="center", va="center", fontsize=5.5, zorder=6, color="#1d3550")
            continue
        ax.text(x + w / 2, y + d / 2, f"{n}\n{med}", ha="center", va="center",
                fontsize=5 if rot else 5.5, rotation=rot, zorder=6, color="#1d3550")
    for x0, y0, x1, y1 in L.get("brazos", []):  # brazos del sillón
        ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc="#d3dcea", ec=COL_EDGE, lw=0.5, zorder=4.5))
    for x0, y0, x1, y1 in L.get("divisiones", []):  # unión entre módulos
        ax.plot([x0, x1], [y0, y1], color=COL_EDGE, lw=0.5, ls="--", zorder=4.6)
    for n, cx, cy, dd, med in L.get("redondos", []):
        ax.add_patch(Circle((cx, cy), dd / 2, fc=COL_FURN, ec=COL_EDGE, lw=0.9, zorder=5))
        ax.text(cx, cy, f"{n}\n{med}", ha="center", va="center", fontsize=5.5, zorder=6, color="#1d3550")
    for cx, cy in L["sillas"]:
        chair(ax, cx, cy)
    # TV en pared
    tx, ty, _ = L["tv"]
    ax.add_patch(Rectangle((tx - 0.06, ty - 0.62), 0.05, 1.24, fc="#1d3550", ec="none", zorder=6))

    # cotas generales living
    def cota(x0, y0, x1, y1, txt, off=(0, 0)):
        ax.annotate("", xy=(x0, y0), xytext=(x1, y1), arrowprops=dict(arrowstyle="<->", lw=0.5, color="#c0392b"))
        ax.text((x0 + x1) / 2 + off[0], (y0 + y1) / 2 + off[1], txt, fontsize=5, color="#c0392b",
                ha="center", va="center", rotation=90 if x0 == x1 else 0,
                bbox=dict(fc="white", ec="none", pad=0.3))
    cota(0, 7.45, 2.80, 7.45, "2,80")
    cota(-0.45, 0, -0.45, 6.0, "6,00")

    ax.set_xlim(-0.7, 5.8)
    ax.set_ylim(7.7, -3.2)
    ax.set_aspect("equal")
    ax.axis("off")
    return L


def make_pdf(path):
    W, H = 420, 297  # A3 apaisado en mm
    fig = plt.figure(figsize=(W * MM, H * MM))
    # Área de dibujo: 6,5 m x 10,9 m -> a 1:50 = 130 x 218 mm
    dw, dh = 6.5 * 1000 / ESCALA, 10.9 * 1000 / ESCALA
    for i, key in enumerate(["A", "A2"]):
        left = 20 + i * 200
        bottom = H - 30 - dh
        ax = fig.add_axes([left / W, bottom / H, dw / W, dh / H])
        L = draw_layout(ax, key)
        fig.text((left) / W, (H - 18) / H, L["titulo"], fontsize=7.5, weight="bold")
        for j, n in enumerate(L["notas"]):
            fig.text((left + 125) / W, (H - 60 - j * 5.5) / H, n.replace(": ", ":\n   ", 1) if len(n) > 52 else n, fontsize=5.5, va="top")
    # barra de escala: 1 m = 20 mm
    sx, sy = 20, 12
    for k in range(5):
        fig.add_artist(Rectangle(((sx + k * 20) / W, sy / H), 20 / W, 2 / H,
                                 transform=fig.transFigure, fc="black" if k % 2 == 0 else "white", ec="black", lw=0.5))
        fig.text((sx + k * 20) / W, (sy + 3.5) / H, f"{k}", fontsize=6, ha="center")
    fig.text((sx + 100) / W, (sy + 3.5) / H, "5 m", fontsize=6, ha="center")
    fig.text(130 / W, 12.5 / H, "ESCALA 1:50 — Imprimir en A3 al 100 % (tamaño real, sin 'ajustar a página'). "
             "Medidas cotadas del plano original; muros, aberturas y cocina estimados a partir del dibujo — verificar en obra.",
             fontsize=6)
    fig.text(335 / W, (H - 285) / H, "Departamento — Living-comedor · Juani · 09/10/2026", fontsize=6, color="#555")
    fig.savefig(path)
    plt.close(fig)


def make_dxf(path):
    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.M
    msp = doc.modelspace()
    for name, color in [("MUROS", 7), ("COCINA", 8), ("MUEBLES_A", 5), ("MUEBLES_B", 3), ("MUEBLES_A2", 1), ("MUEBLES_C", 6), ("TEXTOS", 2)]:
        doc.layers.add(name, color=color)

    def rect(x0, y0, x1, y1, layer, dx=0):
        # DXF con y hacia arriba: invertimos y
        pts = [(x0 + dx, -y0), (x1 + dx, -y0), (x1 + dx, -y1), (x0 + dx, -y1)]
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": layer})

    for i, key in enumerate(["A", "A2", "B", "C"]):
        dx = i * 8.0
        for w in WALLS:
            rect(*w, "MUROS", dx)
        msp.add_line((dx, -6.0), (dx + 5.45, -6.0), dxfattribs={"layer": "MUROS"})
        msp.add_lwpolyline([(dx, -6.05), (dx, -7.18), (dx + 5.0, -7.18), (dx + 5.0, -6.10)], dxfattribs={"layer": "MUROS"})
        for _, k in KITCHEN:
            rect(*k, "COCINA", dx)
        layer = f"MUEBLES_{key}"
        for n, x, y, w, d, med in LAYOUTS[key]["muebles"]:
            if n.startswith("Mesa Oliva"):
                msp.add_ellipse((dx + x + w / 2, -(y + d / 2)), major_axis=(0, d / 2), ratio=w / d,
                                dxfattribs={"layer": layer})
            else:
                rect(x, y, x + w, y + d, layer, dx)
            if n.startswith("Sillón") and "chaise" in LAYOUTS[key]:
                rect(*LAYOUTS[key]["chaise"], layer, dx)
            msp.add_text(f"{n} {med}", height=0.07, dxfattribs={"layer": "TEXTOS"}).set_placement(
                (dx + x + w / 2, -(y + d / 2)), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)
        for n, cx, cy, dd, med in LAYOUTS[key].get("redondos", []):
            msp.add_circle((dx + cx, -cy), dd / 2, dxfattribs={"layer": layer})
            msp.add_text(f"{n} {med}", height=0.07, dxfattribs={"layer": "TEXTOS"}).set_placement(
                (dx + cx, -cy), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)
        for cx, cy in LAYOUTS[key]["sillas"]:
            rect(cx - 0.225, cy - 0.225, cx + 0.225, cy + 0.225, layer, dx)
        msp.add_text(f"OPCION {key}", height=0.2, dxfattribs={"layer": "TEXTOS"}).set_placement((dx, 3.4))
    doc.saveas(path)


if __name__ == "__main__":
    make_pdf("/home/claude/living_comedor_A_vs_A-ajustada_1-50.pdf")
    make_dxf("/home/claude/living_comedor.dxf")
    print("ok")
