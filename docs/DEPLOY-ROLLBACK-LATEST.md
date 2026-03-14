# Rollback Plan (auto) — Summa Social

Generat: 2026-03-14 10:36
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 13e4281
SHA main a publicar: 14381dc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 14381dc --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 13e4281
git push origin prod --force-with-lease
```
