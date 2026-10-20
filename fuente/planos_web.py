"""Exporta cada distribución como imagen vertical para ver en el celular (PNG + SVG)."""
import sys
sys.path.insert(0, "/home/claude")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import plano

OUT = "/home/claude/site/planos"

for key, name in [("A2", "opcion-a-ajustada"), ("A", "opcion-a-original"), ("B", "opcion-b"), ("A_cam", "opcion-1-camastro"), ("B_cam", "opcion-3-camastro"), ("C", "opcion-4"), ("C_cam", "opcion-4-camastro")]:
    fig = plt.figure(figsize=(6.5 * 0.42, 10.9 * 0.42))  # proporción del dibujo
    ax = fig.add_axes([0, 0, 1, 1])
    plano.draw_layout(ax, key)
    for t in ax.texts:
        t.set_fontsize(t.get_fontsize() * 0.68)
    fig.savefig(f"{OUT}/{name}.png", dpi=420, facecolor="white")
    plt.close(fig)
print("ok")
