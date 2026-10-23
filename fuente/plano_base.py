"""Plano base para dibujar encima: muros, cocina, aberturas y grilla de 50 cm.
Genera PNG (para dibujar en el celu/tablet) y PDF A4 a escala 1:50 (para imprimir).
"""
import sys
sys.path.insert(0, "/home/claude")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import plano

OUT = "/home/claude/site/descargas"
MM = 1 / 25.4


def base(ax, muebles=None):
    # grilla de 50 cm dentro del living-comedor (líneas cada 10 cm muy suaves)
    for i in range(0, 61):
        z = i * 0.1
        strong = i % 5 == 0
        ax.plot([0, 2.8], [z, z], color="#9fb3c8" if strong else "#e3e9ef", lw=0.35 if strong else 0.2, zorder=1)
    for i in range(0, 29):
        x = i * 0.1
        strong = i % 5 == 0
        ax.plot([x, x], [0, 6.0], color="#9fb3c8" if strong else "#e3e9ef", lw=0.35 if strong else 0.2, zorder=1)
    for i in range(0, 13):  # marcas de metros sobre la medianera
        ax.text(0.03, i * 0.5 - 0.02, f"{i*0.5:.1f}".replace(".", ","), fontsize=4, color="#6f8296", ha="left", va="bottom", zorder=2)
    for i in range(0, 6):
        ax.text(i * 0.5 + 0.02, 6.1, f"{i*0.5:.1f}".replace(".", ","), fontsize=4, color="#6f8296", ha="left", va="top", zorder=2)
    # arquitectura (reutiliza el dibujo del plano y oculta los muebles)
    L = plano.LAYOUTS["A"]
    saved = {k: L[k] for k in ("muebles", "sillas", "tv")}
    L["muebles"], L["sillas"], L["tv"] = [], [], (9, 9, "v")
    for k in ("chaise", "brazos", "divisiones", "modtext"):
        saved[k] = L.pop(k, None)
    plano.draw_layout(ax, "A")
    for k, v in saved.items():
        if v is not None:
            L[k] = v
    if muebles:  # muebles de la opción 1 en gris suave, como referencia
        Lm = plano.LAYOUTS[muebles]
        for n, x, y, w, d, med in Lm["muebles"]:
            ax.add_patch(Rectangle((x, y), w, d, fc="none", ec="#b9c2cc", lw=0.6, ls="--", zorder=3))
            ax.text(x + w / 2, y + d / 2, n.replace("Mueble impresora 3D", "Impresora"), fontsize=4, color="#9aa6b2",
                    ha="center", va="center", zorder=3)
        if "chaise" in Lm:
            x0, y0, x1, y1 = Lm["chaise"]
            ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc="none", ec="#b9c2cc", lw=0.6, ls="--", zorder=3))


for name, muebles in [("plano-base-vacio", None), ("plano-base-con-muebles", "A")]:
    # PNG vertical para dibujar
    fig = plt.figure(figsize=(6.5 * 0.42, 10.9 * 0.42))
    ax = fig.add_axes([0, 0, 1, 1])
    base(ax, muebles)
    for t in ax.texts:
        t.set_fontsize(t.get_fontsize() * 0.8)
    fig.savefig(f"{OUT}/{name}.png", dpi=500, facecolor="white")
    plt.close(fig)

    # PDF A4 a escala 1:50
    W, H = 210, 297
    fig = plt.figure(figsize=(W * MM, H * MM))
    dw, dh = 6.5 * 1000 / 50, 10.9 * 1000 / 50
    left, bottom = (W - dw) / 2, 34
    ax = fig.add_axes([left / W, bottom / H, dw / W, dh / H])
    base(ax, muebles)
    fig.text(left / W, (H - 18) / H, "Living-comedor · plano base para dibujar", fontsize=10, weight="bold")
    fig.text(left / W, (H - 24) / H, "Grilla: líneas fuertes cada 50 cm, finas cada 10 cm", fontsize=7, color="#555")
    for k in range(5):
        fig.add_artist(Rectangle(((left + k * 20) / W, 16 / H), 20 / W, 2 / H, transform=fig.transFigure,
                                 fc="black" if k % 2 == 0 else "white", ec="black", lw=0.5))
        fig.text((left + k * 20) / W, 20 / H, f"{k}", fontsize=6, ha="center")
    fig.text((left + 100) / W, 20 / H, "5 m", fontsize=6, ha="center")
    fig.text(left / W, 9 / H, "ESCALA 1:50 en A4 — imprimir al 100 % (sin 'ajustar a página'). 1 cm en papel = 50 cm reales.",
             fontsize=6)
    fig.savefig(f"{OUT}/{name}-A4-1-50.pdf")
    plt.close(fig)
print("ok")
