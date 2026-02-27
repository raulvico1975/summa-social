# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 11:43
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 625565d
SHA main a publicar: f935b15

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f935b15 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 625565d
git push origin prod --force-with-lease
```
