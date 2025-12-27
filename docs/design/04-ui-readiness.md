# Summa Social — UI Readiness Checklist (Pre-commit)

Abans de fer commit d'un canvi UI:

- [ ] Respecta `docs/design/01-color-system.md` (cap ús nou de color)
- [ ] Categories en neutral (mai verd/vermell)
- [ ] Estat 0/partial/100 usa mapping únic (neutral/ambre/verd)
- [ ] Documents: `FileText` + tooltip + target ≥ 36px (gris/verd)
- [ ] Hi ha estats: idle / loading / empty / error (sense soroll)
- [ ] Mobile usable: no només "es veu", es pot operar
- [ ] Jerarquia: import i acció prioritzats; metadades secundàries
- [ ] No s'han afegit dependències
- [ ] No s'ha fet refactor gran (si cal, justificar al PR)
